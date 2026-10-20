(function () {
  'use strict';
  const button = document.getElementById('checkout-button');
  const status = document.getElementById('checkout-status');
  const banner = document.getElementById('payment-result');
  let busy = false;
  const requestKey = 'loomy-checkout-request';
  function read(key, storage = localStorage) {
    try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; }
  }
  function setStatus(message) { status.textContent = message; }

  button.addEventListener('click', async () => {
    if (busy || !cart.length) return;
    busy = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('Deschidem pagina securizată Stripe…');
    const items = cart.map(({ id, size, qty }) => ({ id, size, qty }));
    const fingerprint = JSON.stringify(items);
    let request = read(requestKey, sessionStorage);
    if (!request || request.fingerprint !== fingerprint) request = { id: crypto.randomUUID(), fingerprint };
    try {
      try { sessionStorage.setItem(requestKey, JSON.stringify(request)); } catch { /* Payment also works without browser storage. */ }
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, requestId: request.id }), signal: AbortSignal.timeout(25000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Plata nu este disponibilă.');
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Pagina de plată nu este validă.');
      try { sessionStorage.setItem(`loomy-paid-cart:${result.id}`, JSON.stringify(items)); } catch { /* Keep cart if snapshot cannot be saved. */ }
      window.location.assign(url.href);
    } catch (error) {
      setStatus(error.name === 'TimeoutError' ? 'Stripe răspunde mai greu. Reîncearcă; produsele sunt păstrate în coș.' : (error.message || 'Nu am putut deschide plata. Încearcă din nou.'));
      busy = false;
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  function showResult(message, kind = 'info') {
    banner.hidden = false;
    banner.dataset.kind = kind;
    banner.querySelector('p').textContent = message;
  }
  banner.querySelector('button').addEventListener('click', () => { banner.hidden = true; });
  async function verifyReturn() {
    const query = new URLSearchParams(location.search);
    if (!query.has('checkout')) return;
    const state = query.get('checkout');
    const id = query.get('session_id');
    if (state === 'cancelled') {
      showResult('Plata a fost anulată. Produsele tale sunt în continuare în coș.');
      openCart();
    } else if (state === 'success' && id) {
      showResult('Verificăm plata cu Stripe…');
      try {
        const response = await fetch(`/api/checkout?session_id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(25000) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (result.paid) {
          const purchased = read(`loomy-paid-cart:${id}`, sessionStorage);
          if (Array.isArray(purchased)) {
            cart = cart.map(item => ({ ...item, qty: item.qty - purchased.filter(x => x.id === item.id && x.size === item.size).reduce((sum, x) => sum + x.qty, 0) })).filter(item => item.qty > 0);
            updateCart();
            sessionStorage.removeItem(`loomy-paid-cart:${id}`);
            sessionStorage.removeItem(requestKey);
          }
          showResult(result.testMode ? `Plată de test reușită · ${result.reference}. Nu au fost debitați bani și nu se expediază produse.` : `Plata a fost confirmată · ${result.reference}. Îți mulțumim pentru comandă!`, 'success');
        } else {
          showResult('Plata nu este încă confirmată de Stripe. Coșul este păstrat. Revino la această pagină pentru reverificare.');
          return;
        }
      } catch {
        showResult('Nu am putut verifica plata. Coșul este păstrat. Reîncarcă pagina pentru a verifica din nou.');
        return;
      }
    }
    query.delete('checkout'); query.delete('session_id');
    history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
  }
  verifyReturn();
})();
