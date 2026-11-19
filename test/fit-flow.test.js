const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('how-it-works section explains standard/custom fit and confirmed atelier contact', () => {
  const section = html.match(/<section class="made-section" id="cum-lucram"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'How-it-works section should exist.');
  assert.match(section, /Selectează S, M sau L/);
  assert.match(section, /bustul, talia și șoldul/);
  assert.match(section, /se salvează doar în acest browser și nu este trimis automat odată cu comanda/);
  assert.match(section, /Atelierul te contactează după confirmarea comenzii/);
});

test('main navigation links to the explanation and product cards show available sizes', () => {
  assert.match(html, /<a href="#cum-lucram">Made to measure<\/a>/);
  assert.match(html, /<section class="made-section" id="cum-lucram"/);
  assert.match(app, /\$\{p\.category\} · mărimi \$\{p\.sizes\.join\(', '\)\} · fiecare piesă este croită la comandă/);
  assert.match(app, /aria-label="Mărimea \$\{s\}"/);
});

