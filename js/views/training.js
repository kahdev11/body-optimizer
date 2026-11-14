// «Trening»: anbefalinger, kondisjonslogg med progresjon, øvelsesbibliotek og tøyeprogrammer.

import { h, mount, setChildren, card, sectionTitle, segmented, toast, openSheet, confirmDialog, formatDate } from '../ui.js';
import { icon } from '../icons.js';
import { field, chips, numberInput, scalePicker, timeField, noteField } from '../forms.js';
import { todayKey, fromLocalInput, keyOfISO, addDays } from '../dates.js';
import { addPlanItem, addPlanItems, getPlan } from '../planner.js';
import { CARDIO_TYPES, cardioTypeName, getSessions, addSession, deleteSession, sessionSummary, parseNumber } from '../training.js';
import { getScores, getHeadaches } from '../scores.js';
import { buildRecommendations, cardioProgress, CARDIO_STAGES, PRIORITY_LEVELS } from '../recommend.js';
import { EXERCISES, EXERCISE_FILTERS, FOCUS_NAMES, getExercise } from '../data/exercises.js';
import { STRETCH_PROGRAMS, getStretchProgram } from '../data/stretches.js';
import { getRegion } from '../regions.js';
import { refresh } from '../router.js';

const state = { tab: 'advice', filter: 'all' };

const TABS = [
  { id: 'advice', name: 'Råd' },
  { id: 'cardio', name: 'Kondis' },
  { id: 'exercises', name: 'Øvelser' },
  { id: 'stretch', name: 'Tøying' },
];

const RPE = { id: 'rpe', name: 'Opplevd anstrengelse (RPE)', min: 1, max: 10, lowLabel: 'Veldig lett', highLabel: 'Maksimalt' };
const dateTime = (iso) => formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// ---------- Legg i dagens plan ----------

async function planExercise(exercise) {
  await addPlanItem({ date: todayKey(), title: exercise.name, detail: exercise.dose, category: 'strength', sourceId: exercise.id });
  toast('Lagt til i dagens plan', { type: 'success' });
}

async function planStretch(program) {
  await addPlanItem({ date: todayKey(), title: `Tøyeprogram: ${program.name}`, detail: `ca. ${program.minutes} min`, category: 'stretch', sourceId: `stretch:${program.id}` });
  toast('Lagt til i dagens plan', { type: 'success' });
}

async function planCardio(session) {
  await addPlanItem({ date: todayKey(), title: session.title, detail: session.detail, category: 'cardio' });
  toast('Lagt til i dagens plan', { type: 'success' });
}

const addButton = (label, onclick) => h('button', { class: 'btn btn-small btn-tinted-sm', type: 'button', 'aria-label': label, onclick: (e) => { e.stopPropagation(); onclick(); } }, '+ Plan');

// ---------- Øvelser ----------

function openExerciseSheet(exercise) {
  const sheet = openSheet({
    title: exercise.name,
    content: h(
      'div',
      { class: 'stack' },
      h('div', { class: 'tag-row' }, h('span', { class: 'chip chip-done' }, FOCUS_NAMES[exercise.focus]), exercise.handball ? h('span', { class: 'chip' }, 'Håndball') : null, exercise.groups.map((g) => h('span', { class: 'chip' }, getRegion(g).label))),
      h('div', { class: 'dose' }, h('span', { class: 'field-label' }, 'Dosering'), h('strong', {}, exercise.dose)),
      h('p', {}, exercise.how),
      h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: async () => { await planExercise(exercise); sheet.close(); } }, 'Legg til i dagens plan'),
      h('p', { class: 'muted small' }, 'Tren smertefritt og med god teknikk. Start lett, og øk gradvis.')
    ),
  });
}

function exerciseRow(exercise) {
  return h(
    'div',
    { class: 'row row-split' },
    h('button', { class: 'row-main', type: 'button', onclick: () => openExerciseSheet(exercise) }, h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, exercise.name), h('span', { class: 'row-hint' }, exercise.dose))),
    addButton(`Legg ${exercise.name} i dagens plan`, () => planExercise(exercise))
  );
}

function exercisesTab(view) {
  const list = h('section', { class: 'card card-list' });
  const count = h('p', { class: 'footnote' });
  const draw = () => {
    const filter = EXERCISE_FILTERS.find((f) => f.id === state.filter) || EXERCISE_FILTERS[0];
    const items = EXERCISES.filter((e) => (filter.id === 'all' ? true : filter.id === 'handball' ? e.handball : e.groups.some((g) => filter.groups.includes(g))));
    setChildren(list, items.map(exerciseRow));
    count.textContent = `${items.length} øvelser. Trykk på en øvelse for instruksjon.`;
  };
  const filters = chips(EXERCISE_FILTERS, { required: true, value: state.filter, label: 'Filter', onChange: (id) => { state.filter = id; draw(); } });
  filters.classList.add('chips-scroll');
  mount(view, filters, list, count);
  draw();
}

// ---------- Tøying ----------

function stretchTab(view) {
  mount(
    view,
    STRETCH_PROGRAMS.map((p) =>
      card(
        h('div', { class: 'card-head' }, h('h2', {}, p.name), h('span', { class: 'muted small' }, `ca. ${p.minutes} min`)),
        h('p', { class: 'muted' }, p.intro),
        h('ol', { class: 'steps' }, p.items.map((item) => h('li', {}, h('div', { class: 'step-head' }, h('strong', {}, item.name), h('span', { class: 'muted small' }, item.dose)), h('p', { class: 'muted small' }, item.how)))),
        h('button', { class: 'btn btn-tinted', type: 'button', onclick: () => planStretch(p) }, 'Legg programmet i dagens plan')
      )
    ),
    h('p', { class: 'footnote' }, 'Tøy rolig til du kjenner strekk, aldri smerte. Pust jevnt og ikke gyng.')
  );
}

// ---------- Kondisjon ----------

function openSessionSheet(onSaved) {
  const data = { type: 'run', durationMin: '', distanceKm: '', rpe: null, hr: '', note: '' };
  let when = '';
  const distanceField = field('Distanse (km, valgfritt)', numberInput({ placeholder: 'F.eks. 5,2', label: 'Distanse i kilometer', onInput: (v) => { data.distanceKm = v; } }));
  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: true }, 'Lagre økt');
  save.addEventListener('click', async () => {
    save.disabled = true;
    const type = CARDIO_TYPES.find((t) => t.id === data.type);
    await addSession({
      at: fromLocalInput(when), type: data.type,
      durationMin: Math.round(parseNumber(data.durationMin) || 0),
      distanceKm: type.distance ? parseNumber(data.distanceKm) : null,
      rpe: data.rpe, hr: Math.round(parseNumber(data.hr) || 0), note: data.note,
    });
    toast('Økt lagret', { type: 'success' });
    sheet.close();
    onSaved();
  });
  const sheet = openSheet({
    title: 'Logg økt',
    content: h(
      'div',
      { class: 'stack' },
      field('Type', chips(CARDIO_TYPES, {
        required: true, value: data.type, label: 'Type økt',
        onChange: (id) => { data.type = id; distanceField.hidden = !CARDIO_TYPES.find((t) => t.id === id).distance; },
      })),
      field('Varighet (minutter)', numberInput({ placeholder: 'F.eks. 35', label: 'Varighet i minutter', onInput: (v) => { data.durationMin = v; save.disabled = !(parseNumber(v) > 0); } })),
      distanceField,
      field(RPE.name, scalePicker(RPE, (v) => { data.rpe = v; })),
      field('Snittpuls (valgfritt)', numberInput({ placeholder: 'Slag per minutt', label: 'Snittpuls', inputmode: 'numeric', onInput: (v) => { data.hr = v; } })),
      timeField((v) => { when = v; }),
      noteField((v) => { data.note = v; }, 'F.eks. «tunge ben, men fin flyt»'),
      save
    ),
  });
}

function cardioTab(view, sessions, reload) {
  const progress = cardioProgress(sessions);
  const weekStart = addDays(todayKey(), -6);
  const week = sessions.filter((s) => keyOfISO(s.at) >= weekStart);
  const minutes = week.reduce((sum, s) => sum + (s.durationMin || 0), 0);

  mount(
    view,
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => openSessionSheet(reload) }, '+ Logg økt'),
    h(
      'div',
      { class: 'tiles' },
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, '7 dager'), h('span', { class: 'tile-value' }, String(week.length)), h('span', { class: 'tile-sub' }, week.length === 1 ? 'økt' : 'økter')),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Tid'), h('span', { class: 'tile-value' }, String(minutes)), h('span', { class: 'tile-sub' }, 'minutter')),
      h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, 'Belastning'), h('span', { class: 'tile-value' }, String(Math.round(progress.thisWeek))), h('span', { class: 'tile-sub' }, progress.baseline ? `snitt ${Math.round(progress.baseline)}` : 'min × RPE'))
    ),
    progress.spike
      ? h('p', { class: 'care-note' }, icon('shield', 20), h('span', {}, 'Belastningen denne uken er over 30 % høyere enn snittet de tre foregående ukene. Brå økning gir økt skaderisiko – vurder en roligere dag.'))
      : null,

    sectionTitle('Veien mot kampform'),
    CARDIO_STAGES.map((stage, i) => {
      const current = stage.id === progress.stage;
      const el = h(
        'details',
        { class: `card stage${current ? ' current' : ''}` },
        h('summary', {}, h('span', { class: `phase-badge${current ? ' done' : ''}` }, String(i + 1)), h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, stage.name), current ? h('span', { class: 'row-hint' }, 'Du er her nå') : null), icon('chevron', 18)),
        h(
          'div',
          { class: 'stage-body' },
          h('p', { class: 'muted' }, stage.goal),
          h('div', { class: 'list' }, stage.sessions.map((s) => h('div', { class: 'row row-split' }, h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, s.title), h('span', { class: 'row-hint' }, s.detail)), addButton(`Legg ${s.title} i dagens plan`, () => planCardio(s))))),
          h('p', { class: 'muted small' }, stage.next)
        )
      );
      el.open = current;
      return el;
    }),
    h('p', { class: 'footnote' }, `Forslaget bygger på øktene dine de siste tre ukene: ${progress.counts.easy} rolige, ${progress.counts.intervals} intervaller og ${progress.counts.handball} håndballøkter.`),

    sectionTitle('Økter'),
    sessions.length
      ? h(
          'section',
          { class: 'card card-list' },
          sessions.slice(0, 30).map((s) =>
            h(
              'div',
              { class: 'row' },
              h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, cardioTypeName(s.type)), h('span', { class: 'row-hint' }, sessionSummary(s)), h('span', { class: 'row-hint' }, [dateTime(s.at), s.note].filter(Boolean).join(' · '))),
              h('button', {
                class: 'icon-btn', type: 'button', 'aria-label': 'Slett økt',
                onclick: async () => {
                  if (!(await confirmDialog({ title: 'Slette økten?', message: `${cardioTypeName(s.type)} · ${dateTime(s.at)}`, confirmText: 'Slett', danger: true }))) return;
                  await deleteSession(s.id);
                  reload();
                },
              }, '✕')
            )
          )
        )
      : card(h('p', { class: 'muted' }, 'Ingen økter logget ennå.'))
  );
}

// ---------- Råd ----------

async function suggestPlan(rec, sessions) {
  const today = todayKey();
  const existing = new Set((await getPlan(today)).map((i) => i.sourceId).filter(Boolean));
  const items = [];
  // Én øvelse fra hvert av de tre viktigste områdene som kan trenes nå.
  for (const area of rec.areas.filter((a) => !a.caution).slice(0, 3)) {
    const exercise = area.exercises.map(getExercise).find((e) => e && !existing.has(e.id) && !items.some((i) => i.sourceId === e.id));
    if (exercise) items.push({ title: exercise.name, detail: exercise.dose, category: 'strength', sourceId: exercise.id });
  }
  // Tøying for området med lavest bevegelighet.
  const stiff = rec.areas.find((a) => a.lowMobility && a.stretches.length) || rec.areas.find((a) => a.stretches.length);
  const program = stiff ? getStretchProgram(stiff.stretches[0]) : null;
  if (program && !existing.has(`stretch:${program.id}`)) items.push({ title: `Tøyeprogram: ${program.name}`, detail: `ca. ${program.minutes} min`, category: 'stretch', sourceId: `stretch:${program.id}` });
  // Én kondisjonsøkt fra gjeldende trinn.
  const stage = CARDIO_STAGES.find((s) => s.id === cardioProgress(sessions).stage);
  items.push({ title: stage.sessions[0].title, detail: stage.sessions[0].detail, category: 'cardio' });

  await addPlanItems(today, items);
  toast(`${items.length} punkter lagt i dagens plan`, { type: 'success' });
}

function adviceTab(view, { scores, headaches, sessions }) {
  const rec = buildRecommendations({ scores, headaches });

  const areaCard = (area) =>
    card(
      h('div', { class: 'card-head' }, h('h2', {}, area.title), h('span', { class: `chip level-${area.level}` }, PRIORITY_LEVELS[area.level])),
      h('p', { class: 'muted' }, area.why),
      area.reasons.length ? h('ul', { class: 'dot-list reasons' }, area.reasons.map((r) => h('li', {}, r))) : h('p', { class: 'muted small' }, area.hasData ? 'Ingen svakheter registrert – hold det ved like.' : 'Ikke kartlagt ennå. Anbefalt som håndballspesifikk forebygging.'),
      area.caution
        ? h('p', { class: 'care-note' }, icon('shield', 20), h('span', {}, 'Du har registrert sterk eller økende smerte her. La området hvile, og få det vurdert før du trener på det.'))
        : h('div', { class: 'list' }, area.exercises.map(getExercise).filter(Boolean).slice(0, 4).map(exerciseRow)),
      !area.caution && area.lowMobility && area.stretches.length
        ? h('div', { class: 'button-row' }, area.stretches.map((id) => getStretchProgram(id)).filter(Boolean).map((p) => h('button', { class: 'btn btn-small', type: 'button', onclick: () => planStretch(p) }, `+ Tøyeprogram: ${p.name}`)))
        : null
    );

  mount(
    view,
    rec.alerts.length
      ? h(
          'section',
          { class: 'card card-notice' },
          h('div', { class: 'notice-head' }, icon('shield', 24), h('h2', {}, 'Få dette sjekket')),
          rec.alerts.map((a) => h('p', {}, h('strong', {}, `${a.title}: `), a.text)),
          h('p', { class: 'muted small' }, 'Appen stiller ikke diagnoser. Dette er et råd om å la fagfolk vurdere det.')
        )
      : null,
    rec.headache
      ? card(
          h('div', { class: 'notice-head' }, icon('shield', 24), h('h2', {}, 'Hodepine')),
          h('p', {}, `${rec.headache} Se om utløserne du har krysset av går igjen – søvn, væske, skjermbruk og stiv nakke er vanlige.`),
          h('p', { class: 'muted small' }, 'Kontakt lege hvis hodepinen kommer plutselig og kraftig, oppstår etter slag mot hodet, kommer med feber og stiv nakke, gir synsforstyrrelser, talevansker eller lammelser, eller stadig blir verre. Ring 113 ved akutte symptomer.')
        )
      : null,
    card(
      h('div', { class: 'notice-head' }, icon('sparkle', 24), h('h2', {}, 'Dagens forslag')),
      h('p', { class: 'muted' }, 'Få et forslag ut fra de viktigste områdene dine: tre styrkeøvelser, ett tøyeprogram og én kondisjonsøkt.'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => suggestPlan(rec, sessions) }, 'Lag forslag til dagens plan')
    ),
    rec.unmapped
      ? card(h('p', {}, `${rec.mapped} av ${rec.mapped + rec.unmapped} kroppsdeler er kartlagt. Jo flere du registrerer, desto mer treffsikre blir rådene.`), h('a', { class: 'btn btn-tinted', href: '#/kropp' }, 'Åpne kroppskartet'))
      : null,
    sectionTitle('Prioriteringer'),
    rec.areas.map(areaCard),
    h('p', { class: 'footnote' }, 'Rådene er generelle og bygger på scorene dine og kjent skadeforebygging i håndball. De erstatter ikke vurdering fra lege eller fysioterapeut.')
  );
}

// ---------- Visning ----------

export async function renderTraining(view) {
  mount(
    view,
    h('header', { class: 'view-header' }, h('h1', {}, 'Trening')),
    segmented(TABS, state.tab, (id) => { state.tab = id; refresh(); }, 'Visning')
  );

  if (state.tab === 'exercises') return exercisesTab(view);
  if (state.tab === 'stretch') return stretchTab(view);

  const sessions = await getSessions();
  if (state.tab === 'cardio') return cardioTab(view, sessions, refresh);

  const [scores, headaches] = await Promise.all([getScores(), getHeadaches()]);
  return adviceTab(view, { scores, headaches, sessions });
}
