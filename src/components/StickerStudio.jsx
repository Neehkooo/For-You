import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Letter from './Letter.jsx';
import { stickerEmojis, postalStamps, MAX_STICKERS } from '../lib/themes.js';

const chip =
  'rounded-full border border-plum/30 px-3.5 py-1.5 text-xs hover:bg-white/50 disabled:opacity-40 transition-colors';

// Step 3's “···” studio: every emoji and stamp on one screen, next to a live,
// draggable letter preview. The selected item's size, rotation, duplicate and
// delete controls live here too, so the step itself stays short.
export default function StickerStudio({
  letter,
  page,
  pageCount = 1,
  onPageChange,
  selectedId,
  onSelect,
  onAddEmoji,
  onAddStamp,
  onPhotos,
  onSignature,
  onPatch,
  onRemove,
  onDuplicate,
  onClose,
  stampsLocked,
  onLocked,
  mediaError,
}) {
  const [tab, setTab] = useState('emojis');
  const selected = letter.stickers.find((s) => s.id === selectedId);
  const placed = letter.stickers.filter((s) => (s.page || 0) === page);
  const full = letter.stickers.length >= MAX_STICKERS;
  const pages = Math.max(pageCount, 1);
  const pageGroups = Array.from({ length: pages }, (_, i) => ({
    page: i,
    items: letter.stickers.filter((s) => (s.page || 0) === i),
  })).filter((g) => g.items.length);
  const ordered = [...letter.stickers].sort((a, b) => (a.page || 0) - (b.page || 0));

  // Jump to any placed item: switch to its page first, then select it.
  const editItem = (item) => {
    if (!item) return;
    if ((item.page || 0) !== page && onPageChange) onPageChange(item.page || 0);
    onSelect(item.id === selectedId ? null : item.id);
  };

  // Leaving a page drops a selection that belongs to the page you just left.
  useEffect(() => {
    if (selectedId && !letter.stickers.some((s) => s.id === selectedId && (s.page || 0) === page)) {
      onSelect(null);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const cycle = (dir) => {
    if (!ordered.length) return;
    const i = ordered.findIndex((s) => s.id === selectedId);
    const next = ordered[(i + dir + ordered.length) % ordered.length];
    if (!next) return;
    if ((next.page || 0) !== page && onPageChange) onPageChange(next.page || 0);
    onSelect(next.id);
  };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizeMin = selected && (selected.kind === 'photo' || selected.kind === 'signature') ? 60 : 20;
  const sizeMax = selected && (selected.kind === 'photo' || selected.kind === 'signature') ? 280 : 120;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-3 sm:px-6">
          <div>
            <h2 id="studio-title" className="font-display text-xl font-light text-plum sm:text-2xl">
              Stickers, Stamps, Photos &amp; Signatures
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-plum/60 sm:text-xs">
              <span>
                Page {page + 1} of {pageCount} · {letter.stickers.length}/{MAX_STICKERS} items used —
                drag anything on the preview.
              </span>
              {pageCount > 1 && onPageChange && (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                    aria-label="Previous page"
                    className="rounded-full border border-plum/20 px-2 py-0.5 font-medium text-plum/75 hover:bg-plum/10 hover:text-plum disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    ‹ Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= pageCount - 1}
                    aria-label="Next page"
                    className="rounded-full border border-plum/20 px-2 py-0.5 font-medium text-plum/75 hover:bg-plum/10 hover:text-plum disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Next ›
                  </button>
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sticker studio"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 transition-colors hover:bg-plum/10 hover:text-plum"
          >
            ✕
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto px-4 py-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:overflow-hidden">
          {/* Gallery + uploads + placed items */}
          <div className="space-y-3 lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center gap-1 rounded-xl border border-plum/20 bg-white/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('emojis')}
                className={`flex-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                  tab === 'emojis' ? 'bg-seal text-petal shadow-xs' : 'text-plum/70 hover:bg-white/60'
                }`}
              >
                ✨ Stickers ({stickerEmojis.length})
              </button>
              <button
                type="button"
                onClick={() => (stampsLocked ? onLocked?.() : setTab('stamps'))}
                className={`flex-1 rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                  tab === 'stamps' ? 'bg-seal text-petal shadow-xs' : 'text-plum/70 hover:bg-white/60'
                } ${stampsLocked ? 'opacity-60' : ''}`}
              >
                📮 Stamps ({postalStamps.length}){stampsLocked ? ' 🔒' : ''}
              </button>
            </div>

            {tab === 'emojis' ? (
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-9">
                {stickerEmojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onAddEmoji(e)}
                    disabled={full}
                    aria-label={`Add ${e} sticker`}
                    className="grid h-10 place-items-center rounded-lg bg-white/40 text-xl transition-all hover:scale-110 hover:bg-white/80 disabled:opacity-40"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {postalStamps.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onAddStamp(s)}
                    disabled={full}
                    title={`Add ${s.name} stamp`}
                    className="flex flex-col items-center rounded-lg border-2 border-dashed p-1.5 text-center transition-all hover:scale-[1.03] disabled:opacity-40"
                    style={{ borderColor: s.border, backgroundColor: `${s.color}15` }}
                  >
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: s.border }}>
                      {s.code}
                    </span>
                    <span className="my-0.5 text-xl">{s.symbol}</span>
                    <span className="max-w-full truncate text-[10px] font-medium text-plum">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-plum/20 bg-white/40 p-3">
              <p className="text-xs font-semibold text-plum">Your own pictures &amp; signature</p>
              <p className="mt-0.5 text-[10px] leading-snug text-plum/55">
                Drop onto page {page + 1}, then drag, resize or rotate them on the preview.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className={`${chip} cursor-pointer`}>
                  🖼️ Add photos
                  <input type="file" accept="image/*" multiple onChange={onPhotos} className="sr-only" />
                </label>
                <label className={`${chip} cursor-pointer`}>
                  ✍️ Signature
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onSignature} className="sr-only" />
                </label>
              </div>
              {mediaError && <p className="mt-2 text-[11px] text-red-700">{mediaError}</p>}
            </div>

            <div>
              <p className="mb-1.5 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-plum/55">
                <span>Placed items ({letter.stickers.length})</span>
                {letter.stickers.length > 0 && (
                  <span className="text-[10px] font-normal normal-case tracking-normal text-plum/45">
                    pick one to edit it
                  </span>
                )}
              </p>
              {letter.stickers.length === 0 ? (
                <p className="text-xs text-plum/55">Nothing placed yet — pick a sticker above.</p>
              ) : (
                <div className="space-y-2">
                  {pageGroups.map((group) => (
                    <div key={group.page}>
                      {pageCount > 1 && (
                        <p className="mb-1 text-[10px] font-medium text-plum/45">
                          Page {group.page + 1}
                          {group.page === page ? ' · showing' : ''}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => editItem(s)}
                            aria-pressed={s.id === selectedId}
                            className={`grid h-9 w-9 place-items-center overflow-hidden rounded-lg border text-lg ${
                              s.id === selectedId ? 'border-seal bg-white shadow-xs' : 'border-plum/20 bg-white/50 hover:bg-white'
                            }`}
                            title={
                              (s.kind === 'photo'
                                ? 'Picture'
                                : s.kind === 'signature'
                                ? 'Signature'
                                : s.kind === 'stamp'
                                ? 'Stamp'
                                : 'Sticker') + ` · page ${(s.page || 0) + 1}`
                            }
                          >
                            {s.kind === 'photo' || s.kind === 'signature' ? (
                              <img src={s.src} alt="" className="h-full w-full object-contain" />
                            ) : (
                              s.emoji
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Live preview + controls */}
          <div className="space-y-3 lg:overflow-y-auto">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-plum/55">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live letter preview
            </p>
            <div className="overflow-hidden rounded-xl border border-plum/15 bg-white/40 p-2">
              <div className="max-h-[42vh] overflow-y-auto">
                <Letter
                  letter={letter}
                  page={page}
                  className="min-h-56"
                  editable
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onStickerChange={onPatch}
                  onStickerRemove={onRemove}
                />
              </div>
            </div>

            {selected ? (
              <div className="space-y-2.5 rounded-xl border border-plum/20 bg-white/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/70 text-xl">
                    {selected.kind === 'photo' || selected.kind === 'signature' ? (
                      <img src={selected.src} alt="" className="h-full w-full object-contain" />
                    ) : (
                      selected.emoji
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-plum">
                      {selected.kind === 'signature'
                        ? 'Your signature'
                        : selected.kind === 'photo'
                        ? 'Your picture'
                        : selected.kind === 'stamp'
                        ? 'Postal stamp'
                        : `Sticker ${selected.emoji}`}
                    </p>
                    <p className="text-[10px] text-plum/55">
                      {pageCount > 1 ? `Page ${(selected.page || 0) + 1} · ` : ''}drag it on the preview
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => cycle(-1)}
                      aria-label="Edit previous item"
                      title="Edit previous item"
                      className="grid h-6 w-6 place-items-center rounded-full text-plum/55 hover:bg-plum/10 hover:text-plum"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => cycle(1)}
                      aria-label="Edit next item"
                      title="Edit next item"
                      className="grid h-6 w-6 place-items-center rounded-full text-plum/55 hover:bg-plum/10 hover:text-plum"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(null)}
                      className="grid h-6 w-6 place-items-center rounded-full text-plum/50 hover:bg-plum/10"
                      aria-label="Close sticker settings"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <label className="block" htmlFor="studio-size">
                  <span className="flex items-center justify-between text-[11px] font-medium text-plum">
                    <span>Size</span>
                    <span className="font-mono text-plum/60">{selected.size}px</span>
                  </span>
                  <input
                    id="studio-size"
                    type="range"
                    min={sizeMin}
                    max={sizeMax}
                    step={2}
                    value={selected.size}
                    onChange={(e) => onPatch(selected.id, { size: Number(e.target.value) })}
                    className="sticker-range mt-1 w-full"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => onDuplicate(selected.id)} disabled={full} className={chip} title="Add another of the same">
                    + Duplicate
                  </button>
                  <button
                    type="button"
                    className={chip}
                    onClick={() => onPatch(selected.id, { rot: ((selected.rot || 0) + 15) % 360 })}
                  >
                    ↻ Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(selected.id)}
                    className="ml-auto rounded-full border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs text-rose-800 hover:bg-rose-100"
                  >
                    − Remove
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-plum/25 bg-white/30 px-3 py-2 text-[11px] text-plum/60">
                Tap any item on the preview, or pick one from Placed items, to edit its size, rotation, copies or remove it.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-plum/10 bg-white/40 px-4 py-2.5 sm:px-6">
          <span className="text-[11px] text-plum/60">
            {letter.stickers.length}/{MAX_STICKERS} items used
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-seal px-6 py-2 text-sm font-medium text-petal shadow-xs hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
