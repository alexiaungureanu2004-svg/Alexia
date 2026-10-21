const Stripe = require('stripe');

const catalog = Object.freeze({
  rds308: { name: 'Rochie lungă neagră cu corset', amount: 269000 },
  corset279: { name: 'Corset cu volane din catifea', amount: 98000 },
  sacougri: { name: 'Sacou gri oversized', amount: 99000 },
  fustaplisata: { name: 'Fustă plisată gri', amount: 78000 },
  basictee: { name: 'Tricou oversized din satin bej', amount: 59000 },
  basicshirt: { name: 'Top din satin maro cu spate gol', amount: 42000 },
  pantaloni: { name: 'Pantaloni lungi roz', amount: 82000 },
  rochiesatin: { name: 'Rochie din satin maro cu spate gol', amount: 79000 },
  ...require('./catalog-products.json')
});

const FREE_SHIPPING_THRESHOLD = 100000;
const qualifiesForFreeShipping = subtotal => subtotal > FREE_SHIPPING_THRESHOLD;

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_NOT_CONFIGURED');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-09-30.endive', maxNetworkRetries: 2, timeout: 15000
  });
}

function normalizeCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > 24) throw new Error('INVALID_CART');
  const grouped = new Map();
  for (const item of items) {
    if (!item || !Object.hasOwn(catalog, item.id) || !['S', 'M', 'L'].includes(item.size) ||
        !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 10) throw new Error('INVALID_CART');
    const key = `${item.id}:${item.size}`;
    const qty = (grouped.get(key)?.qty || 0) + item.qty;
    if (qty > 10) throw new Error('INVALID_CART');
    grouped.set(key, { id: item.id, size: item.size, qty });
  }
  const result = [...grouped.values()].sort((a, b) => `${a.id}:${a.size}`.localeCompare(`${b.id}:${b.size}`));
  if (result.reduce((sum, item) => sum + item.qty, 0) > 20) throw new Error('INVALID_CART');
  return result;
}

function originFor(req) {
  const host = String(req.headers.host || '');
  const configured = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const hosts = new Set([configured, process.env.VERCEL_URL, 'alexia-theta.vercel.app',
    'alexia-alexia-ungureanu2004-3793.vercel.app', 'alexia-git-main-alexia-ungureanu2004-3793.vercel.app'].filter(Boolean));
  if (!hosts.has(host)) throw new Error('INVALID_ORIGIN');
  const origin = `https://${host}`;
  if (req.headers.origin && req.headers.origin !== origin) throw new Error('INVALID_ORIGIN');
  return origin;
}

function json(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

module.exports = { catalog, stripeClient, normalizeCart, originFor, json, qualifiesForFreeShipping };
