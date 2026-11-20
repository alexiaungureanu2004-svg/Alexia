(function (root) {
  'use strict';

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function markup(product) {
    const name = escapeHTML(product.name);
    const source = escapeHTML(product.image);
    return `<img class="product-source-image" src="${source}" alt="${name}" width="730" height="1000" loading="lazy" decoding="async"><span class="product-image-fallback" role="img" aria-label="Imagine indisponibilă pentru ${name}" hidden>Imagine indisponibilă</span>`;
  }

  function handleError(event) {
    const image = event.target;
    if (!image?.matches?.('.product-source-image')) return false;
    const frame = image.closest('.product-image');
    const fallback = frame?.querySelector('.product-image-fallback');
    if (!frame || !fallback) return false;
    image.hidden = true;
    fallback.hidden = false;
    frame.classList.add('image-unavailable');
    return true;
  }

  const api = { markup, handleError };
  root.LoomyProductImages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

