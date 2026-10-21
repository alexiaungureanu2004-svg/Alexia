const { stripeClient, originFor, json } = require('../lib/payments');
const { normalizeEmail, issueWelcomeOffer } = require('../lib/newsletter-offer');

const endpoint = 'https://rijculizyqoazgshlgel.supabase.co/rest/v1/newsletter_subscribers';
// Publishable only: existing RLS grants INSERT and exposes no subscriber records.
const publishableKey = 'sb_publishable_qhl7vVM_NxlVbKFPaI-yDg_HkWilgpu';
const attempts = new Map();

function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
  if (attempts.size > 5000) return true;
  const value = attempts.get(ip) || { count: 0, until: now + 60000 };
  value.count++;
  attempts.set(ip, value);
  // Best-effort per-instance protection, in addition to consent and the honeypot.
  return value.count > 8;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { message: 'Metodă neacceptată.' });
  }
  let saved = false;
  try {
    originFor(req);
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return json(res, 415, { message: 'Formatul cererii nu este acceptat.' });
    }
    if (rateLimited(req)) {
      res.setHeader('Retry-After', '60');
      return json(res, 429, { message: 'Ai încercat de mai multe ori. Revino peste un minut.' });
    }
    if (!req.body || JSON.stringify(req.body).length > 4096) return json(res, 400, { message: 'Verifică datele formularului.' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body?.consent !== true || body?.website) {
      return json(res, 400, { message: 'Bifează acordul pentru noutățile și ofertele LOOMY.' });
    }
    const email = normalizeEmail(body.email);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email, consent: true }), signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      if (!(response.status === 409 && result.code === '23505')) throw new Error('SIGNUP_UNAVAILABLE');
    }
    saved = true;
    const offer = await issueWelcomeOffer(stripeClient(), email);
    return json(res, 200, { subscribed: true, ...offer, delivery: 'onscreen' });
  } catch (error) {
    if (error.message === 'INVALID_ORIGIN') return json(res, 403, { message: 'Abonează-te de pe site-ul LOOMY.' });
    if (error.message === 'INVALID_EMAIL' || error instanceof SyntaxError) return json(res, 400, { message: 'Introdu o adresă de email validă.' });
    console.error('Newsletter request failed', { code: error.code || error.name, stage: saved ? 'offer' : 'signup' });
    return json(res, 503, { message: saved
      ? 'Abonarea a fost salvată, dar codul nu a putut fi pregătit. Reîncearcă pentru a-l primi.'
      : 'Nu am putut salva abonarea. Verifică conexiunea și încearcă din nou.' });
  }
};
