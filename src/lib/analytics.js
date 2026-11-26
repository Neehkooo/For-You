// Vercel Web Analytics helpers.
// `track()` is a no-op in development and on deployments where Analytics is not
// enabled, so every call is guarded and can never break the letter flow.
import { track } from '@vercel/analytics';

export const trackEvent = (name, props) => {
  try {
    track(name, props);
  } catch {
    /* analytics unavailable */
  }
};

// Reads the server-side summary from /api/analytics (Vercel Web Analytics REST proxy).
export async function fetchSiteAnalytics() {
  const res = await fetch('/api/analytics', { cache: 'no-store' });
  const type = res.headers.get('content-type') || '';
  // Local `vite dev` has no serverless functions: treat it as unconfigured, not broken.
  if (!res.ok || !type.includes('application/json')) return { configured: false };
  const json = await res.json();
  if (json?.error) throw new Error(json.error);
  return json;
}
