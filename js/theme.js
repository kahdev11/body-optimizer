// Designvarianter og lys/mørk modus.
// Kilden er IndexedDB (meta: «appearance»); localStorage brukes bare som et raskt
// speil slik at riktig utseende settes før første tegning (se index.html).

import { getMeta, setMeta } from './db.js';

export const THEMES = [
  { id: 'health', name: 'Helse', description: 'Lys og luftig, inspirert av iOS Helse' },
  { id: 'mono', name: 'Monokrom', description: 'Minimalistisk i svart og hvitt' },
  { id: 'sport', name: 'Sporty', description: 'Energisk med oransje aksent' },
];

export const MODES = [
  { id: 'auto', name: 'Auto' },
  { id: 'light', name: 'Lys' },
  { id: 'dark', name: 'Mørk' },
];

const MIRROR_KEY = 'bo-appearance';
const DEFAULTS = { theme: 'health', mode: 'auto' };
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

let appearance = { ...DEFAULTS };

function sanitize(value) {
  const out = { ...DEFAULTS, ...(value || {}) };
  if (!THEMES.some((t) => t.id === out.theme)) out.theme = DEFAULTS.theme;
  if (!MODES.some((m) => m.id === out.mode)) out.mode = DEFAULTS.mode;
  return out;
}

function apply() {
  const root = document.documentElement;
  root.dataset.theme = appearance.theme;
  root.dataset.mode = appearance.mode === 'auto' ? (darkQuery.matches ? 'dark' : 'light') : appearance.mode;
  // Farge på statuslinje/nettleserramme følger bakgrunnen.
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && bg) meta.setAttribute('content', bg);
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(appearance));
  } catch { /* privat modus e.l. – ikke kritisk */ }
}

export async function initTheme() {
  appearance = sanitize(await getMeta('appearance', null));
  apply();
  darkQuery.addEventListener('change', apply);
}

export const getAppearance = () => ({ ...appearance });

export async function setAppearance(patch) {
  appearance = sanitize({ ...appearance, ...patch });
  apply();
  await setMeta('appearance', appearance);
}
