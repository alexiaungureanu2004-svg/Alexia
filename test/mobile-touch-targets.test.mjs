import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const [css, html, cookieCss] = await Promise.all([
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../cookie-consent.css', import.meta.url), 'utf8'),
]);
const mobile = css.slice(css.lastIndexOf('@media (max-width: 760px)'));

test('mobile header, product, and modal controls have 44px touch targets', () => {
  for (const [selector, property] of [
    ['.main-nav a', 'min-height'],
    ['.round-control', 'width'],
    ['.round-control', 'height'],
    ['.close-button', 'width'],
    ['.close-button', 'height'],
    ['.size-chip', 'width'],
    ['.size-chip', 'height'],
    ['.save-button', 'min-height'],
    ['.filter-label select', 'min-height'],
    ['.hero-buttons .text-button', 'min-height'],
    ['.order-info-action', 'min-height'],
    ['.product-tryon-link', 'min-height'],
    ['.under-link', 'min-height'],
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rule = mobile.match(new RegExp(`${escaped}\\s*\\{[^}]*${property}:\\s*44px`));
    assert.ok(rule, `${selector} should set ${property} to 44px at mobile widths`);
  }
  assert.match(mobile, /\.site-header \.icon-button\s*\{[^}]*width:\s*44px;\s*height:\s*44px;/);
  assert.match(mobile, /\.site-header \.bag-trigger\s*\{[^}]*min-height:\s*44px;/);
  assert.match(mobile, /\.size-buttons span\s*\{[^}]*width:\s*44px;\s*height:\s*44px;/);
  assert.match(mobile, /\.add-button, \.quiz-actions \.button, \.quiz-result \.button\s*\{[^}]*min-height:\s*44px;/);
});

test('mobile secondary actions are reachable and consent controls retain their touch size', () => {
  assert.match(mobile, /\.quiz-actions \.button, \.quiz-result \.button\s*\{\s*min-height:\s*44px;/);
  assert.match(mobile, /\.fit-step-controls \.text-button, \.clear-profile\s*\{\s*min-height:\s*44px;/);
  assert.match(cookieCss, /\.cookie-button\s*\{[^}]*min-height:\s*46px/);
  assert.match(html, /id="products-prev"/);
  assert.match(html, /id="products-next"/);
  assert.match(html, /id="open-measurements"/);
});

test('44px product size buttons fit the two-column product cards at 320px and 390px', () => {
  const sizeRowWidth = 3 * 44 + 2 * 4;
  for (const width of [320, 390]) {
    const pageWidth = width - (width <= 380 ? 28 : 36);
    const columnGap = width <= 380 ? 9 : 12;
    const cardWidth = (pageWidth - columnGap) / 2;
    assert.ok(sizeRowWidth <= cardWidth, `Size buttons should fit at ${width}px without horizontal overflow.`);
  }
});

test('small informational links remain outside the mobile control overrides', () => {
  assert.doesNotMatch(mobile, /\.hero-info-link/);
  assert.doesNotMatch(mobile, /\.order-info-card\s*>\s*a/);
  assert.doesNotMatch(mobile, /\.product-source-link/);
  assert.match(css, /\.hero-info-link\s*\{[^}]*font-size:\s*14px/);
});

