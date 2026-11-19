import { useRef, useState } from 'react';
import { useNav } from '../lib/nav.js';

export default function Landing() {
  const [open, setOpen] = useState(false);
  const { go } = useNav();
  const letterRef = useRef(null);

  const start = () => {
    if (open) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const el = letterRef.current;
    if (el && !reduce) {
      // 1) Freeze the idle pose where it is and sink the letter back inside the envelope.
      const pose = getComputedStyle(el).transform;
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.transform = pose === 'none' ? 'translateY(0)' : pose;
      void el.offsetWidth;
      el.style.transition = 'transform 0.35s ease-in-out';
      el.style.transform = 'translateY(0)';
      // 2) Hand control back to the stylesheet; the flap lifts, then the letter rises out.
      setTimeout(() => { el.style.transition = ''; el.style.transform = ''; el.style.animation = ''; }, 360);
    }
    setOpen(true);
    setTimeout(() => go('#write'), reduce ? 150 : 2300);
  };

  return (
    <main className="grid min-h-[calc(100vh-8.5rem)] items-center gap-16 px-6 py-16 sm:px-12 lg:grid-cols-2 lg:px-24">
      <div className="max-w-xl">
        <h1 className="font-display text-5xl font-light leading-[1.05] sm:text-6xl">
          Write the letter you’ve been meaning to send.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-plum/75">
          Choose the paper and the handwriting, lock it with a four-digit passcode, and share a link.
          Only someone with the passcode can read it.
        </p>
      </div>

      <div className="grid place-items-center pb-8 pt-16">
        <div className="env" data-open={open}>
          <div className="env-shadow" aria-hidden="true" />
          <div className="env-back" aria-hidden="true" />
          <div className="env-letter" ref={letterRef} aria-hidden="true">
            <p className="env-letter-title">For you</p>
            <span className="env-line" /><span className="env-line" /><span className="env-line" />
          </div>
          <div className="env-front" aria-hidden="true" />
          <div className="env-flap" aria-hidden="true">
            <div className="env-flap-front" />
            <div className="env-flap-back" />
          </div>
          <button className="env-seal" onClick={start} disabled={open} aria-label="Start writing">
            Start
          </button>
        </div>
      </div>
    </main>
  );
}
