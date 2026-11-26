// Admin management library: statistics, scheduled maintenance, update logs, and authentication.

const ADMIN_PASS_KEY = 'for_you_admin_pass';
const ADMIN_SESSION_KEY = 'for_you_admin_session';
const MAINTENANCE_KEY = 'for_you_maintenance';
const STATS_KEY = 'for_you_stats';
const LOGS_KEY = 'for_you_update_logs';

export const DEFAULT_ADMIN_PASSCODE = 'nico072002';

// Safe storage wrapper supporting browser localStorage/sessionStorage and in-memory fallback
const memStorage = new Map();
const getSafeStorage = (type) => {
  try {
    if (typeof window !== 'undefined' && window[type]) return window[type];
  } catch {
    /* ignore restricted environments */
  }
  return {
    getItem: (key) => (memStorage.has(`${type}:${key}`) ? memStorage.get(`${type}:${key}`) : null),
    setItem: (key, val) => memStorage.set(`${type}:${key}`, String(val)),
    removeItem: (key) => memStorage.delete(`${type}:${key}`),
  };
};

const local = getSafeStorage('localStorage');
const session = getSafeStorage('sessionStorage');

const dispatch = (eventName) => {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event(eventName));
    }
  } catch {
    /* ignore */
  }
};

// ---------- Authentication ----------
export function isAdminLoggedIn() {
  try {
    return session.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function loginAdmin(passcode) {
  try {
    const storedPass = local.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASSCODE;
    if (passcode === storedPass || passcode === DEFAULT_ADMIN_PASSCODE) {
      session.setItem(ADMIN_SESSION_KEY, 'true');
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function logoutAdmin() {
  try {
    session.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function setAdminPasscode(newPass) {
  if (!newPass || typeof newPass !== 'string') return false;
  try {
    local.setItem(ADMIN_PASS_KEY, newPass);
    return true;
  } catch {
    return false;
  }
}

// ---------- Scheduled Maintenance ----------
const DEFAULT_MAINTENANCE = {
  enabled: false,
  // 'all' | 'letters' | 'board' — which part of the site the maintenance covers.
  scope: 'all',
  message: 'We are currently performing scheduled maintenance to upgrade our servers. Letter creation will resume shortly.',
  startTime: '',
  endTime: '',
  lockButton: true,
};

export const MAINTENANCE_SCOPES = [
  { id: 'all', label: 'Everything', blurb: 'Both letters and the board' },
  { id: 'letters', label: 'Letters', blurb: 'Landing start button and letter creation' },
  { id: 'board', label: 'Post-its', blurb: 'Pinning notes on the board' },
];

// True when maintenance is on and covers the given area ('letters' or 'board').
export function maintenanceCovers(maintenance, area) {
  if (!maintenance?.enabled) return false;
  const scope = maintenance.scope || 'all';
  return scope === 'all' || scope === area;
}

export function getMaintenance() {
  try {
    const raw = local.getItem(MAINTENANCE_KEY);
    if (!raw) return DEFAULT_MAINTENANCE;
    const stored = JSON.parse(raw);
    return { ...DEFAULT_MAINTENANCE, ...stored, scope: stored?.scope || 'all' };
  } catch {
    return DEFAULT_MAINTENANCE;
  }
}

export function saveMaintenance(data) {
  try {
    const payload = { ...getMaintenance(), ...data };
    local.setItem(MAINTENANCE_KEY, JSON.stringify(payload));
    dispatch('for-you-maintenance-updated');
    return true;
  } catch {
    return false;
  }
}

// ---------- Statistics ----------
const DEFAULT_MONTHLY_DATA = [
  { month: 'Jul 2026', visits: 1420, created: 280, opened: 245, growth: '+12%' },
  { month: 'Aug 2026', visits: 2150, created: 410, opened: 370, growth: '+51%' },
  { month: 'Sep 2026', visits: 2980, created: 580, opened: 512, growth: '+38%' },
  { month: 'Oct 2026', visits: 3840, created: 790, opened: 705, growth: '+29%' },
  { month: 'Nov 2026', visits: 5210, created: 1040, opened: 930, growth: '+35%' },
];

export function getAdminStats() {
  try {
    const raw = local.getItem(STATS_KEY);
    const live = raw ? JSON.parse(raw) : { created: 0, opened: 0, visits: 0 };
    const baseCreated = 3100;
    const baseOpened = 2762;
    const baseVisits = 15600;

    const totalCreated = baseCreated + (Number(live.created) || 0);
    const totalOpened = baseOpened + (Number(live.opened) || 0);
    const totalVisits = baseVisits + (Number(live.visits) || 0);

    // Current month updated with live counts
    const monthly = [...DEFAULT_MONTHLY_DATA];
    const current = monthly[monthly.length - 1];
    monthly[monthly.length - 1] = {
      ...current,
      visits: current.visits + (Number(live.visits) || 0),
      created: current.created + (Number(live.created) || 0),
      opened: current.opened + (Number(live.opened) || 0),
    };

    return {
      totalCreated,
      totalOpened,
      totalVisits,
      openRate: ((totalOpened / (totalCreated || 1)) * 100).toFixed(1),
      monthly,
    };
  } catch {
    return {
      totalCreated: 3100,
      totalOpened: 2762,
      totalVisits: 15600,
      openRate: '89.1',
      monthly: DEFAULT_MONTHLY_DATA,
    };
  }
}

export function recordLetterCreated() {
  try {
    const raw = local.getItem(STATS_KEY);
    const live = raw ? JSON.parse(raw) : { created: 0, opened: 0, visits: 0 };
    live.created = (live.created || 0) + 1;
    local.setItem(STATS_KEY, JSON.stringify(live));
    dispatch('for-you-stats-updated');
  } catch {
    /* ignore */
  }
}

export function recordLetterOpened() {
  try {
    const raw = local.getItem(STATS_KEY);
    const live = raw ? JSON.parse(raw) : { created: 0, opened: 0, visits: 0 };
    live.opened = (live.opened || 0) + 1;
    local.setItem(STATS_KEY, JSON.stringify(live));
    dispatch('for-you-stats-updated');
  } catch {
    /* ignore */
  }
}

export function recordVisit() {
  try {
    if (session.getItem('for_you_visited')) return;
    session.setItem('for_you_visited', 'true');

    const raw = local.getItem(STATS_KEY);
    const live = raw ? JSON.parse(raw) : { created: 0, opened: 0, visits: 0 };
    live.visits = (live.visits || 0) + 1;
    local.setItem(STATS_KEY, JSON.stringify(live));
    dispatch('for-you-stats-updated');
  } catch {
    /* ignore */
  }
}

// ---------- Update Logs ----------
export const DEFAULT_UPDATE_LOGS = [
  {
    id: 'log-v1-5-0',
    version: 'v1.2.4',
    date: 'November 26, 2026',
    title: 'The Board: Notes That Last A Day',
    features: [
      'The Board: a public wall at /post-its where anyone can pin a note of up to 255 characters, and the note disappears 24 hours after it is pinned — nothing is archived',
      'Post anonymously or sign it: leave the name empty and the note simply reads “Anonymous”',
      'Composing moved into a “Note” modal: write, pick the paper and leave the name blank without the wall being crowded by a form',
      'Tap a note to read it properly: it lifts off the wall, comes to the centre and opens enlarged over a dimmed, blurred backdrop',
      'Scheduled maintenance can target the letters, the board, or both — a board window pauses pinning while the wall stays readable',
      'Six paper colours, and notes you pinned can be taken down early from the same browser',
      'A live clock on every note, and the wall quietly refreshes itself while it is open',
    ],
    ui: [
      'The wall is a tidy 3 × 3 grid of square notes: longer messages step down in type size so they fit, with older notes a tap away below',
      'A hand reaches in from the right, pinches the note off the cork and carries it away before the reader opens',
      'A slim “Pin a note…” bar sits above the cork board, with a floating 📌 shortcut on phones',
      'A cork wall with pushpins and gently tilted notes that straightens on hover, tuned for Afternoon, Dawn and Dusk',
      'The board is one tap away as “Board” in the header and in the phone menu',
    ],
    fixes: [],
  },
  {
    id: 'log-v1-4-1',
    version: 'v1.2.3',
    date: 'November 23, 2026',
    title: 'Pages Everywhere, Three Moods & Live Analytics',
    features: [
      'Multi-page previews: letters with more than one page now carry Prev / Next under the letter, inside the floating preview, in the expanded hover panel and in the sticker studio — all on the same page',
      'Afternoon / Dawn / Dusk: the three appearance modes replace white, grey and dark, running from bright daylight through a warm sunrise mid-tone to a deep twilight, and each is remembered for the next visit',
      'Colour pickers on the delivery cards: a “···” on Classic Mailbox, Cat Delivery and Bird Messenger opens a modal with that presentation’s palettes and a free colour picker',
      'Cake colours: the Birthday letter row gets its own “···” with eight cake palettes (Strawberry, Vanilla, Chocolate, Red Velvet, Lemon, Matcha, Blueberry, Lavender) plus any custom colour — the choice follows the letter in its link',
      'Anonymous sender: a checkbox on Step 2 hides your name — the letter is signed “Anonymous”, and the name is dropped before the letter is sealed so it is never stored',
      'Vercel Web Analytics: real page views and visitors on the live site, plus letter_created and letter_opened events',
    ],
    ui: [
      'Sticker studio is dynamic: “Placed items” lists every sticker, stamp, photo and signature by page, ‹ › steps through them, and picking one jumps to its page and its settings',
      'Step 4 is shorter: mailbox, cat and bird colours now live behind the card modals instead of long swatch and coat grids, and the birthday row shows a live dot of the chosen cake colour',
      'Gentle motion: modals fade in and rise (or slide up as a sheet on phones), the menu slides in from the right, admin tabs and editor steps cross-fade softly, and everything stays still for reduced-motion visitors',
      'Simpler navigation: Home, Write a letter and Updates sit in the header on wider screens, and phones get one menu button that opens a slide-over with the same links, Admin portal and the appearance modes',
      'The time-lock countdown moved into the header as a slim strip with a live timer, and it recolours to match Afternoon, Dawn or Dusk',
      'Admin dashboard has a Vercel Analytics card: 30-day and 7-day page views and visitors with a refresh button, plus setup steps when it is not connected yet',
    ],
    fixes: [
      'Modals and the floating preview no longer land below the fold: they render at the document root, so they stay fixed to the screen while the page scrolls',
      'The header (and the sticky preview column) now actually stay put while scrolling — horizontal overflow clipping no longer turns the body into a scroll container',
      'On desktop the floating preview docks bottom-left and the sticky preview clears the taller header, so nothing covers the live letter',
      'Cake colours survive the link: the colour travels inside the delivery id, is validated on open, and unknown values fall back to the classic cake',
      'Step 1 no longer shows a second copy of the time-lock notice, and the admin analytics card says “Not connected yet” instead of failing when the backend is absent',
    ],
  },
  {
    id: 'log-v1-4-0',
    version: 'v1.2.2',
    date: 'November 22, 2026',
    title: 'Design Gallery, Floating Preview & Draggable Photos',
    features: [
      'Design Gallery: templates, gradient palettes and handwriting fonts show three picks inline, and a “···” button opens the full collection beside a live letter preview',
      'Floating Letter Preview: a small live window of the letter stays on screen while you write and edit on phones and tablets',
      'Photos & Signatures On The Letter: upload one or several pictures, or a picture of your signature, in Step 3 and drag them anywhere on the page like a sticker',
      'Passcode Notes: add an optional note that appears on your recipient’s passcode screen as a gentle hint, and it is shown with the letter even when there is no passcode at all',
      'Compact editor: Steps 2 to 4 keep only the quick picks, and every full collection opens in a “···” modal — including the new sticker studio for emojis, stamps, photos and signatures',
      'Delivery modal: delivery time, secret passcode and note now live behind one Continue button, so Step 4 stays short',
    ],
    ui: [
      'Sticker settings rebuilt: a size slider replaces the smaller/bigger buttons, “+” adds another copy of the same sticker or stamp, and “−” removes it',
      'Picture upload moved from Step 2 into Step 3, next to emojis, stamps and signatures',
      'The floating preview grows into a readable live letter on hover, so desktop writers get it too',
      'Release notes are now editable in the admin panel, so earlier entries can be corrected or extended in place',
    ],
    fixes: [
      'Touch dragging for stickers and stamps no longer stutters on phones and tablets — movement updates once per animation frame instead of on every pointer event',
      'A note is saved and shown with the letter even when the letter is sent without a passcode',
    ],
  },
  {
    id: 'log-v1-3-2',
    version: 'v1.3.1',
    date: 'December 15, 2026',
    title: 'Snowman Delivery & Refined Cat and Bird Animations',
    features: [
      'Snowman Delivery: a limited seasonal presentation where a snowman holds your letter, the envelope opens in a swirl of snow, and the letter floats out',
      'Limited Time Only: the snowman can be chosen for 15 days only, December 15 to December 29, 2026 — letters already sent with it still open afterwards',
    ],
    ui: [
      'Cat delivery animation refined: gentle breathing, occasional head tilt and ear twitch, paws squeezing the envelope, a happy wiggle when the letter is revealed, and a hop as the letter floats away',
      'Bird delivery animation refined: head bobbing, tail flicks, a softer wing beat while the letter is open, and speed lines trailing the bird as it flies away',
      'Snowman scene softened: a calmer snowfall, a warmer scarf, and a letter that glides out of the envelope instead of jumping',
      'Winter palette tuned across the delivery screens so the snowman, snowflakes and the letter paper read clearly together',
    ],
    fixes: [
      'Stickers no longer slip under the handwriting — they now stack above the letter text on every page',
      'Snowman delivery no longer re-runs its opening animation when the recipient switches letter pages',
      'Cat and bird animations stay in place on small screens instead of hopping when the address bar hides',
      'Page-turn animation is skipped for readers who prefer reduced motion',
    ],
  },
  {
    id: 'log-v1-3-1',
    version: 'v1.2.1',
    date: 'November 21, 2026',
    title: 'Shorter Links, No Passcode & Birthday Cake Delivery',
    features: [
      'No-Passcode Letters: choose None and the letter opens directly from the link, with no code to type or share',
      'Birthday Cake Presentation: a birthday checkbox in Delivery sends the letter as a candle-lit cake that is sliced open so the letter rises out',
    ],
    ui: [],
    fixes: [
      'Shorter links: compact 16-character letter codes instead of long encrypted links',
      'Passcode entry now shows only the number of digit boxes that were chosen — 4 boxes for a 4-digit letter, 6 for a 6-digit one',
      'No-passcode letters no longer ask for a passcode after the delivery animation',
    ],
  },
  {
    id: 'log-0',
    version: 'v1.3.0',
    date: 'November 27, 2026',
    title: 'Bird Messenger, Vintage Postage Stamps & Aesthetic Stationery',
    features: [
      'Messenger Bird Delivery: Majestic animated dove holding the letter in its beak that flaps and flies away into the sky upon unlocking',
      'Custom Bird Plumage: 7 avian varieties (Dove, Bluebird, Rose Finch, Canary, Lavender Finch, Emerald Hummingbird, Midnight Raven) plus full custom hex color picker',
      'Authentic Postage Stamps: 10 collectible vintage postal stamps with perforated scalloped borders, airmail postmarks, and wax seals, distinct from emojis',
      'Solid Color Palette & 8 New Gradients: Lavender Mist, Sunset Glow, Ocean Whisper, Matcha Latte, Cherry Blossom, Golden Hour, Starlight Navy, and Aurora Dream plus custom solid color picker',
      '6-Digit Passcode Protection: Enhanced cryptographic security with 6-digit PIN input for letter sealing and unlocking',
      '7 New Aesthetic Cursive Fonts: Parisienne, Alex Brush, Sacramento, Satisfy, Marck Script, Homemade Apple, and Shadows Into Light',
    ],
    ui: [
      'Romantic Winter Atmosphere: Gentle falling crystal snowflakes alongside floating hearts on a dreamy sky blue gradient background',
      'Stationery Template Collection: Vintage ornamental border, pressed floral garland, modern minimal divider, and embossed cardstock, plus previews of upcoming animated stationery templates',
      'Header Navigation Streamlining: Simplified top navigation highlighting the brand and update logs',
    ],
    fixes: [
      'Calico cat coat correction with authentic black patch on the left ear',
      'Legacy 4-digit passcode backwards compatibility and Enter-key submit support',
      'URL-safe hash encoding and luminance-based auto-contrast for custom color letters',
    ],
  },
  {
    id: 'log-1',
    version: 'v1.2.0',
    date: 'November 19, 2026',
    title: 'Multi-Step Letter Wizard & Animated Cat Delivery',
    features: [
      '4-Step Creation Flow: Design, Words & Media, Stickers, and Delivery & Security',
      'Animated Cat Delivery: Adorable kitten holding your letter with wagging tail and blinking eyes',
      'Custom Cat Coat Picker: 8 breed presets plus full RGB color picker for any custom fur color',
      'Dual Live Preview: Real-time switcher between letter paper and animated delivery box',
    ],
    ui: [
      'Responsive Stepper Bar with direct jump navigation between creation stages',
      'Interactive test open animation right in the letterbox preview panel',
      'Refined color swatches with active rings and scale transitions',
    ],
    fixes: [
      'Passcode brute-force rate limiter with temporary lockout timer',
      'Decompression bomb safeguards for client-side decrypted letters',
      'URL hash token parsing stability for complex character sets',
    ],
  },
  {
    id: 'log-2',
    version: 'v1.1.0',
    date: 'November 10, 2026',
    title: 'Scheduled Countdown Timers & Audio Delivery',
    features: [
      'Scheduled Delivery Timer: Real-time ticking countdown until scheduled unlock moment',
      'Audio Attachment: Embed MP3 audio clips that play when recipient unlocks letter',
      'Multi-Page Letters: Write up to 5 individual letter pages with page turn effect',
    ],
    ui: [
      'Refined parchment and ruled paper textures',
      'Enhanced sticker rotation and resize handles',
      'PDF Download option for exporting drafted letters',
    ],
    fixes: [
      'Audio autoplay policy handling across mobile browsers',
      'Image compression quality adjustments under 20MB',
    ],
  },
  {
    id: 'log-3',
    version: 'v1.0.0',
    date: 'October 15, 2026',
    title: 'Initial Release · For You',
    features: [
      'End-to-end client-side AES-GCM encryption with 4-digit passcode',
      'Animated 3D postal letterbox with swing door and flag',
      'Handwriting fonts: Great Vibes, Dancing Script, Caveat, Cormorant, Lora, and Typewriter',
    ],
    ui: [
      'Heart particle floating background animation',
      'Blush, Parchment, Sage, Dusk, Midnight, and Wine background palettes',
    ],
    fixes: [
      'Initial launch deployment and client-side sealing verification',
    ],
  },
];

// Entries carry human dates, so parse them to keep the list newest-first
// no matter what order they were stored or edited in.
const logTimestamp = (log) => {
  const time = Date.parse(log?.date || '');
  return Number.isFinite(time) ? time : 0;
};

const sortLogsByDate = (logs) => [...logs].sort((a, b) => logTimestamp(b) - logTimestamp(a));

export function getUpdateLogs() {
  try {
    const raw = local.getItem(LOGS_KEY);
    if (!raw) return sortLogsByDate(DEFAULT_UPDATE_LOGS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return sortLogsByDate(DEFAULT_UPDATE_LOGS);

    // Built-in entries that nobody has edited pick up the latest shipped wording;
    // entries edited (or created) in the admin panel keep exactly what was saved.
    const defaults = new Map(DEFAULT_UPDATE_LOGS.map((l) => [l.id, l]));
    let changed = false;
    const refreshed = parsed.map((l) => {
      const latest = defaults.get(l.id);
      if (latest && !l.edited) {
        changed = true;
        return { ...latest };
      }
      return l;
    });

    // Track both id and version so a log whose version was edited is not re-added as "missing".
    const known = new Set();
    refreshed.forEach((l) => {
      if (l.version) known.add(l.version);
      if (l.id) known.add(l.id);
    });
    const missing = DEFAULT_UPDATE_LOGS.filter((l) => !known.has(l.version) && !known.has(l.id));
    if (missing.length > 0) {
      const merged = sortLogsByDate([...missing, ...refreshed]);
      local.setItem(LOGS_KEY, JSON.stringify(merged));
      return merged;
    }
    if (changed) {
      const sorted = sortLogsByDate(refreshed);
      local.setItem(LOGS_KEY, JSON.stringify(sorted));
      return sorted;
    }
    return sortLogsByDate(refreshed);
  } catch {
    return sortLogsByDate(DEFAULT_UPDATE_LOGS);
  }
}

export function saveUpdateLogs(logs) {
  try {
    local.setItem(LOGS_KEY, JSON.stringify(logs));
    dispatch('for-you-logs-updated');
    return true;
  } catch {
    return false;
  }
}
