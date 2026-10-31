/* Neo Kitchen Designer - THREE glue for the real hinge hardware [NEO-HINGES-UX35].
 * Everything that is numbers lives in hingeHw.js (pure, tested); this file only turns those numbers into meshes. Used by Kitchen3D, so the kitchen,
 * closets, categories and custom studios all get it.
 *
 *   buildHingeHw(THREE, o)  -> { group, sync(state), count, calls } : FOUR instanced meshes for the whole scene (bores, cup bodies, arm links, plates +
 *                              screws) instead of a mesh per hinge. Each instance is bound to the door / side-panel mesh it belongs to and its matrix is
 *                              recomputed from that mesh's world matrix, so the hardware follows the door while it swings and follows each part in an
 *                              exploded view. The arm is a two-link folding arm solved every frame (kneeOf) between the fixed plate and the moving cup.
 *   selectionOverlay(THREE, o) -> objects : what a selected door shows: real-size cup rings on the back face (drawn through the door), the hinge-edge
 *                              strip, the dashed swing symbol (apex at the hinge side) and, with Dimensions on, the labelled cup callouts.
 */
import { hingeSets, armLinkLen, kneeOf, PLATE, ARM, BOSS, PLATE_DY, cupCallout, hingeSummary } from './hingeHw';

/* ---- small geometry helpers ---------------------------------------------------- */
/** concatenate geometries into one with a per-vertex colour (so a multi-coloured part is still ONE mesh) */
function mergeColored(THREE, parts) {
  const P = [], N = [], C = [], I = []; let off = 0;
  parts.forEach(({ geo, color }) => {
    const pos = geo.attributes.position.array, nor = geo.attributes.normal ? geo.attributes.normal.array : null;
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      N.push(nor ? nor[i * 3] : 0, nor ? nor[i * 3 + 1] : 0, nor ? nor[i * 3 + 2] : 1);
      const c = typeof color === 'function' ? color(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]) : color;
      C.push(c.r, c.g, c.b);
    }
    if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i++) I.push(ix[i] + off); } else for (let i = 0; i < n; i++) I.push(i + off);
    off += n; geo.dispose();
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I);
  return g;
}

/* ---- the instanced hardware -------------------------------------------------------- */
export function buildHingeHw(THREE, o) {
  const { sc, root, nodeOf, col, env, partOk } = o;
  const sets = hingeSets(sc).filter((s) => !partOk || partOk(s));
  const partBox = new Map(sc.parts.map((p) => [p.id, p.box]));
  const ctr = (id) => { const b = partBox.get(id); return b ? { u: (b.u0 + b.u1) / 2, y: (b.y0 + b.y1) / 2, d: (b.d0 + b.d1) / 2 } : null; };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const Q0 = new THREE.Quaternion();
  const qY = (a) => new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), a);
  const ONE = V3(1, 1, 1);

  /* --- items: the nodes each hinge is bound to, plus its local placement inside them --- */
  const items = [];
  sets.forEach((s) => {
    const door = nodeOf(s.partId) || null;
    const side = s.plate && s.plate.partId ? nodeOf(s.plate.partId) || null : null;
    if (!door && !side) return;
    const dc = ctr(s.partId), sc2 = s.plate && s.plate.partId ? ctr(s.plate.partId) : null;
    const it = { set: s, door, side, L: s.plate ? armLinkLen(s) : 0 };
    if (door && dc) {
      // origin on the door's back face (0.35 mm proud so it never z-fights), +z = out of the door into the carcass is NEGATIVE d: the decal faces -z
      it.cupLocal = V3(s.cup.u - dc.u, s.cup.y - dc.y, s.cup.d - 0.35 - dc.d);
      it.qLocal = V3(s.cup.u - dc.u, s.cup.y - dc.y, s.cup.d - BOSS - dc.d);
    } else it.door = null;
    if (side && s.plate && sc2) {
      it.plateLocal = V3(s.plate.u - sc2.u, s.plate.y - sc2.y, s.plate.d - sc2.d);
      it.plateQ = s.plate.dir < 0 ? qY(Math.PI) : Q0.clone();
      it.pLocal = V3(s.plate.u - sc2.u, s.plate.y - sc2.y, s.plate.d - sc2.d);
    } else it.side = null;
    if (it.door || it.side) items.push(it);
  });
  const withDoor = items.filter((i) => i.door);
  const withPlate = items.filter((i) => i.side);
  const withArm = items.filter((i) => i.door && i.side && !i.set.flip);

  /* --- colours (tokens: --nk-hw-*) --- */
  const cMetal = col('--nk-hw-metal', 0x98a0a9), cMetalDk = col('--nk-hw-metal-dk', 0x5f666e), cScrew = col('--nk-hw-screw', 0x3a3f46);
  const cBore = col('--nk-hw-bore', 0x1d1610), cBevel = col('--nk-hw-bevel', 0x8a6f4d);

  /* --- bore decal: a dark disc + a bevel ring that lightens outwards (reads as a recessed circle with an edge) --- */
  const disc = new THREE.CircleGeometry(0.92, 28); disc.rotateY(Math.PI);
  const ring = new THREE.RingGeometry(0.92, 1.14, 28, 1); ring.rotateY(Math.PI);
  const decalGeo = mergeColored(THREE, [
    { geo: disc, color: cBore },
    { geo: ring, color: (x, y) => { const t = Math.min(1, Math.max(0, (Math.hypot(x, y) - 0.92) / 0.22)); return cBore.clone().lerp(cBevel, t); } },
  ]);
  /* --- cup body: a short metal boss standing out of the bore into the carcass, its tip ring darker --- */
  const bossCyl = new THREE.CylinderGeometry(0.58, 0.58, 1, 16, 1, false); bossCyl.rotateX(Math.PI / 2); bossCyl.translate(0, 0, -0.5);
  const bossGeo = mergeColored(THREE, [{ geo: bossCyl, color: (x, y, z) => (z < -0.82 ? cMetalDk : cMetal) }]);
  /* --- arm link: a flat strip, length on x --- */
  const barGeo = mergeColored(THREE, [{ geo: new THREE.BoxGeometry(1, 1, 1), color: cMetal }]);
  /* --- mounting plate + its two screw heads (axis x, the plate faces +x) --- */
  const pb = new THREE.BoxGeometry(PLATE.t, PLATE.len, PLATE.w); pb.translate(PLATE.t / 2, 0, 0);
  const screwAt = (y) => { const g = new THREE.CylinderGeometry(3.2, 3.2, 2.4, 10); g.rotateZ(-Math.PI / 2); g.translate(PLATE.t + 1.2, y, 0); return g; };
  const plateGeo = mergeColored(THREE, [{ geo: pb, color: cMetal }, { geo: screwAt(-PLATE_DY), color: cScrew }, { geo: screwAt(PLATE_DY), color: cScrew }]);

  const mk = (geo, material, n) => {
    const m = new THREE.InstancedMesh(geo, material, Math.max(1, n));
    m.count = n; m.frustumCulled = false; m.raycast = () => {}; m.castShadow = false; m.receiveShadow = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.userData.hinge = true; m.visible = false;
    return m;
  };
  const decalMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.6, envMap: env || null });
  const decal = mk(decalGeo, decalMat, withDoor.length);
  const boss = mk(bossGeo, metalMat, withDoor.length);
  const bars = mk(barGeo, metalMat, withArm.length * 2);
  const plates = mk(plateGeo, metalMat, withPlate.length);
  const group = new THREE.Group(); group.name = 'hingeHw';
  [decal, boss, bars, plates].forEach((m) => group.add(m));
  group.visible = false;
  root.add(group);

  const inv = new THREE.Matrix4(), W = new THREE.Matrix4(), L = new THREE.Matrix4(), tmpA = V3(0, 0, 0), tmpB = V3(0, 0, 0), pos = V3(0, 0, 0), scl = V3(1, 1, 1);
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const worldOf = (node, local, out) => out.copy(local).applyMatrix4(W.multiplyMatrices(inv, node.matrixWorld));

  /** state: { show, detail: 'full' | 'basic' | 'off', explode } - recompute every instance matrix from the nodes' current world matrices */
  function sync(state) {
    const on = !!state.show && state.detail !== 'off';
    const arms = on && state.detail === 'full' && !state.explode;
    decal.visible = boss.visible = plates.visible = on; bars.visible = arms; group.visible = on;
    if (!on) return;
    root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert();
    withDoor.forEach((it, i) => {
      W.multiplyMatrices(inv, it.door.matrixWorld);
      const r = it.set.cup.r;
      L.compose(it.cupLocal, qb.set(0, 0, 0, 1), scl.set(r, r, 1)); decal.setMatrixAt(i, L.premultiply(W));
      L.compose(V3(it.cupLocal.x, it.cupLocal.y, it.cupLocal.z + 0.35), qb.set(0, 0, 0, 1), scl.set(r, r, BOSS)); boss.setMatrixAt(i, L.premultiply(W));
    });
    decal.instanceMatrix.needsUpdate = true; boss.instanceMatrix.needsUpdate = true;
    withPlate.forEach((it, i) => {
      W.multiplyMatrices(inv, it.side.matrixWorld);
      L.compose(it.plateLocal, it.plateQ, ONE); plates.setMatrixAt(i, L.premultiply(W));
    });
    plates.instanceMatrix.needsUpdate = true;
    if (!arms) return;
    withArm.forEach((it, i) => {
      const P = worldOf(it.side, it.pLocal, tmpA).clone(); const Q = worldOf(it.door, it.qLocal, tmpB).clone();
      W.multiplyMatrices(inv, it.side.matrixWorld);
      const dirv = V3(it.set.plate.dir, 0, 0).transformDirection(W); // the carcass interior, in root space
      const K = kneeOf({ u: P.x, d: P.z }, { u: Q.x, d: Q.z }, it.L, { u: dirv.x, d: dirv.z });
      const link = (a, b, idx) => {
        const dx = b.u - a.u, dz = b.d - a.d, len = Math.hypot(dx, dz) + 2;
        pos.set((a.u + b.u) / 2, P.y, (a.d + b.d) / 2);
        qa.setFromAxisAngle(V3(0, 1, 0), Math.atan2(-dz, dx));
        L.compose(pos, qa, scl.set(len, ARM.h, ARM.t)); bars.setMatrixAt(idx, L);
      };
      link({ u: P.x, d: P.z }, K, i * 2); link(K, { u: Q.x, d: Q.z }, i * 2 + 1);
    });
    bars.instanceMatrix.needsUpdate = true;
  }
  return { group, sync, count: items.length, calls: 4, sets: items.length };
}

/* ---- the selected-door overlay ---------------------------------------------------------- */
/** a text label that keeps a constant on-screen size (Kitchen3D's loop reads userData.px / ar) */
function calloutSprite(THREE, text, o) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 56;
  const x = c.getContext('2d');
  x.fillStyle = o.bg; x.globalAlpha = 0.94; x.beginPath(); (x.roundRect || x.rect).call(x, 2, 2, 764, 52, 12); x.fill(); x.globalAlpha = 1;
  x.strokeStyle = o.accent; x.lineWidth = 3; x.stroke();
  x.fillStyle = o.fg; x.font = `700 26px ${o.font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = o.rtl ? 'rtl' : 'ltr'; x.fillText(text, 384, 29);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sp = new THREE.Sprite(mat); sp.renderOrder = 33; sp.center.set(o.rtl ? 1 : 0, 0.5);
  sp.userData = { sel: true, px: 24, ar: 768 / 56, own: [mat, tex] };
  return sp;
}

/**
 * Overlay for one selected door mesh `mesh` (a BoxGeometry centred on its part box). `sets` = hingeSets of that part. Every object is added to `mesh`
 * (so it swings with the door) and returned with userData.own for disposal.
 * o: { lineM (depthTest:false line material), brand (Color), box (part box), face (the whole-door box: elevBox || box), dims, lang, ui colours... }
 */
export function selectionOverlay(THREE, o) {
  const { mesh, sets, lineM, brand, box, face, dims, lang } = o;
  const out = [];
  const cu = (box.u0 + box.u1) / 2, cy = (box.y0 + box.y1) / 2, cd = (box.d0 + box.d1) / 2;
  const add = (obj, own) => { obj.userData = { ...(obj.userData || {}), own: own || [] }; mesh.add(obj); out.push(obj); return obj; };
  const zBack = face.d0 - cd - 0.7, zFront = face.d1 - cd + 0.8;
  const left = sets[0].side === 'L', top = sets[0].side === 'T';
  const hu = (left ? face.u0 : face.u1) - cu; // hinge edge (mesh-local u)
  const fu = (left ? face.u1 : face.u0) - cu; // free edge
  const y0 = face.y0 - cy, y1 = face.y1 - cy;

  /* cup rings at their REAL size on the back face + a centre cross + the inner boss circle; depthTest is off, so they show through the closed door */
  sets.forEach((s) => {
    [1, 0.58].forEach((k) => {
      const pts = []; for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2; pts.push(V(THREE, s.cup.u - cu + Math.cos(a) * s.cup.r * k, s.cup.y - cy + Math.sin(a) * s.cup.r * k, zBack)); }
      const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, lineM); l.renderOrder = 31; add(l, [g]);
    });
    const cr = Math.min(8, s.cup.r * 0.4);
    const cg = new THREE.BufferGeometry().setFromPoints([V(THREE, s.cup.u - cu - cr, s.cup.y - cy, zBack), V(THREE, s.cup.u - cu + cr, s.cup.y - cy, zBack), V(THREE, s.cup.u - cu, s.cup.y - cy - cr, zBack), V(THREE, s.cup.u - cu, s.cup.y - cy + cr, zBack)]);
    const cl = new THREE.LineSegments(cg, lineM); cl.renderOrder = 31; add(cl, [cg]);
  });

  /* hinge-edge strip on the front face (a filled bar along the hinge side) */
  if (!top) {
    const sg = new THREE.PlaneGeometry(9, y1 - y0); const sm = new THREE.MeshBasicMaterial({ color: brand, transparent: true, opacity: 0.85, depthTest: false });
    const st = new THREE.Mesh(sg, sm); st.position.set(hu + (left ? 4.5 : -4.5), (y0 + y1) / 2, zFront); st.renderOrder = 31; add(st, [sg, sm]);
  }
  /* swing symbol: dashed V with its APEX on the hinge side (architectural convention); a flip-up door's apex is on its top edge */
  const apex = top ? V(THREE, (face.u0 + face.u1) / 2 - cu, y1, zFront) : V(THREE, hu, (y0 + y1) / 2, zFront);
  const ends = top ? [V(THREE, face.u0 - cu, y0, zFront), V(THREE, face.u1 - cu, y0, zFront)] : [V(THREE, fu, y0, zFront), V(THREE, fu, y1, zFront)];
  const dm = new THREE.LineDashedMaterial({ color: brand, dashSize: 26, gapSize: 16, transparent: true, opacity: 0.95, depthTest: false });
  const dg = new THREE.BufferGeometry().setFromPoints([ends[0], apex, ends[1]]);
  const dl = new THREE.Line(dg, dm); dl.computeLineDistances(); dl.renderOrder = 31; add(dl, [dg, dm]);

  /* labelled callouts (Dimensions on) */
  const labels = [];
  if (dims) {
    const rtl = lang === 'ar';
    const lo = { bg: o.bg, fg: o.fg, accent: o.accentCss, font: o.font, rtl };
    sets.forEach((s) => {
      const sp = calloutSprite(THREE, cupCallout(s, lang), lo);
      sp.position.set(s.cup.u - cu + (left ? 1 : -1) * (s.cup.r + 10), s.cup.y - cy, zBack - 14); add(sp, sp.userData.own); labels.push(sp);
    });
    const sum = calloutSprite(THREE, hingeSummary(sets, lang), lo);
    sum.position.set(hu + (left ? 1 : -1) * 12, y1 + 34, zFront); add(sum, sum.userData.own); labels.push(sum);
  }
  return { objs: out, labels };
}
const V = (THREE, x, y, z) => new THREE.Vector3(x, y, z);
