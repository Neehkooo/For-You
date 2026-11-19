// No backend needed: the letter is compressed, then encrypted with AES-GCM using a key
// derived from the 4-digit passcode, and the result lives inside the link itself.
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64u = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64u = (str) => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

// Keep tokens to letters, digits and hyphens so they work as a plain "#l-…" hash anywhere.
const escapeToken = (t) => t.replace(/-/g, '-a').replace(/_/g, '-b');
const unescapeToken = (t) => t.replace(/-([ab])/g, (_, c) => (c === 'a' ? '-' : '_'));

const pipe = async (data, stream) =>
  new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(stream)).arrayBuffer());

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
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const packed = await pipe(enc.encode(JSON.stringify(letter)), new CompressionStream('gzip'));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, packed));
  const out = new Uint8Array(28 + ct.length);
  out.set(salt, 0); out.set(iv, 16); out.set(ct, 28);
  return escapeToken(toB64u(out));
}

// Throws if the passcode is wrong or the link is damaged.
export async function openLetter(token, pin) {
  const bytes = fromB64u(unescapeToken(token));
  const key = await deriveKey(pin, bytes.slice(0, 16));
  const packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(16, 28) }, key, bytes.slice(28));
  const json = await pipe(new Uint8Array(packed), new DecompressionStream('gzip'));
  return JSON.parse(dec.decode(json));
}
