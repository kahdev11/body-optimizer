// Datalag for kondisjonsøkter og kroppsmålinger (vekt, midje, høyde).

import { getAll, put, del, newId, nowISO, getMeta, setMeta } from './db.js';

export const CARDIO_TYPES = [
  { id: 'run', name: 'Løp', distance: true },
  { id: 'intervals', name: 'Intervaller', distance: true },
  { id: 'bike', name: 'Sykkel', distance: true },
  { id: 'swim', name: 'Svømming', distance: true },
  { id: 'handball', name: 'Håndballtrening', distance: false },
  { id: 'match', name: 'Kamp', distance: false },
];

export const cardioTypeName = (id) => (CARDIO_TYPES.find((t) => t.id === id) || { name: id }).name;

const byTimeDesc = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

// ---------- Kondisjon ----------

export async function getSessions() {
  return (await getAll('cardio')).sort(byTimeDesc);
}

export function addSession({ at, type, durationMin, distanceKm, rpe, hr, note }) {
  return put('cardio', {
    id: newId(),
    at: at || nowISO(),
    type,
    durationMin: num(durationMin),
    distanceKm: num(distanceKm),
    rpe: num(rpe),
    hr: num(hr),
    note: (note || '').trim(),
  });
}

export const deleteSession = (id) => del('cardio', id);

/** Belastning for én økt: minutter × opplevd anstrengelse (RPE). Uten RPE regnes 5. */
export const sessionLoad = (s) => (s.durationMin || 0) * (s.rpe || 5);

export function formatPace(s) {
  if (!s.distanceKm || !s.durationMin || !['run', 'intervals'].includes(s.type)) return '';
  const perKm = s.durationMin / s.distanceKm;
  const min = Math.floor(perKm);
  const sec = Math.round((perKm - min) * 60);
  return `${sec === 60 ? min + 1 : min}:${String(sec === 60 ? 0 : sec).padStart(2, '0')} /km`;
}

export function sessionSummary(s) {
  const parts = [];
  if (s.durationMin) parts.push(`${s.durationMin} min`);
  if (s.distanceKm) parts.push(`${String(s.distanceKm).replace('.', ',')} km`);
  const pace = formatPace(s);
  if (pace) parts.push(pace);
  if (s.rpe) parts.push(`RPE ${s.rpe}`);
  if (s.hr) parts.push(`${s.hr} slag/min`);
  return parts.join(' · ');
}

// ---------- Målinger ----------

export async function getMeasurements() {
  return (await getAll('measurements')).sort(byTimeDesc);
}

export function addMeasurement({ at, weightKg, waistCm }) {
  return put('measurements', { id: newId(), at: at || nowISO(), weightKg: num(weightKg), waistCm: num(waistCm) });
}

export const deleteMeasurement = (id) => del('measurements', id);

export async function getHeightCm() {
  const profile = await getMeta('profile', {});
  return profile.heightCm || null;
}

export async function setHeightCm(heightCm) {
  const profile = await getMeta('profile', {});
  await setMeta('profile', { ...profile, heightCm: num(heightCm) });
}

export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Generell BMI-kategori (WHO). Sier lite om muskuløse idrettsutøvere. */
export function bmiCategory(value) {
  if (value === null) return '';
  if (value < 18.5) return 'Undervekt';
  if (value < 25) return 'Normalvekt';
  if (value < 30) return 'Overvekt';
  return 'Fedme';
}

export const formatNumber = (value, digits = 1) =>
  new Intl.NumberFormat('nb-NO', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

/** Tolker «82,5» og «82.5». */
export function parseNumber(text) {
  const value = parseFloat(String(text).replace(',', '.').trim());
  return Number.isFinite(value) ? value : null;
}
