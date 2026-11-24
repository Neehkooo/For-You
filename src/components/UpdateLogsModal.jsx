import { useEffect, useState } from 'react';
import { getUpdateLogs } from '../lib/admin.js';
import { V13_UNLOCK_LABEL, formatRemaining, useV13Unlock } from '../lib/release.js';

export default function UpdateLogsModal({ onClose }) {
  const [logs, setLogs] = useState(getUpdateLogs);
  const { unlocked: v13Unlocked, remaining: v13Remaining } = useV13Unlock();

  useEffect(() => {
    const refresh = () => setLogs(getUpdateLogs());
    window.addEventListener('for-you-logs-updated', refresh);
    return () => window.removeEventListener('for-you-logs-updated', refresh);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logs-title"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-3xl border border-plum/20 bg-[#fffdfa] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-plum/10 px-4 py-4 sm:px-8 sm:py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                📜
              </span>
              <h2 id="logs-title" className="font-display text-2xl font-light text-plum">
                Update Logs & Releases
              </h2>
            </div>
            <p className="mt-1 text-xs text-plum/65">
              Explore what’s new: freshly shipped features, design improvements, and fixes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-plum/50 hover:bg-plum/10 hover:text-plum transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable logs list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 space-y-6 sm:space-y-8">
          {logs.map((log, index) => (
            <article
              key={log.id || log.version || index}
              className="rounded-2xl border border-plum/15 bg-white/70 p-4 sm:p-6 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-plum/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-seal px-3 py-0.5 text-xs font-semibold text-petal">
                    {log.version}
                  </span>
                  {!v13Unlocked && log.version === 'v1.3.0' && (
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                      🔒 Time-locked · unlocks {V13_UNLOCK_LABEL}
                    </span>
                  )}
                  <h3 className="font-display text-xl font-medium text-plum">{log.title}</h3>
                </div>
                <time className="text-xs font-medium text-plum/60">{log.date}</time>
              </div>

              {!v13Unlocked && log.version === 'v1.3.0' && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                  These features unlock automatically in <strong>{formatRemaining(v13Remaining)}</strong>. Until then the
                  editor keeps them behind the lock.
                </p>
              )}

              <div className="mt-4 space-y-4 text-xs sm:text-sm">
                {/* New Features */}
                {log.features && log.features.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      New Features
                    </h4>
                    <ul className="mt-1.5 list-disc pl-5 space-y-1 text-plum/80">
                      {log.features.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* UI Improvements */}
                {log.ui && log.ui.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 font-semibold text-indigo-800">
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                      UI Improvements
                    </h4>
                    <ul className="mt-1.5 list-disc pl-5 space-y-1 text-plum/80">
                      {log.ui.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bugs Fixed */}
                {log.fixes && log.fixes.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-1.5 font-semibold text-rose-800">
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                      Bugs Fixed
                    </h4>
                    <ul className="mt-1.5 list-disc pl-5 space-y-1 text-plum/80">
                      {log.fixes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-plum/10 bg-white/40 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-seal px-6 py-2 text-sm font-medium text-petal hover:brightness-110 shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
