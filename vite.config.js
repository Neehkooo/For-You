import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';

// In-memory store for local development preview
const devStore = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LENGTH = 12;
const newId = () => Array.from({ length: ID_LENGTH }, () => ALPHABET[crypto.randomInt(0, ALPHABET.length)]).join('');
const MAX_TOKEN = 900_000;

function localDevApiPlugin() {
  return {
    name: 'local-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

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
              const { token, unlockAt, box } = JSON.parse(body || '{}');
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
            res.end(JSON.stringify({ unlockAt: entry.u, box: entry.b }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ token: entry.t, box: entry.b }));
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
