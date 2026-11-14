// Anbefalinger: hva bør prioriteres, ut fra scorene i kroppskartet og
// håndballspesifikk skadeforebygging – og et forslag til kondisjonsprogresjon.
// Dette er generelle treningsråd. Appen stiller ikke diagnoser.

import { REGIONS, ALL_REGION_IDS, regionLabel } from './regions.js';
import { latestByRegion } from './scores.js';
import { keyOfISO, todayKey, addDays } from './dates.js';

/**
 * Fokusområder. base = hvor viktig området er for en håndballspiller uansett
 * score (forebygging). regions = regioner som teller inn. exercises/stretches
 * peker til js/data/exercises.js og js/data/stretches.js.
 */
export const FOCUS_AREAS = [
  { id: 'shoulder', title: 'Skulder og rotatorcuff', base: 3, regions: ['shoulder'],
    why: 'Kast gir stor belastning på kastarmen. Sterke utadrotatorer og god kontroll på skulderbladet beskytter skulderen.',
    exercises: ['ext-rot-band', 'ext-rot-90', 'ytw', 'pushup-plus', 'face-pull'], stretches: [] },
  { id: 'hamstring', title: 'Baksiden av låret', base: 3, regions: ['hamstring'],
    why: 'Sprint og bråstopp gir strekkskader på baksiden. Nordic hamstring er den best dokumenterte forebyggende øvelsen.',
    exercises: ['nordic', 'sl-rdl', 'hip-thrust'], stretches: ['thighs'] },
  { id: 'groin', title: 'Lyske og adduktorer', base: 3, regions: ['groin'],
    why: 'Finter og sidelengs forflytning belaster lysken. Copenhagen-øvelsen bygger sterke adduktorer.',
    exercises: ['copenhagen', 'adductor-squeeze'], stretches: ['hips'] },
  { id: 'knee', title: 'Knekontroll og landing', base: 3, regions: ['knee', 'quad'],
    why: 'De fleste alvorlige kneskader skjer i landinger og finter. Tren på å lande mykt med kneet over tærne.',
    exercises: ['drop-landing', 'skater', 'split-squat', 'wall-sit'], stretches: ['thighs'] },
  { id: 'glute', title: 'Sete og hofte', base: 2, regions: ['glute', 'hip'],
    why: 'Setet styrer kneet og hoften i landinger og retningsendringer, og avlaster korsryggen.',
    exercises: ['hip-thrust', 'band-walk', 'sl-rdl', 'psoas-march'], stretches: ['hips'] },
  { id: 'core', title: 'Core', base: 2, regions: ['abs', 'oblique', 'lower_back'],
    why: 'En sterk kjerne overfører kraft i kast og tåler dueller og vridninger.',
    exercises: ['pallof', 'side-plank', 'plank', 'dead-bug', 'bird-dog'], stretches: ['back'] },
  { id: 'ankle', title: 'Ankelstabilitet', base: 2, regions: ['ankle', 'calf'],
    why: 'Overtråkk er den vanligste håndballskaden. Balansetrening reduserer risikoen for nye overtråkk.',
    exercises: ['balance', 'calf-raise', 'sl-rdl'], stretches: ['calves'] },
  { id: 'posture', title: 'Holdning: øvre rygg, nakke og bryst', base: 2, regions: ['upper_back', 'neck', 'chest'],
    why: 'Sterk øvre rygg og bevegelig bryst gir rakere holdning og bedre plass til skulderen i kastet.',
    exercises: ['face-pull', 'ytw', 'wall-angel', 'chin-tuck', 'open-book', 'row'], stretches: ['neck', 'back'] },
  { id: 'arms', title: 'Armer og grep', base: 0, regions: ['biceps', 'triceps', 'forearm'],
    why: 'For en balansert, fulltrent overkropp.',
    exercises: ['curl', 'triceps', 'carry', 'pulldown'], stretches: [] },
];
const PAIRED = new Set(REGIONS.filter((r) => r.paired).map((r) => r.id));
const idsOf = (base) => (PAIRED.has(base) ? [`${base}_l`, `${base}_r`] : [base]);

/** Smerteverdier for en region, eldste først. */
function painSeries(scores, regionId) {
  return scores.filter((s) => s.regionId === regionId && s.pain !== null).map((s) => ({ at: s.at, pain: s.pain })).reverse();
}

/** Økende smerte: de tre siste registreringene stiger, med minst to trinn totalt. */
function isRising(series) {
  if (series.length < 3) return false;
  const [a, b, c] = series.slice(-3).map((x) => x.pain);
  return a < b && b < c && c - a >= 2 && c >= 4;
}

export const PRIORITY_LEVELS = { high: 'Høy prioritet', medium: 'Middels prioritet', maintain: 'Vedlikehold' };

/**
 * Lager anbefalingene.
 * Returnerer { alerts, headache, areas, unmapped, mapped }
 */
export function buildRecommendations({ scores, headaches }) {
  const latest = latestByRegion(scores);
  const alerts = [];

  for (const id of ALL_REGION_IDS) {
    if (id === 'head') continue;
    const series = painSeries(scores, id);
    const current = series.length ? series[series.length - 1].pain : null;
    if (current !== null && current >= 7) {
      alerts.push({ regionId: id, kind: 'high', title: regionLabel(id), text: `Smerte ${current} av 10. La området hvile, og ta kontakt med lege eller fysioterapeut før du trener på det.` });
    } else if (isRising(series)) {
      const last3 = series.slice(-3).map((x) => x.pain).join(' → ');
      alerts.push({ regionId: id, kind: 'rising', title: regionLabel(id), text: `Smerten har økt over de siste registreringene (${last3}). Ro ned belastningen, og få det vurdert av lege eller fysioterapeut hvis det ikke snur.` });
    }
  }
  const alertRegions = new Set(alerts.map((a) => a.regionId));

  // Hodepine: mange eller kraftige anfall den siste tiden.
  const since = addDays(todayKey(), -14);
  const recent = headaches.filter((x) => keyOfISO(x.at) >= since);
  let headache = null;
  if (recent.some((x) => x.intensity >= 8)) headache = 'Du har registrert kraftig hodepine den siste tiden.';
  else if (recent.length >= 4) headache = `Du har registrert hodepine ${recent.length} ganger de siste 14 dagene.`;

  const areas = FOCUS_AREAS.map((area) => {
    let score = area.base;
    const reasons = [];
    let caution = false;
    let lowMobility = false;
    let hasData = false;

    // Behovet regnes per kroppsdel, og det er den svakeste kroppsdelen som teller
    // (ellers ville områder med mange regioner alltid havnet øverst).
    let worst = 0;
    let asymmetry = 0;
    for (const base of area.regions) {
      const ids = idsOf(base);
      for (const id of ids) {
        const e = latest.get(id);
        if (!e) continue;
        hasData = true;
        const name = regionLabel(id).toLowerCase();
        if (alertRegions.has(id)) {
          caution = true;
          continue;
        }
        let need = 0;
        if (e.strength) {
          if (e.strength.value <= 4) { need += 3; reasons.push(`Lav styrke i ${name} (${e.strength.value})`); }
          else if (e.strength.value <= 6) { need += 1.5; reasons.push(`Middels styrke i ${name} (${e.strength.value})`); }
        }
        if (e.mobility) {
          if (e.mobility.value <= 4) { need += 2; lowMobility = true; reasons.push(`Lav bevegelighet i ${name} (${e.mobility.value})`); }
          else if (e.mobility.value <= 6) { need += 1; lowMobility = true; reasons.push(`Middels bevegelighet i ${name} (${e.mobility.value})`); }
        }
        if (e.pain && e.pain.value >= 3) { need += 2; reasons.push(`Smerte i ${name} (${e.pain.value}) – tren skånsomt og smertefritt`); }
        worst = Math.max(worst, need);
      }
      // Sideforskjell
      if (ids.length === 2) {
        const [l, r] = ids.map((id) => latest.get(id));
        for (const [dim, word] of [['strength', 'styrke'], ['mobility', 'bevegelighet']]) {
          if (l && r && l[dim] && r[dim] && Math.abs(l[dim].value - r[dim].value) >= 2) {
            const weaker = l[dim].value < r[dim].value ? 'venstre' : 'høyre';
            asymmetry = 1.5;
            reasons.push(`Sideforskjell i ${word}: ${weaker} ${regionLabel(base).toLowerCase()} er svakest (${l[dim].value} mot ${r[dim].value})`);
          }
        }
      }
    }
    score += worst + asymmetry;

    const level = score >= 6.5 ? 'high' : score >= 4 ? 'medium' : 'maintain';
    reasons.sort((x, y) => Number(y.startsWith('Lav') || y.startsWith('Smerte')) - Number(x.startsWith('Lav') || x.startsWith('Smerte')));
    return { ...area, score, level, reasons: reasons.slice(0, 5), caution, lowMobility, hasData };
  }).sort((a, b) => b.score - a.score);

  const mapped = ALL_REGION_IDS.filter((id) => id !== 'head' && latest.has(id)).length;
  return { alerts, headache, areas, mapped, unmapped: ALL_REGION_IDS.length - 1 - mapped };
}

// ---------- Kondisjon: progresjon tilbake mot kampform ----------

export const CARDIO_STAGES = [
  {
    id: 'base', name: 'Rolig grunnlag',
    goal: 'Bygg tålegrensen i sener og ledd med rolige økter i snakketempo (RPE 3–4). 2–3 økter i uken.',
    next: 'Videre når du har minst 6 rolige økter på 25 minutter eller mer i løpet av tre uker, uten at kroppen protesterer.',
    sessions: [
      { title: 'Rolig løp', detail: '25–35 min, RPE 3–4' },
      { title: 'Rolig sykkel eller svømming', detail: '40 min, RPE 3–4' },
      { title: 'Løp/gå-intervaller', detail: '8 × (2 min løp + 1 min gange)' },
    ],
  },
  {
    id: 'intervals', name: 'Intervaller',
    goal: 'Løft kapasiteten med 1–2 intervalløkter i uken, og behold 1–2 rolige økter. Øk ikke ukemengden med mer enn rundt 10 %.',
    next: 'Videre når du har minst 4 intervalløkter på tre uker og restituerer godt mellom øktene.',
    sessions: [
      { title: 'Intervaller 4 × 4 min', detail: 'RPE 7–8, 3 min rolig pause' },
      { title: 'Intervaller 10 × 1 min', detail: 'RPE 8, 1 min pause' },
      { title: 'Rolig løp', detail: '35–45 min, RPE 3–4' },
    ],
  },
  {
    id: 'handball', name: 'Håndballspesifikt',
    goal: 'Korte sprinter, bråstopp og retningsendringer – det kampen faktisk krever. Varm opp grundig, og ha full pause mellom dragene.',
    next: 'Klar for kamp når du tåler flere håndballtreninger i uken med full intensitet, uten smerter dagen etter.',
    sessions: [
      { title: 'Sprint 10 × 20 m', detail: 'Maks fart, gå tilbake som pause' },
      { title: 'Retningsendringer 6 × 5-10-5', detail: 'Lavt tyngdepunkt, 60 s pause' },
      { title: 'Kampintervaller 2 × 8 × 15/15', detail: '15 s sprint, 15 s jogg, 3 min seriepause' },
      { title: 'Kontringsløp 8 × 30 m', detail: 'Med ball, 45 s pause' },
    ],
  },
];

/**
 * Foreslår hvilket trinn brukeren er på, ut fra loggførte økter de siste 21 dagene,
 * og sjekker om belastningen har økt brått.
 */
export function cardioProgress(sessions) {
  const since = addDays(todayKey(), -21);
  const recent = sessions.filter((s) => keyOfISO(s.at) >= since);
  const easy = recent.filter((s) => ['run', 'bike', 'swim'].includes(s.type) && (s.durationMin || 0) >= 25).length;
  const intervals = recent.filter((s) => s.type === 'intervals').length;
  const handball = recent.filter((s) => ['handball', 'match'].includes(s.type)).length;

  let stage = 'base';
  if (easy + intervals >= 6 || intervals >= 2) stage = 'intervals';
  if (intervals >= 4) stage = 'handball';

  // Belastning (minutter × RPE) denne uken mot snittet av de tre foregående.
  const load = (from, to) => sessions.filter((s) => { const k = keyOfISO(s.at); return k > from && k <= to; }).reduce((sum, s) => sum + (s.durationMin || 0) * (s.rpe || 5), 0);
  const today = todayKey();
  const thisWeek = load(addDays(today, -7), today);
  const previous = [1, 2, 3].map((i) => load(addDays(today, -7 * (i + 1)), addDays(today, -7 * i)));
  const baseline = previous.reduce((a, b) => a + b, 0) / 3;
  const spike = baseline > 0 && previous.filter((x) => x > 0).length >= 2 && thisWeek > baseline * 1.3;

  return { stage, counts: { easy, intervals, handball }, thisWeek, baseline, spike };
}
