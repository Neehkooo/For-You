// Version 1.3 feature gate.
// Everything shipped in v1.3 stays time-locked until November 30, 2026 at 5:00 AM
// (local time on the visitor's clock) and becomes available automatically afterwards.
import { useEffect, useState } from 'react';

// new Date(y, monthIndex, day, hour, minute) -> 30 Nov 2026, 05:00 local time
export const V13_UNLOCK_AT = new Date(2026, 10, 30, 5, 0, 0, 0).getTime();

export const V13_UNLOCK_LABEL = new Date(V13_UNLOCK_AT).toLocaleString(undefined, {
  dateStyle: 'long',
  timeStyle: 'short',
});

export const isV13Unlocked = (now = Date.now()) => now >= V13_UNLOCK_AT;

// v1.3 additions, listed in the update log.
export const V13_THEME_IDS = new Set([
  'lavender', 'sunset', 'ocean', 'matcha', 'cherry', 'golden', 'starlight', 'aurora',
]);
export const V13_FONT_IDS = new Set([
  'parisienne', 'alex', 'sacramento', 'satisfy', 'marck', 'homemade', 'shadows',
]);
export const V13_TEMPLATE_IDS = new Set(['anim_hearts', 'anim_stars', 'anim_petals', 'anim_snow']);

// "4d 06h 12m 09s" until the v1.3 release opens.
export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// Snowman delivery: a seasonal presentation that can only be picked for 15 days,
// starting December 15, 2026 (local midnight). Letters already sent with it still open afterwards.
export const SNOWMAN_DAYS = 15;
export const SNOWMAN_START_AT = new Date(2026, 11, 15, 0, 0, 0, 0).getTime();
export const SNOWMAN_END_AT = SNOWMAN_START_AT + SNOWMAN_DAYS * 24 * 60 * 60 * 1000;
export const SNOWMAN_START_LABEL = new Date(SNOWMAN_START_AT).toLocaleDateString(undefined, {
  dateStyle: 'long',
});
export const SNOWMAN_END_LABEL = new Date(SNOWMAN_END_AT - 1).toLocaleDateString(undefined, {
  dateStyle: 'long',
});

export const isSnowmanAvailable = (now = Date.now()) => now >= SNOWMAN_START_AT && now < SNOWMAN_END_AT;

// Ticks once per second while the snowman is still unavailable.
export function useSnowmanWindow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isSnowmanAvailable()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return {
    available: isSnowmanAvailable(now),
    before: now < SNOWMAN_START_AT,
    remaining: now < SNOWMAN_START_AT ? SNOWMAN_START_AT - now : Math.max(0, SNOWMAN_END_AT - now),
  };
}

// Ticks once per second while the release is still locked.
export function useV13Unlock() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (isV13Unlocked()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return {
    unlocked: isV13Unlocked(now),
    remaining: Math.max(0, V13_UNLOCK_AT - now),
  };
}
