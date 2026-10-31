/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the 3D view of the door set (Three.js r128 from the shared loader of the Neo Kitchen viewport).
 * A dedicated scene for a door: the wall with its opening, the frame, the architraves, the leaf (or two) built from the SAME parts as the cut list,
 * the ironmongery, the track of a barn door. It reuses the Neo Kitchen camera maths (cameraViews.js: named views, fit, free move, wheel zoom to the
 * cursor, focus), the Look presets (lookProfiles.js), the open-speed maths (workspace3d.js) and the Hold camera, X-Ray, Explode and Open behaviours.
 * Colours are read from the scoped --nk-dr-* custom properties (neoDoors.css) and the shared --nk-look-* / --nk-x-* ones, so no colour lives here.
 * ===========================================================================*/
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadThree } from '../neoKitchen/Kitchen3D';
import {
  fitDistance, fitTarget, shortestYaw, clampPitch, clampDist, easeOut, pickSelectable, usableFrame, fitBounds, fitFill, VIEW_PRESETS,
  panTarget, nudgeTarget, wheelFactor, zoomAtCursor, clampTarget, focusDistance,
} from '../neoKitchen/cameraViews';
import { openStep, easeInOut, openDurationMs, gesturesAllowed } from '../neoKitchen/workspace3d';
import { LOOKS, lookOf, sunPosition, clampSun } from '../neoKitchen/lookProfiles';
import { FINISHES } from './doorModel';
import { leafOpen, explodeOffset, materialRole, DOOR_ANGLES } from './door3dLogic';
import '../neoKitchen/view3dPro.css';
import '../neoKitchen/workspace3d.css';
import { useOutput } from '../neoKitchen/OutputSettingsControl';
import { curveSegs } from '../neoKitchen/outputSettings';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function woodTexture(THREE, base, dark, seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256); const r = rng(seed);
  for (let i = 0; i < 70; i++) { const p = r() * 256; x.strokeStyle = dark; x.globalAlpha = 0.06 + r() * 0.16; x.lineWidth = 0.5 + r() * 2.2; x.beginPath(); x.moveTo(p, 0); x.bezierCurveTo(p + (r() - 0.5) * 18, 80, p + (r() - 0.5) * 18, 170, p + (r() - 0.5) * 8, 256); x.stroke(); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export default function Door3D({ W, d, ui, lang, onSelect, camCmd, sel, onToggleFront, poseRef, label }) {
  const wrapRef = useRef(null); const canvasRef = useRef(null);
  const st = useRef({}); const live = useRef({});
  const [status, setStatus] = useState('loading'); const [attempt, setAttempt] = useState(0);
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] Precision: the segment count of round parts (knob, cylinder) in the view
  live.current = { W, d, ui, onSelect, sel, onToggleFront, poseRef, output };
  const css = (name, fallback) => {
    const fb = typeof fallback === 'number' ? `#${fallback.toString(16).padStart(6, '0')}` : fallback;
    try { const v = getComputedStyle(wrapRef.current).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  };

  /* ------------------------------ build ------------------------------ */
  const rebuild = useCallback(() => {
    const S = st.current; const THREE = window.THREE; if (!S.root || !THREE) return;
    const { W: Wd, d: dd, ui: u } = live.current; const SZ = Wd.S;
    S.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
    while (S.root.children.length) S.root.remove(S.root.children[0]);
    S.keepT = new Map((S.recs || []).filter((r) => r.key).map((r) => [r.key, r.t]));
    S.recs = []; S.sprites = [];
    const xr = !!u.xray; const L = u.layers;
    const fin = FINISHES[dd.leaf.finish]; const finHex = css(fin.cssVar, 0xb88a55); const dark = css('--nk-dr-grain', 0x3a2a1a);
    const mats = {}; const mk = (k, make) => { if (!mats[k]) mats[k] = make(); return mats[k]; };
    const col = (n, fb) => new THREE.Color(css(n, fb));
    const std = (c, rough, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, ...extra });
    const ghost = (k) => mk(`g-${k}`, () => { const m = new THREE.MeshBasicMaterial({ color: col('--nk-x-front', 0xc5ccd8), transparent: true, opacity: k === 'glass' ? 0.1 : 0.06, depthWrite: false }); m.userData.ghost = true; return m; });
    const xTone = (k) => mk(`x-${k}`, () => new THREE.MeshStandardMaterial({ color: col(k === 'core' ? '--nk-x-shelf' : k === 'timber' ? '--nk-x-box' : '--nk-x-carcass', 0xaab1bb), roughness: 0.92, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    const wood = fin.kind === 'wood' && dd.leaf.skin === 'veneer';
    const faceMat = () => mk('face', () => (wood ? std(0xffffff, 0.62, { map: woodTexture(THREE, finHex, dark, 7) }) : std(new THREE.Color(finHex), dd.leaf.skin === 'lacquer' ? 0.28 : 0.7)));
    const frameMat = () => mk('frame', () => (fin.kind === 'wood' && dd.leaf.skin === 'veneer' ? std(0xffffff, 0.66, { map: woodTexture(THREE, finHex, dark, 11) }) : std(new THREE.Color(finHex), 0.7)));
    const timberMat = () => mk('timber', () => std(col('--nk-dr-timber', 0xc9a066), 0.8));
    const coreMat = () => mk('core', () => std(col('--nk-dr-core', 0xd8c9a8), 0.9));
    const metalMat = () => mk('metal', () => new THREE.MeshStandardMaterial({ color: col('--nk-dr-hw', 0xa9aeb4), roughness: 0.38, metalness: 0.75 }));
    const glassMat = (kind) => (xr ? ghost('glass') : mk(`glass-${kind}`, () => new THREE.MeshPhysicalMaterial({
      color: col(kind === 'smoked' ? '--nk-dr-glass-smoke' : kind === 'frosted' ? '--nk-dr-glass-frost' : '--nk-dr-glass', 0xcfe3ea), transparent: true,
      opacity: kind === 'smoked' ? 0.7 : kind === 'frosted' ? 0.62 : 0.24, roughness: kind === 'frosted' ? 0.55 : 0.06, metalness: 0, clearcoat: kind === 'frosted' ? 0 : 1, clearcoatRoughness: 0.05, envMap: S.getEnv ? S.getEnv() : null, envMapIntensity: 0.9, depthWrite: false,
    })));
    const matFor = (p) => {
      const role = materialRole(p);
      if (role === 'metal') return xr ? mk('x-hw', () => new THREE.MeshBasicMaterial({ color: col('--nk-select', 0xff8a24) })) : metalMat();
      if (role === 'glass') return glassMat(p.glassKind || 'clear');
      if (xr) return (p.kind === 'skin' || p.kind === 'panel' || p.kind === 'deco' || p.kind === 'mould') ? ghost('face') : role === 'frame' ? ghost('face') : xTone(role === 'core' ? 'core' : role === 'timber' ? 'timber' : 'carcass');
      if (role === 'frame') return frameMat(); if (role === 'timber') return timberMat(); if (role === 'core') return coreMat();
      return faceMat();
    };
    const edgeMat = new THREE.LineBasicMaterial({ color: col(xr ? '--nk-x-edge' : '--nk-edge', 0x444444), transparent: true, opacity: xr ? 0.7 : 0.34 });
    const ghostEdge = new THREE.LineBasicMaterial({ color: col('--nk-edge', 0x444444), transparent: true, opacity: 0.2 });
    const layerOf = (p) => (p.leaf == null ? (p.group === 'Architrave' ? 'arch' : 'frame') : p.hardware ? 'hardware' : 'leaf');
    const visible = (p) => L[layerOf(p)] !== false && (!(p.hid) || xr) && !(p.kind === 'deco' && xr);

    /* leaf groups (pivot = the hinge axis) */
    const groups = new Map();
    Wd.leaves.forEach((lf) => {
      const node = new THREE.Group();
      node.position.set(lf.x0 + lf.pivot.x, lf.y0, lf.z0 + lf.pivot.z); S.root.add(node);
      const anim = Wd.scene.parts.find((p) => p.leaf === lf.index && p.anim);
      const g = { node, lf, base: node.position.clone(), ids: new Set(), anim: anim ? anim.anim : null };
      groups.set(lf.index, g);
      S.recs.push({ node, base: node.position.clone(), motion: lf, group: g, ids: g.ids, t: S.keepT.get(lf.id) || 0, key: lf.id });
    });
    const meshes = [];
    const add = (p) => {
      if (!visible(p)) return;
      const mat = matFor(p); const g = p.leaf == null ? null : groups.get(p.leaf);
      const pieces = [];
      p.boxes.forEach((b) => {
        const w = Math.max(0.5, b.x1 - b.x0), h = Math.max(0.5, b.y1 - b.y0), dp = Math.max(0.5, b.z1 - b.z0);
        const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, cz = (b.z0 + b.z1) / 2;
        const raised = p.kind === 'panel' && !xr && (p.profile === 'raised' || p.profile === 'bolection') && w > 80 && h > 80;
        const list = raised
          ? [{ w, h, dp: dp * 0.42, cz }, { w: w - 52, h: h - 52, dp: dp, cz }]
          : [{ w, h, dp, cz }];
        list.forEach((q) => {
          const geo = (p.round || b.round) ? new THREE.CylinderGeometry(q.w / 2, q.w / 2, q.dp, curveSegs(28, live.current.output)) : new THREE.BoxGeometry(q.w, q.h, q.dp);
          const me = new THREE.Mesh(geo, mat);
          if (p.round || b.round) { me.rotation.x = Math.PI / 2; me.scale.set(1, 1, q.h / q.w); }
          me.userData = { partId: p.id, unitId: p.unitId, kind: p.kind };
          if (p.kind === 'slat') me.rotation.x = -(p.tilt || 35) * Math.PI / 180;
          me.castShadow = !mat.userData.ghost && p.kind !== 'glass'; me.receiveShadow = !mat.userData.ghost;
          if (!(p.round || b.round) && p.kind !== 'deco') me.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat.userData.ghost ? ghostEdge : edgeMat));
          const pos = g ? [cx - g.lf.pivot.x, cy, q.cz - g.lf.pivot.z] : [cx, cy, q.cz];
          me.position.set(pos[0], pos[1], pos[2]);
          (g ? g.node : S.root).add(me);
          if (g) g.ids.add(p.id);
          pieces.push(me);
          S.recs.push({ node: me, base: me.position.clone(), part: p, ex: explodeOffset(p, 1, SZ), parentG: g });
        });
      });
      meshes.push(...pieces);
    };
    Wd.scene.parts.forEach(add);

    /* wall around the opening (display only), barn / pocket tracks */
    const E = 1400; const wallT = SZ.wall; const topH = Wd.scene.wall.top + 900;
    const wallMat = () => mk('wall', () => std(col('--nk-dr-wall', 0xe6e1d7), 0.95));
    const wallPiece = (x0, x1, y0, y1, ghostIt) => {
      const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, wallT);
      const m = ghostIt || xr || u.explode.on ? mk('wall-g', () => { const q = std(col('--nk-dr-wall', 0xe6e1d7), 0.95, { transparent: true, opacity: 0.32, depthWrite: false }); q.userData.ghost = true; return q; }) : wallMat();
      const me = new THREE.Mesh(geo, m); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); me.receiveShadow = true; me.castShadow = !ghostIt;
      me.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostEdge)); me.userData.wall = true; S.root.add(me);
      S.recs.push({ node: me, base: me.position.clone(), env: true });
    };
    if (L.wall !== false) {
      const hw = SZ.OW / 2; const ph = dd.type === 'pocket' ? (Wd.track && Wd.track.slide < 0 ? -1 : 1) : 0;
      wallPiece(-hw - E, -hw, 0, SZ.OH + topH, ph < 0); wallPiece(hw, hw + E, 0, SZ.OH + topH, ph > 0); wallPiece(-hw, hw, SZ.OH, SZ.OH + topH, false);
    }
    if (dd.type === 'barn' && Wd.track && L.hardware !== false) {
      const tr = Wd.track; const geo = new THREE.BoxGeometry(tr.len, 30, 14);
      const me = new THREE.Mesh(geo, xr ? ghost('face') : metalMat()); me.position.set((tr.x0 + tr.x1) / 2, tr.y, (tr.z0 + tr.z1) / 2); S.root.add(me);
      [0.1, 0.5, 0.9].forEach((f) => { const po = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 40), metalMat()); po.position.set(tr.x0 + tr.len * f, tr.y, tr.z0 + (dd.swing.dir === 'in' ? 20 : -20)); S.root.add(po); });
      S.recs.push({ node: me, base: me.position.clone(), env: true });
    }

    /* measurement guides: opening width, height and wall thickness with labels */
    if (u.guides) {
      const lm = new THREE.LineBasicMaterial({ color: col('--brand', 0x356dff) });
      const line = (pts) => { const g2 = new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(...q))); const l = new THREE.Line(g2, lm); S.root.add(l); S.recs.push({ node: l, base: l.position.clone(), env: true }); };
      const label = (text, at) => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
        x.fillStyle = css('--bg-2', 0xffffff); x.globalAlpha = 0.92; x.fillRect(2, 2, 252, 60); x.globalAlpha = 1; x.strokeStyle = css('--brand', 0x356dff); x.lineWidth = 3; x.strokeRect(2, 2, 252, 60);
        x.fillStyle = css('--text-1', 0x182033); x.font = `700 30px ${css('--font-sans', 'sans-serif')}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.position.set(...at); sp.renderOrder = 20; S.root.add(sp); S.sprites.push(sp);
      };
      const zf = wallT / 2 + (dd.frame.arch.on ? dd.frame.arch.t : 0) + 70; const off = 140; const hw = SZ.OW / 2;
      line([[-hw, -off, zf], [hw, -off, zf]]); line([[-hw, -off - 30, zf], [-hw, -off + 30, zf]]); line([[hw, -off - 30, zf], [hw, -off + 30, zf]]); label(`${SZ.OW} mm`, [0, -off, zf]);
      line([[-hw - off, 0, zf], [-hw - off, SZ.OH, zf]]); line([[-hw - off - 30, 0, zf], [-hw - off + 30, 0, zf]]); line([[-hw - off - 30, SZ.OH, zf], [-hw - off + 30, SZ.OH, zf]]); label(`${SZ.OH} mm`, [-hw - off, SZ.OH / 2, zf]);
      line([[hw + off, -off, -wallT / 2], [hw + off, -off, wallT / 2]]); label(`${wallT} mm`, [hw + off, -off, 0]);
    }
    if (u.grid) {
      const gr = new THREE.GridHelper(6000, 30, col('--nk-grid', 0x888888), col('--nk-grid', 0x888888)); gr.material.opacity = 0.35; gr.material.transparent = true; gr.position.set(0, -1, 0); S.root.add(gr);
    }
    S.bounds = { w: Wd.scene.bounds.w, h: Wd.scene.bounds.h, d: Wd.scene.bounds.d };
    S.W = Wd; S.dirty = true; S.meshes = meshes;
    if (S.applyLook) S.applyLook(true);
    wrapRef.current.dataset.parts = String(Wd.scene.parts.length); wrapRef.current.dataset.meshes = String(S.recs.length);
    /* a fingerprint of the real meshes (positions + geometry sizes): the evidence harness checks that a parameter change really changes the 3D */
    { let h = 0; S.recs.forEach((r) => { if (!r.part) return; const g = (r.node.geometry && r.node.geometry.parameters) || {}; h = (h * 31 + Math.round((r.base.x * 7 + r.base.y * 13 + r.base.z * 17 + (g.width || (g.radiusTop || 0) * 2) * 3 + (g.height || 0) * 5 + (g.depth || 0) * 11) * 10)) % 1000000007; }); wrapRef.current.dataset.sig = String(h); }
    if (S.applySel) S.applySel();
    if (S.follow && !S.hold && S.frameFor && S.cam && S.prevB && (S.prevB.w !== S.bounds.w || S.prevB.h !== S.bounds.h || S.prevB.d !== S.bounds.d)) {
      const fl = fitFill(fitBounds(S.bounds, u.guides), S.yaw, S.pitch, S.cam.fov, S.fitAspect || S.cam.aspect, S.dist);
      if (Math.max(fl.x, fl.y) > 1) S.frameFor(null, false);
    }
    S.prevB = { ...S.bounds };
  }, []);

  /* --------------------------- init once ---------------------------- */
  useEffect(() => {
    let alive = true; let raf = 0; let ro = null;
    loadThree().then((THREE) => {
      if (!alive || !canvasRef.current) return;
      const canvas = canvasRef.current; const S = st.current;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { setStatus('nogl'); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scn = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(38, 1, 50, 80000);
      S.amb = new THREE.AmbientLight(0xffffff, 0.75); scn.add(S.amb);
      S.key = new THREE.DirectionalLight(0xfff6ea, 0.62); S.key.position.set(2200, 4200, 3600); scn.add(S.key); scn.add(S.key.target);
      S.key.castShadow = true; S.key.shadow.mapSize.set(2048, 2048); S.key.shadow.bias = -0.0004; S.key.shadow.normalBias = 2;
      Object.assign(S.key.shadow.camera, { left: -3200, right: 3200, top: 3200, bottom: -3200, near: 100, far: 14000 }); S.key.shadow.camera.updateProjectionMatrix();
      S.hemi = new THREE.HemisphereLight(0xffffff, 0x6e7480, 0.3); scn.add(S.hemi);
      S.fill = new THREE.DirectionalLight(0xffffff, 0.3); S.fill.position.set(-3000, 1800, 2000); scn.add(S.fill);
      S.env = new THREE.Group(); scn.add(S.env);
      S.getEnv = () => {
        if (S.envTex !== undefined) return S.envTex;
        try {
          const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
          const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 0xd6e6ff); gr.addColorStop(0.42, 0xfff4e4); gr.addColorStop(0.5, 0x9a9285); gr.addColorStop(1, 0x4b4741);
          x.fillStyle = gr; x.fillRect(0, 0, 512, 256); x.fillStyle = 0xffffff; x.fillRect(70, 64, 96, 64); x.fillRect(318, 58, 128, 70);
          const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
          const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
          const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(es, 0.02); S.envTex = rt.texture; pm.dispose(); tex.dispose();
        } catch (e) { S.envTex = null; }
        return S.envTex;
      };
      S.root = new THREE.Group(); scn.add(S.root);
      Object.assign(S, { renderer, scn, cam, yaw: DOOR_ANGLES.yaw, pitch: DOOR_ANGLES.pitch, dist: 5000, target: new THREE.Vector3(0, 1100, 0), exT: 0, recs: [], dirty: true, follow: true, tw: null, hold: !!live.current.ui.hold, lastT: 0 });
      if (S.hold) S.follow = false;
      const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      S.frameFor = (angles, animate) => {
        const b = S.bounds || { w: 2400, d: 700, h: 2600 };
        const yaw = angles ? shortestYaw(S.yaw, angles.yaw) : S.yaw; const pitch = angles ? clampPitch(angles.pitch) : S.pitch;
        const t = fitTarget(b);
        const to = { yaw, pitch, dist: fitDistance(fitBounds(b, live.current.ui.guides), yaw, pitch, cam.fov, S.fitAspect || cam.aspect), tx: t.x, ty: t.y, tz: t.z };
        S.follow = true;
        if (!animate || reduce()) { S.tw = null; S.yaw = to.yaw; S.pitch = to.pitch; S.dist = to.dist; S.target.set(to.tx, to.ty, to.tz); S.dirty = true; return; }
        S.tw = { t0: performance.now(), ms: 240, from: { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z }, to }; S.dirty = true;
      };
      S.fit = () => S.frameFor(null, true); S.reset = (instant) => S.frameFor(DOOR_ANGLES, !instant);
      S.view = (name) => { const v = VIEW_PRESETS[name]; if (v) S.frameFor(v, true); };
      S.manual = () => { S.follow = false; S.tw = null; };
      const resize = () => {
        const w = wrapRef.current.clientWidth || 600, h = wrapRef.current.clientHeight || 400;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); S.dirty = true;
        let il = 0, ir = 0;
        try {
          const wr = wrapRef.current.getBoundingClientRect(); const gap = 12;
          wrapRef.current.parentElement.querySelectorAll('.nk-vtools').forEach((el) => { const r = el.getBoundingClientRect(); if (!r.width) return; if ((r.left + r.right) / 2 < (wr.left + wr.right) / 2) il = Math.max(il, r.right - wr.left + gap); else ir = Math.max(ir, wr.right - r.left + gap); });
        } catch (e) { /* fit the whole canvas */ }
        const uf = usableFrame(w, h, il, ir); S.fitAspect = uf.aspect;
        if (!S.hold || S.shift === undefined) S.shift = uf.shift;
        if (S.shift) cam.setViewOffset(w, h, -S.shift, 0, w, h); else cam.clearViewOffset();
        cam.updateProjectionMatrix();
        if (S.follow && !S.hold && S.bounds) { if (S.tw) { S.tw.to.dist = fitDistance(fitBounds(S.bounds, live.current.ui.guides), S.tw.to.yaw, S.tw.to.pitch, cam.fov, S.fitAspect || cam.aspect); S.dirty = true; } else S.frameFor(null, false); }
      };
      resize(); if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(wrapRef.current); }

      /* ---- Look presets: lights, floor, background (the door is never rebuilt for a look change) ---- */
      const woodFloor = (base, seed) => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); const r = rng(seed); const bc = new THREE.Color(base); const rows = 8; const ph = 512 / rows;
        for (let row = 0; row < rows; row++) { let px = -r() * 256; while (px < 512) { const w = 200 + r() * 220; const t = bc.clone().offsetHSL(0, 0, (r() - 0.5) * 0.09); x.fillStyle = `#${t.getHexString()}`; x.fillRect(px, row * ph, w, ph); x.strokeStyle = `#${bc.clone().offsetHSL(0, 0, -0.16).getHexString()}`; x.globalAlpha = 0.5; x.lineWidth = 1.2; x.strokeRect(px, row * ph, w, ph); x.globalAlpha = 1; px += w; } }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
      };
      const clearEnv = () => { while (S.env.children.length) { const o = S.env.children[0]; S.env.remove(o); o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } }); } };
      S.applyLook = (force) => {
        const u = live.current.ui; const Wd = S.W; if (!Wd || !S.key) return;
        const id = lookOf(u.look); const P = LOOKS[id]; const xr = !!u.xray;
        const amb = P.amb || [0xffffff, 0.42]; const key = P.key || [0xfff6ea, xr ? 0.5 : 0.62];
        S.amb.color.setHex(amb[0]); S.amb.intensity = xr ? amb[1] + 0.08 : amb[1]; S.key.color.setHex(key[0]); S.key.intensity = xr ? Math.min(key[1], 0.5) : key[1];
        S.hemi.color.setHex(P.hemi[0]); S.hemi.groundColor.setHex(P.hemi[1]); S.hemi.intensity = P.hemi[2]; S.fill.intensity = P.fill;
        const pos = P.sun ? sunPosition(clampSun(u.sun), 6000, Wd.scene.bounds.h / 2) : [2200, Wd.scene.bounds.h / 2 + 3600, 3600];
        S.key.position.set(pos[0], pos[1], pos[2]); S.key.updateMatrixWorld();
        const env = P.env && !xr;
        S.scn.background = P.bg && !xr ? new THREE.Color(css(P.bg, 0xdddddd)) : null;
        const sig = `${id}|${xr}`;
        if (force || S.envSig !== sig) {
          clearEnv(); S.envSig = sig;
          if (env) {
            const big = 9000; const ft = woodFloor(css(P.env.floor, 0xc59c70), 5); ft.repeat.set(big / 1400, big / 1400);
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(big, big), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.8, metalness: 0 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -3, 0); floor.receiveShadow = true; S.env.add(floor);
          } else {
            const catcher = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.ShadowMaterial({ opacity: P.catcher * (xr ? 0.7 : 1) * 1.4 })); catcher.rotation.x = -Math.PI / 2; catcher.position.set(0, -2, 0); catcher.receiveShadow = true; S.env.add(catcher);
          }
        }
        wrapRef.current.dataset.look = id; wrapRef.current.dataset.sunDeg = String(clampSun(u.sun)); S.dirty = true;
      };

      /* selection outline */
      const clearSel = () => { (S.selObjs || []).forEach((o) => { if (o.parent) o.parent.remove(o); (o.userData.own || []).forEach((q) => q.dispose()); }); S.selObjs = []; };
      S.applySel = () => {
        clearSel(); const sl = live.current.sel; if (!sl || !S.root) { if (wrapRef.current) wrapRef.current.dataset.selMeshes = '0'; return; }
        const xr = !!live.current.ui.xray; const brand = new THREE.Color(xr ? css('--nk-select', 0xff8a24) : css('--brand', 0x356dff));
        const lineM = new THREE.LineBasicMaterial({ color: brand, transparent: true, opacity: 0.95, depthTest: false }); const hullM = new THREE.MeshBasicMaterial({ color: brand, side: THREE.BackSide, transparent: true, opacity: 0.5 });
        const targets = []; S.root.traverse((o) => { if (o.isMesh && o.userData && o.userData.unitId === sl.unitId && (!sl.partId || o.userData.partId === sl.partId)) targets.push(o); });
        targets.forEach((o) => {
          const eg = new THREE.EdgesGeometry(o.geometry); const ln = new THREE.LineSegments(eg, lineM); ln.renderOrder = 30; ln.userData = { own: [eg] }; o.add(ln); S.selObjs.push(ln);
          if (sl.partId && !xr && o.geometry.type === 'BoxGeometry') { o.geometry.computeBoundingBox(); const sz = new THREE.Vector3(); o.geometry.boundingBox.getSize(sz); const gr = (n) => (n > 0.5 ? (n + 8) / n : 1); const hull = new THREE.Mesh(o.geometry, hullM); hull.scale.set(gr(sz.x), gr(sz.y), gr(sz.z)); hull.userData = { own: [] }; o.add(hull); S.selObjs.push(hull); }
        });
        S.selObjs.push({ parent: null, userData: { own: [lineM, hullM] } });
        wrapRef.current.dataset.selMeshes = String(targets.length); S.dirty = true;
      };
      rebuild();
      { const pose = live.current.poseRef && live.current.poseRef.current;
        if (S.hold && pose) { S.yaw = pose.yaw; S.pitch = pose.pitch; S.dist = pose.dist; S.target.set(pose.tx, pose.ty, pose.tz); S.follow = false; S.dirty = true; } else { S.reset(true); if (S.hold) S.follow = false; } }
      setStatus('ok');

      /* pointer controls: same free-move contract as the kitchen viewport */
      const ptrs = new Map(); let moved = 0; let pinch = 0;
      const cur = () => ({ x: S.target.x, y: S.target.y, z: S.target.z });
      const setTarget = (t) => { const c = clampTarget(t, S.bounds); S.target.set(c.x, c.y, c.z); };
      const viewH = () => (wrapRef.current ? wrapRef.current.clientHeight : 0) || 600;
      const ndcOf = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
      const axisNdc = (e) => { const n = ndcOf(e); const r = canvas.getBoundingClientRect(); return { x: n.x - (2 * (S.shift || 0)) / Math.max(1, r.width), y: n.y }; };
      const pickAt = (e) => {
        const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(ndcOf(e).x, ndcOf(e).y), cam);
        const hits = rc.intersectObjects(S.root.children, true).filter((h) => h.object.userData && h.object.userData.partId);
        const top = pickSelectable(hits.map((h) => ({ userData: { ...h.object.userData, kind: ['glass', 'skin', 'panel'].includes(h.object.userData.kind) && live.current.ui.xray ? 'door' : h.object.userData.kind }, object: h.object })), !!live.current.ui.xray);
        return top ? hits.find((h) => h.object === top.object) || null : null;
      };
      const onDown = (e) => { if (gesturesAllowed(S.hold)) S.tw = null; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, go: false, btn: e.button, shift: e.shiftKey }); moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } };
      const onMove = (e) => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; moved = Math.max(moved, Math.abs(e.clientX - p.x0) + Math.abs(e.clientY - p.y0));
        if (!gesturesAllowed(S.hold)) { p.x = e.clientX; p.y = e.clientY; return; }
        if (!p.go && moved <= 4 && ptrs.size === 1) return; p.go = true; S.manual();
        if (ptrs.size === 2) { const [a0, b0] = [...ptrs.values()]; const mx0 = (a0.x + b0.x) / 2, my0 = (a0.y + b0.y) / 2; p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const dd2 = Math.hypot(a.x - b.x, a.y - b.y); if (pinch && dd2) S.dist = clampDist(S.dist * (pinch / dd2)); pinch = dd2; setTarget(panTarget(cur(), S.yaw, S.pitch, S.dist, (a.x + b.x) / 2 - mx0, (a.y + b.y) / 2 - my0, viewH(), cam.fov)); S.dirty = true; return; }
        p.x = e.clientX; p.y = e.clientY;
        if (p.btn === 2 || p.btn === 1 || p.shift) setTarget(panTarget(cur(), S.yaw, S.pitch, S.dist, dx, dy, viewH(), cam.fov)); else { S.yaw -= dx * 0.006; S.pitch = clampPitch(S.pitch + dy * 0.006); }
        S.dirty = true;
      };
      let hoverT = 0;
      const onHover = (e) => { if (ptrs.size || e.pointerType === 'touch') return; const now = performance.now(); if (now - hoverT < 70) return; hoverT = now; canvas.style.cursor = pickAt(e) ? 'pointer' : (S.hold ? 'default' : 'grab'); };
      const onUp = (e) => { const was = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinch = 0; if (was && moved < 5 && ptrs.size === 0 && live.current.onSelect) { const hit = pickAt(e); live.current.onSelect(hit ? { unitId: hit.object.userData.unitId, partId: hit.object.userData.partId } : null); } };
      const onWheel = (e) => { e.preventDefault(); if (!gesturesAllowed(S.hold)) return; S.manual(); const nd = clampDist(S.dist * wheelFactor(e.deltaY, e.deltaMode)); const n = axisNdc(e); setTarget(zoomAtCursor(cur(), S.yaw, S.pitch, S.dist, nd, n.x, n.y, cam.fov, cam.aspect)); S.dist = nd; S.dirty = true; };
      const onKey = (e) => {
        const k = e.key; const lk = k.length === 1 ? k.toLowerCase() : k; if (e.ctrlKey || e.metaKey) return;
        if (k === '0') { e.preventDefault(); S.reset(); return; } if (lk === 'f' && !e.shiftKey) { e.preventDefault(); S.fit(); return; }
        if (!gesturesAllowed(S.hold)) return;
        let used = true; const big = e.shiftKey ? 3 : 1; const nudge = (vx, vy) => setTarget(nudgeTarget(cur(), S.yaw, S.pitch, S.dist, vx * big, vy * big, viewH(), cam.fov));
        const orbit = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k);
        if (e.altKey && orbit) { if (k === 'ArrowLeft') S.yaw += 0.08; else if (k === 'ArrowRight') S.yaw -= 0.08; else if (k === 'ArrowUp') S.pitch = clampPitch(S.pitch + 0.06); else S.pitch = clampPitch(S.pitch - 0.06); } else if (e.altKey) used = false;
        else if (k === 'ArrowLeft' || lk === 'a') nudge(-1, 0); else if (k === 'ArrowRight' || lk === 'd') nudge(1, 0); else if (k === 'ArrowUp' || lk === 'w') nudge(0, 1); else if (k === 'ArrowDown' || lk === 's') nudge(0, -1);
        else if (lk === 'q') S.yaw += 0.08; else if (lk === 'e') S.yaw -= 0.08; else if (k === '+' || k === '=') S.dist = clampDist(S.dist * 0.9); else if (k === '-') S.dist = clampDist(S.dist * 1.1); else used = false;
        if (used) { S.manual(); e.preventDefault(); S.dirty = true; }
      };
      const onDbl = (e) => {
        const hit = pickAt(e); const pid = hit && hit.object.userData.partId; const part = pid && S.W.scene.parts.find((q) => q.id === pid);
        if (part && part.anim && live.current.onToggleFront) { live.current.onToggleFront(pid); return; }
        if (!gesturesAllowed(S.hold)) return; if (!hit) { S.fit(); return; }
        const box = new THREE.Box3().setFromObject(hit.object); const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length() / 2; const t = clampTarget({ x: c.x, y: c.y, z: c.z }, S.bounds); S.follow = false;
        S.tw = { t0: performance.now(), ms: 320, from: { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z }, to: { yaw: S.yaw, pitch: S.pitch, dist: Math.min(S.dist, focusDistance(r, cam.fov, S.fitAspect || cam.aspect)), tx: t.x, ty: t.y, tz: t.z } }; S.dirty = true;
      };
      const onCtx = (e) => e.preventDefault();
      canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointermove', onHover); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('keydown', onKey); canvas.addEventListener('dblclick', onDbl); canvas.addEventListener('contextmenu', onCtx);

      const apply = () => {
        const Wd = S.W; if (!Wd) return;
        const ex = S.exT;
        S.recs.forEach((r) => {
          if (r.motion) {
            const o = leafOpen(r.motion, live.current.d, Wd, easeInOut(r.t));
            r.node.position.set(r.base.x + o.dx, r.base.y, r.base.z); r.node.rotation.y = o.rotY; return;
          }
          if (r.part) {
            const p = r.part; const e = ex ? explodeOffset(p, ex, Wd.S) : [0, 0, 0];
            /* a leaf part's offset is expressed in door axes; the group is rotated, so it is applied in the group's own (leaf) axes: the same here because explode and open do not mix (Open is 0 while exploded parts are far apart) */
            r.node.position.set(r.base.x + e[0], r.base.y + e[1], r.base.z + e[2]);
          }
        });
      };
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const u = live.current.ui;
        if (S.tw) { const k = easeOut((performance.now() - S.tw.t0) / S.tw.ms); const a = S.tw.from; const b = S.tw.to; S.yaw = a.yaw + (b.yaw - a.yaw) * k; S.pitch = a.pitch + (b.pitch - a.pitch) * k; S.dist = a.dist + (b.dist - a.dist) * k; S.target.set(a.tx + (b.tx - a.tx) * k, a.ty + (b.ty - a.ty) * k, a.tz + (b.tz - a.tz) * k); if (k >= 1) S.tw = null; S.dirty = true; }
        const tEx = u.explode.on ? Math.max(0, Math.min(1, u.explode.amt)) : 0;
        const step = (c, t) => { if (reduce()) return t; const dd2 = t - c; if (Math.abs(dd2) < 0.002) return t; return c + dd2 * 0.12 + Math.sign(dd2) * 0.002; };
        const ne = step(S.exT, tEx); if (ne !== S.exT) { S.exT = ne; S.dirty = true; }
        const nowT = performance.now(); const dtMs = S.lastT ? Math.min(100, nowT - S.lastT) : 16; S.lastT = nowT;
        const spd = u.openSpeed || 1; let sum = 0; let cnt = 0;
        S.recs.forEach((r) => {
          if (!r.motion) return;
          let tgt = 0; if (u.openIds && u.openIds.size) { for (const id of r.ids) if (u.openIds.has(id)) { tgt = 1; break; } }
          const nt = openStep(r.t, tgt, dtMs, spd, reduce()); if (nt !== r.t) { r.t = nt; S.dirty = true; } sum += r.t; cnt++;
        });
        S.openT = cnt ? sum / cnt : 0;
        if (S.dirty) {
          apply();
          cam.position.set(S.target.x + S.dist * Math.cos(S.pitch) * Math.sin(S.yaw), S.target.y + S.dist * Math.sin(S.pitch), S.target.z + S.dist * Math.cos(S.pitch) * Math.cos(S.yaw)); cam.lookAt(S.target);
          if (S.sprites) S.sprites.forEach((sp) => { const k = S.dist * 0.02; sp.scale.set(k * 4, k, 1); });
          renderer.render(scn, cam); S.dirty = false;
          const dsx = wrapRef.current && wrapRef.current.dataset;
          if (dsx) { dsx.openT = S.openT.toFixed(3); dsx.explodeT = S.exT.toFixed(3); dsx.frames = String((+dsx.frames || 0) + 1); dsx.yaw = S.yaw.toFixed(3); dsx.pitch = S.pitch.toFixed(3); dsx.dist = String(Math.round(S.dist)); dsx.follow = S.follow ? '1' : '0'; dsx.hold = S.hold ? '1' : '0'; dsx.openMs = String(Math.round(openDurationMs(spd))); dsx.calls = String(renderer.info.render.calls); dsx.tris = String(renderer.info.render.triangles); }
        }
      };
      loop();
      S.cleanup = () => {
        cancelAnimationFrame(raf); if (ro) ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointermove', onHover); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('keydown', onKey); canvas.removeEventListener('dblclick', onDbl); canvas.removeEventListener('contextmenu', onCtx);
        const pr = live.current.poseRef; if (pr && S.target) pr.current = { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z };
        if (S.envTex && S.envTex.dispose) S.envTex.dispose(); renderer.dispose();
      };
    }).catch(() => { if (alive) setStatus('fail'); });
    return () => { alive = false; cancelAnimationFrame(raf); const S = st.current; if (S && S.cleanup) S.cleanup(); st.current = {}; };
  }, [rebuild, attempt]);

  const sig = [W, ui.layers, ui.xray, ui.grid, ui.guides, ui.explode.on, output.precision];
  useEffect(() => { if (!(st.current.root && window.THREE)) return undefined; const t = setTimeout(() => rebuild(), 40); return () => clearTimeout(t); }, sig); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const S = st.current; if (S.root && S.applySel) S.applySel(); }, [sel]);
  useEffect(() => { const S = st.current; if (S.root && S.applyLook) S.applyLook(false); }, [ui.look, ui.sun]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const S = st.current; S.hold = !!ui.hold; if (S.hold) { S.follow = false; S.tw = null; } if (wrapRef.current) wrapRef.current.dataset.hold = S.hold ? '1' : '0'; }, [ui.hold]);
  useEffect(() => { const S = st.current; if (!camCmd || !S.fit) return; if (camCmd.name === 'fit') S.fit(); else if (camCmd.name === 'reset') S.reset(); else S.view(camCmd.name); }, [camCmd]);
  useEffect(() => { const S = st.current; if (S.root) S.dirty = true; }, [ui.openIds, ui.openSpeed, ui.explode.on, ui.explode.amt]);

  const msg = status === 'fail' ? (lang === 'ar' ? 'العرض ثلاثي الأبعاد يحتاج اتصالًا بالإنترنت (Three.js).' : '3D needs an internet connection (Three.js from the CDN).')
    : status === 'nogl' ? (lang === 'ar' ? 'المتصفح لا يدعم WebGL.' : 'WebGL is not available in this browser.')
      : status === 'loading' ? (lang === 'ar' ? 'جارِ تحميل العرض ثلاثي الأبعاد…' : 'Loading the 3D view…') : '';
  return (
    <div ref={wrapRef} className="nk-3d" data-status={status} data-open-t="0" data-explode-t="0">
      <canvas ref={canvasRef} className="nk-canvas" tabIndex={0} role="img" aria-label={label ? label[lang === 'ar' ? 1 : 0] : '3D door view'} style={{ display: status === 'ok' ? 'block' : 'none' }} />
      {msg && (
        <div className="nk-3d-msg" role="status" data-kind={status}>
          {status === 'loading' && <span className="nk-spin" aria-hidden="true" />}<span>{msg}</span>
          {(status === 'fail' || status === 'nogl') && <button type="button" className="nk-btn" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1); }}>{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}</button>}
        </div>
      )}
    </div>
  );
}
