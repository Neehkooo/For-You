// No backend needed: the letter is compressed, then encrypted with AES-GCM using a key
// derived from the 4-digit passcode, and the result lives inside the link itself.
import { themes, fonts, templates, MAX_STICKERS, MAX_BODY, MAX_PAGES, resolveBox, DEFAULT_BOX } from './themes.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64u = (bytes) => {
  let s = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    s += String.fromCharCode.apply(null, chunk);
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64u = (str) => {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

// Keep tokens to letters, digits and hyphens so they work as a plain "#l-…" hash anywhere.
const escapeToken = (t) => t.replace(/-/g, '-a').replace(/_/g, '-b');
const unescapeToken = (t) => t.replace(/-([ab])/g, (_, c) => (c === 'a' ? '-' : '_'));

const pipe = async (data, stream) =>
  new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());

// Protect against gzip decompression bombs by enforcing a strict maximum decompressed size (5MB).
async function decompressWithLimit(data, maxBytes = 5 * 1024 * 1024) {
  const stream = new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')));
  const reader = stream.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      reader.cancel();
      throw new Error('Decompressed letter exceeds maximum allowed size');
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

const SAFE_IMAGE_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const SAFE_AUDIO_REGEX = /^data:audio\/(mpeg|mp3|wav|ogg|aac|webm);base64,[A-Za-z0-9+/=]+$/;

// Deeply sanitizes and validates decrypted letter objects before passing them to UI components.
// Prevents cross-site tracking beacons (IP leak via external img/audio URLs), SVG XSS,
// and prototype pollution.
export function sanitizeLetter(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid letter format');
  }

  const to = typeof raw.to === 'string' ? raw.to.slice(0, 100).replace(/[\u0000-\u001F\u007F-\u009F]/g, '') : '';
  const from = typeof raw.from === 'string' ? raw.from.slice(0, 100).replace(/[\u0000-\u001F\u007F-\u009F]/g, '') : '';

  let rawPages = Array.isArray(raw.pages) ? raw.pages : [raw.body || ''];
  const pages = rawPages
    .slice(0, MAX_PAGES)
    .map((p) => (typeof p === 'string' ? p.slice(0, MAX_BODY * 2) : ''));
  if (pages.length === 0) pages.push('');

  const theme = themes.some((t) => t.id === raw.theme)
    ? raw.theme
    : typeof raw.theme === 'string' && (/^custom_[0-9a-fA-F]{6}$/.test(raw.theme) || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw.theme))
    ? raw.theme
    : 'blush';
  const font = fonts.some((f) => f.id === raw.font) ? raw.font : 'vibes';
  const template = templates.some((t) => t.id === raw.template) ? raw.template : 'plain';
  const box = resolveBox(raw.box);

  const rawStickers = Array.isArray(raw.stickers) ? raw.stickers : [];
  const stickers = rawStickers.slice(0, MAX_STICKERS).filter((s) => s && typeof s === 'object').map((s, idx) => ({
    id: typeof s.id === 'string' && /^[a-zA-Z0-9_-]{1,16}$/.test(s.id) ? s.id : `s_${idx}`,
    emoji: typeof s.emoji === 'string' ? s.emoji.slice(0, 8) : '❤️',
    kind: s.kind === 'stamp' ? 'stamp' : 'emoji',
    stampId: typeof s.stampId === 'string' && /^[a-zA-Z0-9_-]{1,24}$/.test(s.stampId) ? s.stampId : null,
    page: Number.isInteger(s.page) && s.page >= 0 && s.page < MAX_PAGES ? s.page : 0,
    x: Number.isFinite(s.x) ? Math.min(98, Math.max(2, s.x)) : 50,
    y: Number.isFinite(s.y) ? Math.min(98, Math.max(2, s.y)) : 50,
    size: Number.isFinite(s.size) ? Math.min(150, Math.max(10, s.size)) : 44,
    rot: Number.isFinite(s.rot) ? Math.min(360, Math.max(-360, s.rot)) : 0,
  }));

  // Image must strictly be an inline base64 image data URL (strips external URLs and tracking beacons)
  let image = null;
  if (typeof raw.image === 'string' && SAFE_IMAGE_REGEX.test(raw.image)) {
    image = raw.image;
  }

  // Music audio must strictly be an inline base64 audio data URL (strips external streams and trackers)
  let music = null;
  if (raw.music && typeof raw.music === 'object') {
    const src = typeof raw.music.src === 'string' && SAFE_AUDIO_REGEX.test(raw.music.src) ? raw.music.src : null;
    if (src) {
      const name = typeof raw.music.name === 'string'
        ? raw.music.name.slice(0, 80).replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        : 'audio.mp3';
      music = { name, src };
    }
  }

  const unlockAt = Number.isFinite(raw.unlockAt) && raw.unlockAt > 0 ? Math.floor(raw.unlockAt) : null;

  return { to, from, pages, theme, font, template, box, stickers, image, music, unlockAt };
}

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function sealLetter(letter, pin) {
  const clean = sanitizeLetter(letter);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const packed = await pipe(enc.encode(JSON.stringify(clean)), new CompressionStream('gzip'));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
  const out = new Uint8Array(28 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  return escapeToken(toB64u(out));
}

// Throws if the passcode is wrong or the link is damaged.
export async function openLetter(token, pin) {
  if (typeof token !== 'string' || typeof pin !== 'string') {
    throw new Error('Invalid token or passcode');
  }
  const bytes = fromB64u(unescapeToken(token));
  if (bytes.length < 28) throw new Error('Damaged or invalid letter token');
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ct = bytes.slice(28);
  const key = await deriveKey(pin, salt);
  const packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  const decompressed = await decompressWithLimit(new Uint8Array(packed), 5 * 1024 * 1024);
  const json = JSON.parse(dec.decode(decompressed));
  return sanitizeLetter(json);
}
