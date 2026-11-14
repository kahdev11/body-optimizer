// «Statistikk»: grafer over tid for kroppsscore, smerte, hodepine, vekt/BMI,
// treningsvolum og måloppnåelse.

import { h, mount, setChildren, card, sectionTitle, segmented } from '../ui.js';
import { lineChart, barChart, emptyChart } from '../charts.js';
import { todayKey, addDays, addMonths, startOfWeek, startOfMonth, endOfMonth, fromKey, keyOfISO, weekNumber, formatShort, formatMonth, formatMonthShort, periodRange } from '../dates.js';
import { getScores, getHeadaches, DIMENSIONS } from '../scores.js';
import { getSessions, getMeasurements, getHeightCm, bmi, formatNumber } from '../training.js';
import { getAllPlanItems } from '../planner.js';
import { getGoals, goalProgress } from '../goals.js';
import { regionLabel } from '../regions.js';
import { refresh } from '../router.js';

const PERIODS = [
  { id: '4w', name: '4 uker', bucket: 'week', count: 4 },
  { id: '3m', name: '3 mnd', bucket: 'week', count: 13 },
  { id: '1y', name: '1 år', bucket: 'month', count: 12 },
];

const state = { period: '3m', region: null };

const SERIES_COLORS = { pain: 'var(--series-2)', strength: 'var(--series-1)', mobility: 'var(--series-3)' };
const shortTime = (ms) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(new Date(ms));
const fullTime = (ms) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms));
const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

/** Uker eller måneder i perioden, eldste først. */
function makeBuckets(period) {
  const today = todayKey();
  const out = [];
  for (let i = period.count - 1; i >= 0; i--) {
    if (period.bucket === 'week') {
      const start = addDays(startOfWeek(today), -7 * i);
      const end = addDays(start, 6);
      const d = fromKey(start);
      out.push({ start, end, label: `${d.getDate()}.${d.getMonth() + 1}`, title: `Uke ${weekNumber(start)} (${formatShort(start)}–${formatShort(end)})` });
    } else {
      const start = addMonths(startOfMonth(today), -i);
      out.push({ start, end: endOfMonth(start), label: formatMonthShort(start), title: formatMonth(start) });
    }
  }
  return out;
}

const inBucket = (b, key) => key >= b.start && key <= b.end;

function chartCard(title, subtitle, chart, extra) {
  return card(h('div', { class: 'chart-head' }, h('h2', {}, title), subtitle ? h('p', { class: 'muted small' }, subtitle) : null), chart, extra || null);
}

export async function renderStats(view) {
  const [scores, headaches, sessions, measurements, height, planItems, goals] = await Promise.all([
    getScores(), getHeadaches(), getSessions(), getMeasurements(), getHeightCm(), getAllPlanItems(), getGoals(),
  ]);

  const period = PERIODS.find((p) => p.id === state.period);
  const buckets = makeBuckets(period);
  const from = buckets[0].start;
  const tMin = fromKey(from).getTime();
  const tMax = Date.now();
  const inPeriod = (iso) => keyOfISO(iso) >= from;
  const unitName = period.bucket === 'week' ? 'uke' : 'måned';

  // ----- Nøkkeltall -----
  const pSessions = sessions.filter((s) => inPeriod(s.at));
  const pPains = scores.filter((s) => s.pain !== null && inPeriod(s.at)).map((s) => s.pain);
  const pHeadaches = headaches.filter((x) => inPeriod(x.at));
  const pDone = planItems.filter((i) => i.done && i.date >= from);
  const avgPain = average(pPains);

  // ----- Kroppsdel -----
  const counts = new Map();
  for (const s of scores) counts.set(s.regionId, (counts.get(s.regionId) || 0) + 1);
  const regionIds = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || regionLabel(a).localeCompare(regionLabel(b), 'nb'));
  if (!state.region || !counts.has(state.region)) state.region = regionIds[0] || null;

  const regionHost = h('div', {});
  const drawRegion = () => {
    if (!state.region) return setChildren(regionHost, emptyChart('Registrer score i kroppskartet for å se utviklingen her.'));
    const mine = scores.filter((s) => s.regionId === state.region && inPeriod(s.at)).reverse();
    const series = DIMENSIONS.map((dim) => ({
      name: dim.name,
      color: SERIES_COLORS[dim.id],
      points: mine.filter((s) => s[dim.id] !== null).map((s) => ({ t: new Date(s.at).getTime(), v: s[dim.id] })),
    }));
    return setChildren(regionHost, lineChart({ series, tMin, tMax, yMin: 0, yMax: 10, formatTime: (t, full) => (full ? fullTime(t) : shortTime(t)) }));
  };
  const regionSelect = regionIds.length
    ? h('select', { class: 'input', 'aria-label': 'Kroppsdel' }, regionIds.map((id) => h('option', { value: id, selected: id === state.region }, regionLabel(id))))
    : null;
  if (regionSelect) regionSelect.addEventListener('change', () => { state.region = regionSelect.value; drawRegion(); });
  drawRegion();

  // ----- Smerte (snitt per uke/måned) -----
  const titleByT = new Map();
  const painPoints = [];
  for (const b of buckets) {
    const values = scores.filter((s) => s.pain !== null && inBucket(b, keyOfISO(s.at))).map((s) => s.pain);
    const t = fromKey(b.start).getTime();
    titleByT.set(t, b.title);
    if (values.length) painPoints.push({ t, v: average(values) });
  }
  const bucketTime = (t, full) => (full ? titleByT.get(t) || fullTime(t) : shortTime(t));

  // ----- Hodepine -----
  const headacheBars = buckets.map((b) => {
    const list = headaches.filter((x) => inBucket(b, keyOfISO(x.at)));
    return { label: b.label, title: b.title, value: list.length, detail: list.length ? `Snitt intensitet ${formatNumber(average(list.map((x) => x.intensity)))}` : '' };
  });

  // ----- Vekt -----
  const weights = measurements.filter((m) => m.weightKg && inPeriod(m.at)).reverse();
  const weightPoints = weights.map((m) => ({ t: new Date(m.at).getTime(), v: m.weightKg }));
  const weightChange = weights.length > 1 ? weights[weights.length - 1].weightKg - weights[0].weightKg : null;
  const latestWeight = measurements.find((m) => m.weightKg);
  const latestBmi = bmi(latestWeight && latestWeight.weightKg, height);

  // ----- Treningsvolum -----
  const minuteBars = buckets.map((b) => {
    const list = sessions.filter((s) => inBucket(b, keyOfISO(s.at)));
    return { label: b.label, title: b.title, value: list.reduce((sum, s) => sum + (s.durationMin || 0), 0), detail: `${list.length} ${list.length === 1 ? 'økt' : 'økter'}` };
  });
  const planBars = buckets.map((b) => {
    const list = planItems.filter((i) => i.done && inBucket(b, i.date));
    return { label: b.label, title: b.title, value: list.length, detail: `${new Set(list.map((i) => i.date)).size} dager` };
  });

  // ----- Måloppnåelse -----
  const data = { planItems, sessions, scores };
  const goalBars = buckets.map((b) => {
    let reached = 0;
    let total = 0;
    const consider = (goal, ref) => {
      const { end } = periodRange(goal.period, ref);
      if (end < keyOfISO(goal.createdAt)) return; // målet fantes ikke ennå
      total++;
      if (goalProgress(goal, ref, data).done) reached++;
    };
    for (const goal of goals) {
      if (period.bucket === 'week') {
        if (goal.period === 'week') consider(goal, b.start);
      } else if (goal.period === 'month') {
        consider(goal, b.start);
      } else {
        // Ukemål i månedsvisning: hver uke som starter i måneden.
        for (let w = startOfWeek(b.start); w <= b.end; w = addDays(w, 7)) if (w >= b.start && w <= todayKey()) consider(goal, w);
      }
    }
    return { label: b.label, title: b.title, value: total ? Math.round((reached / total) * 100) : 0, detail: total ? `${reached} av ${total} mål nådd` : 'Ingen mål' };
  });
  const hasGoals = goals.length > 0;

  mount(
    view,
    h('header', { class: 'view-header' }, h('h1', {}, 'Statistikk')),
    segmented(PERIODS, state.period, (id) => { state.period = id; refresh(); }, 'Periode'),
    h(
      'div',
      { class: 'tiles tiles-2' },
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Kondisjonsøkter'), h('span', { class: 'tile-value' }, String(pSessions.length)), h('span', { class: 'tile-sub' }, `${pSessions.reduce((sum, s) => sum + (s.durationMin || 0), 0)} min totalt`)),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Fullført i planen'), h('span', { class: 'tile-value' }, String(pDone.length)), h('span', { class: 'tile-sub' }, `${new Set(pDone.map((i) => i.date)).size} dager`)),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Snitt smerte'), h('span', { class: 'tile-value' }, avgPain === null ? '–' : formatNumber(avgPain)), h('span', { class: 'tile-sub' }, `${pPains.length} registreringer`)),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Hodepine'), h('span', { class: 'tile-value' }, String(pHeadaches.length)), h('span', { class: 'tile-sub' }, pHeadaches.length ? `snitt intensitet ${formatNumber(average(pHeadaches.map((x) => x.intensity)))}` : 'ingen registrert'))
    ),

    sectionTitle('Kroppsdel'),
    card(h('div', { class: 'chart-head' }, h('h2', {}, 'Score over tid'), h('p', { class: 'muted small' }, 'Skala 0–10')), regionSelect, regionHost),

    sectionTitle('Smerte og hodepine'),
    chartCard('Smerte', `Snitt av alle smerteregistreringer per ${unitName}`, lineChart({ series: [{ name: 'Smerte', color: 'var(--series-2)', points: painPoints }], tMin, tMax, yMin: 0, yMax: 10, formatTime: bucketTime })),
    chartCard('Hodepine', `Antall per ${unitName}`, barChart({ bars: headacheBars, color: 'var(--series-2)', format: (v) => String(Math.round(v)) })),

    sectionTitle('Vekt og BMI'),
    chartCard(
      'Vekt',
      latestWeight ? `Nå ${formatNumber(latestWeight.weightKg)} kg${latestBmi ? ` · BMI ${formatNumber(latestBmi)}` : ''}${weightChange !== null ? ` · ${weightChange >= 0 ? '+' : '−'}${formatNumber(Math.abs(weightChange))} kg i perioden` : ''}` : 'Legg inn målinger under Kropp → Målinger',
      lineChart({
        series: [{ name: 'Vekt', color: 'var(--series-1)', points: weightPoints }],
        tMin, tMax, unit: ' kg', format: (v) => formatNumber(v),
        formatTime: (t, full) => (full ? fullTime(t) : shortTime(t)),
        extraRows: (t) => { const p = weightPoints.find((q) => q.t === t); const b = p ? bmi(p.v, height) : null; return b ? [`BMI ${formatNumber(b)}`] : []; },
      })
    ),

    sectionTitle('Treningsvolum'),
    chartCard('Kondisjon', `Minutter per ${unitName}`, barChart({ bars: minuteBars, color: 'var(--series-1)', unit: ' min', format: (v) => String(Math.round(v)) })),
    chartCard('Fullførte planpunkter', `Antall per ${unitName}`, barChart({ bars: planBars, color: 'var(--series-3)', format: (v) => String(Math.round(v)) })),

    sectionTitle('Måloppnåelse'),
    chartCard('Mål nådd', `Andel av målene som ble nådd per ${unitName}`, hasGoals ? barChart({ bars: goalBars, color: 'var(--series-3)', yMax: 100, unit: ' %', format: (v) => String(Math.round(v)) }) : emptyChart('Opprett mål under I dag → Mål for å følge måloppnåelsen.')),
    h('p', { class: 'footnote' }, 'Trykk eller dra på en graf for å se verdiene.')
  );
}
