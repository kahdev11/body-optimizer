// Øvelsesbibliotek. Lett å utvide: legg til et objekt i listen.
//
//  id        unik, endres aldri (brukes når øvelser legges i planen)
//  name      navn
//  groups    kroppsregioner øvelsen treffer (id-er fra js/regions.js, uten side)
//  focus     'strength' (styrke) | 'prevention' (forebygging) | 'stability' | 'posture' (holdning)
//  handball  true for håndballspesifikk skadeforebygging
//  how       kort instruksjon
//  dose      sett/reps eller tid

export const FOCUS_NAMES = {
  strength: 'Styrke',
  prevention: 'Forebygging',
  stability: 'Stabilitet',
  posture: 'Holdning',
};

export const EXERCISES = [
  // --- Skulder og rotatorcuff ---
  { id: 'ext-rot-band', name: 'Utadrotasjon med strikk', groups: ['shoulder'], focus: 'prevention', handball: true,
    how: 'Stå med albuen inntil siden og 90° i albuen. Roter underarmen rolig utover mot strikken, og brems kontrollert tilbake. Hold skulderen lav.', dose: '3 × 12–15 per arm' },
  { id: 'ext-rot-90', name: 'Utadrotasjon i kastposisjon', groups: ['shoulder'], focus: 'prevention', handball: true,
    how: 'Overarmen ut til siden i skulderhøyde, 90° i albuen. Roter underarmen bakover mot strikken som i et kast, og brems rolig tilbake. Bremsefasen er den viktigste.', dose: '3 × 10 per arm' },
  { id: 'ytw', name: 'Y-T-W liggende', groups: ['shoulder', 'upper_back'], focus: 'posture', handball: true,
    how: 'Ligg på magen. Løft armene til Y, deretter T og W, med tomlene opp. Klem skulderbladene bakover og ned – ikke løft skuldrene mot ørene.', dose: '2–3 × 8 av hver' },
  { id: 'face-pull', name: 'Face pull', groups: ['upper_back', 'shoulder'], focus: 'posture', handball: true,
    how: 'Dra strikk eller tau mot ansiktet med høye albuer. Avslutt med å rotere hendene bakover, og hold ett sekund.', dose: '3 × 12–15' },
  { id: 'pushup-plus', name: 'Push-up pluss', groups: ['shoulder', 'chest'], focus: 'stability', handball: true,
    how: 'Vanlig armheving, men på toppen skyver du skulderbladene fra hverandre så øvre rygg runder seg litt. Styrker musklene som styrer skulderbladet.', dose: '3 × 10–12' },
  { id: 'row', name: 'Roing (sittende eller omvendt)', groups: ['upper_back', 'biceps'], focus: 'strength',
    how: 'Trekk mot nedre del av brystet med stolt bryst. Start bevegelsen med skulderbladene og senk rolig.', dose: '3 × 8–12' },
  { id: 'overhead-press', name: 'Skulderpress', groups: ['shoulder', 'triceps'], focus: 'strength',
    how: 'Press vektene rett opp over hodet uten å svaie i korsryggen. Stram mage og sete.', dose: '3 × 8–10' },
  { id: 'pushup', name: 'Armhevinger', groups: ['chest', 'triceps', 'shoulder'], focus: 'strength',
    how: 'Strak kropp fra hode til hæl. Senk brystet mot gulvet med albuene ca. 45° ut fra kroppen.', dose: '3 × 8–15' },
  { id: 'pulldown', name: 'Chins eller nedtrekk', groups: ['upper_back', 'biceps'], focus: 'strength',
    how: 'Trekk skulderbladene ned først, og dra så albuene ned mot ribbeina. Full strekk på toppen.', dose: '3 × 6–10' },

  // --- Armer ---
  { id: 'curl', name: 'Bicepscurl', groups: ['biceps'], focus: 'strength',
    how: 'Albuene i ro inntil kroppen. Løft kontrollert og senk enda roligere.', dose: '3 × 10–12' },
  { id: 'triceps', name: 'Triceps press eller dips', groups: ['triceps'], focus: 'strength',
    how: 'Strekk albuene helt ut uten å låse hardt. Hold overarmene stille.', dose: '3 × 10–12' },
  { id: 'carry', name: 'Bæring og håndleddscurl', groups: ['forearm'], focus: 'strength',
    how: 'Gå med tunge vekter i hendene (farmer’s walk) med rak holdning. Suppler med håndleddscurl for grep og underarm.', dose: '3 × 30–40 m' },

  // --- Core ---
  { id: 'plank', name: 'Planke', groups: ['abs'], focus: 'stability', handball: true,
    how: 'Støtt på underarmer og tær. Stram mage og sete slik at kroppen er helt rett. Stopp når hoften synker.', dose: '3 × 30–60 s' },
  { id: 'side-plank', name: 'Sideplanke', groups: ['oblique'], focus: 'stability', handball: true,
    how: 'Støtt på underarm og siden av foten. Løft hoften til kroppen er rett. Kan gjøres med kne i gulvet.', dose: '3 × 30–45 s per side' },
  { id: 'pallof', name: 'Pallof press', groups: ['oblique', 'abs'], focus: 'stability', handball: true,
    how: 'Stå sideveis til strikk eller kabel. Press hendene rett frem fra brystet og motstå rotasjonen. Trener kjernen til å tåle dueller og kast.', dose: '3 × 10 per side' },
  { id: 'dead-bug', name: 'Dead bug', groups: ['abs', 'hip'], focus: 'stability',
    how: 'Ligg på ryggen med armer og ben i været. Senk motsatt arm og ben rolig mot gulvet uten at korsryggen slipper underlaget.', dose: '3 × 8 per side' },
  { id: 'bird-dog', name: 'Fuglehund (bird dog)', groups: ['lower_back', 'abs'], focus: 'stability',
    how: 'Stå på alle fire. Strekk motsatt arm og ben ut til de er i linje med kroppen, uten at hoften vipper.', dose: '3 × 8 per side' },
  { id: 'back-ext', name: 'Rygghev', groups: ['lower_back', 'glute'], focus: 'strength',
    how: 'Løft overkroppen til den er i linje med bena. Bruk setet, og unngå å svaie over.', dose: '3 × 10–12' },

  // --- Sete og hofte ---
  { id: 'hip-thrust', name: 'Hip thrust / seteløft', groups: ['glute', 'hamstring'], focus: 'strength', handball: true,
    how: 'Øvre rygg mot en benk, føttene i gulvet. Press hoften opp til kroppen er rett, og klem setet på toppen.', dose: '3 × 8–12' },
  { id: 'band-walk', name: 'Sidelengs gange med strikk', groups: ['glute', 'hip'], focus: 'prevention', handball: true,
    how: 'Strikk rundt knærne eller anklene. Gå sidelengs i lett knebøy med knærne presset ut mot strikken.', dose: '3 × 10 m hver vei' },
  { id: 'sl-rdl', name: 'Ettbens rumensk markløft', groups: ['hamstring', 'glute', 'ankle'], focus: 'stability', handball: true,
    how: 'Stå på ett ben med lett bøy i kneet. Vipp fremover fra hoften med rett rygg til du kjenner strekk på baksiden, og reis deg igjen.', dose: '3 × 8 per ben' },
  { id: 'psoas-march', name: 'Hoftebøyerløft med strikk', groups: ['hip'], focus: 'strength',
    how: 'Ligg på ryggen eller stå, med strikk rundt føttene. Dra ett kne mot brystet mens det andre benet holder seg strakt.', dose: '3 × 10 per side' },

  // --- Lår bakside ---
  { id: 'nordic', name: 'Nordic hamstring', groups: ['hamstring'], focus: 'prevention', handball: true,
    how: 'Stå på knærne med anklene festet. Senk overkroppen sakte fremover med strak hofte så lenge du klarer, ta imot med hendene og skyv deg opp igjen.', dose: 'Start 2 × 5, bygg til 3 × 8–10' },

  // --- Lyske ---
  { id: 'copenhagen', name: 'Copenhagen adduktor', groups: ['groin'], focus: 'prevention', handball: true,
    how: 'Sideplanke med det øverste benet på en benk. Løft det nederste benet opp til det øverste, og senk rolig. Start med kneet på benken for kortere vektarm.', dose: '2–3 × 6–10 per side' },
  { id: 'adductor-squeeze', name: 'Adduktorklem', groups: ['groin'], focus: 'prevention', handball: true,
    how: 'Ligg på ryggen med bøyde knær og en ball mellom knærne. Klem sammen og hold. En skånsom start hvis lysken er øm.', dose: '3 × 10 × 5 s' },

  // --- Lår forside og kne ---
  { id: 'squat', name: 'Knebøy', groups: ['quad', 'glute'], focus: 'strength',
    how: 'Føttene i skulderbredde. Sett deg ned og bak med knærne i samme retning som tærne. Hele foten i gulvet.', dose: '3 × 6–10' },
  { id: 'split-squat', name: 'Bulgarsk utfall', groups: ['quad', 'glute', 'knee'], focus: 'strength', handball: true,
    how: 'Bakre fot på en benk. Senk deg rett ned med kneet over foten, og skyv opp gjennom fremre hæl.', dose: '3 × 8 per ben' },
  { id: 'wall-sit', name: 'Veggsitt / spansk knebøy', groups: ['knee', 'quad'], focus: 'prevention',
    how: 'Sitt mot veggen med 60–90° i knærne og hold. Statisk belastning er ofte godt for knesener.', dose: '4 × 30–45 s' },
  { id: 'drop-landing', name: 'Hopp og landing', groups: ['knee', 'ankle'], focus: 'prevention', handball: true,
    how: 'Hopp ned fra en lav kasse og land mykt og stille – først på to ben, senere på ett. Kneet skal peke over tærne og ikke falle innover.', dose: '3 × 6–8' },
  { id: 'skater', name: 'Skøytehopp med fintelanding', groups: ['knee', 'ankle', 'glute'], focus: 'prevention', handball: true,
    how: 'Hopp sidelengs fra ben til ben. Land kontrollert, hold balansen ett sekund, og skyv fra igjen. Etterligner finter og retningsendringer.', dose: '3 × 8 per side' },

  // --- Legg og ankel ---
  { id: 'calf-raise', name: 'Tåhev (strakt og bøyd kne)', groups: ['calf', 'ankle'], focus: 'strength',
    how: 'Løft deg høyt opp på tå og senk rolig. Gjør både med strakt kne og med lett bøyd kne. Gjerne på ett ben.', dose: '3 × 12–15' },
  { id: 'balance', name: 'Ettbens balanse', groups: ['ankle', 'knee'], focus: 'prevention', handball: true,
    how: 'Stå på ett ben på balansepute eller mykt underlag. Gjør det vanskeligere ved å kaste ball mot en vegg eller lukke øynene.', dose: '3 × 30–45 s per ben' },

  // --- Nakke og holdning ---
  { id: 'chin-tuck', name: 'Hakeinntrekk', groups: ['neck'], focus: 'posture',
    how: 'Trekk haken rett bakover som om du lager dobbelthake, uten å bøye hodet. Hold, og slipp rolig.', dose: '2 × 10 × 5 s' },
  { id: 'wall-angel', name: 'Veggengler', groups: ['upper_back', 'shoulder', 'chest'], focus: 'posture',
    how: 'Stå med rygg, hode og armer mot en vegg. Skyv armene opp og ned langs veggen uten å miste kontakten.', dose: '2–3 × 10' },
  { id: 'open-book', name: 'Åpne boka (brystryggrotasjon)', groups: ['upper_back'], focus: 'posture',
    how: 'Ligg på siden med knærne bøyd. Før den øverste armen i en bue over til den andre siden og følg hånden med blikket.', dose: '2 × 8 per side' },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const getExercise = (id) => BY_ID.get(id) || null;

/** Filtre i øvelsesbiblioteket. */
export const EXERCISE_FILTERS = [
  { id: 'all', name: 'Alle' },
  { id: 'handball', name: 'Håndball' },
  { id: 'shoulder', name: 'Skulder', groups: ['shoulder'] },
  { id: 'back', name: 'Rygg og nakke', groups: ['upper_back', 'lower_back', 'neck'] },
  { id: 'core', name: 'Core', groups: ['abs', 'oblique'] },
  { id: 'hip', name: 'Hofte og sete', groups: ['hip', 'glute', 'groin'] },
  { id: 'thigh', name: 'Lår', groups: ['quad', 'hamstring'] },
  { id: 'knee', name: 'Kne', groups: ['knee'] },
  { id: 'lower', name: 'Legg og ankel', groups: ['calf', 'ankle'] },
  { id: 'arms', name: 'Bryst og armer', groups: ['chest', 'biceps', 'triceps', 'forearm'] },
];
