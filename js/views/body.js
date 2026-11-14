// «Kropp»: kroppskart med varmekart, registrering av score per region,
// hodepinelogg og historikk.

import { h, mount, setChildren, card, sectionTitle, segmented, toast, openSheet, confirmDialog, formatDate } from '../ui.js';
import { icon } from '../icons.js';
import { field, scalePicker, chips, timeField, noteField } from '../forms.js';
import { fromLocalInput } from '../dates.js';
import { renderMeasurements } from './measurements.js';
import { refresh } from '../router.js';
import { createBodyMap } from '../bodymap.js';
import { ALL_REGION_IDS, parseRegionId, getRegion, regionLabel, VIEWER_RIGHT_SIDE } from '../regions.js';
import {
  DIMENSIONS, PAIN_TYPES, HEADACHE_KINDS, HEADACHE_LOCATIONS, HEADACHE_TRIGGERS, HEADACHE_DURATIONS,
  nameOf, levelOf, getScores, addScore, deleteScore, latestByRegion,
  getHeadaches, addHeadache, deleteHeadache, recentHeadache, scoreSummary, headacheSummary,
} from '../scores.js';

// Valgt dimensjon og visning huskes mens appen er åpen.
const state = { tab: 'map', dimension: 'pain', view: 'front' };

// Hodepine bruker samme fargeskala som smerte, men fra 1.
const HEADACHE_INTENSITY = { id: 'pain', name: 'Intensitet', min: 1, max: 10, lowLabel: 'Mild', highLabel: 'Kraftig' };

const dimById = (id) => DIMENSIONS.find((d) => d.id === id);
const shortDate = (iso) => formatDate(iso, { day: 'numeric', month: 'short' });
const dateTime = (iso) => formatDate(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Liten trendlinje (eldste til venstre). Vises bare med minst to verdier. */
function sparkline(values, min, max) {
  if (values.length < 2) return null;
  const w = 72, hgt = 22, p = 3;
  const x = (i) => p + (i * (w - 2 * p)) / (values.length - 1);
  const y = (v) => hgt - p - ((v - min) / (max - min)) * (hgt - 2 * p);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const wrap = h('span', { class: 'spark', role: 'img', 'aria-label': `Utvikling: ${values.join(', ')}` });
  wrap.innerHTML = `<svg viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(values[values.length - 1]).toFixed(1)}" r="3" class="spark-dot"/></svg>`;
  return wrap;
}

function historyItem({ when, title, text, note, onDelete }) {
  return h(
    'div',
    { class: 'history-item' },
    h(
      'div',
      { class: 'history-main' },
      h('div', { class: 'history-when' }, when, title ? h('span', { class: 'history-title' }, ` · ${title}`) : null),
      h('div', { class: 'history-text' }, text),
      note ? h('div', { class: 'history-note' }, note) : null
    ),
    onDelete ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Slett registrering', onclick: onDelete }, '✕') : null
  );
}

const careNote = () =>
  h('p', { class: 'care-note' }, icon('shield', 20), h('span', {}, 'Ved sterk smerte er det lurt å la området hvile og ta kontakt med lege eller fysioterapeut før du trener på det.'));

// ---------- Registrering for en kroppsregion ----------

function openRegionSheet(regionId, { scores, onChanged }) {
  const { base, side } = parseRegionId(regionId);
  const region = getRegion(regionId);
  let target = side; // 'l' | 'r' | 'both' | null
  const values = { pain: null, strength: null, mobility: null };
  let painType = null;
  let note = '';
  let when = '';

  const idsFor = (t) => (!region.paired ? [base] : t === 'both' ? [`${base}_l`, `${base}_r`] : [`${base}_${t}`]);

  const painExtra = h('div', { class: 'stack-sm', hidden: true });
  const painTypeChips = chips(PAIN_TYPES, { label: 'Type smerte', onChange: (id) => { painType = id; } });
  const care = careNote();
  care.hidden = true;
  mount(painExtra, h('div', { class: 'field-label' }, 'Type (valgfritt)'), painTypeChips, care);

  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: true }, 'Lagre registrering');
  const updateSave = () => { save.disabled = Object.values(values).every((v) => v === null); };

  const dimHeads = {};
  const dimField = (dimension) => {
    const dim = dimById(dimension);
    dimHeads[dimension] = h('span', { class: 'field-last' });
    return field(
      dim.name,
      scalePicker(dim, (v) => {
        values[dimension] = v;
        if (dimension === 'pain') {
          painExtra.hidden = !v;
          care.hidden = !(v >= 7);
        }
        updateSave();
      }),
      dimHeads[dimension]
    );
  };

  const history = h('div', { class: 'stack-sm' });

  const renderContext = () => {
    const single = target === 'both' ? null : idsFor(target)[0];
    const mine = single ? scores.filter((s) => s.regionId === single) : [];
    for (const dim of DIMENSIONS) {
      const series = mine.filter((s) => s[dim.id] !== null).slice(0, 12).reverse().map((s) => s[dim.id]);
      const last = mine.find((s) => s[dim.id] !== null);
      setChildren(dimHeads[dim.id], last ? `Sist: ${last[dim.id]} · ${shortDate(last.at)}` : single ? 'Ikke registrert' : '', sparkline(series, dim.min, dim.max));
    }
    setChildren(
      history,
      h('div', { class: 'field-label' }, 'Historikk'),
      target === 'both'
        ? h('p', { class: 'muted small' }, 'Registreringen lagres for både venstre og høyre side.')
        : mine.length
          ? mine.slice(0, 20).map((s) =>
              historyItem({
                when: dateTime(s.at),
                text: scoreSummary(s),
                note: s.note,
                onDelete: async () => {
                  if (!(await confirmDialog({ title: 'Slette registreringen?', message: `${dateTime(s.at)} – ${scoreSummary(s)}`, confirmText: 'Slett', danger: true }))) return;
                  await deleteScore(s.id);
                  scores.splice(scores.indexOf(s), 1);
                  renderContext();
                  onChanged();
                },
              })
            )
          : h('p', { class: 'muted small' }, 'Ingen registreringer ennå.')
    );
  };

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const at = fromLocalInput(when);
      for (const id of idsFor(target)) await addScore({ regionId: id, at, ...values, painType, note });
      toast('Registrering lagret', { type: 'success' });
      sheet.close();
      onChanged();
    } catch (err) {
      console.error(err);
      save.disabled = false;
      toast(`Kunne ikke lagre: ${err.message}`, { type: 'error', duration: 5000 });
    }
  });

  const content = h(
    'div',
    { class: 'stack' },
    region.paired
      ? segmented([{ id: 'l', name: 'Venstre' }, { id: 'r', name: 'Høyre' }, { id: 'both', name: 'Begge' }], target, (id) => { target = id; renderContext(); }, 'Side')
      : null,
    h('p', { class: 'muted small' }, 'Velg det du vil registrere nå – du trenger ikke fylle ut alle tre.'),
    dimField('pain'),
    painExtra,
    dimField('strength'),
    dimField('mobility'),
    timeField((v) => { when = v; }),
    noteField((v) => { note = v; }, 'F.eks. «stiv etter løpetur»'),
    save,
    history
  );
  renderContext();
  const sheet = openSheet({ title: region.paired ? region.label : regionLabel(regionId), content });
}

// ---------- Hodepine ----------

function openHeadacheSheet({ headaches, onChanged }) {
  const data = { intensity: null, durationMin: null, kind: null, locations: [], triggers: [], note: '' };
  let when = '';

  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: true }, 'Lagre hodepine');
  const history = h('div', { class: 'stack-sm' });

  const renderHistory = () => {
    setChildren(
      history,
      h('div', { class: 'field-label' }, 'Historikk'),
      headaches.length
        ? headaches.slice(0, 20).map((x) =>
            historyItem({
              when: dateTime(x.at),
              text: headacheSummary(x),
              note: [x.triggers && x.triggers.length ? `Mulige utløsere: ${x.triggers.map((id) => nameOf(HEADACHE_TRIGGERS, id).toLowerCase()).join(', ')}` : '', x.note].filter(Boolean).join(' – '),
              onDelete: async () => {
                if (!(await confirmDialog({ title: 'Slette registreringen?', message: `${dateTime(x.at)} – ${headacheSummary(x)}`, confirmText: 'Slett', danger: true }))) return;
                await deleteHeadache(x.id);
                headaches.splice(headaches.indexOf(x), 1);
                renderHistory();
                onChanged();
              },
            })
          )
        : h('p', { class: 'muted small' }, 'Ingen hodepine registrert ennå.')
    );
  };

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      await addHeadache({ ...data, at: fromLocalInput(when) });
      toast('Hodepine lagret', { type: 'success' });
      sheet.close();
      onChanged();
    } catch (err) {
      console.error(err);
      save.disabled = false;
      toast(`Kunne ikke lagre: ${err.message}`, { type: 'error', duration: 5000 });
    }
  });

  const content = h(
    'div',
    { class: 'stack' },
    field('Intensitet', scalePicker(HEADACHE_INTENSITY, (v) => { data.intensity = v; save.disabled = v === null; })),
    field('Varighet', chips(HEADACHE_DURATIONS, { label: 'Varighet', onChange: (id) => { data.durationMin = id; } })),
    field('Type', chips(HEADACHE_KINDS, { label: 'Type hodepine', onChange: (id) => { data.kind = id; } })),
    field('Plassering', chips(HEADACHE_LOCATIONS, { multi: true, label: 'Plassering', onChange: (ids) => { data.locations = ids; } })),
    field('Mulige utløsere', chips(HEADACHE_TRIGGERS, { multi: true, label: 'Mulige utløsere', onChange: (ids) => { data.triggers = ids; } })),
    timeField((v) => { when = v; }),
    noteField((v) => { data.note = v; }, 'F.eks. «lite søvn i natt»'),
    save,
    h(
      'details',
      { class: 'details' },
      h('summary', {}, 'Når bør hodepine sjekkes av lege?'),
      h(
        'div',
        { class: 'details-body' },
        h('p', {}, 'Appen stiller ikke diagnoser. Ta kontakt med lege hvis hodepinen:'),
        h(
          'ul',
          { class: 'dot-list' },
          h('li', {}, 'kommer plutselig og er uvanlig kraftig'),
          h('li', {}, 'oppstår etter slag mot hodet'),
          h('li', {}, 'kommer sammen med feber og stiv nakke'),
          h('li', {}, 'gir synsforstyrrelser, talevansker, lammelser, nummenhet eller forvirring'),
          h('li', {}, 'er ny for deg og blir stadig verre eller hyppigere'),
          h('li', {}, 'vekker deg om natten eller er verst om morgenen')
        ),
        h('p', {}, 'Ring 113 ved akutte og alvorlige symptomer.')
      )
    ),
    history
  );
  renderHistory();
  const sheet = openSheet({ title: 'Hodepine', content });
}

// ---------- Visning ----------

function legend(dimension) {
  const dim = dimById(dimension);
  const steps = dimension === 'pain'
    ? [['p0', '0'], ['p1', '1–2'], ['p2', '3–4'], ['p3', '5–6'], ['p4', '7–8'], ['p5', '9–10']]
    : [['s1', '1–2'], ['s2', '3–4'], ['s3', '5–6'], ['s4', '7–8'], ['s5', '9–10']];
  return h(
    'div',
    { class: 'legend', role: 'group', 'aria-label': `Tegnforklaring: ${dim.name}` },
    h('div', { class: 'legend-scale' }, steps.map(([level, text]) => h('span', { class: 'legend-step' }, h('i', { class: 'swatch', 'data-level': level }), h('span', {}, text)))),
    h('div', { class: 'legend-ends' }, h('span', {}, dim.lowLabel), h('span', { class: 'legend-empty' }, h('i', { class: 'swatch swatch-empty' }), 'Ikke registrert'), h('span', {}, dim.highLabel))
  );
}

export async function renderBody(view) {
  mount(
    view,
    h('header', { class: 'view-header' }, h('h1', {}, 'Kropp')),
    segmented([{ id: 'map', name: 'Kroppskart' }, { id: 'measure', name: 'Målinger' }], state.tab, (id) => { state.tab = id; refresh(); }, 'Visning')
  );
  if (state.tab === 'measure') return renderMeasurements(view, refresh);

  let scores = await getScores();
  let headaches = await getHeadaches();

  const dimHost = h('div', {});
  const mapHost = h('div', { class: 'bodymap-wrap' });
  const sides = h('div', { class: 'bodymap-sides' });
  const legendHost = h('div', {});
  const overviewTitle = sectionTitle('');
  const overview = h('section', { class: 'card card-list' });
  const recent = h('section', { class: 'card card-list' });

  const reload = async () => {
    [scores, headaches] = await Promise.all([getScores(), getHeadaches()]);
    draw();
  };

  const select = (regionId) => {
    if (regionId === 'head') openHeadacheSheet({ headaches, onChanged: reload });
    else openRegionSheet(regionId, { scores, onChanged: reload });
  };

  function draw() {
    const dim = dimById(state.dimension);
    const latest = latestByRegion(scores);
    const headache = recentHeadache(headaches);

    // Nivå og tekst per region for valgt dimensjon.
    const levels = new Map();
    const rows = [];
    for (const id of ALL_REGION_IDS) {
      const entry = (latest.get(id) || {})[dim.id];
      if (!entry) continue;
      levels.set(id, { level: levelOf(dim.id, entry.value), text: `${dim.name.toLowerCase()} ${entry.value}` });
      rows.push({ id, label: regionLabel(id), value: entry.value, at: entry.at, detail: entry.painType ? nameOf(PAIN_TYPES, entry.painType).toLowerCase() : '' });
    }
    if (dim.id === 'pain' && headache) {
      levels.set('head', { level: levelOf('pain', headache.intensity), text: `hodepine ${headache.intensity}` });
      rows.push({ id: 'head', label: 'Hodepine', value: headache.intensity, at: headache.at, detail: headache.kind ? nameOf(HEADACHE_KINDS, headache.kind).toLowerCase() : '' });
    }
    // Det som trenger mest oppmerksomhet øverst: høy smerte, eller lav styrke/bevegelighet.
    rows.sort((a, b) => (dim.id === 'pain' ? b.value - a.value : a.value - b.value) || a.label.localeCompare(b.label, 'nb'));

    setChildren(mapHost, createBodyMap({ view: state.view, levels, onSelect: select }));
    const right = VIEWER_RIGHT_SIDE[state.view] === 'l' ? 'Venstre' : 'Høyre';
    const left = right === 'Venstre' ? 'Høyre' : 'Venstre';
    setChildren(sides, h('span', {}, `← ${left} side`), h('span', {}, `${right} side →`));
    setChildren(legendHost, legend(dim.id));

    overviewTitle.textContent = `Oversikt – ${dim.name.toLowerCase()}`;
    setChildren(
      overview,
      rows.length
        ? rows.map((r) =>
            h(
              'button',
              { class: 'row row-action', type: 'button', onclick: () => select(r.id) },
              h('i', { class: 'swatch swatch-lg', 'data-level': levelOf(dim.id, r.value) }),
              h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, r.label), h('span', { class: 'row-hint' }, [shortDate(r.at), r.detail].filter(Boolean).join(' · '))),
              h('span', { class: 'row-number' }, String(r.value)),
              icon('chevron', 18)
            )
          )
        : h('div', { class: 'row' }, h('span', { class: 'muted' }, `Ingen registreringer av ${dim.name.toLowerCase()} ennå. Trykk på en kroppsdel i kartet for å starte.`))
    );

    const log = [
      ...scores.map((s) => ({ at: s.at, title: regionLabel(s.regionId), text: scoreSummary(s), note: s.note })),
      ...headaches.map((x) => ({ at: x.at, title: 'Hodepine', text: headacheSummary(x), note: x.note })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    setChildren(
      recent,
      log.length
        ? log.slice(0, 12).map((e) => h('div', { class: 'row' }, historyItem({ when: dateTime(e.at), title: e.title, text: e.text, note: e.note })))
        : h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Her kommer de siste registreringene dine.'))
    );
  }

  setChildren(dimHost, segmented(DIMENSIONS, state.dimension, (id) => { state.dimension = id; draw(); }, 'Dimensjon'));

  mount(
    view,
    dimHost,
    card(
      segmented([{ id: 'front', name: 'Forfra' }, { id: 'back', name: 'Bakfra' }], state.view, (id) => { state.view = id; draw(); }, 'Visning'),
      mapHost,
      sides,
      legendHost,
      h('p', { class: 'muted small center' }, 'Trykk på en kroppsdel for å registrere. Hodet åpner hodepineloggen.')
    ),
    overviewTitle,
    overview,
    sectionTitle('Siste registreringer'),
    recent
  );
  draw();
}
