(() => {
  // Paste the property's public GA4 Measurement ID here (format: G-XXXXXXXXXX).
  // Analytics remains inactive until this value is configured and a visitor opts in.
  const GA_MEASUREMENT_ID = '';
  const CONSENT_KEY = 'loomy-cookie-consent-v1';
  const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const banner = document.querySelector('#cookie-banner');
  const details = document.querySelector('#cookie-details');
  const detailsToggle = document.querySelector('#cookie-details-toggle');
  const analyticsToggle = document.querySelector('#cookie-analytics');
  const gaStatus = document.querySelector('#cookie-ga-status');
  if (!banner || !details || !detailsToggle || !analyticsToggle) return;

  const hasMeasurementId = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);
  let analyticsLoaded = false;

  if (!hasMeasurementId) {
    gaStatus.textContent = 'ID-ul de măsurare GA4 nu este configurat încă.';
  }

  function readConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if (!value || value.version !== 1 || typeof value.analytics !== 'boolean' || !Number.isFinite(value.savedAt)) return null;
      if (Date.now() - value.savedAt > CONSENT_MAX_AGE) {
        localStorage.removeItem(CONSENT_KEY);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }

  function removeAnalyticsCookies() {
    const names = document.cookie.split(';').map(item => item.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name));
    names.forEach(name => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  }

  function loadAnalytics() {
    if (!hasMeasurementId || analyticsLoaded) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments)};
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    if (!document.querySelector('#google-analytics-tag')) {
      const script = document.createElement('script');
      script.id = 'google-analytics-tag';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
      document.head.appendChild(script);
    }
    analyticsLoaded = true;
  }

  function applyAnalyticsConsent(allowed) {
    if (allowed) {
      loadAnalytics();
      return;
    }
    if (window.gtag && analyticsLoaded) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
      removeAnalyticsCookies();
    }
  }

  function saveConsent(analytics) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, analytics, savedAt: Date.now() }));
    } catch {
      // Keep the choice active for this visit even if browser storage is unavailable.
    }
    applyAnalyticsConsent(analytics);
    banner.hidden = true;
  }

  function showPreferences() {
    const current = readConsent();
    analyticsToggle.checked = Boolean(current?.analytics);
    details.hidden = false;
    detailsToggle.setAttribute('aria-expanded', 'true');
    banner.hidden = false;
  }

  document.querySelector('#cookie-accept')?.addEventListener('click', () => saveConsent(true));
  document.querySelector('#cookie-reject')?.addEventListener('click', () => saveConsent(false));
  document.querySelector('#cookie-customize')?.addEventListener('click', showPreferences);
  detailsToggle.addEventListener('click', () => {
    details.hidden = !details.hidden;
    detailsToggle.setAttribute('aria-expanded', String(!details.hidden));
  });
  document.querySelector('#cookie-save')?.addEventListener('click', () => saveConsent(analyticsToggle.checked));
  document.querySelector('#cookie-settings')?.addEventListener('click', showPreferences);

  const consent = readConsent();
  if (!consent) {
    banner.hidden = false;
  } else {
    applyAnalyticsConsent(consent.analytics);
  }
})();

