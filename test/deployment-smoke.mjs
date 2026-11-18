import assert from 'node:assert/strict';

const baseUrl = process.argv[2] ?? process.env.BASE_URL;
assert.ok(baseUrl, 'Pass the public deployment URL or set BASE_URL.');
const url = new URL(baseUrl);
assert.equal(url.protocol, 'https:', 'Deployment smoke checks require HTTPS.');

const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
assert.equal(response.status, 200, `Root route returned HTTP ${response.status}`);
assert.match(response.headers.get('content-type') ?? '', /text\/html/i);
const html = await response.text();
assert.match(html, /<title>[^<]*LOOMY/i);
assert.match(html, /Descoperă produsele/i);
console.log(`PASS ${url.origin}/ returned HTTP 200 with the LOOMY storefront.`);
