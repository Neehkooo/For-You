import { useNav } from '../lib/nav.js';
import logo from '../assets/logo.png';

export default function Header({ route }) {
  const { go } = useNav();
  return (
    <header className="sticky top-0 z-20 border-b border-plum/10 bg-white/35 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button type="button" onClick={() => go('')} className="flex items-center gap-2.5 rounded-lg px-1 py-1" aria-label="For You home">
          <span aria-hidden="true" className="brand-badge"><img src={logo} alt="" className="h-full w-full object-contain" /></span>
          <span className="font-display text-2xl italic tracking-tight text-plum">For You</span>
        </button>
        <nav className="flex items-center gap-2 text-sm" aria-label="Main">
          {route !== 'home' && (
            <button type="button" onClick={() => go('')} className="px-3 py-1.5 text-plum/70 hover:text-plum">Home</button>
          )}
          {route !== 'write' && (
            <button type="button" onClick={() => go('#write')}
              className="rounded-full border border-plum/30 px-4 py-1.5 hover:bg-white/60">Write a letter</button>
          )}
        </nav>
      </div>
    </header>
  );
}
