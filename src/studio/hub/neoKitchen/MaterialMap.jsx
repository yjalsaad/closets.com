/* Neo Kitchen Designer - UX-16 part map: the live kitchen elevation as a small SVG used by the "Look" and "Production materials"
 * blocks. Hovering (or focusing) a row outlines, in blue, every part that row paints. Built from the model through partMap.js;
 * Elevation.jsx is not used or changed. The drawing is never mirrored (direction: ltr), like the other card diagrams. */
import React, { useMemo, useEffect, useState, useRef, useId } from 'react';
import { mapRects, paints } from './partMap';
import { FINISHES, COUNTERS } from './constants';

const toHexNum = (n) => `#${n.toString(16).padStart(6, '0')}`;
/** "#abc" | "#aabbcc" | "rgb(a, b, c)" -> "#aabbcc" ('' when unknown) */
export function toHex(v) {
  const s = String(v || '').trim();
  let m = /^#([0-9a-f]{6})$/i.exec(s); if (m) return `#${m[1].toLowerCase()}`;
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s); if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toLowerCase();
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(s);
  if (m) return `#${[m[1], m[2], m[3]].map((x) => Math.max(0, Math.min(255, +x)).toString(16).padStart(2, '0')).join('')}`;
  return '';
}

/* the colour each group has when nothing is overridden: the same CSS custom properties Kitchen3D reads */
const groupVars = (model) => ({
  carcass: ['--nk-carcass', 0xcfd1d4], doors: [FINISHES[model.finish].cssVar, 0xb08d57], drawerFronts: [FINISHES[model.finish].cssVar, 0xb08d57],
  shelves: ['--nk-shelf', 0xdadcdf], back: ['--nk-back', 0xb3b6bb], counter: [COUNTERS[model.counter].cssVar, 0xcccccc],
  plinth: ['--nk-plinth', 0x2a2c30], handles: ['--nk-metal', 0x9aa0a6],
});
/** { defaults, effective } hex per Look group. Reads a hidden probe element carrying the 3D viewport's class, so the swatch equals what 3D uses. */
export function useGroupColours(model, probeRef) {
  const theme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || '' : '';
  const [defs, setDefs] = useState({});
  useEffect(() => {
    const el = probeRef.current; const out = {};
    const vars = groupVars(model);
    Object.entries(vars).forEach(([g, [name, fb]]) => {
      let v = '';
      try { if (el && typeof getComputedStyle === 'function') v = toHex(getComputedStyle(el).getPropertyValue(name)); } catch (e) { v = ''; }
      out[g] = v || toHexNum(fb);
    });
    setDefs(out);
  }, [model.finish, model.counter, theme, probeRef]);
  const effective = {};
  Object.keys(groupVars(model)).forEach((g) => { const o = (model.paint || {})[g]; effective[g] = (o && o.c) || defs[g] || toHexNum(groupVars(model)[g][1]); });
  return { defaults: defs, effective };
}

const TEX_ID = { wood: 'wood', marble: 'marble' };
/**
 * @param {object} p
 * @param {object} p.scene
 * @param {{group?:string, slot?:string}|null} p.target  the hovered row
 * @param {Record<string,string>|null} p.colours         group -> hex (Look mode); null = plain outline drawing
 * @param {Record<string,{t?:string}>} [p.paint]          model.paint (texture hint overlay)
 */
export default function MaterialMap({ scene, target, colours, paint = {}, label, testid }) {
  const uid = useId().replace(/:/g, '');
  const { rects, w, h } = useMemo(() => mapRects(scene, 'main'), [scene]);
  if (!rects.length) return <div className="nk-mp-empty">—</div>;
  const PAD = Math.round(Math.max(w, h) * 0.02);
  const W = w + PAD * 2; const H = h + PAD * 2;
  const X = (x) => Math.round((x + PAD) * 10) / 10; const Y = (y) => Math.round((h - y + PAD) * 10) / 10;
  const rank = { unit: 0, open: 1, counter: 2, plinth: 2, front: 3, handle: 4 };
  const ordered = [...rects].sort((a, b) => rank[a.role] - rank[b.role]);
  const dim = !!target && rects.some((r) => paints(r, target));
  const fillOf = (r) => {
    if (!colours) return null;
    if (r.role === 'unit') return colours.carcass;
    if (r.role === 'open') return colours.carcass;
    return colours[r.groups[0]] || null;
  };
  const texOf = (r) => { const g = r.role === 'unit' || r.role === 'open' ? 'carcass' : r.groups[0]; const o = g && paint[g]; return o && TEX_ID[o.t] ? o.t : null; };
  return (
    <svg className="nk-mp-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} data-testid={testid} data-mode={colours ? 'look' : 'plain'} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${uid}-wood`} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M6 0V40M16 0V40M27 0V40M35 0V40" className="nk-mp-pat" /></pattern>
        <pattern id={`${uid}-marble`} width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0 90L40 60L70 75L120 30M20 120L60 100L100 110" className="nk-mp-pat" /></pattern>
      </defs>
      {ordered.map((r) => {
        const on = paints(r, target); const fill = fillOf(r); const tex = texOf(r);
        const x = X(r.x0); const y = Y(r.y1); const rw = Math.max(1, Math.round((r.x1 - r.x0) * 10) / 10); const rh = Math.max(1, Math.round((r.y1 - r.y0) * 10) / 10);
        return (
          <g key={r.id} className={`nk-mp-r nk-mp-${r.role}${on ? ' is-hl' : ''}${dim && !on ? ' is-dim' : ''}`} data-role={r.role} data-groups={r.groups.join(' ')} data-hl={on ? '1' : '0'}>
            <rect x={x} y={y} width={rw} height={rh} style={fill ? { fill } : undefined} />
            {tex && r.role !== 'handle' && <rect x={x} y={y} width={rw} height={rh} fill={`url(#${uid}-${tex})`} className="nk-mp-texov" />}
          </g>
        );
      })}
    </svg>
  );
}

/** a hidden element that carries the 3D viewport's class so computed colours match what Kitchen3D uses */
export const ColourProbe = React.forwardRef((props, ref) => <i ref={ref} className="nk-3d nk-mp-probe" aria-hidden="true" />);
export const useProbe = () => useRef(null);
