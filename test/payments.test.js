const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const Stripe = require('stripe');
const payments = require('../lib/payments');
const realClient = payments.stripeClient;
const signed = new Stripe('unit-test-credential');
let creations = [], updates = [], currentSession, failWrite = false;
const sessionId = 'cs_test_abcdefghijklmnopqrstuvwx123456';
const secret = 'unit-test-signing-secret';
process.env.STRIPE_SECRET_KEY = ['sk', 'test', 'placeholder'].join('_');
process.env.STRIPE_WEBHOOK_SECRET = secret;
process.env.VERCEL_URL = 'loomy-test.vercel.app';
payments.stripeClient = () => ({
  customers: {
    list: async () => ({ data: [{ id: 'cus_loomy', email: 'buyer@example.invalid', created: 1, metadata: { store: 'loomy' } }], has_more: false })
  },
  checkout: { sessions: {
    create: async (params, options) => { creations.push({ params, options }); return { id: sessionId, url: 'https://checkout.stripe.com/test', livemode: false }; },
    retrieve: async () => currentSession,
    update: async (id, data) => { updates.push({ id, data }); }
  } },
  paymentIntents: { update: async (id, data) => { if (failWrite) throw new Error('storage unavailable'); updates.push({ id, data }); } },
  webhooks: signed.webhooks
});
const checkout = require('../api/checkout');
const webhook = require('../api/stripe-webhook');
after(() => { payments.stripeClient = realClient; });

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(data) { this.data = data; return this; } };
}
function request(body) {
  return { method: 'POST', headers: { host: 'loomy-test.vercel.app', origin: 'https://loomy-test.vercel.app', 'content-type': 'application/json' },
    body: { items: [{ id: 'basicshirt', size: 'M', qty: 2 }], email: 'buyer@example.invalid', requestId: '12345678-1234-1234-1234-123456789abc', ...body } };
}
function eventRequest(type, valid = true) {
  const payload = JSON.stringify({ id: 'evt_test', type, data: { object: { id: sessionId } } });
  const req = Readable.from([Buffer.from(payload)]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': valid ? signed.webhooks.generateTestHeaderString({ payload, secret }) : 'invalid' };
  return req;
}

test('server amounts match all 8 displayed products', () => {
  const source = readFileSync(require.resolve('../app.js'), 'utf8').split('const money =')[0];
  const products = vm.runInNewContext(`${source}; products`);
  assert.equal(products.length, 8);
  for (const product of products) assert.equal(payments.catalog[product.id].amount, product.price * 100);
});
test('reject malformed carts, unsupported sizes, invalid and excessive quantities', () => {
  for (const items of [null, [], [{ id: '__proto__', size: 'M', qty: 1 }], [{ id: 'basicshirt', size: '<script>', qty: 1 }],
    [{ id: 'basicshirt', size: 'M', qty: -1 }], [{ id: 'basicshirt', size: 'M', qty: 1.5 }],
    [{ id: 'basicshirt', size: 'M', qty: 10 }, { id: 'basicshirt', size: 'M', qty: 1 }]]) {
    assert.throws(() => payments.normalizeCart(items), /INVALID_CART/);
  }
});
test('free shipping applies strictly above 1000 RON, not at or below the threshold', () => {
  assert.equal(payments.qualifiesForFreeShipping(99999), false);
  assert.equal(payments.qualifiesForFreeShipping(100000), false);
  assert.equal(payments.qualifiesForFreeShipping(100001), true);
});
test('eligible cart gets the free rate using server totals even when browser prices are altered', async () => {
  const res = response();
  await checkout(request({ items: [{ id: 'basicshirt', size: 'M', qty: 1, price: 1 }, { id: 'basictee', size: 'M', qty: 1, price: 1 }] }), res);
  assert.equal(res.statusCode, 200);
  const rate = creations.at(-1).params.shipping_options[0].shipping_rate_data;
  assert.equal(rate.fixed_amount.amount, 0);
  assert.match(rate.display_name, /peste 1.000 lei/);
});
test('a browser subtotal cannot grant free shipping to a cart below 1000 RON', async () => {
  const res = response();
  await checkout(request({ items: [{ id: 'sacougri', size: 'M', qty: 1 }], subtotal: 1000000 }), res);
  assert.equal(res.statusCode, 200);
  assert.doesNotMatch(creations.at(-1).params.shipping_options[0].shipping_rate_data.display_name, /comenzi peste/);
});
test('checkout ignores a tampered browser price, carries size, uses RON and retry idempotency', async () => {
  creations = [];
  const req = request({ items: [{ id: 'basicshirt', size: 'S', qty: 2, price: 1 }] });
  for (let i = 0; i < 2; i++) { const res = response(); await checkout(req, res); assert.equal(res.statusCode, 200); }
  const { params } = creations[0];
  assert.equal(params.line_items[0].price_data.unit_amount, 42000);
  assert.equal(params.line_items[0].price_data.currency, 'ron');
  assert.equal(params.line_items[0].price_data.product_data.metadata.size, 'S');
  assert.equal(params.metadata.items, 'basicshirt:S:2');
  assert.equal(params.shipping_address_collection.allowed_countries[0], 'RO');
  assert.equal(creations[0].options.idempotencyKey, creations[1].options.idempotencyKey);
  assert.equal(params.payment_method_types, undefined);
});
test('foreign origins and invalid quantities never call Stripe creation', async () => {
  const count = creations.length;
  const foreign = request(); foreign.headers.origin = 'https://foreign.example';
  const res = response(); await checkout(foreign, res); assert.equal(res.statusCode, 403);
  const invalid = response(); await checkout(request({ items: [{ id: 'basicshirt', size: 'M', qty: 11 }] }), invalid);
  assert.equal(invalid.statusCode, 400); assert.equal(creations.length, count);
});
test('success query cannot claim unpaid sessions or disclose customer information', async () => {
  currentSession = { id: sessionId, metadata: { store: 'loomy' }, status: 'complete', payment_status: 'unpaid', livemode: false, customer_details: { email: 'private@example.com' } };
  const req = { method: 'GET', headers: { host: 'loomy-test.vercel.app' }, query: { session_id: sessionId } };
  const res = response(); await checkout(req, res);
  assert.equal(res.data.paid, false); assert.equal(res.data.customer_details, undefined);
  currentSession.payment_status = 'paid';
  const paid = response(); await checkout(req, paid); assert.equal(paid.data.paid, true);
});
test('webhook rejects invalid signatures without modifying an order', async () => {
  updates = []; const res = response(); await webhook(eventRequest('checkout.session.completed', false), res);
  assert.equal(res.statusCode, 400); assert.equal(updates.length, 0);
});
test('signed webhook waits for payment and repeated paid events update the same durable order', async () => {
  updates = [];
  currentSession = { id: sessionId, payment_intent: 'pi_example', metadata: { store: 'loomy', items: 'basicshirt:M:2' }, payment_status: 'unpaid' };
  await webhook(eventRequest('checkout.session.completed'), response()); assert.equal(updates.length, 0);
  currentSession.payment_status = 'paid';
  for (let i = 0; i < 2; i++) { const res = response(); await webhook(eventRequest('checkout.session.async_payment_succeeded'), res); assert.equal(res.statusCode, 200); }
  assert.equal(updates.length, 2); assert.deepEqual(updates[0], updates[1]);
  assert.equal(updates[0].data.metadata.order_status, 'paid_awaiting_atelier');
});
test('webhook requests Stripe retry when durable registration fails', async () => {
  failWrite = true; const res = response(); await webhook(eventRequest('checkout.session.completed'), res);
  assert.equal(res.statusCode, 500); failWrite = false;
});
