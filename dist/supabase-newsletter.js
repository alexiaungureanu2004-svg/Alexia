/* Public Supabase key; database grants and RLS protect subscriber records. */
(function () {
  'use strict';
  const endpoint = 'https://rijculizyqoazgshlgel.supabase.co/rest/v1/newsletter_subscribers';
  const publishableKey = 'sb_publishable_qhl7vVM_NxlVbKFPaI-yDg_HkWilgpu';

  async function subscribeNewsletter(email, consent) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!consent) throw new Error('Bifează acordul pentru a primi noutăți LOOMY.');
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Introdu o adresă de email validă.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: publishableKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ email: normalized, consent: true }),
        signal: controller.signal
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        // Repeated subscriptions do not change the original consent.
        if (response.status === 409 && result.code === '23505') return;
        throw new Error('Abonarea nu a putut fi salvată. Încearcă din nou mai târziu.');
      }
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
      await subscribeNewsletter(email.value, consent.checked);
      message.dataset.state = 'success';
      message.textContent = 'Mulțumim! Adresa ta este înregistrată pentru noutățile LOOMY.';
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
