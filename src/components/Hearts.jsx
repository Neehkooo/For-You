import { useMemo } from 'react';

const colors = ['#e8a3b1', '#dc8c9d', '#c2415a', '#a3202f', '#9c6fb5', '#b9a7f0'];
const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 4.5 6.4 4.5c2.1 0 3.9 1.2 5.6 3.3 1.7-2.1 3.5-3.3 5.6-3.3 3.7 0 5.5 3.9 4 7.3C19.5 16.4 12 21 12 21z';

// Hearts drift down behind the whole site. Purely decorative, hidden for reduced-motion users.
export default function Hearts() {
  const hearts = useMemo(() => {
    const count = window.innerWidth < 640 ? 16 : 30;
    return Array.from({ length: count }, () => {
      const size = 14 + Math.random() * 34;
      const dur = 14 + Math.random() * 14;
      return {
        left: `${Math.random() * 100}%`,
        width: size,
        color: colors[Math.floor(Math.random() * colors.length)],
        dur,
        delay: -Math.random() * dur, // negative delay: hearts are already mid-fall on load
        sway: 20 + Math.random() * 50,
        opacity: 0.3 + Math.random() * 0.4,
        blur: size > 38 ? 2 : 0,
      };
    });
  }, []);

  return (
    <div className="hearts" aria-hidden="true">
      {hearts.map((h, i) => (
        <svg
          key={i}
          className="heart"
          viewBox="0 0 24 24"
          style={{
            left: h.left,
            width: h.width,
            height: h.width,
            fill: h.color,
            filter: h.blur ? `blur(${h.blur}px)` : undefined,
            '--dur': `${h.dur}s`,
            '--sway': `${h.sway}px`,
            '--o': h.opacity,
            animationDelay: `${h.delay}s`,
          }}
        >
          <path d={HEART} />
        </svg>
      ))}
    </div>
  );
}
