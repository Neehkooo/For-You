// The public board: notes are stored server-side for 24 hours, then they are gone.
const TIMEOUT = 9000;
const signal = (ms = TIMEOUT) => {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
};

export const BOARD_COLORS = [
  { id: 'butter', label: 'Butter', bg: '#fdf0a8', edge: '#e8d67e', ink: '#4a3a1a' },
  { id: 'rose', label: 'Rose', bg: '#f9ccd6', edge: '#e9a8b6', ink: '#4d2029' },
  { id: 'mint', label: 'Mint', bg: '#c9ebd4', edge: '#a3d6b4', ink: '#1f4030' },
  { id: 'sky', label: 'Sky', bg: '#c9e5fa', edge: '#a2cdea', ink: '#1d3a52' },
  { id: 'lilac', label: 'Lilac', bg: '#ded0f6', edge: '#c2adeb', ink: '#33244d' },
  { id: 'peach', label: 'Peach', bg: '#fbdbc0', edge: '#efbe98', ink: '#4a2e18' },
];

export const NOTE_LIMIT = 255;

export const boardColor = (id) => BOARD_COLORS.find((c) => c.id === id) || BOARD_COLORS[0];

// Notes this browser pinned, so they can be taken down before the 24 hours are up.
const OWNED_KEY = 'for_you_board_owned';

const readOwned = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNED_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export function ownedNoteTokens() {
  return readOwned();
}

export function rememberNote(id, token) {
  try {
    const owned = readOwned();
    owned[id] = token;
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
  } catch {
    /* storage blocked */
  }
}

export function forgetNote(id) {
  try {
    const owned = readOwned();
    delete owned[id];
    localStorage.setItem(OWNED_KEY, JSON.stringify(owned));
  } catch {
    /* storage blocked */
  }
}

export async function fetchBoard(since = '') {
  try {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    const res = await fetch(`/api/board${query}`, { signal: signal(), cache: 'no-store' });
    if (res.status === 503) return { status: 'unconfigured' };
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    return {
      status: 'ok',
      version: String(data.version ?? ''),
      unchanged: Boolean(data.unchanged),
      notes: Array.isArray(data.notes) ? data.notes : [],
      now: Number(data.now) || Date.now(),
    };
  } catch {
    return { status: 'error' };
  }
}

export async function pinNote({ text, name, color, website }) {
  try {
    const res = await fetch('/api/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, name, color, website }),
      signal: signal(12000),
    });
    if (res.status === 429) return { status: 'rate-limited' };
    if (res.status === 400) {
      const data = await res.json().catch(() => ({}));
      return { status: 'invalid', error: data.error || 'That note could not be pinned' };
    }
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    if (data.note && data.token) rememberNote(data.note.id, data.token);
    return {
      status: 'ok',
      note: data.note || null,
      version: String(data.version ?? ''),
    };
  } catch {
    return { status: 'error' };
  }
}

export async function unpinNote(id) {
  const token = readOwned()[id];
  if (!token) return { status: 'not-owned' };
  try {
    const res = await fetch(`/api/board?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
      signal: signal(10000),
    });
    if (res.status === 403) return { status: 'not-owned' };
    if (res.status === 404) {
      forgetNote(id);
      return { status: 'gone' };
    }
    if (!res.ok) return { status: 'error' };
    forgetNote(id);
    const data = await res.json();
    return { status: 'ok', version: String(data.version ?? '') };
  } catch {
    return { status: 'error' };
  }
}

// "just now", "4m ago", "3h ago"
export function timeAgo(createdAt, now = Date.now()) {
  const diff = Math.max(0, now - createdAt);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return '23h ago';
}

// "23h 41m left"
export function timeLeft(expiresAt, now = Date.now()) {
  const diff = Math.max(0, expiresAt - now);
  if (diff <= 0) return 'gone';
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h left` : `${hours}h ${rest}m left`;
}

// A stable, gentle tilt per note so the wall feels pinned by hand.
export function noteTilt(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return ((hash % 17) - 8) / 10; // -0.8deg … +0.8deg
}
