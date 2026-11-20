const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const productImages = require('../product-images');

const root = path.resolve(__dirname, '..');
const catalogSource = fs.readFileSync(path.join(root, 'catalog-data.js'), 'utf8');
const catalogContext = { window: {} };
vm.runInNewContext(catalogSource, catalogContext);
const products = catalogContext.window.loomyCatalogProducts;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('all catalog product images preserve their source and have stable, accessible markup', () => {
  assert.equal(products.length, 122);
  for (const product of products) {
    const markup = productImages.markup(product);
    assert.ok(markup.includes(`src="${product.image}"`), `${product.id} should use its catalog image`);
    assert.ok(markup.includes(`alt="${product.name}"`), `${product.id} should have product-specific alt text`);
    assert.match(markup, /width="730" height="1000" loading="lazy" decoding="async"/);
    assert.match(markup, /class="product-image-fallback" role="img" aria-label="Imagine indisponibilă pentru /);
    assert.match(markup, />Imagine indisponibilă<\/span>$/);
    assert.match(styles, /\.product-image \{[^}]*aspect-ratio:\s*\.73/);
  }
});

test('failed product image reveals the accessible fallback and hides the broken image', () => {
  const classes = new Set();
  const fallback = { hidden: true };
  const frame = {
    querySelector(selector) { return selector === '.product-image-fallback' ? fallback : null; },
    classList: { add(name) { classes.add(name); } }
  };
  const image = {
    hidden: false,
    matches(selector) { return selector === '.product-source-image'; },
    closest(selector) { return selector === '.product-image' ? frame : null; }
  };
  assert.equal(productImages.handleError({ target: image }), true);
  assert.equal(image.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.equal(classes.has('image-unavailable'), true);
  assert.equal(productImages.handleError({ target: { matches: () => false } }), false);
});

test('dynamic product cards use the fallback helper and load the handler before app initialization', () => {
  assert.match(html, /<script src="product-images\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.match(app, /window\.LoomyProductImages\.markup\(p\)/);
  assert.match(app, /addEventListener\('error',window\.LoomyProductImages\.handleError,true\)/);
});

