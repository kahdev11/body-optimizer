// Målinger: vekt over tid, høyde, automatisk BMI og valgfritt midjemål.
// Vises som egen fane under «Kropp».

import { h, mount, card, sectionTitle, toast, openSheet, confirmDialog, formatDate } from '../ui.js';
import { field, numberInput, timeField } from '../forms.js';
import { fromLocalInput } from '../dates.js';
import { getMeasurements, addMeasurement, deleteMeasurement, getHeightCm, setHeightCm, bmi, bmiCategory, formatNumber, parseNumber } from '../training.js';

const dateTime = (iso) => formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' });

function openMeasurementSheet(latest, onSaved) {
  const data = { weight: '', waist: '' };
  let when = '';
  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: true }, 'Lagre måling');
  const check = () => {
    const w = parseNumber(data.weight);
    const m = parseNumber(data.waist);
    save.disabled = !((w >= 30 && w <= 250) || (m >= 40 && m <= 200)) || (data.weight.trim() && !(w >= 30 && w <= 250)) || (data.waist.trim() && !(m >= 40 && m <= 200));
  };
  save.addEventListener('click', async () => {
    save.disabled = true;
    await addMeasurement({ at: fromLocalInput(when), weightKg: parseNumber(data.weight), waistCm: parseNumber(data.waist) });
    toast('Måling lagret', { type: 'success' });
    sheet.close();
    onSaved();
  });
  const sheet = openSheet({
    title: 'Ny måling',
    content: h(
      'div',
      { class: 'stack' },
      field('Vekt (kg)', numberInput({ placeholder: latest && latest.weightKg ? `Sist: ${formatNumber(latest.weightKg)}` : 'F.eks. 88,5', label: 'Vekt i kilo', onInput: (v) => { data.weight = v; check(); } })),
      field('Midjemål (cm, valgfritt)', numberInput({ placeholder: 'Mål rundt navlen', label: 'Midjemål i centimeter', onInput: (v) => { data.waist = v; check(); } })),
      timeField((v) => { when = v; }),
      save,
      h('p', { class: 'muted small' }, 'Vei deg gjerne til samme tid på døgnet, for eksempel om morgenen.')
    ),
  });
}

function openHeightSheet(current, onSaved) {
  let value = current ? String(current) : '';
  const save = h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: !current }, 'Lagre høyde');
  save.addEventListener('click', async () => {
    await setHeightCm(parseNumber(value));
    sheet.close();
    onSaved();
  });
  const sheet = openSheet({
    title: 'Høyde',
    content: h(
      'div',
      { class: 'stack' },
      field('Høyde (cm)', numberInput({ value, placeholder: 'F.eks. 188', label: 'Høyde i centimeter', onInput: (v) => { value = v; const n = parseNumber(v); save.disabled = !(n >= 120 && n <= 230); } })),
      save
    ),
  });
}

const tile = (label, value, sub, onclick) =>
  h(onclick ? 'button' : 'div', { class: 'tile', type: onclick ? 'button' : null, onclick }, h('span', { class: 'tile-label' }, label), h('span', { class: 'tile-value' }, value), h('span', { class: 'tile-sub' }, sub));

export async function renderMeasurements(view, reload) {
  const [measurements, height] = await Promise.all([getMeasurements(), getHeightCm()]);
  const latestWeight = measurements.find((m) => m.weightKg);
  const latestWaist = measurements.find((m) => m.waistCm);
  const previousWeight = measurements.filter((m) => m.weightKg)[1];
  const value = bmi(latestWeight && latestWeight.weightKg, height);
  const diff = latestWeight && previousWeight ? latestWeight.weightKg - previousWeight.weightKg : null;

  mount(
    view,
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: () => openMeasurementSheet(latestWeight, reload) }, '+ Ny måling'),
    h(
      'div',
      { class: 'tiles tiles-2' },
      tile('Vekt', latestWeight ? formatNumber(latestWeight.weightKg) : '–', latestWeight ? (diff !== null && Math.abs(diff) >= 0.05 ? `kg · ${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))} siden sist` : 'kg') : 'ikke registrert'),
      tile('BMI', value ? formatNumber(value) : '–', value ? bmiCategory(value) : height ? 'trenger vekt' : 'trenger høyde'),
      tile('Høyde', height ? String(Math.round(height)) : '–', height ? 'cm · trykk for å endre' : 'trykk for å legge inn', () => openHeightSheet(height, reload)),
      tile('Midje', latestWaist ? formatNumber(latestWaist.waistCm) : '–', latestWaist ? 'cm' : 'valgfritt')
    ),
    h('p', { class: 'footnote' }, 'BMI regnes ut fra vekt og høyde og skiller ikke mellom muskler og fett. For en idrettsutøver sier midjemål og utvikling over tid ofte mer.'),
    sectionTitle('Historikk'),
    measurements.length
      ? h(
          'section',
          { class: 'card card-list' },
          measurements.slice(0, 40).map((m) => {
            const b = bmi(m.weightKg, height);
            const parts = [m.weightKg ? `${formatNumber(m.weightKg)} kg` : '', b ? `BMI ${formatNumber(b)}` : '', m.waistCm ? `midje ${formatNumber(m.waistCm)} cm` : ''].filter(Boolean);
            return h(
              'div',
              { class: 'row' },
              h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, parts.join(' · ')), h('span', { class: 'row-hint' }, dateTime(m.at))),
              h('button', {
                class: 'icon-btn', type: 'button', 'aria-label': 'Slett måling',
                onclick: async () => {
                  if (!(await confirmDialog({ title: 'Slette målingen?', message: `${dateTime(m.at)} – ${parts.join(' · ')}`, confirmText: 'Slett', danger: true }))) return;
                  await deleteMeasurement(m.id);
                  reload();
                },
              }, '✕')
            );
          })
        )
      : card(h('p', { class: 'muted' }, 'Ingen målinger ennå. Grafer over vekt og BMI finner du under Statistikk.'))
  );
}
