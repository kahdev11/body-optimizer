// Enkle strekikoner (24x24). Statisk innhold – trygt å sette som HTML.

const PATHS = {
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2.2 2.2L15.2 13"/>',
  body: '<circle cx="12" cy="4.6" r="2.3"/><path d="M5 9.5c2.2-.9 4.5-1.3 7-1.3s4.800.4 7 1.300"/><path d="M9.300 8.500v6L8 21.500M14.700 8.500v6l1.300 7M9.300 14.500h5.400"/>',
  training: '<path d="M3 12h3.500l2.500-6 4 12 2.500-6H21"/>',
  stats: '<path d="M5 20v-7M12 20V5M19 20v-10"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  shield: '<path d="M12 3 5 6v5.500c0 4.300 2.900 7.700 7 9.500 4.100-1.800 7-5.200 7-9.500V6z"/><path d="m9 12 2.200 2.200L15 10.400"/>',
  download: '<path d="M12 4v11M7.500 11 12 15.500 16.500 11M5 20h14"/>',
  upload: '<path d="M12 16V5M7.500 9.500 12 5l4.500 4.500M5 20h14"/>',
  share: '<path d="M12 15V3.500M8 7l4-4 4 4"/><path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.600-5.900"/><path d="M20 4v5h-5"/>',
  sparkle: '<path d="M12 3.500 13.800 9l5.700 1.800-5.700 1.900L12 18.500l-1.800-5.800-5.700-1.900L10.200 9z"/>',
};

export function icon(name, size = 24) {
  const wrap = document.createElement('span');
  wrap.className = 'icon';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>`;
  return wrap;
}
