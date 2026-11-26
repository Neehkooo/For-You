import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Letter from './Letter.jsx';

// A small live letter window pinned to the corner. It is rendered in a portal on
// <body> so the page-transition transform can never re-anchor it, and it sits on
// the left on desktop where the real preview column is not in the way.
export default function FloatingPreview({
  letter,
  page = 0,
  pageCount = 1,
  onPageChange,
  className = '',
}) {
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!open) setHovered(false);
  }, [open]);

  const go = (next) => {
    if (!onPageChange) return;
    onPageChange(Math.max(0, Math.min(next, pageCount - 1)));
  };

  const pager = (extra = '') => (
    <div className={`flex items-center gap-0.5 rounded-full border border-plum/20 bg-white/50 px-0.5 ${extra}`}>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 0}
        aria-label="Previous page"
        className="grid h-5 w-5 place-items-center rounded-full text-[11px] leading-none text-plum/70 hover:bg-plum/10 hover:text-plum disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ‹
      </button>
      <span className="px-0.5 text-[10px] font-semibold tabular-nums text-plum/70">
        {page + 1}/{pageCount}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
        className="grid h-5 w-5 place-items-center rounded-full text-[11px] leading-none text-plum/70 hover:bg-plum/10 hover:text-plum disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ›
      </button>
    </div>
  );

  const anchor = `fixed bottom-3 right-3 z-30 lg:bottom-6 lg:left-6 lg:right-auto ${className}`;

  if (!open) {
    return createPortal(
      <div className={anchor}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-plum/25 bg-white/90 px-3.5 py-2 text-xs font-semibold text-plum shadow-xl backdrop-blur active:scale-95"
          aria-label="Show live letter preview"
        >
          <span aria-hidden="true">📄</span> Preview
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className={`group ${anchor}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Large preview: hover or focus on desktop, tap the mini window on touch */}
      <div
        className={`pointer-events-none absolute bottom-full right-0 mb-2 w-[min(92vw,380px)] origin-bottom-right scale-95 opacity-0 transition-all duration-200 lg:left-0 lg:right-auto lg:origin-bottom-left ${
          hovered ? 'pointer-events-auto scale-100 opacity-100' : ''
        } group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100`}
      >
        <div className="overflow-hidden rounded-2xl border border-plum/25 bg-[var(--ui-paper)] shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-plum/15 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-plum/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live preview
            </span>
            {pageCount > 1 ? (
              pager()
            ) : (
              <span className="text-[10px] text-plum/55">page {page + 1}</span>
            )}
          </div>
          <div className="max-h-[62vh] overflow-y-auto p-2">
            <div className="mx-auto w-[380px] origin-top-left scale-[0.92]">
              <Letter letter={letter} page={page} className="min-h-64" />
            </div>
          </div>
          <p className="border-t border-plum/10 px-3 py-1.5 text-[10px] text-plum/50">
            Move away to shrink · drag stickers right here
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-plum/25 bg-[var(--ui-paper)] shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-plum/15 px-2 py-1">
            <button
              type="button"
              aria-label="Enlarge live letter preview"
              title="Hover or tap to enlarge"
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-plum/65 hover:text-plum"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </button>
            <div className="flex items-center gap-1">
              {pageCount > 1 && pager()}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-5 w-5 place-items-center rounded-full text-[11px] text-plum/50 hover:bg-plum/10 hover:text-plum"
                aria-label="Hide live letter preview"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="pointer-events-none h-[132px] w-[142px] overflow-hidden bg-white/60 sm:h-[164px] sm:w-[176px]">
            <div className="w-[440px] origin-top-left scale-[0.32] sm:scale-[0.4]">
              <Letter letter={letter} page={page} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
