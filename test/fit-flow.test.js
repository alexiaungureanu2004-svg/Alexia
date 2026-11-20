const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const checkout = fs.readFileSync(path.join(root, 'checkout.js'), 'utf8');

test('how-it-works section explains the confirmed product-to-test-checkout path', () => {
  const section = html.match(/<section class="made-section" id="cum-lucram"[\\s\\S]*?<\\/section>/)?.[0];
  assert.ok(section, 'How-it-works section should exist.');
  assert.match(section, /Alege produsul și mărimea/);
  assert.match(section, /una dintre mărimile disponibile S, M sau L/);
  assert.match(section, /produsul, mărimea și cantitatea/);
  assert.match(section, /nu este trimis automat la checkout/);
  assert.match(section, /Plata de test nu încasează bani și nu creează o comandă de producție/);
  assert.match(section, /Pentru o comandă reală confirmată, atelierul te contactează/);
});

test('checkout sends only cart product, selected size, and quantity; successful test payment is labeled as test', () => {
  assert.match(checkout, /cart\\.map\\(\\(\\{ id, size, qty \\}\\) => \\(\\{ id, size, qty \\}\\)\\)/);
  assert.match(checkout, /body: JSON\\.stringify\\(\\{ items, requestId: request\\.id \\}\\)/);
  assert.match(checkout, /result\\.testMode \\? `Plată de test reușită/);
  assert.match(checkout, /Nu au fost debitați bani și nu se expediază produse/);
});

test('main navigation links to the explanation and product cards show available sizes', () => {
  assert.match(html, /<a href="#cum-lucram">Made to measure<\/a>/);
  assert.match(html, /<section class="made-section" id="cum-lucram"/);
  assert.match(app, /\$\{p\.category\} · mărimi \$\{p\.sizes\.join\(', '\)\} · fiecare piesă este croită la comandă/);
  assert.match(app, /aria-label="Mărimea \$\{s\}"/);
});

