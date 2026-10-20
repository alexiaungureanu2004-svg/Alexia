const { stripeClient, json } = require('../lib/payments');

// Stripe signatures must be checked against the original, unparsed bytes.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { message: 'Metodă neacceptată.' });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) return json(res, 503, { received: false });
  let event, stripe;
  try {
    const chunks = [];
    let length = 0;
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.length;
      if (length > 1024 * 1024) return json(res, 413, { received: false });
      chunks.push(bytes);
    }
    stripe = stripeClient();
    event = stripe.webhooks.constructEvent(Buffer.concat(chunks), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return json(res, 400, { received: false });
  }
  const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];
  if (!supported.includes(event.type)) return json(res, 200, { received: true });
  try {
    // Re-read the current payment state so late or repeated events cannot regress an order.
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.metadata?.store !== 'loomy') return json(res, 200, { received: true });
    if (session.payment_status === 'paid' && session.payment_intent) {
      // Stripe is the durable order register. Atelier fulfillment is manual from Payments.
      // Repeated deliveries write the same state and never create duplicate orders.
      await stripe.paymentIntents.update(session.payment_intent, { metadata: {
        store: 'loomy', checkout_session: session.id, items: session.metadata.items,
        order_status: 'paid_awaiting_atelier'
      } });
    } else if (event.type === 'checkout.session.async_payment_failed') {
      await stripe.checkout.sessions.update(session.id, { metadata: { order_status: 'payment_failed' } });
    }
    return json(res, 200, { received: true });
  } catch {
    // A failed durable write must be retried by Stripe.
    return json(res, 500, { received: false });
  }
};

module.exports.config = { api: { bodyParser: false } };
