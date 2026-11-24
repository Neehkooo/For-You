import { randomInt } from 'node:crypto';
import { redis, configured } from '../../server/redis.js';

const MAX_TOKEN = 900_000;               // stays under Upstash's request size limit
const TTL_SECONDS = 60 * 60 * 24 * 730;  // letters are kept for at least two years
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LENGTH = 16;                    // 16 mixed-case alphanumeric chars: 57^16 ~= 1.6e28, prevents enumeration

// Cryptographically secure, unbiased random ID generator
const newId = () => Array.from({ length: ID_LENGTH }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join('');

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// POST /api/letters  { token, unlockAt?, box? }  ->  { id }
// The server only ever sees the already-encrypted letter.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Storage is not configured' });

  // Basic CSRF / Origin validation: if Origin header is present, check against Host
  const origin = req.headers['origin'];
  const host = req.headers['host'];
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host && !originHost.startsWith('localhost:')) {
        return res.status(403).json({ error: 'Cross-origin request rejected' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid origin header' });
    }
  }

  // Rate limiting: max 30 letter creations per hour per IP to prevent storage exhaustion
  const ip = getClientIp(req);
  try {
    const rateLimitKey = `ratelimit:create:${ip}`;
    const count = await redis(['INCR', rateLimitKey]);
    if (count === 1) {
      await redis(['EXPIRE', rateLimitKey, 3600]);
    }
    if (count > 30) {
      res.setHeader('Retry-After', '3600');
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
  } catch {
    // If rate limiting lookup fails, proceed cautiously
  }

  const { token, unlockAt, box, pinLength } = req.body || {};
  if (typeof token !== 'string' || token.length < 40 || token.length > MAX_TOKEN || !/^[A-Za-z0-9-]+$/.test(token))
    return res.status(400).json({ error: 'Invalid letter' });

  const now = Date.now();
  const unlock = Number.isFinite(unlockAt) && unlockAt > now && unlockAt < now + 5 * 365 * 864e5 ? Math.floor(unlockAt) : null;
  const colour = typeof box === 'string' && /^[a-z0-9_]{3,20}$/.test(box) ? box : null;
  // 0 = no passcode, 4 or 6 = digits. null means "unknown" for older letters.
  const pin = pinLength === 0 || pinLength === 4 || pinLength === 6 ? pinLength : null;
  const value = JSON.stringify({ t: token, u: unlock, b: colour, p: pin });

  // TTL: at least 2 years, or 1 year after the scheduled unlock time to prevent premature deletion
  const ttlSeconds = unlock
    ? Math.max(TTL_SECONDS, Math.ceil((unlock - now) / 1000) + 365 * 86400)
    : TTL_SECONDS;

  try {
    for (let i = 0; i < 5; i++) {
      const id = newId();
      if ((await redis(['SET', `letter:${id}`, value, 'EX', ttlSeconds, 'NX'])) === 'OK') return res.status(201).json({ id });
    }
    return res.status(500).json({ error: 'Could not create an id' });
  } catch {
    return res.status(502).json({ error: 'Storage error' });
  }
}
