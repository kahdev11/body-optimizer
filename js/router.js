// Enkel hash-basert ruter med fanelinje.

import { h } from './ui.js';
import { icon } from './icons.js';

let routes = [];
let outlet = null;
let tabbar = null;
let cleanup = null;

const currentId = () => {
  const id = location.hash.replace(/^#\/?/, '').split('/')[0];
  return routes.some((r) => r.id === id) ? id : routes[0].id;
};

async function show() {
  const id = currentId();
  const route = routes.find((r) => r.id === id);
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  for (const tab of tabbar.children) {
    const on = tab.dataset.id === id;
    tab.classList.toggle('active', on);
    if (on) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }

  const view = h('div', { class: 'view' });
  try {
    cleanup = await route.render(view);
  } catch (err) {
    console.error(err);
    view.replaceChildren(
      h('header', { class: 'view-header' }, h('h1', {}, route.title)),
      h('section', { class: 'card' }, h('p', {}, 'Noe gikk galt da siden skulle vises.'), h('p', { class: 'muted small' }, String(err && err.message ? err.message : err)))
    );
  }
  if (currentId() !== id) return; // brukeren har allerede navigert videre
  outlet.replaceChildren(view);
  window.scrollTo(0, 0);
}

/** Tegner gjeldende visning på nytt (f.eks. etter at data er endret). */
export const refresh = () => show();

export function initRouter({ routes: list, outlet: outletEl, tabbar: tabbarEl }) {
  routes = list;
  outlet = outletEl;
  tabbar = tabbarEl;
  tabbar.replaceChildren(
    ...routes.map((r) => h('a', { class: 'tab', href: `#/${r.id}`, dataset: { id: r.id } }, icon(r.icon), h('span', { class: 'tab-label' }, r.title)))
  );
  window.addEventListener('hashchange', show);
  return show();
}
