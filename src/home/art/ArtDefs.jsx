/* Shared SVG definitions for the art library: material gradients, procedural grain filters, flute pattern, light washes.
 * Rendered ONCE per page (zero-size svg); every scene references these by id. No colour literals: every stop reads a --art-* token
 * that the active direction defines (src/design/directions.css). Filters are procedural (feTurbulence), so there is no raster asset.
 */
import React from 'react';

const S = ({ o, c, op }) => <stop offset={o} style={{ stopColor: `var(${c})`, stopOpacity: op == null ? 1 : op }} />;

export default function ArtDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {/* ---- materials (vertical sheen so panels read as lit from above) ---- */}
        <linearGradient id="ag-p" x1="0" y1="0" x2="1" y2="0.15"><S o="0" c="--art-p-1" /><S o=".5" c="--art-p-2" /><S o="1" c="--art-p-3" /></linearGradient>
        <linearGradient id="ag-s" x1="0" y1="0" x2="0.4" y2="1"><S o="0" c="--art-s-1" /><S o=".55" c="--art-s-2" /><S o="1" c="--art-s-3" /></linearGradient>
        <linearGradient id="ag-m" x1="0" y1="0" x2="1" y2="1"><S o="0" c="--art-m-1" /><S o=".35" c="--art-m-2" /><S o=".55" c="--art-m-3" /><S o=".8" c="--art-m-2" /><S o="1" c="--art-m-1" /></linearGradient>
        <linearGradient id="ag-k" x1="0" y1="0" x2="0" y2="1"><S o="0" c="--art-k-1" /><S o="1" c="--art-k-2" /></linearGradient>
        <linearGradient id="ag-g" x1="0" y1="0" x2="1" y2="1"><S o="0" c="--art-g-1" op=".92" /><S o="1" c="--art-g-2" op=".96" /></linearGradient>
        <linearGradient id="ag-st" x1="0" y1="0" x2="1" y2="1"><S o="0" c="--art-st-1" /><S o="1" c="--art-st-2" /></linearGradient>
        <linearGradient id="ag-wall" x1="0" y1="0" x2="0" y2="1"><S o="0" c="--art-wall-1" /><S o="1" c="--art-wall-2" /></linearGradient>
        <linearGradient id="ag-floor" x1="0" y1="0" x2="0" y2="1"><S o="0" c="--art-floor-1" /><S o="1" c="--art-floor-2" /></linearGradient>
        <linearGradient id="ag-shine" x1="0" y1="0" x2="1" y2="0"><S o="0" c="--art-shine" op="0" /><S o=".5" c="--art-shine" op=".16" /><S o="1" c="--art-shine" op="0" /></linearGradient>
        <linearGradient id="ag-fadeup" x1="0" y1="1" x2="0" y2="0"><S o="0" c="--art-glow" op=".55" /><S o="1" c="--art-glow" op="0" /></linearGradient>
        <linearGradient id="ag-fadedown" x1="0" y1="0" x2="0" y2="1"><S o="0" c="--art-glow" op=".5" /><S o="1" c="--art-glow" op="0" /></linearGradient>
        <linearGradient id="ag-reflect" x1="0" y1="0" x2="0" y2="1"><S o="0" c="--art-reflect" op=".34" /><S o="1" c="--art-reflect" op="0" /></linearGradient>
        <radialGradient id="ag-wash" cx=".7" cy=".12" r=".85"><S o="0" c="--art-glow" op=".34" /><S o=".6" c="--art-glow" op=".06" /><S o="1" c="--art-glow" op="0" /></radialGradient>
        <radialGradient id="ag-vig" cx=".5" cy=".46" r=".78"><S o=".55" c="--art-shade" op="0" /><S o="1" c="--art-shade" op=".62" /></radialGradient>
        <radialGradient id="ag-pool" cx=".5" cy=".5" r=".5"><S o="0" c="--art-glow" op=".5" /><S o="1" c="--art-glow" op="0" /></radialGradient>

        {/* ---- finish swatches (the six door styles) ---- */}
        {['oak', 'white', 'graphite', 'sage', 'navy', 'walnut'].map((n) => (
          <linearGradient key={n} id={`ag-sw-${n}`} x1="0" y1="0" x2="1" y2="1"><S o="0" c={`--sw-${n}-1`} /><S o="1" c={`--sw-${n}-2`} /></linearGradient>
        ))}
        {/* ---- patterns ---- */}
        <pattern id="ap-flute" width="16" height="10" patternUnits="userSpaceOnUse">
          <rect width="16" height="10" style={{ fill: 'var(--art-shade)', fillOpacity: 0.16 }} />
          <rect x="0" width="3.4" height="10" style={{ fill: 'var(--art-shade)', fillOpacity: 0.34 }} />
          <rect x="3.4" width="5" height="10" style={{ fill: 'var(--art-shine)', fillOpacity: 0.2 }} />
          <rect x="8.4" width="3" height="10" style={{ fill: 'var(--art-shine)', fillOpacity: 0 }} />
          <rect x="12.8" width="3.2" height="10" style={{ fill: 'var(--art-shade)', fillOpacity: 0.22 }} />
        </pattern>
        <pattern id="ap-slat" width="30" height="10" patternUnits="userSpaceOnUse">
          <rect x="0" width="2" height="10" style={{ fill: 'var(--art-shade)', fillOpacity: 0.5 }} />
          <rect x="2" width="3" height="10" style={{ fill: 'var(--art-shine)', fillOpacity: 0.1 }} />
          <rect x="25" width="5" height="10" style={{ fill: 'var(--art-shade)', fillOpacity: 0.18 }} />
        </pattern>
        <pattern id="ap-weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" style={{ fill: 'none' }} />
          <path d="M0 3h6M3 0v6" style={{ stroke: 'var(--art-shade)', strokeOpacity: 0.22, strokeWidth: 0.7 }} />
        </pattern>
        <pattern id="ap-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v8" style={{ stroke: 'var(--art-line)', strokeOpacity: 0.55, strokeWidth: 0.8 }} />
        </pattern>

        {/* ---- procedural grain (alpha overlays composited onto the source graphic) ---- */}
        <filter id="af-wood" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.2 0.0045" numOctaves="5" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.15 0.62" result="dark" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.66" result="light" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="d2" />
          <feComposite in="light" in2="SourceAlpha" operator="in" result="l2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="d2" /><feMergeNode in="l2" /></feMerge>
        </filter>
        <filter id="af-woodh" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.3" numOctaves="4" seed="23" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 0.82" result="dark" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="d2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="d2" /></feMerge>
        </filter>
        <filter id="af-lac" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.16 0.095" result="dark" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="d2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="d2" /></feMerge>
        </filter>
        <filter id="af-linen" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.7 0.05" numOctaves="2" seed="3" result="a" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.7" numOctaves="2" seed="9" result="b" />
          <feBlend in="a" in2="b" mode="multiply" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 0.3" result="dark" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="d2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="d2" /></feMerge>
        </filter>
        <filter id="af-brush" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.95 0.004" numOctaves="2" seed="2" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 0.5" result="dark" />
          <feComposite in="dark" in2="SourceAlpha" operator="in" result="d2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="d2" /></feMerge>
        </filter>
        <filter id="af-stone" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.0045 0.014" numOctaves="3" seed="17" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 -7 0.62" result="veins" />
          <feComposite in="veins" in2="SourceAlpha" operator="in" result="v2" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="v2" /></feMerge>
        </filter>
        <filter id="af-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="af-blur-lg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22" /></filter>
        <filter id="af-blur-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
    </svg>
  );
}
