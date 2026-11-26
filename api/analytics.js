// GET /api/analytics -> { configured, week, month, project, fetchedAt }
// Proxies Vercel's Web Analytics REST API so the access token never reaches the browser.
// Required env vars (Vercel → Project → Settings → Environment Variables):
//   VERCEL_ANALYTICS_TOKEN  – a Vercel access token (Account → Settings → Tokens)
//   VERCEL_ANALYTICS_PROJECT_ID – the project id (prj_…) or project name
//   VERCEL_TEAM_ID          – optional, only for team-owned projects
const DAY = 86_400_000;

const token = () => process.env.VERCEL_ANALYTICS_TOKEN || process.env.VERCEL_TOKEN || '';
const projectId = () => process.env.VERCEL_ANALYTICS_PROJECT_ID || process.env.VERCEL_PROJECT_ID || '';
const teamId = () => process.env.VERCEL_TEAM_ID || '';

async function readCount(path, since) {
  const params = new URLSearchParams({ projectId: projectId(), since: String(since) });
  if (teamId()) params.set('teamId', teamId());
  const res = await fetch(`https://api.vercel.com/v1/query/web-analytics/${path}?${params}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Vercel API responded ${res.status}`);
  const json = await res.json();
  return {
    pageviews: Number(json?.data?.pageviews) || 0,
    visitors: Number(json?.data?.visitors) || 0,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!token() || !projectId()) return res.status(200).json({ configured: false });

  try {
    const now = Date.now();
    const [week, month] = await Promise.all([
      readCount('visits/count', now - 7 * DAY),
      readCount('visits/count', now - 30 * DAY),
    ]);
    return res.status(200).json({ configured: true, project: projectId(), week, month, fetchedAt: now });
  } catch (err) {
    return res.status(502).json({ configured: true, error: err.message || 'Analytics request failed' });
  }
}
