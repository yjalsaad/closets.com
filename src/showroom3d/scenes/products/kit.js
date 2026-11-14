/* The "kit": factories that build the MOVING parts of a product from separate meshes (drawers on slides, hinged doors, sliding leaves, pivot
 * doors), LED strips with additive wash, static-geometry merging and baked contact shadows. Pure three.js; a product module (kitchen.js,
 * wardrobe.js, door.js) calls these and gets back one object with update(). Product frame: +X toward the visitor, Y up, wall at x = -3. */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep, aoQuad, mergeAo } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { washTexture, poolTexture, contactShadowTexture } from '../../3d/pbr';
import { createProductState } from '../../products/animation';
import { stateDef, PRODUCTS } from '../../products/catalog';
import { defaultFinish, finishIds } from '../../products/finishes';
import { applyFinish } from './materials';

const _wash = { v: null, p: null };

/** merge non-indexed geometries keeping the baked vertex colours (reeded panels carry groove darkening in `color`); missing colours are white */
function mergeKeepColor(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3).fill(1); let o = 0;
  for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); if (g.attributes.color && g.attributes.color.itemSize === 3) col.set(g.attributes.color.array, o * 3); o += c; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); return m;
}
const FAR_NAMES = /:(front|pull|leaf|frame)$/;

export function createKit({ product, M, tier, registry, reduced = false }) {
  const group = new THREE.Group(); group.name = 'product-' + product;
  const state = createProductState(stateDef(product, finishIds(product)), { reduced });
  const updaters = [];                    // (state) => void, run when anything changed
  const statics = new Map();              // material -> [geometry]
  const lod = { detail: new THREE.Group(), props: new THREE.Group() };          // hidden when the visitor is far away (draw-call saving)
  lod.detail.name = 'lod-detail'; lod.props.name = 'lod-props'; group.add(lod.detail, lod.props);
  const washTex = _wash.v || (_wash.v = washTexture()), poolTex = _wash.p || (_wash.p = poolTexture());
  const aoList = [];
  const ledMats = [];                      // every emissive material created here (disposed with the product)
  const accents = [];                       // merged accent LEDs (see led())
  const partGroups = [];                   // top-level groups of every moving part (drawers, doors, sliders, tilting shelves)
  const far = { group: new THREE.Group(), on: false };   // far-away proxy: the CLOSED fronts merged per material (a handful of draw calls instead of two per part)
  far.group.name = 'far-proxy'; far.group.visible = false; group.add(far.group);

  // the five Phase 5b departments are built against x = -3.0 (the wall plane); the hall's wall slats stand 0.095 m proud of it, so those products sit 0.11 m forward
  const wallShift = ['bedroom', 'walkin', 'living', 'studio', 'lounge'].includes(product) ? 0.11 : 0;
  const kit = {
    product, group, state, wallShift, far, M, tier, registry, lod, updaters,
    /** collect a placed geometry into the merged static mesh of `mat` */
    addStatic(geo, mat) { if (!statics.has(mat)) statics.set(mat, []); statics.get(mat).push(prep(geo)); },
    /** merge the collected statics into one mesh per material; call once at the end of a product build */
    /** queue a baked-AO decal (see builders.aoQuad); they are merged into ONE transparent mesh at flush time */
    ao(c, u, v, w, h, dark = '-v', strength = 0.5) { aoList.push(aoQuad(c, u, v, w, h, dark, strength)); },
    /** polished stone floor zone of this bay (product frame: x -2.7..2.7, z -3.1..3.1) */
    floor(w = 5.4, d = 6.2) {
      const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.4 + 0.3, p.getZ(i) / 2.4 + 0.7);
      const m = new THREE.Mesh(g, M.floorBay[product]); m.position.set(0, 0.009, 0); m.receiveShadow = true; m.name = 'bay-floor'; group.add(m); return m;
    },
    flushStatics({ cast = true, receive = true, into = group } = {}) {
      if (aoList.length) { const m = new THREE.Mesh(mergeAo(aoList), M.ao); m.renderOrder = 3; m.frustumCulled = false; m.name = 'ao-decals'; into.add(m); aoList.length = 0; }
      for (const [mat, list] of statics) {
        const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; m.name = 'static'; m.matrixAutoUpdate = false; m.updateMatrix(); into.add(m);
      }
      statics.clear(); kit._dirty = true; kit.buildFar(); kit.buildAccents(into);      // run every updater once so closed drawers / tilting shelves hide their contents from the first frame
    },
    /** build the merged accent-LED meshes: strips (opaque emissive) + washes (additive), both with per-vertex colour = base colour x current level */
    buildAccents(into = group) {
      if (!accents.length || kit._accent) return;
      const parts = [], washes = []; const baseS = new THREE.Color(M.ledWarm().color), baseW = new THREE.Color(0xfff0dd);
      for (const e of accents) {
        e.parent.updateMatrixWorld(true); const m = e.parent.matrixWorld;
        const s = prep(e.strip.applyMatrix4(m)); parts.push({ geo: s, e, kind: 's' });
        if (e.wash) { const w = prep(e.wash.applyMatrix4(m)); washes.push({ geo: w, e, kind: 'w' }); }
      }
      const build = (list, mat) => { let n = 0; for (const it of list) { it.start = n; n += it.geo.attributes.position.count; it.n = it.geo.attributes.position.count; } const g = mergeGeometries(list.map((it) => it.geo)); const col = new Float32Array(n * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.name = 'accent-leds'; into.add(mesh); return { col, mesh, attr: g.attributes.color }; };
      const sMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), wMat = new THREE.MeshBasicMaterial({ map: washTex, vertexColors: true, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      ledMats.push(sMat, wMat); const S = build(parts, sMat), W = washes.length ? build(washes, wMat) : null; if (W) W.mesh.renderOrder = 4;
      kit._accent = true;
      const apply = () => {
        for (const it of parts) { const k = Math.max(0, Math.min(1, it.e.levelOf(state))), f = 0.03 + 0.97 * k; for (let i = 0; i < it.n; i++) { const o = (it.start + i) * 3; S.col[o] = baseS.r * f; S.col[o + 1] = baseS.g * f; S.col[o + 2] = baseS.b * f; } }
        S.attr.needsUpdate = true;
        if (W) { for (const it of washes) { const k = Math.max(0, Math.min(1, it.e.levelOf(state))), f = k * 0.9 * it.e.intensity * 0.6; for (let i = 0; i < it.n; i++) { const o = (it.start + i) * 3; W.col[o] = baseW.r * f; W.col[o + 1] = baseW.g * f; W.col[o + 2] = baseW.b * f; } } W.attr.needsUpdate = true; }
      };
      updaters.push(apply); apply();
    },
    /** merge the closed fronts of every moving part into the far proxy (one mesh per material). Called by flushStatics at the end of a build. */
    buildFar() {
      if (far.built || !partGroups.length) return; far.built = true; group.updateMatrixWorld(true);
      const by = new Map();
      for (const pg of partGroups) pg.traverse((m) => { if (!m.isMesh || !FAR_NAMES.test(m.name || '')) return; const g = m.geometry.clone().applyMatrix4(m.matrixWorld); const k = m.material; if (!by.has(k)) by.set(k, []); by.get(k).push(prep(g)); });
      for (const [mat, list] of by) { const mm = new THREE.Mesh(mergeKeepColor(list), mat); mm.castShadow = false; mm.receiveShadow = true; mm.matrixAutoUpdate = false; mm.name = 'far-fronts'; far.group.add(mm); }
    },
    /** far = the visitor is a long way off: draw the merged closed fronts instead of every part, unless something is open */
    setFar(v) {
      const showReal = !v || state.anyOpen(); far.on = v;
      if (far.lastReal === showReal) return; far.lastReal = showReal;
      for (const g of partGroups) g.visible = showReal; far.group.visible = !showReal && far.group.children.length > 0;
    },
    /** far products stop casting shadows (the sun and key-light shadow passes only need what is near the visitor): casters are collected once, toggled on distance changes */
    setCasting(on) {
      if (!far.casters) { far.casters = []; group.traverse((m) => { if (m.isMesh && m.castShadow && !(m.parent === far.group)) far.casters.push(m); }); }
      if (far.casting === on) return; far.casting = on; for (const m of far.casters) m.castShadow = on;
    },
    mesh(geo, mat, { x = 0, y = 0, z = 0, cast = true, receive = true, parent = group, name } = {}) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive; if (name) m.name = name; parent.add(m); return m;
    },

    /**
     * an emissive strip + soft additive wash. `levelOf(state)` returns 0..1; the strip switches itself off (visible = false) at ~0.
     * dir: orientation of the wash plane: 'down' (hangs under a unit, washes the worktop / splashback), 'side' (vertical strip lighting an interior), 'up'.
     */
    led({ x, y, z, len, thick = 0.012, axis = 'z', washW = 0.5, washL, washDir = 'x', parent = group, levelOf, intensity = 1, washPlane = null }) {
      // an LED that follows only the LED switch ("accent": cove, under-cabinet, plinth, wall wash) is merged with all the others into ONE strip mesh and ONE wash mesh
      // (vertex colours carry the level), so a whole department costs two draw calls for its lighting instead of two per strip. Part-driven LEDs (inside drawers / doors) stay separate.
      const probe = (a, l) => levelOf({ accentLevel: () => a, ledLevel: () => l, part: () => ({ value: l }) });
      let accent = false; try { accent = probe(1, 0) !== probe(0, 0) && probe(0, 1) === probe(0, 0); } catch (e) { accent = false; }
      if (accent && parent !== undefined) {
        const sx = axis === 'x' ? len : thick, sy = axis === 'y' ? len : 0.006, sz = axis === 'z' ? len : thick;
        const e = { parent, strip: new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), wash: null, levelOf, intensity };
        if (washPlane) { const pg = new THREE.PlaneGeometry(washPlane.w, washPlane.h); pg.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...washPlane.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(washPlane.rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1))); e.wash = pg; }
        accents.push(e); return { strip: null, wash: null, apply() {}, merged: true };
      }
      const mat = M.ledWarm(); ledMats.push(mat);
      const sx = axis === 'x' ? len : thick, sy = axis === 'y' ? len : 0.006, sz = axis === 'z' ? len : thick;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); strip.position.set(x, y, z); parent.add(strip);
      let wash = null, wmat = null;
      if (washPlane) {
        wmat = M.wash(washTex, 0.9 * intensity); ledMats.push(wmat);
        wash = new THREE.Mesh(new THREE.PlaneGeometry(washPlane.w, washPlane.h), wmat);
        wash.position.set(...washPlane.pos); wash.rotation.set(...(washPlane.rot || [0, 0, 0])); wash.renderOrder = 4; parent.add(wash);
      }
      const base = new THREE.Color(mat.color);
      const apply = () => {
        const k = Math.max(0, Math.min(1, levelOf(state)));
        strip.visible = k > 0.01; mat.color.copy(base).multiplyScalar(k);
        if (wash) { wash.visible = k > 0.01; wmat.opacity = k; }
      };
      updaters.push(apply); apply();
      return { strip, wash, apply };
    },

    /**
     * a drawer: front panel (bevelled, grain along the width) on a body that slides out along +X. Origin = centre of the CLOSED front face
     * plane. The slides are two thin steel runners. `pull`: 'finger' adds a slim brass L-profile on the top edge.
     */
    drawer({ id, x, y, z, w, h, depth = 0.5, travel = 0.42, t = 0.019, grainOff = [0, 0], pull = 'finger', led = true, organiser = true, frontMat, metalMat, bodyMat, parent = group, partLabel }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); partGroups.push(g);
      const front = new THREE.Mesh(bevelBox(t, h, w, { grain: 'z', tile: 0.8, off: grainOff }), frontMat); front.castShadow = front.receiveShadow = true; front.name = id + ':front'; g.add(front);
      const hit = [front];
      if (pull === 'finger') {
        const pg = prep(placed(bevelBox(0.004, 0.017, w - 0.006, { b: 0.0008 }), { x: t / 2 + 0.001, y: h / 2 - 0.0105 }));
        const fl = prep(placed(bevelBox(0.026, 0.004, w - 0.006, { b: 0.0008 }), { x: t / 2 - 0.011, y: h / 2 - 0.003 }));
        const pm = new THREE.Mesh(mergeGeometries([pg, fl]), metalMat); pm.castShadow = true; pm.name = id + ':pull'; g.add(pm); hit.push(pm);
      }
      // body: two sides, back, bottom (one merged mesh) behind the front; interior timber
      const bw = w - 0.052, bh = Math.max(0.1, h - 0.07), bt = 0.014, by = -h / 2 + 0.035 + bh / 2 - 0.005;
      const parts = [
        placed(bevelBox(depth, bh, bt, { b: 0.0008, grain: 'x', off: [0.3, 0] }), { x: -t / 2 - depth / 2, y: by, z: -bw / 2 }),
        placed(bevelBox(depth, bh, bt, { b: 0.0008, grain: 'x', off: [0.5, 0] }), { x: -t / 2 - depth / 2, y: by, z: bw / 2 }),
        placed(bevelBox(bt, bh, bw, { b: 0.0008, grain: 'z', off: [0.1, 0] }), { x: -t / 2 - depth, y: by }),
        placed(bevelBox(depth, bt, bw, { b: 0.0008, grain: 'x', off: [0.7, 0] }), { x: -t / 2 - depth / 2, y: by - bh / 2 + bt / 2 }),
        placed(bevelBox(bt, bh, bw, { b: 0.0008, grain: 'z', off: [0.9, 0] }), { x: -t / 2 - 0.004, y: by }),
      ];
      // organiser inserts: a tray divider across the drawer and (in the wide ones) two long dividers, so an open drawer reads as a used drawer
      if (organiser && w > 0.5) { parts.push(placed(bevelBox(0.008, bh * 0.62, bw - 0.02, { b: 0.0006 }), { x: -t / 2 - depth * 0.38, y: by - bh * 0.19 })); if (w > 0.8) for (const f of [-1, 1]) parts.push(placed(bevelBox(depth * 0.7, bh * 0.55, 0.008, { b: 0.0006 }), { x: -t / 2 - depth * 0.68, y: by - bh * 0.22, z: f * bw * 0.17 })); }
      parts.forEach((g, i) => { parts[i] = prep(g); });
      const body = new THREE.Mesh(mergeGeometries(parts), bodyMat); body.castShadow = body.receiveShadow = true; body.name = id + ':body'; g.add(body);
      if (led) {
        kit.led({ x: -t / 2 - 0.03, y: by + bh / 2 - 0.004, z: 0, len: bw - 0.02, axis: 'z', parent: g, levelOf: (s) => s.ledLevel(id) * 0.95,
          washPlane: { w: bw, h: depth * 0.9, pos: [-t / 2 - depth / 2, by - bh / 2 + bt + 0.004, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
      }
      // a closed drawer's body and contents are hidden behind its front: not drawing them saves a draw call (and a shadow caster) per drawer
      const inner = g.userData.inner = [];
      const apply = () => { const v = state.part(id).value, open = v > 0.002; g.position.x = x + travel * v; body.visible = open; for (const m of inner) m.visible = open; };
      updaters.push(apply); apply();
      registry.register({ id, product, kind: PRODUCTS[product].parts.find((p) => p.id === id).kind, label: PRODUCTS[product].parts.find((p) => p.id === id).label, hit, object: g });
      return g;
    },

    /**
     * a hinged leaf. Origin = the hinge axis (vertical). side +1: the leaf extends toward +Z from the axis, -1 toward -Z. It swings toward +X.
     * glass: use a thin bronze frame + glass pane instead of a solid slab.
     */
    hinged({ id, x, y, z, w, h, t = 0.019, side = 1, maxDeg = 108, grainOff = [0, 0], pull = 'finger', fluted = false, glass = false, frontMat, flutedMat = null, metalMat, glassMat, parent = group, grain = 'y', hingeMat = null, hingeY = [0.18, null] }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); partGroups.push(g);
      const hit = [];
      if (glass) {
        const fr = 0.028, parts = [
          placed(bevelBox(t, h, fr, { b: 0.0008 }), { y: 0, z: side * fr / 2 }), placed(bevelBox(t, h, fr, { b: 0.0008 }), { z: side * (w - fr / 2) }),
          placed(bevelBox(t, fr, w, { b: 0.0008 }), { y: h / 2 - fr / 2, z: side * w / 2 }), placed(bevelBox(t, fr, w, { b: 0.0008 }), { y: -h / 2 + fr / 2, z: side * w / 2 }),
        ].map(prep);
        const frame = new THREE.Mesh(mergeGeometries(parts), metalMat); frame.castShadow = true; frame.name = id + ':frame'; g.add(frame); hit.push(frame);
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.006, h - 2 * fr + 0.004, w - 2 * fr + 0.004), glassMat); pane.position.set(0, 0, side * w / 2); pane.renderOrder = 6; pane.name = id + ':glass'; g.add(pane); hit.push(pane);
      } else {
        const geo = fluted ? flutedPanel(w, h, t, { pitch: 0.038, relief: 0.011, off: grainOff }) : bevelBox(w, h, t, { grain, off: grainOff });
        // panels are built with thickness along Z: rotate into the product frame (thickness along X)
        geo.rotateY(Math.PI / 2); geo.translate(0, 0, side * w / 2);
        const leaf = new THREE.Mesh(geo, fluted && flutedMat ? flutedMat : frontMat); leaf.castShadow = leaf.receiveShadow = true; leaf.name = id + ':leaf'; g.add(leaf); hit.push(leaf);
      }
      if (pull === 'finger') {
        const bar = placed(bevelBox(0.016, h - 0.5, 0.018, { b: 0.0008 }), { x: t / 2 + 0.008, y: 0, z: side * (w - 0.05) });
        const pm = new THREE.Mesh(prep(bar), metalMat); pm.castShadow = true; pm.name = id + ':pull'; g.add(pm); hit.push(pm);
      }
      if (hingeMat) {                     // concealed-hinge cups on the inside face (visible once the door is open)
        const cups = [];
        for (const hy of [-h / 2 + 0.12, h / 2 - 0.12]) cups.push(prep(placed(new THREE.CylinderGeometry(0.0175, 0.0175, 0.012, 14), { x: -t / 2 - 0.004, y: hy, z: side * 0.022, rz: Math.PI / 2 })), prep(placed(new THREE.BoxGeometry(0.01, 0.03, 0.05), { x: -t / 2 - 0.008, y: hy, z: side * 0.01 })));
        const hm = new THREE.Mesh(mergeGeometries(cups), hingeMat); hm.name = id + ':hinge'; g.add(hm);
      }
      const apply = () => { g.rotation.y = side * (maxDeg * Math.PI / 180) * state.part(id).value; };
      updaters.push(apply); apply();
      return { group: g, hit };
    },

    /** two hinged leaves that share ONE part id (a double door): left hinge at z0 (opens toward +z), right hinge at z1 (opens toward -z). Registers once for picking. */
    doorPair({ id, x, y, z0, z1, w, h, hingeMat = null, ...o }) {
      const a = kit.hinged({ id, x, y, z: z0, w, h, side: 1, hingeMat, ...o }), b = kit.hinged({ id, x, y, z: z1, w, h, side: -1, hingeMat, ...o });
      registry.register({ id, product, kind: 'door', label: PRODUCTS[product].parts.find((p) => p.id === id).label, hit: [...a.hit, ...b.hit], object: a.group });
      registry.get(id).objects = [a.group, b.group];
      return { a, b, groups: [a.group, b.group] };
    },

    /**
     * a tilting shelf: a front panel hinged at its BOTTOM edge that folds outward (top toward +X) so its inner face turns up and shows what is
     * stored on it. Origin = the hinge axis (z centre). Put the stored items in `group` in panel coordinates: the inner face is the plane x = -t / 2.
     */
    tilt({ id, x, y, z, w, h, t = 0.02, maxDeg = 64, grainOff = [0, 0], frontMat, metalMat, parent = group }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); partGroups.push(g);
      const panel = new THREE.Mesh(bevelBox(t, h, w, { grain: 'z', off: grainOff }), frontMat); panel.position.y = h / 2; panel.castShadow = panel.receiveShadow = true; panel.name = id + ':front'; g.add(panel);
      const hit = [panel];
      const pull = new THREE.Mesh(mergeGeometries([prep(placed(bevelBox(0.014, 0.016, w - 0.12, { b: 0.0008 }), { x: t / 2 + 0.006, y: h - 0.05 })), prep(placed(bevelBox(0.05, 0.03, w - 0.02, { b: 0.001 }), { x: -t / 2 - 0.025, y: 0.015 }))]), metalMat); pull.castShadow = true; pull.name = id + ':pull'; g.add(pull); hit.push(pull);
      const inner = g.userData.inner = [];
      const apply = () => { const v = state.part(id).value; g.rotation.z = -(maxDeg * Math.PI / 180) * v; for (const m of inner) m.visible = v > 0.002; };
      updaters.push(apply); apply();
      registry.register({ id, product, kind: 'tilt', label: PRODUCTS[product].parts.find((p) => p.id === id).label, hit, object: g });
      return { group: g, hit, panel };
    },

    /** sliding leaf: translates along Z by `travel` (sign gives the direction). Origin = leaf centre. */
    slider({ id, x, y, z, w, h, t = 0.022, travel, grainOff = [0, 0], fluted = false, glass = false, frontMat, flutedMat = null, metalMat, glassMat, parent = group, pullSign = 1 }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); partGroups.push(g);
      const geo = fluted ? flutedPanel(w, h, t, { pitch: 0.038, relief: 0.011, off: grainOff }) : bevelBox(w, h, t, { grain: 'y', off: grainOff });
      geo.rotateY(Math.PI / 2);
      const leaf = new THREE.Mesh(geo, fluted && flutedMat ? flutedMat : frontMat); leaf.castShadow = leaf.receiveShadow = true; leaf.name = id + ':leaf'; g.add(leaf);
      const hit = [leaf];
      const pull = placed(bevelBox(0.014, 0.42, 0.016, { b: 0.0008 }), { x: t / 2 + 0.006, y: -0.05, z: pullSign * (w / 2 - 0.05) });
      const pm = new THREE.Mesh(prep(pull), metalMat); pm.castShadow = true; pm.name = id + ':pull'; g.add(pm); hit.push(pm);
      const apply = () => { g.position.z = z + travel * state.part(id).value; };
      updaters.push(apply); apply();
      registry.register({ id, product, kind: 'slider', label: PRODUCTS[product].parts.find((p) => p.id === id).label, hit, object: g });
      return { group: g, hit };
    },

    /** soft baked contact shadow decal on the floor (a rounded-rect alpha gradient) */
    contactShadow({ x, z, w, d, y = 0.004, strength = 0.5, blur = 22 }) {
      const tex = contactShadowTexture(w / d, strength, blur), mat = M.shadowDecal(tex);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; group.add(m);   // w along X, d along Z
      return m;
    },
    pool(x, y, z, size, k = 0.5, rotX = -Math.PI / 2) {
      const mat = M.wash(poolTex, k), m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); m.rotation.x = rotX; m.position.set(x, y, z); m.renderOrder = 4; group.add(m); ledMats.push(mat); return m;
    },

    setFinish(fid) { state.setFinish(fid); applyFinish(M, product, fid); },
    setReduced(v) { state.setReduced(v); },
    /** advance animations; returns true if anything moved */
    update(dt) { const ch = state.update(dt); if (ch || kit._dirty) { for (const u of updaters) u(); kit._dirty = false; } return ch; },
    refresh() { kit._dirty = true; },
    /** world-space bounding box of a registered part (for the hover outline) */
    partBox(id, out = new THREE.Box3()) { const e = registry.get(id); out.makeEmpty(); if (!e) return out; for (const m of e.hit) out.expandByObject(m); return out; },
    dispose() { for (const m of ledMats) m.dispose(); },
  };
  const f0 = defaultFinish(product); kit.setFinish(f0);
  return kit;
}
