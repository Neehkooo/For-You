import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PinInput from './PinInput.jsx';
import DateTimePicker from './DateTimePicker.jsx';

// Step 4's “Continue” modal: delivery time, secret passcode and the optional note.
// The note is available with or without a passcode.
export default function DeliveryModal({
  pinLength,
  setPinLength,
  pin,
  setPin,
  pinNote,
  setPinNote,
  schedule,
  setSchedule,
  when,
  setWhen,
  v13Unlocked,
  onLocked,
  onCreate,
  onClose,
  error,
  busy,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const chooseLength = (n) => {
    if (n === 6 && !v13Unlocked) {
      onLocked?.('6-digit passcodes unlock with v1.3. Letters use a 4-digit passcode for now.');
      return;
    }
    setPinLength(n);
    setPin((p) => p.slice(0, n));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-3 sm:px-6">
          <div>
            <h2 id="delivery-title" className="font-display text-xl font-light text-plum sm:text-2xl">
              Delivery, Passcode &amp; Note
            </h2>
            <p className="mt-0.5 text-[11px] text-plum/60 sm:text-xs">
              All optional — set a time, a secret code, a gentle hint, or none at all.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close delivery settings"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 hover:bg-plum/10 hover:text-plum disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Delivery time */}
          <section className="rounded-xl border border-plum/20 bg-white/40 p-3.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-plum">
              <input
                type="checkbox"
                checked={schedule}
                onChange={(e) => setSchedule(e.target.checked)}
                className="h-4 w-4 accent-[#a3202f]"
              />
              <span>Deliver at a future date &amp; time</span>
            </label>
            {schedule ? (
              <div className="mt-3 rounded-lg border border-plum/20 bg-white/60 p-3">
                <DateTimePicker value={when} onChange={setWhen} minValue={Date.now() + 60_000} />
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-plum/60">
                Send now — the recipient can open it as soon as they tap the link.
              </p>
            )}
            {schedule && (
              <p className="mt-2 text-[11px] text-plum/60">
                The recipient sees a live countdown until that moment.
              </p>
            )}
          </section>

          {/* Passcode */}
          <section className="rounded-xl border border-plum/20 bg-white/40 p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-plum">Secret passcode</p>
              <div className="flex items-center gap-1 rounded-lg border border-plum/20 bg-white/50 p-1">
                {[0, 4, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => chooseLength(n)}
                    aria-pressed={pinLength === n}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      pinLength === n ? 'bg-seal text-petal shadow-xs' : 'text-plum/70 hover:bg-white/70'
                    } ${n === 6 && !v13Unlocked ? 'opacity-55' : ''}`}
                  >
                    {n === 0 ? 'None' : `${n} digits`}
                    {n === 6 && !v13Unlocked && ' 🔒'}
                  </button>
                ))}
              </div>
            </div>

            {pinLength === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-[11px] leading-relaxed text-emerald-900">
                <strong>No passcode.</strong> Anyone with the link opens the letter directly. You can still add a note
                below.
              </p>
            ) : (
              <>
                <PinInput length={pinLength} value={pin} onChange={setPin} invalid={!!error && pin.length !== pinLength} />
                <p className="mt-2 text-[11px] text-plum/60">
                  {pinLength} digits — the recipient types exactly {pinLength} to unlock.
                </p>
              </>
            )}
          </section>

          {/* Note (works in both modes) */}
          <section className="rounded-xl border border-plum/20 bg-white/40 p-3.5">
            <label className="block" htmlFor="delivery-note">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-plum">
                <span>Note from the sender (optional)</span>
                <span className="text-[10px] font-normal text-plum/50">{pinNote.length}/140</span>
              </span>
              <input
                id="delivery-note"
                className="field mt-1.5 text-sm"
                value={pinNote}
                maxLength={140}
                onChange={(e) => setPinNote(e.target.value)}
                placeholder="A gentle hint, e.g. “our anniversary, backwards”"
              />
            </label>
            <p className="mt-1.5 text-[11px] text-plum/55">
              {pinLength === 0
                ? 'Shown with the opened letter, so they know who it’s from and why it matters.'
                : 'Shown on the passcode screen to help them remember. It never contains the code itself.'}
            </p>
          </section>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-plum/10 bg-white/40 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full border border-plum/30 px-5 py-2 text-xs text-plum hover:bg-white/50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-seal px-6 py-2.5 font-display text-base text-petal shadow-sm hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Sealing…' : 'Seal & Create Letter'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
