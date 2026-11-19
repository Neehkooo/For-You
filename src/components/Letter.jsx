import { useRef } from 'react';
import { themes, fonts, getPages } from '../lib/themes.js';

const clamp = (n) => Math.min(98, Math.max(2, n));

// Renders the paper. With `editable`, stickers can be dragged (pointer or arrow keys).
export default function Letter({
  letter, page = 0, className = '', bare = false, editable = false, selectedId = null,
  onSelect, onStickerChange, onStickerRemove,
}) {
  const paper = useRef(null);
  const dragging = useRef(null);
  const theme = themes.find((t) => t.id === letter.theme) || themes[0];
  const font = fonts.find((f) => f.id === letter.font) || fonts[0];
  const template = letter.template || 'plain';
  const pages = getPages(letter);
  const isFirst = page === 0;
  const isLast = page === pages.length - 1;
  const body = pages[page] ?? '';
  const stickers = (letter.stickers || []).filter((s) => (s.page || 0) === page);
  const ink = theme.ink;

  const style = { background: theme.bg, color: ink, fontFamily: font.family, fontSize: font.size, lineHeight: 1.5 };
  if (bare) { style.padding = 56; style.minHeight = 848; } // fixed size used for PDF export
  const lines = template === 'ruled'
    ? { backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.5em - 1px), ${ink}33 calc(1.5em - 1px), ${ink}33 1.5em)` }
    : undefined;

  const down = (e, s) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = s.id;
    onSelect?.(s.id);
  };
  const move = (e) => {
    if (dragging.current == null) return;
    const r = paper.current.getBoundingClientRect();
    onStickerChange?.(dragging.current, {
      x: clamp(((e.clientX - r.left) / r.width) * 100),
      y: clamp(((e.clientY - r.top) / r.height) * 100),
    });
  };
  const key = (e, s) => {
    const nudge = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
    if (nudge) { e.preventDefault(); onStickerChange?.(s.id, { x: clamp(s.x + nudge[0]), y: clamp(s.y + nudge[1]) }); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onStickerRemove?.(s.id); }
  };

  return (
    <article
      ref={paper}
      onPointerDown={() => editable && onSelect?.(null)}
      className={`relative ${bare ? '' : 'rounded-lg p-7 shadow-2xl shadow-plum/25 sm:p-10'} ${className}`}
      style={style}
    >
      {template === 'frame' && <div aria-hidden="true" className="pointer-events-none absolute inset-3.5 rounded" style={{ border: `3px double ${ink}99` }} />}
      {template === 'stitched' && <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded" style={{ border: `2px dashed ${ink}88` }} />}
      {template === 'corners' && ['left-3.5 top-2.5', 'right-3.5 top-2.5 scale-x-[-1]', 'bottom-2.5 left-3.5 scale-y-[-1]', 'bottom-2.5 right-3.5 scale-[-1]'].map((pos) => (
        <span key={pos} aria-hidden="true" className={`pointer-events-none absolute select-none text-[1.4rem] opacity-60 ${pos}`} style={{ fontFamily: 'serif', lineHeight: 1 }}>❀</span>
      ))}

      {isFirst && letter.image && (
        <img src={letter.image} alt="" className="mx-auto mb-7 max-h-72 w-full max-w-xs -rotate-1 rounded-sm bg-white object-cover p-2 pb-6 shadow-lg" />
      )}

      <div style={lines}>
        {isFirst && letter.to && <p className="mb-[1.5em]">Dear {letter.to},</p>}
        <p className={`whitespace-pre-wrap break-words ${body ? '' : 'opacity-50'}`}>
          {body || 'Your words will appear here…'}
        </p>
        {isLast && letter.from && <p className="mt-[1.5em] text-right">Yours,<br />{letter.from}</p>}
      </div>

      {stickers.map((s) => (
        <span
          key={s.id}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          aria-label={editable ? `Sticker ${s.emoji}. Drag or use arrow keys to move, Delete to remove.` : undefined}
          aria-hidden={editable ? undefined : true}
          onPointerDown={(e) => down(e, s)}
          onPointerMove={move}
          onPointerUp={() => { dragging.current = null; }}
          onFocus={() => editable && onSelect?.(s.id)}
          onKeyDown={(e) => editable && key(e, s)}
          className={`absolute z-10 select-none ${editable ? 'cursor-grab touch-none active:cursor-grabbing' : 'pointer-events-none'}`}
          style={{
            left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size, lineHeight: 1, fontFamily: 'system-ui, sans-serif',
            transform: `translate(-50%, -50%) rotate(${s.rot || 0}deg)`,
            outline: editable && selectedId === s.id ? `2px dashed ${ink}` : 'none', outlineOffset: 4,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </article>
  );
}
