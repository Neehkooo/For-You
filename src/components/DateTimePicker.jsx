// Dropdown-only date and time picker: nothing has to be typed.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

export default function DateTimePicker({ value, onChange, minValue }) {
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

  const now = new Date();
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() + i);
  if (!years.includes(year)) years.push(year);
  const days = Array.from({ length: daysIn(year, month) }, (_, i) => i + 1);

  const sel = 'field !w-auto !py-2 !px-3 cursor-pointer';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-plum/70">Month
          <select className={`${sel} mt-1 w-full`} value={month}
            onChange={(e) => build(year, Number(e.target.value), day, hour24, minute)}>
            {MONTHS.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
        <label className="text-xs text-plum/70">Day
          <select className={`${sel} mt-1 w-full`} value={day}
            onChange={(e) => build(year, month, Number(e.target.value), hour24, minute)}>
            {days.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-xs text-plum/70">Year
          <select className={`${sel} mt-1 w-full`} value={year}
            onChange={(e) => build(Number(e.target.value), month, day, hour24, minute)}>
            {years.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-plum/70">Hour
          <select className={`${sel} mt-1 w-full`} value={hour12}
            onChange={(e) => build(year, month, day, (Number(e.target.value) % 12) + (period === 'PM' ? 12 : 0), minute)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="text-xs text-plum/70">Minute
          <select className={`${sel} mt-1 w-full`} value={minute}
            onChange={(e) => build(year, month, day, hour24, Number(e.target.value))}>
            {Array.from({ length: 60 }, (_, i) => i).map((n) => <option key={n} value={n}>{String(n).padStart(2, '0')}</option>)}
          </select>
        </label>
        <label className="text-xs text-plum/70">Period
          <select className={`${sel} mt-1 w-full`} value={period}
            onChange={(e) => build(year, month, day, (hour12 % 12) + (e.target.value === 'PM' ? 12 : 0), minute)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      </div>

      <p className="text-sm text-plum/80">
        Opens on <span className="font-medium">{d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</span>
        {minValue && value < minValue ? <span className="text-red-700"> · that time has passed</span> : null}
      </p>
    </div>
  );
}
