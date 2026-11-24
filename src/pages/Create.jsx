import { useState } from 'react';
import Letter from '../components/Letter.jsx';
import PinInput from '../components/PinInput.jsx';
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
  boxColors,
  DEFAULT_BOX,
  catColors,
  DEFAULT_CAT,
  getCatPalette,
  birdColors,
  DEFAULT_BIRD,
  getBirdPalette,
  BIRTHDAY_BOX,
  resolveTheme,
} from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import DateTimePicker from '../components/DateTimePicker.jsx';
import Open from './Open.jsx';
import { sealLetter } from '../lib/seal.js';
import { compressImage, readAsDataURL, MAX_AUDIO } from '../lib/media.js';
import { saveLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';
import { recordLetterCreated, getMaintenance } from '../lib/admin.js';
import {
  V13_UNLOCK_LABEL,
  V13_THEME_IDS,
  V13_FONT_IDS,
  V13_TEMPLATE_IDS,
  formatRemaining,
  isV13Unlocked,
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
  pages: [''],
  theme: 'blush',
  font: 'vibes',
  image: null,
  music: null,
  template: 'plain',
  stickers: [],
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

export default function Create() {
  const [step, setStep] = useState(1);
  const [letter, setLetter] = useState(empty);
  const [cur, setCur] = useState(0);
  const [pin, setPin] = useState('');
  const { unlocked: v13Unlocked, remaining: v13Remaining } = useV13Unlock();
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

  const selected = letter.stickers.find((s) => s.id === selectedId);
  const pages = getPages(letter);
  const availableTemplates = v13Unlocked
    ? templates.length
    : templates.filter((t) => !V13_TEMPLATE_IDS.has(t.id)).length;
  const availableFonts = v13Unlocked ? fonts.length : fonts.filter((f) => !V13_FONT_IDS.has(f.id)).length;
  const isCat = typeof letter.box === 'string' && letter.box.startsWith('cat');
  const isBird = typeof letter.box === 'string' && letter.box.startsWith('bird');
  const isCake = letter.box === BIRTHDAY_BOX;

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

  // ---------- media ----------
  const pickImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setMediaError('');
    if (!f.type.startsWith('image/')) return setMediaError('Choose an image file (e.g. JPG, PNG, WebP).');
    if (f.size > 20 * 1024 * 1024) return setMediaError('Choose an image file under 20 MB.');
    try {
      const image = await compressImage(f);
      setLetter((l) => ({ ...l, image }));
    } catch {
      setMediaError('That picture couldn’t be read. Try a JPG or PNG.');
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
    } else {
      if (isCat || isBird || isCake) setLetter((l) => ({ ...l, box: DEFAULT_BOX }));
    }
  };

  const setBirthday = (on) => {
    setTestStage('closed');
    setLetter((l) => ({ ...l, box: on ? BIRTHDAY_BOX : DEFAULT_BOX }));
  };

  const currentCatHex = (() => {
    if (!isCat) return '#f59e0b';
    if (/^cat_[0-9a-fA-F]{6}$/.test(letter.box)) {
      return '#' + letter.box.slice(4);
    }
    const pal = getCatPalette(letter.box);
    return pal.customHex || pal.body || '#f59e0b';
  })();

  const setCustomCatColor = (hex) => {
    const clean = hex.replace('#', '').toLowerCase();
    setLetter((l) => ({ ...l, box: `cat_${clean}` }));
  };

  const currentBirdHex = (() => {
    if (!isBird) return '#60a5fa';
    if (/^bird_[0-9a-fA-F]{6}$/.test(letter.box)) {
      return '#' + letter.box.slice(5);
    }
    const pal = getBirdPalette(letter.box);
    return pal.customHex || pal.body || '#60a5fa';
  })();

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
    if (maint.enabled && maint.lockButton) {
      return setError(maint.message || 'Scheduled maintenance is active. Letter creation is temporarily paused.');
    }
    if (!pages.some((p) => p.trim())) {
      setError('Write your letter first.');
      setStep(2);
      return;
    }
    if (!v13Unlocked && typeof letter.box === 'string' && letter.box.startsWith('bird')) {
      return setError(`Bird Messenger delivery unlocks ${V13_UNLOCK_LABEL}. Choose the mailbox or the cat for now.`);
    }
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
    try {
      const token = await sealLetter({ ...letter, pages, unlockAt }, pin);
      const saved = await saveLetter(token, unlockAt, letter.box, effectivePinLength);
      recordLetterCreated();
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
        setLink(`${base}#l-${prefix}-${token}`);
        setLinkKind(unlockAt ? 'scheduled-long' : 'long');
      }
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
    setPinLength(isV13Unlocked() ? 6 : 4);
    setLink('');
    setStorageMissing(false);
    setNoPasscode(false);
    setSelectedId(null);
    setSchedule(false);
    setWhen(defaultWhen());
    setStep(1);
    setPreviewTab('letter');
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

            {/* v1.3 time lock */}
            {!v13Unlocked && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2 text-[11px] leading-snug text-amber-900 shadow-xs">
                <p className="font-semibold">🔒 v1.3 features are time-locked</p>
                <p className="mt-0.5 text-[11px]">
                  Unlocks <strong>{V13_UNLOCK_LABEL}</strong> — in{' '}
                  <span className="font-mono font-semibold">{formatRemaining(v13Remaining)}</span>
                </p>
              </div>
            )}

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
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl lg:text-4xl">Step 1 · Letter Design</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Set the mood and atmosphere with paper templates, background colors, and handwriting.
                  </p>
                </div>

                <fieldset>
                  <div className="flex items-center justify-between mb-2">
                    <legend className="text-sm font-medium text-plum">Template Style</legend>
                    <span className="text-xs text-plum/60">{availableTemplates} stationery styles</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {templates.map((t) => {
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
                  </div>

                </fieldset>

                <fieldset className="space-y-4">
                  <div>
                    <legend className="mb-2 text-sm font-medium text-plum">
                      Gradient Palettes ({themes.length})
                    </legend>
                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                      {themes.map((t) => {
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
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {fonts.map((f) => {
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

            {/* STEP 2: Message & Pictures & Music */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl lg:text-4xl">Step 2 · Message & Media</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Write heartfelt words, add multiple pages, and attach a cherished photo and song.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                  <label className="block text-sm font-medium text-plum">
                    From
                    <input
                      className="field mt-1.5"
                      value={letter.from}
                      onChange={(e) => setLetter({ ...letter, from: e.target.value })}
                      placeholder="Your name"
                      maxLength={40}
                    />
                  </label>
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
                    className="field mt-3 min-h-44"
                    value={pages[cur] ?? ''}
                    maxLength={MAX_BODY}
                    onChange={(e) => setPageText(e.target.value)}
                    placeholder="Start with what you’ve never said out loud…"
                  />
                  <span className="mt-1 block text-right text-xs text-plum/50">
                    {(pages[cur] ?? '').length}/{MAX_BODY}
                  </span>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Picture</legend>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className={`${chip} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-seal`}
                    >
                      {letter.image ? 'Change picture' : 'Add a picture'}
                      <input type="file" accept="image/*" onChange={pickImage} className="sr-only" />
                    </label>
                    {letter.image && (
                      <button
                        type="button"
                        onClick={() => setLetter({ ...letter, image: null })}
                        className="text-sm text-plum/70 hover:text-plum"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-plum/55">Shown on the first page of your letter.</p>
                </fieldset>

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

                <div className="flex flex-col-reverse gap-2.5 pt-4 sm:flex-row sm:items-center sm:justify-between">
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

            {/* STEP 3: Emojis and Stickers & Stamps */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl lg:text-4xl">Step 3 · Emojis, Stickers & Stamps</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Add romantic stickers or authentic vintage postal stamps to your pages. Drag and resize them right on the preview.
                  </p>
                </div>

                <fieldset>
                  {/* Category Switcher Tab */}
                  <div className="mb-4 flex w-full flex-col items-stretch gap-2 rounded-xl border border-plum/20 bg-white/40 p-1 sm:w-fit sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setStickerTab('emojis')}
                      className={`w-full rounded-lg px-4 py-1.5 text-center text-xs font-semibold transition-all sm:w-auto ${
                        stickerTab === 'emojis'
                          ? 'bg-seal text-petal shadow-xs'
                          : 'text-plum/70 hover:bg-white/60'
                      }`}
                    >
                      ✨ Emojis & Stickers ({stickerEmojis.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        v13Unlocked
                          ? setStickerTab('stamps')
                          : setLockedNotice(
                              `The 10 vintage postage stamps arrive with v1.3. They unlock ${V13_UNLOCK_LABEL}.`
                            )
                      }
                      className={`w-full rounded-lg px-4 py-1.5 text-center text-xs font-semibold transition-all sm:w-auto ${
                        stickerTab === 'stamps'
                          ? 'bg-seal text-petal shadow-xs'
                          : 'text-plum/70 hover:bg-white/60'
                      } ${!v13Unlocked ? 'opacity-60' : ''}`}
                    >
                      📮 Vintage Postage Stamps ({postalStamps.length}){!v13Unlocked && ' 🔒'}
                    </button>
                  </div>

                  {/* Tab 1: Emojis Grid */}
                  {stickerTab === 'emojis' && (
                    <div>
                      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                        {stickerEmojis.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => addSticker(e)}
                            disabled={letter.stickers.length >= MAX_STICKERS}
                            aria-label={`Add ${e} sticker`}
                            className="grid h-12 place-items-center rounded-xl bg-white/30 text-2xl hover:bg-white/70 hover:scale-110 transition-all disabled:opacity-40"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-plum/60">
                        Tap any sticker to place it on page {cur + 1}, then drag it freely on the preview.{' '}
                        <span className="font-medium text-plum">
                          {letter.stickers.length}/{MAX_STICKERS}
                        </span>{' '}
                        items used.
                      </p>
                    </div>
                  )}

                  {/* Tab 2: Authentic Postage Stamps Grid */}
                  {stickerTab === 'stamps' && !v13Unlocked && (
                    <p className="rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
                      🔒 The 10 collectible vintage stamps are time-locked with v1.3 and unlock{' '}
                      <strong>{V13_UNLOCK_LABEL}</strong>.
                    </p>
                  )}
                  {stickerTab === 'stamps' && v13Unlocked && (
                    <div>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
                        {postalStamps.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addStamp(s)}
                            disabled={letter.stickers.length >= MAX_STICKERS}
                            title={`Add ${s.name} stamp to letter`}
                            className="group relative flex flex-col items-center justify-between rounded-lg border-2 border-dashed p-2 text-center transition-all hover:scale-105 hover:shadow-md disabled:opacity-40"
                            style={{
                              borderColor: s.border,
                              backgroundColor: `${s.color}15`,
                            }}
                          >
                            <span
                              className="text-[10px] font-mono tracking-widest font-bold uppercase"
                              style={{ color: s.border }}
                            >
                              {s.code}
                            </span>
                            <span className="my-1 text-2xl group-hover:scale-110 transition-transform">
                              {s.symbol}
                            </span>
                            <span className="text-[11px] font-medium text-plum truncate max-w-full">
                              {s.name}
                            </span>
                            <span className="text-[9px] text-plum/50 italic tracking-tighter">
                              {s.postmark}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-plum/60">
                        Tap any vintage stamp to adhere it to page {cur + 1} (placed in the classic postal position), then drag or rotate.{' '}
                        <span className="font-medium text-plum">
                          {letter.stickers.length}/{MAX_STICKERS}
                        </span>{' '}
                        items used.
                      </p>
                    </div>
                  )}

                  {selected && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-plum/20 bg-white/50 p-3 shadow-xs">
                      <span className="mr-1 text-2xl" aria-hidden="true">
                        {selected.emoji}
                      </span>
                      {selected.kind === 'stamp' && (
                        <span className="mr-2 rounded bg-seal/10 px-1.5 py-0.5 text-xs font-semibold text-seal">
                          Postal Stamp
                        </span>
                      )}
                      <button
                        type="button"
                        className={chip}
                        onClick={() => patchSticker(selected.id, { size: Math.max(20, selected.size - 12) })}
                      >
                        Smaller
                      </button>
                      <button
                        type="button"
                        className={chip}
                        onClick={() => patchSticker(selected.id, { size: Math.min(120, selected.size + 12) })}
                      >
                        Bigger
                      </button>
                      <button
                        type="button"
                        className={chip}
                        onClick={() => patchSticker(selected.id, { rot: ((selected.rot || 0) + 15) % 360 })}
                      >
                        Rotate
                      </button>
                      <button type="button" className={chip} onClick={() => removeSticker(selected.id)}>
                        Remove
                      </button>
                    </div>
                  )}

                  {letter.stickers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setLetter({ ...letter, stickers: [] });
                        setSelectedId(null);
                      }}
                      className="mt-3 text-sm text-plum/70 hover:text-plum underline underline-offset-4"
                    >
                      Remove all stickers & stamps
                    </button>
                  )}
                </fieldset>

                <div className="flex flex-col-reverse gap-2.5 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                    Continue to Delivery & Passcode →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Delivery Time and Passcode */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-2xl font-light sm:text-3xl lg:text-4xl">Step 4 · Delivery & Passcode</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Choose how your letter is presented, schedule its arrival, and protect it with a secret code.
                  </p>
                </div>

                {/* Delivery Presentation Style Toggle */}
                <fieldset className="rounded-2xl border border-plum/20 bg-white/40 p-4">
                  <legend className="px-1 text-sm font-semibold text-plum">Delivery Presentation</legend>
                  <p className="mb-3 text-xs text-plum/65">
                    Select how the letter appears to your recipient when they first open your link.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('mailbox')}
                      aria-pressed={!isCat && !isBird && !isCake}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                        !isCat && !isBird && !isCake
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
                      onClick={() => setDeliveryType('cat')}
                      aria-pressed={isCat}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
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
                      onClick={() =>
                        v13Unlocked
                          ? setDeliveryType('bird')
                          : setLockedNotice(`Bird Messenger delivery arrives with v1.3. It unlocks ${V13_UNLOCK_LABEL}.`)
                      }
                      aria-pressed={isBird}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
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
                  </div>

                  {/* Birthday presentation: a cake that is sliced open */}
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-plum/20 bg-white/50 p-3">
                    <input
                      type="checkbox"
                      checked={isCake}
                      onChange={(e) => setBirthday(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#a3202f]"
                    />
                    <span className="text-xs text-plum/75">
                      <span className="block text-sm font-semibold text-plum">🎂 Birthday letter</span>
                      Delivered as a birthday cake with candles — the cake is sliced open and your letter rises out.
                    </span>
                  </label>

                  {/* Mailbox Color Options */}
                  {!isCat && !isBird && !isCake && (
                    <div className="mt-5 border-t border-plum/15 pt-4">
                      <p className="mb-2.5 text-xs font-medium text-plum">Mailbox Colour</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {boxColors.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setLetter({ ...letter, box: b.id })}
                            aria-label={`${b.name} letterbox`}
                            aria-pressed={letter.box === b.id}
                            title={b.name}
                            className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-[#f9cfe3] transition-transform hover:scale-110 ${
                              letter.box === b.id ? 'ring-2 ring-seal scale-105' : 'ring-1 ring-plum/25'
                            }`}
                            style={{ background: b.body }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cat Coat & Custom Color Options */}
                  {isCat && (
                    <div className="mt-5 border-t border-plum/15 pt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-medium text-plum">Cat Coat Options</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {catColors.map((c) => {
                            const isSelected = letter.box === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setLetter({ ...letter, box: c.id })}
                                aria-pressed={isSelected}
                                className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                                  isSelected
                                    ? 'border-seal bg-white/90 font-medium shadow-xs'
                                    : 'border-plum/20 bg-white/40 hover:bg-white/60'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full border border-plum/30"
                                  style={{ background: c.body }}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{c.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Coat Color Picker */}
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-plum/20 bg-white/50 p-3">
                        <label className="flex items-center gap-2 text-xs font-medium text-plum cursor-pointer">
                          <span>Custom cat color:</span>
                          <input
                            type="color"
                            value={currentCatHex}
                            onChange={(e) => setCustomCatColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-plum/30 bg-transparent p-0.5"
                            title="Choose custom cat fur color"
                          />
                        </label>
                        <span className="text-xs text-plum/60 uppercase font-mono">{currentCatHex}</span>
                        {letter.box.startsWith('cat_') && /^cat_[0-9a-fA-F]{6}$/.test(letter.box) && (
                          <span className="text-xs text-seal font-medium">(Custom fur color applied)</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bird Plumage & Custom Color Options */}
                  {isBird && (
                    <div className="mt-5 border-t border-plum/15 pt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-xs font-medium text-plum">Avian Species & Plumage</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {birdColors.map((b) => {
                            const isSelected = letter.box === b.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => setLetter({ ...letter, box: b.id })}
                                aria-pressed={isSelected}
                                className={`flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all ${
                                  isSelected
                                    ? 'border-seal bg-white/90 font-medium shadow-xs'
                                    : 'border-plum/20 bg-white/40 hover:bg-white/60'
                                }`}
                              >
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full border border-plum/30"
                                  style={{ background: b.body }}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{b.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Bird Plumage Color Picker */}
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-plum/20 bg-white/50 p-3">
                        <label className="flex items-center gap-2 text-xs font-medium text-plum cursor-pointer">
                          <span>Custom bird plumage color:</span>
                          <input
                            type="color"
                            value={currentBirdHex}
                            onChange={(e) => setCustomBirdColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-plum/30 bg-transparent p-0.5"
                            title="Choose custom bird plumage color"
                          />
                        </label>
                        <span className="text-xs text-plum/60 uppercase font-mono">{currentBirdHex}</span>
                        {letter.box.startsWith('bird_') && /^bird_[0-9a-fA-F]{6}$/.test(letter.box) && (
                          <span className="text-xs text-seal font-medium">(Custom plumage color applied)</span>
                        )}
                      </div>
                    </div>
                  )}
                </fieldset>

                {/* Delivery Schedule */}
                <fieldset className="rounded-2xl border border-plum/20 bg-white/40 p-4">
                  <legend className="px-1 text-sm font-semibold text-plum">Delivery Schedule</legend>
                  <label className="mt-1 flex items-center gap-2 text-sm text-plum cursor-pointer">
                    <input
                      type="checkbox"
                      checked={schedule}
                      onChange={(e) => setSchedule(e.target.checked)}
                      className="h-4 w-4 accent-[#a3202f]"
                    />
                    <span>Keep it sealed until a future date and time</span>
                  </label>
                  {schedule && (
                    <div className="mt-4 rounded-xl border border-plum/20 bg-white/60 p-4">
                      <DateTimePicker value={when} onChange={setWhen} minValue={Date.now() + 60_000} />
                    </div>
                  )}
                  <p className="mt-2.5 text-xs text-plum/60">
                    The recipient will see a live ticking countdown until the moment it arrives.
                  </p>
                </fieldset>

                {/* Passcode PIN */}
                <div className="rounded-2xl border border-plum/20 bg-white/40 p-4">
                  <p className="mb-2 text-sm font-semibold text-plum">Secret Passcode</p>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-plum/70">Passcode length</span>
                    <div className="flex items-center gap-1 rounded-lg border border-plum/20 bg-white/50 p-1">
                      {[0, 4, 6].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            if (n === 6 && !v13Unlocked) {
                              setLockedNotice(
                                `6-digit passcodes arrive with v1.3 and unlock ${V13_UNLOCK_LABEL}. Until then letters use a 4-digit passcode.`
                              );
                              return;
                            }
                            setPinLength(n);
                            setPin((p) => p.slice(0, n));
                            setError('');
                          }}
                          aria-pressed={pinLength === n}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                            pinLength === n
                              ? 'bg-seal text-petal shadow-xs'
                              : 'text-plum/70 hover:bg-white/70'
                          } ${n === 6 && !v13Unlocked ? 'opacity-55' : ''}`}
                        >
                          {n === 0 ? 'None' : `${n} digits`}
                          {n === 6 && !v13Unlocked && ' 🔒'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {pinLength === 0 ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 text-xs leading-relaxed text-emerald-900">
                      <strong>No passcode.</strong> Anyone who has the link can open this letter directly — the box is
                      tapped and the letter opens straight away.
                    </p>
                  ) : (
                    <>
                      <PinInput
                        length={pinLength}
                        value={pin}
                        onChange={setPin}
                        invalid={!!error && pin.length !== pinLength}
                      />
                      <p className="mt-2.5 text-xs text-plum/60">
                        {pinLength} digits. The recipient types exactly {pinLength} digits to unlock your letter.
                      </p>
                    </>
                  )}
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2.5 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50 sm:w-auto"
                  >
                    ← Back to Stickers
                  </button>
                  <button
                    onClick={create}
                    disabled={busy}
                    className="rounded-full bg-seal px-8 py-3.5 font-display text-lg text-petal hover:brightness-110 disabled:opacity-60 shadow-sm"
                  >
                    {busy ? 'Sealing…' : 'Seal & Create Letter'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Right Column: Live Interactive Preview */}
      <section className="lg:sticky lg:top-10 lg:self-start">
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
                    : 'Tap the letterbox to test the opening animation!'
                  : testStage === 'open'
                  ? isBird
                    ? 'Letter revealed! Tap to watch the bird fly away!'
                    : isCake
                    ? 'Slice cut and letter out! Tap to reset.'
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
    </main>
  );
}
