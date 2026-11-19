export const themes = [
  { id: 'blush',    name: 'Blush',     bg: 'linear-gradient(160deg,#fde4e8,#f8c9d3)',              ink: '#4a1f2e' },
  { id: 'parchment',name: 'Parchment', bg: '#efe3cf',                                              ink: '#3b2a1c' },
  { id: 'sage',     name: 'Sage',      bg: 'linear-gradient(160deg,#e3ecdd,#c3d6bd)',              ink: '#26382a' },
  { id: 'dusk',     name: 'Dusk',      bg: 'linear-gradient(160deg,#ffd9b8,#f59aa8 60%,#9c6fb5)',  ink: '#3a1630' },
  { id: 'midnight', name: 'Midnight',  bg: 'linear-gradient(160deg,#1d1b3a,#3a2455)',              ink: '#f3e6f5' },
  { id: 'wine',     name: 'Wine',      bg: 'linear-gradient(160deg,#5b1226,#2f0a17)',              ink: '#fbe3e8' },
];

export const fonts = [
  { id: 'vibes',     name: 'Great Vibes',       family: "'Great Vibes', cursive",            size: '2rem' },
  { id: 'dancing',   name: 'Dancing Script',    family: "'Dancing Script', cursive",         size: '1.6rem' },
  { id: 'caveat',    name: 'Caveat',            family: "'Caveat', cursive",                 size: '1.7rem' },
  { id: 'cormorant', name: 'Cormorant',         family: "'Cormorant Garamond', serif",       size: '1.45rem' },
  { id: 'lora',      name: 'Lora',              family: "'Lora', serif",                     size: '1.1rem' },
  { id: 'typewriter',name: 'Typewriter',        family: "'Special Elite', monospace",        size: '1rem' },
];

export const MAX_BODY = 1500;

export const templates = [
  { id: 'plain',    name: 'Plain' },
  { id: 'ruled',    name: 'Ruled paper' },
  { id: 'frame',    name: 'Frame' },
  { id: 'stitched', name: 'Stitched' },
  { id: 'corners',  name: 'Corners' },
];

export const stickerEmojis = [
  '❤️','💕','💖','💗','💘','💌','🌹','🌸','🌷','💐','🥰','😘',
  '😍','✨','⭐','🌙','🦋','🐝','🕊️','🧸','🎀','💍','🍓','🌈',
];

export const MAX_STICKERS = 20;

export const MAX_PAGES = 5;
// Older letters stored a single `body`; newer ones store `pages`.
export const getPages = (l) => (Array.isArray(l.pages) && l.pages.length ? l.pages : [l.body || '']);

// Letterbox (mailbox) colours. `body` is the box, `shade` is the trim and the door edge.
export const boxColors = [
  { id: 'red',   name: 'Postal red', body: '#c0392b', shade: '#7e2318' },
  { id: 'cream', name: 'Cream',      body: '#f3e6d0', shade: '#b89e78' },
  { id: 'sage',  name: 'Sage',       body: '#9fbfa0', shade: '#56725a' },
  { id: 'sky',   name: 'Sky',        body: '#9cc4e4', shade: '#3f6e95' },
  { id: 'lilac', name: 'Lilac',      body: '#bfa9e6', shade: '#6f56a3' },
  { id: 'rose',  name: 'Rose',       body: '#f2a7b8', shade: '#b5576e' },
  { id: 'plum',  name: 'Plum',       body: '#4a2a4f', shade: '#211024' },
  { id: 'gold',  name: 'Gold',       body: '#e4b85c', shade: '#94702a' },
];
export const DEFAULT_BOX = 'red';

// Cat delivery coat presets and customization
export const catColors = [
  { id: 'cat_orange',  name: 'Ginger Tabby', body: '#f59e0b', shade: '#b45309', belly: '#fef3c7', ear: '#fca5a5', nose: '#f43f5e', eyes: '#10b981' },
  { id: 'cat_tuxedo',  name: 'Tuxedo',       body: '#1f2937', shade: '#111827', belly: '#ffffff', ear: '#fbcfe8', nose: '#f43f5e', eyes: '#34d399' },
  { id: 'cat_white',   name: 'Cloud White',  body: '#f8fafc', shade: '#cbd5e1', belly: '#ffffff', ear: '#fbcfe8', nose: '#fb7185', eyes: '#38bdf8' },
  { id: 'cat_black',   name: 'Midnight',     body: '#262626', shade: '#171717', belly: '#3f3f46', ear: '#71717a', nose: '#171717', eyes: '#fbbf24' },
  { id: 'cat_gray',    name: 'Slate Gray',   body: '#64748b', shade: '#475569', belly: '#e2e8f0', ear: '#fbcfe8', nose: '#fb7185', eyes: '#a3e635' },
  { id: 'cat_calico',  name: 'Calico',       body: '#f97316', shade: '#c2410c', belly: '#ffffff', ear: '#fbcfe8', nose: '#f43f5e', eyes: '#34d399', patch: '#374151' },
  { id: 'cat_siamese', name: 'Siamese',      body: '#fef3c7', shade: '#b45309', belly: '#fffbeb', ear: '#451a03', nose: '#451a03', eyes: '#38bdf8', points: '#451a03' },
  { id: 'cat_pink',    name: 'Strawberry',   body: '#f472b6', shade: '#db2777', belly: '#fdf2f8', ear: '#fda4af', nose: '#e11d48', eyes: '#818cf8' },
];
export const DEFAULT_CAT = 'cat_orange';

export function getCatPalette(id) {
  const preset = catColors.find((c) => c.id === id);
  if (preset) return preset;

  // Custom hex format: cat_XXXXXX
  if (typeof id === 'string' && /^cat_[0-9a-fA-F]{6}$/.test(id)) {
    const hex = '#' + id.slice(4);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const shadeR = Math.max(0, Math.floor(r * 0.72));
    const shadeG = Math.max(0, Math.floor(g * 0.72));
    const shadeB = Math.max(0, Math.floor(b * 0.72));
    const shade = `rgb(${shadeR},${shadeG},${shadeB})`;

    const bellyR = Math.min(255, Math.floor(r * 0.25 + 255 * 0.75));
    const bellyG = Math.min(255, Math.floor(g * 0.25 + 255 * 0.75));
    const bellyB = Math.min(255, Math.floor(b * 0.25 + 255 * 0.75));
    const belly = `rgb(${bellyR},${bellyG},${bellyB})`;

    return {
      id,
      name: 'Custom Cat',
      body: hex,
      shade,
      belly,
      ear: '#fbcfe8',
      nose: '#fb7185',
      eyes: '#10b981',
      customHex: hex,
    };
  }

  return catColors[0];
}

export const resolveBox = (id) => {
  if (typeof id !== 'string') return DEFAULT_BOX;
  if (boxColors.some((b) => b.id === id)) return id;
  if (catColors.some((c) => c.id === id)) return id;
  if (/^cat_[0-9a-fA-F]{6}$/.test(id)) return id.toLowerCase();
  return DEFAULT_BOX;
};
