import { useState } from 'react';
import Letter from '../components/Letter.jsx';
import PinInput from '../components/PinInput.jsx';
import {
  themes,
  fonts,
  templates,
  stickerEmojis,
  MAX_STICKERS,
  MAX_BODY,
  MAX_PAGES,
  getPages,
  boxColors,
  DEFAULT_BOX,
  catColors,
  DEFAULT_CAT,
  getCatPalette,
} from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import DateTimePicker from '../components/DateTimePicker.jsx';
import Open from './Open.jsx';
import { sealLetter } from '../lib/seal.js';
import { compressImage, readAsDataURL, MAX_AUDIO } from '../lib/media.js';
import { saveLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';

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

const STEPS = [
  { id: 1, title: 'Letter Design', short: 'Design', icon: '🎨' },
  { id: 2, title: 'Message & Media', short: 'Words & Media', icon: '✍️' },
  { id: 3, title: 'Emojis & Stickers', short: 'Stickers', icon: '✨' },
  { id: 4, title: 'Delivery & Passcode', short: 'Delivery & Passcode', icon: '💌' },
];

export default function Create() {
  const [step, setStep] = useState(1);
  const [letter, setLetter] = useState(empty);
  const [cur, setCur] = useState(0);
  const [pin, setPin] = useState('');
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState(defaultWhen);
  const [link, setLink] = useState('');
  const [linkKind, setLinkKind] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [viewNow, setViewNow] = useState(''); // "<box>-<token>" opened inside the editor
  const [previewTab, setPreviewTab] = useState('letter'); // 'letter' | 'delivery'
  const [testStage, setTestStage] = useState('closed');

  const selected = letter.stickers.find((s) => s.id === selectedId);
  const pages = getPages(letter);
  const isCat = typeof letter.box === 'string' && letter.box.startsWith('cat');

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

  // ---------- stickers ----------
  const addSticker = (emoji) => {
    if (letter.stickers.length >= MAX_STICKERS) return;
    const id = Math.random().toString(36).slice(2, 8);
    const s = { id, emoji, page: cur, x: 25 + Math.random() * 50, y: 20 + Math.random() * 50, size: 44, rot: 0 };
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
    if (type === 'cat') {
      if (!isCat) setLetter((l) => ({ ...l, box: DEFAULT_CAT }));
    } else {
      if (isCat) setLetter((l) => ({ ...l, box: DEFAULT_BOX }));
    }
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

  // ---------- test stage ----------
  const toggleTestStage = () => {
    if (testStage === 'closed') {
      setTestStage('opening');
      setTimeout(() => setTestStage('open'), 850);
    } else if (testStage === 'open') {
      setTestStage('emerge');
      setTimeout(() => setTestStage('closed'), 1200);
    } else {
      setTestStage('closed');
    }
  };

  // ---------- create ----------
  const create = async () => {
    setError('');
    if (!pages.some((p) => p.trim())) {
      setError('Write your letter first.');
      setStep(2);
      return;
    }
    if (pin.length !== 4) return setError('Enter a 4-digit passcode.');
    let unlockAt = null;
    if (schedule) {
      unlockAt = when;
      if (!Number.isFinite(unlockAt) || unlockAt < Date.now() + 60_000)
        return setError('Choose a delivery time at least a minute from now.');
    }
    setBusy(true);
    try {
      const token = await sealLetter({ ...letter, pages, unlockAt }, pin);
      const saved = await saveLetter(token, unlockAt, letter.box);
      if (saved) {
        setLink(`${window.location.origin}/l/${saved.id}`);
        setLinkKind(unlockAt ? 'scheduled' : 'short');
      } else {
        const base = import.meta.env.VITE_SHARE_BASE || `${window.location.origin}${window.location.pathname}`;
        const prefix = unlockAt ? `${letter.box}-u${unlockAt}` : letter.box;
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
    setLink('');
    setSelectedId(null);
    setSchedule(false);
    setWhen(defaultWhen());
    setStep(1);
    setPreviewTab('letter');
  };

  // Opening a long link inside the editor avoids navigating the page
  if (viewNow) return <Open token={viewNow} onExit={() => setViewNow('')} />;

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-14">
      <section>
        {link ? (
          <div className="mt-6">
            <h1 className="font-display text-4xl font-light">Your letter is ready.</h1>
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
              Send the passcode separately from the link. If it’s forgotten, the letter can’t be recovered.
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
                      className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 sm:px-3 sm:py-2.5 text-center transition-all ${
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
                      <span className="mt-0.5 text-xs font-semibold sm:text-xs">
                        <span className="hidden md:inline">{s.title}</span>
                        <span className="md:hidden">{s.short}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* STEP 1: Letter Design */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-light sm:text-4xl">Step 1 · Letter Design</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Set the mood and atmosphere with paper templates, background colors, and handwriting.
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Template Style</legend>
                  <div className="flex flex-wrap gap-2.5">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLetter({ ...letter, template: t.id })}
                        aria-pressed={letter.template === t.id}
                        className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                          letter.template === t.id
                            ? 'border-seal bg-white/70 font-medium shadow-xs'
                            : 'border-plum/20 hover:bg-white/40'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Background Theme</legend>
                  <div className="flex flex-wrap gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLetter({ ...letter, theme: t.id })}
                        aria-label={t.name}
                        aria-pressed={letter.theme === t.id}
                        title={t.name}
                        className={`h-11 w-11 rounded-full ring-offset-2 ring-offset-[#f9cfe3] transition-transform hover:scale-105 ${
                          letter.theme === t.id ? 'ring-2 ring-seal scale-105' : 'ring-1 ring-plum/25'
                        }`}
                        style={{ background: t.bg }}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Handwriting Font</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {fonts.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setLetter({ ...letter, font: f.id })}
                        aria-pressed={letter.font === f.id}
                        className={`rounded-lg border px-3 py-2.5 text-xl transition-all ${
                          letter.font === f.id
                            ? 'border-seal bg-white/70 shadow-xs'
                            : 'border-plum/20 hover:bg-white/40'
                        }`}
                        style={{ fontFamily: f.family }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 flex items-center gap-2"
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
                  <h1 className="font-display text-3xl font-light sm:text-4xl">Step 2 · Message & Media</h1>
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

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50"
                  >
                    ← Back to Design
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 flex items-center gap-2"
                  >
                    Continue to Stickers →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Emojis and Stickers */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl font-light sm:text-4xl">Step 3 · Emojis & Stickers</h1>
                  <p className="mt-1 text-sm text-plum/70">
                    Add romantic stickers to your pages. Drag and resize them right on the preview.
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-plum">Stickers & Stamps</legend>
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
                    stickers used.
                  </p>

                  {selected && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-plum/20 bg-white/50 p-3 shadow-xs">
                      <span className="mr-2 text-2xl" aria-hidden="true">
                        {selected.emoji}
                      </span>
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
                      Remove all stickers
                    </button>
                  )}
                </fieldset>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50"
                  >
                    ← Back to Message
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(4);
                      setPreviewTab('delivery');
                    }}
                    className="rounded-full bg-seal px-7 py-3 font-medium text-petal hover:brightness-110 flex items-center gap-2"
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
                  <h1 className="font-display text-3xl font-light sm:text-4xl">Step 4 · Delivery & Passcode</h1>
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

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('mailbox')}
                      aria-pressed={!isCat}
                      className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition-all ${
                        !isCat
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
                      className={`flex items-center justify-center gap-2.5 rounded-xl border p-3 text-sm font-medium transition-all ${
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
                  </div>

                  {/* Mailbox Color Options */}
                  {!isCat && (
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
                  <PinInput value={pin} onChange={setPin} invalid={!!error && pin.length !== 4} />
                  <p className="mt-2.5 text-xs text-plum/60">
                    Four digits. The recipient enters this passcode to unlock and open your letter.
                  </p>
                </div>

                {error && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-full border border-plum/30 px-6 py-2.5 text-sm hover:bg-white/50"
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
              {isCat ? '🐱 Cat Delivery' : '📮 Mailbox'}
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
                  ? isCat
                    ? 'Tap the kitty to test the opening animation!'
                    : 'Tap the letterbox to test the opening animation!'
                  : testStage === 'open'
                  ? 'Letter revealed! Tap to close or reset.'
                  : 'Opening…'}
              </p>
              <button
                type="button"
                onClick={toggleTestStage}
                className="mt-3 rounded-full border border-plum/30 bg-white/60 px-4 py-1.5 text-xs text-plum hover:bg-white"
              >
                {testStage === 'closed' ? 'Test open animation' : 'Close preview'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
