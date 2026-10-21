const { createHash } = require('node:crypto');
const OFFER_CODE = 'LOOMY10';
const COUPON_ID = 'loomy-first-order-10-v1';
const objectId = object => typeof object === 'string' ? object : object?.id;

function normalizeEmail(value) {
  if (typeof value !== 'string') throw new Error('INVALID_EMAIL');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_EMAIL');
  return email;
}

async function customerFor(stripe, email, create = true) {
  const listed = await stripe.customers.list({ email, limit: 100 });
  if (listed.has_more) throw new Error('OFFER_UNAVAILABLE');
  const customers = listed.data;
  const ours = customers.filter(customer => customer.metadata?.store === 'loomy');
  ours.sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
  if (ours.length) return { customer: ours[0], customers };
  if (!create) return { customer: null, customers };
  const digest = createHash('sha256').update(email).digest('hex');
  const customer = await stripe.customers.create({ email, metadata: { store: 'loomy' } },
    { idempotencyKey: 'loomy-customer-v1-' + digest });
  return { customer, customers: [...customers, customer] };
}

async function hasPaidOrder(stripe, customers) {
  for (const customer of customers) {
    let startingAfter;
    for (let page = 0; page < 10; page++) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      if (sessions.data.some(session => session.metadata?.store === 'loomy' && session.payment_status === 'paid')) return true;
      if (!sessions.has_more) break;
      if (page === 9 || !sessions.data.length) throw new Error('OFFER_UNAVAILABLE');
      startingAfter = sessions.data.at(-1).id;
    }
  }
  return false;
}

async function ensureCoupon(stripe) {
  let coupon;
  try {
    coupon = await stripe.coupons.retrieve(COUPON_ID);
  } catch (error) {
    if (error.code !== 'resource_missing') throw error;
    coupon = await stripe.coupons.create({
      id: COUPON_ID, percent_off: 10, duration: 'once',
      name: 'LOOMY · 10% la prima comandă', metadata: { store: 'loomy', offer: 'newsletter-welcome-v1' }
    }, { idempotencyKey: COUPON_ID });
  }
  if (coupon.deleted || !coupon.valid || coupon.percent_off !== 10 || coupon.amount_off != null ||
      coupon.metadata?.store !== 'loomy') throw new Error('OFFER_UNAVAILABLE');
}

async function promotionsFor(stripe, customer) {
  const result = await stripe.promotionCodes.list({ code: OFFER_CODE, customer: customer.id, limit: 100 });
  if (result.has_more) throw new Error('OFFER_UNAVAILABLE');
  return result.data.filter(promotion => promotion.metadata?.store === 'loomy' &&
    objectId(promotion.promotion?.coupon) === COUPON_ID && objectId(promotion.customer) === customer.id);
}

function usable(promotion) {
  return promotion.active && promotion.max_redemptions === 1 && promotion.times_redeemed === 0 &&
    promotion.restrictions?.first_time_transaction === true &&
    (!promotion.expires_at || promotion.expires_at > Math.floor(Date.now() / 1000));
}

async function issueWelcomeOffer(stripe, email) {
  const { customer, customers } = await customerFor(stripe, email);
  if (await hasPaidOrder(stripe, customers)) return { eligible: false };
  const existing = await promotionsFor(stripe, customer);
  // Re-subscribing does not renew a redeemed or expired first-order benefit.
  if (existing.length) return usable(existing[0]) ? { eligible: true, code: OFFER_CODE, percent: 10 } : { eligible: false };
  await ensureCoupon(stripe);
  await stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: COUPON_ID }, code: OFFER_CODE,
    customer: customer.id, max_redemptions: 1, restrictions: { first_time_transaction: true },
    metadata: { store: 'loomy', offer: 'newsletter-welcome-v1' }
  }, { idempotencyKey: 'loomy-welcome-v1-' + customer.id });
  return { eligible: true, code: OFFER_CODE, percent: 10 };
}

async function checkoutDiscount(stripe, emailValue, code) {
  const email = normalizeEmail(emailValue);
  if (code == null || code === '') {
    const { customer } = await customerFor(stripe, email);
    return { customer: customer.id };
  }
  if (typeof code !== 'string' || code.trim().toUpperCase() !== OFFER_CODE) throw new Error('INVALID_DISCOUNT');
  const { customer, customers } = await customerFor(stripe, email, false);
  if (!customer) throw new Error('INVALID_DISCOUNT');
  if (await hasPaidOrder(stripe, customers)) throw new Error('DISCOUNT_USED');
  const promotions = await promotionsFor(stripe, customer);
  const promotion = promotions.find(usable);
  if (!promotion) throw new Error('INVALID_DISCOUNT');
  return { customer: customer.id, discounts: [{ promotion_code: promotion.id }] };
}

module.exports = { OFFER_CODE, COUPON_ID, normalizeEmail, customerFor, hasPaidOrder, issueWelcomeOffer, checkoutDiscount };
