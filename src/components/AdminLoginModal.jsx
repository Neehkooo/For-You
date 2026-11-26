import { useState } from 'react';
import { createPortal } from 'react-dom';
import { isAdminLoggedIn, loginAdmin, logoutAdmin } from '../lib/admin.js';

export default function AdminLoginModal({ onClose, onLoginSuccess }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(isAdminLoggedIn);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!passcode.trim()) {
      setError('Please enter the admin passcode.');
      return;
    }
    const success = loginAdmin(passcode.trim());
    if (success) {
      setLoggedIn(true);
      onLoginSuccess();
    } else {
      setError('Incorrect passcode. Try again.');
      setPasscode('');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setLoggedIn(false);
    setPasscode('');
    setError('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-plum/20 bg-[var(--ui-paper)] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-plum/10">
          <div className="flex items-center gap-2.5">
            <span className="brand-badge" aria-hidden="true">
              <span className="text-sm font-bold text-petal">⚡</span>
            </span>
            <h2 id="admin-login-title" className="font-display text-2xl font-light text-plum">
              Admin Portal
            </h2>
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

        {loggedIn ? (
          <div className="mt-6 text-center space-y-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <div>
              <p className="font-semibold text-plum">You are signed in as Administrator</p>
              <p className="mt-1 text-xs text-plum/60">
                You have full access to statistics, scheduled maintenance, and update logs.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={onLoginSuccess}
                className="w-full rounded-full bg-seal px-6 py-3 font-medium text-petal hover:brightness-110 shadow-xs"
              >
                Go to Admin Dashboard →
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-full border border-plum/25 px-6 py-2.5 text-sm text-plum/70 hover:bg-white hover:text-plum"
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <p className="text-sm text-plum/70">
              Enter the administrative passcode to access system statistics, scheduled maintenance, and update logs.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-plum/80" htmlFor="admin-pass">
                Admin Passcode
              </label>
              <div className="mt-1.5">
                <input
                  id="admin-pass"
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                  placeholder="Enter passcode"
                  className="field"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-plum/25 px-5 py-2.5 text-sm text-plum/70 hover:bg-white hover:text-plum"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-seal px-5 py-2.5 font-medium text-petal hover:brightness-110 shadow-xs"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
