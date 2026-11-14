// «I dag» – i fase 1: velkomst, påminnelse om sikkerhetskopi og veikart.
// Dagbok, dagens plan og mål kommer i fase 3.

import { h, mount, card, sectionTitle, formatDate } from '../ui.js';
import { icon } from '../icons.js';
import { backupStatus, snoozeBackupReminder } from '../backup.js';
import { openExportSheet } from './settings.js';
import { isIOS, isStandalone } from '../pwa.js';
import { refresh } from '../router.js';

const PHASES = [
  { n: 1, title: 'Grunnmur', text: 'App på Hjem-skjerm, lokal lagring, sikkerhetskopi og design', done: true },
  { n: 2, title: 'Kroppskart', text: 'Score styrke, bevegelighet og smerte per kroppsdel' },
  { n: 3, title: 'Dagbok og mål', text: 'Notater, dagens plan, kalender, uke- og månedsmål' },
  { n: 4, title: 'Kondisjon og statistikk', text: 'Øktlogg, vekt/BMI og grafer over tid' },
  { n: 5, title: 'Anbefalinger', text: 'Prioriteringer, øvelsesbibliotek og tøyeprogrammer' },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'God natt';
  if (hour < 10) return 'God morgen';
  if (hour < 18) return 'God dag';
  return 'God kveld';
}

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

export async function renderToday(view) {
  const status = await backupStatus();
  const today = formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' });

  mount(
    view,
    h('header', { class: 'view-header' }, h('p', { class: 'eyebrow' }, today), h('h1', {}, greeting())),
    status.due && !status.snoozed ? backupReminder(status) : null,
    isIOS() && !isStandalone() ? installHint() : null,
    card(
      h('div', { class: 'notice-head' }, icon('sparkle', 24), h('h2', {}, 'Grunnmuren er på plass')),
      h('p', { class: 'muted' }, 'Appen lagrer alt lokalt på telefonen, fungerer uten nett og kan sikkerhetskopieres til Filer. Prøv de tre designvariantene og lys/mørk modus under Innstillinger.'),
      h('a', { class: 'btn btn-tinted', href: '#/innstillinger' }, 'Åpne Innstillinger')
    ),
    sectionTitle('Veien videre'),
    h(
      'section',
      { class: 'card card-list' },
      PHASES.map((p) =>
        h(
          'div',
          { class: 'row phase' },
          h('span', { class: `phase-badge${p.done ? ' done' : ''}` }, p.done ? icon('check', 16) : String(p.n)),
          h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, p.title), h('span', { class: 'row-hint' }, p.text)),
          h('span', { class: `chip${p.done ? ' chip-done' : ''}` }, p.done ? 'Ferdig' : 'Kommer')
        )
      )
    )
  );
}
