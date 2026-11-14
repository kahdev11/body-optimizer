// Kroppskartet: SVG-silhuett med klikkbare regioner, fargelagt som varmekart.
//
// Lagene, nedenfra og opp:
//   1. Silhuetten som fyll (gir hender og andre flater uten egen region)
//   2. Regionene, klippet til silhuetten
//   3. Pyntelinjer (muskeltegning), også klippet
//   4. Konturstrek
//   5. Hode og ører

import { SHAPES, DETAILS, OUTLINE, OUTLINE_CLIP, HEAD, EAR, VIEWBOX, VIEWER_RIGHT_SIDE, getRegion, regionLabel } from './regions.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIRROR = `translate(${VIEWBOX.width} 0) scale(-1 1)`;

function svgEl(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

/** Tegner en form og speilbildet av den. */
const both = (attrs) => [svgEl('path', attrs), svgEl('path', { ...attrs, transform: MIRROR })];

/**
 * Lager kartet.
 *  view:      'front' | 'back'
 *  levels:    Map(regionId -> { level: 'p3' | 's2' | …, text: 'smerte 5' })
 *  onSelect:  (regionId) => void
 */
export function createBodyMap({ view, levels, onSelect }) {
  const clipId = `bodymap-clip-${view}`;
  const svg = svgEl('svg', {
    viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
    class: 'bodymap',
    role: 'group',
    'aria-label': view === 'front' ? 'Kroppen sett forfra' : 'Kroppen sett bakfra',
  });

  const makeRegion = (regionId, d, mirrored) => {
    const info = levels.get(regionId);
    const path = svgEl('path', {
      d,
      class: 'bodymap-region',
      tabindex: '0',
      role: 'button',
      'data-region': regionId,
      'aria-label': `${regionLabel(regionId)}${info ? `, ${info.text}` : ', ikke registrert'}`,
    });
    if (mirrored) path.setAttribute('transform', MIRROR);
    if (info && info.level) path.setAttribute('data-level', info.level);
    path.addEventListener('click', () => onSelect(regionId));
    path.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(regionId);
      }
    });
    return path;
  };

  const rightSide = VIEWER_RIGHT_SIDE[view];
  const leftSide = rightSide === 'l' ? 'r' : 'l';
  const regions = svgEl('g', { 'clip-path': `url(#${clipId})` });
  for (const shape of SHAPES[view]) {
    if (shape.half && getRegion(shape.region).paired) {
      regions.append(makeRegion(`${shape.region}_${rightSide}`, shape.d, false), makeRegion(`${shape.region}_${leftSide}`, shape.d, true));
    } else {
      regions.append(makeRegion(shape.region, shape.d, false));
    }
  }

  const details = svgEl('g', { class: 'bodymap-details', 'clip-path': `url(#${clipId})` });
  for (const line of DETAILS[view]) {
    if (line.half) details.append(...both({ d: line.d }));
    else details.append(svgEl('path', { d: line.d }));
  }

  svg.append(
    svgEl('defs', {}, svgEl('clipPath', { id: clipId }, ...both({ d: OUTLINE_CLIP }))),
    svgEl('g', { class: 'bodymap-base' }, ...both({ d: OUTLINE_CLIP })),
    regions,
    details,
    svgEl('g', { class: 'bodymap-outline' }, ...both({ d: OUTLINE })),
    svgEl('g', { class: 'bodymap-ears' }, ...both({ d: EAR })),
    makeRegion('head', HEAD, false)
  );
  svg.lastChild.classList.add('bodymap-head');
  return svg;
}
