/* Procedural "photography" for the home page: front elevations of the five product families, drawn as layered SVG
 * (timber grain, lacquer, brushed metal, smoked glass, stone veining, LED light, soft shadow) and also as architectural line drawings.
 * Every colour is a --art-* token (src/design/directions.css); there are no colour literals in this file.
 * Scenes are decorative (aria-hidden): the surrounding card always carries the real text. They are illustrations of the kind of work,
 * not photographs of delivered projects, and the site copy never presents them as such.
 *
 * Modes: default = rendered scene. line = architectural drawing (class art--line on the <svg>: fills off, hairline strokes, dimension marks on).
 */
import React from 'react';
import './art.css';

const FIL = { p: 'url(#af-wood)', ph: 'url(#af-woodh)', s: 'url(#af-lac)', m: 'url(#af-brush)', st: 'url(#af-stone)', k: 'url(#af-linen)' };

/* tiny deterministic PRNG so scenes are identical on server and client */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------- primitives ---------- */
function Slab({ x, y, w, h, m = 'p', r = 0, hz = false, flute = false, slat = false, sheen = false, edge = true }) {
  const filter = m === 'p' && hz ? FIL.ph : FIL[m];
  return (
    <g>
      <rect className="f" x={x} y={y} width={w} height={h} rx={r} fill={`url(#ag-${m})`} filter={filter} />
      {flute && <rect className="fx" x={x} y={y} width={w} height={h} rx={r} fill="url(#ap-flute)" />}
      {slat && <rect className="fx" x={x} y={y} width={w} height={h} rx={r} fill="url(#ap-slat)" />}
      {sheen && <rect className="fx" x={x} y={y} width={w} height={h} rx={r} fill="url(#ag-shine)" />}
      {edge && <rect className="fx edge" x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={r} fill="none" />}
    </g>
  );
}
const Bar = ({ x, y, w, h }) => <rect className="f" x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2} fill="url(#ag-m)" filter={FIL.m} />;
const Led = ({ x, y, w, h, blur = 'af-blur' }) => (
  <g className="fx">
    <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} className="glow" filter={`url(#${blur})`} opacity=".9" />
    <rect x={x} y={y} width={w} height={h} className="glow" />
  </g>
);
const Dim = ({ x1, y1, x2, y2 }) => {
  const v = x1 === x2;
  const t = 7;
  return (
    <g className="dim">
      <path d={`M${x1} ${y1}L${x2} ${y2}`} />
      <path d={v ? `M${x1 - t} ${y1}h${t * 2}M${x2 - t} ${y2}h${t * 2}` : `M${x1} ${y1 - t}v${t * 2}M${x2} ${y2 - t}v${t * 2}`} />
    </g>
  );
};
const Shadow = ({ x, y, w, h = 16, o = 0.55 }) => <rect className="fx shade" x={x} y={y} width={w} height={h} rx={h / 2} filter="url(#af-blur)" opacity={o} />;

function Garment({ cx, y, len, c, wd = 10 }) {
  const d = `M${cx - wd} ${y + 8} Q${cx} ${y - 5} ${cx + wd} ${y + 8} L${cx + wd + 3} ${y + len} Q${cx} ${y + len + 4} ${cx - wd - 3} ${y + len} Z`;
  return (
    <g>
      <path className="f" d={d} style={{ fill: `var(--art-cloth-${c})` }} />
      <path className="fx" d={d} fill="url(#ag-shine)" />
      <path className="hk" d={`M${cx} ${y - 12}v7M${cx - wd - 1} ${y + 9}L${cx} ${y - 4}L${cx + wd + 1} ${y + 9}`} />
    </g>
  );
}
function Fold({ x, y, w = 74, n = 4, c = 1, seed = 1 }) {
  const r = rng(seed); const out = []; let yy = y;
  for (let i = 0; i < n; i++) { const h = 13 + Math.round(r() * 4); yy -= h; out.push(<rect key={i} className="f" x={x + (r() * 4 - 2)} y={yy} width={w} height={h - 1} rx="2" style={{ fill: `var(--art-cloth-${((c + i) % 4) + 1})` }} />); }
  return <g>{out}</g>;
}
function Books({ x, y, w, h, seed = 4 }) {
  const r = rng(seed); let cx = x; const out = []; let i = 0;
  while (cx < x + w - 10) {
    const bw = 8 + Math.round(r() * 9); const bh = h * (0.62 + r() * 0.36); const k = Math.floor(r() * 5);
    if (cx + bw > x + w) break;
    const tilt = i > 3 && r() > 0.93;
    out.push(<rect key={i} className="f" x={cx} y={y - bh} width={bw} height={bh} style={{ fill: k === 4 ? 'var(--art-m-2)' : `var(--art-cloth-${k + 1})` }} transform={tilt ? `rotate(7 ${cx + bw} ${y})` : undefined} />);
    out.push(<rect key={'s' + i} className="fx" x={cx} y={y - bh} width={bw} height={bh} fill="url(#ag-shine)" />);
    cx += bw + 1; i++;
  }
  return <g>{out}</g>;
}
const Vase = ({ x, y, h = 70, w = 26, stems = true }) => (
  <g>
    <path className="f" d={`M${x - w * 0.34} ${y}L${x - w / 2} ${y - h * 0.55}Q${x - w / 2} ${y - h} ${x - w * 0.18} ${y - h}L${x + w * 0.18} ${y - h}Q${x + w / 2} ${y - h} ${x + w / 2} ${y - h * 0.55}L${x + w * 0.34} ${y}Z`} style={{ fill: 'var(--art-ceramic)' }} />
    {stems && <path className="stem" d={`M${x} ${y - h}C${x - 6} ${y - h - 40} ${x - 18} ${y - h - 70} ${x - 26} ${y - h - 96}M${x} ${y - h}C${x + 8} ${y - h - 36} ${x + 16} ${y - h - 62} ${x + 30} ${y - h - 84}M${x} ${y - h}C${x + 2} ${y - h - 50} ${x - 2} ${y - h - 86} ${x + 4} ${y - h - 122}`} />}
  </g>
);
const Bowl = ({ x, y, w = 70 }) => <path className="f" d={`M${x - w / 2} ${y - 14}h${w}q-4 14 -${w / 2} 14q-${w / 2 - 4} 0 -${w / 2} -14z`} style={{ fill: 'var(--art-ceramic)' }} />;
const Lamp = ({ x, y }) => (
  <g>
    <path className="f" d={`M${x - 24} ${y - 74}L${x + 24} ${y - 74}L${x + 34} ${y - 44}L${x - 34} ${y - 44}Z`} style={{ fill: 'var(--art-ceramic)' }} />
    <path className="hk" d={`M${x} ${y - 44}V${y - 6}M${x - 22} ${y - 4}h44`} />
    <g className="fx"><ellipse cx={x} cy={y - 60} rx="60" ry="44" className="glow" filter="url(#af-blur-lg)" opacity=".7" /></g>
  </g>
);

/* the room: wall, floor, skirting, light wash */
function Room({ floor = 650, wallW = 1200 }) {
  return (
    <g>
      <rect className="room" x="0" y="0" width={wallW} height={floor} fill="url(#ag-wall)" />
      <rect className="fx" x="0" y="0" width={wallW} height={floor} fill="url(#ag-wash)" />
      <rect className="room" x="0" y={floor} width={wallW} height={800 - floor} fill="url(#ag-floor)" />
      <rect className="fx" x="0" y={floor} width={wallW} height={110} fill="url(#ag-reflect)" />
      <path className="floorline" d={`M0 ${floor}H${wallW}`} />
    </g>
  );
}
const Finish = () => (
  <g className="fx" pointerEvents="none">
    <rect x="-20" y="-20" width="1240" height="840" fill="url(#ag-vig)" />
  </g>
);

/* ---------- WARDROBE: 2 open bays (hanging + shelves/drawers), fluted timber door, smoked-glass door ---------- */
function Wardrobe() {
  const X0 = 110, BW = 245, T = 70, B = 638;
  const hang = [];
  const lens = [292, 340, 262, 330, 300, 350, 270, 318, 296, 332];
  for (let i = 0; i < 10; i++) hang.push(<Garment key={i} cx={X0 + 34 + i * 20.6} y={146} len={lens[i]} c={(i * 3) % 4 + 1} wd={9} />);
  const ghost = [];
  for (let i = 0; i < 8; i++) ghost.push(<Garment key={i} cx={X0 + BW * 3 + 40 + i * 24} y={170} len={[280, 330, 250, 320, 290, 340, 270, 310][i]} c={(i * 2) % 4 + 1} wd={10} />);
  const shelves = [160, 244, 328, 412, 496];
  return (
    <g>
      <Room />
      <Shadow x={X0 - 10} y={640} w={BW * 4 + 20} h={18} o=".8" />
      <ellipse className="fx" cx="600" cy="700" rx="560" ry="46" fill="url(#ag-pool)" opacity=".55" />
      {/* carcass interior */}
      <rect className="f" x={X0} y={T} width={BW * 4} height={B - T} fill="url(#ag-k)" filter={FIL.k} />
      {/* BAY 1: hanging */}
      <g>
        <Led x={X0 + 10} y={T + 18} w={3} h={B - T - 80} />
        <Led x={X0 + BW - 14} y={T + 18} w={3} h={B - T - 80} />
        <Slab x={X0 + 5} y={T + 20} w={BW - 10} h={10} hz />
        <Led x={X0 + 6} y={T + 31} w={BW - 12} h={3} />
        <rect className="f" x={X0 + 12} y={134} width={BW - 24} height={4} rx="2" fill="url(#ag-m)" />
        {hang}
        <Slab x={X0 + 5} y={560} w={BW - 10} h={8} hz />
        {[0, 1, 2].map((i) => <g key={i}><path className="f shoe" d={`M${X0 + 24 + i * 70} ${560}q4 -16 22 -16q22 0 36 16z`} style={{ fill: `var(--art-cloth-${(i % 4) + 1})` }} /></g>)}
        <Slab x={X0 + 5} y={574} w={BW - 10} h={60} m="s" />
        <Bar x={X0 + 70} y={596} w={100} h={4} />
      </g>
      {/* BAY 2: shelves, folded stacks, drawers */}
      <g>
        {shelves.map((y, i) => (
          <g key={y}>
            <Slab x={X0 + BW + 5} y={y} w={BW - 10} h={8} hz />
            <Led x={X0 + BW + 8} y={y + 9} w={BW - 16} h={2} />
            {i % 2 === 0 ? <Fold x={X0 + BW + 16} y={y} n={4 - (i % 3)} c={i + 1} seed={i + 3} /> : <Fold x={X0 + BW + 16} y={y} n={3} c={i + 2} seed={i + 9} />}
            {i % 2 === 0 ? <Fold x={X0 + BW + 112} y={y} n={3} c={i + 3} seed={i + 21} /> : <g><Bowl x={X0 + BW + 150} y={y} w={64} /><rect className="f" x={X0 + BW + 30} y={y - 44} width="58" height="44" rx="3" style={{ fill: 'var(--art-cloth-2)' }} /></g>}
          </g>
        ))}
        <Slab x={X0 + BW + 5} y={520} w={BW - 10} h={56} m="s" />
        <Slab x={X0 + BW + 5} y={578} w={BW - 10} h={56} m="s" />
        <Bar x={X0 + BW + 72} y={546} w={100} h={4} />
        <Bar x={X0 + BW + 72} y={604} w={100} h={4} />
      </g>
      {/* BAY 3: fluted timber door + brass pull */}
      <g>
        <Slab x={X0 + BW * 2 + 3} y={T + 14} w={BW - 6} h={B - T - 16} flute sheen />
        <Bar x={X0 + BW * 3 - 34} y={290} w={6} h={190} />
        <rect className="fx hl" x={X0 + BW * 3 - 34} y={290} width="2" height="190" />
      </g>
      {/* BAY 4: smoked glass in a metal frame */}
      <g>
        <g opacity=".55">{ghost}</g>
        <rect className="f" x={X0 + BW * 3 + 3} y={T + 14} width={BW - 6} height={B - T - 16} fill="url(#ag-g)" />
        <path className="fx" d={`M${X0 + BW * 3 + 40} ${T + 14}L${X0 + BW * 3 + 128} ${T + 14}L${X0 + BW * 3 + 40 + 120} ${B - 2}L${X0 + BW * 3 + 40 + 32} ${B - 2}Z`} fill="url(#ag-shine)" />
        <rect className="f" x={X0 + BW * 3 + 3} y={T + 14} width={BW - 6} height={B - T - 16} fill="none" strokeWidth="7" style={{ stroke: 'url(#ag-m)' }} />
        <Bar x={X0 + BW * 3 + 28} y={290} w={5} h={190} />
      </g>
      {/* uprights + top + plinth */}
      {[0, 1, 2, 3, 4].map((i) => <Slab key={i} x={X0 + i * BW - 5} y={T} w={10} h={B - T} edge={false} />)}
      <Slab x={X0 - 5} y={T - 4} w={BW * 4 + 10} h={22} hz />
      <Led x={X0} y={T + 22} w={BW * 4} h={2} blur="af-blur-sm" />
      <rect className="f" x={X0} y={B} width={BW * 4} height={12} fill="url(#ag-k)" />
      <Led x={X0 + 4} y={B + 6} w={BW * 4 - 8} h={2} />
      <Dim x1={X0} y1={T - 26} x2={X0 + BW * 4} y2={T - 26} />
      <Dim x1={X0 - 34} y1={T} x2={X0 - 34} y2={B + 12} />
      <Finish />
    </g>
  );
}

/* ---------- KITCHEN: tall column, two-tone run, stone worktop + backsplash, hood, open niche ---------- */
function Kitchen() {
  const base = 448, top = 70, B = 638;
  return (
    <g>
      <Room />
      <Shadow x={70} y={640} w={1060} h={18} o=".8" />
      <ellipse className="fx" cx="690" cy="700" rx="520" ry="44" fill="url(#ag-pool)" opacity=".5" />
      {/* backsplash stone */}
      <Slab x={262} y={250} w={862} h={186} m="st" edge={false} />
      <rect className="fx" x={262} y={250} width={862} height={186} fill="url(#ag-fadedown)" />
      {/* tall column: two flat lacquer doors, integral pulls */}
      <Slab x={80} y={top} w={172} h={330} m="s" sheen />
      <Slab x={80} y={404} w={172} h={B - 404} m="s" sheen />
      <Bar x={232} y={170} w={5} h={170} /><Bar x={232} y={440} w={5} h={120} />
      {/* uppers (timber) */}
      <Slab x={262} y={top} w={150} h={240} flute sheen /><Slab x={416} y={top} w={150} h={240} flute sheen />
      <Led x={264} y={312} w={300} h={3} />
      {/* hood */}
      <path className="f" d="M584 232L712 232L676 196L620 196Z" fill="url(#ag-m)" filter={FIL.m} />
      <Slab x={626} y={top} w={44} h={128} m="m" edge={false} />
      <Led x={600} y={236} w={96} h={3} />
      {/* open niche with ceramics */}
      <rect className="f" x={730} y={top} width={190} height={240} fill="url(#ag-k)" filter={FIL.k} />
      <Slab x={730} y={156} w={190} h={7} hz /><Slab x={730} y={236} w={190} h={7} hz />
      <Led x={732} y={164} w={186} h={2} /><Led x={732} y={244} w={186} h={2} />
      <Bowl x={776} y={156} w={52} /><Vase x={850} y={156} h={52} w={22} stems={false} /><Bowl x={884} y={156} w={30} />
      <Vase x={768} y={236} h={58} w={24} stems={false} /><Vase x={806} y={236} h={40} w={22} stems={false} /><Bowl x={866} y={236} w={64} />
      <Slab x={924} y={top} w={200} h={240} flute sheen />
      <Bar x={934} y={250} w={5} h={50} />
      {/* base run: handleless drawers (groove + highlight) */}
      {[[262, 300], [570, 150], [724, 200]].map(([x, w], k) => (
        <g key={k}>{[0, 1, 2].map((i) => (
          <g key={i}>
            <Slab x={x} y={base + i * 64} w={w - 4} h={61} m="s" sheen />
            <rect className="fx groove" x={x} y={base + i * 64} width={w - 4} height={5} />
          </g>
        ))}</g>
      ))}
      <Slab x={932} y={base} w={192} h={190} flute sheen />
      <Bar x={942} y={base + 14} w={5} h={64} />
      {/* worktop */}
      <Slab x={250} y={428} w={886} h={20} m="st" edge={false} />
      <rect className="fx hl" x={250} y={447} width={886} height={2} />
      {/* hob + life on the worktop */}
      <rect className="f" x={592} y={423} width={110} height={6} rx="2" style={{ fill: 'var(--art-k-2)' }} />
      <path className="f" d="M306 428l12-66h56l12 66z" fill="url(#ag-s)" />
      <rect className="f" x={444} y={344} width="6" height="84" style={{ fill: 'var(--art-ceramic)' }} />
      <Vase x={812} y={428} h={74} w={30} />
      <Bowl x={960} y={428} w={92} />
      <circle className="f" cx={936} cy={410} r="9" style={{ fill: 'var(--art-cloth-3)' }} /><circle className="f" cx={958} cy={412} r="8" style={{ fill: 'var(--art-cloth-1)' }} /><circle className="f" cx={980} cy={410} r="9" style={{ fill: 'var(--art-cloth-3)' }} />
      <rect className="f" x={1030} y={372} width="12" height="56" rx="5" fill="url(#ag-g)" />
      <rect className="f" x={338} y={300} width="76" height="128" rx="4" fill="url(#ag-p)" filter={FIL.p} transform="rotate(5 338 428)" />
      {/* plinth */}
      <rect className="f" x={262} y={B} width={862} height={12} fill="url(#ag-k)" />
      <Led x={266} y={B + 6} w={854} h={2} />
      <Dim x1={262} y1={top - 26} x2={1124} y2={top - 26} />
      <Dim x1={58} y1={top} x2={58} y2={B + 12} />
      <Finish />
    </g>
  );
}

/* ---------- OFFICE: bookcase, desk niche with pinboard, drawer pedestal, closed storage ---------- */
function Office() {
  const T = 70, B = 638;
  const sh = [150, 240, 330, 420, 510];
  return (
    <g>
      <Room />
      <Shadow x={90} y={640} w={1030} h={18} o=".8" />
      <rect className="f" x={100} y={T} width={1000} height={B - T} fill="url(#ag-k)" filter={FIL.k} />
      {/* left bookcase */}
      {sh.map((y, i) => (
        <g key={y}>
          <Slab x={105} y={y} w={310} h={9} hz />
          <Led x={108} y={y + 10} w={304} h={2} />
          <Books x={116} y={y} w={i % 2 ? 150 : 210} h={64} seed={i * 7 + 3} />
          {i % 2 ? <Vase x={330} y={y} h={52} w={22} stems={false} /> : <Bowl x={370} y={y} w={44} />}
          {i % 2 ? <Books x={350} y={y} w={56} h={58} seed={i + 40} /> : null}
        </g>
      ))}
      <Slab x={105} y={560} w={310} h={72} m="s" /><Bar x={225} y={588} w={90} h={4} />
      <Slab x={414} y={T} w={10} h={B - T} edge={false} />
      {/* desk niche */}
      <rect className="f" x={424} y={110} width={380} height={310} fill="url(#ag-k)" filter={FIL.k} />
      <rect className="fx" x={424} y={110} width={380} height={310} fill="url(#ap-weave)" />
      <rect className="f" x={470} y={150} width={104} height={136} fill="url(#ag-s)" /><rect className="f" x={470} y={150} width={104} height={136} fill="none" strokeWidth="6" style={{ stroke: 'url(#ag-m)' }} />
      <rect className="f" x={610} y={170} width={64} height={84} fill="url(#ag-p)" filter={FIL.p} /><rect className="fx" x={618} y={178} width={48} height={68} fill="url(#ag-shine)" />
      <Slab x={424} y={236} w={380} h={9} hz /><Led x={428} y={246} w={372} h={2} />
      <Books x={700} y={236} w={90} h={52} seed={77} />
      <Slab x={414} y={420} w={400} h={20} hz />
      <rect className="fx" x={414} y={440} width={400} height={50} fill="url(#ag-fadedown)" />
      {/* laptop + lamp */}
      <path className="f" d="M520 420l8 -68h112l8 68z" style={{ fill: 'var(--art-k-2)' }} /><rect className="f" x={512} y={418} width="152" height="4" rx="2" fill="url(#ag-m)" />
      <rect className="fx" x={532} y={360} width="96" height="50" fill="url(#ag-shine)" />
      <Lamp x={744} y={420} />
      {/* pedestal drawers */}
      <Slab x={706} y={440} w={108} h={198} edge={false} />
      {[0, 1, 2].map((i) => <g key={i}><Slab x={710} y={444 + i * 63} w={100} h={60} m="s" sheen /><Bar x={742} y={468 + i * 63} w={36} h={4} /></g>)}
      <Slab x={424} y={440} w={14} h={198} edge={false} />
      {/* chair */}
      <g>
        <path className="f" d="M540 330Q540 300 590 300Q640 300 640 330L636 392L544 392Z" style={{ fill: 'var(--art-cloth-1)' }} />
        <rect className="f" x={526} y={398} width="128" height="26" rx="10" style={{ fill: 'var(--art-cloth-1)' }} />
        <path className="f" d="M586 424V600M550 624L590 600L632 624" strokeWidth="6" style={{ stroke: 'url(#ag-m)', fill: 'none' }} />
        <rect className="fx" x={548} y={306} width="84" height="84" fill="url(#ag-shine)" />
      </g>
      <Slab x={804} y={T} w={10} h={B - T} edge={false} />
      {/* right storage */}
      <Slab x={814} y={T} w={286} h={320} flute sheen />
      <Bar x={826} y={170} w={5} h={110} />
      <Slab x={814} y={394} w={140} h={244} m="s" sheen /><Slab x={958} y={394} w={142} h={244} m="s" sheen />
      <Bar x={930} y={440} w={5} h={110} /><Bar x={966} y={440} w={5} h={110} />
      <rect className="f" x={814} y={388} width={286} height={8} fill="url(#ag-m)" />
      <Slab x={100} y={T - 4} w={1000} h={22} hz />
      <rect className="f" x={100} y={B} width={1000} height={12} fill="url(#ag-k)" />
      <Dim x1={100} y1={T - 26} x2={1100} y2={T - 26} />
      <Finish />
    </g>
  );
}

/* ---------- DOOR: floor-to-ceiling flush leaf, light line, slatted wall, console with lamp ---------- */
function Door() {
  const B = 650;
  return (
    <g>
      <Room />
      <Shadow x={110} y={642} w={980} h={18} o=".7" />
      {/* slatted wall left */}
      <Slab x={100} y={60} w={340} h={590} flute edge={false} />
      <Slab x={100} y={60} w={340} h={590} slat edge={false} />
      {/* frame + door */}
      <rect className="f" x={452} y={46} width={296} height={B - 46} fill="url(#ag-k)" />
      <rect className="fx glow" x={457} y={52} width={3} height={B - 58} filter="url(#af-blur-sm)" opacity=".9" />
      <Led x={456} y={54} w={3} h={B - 58} blur="af-blur" />
      <Slab x={464} y={52} w={272} h={B - 52} sheen />
      <rect className="fx groove" x={464} y={52} width={272} height={5} />
      <path className="inlay" d="M520 120V560M680 120V560" />
      <Bar x={700} y={310} w={9} h={210} />
      <rect className="fx hl" x={700} y={310} width="3" height="210" />
      {/* right wall: console, lamp, art */}
      <rect className="f" x={768} y={60} width={332} height={B - 60} fill="url(#ag-s)" />
      <rect className="fx" x={768} y={60} width={332} height={B - 60} fill="url(#ag-shine)" />
      <rect className="f" x={846} y={150} width={160} height={210} fill="url(#ag-p)" filter={FIL.p} />
      <rect className="f" x={846} y={150} width={160} height={210} fill="none" strokeWidth="6" style={{ stroke: 'url(#ag-m)' }} />
      <rect className="f" x={870} y={176} width={112} height={158} fill="url(#ag-k)" />
      <path className="stem" d="M876 326C900 260 920 250 940 210C950 250 960 290 976 326" />
      <Slab x={800} y={470} w={270} h={20} hz /><Slab x={812} y={490} w={246} h={50} m="s" /><Bar x={900} y={512} w={70} h={4} />
      <path className="f" d="M820 540V640M1048 540V640" strokeWidth="6" style={{ stroke: 'url(#ag-m)', fill: 'none' }} />
      <Vase x={1020} y={470} h={60} w={26} />
      <Bowl x={850} y={470} w={64} />
      <Dim x1={452} y1={22} x2={748} y2={22} />
      <Dim x1={420} y1={46} x2={420} y2={B} />
      <Finish />
    </g>
  );
}

/* ---------- TV WALL: fluted wall, floating unit, niche, storage columns, sofa in front ---------- */
function Tv() {
  const B = 650;
  return (
    <g>
      <Room />
      <Slab x={100} y={60} w={1000} h={B - 60} flute edge={false} />
      <rect className="fx" x={100} y={60} width={1000} height={B - 60} fill="url(#ag-wash)" />
      {/* niche left */}
      <rect className="f" x={124} y={100} width={196} height={400} fill="url(#ag-k)" filter={FIL.k} />
      {[220, 340, 460].map((y, i) => (<g key={y}><Slab x={124} y={y} w={196} h={8} hz /><Led x={126} y={y + 9} w={192} h={2} />{i === 0 ? <Vase x={190} y={y} h={80} w={30} /> : i === 1 ? <Books x={140} y={y} w={120} h={60} seed={91} /> : <Bowl x={240} y={y} w={70} />}</g>))}
      <Led x={126} y={102} w={192} h={2} />
      {/* TV */}
      <Led x={372} y={118} w={456} h={4} blur="af-blur-lg" />
      <rect className="f" x={372} y={124} width={456} height={262} rx="3" fill="url(#ag-g)" />
      <rect className="f" x={372} y={124} width={456} height={262} rx="3" fill="none" strokeWidth="3" style={{ stroke: 'var(--art-k-2)' }} />
      <path className="fx" d="M372 124H560L440 386H372Z" fill="url(#ag-shine)" />
      {/* floating unit */}
      <Shadow x={350} y={452} w={500} h={22} o=".8" />
      <Slab x={346} y={410} w={508} h={44} m="p" hz sheen />
      <rect className="fx groove" x={346} y={410} width={508} height={4} />
      {[0, 1, 2].map((i) => <g key={i}><Slab x={352 + i * 166} y={416} w={160} h={36} m="s" sheen /><Bar x={400 + i * 166} y={432} w={60} h={3} /></g>)}
      <Led x={350} y={456} w={500} h={2} />
      {/* storage right */}
      <Slab x={900} y={60} w={200} h={B - 60} m="s" sheen />
      <rect className="fx groove" x={998} y={60} width="4" height={B - 60} />
      <Bar x={982} y={300} w={5} h={110} /><Bar x={1012} y={300} w={5} h={110} />
      {/* sofa (in front, grounds the scene) */}
      <g>
        <rect className="f" x={280} y={520} width={640} height={110} rx="14" style={{ fill: 'var(--art-cloth-1)' }} />
        <rect className="f" x={260} y={560} width={60} height={90} rx="12" style={{ fill: 'var(--art-cloth-1)' }} /><rect className="f" x={880} y={560} width={60} height={90} rx="12" style={{ fill: 'var(--art-cloth-1)' }} />
        <rect className="f" x={320} y={566} width={560} height={64} rx="10" style={{ fill: 'var(--art-cloth-2)' }} />
        <path className="hk" d="M600 568V630" />
        <rect className="fx" x={280} y={520} width={640} height={110} fill="url(#ag-shine)" />
        <rect className="fx shade" x={270} y={640} width={660} height={14} rx="7" filter="url(#af-blur)" opacity=".7" />
      </g>
      <Dim x1={100} y1={32} x2={1100} y2={32} />
      <Finish />
    </g>
  );
}

const SCENES = { wardrobe: Wardrobe, kitchen: Kitchen, office: Office, door: Door, tv: Tv };

const FOCUS = { l: 'xMinYMid', c: 'xMidYMid', r: 'xMaxYMid' };
export function Scene({ kind = 'wardrobe', line = false, fill = false, focus = 'c', crop, dims = false, className = '' }) {
  const C = SCENES[kind] || Wardrobe;
  return (
    <svg className={`art art--${kind}${line ? ' art--line' : ''}${dims ? ' art--dims' : ''}${fill ? ' art--fill' : ''} ${className}`.trim()} viewBox={crop || '0 0 1200 800'} preserveAspectRatio={`${FOCUS[focus] || FOCUS.c} slice`} aria-hidden="true" focusable="false">
      <C />
    </svg>
  );
}
export const SCENE_KINDS = Object.keys(SCENES);
