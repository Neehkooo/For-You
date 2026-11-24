import { useState } from 'react';
import { useNav } from '../lib/nav.js';
import logo from '../assets/logo.png';
import AdminLoginModal from './AdminLoginModal.jsx';
import UpdateLogsModal from './UpdateLogsModal.jsx';

export default function Header({ route, onAdminOpen }) {
  const { go } = useNav();
  const [showLogin, setShowLogin] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-plum/10 bg-white/35 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
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

          <nav className="flex items-center gap-2 text-sm" aria-label="Main">
            {/* Update Logs button */}
            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className="px-3 py-1.5 text-plum/70 hover:text-plum transition-colors flex items-center gap-1.5"
              title="What's new"
            >
              <span className="text-base" aria-hidden="true">📜</span>
              <span className="hidden sm:inline">Updates</span>
            </button>

            {route !== 'home' && (
              <button
                type="button"
                onClick={() => go('')}
                className="px-3 py-1.5 text-plum/70 hover:text-plum"
              >
                Home
              </button>
            )}
          </nav>
        </div>
      </header>

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
