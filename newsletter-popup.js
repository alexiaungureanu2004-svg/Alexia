(function () {
  'use strict';
  const dialog = document.getElementById('newsletter-popup');
  const form = document.getElementById('welcome-form');
  const launcher = document.getElementById('newsletter-launcher');
  if (!dialog || !form || !launcher) return;
  const email = document.getElementById('welcome-email');
  const consent = document.getElementById('welcome-consent');
  const message = document.getElementById('welcome-message');
  const result = document.getElementById('welcome-result');
  const code = document.getElementById('welcome-code');
  const copy = document.getElementById('welcome-copy');
  const submit = form.querySelector('button[type="submit"]');
  const offerKey = 'loomy-welcome-offer-v1';
  const dismissedKey = 'loomy-welcome-dismissed-v1';
  const subscribedKey = 'loomy-newsletter-subscribed-v1';
  let pending = false;
  let previousFocus;
  let autoTimer;
  let currentOffer;
  let copyTimer;

  function read(key, storage) {
    try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; }
  }
  function store(key, value, storage) {
    try { storage.setItem(key, JSON.stringify(value)); } catch { /* Form also works without browser storage. */ }
  }
  function displayOffer(offer) {
    currentOffer = offer;
    form.hidden = true;
    result.hidden = false;
    const eligible = offer.eligible === true && offer.code === 'LOOMY10';
    code.textContent = eligible ? offer.code : '';
    code.hidden = !eligible;
    copy.hidden = !eligible;
    document.getElementById('welcome-offer-message').textContent = eligible
      ? 'Codul tău pentru prima comandă:'
      : 'Ești în lista LOOMY. Oferta de bun venit este rezervată primei comenzi și nu se reactivează prin reabonare.';
    launcher.querySelector('span').textContent = eligible ? 'Codul tău de bun venit' : 'Newsletter LOOMY';
    document.getElementById('welcome-result-email').textContent = offer.email;
  }
  function closePopup() {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove('newsletter-open');
    store(dismissedKey, Date.now(), localStorage);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function openPopup() {
    if (dialog.open) return;
    clearTimeout(autoTimer);
    previousFocus = document.activeElement;
    const saved = currentOffer || read(offerKey, sessionStorage);
    if (typeof saved?.eligible === 'boolean' && typeof saved.email === 'string') displayOffer(saved);
    dialog.showModal();
    document.body.classList.add('newsletter-open');
    (form.hidden ? (copy.hidden ? document.getElementById('welcome-shop') : copy) : email).focus({ preventScroll: true });
  }
  launcher.addEventListener('click', openPopup);
  document.querySelectorAll('[data-open-newsletter]').forEach(button => button.addEventListener('click', openPopup));
  dialog.querySelectorAll('[data-welcome-close]').forEach(button => button.addEventListener('click', closePopup));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePopup(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePopup();
  });
  document.getElementById('welcome-shop').addEventListener('click', closePopup);
  document.getElementById('welcome-other-email').addEventListener('click', () => {
    currentOffer = null;
    try { sessionStorage.removeItem(offerKey); } catch { /* Continue without storage. */ }
    result.hidden = true;
    form.hidden = false;
    launcher.querySelector('span').textContent = 'La prima comandă';
    form.reset();
    message.textContent = '';
    email.focus({ preventScroll: true });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    if (!window.LoomySupabase?.subscribeNewsletter) {
      message.dataset.state = 'error';
      message.textContent = 'Formularul nu s-a încărcat. Reîncarcă pagina și încearcă din nou.';
      return;
    }
    pending = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    message.dataset.state = 'pending';
    message.textContent = 'Salvăm abonarea…';
    try {
      const normalized = email.value.trim().toLowerCase();
      const response = await window.LoomySupabase.subscribeNewsletter(normalized, consent.checked);
      if (response?.subscribed !== true || typeof response.eligible !== 'boolean') throw new Error('Nu am putut confirma oferta. Încearcă din nou.');
      const offer = { email: normalized, code: response.code, eligible: response.eligible };
      store(subscribedKey, true, localStorage);
      store(offerKey, offer, sessionStorage);
      displayOffer(offer);
      window.dispatchEvent(new CustomEvent('loomy:newsletter-subscribed', { detail: offer }));
      form.reset();
      if (dialog.open) (offer.eligible ? copy : document.getElementById('welcome-shop')).focus({ preventScroll: true });
    } catch (error) {
      message.dataset.state = 'error';
      message.textContent = error.message || 'Nu am putut salva abonarea. Încearcă din nou.';
    } finally {
      pending = false;
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
  window.addEventListener('loomy:newsletter-subscribed', event => {
    if (event.detail && typeof event.detail.eligible === 'boolean') displayOffer(event.detail);
  });
  window.addEventListener('loomy:purchase-confirmed', () => {
    currentOffer = null;
    try { sessionStorage.removeItem(offerKey); } catch { /* No persistent state to clear. */ }
    launcher.querySelector('span').textContent = 'Newsletter LOOMY';
    form.hidden = false;
    result.hidden = true;
  });

  copy.addEventListener('click', async () => {
    clearTimeout(copyTimer);
    try {
      await navigator.clipboard.writeText(code.textContent);
      copy.textContent = 'Cod copiat ✓';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copy.textContent = 'Copiază codul selectat';
    }
    copyTimer = setTimeout(() => { copy.textContent = 'Copiază codul'; }, 2500);
  });

  function attemptAutoOpen() {
    const dismissed = read(dismissedKey, localStorage);
    if (read(subscribedKey, localStorage) || (typeof dismissed === 'number' && Date.now() - dismissed < 7 * 86400000)) return;
    const active = document.activeElement;
    const cookieBanner = document.getElementById('cookie-banner');
    if (document.hidden || (cookieBanner && !cookieBanner.hidden) || document.querySelector('.overlay.open') ||
        document.querySelector('dialog[open]') || active?.matches('input, textarea, select, [contenteditable="true"]')) {
      autoTimer = setTimeout(attemptAutoOpen, 2000);
      return;
    }
    openPopup();
  }
  autoTimer = setTimeout(attemptAutoOpen, 8000);
  window.addEventListener('pagehide', () => { clearTimeout(autoTimer); clearTimeout(copyTimer); });
}());
