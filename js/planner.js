// Datalag for dagbok og dagens plan (avkrysningsliste).

import { get, getAll, put, del, newId, nowISO } from './db.js';

export const CATEGORIES = [
  { id: 'strength', name: 'Styrke' },
  { id: 'stretch', name: 'Tøying' },
  { id: 'cardio', name: 'Kondis' },
  { id: 'other', name: 'Annet' },
];

export const categoryName = (id) => (CATEGORIES.find((c) => c.id === id) || CATEGORIES[3]).name;

// ---------- Dagens plan ----------

const byOrder = (a, b) => a.order - b.order || (a.createdAt < b.createdAt ? -1 : 1);

export async function getAllPlanItems() {
  return getAll('planItems');
}

export async function getPlan(date) {
  return (await getAllPlanItems()).filter((i) => i.date === date).sort(byOrder);
}

/** Legger til ett punkt. detail er valgfri tekst som «3 × 10». */
export async function addPlanItem({ date, title, category = 'other', detail = '', sourceId = null }) {
  const existing = await getPlan(date);
  return put('planItems', {
    id: newId(),
    date,
    title: title.trim(),
    detail: (detail || '').trim(),
    category,
    sourceId,
    done: false,
    doneAt: null,
    order: existing.length ? Math.max(...existing.map((i) => i.order)) + 1 : 0,
    createdAt: nowISO(),
  });
}

export async function addPlanItems(date, items) {
  const added = [];
  for (const item of items) added.push(await addPlanItem({ ...item, date }));
  return added;
}

export function setPlanItemDone(item, done) {
  return put('planItems', { ...item, done, doneAt: done ? nowISO() : null });
}

export const deletePlanItem = (id) => del('planItems', id);

/** Siste dag før `date` som har en plan – brukes til «kopier forrige plan». */
export async function previousPlan(date) {
  const all = await getAllPlanItems();
  const days = [...new Set(all.filter((i) => i.date < date).map((i) => i.date))].sort();
  const last = days[days.length - 1];
  return last ? { date: last, items: all.filter((i) => i.date === last).sort(byOrder) } : null;
}

// ---------- Dagbok ----------

export async function getDiary(date) {
  const row = await get('diary', date);
  return row ? row.text : '';
}

export async function getAllDiary() {
  return getAll('diary');
}

/** Ett notat per dag. Tom tekst fjerner notatet. */
export async function saveDiary(date, text) {
  if (!text.trim()) {
    if (await get('diary', date)) await del('diary', date);
    return;
  }
  await put('diary', { date, text });
}
