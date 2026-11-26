import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const toLines = (list) => (Array.isArray(list) ? list.join('\n') : '');

// Modal editor for one release note: version, date and the three content groups.
export default function LogEditorModal({ log, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    version: log?.version || '',
    date: log?.date || '',
    title: log?.title || '',
    features: toLines(log?.features),
    ui: toLines(log?.ui),
    fixes: toLines(log?.fixes),
  }));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!log) return null;

  const lines = (text) =>
    text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    if (!form.version.trim() || !form.title.trim()) return;
    onSave({
      ...log,
      version: form.version.trim(),
      date: form.date.trim(),
      title: form.title.trim(),
      features: lines(form.features),
      ui: lines(form.ui),
      fixes: lines(form.fixes),
    });
  };

  const field =
    'mt-1 w-full rounded-lg border border-plum/25 bg-white px-3 py-2 text-sm text-plum placeholder:text-plum/40';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-editor-title"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-plum/20 bg-[var(--ui-paper)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-plum/10 px-4 py-4 sm:px-6">
          <div>
            <h2 id="log-editor-title" className="font-display text-xl font-light text-plum sm:text-2xl">
              Edit Release Note
            </h2>
            <p className="mt-0.5 text-xs text-plum/60">
              Change the version tag, date, title or wording. Saving replaces this entry in place.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-plum/60 transition-colors hover:bg-plum/10 hover:text-plum"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-plum/80">
              Version
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="v1.4.0"
                required
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-plum/80">
              Date
              <input
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="December 20, 2026"
                className={field}
              />
            </label>
            <label className="block text-xs font-semibold text-plum/80">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What this release is called"
                required
                className={field}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-emerald-800">
            🚀 New Features <span className="font-normal text-plum/50">(one per line)</span>
            <textarea
              rows={4}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              className={field}
            />
          </label>

          <label className="block text-xs font-semibold text-indigo-800">
            🎨 UI Improvements <span className="font-normal text-plum/50">(one per line)</span>
            <textarea
              rows={3}
              value={form.ui}
              onChange={(e) => setForm({ ...form, ui: e.target.value })}
              className={field}
            />
          </label>

          <label className="block text-xs font-semibold text-rose-800">
            🐛 Bug Fixes <span className="font-normal text-plum/50">(one per line)</span>
            <textarea
              rows={3}
              value={form.fixes}
              onChange={(e) => setForm({ ...form, fixes: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-plum/10 bg-white/50 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-plum/30 px-5 py-2 text-xs text-plum hover:bg-plum/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-seal px-6 py-2 text-xs font-medium text-petal shadow-xs hover:brightness-110"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
