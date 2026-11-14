# Body Optimizer

En PWA for trening og helse – bygget for veien tilbake til håndballbanen:
kroppskart, skadeforebygging, kondisjon, dagbok, mål og statistikk.

- Ren HTML/CSS/JavaScript, **ingen byggesteg** – repoet publiseres som det er.
- **All data lagres lokalt** på enheten (IndexedDB). Ingen backend, ingen
  innlogging, ingen sporing.
- Fungerer uten nett og kan legges til på Hjem-skjermen på iPhone.

Status: alle fem fasene er ferdige (versjon 1.0.0). Se [CHANGELOG.md](CHANGELOG.md).

## Hva appen gjør

- **I dag** – dagens plan som avkrysningsliste, dagbok, kalender og uke-/månedsmål.
- **Kropp** – kroppskart forfra og bakfra med score for styrke, bevegelighet og
  smerte per kroppsdel, hodepinelogg, og målinger (vekt, BMI, midje).
- **Trening** – anbefalinger ut fra scorene dine og håndballspesifikk
  forebygging, kondisjonslogg med progresjon mot kampform, øvelsesbibliotek og
  tøyeprogrammer.
- **Statistikk** – grafer over score, smerte, hodepine, vekt, treningsvolum og
  måloppnåelse (4 uker, 3 måneder eller 1 år).
- **Innstillinger** – designvariant, lys/mørk, sikkerhetskopi og versjon.

## Publisere på GitHub Pages

1. Opprett et nytt repo på GitHub (f.eks. `body-optimizer`). Merk at innholdet
   i et offentlig repo er synlig for alle – det gjelder bare koden, aldri dataene
   dine, som blir liggende på telefonen.
2. Push koden fra denne mappen:

   ```bash
   git init
   git add .
   git commit -m "Fase 1: grunnmur"
   git branch -M main
   git remote add origin https://github.com/<brukernavn>/body-optimizer.git
   git push -u origin main
   ```

3. På GitHub: **Settings → Pages → Build and deployment**. Velg
   **Deploy from a branch**, branch `main` og mappe `/ (root)`. Lagre.
4. Etter et minutts tid ligger appen på
   `https://<brukernavn>.github.io/body-optimizer/`.

Alle stier i appen er relative, så den virker uansett hva repoet heter.

## Legge appen til på Hjem-skjermen (iPhone)

1. Åpne adressen i **Safari**.
2. Trykk på **Del**-knappen (firkanten med pil opp).
3. Velg **Legg til på Hjem-skjerm** og trykk **Legg til**.
4. Start appen fra ikonet. Den kjører nå i fullskjerm, virker uten nett og får
   varig lagring.

> Viktig: Safari og Hjem-skjerm-appen har hver sin lagring. Bruk appen fra
> Hjem-skjermen fra første stund. Sletter du ikonet, slettes også dataene – ta
> en eksport først.

## Sikkerhetskopi

- **Innstillinger → Eksporter all data** lager én JSON-fil. Velg
  «Arkiver i Filer» i delingsarket for å lagre den i iCloud Drive.
- **Importer fra fil** viser en forhåndsvisning før noe skrives, og lar deg
  velge mellom «Slå sammen» og «Erstatt alt».
- Appen minner deg på å eksportere når det er gått 14 dager. iOS kan slette
  lagringen til apper som ikke brukes på en stund, så dette er viktig.
- Før hver databaseoppgradering og hver import tas det en intern
  sikkerhetskopi (Innstillinger → Interne sikkerhetskopier).

## Gi ut en ny versjon

1. Øk versjonsnummeret i `version.js` (det eneste stedet det står).
2. Skriv hva som er nytt i `CHANGELOG.md`.
3. Har du lagt til nye filer? Før dem opp i `ASSETS`-listen i `sw.js`.
4. Commit og push. Neste gang appen åpnes med nett, lastes den nye versjonen
   ned i bakgrunnen og du får opp «Ny versjon tilgjengelig – Oppdater».

Oppdateringer rører aldri dataene: service workeren bytter bare ut appfilene,
og databasen endres kun gjennom migreringer.

## Endre databasen (migreringer)

Databasen har sitt eget skjemaversjonsnummer, uavhengig av appversjonen.
Reglene står øverst i `js/migrations.js`. Kort fortalt:

- Endre aldri en publisert migrering – legg til en ny nederst i `MIGRATIONS`.
- `schema(db, tx)` oppretter stores/indekser. `data(stores)` er en ren funksjon
  som omformer dataene, og brukes både på databasen og på eldre importfiler.
- Før oppgraderingen tas en intern sikkerhetskopi, og alt skjer i én
  transaksjon – feiler et steg, er dataene uendret.

## Teste lokalt

Service workers krever `http://localhost` eller HTTPS (ikke `file://`):

```bash
python -m http.server 8000
```

Åpne `http://localhost:8000`. For å teste på iPhone før publisering må siden
serveres over HTTPS – enklest er å pushe til GitHub Pages.

## Utvide øvelser og tøyeprogrammer

Øvelsene ligger som data i `js/data/exercises.js` og tøyeprogrammene i
`js/data/stretches.js`. Legg til et nytt objekt i listen (formatet står øverst i
hver fil), øk versjonen i `version.js` og push. Hvilke øvelser som anbefales for
hvert fokusområde styres av `FOCUS_AREAS` i `js/recommend.js`.

## Filstruktur

```
index.html              Skallet: fanelinje, oppdateringsbanner, lasting av skript
version.js              Appversjon (semver) – eneste kilde
sw.js                   Service worker med versjonert cache
manifest.json           PWA-manifest
css/themes.css          Designvarianter, lys/mørk og fargeskalaer (CSS-variabler)
css/base.css            Layout og komponenter (bruker bare variablene)
js/app.js               Oppstart og ruter
js/db.js                IndexedDB: åpning, lese/skrive, interne sikkerhetskopier
js/migrations.js        Skjemaversjon og migreringer
js/backup.js            Eksport, import (validering, forhåndsvisning, sammenslåing)
js/theme.js             Designvariant og lys/mørk modus
js/pwa.js               Registrering av service worker og oppdateringsflyt
js/router.js            Hash-ruter og fanelinje
js/ui.js                UI-byggeklosser (elementer, ark, dialog, toast)
js/forms.js             Skjemakomponenter (tallskala, valgbrikker, ring)
js/icons.js             Ikoner
js/dates.js             Datohjelpere (dagnøkler, uker, måneder)
js/regions.js           Kroppsregioner og SVG-former for kroppskartet
js/bodymap.js           Tegner kroppskartet
js/scores.js            Data: kroppsscorer og hodepine
js/planner.js           Data: dagens plan og dagbok
js/goals.js             Data: mål og utregning av fremdrift
js/training.js          Data: kondisjonsøkter og målinger
js/recommend.js         Anbefalinger og kondisjonsprogresjon
js/charts.js            Linje- og stolpegrafer i SVG
js/data/exercises.js    Øvelsesbibliotek
js/data/stretches.js    Tøyeprogrammer
js/views/               Én fil per visning (today, body, measurements, training, stats, settings)
icons/                  Appikoner
tools/make-icons.ps1    Lager PNG-ikonene på nytt
```

## Ansvarsfraskrivelse

Appen gir generelle råd om trening og egenregistrering. Den stiller ikke
diagnoser og erstatter ikke lege eller fysioterapeut.
