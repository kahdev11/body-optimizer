// Datohjelpere. En «dagnøkkel» er lokal dato som 'YYYY-MM-DD'. Uker starter mandag.

const pad = (n) => String(n).padStart(2, '0');

export const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayKey = () => toKey(new Date());

/** Lokal midnatt for en dagnøkkel. */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Dagnøkkel for et ISO-tidsstempel (i lokal tid). */
export const keyOfISO = (iso) => toKey(new Date(iso));

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Mandagen i uken som inneholder dagen. */
export function startOfWeek(key) {
  const d = fromKey(key);
  const weekday = (d.getDay() + 6) % 7; // mandag = 0
  d.setDate(d.getDate() - weekday);
  return toKey(d);
}

export const startOfMonth = (key) => `${key.slice(0, 7)}-01`;

export function addMonths(key, n) {
  const d = fromKey(startOfMonth(key));
  d.setMonth(d.getMonth() + n);
  return toKey(d);
}

export function endOfMonth(key) {
  return addDays(addMonths(key, 1), -1);
}

/** { start, end } (dagnøkler, begge inkludert) for uken eller måneden rundt en dag. */
export function periodRange(period, key) {
  if (period === 'month') return { start: startOfMonth(key), end: endOfMonth(key) };
  const start = startOfWeek(key);
  return { start, end: addDays(start, 6) };
}

export const shiftPeriod = (period, key, n) => (period === 'month' ? addMonths(key, n) : addDays(startOfWeek(key), 7 * n));

/** ISO-ukenummer. */
export function weekNumber(key) {
  const d = fromKey(key);
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
}

const fmt = (options) => new Intl.DateTimeFormat('nb-NO', options);
const F_LONG = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const F_SHORT = fmt({ day: 'numeric', month: 'short' });
const F_MONTH = fmt({ month: 'long', year: 'numeric' });
const F_MONTH_SHORT = fmt({ month: 'short' });

export const formatLong = (key) => F_LONG.format(fromKey(key));
export const formatShort = (key) => F_SHORT.format(fromKey(key));
export const formatMonth = (key) => F_MONTH.format(fromKey(key));
export const formatMonthShort = (key) => F_MONTH_SHORT.format(fromKey(key)).replace('.', '');

export function periodLabel(period, key) {
  if (period === 'month') {
    const m = formatMonth(key);
    return m.charAt(0).toUpperCase() + m.slice(1);
  }
  const { start, end } = periodRange('week', key);
  return `Uke ${weekNumber(start)} · ${formatShort(start)}–${formatShort(end)}`;
}

/** 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">. */
export const toLocalInput = (date) => `${toKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function fromLocalInput(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Tidsstempel for en registrering på en gitt dag: nå hvis i dag, ellers kl. 12 den dagen. */
export function isoForDay(key) {
  if (key === todayKey()) return new Date().toISOString();
  const d = fromKey(key);
  d.setHours(12);
  return d.toISOString();
}
