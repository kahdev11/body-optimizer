// Skjemaversjon og migreringer for databasen.
//
// REGLER (viktig – data skal aldri gå tapt):
//  1. Endre ALDRI en migrering som er publisert. Legg til en ny nederst i listen.
//  2. Versjonene skal være sammenhengende: 1, 2, 3 ...
//  3. Alle object stores bruker keyPath (nøkkelen ligger i selve posten), og
//     brukerdata-poster har en streng-id + updatedAt (ISO-tid). Da fungerer
//     eksport, import og sammenslåing generelt for alle stores.
//  4. Hver migrering kan ha:
//       schema(db, tx)  – strukturendringer (opprette stores/indekser). Synkron.
//       data(stores)    – ren funksjon som omformer data: { storeNavn: [poster] }
//                         -> samme form. Brukes BÅDE når databasen oppgraderes og
//                         når en eldre JSON-eksport importeres, så logikken
//                         skrives bare én gang.
//  5. Legg nye stores til i STORE_LABELS (norsk navn i import-forhåndsvisningen).
//
// Før en oppgradering tar db.js automatisk en intern sikkerhetskopi, og hele
// oppgraderingen skjer i én transaksjon: feiler et steg, rulles alt tilbake.

export const MIGRATIONS = [
  {
    version: 1,
    description: 'Grunnmur: meta-store for innstillinger og metadata',
    schema(db) {
      db.createObjectStore('meta', { keyPath: 'key' });
    },
  },
  {
    version: 2,
    description: 'Kroppskart: scorer per kroppsregion og hodepinelogg',
    schema(db) {
      // Én post per registrering (overskrives aldri): { id, regionId, at, strength, mobility, pain, painType, note }
      db.createObjectStore('bodyScores', { keyPath: 'id' });
      // { id, at, intensity, durationMin, kind, locations[], triggers[], note }
      db.createObjectStore('headaches', { keyPath: 'id' });
    },
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export const STORE_LABELS = {
  meta: 'Innstillinger',
  bodyScores: 'Kroppsscorer',
  headaches: 'Hodepine',
};

MIGRATIONS.forEach((m, i) => {
  if (m.version !== i + 1) throw new Error(`Migreringene må være nummerert 1, 2, 3 … (fant ${m.version} på plass ${i + 1})`);
});

// ---------- Hjelpere for IndexedDB-forespørsler ----------

export function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaksjonen ble avbrutt'));
  });
}

/** Leser alle poster fra alle stores: { storeNavn: [poster] } */
export async function dumpStores(db, tx) {
  const names = [...db.objectStoreNames];
  const out = {};
  if (!names.length) return out;
  const t = tx || db.transaction(names, 'readonly');
  await Promise.all(
    names.map(async (name) => {
      out[name] = await req(t.objectStore(name).getAll());
    })
  );
  return out;
}

async function rewriteStores(db, tx, stores) {
  const names = [...db.objectStoreNames];
  const pending = [];
  for (const name of names) {
    const store = tx.objectStore(name);
    pending.push(req(store.clear()));
    for (const record of stores[name] || []) pending.push(req(store.put(record)));
  }
  await Promise.all(pending);
}

// ---------- Kjøring ----------

/**
 * Oppgraderer databasen steg for steg inne i versionchange-transaksjonen.
 * Kaster ved feil – kalleren avbryter da transaksjonen slik at ingenting endres.
 */
export async function runMigrations(db, tx, oldVersion) {
  for (const m of MIGRATIONS) {
    if (m.version <= oldVersion) continue;
    if (m.schema) m.schema(db, tx);
    if (m.data) {
      const before = await dumpStores(db, tx);
      const after = m.data(before) || before;
      await rewriteStores(db, tx, after);
    }
  }
}

/** Oppgraderer en eksportert datadump (fra JSON) fra en eldre skjemaversjon til gjeldende. */
export function migrateDump(stores, fromVersion) {
  let current = stores;
  const applied = [];
  for (const m of MIGRATIONS) {
    if (m.version <= fromVersion) continue;
    if (m.data) current = m.data(current) || current;
    applied.push(m);
  }
  return { stores: current, applied };
}
