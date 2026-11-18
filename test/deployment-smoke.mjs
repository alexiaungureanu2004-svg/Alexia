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
assert.match(html, /<link rel="canonical" href="https:\/\/alexia-theta\.vercel\.app\/">/i);
assert.match(html, /<meta property="og:image" content="https:\/\/loomythebrand\.com\/cdn\/shop\/files\/image-1793885650410\.png/i);

const sitemapResponse = await fetch(new URL('/sitemap.xml', url.origin), { redirect: 'follow', signal: AbortSignal.timeout(15000) });
assert.equal(sitemapResponse.status, 200, `Sitemap returned HTTP ${sitemapResponse.status}`);
assert.match(sitemapResponse.headers.get('content-type') ?? '', /application\/xml/i);
const sitemap = await sitemapResponse.text();
assert.match(sitemap, /<loc>https:\/\/alexia-theta\.vercel\.app\/<\/loc>/i);

const robotsResponse = await fetch(new URL('/robots.txt', url.origin), { redirect: 'follow', signal: AbortSignal.timeout(15000) });
assert.equal(robotsResponse.status, 200, `robots.txt returned HTTP ${robotsResponse.status}`);
assert.match(await robotsResponse.text(), /Sitemap:\s*https:\/\/alexia-theta\.vercel\.app\/sitemap\.xml/i);
assert.match(html, /Descoperă produsele/i);
console.log(`PASS ${url.origin}/ returned HTTP 200 with the LOOMY storefront, metadata, sitemap, and robots.txt.`);
