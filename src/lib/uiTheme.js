// Afternoon / Dawn / Dusk appearance for the whole app, light to dark. The chosen
// mode is written to <html data-ui="...">, where index.css swaps the Tailwind
// colour variables.

const KEY = 'for_you_ui_mode';
const DEFAULT = 'afternoon';

export const UI_MODES = [
  { id: 'afternoon', label: 'Afternoon', icon: '☀' },
  { id: 'dawn', label: 'Dawn', icon: '◐' },
  { id: 'dusk', label: 'Dusk', icon: '☾' },
];

// Modes saved by earlier versions keep working after the rename.
const LEGACY = { light: 'afternoon', grey: 'dawn', dark: 'dusk' };

function normalize(mode) {
  const mapped = LEGACY[mode] ?? mode;
  return UI_MODES.some((m) => m.id === mapped) ? mapped : DEFAULT;
}

export function getUiMode() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return normalize(saved);
  } catch {
    /* storage blocked */
  }
  return DEFAULT;
}

export function applyUiMode(mode) {
  if (typeof document === 'undefined') return;
  const clean = normalize(mode);
  document.documentElement.dataset.ui = clean;
  document.documentElement.style.colorScheme = clean === 'dusk' ? 'dark' : 'light';
}

export function setUiMode(mode) {
  const clean = normalize(mode);
  applyUiMode(clean);
  try {
    localStorage.setItem(KEY, clean);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event('for-you-ui-updated'));
  } catch {
    /* ignore */
  }
}

// Apply before first paint so there is no white flash for dark-mode visitors.
applyUiMode(getUiMode());
