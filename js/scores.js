// Datalag for kroppsscorer og hodepine. Hver registrering er en egen post med
// tidsstempel – ingenting overskrives, slik at historikk og trender bevares.

import { getAll, put, del, newId, nowISO } from './db.js';

export const DIMENSIONS = [
  { id: 'pain', name: 'Smerte', min: 0, max: 10, lowLabel: 'Ingen', highLabel: 'Verst tenkelig' },
  { id: 'strength', name: 'Styrke', min: 1, max: 10, lowLabel: 'Svak', highLabel: 'Sterk' },
  { id: 'mobility', name: 'Bevegelighet', min: 1, max: 10, lowLabel: 'Stiv', highLabel: 'Bevegelig' },
];

export const PAIN_TYPES = [
  { id: 'stiff', name: 'Stiv' },
  { id: 'aching', name: 'Verkende' },
  { id: 'stabbing', name: 'Stikkende' },
  { id: 'sharp', name: 'Skarp' },
];

export const HEADACHE_KINDS = [
  { id: 'pressing', name: 'Trykkende' },
  { id: 'pulsating', name: 'Pulserende' },
  { id: 'stabbing', name: 'Stikkende' },
  { id: 'dull', name: 'Murrende' },
];

export const HEADACHE_LOCATIONS = [
  { id: 'forehead', name: 'Panne' },
  { id: 'temple', name: 'Tinning' },
  { id: 'eyes', name: 'Bak øynene' },
  { id: 'back', name: 'Bakhode' },
  { id: 'neck', name: 'Nakke' },
  { id: 'one_side', name: 'Én side' },
  { id: 'whole', name: 'Hele hodet' },
];

export const HEADACHE_TRIGGERS = [
  { id: 'sleep', name: 'Søvn' },
  { id: 'stress', name: 'Stress' },
  { id: 'screen', name: 'Skjerm' },
  { id: 'neck', name: 'Nakke' },
  { id: 'fluid', name: 'Væske' },
];

export const HEADACHE_DURATIONS = [
  { id: 30, name: '30 min' },
  { id: 60, name: '1 t' },
  { id: 120, name: '2 t' },
  { id: 240, name: '4 t' },
  { id: 480, name: '8 t' },
  { id: 1440, name: 'Hele dagen' },
];

export const nameOf = (list, id) => (list.find((x) => x.id === id) || {}).name || '';

/** Fargenivå (1–5, eller 0 for «ingen smerte») brukt av varmekart og tegnforklaring. */
export function levelOf(dimension, value) {
  if (value === null || value === undefined) return null;
  if (dimension === 'pain') return value === 0 ? 'p0' : `p${Math.ceil(value / 2)}`;
  return `s${Math.ceil(value / 2)}`;
}

const byTimeDesc = (a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---------- Kroppsscorer ----------

/** Alle registreringer, nyeste først. */
export async function getScores() {
  return (await getAll('bodyScores')).sort(byTimeDesc);
}

/** Lagrer en ny registrering. Dimensjoner som ikke er satt lagres som null. */
export function addScore({ regionId, at, strength, mobility, pain, painType, note }) {
  const painValue = numOrNull(pain);
  return put('bodyScores', {
    id: newId(),
    regionId,
    at: at || nowISO(),
    strength: numOrNull(strength),
    mobility: numOrNull(mobility),
    pain: painValue,
    painType: painValue ? painType || null : null,
    note: (note || '').trim(),
  });
}

export const deleteScore = (id) => del('bodyScores', id);

/**
 * Siste kjente verdi per region og dimensjon:
 * Map(regionId -> { pain: { value, at, painType } | undefined, strength: …, mobility: … })
 */
export function latestByRegion(scores) {
  const out = new Map();
  for (const s of scores) {
    // scores er sortert nyeste først, så første treff per dimensjon vinner.
    let entry = out.get(s.regionId);
    if (!entry) out.set(s.regionId, (entry = {}));
    for (const dim of ['pain', 'strength', 'mobility']) {
      if (entry[dim] === undefined && s[dim] !== null && s[dim] !== undefined) {
        entry[dim] = { value: s[dim], at: s.at, painType: dim === 'pain' ? s.painType : undefined };
      }
    }
  }
  return out;
}

// ---------- Hodepine ----------

export async function getHeadaches() {
  return (await getAll('headaches')).sort(byTimeDesc);
}

export function addHeadache({ at, intensity, durationMin, kind, locations, triggers, note }) {
  return put('headaches', {
    id: newId(),
    at: at || nowISO(),
    intensity,
    durationMin: numOrNull(durationMin),
    kind: kind || null,
    locations: locations || [],
    triggers: triggers || [],
    note: (note || '').trim(),
  });
}

export const deleteHeadache = (id) => del('headaches', id);

/** Hodet fargelegges i smertevisningen av siste hodepine de siste 7 dagene. */
export function recentHeadache(headaches, days = 7) {
  const latest = headaches[0];
  if (!latest) return null;
  return Date.now() - new Date(latest.at).getTime() <= days * 86400000 ? latest : null;
}
