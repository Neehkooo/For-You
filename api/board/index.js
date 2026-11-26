import { randomInt, timingSafeEqual } from 'node:crypto';
import { redis, configured } from '../../server/redis.js';

// Public board: notes live for 24 hours and then vanish. Nothing is archived.
const NOTE_TTL_SECONDS = 60 * 60 * 24;
const NOTE_TTL_MS = NOTE_TTL_SECONDS * 1000;
const MAX_TEXT = 280;
const MAX_NAME = 24;
const MAX_NOTES = 80; // newest first, enough to fill a wall
const COLORS = new Set(['butter', 'rose', 'mint', 'sky', 'lilac', 'peach']);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LENGTH = 12;
const TOKEN_LENGTH = 24;

const newId = () => Array.from({ length: ID_LENGTH }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join('');
const newToken = () => Array.from({ length: TOKEN_LENGTH }, () => ALPHABET[randomInt(0, ALPHABET.length)]).join('');

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

// Strip control characters (newlines and tabs are kept) and normalise line breaks.
const cleanText = (value, max) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, max * 2)
    .trim()
    .slice(0, max)
    .trim();
};

// Optional moderation key. Without it, notes can only be removed by their author
// (or by their author's delete token) and by expiry.
const adminKeyMatches = (req) => {
  const expected = process.env.BOARD_ADMIN_KEY;
  if (!expected) return false;
  const given = req.headers['x-board-admin'];
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  } catch {
    return false;
  }
};

const isSameOrigin = (req) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host || originHost.startsWith('localhost:') || originHost.startsWith('127.0.0.1:');
  } catch {
    return false;
  }
};

const rateLimited = async (req, res, scope, limit, windowSeconds) => {
  try {
    const key = `ratelimit:board:${scope}:${getClientIp(req)}`;
    const count = await redis(['INCR', key]);
    if (count === 1) await redis(['EXPIRE', key, windowSeconds]);
    if (count > limit) {
      res.setHeader('Retry-After', String(windowSeconds));
      res.status(429).json({ error: 'Too many notes for now. Please try again later.' });
      return true;
    }
  } catch {
    /* If the limiter itself fails, let the request through. */
  }
  return false;
};

const currentVersion = async () => Number(await redis(['GET', 'board:version'])) || 0;

const publicNote = (id, raw) => {
  try {
    const n = JSON.parse(raw);
    return {
      id,
      text: n.text,
      name: n.name || '',
      color: COLORS.has(n.color) ? n.color : 'butter',
      createdAt: n.createdAt,
      expiresAt: n.expiresAt,
    };
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!configured()) return res.status(503).json({ error: 'The board is not configured yet' });
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (req.method !== 'GET' && !isSameOrigin(req)) return res.status(403).json({ error: 'Cross-origin request rejected' });

  try {
    if (req.method === 'GET') {
      const now = Date.now();
      // Drop expired ids from the index; the notes themselves expire on their own TTL.
      await redis(['ZREMRANGEBYSCORE', 'board:index', '-inf', String(now)]);
      const version = await currentVersion();
      const since = String(req.query.since || '');
      if (since && since === String(version)) return res.status(200).json({ version, unchanged: true, now });

      const ids = (await redis(['ZREVRANGEBYSCORE', 'board:index', '+inf', String(now), 'LIMIT', '0', String(MAX_NOTES)])) || [];
      let notes = [];
      if (ids.length > 0) {
        const raw = await redis(['MGET', ...ids.map((id) => `board:${id}`)]);
        notes = (raw || [])
          .map((value, i) => (value ? publicNote(ids[i], value) : null))
          .filter(Boolean);
      }
      return res.status(200).json({ version, notes, now });
    }

    if (req.method === 'POST') {
      if (await rateLimited(req, res, 'hour', 3, 3600)) return;
      if (await rateLimited(req, res, 'day', 12, 86400)) return;

      const body = req.body || {};
      // Honeypot: real people never fill this in.
      if (typeof body.website === 'string' && body.website.trim() !== '') {
        return res.status(201).json({ ok: true, note: null });
      }
      const text = cleanText(body.text, MAX_TEXT);
      if (text.length < 2) return res.status(400).json({ error: 'Write a few words first' });
      const name = cleanText(body.name, MAX_NAME);
      const color = COLORS.has(body.color) ? body.color : 'butter';
      const now = Date.now();
      const note = {
        text,
        name,
        color,
        createdAt: now,
        expiresAt: now + NOTE_TTL_MS,
        token: newToken(),
      };

      for (let i = 0; i < 5; i++) {
        const id = newId();
        const stored = await redis([
          'SET',
          `board:${id}`,
          JSON.stringify(note),
          'EX',
          String(NOTE_TTL_SECONDS + 60),
          'NX',
        ]);
        if (stored === 'OK') {
          await redis(['ZADD', 'board:index', String(note.expiresAt), id]);
          const version = await redis(['INCR', 'board:version']);
          return res.status(201).json({
            ok: true,
            note: publicNote(id, JSON.stringify(note)),
            token: note.token,
            version: Number(version) || 0,
          });
        }
      }
      return res.status(502).json({ error: 'Could not pin the note, please try again' });
    }

    // DELETE ?id=…  with ?token=… (author) or an admin key in x-board-admin
    const id = String(req.query.id || '');
    if (!/^[A-Za-z0-9]{6,16}$/.test(id)) return res.status(400).json({ error: 'Invalid note' });
    const raw = await redis(['GET', `board:${id}`]);
    if (!raw) return res.status(404).json({ error: 'Note not found' });
    const stored = JSON.parse(raw);
    const token = String(req.query.token || '');
    const allowed = adminKeyMatches(req) || (token && token === stored.token);
    if (!allowed) return res.status(403).json({ error: 'Not allowed' });

    await redis(['DEL', `board:${id}`]);
    await redis(['ZREM', 'board:index', id]);
    const version = await redis(['INCR', 'board:version']);
    return res.status(200).json({ ok: true, version: Number(version) || 0 });
  } catch {
    return res.status(502).json({ error: 'The board is having a moment. Try again shortly.' });
  }
}
