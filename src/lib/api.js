const withTimeout = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };

// Returns { id } when the server stored the letter, or null when no server is reachable
// (local dev, the preview, or storage not set up). The caller then uses a long link instead.
export async function saveLetter(token, unlockAt, box) {
  try {
    const res = await fetch('/api/letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, unlockAt, box }),
      signal: withTimeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.id ? data : null;
  } catch {
    return null;
  }
}

export async function fetchLetter(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{6,16}$/.test(id)) {
    return { status: 'missing' };
  }
  try {
    const res = await fetch(`/api/letters/${encodeURIComponent(id)}`, { signal: withTimeout(10000) });
    if (res.status === 403) { const d = await res.json(); return { status: 'locked', unlockAt: d.unlockAt, box: d.box }; }
    if (res.status === 404) return { status: 'missing' };
    if (res.status === 429) return { status: 'rate-limited' };
    if (!res.ok) return { status: 'error' };
    const d = await res.json();
    return { status: 'ready', token: d.token, box: d.box };
  } catch {
    return { status: 'error' };
  }
}
