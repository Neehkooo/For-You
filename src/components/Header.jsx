import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNav } from '../lib/nav.js';
import { UI_MODES, getUiMode, setUiMode } from '../lib/uiTheme.js';
import { V13_UNLOCK_LABEL, formatRemaining, useV13Unlock } from '../lib/release.js';
import logo from '../assets/logo.png';
import AdminLoginModal from './AdminLoginModal.jsx';
import UpdateLogsModal from './UpdateLogsModal.jsx';

const navLink =
  'rounded-full px-3 py-1.5 transition-colors hover:bg-white/50 hover:text-plum text-plum/70';

export default function Header({ route, onAdminOpen }) {
  const { go } = useNav();
  const [showLogin, setShowLogin] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState(getUiMode);
  const closeRef = useRef(null);
  const menuButtonRef = useRef(null);
  const panelRef = useRef(null);
  // The time-lock notice lives in the header and only exists while a release is scheduled.
  const { unlocked: v13Unlocked, remaining: v13Remaining } = useV13Unlock();

  useEffect(() => {
    const sync = () => setMode(getUiMode());
    window.addEventListener('for-you-ui-updated', sync);
    return () => window.removeEventListener('for-you-ui-updated', sync);
  }, []);

  // A navigation always closes the menu, so the drawer never hangs over the next page.
  useEffect(() => {
    setMenuOpen(false);
  }, [route]);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  // If the window grows past the phone layout while the menu is open, drop the drawer
  // so its scroll lock can never outlive a layout where the menu button is gone.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Esc, focus handling and a scroll lock while the drawer is showing.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
    };
  }, [menuOpen, closeMenu]);

  const pickMode = (id) => {
    setUiMode(id);
    setMode(id);
  };

  const goTo = (target) => {
    closeMenu(false);
    go(target);
  };

  const links = (
    <>
      {route !== 'home' && (
        <button type="button" onClick={() => goTo('')} className={navLink}>
          Home
        </button>
      )}
      {route !== 'write' && (
        <button type="button" onClick={() => goTo('#write')} className={navLink}>
          Write a letter
        </button>
      )}
      {route !== 'board' && (
        <button type="button" onClick={() => goTo('#post-its')} className={navLink}>
          Board
        </button>
      )}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-plum/10 bg-white/35 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Logo — opens admin login modal */}
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-80"
              aria-label="Admin login"
              title="Admin Portal"
            >
              <span aria-hidden="true" className="brand-badge">
                <img src={logo} alt="" className="h-full w-full object-contain" />
              </span>
            </button>

            {/* "For You" text — navigates home */}
            <button
              type="button"
              onClick={() => go('')}
              className="font-display text-xl italic tracking-tight text-plum hover:opacity-80 transition-opacity sm:text-2xl"
              aria-label="For You home"
            >
              For You
            </button>
          </div>

          {/* Wide screens: a slim nav row instead of a sidebar */}
          <nav className="hidden items-center gap-1 text-sm sm:flex sm:gap-1.5" aria-label="Main">
            {links}

            {/* Appearance: afternoon / dawn / dusk */}
            <div
              role="group"
              aria-label="Appearance"
              className="ml-1 flex items-center gap-0.5 rounded-full border border-plum/20 bg-white/40 p-0.5"
            >
              {UI_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMode(m.id)}
                  aria-pressed={mode === m.id}
                  aria-label={`${m.label} mode`}
                  title={`${m.label} mode`}
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs leading-none transition-colors ${
                    mode === m.id ? 'bg-seal text-petal shadow-xs' : 'text-plum/60 hover:bg-white/70 hover:text-plum'
                  }`}
                >
                  <span aria-hidden="true">{m.icon}</span>
                </button>
              ))}
            </div>

            {/* Update Logs button */}
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="ml-0.5 flex items-center gap-1.5 px-3 py-1.5 text-plum/70 transition-colors hover:text-plum"
              title="What's new"
            >
              <span className="text-base" aria-hidden="true">📜</span>
              <span>Updates</span>
            </button>
          </nav>

          {/* Small screens: one menu button */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="grid h-9 w-9 place-items-center rounded-full text-plum/70 transition-colors hover:bg-white/60 hover:text-plum"
              aria-label="Update logs"
              title="What's new"
            >
              <span aria-hidden="true" className="text-base">📜</span>
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-full border border-plum/20 bg-white/40 text-plum transition-colors hover:bg-white/70"
              aria-expanded={menuOpen}
              aria-controls="main-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="flex h-4 w-4 flex-col justify-between" aria-hidden="true">
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>

        {!v13Unlocked && (
          <div className="border-t border-[var(--notice-border)] bg-[var(--notice-bg)] text-[var(--notice-text)]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-1.5 px-4 py-1.5 text-[11px] leading-snug sm:justify-start sm:px-6">
              <span className="font-semibold">🔒 v1.3 features are time-locked</span>
              <span className="text-[var(--notice-soft)]">
                <span className="hidden sm:inline">Unlocks {V13_UNLOCK_LABEL} — </span>in{' '}
                <span className="font-mono font-semibold tabular-nums">{formatRemaining(v13Remaining)}</span>
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Slide-over menu (phones) */}
      {menuOpen &&
        createPortal(
          <div
            className="ui-drawer fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => closeMenu()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="main-menu-title"
          >
            <div
              id="main-menu"
              ref={panelRef}
              className="drawer-panel flex h-full w-[min(20rem,86vw)] flex-col border-l border-plum/15 bg-[var(--ui-paper)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-plum/10 px-5 py-4">
                <h2 id="main-menu-title" className="font-display text-xl italic text-plum">
                  For You
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => closeMenu()}
                  className="grid h-8 w-8 place-items-center rounded-full text-plum/50 transition-colors hover:bg-plum/10 hover:text-plum"
                  aria-label="Close menu"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>

              <nav className="flex flex-col gap-1 p-3 text-sm" aria-label="Menu">
                {route !== 'home' && (
                  <button
                    type="button"
                    onClick={() => goTo('')}
                    className="rounded-xl px-3 py-2.5 text-left text-plum/85 transition-colors hover:bg-white/60 hover:text-plum"
                  >
                    Home
                  </button>
                )}
                {route !== 'write' && (
                  <button
                    type="button"
                    onClick={() => goTo('#write')}
                    className="rounded-xl px-3 py-2.5 text-left text-plum/85 transition-colors hover:bg-white/60 hover:text-plum"
                  >
                    Write a letter
                  </button>
                )}
                {route !== 'board' && (
                  <button
                    type="button"
                    onClick={() => goTo('#post-its')}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-plum/85 transition-colors hover:bg-white/60 hover:text-plum"
                  >
                    <span aria-hidden="true">📌</span> The Board
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeMenu(false);
                    setShowLogs(true);
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-plum/85 transition-colors hover:bg-white/60 hover:text-plum"
                >
                  <span aria-hidden="true">📜</span> Update logs
                </button>
              </nav>

              <div className="mt-1 border-t border-plum/10 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-plum/50">Appearance</p>
                <div className="mt-2 grid gap-1.5" role="group" aria-label="Appearance">
                  {UI_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pickMode(m.id)}
                      aria-pressed={mode === m.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors ${
                        mode === m.id
                          ? 'border-seal/40 bg-white/70 font-medium text-plum'
                          : 'border-plum/15 text-plum/75 hover:bg-white/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{m.icon}</span> {m.label}
                      </span>
                      {mode === m.id && (
                        <span className="text-xs text-seal" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-auto px-5 py-4 text-[11px] leading-relaxed text-plum/45">
                Love letters, sealed and sent by link.
              </p>
            </div>
          </div>,
          document.body
        )}

      {/* Admin Login Modal */}
      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={() => {
            setShowLogin(false);
            if (onAdminOpen) onAdminOpen();
          }}
        />
      )}

      {/* Update Logs Modal (public) */}
      {showLogs && <UpdateLogsModal onClose={() => setShowLogs(false)} />}
    </>
  );
}
