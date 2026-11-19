import { useEffect, useState } from 'react';
import Letter from '../components/Letter.jsx';
import PinInput from '../components/PinInput.jsx';
import { openLetter } from '../lib/seal.js';
import { fetchLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';
import { getPages, resolveBox } from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import { useNav } from '../lib/nav.js';

function MusicButton({ music }) {
  const [audio] = useState(() => new Audio(music.src));
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audio.loop = true;
    audio.play().then(() => setPlaying(true)).catch(() => {}); // browsers may block autoplay
    return () => audio.pause();
  }, [audio]);

  const toggle = () => {
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => {});
    else { audio.pause(); setPlaying(false); }
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <button onClick={toggle} className="rounded-full border border-plum/30 px-6 py-2.5 hover:bg-white/50">
        {playing ? 'Pause music' : 'Play music'}
      </button>
      <span className="max-w-xs truncate text-xs text-plum/55">{music.name}</span>
    </div>
  );
}

function Reader({ letter, onExit }) {
  const { go: goScreen } = useNav();
  const pages = getPages(letter);
  const [cur, setCur] = useState(0);
  const [dir, setDir] = useState('next');
  const [pdfBusy, setPdfBusy] = useState(false);

  const go = (n) => {
    if (n < 0 || n >= pages.length) return;
    setDir(n > cur ? 'next' : 'prev');
    setCur(n);
  };

  const download = async () => {
    setPdfBusy(true);
    try { await savePdf(await exportLetterPdf(letter), pdfName(letter)); } catch { /* ignore */ }
    setPdfBusy(false);
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Letter key={cur} letter={letter} page={cur} className={`min-h-96 ${dir === 'next' ? 'turn-next' : 'turn-prev'}`} />

      {pages.length > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Letter pages">
          <button onClick={() => go(cur - 1)} disabled={cur === 0} className="rounded-full border border-plum/30 px-5 py-2 hover:bg-white/50 disabled:opacity-40">← Previous</button>
          <span className="text-plum/70">{cur + 1} / {pages.length}</span>
          <button onClick={() => go(cur + 1)} disabled={cur === pages.length - 1} className="rounded-full border border-plum/30 px-5 py-2 hover:bg-white/50 disabled:opacity-40">Next →</button>
        </nav>
      )}

      {letter.music && <MusicButton music={letter.music} />}

      <div className="mt-8 text-center">
        <button onClick={download} disabled={pdfBusy} className="rounded-full bg-seal px-6 py-2.5 text-petal hover:brightness-110 disabled:opacity-60">
          {pdfBusy ? 'Preparing PDF…' : 'Download as PDF'}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-plum/70">
        {onExit ? (
          <button type="button" onClick={onExit} className="underline underline-offset-4 hover:text-plum">Back to the editor</button>
        ) : (
          <button type="button" onClick={() => goScreen('#write')} className="underline underline-offset-4 hover:text-plum">Write a letter of your own</button>
        )}
      </p>
    </main>
  );
}

// Opened by a short link (/l/<id>, shortId set) or a long link (#l-<token>.<box>, token set).
// Flow: letterbox -> tap to open -> passcode -> letter slides out -> reader.
export default function Open({ token: longToken, shortId, onExit }) {
  const [source, setSource] = useState(() => {
    if (!longToken) return { status: 'loading' };
    // Long-link token is "<box>-<token>". The box name has no hyphen, and the token never has a raw one.
    const i = longToken.indexOf('-');
    const box = i > 0 ? longToken.slice(0, i) : null;
    const token = i > 0 ? longToken.slice(i + 1) : longToken;
    return { status: 'ready', token, box: resolveBox(box) };
  });
  const [stage, setStage] = useState('closed');   // mailbox: closed | opening | open | emerge
  const [phase, setPhase] = useState('box');      // box | read
  const [pin, setPin] = useState('');
  const [letter, setLetter] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const load = async () => {
    setSource({ status: 'loading' });
    try {
      const r = await fetchLetter(shortId);
      setSource({ ...r, box: resolveBox(r.box) });
    } catch { setSource({ status: 'error' }); }
  };
  useEffect(() => { if (shortId) load(); }, [shortId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBox = () => {
    if (stage !== 'closed') return;
    setStage('opening');
    setTimeout(() => setStage('open'), 900);
  };

  const change = async (value) => {
    setPin(value);
    setError('');
    if (value.length !== 4 || source.status !== 'ready' || busy) return;
    setBusy(true);
    try {
      const l = await openLetter(source.token, value);
      setBusy(false);
      setLetter(l);
      setStage('emerge');
      setTimeout(() => setPhase('read'), 1100);
    } catch {
      setBusy(false);
      setError('That passcode doesn’t match. Check it and try again.');
      setPin('');
      setShakeKey((k) => k + 1);
    }
  };

  if (phase === 'read' && letter) return <Reader letter={letter} onExit={onExit} />;

  const shell = (children) => (
    <main className="grid min-h-[calc(100vh-8.5rem)] place-items-center px-6 py-10">
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  );

  if (source.status === 'loading') return shell(<p className="text-plum/70">Finding your letter…</p>);

  if (source.status === 'missing') return shell(
    <>
      <h1 className="font-display text-4xl font-light">This letter isn’t here.</h1>
      <p className="mt-3 text-plum/70">The link may be mistyped, or the letter may have been removed.</p>
    </>
  );

  if (source.status === 'locked') {
    const when = new Date(source.unlockAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });
    return shell(
      <>
        <Letterbox small color={source.box} />
        <h1 className="mt-6 font-display text-4xl font-light">Not yet.</h1>
        <p className="mt-3 text-plum/70">This letter opens on <span className="font-medium text-plum">{when}</span>.</p>
        <button onClick={load} className="mt-6 rounded-full border border-plum/30 px-6 py-2.5 hover:bg-white/50">Check again</button>
      </>
    );
  }

  if (source.status === 'error') return shell(
    <>
      <h1 className="font-display text-4xl font-light">Couldn’t reach the letter.</h1>
      <p className="mt-3 text-plum/70">Check your connection and try again.</p>
      <button onClick={shortId ? load : () => window.location.reload()} className="mt-6 rounded-full bg-seal px-6 py-2.5 text-petal hover:brightness-110">Try again</button>
    </>
  );

  // ready: the letterbox, then the passcode once it is open
  const showCode = stage === 'open' || stage === 'emerge';
  return shell(
    <>
      <Letterbox color={source.box} stage={stage} onOpen={openBox} />
      <div className="mt-8 min-h-[9rem]">
        {stage === 'closed' && (
          <>
            <h1 className="font-display text-4xl font-light">A letter is waiting.</h1>
            <p className="mt-3 text-plum/70">Tap the letterbox to open it.</p>
          </>
        )}
        {stage === 'opening' && <p className="pt-6 text-plum/70">Opening…</p>}
        {showCode && (
          <div className={shakeKey ? 'shake' : ''} key={shakeKey}>
            <p className="text-plum/70">Enter the 4-digit passcode.</p>
            <div className="mt-5 flex justify-center">
              <PinInput value={pin} onChange={change} autoFocus invalid={!!error} />
            </div>
            <p role="alert" className="mt-4 min-h-6 text-sm text-red-700">{busy ? 'Opening…' : error}</p>
          </div>
        )}
      </div>
    </>
  );
}
