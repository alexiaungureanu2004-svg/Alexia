/* The server saves consent in Supabase and issues the customer-bound Stripe offer. */
(function () {
  'use strict';
  const endpoint = '/api/newsletter';

  async function subscribeNewsletter(email, consent) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!consent) throw new Error('Bifează acordul pentru a primi noutăți LOOMY.');
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Introdu o adresă de email validă.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: normalized, consent: true }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Abonarea nu a putut fi salvată. Încearcă din nou mai târziu.');
      if (result.subscribed !== true || typeof result.eligible !== 'boolean') throw new Error('Nu am putut confirma oferta. Încearcă din nou.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) {
        throw new Error('Nu am putut contacta serviciul. Verifică conexiunea și încearcă din nou.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  window.LoomySupabase = Object.freeze({ subscribeNewsletter });
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  const email = document.getElementById('email-input');
  const consent = document.getElementById('newsletter-consent');
  const message = document.getElementById('newsletter-message');
  const button = form.querySelector('button[type="submit"]');
  let pending = false;
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    message.dataset.state = 'pending';
    message.textContent = 'Salvăm abonarea…';
    try {
      const offer = await subscribeNewsletter(email.value, consent.checked);
      const saved = { email: email.value.trim().toLowerCase(), code: offer.code, eligible: offer.eligible };
      try {
        localStorage.setItem('loomy-newsletter-subscribed-v1', 'true');
        sessionStorage.setItem('loomy-welcome-offer-v1', JSON.stringify(saved));
      } catch { /* Subscription works without browser storage. */ }
      window.dispatchEvent(new CustomEvent('loomy:newsletter-subscribed', { detail: saved }));
      message.dataset.state = 'success';
      message.textContent = offer.eligible
        ? 'Bine ai venit! Codul LOOMY10 îți oferă 10% la prima comandă. Folosește-l la checkout cu emailul abonat.'
        : 'Mulțumim! Ești în lista LOOMY. Oferta de bun venit este rezervată primei comenzi.';
      form.reset();
    } catch (error) {
      message.dataset.state = 'error';
      message.textContent = error.message;
    } finally {
      pending = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}());
