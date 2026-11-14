// Egne SVG-grafer (ingen eksterne biblioteker – fungerer uten nett).
// Linjegraf og stolpegraf med rutenett, akseetiketter, tegnforklaring og
// verdivisning ved trykk/hover.

import { h } from './ui.js';

const W = 340;
const PAD = { top: 10, right: 12, bottom: 22, left: 30 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const defaultFormat = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(v);

/** Pene akseverdier: 3–5 jevne trinn mellom min og max. */
function niceTicks(min, max, count = 4) {
  if (max <= min) max = min + 1;
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number((ticks[ticks.length - 1] + step).toFixed(6)));
  return ticks;
}

function frame({ height, ticks, yOf, format }) {
  const x0 = PAD.left;
  const x1 = W - PAD.right;
  return ticks
    .map((t) => `<line class="chart-grid" x1="${x0}" x2="${x1}" y1="${yOf(t).toFixed(1)}" y2="${yOf(t).toFixed(1)}"/><text class="chart-axis" x="${x0 - 6}" y="${(yOf(t) + 3.5).toFixed(1)}" text-anchor="end">${esc(format(t))}</text>`)
    .join('');
}

function shell({ svg, height, legend, summary, onPoint }) {
  const tip = h('div', { class: 'chart-tip', hidden: true });
  const plot = h('div', { class: 'chart-plot' });
  plot.innerHTML = `<svg viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(summary)}">${svg}</svg>`;
  plot.append(tip);
  const wrap = h('div', { class: 'chart' }, plot, legend && legend.length > 1 ? h('div', { class: 'chart-legend' }, legend.map((s) => h('span', {}, h('i', { style: `background:${s.color}` }), s.name))) : null);

  const svgEl = plot.firstChild;
  const hide = () => { tip.hidden = true; onPoint(null, svgEl); };
  const move = (e) => {
    const rect = svgEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const hit = onPoint(x, svgEl);
    if (!hit) { tip.hidden = true; return; }
    tip.replaceChildren(h('strong', {}, hit.title), ...hit.rows.map((r) => h('span', {}, r.color ? h('i', { style: `background:${r.color}` }) : null, r.text)));
    tip.hidden = false;
    const left = (hit.x / W) * 100;
    tip.style.left = `${Math.max(18, Math.min(82, left))}%`;
  };
  plot.addEventListener('pointermove', move);
  plot.addEventListener('pointerdown', move);
  plot.addEventListener('pointerleave', hide);
  return wrap;
}

export function emptyChart(text = 'Ingen data i perioden ennå.') {
  return h('div', { class: 'chart chart-empty' }, h('p', { class: 'muted small' }, text));
}

/**
 * Linjegraf.
 *  series: [{ name, color, points: [{ t: ms, v: number }] }]
 *  tMin/tMax: tidsrom (ms). yMin/yMax: valgfritt, ellers fra data.
 *  format(v): tallformat. formatTime(ms): etikett for tidspunkt.
 */
export function lineChart({ series, tMin, tMax, yMin, yMax, format = defaultFormat, formatTime, unit = '', height = 170, extraRows }) {
  const all = series.flatMap((s) => s.points);
  if (!all.length) return emptyChart();

  const values = all.map((p) => p.v);
  let lo = yMin ?? Math.min(...values);
  let hi = yMax ?? Math.max(...values);
  if (yMin === undefined && yMax === undefined) {
    const span = hi - lo || Math.max(1, Math.abs(hi) * 0.02);
    lo -= span * 0.15;
    hi += span * 0.15;
  }
  const ticks = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0]);
  hi = Math.max(hi, ticks[ticks.length - 1]);

  const x0 = PAD.left;
  const x1 = W - PAD.right;
  const y0 = height - PAD.bottom;
  const xOf = (t) => (tMax === tMin ? (x0 + x1) / 2 : x0 + ((t - tMin) / (tMax - tMin)) * (x1 - x0));
  const yOf = (v) => y0 - ((v - lo) / (hi - lo)) * (y0 - PAD.top);

  let svg = frame({ height, ticks, yOf, format });
  const labelTimes = [tMin, (tMin + tMax) / 2, tMax];
  svg += labelTimes.map((t, i) => `<text class="chart-axis" x="${xOf(t).toFixed(1)}" y="${height - 6}" text-anchor="${['start', 'middle', 'end'][i]}">${esc(formatTime(t))}</text>`).join('');
  svg += `<line class="chart-cross" x1="0" x2="0" y1="${PAD.top}" y2="${y0}" visibility="hidden"/>`;
  for (const s of series) {
    if (!s.points.length) continue;
    const pts = s.points.map((p) => `${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`);
    if (pts.length > 1) svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    // Markører bare når det er få punkter – ellers blir linjen grøtete.
    if (s.points.length <= 8) svg += s.points.map((p) => `<circle cx="${xOf(p.t).toFixed(1)}" cy="${yOf(p.v).toFixed(1)}" r="3" fill="${s.color}" class="chart-dot"/>`).join('');
  }

  const times = [...new Set(all.map((p) => p.t))].sort((a, b) => a - b);
  const summary = series.map((s) => (s.points.length ? `${s.name}: ${format(s.points[0].v)} til ${format(s.points[s.points.length - 1].v)}${unit}` : `${s.name}: ingen data`)).join('. ');

  return shell({
    svg, height, legend: series, summary,
    onPoint(x, svgEl) {
      const cross = svgEl.querySelector('.chart-cross');
      if (x === null) { cross.setAttribute('visibility', 'hidden'); return null; }
      let nearest = times[0];
      for (const t of times) if (Math.abs(xOf(t) - x) < Math.abs(xOf(nearest) - x)) nearest = t;
      const px = xOf(nearest);
      cross.setAttribute('x1', px);
      cross.setAttribute('x2', px);
      cross.setAttribute('visibility', 'visible');
      const rows = series
        .map((s) => ({ s, p: s.points.find((q) => q.t === nearest) }))
        .filter((r) => r.p)
        .map((r) => ({ color: series.length > 1 ? r.s.color : null, text: `${series.length > 1 ? `${r.s.name}: ` : ''}${format(r.p.v)}${unit}` }));
      if (extraRows) rows.push(...extraRows(nearest).map((text) => ({ text })));
      return { x: px, title: formatTime(nearest, true), rows };
    },
  });
}

/**
 * Stolpegraf.
 *  bars: [{ label, value, title, detail? }]  (label = akseetikett, title = i verdivisningen)
 */
export function barChart({ bars, color, yMax, format = defaultFormat, unit = '', height = 150 }) {
  if (!bars.length || bars.every((b) => !b.value)) return emptyChart();
  const hi0 = yMax ?? Math.max(...bars.map((b) => b.value));
  const ticks = niceTicks(0, hi0, 3);
  const hi = yMax ?? ticks[ticks.length - 1];

  const x0 = PAD.left;
  const x1 = W - PAD.right;
  const y0 = height - PAD.bottom;
  const yOf = (v) => y0 - (v / hi) * (y0 - PAD.top);
  const slot = (x1 - x0) / bars.length;
  const bw = Math.max(3, Math.min(26, slot - 2)); // minst 2 px luft mellom stolpene
  const cx = (i) => x0 + slot * (i + 0.5);

  let svg = frame({ height, ticks: ticks.filter((t) => t <= hi), yOf, format });
  // Etiketter: vis så mange som får plass.
  const every = Math.ceil(bars.length / 7);
  bars.forEach((b, i) => {
    if (b.value > 0) {
      const top = yOf(b.value);
      const r = Math.min(4, bw / 2, (y0 - top) / 2);
      svg += `<path class="chart-bar" data-i="${i}" fill="${color}" d="M${(cx(i) - bw / 2).toFixed(1)} ${y0} V${(top + r).toFixed(1)} q0 ${-r} ${r} ${-r} h${(bw - 2 * r).toFixed(1)} q${r} 0 ${r} ${r} V${y0} Z"/>`;
    }
    if (i % every === 0) svg += `<text class="chart-axis" x="${cx(i).toFixed(1)}" y="${height - 6}" text-anchor="middle">${esc(b.label)}</text>`;
  });
  svg += `<line class="chart-base" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/>`;

  const summary = bars.map((b) => `${b.title}: ${format(b.value)}${unit}`).join(', ');
  return shell({
    svg, height, legend: null, summary,
    onPoint(x, svgEl) {
      svgEl.querySelectorAll('.chart-bar').forEach((el) => el.classList.remove('active'));
      if (x === null) return null;
      const i = Math.max(0, Math.min(bars.length - 1, Math.floor((x - x0) / slot)));
      const el = svgEl.querySelector(`.chart-bar[data-i="${i}"]`);
      if (el) el.classList.add('active');
      const b = bars[i];
      return { x: cx(i), title: b.title, rows: [{ text: `${format(b.value)}${unit}` }, ...(b.detail ? [{ text: b.detail }] : [])] };
    },
  });
}
