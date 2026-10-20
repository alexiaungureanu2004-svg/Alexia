const { createHash } = require('node:crypto');
const { catalog, stripeClient, normalizeCart, originFor, json } = require('../lib/payments');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { message: 'Metodă neacceptată.' });
  }
  try {
    const origin = originFor(req);
    const stripe = stripeClient();
    if (req.method === 'GET') {
      const sessionId = req.query?.session_id;
      if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]{20,240}$/.test(sessionId)) {
        return json(res, 400, { message: 'Referința plății nu este validă.' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.store !== 'loomy') return json(res, 404, { message: 'Plata nu a fost găsită.' });
      return json(res, 200, {
        paid: session.payment_status === 'paid', status: session.status,
        testMode: !session.livemode, reference: session.id.slice(-8).toUpperCase()
      });
    }
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return json(res, 415, { message: 'Formatul cererii nu este acceptat.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const items = normalizeCart(body?.items);
    if (typeof body?.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId)) {
      return json(res, 400, { message: 'Reîncearcă plata din coșul de cumpărături.' });
    }
    // Sandbox is ready immediately. Live checkout requires the launch configuration.
    const testMode = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY);
    if (!testMode && (process.env.STRIPE_LIVE_ENABLED !== 'true' ||
        !process.env.STRIPE_SHIPPING_RATE_ID || !process.env.STRIPE_WEBHOOK_SECRET)) {
      return json(res, 503, { message: 'Plățile reale nu sunt încă activate.' });
    }
    const cartSummary = items.map(x => `${x.id}:${x.size}:${x.qty}`).join(',');
    const params = {
      mode: 'payment', locale: 'ro', integration_identifier: 'loomy-checkout-qmztrvab',
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      client_reference_id: body.requestId,
      metadata: { store: 'loomy', items: cartSummary },
      payment_intent_data: { metadata: { store: 'loomy', items: cartSummary } },
      shipping_address_collection: { allowed_countries: ['RO'] },
      phone_number_collection: { enabled: true },
      line_items: items.map(item => ({
        quantity: item.qty,
        price_data: { currency: 'ron', unit_amount: catalog[item.id].amount,
          product_data: { name: `${catalog[item.id].name} — ${item.size}`,
            metadata: { product_id: item.id, size: item.size },
            description: 'LOOMY · realizată la comandă' } }
      })),
      shipping_options: process.env.STRIPE_SHIPPING_RATE_ID ? [{ shipping_rate: process.env.STRIPE_SHIPPING_RATE_ID }] : [{
        shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 0, currency: 'ron' }, display_name: 'Livrare — simulare de test' }
      }]
    };
    const hash = createHash('sha256').update(JSON.stringify(params)).digest('hex');
    const session = await stripe.checkout.sessions.create(params, { idempotencyKey: `loomy-${body.requestId}-${hash}` });
    return json(res, 200, { id: session.id, url: session.url, testMode: !session.livemode });
  } catch (error) {
    if (error.message === 'INVALID_CART' || error instanceof SyntaxError) {
      return json(res, 400, { message: 'Verifică produsele, mărimile și cantitățile din coș (maximum 20 de piese).' });
    }
    if (error.message === 'INVALID_ORIGIN') return json(res, 403, { message: 'Deschide plata de pe site-ul LOOMY.' });
    if (error.code === 'resource_missing') return json(res, 404, { message: 'Plata nu a fost găsită.' });
    return json(res, 503, { message: 'Nu am putut deschide plata. Coșul tău este păstrat; încearcă din nou.' });
  }
};
