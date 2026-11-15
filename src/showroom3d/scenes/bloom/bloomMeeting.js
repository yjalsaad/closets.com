/* FLOOR 2: "Bloom Meeting". Built lazily (its own webpack chunk, fetched after the first interactive moment) and added to the engine scene, far from the hall (layout.js);
 * it is only visible while the visitor is up there (engine.setFloor). Procedural, no photographs, no new texture files: veneers / stone / leather / lacquer use the product
 * materials the VIP room already uses, tinted with the real colours of the YAS Wood Collection (bloom/palette.js). Canvas panels use the same pipeline (makePanel, anisotropy 8,
 * hi-res on the high tier) and the same drawing kit as the VIP panels, so the text is as sharp as in the VIP room.
 *
 * Zones: the Boardroom (long table, leadership chairs, the cinematic video wall), Staff Operations (ops wall, six pods), the Leads wall, the Haneen AI desk and a lounge corner.
 * Wow: a night skyline (Bahrain World Trade Center, Financial Harbour silhouettes, procedural), reflective graphite floor (mirrored emissives), animated light ribbons in the
 * Bloom colours, light beams with drifting dust, perimeter coves with a slow breathing glow. Draw calls are kept low: statics are merged per material (about 45 draws in view). */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import * as fu from '../products/furnish';
import * as pr from '../products/props';
import { makePanel } from '../products/screens';
import { drawFilmIdle, drawFilmOverlay } from '../vip/panels';
import { F2, TABLE, SCREEN, OPS_WALL, LEADS_WALL, HANEEN_DESK, LOUNGE, PODS, CAB_L2, BLOOM_Z0, LIFT_G, bloomBoxes } from './layout';
import { FINISHES, BLOOM_LIGHT, NIGHT } from '../../bloom/palette';
import { DESIGN, drawOpsWall, drawLeadsWall, drawBloomSign, drawHaneenCard } from './panelsBloom';
import { buildSkyline } from './skyline';

const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const tint = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

export function buildBloomFloor({ M, tier, lang = 'en', logoTex = null, glowTex = null, reduced = false }) {
  const group = new THREE.Group(); group.name = 'bloom-floor2'; group.position.set(0, 0, BLOOM_Z0);
  const env = M.stone.envMap, H = F2.height, W = F2.x1 - F2.x0, D = F2.z1 - F2.z0, hi = tier.id === 'high', low = tier.id === 'low';
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, ...o }), phys = (o) => new THREE.MeshPhysicalMaterial({ envMap: env, ...o });
  const veneer = (hex, k = 1.9) => phys({ map: M.tex.walnut.map, roughnessMap: M.tex.walnut.rough, normalMap: M.tex.walnut.normal, roughness: 1, color: tint(hex, k), envMapIntensity: 0.22, clearcoat: low ? 0 : 0.35, clearcoatRoughness: 0.3 });
  const wood = veneer(FINISHES.kaiserWalnut.color), woodFlute = wood.clone(); woodFlute.vertexColors = true;
  const lacquer = (hex, r = 0.28) => phys({ color: hex, roughness: r, metalness: 0, envMapIntensity: 0.3, clearcoat: low ? 0 : 0.6, clearcoatRoughness: 0.2 });
  const graphite = lacquer(tint(FINISHES.graphiteGrey.color, 1.5)), charcoal = lacquer(tint(FINISHES.charcoal.color, 1.9), 0.5), blackM = std({ color: FINISHES.black.color, roughness: 0.4, envMapIntensity: 0.2 });
  const marble = M.stone.clone(); marble.map = M.tex.marble.dark.map; marble.roughnessMap = M.tex.marble.dark.rough; marble.color.setHex(FINISHES.volukus.color); marble.envMapIntensity = 0.35; marble.needsUpdate = true;
  const leather = std({ color: FINISHES.tobacco.color, roughness: 0.45, envMapIntensity: 0.35 }), fabric = std({ map: M.white, normalMap: M.tex.weave && M.tex.weave.normal, color: FINISHES.cream.color, roughness: 0.95, envMapIntensity: 0.15 });
  const brass = M.brass, bronze = M.bronze, glass = M.glassClear.clone(); glass.opacity = 0.09; glass.envMapIntensity = 0.1;
  const emi = (hex, k) => new THREE.MeshBasicMaterial({ color: tint(hex, k), toneMapped: false });
  const ledWarm = emi(BLOOM_LIGHT.warm, 1.1), ledOrange = emi(BLOOM_LIGHT.orange, 1.0);
  const statics = new Map(); const add = (geo, mat) => { if (!statics.has(mat)) statics.set(mat, []); statics.get(mat).push(prep(geo)); };
  const mesh = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); m.castShadow = false; m.receiveShadow = !!o.receive; if (o.name) m.name = o.name; (o.parent || group).add(m); return m; };
  const bx = (w, h, d, x, y, z, mat, o = {}) => add(placed(bevelBox(w, h, d, { b: o.b || 0.004, grain: o.grain || 'x', tile: o.tile }), { x, y, z, ry: o.ry || 0 }), mat);
  const mirrored = [];   // meshes that get an upside-down twin under the floor (the reflection)

  // ---- floor (graphite lacquer, glossy, slightly see-through so the mirrored emissives below read as a reflection) and ceiling ----
  const floorMat = phys({ color: tint(FINISHES.graphiteGrey.color, 1.7), roughness: 0.2, metalness: 0.1, envMapIntensity: 0.25, transparent: true, opacity: 0.84, clearcoat: low ? 0 : 0.8, clearcoatRoughness: 0.12 }); floorMat.depthWrite = true;
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); mesh(g, floorMat, { pos: [0, 0.002, 0], receive: true, name: 'f2-floor' }); }
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(Math.PI / 2); mesh(g, charcoal, { pos: [0, H, 0], name: 'f2-ceiling' }); }
  // brass inlay lines in the floor: a border and the axis of the lobby
  for (const [w, d, x, z] of [[W - 1, 0.025, 0, -D / 2 + 0.5], [W - 1, 0.025, 0, D / 2 - 0.5], [0.025, D - 1, F2.x0 + 0.5, 0], [0.025, D - 1, F2.x1 - 0.5, 0]]) add(placed(new THREE.BoxGeometry(w, 0.004, d), { x, y: 0.006, z }), brass);
  // ---- walls: graphite west (ops), fluted veneer east (video wall) and lobby west, charcoal south ----
  add(placed(bevelBox(0.1, H, D, { b: 0.004 }), { x: F2.x0 + 0.05, y: H / 2, z: 0 }), graphite);
  add(placed(bevelBox(W, H, 0.1, { b: 0.004 }), { x: 0, y: H / 2, z: F2.z1 - 0.05 }), charcoal);
  { const f = new THREE.Mesh(flutedPanel(14, H, 0.06, { pitch: 0.06, relief: 0.016, off: [0.3, 0.1] }), woodFlute); f.position.set(F2.x1 - 0.04, H / 2, -5); f.rotation.y = -Math.PI / 2; f.receiveShadow = false; f.name = 'f2-wall-east'; group.add(f); }
  { const f = new THREE.Mesh(flutedPanel(4.2, H, 0.06, { pitch: 0.06, relief: 0.016, off: [0.1, 0.1] }), woodFlute); f.position.set(F2.x0 + 0.04, H / 2, 9.9); f.rotation.y = Math.PI / 2; f.name = 'f2-wall-lift'; group.add(f); }
  add(placed(bevelBox(W, 0.18, 0.18, { b: 0.01 }), { x: 0, y: H - 0.09, z: F2.z0 + 0.09 }), blackM);    // header over the window wall
  // ---- window walls: north (full) and east (lobby part), bronze mullions, very clear glass ----
  mesh(new THREE.PlaneGeometry(W, H - 0.3), glass, { pos: [0, (H - 0.3) / 2 + 0.05, F2.z0], name: 'f2-window-n' });
  mesh(new THREE.PlaneGeometry(10, H - 0.3), glass, { pos: [F2.x1, (H - 0.3) / 2 + 0.05, 7], rot: [0, -Math.PI / 2, 0], name: 'f2-window-e' });
  for (let x = F2.x0; x <= F2.x1 + 0.01; x += 3) add(placed(bevelBox(0.07, H, 0.1, { b: 0.004 }), { x, y: H / 2, z: F2.z0 }), bronze);
  for (const z of [2, 4.5, 7, 9.5, 12]) add(placed(bevelBox(0.1, H, 0.07, { b: 0.004 }), { x: F2.x1, y: H / 2, z }), bronze);
  add(placed(bevelBox(W, 0.07, 0.1, { b: 0.004 }), { x: 0, y: 0.04, z: F2.z0 }), bronze); add(placed(bevelBox(0.1, 0.07, 10, { b: 0.004 }), { x: F2.x1, y: 0.04, z: 7 }), bronze);
  // ---- boardroom glass partitions (west with a doorway at z -3.6..-1.8, south with a door at x 1.0..2.8) ----
  { const pane = (w, x, z, ry) => mesh(new THREE.PlaneGeometry(w, H - 0.4), glass, { pos: [x, (H - 0.4) / 2 + 0.05, z], rot: [0, ry, 0] });
    pane(8.4, -2, -7.8, Math.PI / 2); pane(3.8, -2, 0.1, Math.PI / 2); pane(3.0, -0.5, 2, 0); pane(15.2, 10.4, 2, 0);
    for (const z of [-12, -3.6, -1.8, 2]) add(placed(bevelBox(0.06, H, 0.06, { b: 0.003 }), { x: -2, y: H / 2, z }), bronze);
    for (const x of [-2, 1.0, 2.8, 9, 18]) add(placed(bevelBox(0.06, H, 0.06, { b: 0.003 }), { x, y: H / 2, z: 2 }), bronze);
    add(placed(bevelBox(0.06, 0.06, 14, { b: 0.003 }), { x: -2, y: H - 0.03, z: -5 }), bronze); add(placed(bevelBox(20, 0.06, 0.06, { b: 0.003 }), { x: 8, y: H - 0.03, z: 2 }), bronze);
    add(placed(bevelBox(1.8, 0.05, 0.08, { b: 0.003 }), { x: 1.9, y: 2.45, z: 2 }), brass); add(placed(bevelBox(0.08, 0.05, 1.8, { b: 0.003 }), { x: -2, y: 2.45, z: -2.7 }), brass); }
  // ---- the long boardroom table: veneer top, stone inlay, brass edge, slab legs, LED line ----
  const T = TABLE;
  add(placed(bevelBox(T.w, 0.07, T.d, { b: 0.008, grain: 'x', tile: 1.3 }), { x: T.x, y: T.h - 0.035, z: T.z }), wood);
  add(placed(bevelBox(T.w - 1.0, 0.012, 0.36, { b: 0.002, tile: 1.6 }), { x: T.x, y: T.h + 0.004, z: T.z }), marble);
  for (const s of [-1, 1]) add(placed(bevelBox(0.1, T.h - 0.07, T.d - 0.5, { b: 0.006, grain: 'y' }), { x: T.x + s * (T.w / 2 - 1.1), y: (T.h - 0.07) / 2, z: T.z }), wood);
  add(placed(bevelBox(T.w + 0.02, 0.012, T.d + 0.02, { b: 0.003 }), { x: T.x, y: T.h - 0.08, z: T.z }), brass);
  mirrored.push(mesh(new THREE.BoxGeometry(T.w - 1.6, 0.006, 0.02), ledOrange, { pos: [T.x, T.h - 0.095, T.z + T.d / 2 - 0.05], name: 'f2-table-led' }));
  // ---- leadership chairs: 6 a side + the head at the west end (high back, tobacco leather, brass pedestal) ----
  { const soft = [], hard = []; const chair = (x, z, ry, big = 1) => {
      const parts = [placed(bevelBox(0.56 * big, 0.09, 0.54 * big, { b: 0.03 }), { x: 0, y: 0.47 }), placed(bevelBox(0.08, 0.66 * big, 0.52 * big, { b: 0.035 }), { x: -0.27, y: 0.84, rz: -0.1 }), placed(bevelBox(0.1, 0.16, 0.3, { b: 0.04 }), { x: -0.32, y: 1.28 * big, rz: -0.1 }),
        placed(bevelBox(0.3, 0.03, 0.04, { b: 0.01 }), { x: -0.02, y: 0.66, z: 0.28 * big }), placed(bevelBox(0.3, 0.03, 0.04, { b: 0.01 }), { x: -0.02, y: 0.66, z: -0.28 * big })];
      const base = [placed(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), { y: 0.22 }), placed(new THREE.CylinderGeometry(0.3, 0.32, 0.025, 28), { y: 0.015 })];
      soft.push(...fu.xf(parts.map(prep), { x, z, ry })); hard.push(...fu.xf(base.map(prep), { x, z, ry })); };
    for (let i = 0; i < 6; i++) { const x = T.x - 2.5 + i * 1.0; chair(x, T.z - 1.18, Math.PI / 2); chair(x, T.z + 1.18, -Math.PI / 2); }   // seats face the table (ry 0 = faces +x)
    chair(T.x - T.w / 2 - 0.55, T.z, 0, 1.12);
    soft.forEach((g) => add(g, leather)); hard.forEach((g) => add(g, brass)); }
  // ---- table dressing: water carafes, brass notepad plates (tiny) ----
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(placed(bevelBox(0.18, 0.006, 0.12, { b: 0.002 }), { x: T.x - 2.5 + i * 1.0, y: T.h + 0.003, z: T.z + s * 0.5 }), brass);
  // ---- the video wall: a veneer-and-brass surround, a black bezel, the screen itself (canvas poster / VideoTexture), glow, LED frame ----
  const S = SCREEN, hiRes = hi || (typeof window !== 'undefined' && (window.devicePixelRatio || 1) >= 2 && !low);
  const filmW = hiRes ? 2560 : 1920, filmH = hiRes ? 1440 : 1080, aniso = 8;   // the same resolution as the VIP wall (2560 x 1440 on the high tier, 1920 x 1080 otherwise)
  add(placed(bevelBox(0.06, S.h + 0.5, S.w + 0.5, { b: 0.01 }), { x: S.x - 0.035, y: S.y, z: S.z }), blackM);
  add(placed(bevelBox(0.03, S.h + 1.0, S.w + 1.0, { b: 0.006, tile: 2 }), { x: S.x - 0.012, y: S.y, z: S.z }), marble);
  for (const [bw, bh, bz, by] of [[0.016, S.w + 0.34, 0, S.h / 2 + 0.17], [0.016, S.w + 0.34, 0, -S.h / 2 - 0.17]]) add(placed(bevelBox(bw, 0.016, bh, { b: 0.002 }), { x: S.x - 0.095, y: S.y + by, z: S.z + bz }), brass);
  { const ls = []; for (const [bw, bh, bz, by] of [[0.012, 0.02, 0, S.h / 2 + 0.3], [0.012, 0.02, 0, -S.h / 2 - 0.3]]) ls.push(prep(placed(new THREE.BoxGeometry(bw, bh, S.w + 0.6), { x: S.x - 0.1, y: S.y + by, z: S.z + bz })));
    for (const sz of [-1, 1]) ls.push(prep(placed(new THREE.BoxGeometry(0.012, S.h + 0.6, 0.02), { x: S.x - 0.1, y: S.y, z: S.z + sz * (S.w / 2 + 0.3) }))); mirrored.push(mesh(mergeGeometries(ls), ledOrange, { name: 'f2-screen-led' })); }
  const state = { lang, t: 0, film: null, videoTex: null, active: false, reduced, panelsBuilt: false, last: 0, enter: 0 };
  let film = null, filmStrip = null, filmMat = null, filmMesh = null, filmStripMesh = null, ops = null, leads = null, sign = null, holo = null, holoMesh = null;
  const lazy = {};   // panels are created on first activation (memory + startup time for visitors who never go up)

  // ---- staff operations: six pods (stone-topped desks, low monitors, task chairs) ----
  { const soft = [], hard = [], tops = [], mons = [];
    for (const p of PODS) {
      add(placed(bevelBox(p.w, 0.04, p.d, { b: 0.006 }), { x: p.x, y: 0.74, z: p.z }), marble); add(placed(bevelBox(p.w - 0.1, 0.5, p.d - 0.12, { b: 0.006 }), { x: p.x, y: 0.46, z: p.z }), charcoal);
      for (const s of [-1, 1]) { for (const dx of [-0.7, 0.7]) mons.push(prep(placed(new THREE.BoxGeometry(0.5, 0.3, 0.02), { x: p.x + dx, y: 0.97, z: p.z + s * 0.4 }))); for (const dx of [-0.7, 0.7]) add(placed(bevelBox(0.5, 0.31, 0.03, { b: 0.005 }), { x: p.x + dx, y: 0.97, z: p.z + s * 0.41 }), blackM);
        for (const dx of [-0.8, 0.8]) { const c = fu.chair({ x: p.x + dx, z: p.z + s * 1.0, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 }); soft.push(...c.soft); hard.push(...c.hard); } } }
    soft.forEach((g) => add(g, fabric)); hard.forEach((g) => add(g, brass));
    // the monitors glow softly (one merged emissive plane set, warm-cool)
    mesh(mergeGeometries(mons), emi(0x7aa4d8, 0.7), { name: 'f2-monitors' }); }
  // ---- lobby: reception sign wall, the Haneen AI desk, lounge, plants ----
  { const d = HANEEN_DESK; add(placed(bevelBox(1.7, 0.95, 0.9, { b: 0.012, grain: 'x' }), { x: d.x, y: 0.475, z: d.z }), wood); add(placed(bevelBox(1.76, 0.04, 0.96, { b: 0.006, tile: 1.4 }), { x: d.x, y: 0.97, z: d.z }), marble); add(placed(bevelBox(1.7, 0.012, 0.9, { b: 0.003 }), { x: d.x, y: 0.94, z: d.z }), brass); }
  { const s = fu.sofa({ x: LOUNGE.x + 2.3, z: LOUNGE.z, ry: Math.PI, w: 2.4, d: 0.95, seats: 3 }); s.soft.forEach((g) => add(g, fabric)); s.hard.forEach((g) => add(g, brass));
    const s2 = fu.sofa({ x: LOUNGE.x - 0.6, z: LOUNGE.z + 1.5, ry: -Math.PI / 2, w: 2.1, d: 0.95, seats: 2 }); s2.soft.forEach((g) => add(g, fabric)); s2.hard.forEach((g) => add(g, brass));
    const s3 = fu.sofa({ x: LOUNGE.x - 0.6, z: LOUNGE.z - 1.5, ry: -Math.PI / 2, w: 1.6, d: 0.95, seats: 1 }); s3.soft.forEach((g) => add(g, leather)); s3.hard.forEach((g) => add(g, brass));
    const t = fu.tableTop({ x: LOUNGE.x + 0.9, z: LOUNGE.z, w: 1.1, d: 1.1, h: 0.38, th: 0.05, legInset: 0.08 }); t.top.forEach((g) => add(g, marble)); t.legs.forEach((g) => add(g, brass));
    const pf = fu.pouf({ x: LOUNGE.x + 0.9, z: LOUNGE.z + 1.5 }); pf.soft.forEach((g) => add(g, leather)); pf.hard.forEach((g) => add(g, brass)); }
  { const rug = mesh(new THREE.PlaneGeometry(5.4, 4.2), M.rug, { pos: [LOUNGE.x + 0.6, 0.012, LOUNGE.z], rot: [-Math.PI / 2, 0, 0], receive: true }); rug.material = M.rug; }
  { const items = [], cards = []; for (const [x, z, s] of [[17.2, 3.2, 1], [-13.8, 3.2, 2], [-1.3, 10.9, 3], [17.2, 11.2, 4]]) { const pl = pr.plant(x, 0, z, { h: 1.9, leaves: 48, potR: 0.22, seed: 60 + s }); items.push(...pl.body); cards.push(...pl.cards); }
    mesh(mergeColored(items), M.leaves); mesh(mergeColored(cards), M.leafCard); }
  // ---- the lift cab on Floor 2 (open to the east): brass floor, glass sides, a lit ceiling, a floor-select panel ----
  { const c = CAB_L2; add(placed(bevelBox(c.x1 - c.x0, 0.03, c.z1 - c.z0, { b: 0.004 }), { x: (c.x0 + c.x1) / 2, y: 0.02, z: (c.z0 + c.z1) / 2 }), brass);
    add(placed(bevelBox(c.x1 - c.x0, 0.05, c.z1 - c.z0, { b: 0.004 }), { x: (c.x0 + c.x1) / 2, y: 2.75, z: (c.z0 + c.z1) / 2 }), bronze); add(placed(new THREE.BoxGeometry(c.x1 - c.x0 - 0.3, 0.012, c.z1 - c.z0 - 0.3), { x: (c.x0 + c.x1) / 2, y: 2.72, z: (c.z0 + c.z1) / 2 }), ledWarm);
    for (const z of [c.z0, c.z1]) { add(placed(bevelBox(c.x1 - c.x0, 2.75, 0.05, { b: 0.004 }), { x: (c.x0 + c.x1) / 2, y: 1.375, z }), bronze); }
    add(placed(bevelBox(0.06, 2.75, c.z1 - c.z0, { b: 0.004 }), { x: c.x0, y: 1.375, z: (c.z0 + c.z1) / 2 }), bronze);
    for (const z of [c.z0, c.z1]) add(placed(bevelBox(0.08, 2.75, 0.08, { b: 0.004 }), { x: c.x1, y: 1.375, z }), brass); add(placed(bevelBox(0.08, 0.08, c.z1 - c.z0 + 0.08, { b: 0.004 }), { x: c.x1, y: 2.75, z: (c.z0 + c.z1) / 2 }), brass); }
  // ---- ceiling light coves round the boardroom and the lobby (warm), brass baffles, recessed downlights ----
  { const cov = []; const run = (w, d, x, z) => cov.push(prep(placed(new THREE.BoxGeometry(w, 0.025, d), { x, y: H - 0.07, z })));
    run(W - 1.0, 0.06, 0, F2.z0 + 0.5); run(W - 1.0, 0.06, 0, F2.z1 - 0.5); run(0.06, D - 1.0, F2.x0 + 0.5, 0); run(0.06, D - 1.0, F2.x1 - 0.5, 0); run(20, 0.06, 8, 1.4); run(0.06, 14, -1.4, -5);
    mirrored.push(mesh(mergeGeometries(cov), ledWarm, { name: 'f2-coves' }));
    const dl = []; for (const x of [4.6, 6.4, 8.2, 10.0, 11.8]) for (const z of [-6.2, -3.8]) dl.push(prep(placed(new THREE.CircleGeometry(0.075, 16), { x, y: H - 0.004, z, rx: Math.PI / 2 }))); for (const [x, z] of [[-12, -9.5], [-12, -5], [-12, -0.5], [-7, -9.5], [-7, -5], [-7, -0.5], [-12, 7], [-4, 7], [4, 7], [12, 4.5], [-9.6, 5.5], [-4, 9.5]]) dl.push(prep(placed(new THREE.CircleGeometry(0.075, 16), { x, y: H - 0.004, z, rx: Math.PI / 2 })));
    mesh(mergeGeometries(dl), emi(BLOOM_LIGHT.cream, 1.2), { name: 'f2-downlights' });
    // a suspended light blade over the table, on two brass rods
    add(placed(bevelBox(5.4, 0.05, 0.14, { b: 0.01 }), { x: T.x, y: 3.7, z: T.z }), brass); mirrored.push(mesh(new THREE.BoxGeometry(5.2, 0.012, 0.08), ledWarm, { pos: [T.x, 3.672, T.z] }));
    for (const dx of [-2.2, 2.2]) add(placed(new THREE.CylinderGeometry(0.008, 0.008, H - 3.7, 6), { x: T.x + dx, y: (H + 3.7) / 2, z: T.z }), brass); }
  // ---- light beams over the table (additive cones, fading to black) + dust motes drifting through them ----
  const beamMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  { const parts = []; for (const x of [4.6, 6.4, 8.2, 10.0, 11.8]) for (const z of [-6.2, -3.8]) { const g = new THREE.CylinderGeometry(0.08, 0.62, H - 0.9, 16, 1, true); g.translate(x, (H - 0.9) / 2 + 0.9, z); const c = new Float32Array(g.attributes.position.count * 3), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = Math.max(0, (p.getY(i) - 0.9) / (H - 0.9)); const w = 0.17 * k * k; c[i * 3] = w; c[i * 3 + 1] = w * 0.8; c[i * 3 + 2] = w * 0.55; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); parts.push(prep(g)); }
    parts.forEach((g, i) => { if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); }); mesh(mergeGeometries(parts), beamMat, { name: 'f2-beams' }).renderOrder = 4; }
  const dustN = low ? 70 : 170, dust = (() => { const g = new THREE.BufferGeometry(), pos = new Float32Array(dustN * 3), seed = new Float32Array(dustN * 3); for (let i = 0; i < dustN; i++) { seed[i * 3] = Math.random() * 6.28; seed[i * 3 + 1] = Math.random() * 6.28; seed[i * 3 + 2] = 0.5 + Math.random();
      pos[i * 3] = 3.6 + Math.random() * 9.6; pos[i * 3 + 1] = 0.5 + Math.random() * 3.6; pos[i * 3 + 2] = T.z - 2.2 + Math.random() * 4.4; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const m = new THREE.PointsMaterial({ size: 0.045, map: glowTex || null, color: tint(BLOOM_LIGHT.warm, 1), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.name = 'f2-dust'; group.add(pts); return { pts, seed, base: pos.slice() }; })();
  // ---- animated light ribbons in the Bloom colours (flat strips under the ceiling, a scrolling gradient) ----
  const ribbonTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 16; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 512, 0); const stops = [[0, '#e68e40'], [0.28, '#c9a25b'], [0.5, '#fff0dd'], [0.72, '#c9a25b'], [1, '#e68e40']]; for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, 512, 16);
    const fade = g.createLinearGradient(0, 0, 0, 16); fade.addColorStop(0, 'rgba(0,0,0,0.85)'); fade.addColorStop(0.5, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,0.85)'); g.fillStyle = fade; g.fillRect(0, 0, 512, 16); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(3, 1); return t; })();
  const ribbonMat = new THREE.MeshBasicMaterial({ map: ribbonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, color: tint(0xffffff, 1.3) });
  const ribbonGeo = (z0, ph, amp) => { const n = 120, pos = [], uv = [], idx = []; for (let i = 0; i <= n; i++) { const u = i / n, x = F2.x0 + 1 + u * (W - 2), z = z0 + Math.sin(u * 9 + ph) * amp, y = H - 0.28 + Math.sin(u * 13 + ph) * 0.12, dz = Math.cos(u * 9 + ph) * amp * 9 / (W - 2), l = Math.hypot(1, dz), nx = -dz / l, nz = 1 / l; const wdt = 0.085;
      pos.push(x - nx * wdt * 0, y, z - nz * wdt, x, y, z + nz * wdt); uv.push(u, 0, u, 1); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
  [[-8, 0, 2.4], [-0.5, 2, 2.0], [7, 4, 2.6]].forEach(([z0, ph, amp]) => mirrored.push(mesh(ribbonGeo(z0, ph, amp), ribbonMat, { name: 'f2-ribbon' })));
  // ---- statics flush: one draw per material ----
  for (const [mat, list] of statics) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.matrixAutoUpdate = false; m.updateMatrix(); m.receiveShadow = false; group.add(m); }
  // ---- the skyline outside: night sky, Bahrain WTC + Financial Harbour silhouettes, the sea and its reflection ----
  const sky = buildSkyline({ tier }); group.add(sky.group);

  // ---- canvas panels (created on first activation) ----
  const sized = (mW, d) => { const pxm = hiRes ? 369 : 277, w = Math.min(4096, Math.round(mW * pxm)); return { w, h: Math.round(w * d.h / d.w) }; };
  function ensurePanels() {
    if (state.panelsBuilt) return; state.panelsBuilt = true;
    film = makePanel(filmW, filmH, (g, w, h, l) => { g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; drawFilmIdle(g, w, h, { lang: l, film: state.film || { status: 'idle' } }); }, state.lang, { design: { w: 1536, h: 864 }, anisotropy: aniso });
    filmMat = new THREE.MeshBasicMaterial({ map: film.tex, toneMapped: false }); filmMesh = mesh(new THREE.PlaneGeometry(S.w, S.h), filmMat, { pos: [S.x - 0.08, S.y, S.z], rot: [0, -Math.PI / 2, 0], name: 'f2-film' }); mirrored.push(filmMesh);
    filmStrip = makePanel(1536, 220, (g, w, h, l) => drawFilmOverlay(g, w, h, { lang: l, cue: state.film ? state.film.cue : '', capLang: state.film ? state.film.caption : l, real: !!(state.film && state.film.real), mixed: !!(state.film && state.film.mixed) }), state.lang, { anisotropy: aniso });
    filmStripMesh = mesh(new THREE.PlaneGeometry(S.w, S.h * 220 / 864), new THREE.MeshBasicMaterial({ map: filmStrip.tex, transparent: true, depthWrite: false, toneMapped: false }), { pos: [S.x - 0.085, S.y - S.h / 2 + (S.h * 220 / 864) / 2, S.z], rot: [0, -Math.PI / 2, 0], name: 'f2-film-strip' }); filmStripMesh.visible = false;
    const so = sized(OPS_WALL.w, DESIGN.ops), sl = sized(LEADS_WALL.w, DESIGN.leads);
    ops = makePanel(so.w, so.h, (g, w, h, l) => drawOpsWall(g, w, h, { lang: l, t: state.t }), state.lang, { design: DESIGN.ops, anisotropy: aniso }); mesh(new THREE.PlaneGeometry(OPS_WALL.w, OPS_WALL.h), new THREE.MeshBasicMaterial({ map: ops.tex, toneMapped: false }), { pos: [OPS_WALL.x + 0.1, OPS_WALL.y, OPS_WALL.z], rot: [0, Math.PI / 2, 0], name: 'f2-ops-wall' });
    leads = makePanel(sl.w, sl.h, (g, w, h, l) => drawLeadsWall(g, w, h, { lang: l, t: state.t }), state.lang, { design: DESIGN.leads, anisotropy: aniso }); mesh(new THREE.PlaneGeometry(LEADS_WALL.w, LEADS_WALL.h), new THREE.MeshBasicMaterial({ map: leads.tex, toneMapped: false }), { pos: [LEADS_WALL.x, LEADS_WALL.y, LEADS_WALL.z - 0.1], rot: [0, Math.PI, 0], name: 'f2-leads-wall' });
    sign = makePanel(1536, 384, (g, w, h, l) => drawBloomSign(g, w, h, { lang: l }), state.lang, { design: DESIGN.sign, anisotropy: aniso }); mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: sign.tex, toneMapped: false }), { pos: [F2.x0 + 0.1, 3.75, 9.9], rot: [0, Math.PI / 2, 0], name: 'f2-sign' });
    holo = makePanel(768, 512, (g, w, h, l) => drawHaneenCard(g, w, h, { lang: l, t: state.t }), state.lang, { design: DESIGN.haneen, anisotropy: aniso });
    holoMesh = mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: holo.tex, transparent: true, blending: THREE.NormalBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), { pos: [HANEEN_DESK.x, 1.75, HANEEN_DESK.z + 0.1], rot: [0, Math.PI, 0], name: 'f2-haneen-card' });   // faces the visitors (-z)
    // brass frames round the three walls, a light ring + column at the Haneen desk
    const fr = []; const frame = (w, h, x, y, z, ry) => { for (const [fw, fh, dx, dy] of [[w + 0.2, 0.05, 0, h / 2 + 0.1], [w + 0.2, 0.05, 0, -h / 2 - 0.1], [0.05, h + 0.2, w / 2 + 0.1, 0], [0.05, h + 0.2, -w / 2 - 0.1, 0]]) { const cs = Math.cos(ry), sn = Math.sin(ry); fr.push(prep(placed(bevelBox(fw, fh, 0.03, { b: 0.004 }), { x: x + dx * cs, y: y + dy, z: z - dx * sn, ry }))); } };
    frame(OPS_WALL.w, OPS_WALL.h, OPS_WALL.x + 0.07, OPS_WALL.y, OPS_WALL.z, Math.PI / 2); frame(LEADS_WALL.w, LEADS_WALL.h, LEADS_WALL.x, LEADS_WALL.y, LEADS_WALL.z - 0.08, Math.PI);
    mesh(mergeGeometries(fr), brass, { name: 'f2-frames' });
    const ring = mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 48), ledOrange, { pos: [HANEEN_DESK.x, 1.0, HANEEN_DESK.z], rot: [Math.PI / 2, 0, 0], name: 'f2-haneen-ring' }); state.ring = ring;
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.9, 24, 1, true), new THREE.MeshBasicMaterial({ color: tint(BLOOM_LIGHT.orange, 0.14), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), { pos: [HANEEN_DESK.x, 1.45, HANEEN_DESK.z], name: 'f2-haneen-column' });
    // the mirror twin of everything flagged `mirrored` (screens, coves, ribbons): the reflection in the glossy floor
    state.mirror = new THREE.Group(); state.mirror.scale.y = -1; for (const m of mirrored) { const c = new THREE.Mesh(m.geometry, m.material); c.position.copy(m.position); c.rotation.copy(m.rotation); c.userData.twin = m; state.mirror.add(c); } group.add(state.mirror);
  }
  const api = {
    group, panelsBuilt: () => state.panelsBuilt, lights: [], skyline: sky,
    ensure() { ensurePanels(); },
    setLanguage(l) { state.lang = l === 'ar' ? 'ar' : 'en'; for (const p of [film, filmStrip, ops, leads, sign, holo]) if (p) p.redraw(state.lang); },
    setReduced(v) { state.reduced = !!v; },
    setActive(on) { state.active = !!on; group.visible = !!on; if (on) { ensurePanels(); state.enter = 0; } },
    get active() { return state.active; }, get film() { return state.film; },
    /** FILM mode of the video wall. view = explorer.filmView() ({ status, title, poster, video, cue, caption, duration, mixed, real, prep }) or null */
    setFilm(view) {
      ensurePanels(); const was = state.film, useVideo = !!(view && view.video); state.film = view;
      if (useVideo) { if (!state.videoTex || state.videoTex.image !== view.video) { if (state.videoTex) state.videoTex.dispose(); const vt = new THREE.VideoTexture(view.video); vt.colorSpace = THREE.SRGBColorSpace; vt.minFilter = THREE.LinearFilter; vt.magFilter = THREE.LinearFilter; vt.generateMipmaps = false; state.videoTex = vt; } if (filmMat.map !== state.videoTex) { filmMat.map = state.videoTex; filmMat.needsUpdate = true; } }
      else if (filmMat.map !== film.tex) { filmMat.map = film.tex; filmMat.needsUpdate = true; }
      filmStripMesh.visible = useVideo; if (useVideo && (!was || was.cue !== view.cue || was.caption !== view.caption || !was.video || was.id !== view.id)) filmStrip.redraw(state.lang);
      if (!useVideo && (!was || !view || was.status !== view.status || was.poster !== view.poster || was.prep !== view.prep || was.video || was.id !== view.id)) film.redraw(state.lang);
    },
    get filmOnWall() { return !!filmMat && filmMat.map === state.videoTex && !!state.videoTex; },
    /** per frame while Floor 2 is shown */
    update(dt, cam) {
      if (!state.active) return; state.t += dt; const t = state.t, still = state.reduced;
      state.enter = Math.min(1, state.enter + dt / 1.6);
      if (!still) {
        ribbonTex.offset.x = (ribbonTex.offset.x - dt * 0.06) % 1;
        const br = 0.82 + 0.18 * Math.sin(t * 0.8); ledWarm.color.copy(tint(BLOOM_LIGHT.warm, 1.1 * br)); ledOrange.color.copy(tint(BLOOM_LIGHT.orange, 0.85 + 0.25 * Math.sin(t * 1.3)));
        const p = dust.pts.geometry.attributes.position, a = p.array; for (let i = 0; i < dustN; i++) { const s = dust.seed; a[i * 3] = dust.base[i * 3] + Math.sin(t * 0.2 * s[i * 3 + 2] + s[i * 3]) * 0.35; a[i * 3 + 1] = dust.base[i * 3 + 1] + Math.sin(t * 0.15 * s[i * 3 + 2] + s[i * 3 + 1]) * 0.3 + ((t * 0.02 * s[i * 3 + 2]) % 1) * 0.0; a[i * 3 + 2] = dust.base[i * 3 + 2] + Math.cos(t * 0.17 * s[i * 3 + 2] + s[i * 3 + 1]) * 0.3; } p.needsUpdate = true;
        sky.update(dt, t); if (state.ring) state.ring.rotation.z += dt * 0.6;
      }
      // the live-looking walls redraw about every 1.6 s, only while the camera is in the same part of the floor and looks toward them
      if (!still && state.panelsBuilt && t - state.last > 1.6 && cam) {
        const fw = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), cx = cam.position.x, cz = cam.position.z - BLOOM_Z0;
        const toward = (x, z) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return (fw.x * dx + fw.z * dz) / l > 0.3 && l < 20; };
        if (toward(OPS_WALL.x, OPS_WALL.z) || toward(LEADS_WALL.x, LEADS_WALL.z) || toward(HANEEN_DESK.x, HANEEN_DESK.z)) { state.last = t; if (toward(OPS_WALL.x, OPS_WALL.z)) ops.redraw(state.lang); if (toward(LEADS_WALL.x, LEADS_WALL.z)) leads.redraw(state.lang); if (toward(HANEEN_DESK.x, HANEEN_DESK.z) && holo) holo.redraw(state.lang); }
      }
    },
    dispose() { if (state.videoTex) state.videoTex.dispose(); for (const p of [film, filmStrip, ops, leads, sign, holo]) if (p) p.tex.dispose(); ribbonTex.dispose(); sky.dispose(); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
    // for the tests / QA
    stats() { let tris = 0, meshes = 0; group.traverse((o) => { if (o.isMesh || o.isPoints) { meshes++; const g = o.geometry; tris += g.index ? g.index.count / 3 : (g.attributes.position.count / 3); } }); return { meshes, tris: Math.round(tris), panelBytes: state.panelsBuilt ? [film, ops, leads].reduce((s, p) => s + p.canvas.width * p.canvas.height * 4, 0) : 0 }; },
  };
  return api;
}
