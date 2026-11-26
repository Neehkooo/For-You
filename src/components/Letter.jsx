import { useRef } from 'react';
import { resolveTheme, fonts, getPages, postalStamps } from '../lib/themes.js';

const clamp = (n) => Math.min(98, Math.max(2, n));

// Animated stationery papers (v1.3) — each glyph drifts down the page.
const ANIM_PAPERS = {
  anim_hearts: ['💗', '💖', '❤️', '💕'],
  anim_stars: ['✨', '⭐', '🌟', '✧'],
  anim_petals: ['🌸', '🌺', '🌷', '🍃'],
  anim_snow: ['❄️', '❅', '❆', '✻'],
};

// Renders the paper. With `editable`, stickers, stamps, photos and signatures can be dragged
// (pointer or arrow keys). Dragging is throttled to one state update per animation frame so
// touch screens stay smooth while a finger swipes an item across the page.
export default function Letter({
  letter,
  page = 0,
  className = '',
  bare = false,
  editable = false,
  selectedId = null,
  onSelect,
  onStickerChange,
  onStickerRemove,
}) {
  const paper = useRef(null);
  const drag = useRef(null);
  const theme = resolveTheme(letter.theme);
  const font = fonts.find((f) => f.id === letter.font) || fonts[0];
  const template = letter.template || 'plain';
  const pages = getPages(letter);
  const isFirst = page === 0;
  const isLast = page === pages.length - 1;
  const body = pages[page] ?? '';
  const stickers = (letter.stickers || []).filter((s) => (s.page || 0) === page);
  const ink = theme.ink;

  const style = {
    background: theme.bg,
    color: ink,
    fontFamily: font.family,
    fontSize: font.size,
    lineHeight: 1.5,
  };
  if (bare) {
    style.padding = 56;
    style.minHeight = 848;
  } // fixed size used for PDF export

  const lines =
    template === 'ruled'
      ? {
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.5em - 1px), ${ink}33 calc(1.5em - 1px), ${ink}33 1.5em)`,
        }
      : undefined;

  const applyDrag = (d) => {
    d.dirty = false;
    d.raf = 0;
    onStickerChange?.(d.id, {
      x: clamp(((d.last.x - d.rect.left) / d.rect.width) * 100),
      y: clamp(((d.last.y - d.rect.top) / d.rect.height) * 100),
    });
  };

  // Ending a drag always flushes the last position, even if a frame was skipped.
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    if (d.dirty) applyDrag(d);
    drag.current = null;
  };

  const beginDrag = (e, s) => {
    if (!editable) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
    // Measure the paper once per drag instead of on every pointer move.
    const rect = paper.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      id: s.id,
      rect,
      pointerId: e.pointerId,
      raf: 0,
      dirty: false,
      last: { x: e.clientX, y: e.clientY },
    };
    onSelect?.(s.id);
  };

  const moveDrag = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.last = { x: e.clientX, y: e.clientY };
    d.dirty = true;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      const st = drag.current;
      if (st) applyDrag(st);
    });
  };

  const key = (e, s) => {
    const nudge = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
    if (nudge) {
      e.preventDefault();
      onStickerChange?.(s.id, { x: clamp(s.x + nudge[0]), y: clamp(s.y + nudge[1]) });
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onStickerRemove?.(s.id);
    }
  };

  return (
    <article
      ref={paper}
      onPointerDown={() => editable && onSelect?.(null)}
      className={`relative ${
        bare ? '' : 'rounded-lg p-5 shadow-2xl shadow-plum/25 sm:p-10'
      } ${template === 'embossed' ? 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(0,0,0,0.1),0_15px_30px_rgba(0,0,0,0.15)] ring-1 ring-black/5' : ''} ${className}`}
      style={style}
    >
      {/* Template Decorative Borders */}
      {template === 'frame' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3.5 rounded"
          style={{ border: `3px double ${ink}99` }}
        />
      )}
      {template === 'stitched' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded"
          style={{ border: `2px dashed ${ink}88` }}
        />
      )}
      {template === 'vintage' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 rounded border border-plum/30 p-1"
        >
          <div className="h-full w-full rounded border-2 border-dashed border-plum/40" />
          <span className="absolute -top-1 -left-1 text-base opacity-75">❧</span>
          <span className="absolute -top-1 -right-1 text-base opacity-75 scale-x-[-1]">❧</span>
          <span className="absolute -bottom-1 -left-1 text-base opacity-75 scale-y-[-1]">❧</span>
          <span className="absolute -bottom-1 -right-1 text-base opacity-75 scale-[-1]">❧</span>
        </div>
      )}
      {template === 'floral' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-3.5 rounded border border-plum/25"
        >
          <span className="absolute -top-2.5 left-3 text-sm opacity-70">🌿</span>
          <span className="absolute -top-2.5 right-3 text-sm opacity-70 scale-x-[-1]">🌿</span>
          <span className="absolute -bottom-2.5 left-3 text-sm opacity-70 scale-y-[-1]">🌿</span>
          <span className="absolute -bottom-2.5 right-3 text-sm opacity-70 scale-[-1]">🌿</span>
        </div>
      )}
      {template === 'minimal' && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-5 bottom-5 flex flex-col justify-between">
          <div className="h-0.5 w-full bg-current opacity-25" />
          <div className="h-0.5 w-full bg-current opacity-25" />
        </div>
      )}
      {ANIM_PAPERS[template] && (
        <div aria-hidden="true" className="paper-anim">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 6.3 + 2) % 95}%`,
                fontSize: `${10 + (i % 5) * 6}px`,
                animationDelay: `${(i % 8) * 1.05}s`,
                animationDuration: `${8 + (i % 5) * 1.6}s`,
              }}
            >
              {ANIM_PAPERS[template][i % 4]}
            </span>
          ))}
        </div>
      )}

      {template === 'corners' &&
        ['left-3.5 top-2.5', 'right-3.5 top-2.5 scale-x-[-1]', 'bottom-2.5 left-3.5 scale-y-[-1]', 'bottom-2.5 right-3.5 scale-[-1]'].map(
          (pos) => (
            <span
              key={pos}
              aria-hidden="true"
              className={`pointer-events-none absolute select-none text-[1.4rem] opacity-60 ${pos}`}
              style={{ fontFamily: 'serif', lineHeight: 1 }}
            >
              ❀
            </span>
          )
        )}

      {isFirst && letter.image && (
        <img
          src={letter.image}
          alt=""
          className="relative mx-auto mb-7 max-h-72 w-full max-w-xs -rotate-1 rounded-sm bg-white object-cover p-2 pb-6 shadow-lg"
        />
      )}

      <div className="relative" style={lines}>
        {isFirst && letter.to && <p className="mb-[1.5em]">Dear {letter.to},</p>}
        <p className={`whitespace-pre-wrap break-words ${body ? '' : 'opacity-50'}`}>
          {body || 'Your words will appear here…'}
        </p>
        {isLast && (letter.from || letter.anonymousFrom) && (
          <p className="mt-[1.5em] text-right">
            Yours,
            <br />
            {letter.anonymousFrom ? 'Anonymous' : letter.from}
          </p>
        )}
      </div>

      {stickers.map((s) => {
        const isStamp = s.kind === 'stamp' || !!s.stampId;
        const isPicture = s.kind === 'photo' || s.kind === 'signature';
        const stampDef = isStamp ? postalStamps.find((p) => p.id === s.stampId) : null;
        const label = isPicture
          ? s.kind === 'signature'
            ? 'Signature'
            : 'Picture'
          : isStamp
          ? 'Postal Stamp ' + (stampDef?.name || s.emoji)
          : 'Sticker ' + s.emoji;

        return (
          <span
            key={s.id}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={
              editable ? `${label}. Drag or use arrow keys to move, Delete to remove.` : undefined
            }
            aria-hidden={editable ? undefined : true}
            onPointerDown={(e) => beginDrag(e, s)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onContextMenu={(e) => editable && e.preventDefault()}
            onFocus={() => editable && onSelect?.(s.id)}
            onKeyDown={(e) => editable && key(e, s)}
            className={`absolute z-10 select-none ${
              editable ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
            }`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              lineHeight: 1,
              transform: `translate(-50%, -50%) rotate(${s.rot || 0}deg)`,
              outline: editable && selectedId === s.id ? `2px dashed ${ink}` : 'none',
              outlineOffset: 4,
              touchAction: 'none',
            }}
          >
            {isPicture ? (
              <img
                src={s.src}
                alt=""
                draggable={false}
                className={
                  s.kind === 'signature'
                    ? 'block'
                    : 'block rounded-sm bg-white p-1 pb-3 shadow-lg ring-1 ring-black/10'
                }
                style={{ width: `${s.size}px`, height: 'auto', pointerEvents: 'none' }}
              />
            ) : isStamp ? (
              <span
                className="postal-stamp-wrapper"
                style={{
                  width: `${Math.max(48, s.size * 1.35)}px`,
                  height: `${Math.max(58, s.size * 1.6)}px`,
                  '--stamp-color': stampDef?.color || '#991b1b',
                  '--stamp-border': stampDef?.border || '#7f1d1d',
                }}
              >
                <span className="postal-stamp-inner">
                  <span className="postal-stamp-header">{stampDef?.code || 'POSTAGE'}</span>
                  <span className="postal-stamp-symbol" style={{ fontSize: `${s.size * 0.65}px` }}>
                    {stampDef?.symbol || s.emoji}
                  </span>
                  <span className="postal-stamp-postmark">{stampDef?.postmark || 'CANCELLED'}</span>
                </span>
              </span>
            ) : (
              <span style={{ fontSize: `${s.size}px`, fontFamily: 'system-ui, sans-serif' }}>
                {s.emoji}
              </span>
            )}
          </span>
        );
      })}
    </article>
  );
}
