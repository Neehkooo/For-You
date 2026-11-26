import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';

// In-memory store for local development preview
const devStore = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LENGTH = 16; // matches the production API, so /<id> routes resolve locally too
const newId = () => Array.from({ length: ID_LENGTH }, () => ALPHABET[crypto.randomInt(0, ALPHABET.length)]).join('');
const MAX_TOKEN = 900_000;

// Public board (local dev only): a 24-hour in-memory wall shaped like /api/board.
const boardStore = new Map();
const BOARD_TTL = 24 * 60 * 60 * 1000;
const BOARD_COLORS = new Set(['butter', 'rose', 'mint', 'sky', 'lilac', 'peach']);
const BOARD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
let boardVersion = 1;
const boardRandom = (length) =>
  Array.from({ length }, () => BOARD_CHARS[crypto.randomInt(0, BOARD_CHARS.length)]).join('');
const boardPublic = (id, note) => ({
  id,
  text: note.text,
  name: note.name,
  color: note.color,
  createdAt: note.createdAt,
  expiresAt: note.expiresAt,
});
const pruneBoard = () => {
  const now = Date.now();
  for (const [id, note] of boardStore) {
    if (note.expiresAt <= now) {
      boardStore.delete(id);
      boardVersion += 1;
    }
  }
};
const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};
const readJsonBody = (req, done) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 20_000) req.destroy();
  });
  req.on('end', () => {
    try {
      done(JSON.parse(body || '{}'));
    } catch {
      done(null);
    }
  });
};

function localDevApiPlugin() {
  return {
    name: 'local-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

        // /api/board — the public 24-hour wall
        if (url.pathname === '/api/board') {
          pruneBoard();
          if (req.method === 'GET') {
            const since = url.searchParams.get('since') || '';
            if (since && since === String(boardVersion)) {
              sendJson(res, 200, { version: boardVersion, unchanged: true, now: Date.now() });
              return;
            }
            const notes = [...boardStore.entries()]
              .map(([id, note]) => boardPublic(id, note))
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 80);
            sendJson(res, 200, { version: boardVersion, notes, now: Date.now() });
            return;
          }
          if (req.method === 'POST') {
            readJsonBody(req, (data) => {
              if (!data) return sendJson(res, 400, { error: 'Invalid payload' });
              if (typeof data.website === 'string' && data.website.trim() !== '') {
                return sendJson(res, 201, { ok: true, note: null });
              }
              const text = typeof data.text === 'string' ? data.text.trim().slice(0, 280) : '';
              if (text.length < 2) return sendJson(res, 400, { error: 'Write a few words first' });
              const now = Date.now();
              const id = boardRandom(12);
              const note = {
                text,
                name: typeof data.name === 'string' ? data.name.trim().slice(0, 24) : '',
                color: BOARD_COLORS.has(data.color) ? data.color : 'butter',
                createdAt: now,
                expiresAt: now + BOARD_TTL,
                token: boardRandom(24),
              };
              boardStore.set(id, note);
              boardVersion += 1;
              return sendJson(res, 201, { ok: true, note: boardPublic(id, note), token: note.token, version: boardVersion });
            });
            return;
          }
          if (req.method === 'DELETE') {
            const id = url.searchParams.get('id') || '';
            const token = url.searchParams.get('token') || '';
            const note = boardStore.get(id);
            if (!note) return sendJson(res, 404, { error: 'Note not found' });
            if (!token || token !== note.token) return sendJson(res, 403, { error: 'Not allowed' });
            boardStore.delete(id);
            boardVersion += 1;
            return sendJson(res, 200, { ok: true, version: boardVersion });
          }
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }

        // POST /api/letters
        if (req.method === 'POST' && url.pathname === '/api/letters') {
          let body = '';
          let tooLarge = false;
          req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 1_000_000) {
              tooLarge = true;
              req.destroy();
            }
          });
          req.on('end', () => {
            if (tooLarge) {
              res.statusCode = 413;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Payload too large' }));
              return;
            }
            try {
              const { token, unlockAt, box, pinLength, pinNote } = JSON.parse(body || '{}');
              if (typeof token !== 'string' || token.length < 40 || token.length > MAX_TOKEN || !/^[A-Za-z0-9-]+$/.test(token)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid letter' }));
                return;
              }
              const now = Date.now();
              const unlock = Number.isFinite(unlockAt) && unlockAt > now && unlockAt < now + 5 * 365 * 864e5 ? Math.floor(unlockAt) : null;
              const colour = typeof box === 'string' && /^[a-z0-9_]{3,20}$/.test(box) ? box : null;
              const id = newId();
              devStore.set(id, {
                t: token,
                u: unlock,
                b: colour,
                p: pinLength === 0 || pinLength === 4 || pinLength === 6 ? pinLength : null,
                n: typeof pinNote === 'string' ? pinNote.trim().slice(0, 140) : '',
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 201;
              res.end(JSON.stringify({ id }));
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
          });
          return;
        }

        // GET /api/letters/:id
        const m = url.pathname.match(/^\/api\/letters\/([A-Za-z0-9]{6,16})$/);
        if (req.method === 'GET' && m) {
          const id = m[1];
          const entry = devStore.get(id);
          res.setHeader('Content-Type', 'application/json');
          if (!entry) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }
          if (entry.u && Date.now() < entry.u) {
            res.statusCode = 403;
            res.end(JSON.stringify({ unlockAt: entry.u, box: entry.b, pinLength: entry.p ?? null, pinNote: entry.n || '' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ token: entry.t, box: entry.b, pinLength: entry.p ?? null, pinNote: entry.n || '' }));
          return;
        }

        next();
      });
    },
  };
}

// Short links live at /l/<id>, so assets must load from the site root.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), localDevApiPlugin()],
  build: {
    assetsInlineLimit: 4096,
  },
});
