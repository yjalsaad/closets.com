/* Dependency-free SVG charts for the study (bar, horizontal bar, donut, combo bar + line). The repo has no chart library and the study needs four
 * simple shapes, so these are drawn with SVG: crisp at any size, printable, themeable through var(--yws-*) (no colour literals here), and every
 * chart has an accessible data table equivalent (the editor's table doubles as it). Values are plotted exactly as stored. */
import React from 'react';

export const SERIES_COLORS = ['var(--yws-red)', 'var(--yws-dark)', 'var(--yws-mute-2)', 'var(--yws-mute)', 'var(--yws-green)', 'var(--yws-amber)'];
const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString('en-US') : String(Math.round(n * 1000) / 1000));
export { fmt as fmtNum };
const niceMax = (v) => { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };

export function Donut({ labels, values, title }) {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1; let acc = 0; const R = 70, C = 2 * Math.PI * R;
  return (
    <svg className="yws-donut" viewBox="0 0 200 200" role="img" aria-label={title || 'chart'}>
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--yws-line)" strokeWidth="28" />
      {values.map((v, i) => { const len = (Math.max(0, v) / total) * C, off = -acc; acc += len; return <circle key={i} cx="100" cy="100" r={R} fill="none" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth="28" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off} transform="rotate(-90 100 100)"><title>{`${labels[i] || ''}: ${fmt(v)}`}</title></circle>; })}
    </svg>
  );
}

export function HBar({ labels, values, unit, title }) {
  const max = niceMax(Math.max(...values, 0)), rowH = 30, h = labels.length * rowH + 8;
  return (
    <svg className="yws-bars" viewBox={`0 0 560 ${h}`} role="img" aria-label={title || 'chart'} preserveAspectRatio="xMidYMid meet">
      {labels.map((l, i) => { const w = (Math.max(0, values[i]) / max) * 280; return (
        <g key={i} transform={`translate(0 ${i * rowH + 4})`}>
          <text x="556" y="17" textAnchor="end" className="yws-svg-t">{l}</text>
          <rect x={400 - Math.max(0, w)} y="3" width={Math.max(0, w)} height="20" rx="5" fill={i === 0 ? 'var(--yws-red)' : 'var(--yws-slate)'} />
          <text x={400 - w - 6} y="18" textAnchor="end" className="yws-svg-v">{fmt(values[i])}{unit ? ' ' + unit : ''}</text>
        </g>); })}
    </svg>
  );
}

/** grouped bars (+ optional line series), the y axis starts at 0 */
export function Combo({ labels, series, unit, title }) {
  const W = 560, H = 280, L = 44, B = 46, T = 14, R = 8, pw = W - L - R, ph = H - B - T;
  const all = series.flatMap((s) => s.values), max = niceMax(Math.max(...all, 0));
  const bars = series.map((s, i) => ({ s, i })).filter((x) => !x.s.line), lines = series.map((s, i) => ({ s, i })).filter((x) => x.s.line);
  const band = pw / Math.max(1, labels.length), bw = Math.max(4, Math.min(26, (band * 0.74) / Math.max(1, bars.length)));
  const y = (v) => T + ph - (Math.max(0, v) / max) * ph, cx = (k) => L + band * k + band / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  return (
    <svg className="yws-bars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title || 'chart'} preserveAspectRatio="xMidYMid meet">
      {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--yws-line)" /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="yws-svg-v">{fmt(t)}</text></g>)}
      {labels.map((l, k) => <text key={k} x={cx(k)} y={H - B + 18} textAnchor="middle" className="yws-svg-t">{l}</text>)}
      {labels.map((l, k) => bars.map(({ s, i }, bi) => { const x = cx(k) - (bars.length * bw) / 2 + bi * bw; return <rect key={`${k}-${i}`} x={x + 1} y={y(s.values[k])} width={bw - 2} height={Math.max(0, T + ph - y(s.values[k]))} rx="3" fill={SERIES_COLORS[i % SERIES_COLORS.length]}><title>{`${s.name}: ${fmt(s.values[k])}${unit ? ' ' + unit : ''}`}</title></rect>; }))}
      {lines.map(({ s, i }) => (
        <g key={i}>
          <polyline fill="none" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth="3" points={labels.map((_, k) => `${cx(k)},${y(s.values[k])}`).join(' ')} />
          {labels.map((_, k) => <circle key={k} cx={cx(k)} cy={y(s.values[k])} r="4" fill={SERIES_COLORS[i % SERIES_COLORS.length]}><title>{`${s.name}: ${fmt(s.values[k])}`}</title></circle>)}
        </g>))}
    </svg>
  );
}
