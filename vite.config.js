import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import crypto from 'node:crypto';

// In-memory store for local development preview
const devStore = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const newId = () => Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');

function localDevApiPlugin() {
  return {
    name: 'local-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

        // POST /api/letters
        if (req.method === 'POST' && url.pathname === '/api/letters') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { token, unlockAt, box } = JSON.parse(body || '{}');
              const id = newId();
              devStore.set(id, {
                t: token,
                u: unlockAt ? Number(unlockAt) : null,
                b: box || null,
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 201;
              res.end(JSON.stringify({ id }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
          });
          return;
        }

        // GET /api/letters/:id
        const m = url.pathname.match(/^\/api\/letters\/([A-Za-z0-9]+)$/);
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
