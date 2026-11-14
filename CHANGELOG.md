# Endringslogg

Alle merkbare endringer i appen føres her. Versjonsnummeret følger
[semver](https://semver.org/lang/nb/) og settes kun i `version.js`.

## [0.3.0] – 2026-11-14

Fase 3: Dagbok, sjekklister og mål. Databaseskjema v3.

### Lagt til
- «I dag» med dagens plan som avkrysningsliste (styrke, tøying, kondis, annet),
  fremdriftslinje og «kopier forrige plan». Bla mellom dager.
- Daglig dagbok med fritekst som lagres automatisk.
- Kalender som viser hva som er gjort hver dag, med detaljer for valgt dag.
- Ukemål og månedsmål med fremdriftsringer. Fremdriften regnes ut fra plan,
  kondisjonslogg og smertescore, eller telles manuelt. Viser også om målet ble
  nådd i de foregående periodene.

### Endret
- Migrering til skjema v3 (dagbok, planpunkter og mål).

## [0.2.0] – 2026-11-14

Fase 2: Kroppskart. Databaseskjema v2.

### Lagt til
- Kroppskart med anatomisk silhuett forfra og bakfra og klikkbare regioner
  (venstre og høyre side hver for seg).
- Score per region: styrke (1–10), bevegelighet (1–10) og smerte (0–10) med
  valgfri smertetype, tidspunkt og notat. Kan lagres for begge sider samtidig.
- Hodepinelogg: intensitet, varighet, type, plassering og mulige utløsere,
  med generelle varseltegn som bør sjekkes av lege.
- Varmekart per dimensjon med tegnforklaring, og oversiktsliste sortert etter
  hva som trenger mest oppmerksomhet.
- Historikk per region med liten trendlinje. Hver registrering lagres som en
  egen post med tidsstempel – ingenting overskrives.
- Rolig anbefaling om å kontakte lege/fysioterapeut ved smerte 7 eller høyere.

### Endret
- Migrering til skjema v2 (nye lagre for kroppsscorer og hodepine). Intern
  sikkerhetskopi tas automatisk før oppgraderingen.

## [0.1.0] – 2026-11-14

Fase 1: Grunnmur.

### Lagt til
- PWA-oppsett: `manifest.json`, apple-touch-icon, standalone-modus på iPhone og
  støtte for safe-area (notch og hjemindikator).
- Service worker med versjonert cache. Appen fungerer uten nett, og viser
  «Ny versjon tilgjengelig – Oppdater» når en ny versjon er lastet ned.
- IndexedDB med eget skjemaversjonsnummer (skjema v1) og stegvise migreringer.
  Automatisk intern sikkerhetskopi før hver migrering; en migrering som feiler
  rulles tilbake uten at data endres.
- Ber om varig lagring (`navigator.storage.persist()`) ved oppstart.
- Eksport av all data til én JSON-fil (med app-/skjemaversjon og dato) via
  delingsarket på iPhone, med nedlasting som reserve.
- Import med validering, migrering av eldre filer, forhåndsvisning og valg
  mellom «Slå sammen» og «Erstatt alt». Intern sikkerhetskopi tas før import.
- Liste over interne sikkerhetskopier med gjenoppretting.
- Påminnelse om sikkerhetskopi når det er gått 14 dager siden siste eksport.
- Tre designvarianter (Helse, Monokrom, Sporty) og lys/mørk/auto-modus.
- Fanelinje med I dag, Kropp, Trening, Statistikk og Innstillinger
  (Kropp, Trening og Statistikk er plassholdere til senere faser).
