import { redis, configured } from '../../server/redis.js';

// GET /api/letters/:id -> { token }  |  403 { unlockAt } before the scheduled time  |  404
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Storage is not configured' });

  const id = String(req.query.id || '');
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return res.status(404).json({ error: 'Not found' });

  try {
    const raw = await redis(['GET', `letter:${id}`]);
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const { t, u, b } = JSON.parse(raw);
    // The encrypted letter is withheld until the scheduled time, so it can't be opened early.
    if (u && Date.now() < u) return res.status(403).json({ unlockAt: u, box: b || null });
    return res.status(200).json({ token: t, box: b || null });
  } catch {
    return res.status(502).json({ error: 'Storage error' });
  }
}
