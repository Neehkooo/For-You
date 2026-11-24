import { useEffect, useState } from 'react';
import Letter from '../components/Letter.jsx';
import PinInput from '../components/PinInput.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import { openLetter } from '../lib/seal.js';
import { fetchLetter } from '../lib/api.js';
import { exportLetterPdf, pdfName, savePdf } from '../lib/pdf.js';
import { boxColors, catColors, birdColors, getPages, resolveBox } from '../lib/themes.js';
import Letterbox from '../components/Letterbox.jsx';
import { useNav } from '../lib/nav.js';
import { recordLetterOpened } from '../lib/admin.js';

function MusicButton({ music }) {
  if (!music || !music.src || !music.src.startsWith('data:audio/')) return null;
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
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-14">
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

// Parses long tokens formatted as "<box>-<token>" or "<box>-u<unlockAt>-<token>".
// Box ids can contain underscores (cat_orange, bird_dove, cat_1a2b3c…), so the box prefix is
// matched against the known ids before the rest is treated as the encrypted token.
const isKnownBox = (id) =>
  id === 'cake' ||
  boxColors.some((b) => b.id === id) ||
  catColors.some((c) => c.id === id) ||
  birdColors.some((b) => b.id === id) ||
  /^(cat|bird)_[0-9a-f]{6}$/.test(id);

const parseLongToken = (raw) => {
  if (!raw || typeof raw !== 'string') return null;

  let rest = raw;
  let box = resolveBox(null);
  let unlockAt = null;
  let pinLength = null;

  const dash = rest.indexOf('-');
  if (dash > 0 && isKnownBox(rest.slice(0, dash))) {
    box = resolveBox(rest.slice(0, dash));
    rest = rest.slice(dash + 1);
  }

  // Optional passcode length marker: p0 (no passcode), p4, p6.
  const pin = rest.match(/^p([046])-(.+)$/s);
  if (pin) {
    pinLength = Number(pin[1]);
    rest = pin[2];
  }

  const unlock = rest.match(/^u(\d{12,15})-(.+)$/s);
  if (unlock) {
    unlockAt = Number(unlock[1]);
    rest = unlock[2];
  }

  if (rest.length < 40 || !/^[A-Za-z0-9-]+$/.test(rest)) return null;
  return { box, unlockAt, pinLength, token: rest };
};

// Opened by a short link (/l/<id>, shortId set) or a long link (#l-<token>.<box>, token set).
// Flow: letterbox -> tap to open -> passcode -> letter slides out -> reader.
export default function Open({ token: longToken, shortId, onExit }) {
  const [source, setSource] = useState(() => {
    if (!longToken) return { status: 'loading' };
    const parsed = parseLongToken(longToken);
    if (!parsed) return { status: 'error' };

    if (parsed.unlockAt && Date.now() < parsed.unlockAt) {
      return {
        status: 'locked',
        unlockAt: parsed.unlockAt,
        box: parsed.box,
        token: parsed.token,
        pinLength: parsed.pinLength,
      };
    }
    return {
      status: 'ready',
      token: parsed.token,
      box: parsed.box,
      unlockAt: parsed.unlockAt,
      pinLength: parsed.pinLength,
    };
  });

  const [stage, setStage] = useState('closed');   // mailbox: closed | opening | open | emerge
  const [phase, setPhase] = useState('box');      // box | read
  const [pin, setPin] = useState('');
  const [letter, setLetter] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // 0 = no passcode, 4 / 6 = that many digits, null = older letter (either length).
  const declaredPin = typeof source.pinLength === 'number' ? source.pinLength : null;

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const load = async () => {
    setSource({ status: 'loading' });
    try {
      const r = await fetchLetter(shortId);
      setSource({ ...r, box: resolveBox(r.box) });
    } catch {
      setSource({ status: 'error' });
    }
  };

  useEffect(() => {
    if (shortId) load();
  }, [shortId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlock = () => {
    if (source.token) {
      setSource((prev) => ({ ...prev, status: 'ready' }));
    } else if (shortId) {
      load();
    }
  };

  const openBox = () => {
    if (stage !== 'closed') return;
    setStage('opening');
    setTimeout(() => {
      setStage('open');
      // Letters sent without a passcode open themselves as soon as the delivery is done.
      if (declaredPin === 0) submitPin('');
    }, 900);
  };

  const submitPin = async (candidate = pin) => {
    const lengthOk =
      declaredPin === 0
        ? candidate === ''
        : declaredPin
        ? candidate.length === declaredPin
        : candidate.length === 4 || candidate.length === 6;
    if (!lengthOk || source.status !== 'ready' || busy) return;
    if (lockoutSeconds > 0) {
      setError(`Too many incorrect attempts. Please wait ${lockoutSeconds} second${lockoutSeconds === 1 ? '' : 's'}.`);
      return;
    }
    setBusy(true);
    try {
      const l = await openLetter(source.token, candidate);
      if (l.unlockAt && Date.now() < l.unlockAt) {
        setBusy(false);
        setError('This letter is scheduled and still sealed.');
        return;
      }
      setBusy(false);
      setFailedAttempts(0);
      setLetter(l);
      recordLetterOpened();
      setStage('emerge');
      setTimeout(() => setPhase('read'), 1100);
    } catch {
      setBusy(false);
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      setPin('');
      setShakeKey((k) => k + 1);

      if (nextFailed >= 5) {
        setLockoutSeconds(30);
        setError('Too many incorrect attempts. Please wait 30 seconds.');
      } else if (nextFailed >= 3) {
        setError(`That passcode doesn’t match. (${5 - nextFailed} attempts remaining before temporary lockout)`);
      } else {
        setError('That passcode doesn’t match. Check it and try again.');
      }
    }
  };

  const change = (value) => {
    setPin(value);
    setError('');
    if (lockoutSeconds > 0) {
      setError(`Too many incorrect attempts. Please wait ${lockoutSeconds} second${lockoutSeconds === 1 ? '' : 's'}.`);
      return;
    }
    if (declaredPin ? value.length >= declaredPin : value.length === 6) {
      submitPin(value);
    }
  };

  if (phase === 'read' && letter) return <Reader letter={letter} onExit={onExit} />;

  const shell = (children) => (
    <main className="grid min-h-[calc(100vh-8.5rem)] place-items-center px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  );

  if (source.status === 'loading') return shell(<p className="text-plum/70">Finding your letter…</p>);

  if (source.status === 'missing') return shell(
    <>
      <h1 className="font-display text-3xl font-light sm:text-4xl">This letter isn’t here.</h1>
      <p className="mt-3 text-plum/70">The link may be mistyped, or the letter may have been removed.</p>
    </>
  );

  if (source.status === 'locked') {
    const when = new Date(source.unlockAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
    return shell(
      <>
        <Letterbox small color={source.box} />
        <h1 className="mt-6 font-display text-3xl font-light sm:text-4xl">Not yet.</h1>
        <p className="mt-3 text-sm text-plum/70">This letter opens on:</p>
        <p className="mt-1 font-medium text-plum">{when}</p>
        
        {/* Real-time ticking countdown timer */}
        <CountdownTimer targetTime={source.unlockAt} onUnlock={handleUnlock} />

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={handleUnlock}
            className="rounded-full border border-plum/30 bg-white/40 px-6 py-2.5 text-sm hover:bg-white/70"
          >
            Check again
          </button>
        </div>
      </>
    );
  }

  if (source.status === 'error') return shell(
    <>
      <h1 className="font-display text-3xl font-light sm:text-4xl">Couldn’t reach the letter.</h1>
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
            <h1 className="font-display text-3xl font-light sm:text-4xl">A letter is waiting.</h1>
            <p className="mt-3 text-plum/70">
              {source.box?.startsWith('bird')
                ? 'Tap the bird to open the letter.'
                : source.box?.startsWith('cat')
                ? 'Tap the kitty to open the letter.'
                : 'Tap the letterbox to open it.'}
            </p>
          </>
        )}
        {stage === 'opening' && <p className="pt-6 text-plum/70">Opening…</p>}
        {showCode && declaredPin === 0 && (
          <p className="pt-2 text-sm text-plum/70">{error || 'Opening your letter…'}</p>
        )}
        {showCode && declaredPin !== 0 && (
          <div className={shakeKey ? 'shake' : ''} key={shakeKey}>
            <p className="text-plum/70">
              {declaredPin === 4
                ? 'Enter the 4-digit passcode.'
                : declaredPin === 6
                ? 'Enter the 6-digit passcode.'
                : 'Enter the 4 or 6-digit passcode.'}
            </p>
            <div className="mt-5 flex justify-center">
              <PinInput
                length={declaredPin || 6}
                value={pin}
                onChange={change}
                onEnter={() => submitPin(pin)}
                autoFocus
                invalid={!!error}
                disabled={lockoutSeconds > 0}
              />
            </div>
            {declaredPin === null && pin.length === 4 && (
              <button
                type="button"
                onClick={() => submitPin(pin)}
                className="mt-3 text-xs text-seal font-medium underline underline-offset-4 hover:brightness-110"
              >
                Submit 4-digit code →
              </button>
            )}
            <p role="alert" className="mt-4 min-h-6 text-sm text-red-700">{busy ? 'Opening…' : error}</p>
          </div>
        )}
      </div>
    </>
  );
}
