// Uke- og månedsmål. Målene gjentas hver periode, og fremdriften regnes ut fra
// det som faktisk er registrert (plan, kondisjon, smerte) – bare «manuelle» mål
// telles med egne kryss.

import { getAll, put, del, newId, nowISO } from './db.js';
import { periodRange, shiftPeriod, keyOfISO, todayKey } from './dates.js';
import { categoryName } from './planner.js';
import { regionLabel } from './regions.js';

export const GOAL_KINDS = [
  { id: 'plan', name: 'Dager med fullført plan', hint: 'Teller dager der du har haket av minst ett punkt i valgt kategori.' },
  { id: 'cardio', name: 'Kondisjonsøkter', hint: 'Teller loggførte kondisjonsøkter.' },
  { id: 'minutes', name: 'Minutter kondisjon', hint: 'Summerer varigheten på loggførte økter.' },
  { id: 'pain', name: 'Smerte under en grense', hint: 'Sjekker siste registrerte smerte for en kroppsdel.' },
  { id: 'manual', name: 'Egen telling', hint: 'Du krysser av selv hver gang.' },
];

export async function getGoals() {
  return (await getAll('goals')).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export function saveGoal(goal) {
  return put('goals', {
    id: goal.id || newId(),
    createdAt: goal.createdAt || nowISO(),
    period: goal.period,
    kind: goal.kind,
    title: goal.title.trim(),
    target: goal.target,
    category: goal.kind === 'plan' ? goal.category || 'strength' : null,
    regionId: goal.kind === 'pain' ? goal.regionId : null,
    ticks: goal.ticks || [],
  });
}

export const deleteGoal = (id) => del('goals', id);

/** Legger til (+1) eller fjerner (−1) et kryss på et manuelt mål i inneværende periode. */
export function tickGoal(goal, delta, day = todayKey()) {
  const ticks = [...(goal.ticks || [])];
  if (delta > 0) ticks.push(day);
  else {
    const { start, end } = periodRange(goal.period, day);
    let index = -1;
    ticks.forEach((t, i) => { if (t >= start && t <= end) index = i; });
    if (index >= 0) ticks.splice(index, 1);
  }
  return put('goals', { ...goal, ticks });
}

/** Forslag til tittel når brukeren ikke har skrevet en selv. */
export function defaultTitle(goal) {
  const n = goal.target;
  switch (goal.kind) {
    case 'plan': return `${categoryName(goal.category)} ${n} dager`;
    case 'cardio': return `${n} kondisjonsøkter`;
    case 'minutes': return `${n} min kondisjon`;
    case 'pain': return `${regionLabel(goal.regionId)}: smerte ${n} eller lavere`;
    default: return `${n} ganger`;
  }
}

/**
 * Fremdrift for et mål i perioden rundt `day`.
 * data: { planItems, sessions, scores }
 * Returnerer { value, target, ratio (0–1), done, text, hasData }
 */
export function goalProgress(goal, day, data) {
  const { start, end } = periodRange(goal.period, day);
  const inPeriod = (key) => key >= start && key <= end;
  const target = goal.target;

  if (goal.kind === 'pain') {
    // Siste registrering til og med periodens slutt.
    const latest = data.scores.find((s) => s.regionId === goal.regionId && s.pain !== null && keyOfISO(s.at) <= end);
    if (!latest) return { value: null, target, ratio: 0, done: false, hasData: false, text: 'Ingen registrering ennå' };
    const done = latest.pain <= target;
    const ratio = done ? 1 : Math.max(0.08, Math.min(0.95, target / latest.pain || 0.08));
    return { value: latest.pain, target, ratio, done, hasData: true, text: `Nå ${latest.pain} · mål ≤ ${target}` };
  }

  let value = 0;
  let unit = '';
  if (goal.kind === 'plan') {
    const days = new Set(data.planItems.filter((i) => i.done && i.category === goal.category && inPeriod(i.date)).map((i) => i.date));
    value = days.size;
    unit = 'dager';
  } else if (goal.kind === 'cardio') {
    value = data.sessions.filter((s) => inPeriod(keyOfISO(s.at))).length;
    unit = 'økter';
  } else if (goal.kind === 'minutes') {
    value = data.sessions.filter((s) => inPeriod(keyOfISO(s.at))).reduce((sum, s) => sum + (s.durationMin || 0), 0);
    unit = 'min';
  } else {
    value = (goal.ticks || []).filter(inPeriod).length;
    unit = 'ganger';
  }
  return { value, target, ratio: Math.min(1, target ? value / target : 0), done: value >= target, hasData: true, text: `${value} av ${target} ${unit}` };
}

/** Om målet ble nådd i de `count` foregående periodene (eldste først). */
export function goalHistory(goal, day, data, count = 4) {
  const out = [];
  for (let i = count; i >= 1; i--) {
    const ref = shiftPeriod(goal.period, day, -i);
    const { end } = periodRange(goal.period, ref);
    if (end < keyOfISO(goal.createdAt)) continue; // målet fantes ikke ennå
    out.push({ ref, done: goalProgress(goal, ref, data).done });
  }
  return out;
}
