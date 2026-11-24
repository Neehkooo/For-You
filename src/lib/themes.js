export const themes = [
  { id: 'blush',     name: 'Blush',           bg: 'linear-gradient(160deg,#fde4e8,#f8c9d3)',              ink: '#4a1f2e' },
  { id: 'parchment', name: 'Parchment',       bg: '#efe3cf',                                              ink: '#3b2a1c' },
  { id: 'sage',      name: 'Sage',            bg: 'linear-gradient(160deg,#e3ecdd,#c3d6bd)',              ink: '#26382a' },
  { id: 'dusk',      name: 'Dusk',            bg: 'linear-gradient(160deg,#ffd9b8,#f59aa8 60%,#9c6fb5)',  ink: '#3a1630' },
  { id: 'midnight',  name: 'Midnight',        bg: 'linear-gradient(160deg,#1d1b3a,#3a2455)',              ink: '#f3e6f5' },
  { id: 'wine',      name: 'Wine',            bg: 'linear-gradient(160deg,#5b1226,#2f0a17)',              ink: '#fbe3e8' },
  { id: 'lavender',  name: 'Lavender Mist',   bg: 'linear-gradient(160deg,#ede9fe,#c4b5fd)',              ink: '#2e1065' },
  { id: 'sunset',    name: 'Sunset Glow',     bg: 'linear-gradient(160deg,#fed7aa,#fda4af 55%,#c084fc)',  ink: '#4a1236' },
  { id: 'ocean',     name: 'Ocean Breeze',    bg: 'linear-gradient(160deg,#e0f2fe,#7dd3fc 60%,#38bdf8)',  ink: '#0c4a6e' },
  { id: 'matcha',    name: 'Matcha Latte',    bg: 'linear-gradient(160deg,#f0fdf4,#bbf7d0 60%,#86efac)',  ink: '#14532d' },
  { id: 'cherry',    name: 'Cherry Blossom',  bg: 'linear-gradient(160deg,#fff1f2,#fecdd3 50%,#f472b6)',  ink: '#4c0519' },
  { id: 'golden',    name: 'Golden Hour',     bg: 'linear-gradient(160deg,#fef3c7,#fde68a 50%,#f59e0b)',  ink: '#451a03' },
  { id: 'starlight', name: 'Starlight',       bg: 'linear-gradient(160deg,#0f172a,#1e1b4b 60%,#312e81)',  ink: '#e0e7ff' },
  { id: 'aurora',    name: 'Aurora Sky',      bg: 'linear-gradient(160deg,#ccfbf1,#a7f3d0 50%,#bae6fd)',  ink: '#134e4a' },
];

export function resolveTheme(id) {
  if (typeof id !== 'string') return themes[0];
  const found = themes.find((t) => t.id === id);
  if (found) return found;

  // Solid custom color: custom_XXXXXX or #XXXXXX
  const hex = id.startsWith('custom_') ? '#' + id.slice(7) : id.startsWith('#') ? id : null;
  if (hex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    const fullHex =
      hex.length === 4
        ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
        : hex;
    const r = parseInt(fullHex.slice(1, 3), 16);
    const g = parseInt(fullHex.slice(3, 5), 16);
    const b = parseInt(fullHex.slice(5, 7), 16);
    // Relative luminance calculation
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const ink = luminance > 0.55 ? '#3b1d28' : '#fff9f5';
    return {
      id: `custom_${fullHex.slice(1).toLowerCase()}`,
      name: 'Custom Solid',
      bg: fullHex,
      ink,
      customHex: fullHex,
      isSolid: true,
    };
  }

  return themes[0];
}

export const fonts = [
  { id: 'vibes',       name: 'Great Vibes',         family: "'Great Vibes', cursive",            size: '2rem' },
  { id: 'alex',        name: 'Alex Brush',          family: "'Alex Brush', cursive",             size: '1.9rem' },
  { id: 'parisienne',  name: 'Parisienne',          family: "'Parisienne', cursive",             size: '1.8rem' },
  { id: 'dancing',     name: 'Dancing Script',      family: "'Dancing Script', cursive",         size: '1.6rem' },
  { id: 'caveat',      name: 'Caveat',              family: "'Caveat', cursive",                 size: '1.7rem' },
  { id: 'sacramento',  name: 'Sacramento',          family: "'Sacramento', cursive",             size: '1.95rem' },
  { id: 'satisfy',     name: 'Satisfy',             family: "'Satisfy', cursive",                size: '1.5rem' },
  { id: 'marck',       name: 'Marck Script',        family: "'Marck Script', cursive",           size: '1.55rem' },
  { id: 'homemade',    name: 'Homemade Apple',      family: "'Homemade Apple', cursive",         size: '1.25rem' },
  { id: 'shadows',     name: 'Shadows Into Light',  family: "'Shadows Into Light', cursive",     size: '1.35rem' },
  { id: 'cormorant',   name: 'Cormorant',           family: "'Cormorant Garamond', serif",       size: '1.45rem' },
  { id: 'lora',        name: 'Lora',                family: "'Lora', serif",                     size: '1.1rem' },
  { id: 'typewriter',  name: 'Typewriter',          family: "'Special Elite', monospace",        size: '1rem' },
];

export const MAX_BODY = 1500;

export const templates = [
  { id: 'plain',       name: 'Plain' },
  { id: 'ruled',       name: 'Ruled paper' },
  { id: 'frame',       name: 'Frame' },
  { id: 'stitched',    name: 'Stitched' },
  { id: 'corners',     name: 'Corners' },
  { id: 'vintage',     name: 'Vintage Scroll' },
  { id: 'floral',      name: 'Botanical Floral' },
  { id: 'minimal',     name: 'Minimalist Line' },
  { id: 'embossed',    name: 'Embossed Paper' },
  // Animated templates (locked for now)
  { id: 'anim_hearts', name: 'Floating Hearts', locked: true, badge: '✨ Locked' },
  { id: 'anim_stars',  name: 'Twinkling Stars', locked: true, badge: '✨ Locked' },
  { id: 'anim_petals', name: 'Falling Petals',  locked: true, badge: '✨ Locked' },
  { id: 'anim_snow',   name: 'Winter Snow',     locked: true, badge: '✨ Locked' },
];

export const stickerEmojis = [
  '❤️','💕','💖','💗','💘','💌','🌹','🌸','🌷','💐','🥰','😘',
  '😍','✨','⭐','🌙','🦋','🐝','🕊️','🧸','🎀','💍','🍓','🌈',
];

export const postalStamps = [
  { id: 'airmail',        name: 'Air Mail Par Avion', code: 'PAR AVION', symbol: '✈️', color: '#1d4ed8', border: '#b91c1c', postmark: 'AIR MAIL 1926' },
  { id: 'love_post',      name: 'Love Post 10¢',      code: '10¢ LOVE',   symbol: '🌹', color: '#be123c', border: '#881337', postmark: 'LOVE POST' },
  { id: 'dove_carrier',   name: 'Special Delivery',   code: 'SPECIAL',    symbol: '🕊️', color: '#0369a1', border: '#0284c7', postmark: '1ST CLASS' },
  { id: 'cupid_express',  name: 'Cupid Express',      code: '25¢ CUPID',  symbol: '💘', color: '#db2777', border: '#9d174d', postmark: 'EXPRESS' },
  { id: 'wax_seal',       name: 'Royal Dispatch',     code: 'SEALED',     symbol: '💌', color: '#991b1b', border: '#7f1d1d', postmark: 'REGISTERED' },
  { id: 'paris_post',     name: 'Paris Amour',        code: 'PARIS',      symbol: '🗼', color: '#4338ca', border: '#3730a3', postmark: 'PARIS 1926' },
  { id: 'forever_ring',   name: 'Forever & Always',   code: 'FOREVER',    symbol: '💍', color: '#b45309', border: '#92400e', postmark: 'ALWAYS' },
  { id: 'sakura_post',    name: 'Sakura Post',        code: '50¥ SAKURA', symbol: '🌸', color: '#e11d48', border: '#be123c', postmark: 'TOKYO' },
  { id: 'midnight_post',  name: 'Midnight Courier',   code: 'NIGHT MAIL', symbol: '🌙', color: '#475569', border: '#1e293b', postmark: 'MIDNIGHT' },
  { id: 'swan_lake',      name: 'Imperial Romance',   code: 'ROYAL',      symbol: '🦢', color: '#0f766e', border: '#115e59', postmark: 'IMPERIAL' },
];

export const MAX_STICKERS = 25;

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

// Birthday letters are delivered as a cake that is sliced open.
export const BIRTHDAY_BOX = 'cake';

// Cat delivery coat presets and customization (includes calico with black patch on left ear)
export const catColors = [
  { id: 'cat_orange',  name: 'Ginger Tabby', body: '#f59e0b', shade: '#b45309', belly: '#fef3c7', ear: '#fca5a5', nose: '#f43f5e', eyes: '#10b981' },
  { id: 'cat_tuxedo',  name: 'Tuxedo',       body: '#1f2937', shade: '#111827', belly: '#ffffff', ear: '#fbcfe8', nose: '#f43f5e', eyes: '#34d399' },
  { id: 'cat_white',   name: 'Cloud White',  body: '#f8fafc', shade: '#cbd5e1', belly: '#ffffff', ear: '#fbcfe8', nose: '#fb7185', eyes: '#38bdf8' },
  { id: 'cat_black',   name: 'Midnight',     body: '#262626', shade: '#171717', belly: '#3f3f46', ear: '#71717a', nose: '#171717', eyes: '#fbbf24' },
  { id: 'cat_gray',    name: 'Slate Gray',   body: '#64748b', shade: '#475569', belly: '#e2e8f0', ear: '#fbcfe8', nose: '#fb7185', eyes: '#a3e635' },
  { id: 'cat_calico',  name: 'Calico',       body: '#f97316', shade: '#c2410c', belly: '#ffffff', ear: '#fbcfe8', nose: '#f43f5e', eyes: '#34d399', patch: '#1f2937', leftEar: '#1f2937' },
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

// Bird delivery presentation presets and customization
export const birdColors = [
  { id: 'bird_dove',      name: 'White Dove',            body: '#ffffff', shade: '#cbd5e1', wing: '#f1f5f9', beak: '#f59e0b', belly: '#ffffff', eyes: '#1e293b' },
  { id: 'bird_blue',      name: 'Bluebird of Happiness', body: '#38bdf8', shade: '#0284c7', wing: '#0ea5e9', beak: '#f59e0b', belly: '#bae6fd', eyes: '#0f172a' },
  { id: 'bird_pink',      name: 'Rosefinch',             body: '#f472b6', shade: '#db2777', wing: '#fb7185', beak: '#f59e0b', belly: '#fdf2f8', eyes: '#1e1b18' },
  { id: 'bird_canary',    name: 'Golden Canary',         body: '#facc15', shade: '#ca8a04', wing: '#eab308', beak: '#ea580c', belly: '#fef08a', eyes: '#1c1917' },
  { id: 'bird_lavender',  name: 'Lavender Dove',         body: '#c084fc', shade: '#9333ea', wing: '#a855f7', beak: '#f59e0b', belly: '#f3e8ff', eyes: '#3b0764' },
  { id: 'bird_emerald',   name: 'Emerald Hummingbird',   body: '#34d399', shade: '#059669', wing: '#10b981', beak: '#d97706', belly: '#a7f3d0', eyes: '#064e3b' },
  { id: 'bird_midnight',  name: 'Midnight Raven',        body: '#1e293b', shade: '#0f172a', wing: '#334155', beak: '#94a3b8', belly: '#334155', eyes: '#fbbf24' },
];
export const DEFAULT_BIRD = 'bird_dove';

export function getBirdPalette(id) {
  const preset = birdColors.find((b) => b.id === id);
  if (preset) return preset;

  // Custom hex format: bird_XXXXXX
  if (typeof id === 'string' && /^bird_[0-9a-fA-F]{6}$/.test(id)) {
    const hex = '#' + id.slice(5);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const shadeR = Math.max(0, Math.floor(r * 0.72));
    const shadeG = Math.max(0, Math.floor(g * 0.72));
    const shadeB = Math.max(0, Math.floor(b * 0.72));
    const shade = `rgb(${shadeR},${shadeG},${shadeB})`;

    const wingR = Math.min(255, Math.floor(r * 0.85 + 255 * 0.15));
    const wingG = Math.min(255, Math.floor(g * 0.85 + 255 * 0.15));
    const wingB = Math.min(255, Math.floor(b * 0.85 + 255 * 0.15));
    const wing = `rgb(${wingR},${wingG},${wingB})`;

    const bellyR = Math.min(255, Math.floor(r * 0.25 + 255 * 0.75));
    const bellyG = Math.min(255, Math.floor(g * 0.25 + 255 * 0.75));
    const bellyB = Math.min(255, Math.floor(b * 0.25 + 255 * 0.75));
    const belly = `rgb(${bellyR},${bellyG},${bellyB})`;

    return {
      id,
      name: 'Custom Bird',
      body: hex,
      shade,
      wing,
      belly,
      beak: '#f59e0b',
      eyes: '#1e293b',
      customHex: hex,
    };
  }

  return birdColors[0];
}

export const resolveBox = (id) => {
  if (typeof id !== 'string') return DEFAULT_BOX;
  if (id === BIRTHDAY_BOX) return BIRTHDAY_BOX;
  if (boxColors.some((b) => b.id === id)) return id;
  if (catColors.some((c) => c.id === id)) return id;
  if (birdColors.some((b) => b.id === id)) return id;
  if (/^cat_[0-9a-fA-F]{6}$/.test(id)) return id.toLowerCase();
  if (/^bird_[0-9a-fA-F]{6}$/.test(id)) return id.toLowerCase();
  return DEFAULT_BOX;
};
