/* Tactile finish swatches for the six existing kitchen door styles (same ids as KITCHEN_STYLES in App.js).
 * Procedural: timber grain, lacquer tooth, shaker bevel, handleless groove, gloss reflection. Colours: --sw-* tokens. */
import React from 'react';
import './art.css';

const SPEC = {
  shaker_oak:       { g: 'oak',      fil: 'wood',  shaker: true },
  handleless_white: { g: 'white',    fil: 'lac',   groove: true },
  matt_graphite:    { g: 'graphite', fil: 'lac' },
  sage_shaker:      { g: 'sage',     fil: 'lac',   shaker: true },
  gloss_navy:       { g: 'navy',     fil: 'none',  gloss: true },
  walnut:           { g: 'walnut',   fil: 'wood' },
};

export default function Swatch({ id, className = '' }) {
  const s = SPEC[id] || SPEC.shaker_oak;
  const filter = s.fil === 'wood' ? 'url(#af-wood)' : s.fil === 'lac' ? 'url(#af-lac)' : undefined;
  return (
    <svg className={`art art--swatch ${className}`.trim()} viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="200" height="200" fill={`url(#ag-sw-${s.g})`} filter={filter} />
      {s.shaker && (
        <g fill="none">
          <rect x="34" y="34" width="132" height="132" style={{ stroke: 'var(--art-shade)', strokeOpacity: 0.5, strokeWidth: 3 }} />
          <rect x="37" y="37" width="126" height="126" style={{ stroke: 'var(--art-shine)', strokeOpacity: 0.28, strokeWidth: 1.5 }} />
          <rect x="31" y="31" width="138" height="138" style={{ stroke: 'var(--art-shine)', strokeOpacity: 0.22, strokeWidth: 1.5 }} />
        </g>
      )}
      {s.groove && <g><rect x="0" y="22" width="200" height="5" style={{ fill: 'var(--art-shade)', fillOpacity: 0.28 }} /><rect x="0" y="27" width="200" height="1.5" style={{ fill: 'var(--art-shine)', fillOpacity: 0.55 }} /></g>}
      {s.gloss && (
        <g>
          <path d="M-10 120L120 -10L200 -10L-10 200Z" fill="url(#ag-shine)" style={{ opacity: 1.6 }} />
          <path d="M80 210L210 80L210 130L130 210Z" style={{ fill: 'var(--art-shine)', fillOpacity: 0.1 }} />
        </g>
      )}
      <rect x="0.5" y="0.5" width="199" height="199" fill="none" style={{ stroke: 'var(--art-shade)', strokeOpacity: 0.25 }} />
      <rect x="0" y="150" width="200" height="50" fill="url(#ag-fadedown)" style={{ opacity: 0 }} />
    </svg>
  );
}
