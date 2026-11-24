import { useMemo } from 'react';

// Purely decorative gentle snowfall animation behind the whole site.
export default function Snowflakes() {
  const flakes = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 18 : 32;
    return Array.from({ length: count }, (_, i) => {
      const size = 8 + Math.random() * 20;
      const dur = 9 + Math.random() * 12;
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        size,
        dur,
        delay: -Math.random() * dur, // negative delay so snow is already falling
        sway: 15 + Math.random() * 45,
        opacity: 0.35 + Math.random() * 0.45,
        type: i % 3, // 0: crystal, 1: star dot, 2: six-branch flake
      };
    });
  }, []);

  return (
    <div className="snowflakes" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake"
          style={{
            left: f.left,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            '--dur': `${f.dur}s`,
            '--sway': `${f.sway}px`,
            animationDelay: `${f.delay}s`,
          }}
        >
          {f.type === 0 ? '❄' : f.type === 1 ? '✦' : '❅'}
        </span>
      ))}
    </div>
  );
}
