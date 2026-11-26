import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { boxColors, catColors, birdColors, cakeColors } from '../lib/themes.js';

const TYPES = {
  mailbox: {
    title: 'Mailbox colour',
    blurb: 'Choose the paint for the classic letterbox.',
    options: boxColors,
    custom: null,
  },
  cat: {
    title: 'Cat coat',
    blurb: 'Pick a coat preset, or mix any colour you like.',
    options: catColors,
    custom: 'Custom coat colour',
  },
  bird: {
    title: 'Bird plumage',
    blurb: 'Pick a plumage preset, or mix any colour you like.',
    options: birdColors,
    custom: 'Custom plumage colour',
  },
  cake: {
    title: 'Cake colour',
    blurb: 'Frosting, tiers and drips follow your pick.',
    options: cakeColors,
    custom: 'Custom cake colour',
  },
};

const swatchOf = (c) => c.body || c.base || '#ccc';

// `<type>_<hex6>` ids carry a custom colour; anything else is a preset id.
function hexOf(value, options) {
  const match = typeof value === 'string' && value.match(/_([0-9a-fA-F]{6})$/);
  if (match) return '#' + match[1].toLowerCase();
  const preset = options.find((o) => o.id === value);
  return preset ? swatchOf(preset) : swatchOf(options[0]);
}

export default function DeliveryColorModal({ type, value, onPick, onCustom, onClose }) {
  const config = TYPES[type];
  const options = config?.options ?? [];

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!config) return null;

  const customHex = hexOf(value, options);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-3 sm:px-5">
          <div>
            <h2 id="color-title" className="font-display text-xl font-light text-plum">
              {config.title}
            </h2>
            <p className="mt-0.5 text-xs text-plum/60">{config.blurb}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${config.title.toLowerCase()}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 transition-colors hover:bg-plum/10 hover:text-plum"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-4 py-4 sm:px-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-plum/60">
            {type === 'mailbox' ? 'Colours' : 'Presets'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const isSelected = value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onPick(option.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                    isSelected
                      ? 'border-seal bg-white/90 font-medium shadow-xs'
                      : 'border-plum/20 bg-white/40 hover:bg-white/60'
                  }`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-plum/25"
                    style={{ background: swatchOf(option) }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.name}</span>
                </button>
              );
            })}
          </div>

          {config.custom && onCustom && (
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-plum/20 bg-white/50 px-3 py-2.5">
              <span className="text-xs font-medium text-plum">{config.custom}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase text-plum/60">{customHex}</span>
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => onCustom(e.target.value)}
                  aria-label={config.custom}
                  className="h-8 w-10 cursor-pointer rounded border border-plum/30 bg-transparent p-0.5"
                />
              </span>
            </label>
          )}
        </div>

        <div className="flex justify-end border-t border-plum/10 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-seal px-5 py-2 text-sm font-medium text-petal hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
