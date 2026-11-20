const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'cookie-consent.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'cookie-consent.js'), 'utf8');

function makeElement() {
  return {
    hidden: true,
    checked: false,
    textContent: '',
    attributes: {},
    listeners: {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
}

function boot(consent = null) {
  const ids = [
    'cookie-banner', 'cookie-details', 'cookie-details-toggle', 'cookie-analytics',
    'cookie-ga-status', 'cookie-accept', 'cookie-reject', 'cookie-customize',
    'cookie-save', 'cookie-settings'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, makeElement()]));
  const stored = new Map();
  if (consent) stored.set('loomy-cookie-consent-v2', JSON.stringify(consent));
  const appendedScripts = [];
  const cookieWrites = [];
  const document = {
    cookie: '_ga=old; _ga_TEST=old-too',
    head: { appendChild(element) { appendedScripts.push(element); } },
    querySelector(selector) {
      if (selector === '#google-analytics-tag') return appendedScripts[0] || null;
      return elements[selector.slice(1)] || null;
    },
    createElement() { return {}; }
  };
  Object.defineProperty(document, 'cookie', {
    get() { return '_ga=old; _ga_TEST=old-too'; },
    set(value) { cookieWrites.push(value); }
  });
  const context = {
    document,
    window: {},
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, value); },
      removeItem(key) { stored.delete(key); }
    },
    Date,
    JSON,
    encodeURIComponent
  };
  vm.runInNewContext(source, context);
  return { elements, stored, appendedScripts, cookieWrites, context };
}

function click(element) {
  assert.equal(typeof element.listeners.click, 'function', 'expected click action to be wired');
  element.listeners.click();
}

test('panel is present with reject, customize, accept, details, and save actions', () => {
  const panel = html.match(/<section class="cookie-consent"[\s\S]*?<\/section>/)?.[0];
  assert.ok(panel, 'cookie panel exists in the page');
  for (const id of ['cookie-reject', 'cookie-customize', 'cookie-accept', 'cookie-details-toggle', 'cookie-analytics', 'cookie-save']) {
    assert.match(panel, new RegExp(`id="${id}"`));
  }
  assert.match(panel, /id="cookie-copy"/);\n  assert.match(panel, /id="cookie-banner"[^>]*\shidden/);
  assert.match(panel, /aria-controls="cookie-details"/);
});

test('mobile panel keeps the full message visible and leaves preferences scrollable', () => {
  assert.match(css, /width:\s*min\(100%\s*-\s*48px,\s*480px\)/);
  assert.match(css, /max-height:\s*min\(78vh,\s*680px\)/);
  assert.match(css, /overflow-y:\s*auto/);
  const mobile = css.slice(css.indexOf('@media (max-width: 560px)'));
  assert.match(mobile, /max-height:\s*min\(64dvh,\s*560px\)/);
  assert.match(mobile, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(mobile, /\.cookie-button\s*\{[^}]*min-height:\s*46px;/);
  assert.match(mobile, /\.cookie-details-toggle\s*\{[^}]*min-height:\s*44px;/);
  assert.doesNotMatch(mobile, /position:\s*sticky/);
  assert.doesNotMatch(mobile, /max-height:\s*min\((?:28vh|18vh|14vh)/);
});
test('first visit shows the panel and reject saves a denied analytics choice', () => {
  const app = boot();
  assert.equal(app.elements['cookie-banner'].hidden, false);
  click(app.elements['cookie-reject']);
  assert.equal(app.elements['cookie-banner'].hidden, true);
  assert.equal(JSON.parse(app.stored.get('loomy-cookie-consent-v2')).analytics, false);
  assert.equal(app.appendedScripts.length, 0);
});

test('customize and details toggle expose preferences; saving opt-in loads GA4', () => {
  const app = boot();
  click(app.elements['cookie-customize']);
  assert.equal(app.elements['cookie-details'].hidden, false);
  assert.equal(app.elements['cookie-details-toggle'].attributes['aria-expanded'], 'true');
  click(app.elements['cookie-details-toggle']);
  assert.equal(app.elements['cookie-details'].hidden, true);
  assert.equal(app.elements['cookie-details-toggle'].attributes['aria-expanded'], 'false');
  click(app.elements['cookie-details-toggle']);
  app.elements['cookie-analytics'].checked = true;
  click(app.elements['cookie-save']);
  assert.equal(app.elements['cookie-banner'].hidden, true);
  assert.equal(JSON.parse(app.stored.get('loomy-cookie-consent-v2')).analytics, true);
  assert.equal(app.appendedScripts.length, 1);
  assert.match(app.appendedScripts[0].src, /googletagmanager\.com\/gtag\/js\?id=G-ZMF0209P91/);
});

test('accept all opts in, and returning settings can revoke and remove analytics cookies', () => {
  const app = boot();
  click(app.elements['cookie-accept']);
  assert.equal(JSON.parse(app.stored.get('loomy-cookie-consent-v2')).analytics, true);
  assert.equal(app.appendedScripts.length, 1);
  click(app.elements['cookie-settings']);
  assert.equal(app.elements['cookie-analytics'].checked, true);
  app.elements['cookie-analytics'].checked = false;
  click(app.elements['cookie-save']);
  assert.equal(JSON.parse(app.stored.get('loomy-cookie-consent-v2')).analytics, false);
  assert.deepEqual(app.cookieWrites, [
    '_ga=; Max-Age=0; path=/; SameSite=Lax',
    '_ga_TEST=; Max-Age=0; path=/; SameSite=Lax'
  ]);
});

