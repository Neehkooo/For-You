import { redis, configured } from '../../server/redis.js';

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// GET /api/letters/:id -> { token }  |  403 { unlockAt } before the scheduled time  |  404
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Storage is not configured' });

  // Rate limiting: max 60 queries per minute per IP to prevent letter ID scanning
  const ip = getClientIp(req);
  try {
    const rateLimitKey = `ratelimit:get:${ip}`;
    const count = await redis(['INCR', rateLimitKey]);
    if (count === 1) {
      await redis(['EXPIRE', rateLimitKey, 60]);
    }
    if (count > 60) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
  } catch {
    // If rate limiting lookup fails, proceed cautiously
  }

  const id = String(req.query.id || '');
  if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return res.status(404).json({ error: 'Not found' });

  try {
    const raw = await redis(['GET', `letter:${id}`]);
    if (!raw) return res.status(404).json({ error: 'Not found' });
    const { t, u, b, p, n } = JSON.parse(raw);
    const pinLength = typeof p === 'number' ? p : null;
    const pinNote = typeof n === 'string' ? n.slice(0, 140) : '';
    // The encrypted letter is withheld until the scheduled time, so it can't be opened early.
    if (u && Date.now() < u) return res.status(403).json({ unlockAt: u, box: b || null, pinLength, pinNote });
    return res.status(200).json({ token: t, box: b || null, pinLength, pinNote });
  } catch {
    return res.status(502).json({ error: 'Storage error' });
  }
}
