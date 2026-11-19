import { useEffect, useState } from 'react';

export default function CountdownTimer({ targetTime, onUnlock }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= targetTime && onUnlock) {
        clearInterval(timer);
        onUnlock();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onUnlock]);

  const diff = Math.max(0, targetTime - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: String(hours).padStart(2, '0') },
    { label: 'Minutes', value: String(minutes).padStart(2, '0') },
    { label: 'Seconds', value: String(seconds).padStart(2, '0') },
  ];

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-4">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex min-w-[4.2rem] flex-col items-center justify-center rounded-xl border border-plum/20 bg-white/70 px-2 py-2.5 shadow-sm backdrop-blur-sm sm:min-w-[4.8rem]"
        >
          <span className="font-display text-2xl font-semibold text-plum sm:text-3xl">
            {u.value}
          </span>
          <span className="mt-0.5 text-[10px] font-medium tracking-wider text-plum/60 uppercase">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}
