// Service worker-registrering og oppdateringsflyt.
//
// Service workeren registreres som sw.js?v=<versjon>. Ved oppstart (og når appen
// hentes frem igjen) leses version.js direkte fra nettet. Er versjonen der nyere
// enn den som kjører, registreres sw.js?v=<ny versjon>. Den installeres i
// bakgrunnen og venter til brukeren trykker «Oppdater».

const listeners = new Set();
let registration = null;
let updateReady = false;
let reloading = false;
let lastCheck = 0;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const hasUpdateReady = () => updateReady;

export function onUpdateReady(fn) {
  listeners.add(fn);
  if (updateReady) fn();
  return () => listeners.delete(fn);
}

function announce() {
  // Bare en oppdatering hvis en eldre service worker allerede styrer siden.
  if (!navigator.serviceWorker.controller) return;
  updateReady = true;
  listeners.forEach((fn) => fn());
}

function track(worker) {
  if (!worker) return;
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') announce();
  });
}

function watch(reg) {
  if (reg.waiting) announce();
  track(reg.installing);
  reg.addEventListener('updatefound', () => track(reg.installing));
}

const register = (version) =>
  navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(version)}`, { updateViaCache: 'none' });

async function fetchLatestVersion() {
  const res = await fetch(`./version.js?check=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const match = /APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(await res.text());
  if (!match) throw new Error('Fant ikke versjonsnummer');
  return match[1];
}

/**
 * Ser etter ny versjon. Returnerer 'update' (ny versjon lastes/er klar),
 * 'current' (siste versjon kjører), 'offline' eller 'unsupported'.
 */
export async function checkForUpdate() {
  if (!registration) return 'unsupported';
  lastCheck = Date.now();
  let latest;
  try {
    latest = await fetchLatestVersion();
  } catch {
    return 'offline';
  }
  if (latest !== self.APP_VERSION) {
    try {
      await register(latest);
    } catch {
      return 'offline';
    }
    return 'update';
  }
  registration.update().catch(() => {});
  return updateReady ? 'update' : 'current';
}

/** Aktiverer ventende versjon og laster appen på nytt. Brukerdata berøres ikke. */
export function applyUpdate() {
  const waiting = registration && registration.waiting;
  if (!waiting) {
    location.reload();
    return;
  }
  reloading = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  // Reserve hvis controllerchange av en eller annen grunn uteblir.
  setTimeout(() => location.reload(), 4000);
}

export async function initPWA() {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) location.reload();
    });
    registration = (await navigator.serviceWorker.getRegistration()) || (await register(self.APP_VERSION));
    watch(registration);
    checkForUpdate();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > 10 * 60 * 1000) checkForUpdate();
    });
  } catch (err) {
    console.warn('Service worker kunne ikke registreres:', err);
  }
}
