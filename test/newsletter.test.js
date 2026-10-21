const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const offers = require('../lib/newsletter-offer');
const payments = require('../lib/payments');
const originalStripe = payments.stripeClient;
const originalFetch = global.fetch;
let state, ip = 0;

function reset() {
  state = { customers: [], sessions: [], promotions: [], coupon: null, customerWrites: [], couponWrites: [], promoWrites: [], sessionWrites: [], signupWrites: [], signupStatus: 201 };
}
reset();
const stripe = {
  customers: {
    list: async ({ email }) => ({ data: state.customers.filter(item => item.email === email), has_more: false }),
    create: async (params, options) => {
      const previous = state.customerWrites.find(item => item.options.idempotencyKey === options.idempotencyKey);
      if (previous) return previous.customer;
      const customer = { id: 'cus_' + (state.customers.length + 1), created: 1, ...params };
      state.customers.push(customer);
      state.customerWrites.push({ params, options, customer });
      return customer;
    }
  },
  coupons: {
    retrieve: async () => { if (state.coupon) return state.coupon; throw Object.assign(new Error('missing'), { code: 'resource_missing' }); },
    create: async (params, options) => {
      state.couponWrites.push({ params, options });
      return (state.coupon = { ...params, valid: true, amount_off: null });
    }
  },
  promotionCodes: {
    list: async ({ code, customer }) => ({ data: state.promotions.filter(item => item.code === code && item.customer === customer), has_more: false }),
    create: async (params, options) => {
      const previous = state.promoWrites.find(item => item.options.idempotencyKey === options.idempotencyKey);
      if (previous) return previous.promotion;
      const promotion = { id: 'promo_' + (state.promotions.length + 1), active: true, times_redeemed: 0, ...params };
      state.promotions.push(promotion);
      state.promoWrites.push({ params, options, promotion });
      return promotion;
    }
  },
  checkout: { sessions: {
    list: async ({ customer }) => ({ data: state.sessions.filter(item => item.customer === customer), has_more: false }),
    create: async (params, options) => {
      state.sessionWrites.push({ params, options });
      return { id: 'cs_test_abcdefghijklmnopqrstuvwx123456', url: 'https://checkout.stripe.com/test', livemode: false };
    }
  } }
};
payments.stripeClient = () => stripe;
global.fetch = async (url, options) => {
  state.signupWrites.push({ url, ...options, body: JSON.parse(options.body) });
  return new Response(state.signupStatus === 409 ? JSON.stringify({ code: '23505' }) : '{}', { status: state.signupStatus });
};
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.VERCEL_URL = 'loomy-unit.vercel.app';
const newsletter = require('../api/newsletter');
const checkout = require('../api/checkout');
after(() => { payments.stripeClient = originalStripe; global.fetch = originalFetch; });

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}
function request(body) {
  return { method: 'POST', headers: { host: process.env.VERCEL_URL, origin: 'https://' + process.env.VERCEL_URL, 'content-type': 'application/json', 'x-forwarded-for': 'unit-' + ++ip }, body };
}
function order(body = {}) {
  return request({ email: 'welcome@example.invalid', discountCode: 'LOOMY10', requestId: '12345678-1234-1234-1234-123456789abc', items: [{ id: 'basicshirt', size: 'M', qty: 2 }], ...body });
}

test('newsletter saves normalized consent and issues exactly 10%, bound to one customer and one first transaction', async () => {
  reset();
  const res = response();
  await newsletter(request({ email: ' WELCOME@Example.Invalid ', consent: true }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { subscribed: true, eligible: true, code: 'LOOMY10', percent: 10, delivery: 'onscreen' });
  assert.deepEqual(state.signupWrites[0].body, { email: 'welcome@example.invalid', consent: true });
  assert.equal(state.signupWrites[0].headers.Prefer, 'return=minimal');
  assert.equal(state.couponWrites[0].params.percent_off, 10);
  assert.equal(state.couponWrites[0].params.duration, 'once');
  assert.equal(state.promoWrites[0].params.customer, state.customers[0].id);
  assert.equal(state.promoWrites[0].params.max_redemptions, 1);
  assert.equal(state.promoWrites[0].params.restrictions.first_time_transaction, true);
  assert.equal(res.body.email, undefined);
});

test('repeated signups return the same offer and do not recreate customers, coupons or promotions', async () => {
  reset();
  await newsletter(request({ email: 'welcome@example.invalid', consent: true }), response());
  state.signupStatus = 409;
  const repeated = response();
  await newsletter(request({ email: 'welcome@example.invalid', consent: true }), repeated);
  assert.equal(repeated.body.eligible, true);
  assert.equal(state.customerWrites.length, 1);
  assert.equal(state.couponWrites.length, 1);
  assert.equal(state.promoWrites.length, 1);
});

test('re-subscribing never renews a redeemed or inactive code', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  state.promotions[0].times_redeemed = 1;
  state.promotions[0].active = false;
  assert.deepEqual(await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid'), { eligible: false });
  assert.equal(state.promoWrites.length, 1);
});

test('a paid LOOMY order blocks first-order benefits, including other customer records with the same email', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  state.customers.push({ id: 'cus_legacy', email: 'welcome@example.invalid', created: 0, metadata: {} });
  state.sessions.push({ id: 'cs_paid', customer: 'cus_legacy', payment_status: 'paid', metadata: { store: 'loomy' } });
  assert.deepEqual(await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid'), { eligible: false });
  await assert.rejects(offers.checkoutDiscount(stripe, 'welcome@example.invalid', 'LOOMY10'), /DISCOUNT_USED/);
});

test('unpaid and canceled orders do not consume the welcome offer', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  state.sessions.push({ id: 'cs_unpaid', customer: 'cus_1', payment_status: 'unpaid', status: 'expired', metadata: { store: 'loomy' } });
  assert.equal((await offers.checkoutDiscount(stripe, 'welcome@example.invalid', 'loomy10')).discounts[0].promotion_code, 'promo_1');
});

test('wrong-email, fabricated, and redeemed codes never receive a discount', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  await assert.rejects(offers.checkoutDiscount(stripe, 'another@example.invalid', 'LOOMY10'), /INVALID_DISCOUNT/);
  await assert.rejects(offers.checkoutDiscount(stripe, 'welcome@example.invalid', 'FREE100'), /INVALID_DISCOUNT/);
  assert.equal(state.customerWrites.length, 1);
  state.promotions[0].times_redeemed = 1;
  await assert.rejects(offers.checkoutDiscount(stripe, 'welcome@example.invalid', 'LOOMY10'), /INVALID_DISCOUNT/);
});

test('checkout applies only the validated Stripe promotion; browser prices and percentages are ignored', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  const res = response();
  await checkout(order({ percent: 100, discountAmount: 999999, items: [{ id: 'basicshirt', size: 'M', qty: 2, price: 1 }] }), res);
  assert.equal(res.statusCode, 200);
  const params = state.sessionWrites[0].params;
  assert.equal(params.customer, 'cus_1');
  assert.deepEqual(params.discounts, [{ promotion_code: 'promo_1' }]);
  assert.equal(params.line_items[0].price_data.unit_amount, 42000);
  assert.equal(params.customer_email, undefined);
});

test('normal checkout uses the same canonical customer without a discount', async () => {
  reset();
  await offers.issueWelcomeOffer(stripe, 'welcome@example.invalid');
  const res = response();
  await checkout(order({ discountCode: '' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(state.sessionWrites[0].params.customer, 'cus_1');
  assert.equal(state.sessionWrites[0].params.discounts, undefined);
  assert.equal(state.customerWrites.length, 1);
});

test('missing consent, bots, invalid emails and foreign origins never save data or contact Stripe', async () => {
  reset();
  for (const body of [{ email: 'welcome@example.invalid', consent: false }, { email: 'bad', consent: true },
    { email: 'welcome@example.invalid', consent: true, website: 'bot' }, null]) {
    const res = response(); await newsletter(request(body), res); assert.equal(res.statusCode, 400);
  }
  const req = request({ email: 'welcome@example.invalid', consent: true }); req.headers.origin = 'https://foreign.invalid';
  const res = response(); await newsletter(req, res); assert.equal(res.statusCode, 403);
  assert.equal(state.signupWrites.length, 0);
  assert.equal(state.customerWrites.length, 0);
});

test('failed subscriber storage cannot issue a coupon or falsely confirm signup', async () => {
  reset(); state.signupStatus = 503;
  const res = response();
  await newsletter(request({ email: 'welcome@example.invalid', consent: true }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.subscribed, undefined);
  assert.equal(state.customerWrites.length, 0);
});

test('coupon configuration conflicts fail closed instead of issuing a larger discount', async () => {
  reset(); state.coupon = { valid: true, percent_off: 50, amount_off: null, metadata: { store: 'loomy' } };
  await assert.rejects(offers.issueWelcomeOffer(stripe, 'welcome@example.invalid'), /OFFER_UNAVAILABLE/);
  assert.equal(state.promoWrites.length, 0);
});
