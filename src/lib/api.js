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
  const res = await fetch(`/api/letters/${id}`, { signal: withTimeout(10000) });
  if (res.status === 403) { const d = await res.json(); return { status: 'locked', unlockAt: d.unlockAt, box: d.box }; }
  if (res.status === 404) return { status: 'missing' };
  if (!res.ok) return { status: 'error' };
  const d = await res.json();
  return { status: 'ready', token: d.token, box: d.box };
}
