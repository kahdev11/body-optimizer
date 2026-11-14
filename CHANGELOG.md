# Endringslogg

Alle merkbare endringer i appen føres her. Versjonsnummeret følger
[semver](https://semver.org/lang/nb/) og settes kun i `version.js`.

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
