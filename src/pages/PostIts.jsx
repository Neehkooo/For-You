import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMaintenance, maintenanceCovers } from '../lib/admin.js';
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
const GRAB_MS = 560;

// A hand reaches in from the right, pinches the note's edge and carries it off.
function HandGrab({ rect }) {
  return createPortal(
    <div
      className="board-hand pointer-events-none fixed"
      style={{ left: rect.right - 8, top: rect.top + rect.height * 0.42, zIndex: 45 }}
      aria-hidden="true"
    >
      <div className="board-hand-inner">
        <svg viewBox="0 0 170 120" role="presentation">
          {/* sleeve and cuff */}
          <rect x="120" y="18" width="58" height="84" rx="22" fill="#6b7f9e" />
          <rect x="112" y="12" width="16" height="96" rx="8" fill="#8598b4" />
          {/* palm */}
          <path
            d="M64 20h48c15 0 24 10 24 24v32c0 14-9 24-24 24H64z"
            fill="#f4cdb0"
            stroke="#c99a76"
            strokeWidth="2"
          />
          {/* fingers, curling over the note */}
          <g fill="#f4cdb0" stroke="#c99a76" strokeWidth="2" strokeLinejoin="round">
            <rect x="26" y="26" width="48" height="17" rx="8.5" />
            <rect x="21" y="46" width="53" height="18" rx="9" />
            <rect x="26" y="67" width="48" height="17" rx="8.5" />
          </g>
          {/* thumb squeezing the paper */}
          <path
            d="M78 92c-7 9-5 20 5 24 8 3 17-2 19-10"
            fill="#f4cdb0"
            stroke="#c99a76"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>,
    document.body
  );
}

// Esc to close, page frozen behind the dialog, focus handed back to the trigger.
function useDialogChrome(onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [onClose]);
}

// Long notes shrink so the 3 × 3 wall stays readable without hiding the words.
const noteFontClass = (text = '') => {
  const length = text.length;
  if (length <= 60) return 'text-[13px] leading-snug sm:text-[15px]';
  if (length <= 120) return 'text-[12px] leading-snug sm:text-[14px]';
  if (length <= 190) return 'text-[11px] leading-snug sm:text-[13px]';
  return 'text-[10px] leading-snug sm:text-[12px]';
};

function WallNote({ note, now, onOpen, grabbed }) {
  const palette = boardColor(note.color);
  return (
    <button
      type="button"
      onClick={(event) => onOpen(note, event)}
      aria-busy={grabbed || undefined}
      className={`board-note board-note-tap relative flex aspect-square w-full flex-col overflow-hidden rounded-[3px] px-2.5 pb-2 pt-4 text-left sm:px-3.5 sm:pb-2.5 sm:pt-5 ${
        grabbed ? 'board-note-grabbed' : ''
      }`}
      style={{
        '--tilt': `${noteTilt(note.id)}deg`,
        '--note-bg': palette.bg,
        '--note-edge': palette.edge,
        '--note-ink': palette.ink,
      }}
      aria-label={`Read note from ${note.name || 'Anonymous'}, pinned ${timeAgo(note.createdAt, now)}, ${timeLeft(note.expiresAt, now)}`}
      title={note.text}
    >
      <span className="board-pin" aria-hidden="true" />
      <span className={`block flex-1 overflow-hidden whitespace-pre-wrap break-words ${noteFontClass(note.text)}`}>
        {note.text}
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-1 text-[9px] font-medium opacity-70 sm:text-[10px]">
        <span className="min-w-0 truncate">{note.name ? note.name : 'Anonymous'}</span>
        <span className="shrink-0 tabular-nums">{timeLeft(note.expiresAt, now).replace(' left', '')}</span>
      </span>
    </button>
  );
}

// The note pulled off the wall: straight, centred, on a dimmed and blurred backdrop.
function NoteReader({ note, owned, removing, now, onClose, onRemove }) {
  useDialogChrome(onClose);
  const panelRef = useRef(null);
  const palette = boardColor(note.color);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return createPortal(
    <div
      className="board-dialog fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-reader-title"
    >
      <div ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg outline-none">
        <h2 id="board-reader-title" className="sr-only">
          Note from {note.name || 'Anonymous'}
        </h2>

        <div
          className="board-note-reader rounded-[4px] px-5 pb-4 pt-6 sm:px-7 sm:pb-5 sm:pt-8"
          style={{
            '--note-bg': palette.bg,
            '--note-edge': palette.edge,
            '--note-ink': palette.ink,
          }}
        >
          <span className="board-pin" aria-hidden="true" />
          <p className="whitespace-pre-wrap break-words text-[17px] leading-relaxed sm:text-xl">{note.text}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-black/10 pt-3 text-[11px] opacity-75 sm:text-xs">
            <span className="min-w-0 font-medium">
              {note.name ? note.name : 'Anonymous'}
              <span className="ml-1 font-normal opacity-80">· {timeAgo(note.createdAt, now)}</span>
            </span>
            <span className="tabular-nums">{timeLeft(note.expiresAt, now)}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {owned ? (
            <button
              type="button"
              onClick={() => onRemove(note.id)}
              disabled={removing}
              className="rounded-full border border-white/35 bg-black/25 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-xs transition-colors hover:bg-black/40 disabled:opacity-50"
            >
              {removing ? 'Taking down…' : 'Take down'}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-plum shadow-lg transition-colors hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ComposerModal({
  text,
  setText,
  name,
  setName,
  color,
  setColor,
  website,
  setWebsite,
  busy,
  error,
  onSubmit,
  onClose,
}) {
  useDialogChrome(onClose);
  const textRef = useRef(null);
  const remaining = Math.max(0, NOTE_LIMIT - text.length);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  return createPortal(
    <div
      className="board-dialog fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-composer-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-3 sm:px-5">
          <div>
            <h2 id="board-composer-title" className="font-display text-xl font-light text-plum">
              📌 Pin a note
            </h2>
            <p className="mt-0.5 text-xs text-plum/60">
              Everyone can read it. Leave the name empty to stay anonymous.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the note composer"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 transition-colors hover:bg-plum/10 hover:text-plum"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-plum/55" htmlFor="note-text">
              Your note
            </label>
            <textarea
              id="note-text"
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, NOTE_LIMIT))}
              maxLength={NOTE_LIMIT}
              rows={5}
              placeholder="Leave something kind, silly or true…"
              className="field mt-2 min-h-28 w-full resize-y"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            <span className={`ml-auto text-xs tabular-nums ${remaining < 40 ? 'text-rose-700' : 'text-plum/45'}`}>
              {remaining}
            </span>
          </div>

          <label className="text-sm font-medium text-plum">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Your name (optional — leave it empty to stay anonymous)"
              className="field w-full"
            />
          </label>

          {/* Honeypot: hidden from people, tempting to bots */}
          <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="flex-1 text-[11px] leading-snug text-plum/55">
              Notes are public and vanish 24 hours after they are pinned.
            </p>
            <button
              type="submit"
              disabled={busy || text.trim().length < 2}
              className="rounded-full px-6 py-2.5 font-medium shadow-sm transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: boardColor(color).bg, color: boardColor(color).ink }}
            >
              {busy ? 'Pinning…' : 'Pin the note'}
            </button>
          </div>

          <p aria-live="polite" className={`text-xs text-rose-700 ${error ? '' : 'sr-only'}`}>
            {error}
          </p>
        </form>
      </div>
    </div>,
    document.body
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
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [readingId, setReadingId] = useState('');
  const [grabbing, setGrabbing] = useState(null);
  const [visible, setVisible] = useState(9);
  const grabTimer = useRef(0);
  const [owned, setOwned] = useState(ownedNoteTokens);
  const [removing, setRemoving] = useState('');
  const [now, setNow] = useState(Date.now());
  const [maint, setMaint] = useState(getMaintenance);
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

  const notes = useMemo(() => (board.status === 'ok' ? board.notes : []), [board]);
  const reading = useMemo(() => notes.find((n) => n.id === readingId) || null, [notes, readingId]);

  // A note can expire or be taken down while it is open.
  useEffect(() => {
    if (readingId && board.status === 'ok' && !reading) setReadingId('');
  }, [readingId, reading, board.status]);

  const openComposer = useCallback(() => {
    if (maintenanceCovers(getMaintenance(), 'board')) return;
    setError('');
    setNotice('');
    setReadingId('');
    setComposerOpen(true);
  }, []);

  useEffect(() => () => window.clearTimeout(grabTimer.current), []);

  // Admin can schedule a window for the board without touching the letters.
  useEffect(() => {
    const refresh = () => setMaint(getMaintenance());
    window.addEventListener('for-you-maintenance-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('for-you-maintenance-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const boardDown = maintenanceCovers(maint, 'board');

  useEffect(() => {
    if (boardDown) setComposerOpen(false);
  }, [boardDown]);

  const closeComposer = useCallback(() => setComposerOpen(false), []);
  const closeReader = useCallback(() => setReadingId(''), []);

  const openReader = (note, event) => {
    if (grabbing) return;
    setComposerOpen(false);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    if (reduced || !rect) {
      setReadingId(note.id);
      return;
    }
    setGrabbing({ id: note.id, rect });
    window.clearTimeout(grabTimer.current);
    grabTimer.current = window.setTimeout(() => {
      setGrabbing(null);
      setReadingId(note.id);
    }, GRAB_MS);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (maintenanceCovers(getMaintenance(), 'board')) {
      setError('The board is under scheduled maintenance. Pinning resumes shortly.');
      return;
    }
    const body = text.trim();
    if (body.length < 2) {
      setError('Write a few words before pinning it.');
      return;
    }
    setBusy(true);
    setError('');
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
      setComposerOpen(false);
      setNotice('Pinned. It disappears in 24 hours.');
      return;
    }
    if (result.status === 'rate-limited') {
      setError('You have pinned a few notes already — give it an hour before the next one.');
      return;
    }
    if (result.status === 'invalid') {
      setError(result.error || 'That note could not be pinned.');
      return;
    }
    setError('The board could not be reached. Try again in a moment.');
  };

  const remove = async (id) => {
    setRemoving(id);
    const result = await unpinNote(id);
    setRemoving('');
    if (result.status === 'ok' || result.status === 'gone') {
      setBoard((b) => ({ ...b, notes: b.notes.filter((n) => n.id !== id) }));
      setOwned(ownedNoteTokens());
      setReadingId('');
      setNotice('Taken down.');
      return;
    }
    setNotice(result.status === 'not-owned' ? 'You can only take down notes from this browser.' : 'That note could not be removed.');
  };

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

      {boardDown && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400 bg-amber-50/90 p-4 shadow-xs"
        >
          <span className="shrink-0 text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Scheduled maintenance</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              {maint.message || 'The board is being looked after. Pinning notes resumes shortly.'}
            </p>
            {maint.endTime && (
              <p className="mt-1 text-xs font-medium text-amber-900">
                Estimated resume:{' '}
                {new Date(maint.endTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            <p className="mt-2 text-xs font-bold text-amber-950">
              🔒 “Pin a note” is paused — the notes already on the wall can still be read.
            </p>
          </div>
        </div>
      )}

      {/* Composer trigger: the wall keeps the page, the note opens on top of it */}
      <button
        type="button"
        onClick={openComposer}
        disabled={boardDown}
        aria-disabled={boardDown}
        className={`mt-5 flex w-full items-center gap-3 rounded-2xl border border-plum/15 bg-[var(--ui-paper)] px-4 py-3 text-left shadow-sm transition-all ${
          boardDown
            ? 'cursor-not-allowed opacity-60'
            : 'hover:-translate-y-0.5 hover:border-plum/25 hover:bg-white/70'
        }`}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base shadow-xs"
          style={{ background: boardColor(color).bg, color: boardColor(color).ink }}
          aria-hidden="true"
        >
          ✎
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-plum">Pin a note…</span>
          <span className="block truncate text-xs text-plum/55">
            {boardDown
              ? 'Paused for scheduled maintenance — resumes soon'
              : 'Anonymously or signed — it disappears 24 hours later'}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-seal px-4 py-1.5 text-xs font-semibold text-petal">
          {boardDown ? 'Paused' : 'Note'}
        </span>
      </button>

      <p aria-live="polite" className={`mt-2 text-xs text-plum/75 ${notice ? '' : 'sr-only'}`}>
        {notice}
      </p>

      {/* Wall */}
      <section className="board-cork mt-4 rounded-3xl p-4 sm:mt-6 sm:p-6" aria-label="Pinned notes">
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
          <>
            {/* Capped width keeps the squares note-sized on wide screens instead of filling the cork */}
            <div className="mx-auto grid w-full max-w-[600px] grid-cols-3 gap-2 sm:gap-4">
              {notes.slice(0, visible).map((note) => (
                <WallNote
                  key={note.id}
                  note={note}
                  now={now}
                  grabbed={grabbing?.id === note.id}
                  onOpen={openReader}
                />
              ))}
            </div>
            {notes.length > visible && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((count) => count + 9)}
                  className="rounded-full border border-[#f6e7cf]/40 px-4 py-1.5 text-xs font-medium text-[#f6e7cf]/90 transition-colors hover:bg-black/15"
                >
                  Show older notes ({notes.length - visible})
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-plum/50">
        Notes are public and are deleted 24 hours after they are pinned. Nothing is archived. Be kind — this
        is somebody’s wall.
      </p>

      {/* Phones: a thumb-reachable shortcut, since the bar scrolls away with the page */}
      <button
        type="button"
        onClick={openComposer}
        disabled={boardDown}
        aria-label={boardDown ? 'Pinning notes is paused for scheduled maintenance' : 'Pin a note'}
        className={`fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-seal text-xl text-petal shadow-xl transition-transform sm:hidden ${
          boardDown ? 'opacity-50' : 'hover:scale-105'
        }`}
      >
        {boardDown ? '🔒' : '📌'}
      </button>

      {composerOpen && (
        <ComposerModal
          text={text}
          setText={setText}
          name={name}
          setName={setName}
          color={color}
          setColor={setColor}
          website={website}
          setWebsite={setWebsite}
          busy={busy}
          error={error}
          onSubmit={submit}
          onClose={closeComposer}
        />
      )}

      {grabbing && <HandGrab rect={grabbing.rect} />}

      {reading && (
        <NoteReader
          note={reading}
          owned={Boolean(owned[reading.id])}
          removing={removing === reading.id}
          now={now}
          onClose={closeReader}
          onRemove={remove}
        />
      )}
    </div>
  );
}
