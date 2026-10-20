const products = {
  rds308: 'assets/loomy/rochie-neagra-corset.jpg',
  corset279: 'assets/loomy/corset-catifea-albastru.jpg',
  sacougri: 'assets/loomy/costum-gri.jpg',
  fustaplisata: 'assets/loomy/fusta-plisata-gri.jpg',
  basictee: 'assets/loomy/tricou-satin-bej.jpg',
  basicshirt: 'assets/loomy/top-satin-maro.jpg',
  pantaloni: 'assets/loomy/pantaloni-roz.jpg',
  rochiesatin: 'assets/loomy/rochie-satin-maro.jpg'
};

const recentRequests = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

function requestOrigin(req) {
  const envHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (envHost && /^[a-z0-9.-]+$/i.test(envHost)) return `https://${envHost}`;
  const requestHost = String(req.headers.host || '');
  if (/^[a-z0-9.-]+\.vercel\.app$/i.test(requestHost)) return `https://${requestHost}`;
  return null;
}

function rateLimited(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || 'unknown';
  const now = Date.now();
  const recent = (recentRequests.get(key) || []).filter(time => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true;
  recent.push(now);
  recentRequests.set(key, recent);
  if (recentRequests.size > 5000) {
    for (const [ip, times] of recentRequests) {
      if (!times.some(time => now - time < WINDOW_MS)) recentRequests.delete(ip);
    }
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { message: 'Metodă neacceptată.' });
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return json(res, 503, { message: 'Proba virtuală este pregătită, dar nu este activată încă. Mai întâi trebuie configurată cheia API FASHN în Vercel.' });

  if (req.method === 'POST') {
    if (rateLimited(req)) return json(res, 429, { message: 'Ai atins limita temporară de simulări. Încearcă din nou puțin mai târziu.' });
    const { productId, modelImage } = req.body || {};
    if (!Object.hasOwn(products, productId)) return json(res, 400, { message: 'Produsul ales nu este disponibil pentru proba virtuală.' });
    if (typeof modelImage !== 'string' || modelImage.length > 3_900_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(modelImage)) {
      return json(res, 400, { message: 'Alege o fotografie JPG, PNG sau WebP validă și încearcă din nou.' });
    }
    const origin = requestOrigin(req);
    if (!origin) return json(res, 503, { message: 'Proba virtuală este disponibilă după publicarea pe Vercel.' });
    try {
      const response = await fetch('https://api.fashn.ai/v1/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: 'tryon-v1.6',
          inputs: {
            model_image: modelImage,
            garment_image: `${origin}/${products[productId]}`,
            category: 'auto',
            moderation_level: 'permissive',
            mode: 'balanced',
            num_samples: 1,
            output_format: 'jpeg',
            return_base64: true
          }
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.id) return json(res, 502, { message: 'Serviciul de probă virtuală nu a putut porni simularea. Încearcă din nou mai târziu.' });
      return json(res, 202, { id: result.id });
    } catch {
      return json(res, 502, { message: 'Nu am putut contacta serviciul de probă virtuală. Încearcă din nou mai târziu.' });
    }
  }

  const predictionId = String(req.query?.predictionId || '');
  if (!/^[a-z0-9-]{8,100}$/i.test(predictionId)) return json(res, 400, { message: 'Cerere de simulare invalidă.' });
  try {
    const response = await fetch(`https://api.fashn.ai/v1/status/${encodeURIComponent(predictionId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json(res, 502, { message: 'Nu am putut prelua simularea.' });
    if (result.status === 'completed') {
      const image = Array.isArray(result.output) ? result.output[0] : null;
      if (typeof image !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) {
        return json(res, 502, { message: 'Serviciul nu a returnat o imagine temporară validă.' });
      }
      return json(res, 200, { status: 'completed', output: [image] });
    }
    if (result.status === 'failed') return json(res, 200, { status: 'failed', message: 'Simularea nu a reușit pentru această fotografie. Încearcă o imagine clară, din față, cu tot corpul vizibil.' });
    return json(res, 200, { status: result.status || 'processing' });
  } catch {
    return json(res, 502, { message: 'Nu am putut contacta serviciul de probă virtuală.' });
  }
};

