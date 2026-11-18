import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = 'https://alexia-theta.vercel.app/';
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const robots = await readFile(resolve(root, 'robots.txt'), 'utf8');

assert.match(html, /<title>LOOMY — făcută să ți se potrivească<\/title>/);
assert.match(html, /<meta name="description" content="Piese LOOMY create la comandă, pe măsurile tale\./);
assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
assert.match(html, /<meta property="og:type" content="website">/);
assert.match(html, /<meta property="og:site_name" content="LOOMY">/);
assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
assert.match(html, /<meta property="og:image" content="https:\/\/loomythebrand\.com\/cdn\/shop\/files\/image-1793885650410\.png/);
assert.match(html, /<meta name="twitter:card" content="summary">/);
assert.match(html, /<meta name="twitter:image" content="https:\/\/loomythebrand\.com\/cdn\/shop\/files\/image-1793885650410\.png/);
assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
assert.match(robots, /Sitemap: https:\/\/alexia-theta\.vercel\.app\/sitemap\.xml/);

const server = createServer((request, response) => {
  if (request.url !== '/sitemap.xml') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': 'application/xml; charset=utf-8' });
  response.end(sitemap);
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
try {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/sitemap.xml`);
  assert.equal(response.status, 200, 'sitemap.xml should return HTTP 200');
  assert.match(response.headers.get('content-type') ?? '', /application\/xml/i);
  assert.match(await response.text(), /<urlset\b/);
} finally {
  await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
}
console.log('PASS SEO metadata and sitemap.xml HTTP response.');
