/* VIP meeting room: a glass-fronted boardroom (acoustic fluted-walnut walls, bronze-framed glass, a door that slides open as you approach) against the back wall
 * of the hall. A spot-lit long table with ten chairs, a lounge corner, a credenza, a cinematic wall screen that shows the guided presentation, a gallery wall of the
 * site's real projects, a Hub chart wall, three floating "hologram" panels (emissive, additive) and a glowing floor map. Procedural, SAMPLE-style; no photographs.
 * Draw calls are kept low (merged statics, canvas planes): about 40 for the whole room. */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep, mergeColored } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { PALETTE as P } from '../../3d/palette';
import { VIP } from './layout';
import { makePanel } from '../products/screens';
import { BUILTIN_DRAW, drawSlide, drawDeckChips, drawPlayOverlay, drawFilmOverlay, chipLayout, drawGallery, drawHubWall, drawFloorMap, drawHolo } from './panels';
import { resolveDeck } from '../../vip/deckSchema';
import { motionLevel, settleSeconds, easeInOut as eio } from '../../vip/motion';
import { DEFAULT_DECK } from '../../vip/decks/default';
import { projectCard } from '../../products/projectsFeed';
import * as fu from '../products/furnish';
import * as pr from '../products/props';

const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const DW = 1536, DH = 864;   // layout size of the screen drawings; the canvas itself is 1.33x on the high tier (crisper type)

export function buildVipRoom({ M, tier, lang = 'en', logoTex = null, reduced = false }) {
  const group = new THREE.Group(); group.name = 'vip-room';
  const env = M.stone.envMap, W = VIP.x1 - VIP.x0, D = VIP.z1 - VIP.z0, cx = 0, cz = (VIP.z0 + VIP.z1) / 2, H = VIP.height;
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, ...o }), phys = (o) => new THREE.MeshPhysicalMaterial({ envMap: env, ...o });
  const wood = phys({ map: M.tex.walnut.map, roughnessMap: M.tex.walnut.rough, normalMap: M.tex.walnut.normal, roughness: 1, color: 0xffffff, envMapIntensity: 0.4, clearcoat: tier.id === 'low' ? 0 : 0.2, clearcoatRoughness: 0.35 });
  const woodFlute = wood.clone(); woodFlute.vertexColors = true;
  const leather = std({ color: P.ink, roughness: 0.5, envMapIntensity: 0.6 }), fabric = std({ map: M.white, normalMap: M.tex.weave && M.tex.weave.normal, color: P.fabricCharcoal, roughness: 0.95, envMapIntensity: 0.3 });
  const stone = M.stone.clone(); stone.map = M.tex.marble.dark.map; stone.roughnessMap = M.tex.marble.dark.rough; stone.color.setHex(0xe9e6df); stone.needsUpdate = true;
  const plaster = std({ color: P.plasterWarm, emissive: P.plasterWarm, emissiveIntensity: 0.4, roughness: 0.9, envMapIntensity: 0.2 }), brass = M.brass, bronze = M.bronze, glass = M.glassClear.clone();
  glass.opacity = 0.1;   // clearer from the hall: the screen and the table read through the glass
  const led = (k = 2.6) => { const m = M.ledWarm(); m.color.multiplyScalar(k / 3.4); return m; };
  const statics = new Map(); const add = (geo, mat) => { if (!statics.has(mat)) statics.set(mat, []); statics.get(mat).push(prep(geo)); };
  const mesh = (geo, mat, o = {}) => { const m = new THREE.Mesh(geo, mat); if (o.pos) m.position.set(...o.pos); if (o.rot) m.rotation.set(...o.rot); m.castShadow = !!o.cast; m.receiveShadow = o.receive !== false; if (o.name) m.name = o.name; (o.parent || group).add(m); return m; };

  // ---- floor, ceiling, walls ----
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.4 + 0.3, p.getZ(i) / 2.4 + 0.7); mesh(g, M.floorBay.living, { pos: [cx, 0.011, cz], name: 'vip-floor' }); }
  { const g = new THREE.PlaneGeometry(W + 0.3, D + 0.1); g.rotateX(Math.PI / 2); mesh(g, plaster, { pos: [cx, H, cz], receive: false, name: 'vip-ceiling' }); }
  for (const s of [-1, 1]) { const f = new THREE.Mesh(flutedPanel(D, H, 0.06, { pitch: 0.06, relief: 0.016, off: [s * 0.3, 0.1] }), woodFlute); f.position.set(s * (VIP.x1 + 0.03), H / 2, cz); f.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; f.receiveShadow = true; f.name = 'vip-wall-' + (s < 0 ? 'left' : 'right'); group.add(f); }
  add(placed(bevelBox(W, H, 0.06, { b: 0.004, grain: 'y' }), { x: cx, y: H / 2, z: VIP.z0 + 0.03 }), wood);                   // back wall panel (covers the hall's slats behind the screen)
  add(placed(bevelBox(W + 0.3, 0.1, D + 0.1, { b: 0.01 }), { x: cx, y: H + 0.09, z: cz }), M.plinth);                         // roof edge (clear of the ceiling plane: no z-fighting)
  // ---- front glass wall with the door gap, bronze mullions, header ----
  const gz = VIP.z1, sideW = W / 2 - VIP.doorHalf;
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(sideW, H - 0.1), glass, { pos: [s * (VIP.doorHalf + sideW / 2), (H - 0.1) / 2 + 0.05, gz], receive: false, name: 'vip-glass' });
  mesh(new THREE.PlaneGeometry(VIP.doorHalf * 2, H - VIP.doorH), glass, { pos: [0, VIP.doorH + (H - VIP.doorH) / 2, gz], receive: false });
  const fr = []; for (const x of [-7, -5.25, -3.5, -1.75, -VIP.doorHalf, VIP.doorHalf, 1.75, 3.5, 5.25, 7]) fr.push(placed(bevelBox(0.06, H, 0.1, { b: 0.004 }), { x, y: H / 2, z: gz }));
  fr.push(placed(bevelBox(W, 0.08, 0.1, { b: 0.004 }), { x: cx, y: H - 0.04, z: gz }), placed(bevelBox(W, 0.06, 0.1, { b: 0.004 }), { x: cx, y: 0.03, z: gz }), placed(bevelBox(VIP.doorHalf * 2, 0.06, 0.1, { b: 0.004 }), { x: 0, y: VIP.doorH + 0.03, z: gz }), placed(bevelBox(W, 0.06, 0.1, { b: 0.004 }), { x: cx, y: 2.1, z: gz }));
  fr.forEach((g) => add(g, bronze));
  add(placed(bevelBox(1.96, 0.07, 0.1, { b: 0.006 }), { x: 0, y: VIP.doorH + 0.09, z: gz + 0.08 }), brass);
  // door leaves: bronze frame + glass, sliding along x
  const leaves = []; for (const s of [-1, 1]) { const g = new THREE.Group(); const f = [placed(bevelBox(0.04, VIP.doorH, 0.05, { b: 0.003 }), { x: -VIP.doorHalf / 2, y: VIP.doorH / 2 }), placed(bevelBox(0.04, VIP.doorH, 0.05, { b: 0.003 }), { x: VIP.doorHalf / 2, y: VIP.doorH / 2 }), placed(bevelBox(VIP.doorHalf, 0.05, 0.05, { b: 0.003 }), { y: VIP.doorH - 0.025 }), placed(bevelBox(VIP.doorHalf, 0.05, 0.05, { b: 0.003 }), { y: 0.025 })].map(prep);
    const fm = new THREE.Mesh(mergeGeometries(f), bronze); g.add(fm); const gm = new THREE.Mesh(new THREE.PlaneGeometry(VIP.doorHalf - 0.06, VIP.doorH - 0.1), glass); gm.position.y = VIP.doorH / 2; g.add(gm); g.position.set(s * VIP.doorHalf / 2, 0, gz + 0.07); group.add(g); leaves.push({ g, s }); }
  { const bar = []; for (const s of [-1, 1]) bar.push(prep(placed(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 10), { x: s * 0.05, y: 1.05, z: gz + 0.14 }))); add(mergeGeometries(bar), brass); }

  // ---- cove light, downlights ----
  { const lm = led(2.4); const s = []; s.push(prep(placed(new THREE.BoxGeometry(W - 0.4, 0.03, 0.05), { x: cx, y: H - 0.08, z: VIP.z0 + 0.5 })), prep(placed(new THREE.BoxGeometry(W - 0.4, 0.03, 0.05), { x: cx, y: H - 0.08, z: VIP.z1 - 0.5 })), prep(placed(new THREE.BoxGeometry(0.05, 0.03, D - 1.0), { x: VIP.x0 + 0.5, y: H - 0.08, z: cz })), prep(placed(new THREE.BoxGeometry(0.05, 0.03, D - 1.0), { x: VIP.x1 - 0.5, y: H - 0.08, z: cz })));
    mesh(mergeGeometries(s), lm, { receive: false, name: 'vip-cove' }); const dl = []; for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-34.4, -30.8]) dl.push(prep(placed(new THREE.CircleGeometry(0.07, 14), { x, y: H - 0.004, z, rx: Math.PI / 2 }))); mesh(mergeGeometries(dl), led(2.0), { receive: false }); }

  // ---- table: wood top, stone centre inlay, two slab legs, brass edge, LED line ----
  const T = VIP.table; add(placed(bevelBox(T.d, 0.07, T.w, { b: 0.006, grain: 'z' }), { x: T.x, y: T.h - 0.035, z: T.z, ry: Math.PI / 2 }), wood);
  { const g = placed(bevelBox(0.5, 0.012, T.w - 1.0, { b: 0.002, tile: 1.6 }), { x: T.x, y: T.h + 0.004, z: T.z, ry: Math.PI / 2 }); add(g, stone); }
  for (const s of [-1, 1]) add(placed(bevelBox(1.1, T.h - 0.07, 0.1, { b: 0.006, grain: 'y' }), { x: T.x + s * (T.w / 2 - 0.9), y: (T.h - 0.07) / 2, z: T.z, ry: Math.PI / 2 }), wood);
  add(placed(bevelBox(T.d + 0.02, 0.012, T.w + 0.02, { b: 0.003 }), { x: T.x, y: T.h - 0.08, z: T.z, ry: Math.PI / 2 }), brass);
  mesh(new THREE.BoxGeometry(T.w - 1.4, 0.006, 0.02), led(3.0), { pos: [T.x, T.h + 0.012, T.z], receive: false, name: 'table-led' });
  // chairs (leather seat + back, brass feet)
  { const soft = [], hard = []; const ch = (x, z, ry) => { const c = fu.chair({ x, z, ry }); soft.push(...c.soft); hard.push(...c.hard); };
    for (const x of [-2.1, -0.7, 0.7, 2.1]) ch(x, T.z + 1.05, Math.PI / 2);   // the whole row faces the big screen; no chair stands between the table and the wall any more (backs used to hide the screen's foot)
    ch(-3.45, T.z, 0); ch(3.45, T.z, Math.PI);
    soft.forEach((g) => add(g, leather)); hard.forEach((g) => add(g, brass)); }
  // ---- lounge corner (front right) and credenza (front left), rug ----
  { const s = fu.sofa({ x: 6.2, z: -30.35, ry: Math.PI, w: 2.1, d: 0.95, seats: 3 }); s.soft.forEach((g) => add(g, fabric)); s.hard.forEach((g) => add(g, brass));
    const t = fu.tableTop({ x: 5.0, z: -30.35, w: 0.9, d: 0.9, h: 0.38, th: 0.05, legInset: 0.07 }); t.top.forEach((g) => add(g, stone)); t.legs.forEach((g) => add(g, brass)); }
  add(placed(bevelBox(0.55, 0.78, 2.0, { b: 0.008, grain: 'z' }), { x: -6.65, y: 0.44, z: -30.2 }), wood); add(placed(bevelBox(0.58, 0.04, 2.04, { b: 0.004, tile: 1.4 }), { x: -6.65, y: 0.84, z: -30.2 }), stone);
  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(5.4, 0.0135, -30.35); rug.receiveShadow = true; group.add(rug); }
  { const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.4), M.rug); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.0125, T.z); rug.material = M.rug; rug.receiveShadow = true; group.add(rug); }
  // plants (leaf cards) + brass lamp on the credenza
  { const items = [], cards = []; for (const [x, z, s] of [[-6.5, -29.4, 1], [6.5, -34.6, 2], [-6.5, -35.3, 3], [6.5, -29.0, 4]]) { const pl = pr.plant(x, 0, z, { h: 1.7, leaves: 48, potR: 0.2, seed: 40 + s }); items.push(...pl.body); cards.push(...pl.cards); }
    const a = new THREE.Mesh(mergeColored(items), M.leaves); group.add(a); const b = new THREE.Mesh(mergeColored(cards), M.leafCard); group.add(b); }

  // flush the merged statics (one draw call per material)
  for (const [mat, list] of statics) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = false; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); group.add(m); }

  // ---- screens / panels (canvas textures) ----
  const state = { lang, station: 0, slideT: 99, motion: motionLevel(tier.id, reduced), progress: -1, speed: 1, prev: null, transDir: 1, deck: DEFAULT_DECK, decks: [DEFAULT_DECK], images: new Map(), projects: { status: 'idle', cards: [] }, t: 0, enter: reduced ? 1 : 0, inside: false, door: 0, doorTarget: 0, redrawT: 0, animated: false, reduced, focus: false };
  const logoImg = logoTex && logoTex.image ? logoTex.image : null;
  /** the slide on the wall: a built-in station keeps its rich renderer; any other slide (imported / saved decks) uses the generic slide drawing. With more than one deck, deck chips sit along the top. */
  const drawScreen = (g, w, h, l) => {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const d = state.deck, sl = d.slides[state.station] || d.slides[0], bi = sl.builtin && BUILTIN_DRAW[sl.builtin], live = state.inside || state.focus;
    if (bi) bi(g, w, h, { lang: l, t: state.t, logo: logoImg, projects: state.projects, film: state.film });
    else {
      const rd = resolveDeck({ ...d, slides: [sl] }, l);
      drawSlide(g, w, h, { lang: l, slide: rd.slides[0], index: state.station, count: d.slides.length, deckTitle: rd.title, images: state.images, anim: state.motion.on && live ? { t: state.slideT, level: state.motion } : null });
    }
    // slide change: the previous frame fades out and drifts away over the new slide (a cross-fade; skipped under reduced motion)
    if (state.prev && state.motion.on && state.slideT < state.motion.transition) { const e = eio(state.slideT / state.motion.transition); g.save(); g.globalAlpha = 1 - e; g.drawImage(state.prev, -state.transDir * (l === 'ar' ? -1 : 1) * e * 56, 0, w, h); g.restore(); }
    if (state.decks.length > 1) drawDeckChips(g, w, h, { lang: l, decks: state.decks.map((x) => resolveDeck({ ...x, slides: [] }, l).title), deckIndex: state.decks.indexOf(state.deck) });
    if (state.progress >= 0) drawPlayOverlay(g, w, h, { lang: l, progress: state.progress, speed: state.speed });
  };
  /** keep the last frame so the next slide can cross-fade from it */
  const snapshot = () => { if (!state.motion.on || !(state.inside || state.focus) || state.motion.transition <= 0) { state.prev = null; return; } const c = screen && screen.canvas; if (!c) return; if (!state.prevC) state.prevC = document.createElement('canvas'); if (state.prevC.width !== c.width) { state.prevC.width = c.width; state.prevC.height = c.height; } state.prevC.getContext('2d').drawImage(c, 0, 0); state.prev = state.prevC; };
  const hiRes = tier.id === 'high', SW = hiRes ? 2560 : 1920, SH = hiRes ? 1440 : 1080, aniso = 8;   // the big screen is read from across the room: a crisp 1080p / 1440p texture, mipmapped + anisotropic
  const screen = makePanel(SW, SH, (g, w, h, l) => drawScreen(g, w, h, l), lang, { design: { w: DW, h: DH }, anisotropy: aniso });
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const S = VIP.screen; add2(placed(bevelBox(S.w + 0.3, S.h + 0.3, 0.06, { b: 0.01 }), { x: cx, y: S.y, z: S.z - 0.02 }), M.darkInterior); const screenMesh = mesh(new THREE.PlaneGeometry(S.w, S.h), screenMat, { pos: [cx, S.y, S.z + 0.012], receive: false, name: 'vip-screen' });
  function add2(geo, mat) { const m = new THREE.Mesh(prep(geo), mat); group.add(m); return m; }
  mesh(new THREE.BoxGeometry(S.w, 0.012, 0.03), led(2.8), { pos: [cx, S.y - S.h / 2 - 0.16, S.z + 0.05], receive: false });
  // ---- the big screen's surround: a stone border with a brass edge, a warm LED back-light line round it, a soft glow on the wall, a lectern for the presenter ----
  add(placed(bevelBox(S.w + 1.1, S.h + 0.7, 0.04, { b: 0.01, tile: 2 }), { x: cx, y: S.y, z: S.z - 0.045 }), stone);
  for (const [bw, bh, bx, by] of [[S.w + 0.34, 0.016, 0, S.h / 2 + 0.17], [S.w + 0.34, 0.016, 0, -S.h / 2 - 0.17], [0.016, S.h + 0.34, S.w / 2 + 0.17, 0], [0.016, S.h + 0.34, -S.w / 2 - 0.17, 0]]) add(placed(bevelBox(bw, bh, 0.012, { b: 0.002 }), { x: cx + bx, y: S.y + by, z: S.z + 0.012 }), brass);
  { const ls = []; for (const [bw, bh, bx, by] of [[S.w + 0.5, 0.02, 0, S.h / 2 + 0.3], [S.w + 0.5, 0.02, 0, -S.h / 2 - 0.3], [0.02, S.h + 0.6, S.w / 2 + 0.25, 0], [0.02, S.h + 0.6, -S.w / 2 - 0.25, 0]]) ls.push(prep(placed(new THREE.BoxGeometry(bw, bh, 0.012), { x: cx + bx, y: S.y + by, z: S.z + 0.016 }))); mesh(mergeGeometries(ls), led(2.4), { receive: false, name: 'vip-screen-led' }); }
  const glowMat = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g2 = c.getContext('2d'), gr = g2.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,160,0.55)'); gr.addColorStop(0.55, 'rgba(255,190,120,0.16)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.35 }); })();
  // FILM mode: the playing video replaces the canvas on the screen material; captions + the AI label sit on a thin transparent strip in front of its lower edge (redrawn only when the cue changes)
  const filmStrip = makePanel(1536, 220, (g, w, h, l) => drawFilmOverlay(g, w, h, { lang: l, cue: state.film ? state.film.cue : '', capLang: state.film ? state.film.caption : l, real: !!(state.film && state.film.real) }), lang, { anisotropy: aniso });
  const filmStripMesh = mesh(new THREE.PlaneGeometry(S.w, S.h * 220 / 864), new THREE.MeshBasicMaterial({ map: filmStrip.tex, transparent: true, depthWrite: false, toneMapped: false }), { pos: [cx, S.y - S.h / 2 + (S.h * 220 / 864) / 2, S.z + 0.018], receive: false, name: 'vip-film-strip' }); filmStripMesh.visible = false;
  const glow = mesh(new THREE.PlaneGeometry(S.w * 1.45, S.h * 1.55), glowMat, { pos: [cx, S.y, S.z + 0.006], receive: false, name: 'vip-screen-glow' }); glow.renderOrder = -1;
  { const Lx0 = 3.7, Lz0 = -34.35; add(placed(bevelBox(0.5, 1.02, 0.38, { b: 0.012, grain: 'y' }), { x: Lx0, y: 0.51, z: Lz0 }), wood); add(placed(bevelBox(0.58, 0.03, 0.44, { b: 0.006 }), { x: Lx0, y: 1.04, z: Lz0, rx: -0.12 }), brass); add(placed(bevelBox(0.06, 0.012, 0.1, { b: 0.003 }), { x: Lx0, y: 1.07, z: Lz0 + 0.02 }), M.bronze);   // presenter lectern
    add(placed(bevelBox(0.16, 0.014, 0.05, { b: 0.004 }), { x: -0.9, y: VIP.table.h + 0.018, z: VIP.table.z + 0.3 }), brass); }   // the presenter's remote on the table
  const gallery = makePanel(hiRes ? 2048 : 1536, hiRes ? 1365 : 1024, (g, w, h, l) => drawGallery(g, w, h, { lang: l, projects: state.projects }), lang, { design: { w: 1536, h: 1024 }, anisotropy: aniso });
  add2(placed(bevelBox(0.04, 2.95, 4.4, { b: 0.006 }), { x: VIP.x0 + 0.08, y: 2.0, z: cz - 0.8 }), brass); mesh(new THREE.PlaneGeometry(4.2, 2.8), new THREE.MeshBasicMaterial({ map: gallery.tex, toneMapped: false }), { pos: [VIP.x0 + 0.115, 2.0, cz - 0.8], rot: [0, Math.PI / 2, 0], receive: false, name: 'vip-gallery' });
  const hubWall = makePanel(hiRes ? 1536 : 1024, hiRes ? 1080 : 720, (g, w, h, l) => drawHubWall(g, w, h, { lang: l }), lang, { design: { w: 1024, h: 720 }, anisotropy: aniso });
  add2(placed(bevelBox(0.04, 2.7, 3.9, { b: 0.006 }), { x: VIP.x1 - 0.08, y: 2.0, z: cz - 0.8 }), brass); mesh(new THREE.PlaneGeometry(3.7, 2.6), new THREE.MeshBasicMaterial({ map: hubWall.tex, toneMapped: false }), { pos: [VIP.x1 - 0.115, 2.0, cz - 0.8], rot: [0, -Math.PI / 2, 0], receive: false, name: 'vip-hubwall' });
  const holos = [0, 1, 2].map((i) => { const p = makePanel(512, 288, (g, w, h, l) => drawHolo(g, w, h, { lang: l, which: i }), lang); const m = new THREE.MeshBasicMaterial({ map: p.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, opacity: reduced ? 0.95 : 0 });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.84), m); g.position.set((i - 1) * 1.75, T.h + 0.34, T.z + 0.1); g.rotation.x = -0.95; g.scale.setScalar(0.62); g.renderOrder = 8; g.name = 'vip-holo-' + i; group.add(g); return { p, m, g, base: g.position.y }; });
  const mapP = makePanel(1024, 1024, (g, w, h, l) => drawFloorMap(g, w, h, { lang: l }), lang);
  const mapMat = new THREE.MeshBasicMaterial({ map: mapP.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: reduced ? 0.9 : 0 }); const mapMesh = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), mapMat); mapMesh.rotation.x = -Math.PI / 2; mapMesh.position.set(0, 0.03, -30.1); mapMesh.renderOrder = 5; group.add(mapMesh);

  // ---- lights: a spot on the table (choreographed) + a soft interior fill ----
  const spot = new THREE.SpotLight(P.ledCool, 0, 12, 0.62, 0.7, 1.4); spot.position.set(0, H - 0.1, T.z + 0.4); spot.target = new THREE.Object3D(); spot.target.position.set(0, T.h, T.z); spot.castShadow = false;
  const fill = new THREE.PointLight(P.lightHall, 0, 14, 2); fill.position.set(0, H - 0.6, cz + 0.4);
  const lights = [spot, spot.target, fill];
  const SPOT_I = 300, FILL_I = 45, tableLed = group.getObjectByName('table-led');

  const api = {
    group, lights, state, screen, screenMesh, gallery, hubWall, mapMesh, holos,
    get doorOpen() { return state.door; }, get station() { return state.station; },
    redraw() { screen.redraw(state.lang); gallery.redraw(state.lang); },
    setLanguage(l) { state.lang = l === 'ar' ? 'ar' : 'en'; for (const p of [screen, gallery, hubWall, mapP, filmStrip, ...holos.map((h) => h.p)]) p.redraw(state.lang); },
    setReduced(v) { state.reduced = !!v; state.motion = motionLevel(tier.id, !!v); if (v) state.enter = 1; },
    setStation(i) { const n = Math.max(0, Math.min(state.deck.slides.length - 1, i | 0)); if (n !== state.station) { snapshot(); state.transDir = n > state.station ? 1 : -1; state.slideT = 0; } state.station = n; state.t = 0; screen.redraw(state.lang); },
    /** presentation motion for this tier / reduced-motion setting, and the auto-play badge (progress -1 hides it) */
    setPlayback({ progress = -1, speed = 1 } = {}) { const was = state.progress; state.progress = progress; state.speed = speed; if ((was >= 0) !== (progress >= 0)) screen.redraw(state.lang); },
    /** show `deck` (one of `decks`) on the wall; remote images of generic slides load once (anonymous CORS, no referrer) and redraw when they arrive */
    setDeck(deck, decks = [deck], slide = 0) {
      if (deck !== state.deck) { snapshot(); state.transDir = 1; state.slideT = 0; } state.deck = deck; state.decks = decks; api.setStation(slide);
      for (const s of deck.slides) for (const b of s.blocks || []) if (b.type === 'image' && !state.images.has(b.url) && typeof Image !== 'undefined') {
        const im = new Image(); state.images.set(b.url, null); im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer'; im.onload = () => { state.images.set(b.url, im); screen.redraw(state.lang); }; im.onerror = () => { /* keep the alt-text frame */ }; im.src = b.url;
      }
    },
    /** click on the wall screen at (u, v in 0..1, v down): a deck chip -> its deck index, else -1 */
    chipAt(u, v) {
      if (state.decks.length < 2) return -1; const x = u * DW, y = v * DH, titles = state.decks.map((d) => resolveDeck({ ...d, slides: [] }, state.lang).title);
      const hit = chipLayout(titles, DW, state.lang === 'ar', 3, state.decks.indexOf(state.deck)).find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); return hit ? hit.i : -1;
    },
    setFocus(v) { state.focus = !!v; },
    /** FILM mode. view = { status, title, poster, video, cue, caption, duration } or null (not the film entry). The video (sRGB VideoTexture) is on the wall only while it plays or is paused. */
    setFilm(view) {
      const was = state.film, useVideo = !!(view && view.video); state.film = view;
      if (useVideo) { if (!state.videoTex || state.videoTex.image !== view.video) { if (state.videoTex) state.videoTex.dispose(); const vt = new THREE.VideoTexture(view.video); vt.colorSpace = THREE.SRGBColorSpace; vt.minFilter = THREE.LinearFilter; vt.magFilter = THREE.LinearFilter; vt.generateMipmaps = false; state.videoTex = vt; } if (screenMat.map !== state.videoTex) { screenMat.map = state.videoTex; screenMat.needsUpdate = true; } }
      else if (screenMat.map !== screen.tex) { screenMat.map = screen.tex; screenMat.needsUpdate = true; }
      filmStripMesh.visible = useVideo; if (useVideo && (!was || was.cue !== view.cue || was.caption !== view.caption || !was.video || was.id !== view.id)) filmStrip.redraw(state.lang);
      if (!useVideo && (!was || !view || was.status !== view.status || was.poster !== view.poster || was.video || was.id !== view.id)) screen.redraw(state.lang);
    },
    get filmOnWall() { return screenMat.map === state.videoTex && !!state.videoTex; },
    /** QA: draw slide `i` of the current deck on a scratch canvas with the REAL font metrics and return every text it drew (size, weight, position, wrapped extent) */
    legibility(i, l = state.lang) { const c = document.createElement('canvas'); c.width = DW; c.height = DH; const g = c.getContext('2d'), d = state.deck, sl = d.slides[i]; if (!sl || sl.builtin) return null; const rd = resolveDeck({ ...d, slides: [sl] }, l), metrics = []; g.direction = l === 'ar' ? 'rtl' : 'ltr'; drawSlide(g, DW, DH, { lang: l, slide: rd.slides[0], index: i, count: d.slides.length, deckTitle: rd.title, images: state.images, metrics }); return { w: DW, h: DH, metrics }; },
    /** QA / tests: pin the slide's animation clock to `t` seconds (null releases it) and redraw, so a motion sequence can be captured frame by frame */
    freezeAnim(t) { state.fixedT = t == null ? null : t; if (t != null) state.slideT = t; screen.redraw(state.lang); },
    setLevel(k) { state.level = k; },
    /** the site's real project rows (or an empty / error state) -> gallery cards; images load lazily and redraw the wall as they arrive */
    setProjects({ status, rows }) {
      const cards = (rows || []).map((r) => ({ ...projectCard(r, state.lang), img: null })); state.projects = { status, cards }; gallery.redraw(state.lang); if (state.deck.slides[state.station] && state.deck.slides[state.station].builtin === 'projects') screen.redraw(state.lang);
      cards.forEach((c) => { if (!c.image || typeof Image === 'undefined') return; const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { c.img = im; gallery.redraw(state.lang); }; im.onerror = () => { /* keep the procedural card */ }; im.src = c.image; });
    },
    enter() { state.enter = state.reduced ? 1 : 0; state.entered = true; },
    isInside: (cam) => cam.position.x > VIP.x0 && cam.position.x < VIP.x1 && cam.position.z < VIP.z1 - 0.1 && cam.position.z > VIP.z0,
    update(dt, cam) {
      const dx = cam.position.x - 0, dz = cam.position.z - VIP.z1, near = Math.hypot(dx, dz) < (state.doorTarget ? 5.0 : 3.8), inside = api.isInside(cam);
      state.doorTarget = (near || (inside && cam.position.z > VIP.z1 - 2.6)) ? 1 : 0; state.door += (state.doorTarget - state.door) * (state.reduced ? 1 : 1 - Math.exp(-4.5 * dt)); if (Math.abs(state.door - state.doorTarget) < 0.002) state.door = state.doorTarget;
      for (const l of leaves) l.g.position.x = l.s * (VIP.doorHalf / 2 + state.door * (VIP.doorHalf * 0.98));
      if (inside && !state.inside) api.enter(); state.inside = inside;
      state.enter = Math.min(1, state.enter + (state.reduced ? 1 : dt / 2.4)); state.t += dt;
      const k = ease(state.inside || state.focus ? state.enter : 0.25 + 0.15 * state.door), lv = state.level == null ? 1 : state.level;
      spot.intensity = SPOT_I * k * lv; fill.intensity = FILL_I * (0.4 + 0.6 * k) * lv; const sc = 0.04 + 0.96 * ease((state.enter - 0.05) / 0.7);   // the screen wakes up: dark, then a fast rise screenMat.color.setScalar(state.inside || state.focus ? sc : 1.0 + 0.25 * state.door); glowMat.opacity = 0.18 + 0.2 * (state.inside || state.focus ? sc : 0.7);
      holos.forEach((h, i) => { const a = ease((state.enter * 1.6 - i * 0.28)); h.m.opacity = (state.focus ? 0 : state.inside ? 0.95 : 0.3) * a; h.g.position.y = h.base + (state.reduced ? 0 : 0.04 * Math.sin(state.t * 0.9 + i * 1.7) - (1 - a) * 0.25); });
      const sw = ease(state.enter * 1.25); spot.target.position.set(0, T.h, VIP.z1 - 0.8 + (T.z - VIP.z1 + 0.8) * sw); spot.target.updateMatrixWorld(); if (tableLed) tableLed.scale.set(0.15 + 0.85 * ease(state.enter * 1.5 - 0.3), 1, 1);
      mapMat.opacity = 0.9 * ease(state.enter * 1.3); mapMesh.scale.setScalar(0.7 + 0.3 * ease(state.enter)); if (!state.reduced) mapMesh.rotation.z = state.t * 0.05;
      // the screen animates only while somebody is in the room (or presenting); static otherwise (a redraw is a canvas upload)
      state.redrawT += dt;
      if ((state.inside || state.focus) && !state.reduced) {
        const sl = state.deck.slides[state.station]; state.slideT = state.fixedT != null ? state.fixedT : state.slideT + dt;
        // a slide / deck change cross-fades from the previous frame: keep redrawing until it is over (also for the built-in stations and the film poster, which otherwise redraw rarely), then drop the old frame
        if (state.prev && state.motion.on && !api.filmOnWall) { if (state.slideT >= state.motion.transition) { state.prev = null; state.redrawT = 0; screen.redraw(state.lang); } else if (state.redrawT > 1 / state.motion.hz) { state.redrawT = 0; screen.redraw(state.lang); } }
        if (api.filmOnWall) { /* the video texture updates itself: no canvas uploads while the film is on the wall */ } else
        if (sl && sl.builtin) { if ((state.station !== 0 && state.redrawT > 0.14) || (state.progress >= 0 && state.redrawT > 0.25)) { state.redrawT = 0; screen.redraw(state.lang); } }
        else if (sl && state.motion.on) {
          const kbOn = state.motion.kenBurns && (sl.blocks || []).some((b) => b.type === 'image') && state.slideT < 18, active = state.slideT < settleSeconds(state.motion, sl) + 0.1 || kbOn, period = active ? 1 / state.motion.hz : (state.progress >= 0 ? 0.25 : 0);
          if (period && state.redrawT > period) { state.redrawT = 0; screen.redraw(state.lang); }
        } else if (state.progress >= 0 && state.redrawT > 0.25) { state.redrawT = 0; screen.redraw(state.lang); }
      }
    },
    dispose() { if (state.videoTex) state.videoTex.dispose(); for (const p of [screen, gallery, hubWall, mapP, filmStrip, ...holos.map((h) => h.p)]) p.tex.dispose(); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); },
  };
  return api;
}
