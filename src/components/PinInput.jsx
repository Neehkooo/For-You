import { useRef } from 'react';

export default function PinInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  invalid = false,
  disabled = false,
  onEnter,
  label = 'Passcode',
}) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const commit = (arr) => onChange(arr.join('').slice(0, length));

  const handleChange = (i, e) => {
    if (disabled) return;
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    const next = [...digits];
    next[i] = d;
    commit(next);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter?.();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) {
        next[i] = '';
        commit(next);
      } else if (i > 0) {
        next[i - 1] = '';
        commit(next);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div role="group" aria-label={label} className="flex flex-wrap justify-center gap-2 sm:gap-2.5">
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
          className={`h-12 w-9 sm:h-14 sm:w-11 rounded-lg border bg-white/60 text-center font-display text-xl sm:text-2xl text-plum transition-all shadow-2xs ${
            invalid ? 'border-red-600 ring-1 ring-red-400' : 'border-plum/30 focus:border-seal focus:ring-2 focus:ring-seal/30'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        />
      ))}
    </div>
  );
}
