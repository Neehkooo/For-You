import { useCallback, useEffect, useReducer, useState } from 'react';
import Landing from './pages/Landing.jsx';
import Create from './pages/Create.jsx';
import Open from './pages/Open.jsx';
import Admin from './pages/Admin.jsx';
import Hearts from './components/Hearts.jsx';
import Header from './components/Header.jsx';
import { NavContext } from './lib/nav.js';
import { recordVisit } from './lib/admin.js';

// Routes:  ""  -> home,  "#write" -> editor,  "#l-<box>-<token>" -> long link,
//          "/l/<id>" (path) -> short link, stored on the server.
//          "#admin" -> admin dashboard
const shortIdFromPath = () => {
  const m = window.location.pathname.match(/^\/l\/([A-Za-z0-9]{6,16})\/?$/);
  return m ? m[1] : null;
};

export default function App() {
  // `forced` is set by in-app navigation; null means "follow the address bar".
  const [forced, setForced] = useState(null);
  const [, refresh] = useReducer((x) => x + 1, 0);

  // Record visit once per session
  useEffect(() => {
    recordVisit();
  }, []);

  useEffect(() => {
    const reset = () => { setForced(null); refresh(); };
    window.addEventListener('hashchange', reset);
    window.addEventListener('popstate', reset);
    return () => {
      window.removeEventListener('hashchange', reset);
      window.removeEventListener('popstate', reset);
    };
  }, []);

  const go = useCallback((target) => {
    setForced(target);
    try { window.history.pushState(null, '', target || window.location.pathname); } catch { /* sandboxed: in-app state only */ }
  }, []);

  const shortId = shortIdFromPath();
  const addressTarget = window.location.hash || (shortId ? `#s-${shortId}` : '');
  const target = forced !== null ? forced : addressTarget;
  const [shown, setShown] = useState(target);
  const [leaving, setLeaving] = useState(false);

  // Fade the current page out, swap, then fade the next one in.
  useEffect(() => {
    if (target === shown) { setLeaving(false); return; }
    setLeaving(true);
    const t = setTimeout(() => { setShown(target); setLeaving(false); window.scrollTo(0, 0); }, 300);
    return () => clearTimeout(t);
  }, [target, shown]);

  const route = shown === '#admin' ? 'admin' : shown.startsWith('#l-') ? 'long' : shown.startsWith('#s-') ? 'short' : shown === '#write' ? 'write' : 'home';
  const page =
    route === 'admin' ? <Admin onExit={() => go('')} /> :
    route === 'long' ? <Open token={shown.slice(3)} /> :
    route === 'short' ? <Open shortId={shown.slice(3)} /> :
    route === 'write' ? <Create /> :
    <Landing />;

  const headerRoute = route === 'long' || route === 'short' ? 'open' : route;

  return (
    <NavContext.Provider value={{ go }}>
      <div className="flex min-h-screen flex-col">
        <Hearts />
        <Header route={headerRoute} onAdminOpen={() => go('#admin')} />
        <div key={route} className={`flex-1 ${leaving ? 'page-out' : 'page-in'}`}>{page}</div>
        <footer className="px-6 py-6 text-center text-sm text-plum/70">
          All rights reserved 2026 | by: Neeehkooo
        </footer>
      </div>
    </NavContext.Provider>
  );
}
