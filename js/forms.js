// Skjemakomponenter som brukes i flere visninger.

import { h } from './ui.js';
import { levelOf } from './scores.js';
import { toLocalInput } from './dates.js';

export function field(label, control, extra) {
  return h('div', { class: 'field' }, h('div', { class: 'field-head' }, h('span', { class: 'field-label' }, label), extra || null), control);
}

/**
 * Rad med tallknapper. Trykk på valgt tall én gang til for å fjerne valget.
 * dim: { id, name, min, max, lowLabel, highLabel }. For 'pain', 'strength' og
 * 'mobility' får valgt knapp varmekartfargen; ellers aksentfargen.
 */
export function scalePicker(dim, onChange, initial = null) {
  const heat = ['pain', 'strength', 'mobility'].includes(dim.id);
  let value = initial;
  const wrap = h('div', { class: `scale${heat ? '' : ' scale-plain'}`, role: 'radiogroup', 'aria-label': dim.name });
  const paint = () => {
    for (const btn of wrap.children) {
      const on = Number(btn.dataset.value) === value;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-checked', String(on));
      if (on && heat) btn.dataset.level = levelOf(dim.id, value);
      else delete btn.dataset.level;
    }
  };
  for (let v = dim.min; v <= dim.max; v++) {
    wrap.append(
      h('button', {
        type: 'button', role: 'radio', dataset: { value: String(v) },
        onclick: () => {
          value = value === v ? null : v;
          paint();
          onChange(value);
        },
      }, String(v))
    );
  }
  paint();
  return h('div', {}, wrap, dim.lowLabel ? h('div', { class: 'scale-ends' }, h('span', {}, dim.lowLabel), h('span', {}, dim.highLabel)) : null);
}

/**
 * Valgbrikker. multi = flere kan velges (avkrysning); ellers én.
 * required = et enkeltvalg kan ikke nullstilles. value = startverdi.
 */
export function chips(options, { multi = false, required = false, label, onChange, value = null }) {
  const selected = new Set(multi ? value || [] : value !== null && value !== undefined ? [value] : []);
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  const paint = () => {
    for (const el of wrap.children) {
      const on = selected.has(el._id);
      el.classList.toggle('selected', on);
      el.setAttribute('aria-pressed', String(on));
    }
  };
  for (const opt of options) {
    const btn = h('button', {
      type: 'button', class: 'chip-btn',
      onclick: () => {
        if (selected.has(opt.id)) {
          if (required && !multi) return;
          selected.delete(opt.id);
        } else {
          if (!multi) selected.clear();
          selected.add(opt.id);
        }
        paint();
        onChange(multi ? [...selected] : [...selected][0] ?? null);
      },
    }, opt.name);
    btn._id = opt.id;
    wrap.append(btn);
  }
  paint();
  return wrap;
}

export function textInput({ value = '', placeholder = '', label, onInput, inputmode, maxlength }) {
  const input = h('input', { type: 'text', class: 'input', value, placeholder, 'aria-label': label, inputmode, maxlength, autocomplete: 'off' });
  input.addEventListener('input', () => onInput(input.value));
  return input;
}

/** Tallfelt med desimaltastatur. Verdien leveres som tekst – tolk med parseNumber. */
export const numberInput = (options) => textInput({ inputmode: 'decimal', maxlength: '7', ...options });

export function timeField(onChange, initial = new Date()) {
  const input = h('input', { type: 'datetime-local', class: 'input', value: toLocalInput(initial), 'aria-label': 'Tidspunkt' });
  input.addEventListener('change', () => onChange(input.value));
  return field('Tidspunkt', input);
}

export function noteField(onChange, placeholder, value = '') {
  const area = h('textarea', { class: 'input', rows: '2', placeholder, 'aria-label': 'Notat' }, value);
  area.addEventListener('input', () => onChange(area.value));
  return field('Notat (valgfritt)', area);
}

/** Fremdriftsring (0–1). */
export function ring(ratio, { size = 56, stroke = 6, done = false, label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const wrap = h('span', { class: `ring${done ? ' ring-done' : ''}`, role: 'img', 'aria-label': label || `${Math.round(clamped * 100)} %` });
  wrap.innerHTML =
    `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>` +
    `<circle class="ring-value" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" ` +
    `stroke-dasharray="${(c * clamped).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` +
    (done ? `<path class="ring-check" d="M${size * 0.34} ${size * 0.52} l${size * 0.11} ${size * 0.11} l${size * 0.21} -${size * 0.22}" fill="none" stroke-width="${stroke * 0.6}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    '</svg>';
  return wrap;
}
