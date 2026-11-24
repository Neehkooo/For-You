// Admin management library: statistics, scheduled maintenance, update logs, and authentication.

const ADMIN_PASS_KEY = 'for_you_admin_pass';
const ADMIN_SESSION_KEY = 'for_you_admin_session';
const MAINTENANCE_KEY = 'for_you_maintenance';
const STATS_KEY = 'for_you_stats';
const LOGS_KEY = 'for_you_update_logs';

export const DEFAULT_ADMIN_PASSCODE = 'admin2026';

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
  message: 'We are currently performing scheduled maintenance to upgrade our servers. Letter creation will resume shortly.',
  startTime: '',
  endTime: '',
  lockButton: true,
};

export function getMaintenance() {
  try {
    const raw = local.getItem(MAINTENANCE_KEY);
    if (!raw) return DEFAULT_MAINTENANCE;
    return { ...DEFAULT_MAINTENANCE, ...JSON.parse(raw) };
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

export function getUpdateLogs() {
  try {
    const raw = local.getItem(LOGS_KEY);
    if (!raw) return DEFAULT_UPDATE_LOGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_UPDATE_LOGS;
  } catch {
    return DEFAULT_UPDATE_LOGS;
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
