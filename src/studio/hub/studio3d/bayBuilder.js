// bayBuilder.js — builds ONE unit that carries s.bays[] as a row of real 3D modules
// (three.js r128, passed in as THREE so the CDN loader in Cabinets3D stays the only loader).
// Used by Cabinets3D (units with bays) and by Studio3DEditor (every unit, virtual bays for
// units without any). Pure geometry — no scene, no renderer, no React.
//
// Unit-local frame: x = along the run (0 → W), y = up (floor = 0), z = out of the wall
// (back panel at z≈0, doors at z≈depth). Every mesh carries userData.pick = { bay, part, n }
// (bay -1 = unit level, e.g. a door frame) so a raycast hit resolves to a bay / door leaf /
// drawer front / shelf. Doors, drawers and sliding panels use the same userData schema as
// Cabinets3D's own openable parts so its animation loop drives them unchanged.
import { finishesOf, optsOf, unitCat, UPPER_KINDS } from '../BayDesigner';

const nn = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const ri = (v) => Math.max(0, Math.round(nn(v)));
const T = 0.018;                       // board thickness (m)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const PART_LABELS = { carcass: 'Carcass', door: 'Door', drawer: 'Drawer', shelf: 'Shelf', rail: 'Hanging rail', worktop: 'Worktop', upper: 'Upper unit', appliance: 'Appliance', fixture: 'Fixture' };
// parts that can be painted individually (bay.pf[part])
export const PAINT_PARTS = ['carcass', 'door', 'drawer', 'shelf'];

// Finish of a part: bay.pf[part] (letter 'A'|'B'|'C' or { hex, name }) wins over the bay finish.
export function partFinish(fin, b, part) {
  const pf = b && b.pf && b.pf[part];
  if (pf && typeof pf === 'object' && /^#[0-9a-fA-F]{6}$/.test(pf.hex || '')) return { hex: pf.hex, name: pf.name || '' };
  if (typeof pf === 'string' && fin[pf]) return fin[pf];
  return fin[b && b.finish] || fin.A;
}

const CAT_DEFAULT_H = { kitchen: 2.4, tv: 2.4, vanity: 2.0, door: 2.1, storage: 1.8, custom: 1.8, closet: 2.4 };
const CAT_DEFAULT_D = { kitchen: 0.6, tv: 0.4, vanity: 0.5, door: 0.15, storage: 0.45, custom: 0.45, closet: 0.6 };

// Geometry for the whole unit. Returns
// { group, W, H, D, cat, bayGroups[], bayBoxes[] (Box3, unit-local), pivots[], slides[], fronts[], slidePanels[], dispose() }
export function buildBayUnit(THREE, u, o = {}) {
  const bays = (o.bays || u.bays || []).filter(Boolean);
  const cat = unitCat(u, o.cat);
  const fin = finishesOf(u, cat), opts = optsOf(u, cat);
  const cache = o.cache || new Map();
  const std = (key, mk) => { if (!cache.has(key)) cache.set(key, mk()); return cache.get(key); };
  const mStd = (hex, rough, metal) => std('bs|' + hex + '|' + rough + '|' + (metal || 0), () => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal || 0 }));
  const matOf = (b, part) => { const f = partFinish(fin, b, part); return o.matFor ? o.matFor(f.hex, f.name) : mStd(f.hex, 0.6, 0.03); };
  const interiorMat = mStd(o.interiorHex || '#f4f5f7', 0.85, 0.02);
  const steelMat = mStd('#b9bcc2', 0.35, 0.7);
  const alu = mStd('#c4c8ce', 0.35, 0.72);
  const glassMat = std('bglass', () => new THREE.MeshStandardMaterial({ color: 0xbcd4e6, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.32 }));
  const mirrorMat = std('bmirror', () => new THREE.MeshStandardMaterial({ color: 0xdfe7ec, roughness: 0.04, metalness: 0.95 }));
  const darkMat = mStd('#15181b', 0.25, 0.2);
  const ledMat = std('bled', () => new THREE.MeshBasicMaterial({ color: 0xfff1c9 }));
  const glowMat = std('bglow', () => new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.16, depthWrite: false }));

  const bw = bays.map((b) => Math.max(0.05, ri(b.w_mm) / 1000));
  const off = []; let acc = 0; bw.forEach((w) => { off.push(acc); acc += w; });
  const W = acc;
  const H = ri(u.height_mm) / 1000 || CAT_DEFAULT_H[cat] || 2.4;
  const D = ri(u.depth_mm) / 1000 || CAT_DEFAULT_D[cat] || 0.6;

  const group = new THREE.Group();
  const bayGroups = bays.map(() => { const g = new THREE.Group(); group.add(g); return g; });
  const pivots = [], slides = [], fronts = [], slidePanels = [];
  const handleStyleOf = (b) => (b && b.handle) || o.handleStyle || 'bar';

  const add = (parent, geo, mat, x, y, z, pick) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.pick = pick; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const bxIn = (parent, bi, w, h, d, x, y, z, mat, part, n) => add(parent, new THREE.BoxGeometry(Math.max(0.001, w), Math.max(0.001, h), Math.max(0.001, d)), mat, x, y, z, { bay: bi, part, n: n || 0 });
  const bx = (bi, w, h, d, x, y, z, mat, part, n) => bxIn(bayGroups[bi], bi, w, h, d, x, y, z, mat, part, n);

  // carcass: top, bottom, back, right gable (+ left gable on the first bay)
  const carc = (bi, b, x0, x1, y0, y1, dep, o2) => {
    o2 = o2 || {};
    const w = x1 - x0, h = y1 - y0, xc = (x0 + x1) / 2, yc = (y0 + y1) / 2, cm = matOf(b, 'carcass');
    bx(bi, w, T, dep, xc, y1 - T / 2, dep / 2, cm, 'carcass');
    bx(bi, w, T, dep, xc, y0 + T / 2, dep / 2, cm, 'carcass');
    bx(bi, w, h, T, xc, yc, T / 2, o2.backMat || interiorMat, 'carcass');
    bx(bi, T, h, dep, x1 - T / 2, yc, dep / 2, cm, 'carcass');
    if (o2.left) bx(bi, T, h, dep, x0 + T / 2, yc, dep / 2, cm, 'carcass');
  };
  const shelves = (bi, b, x0, x1, ya, yb, n, dep, mat) => {
    const w = x1 - x0 - 2 * T, xc = (x0 + x1) / 2;
    for (let i = 1; i <= n; i++) bx(bi, w, 0.016, dep - T - 0.03, xc, ya + (yb - ya) * i / (n + 1), (dep + T) / 2 - 0.005, mat || matOf(b, 'shelf'), 'shelf', i - 1);
  };
  const rail = (bi, x0, x1, y, dep, n) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, Math.max(0.05, x1 - x0 - 0.06), 12), mStd('#9aa0a6', 0.3, 0.85));
    m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, y, dep * 0.5); m.userData.pick = { bay: bi, part: 'rail', n: n || 0 }; m.castShadow = true; bayGroups[bi].add(m);
  };
  const ledStrip = (bi, x0, x1, y, dep) => {
    bx(bi, Math.max(0.05, x1 - x0 - 0.05), 0.012, 0.02, (x0 + x1) / 2, y - 0.006, dep - 0.06, ledMat, 'fixture');
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.05, x1 - x0 - 0.05), 0.5), glowMat); gl.position.set((x0 + x1) / 2, y - 0.27, T + 0.003); gl.userData.pick = { bay: bi, part: 'fixture', n: 0 }; bayGroups[bi].add(gl);
  };

  // one handle on a pivot-relative leaf (sign = hinge side, lw = leaf width)
  const leafHandle = (pv, bi, b, sign, lw, h, yRel, upper) => {
    const st = handleStyleOf(b); if (st === 'none') return;
    const yh = upper ? -h / 2 + 0.12 : yRel;
    let m;
    if (st === 'knob') { m = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), mStd('#3a3a3e', 0.35, 0.7)); m.position.set(sign * (lw - 0.05), yh, 0.03); }
    else if (st === 'edge') { m = new THREE.Mesh(new THREE.BoxGeometry(0.012, Math.min(0.5, h * 0.6), 0.024), steelMat); m.position.set(sign * (lw - 0.014), yh, 0.016); }
    else if (st === 'lever') { m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.016, 0.022), steelMat); m.position.set(sign * (lw - 0.07), yh, 0.03); }
    else { m = new THREE.Mesh(new THREE.BoxGeometry(0.016, Math.min(0.45, h * 0.35), 0.026), steelMat); m.position.set(sign * (lw - 0.05), yh, 0.03); }
    m.userData.pick = { bay: bi, part: 'door', n: 0 }; m.castShadow = true; pv.add(m);
  };
  // hinged leaves across a bay (1 leaf = hinge by b.swing, 2+ = pairs that meet in the middle)
  const leaves = (bi, b, x0, x1, yb, yt, nLeaf, zFront, o2) => {
    o2 = o2 || {};
    const w = x1 - x0, h = yt - yb, yc = (yb + yt) / 2, lw = w / nLeaf, mat = o2.mat || matOf(b, 'door');
    for (let i = 0; i < nLeaf; i++) {
      const hingeLeft = nLeaf === 1 ? b.swing !== 'right' : i % 2 === 0;
      const sign = hingeLeft ? 1 : -1, xi = x0 + i * lw, px = hingeLeft ? xi : xi + lw;
      const pv = new THREE.Group(); pv.position.set(px, yc, zFront);
      const pick = { bay: bi, part: 'door', n: i };
      if (o2.glass) {
        add(pv, new THREE.BoxGeometry(Math.max(0.02, lw - 0.1), Math.max(0.02, h * 0.985 - 0.1), 0.006), glassMat, sign * lw / 2, 0, 0, pick);
        const fw = 0.045, fh = h * 0.985, ww = lw - 0.004;
        [fh / 2 - fw / 2, -fh / 2 + fw / 2].forEach((yy) => add(pv, new THREE.BoxGeometry(ww, fw, 0.02), mat, sign * lw / 2, yy, 0, pick));
        [-1, 1].forEach((s2) => add(pv, new THREE.BoxGeometry(fw, fh, 0.02), mat, sign * lw / 2 + s2 * (ww / 2 - fw / 2), 0, 0, pick));
      } else add(pv, new THREE.BoxGeometry(Math.max(0.02, lw - 0.004), h * 0.985, 0.018), mat, sign * lw / 2, 0, 0, pick);
      leafHandle(pv, bi, b, sign, lw, h, clamp(1.05 - yc, -h / 2 + 0.1, h / 2 - 0.1), o2.upper);
      pv.userData = { target: 0, curr: 0, sign, axis: 'y', openAngle: -sign * 1.85 };
      bayGroups[bi].add(pv); pivots.push(pv);
    }
  };
  // sliding bypass panels (on two depth planes) in an aluminium track
  const sliding = (bi, b, x0, x1, yb, yt, n, zFront) => {
    const w = x1 - x0, h = yt - yb, yc = (yb + yt) / 2, panels = clamp(n, 1, 4), overlap = panels > 1 ? 0.05 : 0;
    const pw = (w + (panels - 1) * overlap) / panels, mat = matOf(b, 'door');
    [yt - 0.015, yb + 0.015].forEach((ty) => bx(bi, w, 0.03, 0.06, (x0 + x1) / 2, ty, zFront - 0.015, alu, 'fixture'));
    for (let i = 0; i < panels; i++) {
      const baseX = x0 + pw / 2 + i * (pw - overlap), zc = zFront + (i % 2 ? 0.028 : 0);
      const g = new THREE.Group(); const pick = { bay: bi, part: 'door', n: i };
      add(g, new THREE.BoxGeometry(pw - 0.004, h * 0.985, 0.02), mat, 0, 0, 0, pick);
      [-1, 1].forEach((s2) => add(g, new THREE.BoxGeometry(0.03, h * 0.985, 0.024), alu, s2 * (pw / 2 - 0.02), 0, 0.002, pick));
      if (b.handle !== 'none') add(g, new THREE.BoxGeometry(0.014, 0.3, 0.02), steelMat, (i % 2 ? -1 : 1) * (pw / 2 - 0.07), 0, 0.02, pick);
      g.position.set(baseX, yc, zc);
      g.userData = { target: 0, curr: 0, slide: true, dir: (i % 2 ? -1 : 1), baseX, travelX: panels > 1 ? (pw - overlap) * 0.9 : pw * 0.8 };
      bayGroups[bi].add(g); slidePanels.push(g);
    }
  };
  // drawer bank: every drawer is its own group (front + inner box) that slides out
  const drawers = (bi, b, x0, x1, yb, yt, n, dep) => {
    const w = x1 - x0, slotH = (yt - yb) / n, xc = (x0 + x1) / 2, mat = matOf(b, 'drawer'), t2 = 0.016;
    const bmat = mStd('#e9ebee', 0.8, 0);
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(); const pick = { bay: bi, part: 'drawer', n: i };
      const front = add(g, new THREE.BoxGeometry(w - 0.006, slotH - 0.008, 0.018), mat, 0, 0, dep / 2 + 0.004, pick);
      const st = handleStyleOf(b);
      if (st === 'edge') add(g, new THREE.BoxGeometry((w - 0.006) * 0.8, 0.012, 0.022), steelMat, 0, slotH / 2 - 0.016, dep / 2 + 0.016, pick);
      else if (st === 'knob') add(g, new THREE.SphereGeometry(0.014, 10, 10), mStd('#3a3a3e', 0.35, 0.7), 0, 0, dep / 2 + 0.03, pick);
      else if (st !== 'none') add(g, new THREE.BoxGeometry(Math.min(0.2, w * 0.4), 0.018, 0.024), steelMat, 0, 0, dep / 2 + 0.02, pick);
      const boxH = slotH * 0.7, bd = dep - 0.06;
      const dbox = (gw, gh, gd, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), bmat); m.position.set(px, py, pz); m.userData.pick = pick; g.add(m); };
      dbox(w - 2 * t2 - 0.01, t2, bd, 0, -boxH / 2, 0); dbox(w - 2 * t2 - 0.01, boxH, t2, 0, 0, -bd / 2);
      dbox(t2, boxH, bd, -(w - 0.01) / 2 + t2, 0, 0); dbox(t2, boxH, bd, (w - 0.01) / 2 - t2, 0, 0);
      g.position.set(xc, yb + slotH * (i + 0.5), dep / 2 + 0.005);
      g.userData = { target: 0, curr: 0, travel: Math.min(0.42, dep * 0.72), baseZ: dep / 2 + 0.005, _open: false };
      front.userData.isDrawerFront = true; front.userData.slide = g;
      bayGroups[bi].add(g); slides.push(g); fronts.push(front);
    }
  };
  const tap = (bi, cx, topY, zc) => {
    bx(bi, 0.026, 0.2, 0.026, cx, topY + 0.1, zc - 0.12, steelMat, 'fixture');
    bx(bi, 0.022, 0.022, 0.14, cx, topY + 0.2, zc - 0.05, steelMat, 'fixture');
  };
  const wallUnit = (bi, b, x0, x1, yb, yt, type) => {
    const w = x1 - x0, dep = 0.35;
    if (type === 'hood') {
      const xc = (x0 + x1) / 2, cw = w * 0.9, canopyH = 0.18;
      const cn = new THREE.Mesh(new THREE.CylinderGeometry(cw * 0.3, cw * 0.52, canopyH, 4), mStd('#d0d4d9', 0.34, 0.62)); cn.rotation.y = Math.PI / 4; cn.position.set(xc, yb + 0.1 + canopyH / 2, 0.25); cn.userData.pick = { bay: bi, part: 'upper', n: 0 }; cn.castShadow = true; bayGroups[bi].add(cn);
      bx(bi, cw * 0.34, Math.max(0.1, yt - yb - 0.1 - canopyH), 0.2, xc, yb + 0.1 + canopyH + Math.max(0.1, yt - yb - 0.1 - canopyH) / 2, 0.12, mStd('#d0d4d9', 0.34, 0.62), 'upper');
      return;
    }
    carc(bi, b, x0, x1, yb, yt, dep, { left: false });
    if (type === 'open') shelves(bi, b, x0, x1, yb, yt, 2, dep);
    else leaves(bi, b, x0, x1, yb, yt, b.kind === 'wall_doors' ? Math.max(1, ri(b.leaves)) : Math.max(1, Math.ceil(w * 1000 / 600)), dep + 0.012, { upper: true });
    if (b.led) bx(bi, Math.max(0.05, w - 0.04), 0.012, 0.03, (x0 + x1) / 2, yb - 0.008, dep - 0.05, ledMat, 'fixture');
  };

  // ── per-bay construction ────────────────────────────────────────────────
  bays.forEach((b, bi) => {
    try {
      const x0 = off[bi], x1 = x0 + bw[bi], w = bw[bi], xc = (x0 + x1) / 2;
      const kind = b.kind, lv = ri(b.leaves), dr = ri(b.drawers), sh = ri(b.shelves), left = bi === 0;
      if (cat === 'door') {
        const thk = (ri(opts.door_thk) || 40) / 1000, sw = kind === 'sliding_leaf' ? 'sliding' : (b.swing || 'left');
        const mat = matOf(b, 'door');
        if (sw === 'sliding') {
          bx(bi, w, 0.03, 0.06, xc, H + 0.015, D / 2, alu, 'fixture');
          const g = new THREE.Group(); const pick = { bay: bi, part: 'door', n: 0 };
          add(g, new THREE.BoxGeometry(w - 0.004, H, thk), mat, 0, 0, 0, pick);
          if (b.handle !== 'none') add(g, new THREE.BoxGeometry(0.014, 0.3, 0.02), steelMat, w / 2 - 0.07, 0, thk / 2 + 0.01, pick);
          g.position.set(xc, H / 2, D / 2); g.userData = { target: 0, curr: 0, slide: true, dir: bi % 2 ? -1 : 1, baseX: xc, travelX: w * 0.8 };
          bayGroups[bi].add(g); slidePanels.push(g);
        } else {
          const sign = sw === 'right' ? -1 : 1, pick = { bay: bi, part: 'door', n: 0 };
          const pv = new THREE.Group(); pv.position.set(sign === 1 ? x0 : x1, H / 2, D / 2);
          if (kind === 'glass_door') {
            add(pv, new THREE.BoxGeometry(w - 0.3, H - 0.4, 0.008), glassMat, sign * w / 2, 0, 0, pick);
            const fw = 0.11;
            add(pv, new THREE.BoxGeometry(w - 0.004, fw, thk), mat, sign * w / 2, H / 2 - fw / 2, 0, pick); add(pv, new THREE.BoxGeometry(w - 0.004, 0.22, thk), mat, sign * w / 2, -H / 2 + 0.11, 0, pick);
            [-1, 1].forEach((s2) => add(pv, new THREE.BoxGeometry(fw, H, thk), mat, sign * w / 2 + s2 * (w / 2 - fw / 2), 0, 0, pick));
          } else {
            add(pv, new THREE.BoxGeometry(w - 0.004, H, thk), mat, sign * w / 2, 0, 0, pick);
            if (kind === 'panel_door') {
              const cols = w > 0.5 ? 2 : 1, pw = (w - 0.22 - (cols - 1) * 0.08) / cols, pm = mStd(partFinish(fin, b, 'door').hex, 0.6, 0.03);
              [0.27, -0.27].forEach((fy) => { for (let c = 0; c < cols; c++) add(pv, new THREE.BoxGeometry(Math.max(0.05, pw), H * 0.4, 0.008), pm, sign * (0.11 + pw / 2 + c * (pw + 0.08)), fy * H, thk / 2 + 0.003, pick); });
            }
          }
          const hs = b.handle || 'lever';
          if (hs !== 'none') add(pv, new THREE.BoxGeometry(hs === 'knob' ? 0.03 : 0.13, 0.018, 0.03), steelMat, sign * (w - 0.07), 0, thk / 2 + 0.02, pick);
          pv.userData = { target: 0, curr: 0, sign, axis: 'y', openAngle: -sign * 1.6 };
          bayGroups[bi].add(pv); pivots.push(pv);
        }
        return;
      }

      if (cat === 'kitchen') {
        const PL = 0.1, BT = 0.82, WTK = opts.worktop ? 0.04 : 0, WB = 1.45, WTOP = Math.max(WB + 0.4, Math.min(2.2, H - 0.05));
        const Hd = Math.max(H, 0.9);
        if (kind === 'appliance_tall') {
          const fridge = b.appliance === 'fridge';
          carc(bi, b, x0, x1, 0, Hd, D, { left });
          const fm = mStd('#969ca3', 0.3, 0.75), fw = w - 0.04;
          if (fridge) {
            const topCab = Hd > 2.25 ? Hd - 0.35 : Hd, split = PL + (topCab - PL) * 0.36;
            [[PL + 0.004, split - 0.002], [split + 0.002, topCab - 0.004]].forEach(([a, c], k) => bx(bi, fw, c - a, 0.022, xc, (a + c) / 2, D + 0.012, fm, 'appliance', k));
            bx(bi, 0.022, Math.min(0.9, (topCab - split) * 0.5), 0.03, x1 - 0.06, split + 0.08 + Math.min(0.9, (topCab - split) * 0.5) / 2, D + 0.035, mStd('#60666d', 0.25, 0.85), 'appliance', 2);
            if (topCab < Hd) leaves(bi, b, x0, x1, topCab, Hd, 1, D + 0.012);
          } else {
            drawers(bi, b, x0, x1, PL, 0.72, 2, D);
            bx(bi, fw, 0.57, 0.022, xc, 1.005, D + 0.012, fm, 'appliance', 0);
            bx(bi, fw - 0.1, 0.38, 0.026, xc, 1.0, D + 0.02, darkMat, 'appliance', 1);
            bx(bi, fw, 0.18, 0.022, xc, 1.38, D + 0.012, mStd('#2b2e33', 0.3, 0.3), 'appliance', 2);
            leaves(bi, b, x0, x1, 1.47, Hd, 1, D + 0.012);
          }
        } else if (kind === 'wall_doors') {
          wallUnit(bi, b, x0, x1, WB, WTOP, 'doors');
        } else {
          bx(bi, w, PL, D - 0.05, xc, PL / 2, (D - 0.05) / 2 + 0.03, mStd(fin.C.hex, 0.7, 0.05), 'carcass');
          carc(bi, b, x0, x1, PL, BT, D, { left });
          if (kind === 'base_drawers' || kind === 'hob') drawers(bi, b, x0, x1, PL + T, BT - T, Math.min(6, dr || 3), D);
          else if (kind === 'open_niche') shelves(bi, b, x0, x1, PL, BT, Math.max(1, sh || 2), D);
          else {
            if (sh > 0) shelves(bi, b, x0, x1, PL, BT, sh, D);
            leaves(bi, b, x0, x1, PL, BT, lv || (w > 0.6 ? 2 : 1), D + 0.012);
          }
          if (WTK) {
            const wf = fin[opts.worktop_finish] || fin.C;
            const wm = o.worktopMat ? o.worktopMat(wf.hex, wf.name) : (o.matFor ? o.matFor(wf.hex, wf.name) : mStd(wf.hex, 0.3, 0.05));
            bx(bi, w, WTK, D + 0.03, xc, BT + WTK / 2, (D + 0.03) / 2, wm, 'worktop');
          }
          const topY = BT + WTK;
          if (kind === 'sink') {
            const bwid = Math.min(0.56, Math.max(0.3, w - 0.16)), bdp = Math.min(0.42, Math.max(0.26, D - 0.14));
            bx(bi, bwid, 0.014, bdp, xc, topY + 0.007, D * 0.5, steelMat, 'fixture');
            bx(bi, bwid - 0.07, 0.004, bdp - 0.07, xc, topY + 0.016, D * 0.5, darkMat, 'fixture');
            tap(bi, xc, topY, D * 0.5 + bdp * 0.36 + 0.12);
          }
          if (kind === 'hob') {
            const pw = Math.min(0.56, w - 0.08), pd = Math.min(0.5, D - 0.06);
            bx(bi, pw, 0.012, pd, xc, topY + 0.006, D / 2, darkMat, 'fixture');
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const c = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), mStd('#33373b', 0.5, 0)); c.rotation.x = -Math.PI / 2; c.position.set(xc + sx * (pw / 2 - 0.09), topY + 0.013, D / 2 + sz * (pd / 2 - 0.09)); c.userData.pick = { bay: bi, part: 'fixture', n: 0 }; bayGroups[bi].add(c); });
          }
          if (UPPER_KINDS.includes(kind) && b.upper && b.upper !== 'none') wallUnit(bi, b, x0, x1, WB, WTOP, b.upper);
          if (b.led) ledStrip(bi, x0, x1, BT - T, D);
        }
        return;
      }

      if (cat === 'tv') {
        const gap = opts.mount === 'floor' ? 0 : 0.15, bt = gap + 0.45, Hd = Math.max(H, 0.9);
        const bm = matOf({ ...b, finish: 'B', pf: null }, 'carcass');
        if (kind === 'tall_doors') {
          carc(bi, b, x0, x1, gap, Hd, D, { left }); shelves(bi, b, x0, x1, gap, Hd, Math.max(1, sh || 3), D); leaves(bi, b, x0, x1, gap, Hd, lv || 1, D + 0.012);
        } else if (kind === 'open_niche') {
          carc(bi, b, x0, x1, gap, Hd, D, { left, backMat: bm }); shelves(bi, b, x0, x1, gap, Hd, Math.max(1, sh || 4), D);
        } else {
          if (kind === 'tv_niche') {
            bx(bi, w, Hd - bt, T, xc, (bt + Hd) / 2, T / 2, bm, 'carcass');
            bx(bi, w, 0.022, D, xc, Hd - 0.011, D / 2, matOf(b, 'carcass'), 'carcass');
            if (left) bx(bi, T, Hd - bt, D, x0 + T / 2, (bt + Hd) / 2, D / 2, matOf(b, 'carcass'), 'carcass');
            bx(bi, T, Hd - bt, D, x1 - T / 2, (bt + Hd) / 2, D / 2, matOf(b, 'carcass'), 'carcass');
            const tw = clamp((ri(opts.tvWidth_mm) || 1450) / 1000, 0.2, Math.max(0.2, w - 0.08)), th = tw * 0.5625, cy = bt + (Hd - bt) * 0.52;
            const ty = clamp(cy, bt + 0.12 + th / 2, Math.max(bt + 0.12 + th / 2, Hd - 0.1 - th / 2));
            bx(bi, tw, th, 0.04, xc, ty, 0.08, darkMat, 'appliance', 0);
            bx(bi, tw - 0.02, th - 0.02, 0.004, xc, ty, 0.102, mStd('#0d1015', 0.1, 0.4), 'appliance', 1);
          }
          carc(bi, b, x0, x1, gap, bt, D, { left });
          if (dr > 0 && lv === 0) drawers(bi, b, x0, x1, gap + T, bt - T, Math.min(6, dr), D);
          else leaves(bi, b, x0, x1, gap, bt, Math.max(1, lv || 1), D + 0.012);
        }
        if (b.led) ledStrip(bi, x0, x1, Hd - 0.02, D);
        return;
      }

      if (cat === 'vanity') {
        const floor = opts.mount === 'floor', bodyB = floor ? 0.1 : 0.3, ct = 0.82, cth = 0.03;
        const isMirrorOnly = kind === 'mirror';
        const up = isMirrorOnly ? 'mirror_cab' : (UPPER_KINDS.includes(kind) ? (b.upper || 'none') : 'none');
        if (!isMirrorOnly) {
          if (floor) bx(bi, w, bodyB, D - 0.05, xc, bodyB / 2, (D - 0.05) / 2 + 0.03, mStd(fin.C.hex, 0.7, 0.05), 'carcass');
          carc(bi, b, x0, x1, bodyB, ct, D, { left });
          if (kind === 'base_drawers') drawers(bi, b, x0, x1, bodyB + T, ct - T, Math.min(5, dr || 2), D);
          else if (kind === 'open_niche') shelves(bi, b, x0, x1, bodyB, ct, Math.max(1, sh || 2), D);
          else leaves(bi, b, x0, x1, bodyB, ct, lv || (w > 0.6 ? 2 : 1), D + 0.012);
          const cf = fin[opts.counter_finish] || fin.A, cmat = o.matFor ? o.matFor(cf.hex, cf.name) : mStd(cf.hex, 0.3, 0.05);
          bx(bi, w, cth, D + 0.02, xc, ct + cth / 2, (D + 0.02) / 2, cmat, 'worktop');
          if (kind === 'sink' && opts.basin) {
            const rad = Math.min(0.21, Math.max(0.13, (w - 0.2) / 2));
            if (opts.basin_type === 'undermount') bx(bi, rad * 2, 0.008, rad * 1.6, xc, ct + cth + 0.004, D / 2, mStd('#e3e1da', 0.3, 0.05), 'fixture');
            else { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.82, 0.12, 30), mStd('#ffffff', 0.22, 0.02)); bowl.position.set(xc, ct + cth + 0.06, D / 2); bowl.userData.pick = { bay: bi, part: 'fixture', n: 0 }; bowl.castShadow = true; bayGroups[bi].add(bowl); }
            tap(bi, xc, ct + cth + (opts.basin_type === 'undermount' ? 0 : 0.0), D / 2 + 0.2);
          }
          if (b.led) ledStrip(bi, x0, x1, ct - T, D);
        }
        if (up !== 'none') {
          const mb0 = opts.basin && opts.basin_type !== 'undermount' ? 1.25 : 1.1, mt = Math.min(H - 0.05, mb0 + 0.8), mb = Math.min(mb0, mt - 0.3);
          if (up === 'mirror') bx(bi, w - 0.024, mt - mb, 0.012, xc, (mb + mt) / 2, 0.03, mirrorMat, 'upper');
          else { carc(bi, b, x0, x1, mb, mt, 0.15, { left: false }); leaves(bi, b, x0, x1, mb, mt, Math.max(1, Math.round(w / 0.6)), 0.162, { mat: mirrorMat, upper: true }); }
        }
        return;
      }

      // closet / storage / custom (and any unknown category) — generic wardrobe module
      carc(bi, b, x0, x1, 0, H, D, { left });
      const in0 = T, in1 = H - T; let bottom = in0, top = in1;
      if (dr > 0) { const region = Math.min((in1 - in0) * 0.55, dr * 0.21); drawers(bi, b, x0, x1, in0, in0 + region, Math.min(8, dr), D); bottom = in0 + region; }
      const nR = ri(b.rails), tiers = nR > 0 ? (b.hang_double || nR > 1 ? 2 : 1) : 0;
      for (let t = 0, k = 0; t < tiers && top - 0.1 > bottom; t++) {
        const tierH = clamp((top - bottom) / tiers, 0.35, 1.05);
        if (t > 0) shelves(bi, b, x0, x1, top - 0.0005, top + 0.0005, 1, D);   // shelf capping the lower tier
        rail(bi, x0, x1, top - 0.06, D, k++); top -= tierH;
      }
      if (sh > 0 && top - bottom > 0.12) shelves(bi, b, x0, x1, bottom, top, sh, D);
      if (b.led) ledStrip(bi, x0, x1, in1, D);
      if (lv > 0) {
        if (u.sliding || kind === 'sliding_leaf') sliding(bi, b, x0, x1, 0, H, lv, D + 0.012);
        else leaves(bi, b, x0, x1, 0, H, lv, D + 0.012, { glass: kind === 'glass_doors' });
      }
    } catch (e) { /* one bad bay must never blank the whole unit */ }
  });

  // door frame + architrave (unit level, bay -1)
  if (cat === 'door' && opts.frame) {
    try {
      const ff = fin[opts.frame_finish] || fin.B, fm = o.matFor ? o.matFor(ff.hex, ff.name) : mStd(ff.hex, 0.55, 0.03), fr = 0.045;
      bxIn(group, -1, fr, H + fr, D, -fr / 2, (H + fr) / 2, D / 2, fm, 'carcass'); bxIn(group, -1, fr, H + fr, D, W + fr / 2, (H + fr) / 2, D / 2, fm, 'carcass');
      bxIn(group, -1, W + 2 * fr, fr, D, W / 2, H + fr / 2, D / 2, fm, 'carcass');
    } catch (e) { /* cosmetic */ }
  }

  group.updateMatrixWorld(true);
  const bayBoxes = bayGroups.map((g) => new THREE.Box3().setFromObject(g));
  const total = new THREE.Box3().setFromObject(group);
  const dispose = () => { group.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); };
  return { group, W, H: Math.max(H, total.max.y), Hnom: H, Dnom: D, D, cat, bayGroups, bayBoxes, bounds: total, pivots, slides, fronts, slidePanels, dispose };
}
