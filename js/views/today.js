// «I dag»: dagens plan (avkrysningsliste), dagbok, kalender og mål.

import { h, mount, setChildren, card, sectionTitle, segmented, openSheet, confirmDialog, formatDate } from '../ui.js';
import { icon } from '../icons.js';
import { field, chips, textInput, ring } from '../forms.js';
import {
  todayKey, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, keyOfISO,
  formatLong, formatShort, formatMonth, periodLabel,
} from '../dates.js';
import { CATEGORIES, categoryName, getAllPlanItems, addPlanItem, addPlanItems, setPlanItemDone, deletePlanItem, previousPlan, getAllDiary, saveDiary } from '../planner.js';
import { GOAL_KINDS, getGoals, saveGoal, deleteGoal, tickGoal, defaultTitle, goalProgress, goalHistory } from '../goals.js';
import { getSessions, cardioTypeName, sessionSummary } from '../training.js';
import { getScores, getHeadaches, scoreSummary, headacheSummary } from '../scores.js';
import { ALL_REGION_IDS, regionLabel } from '../regions.js';
import { backupStatus, snoozeBackupReminder } from '../backup.js';
import { openExportSheet } from './settings.js';
import { isIOS, isStandalone } from '../pwa.js';
import { refresh } from '../router.js';

// Huskes mens appen er åpen. date === null betyr «følg dagens dato».
const state = { tab: 'day', date: null, month: null };

const TABS = [
  { id: 'day', name: 'Dag' },
  { id: 'calendar', name: 'Kalender' },
  { id: 'goals', name: 'Mål' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'God natt';
  if (hour < 10) return 'God morgen';
  if (hour < 18) return 'God dag';
  return 'God kveld';
}

// ---------- Påminnelser ----------

function backupReminder(status) {
  const text = status.lastExportAt
    ? `Det er ${status.days} dager siden siste sikkerhetskopi (${formatDate(status.lastExportAt)}).`
    : `Du har brukt appen i ${status.days} dager uten å ta sikkerhetskopi.`;
  return h(
    'section',
    { class: 'card card-notice' },
    h('div', { class: 'notice-head' }, icon('shield', 24), h('h2', {}, 'Tid for sikkerhetskopi')),
    h('p', {}, `${text} iOS kan slette data for apper som ikke brukes – lagre en kopi i Filer.`),
    h(
      'div',
      { class: 'button-row' },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: openExportSheet }, 'Eksporter nå'),
      h('button', { class: 'btn btn-plain', type: 'button', onclick: async () => { await snoozeBackupReminder(24); refresh(); } }, 'Senere')
    )
  );
}

function installHint() {
  return card(
    h('div', { class: 'notice-head' }, icon('share', 24), h('h2', {}, 'Legg til på Hjem-skjerm')),
    h('p', { class: 'muted' }, 'Åpne siden i Safari, trykk på Del-knappen og velg «Legg til på Hjem-skjerm». Da kjører appen i fullskjerm, fungerer uten nett og får varig lagring.')
  );
}

// ---------- Dagens plan ----------

function openPlanItemSheet(date, onSaved) {
  const data = { title: '', detail: '', category: 'strength' };
  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: true }, 'Legg til');
  const title = textInput({ placeholder: 'F.eks. «Nordic hamstring»', label: 'Hva skal gjøres', maxlength: '80', onInput: (v) => { data.title = v; save.disabled = !v.trim(); } });
  save.addEventListener('click', async () => {
    save.disabled = true;
    await addPlanItem({ date, ...data });
    sheet.close();
    onSaved();
  });
  const sheet = openSheet({
    title: 'Nytt punkt i planen',
    content: h(
      'div',
      { class: 'stack' },
      field('Hva', title),
      field('Kategori', chips(CATEGORIES, { required: true, value: data.category, label: 'Kategori', onChange: (id) => { data.category = id; } })),
      field('Sett/reps eller tid (valgfritt)', textInput({ placeholder: 'F.eks. «3 × 8» eller «20 min»', label: 'Sett, reps eller tid', maxlength: '40', onInput: (v) => { data.detail = v; } })),
      save,
      h('p', { class: 'muted small' }, 'Tips: Under Trening kan du legge øvelser og tøyeprogrammer rett inn i planen.')
    ),
  });
  setTimeout(() => title.focus(), 350);
}

function planCard(date, items, reload) {
  const done = items.filter((i) => i.done).length;
  const list = h(
    'div',
    { class: 'checklist' },
    items.map((item) =>
      h(
        'div',
        { class: `check-item${item.done ? ' done' : ''}` },
        h(
          'button',
          {
            class: 'check-main', type: 'button', role: 'checkbox', 'aria-checked': String(item.done),
            onclick: async () => { await setPlanItemDone(item, !item.done); reload(); },
          },
          h('span', { class: 'check-box' }, item.done ? icon('check', 16) : null),
          h(
            'span',
            { class: 'row-text' },
            h('span', { class: 'check-title' }, item.title),
            h('span', { class: 'row-hint' }, h('i', { class: 'cat-dot', 'data-cat': item.category }), [categoryName(item.category), item.detail].filter(Boolean).join(' · '))
          )
        ),
        h('button', {
          class: 'icon-btn', type: 'button', 'aria-label': `Fjern ${item.title}`,
          onclick: async () => { await deletePlanItem(item.id); reload(); },
        }, '✕')
      )
    )
  );

  const copyPrevious = h('button', { class: 'btn btn-plain', type: 'button', hidden: true }, 'Kopier forrige plan');
  if (!items.length) {
    previousPlan(date).then((prev) => {
      if (!prev) return;
      copyPrevious.hidden = false;
      copyPrevious.textContent = `Kopier planen fra ${formatShort(prev.date)}`;
      copyPrevious.addEventListener('click', async () => {
        await addPlanItems(date, prev.items.map((i) => ({ title: i.title, detail: i.detail, category: i.category, sourceId: i.sourceId })));
        reload();
      });
    });
  }

  return card(
    h(
      'div',
      { class: 'card-head' },
      h('h2', {}, date === todayKey() ? 'Dagens plan' : 'Plan'),
      items.length ? h('span', { class: 'muted small' }, `${done} av ${items.length}`) : null
    ),
    items.length ? h('div', { class: 'progress', role: 'img', 'aria-label': `${done} av ${items.length} fullført` }, h('i', { style: `width:${(done / items.length) * 100}%` })) : null,
    items.length ? list : h('p', { class: 'muted' }, 'Ingen punkter ennå. Legg inn øvelser, tøying og kondis du vil gjøre.'),
    h(
      'div',
      { class: 'button-row' },
      h('button', { class: 'btn btn-tinted', type: 'button', onclick: () => openPlanItemSheet(date, reload) }, '+ Legg til'),
      copyPrevious
    )
  );
}

// ---------- Dagbok ----------

function diaryCard(date, text) {
  const status = h('span', { class: 'muted small' }, '');
  const area = h('textarea', { class: 'input diary', rows: '4', placeholder: 'Hvordan kjennes kroppen? Hva gikk bra, hva var tungt?', 'aria-label': 'Dagbok' }, text);
  let timer = null;
  let saved = text;
  const save = async () => {
    clearTimeout(timer);
    if (area.value === saved) return;
    saved = area.value;
    await saveDiary(date, saved);
    status.textContent = 'Lagret';
  };
  area.addEventListener('input', () => {
    status.textContent = '';
    clearTimeout(timer);
    timer = setTimeout(save, 700);
  });
  area.addEventListener('blur', save);
  const el = card(h('div', { class: 'card-head' }, h('h2', {}, 'Dagbok'), status), area);
  el._flush = save;
  return el;
}

// ---------- Det som er registrert en dag ----------

function dayActivity(date, data) {
  const rows = [];
  for (const s of data.sessions.filter((x) => keyOfISO(x.at) === date)) rows.push({ cat: 'cardio', title: cardioTypeName(s.type), text: sessionSummary(s) });
  for (const s of data.scores.filter((x) => keyOfISO(x.at) === date)) rows.push({ cat: 'body', title: regionLabel(s.regionId), text: scoreSummary(s) });
  for (const x of data.headaches.filter((y) => keyOfISO(y.at) === date)) rows.push({ cat: 'body', title: 'Hodepine', text: headacheSummary(x) });
  return rows;
}

function activityList(rows) {
  return h(
    'section',
    { class: 'card card-list' },
    rows.map((r) => h('div', { class: 'row' }, h('i', { class: 'cat-dot cat-dot-lg', 'data-cat': r.cat }), h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, r.title), h('span', { class: 'row-hint' }, r.text))))
  );
}

// ---------- Mål ----------

function goalRow(goal, data, { compact = false, onOpen, reload }) {
  const day = todayKey();
  const p = goalProgress(goal, day, data);
  const history = compact ? [] : goalHistory(goal, day, data);
  return h(
    'div',
    { class: 'goal' },
    h(
      'button',
      { class: 'goal-main', type: 'button', onclick: onOpen },
      ring(p.ratio, { done: p.done, label: `${goal.title}: ${p.text}` }),
      h(
        'span',
        { class: 'row-text' },
        h('span', { class: 'row-label' }, goal.title),
        h('span', { class: 'row-hint' }, p.text),
        history.length
          ? h('span', { class: 'goal-history', 'aria-label': `Tidligere perioder: ${history.map((x) => (x.done ? 'nådd' : 'ikke nådd')).join(', ')}` }, history.map((x) => h('i', { class: x.done ? 'hit' : '' })), h('span', {}, goal.period === 'week' ? 'forrige uker' : 'forrige måneder'))
          : null
      )
    ),
    goal.kind === 'manual' && !compact
      ? h(
          'span',
          { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': 'Én mindre', disabled: !p.value, onclick: async () => { await tickGoal(goal, -1); reload(); } }, '−'),
          h('button', { type: 'button', 'aria-label': 'Én til', onclick: async () => { await tickGoal(goal, 1); reload(); } }, '+')
        )
      : null
  );
}

function openGoalSheet(goal, onSaved) {
  const editing = !!goal;
  const data = goal ? { ...goal } : { period: 'week', kind: 'plan', category: 'strength', regionId: 'neck', target: 3, title: '' };
  if (!data.regionId) data.regionId = 'neck';
  let customTitle = editing && data.title !== defaultTitle(data) ? data.title : '';

  const hint = h('p', { class: 'muted small' });
  const extra = h('div', { class: 'stack' });
  const targetValue = h('span', { class: 'stepper-value' });
  const targetLabel = h('span', { class: 'field-label' });
  const titleInput = textInput({ value: customTitle, label: 'Navn på målet', maxlength: '60', onInput: (v) => { customTitle = v; } });

  const step = () => (data.kind === 'minutes' ? 10 : 1);
  const paint = () => {
    const kind = GOAL_KINDS.find((k) => k.id === data.kind);
    hint.textContent = kind.hint;
    targetLabel.textContent = data.kind === 'pain' ? 'Smerte skal være høyst' : data.kind === 'minutes' ? 'Antall minutter' : data.kind === 'plan' ? 'Antall dager' : 'Antall';
    targetValue.textContent = String(data.target);
    titleInput.placeholder = defaultTitle(data);
    if (data.kind === 'plan') {
      setChildren(extra, field('Kategori', chips(CATEGORIES, { required: true, value: data.category || 'strength', label: 'Kategori', onChange: (id) => { data.category = id; paint(); } })));
    } else if (data.kind === 'pain') {
      const select = h('select', { class: 'input', 'aria-label': 'Kroppsdel' }, ALL_REGION_IDS.filter((id) => id !== 'head').map((id) => h('option', { value: id, selected: id === data.regionId }, regionLabel(id))));
      select.addEventListener('change', () => { data.regionId = select.value; paint(); });
      setChildren(extra, field('Kroppsdel', select));
    } else {
      setChildren(extra);
    }
  };
  const bump = (dir) => {
    const max = data.kind === 'pain' ? 9 : data.kind === 'minutes' ? 3000 : 62;
    const min = data.kind === 'pain' ? 0 : step();
    data.target = Math.max(min, Math.min(max, data.target + dir * step()));
    paint();
  };

  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, editing ? 'Lagre endringer' : 'Opprett mål');
  save.addEventListener('click', async () => {
    save.disabled = true;
    if (!data.category) data.category = 'strength';
    await saveGoal({ ...data, title: customTitle.trim() || defaultTitle(data) });
    sheet.close();
    onSaved();
  });

  const content = h(
    'div',
    { class: 'stack' },
    segmented([{ id: 'week', name: 'Ukemål' }, { id: 'month', name: 'Månedsmål' }], data.period, (id) => { data.period = id; }, 'Periode'),
    field('Hva skal telles', chips(GOAL_KINDS, {
      required: true, value: data.kind, label: 'Type mål',
      onChange: (id) => {
        data.kind = id;
        data.target = id === 'pain' ? 3 : id === 'minutes' ? 90 : 3;
        paint();
      },
    })),
    hint,
    extra,
    h('div', { class: 'field' }, h('div', { class: 'field-head' }, targetLabel), h('div', { class: 'stepper stepper-lg' }, h('button', { type: 'button', 'aria-label': 'Mindre', onclick: () => bump(-1) }, '−'), targetValue, h('button', { type: 'button', 'aria-label': 'Mer', onclick: () => bump(1) }, '+'))),
    field('Navn (valgfritt)', titleInput),
    save,
    editing
      ? h('button', {
          class: 'btn btn-plain-danger btn-block', type: 'button',
          onclick: async () => {
            if (!(await confirmDialog({ title: 'Slette målet?', message: goal.title, confirmText: 'Slett', danger: true }))) return;
            await deleteGoal(goal.id);
            sheet.close();
            onSaved();
          },
        }, 'Slett mål')
      : null
  );
  paint();
  const sheet = openSheet({ title: editing ? 'Endre mål' : 'Nytt mål', content });
}

// ---------- Kalender ----------

function calendar(data, selected, onSelect) {
  const month = state.month || startOfMonth(selected);
  const first = startOfWeek(month);
  const last = endOfMonth(month);
  const today = todayKey();

  // Hva som er gjort per dag.
  const marks = new Map();
  const mark = (day, cat) => {
    if (!marks.has(day)) marks.set(day, new Set());
    marks.get(day).add(cat);
  };
  for (const i of data.planItems) if (i.done) mark(i.date, i.category);
  for (const s of data.sessions) mark(keyOfISO(s.at), 'cardio');
  const diaryDays = new Set(data.diary.map((d) => d.date));

  const cells = [];
  for (let day = first; day <= last || cells.length % 7 !== 0; day = addDays(day, 1)) {
    const inMonth = day.slice(0, 7) === month.slice(0, 7);
    const cats = [...(marks.get(day) || [])];
    const order = ['strength', 'stretch', 'cardio', 'other'].filter((c) => cats.includes(c));
    const what = order.map((c) => categoryName(c).toLowerCase()).join(', ');
    cells.push(
      h(
        'button',
        {
          class: `cal-day${inMonth ? '' : ' outside'}${day === today ? ' today' : ''}${day === selected ? ' selected' : ''}`,
          type: 'button',
          'aria-label': `${formatLong(day)}${what ? `: ${what}` : ''}${diaryDays.has(day) ? ', dagboknotat' : ''}`,
          'aria-pressed': String(day === selected),
          onclick: () => onSelect(day),
        },
        h('span', { class: 'cal-num' }, String(Number(day.slice(8)))),
        h('span', { class: 'cal-dots' }, order.map((c) => h('i', { class: 'cat-dot', 'data-cat': c })), diaryDays.has(day) ? h('i', { class: 'cal-note' }) : null)
      )
    );
  }

  return h(
    'div',
    { class: 'calendar' },
    h(
      'div',
      { class: 'cal-head' },
      h('button', { class: 'icon-btn nav-btn', type: 'button', 'aria-label': 'Forrige måned', onclick: () => { state.month = addMonths(month, -1); refresh(); } }, '‹'),
      h('h2', {}, formatMonth(month)),
      h('button', { class: 'icon-btn nav-btn', type: 'button', 'aria-label': 'Neste måned', onclick: () => { state.month = addMonths(month, 1); refresh(); } }, '›')
    ),
    h('div', { class: 'cal-grid cal-weekdays', 'aria-hidden': 'true' }, ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((d) => h('span', {}, d))),
    h('div', { class: 'cal-grid' }, cells),
    h(
      'div',
      { class: 'cal-legend' },
      [['strength', 'Styrke'], ['stretch', 'Tøying'], ['cardio', 'Kondis'], ['other', 'Annet']].map(([c, name]) => h('span', {}, h('i', { class: 'cat-dot', 'data-cat': c }), name)),
      h('span', {}, h('i', { class: 'cal-note' }), 'Dagbok')
    )
  );
}

// ---------- Visning ----------

export async function renderToday(view) {
  const today = todayKey();
  const date = state.date || today;
  const [planItems, diary, goals, sessions, scores, headaches, status] = await Promise.all([
    getAllPlanItems(), getAllDiary(), getGoals(), getSessions(), getScores(), getHeadaches(), backupStatus(),
  ]);
  const data = { planItems, diary, sessions, scores, headaches };
  const setTab = (id) => { state.tab = id; refresh(); };
  const setDate = (d) => { state.date = d === today ? null : d; refresh(); };

  mount(
    view,
    h('header', { class: 'view-header' }, h('p', { class: 'eyebrow' }, formatLong(today)), h('h1', {}, state.tab === 'day' && date === today ? greeting() : 'I dag')),
    segmented(TABS, state.tab, setTab, 'Visning')
  );

  if (state.tab === 'day') {
    const items = planItems.filter((i) => i.date === date).sort((a, b) => a.order - b.order);
    const text = (diary.find((d) => d.date === date) || {}).text || '';
    const activity = dayActivity(date, data);
    const weekGoals = goals.filter((g) => g.period === 'week');
    const diaryEl = diaryCard(date, text);
    const reload = async () => { await diaryEl._flush(); refresh(); };

    mount(
      view,
      h(
        'div',
        { class: 'date-nav' },
        h('button', { class: 'icon-btn nav-btn', type: 'button', 'aria-label': 'Forrige dag', onclick: async () => { await diaryEl._flush(); setDate(addDays(date, -1)); } }, '‹'),
        h('div', { class: 'date-nav-label' }, h('strong', {}, date === today ? 'I dag' : formatLong(date)), date === today ? null : h('button', { class: 'link-btn', type: 'button', onclick: () => setDate(today) }, 'Gå til i dag')),
        h('button', { class: 'icon-btn nav-btn', type: 'button', 'aria-label': 'Neste dag', onclick: async () => { await diaryEl._flush(); setDate(addDays(date, 1)); } }, '›')
      ),
      date === today && status.due && !status.snoozed ? backupReminder(status) : null,
      date === today && isIOS() && !isStandalone() ? installHint() : null,
      planCard(date, items, reload),
      diaryEl,
      activity.length ? [sectionTitle('Registrert denne dagen'), activityList(activity)] : null,
      date === today && weekGoals.length
        ? [
            sectionTitle('Ukens mål'),
            h('section', { class: 'card card-list' }, weekGoals.map((g) => goalRow(g, data, { compact: true, onOpen: () => setTab('goals') }))),
          ]
        : null,
      date === today && !goals.length
        ? card(h('div', { class: 'notice-head' }, icon('sparkle', 24), h('h2', {}, 'Sett et mål')), h('p', { class: 'muted' }, 'Ukemål og månedsmål holder deg på sporet – for eksempel «styrke 3 dager» eller «nakkesmerte 3 eller lavere».'), h('button', { class: 'btn btn-tinted', type: 'button', onclick: () => setTab('goals') }, 'Gå til mål'))
        : null
    );
    return () => { diaryEl._flush(); };
  }

  if (state.tab === 'calendar') {
    const items = planItems.filter((i) => i.date === date && i.done);
    const note = (diary.find((d) => d.date === date) || {}).text || '';
    const activity = [...items.map((i) => ({ cat: i.category, title: i.title, text: [categoryName(i.category), i.detail].filter(Boolean).join(' · ') })), ...dayActivity(date, data)];
    mount(
      view,
      card(calendar(data, date, (d) => { state.date = d === today ? null : d; state.month = startOfMonth(d); refresh(); })),
      h('div', { class: 'section-row' }, sectionTitle(date === today ? 'I dag' : formatLong(date)), h('button', { class: 'link-btn', type: 'button', onclick: () => setTab('day') }, 'Åpne dagen')),
      activity.length ? activityList(activity) : card(h('p', { class: 'muted' }, 'Ingenting registrert denne dagen.')),
      note ? card(h('div', { class: 'field-label' }, 'Dagbok'), h('p', { class: 'diary-text' }, note)) : null
    );
    return undefined;
  }

  // Mål
  const reload = () => refresh();
  const section = (period, title) => {
    const list = goals.filter((g) => g.period === period);
    return [
      h('div', { class: 'section-row' }, sectionTitle(title), h('span', { class: 'muted small' }, periodLabel(period, today))),
      list.length
        ? h('section', { class: 'card card-list' }, list.map((g) => goalRow(g, data, { onOpen: () => openGoalSheet(g, reload), reload })))
        : card(h('p', { class: 'muted' }, period === 'week' ? 'Ingen ukemål ennå.' : 'Ingen månedsmål ennå.')),
    ];
  };
  mount(
    view,
    section('week', 'Ukemål'),
    section('month', 'Månedsmål'),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => openGoalSheet(null, reload) }, '+ Nytt mål'),
    h('p', { class: 'footnote' }, 'Målene gjentas hver uke eller måned. Fremdriften regnes ut fra det du registrerer i planen, kondisjonsloggen og kroppskartet.')
  );
  return undefined;
}
