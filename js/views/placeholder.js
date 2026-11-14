// Midlertidig visning for faner som bygges i senere faser.

import { h } from '../ui.js';
import { icon } from '../icons.js';

export function placeholder({ title, iconName, phase, points }) {
  return (view) => {
    view.append(
      h('header', { class: 'view-header' }, h('h1', {}, title)),
      h(
        'section',
        { class: 'card empty-state' },
        h('div', { class: 'empty-icon' }, icon(iconName, 34)),
        h('h2', {}, `Kommer i fase ${phase}`),
        h('ul', { class: 'bullet-list' }, points.map((p) => h('li', {}, p)))
      )
    );
  };
}
