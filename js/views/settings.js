// Innstillinger: utseende, sikkerhetskopi (eksport/import), lagring og versjon.

import { h, mount, setChildren, card, sectionTitle, segmented, toast, openSheet, confirmDialog, formatDate, formatDateTime } from '../ui.js';
import { icon } from '../icons.js';
import { THEMES, MODES, getAppearance, setAppearance } from '../theme.js';
import { SCHEMA_VERSION, STORE_LABELS } from '../migrations.js';
import { listBackups, deleteBackup } from '../db.js';
import {
  buildExportFile, exportToFile, wrapExport, deliverFile, canShareFile, markExported,
  backupStatus, parseImport, planImport, applyImport, ImportError, REMINDER_DAYS,
} from '../backup.js';
import { checkForUpdate, applyUpdate, hasUpdateReady, isStandalone } from '../pwa.js';
import { refresh } from '../router.js';

const storeLabel = (name) => STORE_LABELS[name] || name;
const countRecords = (stores) => Object.values(stores || {}).reduce((sum, rows) => sum + rows.length, 0);
const formatBytes = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} kB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function row(label, value, extra) {
  return h('div', { class: 'row' }, h('span', { class: 'row-label' }, label), h('span', { class: 'row-value' }, value), extra || null);
}

function actionRow(iconName, label, hint, onclick) {
  return h(
    'button',
    { class: 'row row-action', type: 'button', onclick },
    icon(iconName, 22),
    h('span', { class: 'row-text' }, h('span', { class: 'row-label' }, label), hint ? h('span', { class: 'row-hint' }, hint) : null),
    icon('chevron', 18)
  );
}

// ---------- Eksport ----------

export async function openExportSheet() {
  const content = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Klargjør sikkerhetskopi …'));
  const sheet = openSheet({ title: 'Eksporter data', content });
  try {
    const { file, count } = await buildExportFile();
    const share = canShareFile(file);
    setChildren(
      content,
      h(
        'div',
        { class: 'file-chip' },
        icon('shield', 26),
        h('div', {}, h('div', { class: 'file-name' }, file.name), h('div', { class: 'muted small' }, `${count} poster · ${formatBytes(file.size)}`))
      ),
      h(
        'p',
        { class: 'muted' },
        share
          ? 'Trykk «Lagre fil» og velg «Arkiver i Filer» for å legge kopien i iCloud Drive eller på iPhonen.'
          : 'Filen lastes ned til enheten. Oppbevar den et trygt sted.'
      ),
      h(
        'button',
        {
          class: 'btn btn-primary btn-block',
          type: 'button',
          onclick: async () => {
            const result = await deliverFile(file);
            if (result === 'cancelled') return;
            await markExported();
            toast(result === 'shared' ? 'Sikkerhetskopi delt' : 'Sikkerhetskopi lastet ned', { type: 'success' });
            sheet.close();
            refresh();
          },
        },
        icon(share ? 'share' : 'download', 20),
        'Lagre fil'
      )
    );
  } catch (err) {
    console.error(err);
    setChildren(content, h('p', { class: 'error-text' }, `Kunne ikke lage sikkerhetskopi: ${err.message}`));
  }
}

// ---------- Import ----------

function pickFile() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: '.json,application/json,text/plain', class: 'visually-hidden' });
    input.addEventListener('change', () => {
      resolve(input.files && input.files[0] ? input.files[0] : null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

async function startImport() {
  const file = await pickFile();
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) {
    toast('Filen er for stor til å være en sikkerhetskopi.', { type: 'error' });
    return;
  }
  try {
    const parsed = await parseImport(await file.text());
    await openImportSheet(parsed, { sourceName: file.name });
  } catch (err) {
    if (!(err instanceof ImportError)) console.error(err);
    await confirmDialog({
      title: 'Kan ikke importere',
      message: err instanceof ImportError ? err.message : `Uventet feil: ${err.message}`,
      confirmText: 'OK',
      cancelText: 'Lukk',
    });
  }
}

/** Forhåndsvisning + valg av «slå sammen» / «erstatt alt». Ingenting skrives før brukeren bekrefter. */
async function openImportSheet(parsed, { sourceName, lockMode = null }) {
  const { plan } = await planImport(parsed);
  let mode = lockMode || 'merge';

  const table = h('div', { class: 'preview-table' });
  const explain = h('p', { class: 'muted small' });
  const go = h('button', { class: 'btn btn-block', type: 'button' });

  const renderMode = () => {
    const rows = plan.filter((p) => p.inFile > 0 || p.local > 0);
    setChildren(
      table,
      h('div', { class: 'preview-row preview-head' }, h('span', {}, 'Data'), h('span', {}, 'I filen'), h('span', {}, mode === 'merge' ? 'Nye' : 'Slettes'), h('span', {}, mode === 'merge' ? 'Oppdateres' : 'Skrives')),
      rows.length
        ? rows.map((p) =>
            h(
              'div',
              { class: 'preview-row' },
              h('span', {}, storeLabel(p.name)),
              h('span', {}, p.inFile),
              h('span', {}, mode === 'merge' ? p.add.length : p.local),
              h('span', {}, mode === 'merge' ? p.update.length : p.inFile)
            )
          )
        : h('div', { class: 'preview-row' }, h('span', { class: 'muted' }, 'Filen inneholder ingen data.'))
    );
    if (mode === 'merge') {
      const kept = plan.reduce((sum, p) => sum + p.keepLocal + p.same, 0);
      explain.textContent = `Slå sammen: nye poster legges til, og der samme post finnes begge steder beholdes den som sist ble endret. Ingenting slettes.${kept ? ` ${kept} poster er like eller nyere på denne enheten og røres ikke.` : ''}`;
      go.className = 'btn btn-primary btn-block';
      go.textContent = 'Slå sammen';
    } else {
      explain.textContent = 'Erstatt alt: all data på denne enheten slettes og erstattes med innholdet i filen. En intern sikkerhetskopi tas først.';
      go.className = 'btn btn-danger btn-block';
      go.textContent = 'Erstatt alt';
    }
  };

  go.addEventListener('click', async () => {
    if (mode === 'replace') {
      const ok = await confirmDialog({
        title: 'Erstatte all data?',
        message: 'Alt som ligger i appen nå byttes ut med innholdet i filen. Du kan gjenopprette fra den interne sikkerhetskopien etterpå.',
        confirmText: 'Erstatt',
        danger: true,
      });
      if (!ok) return;
    }
    go.disabled = true;
    try {
      await applyImport(parsed, mode);
      sheet.close();
      toast('Import fullført', { type: 'success' });
      // Last på nytt slik at innstillinger og visninger bruker de importerte dataene.
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      console.error(err);
      go.disabled = false;
      toast(`Importen feilet – ingenting ble endret. ${err.message || ''}`, { type: 'error', duration: 5000 });
    }
  });

  const content = h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'list' },
      row('Kilde', sourceName),
      row('Eksportert', parsed.exportedAt ? formatDateTime(parsed.exportedAt) : 'Ukjent'),
      row('Appversjon', parsed.appVersion),
      row('Skjema', parsed.migrated ? `v${parsed.fromSchema} → oppgraderes til v${parsed.toSchema}` : `v${parsed.fromSchema}`)
    ),
    parsed.warnings.map((w) => h('p', { class: 'warning-text small' }, w)),
    lockMode ? null : segmented([{ id: 'merge', name: 'Slå sammen' }, { id: 'replace', name: 'Erstatt alt' }], mode, (id) => { mode = id; renderMode(); }, 'Importmåte'),
    table,
    explain,
    go
  );
  renderMode();
  const sheet = openSheet({ title: 'Forhåndsvisning av import', content });
}

// ---------- Interne sikkerhetskopier ----------

async function openBackupsSheet() {
  const content = h('div', { class: 'stack' });
  const sheet = openSheet({ title: 'Interne sikkerhetskopier', content });

  const render = async () => {
    const backups = await listBackups();
    setChildren(
      content,
      h('p', { class: 'muted small' }, 'Tas automatisk før databasen oppgraderes og før hver import. De ligger bare på denne enheten – eksporter til fil for en ekte sikkerhetskopi.'),
      backups.length
        ? backups.map((b) =>
            h(
              'div',
              { class: 'backup-item' },
              h('div', {}, h('div', { class: 'backup-title' }, formatDateTime(b.createdAt)), h('div', { class: 'muted small' }, `${b.note} · ${countRecords(b.stores)} poster · app ${b.appVersion}`)),
              h(
                'div',
                { class: 'backup-actions' },
                h('button', { class: 'btn btn-small', type: 'button', onclick: () => restore(b) }, 'Gjenopprett'),
                h(
                  'button',
                  {
                    class: 'btn btn-small',
                    type: 'button',
                    onclick: async () => {
                      const data = wrapExport(b.stores, b.schemaVersion, b.appVersion);
                      data.exportedAt = b.createdAt;
                      await deliverFile(exportToFile(data));
                    },
                  },
                  'Lagre som fil'
                ),
                h(
                  'button',
                  {
                    class: 'btn btn-small btn-plain-danger',
                    type: 'button',
                    onclick: async () => {
                      if (!(await confirmDialog({ title: 'Slette sikkerhetskopien?', message: formatDateTime(b.createdAt), confirmText: 'Slett', danger: true }))) return;
                      await deleteBackup(b.id);
                      render();
                    },
                  },
                  'Slett'
                )
              )
            )
          )
        : h('p', { class: 'muted' }, 'Ingen interne sikkerhetskopier ennå.')
    );
  };

  const restore = async (b) => {
    try {
      const data = wrapExport(b.stores, b.schemaVersion, b.appVersion);
      data.exportedAt = b.createdAt;
      const parsed = await parseImport(JSON.stringify(data));
      sheet.close();
      await openImportSheet(parsed, { sourceName: 'Intern sikkerhetskopi', lockMode: 'replace' });
    } catch (err) {
      toast(err.message, { type: 'error', duration: 5000 });
    }
  };

  await render();
}

// ---------- Visning ----------

function themePicker() {
  const { theme } = getAppearance();
  const wrap = h('div', { class: 'theme-picker', role: 'radiogroup', 'aria-label': 'Designvariant' });
  for (const t of THEMES) {
    const option = h(
      'button',
      {
        class: `theme-option${t.id === theme ? ' selected' : ''}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(t.id === theme),
        onclick: async () => {
          for (const el of wrap.children) {
            const on = el === option;
            el.classList.toggle('selected', on);
            el.setAttribute('aria-checked', String(on));
          }
          await setAppearance({ theme: t.id });
        },
      },
      // Miniatyren får sitt eget data-theme, så den viser variantens egne farger.
      h(
        'span',
        { class: 'theme-preview', 'data-theme': t.id },
        h('span', { class: 'tp-title' }, 'I dag'),
        h('span', { class: 'tp-card' }, h('span', { class: 'tp-ring' }), h('span', { class: 'tp-lines' }, h('i', {}), h('i', {}))),
        h('span', { class: 'tp-button' }, 'Start')
      ),
      h('span', { class: 'theme-name' }, t.name),
      h('span', { class: 'theme-desc' }, t.description)
    );
    wrap.append(option);
  }
  return wrap;
}

export async function renderSettings(view) {
  const [status, backups, persisted, estimate] = await Promise.all([
    backupStatus(),
    listBackups().catch(() => []),
    navigator.storage && navigator.storage.persisted ? navigator.storage.persisted().catch(() => false) : false,
    navigator.storage && navigator.storage.estimate ? navigator.storage.estimate().catch(() => null) : null,
  ]);

  const lastExportText = status.lastExportAt ? formatDate(status.lastExportAt) : 'Aldri';
  const versionValue = h('span', { class: 'row-value' }, self.APP_VERSION);

  mount(
    view,
    h('header', { class: 'view-header' }, h('h1', {}, 'Innstillinger')),

    sectionTitle('Utseende'),
    card(
      h('div', { class: 'field-label' }, 'Designvariant'),
      themePicker(),
      h('div', { class: 'field-label' }, 'Lys / mørk'),
      segmented(MODES, getAppearance().mode, (id) => setAppearance({ mode: id }), 'Lys eller mørk modus'),
      h('p', { class: 'muted small' }, '«Auto» følger innstillingen på telefonen.')
    ),

    sectionTitle('Sikkerhetskopi'),
    h(
      'section',
      { class: 'card card-list' },
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'row-label' }, 'Siste eksport'),
        h('span', { class: `row-value${status.due ? ' warning-text' : ''}` }, status.due ? `${lastExportText} · på tide!` : lastExportText)
      ),
      actionRow('upload', 'Eksporter all data', 'Lagre én JSON-fil i Filer / iCloud', openExportSheet),
      actionRow('download', 'Importer fra fil', 'Forhåndsvisning før noe skrives', startImport),
      actionRow('shield', 'Interne sikkerhetskopier', `${backups.length} lagret på denne enheten`, openBackupsSheet)
    ),
    h('p', { class: 'footnote' }, `All data ligger kun på denne enheten. iOS kan slette lagringen til apper som ikke brukes på en stund, så eksporter jevnlig – appen minner deg på det etter ${REMINDER_DAYS} dager.`),

    sectionTitle('Lagring'),
    h(
      'section',
      { class: 'card card-list' },
      row('Varig lagring', persisted ? 'Aktiv' : 'Ikke innvilget'),
      row('Brukt plass', estimate && typeof estimate.usage === 'number' ? formatBytes(estimate.usage) : 'Ukjent'),
      row('Kjører som app', isStandalone() ? 'Ja (Hjem-skjerm)' : 'Nei (nettleser)')
    ),
    persisted ? null : h('p', { class: 'footnote' }, 'Varig lagring innvilges som regel først når appen er lagt til på Hjem-skjermen.'),

    sectionTitle('Om'),
    h(
      'section',
      { class: 'card card-list' },
      h('div', { class: 'row' }, h('span', { class: 'row-label' }, 'Versjon'), versionValue),
      row('Databaseskjema', `v${SCHEMA_VERSION}`),
      actionRow('refresh', 'Se etter oppdatering', hasUpdateReady() ? 'Ny versjon er klar' : null, async () => {
        if (hasUpdateReady()) return applyUpdate();
        toast('Ser etter ny versjon …');
        const result = await checkForUpdate();
        if (result === 'current') toast('Du har siste versjon', { type: 'success' });
        else if (result === 'update') toast('Ny versjon lastes ned …');
        else if (result === 'offline') toast('Fikk ikke kontakt med nettet', { type: 'error' });
        else toast('Oppdatering støttes ikke i denne nettleseren', { type: 'error' });
      })
    ),
    h('p', { class: 'footnote' }, 'Body Optimizer gir generelle treningsråd og stiller ikke diagnoser. Kontakt lege eller fysioterapeut ved vedvarende eller sterke smerter.')
  );
}
