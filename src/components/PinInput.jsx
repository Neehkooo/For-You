import { useRef } from 'react';

export default function PinInput({ value, onChange, autoFocus = false, invalid = false, disabled = false, label = 'Passcode' }) {
  const refs = useRef([]);
  const digits = [0, 1, 2, 3].map((i) => value[i] || '');

  const commit = (arr) => onChange(arr.join('').slice(0, 4));

  const handleChange = (i, e) => {
    if (disabled) return;
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const next = [...digits];
    next[i] = d;
    commit(next);
    if (i < 3) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) { next[i] = ''; commit(next); }
      else if (i > 0) { next[i - 1] = ''; commit(next); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 3) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    if (disabled) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, 3)]?.focus();
  };

  return (
    <div role="group" aria-label={label} className="flex gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} digit ${i + 1}`}
          className={`h-14 w-12 rounded-lg border bg-white/50 text-center font-display text-2xl text-plum ${
            invalid ? 'border-red-600' : 'border-plum/30'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        />
      ))}
    </div>
  );
}
