import { useState } from 'react';
import Letter from '../components/Letter.jsx';
import DesignGallery from '../components/DesignGallery.jsx';
import FloatingPreview from '../components/FloatingPreview.jsx';
import StickerStudio from '../components/StickerStudio.jsx';
import DeliveryModal from '../components/DeliveryModal.jsx';
import DeliveryColorModal from '../components/DeliveryColorModal.jsx';
import {
  themes,
  fonts,
  templates,
  stickerEmojis,
  postalStamps,
  MAX_STICKERS,
  MAX_BODY,
  MAX_PAGES,
  getPages,
  DEFAULT_BOX,
  DEFAULT_CAT,
  DEFAULT_BIRD,
  BIRTHDAY_BOX,
  SNOWMAN_BOX,
  DEFAULT_CAKE,
  getCakePalette,
  isCakeBox,
  resolveTheme,
} from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import Open from './Open.jsx';
import { sealLetter } from '../lib/seal.js';
import { compressImage, compressSignature, readAsDataURL, MAX_AUDIO } from '../lib/media.js';
import { saveLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';
import { recordLetterCreated, getMaintenance, maintenanceCovers } from '../lib/admin.js';
import { trackEvent } from '../lib/analytics.js';
import {
  V13_UNLOCK_LABEL,
  V13_THEME_IDS,
  V13_FONT_IDS,
  V13_TEMPLATE_IDS,
  SNOWMAN_DAYS,
  SNOWMAN_START_LABEL,
  SNOWMAN_END_LABEL,
  formatRemaining,
  isSnowmanAvailable,
  isV13Unlocked,
  useSnowmanWindow,
  useV13Unlock,
} from '../lib/release.js';

const chip =
  'rounded-full border border-plum/30 px-4 py-1.5 text-sm hover:bg-white/50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors';

const defaultWhen = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return t.getTime();
};

const empty = {
  to: '',
  from: '',
  anonymousFrom: false,
  pages: [''],
  theme: 'blush',
  font: 'vibes',
  image: null,
  music: null,
  template: 'plain',
  stickers: [],
  pinNote: '',
  box: DEFAULT_BOX,
};

const SOLID_PRESETS = [
  { name: 'Pure Snow', hex: '#ffffff' },
  { name: 'Rose Petal', hex: '#ffe4e6' },
  { name: 'Warm Cream', hex: '#fef3c7' },
  { name: 'Mint Breeze', hex: '#d1fae5' },
  { name: 'Sky Pastel', hex: '#e0f2fe' },
  { name: 'Lavender Mist', hex: '#f3e8ff' },
  { name: 'Peach Glow', hex: '#ffedd5' },
  { name: 'Velvet Plum', hex: '#2e1065' },
];

const STEPS = [
  { id: 1, title: 'Letter Design', short: 'Design', icon: '🎨' },
  { id: 2, title: 'Message & Media', short: 'Words', icon: '✍️' },
  { id: 3, title: 'Emojis & Stickers', short: 'Stickers', icon: '✨' },
  { id: 4, title: 'Delivery & Passcode', short: 'Delivery', icon: '💌' },
];

// Step 1 shows three options inline and the rest behind a “···” button.
// A selected option outside the first three is swapped in so it stays visible.
const head = (list, activeId, n = 3) => {
  const out = list.slice(0, n);
  if (activeId && !out.some((x) => x.id === activeId)) {
    const act = list.find((x) => x.id === activeId);
    if (act) out[n - 1] = act;
  }
  return out;
};

// Long links carry the passcode note in their hash prefix (base64url, dots stand in for dashes).
const encodeNote = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').replace(/-/g, '.');
};

export default function Create() {
  const [step, setStep] = useState(1);
  const [letter, setLetter] = useState(empty);
  const [cur, setCur] = useState(0);
  const [pin, setPin] = useState('');
  const { unlocked: v13Unlocked } = useV13Unlock();
  const snowman = useSnowmanWindow();
  const [pinLength, setPinLength] = useState(() => (isV13Unlocked() ? 6 : 4));
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(defaultWhen);
  const [link, setLink] = useState('');
  const [linkKind, setLinkKind] = useState('');
  const [storageMissing, setStorageMissing] = useState(false);
  const [noPasscode, setNoPasscode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [viewNow, setViewNow] = useState(''); // "<box>-<token>" opened inside the editor
  const [previewTab, setPreviewTab] = useState('letter'); // 'letter' | 'delivery'
  const [testStage, setTestStage] = useState('closed');
  const [lockedNotice, setLockedNotice] = useState('');
  const [stickerTab, setStickerTab] = useState('emojis'); // 'emojis' | 'stamps'
  const [pinNote, setPinNote] = useState('');
  const [gallery, setGallery] = useState(null); // 'template' | 'theme' | 'font'
  const [studio, setStudio] = useState(false); // step 3 sticker / stamp studio
  const [colorModal, setColorModal] = useState(null); // 'mailbox' | 'cat' | 'bird' | 'cake'
  const [deliveryOpen, setDeliveryOpen] = useState(false); // step 4 finish modal
  const pages = getPages(letter);
  const availableTemplates = v13Unlocked
    ? templates.length
    : templates.filter((t) => !V13_TEMPLATE_IDS.has(t.id)).length;
  const availableFonts = v13Unlocked ? fonts.length : fonts.filter((f) => !V13_FONT_IDS.has(f.id)).length;
  const isCat = typeof letter.box === 'string' && letter.box.startsWith('cat');
  const isBird = typeof letter.box === 'string' && letter.box.startsWith('bird');
  const isCake = isCakeBox(letter.box);
  const cakeColorId = isCake && letter.box.startsWith('cake_') ? letter.box.slice(5) : DEFAULT_CAKE;
  const cakePalette = getCakePalette(isCake ? letter.box : DEFAULT_CAKE);
  const isSnowman = letter.box === SNOWMAN_BOX;

  // ---------- pages ----------
  const setPageText = (text) =>
    setLetter((l) => ({ ...l, pages: getPages(l).map((t, k) => (k === cur ? text : t)) }));

  const addPage = () => {
    if (pages.length >= MAX_PAGES) return;
    setLetter((l) => ({ ...l, pages: [...getPages(l), ''] }));
    setCur(pages.length);
  };

  const removePage = () => {
    if (pages.length === 1) return;
    const i = cur;
    setLetter((l) => {
      const p = getPages(l);
      return {
        ...l,
        pages: p.filter((_, k) => k !== i),
        stickers: l.stickers
          .filter((s) => (s.page || 0) !== i)
          .map((s) => ((s.page || 0) > i ? { ...s, page: s.page - 1 } : s)),
      };
    });
    setCur(Math.max(0, Math.min(cur, pages.length - 2)));
  };

  // ---------- stickers & stamps ----------
  const addSticker = (emoji) => {
    if (letter.stickers.length >= MAX_STICKERS) return;
    const id = Math.random().toString(36).slice(2, 8);
    const s = { id, emoji, page: cur, x: 25 + Math.random() * 50, y: 20 + Math.random() * 50, size: 44, rot: 0 };
    setLetter((l) => ({ ...l, stickers: [...l.stickers, s] }));
    setSelectedId(id);
  };

  const addStamp = (stamp) => {
    if (letter.stickers.length >= MAX_STICKERS) return;
    const id = Math.random().toString(36).slice(2, 8);
    const s = {
      id,
      kind: 'stamp',
      stampId: stamp.id,
      emoji: stamp.symbol || '💌',
      page: cur,
      x: 75 + Math.round((Math.random() - 0.5) * 8),
      y: 15 + Math.round((Math.random() - 0.5) * 8),
      size: 44,
      rot: Math.round((Math.random() - 0.5) * 10),
    };
    setLetter((l) => ({ ...l, stickers: [...l.stickers, s] }));
    setSelectedId(id);
  };

  const patchSticker = (id, patch) =>
    setLetter((l) => ({ ...l, stickers: l.stickers.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const removeSticker = (id) => {
    setLetter((l) => ({ ...l, stickers: l.stickers.filter((s) => s.id !== id) }));
    setSelectedId(null);
  };

  // “+” in the settings panel: drop another copy of the same sticker / stamp / photo.
  const duplicateSticker = (id) => {
    const src = letter.stickers.find((s) => s.id === id);
    if (!src || letter.stickers.length >= MAX_STICKERS) return;
    const copy = {
      ...src,
      id: Math.random().toString(36).slice(2, 8),
      x: Math.min(96, src.x + 5),
      y: Math.min(96, src.y + 5),
      rot: (src.rot || 0) + 3,
    };
    setLetter((l) => ({ ...l, stickers: [...l.stickers, copy] }));
    setSelectedId(copy.id);
  };

  // ---------- media ----------
  // Uploaded photos become draggable picture stickers instead of a fixed image on page 1.
  const addPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setMediaError('');
    const room = MAX_STICKERS - letter.stickers.length;
    if (room <= 0) return setMediaError(`You can place up to ${MAX_STICKERS} items on a letter.`);
    const created = [];
    for (const f of files.slice(0, room)) {
      if (!f.type.startsWith('image/')) {
        setMediaError('Choose image files (JPG, PNG or WebP).');
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        setMediaError('Choose pictures under 20 MB each.');
        continue;
      }
      try {
        const src = await compressImage(f, 560, 0.8);
        created.push({
          id: Math.random().toString(36).slice(2, 8),
          kind: 'photo',
          src,
          emoji: '🖼️',
          page: cur,
          x: 32 + Math.random() * 36,
          y: 30 + Math.random() * 40,
          size: 150,
          rot: Math.round((Math.random() - 0.5) * 8),
        });
      } catch {
        setMediaError('One of those pictures couldn’t be read. Try a JPG or PNG.');
      }
    }
    if (!created.length) return;
    setLetter((l) => ({ ...l, stickers: [...l.stickers, ...created] }));
    setSelectedId(created[created.length - 1].id);
  };

  // Signatures keep transparency (PNG) and land in the signing corner, ready to drag.
  const addSignature = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setMediaError('');
    if (!f.type.startsWith('image/'))
      return setMediaError('Upload a picture of your signature (PNG works best).');
    if (letter.stickers.length >= MAX_STICKERS)
      return setMediaError(`You can place up to ${MAX_STICKERS} items on a letter.`);
    try {
      const src = await compressSignature(f, 680);
      const id = Math.random().toString(36).slice(2, 8);
      const s = {
        id,
        kind: 'signature',
        src,
        emoji: '✍️',
        page: cur,
        x: 66,
        y: 84,
        size: 170,
        rot: -2,
      };
      setLetter((l) => ({ ...l, stickers: [...l.stickers, s] }));
      setSelectedId(id);
    } catch {
      setMediaError('That signature couldn’t be read. Try a PNG with a transparent background.');
    }
  };

  const pickMusic = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setMediaError('');
    if (!f.type.startsWith('audio/')) return setMediaError('Choose an audio file, such as an MP3.');
    if (f.size > MAX_AUDIO)
      return setMediaError(
        `That file is ${Math.round(f.size / 1024)} KB. Choose a clip under ${MAX_AUDIO / 1024} KB (about 30 seconds of MP3).`
      );
    const src = await readAsDataURL(f);
    setLetter((l) => ({ ...l, music: { name: f.name, src } }));
  };

  // ---------- presentation selection ----------
  const setDeliveryType = (type) => {
    setTestStage('closed');
    if (type === 'cat') {
      if (!isCat) setLetter((l) => ({ ...l, box: DEFAULT_CAT }));
    } else if (type === 'bird') {
      if (!isBird) setLetter((l) => ({ ...l, box: DEFAULT_BIRD }));
    } else if (type === 'snowman') {
      if (!isSnowman) setLetter((l) => ({ ...l, box: SNOWMAN_BOX }));
    } else {
      if (isCat || isBird || isCake || isSnowman) setLetter((l) => ({ ...l, box: DEFAULT_BOX }));
    }
  };

  const setBirthday = (on) => {
    setTestStage('closed');
    setLetter((l) => ({
      ...l,
      box: on ? (isCakeBox(l.box) ? l.box : BIRTHDAY_BOX) : DEFAULT_BOX,
    }));
  };

  const setCakeColor = (id) => {
    setLetter((l) => ({ ...l, box: `cake_${String(id).replace('#', '').toLowerCase()}` }));
  };

  const setCustomCatColor = (hex) => {
    const clean = hex.replace('#', '').toLowerCase();
    setLetter((l) => ({ ...l, box: `cat_${clean}` }));
  };

  const setCustomBirdColor = (hex) => {
    const clean = hex.replace('#', '').toLowerCase();
    setLetter((l) => ({ ...l, box: `bird_${clean}` }));
  };

  // ---------- solid custom theme ----------
  const isCustomSolidTheme = letter.theme?.startsWith('custom_') || letter.theme?.startsWith('#');
  const currentSolidThemeHex = (() => {
    if (letter.theme?.startsWith('custom_')) {
      return '#' + letter.theme.slice(7);
    }
    if (letter.theme?.startsWith('#')) {
      return letter.theme;
    }
    return '#fdf2f8';
  })();

  const setCustomSolidTheme = (hex) => {
    const clean = hex.replace('#', '').toLowerCase();
    setLetter((l) => ({ ...l, theme: `custom_${clean}` }));
  };

  // ---------- test stage ----------
  const toggleTestStage = () => {
    if (testStage === 'closed') {
      setTestStage('opening');
      setTimeout(() => setTestStage('open'), 850);
    } else if (testStage === 'open') {
      setTestStage('emerge');
      setTimeout(() => setTestStage('closed'), 1400);
    } else {
      setTestStage('closed');
    }
  };

  // ---------- create ----------
  const create = async () => {
    setError('');
    const maint = getMaintenance();
    if (maintenanceCovers(maint, 'letters') && maint.lockButton) {
      return setError(maint.message || 'Scheduled maintenance is active. Letter creation is temporarily paused.');
    }
    if (!pages.some((p) => p.trim())) {
      setError('Write your letter first.');
      setDeliveryOpen(false);
      setStep(2);
      return;
    }
    if (!v13Unlocked && typeof letter.box === 'string' && letter.box.startsWith('bird')) {
      return setError(`Bird Messenger delivery unlocks ${V13_UNLOCK_LABEL}. Choose the mailbox or the cat for now.`);
    }
    if (letter.box === SNOWMAN_BOX && !isSnowmanAvailable())
      return setError('The snowman delivery is only available during its 15-day December window.');

    const effectivePinLength = pinLength === 0 ? 0 : v13Unlocked ? pinLength : 4;
    if (effectivePinLength > 0 && pin.length !== effectivePinLength)
      return setError(`Enter a ${effectivePinLength}-digit passcode.`);
    let unlockAt = null;
    if (schedule) {
      unlockAt = when;
      if (!Number.isFinite(unlockAt) || unlockAt < Date.now() + 60_000)
        return setError('Choose a delivery time at least a minute from now.');
    }
    setBusy(true);
    // The note is offered with or without a passcode.
    const note = pinNote.trim().slice(0, 140);
    try {
      const token = await sealLetter({ ...letter, pages, unlockAt }, pin);
      const saved = await saveLetter(token, unlockAt, letter.box, effectivePinLength, note);
      recordLetterCreated();
      trackEvent('letter_created', {
        delivery: letter.box.startsWith('cake') ? 'cake' : letter.box.split('_')[0],
        passcode: effectivePinLength === 0 ? 'none' : String(effectivePinLength),
      });
      setNoPasscode(effectivePinLength === 0);
      if (saved) {
        setLink(`${window.location.origin}/${saved.id}`);
        setLinkKind(unlockAt ? 'scheduled' : 'short');
        setStorageMissing(false);
      } else {
        setStorageMissing(true);
        const base = import.meta.env.VITE_SHARE_BASE || `${window.location.origin}${window.location.pathname}`;
        const prefix = [letter.box, `p${effectivePinLength}`, unlockAt ? `u${unlockAt}` : null]
          .filter(Boolean)
          .join('-');
        setLink(`${base}#l-${prefix}-${token}${note ? `-hn${encodeNote(note)}` : ''}`);
        setLinkKind(unlockAt ? 'scheduled-long' : 'long');
      }
      setDeliveryOpen(false);
    } catch {
      setError('Something went wrong creating the letter. Try again.');
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* blocked: manual copy works */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadDraft = async () => {
    setPdfBusy(true);
    try {
      await savePdf(await exportLetterPdf({ ...letter, pages }), pdfName(letter));
    } catch {
      /* ignore */
    }
    setPdfBusy(false);
  };

  const again = () => {
    setLetter(empty);
    setCur(0);
    setPin('');
    setPinNote('');
    setPinLength(isV13Unlocked() ? 6 : 4);
    setLink('');
    setStorageMissing(false);
    setNoPasscode(false);
    setSelectedId(null);
    setSchedule(false);
    setWhen(defaultWhen());
    setStep(1);
    setPreviewTab('letter');
    setDeliveryOpen(false);
    setStudio(false);
  };

  // Opening a long link inside the editor avoids navigating the page
  if (viewNow) return <Open token={viewNow} onExit={() => setViewNow('')} />;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10 lg:grid-cols-[1fr_1.1fr] lg:py-14">
      <section>
        {link ? (
          <div className="mt-6">
            <h1 className="font-display text-3xl font-light sm:text-4xl">Your letter is ready.</h1>
            <p className="mt-3 text-plum/75">
              {linkKind.startsWith('scheduled')
                ? `It will open on ${new Date(when).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}. Until then the reader sees only a countdown.`
                : noPasscode
                ? 'Share this link. It opens straight away — no passcode needed.'
                : 'Share this link. The reader will need your passcode to open it.'}
            </p>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="field mt-6"
              aria-label="Letter link"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={copy}
                className="rounded-full bg-seal px-6 py-3 font-medium text-petal hover:brightness-110"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              {linkKind.includes('long') ? (
                <button
                  type="button"
                  onClick={() => setViewNow(link.split('#l-')[1])}
                  className="rounded-full border border-plum/30 px-6 py-3 hover:bg-white/50"
                >
                  Open letter
                </button>
              ) : (
                <a href={link} className="rounded-full border border-plum/30 px-6 py-3 hover:bg-white/50">
                  Open letter
                </a>
              )}
              <button onClick={again} className="rounded-full px-4 py-3 text-plum/70 hover:text-plum">
                Write another
              </button>
            </div>
            {storageMissing && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs leading-relaxed text-amber-900">
                <strong>Short links aren’t available yet.</strong> Letter storage isn’t connected to this deployment, so
                the letter above is carried inside the link itself. Once Upstash Redis is connected to the Vercel project
                (<code className="font-mono">KV_REST_API_URL</code> / <code className="font-mono">KV_REST_API_TOKEN</code>),
                every new letter gets a short 16-character link.
              </p>
            )}
            {linkKind.includes('long') && link.length > 8000 && (
              <p className="mt-5 text-sm text-amber-800">
                This link is long ({Math.round(link.length / 1024)} KB) because of the picture or music. Messaging apps
                may cut it off, so email or pasting it into a browser works best.
              </p>
            )}
            {linkKind === 'scheduled-long' && (
              <p className="mt-4 rounded-lg border border-plum/20 bg-white/40 p-3 text-xs text-plum/70">
                Note: Since cloud storage is not connected, this letter is stored inside the link. The delivery countdown
                relies on the recipient’s clock. For cryptographic server-enforced withholding until the scheduled time,
                connect cloud storage.
              </p>
            )}
            <p className="mt-6 text-sm text-plum/60">
              {noPasscode
                ? 'This letter has no passcode — anyone with this link can open it.'
                : 'Send the passcode separately from the link. If it’s forgotten, the letter can’t be recovered.'}
            </p>
          </div>
        ) : (
          <div className="mt-2 space-y-7">
            {/* Step Wizard Header */}
            <div className="rounded-2xl border border-plum/20 bg-white/40 p-2 sm:p-2.5 shadow-xs">
              <nav aria-label="Creation steps" className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {STEPS.map((s) => {
                  const active = step === s.id;
                  const done = step > s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setStep(s.id);
                        if (s.id === 4) setPreviewTab('delivery');
                        else setPreviewTab('letter');
                      }}
                      aria-current={active ? 'step' : undefined}
                      className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 sm:px-3 sm:py-2.5 text-center transition-all ${
                        active
                          ? 'bg-seal text-petal shadow-sm font-medium scale-[1.02]'
                          : done
                          ? 'bg-white/60 text-plum hover:bg-white/80'
                          : 'bg-white/25 text-plum/60 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-base sm:text-lg" aria-hidden="true">
                        {s.icon}
                      </span>
                      <span className="mt-0.5 text-[10px] font-semibold leading-tight sm:text-xs">
                        <span className="hidden md:inline">{s.title}</span>
                        <span className="md:hidden">{s.short}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {lockedNotice && (
              <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-900 shadow-xs">
                <span className="flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>{lockedNotice}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLockedNotice('')}
                  className="ml-2 font-bold hover:text-black"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            )}

            {/* STEP 1: Letter Design */}
            {step === 1 && (
              <div className="step-in space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl lg:text-4xl">Step 1 · Letter Design</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Set the mood and atmosphere with paper templates, background colors, and handwriting.
                  </p>
                </div>

                <fieldset>
                  <div className="flex items-center justify-between mb-2">
                    <legend className="text-sm font-medium text-plum">Template Style</legend>
                    <span className="text-xs text-plum/60">
                      {availableTemplates} stationery styles · 3 shown
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {head(templates, letter.template).map((t) => {
                      const isSelected = letter.template === t.id;
                      const isLocked = V13_TEMPLATE_IDS.has(t.id) && !v13Unlocked;
                      if (isLocked) {
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setLockedNotice(
                                `${t.name} is one of the animated stationery papers arriving in v1.3. It unlocks ${V13_UNLOCK_LABEL}. 🔒✨`
                              )
                            }
                            aria-label={`${t.name} (Locked)`}
                            className="group relative flex items-center gap-1.5 rounded-lg border border-dashed border-plum/30 bg-white/20 px-3.5 py-2 text-xs text-plum/60 hover:bg-white/40 transition-all"
                          >
                            <span className="text-xs">🔒</span>
                            <span>{t.name}</span>
                            <span className="rounded bg-plum/10 px-1 py-0.5 text-[10px] font-semibold uppercase text-plum/60">
                              Locked
                            </span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setLetter({ ...letter, template: t.id });
                            setLockedNotice('');
                          }}
                          aria-pressed={isSelected}
                          className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                            isSelected
                              ? 'border-seal bg-white/80 font-medium shadow-xs text-plum'
                              : 'border-plum/20 hover:bg-white/40 text-plum/80'
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setGallery('template')}
                      aria-label={`Show all ${templates.length} stationery templates`}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-plum/35 bg-white/40 px-3.5 py-2 text-sm text-plum/75 transition-all hover:bg-white/70"
                    >
                      <span className="tracking-[0.2em]" aria-hidden="true">
                        ···
                      </span>
                      <span className="text-xs font-medium">All {templates.length}</span>
                    </button>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <div>
                    <legend className="mb-2 text-sm font-medium text-plum">
                      Gradient Palettes ({themes.length})
                    </legend>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                      {head(themes, letter.theme).map((t) => {
                        const isLocked = V13_THEME_IDS.has(t.id) && !v13Unlocked;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              isLocked
                                ? setLockedNotice(
                                    `“${t.name}” is one of the 8 new v1.3 palettes. It unlocks ${V13_UNLOCK_LABEL}.`
                                  )
                                : setLetter({ ...letter, theme: t.id })
                            }
                            aria-label={isLocked ? `${t.name} (locked)` : t.name}
                            aria-pressed={letter.theme === t.id}
                            title={isLocked ? `${t.name} · unlocks ${V13_UNLOCK_LABEL}` : t.name}
                            className={`relative h-11 w-11 rounded-full ring-offset-2 ring-offset-[#e0f2fe] transition-transform hover:scale-110 ${
                              letter.theme === t.id ? 'ring-2 ring-seal scale-110 shadow-sm' : 'ring-1 ring-plum/25'
                            } ${isLocked ? 'opacity-40 saturate-50' : ''}`}
                            style={{ background: t.bg }}
                          >
                            {isLocked && (
                              <span className="absolute inset-0 grid place-items-center text-xs" aria-hidden="true">
                                🔒
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setGallery('theme')}
                        aria-label={`Show all ${themes.length} gradient palettes`}
                        className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-plum/35 bg-white/50 text-plum/70 transition-transform hover:scale-110 hover:bg-white"
                      >
                        <span className="text-lg leading-none tracking-tight" aria-hidden="true">
                          ···
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-plum/20 bg-white/40 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-plum">Solid Color Paper</p>
                      {isCustomSolidTheme && (
                        <span className="text-xs font-medium text-seal">Custom solid active</span>
                      )}
                    </div>

                    {/* Preset Solid Pastel Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                      {SOLID_PRESETS.map((p) => {
                        const hexClean = p.hex.replace('#', '').toLowerCase();
                        const isSelected = letter.theme === `custom_${hexClean}` || letter.theme === p.hex;
                        return (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setCustomSolidTheme(p.hex)}
                            aria-label={p.name}
                            aria-pressed={isSelected}
                            title={p.name}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all ${
                              isSelected
                                ? 'border-seal bg-white font-medium shadow-xs text-plum'
                                : 'border-plum/20 bg-white/50 text-plum/70 hover:bg-white/80'
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-plum/20"
                              style={{ backgroundColor: p.hex }}
                              aria-hidden="true"
                            />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Solid Color Picker */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-plum/15">
                      <label className="flex items-center gap-2 text-xs font-medium text-plum cursor-pointer">
                        <span>Pick any solid color:</span>
                        <input
                          type="color"
                          value={currentSolidThemeHex}
                          onChange={(e) => setCustomSolidTheme(e.target.value)}
                          className="h-8 w-11 cursor-pointer rounded border border-plum/30 bg-transparent p-0.5"
                          title="Choose custom background color"
                        />
                      </label>
                      <span className="text-xs text-plum/60 uppercase font-mono">{currentSolidThemeHex}</span>
                      <span className="text-[11px] text-plum/50">
                        (Auto-balances ink contrast for optimal reading)
                      </span>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <div className="flex items-center justify-between mb-2">
                    <legend className="text-sm font-medium text-plum">Handwriting Font</legend>
                    <span className="text-xs text-plum/60">{availableFonts} cursive & aesthetic scripts</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {head(fonts, letter.font).map((f) => {
                      const isLocked = V13_FONT_IDS.has(f.id) && !v13Unlocked;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() =>
                            isLocked
                              ? setLockedNotice(`“${f.name}” arrives with v1.3. It unlocks ${V13_UNLOCK_LABEL}.`)
                              : setLetter({ ...letter, font: f.id })
                          }
                          aria-pressed={letter.font === f.id}
                          aria-label={isLocked ? `${f.name} (locked)` : f.name}
                          className={`relative rounded-lg border px-3 py-2 text-lg sm:text-xl transition-all truncate text-left ${
                            letter.font === f.id
                              ? 'border-seal bg-white/80 shadow-xs text-plum font-semibold'
                              : 'border-plum/20 hover:bg-white/40 text-plum/80'
                          } ${isLocked ? 'opacity-50' : ''}`}
                          style={{ fontFamily: f.family }}
                          title={isLocked ? `${f.name} · unlocks ${V13_UNLOCK_LABEL}` : f.name}
                        >
                          {f.name}
                          {isLocked && <span className="ml-1 text-xs" aria-hidden="true">🔒</span>}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setGallery('font')}
                      aria-label={`Show all ${fonts.length} handwriting fonts`}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-plum/35 bg-white/40 px-3 py-2 text-plum/75 transition-all hover:bg-white/70"
                    >
                      <span className="text-lg leading-none tracking-tight" aria-hidden="true">
                        ···
                      </span>
                      <span className="text-xs font-medium">All {fonts.length}</span>
                    </button>
                  </div>
                </fieldset>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 sm:w-auto"
                  >
                    Continue to Message & Media →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Message & Music */}
            {step === 2 && (
              <div className="step-in space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl">Step 2 · Message &amp; Media</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Your words, a few pages if you need them, and a song if you like.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-plum">
                    To
                    <input
                      className="field mt-1.5"
                      value={letter.to}
                      onChange={(e) => setLetter({ ...letter, to: e.target.value })}
                      placeholder="Their name"
                      maxLength={40}
                    />
                  </label>
                  <div className="block text-sm font-medium text-plum">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="from-name">From</label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-plum/65">
                        <input
                          type="checkbox"
                          checked={Boolean(letter.anonymousFrom)}
                          onChange={(e) => setLetter({ ...letter, anonymousFrom: e.target.checked })}
                          className="h-3.5 w-3.5 accent-seal"
                        />
                        Anonymous
                      </label>
                    </div>
                    <input
                      id="from-name"
                      className="field mt-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      value={letter.anonymousFrom ? '' : letter.from}
                      onChange={(e) => setLetter({ ...letter, from: e.target.value })}
                      placeholder={letter.anonymousFrom ? 'Anonymous' : 'Your name'}
                      maxLength={40}
                      disabled={Boolean(letter.anonymousFrom)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-plum" htmlFor="msg">
                    Letter Message
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <button type="button" className={chip} disabled={cur === 0} onClick={() => setCur(cur - 1)}>
                      ← Prev
                    </button>
                    <span className="px-1 text-plum/70 font-medium">
                      Page {cur + 1} of {pages.length}
                    </span>
                    <button
                      type="button"
                      className={chip}
                      disabled={cur >= pages.length - 1}
                      onClick={() => setCur(cur + 1)}
                    >
                      Next →
                    </button>
                    <button
                      type="button"
                      className={chip}
                      disabled={pages.length >= MAX_PAGES}
                      onClick={addPage}
                    >
                      + Add page
                    </button>
                    {pages.length > 1 && (
                      <button type="button" className={chip} onClick={removePage}>
                        Remove page
                      </button>
                    )}
                  </div>
                  <textarea
                    id="msg"
                    className="field mt-3 min-h-32 max-h-72"
                    value={pages[cur] ?? ''}
                    maxLength={MAX_BODY}
                    onChange={(e) => setPageText(e.target.value)}
                    placeholder="Start with what you’ve never said out loud…"
                  />
                  <span className="mt-1 block text-right text-xs text-plum/50">
                    {(pages[cur] ?? '').length}/{MAX_BODY}
                  </span>
                </div>

                <p className="rounded-lg border border-plum/20 bg-white/40 px-3 py-2 text-[11px] leading-relaxed text-plum/65">
                  🖼️ Photos and signatures go onto the letter in{' '}
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="font-semibold text-seal underline underline-offset-2"
                  >
                    Step 3
                  </button>
                  , where you can drag them anywhere.
                </p>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Music</legend>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className={`${chip} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-seal`}
                    >
                      {letter.music ? 'Change music' : 'Add music clip'}
                      <input type="file" accept="audio/*" onChange={pickMusic} className="sr-only" />
                    </label>
                    {letter.music && (
                      <button
                        type="button"
                        onClick={() => setLetter({ ...letter, music: null })}
                        className="text-sm text-plum/70 hover:text-plum"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {letter.music && (
                    <div className="mt-3 rounded-xl border border-plum/20 bg-white/40 p-3">
                      <p className="truncate text-sm font-medium text-plum">{letter.music.name}</p>
                      <audio controls src={letter.music.src} className="mt-2 w-full" />
                    </div>
                  )}
                  <p className="mt-2 text-xs text-plum/55">
                    Short MP3 clips work best (under 500 KB). Plays softly when opened.
                  </p>
                  {mediaError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {mediaError}
                    </p>
                  )}
                </fieldset>

                <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50 sm:w-auto"
                  >
                    ← Back to Design
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 sm:w-auto"
                  >
                    Continue to Stickers →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Emojis, Stickers, Photos & Signatures */}
            {step === 3 && (
              <div className="step-in space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl">Step 3 · Emojis &amp; Stamps</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    A few favourites are one tap away. Open the full studio to see everything and fine-tune what you
                    placed on a live preview.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-plum/20 bg-white/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-plum">✨ Stickers</p>
                    <span className="text-[11px] text-plum/60">
                      page {cur + 1} · {letter.stickers.length}/{MAX_STICKERS}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {stickerEmojis.slice(0, 6).map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => addSticker(e)}
                        disabled={letter.stickers.length >= MAX_STICKERS}
                        aria-label={`Add ${e} sticker`}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-white/50 text-xl transition-all hover:scale-110 hover:bg-white disabled:opacity-40"
                      >
                        {e}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setStickerTab('emojis');
                        setStudio(true);
                      }}
                      aria-label={`Show all ${stickerEmojis.length} stickers`}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-plum/35 bg-white/40 px-3 py-2 text-xs font-medium text-plum/75 transition-all hover:bg-white/70"
                    >
                      <span className="tracking-[0.2em]" aria-hidden="true">
                        ···
                      </span>
                      All {stickerEmojis.length}
                    </button>
                  </div>

                  <div className="border-t border-plum/10 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-plum">📮 Vintage stamps</p>
                      {!v13Unlocked && (
                        <span className="text-[10px] text-plum/60">🔒 v1.3</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {postalStamps.slice(0, 3).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            v13Unlocked
                              ? addStamp(s)
                              : setLockedNotice(
                                  `The 10 vintage postage stamps arrive with v1.3. They unlock ${V13_UNLOCK_LABEL}.`
                                )
                          }
                          disabled={v13Unlocked && letter.stickers.length >= MAX_STICKERS}
                          title={s.name}
                          aria-label={`Add ${s.name} stamp`}
                          className={`grid h-10 w-10 place-items-center rounded-xl border-2 border-dashed text-lg transition-all hover:scale-110 disabled:opacity-40 ${
                            v13Unlocked ? '' : 'opacity-50 saturate-50'
                          }`}
                          style={{ borderColor: s.border, backgroundColor: `${s.color}15` }}
                        >
                          {s.symbol}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          v13Unlocked
                            ? (setStickerTab('stamps'), setStudio(true))
                            : setLockedNotice(
                                `The 10 vintage postage stamps arrive with v1.3. They unlock ${V13_UNLOCK_LABEL}.`
                              )
                        }
                        aria-label={`Show all ${postalStamps.length} vintage stamps`}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-plum/35 bg-white/40 px-3 py-2 text-xs font-medium text-plum/75 transition-all hover:bg-white/70"
                      >
                        <span className="tracking-[0.2em]" aria-hidden="true">
                          ···
                        </span>
                        All {postalStamps.length}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-plum/10 pt-3">
                    <label className={`${chip} cursor-pointer text-xs`}>
                      🖼️ Add photos
                      <input type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
                    </label>
                    <label className={`${chip} cursor-pointer text-xs`}>
                      ✍️ Signature
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={addSignature}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setStudio(true)}
                      className="ml-auto rounded-full border border-plum/30 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-plum hover:bg-white"
                    >
                      ✎ Edit placed items ({letter.stickers.length})
                    </button>
                  </div>
                  {mediaError && <p className="text-[11px] text-red-700">{mediaError}</p>}
                </div>

                <div className="rounded-xl border border-plum/20 bg-white/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-plum/65">
                  Tip: the live preview is draggable as well. The “···” studio holds every sticker and stamp, plus
                  size, rotate, duplicate and remove controls for anything you added.
                </div>

                <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50 sm:w-auto"
                  >
                    ← Back to Message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(4);
                      setPreviewTab('delivery');
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 sm:w-auto"
                  >
                    Continue to Delivery →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Delivery Time and Passcode */}
            {step === 4 && (
              <div className="step-in space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl">Step 4 · Delivery</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Pick how it arrives. Delivery time, passcode and note come next.
                  </p>
                </div>

                {/* Delivery Presentation Style Toggle */}
                <fieldset className="rounded-2xl border border-plum/20 bg-white/40 p-3.5">
                  <legend className="px-1 text-sm font-semibold text-plum">Delivery Presentation</legend>
                  <p className="mb-3 text-xs text-plum/65">
                    Select how the letter appears to your recipient when they first open your link.
                  </p>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="relative flex">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('mailbox')}
                      aria-pressed={!isCat && !isBird && !isCake && !isSnowman}
                      className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border p-3 pr-6 text-sm font-medium transition-all ${
                        !isCat && !isBird && !isCake && !isSnowman
                          ? 'border-seal bg-white/80 shadow-xs text-plum'
                          : 'border-plum/20 bg-white/20 text-plum/70 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        📮
                      </span>
                      <span>Classic Mailbox</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('mailbox');
                        setColorModal('mailbox');
                      }}
                      aria-label="Mailbox colour"
                      title="Mailbox colour"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border border-plum/15 bg-white/85 text-[10px] leading-none text-plum/65 shadow-xs hover:bg-white hover:text-plum"
                    >
                      ···
                    </button>
                  </div>

                    <div className="relative flex">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('cat')}
                      aria-pressed={isCat}
                      className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border p-3 pr-6 text-sm font-medium transition-all ${
                        isCat
                          ? 'border-seal bg-white/80 shadow-xs text-plum'
                          : 'border-plum/20 bg-white/20 text-plum/70 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        🐱
                      </span>
                      <span>Cat Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryType('cat');
                        setColorModal('cat');
                      }}
                      aria-label="Cat coat"
                      title="Cat coat"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border border-plum/15 bg-white/85 text-[10px] leading-none text-plum/65 shadow-xs hover:bg-white hover:text-plum"
                    >
                      ···
                    </button>
                  </div>

                    <div className="relative flex">
                    <button
                      type="button"
                      onClick={() =>
                        v13Unlocked
                          ? setDeliveryType('bird')
                          : setLockedNotice(`Bird Messenger delivery arrives with v1.3. It unlocks ${V13_UNLOCK_LABEL}.`)
                      }
                      aria-pressed={isBird}
                      className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border p-3 pr-6 text-sm font-medium transition-all ${
                        isBird
                          ? 'border-seal bg-white/80 shadow-xs text-plum'
                          : 'border-plum/20 bg-white/20 text-plum/70 hover:bg-white/50'
                      } ${!v13Unlocked ? 'opacity-55' : ''}`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        🕊️
                      </span>
                      <span>Bird Messenger{!v13Unlocked && ' 🔒'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!v13Unlocked) {
                          setLockedNotice(`Bird Messenger delivery arrives with v1.3. It unlocks ${V13_UNLOCK_LABEL}.`);
                          return;
                        }
                        setDeliveryType('bird');
                        setColorModal('bird');
                      }}
                      aria-label="Bird plumage"
                      title="Bird plumage"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full border border-plum/15 bg-white/85 text-[10px] leading-none text-plum/65 shadow-xs hover:bg-white hover:text-plum"
                    >
                      ···
                    </button>
                  </div>

                    <div className="relative flex">
                    <button
                      type="button"
                      onClick={() => {
                        if (snowman.available) {
                          setDeliveryType('snowman');
                          return;
                        }
                        setLockedNotice(
                          snowman.before
                            ? `The Snowman delivery is a limited seasonal presentation. It arrives ${SNOWMAN_START_LABEL} and is only available for ${SNOWMAN_DAYS} days, until ${SNOWMAN_END_LABEL}.`
                            : `The Snowman delivery has melted away for this season. It comes back next winter.`
                        );
                      }}
                      aria-pressed={isSnowman}
                      className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                        isSnowman
                          ? 'border-seal bg-white/80 shadow-xs text-plum'
                          : 'border-plum/20 bg-white/20 text-plum/70 hover:bg-white/50'
                      } ${!snowman.available ? 'opacity-55' : ''}`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        ⛄
                      </span>
                      <span>Snowman{!snowman.available && ' 🔒'}</span>
                    </button>
                  </div>
                  </div>

                  {/* Snowman limited-time window */}
                  <p className="mt-2 text-[11px] leading-relaxed text-plum/60">
                    ⛄ Snowman delivery is a limited seasonal presentation — available {SNOWMAN_START_LABEL} to{' '}
                    {SNOWMAN_END_LABEL} only ({SNOWMAN_DAYS} days)
                    {snowman.before && snowman.remaining > 0
                      ? ` · opens in ${formatRemaining(snowman.remaining)}`
                      : ''}
                    .
                  </p>

                  {/* Birthday presentation: a cake that is sliced open */}
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-plum/20 bg-white/50 p-3">
                    <input
                      id="birthday-letter"
                      type="checkbox"
                      checked={isCake}
                      onChange={(e) => setBirthday(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#a3202f]"
                    />
                    <label htmlFor="birthday-letter" className="cursor-pointer text-xs text-plum/75">
                      <span className="block text-sm font-semibold text-plum">🎂 Birthday letter</span>
                      Delivered as a birthday cake with candles — the cake is sliced open and your letter rises out.
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isCake) setBirthday(true);
                        setColorModal('cake');
                      }}
                      aria-label="Cake colour"
                      title="Cake colour"
                      className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-plum/15 bg-white/85 px-1.5 py-1 text-[10px] leading-none text-plum/65 shadow-xs hover:bg-white hover:text-plum"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-plum/20"
                        style={{ background: cakePalette.base }}
                        aria-hidden="true"
                      />
                      ···
                    </button>
                  </div>

                </fieldset>

                <div className="rounded-xl border border-plum/20 bg-white/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-plum/65">
                  Next: choose a delivery time, a secret passcode and an optional note — or send it right away.
                </div>

                <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50 sm:w-auto"
                  >
                    ← Back to Stickers
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 sm:w-auto"
                  >
                    Continue → Time, passcode &amp; note
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Right Column: Live Interactive Preview */}
      <section className="lg:sticky lg:top-28 lg:self-start">
        {/* Preview header & tab switcher */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-lg border border-plum/20 bg-white/40 p-1 text-xs font-medium text-plum">
            <button
              type="button"
              onClick={() => setPreviewTab('letter')}
              className={`rounded-md px-3 py-1 transition-colors ${
                previewTab === 'letter' ? 'bg-seal text-petal shadow-xs font-semibold' : 'hover:bg-white/60 text-plum/70'
              }`}
            >
              📄 Letter (p. {cur + 1}/{pages.length})
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('delivery')}
              className={`rounded-md px-3 py-1 transition-colors ${
                previewTab === 'delivery' ? 'bg-seal text-petal shadow-xs font-semibold' : 'hover:bg-white/60 text-plum/70'
              }`}
            >
              {isBird
                ? '🕊️ Bird Messenger'
                : isCat
                ? '🐱 Cat Delivery'
                : isCake
                ? '🎂 Birthday Cake'
                : isSnowman
                ? '⛄ Snowman Delivery'
                : '📮 Mailbox'}
            </button>
          </div>

          {previewTab === 'letter' ? (
            <button
              type="button"
              onClick={downloadDraft}
              disabled={pdfBusy}
              className="text-xs text-plum/70 underline underline-offset-4 hover:text-plum disabled:opacity-50"
            >
              {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTestStage('closed')}
              className="text-xs text-plum/70 underline underline-offset-4 hover:text-plum"
            >
              Reset animation
            </button>
          )}
        </div>

        {/* Tab 1: Letter preview */}
        {previewTab === 'letter' && (
          <>
            <Letter
              key={cur}
              letter={letter}
              page={cur}
              className="min-h-80 turn-next"
              editable
              selectedId={selectedId}
              onSelect={setSelectedId}
              onStickerChange={patchSticker}
              onStickerRemove={removeSticker}
            />
            {pages.length > 1 && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-plum/20 bg-white/40 px-2 py-1.5 text-xs text-plum">
                <button
                  type="button"
                  onClick={() => setCur(Math.max(0, cur - 1))}
                  disabled={cur === 0}
                  className="rounded-md px-2 py-1 font-medium text-plum/75 hover:bg-white/70 hover:text-plum disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="font-medium text-plum/70">
                  Page {cur + 1} of {pages.length}
                </span>
                <button
                  type="button"
                  onClick={() => setCur(Math.min(pages.length - 1, cur + 1))}
                  disabled={cur >= pages.length - 1}
                  className="rounded-md px-2 py-1 font-medium text-plum/75 hover:bg-white/70 hover:text-plum disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Tab 2: Delivery presentation preview */}
        {previewTab === 'delivery' && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-plum/20 bg-white/50 p-8 shadow-xs text-center min-h-[22rem]">
            <Letterbox color={letter.box} stage={testStage} onOpen={toggleTestStage} />
            <div className="mt-6">
              <p className="text-xs text-plum/70">
                {testStage === 'closed'
                  ? isBird
                    ? 'Tap the messenger bird to test delivery & flight!'
                    : isCat
                    ? 'Tap the kitty to test the opening animation!'
                    : isCake
                    ? 'Tap the cake to slice it open!'
                    : isSnowman
                    ? 'Tap the snowman to open the letter!'
                    : 'Tap the letterbox to test the opening animation!'
                  : testStage === 'open'
                  ? isBird
                    ? 'Letter revealed! Tap to watch the bird fly away!'
                    : isCake
                    ? 'Slice cut and letter out! Tap to reset.'
                    : isSnowman
                    ? 'Letter revealed! Tap to watch the snowman wave goodbye.'
                    : 'Letter revealed! Tap to close or reset.'
                  : testStage === 'emerge'
                  ? 'Flying away! ✨'
                  : 'Opening…'}
              </p>
              <button
                type="button"
                onClick={toggleTestStage}
                className="mt-3 rounded-full border border-plum/30 bg-white/60 px-4 py-1.5 text-xs text-plum hover:bg-white"
              >
                {testStage === 'closed'
                  ? 'Test open animation'
                  : testStage === 'open' && isBird
                  ? 'Test fly away animation'
                  : 'Close preview'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Floating mini preview: the letter stays in view while the form scrolls, on every screen */}
      {!link && (
        <FloatingPreview letter={letter} page={cur} pageCount={pages.length} onPageChange={setCur} />
      )}

      {colorModal && (
        <DeliveryColorModal
          type={colorModal}
          value={colorModal === 'cake' ? `cake_${cakeColorId}` : letter.box}
          onPick={(id) => {
            if (colorModal === 'cake') setCakeColor(id);
            else setLetter((l) => ({ ...l, box: id }));
          }}
          onCustom={
            colorModal === 'cat'
              ? setCustomCatColor
              : colorModal === 'bird'
              ? setCustomBirdColor
              : colorModal === 'cake'
              ? setCakeColor
              : undefined
          }
          onClose={() => setColorModal(null)}
        />
      )}

      {studio && !link && (
        <StickerStudio
          letter={letter}
          page={cur}
          pageCount={pages.length}
          onPageChange={setCur}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAddEmoji={(emoji) => addSticker(emoji)}
          onAddStamp={(stamp) => addStamp(stamp)}
          onPhotos={addPhotos}
          onSignature={addSignature}
          onPatch={patchSticker}
          onRemove={removeSticker}
          onDuplicate={duplicateSticker}
          onClose={() => setStudio(false)}
          stampsLocked={!v13Unlocked}
          onLocked={(message) => setLockedNotice(message)}
          mediaError={mediaError}
        />
      )}

      {deliveryOpen && !link && (
        <DeliveryModal
          pinLength={pinLength}
          setPinLength={setPinLength}
          pin={pin}
          setPin={setPin}
          pinNote={pinNote}
          setPinNote={setPinNote}
          schedule={schedule}
          setSchedule={setSchedule}
          when={when}
          setWhen={setWhen}
          v13Unlocked={v13Unlocked}
          onLocked={(message) => setLockedNotice(message)}
          onCreate={create}
          onClose={() => setDeliveryOpen(false)}
          error={error}
          busy={busy}
        />
      )}

      {/* Full design gallery: “···” shows every template, gradient and font */}
      {gallery && !link && (
        <DesignGallery
          kind={gallery}
          letter={letter}
          activeId={
            gallery === 'template' ? letter.template : gallery === 'theme' ? letter.theme : letter.font
          }
          lockedIds={
            v13Unlocked
              ? null
              : gallery === 'template'
              ? V13_TEMPLATE_IDS
              : gallery === 'theme'
              ? V13_THEME_IDS
              : V13_FONT_IDS
          }
          onPick={(id) =>
            setLetter((l) => ({
              ...l,
              ...(gallery === 'template' ? { template: id } : gallery === 'theme' ? { theme: id } : { font: id }),
            }))
          }
          onLocked={(option) =>
            setLockedNotice(
              `“${option.name}” is part of a time-locked release. It unlocks ${V13_UNLOCK_LABEL}. 🔒`
            )
          }
          onClose={() => setGallery(null)}
        />
      )}
    </main>
  );
}
