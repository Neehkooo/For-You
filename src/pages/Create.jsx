import { useState } from 'react';
import Letter from '../components/Letter.jsx';
import PinInput from '../components/PinInput.jsx';
import { themes, fonts, templates, stickerEmojis, MAX_STICKERS, MAX_BODY, MAX_PAGES, getPages, boxColors, DEFAULT_BOX } from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import DateTimePicker from '../components/DateTimePicker.jsx';
import Open from './Open.jsx';
import { sealLetter } from '../lib/seal.js';
import { compressImage, readAsDataURL, MAX_AUDIO } from '../lib/media.js';
import { saveLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';

const chip = 'rounded-full border border-plum/30 px-4 py-1.5 text-sm hover:bg-white/50 disabled:opacity-40 disabled:hover:bg-transparent';
const defaultWhen = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return t.getTime();
};

const empty = {
  to: '', from: '', pages: [''], theme: 'blush', font: 'vibes',
  image: null, music: null, template: 'plain', stickers: [], box: DEFAULT_BOX,
};

export default function Create() {
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
  const [viewNow, setViewNow] = useState('');   // "<box>-<token>" opened inside the editor
  const selected = letter.stickers.find((s) => s.id === selectedId);
  const pages = getPages(letter);

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
      return setMediaError(`That file is ${Math.round(f.size / 1024)} KB. Choose a clip under ${MAX_AUDIO / 1024} KB (about 30 seconds of MP3).`);
    const src = await readAsDataURL(f);
    setLetter((l) => ({ ...l, music: { name: f.name, src } }));
  };

  // ---------- create ----------
  const create = async () => {
    setError('');
    if (!pages.some((p) => p.trim())) return setError('Write your letter first.');
    if (pin.length !== 4) return setError('Enter a 4-digit passcode.');
    let unlockAt = null;
    if (schedule) {
      unlockAt = when;
      if (!Number.isFinite(unlockAt) || unlockAt < Date.now() + 60_000)
        return setError('Choose a delivery time at least a minute from now.');
    }
    setBusy(true);
    try {
      const token = await sealLetter({ ...letter, pages }, pin);
      const saved = await saveLetter(token, unlockAt, letter.box);
      if (saved) {
        setLink(`${window.location.origin}/l/${saved.id}`);
        setLinkKind(unlockAt ? 'scheduled' : 'short');
      } else if (unlockAt) {
        setError('Scheduled delivery needs the online version of the site. It isn’t available in this preview.');
      } else {
        const base = import.meta.env.VITE_SHARE_BASE || `${window.location.origin}${window.location.pathname}`;
        setLink(`${base}#l-${letter.box}-${token}`);
        setLinkKind('long');
      }
    } catch {
      setError('Something went wrong creating the letter. Try again.');
    }
    setBusy(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* blocked: the field can be copied by hand */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadDraft = async () => {
    setPdfBusy(true);
    try { await savePdf(await exportLetterPdf({ ...letter, pages }), pdfName(letter)); } catch { /* ignore */ }
    setPdfBusy(false);
  };

  const again = () => { setLetter(empty); setCur(0); setPin(''); setLink(''); setSelectedId(null); setSchedule(false); setWhen(defaultWhen()); };

  // Opening a long link inside the editor avoids navigating the page, which the artifact viewer can't follow.
  if (viewNow) return <Open token={viewNow} onExit={() => setViewNow('')} />;

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_1.1fr] lg:py-14">
      <section>

        {link ? (
          <div className="mt-6">
            <h1 className="font-display text-4xl font-light">Your letter is ready.</h1>
            <p className="mt-3 text-plum/75">
              {linkKind === 'scheduled'
                ? `It will open on ${new Date(when).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}. Until then the reader sees only a countdown.`
                : 'Share this link. The reader will need your passcode to open it.'}
            </p>
            <input readOnly value={link} onFocus={(e) => e.target.select()} className="field mt-6" aria-label="Letter link" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={copy} className="rounded-full bg-seal px-6 py-3 font-medium text-petal hover:brightness-110">
                {copied ? 'Copied' : 'Copy link'}
              </button>
              {linkKind === 'long' ? (
                <button type="button" onClick={() => setViewNow(link.split('#l-')[1])}
                  className="rounded-full border border-plum/30 px-6 py-3 hover:bg-white/50">Open letter</button>
              ) : (
                <a href={link} className="rounded-full border border-plum/30 px-6 py-3 hover:bg-white/50">Open letter</a>
              )}
              <button onClick={again} className="rounded-full px-4 py-3 text-plum/70 hover:text-plum">Write another</button>
            </div>
            {linkKind === 'long' && link.length > 8000 && (
              <p className="mt-5 text-sm text-amber-800">
                This link is long ({Math.round(link.length / 1024)} KB) because of the picture or music. Messaging apps may cut it off, so email or pasting it into a browser works best.
              </p>
            )}
            <p className="mt-6 text-sm text-plum/60">
              Send the passcode separately from the link. If it’s forgotten, the letter can’t be recovered.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            <h1 className="font-display text-4xl font-light">Write your letter</h1>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">To
                <input className="field mt-1.5" value={letter.to} onChange={(e) => setLetter({ ...letter, to: e.target.value })} placeholder="Their name" maxLength={40} />
              </label>
              <label className="block text-sm">From
                <input className="field mt-1.5" value={letter.from} onChange={(e) => setLetter({ ...letter, from: e.target.value })} placeholder="Your name" maxLength={40} />
              </label>
            </div>

            <div>
              <label className="block text-sm" htmlFor="msg">Message</label>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <button type="button" className={chip} disabled={cur === 0} onClick={() => setCur(cur - 1)}>← Prev</button>
                <span className="px-1 text-plum/70">Page {cur + 1} of {pages.length}</span>
                <button type="button" className={chip} disabled={cur >= pages.length - 1} onClick={() => setCur(cur + 1)}>Next →</button>
                <button type="button" className={chip} disabled={pages.length >= MAX_PAGES} onClick={addPage}>+ Add page</button>
                {pages.length > 1 && <button type="button" className={chip} onClick={removePage}>Remove page</button>}
              </div>
              <textarea id="msg" className="field mt-3 min-h-44" value={pages[cur] ?? ''} maxLength={MAX_BODY}
                onChange={(e) => setPageText(e.target.value)} placeholder="Start with what you’ve never said out loud…" />
              <span className="mt-1 block text-right text-xs text-plum/50">{(pages[cur] ?? '').length}/{MAX_BODY}</span>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm">Template</legend>
              <div className="flex flex-wrap gap-2.5">
                {templates.map((t) => (
                  <button key={t.id} type="button" onClick={() => setLetter({ ...letter, template: t.id })}
                    aria-pressed={letter.template === t.id}
                    className={`rounded-lg border px-4 py-2 text-sm ${letter.template === t.id ? 'border-seal bg-white/60' : 'border-plum/20 hover:bg-white/40'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Background</legend>
              <div className="flex flex-wrap gap-3">
                {themes.map((t) => (
                  <button key={t.id} type="button" onClick={() => setLetter({ ...letter, theme: t.id })}
                    aria-label={t.name} aria-pressed={letter.theme === t.id} title={t.name}
                    className={`h-11 w-11 rounded-full ring-offset-2 ring-offset-[#f9cfe3] ${letter.theme === t.id ? 'ring-2 ring-seal' : 'ring-1 ring-plum/25'}`}
                    style={{ background: t.bg }} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Letterbox</legend>
              <p className="mb-3 text-xs text-plum/60">The colour of the mailbox the reader taps to open the letter.</p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-wrap gap-3">
                  {boxColors.map((b) => (
                    <button key={b.id} type="button" onClick={() => setLetter({ ...letter, box: b.id })}
                      aria-label={`${b.name} letterbox`} aria-pressed={letter.box === b.id} title={b.name}
                      className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-[#f9cfe3] ${letter.box === b.id ? 'ring-2 ring-seal' : 'ring-1 ring-plum/25'}`}
                      style={{ background: b.body }} />
                  ))}
                </div>
                <Letterbox small color={letter.box} />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Handwriting</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {fonts.map((f) => (
                  <button key={f.id} type="button" onClick={() => setLetter({ ...letter, font: f.id })}
                    aria-pressed={letter.font === f.id}
                    className={`rounded-lg border px-3 py-2.5 text-xl ${letter.font === f.id ? 'border-seal bg-white/60' : 'border-plum/20 hover:bg-white/40'}`}
                    style={{ fontFamily: f.family }}>
                    {f.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Stickers</legend>
              <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-8">
                {stickerEmojis.map((e) => (
                  <button key={e} type="button" onClick={() => addSticker(e)} disabled={letter.stickers.length >= MAX_STICKERS}
                    aria-label={`Add ${e} sticker`}
                    className="grid h-11 place-items-center rounded-lg text-2xl hover:bg-white/50 disabled:opacity-40">
                    {e}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-plum/55">
                Tap a sticker to add it to this page, then drag it on the preview. {letter.stickers.length}/{MAX_STICKERS} used.
              </p>
              {selected && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-plum/20 bg-white/40 p-3">
                  <span className="mr-1 text-2xl" aria-hidden="true">{selected.emoji}</span>
                  <button type="button" className={chip} onClick={() => patchSticker(selected.id, { size: Math.max(20, selected.size - 12) })}>Smaller</button>
                  <button type="button" className={chip} onClick={() => patchSticker(selected.id, { size: Math.min(120, selected.size + 12) })}>Bigger</button>
                  <button type="button" className={chip} onClick={() => patchSticker(selected.id, { rot: ((selected.rot || 0) + 15) % 360 })}>Rotate</button>
                  <button type="button" className={chip} onClick={() => removeSticker(selected.id)}>Remove</button>
                </div>
              )}
              {letter.stickers.length > 0 && (
                <button type="button" onClick={() => { setLetter({ ...letter, stickers: [] }); setSelectedId(null); }}
                  className="mt-3 text-sm text-plum/70 hover:text-plum">Remove all stickers</button>
              )}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Picture</legend>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${chip} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-seal`}>
                  {letter.image ? 'Change picture' : 'Add a picture'}
                  <input type="file" accept="image/*" onChange={pickImage} className="sr-only" />
                </label>
                {letter.image && (
                  <button type="button" onClick={() => setLetter({ ...letter, image: null })} className="text-sm text-plum/70 hover:text-plum">Remove</button>
                )}
              </div>
              <p className="mt-2 text-xs text-plum/55">Shown on the first page.</p>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Music</legend>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`${chip} cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-seal`}>
                  {letter.music ? 'Change music' : 'Add music'}
                  <input type="file" accept="audio/*" onChange={pickMusic} className="sr-only" />
                </label>
                {letter.music && (
                  <button type="button" onClick={() => setLetter({ ...letter, music: null })} className="text-sm text-plum/70 hover:text-plum">Remove</button>
                )}
              </div>
              {letter.music && (
                <div className="mt-3">
                  <p className="truncate text-sm text-plum/70">{letter.music.name}</p>
                  <audio controls src={letter.music.src} className="mt-2 w-full" />
                </div>
              )}
              <p className="mt-2 text-xs text-plum/55">Short MP3 clips work best (under 500 KB). It plays when the reader opens the letter.</p>
              {mediaError && <p role="alert" className="mt-2 text-sm text-red-700">{mediaError}</p>}
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm">Delivery</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="h-4 w-4 accent-[#a3202f]" />
                Keep it sealed until a date
              </label>
              {schedule && (
                <div className="mt-4 rounded-lg border border-plum/20 bg-white/40 p-4">
                  <DateTimePicker value={when} onChange={setWhen} minValue={Date.now() + 60_000} />
                </div>
              )}
              <p className="mt-2 text-xs text-plum/55">
                Scheduled letters need the online version of the site. The reader sees only a countdown until then, even if they have the link.
              </p>
            </fieldset>

            <div>
              <p className="mb-2 text-sm">Passcode</p>
              <PinInput value={pin} onChange={setPin} invalid={!!error && pin.length !== 4} />
              <p className="mt-2 text-xs text-plum/55">Four digits. The reader enters this to open the letter.</p>
            </div>

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <button onClick={create} disabled={busy}
              className="rounded-full bg-seal px-8 py-3.5 font-display text-lg text-petal hover:brightness-110 disabled:opacity-60">
              {busy ? 'Sealing…' : 'Create letter'}
            </button>
          </div>
        )}
      </section>

      <section className="lg:sticky lg:top-10 lg:self-start">
        <div className="mb-3 flex items-center justify-between text-sm text-plum/60">
          <span>Preview · page {cur + 1} of {pages.length}</span>
          <button type="button" onClick={downloadDraft} disabled={pdfBusy}
            className="underline underline-offset-4 hover:text-plum disabled:opacity-50">
            {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
        <Letter key={cur} letter={letter} page={cur} className="min-h-80 turn-next" editable selectedId={selectedId}
          onSelect={setSelectedId} onStickerChange={patchSticker} onStickerRemove={removeSticker} />
      </section>
    </main>
  );
}
