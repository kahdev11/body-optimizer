// Eksport og import av all data som JSON.

import { getDB, dumpAll, saveBackup, setMeta, getMeta, nowISO } from './db.js';
import { SCHEMA_VERSION, migrateDump, txDone } from './migrations.js';

export const APP_ID = 'body-optimizer';
export const REMINDER_DAYS = 14;

// Meta-nøkler som bare gjelder denne enheten. De eksporteres/importeres ikke.
const LOCAL_META_KEYS = ['firstRunAt', 'lastExportAt', 'lastImportAt', 'backupSnoozeUntil'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isLocalMeta = (storeName, record) => storeName === 'meta' && LOCAL_META_KEYS.includes(record.key);

// ---------- Eksport ----------

export function wrapExport(stores, schemaVersion = SCHEMA_VERSION, appVersion = self.APP_VERSION) {
  const clean = {};
  for (const [name, records] of Object.entries(stores)) {
    clean[name] = records.filter((r) => !isLocalMeta(name, r));
  }
  return {
    app: APP_ID,
    appVersion,
    schemaVersion,
    exportedAt: nowISO(),
    stores: clean,
  };
}

export function exportToFile(data) {
  const day = data.exportedAt.slice(0, 10);
  const json = JSON.stringify(data, null, 2);
  return new File([json], `body-optimizer-${day}.json`, { type: 'application/json' });
}

export async function buildExportFile() {
  const data = wrapExport(await dumpAll());
  const count = Object.values(data.stores).reduce((sum, rows) => sum + rows.length, 0);
  return { file: exportToFile(data), data, count };
}

export function canShareFile(file) {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

/**
 * Deler filen via delingsarket (iPhone: «Arkiver i Filer») eller laster den ned.
 * Må kalles direkte fra et trykk. Returnerer 'shared' | 'downloaded' | 'cancelled'.
 */
export async function deliverFile(file) {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // Annen feil: fall tilbake til nedlasting.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}

export function markExported() {
  return setMeta('lastExportAt', nowISO());
}

/** Antall dager siden siste eksport (eller siden første bruk hvis aldri eksportert). */
export async function backupStatus() {
  const [lastExportAt, firstRunAt, snoozeUntil] = await Promise.all([
    getMeta('lastExportAt', null),
    getMeta('firstRunAt', null),
    getMeta('backupSnoozeUntil', null),
  ]);
  const reference = lastExportAt || firstRunAt;
  const days = reference ? Math.floor((Date.now() - new Date(reference).getTime()) / 86400000) : 0;
  const snoozed = !!snoozeUntil && new Date(snoozeUntil).getTime() > Date.now();
  return { lastExportAt, days, due: days >= REMINDER_DAYS, snoozed };
}

export function snoozeBackupReminder(hours = 24) {
  return setMeta('backupSnoozeUntil', new Date(Date.now() + hours * 3600000).toISOString());
}

// ---------- Import ----------

export class ImportError extends Error {}

/** Leser og validerer en JSON-tekst, og migrerer den til gjeldende skjema. Skriver ingenting. */
export async function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('Filen er ikke gyldig JSON.');
  }
  if (!isPlainObject(data) || data.app !== APP_ID) {
    throw new ImportError('Dette ser ikke ut som en sikkerhetskopi fra Body Optimizer.');
  }
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) {
    throw new ImportError('Filen mangler gyldig skjemaversjon.');
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(
      `Filen er laget med en nyere versjon av appen (skjema v${data.schemaVersion}, denne appen støtter v${SCHEMA_VERSION}). Oppdater appen og prøv igjen.`
    );
  }
  if (!isPlainObject(data.stores)) throw new ImportError('Filen mangler data («stores»).');
  for (const [name, records] of Object.entries(data.stores)) {
    if (!Array.isArray(records) || !records.every(isPlainObject)) {
      throw new ImportError(`Ugyldig innhold i «${name}».`);
    }
  }

  let migrated;
  try {
    migrated = migrateDump(data.stores, data.schemaVersion);
  } catch (err) {
    throw new ImportError(`Kunne ikke oppgradere dataene fra skjema v${data.schemaVersion}: ${err.message}`);
  }

  const db = await getDB();
  const known = [...db.objectStoreNames];
  const keyPaths = {};
  const tx = db.transaction(known, 'readonly');
  for (const name of known) keyPaths[name] = tx.objectStore(name).keyPath;

  const warnings = [];
  const stores = {};
  for (const [name, records] of Object.entries(migrated.stores)) {
    if (!known.includes(name)) {
      if (records.length) warnings.push(`Ukjent datatype «${name}» (${records.length} poster) blir hoppet over.`);
      continue;
    }
    const kp = keyPaths[name];
    const seen = new Set();
    const rows = [];
    for (const record of records) {
      const key = record[kp];
      if (typeof key !== 'string' && typeof key !== 'number') {
        throw new ImportError(`En post i «${name}» mangler gyldig nøkkel («${kp}»).`);
      }
      if (isLocalMeta(name, record) || seen.has(key)) continue;
      seen.add(key);
      rows.push(record);
    }
    stores[name] = rows;
  }

  return {
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'ukjent',
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
    fromSchema: data.schemaVersion,
    toSchema: SCHEMA_VERSION,
    migrated: data.schemaVersion < SCHEMA_VERSION,
    stores,
    keyPaths,
    warnings,
  };
}

const isNewer = (incoming, local) => (incoming.updatedAt || '') > (local.updatedAt || '');

/**
 * Regner ut nøyaktig hva en import vil gjøre – brukes både til forhåndsvisningen
 * og til selve skrivingen, slik at de alltid stemmer overens.
 */
export async function planImport(parsed) {
  const current = await dumpAll();
  const plan = [];
  for (const name of Object.keys(parsed.keyPaths)) {
    const kp = parsed.keyPaths[name];
    const incoming = parsed.stores[name] || [];
    const local = (current[name] || []).filter((r) => !isLocalMeta(name, r));
    const localByKey = new Map(local.map((r) => [r[kp], r]));
    const add = [];
    const update = [];
    let same = 0;
    let keepLocal = 0;
    for (const record of incoming) {
      const existing = localByKey.get(record[kp]);
      if (!existing) add.push(record);
      else if (JSON.stringify(existing) === JSON.stringify(record)) same++;
      else if (isNewer(record, existing)) update.push(record);
      else keepLocal++;
    }
    plan.push({
      name,
      keyPath: kp,
      incoming,
      inFile: incoming.length,
      local: local.length,
      localKeys: local.map((r) => r[kp]),
      add,
      update,
      same,
      keepLocal,
    });
  }
  return { plan, current };
}

/** Skriver importen. mode: 'merge' (slå sammen) eller 'replace' (erstatt alt). */
export async function applyImport(parsed, mode) {
  const { plan, current } = await planImport(parsed);

  // Sikkerhetsnett: intern kopi av alt slik det var før importen.
  await saveBackup({
    reason: 'import',
    note: mode === 'replace' ? 'Før import (erstatt alt)' : 'Før import (slå sammen)',
    schemaVersion: SCHEMA_VERSION,
    stores: current,
  });

  const db = await getDB();
  const tx = db.transaction(plan.map((p) => p.name), 'readwrite');
  for (const p of plan) {
    const store = tx.objectStore(p.name);
    if (mode === 'replace') {
      for (const key of p.localKeys) store.delete(key);
      for (const record of p.incoming) store.put(record);
    } else {
      for (const record of p.add) store.put(record);
      for (const record of p.update) store.put(record);
    }
  }
  await txDone(tx);
  await setMeta('lastImportAt', nowISO());
}
