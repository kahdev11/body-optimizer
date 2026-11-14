// IndexedDB-lag: åpning med migreringer, enkle lese/skrive-funksjoner og
// interne sikkerhetskopier (i en egen database som aldri migreres).

import { SCHEMA_VERSION, runMigrations, dumpStores, req, txDone } from './migrations.js';

export const DB_NAME = 'body-optimizer';
const BACKUP_DB_NAME = 'body-optimizer-backups';
const MAX_BACKUPS = 8;

export class DatabaseTooNewError extends Error {
  constructor(found) {
    super(`Databasen har skjemaversjon ${found}, men denne appversjonen støtter bare ${SCHEMA_VERSION}.`);
    this.name = 'DatabaseTooNewError';
  }
}

let dbPromise = null;

/** Åpner (og om nødvendig oppgraderer) databasen. Trygt å kalle mange ganger. */
export function getDB() {
  if (!dbPromise) {
    dbPromise = open().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** Finner gjeldende skjemaversjon uten å opprette eller endre databasen. */
function probe() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME);
    let fresh = false;
    r.onupgradeneeded = () => {
      // Databasen finnes ikke ennå – avbryt, så den ikke opprettes tom her.
      fresh = true;
      r.transaction.abort();
    };
    r.onsuccess = () => resolve({ version: r.result.version, db: r.result });
    r.onerror = (e) => {
      if (fresh) {
        e.preventDefault();
        resolve({ version: 0, db: null });
      } else {
        reject(r.error);
      }
    };
  });
}

async function open() {
  const current = await probe();
  if (current.db) {
    try {
      if (current.version > SCHEMA_VERSION) throw new DatabaseTooNewError(current.version);
      if (current.version < SCHEMA_VERSION) {
        // Automatisk sikkerhetskopi FØR migrering.
        const stores = await dumpStores(current.db);
        await saveBackup({
          reason: 'migrering',
          note: `Før oppgradering av skjema v${current.version} → v${SCHEMA_VERSION}`,
          schemaVersion: current.version,
          stores,
        });
      }
    } finally {
      current.db.close();
    }
  }

  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    let migrationError = null;
    r.onupgradeneeded = (e) => {
      const tx = r.transaction;
      runMigrations(r.result, tx, e.oldVersion).catch((err) => {
        migrationError = err;
        try { tx.abort(); } catch { /* allerede avbrutt */ }
      });
    };
    r.onsuccess = () => {
      const db = r.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    r.onerror = () => reject(migrationError || r.error);
    r.onblocked = () => reject(new Error('Databasen er åpen i et annet vindu. Lukk andre vinduer med appen og prøv igjen.'));
  });
}

// ---------- Generelle lese/skrive-funksjoner ----------

export const nowISO = () => new Date().toISOString();

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function get(store, key) {
  const db = await getDB();
  return req(db.transaction(store, 'readonly').objectStore(store).get(key));
}

export async function getAll(store) {
  const db = await getDB();
  return req(db.transaction(store, 'readonly').objectStore(store).getAll());
}

/** Lagrer en post og setter updatedAt (brukes ved sammenslåing av importer). */
export async function put(store, record) {
  const db = await getDB();
  const value = { ...record, updatedAt: nowISO() };
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await txDone(tx);
  return value;
}

export async function del(store, key) {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

export async function dumpAll() {
  return dumpStores(await getDB());
}

// ---------- Meta (innstillinger og metadata) ----------

export async function getMeta(key, fallback = undefined) {
  const row = await get('meta', key);
  return row ? row.value : fallback;
}

export function setMeta(key, value) {
  return put('meta', { key, value });
}

// ---------- Interne sikkerhetskopier ----------

function openBackupDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(BACKUP_DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('backups', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function saveBackup({ reason, note, schemaVersion, stores }) {
  const db = await openBackupDB();
  try {
    const createdAt = nowISO();
    const tx = db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    store.put({
      id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
      reason,
      note,
      appVersion: self.APP_VERSION,
      schemaVersion,
      stores,
    });
    // Behold bare de nyeste.
    const keys = await req(store.getAllKeys());
    keys.sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_BACKUPS))) store.delete(key);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function listBackups() {
  const db = await openBackupDB();
  try {
    const all = await req(db.transaction('backups', 'readonly').objectStore('backups').getAll());
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } finally {
    db.close();
  }
}

export async function deleteBackup(id) {
  const db = await openBackupDB();
  try {
    const tx = db.transaction('backups', 'readwrite');
    tx.objectStore('backups').delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}
