// Kroppsregioner og SVG-former for kroppskartet (viewBox 0 0 240 520).
//
// Parvise regioner (paired) finnes som venstre og høyre: id + '_l' / '_r'.
// Former med half: true er tegnet for betrakterens høyre halvdel og speiles
// automatisk til den andre siden. Forfra er betrakterens høyre = personens
// venstre; bakfra er betrakterens høyre = personens høyre.
//
// Figuren er bygget slik: OUTLINE er kroppens kontur (én halvdel). Den brukes
// som klippemaske, så regionformene under kan være romslige utover konturen –
// det er bare de INDRE grensene mellom regionene som må være nøyaktige.
// DETAILS er pyntelinjer (muskeltegning) som ikke kan trykkes på.

export const REGIONS = [
  { id: 'head', label: 'Hode', paired: false },
  { id: 'neck', label: 'Nakke', paired: false },
  { id: 'shoulder', label: 'Skulder', paired: true },
  { id: 'chest', label: 'Bryst', paired: false },
  { id: 'upper_back', label: 'Øvre rygg', paired: false },
  { id: 'lower_back', label: 'Nedre rygg', paired: false },
  { id: 'biceps', label: 'Overarm forside (biceps)', paired: true },
  { id: 'triceps', label: 'Overarm bakside (triceps)', paired: true },
  { id: 'forearm', label: 'Underarm', paired: true },
  { id: 'abs', label: 'Mage/core', paired: false },
  { id: 'oblique', label: 'Skrå magemuskler', paired: true },
  { id: 'hip', label: 'Hofte/hoftebøyer', paired: true },
  { id: 'glute', label: 'Sete', paired: true },
  { id: 'groin', label: 'Lyske/adduktorer', paired: true },
  { id: 'quad', label: 'Lår forside', paired: true },
  { id: 'hamstring', label: 'Lår bakside', paired: true },
  { id: 'knee', label: 'Kne', paired: true },
  { id: 'calf', label: 'Legg', paired: true },
  { id: 'ankle', label: 'Ankel/fot', paired: true },
];

const BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
const SIDE_NAMES = { l: 'Venstre', r: 'Høyre' };

/** 'shoulder_l' -> { base: 'shoulder', side: 'l' } ; 'head' -> { base: 'head', side: null } */
export function parseRegionId(id) {
  const m = /^(.*)_([lr])$/.exec(id);
  if (m && BY_ID.has(m[1]) && BY_ID.get(m[1]).paired) return { base: m[1], side: m[2] };
  return { base: id, side: null };
}

export const getRegion = (id) => BY_ID.get(parseRegionId(id).base) || null;

export function regionLabel(id) {
  const { base, side } = parseRegionId(id);
  const region = BY_ID.get(base);
  if (!region) return id;
  if (!side) return region.label;
  return `${SIDE_NAMES[side]} ${region.label.charAt(0).toLowerCase()}${region.label.slice(1)}`;
}

/** Alle region-id-er, med begge sider for parvise regioner. */
export const ALL_REGION_IDS = REGIONS.flatMap((r) => (r.paired ? [`${r.id}_l`, `${r.id}_r`] : [r.id]));

export const VIEWBOX = { width: 240, height: 520 };

// Kroppens kontur, betrakterens høyre halvdel, fra halsen og rundt til skrittet.
export const OUTLINE =
  'M132 64 L133 82 C135 90 148 93 162 96 C175 97 186 105 188 121 C190 134 189 143 190 153 ' +
  'C192 171 193 190 195 204 C200 215 200 232 201 250 C202 260 202 266 202 272 ' +
  'C207 282 207 296 203 306 C201 311 196 311 194 306 C191 296 190 284 190 273 ' +
  'C187 255 182 232 178 212 C176 200 174 180 170 160 L168 144 ' +
  'C168 162 164 180 159 198 C157 210 157 224 159 238 C161 250 162 262 162 278 ' +
  'C162 310 156 345 152 370 C150 380 153 395 153 408 C153 435 146 460 144 478 ' +
  'C144 488 150 497 153 503 C154 508 148 509 140 509 L130 509 C126 509 126 503 128 498 ' +
  'C130 490 130 484 130 478 C129 455 124 430 125 408 C125 395 128 385 127 372 ' +
  'C126 340 123 300 121 264 L120 262';

/** Lukket halvkontur til klippemasken. */
export const OUTLINE_CLIP = `${OUTLINE} L120 64 Z`;

export const HEAD = 'M120 12 C134 12 142 23 142 38 C142 46 141 52 139 57 C136 67 128 75 120 75 C112 75 104 67 101 57 C99 52 98 46 98 38 C98 23 106 12 120 12 Z';
export const EAR = 'M141 37 C146 35 147 41 146 46 C145 51 142 53 140 51 Z';

const SHOULDER = 'M161 96 L210 86 L210 151 L190 151 Q182 159 176 151 Q172 145 169 139 Q162 120 161 96 Z';
const UPPER_ARM = 'M169 139 Q172 145 176 151 Q182 159 190 151 L210 151 L210 206 Q188 213 174 204 L170 160 L168 144 Z';
const FOREARM = 'M174 204 Q188 213 210 206 L212 272 Q196 277 184 272 L170 204 Z';
const KNEE = 'M120 352 Q138 345 172 352 L172 392 Q146 399 120 392 Z';
const LOWER_LEG = 'M120 392 Q146 399 172 392 L172 468 Q138 461 120 468 Z';
const FOOT = 'M120 468 Q138 461 172 468 L172 516 L120 516 Z';

// Rekkefølgen bestemmer hva som ligger øverst der former overlapper litt.
export const SHAPES = {
  front: [
    { region: 'abs', d: 'M120 150 L141 150 L140 226 Q135 246 120 258 Q105 246 100 226 L99 150 Z' },
    { region: 'oblique', half: true, d: 'M141 150 L168 144 L170 160 L170 226 L140 226 Z' },
    { region: 'hip', half: true, d: 'M140 226 L172 226 L172 286 Q152 282 141 262 Q136 252 133 244 Q138 238 140 226 Z' },
    { region: 'groin', half: true, d: 'M120 258 Q130 252 133 244 Q136 252 141 262 Q141 300 124 342 L120 342 Z' },
    { region: 'quad', half: true, d: 'M141 262 Q152 282 172 286 L172 352 Q138 345 120 352 L120 342 L124 342 Q141 300 141 262 Z' },
    { region: 'knee', half: true, d: KNEE },
    { region: 'calf', half: true, d: LOWER_LEG },
    { region: 'ankle', half: true, d: FOOT },
    { region: 'neck', d: 'M120 99 Q142 102 161 96 L166 86 L166 58 L74 58 L74 86 L79 96 Q98 102 120 99 Z' },
    { region: 'chest', d: 'M120 99 Q142 102 161 96 Q162 120 169 139 L168 144 Q148 166 120 154 Q92 166 72 144 L71 139 Q78 120 79 96 Q98 102 120 99 Z' },
    { region: 'biceps', half: true, d: UPPER_ARM },
    { region: 'forearm', half: true, d: FOREARM },
    { region: 'shoulder', half: true, d: SHOULDER },
  ],
  back: [
    { region: 'lower_back', d: 'M120 176 Q144 183 170 172 L170 230 Q144 226 120 238 Q96 226 70 230 L70 172 Q96 183 120 176 Z' },
    { region: 'glute', half: true, d: 'M120 238 Q144 226 170 230 L172 230 L172 284 Q150 301 128 292 Q121 289 120 280 Z' },
    { region: 'hamstring', half: true, d: 'M120 280 Q121 289 128 292 Q150 301 172 284 L172 352 Q138 345 120 352 Z' },
    { region: 'knee', half: true, d: KNEE },
    { region: 'calf', half: true, d: LOWER_LEG },
    { region: 'ankle', half: true, d: FOOT },
    { region: 'upper_back', d: 'M106 86 Q120 92 134 86 L140 58 L166 58 L161 96 Q162 120 169 139 L168 144 L170 160 L170 172 Q144 183 120 176 Q96 183 70 172 L70 160 L72 144 L71 139 Q78 120 79 96 L74 58 L100 58 Z' },
    { region: 'neck', d: 'M104 58 L136 58 L134 86 Q120 92 106 86 Z' },
    { region: 'triceps', half: true, d: UPPER_ARM },
    { region: 'forearm', half: true, d: FOREARM },
    { region: 'shoulder', half: true, d: SHOULDER },
  ],
};

// Pyntelinjer. half: true speiles. center: true tegnes én gang.
export const DETAILS = {
  front: [
    { d: 'M120 104 L120 150', center: true },
    { d: 'M120 156 L120 250', center: true },
    { d: 'M103 172 Q120 176 137 172 M103 191 Q120 195 137 191 M104 210 Q120 214 136 210', center: true },
    { d: 'M131 356 Q139 350 146 356 Q149 368 145 380 Q139 386 132 380 Q128 368 131 356 Z', half: true },
    { d: 'M150 296 Q149 322 143 344', half: true },
    { d: 'M136 400 Q133 432 136 462', half: true },
    { d: 'M180 160 Q185 178 182 198', half: true },
    { d: 'M134 84 Q128 94 122 98', half: true },
  ],
  back: [
    { d: 'M120 92 L120 236', center: true },
    { d: 'M134 112 Q151 120 150 146 Q143 152 135 148', half: true },
    { d: 'M124 100 Q142 106 160 99', half: true },
    { d: 'M139 396 Q137 420 139 444 M139 444 Q134 456 135 470', half: true },
    { d: 'M150 300 Q146 322 144 344', half: true },
    { d: 'M182 158 Q188 176 185 198', half: true },
    { d: 'M130 364 Q138 370 147 364', half: true },
  ],
};

/** Hvilken side betrakterens høyre halvdel tilsvarer i hver visning. */
export const VIEWER_RIGHT_SIDE = { front: 'l', back: 'r' };
