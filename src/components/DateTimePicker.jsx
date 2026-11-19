import { useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

function formatRelative(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return 'that time has passed';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins} min${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}${remMins > 0 ? ` ${remMins} min` : ''}`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `in ${days} day${days === 1 ? '' : 's'}${remHours > 0 ? ` ${remHours} hr` : ''}`;
}

const toLocalISO = (timestamp) => {
  const d = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DateTimePicker({ value, onChange, minValue }) {
  const [useNative, setUseNative] = useState(false);
  const d = new Date(value);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  const hour24 = d.getHours();
  const minute = d.getMinutes();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? 'PM' : 'AM';

  const build = (y, m, dd, h24, mi) => {
    const clampedDay = Math.min(dd, daysIn(y, m));
    onChange(new Date(y, m, clampedDay, h24, mi, 0, 0).getTime());
  };

  const applyPreset = (offsetDays, hour = 9, min = 0) => {
    const t = new Date();
    t.setDate(t.getDate() + offsetDays);
    t.setHours(hour, min, 0, 0);
    onChange(t.getTime());
  };

  const now = new Date();
  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() + i);
  if (!years.includes(year)) {
    years.push(year);
    years.sort((a, b) => a - b);
  }
  const days = Array.from({ length: daysIn(year, month) }, (_, i) => i + 1);

  const sel = 'field !w-auto !py-2 !px-3 cursor-pointer text-sm';
  const isPast = minValue && value < minValue;

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div>
        <span className="block text-xs font-medium text-plum/70">Quick Presets</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset(1, 9, 0)}
            className="rounded-full border border-plum/30 bg-white/40 px-3 py-1 text-xs hover:bg-white/80"
          >
            Tomorrow (9 AM)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(3, 9, 0)}
            className="rounded-full border border-plum/30 bg-white/40 px-3 py-1 text-xs hover:bg-white/80"
          >
            In 3 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7, 9, 0)}
            className="rounded-full border border-plum/30 bg-white/40 px-3 py-1 text-xs hover:bg-white/80"
          >
            In 1 Week
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30, 9, 0)}
            className="rounded-full border border-plum/30 bg-white/40 px-3 py-1 text-xs hover:bg-white/80"
          >
            In 1 Month
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center justify-between border-t border-plum/10 pt-2 text-xs">
        <span className="text-plum/60">{useNative ? 'Using browser calendar' : 'Using dropdowns'}</span>
        <button
          type="button"
          onClick={() => setUseNative(!useNative)}
          className="text-seal underline underline-offset-2 hover:opacity-80"
        >
          {useNative ? 'Switch to dropdowns' : 'Switch to calendar view'}
        </button>
      </div>

      {useNative ? (
        <div>
          <label className="block text-xs text-plum/70">
            Pick Date & Time
            <input
              type="datetime-local"
              value={toLocalISO(value)}
              min={toLocalISO(minValue || Date.now() + 60000)}
              onChange={(e) => {
                const ms = new Date(e.target.value).getTime();
                if (!Number.isNaN(ms)) onChange(ms);
              }}
              className="field mt-1.5 w-full cursor-pointer"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-plum/70">
              Month
              <select
                className={`${sel} mt-1 w-full`}
                value={month}
                onChange={(e) => build(year, Number(e.target.value), day, hour24, minute)}
              >
                {MONTHS.map((n, i) => (
                  <option key={n} value={i}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-plum/70">
              Day
              <select
                className={`${sel} mt-1 w-full`}
                value={day}
                onChange={(e) => build(year, month, Number(e.target.value), hour24, minute)}
              >
                {days.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-plum/70">
              Year
              <select
                className={`${sel} mt-1 w-full`}
                value={year}
                onChange={(e) => build(Number(e.target.value), month, day, hour24, minute)}
              >
                {years.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-plum/70">
              Hour
              <select
                className={`${sel} mt-1 w-full`}
                value={hour12}
                onChange={(e) =>
                  build(year, month, day, (Number(e.target.value) % 12) + (period === 'PM' ? 12 : 0), minute)
                }
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-plum/70">
              Minute
              <select
                className={`${sel} mt-1 w-full`}
                value={minute}
                onChange={(e) => build(year, month, day, hour24, Number(e.target.value))}
              >
                {Array.from({ length: 60 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-plum/70">
              Period
              <select
                className={`${sel} mt-1 w-full`}
                value={period}
                onChange={(e) =>
                  build(year, month, day, (hour12 % 12) + (e.target.value === 'PM' ? 12 : 0), minute)
                }
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Date display & Relative time badge */}
      <div className="rounded-lg bg-white/30 p-2.5 text-xs text-plum/80">
        Opens on: <span className="font-semibold text-plum">{d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</span>
        {isPast ? (
          <span className="ml-2 font-medium text-red-600">· That time has passed. Please choose a future time.</span>
        ) : (
          <span className="ml-2 inline-block rounded bg-seal/10 px-1.5 py-0.5 text-[11px] font-medium text-seal">
            {formatRelative(value)}
          </span>
        )}
      </div>
    </div>
  );
}
