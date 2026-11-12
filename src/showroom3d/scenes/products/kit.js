/* The "kit": factories that build the MOVING parts of a product from separate meshes (drawers on slides, hinged doors, sliding leaves, pivot
 * doors), LED strips with additive wash, static-geometry merging and baked contact shadows. Pure three.js; a product module (kitchen.js,
 * wardrobe.js, door.js) calls these and gets back one object with update(). Product frame: +X toward the visitor, Y up, wall at x = -3. */
import * as THREE from 'three';
import { bevelBox, flutedPanel, placed, prep } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { washTexture, poolTexture, contactShadowTexture } from '../../3d/pbr';
import { createProductState } from '../../products/animation';
import { stateDef, PRODUCTS } from '../../products/catalog';
import { defaultFinish, finishIds } from '../../products/finishes';
import { applyFinish } from './materials';

const _wash = { v: null, p: null };

export function createKit({ product, M, tier, registry, reduced = false }) {
  const group = new THREE.Group(); group.name = 'product-' + product;
  const state = createProductState(stateDef(product, finishIds(product)), { reduced });
  const updaters = [];                    // (state) => void, run when anything changed
  const statics = new Map();              // material -> [geometry]
  const lod = { detail: new THREE.Group(), props: new THREE.Group() };          // hidden when the visitor is far away (draw-call saving)
  lod.detail.name = 'lod-detail'; lod.props.name = 'lod-props'; group.add(lod.detail, lod.props);
  const washTex = _wash.v || (_wash.v = washTexture()), poolTex = _wash.p || (_wash.p = poolTexture());
  const ledMats = [];                      // every emissive material created here (disposed with the product)

  const kit = {
    product, group, state, M, tier, registry, lod, updaters,
    /** collect a placed geometry into the merged static mesh of `mat` */
    addStatic(geo, mat) { if (!statics.has(mat)) statics.set(mat, []); statics.get(mat).push(prep(geo)); },
    /** merge the collected statics into one mesh per material; call once at the end of a product build */
    flushStatics({ cast = true, receive = true, into = group } = {}) {
      for (const [mat, list] of statics) {
        const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = cast; m.receiveShadow = receive; m.name = 'static'; m.matrixAutoUpdate = false; m.updateMatrix(); into.add(m);
      }
      statics.clear();
    },
    mesh(geo, mat, { x = 0, y = 0, z = 0, cast = true, receive = true, parent = group, name } = {}) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = receive; if (name) m.name = name; parent.add(m); return m;
    },

    /**
     * an emissive strip + soft additive wash. `levelOf(state)` returns 0..1; the strip switches itself off (visible = false) at ~0.
     * dir: orientation of the wash plane: 'down' (hangs under a unit, washes the worktop / splashback), 'side' (vertical strip lighting an interior), 'up'.
     */
    led({ x, y, z, len, thick = 0.012, axis = 'z', washW = 0.5, washL, washDir = 'x', parent = group, levelOf, intensity = 1, washPlane = null }) {
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
    drawer({ id, x, y, z, w, h, depth = 0.5, travel = 0.42, t = 0.019, grainOff = [0, 0], pull = 'finger', led = true, frontMat, metalMat, bodyMat, parent = group, partLabel }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
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
      if (w > 0.5) { parts.push(placed(bevelBox(0.008, bh * 0.62, bw - 0.02, { b: 0.0006 }), { x: -t / 2 - depth * 0.38, y: by - bh * 0.19 })); if (w > 0.8) for (const f of [-1, 1]) parts.push(placed(bevelBox(depth * 0.7, bh * 0.55, 0.008, { b: 0.0006 }), { x: -t / 2 - depth * 0.68, y: by - bh * 0.22, z: f * bw * 0.17 })); }
      parts.forEach((g, i) => { parts[i] = prep(g); });
      const body = new THREE.Mesh(mergeGeometries(parts), bodyMat); body.castShadow = body.receiveShadow = true; body.name = id + ':body'; g.add(body);
      if (led) {
        kit.led({ x: -t / 2 - 0.03, y: by + bh / 2 - 0.004, z: 0, len: bw - 0.02, axis: 'z', parent: g, levelOf: (s) => s.ledLevel(id) * 0.95,
          washPlane: { w: bw, h: depth * 0.9, pos: [-t / 2 - depth / 2, by - bh / 2 + bt + 0.004, 0], rot: [-Math.PI / 2, 0, Math.PI / 2] } });
      }
      const apply = () => { g.position.x = x + travel * state.part(id).value; };
      updaters.push(apply); apply();
      registry.register({ id, product, kind: 'drawer', label: PRODUCTS[product].parts.find((p) => p.id === id).label, hit, object: g });
      return g;
    },

    /**
     * a hinged leaf. Origin = the hinge axis (vertical). side +1: the leaf extends toward +Z from the axis, -1 toward -Z. It swings toward +X.
     * glass: use a thin bronze frame + glass pane instead of a solid slab.
     */
    hinged({ id, x, y, z, w, h, t = 0.019, side = 1, maxDeg = 108, grainOff = [0, 0], pull = 'finger', fluted = false, glass = false, frontMat, flutedMat = null, metalMat, glassMat, parent = group, grain = 'y', hingeMat = null, hingeY = [0.18, null] }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
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

    /** sliding leaf: translates along Z by `travel` (sign gives the direction). Origin = leaf centre. */
    slider({ id, x, y, z, w, h, t = 0.022, travel, grainOff = [0, 0], fluted = false, glass = false, frontMat, flutedMat = null, metalMat, glassMat, parent = group, pullSign = 1 }) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
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
