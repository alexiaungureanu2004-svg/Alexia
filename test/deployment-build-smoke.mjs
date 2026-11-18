import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [html, vercelConfig, appSource, checkoutSource] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('vercel.json', root), 'utf8'),
  readFile(new URL('app.js', root), 'utf8'),
  readFile(new URL('checkout.js', root), 'utf8'),
]);

assert.match(html, /<main\s+id="top"/i, 'The root route must resolve to the existing storefront document.');
assert.match(html, /<title>[^<]*LOOMY/i, 'The storefront entry document must remain LOOMY.');
assert.doesNotThrow(() => JSON.parse(vercelConfig), 'Vercel deployment configuration must be valid JSON.');
assert.ok(appSource.length > 0 && checkoutSource.length > 0, 'Core storefront scripts must be present.');
console.log('PASS build smoke: Vercel configuration, root document, and storefront scripts are present.');
