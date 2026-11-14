// Oppstart: lagring, database (med migreringer), utseende, ruter og service worker.

import { getDB, getMeta, setMeta, nowISO, DatabaseTooNewError } from './db.js';
import { initTheme } from './theme.js';
import { initRouter } from './router.js';
import { initPWA, onUpdateReady, applyUpdate } from './pwa.js';
import { h } from './ui.js';
import { renderToday } from './views/today.js';
import { renderSettings } from './views/settings.js';
import { renderBody } from './views/body.js';
import { renderTraining } from './views/training.js';
import { renderStats } from './views/stats.js';

const ROUTES = [
  { id: 'idag', title: 'I dag', icon: 'today', render: renderToday },
  { id: 'kropp', title: 'Kropp', icon: 'body', render: renderBody },
  { id: 'trening', title: 'Trening', icon: 'training', render: renderTraining },
  { id: 'statistikk', title: 'Statistikk', icon: 'stats', render: renderStats },
  { id: 'innstillinger', title: 'Innstillinger', icon: 'settings', render: renderSettings },
];

function showFatal(err) {
  console.error(err);
  const tooNew = err instanceof DatabaseTooNewError;
  document.getElementById('app').replaceChildren(
    h(
      'div',
      { class: 'view' },
      h('header', { class: 'view-header' }, h('h1', {}, tooNew ? 'Appen må oppdateres' : 'Kunne ikke åpne databasen')),
      h(
        'section',
        { class: 'card' },
        h(
          'p',
          {},
          tooNew
            ? 'Dataene dine er lagret med en nyere versjon av appen enn den som kjører nå. Last inn på nytt for å hente siste versjon.'
            : 'Noe gikk galt under åpning eller oppgradering av databasen. Dataene dine er ikke slettet – oppgraderingen ble rullet tilbake.'
        ),
        h('p', { class: 'muted small' }, String(err && err.message ? err.message : err)),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => location.reload() }, 'Last inn på nytt')
      )
    )
  );
}

function showUpdateBanner() {
  const banner = document.getElementById('update-banner');
  if (!banner || banner.childElementCount) return;
  banner.append(
    h('span', {}, 'Ny versjon tilgjengelig'),
    h('button', { class: 'btn btn-small btn-on-accent', type: 'button', onclick: applyUpdate }, 'Oppdater')
  );
  banner.hidden = false;
  requestAnimationFrame(() => banner.classList.add('show'));
}

async function start() {
  // Be om varig lagring, slik at iOS/nettleseren ikke rydder bort dataene.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  onUpdateReady(showUpdateBanner);
  initPWA();

  try {
    await getDB();
    await initTheme();
    if (!(await getMeta('firstRunAt'))) await setMeta('firstRunAt', nowISO());
  } catch (err) {
    showFatal(err);
    return;
  }

  await initRouter({
    routes: ROUTES,
    outlet: document.getElementById('app'),
    tabbar: document.getElementById('tabbar'),
  });
}

start();
