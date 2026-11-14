// Tøyeprogrammer. Lett å utvide: legg til et program eller en øvelse i listene.
//
//  regions  kroppsregioner programmet hjelper mot stivhet i (brukes av anbefalingene)

export const STRETCH_PROGRAMS = [
  {
    id: 'hips', name: 'Hofter', minutes: 9, regions: ['hip', 'glute', 'groin', 'lower_back'],
    intro: 'Stive hofter gir ofte svai i korsryggen og dårligere fraspark. Godt etter trening eller mye sitting.',
    items: [
      { name: 'Hoftebøyer i utfall', how: 'Knestående utfall. Knip setet på bakre ben og skyv hoften frem uten å svaie i ryggen.', dose: '2 × 45 s per side' },
      { name: 'Duestilling (sete)', how: 'Fremre ben bøyd foran deg, bakre ben strakt. Len overkroppen rolig frem over fremre legg.', dose: '2 × 45 s per side' },
      { name: '90/90 hofterotasjon', how: 'Sitt med begge knær i 90°. Roter knærne over til motsatt side uten å bruke hendene mer enn nødvendig.', dose: '2 × 8 per side' },
      { name: 'Sommerfugl (adduktorer)', how: 'Sitt med fotsålene mot hverandre. Rett rygg, la knærne synke mot gulvet.', dose: '2 × 45 s' },
      { name: 'Dyp knebøy', how: 'Sitt helt ned med hælene i gulvet og press knærne ut med albuene. Hold deg gjerne i noe.', dose: '2 × 30 s' },
    ],
  },
  {
    id: 'neck', name: 'Nakke', minutes: 6, regions: ['neck', 'upper_back', 'chest'],
    intro: 'Rolige bevegelser – aldri press inn i smerte. Kan også hjelpe mot spenningshodepine.',
    items: [
      { name: 'Sidebøy (øvre trapezius)', how: 'La øret synke mot skulderen. Legg hånden lett på hodet og la den andre armen henge tungt.', dose: '2 × 30 s per side' },
      { name: 'Nese mot armhule (levator)', how: 'Vri hodet 45° og se ned mot armhulen. Hjelp forsiktig til med hånden.', dose: '2 × 30 s per side' },
      { name: 'Hakeinntrekk', how: 'Trekk haken rett bakover og hold. Lang nakke.', dose: '10 × 5 s' },
      { name: 'Brysttøy i døråpning', how: 'Underarmen mot dørkarmen med albuen i skulderhøyde. Vri kroppen rolig bort.', dose: '2 × 30 s per side' },
      { name: 'Rolige nakkerotasjoner', how: 'Se rolig over hver skulder, så langt det går uten ubehag.', dose: '5 per side' },
    ],
  },
  {
    id: 'back', name: 'Rygg', minutes: 7, regions: ['lower_back', 'upper_back', 'oblique'],
    intro: 'Bevegelighet i brystryggen avlaster både korsrygg og skulder – viktig for kastbevegelsen.',
    items: [
      { name: 'Katt–ku', how: 'På alle fire: krum ryggen opp mot taket, og svai deretter rolig ned. Følg pusten.', dose: '10 repetisjoner' },
      { name: 'Barnets stilling', how: 'Sitt bak på hælene med armene strakt frem og pannen mot gulvet. Pust dypt ned i ryggen.', dose: '2 × 45 s' },
      { name: 'Liggende rotasjon', how: 'Ligg på ryggen, la bøyde knær falle til én side mens skuldrene blir liggende.', dose: '2 × 30 s per side' },
      { name: 'Åpne boka', how: 'Sideliggende med bøyde knær. Før øverste arm i en bue over til andre siden.', dose: '8 per side' },
      { name: 'Sfinks', how: 'Ligg på magen og støtt deg på underarmene. La hoften være tung mot gulvet.', dose: '2 × 30 s' },
    ],
  },
  {
    id: 'thighs', name: 'Lår', minutes: 7, regions: ['hamstring', 'quad', 'groin', 'knee'],
    intro: 'Tøy bakside og forside etter økter med løp, sprint og hopp.',
    items: [
      { name: 'Hamstring liggende', how: 'Ligg på ryggen og løft ett strakt ben. Hold bak låret eller bruk et håndkle rundt foten.', dose: '2 × 45 s per side' },
      { name: 'Quadriceps sideliggende', how: 'Ligg på siden og dra hælen mot setet. Skyv hoften frem – ikke svai i ryggen.', dose: '2 × 45 s per side' },
      { name: 'Sideutfall (cossack)', how: 'Bredbent stilling. Sett deg ned over ett ben mens det andre holdes strakt. Bytt side rolig.', dose: '2 × 8 per side' },
      { name: 'Utside lår (TFL)', how: 'Stå med bena i kryss og len overkroppen sideveis bort fra bakre ben.', dose: '2 × 30 s per side' },
    ],
  },
  {
    id: 'calves', name: 'Legger', minutes: 6, regions: ['calf', 'ankle'],
    intro: 'God ankelbevegelighet gir bedre landinger og mindre belastning på kne og akilles.',
    items: [
      { name: 'Legg med strakt kne', how: 'Hendene mot veggen, bakre ben strakt med hælen i gulvet. Len deg frem.', dose: '2 × 45 s per side' },
      { name: 'Legg med bøyd kne (soleus)', how: 'Samme stilling, men bøy bakre kne og hold hælen nede.', dose: '2 × 45 s per side' },
      { name: 'Kne mot vegg', how: 'Foten en håndsbredde fra veggen. Før kneet frem mot veggen uten at hælen løfter seg.', dose: '2 × 10 per side' },
      { name: 'Rull under foten', how: 'Rull fotsålen over en ball med moderat trykk.', dose: '1 min per fot' },
    ],
  },
];

const BY_ID = new Map(STRETCH_PROGRAMS.map((p) => [p.id, p]));
export const getStretchProgram = (id) => BY_ID.get(id) || null;
