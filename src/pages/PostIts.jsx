import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BOARD_COLORS,
  NOTE_LIMIT,
  boardColor,
  fetchBoard,
  ownedNoteTokens,
  noteTilt,
  pinNote,
  timeAgo,
  timeLeft,
  unpinNote,
} from '../lib/board.js';

const POLL_MS = 45000;

function Note({ note, owned, onRemove, removing, now }) {
  const palette = boardColor(note.color);
  return (
    <article
      className="board-note mb-4 break-inside-avoid rounded-[3px] px-4 pb-3 pt-5"
      style={{
        '--tilt': `${noteTilt(note.id)}deg`,
        '--note-bg': palette.bg,
        '--note-edge': palette.edge,
        '--note-ink': palette.ink,
      }}
    >
      <span className="board-pin" aria-hidden="true" />
      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{note.text}</p>
      <div className="mt-3 flex items-end justify-between gap-2 text-[11px] opacity-70">
        <span className="min-w-0 truncate font-medium">
          {note.name ? note.name : 'Anonymous'}
          <span className="ml-1 font-normal opacity-80">· {timeAgo(note.createdAt, now)}</span>
        </span>
        <span className="shrink-0 tabular-nums">{timeLeft(note.expiresAt, now)}</span>
      </div>
      {owned && (
        <button
          type="button"
          onClick={() => onRemove(note.id)}
          disabled={removing}
          className="mt-2 rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
        >
          {removing ? 'Taking down…' : 'Take down'}
        </button>
      )}
    </article>
  );
}

export default function PostIts() {
  const [board, setBoard] = useState({ status: 'loading', notes: [] });
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('butter');
  const [website, setWebsite] = useState(''); // honeypot, kept empty by people
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [owned, setOwned] = useState(ownedNoteTokens);
  const [removing, setRemoving] = useState('');
  const [now, setNow] = useState(Date.now());
  const versionRef = useRef('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setBoard((b) => ({ ...b, status: b.status === 'ok' ? 'ok' : 'loading' }));
    const result = await fetchBoard(versionRef.current);
    if (result.status !== 'ok') {
      setBoard((b) => ({ ...b, status: result.status, notes: b.notes }));
      return;
    }
    versionRef.current = result.version;
    if (result.unchanged) return;
    setBoard({ status: 'ok', notes: result.notes });
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(() => load(true), POLL_MS);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const remaining = Math.max(0, NOTE_LIMIT - text.length);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const body = text.trim();
    if (body.length < 2) {
      setNotice('Write a few words before pinning it.');
      return;
    }
    setBusy(true);
    setNotice('');
    const result = await pinNote({ text: body, name: name.trim(), color, website });
    setBusy(false);

    if (result.status === 'ok') {
      if (result.note) {
        versionRef.current = result.version;
        setBoard((b) => ({ ...b, status: 'ok', notes: [result.note, ...b.notes] }));
        setOwned(ownedNoteTokens());
        setNow(Date.now());
      }
      setText('');
      setWebsite('');
      setNotice('Pinned. It disappears in 24 hours.');
      return;
    }
    if (result.status === 'rate-limited') {
      setNotice('You have pinned a few notes already — give it an hour before the next one.');
      return;
    }
    if (result.status === 'invalid') {
      setNotice(result.error || 'That note could not be pinned.');
      return;
    }
    setNotice('The board could not be reached. Try again in a moment.');
  };

  const remove = async (id) => {
    setRemoving(id);
    const result = await unpinNote(id);
    setRemoving('');
    if (result.status === 'ok' || result.status === 'gone') {
      setBoard((b) => ({ ...b, notes: b.notes.filter((n) => n.id !== id) }));
      setOwned(ownedNoteTokens());
      setNotice('Taken down.');
      return;
    }
    setNotice(result.status === 'not-owned' ? 'You can only take down notes from this browser.' : 'That note could not be removed.');
  };

  const notes = useMemo(() => (board.status === 'ok' ? board.notes : []), [board]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-light text-plum sm:text-4xl">The Board</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-plum/70">
            A wall of little notes. Pin one for everyone to read — anonymously or with your name — and it
            disappears 24 hours later.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-full border border-plum/25 px-3.5 py-1.5 text-xs font-medium text-plum/75 transition-colors hover:bg-white/60 hover:text-plum"
        >
          Refresh
        </button>
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="mt-5 rounded-2xl border border-plum/15 bg-[var(--ui-paper)] p-4 shadow-sm sm:p-5"
      >
        <label className="block text-xs font-semibold uppercase tracking-wide text-plum/55" htmlFor="note-text">
          Your note
        </label>
        <textarea
          id="note-text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, NOTE_LIMIT))}
          maxLength={NOTE_LIMIT}
          rows={3}
          placeholder="Leave something kind, silly or true…"
          className="field mt-2 min-h-24 w-full resize-y"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-plum/60">Paper</span>
          {BOARD_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              aria-label={`${c.label} paper`}
              aria-pressed={color === c.id}
              title={c.label}
              className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
                color === c.id ? 'scale-110 border-plum/60 ring-2 ring-seal/40' : 'border-black/10'
              }`}
              style={{ background: c.bg }}
            />
          ))}
          <span className="ml-auto text-xs tabular-nums text-plum/45">{remaining}</span>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex-1 text-sm font-medium text-plum">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Your name (optional — leave it empty to stay anonymous)"
              className="field w-full"
            />
          </label>
          <button
            type="submit"
            disabled={busy || text.trim().length < 2}
            className="rounded-full px-6 py-2.5 font-medium shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: boardColor(color).bg, color: boardColor(color).ink }}
          >
            {busy ? 'Pinning…' : 'Pin the note'}
          </button>
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        <p aria-live="polite" className={`mt-2 text-xs ${notice ? 'text-plum/75' : 'sr-only'}`}>
          {notice}
        </p>
      </form>

      {/* Wall */}
      <section className="board-cork mt-6 rounded-3xl p-4 sm:p-6" aria-label="Pinned notes">
        {board.status === 'loading' && (
          <p className="py-14 text-center text-sm text-[#f6e7cf]/80">Unpinning the board…</p>
        )}

        {board.status === 'unconfigured' && (
          <p className="mx-auto max-w-md py-12 text-center text-sm leading-relaxed text-[#f6e7cf]/85">
            The board needs its storage connected before notes can be pinned. Add the Upstash Redis
            environment variables to this deployment and it will open up.
          </p>
        )}

        {board.status === 'error' && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#f6e7cf]/85">The board could not be reached just now.</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 rounded-full border border-[#f6e7cf]/40 px-4 py-1.5 text-xs font-medium text-[#f6e7cf]"
            >
              Try again
            </button>
          </div>
        )}

        {board.status === 'ok' && notes.length === 0 && (
          <p className="py-14 text-center text-sm text-[#f6e7cf]/80">
            The board is quiet. Leave the first note.
          </p>
        )}

        {notes.length > 0 && (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {notes.map((note) => (
              <Note
                key={note.id}
                note={note}
                owned={Boolean(owned[note.id])}
                removing={removing === note.id}
                onRemove={remove}
                now={now}
              />
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-plum/50">
        Notes are public and are deleted 24 hours after they are pinned. Nothing is archived. Be kind — this
        is somebody’s wall.
      </p>
    </div>
  );
}
