import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Letter from './Letter.jsx';
import { themes, fonts, templates } from '../lib/themes.js';

const TITLES = {
  template: 'All Stationery Templates',
  theme: 'All Gradient Palettes',
  font: 'All Handwriting Fonts',
};

// Full-screen gallery for step 1: every template, gradient and font, with a live letter preview.
export default function DesignGallery({
  kind,
  letter,
  activeId,
  lockedIds,
  onPick,
  onLocked,
  onClose,
}) {
  const [peekId, setPeekId] = useState(null);
  const shownId = peekId || activeId;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview =
    kind === 'template'
      ? { ...letter, template: shownId }
      : kind === 'theme'
      ? { ...letter, theme: shownId }
      : { ...letter, font: shownId };

  const sample =
    preview.pages?.some?.((p) => p && p.trim()) || preview.body
      ? preview
      : { ...preview, to: 'My love', pages: ['Every word here is written in the handwriting you choose, on the paper you choose.'], from: 'Me' };

  const isLocked = (id) => lockedIds instanceof Set && lockedIds.has(id);

  const choose = (option) => {
    if (isLocked(option.id)) {
      onLocked?.(option);
      return;
    }
    onPick(option.id);
  };

  const options =
    kind === 'template' ? templates : kind === 'theme' ? themes : fonts;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-4 sm:px-6">
          <div>
            <h2 id="gallery-title" className="font-display text-xl font-light text-plum sm:text-2xl">
              {TITLES[kind]}
            </h2>
            <p className="mt-0.5 text-xs text-plum/60">
              {options.length} options — tap one to apply it, and watch the letter preview update.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 transition-colors hover:bg-plum/10 hover:text-plum"
          >
            ✕
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[1.15fr_1fr] lg:overflow-hidden">
          {/* Options */}
          <div className="lg:overflow-y-auto lg:pr-1">
            {kind === 'theme' ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {options.map((t) => {
                  const locked = isLocked(t.id);
                  const active = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => choose(t)}
                      onMouseEnter={() => setPeekId(t.id)}
                      onMouseLeave={() => setPeekId(null)}
                      onFocus={() => setPeekId(t.id)}
                      onBlur={() => setPeekId(null)}
                      aria-pressed={active}
                      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all ${
                        active
                          ? 'border-seal bg-white shadow-xs'
                          : 'border-plum/15 bg-white/40 hover:bg-white/80'
                      }`}
                    >
                      <span
                        className={`relative h-12 w-12 rounded-full ring-1 ring-plum/20 ${
                          locked ? 'opacity-40 saturate-50' : ''
                        }`}
                        style={{ background: t.bg }}
                      >
                        {locked && (
                          <span className="absolute inset-0 grid place-items-center text-xs">🔒</span>
                        )}
                        {active && (
                          <span className="absolute inset-0 grid place-items-center text-sm text-white drop-shadow">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="text-center text-[11px] leading-tight text-plum/80">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : kind === 'font' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((f) => {
                  const locked = isLocked(f.id);
                  const active = f.id === activeId;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => choose(f)}
                      onMouseEnter={() => setPeekId(f.id)}
                      onMouseLeave={() => setPeekId(null)}
                      onFocus={() => setPeekId(f.id)}
                      onBlur={() => setPeekId(null)}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2 text-left transition-all ${
                        active
                          ? 'border-seal bg-white shadow-xs'
                          : 'border-plum/15 bg-white/40 hover:bg-white/80'
                      } ${locked ? 'opacity-50' : ''}`}
                    >
                      <span className="block text-lg leading-tight text-plum" style={{ fontFamily: f.family }}>
                        I love you
                      </span>
                      <span className="mt-0.5 block text-[11px] text-plum/60">
                        {f.name} {active && '· selected'} {locked && '🔒'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {options.map((t) => {
                  const locked = isLocked(t.id);
                  const active = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => choose(t)}
                      onMouseEnter={() => setPeekId(t.id)}
                      onMouseLeave={() => setPeekId(null)}
                      onFocus={() => setPeekId(t.id)}
                      onBlur={() => setPeekId(null)}
                      aria-pressed={active}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                        active
                          ? 'border-seal bg-white font-medium text-plum shadow-xs'
                          : 'border-plum/15 bg-white/40 text-plum/80 hover:bg-white/80'
                      } ${locked ? 'opacity-50' : ''}`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="shrink-0 text-xs">{locked ? '🔒' : active ? '✓' : ''}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-plum/50">
              Hover or focus an option to preview it first. Locked items are part of a future release.
            </p>
          </div>

          {/* Live letter preview */}
          <div className="lg:overflow-y-auto">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-plum/55">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live letter preview
            </p>
            <div className="overflow-hidden rounded-xl border border-plum/15 bg-white/50 p-2">
              <div className="max-h-[38vh] overflow-y-auto lg:max-h-[52vh]">
                <Letter letter={sample} page={0} className="min-h-56" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-plum/10 bg-white/40 px-4 py-3 sm:px-6">
          <span className="text-xs text-plum/60">
            {kind === 'template' ? 'Template' : kind === 'theme' ? 'Gradient' : 'Font'}:{' '}
            <strong className="text-plum">
              {(options.find((o) => o.id === activeId) || {}).name || '—'}
            </strong>
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
