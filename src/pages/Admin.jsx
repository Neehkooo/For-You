import { useEffect, useState } from 'react';
import LogEditorModal from '../components/LogEditorModal.jsx';
import { fetchSiteAnalytics } from '../lib/analytics.js';
import {
  isAdminLoggedIn,
  loginAdmin,
  logoutAdmin,
  getAdminStats,
  getMaintenance,
  maintenanceCovers,
  saveMaintenance,
  MAINTENANCE_SCOPES,
  getUpdateLogs,
  saveUpdateLogs,
  recordLetterCreated,
  recordLetterOpened,
  recordVisit,
} from '../lib/admin.js';

export default function Admin({ onExit }) {
  const [authed, setAuthed] = useState(isAdminLoggedIn);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('stats'); // 'stats' | 'maintenance' | 'logs'

  // Tab 1: Stats
  const [stats, setStats] = useState(getAdminStats);
  const [siteAnalytics, setSiteAnalytics] = useState({ status: 'idle' });

  const loadSiteAnalytics = async () => {
    setSiteAnalytics({ status: 'loading' });
    try {
      const data = await fetchSiteAnalytics();
      setSiteAnalytics(data.configured ? { status: 'ready', ...data } : { status: 'off' });
    } catch (err) {
      setSiteAnalytics({ status: 'error', message: err.message });
    }
  };

  useEffect(() => {
    if (authed) loadSiteAnalytics();
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab 2: Maintenance
  const [maintenance, setMaintenance] = useState(getMaintenance);
  const [maintSaved, setMaintSaved] = useState(false);

  // Tab 3: Logs
  const [logs, setLogs] = useState(getUpdateLogs);
  const [showAddLog, setShowAddLog] = useState(false);
  const [newLog, setNewLog] = useState({
    version: 'v1.3.0',
    title: '',
    date: new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    features: '',
    ui: '',
    fixes: '',
  });
  const [logsSaved, setLogsSaved] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  useEffect(() => {
    const handleStatsUpdate = () => setStats(getAdminStats());
    const handleMaintUpdate = () => setMaintenance(getMaintenance());
    const handleLogsUpdate = () => setLogs(getUpdateLogs());

    window.addEventListener('for-you-stats-updated', handleStatsUpdate);
    window.addEventListener('for-you-maintenance-updated', handleMaintUpdate);
    window.addEventListener('for-you-logs-updated', handleLogsUpdate);

    return () => {
      window.removeEventListener('for-you-stats-updated', handleStatsUpdate);
      window.removeEventListener('for-you-maintenance-updated', handleMaintUpdate);
      window.removeEventListener('for-you-logs-updated', handleLogsUpdate);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (loginAdmin(passcode.trim())) {
      setAuthed(true);
      setPasscode('');
    } else {
      setLoginError('Incorrect admin passcode.');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setAuthed(false);
  };

  const handleSaveMaintenance = (e) => {
    e.preventDefault();
    saveMaintenance(maintenance);
    setMaintSaved(true);
    setTimeout(() => setMaintSaved(false), 2500);
  };

  const toggleMaintenanceMode = () => {
    const updated = { ...maintenance, enabled: !maintenance.enabled };
    setMaintenance(updated);
    saveMaintenance(updated);
  };

  const blankLog = () => ({
    version: '',
    title: '',
    date: new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    features: '',
    ui: '',
    fixes: '',
  });

  const lines = (text) =>
    text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const closeAddForm = () => {
    setShowAddLog(false);
    setNewLog(blankLog());
  };

  const openNewLog = () => {
    setNewLog(blankLog());
    setShowAddLog(true);
  };

  // Creates a new release note (editing an existing one happens in the modal below).
  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLog.version.trim() || !newLog.title.trim()) return;

    const parsedLog = {
      id: `log-${Date.now()}`,
      version: newLog.version.trim(),
      title: newLog.title.trim(),
      date: newLog.date.trim(),
      features: lines(newLog.features),
      ui: lines(newLog.ui),
      fixes: lines(newLog.fixes),
    };

    const updated = [parsedLog, ...logs];
    setLogs(updated);
    saveUpdateLogs(updated);
    closeAddForm();
    setLogsSaved(true);
    setTimeout(() => setLogsSaved(false), 2500);
  };

  // Opens the modal editor for one entry, and saves it back in place.
  const startEditLog = (log) => setEditingLog(log);

  const saveEditedLog = (edited) => {
    const updated = logs.map((l) => (l.id === edited.id ? { ...edited, edited: true } : l));
    setLogs(updated);
    saveUpdateLogs(updated);
    setEditingLog(null);
    setLogsSaved(true);
    setTimeout(() => setLogsSaved(false), 2500);
  };

  const handleDeleteLog = (id) => {
    const updated = logs.filter((l) => l.id !== id);
    setLogs(updated);
    saveUpdateLogs(updated);
  };

  // If unauthenticated, show full-page login gate
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-8.5rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-plum/20 bg-white/70 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <div className="flex items-center gap-3">
            <span className="brand-badge text-xl text-petal">⚡</span>
            <div>
              <h1 className="font-display text-3xl font-light text-plum">Admin Access</h1>
              <p className="text-xs text-plum/65">Please authenticate to continue.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-plum/80" htmlFor="gate-pass">
                Passcode
              </label>
              <input
                id="gate-pass"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                placeholder="Enter admin passcode"
                className="field mt-1.5"
              />
            </div>

            {loginError && <p role="alert" className="text-xs text-red-700">{loginError}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onExit}
                className="flex-1 rounded-full border border-plum/25 px-4 py-2.5 text-sm text-plum/70 hover:bg-white"
              >
                Back to Site
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-seal px-4 py-2.5 font-medium text-petal hover:brightness-110 shadow-xs"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Calculate highest monthly visit for scaling chart
  const maxVisits = Math.max(...stats.monthly.map((m) => m.visits), 1);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-plum/15 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-badge text-petal">⚡</span>
            <h1 className="font-display text-2xl font-light sm:text-4xl">Admin Dashboard</h1>
            <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
              Authenticated
            </span>
          </div>
          <p className="mt-1.5 text-sm text-plum/70">
            Monitor real-time application metrics, schedule maintenance windows, and manage release logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-plum/30 bg-white/50 px-4 py-2 text-sm text-plum hover:bg-white transition-colors"
          >
            ← Back to Site
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* 3 Main Tabs Navigation */}
      <div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-plum/20 bg-white/40 p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setTab('stats')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'stats'
              ? 'bg-seal text-petal shadow-xs scale-[1.01]'
              : 'text-plum/70 hover:bg-white/60 hover:text-plum'
          }`}
        >
          <span className="text-base" aria-hidden="true">
            📊
          </span>
          <span>Statistics</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('maintenance')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'maintenance'
              ? 'bg-seal text-petal shadow-xs scale-[1.01]'
              : 'text-plum/70 hover:bg-white/60 hover:text-plum'
          }`}
        >
          <span className="text-base" aria-hidden="true">
            🛠️
          </span>
          <span>Scheduled Maintenance</span>
          {maintenance.enabled && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Maintenance is active" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab('logs')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'logs'
              ? 'bg-seal text-petal shadow-xs scale-[1.01]'
              : 'text-plum/70 hover:bg-white/60 hover:text-plum'
          }`}
        >
          <span className="text-base" aria-hidden="true">
            📝
          </span>
          <span>Update Logs</span>
          <span className="rounded-full bg-plum/10 px-2 py-0.5 text-xs text-plum font-bold">
            {logs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Statistics */}
      {tab === 'stats' && (
        <section className="mt-8 space-y-8 tab-in">
          {/* Vercel Web Analytics (live, server-side) */}
          <div className="rounded-3xl border border-plum/20 bg-white/70 p-5 shadow-xs sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-plum/10 pb-4">
              <div>
                <h2 className="font-display text-2xl font-light text-plum">Vercel Web Analytics</h2>
                <p className="mt-1 text-xs text-plum/60">
                  Real page views and visitors from the live deployment. Counts only start after Analytics is enabled in
                  Vercel and the site is redeployed.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-plum/25 bg-white/60 px-3 py-1.5 text-xs font-medium text-plum hover:bg-white"
                >
                  Open dashboard ↗
                </a>
                <button
                  type="button"
                  onClick={loadSiteAnalytics}
                  disabled={siteAnalytics.status === 'loading'}
                  className="rounded-full border border-plum/25 bg-white/60 px-3 py-1.5 text-xs font-medium text-plum hover:bg-white disabled:opacity-50"
                >
                  {siteAnalytics.status === 'loading' ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>

            {siteAnalytics.status === 'ready' && (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Page views · 30d', value: siteAnalytics.month?.pageviews, icon: '👁️' },
                    { label: 'Visitors · 30d', value: siteAnalytics.month?.visitors, icon: '👥' },
                    { label: 'Page views · 7d', value: siteAnalytics.week?.pageviews, icon: '📈' },
                    { label: 'Visitors · 7d', value: siteAnalytics.week?.visitors, icon: '🧭' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl border border-plum/15 bg-white/60 p-4">
                      <div className="flex items-center justify-between text-plum/55">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">{m.label}</span>
                        <span aria-hidden="true">{m.icon}</span>
                      </div>
                      <p className="mt-2 font-display text-3xl font-light text-plum">
                        {Number(m.value || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-plum/50">
                  Project {siteAnalytics.project} · updated{' '}
                  {new Date(siteAnalytics.fetchedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  . Custom events tracked: <code>letter_created</code>, <code>letter_opened</code> (see the Events tab in
                  Vercel).
                </p>
              </>
            )}

            {siteAnalytics.status === 'loading' && (
              <p className="mt-4 animate-pulse text-xs text-plum/55">Fetching page views from Vercel…</p>
            )}

            {siteAnalytics.status === 'off' && (
              <div className="mt-4 rounded-2xl border border-amber-300/70 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900">
                <p className="font-semibold">Not connected yet</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>
                    Vercel → your project → <strong>Analytics</strong> → <strong>Enable</strong>.
                  </li>
                  <li>
                    Create an access token (Account settings → Tokens) and add{' '}
                    <code>VERCEL_ANALYTICS_TOKEN</code>, <code>VERCEL_ANALYTICS_PROJECT_ID</code> (and{' '}
                    <code>VERCEL_TEAM_ID</code> if it is a team project) in Settings → Environment Variables.
                  </li>
                  <li>Redeploy so <code>/api/analytics</code> can read the numbers.</li>
                </ol>
                <p className="mt-2 text-amber-800/80">
                  The counters below still work — they are stored in this browser only.
                </p>
              </div>
            )}

            {siteAnalytics.status === 'error' && (
              <p className="mt-4 rounded-2xl border border-rose-300/70 bg-rose-50/70 p-4 text-xs text-rose-800">
                Couldn’t load Vercel analytics: {siteAnalytics.message}. Check the token’s scope and the project id.
              </p>
            )}
          </div>

          {/* Top KPI Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Letters Created */}
            <div className="rounded-2xl border border-plum/20 bg-white/70 p-5 shadow-xs">
              <div className="flex items-center justify-between text-plum/60">
                <span className="text-xs font-semibold uppercase tracking-wider">Letters Created</span>
                <span className="text-xl">💌</span>
              </div>
              <p className="mt-3 font-display text-4xl font-light text-plum">
                {stats.totalCreated.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <span>↑ Active growth</span>
                <span className="text-plum/50">· Total sealed</span>
              </div>
            </div>

            {/* Total Visits */}
            <div className="rounded-2xl border border-plum/20 bg-white/70 p-5 shadow-xs">
              <div className="flex items-center justify-between text-plum/60">
                <span className="text-xs font-semibold uppercase tracking-wider">Site Visits</span>
                <span className="text-xl">👥</span>
              </div>
              <p className="mt-3 font-display text-4xl font-light text-plum">
                {stats.totalVisits.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
                <span>+35% this month</span>
                <span className="text-plum/50">· Visitors</span>
              </div>
            </div>

            {/* Total Letters Opened */}
            <div className="rounded-2xl border border-plum/20 bg-white/70 p-5 shadow-xs">
              <div className="flex items-center justify-between text-plum/60">
                <span className="text-xs font-semibold uppercase tracking-wider">Letters Opened</span>
                <span className="text-xl">📬</span>
              </div>
              <p className="mt-3 font-display text-4xl font-light text-plum">
                {stats.totalOpened.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                <span>Unlocked by passcode</span>
              </div>
            </div>

            {/* Open / Completion Rate */}
            <div className="rounded-2xl border border-plum/20 bg-white/70 p-5 shadow-xs">
              <div className="flex items-center justify-between text-plum/60">
                <span className="text-xs font-semibold uppercase tracking-wider">Open Rate</span>
                <span className="text-xl">🎯</span>
              </div>
              <p className="mt-3 font-display text-4xl font-light text-plum">{stats.openRate}%</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <span>Healthy recipient engagement</span>
              </div>
            </div>
          </div>

          {/* Monthly Comparison Graph & Breakdown */}
          <div className="rounded-3xl border border-plum/20 bg-white/70 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-plum/10 pb-4">
              <div>
                <h2 className="font-display text-2xl font-light text-plum">Monthly Visits & Activity Comparison</h2>
                <p className="mt-1 text-xs text-plum/60">
                  Compare website traffic, creation volume, and recipient unlocks across recent months.
                </p>
              </div>
              <span className="rounded-full border border-plum/20 bg-white/50 px-3 py-1 text-xs text-plum font-medium">
                Live Analytics
              </span>
            </div>

            {/* Visual Bar Comparison Chart */}
            <div className="mt-8">
              <div className="flex h-56 items-end gap-3 sm:gap-6 border-b border-plum/20 pb-2">
                {stats.monthly.map((m) => {
                  const pct = Math.round((m.visits / maxVisits) * 100);
                  return (
                    <div key={m.month} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="pointer-events-none absolute -top-14 opacity-0 transition-opacity group-hover:opacity-100 rounded-lg bg-plum px-2.5 py-1 text-[11px] text-petal shadow-md whitespace-nowrap z-10">
                        <p className="font-bold">{m.month}</p>
                        <p>{m.visits.toLocaleString()} visits · {m.created} letters</p>
                      </div>

                      {/* Bar */}
                      <div
                        className="w-full max-w-16 rounded-t-xl bg-gradient-to-t from-seal/80 to-[#f59aa8] transition-all group-hover:brightness-110 shadow-xs"
                        style={{ height: `${Math.max(15, pct)}%` }}
                      />
                      <span className="mt-2 text-[11px] sm:text-xs font-medium text-plum/80 text-center truncate w-full">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Data Table */}
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-plum/15 text-xs font-semibold uppercase text-plum/60">
                    <th className="pb-3 pr-4">Month</th>
                    <th className="pb-3 px-4">Visits</th>
                    <th className="pb-3 px-4">Letters Created</th>
                    <th className="pb-3 px-4">Letters Opened</th>
                    <th className="pb-3 pl-4">MoM Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-plum/10 text-plum">
                  {stats.monthly.map((m) => (
                    <tr key={m.month} className="hover:bg-white/40">
                      <td className="py-3 pr-4 font-semibold">{m.month}</td>
                      <td className="py-3 px-4">{m.visits.toLocaleString()}</td>
                      <td className="py-3 px-4">{m.created.toLocaleString()}</td>
                      <td className="py-3 px-4">{m.opened.toLocaleString()}</td>
                      <td className="py-3 pl-4">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {m.growth}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Testing Simulation Controls */}
            <div className="mt-8 rounded-2xl border border-plum/15 bg-white/40 p-4">
              <p className="text-xs font-semibold text-plum">Simulate Live Activity (Admin Testing):</p>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    recordVisit();
                    setStats(getAdminStats());
                  }}
                  className="rounded-full border border-plum/30 bg-white px-3.5 py-1 text-xs text-plum hover:bg-plum/5"
                >
                  + Simulate 1 Visit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordLetterCreated();
                    setStats(getAdminStats());
                  }}
                  className="rounded-full border border-plum/30 bg-white px-3.5 py-1 text-xs text-plum hover:bg-plum/5"
                >
                  + Simulate 1 Letter Created
                </button>
                <button
                  type="button"
                  onClick={() => {
                    recordLetterOpened();
                    setStats(getAdminStats());
                  }}
                  className="rounded-full border border-plum/30 bg-white px-3.5 py-1 text-xs text-plum hover:bg-plum/5"
                >
                  + Simulate 1 Letter Opened
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: Scheduled Maintenance */}
      {tab === 'maintenance' && (
        <section className="mt-8 space-y-8 tab-in">
          <form
            onSubmit={handleSaveMaintenance}
            className="rounded-3xl border border-plum/20 bg-white/70 p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-plum/10 pb-5">
              <div>
                <h2 className="font-display text-2xl font-light text-plum">Scheduled Maintenance Controller</h2>
                <p className="mt-1 text-xs text-plum/65">
                  Schedule a window for the letters, the board, or both — visitors see the notice and the chosen
                  part of the site pauses.
                </p>
              </div>

              {/* Quick Toggle Status */}
              <button
                type="button"
                onClick={toggleMaintenanceMode}
                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-xs ${
                  maintenance.enabled
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span>Status: {maintenance.enabled ? 'ACTIVE (LOCKED)' : 'NORMAL (ONLINE)'}</span>
              </button>
            </div>

            {/* Maintenance Toggle Checkbox */}
            <div className="rounded-2xl border border-plum/15 bg-white/50 p-5 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenance.enabled}
                  onChange={(e) => setMaintenance({ ...maintenance, enabled: e.target.checked })}
                  className="h-5 w-5 accent-[#a3202f]"
                />
                <span className="text-sm font-semibold text-plum">
                  Enable Maintenance Mode (Displays notice to visitors)
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pl-8">
                <input
                  type="checkbox"
                  checked={maintenance.lockButton}
                  onChange={(e) => setMaintenance({ ...maintenance, lockButton: e.target.checked })}
                  className="h-4 w-4 accent-[#a3202f]"
                />
                <span className="text-xs text-plum/80">
                  Lock and disable the &quot;Start&quot; button on the landing page
                </span>
              </label>
            </div>

            {/* Maintenance target */}
            <div className="rounded-2xl border border-plum/15 bg-white/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-plum/80">What is under maintenance?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {MAINTENANCE_SCOPES.map((option) => {
                  const active = (maintenance.scope || 'all') === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMaintenance({ ...maintenance, scope: option.id })}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        active
                          ? 'border-seal bg-white shadow-xs ring-1 ring-seal/30'
                          : 'border-plum/20 bg-white/50 hover:bg-white/70'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-plum">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-plum/60">{option.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-plum/55">
                Post-its maintenance pauses new notes; the wall stays readable. Letters follow the lock toggle below.
              </p>
            </div>

            {/* Custom Maintenance Message */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-plum/80" htmlFor="maint-msg">
                Maintenance Notice Message
              </label>
              <textarea
                id="maint-msg"
                rows={3}
                value={maintenance.message}
                onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
                className="field mt-1.5"
                placeholder="Enter maintenance explanation message shown to visitors..."
              />
              <p className="mt-1 text-xs text-plum/50">
                This notice appears in a banner across the landing page while maintenance is active.
              </p>
            </div>

            {/* Schedule Windows */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-plum/80" htmlFor="maint-start">
                  Scheduled Start Time (Optional)
                </label>
                <input
                  id="maint-start"
                  type="datetime-local"
                  value={maintenance.startTime}
                  onChange={(e) => setMaintenance({ ...maintenance, startTime: e.target.value })}
                  className="field mt-1.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-plum/80" htmlFor="maint-end">
                  Estimated Completion / Resume Time (Optional)
                </label>
                <input
                  id="maint-end"
                  type="datetime-local"
                  value={maintenance.endTime}
                  onChange={(e) => setMaintenance({ ...maintenance, endTime: e.target.value })}
                  className="field mt-1.5 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Live Preview of Landing Page Banner */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider mb-2">
                Live Visitor Preview:
              </p>
              <div className="rounded-xl border border-amber-400 bg-amber-100 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold">
                    {maintenance.enabled ? 'Scheduled Maintenance in Progress' : 'Maintenance Mode Inactive (Online)'}
                  </p>
                  <p className="mt-1 text-amber-800">{maintenance.message}</p>
                  {maintenance.endTime && (
                    <p className="mt-1 text-xs font-medium text-amber-900">
                      Estimated resume time: {new Date(maintenance.endTime).toLocaleString()}
                    </p>
                  )}
                  {maintenanceCovers(maintenance, 'letters') && maintenance.lockButton && (
                    <p className="mt-2 text-xs font-bold text-amber-950">
                      🔒 The &quot;Start&quot; button on the landing page is locked.
                    </p>
                  )}
                  {maintenanceCovers(maintenance, 'board') && (
                    <p className="mt-2 text-xs font-bold text-amber-950">
                      🔒 Pinning notes on the board is paused.
                    </p>
                  )}
                  {maintenance.enabled &&
                    (maintenance.scope || 'all') === 'letters' &&
                    !maintenance.lockButton && (
                      <p className="mt-2 text-xs font-medium text-amber-900">
                        The notice is shown, but letter creation stays open.
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Submit / Save Button */}
            <div className="flex items-center justify-between pt-2">
              {maintSaved ? (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  ✓ Maintenance settings saved successfully!
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                className="rounded-full bg-seal px-8 py-3 font-medium text-petal hover:brightness-110 shadow-xs"
              >
                Save Maintenance Settings
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: Update Logs Management */}
      {tab === 'logs' && (
        <section className="mt-8 space-y-8 tab-in">
          <div className="rounded-3xl border border-plum/20 bg-white/70 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-plum/10 pb-4">
              <div>
                <h2 className="font-display text-2xl font-light text-plum">Release Notes & Update Logs</h2>
                <p className="mt-1 text-xs text-plum/65">
                  Update the release log entries shown in the header modal (features, UI improvements, and bug fixes).
                </p>
              </div>

              <button
                type="button"
                onClick={showAddLog ? closeAddForm : openNewLog}
                className="rounded-full bg-seal px-5 py-2.5 text-xs font-medium text-petal hover:brightness-110 shadow-xs flex items-center gap-1.5"
              >
                <span>{showAddLog ? '✕ Cancel' : '+ Add New Release'}</span>
              </button>
            </div>

            {logsSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                ✓ Update logs saved and published to visitors!
              </div>
            )}

            {/* Add New Release Form */}
            {showAddLog && (
              <form onSubmit={handleAddLog} className="rounded-2xl border border-plum/25 bg-white p-5 space-y-4">
                <h3 className="font-semibold text-sm text-plum">Create New Release Note</h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-plum/80" htmlFor="log-v">
                      Version Tag
                    </label>
                    <input
                      id="log-v"
                      value={newLog.version}
                      onChange={(e) => setNewLog({ ...newLog, version: e.target.value })}
                      placeholder="e.g. v1.3.0"
                      required
                      className="field mt-1 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-plum/80" htmlFor="log-title">
                      Release Title
                    </label>
                    <input
                      id="log-title"
                      value={newLog.title}
                      onChange={(e) => setNewLog({ ...newLog, title: e.target.value })}
                      placeholder="e.g. Winter Themes & Sound Effects"
                      required
                      className="field mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-800" htmlFor="log-feat">
                    🚀 New Features (One per line)
                  </label>
                  <textarea
                    id="log-feat"
                    rows={3}
                    value={newLog.features}
                    onChange={(e) => setNewLog({ ...newLog, features: e.target.value })}
                    placeholder="Describe new features, one per line..."
                    className="field mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-800" htmlFor="log-ui">
                    🎨 UI Enhancements (One per line)
                  </label>
                  <textarea
                    id="log-ui"
                    rows={3}
                    value={newLog.ui}
                    onChange={(e) => setNewLog({ ...newLog, ui: e.target.value })}
                    placeholder="Describe UI improvements, one per line..."
                    className="field mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-rose-800" htmlFor="log-fixes">
                    🐛 Bugs Fixed (One per line)
                  </label>
                  <textarea
                    id="log-fixes"
                    rows={3}
                    value={newLog.fixes}
                    onChange={(e) => setNewLog({ ...newLog, fixes: e.target.value })}
                    placeholder="Describe bug fixes, one per line..."
                    className="field mt-1 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddForm}
                    className="rounded-full border border-plum/30 px-5 py-2 text-xs text-plum hover:bg-plum/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-seal px-6 py-2 text-xs font-medium text-petal hover:brightness-110 shadow-xs"
                  >
                    Publish Release Note
                  </button>
                </div>
              </form>
            )}

            {/* Existing Release Logs List */}
            <div className="space-y-6">
              {logs.map((log) => (
                <div
                  key={log.id || log.version}
                  className="rounded-2xl border border-plum/15 bg-white/50 p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-plum/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-seal px-2.5 py-0.5 text-xs font-bold text-petal">
                        {log.version}
                      </span>
                      <h4 className="font-semibold text-plum">{log.title}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-plum/60">{log.date}</span>
                      <button
                        type="button"
                        onClick={() => startEditLog(log)}
                        className="rounded-full border border-plum/30 bg-white/60 px-3 py-1 text-xs font-medium text-plum transition-colors hover:bg-white"
                        title="Edit this log entry"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-xs text-rose-700 underline hover:text-rose-900"
                        title="Delete log entry"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                    {/* Features */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <span className="font-bold text-emerald-800">🚀 Features ({log.features?.length || 0})</span>
                      <ul className="mt-1 list-disc pl-4 space-y-1 text-plum/80">
                        {log.features?.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    {/* UI */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                      <span className="font-bold text-indigo-800">🎨 UI ({log.ui?.length || 0})</span>
                      <ul className="mt-1 list-disc pl-4 space-y-1 text-plum/80">
                        {log.ui?.map((u, i) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Fixes */}
                    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                      <span className="font-bold text-rose-800">🐛 Fixes ({log.fixes?.length || 0})</span>
                      <ul className="mt-1 list-disc pl-4 space-y-1 text-plum/80">
                        {log.fixes?.map((fx, i) => (
                          <li key={i}>{fx}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {editingLog && (
        <LogEditorModal log={editingLog} onSave={saveEditedLog} onClose={() => setEditingLog(null)} />
      )}
    </main>
  );
}
