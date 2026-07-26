// barcode128.js — dependency-free Code 128 (subset B) barcode generator.
// Encodes any ASCII 32–126 string into a scannable barcode, rendered as SVG.
// Two exports: <Barcode128 /> React component, and svg128(value) → SVG string
// (for print/label HTML). No external libraries, works offline.
// NOTE: local copy of the Hub's src/barcode128.js — the storefront is a separate
// CRA app, whose build cannot import from outside its own src/ (ModuleScopePlugin).
import React from "react";

// Code 128 module-width patterns (index 0..106). Each is bar/space/bar/… widths.
// 103 = Start B, 106 = Stop (7 modules). Standard, verified table.
const PAT = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];
const START_B = 104, STOP = 106;

// value → array of {w:width, bar:bool} bar/space segments
function encode(value) {
  const s = String(value == null ? "" : value).replace(/[^\x20-\x7E]/g, "?"); // Code-B range
  const codes = [START_B];
  let sum = START_B;
  for (let i = 0; i < s.length; i++) {
    const v = s.charCodeAt(i) - 32;
    codes.push(v);
    sum += v * (i + 1);
  }
  codes.push(sum % 103);   // checksum
  codes.push(STOP);
  const segs = [];
  codes.forEach(code => {
    const p = PAT[code];
    for (let i = 0; i < p.length; i++) segs.push({ w: +p[i], bar: i % 2 === 0 });
  });
  return segs;
}

// total module count (for viewBox width)
function modules(segs) { return segs.reduce((n, s) => n + s.w, 0); }

// Build the <rect> bar list as a string of SVG path/rects at unit module width.
function bars(segs, height) {
  let x = 0, out = "";
  segs.forEach(s => {
    if (s.bar) out += `<rect x="${x}" y="0" width="${s.w}" height="${height}"/>`;
    x += s.w;
  });
  return out;
}

// Plain SVG string — for print label HTML (no React).
export function svg128(value, opts = {}) {
  const height = opts.height || 40;
  const segs = encode(value);
  const w = modules(segs);
  const color = opts.color || "#111";
  const bg = opts.background || "#fff";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${height}" width="${opts.width || w}" height="${height}" preserveAspectRatio="none" shape-rendering="crispEdges">`
    + `<rect x="0" y="0" width="${w}" height="${height}" fill="${bg}"/>`
    + `<g fill="${color}">${bars(segs, height)}</g></svg>`;
}

// React component. Width auto-fits its container; keep quiet-zone via padding on parent.
export function Barcode128({ value, height = 42, color = "#111", background = "#fff", style, width }) {
  const segs = React.useMemo(() => encode(value), [value]);
  const w = modules(segs);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width={width || "100%"} height={height} preserveAspectRatio="none"
      shapeRendering="crispEdges" style={{ display: "block", ...style }} role="img" aria-label={"barcode " + value}>
      <rect x="0" y="0" width={w} height={height} fill={background} />
      <g fill={color} dangerouslySetInnerHTML={{ __html: bars(segs, height) }} />
    </svg>
  );
}

export default Barcode128;
