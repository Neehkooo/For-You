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
export const resolveBox = (id) => (boxColors.some((b) => b.id === id) ? id : DEFAULT_BOX);
