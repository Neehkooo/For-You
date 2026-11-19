import { randomBytes } from 'node:crypto';
import { redis, configured } from '../../server/redis.js';

const MAX_TOKEN = 900_000;               // stays under Upstash's request size limit
const TTL_SECONDS = 60 * 60 * 24 * 730;  // letters are kept for two years
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const newId = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');

// POST /api/letters  { token, unlockAt? }  ->  { id }
// The server only ever sees the already-encrypted letter.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Storage is not configured' });

  const { token, unlockAt, box } = req.body || {};
  if (typeof token !== 'string' || token.length < 40 || token.length > MAX_TOKEN || !/^[A-Za-z0-9-]+$/.test(token))
    return res.status(400).json({ error: 'Invalid letter' });

  const now = Date.now();
  const unlock = Number.isFinite(unlockAt) && unlockAt > now && unlockAt < now + 5 * 365 * 864e5 ? Math.floor(unlockAt) : null;
  const colour = typeof box === 'string' && /^[a-z]{3,6}$/.test(box) ? box : null;
  const value = JSON.stringify({ t: token, u: unlock, b: colour });

  try {
    for (let i = 0; i < 5; i++) {
      const id = newId();
      if ((await redis(['SET', `letter:${id}`, value, 'EX', TTL_SECONDS, 'NX'])) === 'OK') return res.status(201).json({ id });
    }
    return res.status(500).json({ error: 'Could not create an id' });
  } catch {
    return res.status(502).json({ error: 'Storage error' });
  }
}
