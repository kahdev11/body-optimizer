// Små UI-byggeklosser: elementbygger, toast, bunnark (sheet) og bekreftelsesdialog.

/** Lager et element. Brukerdata settes alltid som tekst, aldri som HTML. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

export function mount(el, ...children) {
  append(el, children);
  return el;
}

/** Erstatter innholdet i et element (tåler null og lister, i motsetning til replaceChildren). */
export function setChildren(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : String(child));
  }
}

export const formatDate = (iso, options = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat('nb-NO', options).format(new Date(iso)) : '';

export const formatDateTime = (iso) =>
  formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ---------- Toast ----------

let toastTimer = null;

export function toast(message, { type = 'info', duration = 2800 } = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.type = type;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

// ---------- Bunnark ----------

/** Åpner et ark som glir opp fra bunnen. Returnerer { close, body }. */
export function openSheet({ title, content, onClose } = {}) {
  let closed = false;
  const body = h('div', { class: 'sheet-body' }, content);
  const panel = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || '' },
    h('div', { class: 'sheet-grabber' }),
    h(
      'div',
      { class: 'sheet-header' },
      h('h2', { class: 'sheet-title' }, title || ''),
      h('button', { class: 'sheet-close', type: 'button', 'aria-label': 'Lukk', onclick: () => close() }, '✕')
    ),
    body
  );
  const backdrop = h('div', { class: 'backdrop', onclick: (e) => e.target === backdrop && close() }, panel);

  function close() {
    if (closed) return;
    closed = true;
    backdrop.inert = true; // ingen trykk mens arket glir ut
    backdrop.classList.remove('open');
    backdrop.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => backdrop.remove(), 280);
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return { close, body };
}

// ---------- Bekreftelse ----------

export function confirmDialog({ title, message, confirmText = 'OK', cancelText = 'Avbryt', danger = false }) {
  return new Promise((resolve) => {
    const done = (answer) => {
      backdrop.classList.remove('open');
      setTimeout(() => backdrop.remove(), 200);
      resolve(answer);
    };
    const backdrop = h(
      'div',
      { class: 'backdrop center' },
      h(
        'div',
        { class: 'alert', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', { class: 'alert-title' }, title),
        message ? h('p', { class: 'alert-message' }, message) : null,
        h(
          'div',
          { class: 'alert-actions' },
          h('button', { class: 'btn btn-plain', type: 'button', onclick: () => done(false) }, cancelText),
          h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', onclick: () => done(true) }, confirmText)
        )
      )
    );
    document.body.append(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('open'));
  });
}

// ---------- Vanlige komponenter ----------

export function card(...children) {
  return h('section', { class: 'card' }, children);
}

export function sectionTitle(text) {
  return h('h2', { class: 'section-title' }, text);
}

/** Segmentert velger. options: [{ id, name }] */
export function segmented(options, selectedId, onChange, label) {
  const wrap = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label || '' });
  const select = (id) => {
    for (const btn of wrap.children) {
      const on = btn.dataset.id === id;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-checked', String(on));
    }
  };
  for (const opt of options) {
    wrap.append(
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          dataset: { id: opt.id },
          onclick: () => {
            select(opt.id);
            onChange(opt.id);
          },
        },
        opt.name
      )
    );
  }
  select(selectedId);
  return wrap;
}
