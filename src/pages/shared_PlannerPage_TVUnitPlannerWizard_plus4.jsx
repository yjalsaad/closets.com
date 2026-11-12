// Route chunk "shared_PlannerPage_TVUnitPlannerWizard_plus4" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: PlannerPage, TVUnitPlannerWizard, OfficePlannerWizard, WardrobePlannerWizard, DoorPlannerWizard, KitchenPlannerWizard.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect, useRef, useCallback } from 'react';
import WebGLGate from '../safety/WebGLGate';
import { fitModules, WARDROBE_WIDTHS } from '../moduleFit';
import { aiFetch } from '../privacy/ai';
import TVUnit3D from '../TVUnit3D';
import Door3D from '../Door3D';
import Office3D from '../Office3D';
import KitchenScene3D from '../KitchenScene3D';
import { ModalPanel } from '../a11y/dialog';
import { I18N, SUPA_KEY, SUPA_URL, api, fmt, useI18n } from '../App';

// ── Wave 3: Room Designer DB-driven values (scene_surfaces.label, material group/name). ──
// Common English values get Arabic; unknown values fall back to English unchanged.
const RD_KEY = {
  'Cabinets':'rdsCabinets', 'Worktop':'rdsWorktop', 'Splashback':'rdsSplashback',
  'Backsplash':'rdsBacksplash', 'Wall':'rdsWall', 'Floor':'rdsFloor', 'Handles':'rdsHandles',
  'Door face':'rdsDoorFace', 'Door front':'rdsDoorFront', 'Frame':'rdsFrame', 'Units':'rdsUnits',
  'Feature wall':'rdsFeatureWall', 'Shelves':'rdsShelves', 'Desk top':'rdsDeskTop',
  'Interior':'rdsInterior', 'Carcass':'rdsCarcass', 'Body':'rdsBody', 'Countertop':'rdsCountertop',
  // material group / name values
  'Finishes':'rdmFinishes', 'Solid colour':'rdmSolidColour', 'Solid color':'rdmSolidColor',
  'Woodgrain':'rdmWoodgrain', 'Stone':'rdmStone', 'Quartz':'rdmQuartz', 'Granite':'rdmGranite',
  'Marble':'rdmMarble', 'Oak Veneer':'rdmOakVeneer', 'Walnut Veneer':'rdmWalnutVeneer',
  'Matt':'rdmMatt', 'Gloss':'rdmGloss',
};

// trRd(value, lang): translate a Room Designer DB value; English fallback for unknowns.
function trRd(value, lang) {
  if (!value) return value;
  const k = RD_KEY[value];
  return (k && I18N[k]) ? (I18N[k][lang] || I18N[k].en) : value;
}

// Load three.js r128 once (self-hosted: public/vendor/three-r128.min.js, no third-party CDN); returns true when window.THREE is ready.
// Kept at r128 on purpose: the bundled three 0.160 renders these scenes differently (colour management, light units, ACES, CapsuleGeometry).
function useThreeLoaded() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.THREE);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || window.THREE) { setReady(true); return; }
    let s = document.getElementById('three-cdn');
    const onLoad = () => setReady(true);
    const onErr = () => setFailed(true);
    const timer = setTimeout(() => { if (!window.THREE) setFailed(true); }, 9000);
    if (!s) {
      s = document.createElement('script');
      s.id = 'three-cdn';
      s.src = '/vendor/three-r128.min.js';
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener('load', onLoad);
    s.addEventListener('error', onErr);
    return () => { clearTimeout(timer); if (s) { s.removeEventListener('load', onLoad); s.removeEventListener('error', onErr); } };
  }, []);
  return { ready, failed };
}

// Live 3D wardrobe preview. Recolours/reshapes from props; drag to rotate.
// [RESILIENCE] WebGL-less devices get a clear message instead of a crash; the caller's own `fallback` is used when given
function Wardrobe3D(props) { return <WebGLGate name="wardrobe3d" inline fallback={props.fallback}><Wardrobe3DInner {...props} /></WebGLGate>; }

function Wardrobe3DInner({ finishHex, layout, glass, handles, led, mobile, fallback, tall, widthCm, heightCm, depthCm, sideACm, sideBCm, product, apiRef, unit = 'cm', preset = 'iso', scaleMode = 'fit' }) {
  const { ready, failed } = useThreeLoaded();
  const { t } = useI18n();
  const mountRef = useRef(null);
  const stateRef = useRef({ finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode });
  const sceneRef = useRef(null);
  useEffect(() => { stateRef.current = { finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode }; if (sceneRef.current) sceneRef.current.rebuild(); }, [finishHex, layout, glass, handles, led, widthCm, heightCm, depthCm, sideACm, sideBCm, product, unit, scaleMode]);
  // Camera preset changes are applied imperatively (no rebuild needed).
  // Unit changes flow through the stateRef effect above (rebuild regenerates labels).
  useEffect(() => { if (sceneRef.current && sceneRef.current.setPreset) sceneRef.current.setPreset(preset); }, [preset]);

  useEffect(() => {
    if (!ready || !mountRef.current || !window.THREE) return;
    const THREE = window.THREE;
    const mount = mountRef.current;
    // Measure after layout settles to avoid a 0/skewed aspect ratio
    let w = mount.clientWidth || 600, h = mount.clientHeight || 460;
    if (w < 50) w = 600; if (h < 50) h = 460;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100); camera.position.set(0, 0, 9);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    // ── Image-based lighting: soft studio environment (procedural, no asset) ──
    // Gives MeshStandardMaterial realistic reflections/sheen so wood & paint read as real.
    let envTex = null;
    try {
      const ec = document.createElement('canvas'); ec.width = 32; ec.height = 128;
      const eg = ec.getContext('2d');
      const grd = eg.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0.00, '#ffffff'); grd.addColorStop(0.42, '#eef2f6');
      grd.addColorStop(0.62, '#d2dae1'); grd.addColorStop(0.80, '#b4bdc6'); grd.addColorStop(1.00, '#8e98a2');
      eg.fillStyle = grd; eg.fillRect(0, 0, 32, 128);
      const rgl = eg.createRadialGradient(16, 24, 2, 16, 24, 26); // overhead softbox highlight
      rgl.addColorStop(0, 'rgba(255,255,255,0.95)'); rgl.addColorStop(1, 'rgba(255,255,255,0)');
      eg.fillStyle = rgl; eg.fillRect(0, 0, 32, 60);
      const eTex = new THREE.CanvasTexture(ec);
      eTex.mapping = THREE.EquirectangularReflectionMapping; eTex.encoding = THREE.sRGBEncoding;
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromEquirectangular(eTex).texture;
      scene.environment = envTex; eTex.dispose(); pmrem.dispose();
    } catch (e) { /* IBL optional */ }

    // ── Lights: soft fill + warm key + cool rim for form definition ──
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb6c0ca, 0.5));
    const k = new THREE.DirectionalLight(0xffffff, 1.05); k.position.set(5, 8, 6); scene.add(k);
    const f = new THREE.DirectionalLight(0xfff2e6, 0.32); f.position.set(-6, 3, -4); scene.add(f);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.4); rim.position.set(0, 5, -8); scene.add(rim);

    // ── Procedural wood-grain micro-roughness (canvas, no asset) ──
    const grain = (() => {
      const gc = document.createElement('canvas'); gc.width = 256; gc.height = 256;
      const gx = gc.getContext('2d'); gx.fillStyle = '#9a9a9a'; gx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 240; i++) {
        const x = Math.random() * 256, a = 0.04 + Math.random() * 0.10, lite = Math.random() > 0.5 ? 235 : 70;
        gx.strokeStyle = `rgba(${lite},${lite},${lite},${a})`;
        gx.lineWidth = 0.5 + Math.random() * 1.5; gx.beginPath(); gx.moveTo(x, 0);
        gx.bezierCurveTo(x + (Math.random() * 8 - 4), 85, x + (Math.random() * 8 - 4), 170, x + (Math.random() * 6 - 3), 256); gx.stroke();
      }
      const tx = new THREE.CanvasTexture(gc); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 2); return tx;
    })();

    let group = null, raf = 0, drag = false, px = 0, py = 0, rotY = -0.5, rotX = 0.05;
    // interactive-configurator targets (smooth orbit + zoom)
    let zoom = 9, tRotY = -0.5, tRotX = 0.05, tZoom = 9, pinchD = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const mat = (c) => {
      const col = new THREE.Color(c);
      const lum = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
      const metalHw = lum < 0.13; // near-black -> handle / hardware
      return new THREE.MeshStandardMaterial({
        color: col,
        roughness: metalHw ? 0.34 : 0.6,
        metalness: metalHw ? 0.85 : 0.0,
        roughnessMap: metalHw ? null : grain,
        envMapIntensity: metalHw ? 1.4 : 1.2,
      });
    };
    const box = (bw, bh, bd, m) => new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);

    // runMm (optional): the REAL run width in millimetres. When a finite, positive
    // value is supplied, the wardrobe front is divided into discrete STANDARD-WIDTH
    // bays via fitModules(runMm, { widths: WARDROBE_WIDTHS }) so the 3D shows real,
    // standard-width sections (with a thin divider between bays + a handle per bay).
    // When runMm is omitted/invalid, we fall back to the legacy even `W / doors`
    // division so existing callers (side runs, etc.) are byte-for-byte unchanged.
    function cabinet(W, H, D, doors, st, runMm) {
      const fin = st.finishHex || '#c89b5e';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.7));
      const doorMat = st.glass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      const back = box(W, H, 0.08, carc); back.position.z = -D / 2; g.add(back);
      [-1, 1].forEach(s => { const sd = box(0.08, H, D, carc); sd.position.x = s * W / 2; g.add(sd); });
      const t = box(W, 0.08, D, carc); t.position.y = H / 2; g.add(t);
      const b = t.clone(); b.position.y = -H / 2; g.add(b);

      // Build the per-bay width list (scene units) that fills W exactly.
      const rmm = Number(runMm);
      let bays = null;
      if (Number.isFinite(rmm) && rmm > 0 && Number.isFinite(W) && W > 0) {
        const fit = fitModules(rmm, { widths: WARDROBE_WIDTHS });
        const sum = fit.reduce((s, m) => s + (Number(m.width) > 0 ? Number(m.width) : 0), 0);
        if (fit.length && sum > 0) {
          // Normalise so the fitted bay widths exactly span W (no slivers/overflow).
          bays = fit.map(m => W * (Number(m.width) / sum));
        }
      }
      if (!bays) {
        // Legacy even division (also the NaN/0 guard fallback).
        const n = Math.max(1, Math.round(Number(doors) > 0 ? doors : 1));
        const dw = W / n;
        bays = new Array(n).fill(dw);
      }

      // Lay bays left→right, each as a front panel + (between bays) a thin divider + a handle.
      let cursor = -W / 2;
      const dividerMat = carc;
      for (let i = 0; i < bays.length; i++) {
        const bw = bays[i] > 0 ? bays[i] : (W / bays.length);
        const dx = cursor + bw / 2;
        const dr = box(bw * 0.92, H * 0.94, 0.06, doorMat); dr.position.set(dx, 0, D / 2); g.add(dr);
        // vertical divider on the trailing edge of every bay except the last
        if (i < bays.length - 1) {
          const dv = box(0.04, H * 0.96, D * 0.9, dividerMat); dv.position.set(cursor + bw, 0, 0); g.add(dv);
        }
        if (st.handles) {
          const hd = box(0.05, 0.45, 0.05, mat(0x1a1a1a));
          // alternate handle side per bay so adjacent doors read as opening apart
          hd.position.set(dx + (i % 2 === 0 ? bw * 0.36 : -bw * 0.36), 0, D / 2 + 0.08); g.add(hd);
        }
        cursor += bw;
      }
      if (st.led) { const l = box(W * 0.9, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, H / 2 - 0.08, D / 2 - 0.08); g.add(l); }
      return g;
    }
    function buildTV(st) {
      const fin = st.finishHex || '#c89b5e';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.72));
      const doorMat = st.glass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      // wide low media console
      const W = Math.max(3.5, Math.min(8, (st.widthCm || 200) / 38));
      const D = Math.max(0.8, Math.min(1.6, (st.depthCm || 40) / 32));
      const consoleH = 1.1;
      const consoleY = st.layout === 'floor' ? -1.6 : -0.6; // floor stands lower
      const body = box(W, consoleH, D, mat(fin)); body.position.set(0, consoleY, 0); g.add(body);
      // cabinet doors / drawers across the console
      const cells = Math.max(2, Math.round(W / 1.6));
      const cw = W / cells;
      for (let i = 0; i < cells; i++) {
        const dx = -W / 2 + cw / 2 + i * cw;
        const dr = box(cw * 0.9, consoleH * 0.82, 0.06, doorMat); dr.position.set(dx, consoleY, D / 2 + 0.01); g.add(dr);
        if (st.handles) { const hd = box(cw * 0.3, 0.05, 0.05, mat(0x1a1a1a)); hd.position.set(dx, consoleY + consoleH * 0.28, D / 2 + 0.08); g.add(hd); }
      }
      // TV screen above
      const tvW = Math.min(W * 0.8, 4.2), tvH = tvW * 0.56;
      const screen = box(tvW, tvH, 0.08, mat(0x111114));
      const screenY = consoleY + consoleH / 2 + tvH / 2 + 0.5;
      screen.position.set(0, screenY, -0.1); g.add(screen);
      const bezelGlow = box(tvW * 0.96, tvH * 0.9, 0.02, new THREE.MeshBasicMaterial({ color: 0x1a2733 }));
      bezelGlow.position.set(0, screenY, -0.05); g.add(bezelGlow);
      // full-wall: side tower units
      if (st.layout === 'full-wall') {
        [-1, 1].forEach(s => {
          const towerH = tvH + consoleH + 1.4;
          const tower = box(1.1, towerH, D, mat(fin));
          tower.position.set(s * (W / 2 + 0.7), consoleY + towerH / 2 - consoleH / 2, 0); g.add(tower);
        });
      }
      // LED backlight glow behind the screen
      if (st.led) {
        const glow = box(tvW * 1.1, tvH * 1.1, 0.02, new THREE.MeshBasicMaterial({ color: 0xfff3d0 }));
        glow.position.set(0, screenY, -0.2); g.add(glow);
      }
      return g;
    }
    function buildDoors(st) {
      const fin = st.finishHex || '#c89b5e';
      const frameMat = mat(new THREE.Color(fin).multiplyScalar(0.6));
      const isGlass = st.glass;
      const doorMat = isGlass ? new THREE.MeshStandardMaterial({ color: new THREE.Color(fin), transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0, envMapIntensity: 1.6 }) : mat(fin);
      const g = new THREE.Group();
      const W = Math.max(2.2, Math.min(5, (st.widthCm || 90) / 26));
      const H = Math.max(3.6, Math.min(5.6, (st.heightCm || 210) / 42));
      const D = 0.18;
      // door frame
      const fr = 0.18;
      [[-W/2, 0, fr, H], [W/2, 0, fr, H], [0, H/2, W + fr, fr], [0, -H/2, W + fr, fr]].forEach(([x, y, fw, fh]) => {
        const bar = box(fw, fh, 0.22, frameMat); bar.position.set(x, y, 0); g.add(bar);
      });
      const leaves = st.layout === 'sliding' ? 2 : (st.layout === 'folding' ? 3 : 2);
      const lw = W / leaves;
      for (let i = 0; i < leaves; i++) {
        const dx = -W / 2 + lw / 2 + i * lw;
        const z = st.layout === 'sliding' ? (i % 2 ? 0.12 : -0.02) : 0;
        const leaf = box(lw * 0.94, H * 0.96, D, doorMat); leaf.position.set(dx, 0, z); g.add(leaf);
        if (isGlass) { const pane = box(lw * 0.7, H * 0.78, 0.02, new THREE.MeshStandardMaterial({ color: 0xcfe0e8, transparent: true, opacity: 0.4, roughness: 0.06, metalness: 0, envMapIntensity: 1.7 })); pane.position.set(dx, 0, z + D / 2); g.add(pane); }
        if (st.handles) { const hd = box(0.07, 0.7, 0.07, mat(0x1a1a1a)); hd.position.set(dx + (i < leaves / 2 ? lw * 0.34 : -lw * 0.34), 0, z + D / 2 + 0.06); g.add(hd); }
      }
      return g;
    }

    function buildKitchen(st) {
      const fin = st.finishHex || '#f3f3f1';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.85));
      const worktop = mat(0xe8e4dc);
      const g = new THREE.Group();
      const W = Math.max(4, Math.min(8.5, (st.widthCm || 300) / 42));
      const D = 1.4, baseH = 2.0, baseY = -1.4;
      function run(rw, x, z, ry) {
        const r = new THREE.Group();
        const body = box(rw, baseH, D, mat(fin)); body.position.y = baseY; r.add(body);
        const cells = Math.max(2, Math.round(rw / 1.5)), cw = rw / cells;
        for (let i = 0; i < cells; i++) { const dx = -rw / 2 + cw / 2 + i * cw; const dr = box(cw * 0.9, baseH * 0.88, 0.06, mat(new THREE.Color(fin).multiplyScalar(1.04))); dr.position.set(dx, baseY, D / 2 + 0.01); r.add(dr); if (st.handles) { const h = box(0.05, 0.4, 0.05, mat(0x1a1a1a)); h.position.set(dx, baseY + baseH * 0.3, D / 2 + 0.07); r.add(h); } }
        const ct = box(rw + 0.1, 0.16, D + 0.1, worktop); ct.position.set(0, baseY + baseH / 2 + 0.08, 0); r.add(ct);
        r.position.set(x, 0, z); if (ry) r.rotation.y = ry; return r;
      }
      g.add(run(W, 0, 0, 0));
      const side = Math.max(2.5, W * 0.5);
      if (st.layout === 'l-shape' || st.layout === 'u-shape') { g.add(run(side, -(W / 2 + D / 2), side / 2 - D / 2, Math.PI / 2)); }
      if (st.layout === 'u-shape') { g.add(run(side, (W / 2 + D / 2), side / 2 - D / 2, -Math.PI / 2)); }
      if (st.layout === 'parallel') { g.add(run(W, 0, 3.4, Math.PI)); }
      if (st.layout === 'island') { const isl = new THREE.Group(); const ib = box(2.8, 1.4, 1.5, mat(fin)); ib.position.y = -1.6; isl.add(ib); const it = box(3.0, 0.16, 1.7, worktop); it.position.y = -0.82; isl.add(it); isl.position.set(0, 0, 3.4); g.add(isl); }
      if (st.led) { const l = box(W * 0.9, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, baseY + baseH / 2 + 0.2, D / 2 - 0.1); g.add(l); }
      return g;
    }

    function buildStorage(st) {
      const fin = st.finishHex || '#f3f3f1';
      const carc = mat(new THREE.Color(fin).multiplyScalar(0.72));
      const doorMat = mat(fin);
      const g = new THREE.Group();
      const W = Math.max(2, Math.min(6, (st.widthCm || 120) / 40));
      const H = Math.max(3, Math.min(6, (st.heightCm || 180) / 40));
      const D = Math.max(0.7, Math.min(1.4, (st.depthCm || 40) / 32));
      // outer carcass
      const back = box(W, H, 0.06, carc); back.position.z = -D / 2; g.add(back);
      [-1, 1].forEach(s => { const sd = box(0.08, H, D, carc); sd.position.x = s * W / 2; g.add(sd); });
      const t = box(W, 0.08, D, carc); t.position.y = H / 2; g.add(t); const b = t.clone(); b.position.y = -H / 2; g.add(b);
      // shelves
      const rows = Math.max(3, Math.round(H / 1.2));
      for (let r = 1; r < rows; r++) { const sh = box(W * 0.96, 0.06, D * 0.92, carc); sh.position.y = -H / 2 + (H / rows) * r; g.add(sh); }
      // closed lower section if 'closed' or 'mixed'
      if (st.layout === 'closed' || st.layout === 'mixed') {
        const closedH = st.layout === 'mixed' ? H * 0.4 : H * 0.94;
        const cells = Math.max(2, Math.round(W / 1.4)), cw = W / cells;
        for (let i = 0; i < cells; i++) { const dx = -W / 2 + cw / 2 + i * cw; const dr = box(cw * 0.92, closedH * 0.94, 0.05, doorMat); dr.position.set(dx, -H / 2 + closedH / 2, D / 2); g.add(dr); if (st.handles) { const h = box(0.05, 0.3, 0.05, mat(0x1a1a1a)); h.position.set(dx + cw * 0.3, -H / 2 + closedH / 2, D / 2 + 0.06); g.add(h); } }
      }
      if (st.led) { const l = box(W * 0.9, 0.04, 0.04, new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); l.position.set(0, H / 2 - 0.06, D / 2 - 0.06); g.add(l); }
      return g;
    }

    // ── Dimension annotations that live IN the scene (track rotation/zoom) ──
    let curUnit = stateRef.current.unit || 'cm';
    let floorGroup = null;       // faint floor grid + human reference (True-scale)
    const DIM_COL = 0x9a6a3c;    // literal hex only (clay-deep family) — never a CSS var
    // A sprite text label drawn onto a CanvasTexture (literal hex strings only).
    function makeLabel(text) {
      const pad = 8, fs = 44;
      const c = document.createElement('canvas');
      const cx = c.getContext('2d');
      cx.font = `700 ${fs}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      const tw = Math.ceil(cx.measureText(text).width);
      c.width = tw + pad * 2 + 4; c.height = fs + pad * 2;
      const x = c.getContext('2d');
      // rounded pill background
      const r = 14, w = c.width, h = c.height;
      x.fillStyle = 'rgba(250,245,238,0.94)';
      x.strokeStyle = '#e3d6c6'; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(r, 0); x.arcTo(w, 0, w, h, r); x.arcTo(w, h, 0, h, r);
      x.arcTo(0, h, 0, 0, r); x.arcTo(0, 0, w, 0, r); x.closePath();
      x.fill(); x.stroke();
      x.fillStyle = '#3a2a1c';
      x.font = `700 ${fs}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
      x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(text, w / 2, h / 2 + 2);
      const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.renderOrder = 999;
      const scl = 0.0042; sp.scale.set(c.width * scl, c.height * scl, 1);
      return sp;
    }
    const fmtVal = (cm) => curUnit === 'in'
      ? (Math.round((cm / 2.54) * 10) / 10) + ' in'
      : Math.round(cm) + ' cm';
    // Coerce a possibly-missing dimension to a finite number (matches the geometry defaults
    // below) so dimension labels never render "NaN cm".
    const num = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };
    // A leader line (THREE.Line) with two short end ticks.
    function dimLine(ax, ay, az, bx, by, bz) {
      const g = new THREE.Group();
      const mLine = new THREE.LineBasicMaterial({ color: DIM_COL, transparent: true, opacity: 0.9, depthTest: false });
      const pts = [new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)];
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mLine);
      ln.renderOrder = 998; g.add(ln);
      return g;
    }
    // Build measurement leaders around the model's (post-fit) bounding box.
    function addDimensions(target, st) {
      try {
        const bb = new THREE.Box3().setFromObject(target);
        if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const dg = new THREE.Group();
        const off = Math.max(sz.x, sz.y, sz.z) * 0.12 + 0.25;
        const minX = bb.min.x, maxX = bb.max.x, minY = bb.min.y, maxY = bb.max.y, maxZ = bb.max.z, minZ = bb.min.z;
        const isAB = (st.product === 'wardrobe' || st.product === 'walkin') && st.layout === 'l-shape';
        // WIDTH — along bottom front edge
        const wy = minY - off, wz = maxZ;
        dg.add(dimLine(minX, wy, wz, maxX, wy, wz));
        const wl = makeLabel(isAB ? `W ${fmtVal((Number(st.sideACm)||0)+(Number(st.sideBCm)||0))}` : `W ${fmtVal(num(st.widthCm, 180))}`);
        wl.position.set((minX + maxX) / 2, wy - off * 0.5, wz); dg.add(wl);
        // HEIGHT — along left edge
        const hx = minX - off, hz = maxZ;
        dg.add(dimLine(hx, minY, hz, hx, maxY, hz));
        const hl = makeLabel(`H ${fmtVal(num(st.heightCm, 240))}`);
        hl.position.set(hx - off * 0.5, (minY + maxY) / 2, hz); dg.add(hl);
        // DEPTH — along one bottom corner (z axis)
        const dx = maxX + off * 0.6, dy = minY;
        dg.add(dimLine(dx, dy, minZ, dx, dy, maxZ));
        const dl = makeLabel(`D ${fmtVal(num(st.depthCm, 60))}`);
        dl.position.set(dx + off * 0.5, dy, (minZ + maxZ) / 2); dg.add(dl);
        // L-shape legs A / B
        if (isAB) {
          const al = makeLabel(`A ${fmtVal(st.sideACm)}`);
          al.position.set(minX + sz.x * 0.25, minY - off * 1.4, wz); dg.add(al);
          const bl = makeLabel(`B ${fmtVal(st.sideBCm)}`);
          bl.position.set(maxX - sz.x * 0.25, minY - off * 1.4, wz); dg.add(bl);
        }
        target.add(dg);
      } catch (e) { /* dims optional */ }
    }
    // Faint floor grid + a subtle human-scale silhouette for True-scale mode.
    function addFloor(target, st) {
      try {
        if (st.scaleMode !== 'true') return;
        const bb = new THREE.Box3().setFromObject(target);
        const sz = new THREE.Vector3(); bb.getSize(sz);
        const fg = new THREE.Group();
        const span = Math.max(sz.x, sz.z) * 2.4 + 2;
        const grid = new THREE.GridHelper(span, Math.max(6, Math.round(span)), 0xcfc4b4, 0xe3dccf);
        grid.material.transparent = true; grid.material.opacity = 0.5;
        grid.position.y = bb.min.y - 0.01; fg.add(grid);
        // human-scale reference (~170cm) standing beside the model
        const hRef = (170 / (st.heightCm || 240)) * sz.y; // 170cm relative to model height
        const torso = new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(hRef * 0.09, hRef * 0.62, 4, 8) : new THREE.CylinderGeometry(hRef * 0.09, hRef * 0.09, hRef * 0.8, 8),
          new THREE.MeshStandardMaterial({ color: 0xbcae9c, transparent: true, opacity: 0.5, roughness: 1 }));
        torso.position.set(bb.max.x + hRef * 0.45, bb.min.y + hRef * 0.5, bb.max.z);
        fg.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(hRef * 0.11, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xbcae9c, transparent: true, opacity: 0.5, roughness: 1 }));
        head.position.set(bb.max.x + hRef * 0.45, bb.min.y + hRef * 0.92, bb.max.z);
        fg.add(head);
        target.add(fg);
      } catch (e) { /* floor optional */ }
    }

    // Free GPU/JS memory for a group's meshes before discarding it — Wardrobe3D
    // rebuilds on every dimension/finish/layout change, so without this the
    // geometries/materials/textures leak and the scene degrades over a session.
    function disposeObj3D(obj) {
      if (!obj) return;
      obj.traverse(n => {
        if (n.geometry) { try { n.geometry.dispose(); } catch (e) {} }
        const m = n.material;
        if (m) { (Array.isArray(m) ? m : [m]).forEach(mm => { try { if (mm && mm.map) mm.map.dispose(); if (mm) mm.dispose(); } catch (e) {} }); }
      });
    }
    function rebuild() {
      const st = stateRef.current;
      curUnit = st.unit || 'cm';
      if (group) { scene.remove(group); disposeObj3D(group); }
      group = new THREE.Group();
      if (st.product === 'tv') {
        group.add(buildTV(st));
        scene.add(group); finishBuild(group, st);
        return;
      }
      if (st.product === 'doors') { group.add(buildDoors(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'kitchen') { group.add(buildKitchen(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'storage') { group.add(buildStorage(st)); scene.add(group); finishBuild(group, st); return; }
      if (st.product === 'walkin') {
        const W = Math.max(3, Math.min(7, (st.widthCm || 300) / 50));
        const H = Math.max(3.5, Math.min(6, (st.heightCm || 240) / 50));
        const D = Math.max(0.9, Math.min(1.6, (st.depthCm || 60) / 42));
        const sideW = Math.max(2, W * 0.7);
        // back run always — discrete standard-width bays from the real run width
        group.add(cabinet(W, H, D, Math.max(2, Math.round(W / 1.4)), st, (Number(st.widthCm) > 0 ? Number(st.widthCm) : 300) * 10));
        const left = () => { const c = cabinet(sideW, H, D, 2, st); c.position.set(-(W/2+D/2), 0, sideW/2 - D/2); c.rotation.y = Math.PI/2; return c; };
        const right = () => { const c = cabinet(sideW, H, D, 2, st); c.position.set(W/2+D/2, 0, sideW/2 - D/2); c.rotation.y = -Math.PI/2; return c; };
        if (st.layout === 'u-shape') { group.add(left()); group.add(right()); }
        if (st.layout === 'l-shape') { group.add(left()); }
        if (st.layout === 'parallel') { group.add(left()); group.add(right()); }
        scene.add(group); finishBuild(group, st);
        return;
      }
      // ── Consistent cm → scene scale so the model TRULY reflects entered dims ──
      // One scale for all axes; the whole group is auto-fit afterwards so it always frames nicely.
      const CM = 1 / 50; // 50cm ≈ 1 scene unit (pre auto-fit)
      const W = (st.widthCm || 200) * CM;
      const H = (st.heightCm || 240) * CM;
      const D = Math.max(0.4, (st.depthCm || 60) * CM);
      const doors = Math.max(2, Math.min(6, Math.round((st.widthCm || 200) / 90)));
      // Discrete standard-width bays from the real run width (widthCm → mm).
      const main = cabinet(W, H, D, doors, st, (Number(st.widthCm) > 0 ? Number(st.widthCm) : 200) * 10); group.add(main);
      const sideW = Math.max(1.2, W * 0.6);
      if (st.layout === 'l-shape') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); }
      if (st.layout === 'walk-in') { const w2 = cabinet(sideW, H, D, 2, st); w2.position.set(-(W/2+D/2), 0, sideW/2 - D/2); w2.rotation.y = Math.PI / 2; group.add(w2); const w3 = cabinet(sideW, H, D, 2, st); w3.position.set(W/2+D/2, 0, sideW/2 - D/2); w3.rotation.y = -Math.PI / 2; group.add(w3); }
      scene.add(group);
      finishBuild(group, st);
    }
    // After the model is built: fit/scale it, then attach dimension leaders + (optional) floor.
    function finishBuild(g, st) {
      autoFit(g);
      // Compute dims in local space (ignore the group scale autoFit just applied), then restore.
      const savedScale = g.scale.x;
      g.scale.setScalar(1);
      addDimensions(g, st);
      addFloor(g, st);
      g.scale.setScalar(savedScale);
    }
    // Uniformly scale + recenter any group so its largest dimension fits a target span.
    // This keeps relative proportions (so editing Side A/B, Height or Depth visibly changes the model)
    // while always framing nicely in the camera.
    function autoFit(g, target) {
      try {
        const tgt = target || 6.4;
        const bb = new THREE.Box3().setFromObject(g);
        if (!isFinite(bb.min.x) || !isFinite(bb.max.x)) return;
        const size = new THREE.Vector3(); bb.getSize(size);
        const center = new THREE.Vector3(); bb.getCenter(center);
        const largest = Math.max(size.x, size.y, size.z) || 1;
        const s = tgt / largest;
        // recenter children around origin, then scale the group
        g.children.forEach(ch => { ch.position.sub(center); });
        g.scale.setScalar(s);
      } catch (e) { /* fit optional */ }
    }
    sceneRef.current = { rebuild };
    rebuild();

    const md = (e) => { drag = true; px = e.clientX; py = e.clientY; };
    const mu = () => { drag = false; };
    const mm = (e) => { if (!drag) return; tRotY += (e.clientX - px) * 0.01; tRotX = clamp(tRotX + (e.clientY - py) * 0.01, -0.5, 0.6); px = e.clientX; py = e.clientY; };
    const wheel = (e) => { e.preventDefault(); tZoom = clamp(tZoom + (e.deltaY > 0 ? 0.6 : -0.6), 5, 16); };
    const ts = (e) => { if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; pinchD = Math.hypot(dx, dy); drag = false; } else { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; } };
    const tm = (e) => {
      if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; const d = Math.hypot(dx, dy); if (pinchD) tZoom = clamp(tZoom + (pinchD - d) * 0.02, 5, 16); pinchD = d; return; }
      if (!drag) return; tRotY += (e.touches[0].clientX - px) * 0.01; tRotX = clamp(tRotX + (e.touches[0].clientY - py) * 0.01, -0.5, 0.6); px = e.touches[0].clientX; py = e.touches[0].clientY;
    };
    mount.addEventListener('mousedown', md); window.addEventListener('mouseup', mu); window.addEventListener('mousemove', mm);
    mount.addEventListener('wheel', wheel, { passive: false });
    mount.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchend', mu); mount.addEventListener('touchmove', tm, { passive: true });
    // expose zoom/reset for on-canvas controls
    // Capture the current viewport as a JPEG data URI (composited onto a studio bg) for AI photoreal render.
    const snapshot = () => {
      try {
        renderer.render(scene, camera);
        const src = renderer.domElement;
        const oc = document.createElement('canvas'); oc.width = src.width; oc.height = src.height;
        const ox = oc.getContext('2d');
        ox.fillStyle = '#eef1f4'; ox.fillRect(0, 0, oc.width, oc.height);
        ox.drawImage(src, 0, 0);
        return oc.toDataURL('image/jpeg', 0.9);
      } catch (e) { return null; }
    };
    // Camera presets animate via the smooth rotation/zoom targets (the model rotates, not the camera).
    const applyPreset = (p) => {
      if (p === 'front') { tRotY = 0; tRotX = 0; tZoom = 9; }
      else if (p === 'top') { tRotY = 0; tRotX = 1.45; tZoom = 9; }   // ~83° → clean plan view
      else { tRotY = -0.5; tRotX = 0.05; tZoom = 9; }                 // iso (default)
    };
    const onResize = () => { const nw = mount.clientWidth || w, nh = mount.clientHeight || h; if (nw < 50 || nh < 50) return; renderer.setSize(nw, nh); camera.aspect = nw / nh; camera.updateProjectionMatrix(); };
    sceneRef.current = {
      rebuild,
      zoomBy: (d) => { tZoom = clamp(tZoom + d, 5, 16); },
      reset: () => { tRotY = -0.5; tRotX = 0.05; tZoom = 9; },
      setPreset: applyPreset,
      setUnit: (u) => { curUnit = u; if (stateRef.current) stateRef.current.unit = u; rebuild(); },
      refit: () => { onResize(); },
      snapshot,
    };
    if (apiRef) apiRef.current = sceneRef.current;
    window.addEventListener('resize', onResize);
    // Re-measure once the container has settled (fixes skew from 0-size init)
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => onResize()); ro.observe(mount); }
    setTimeout(onResize, 100); setTimeout(onResize, 400);
    function animate() {
      raf = requestAnimationFrame(animate);
      rotX += (tRotX - rotX) * 0.12; rotY += (tRotY - rotY) * 0.12; zoom += (tZoom - zoom) * 0.12;
      camera.position.z = zoom;
      if (group) group.rotation.set(rotX, rotY, 0);
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('mousedown', md); window.removeEventListener('mouseup', mu); window.removeEventListener('mousemove', mm);
      mount.removeEventListener('wheel', wheel);
      mount.removeEventListener('touchstart', ts); window.removeEventListener('touchend', mu); mount.removeEventListener('touchmove', tm);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      try { mount.removeChild(renderer.domElement); } catch (e) {}
      try { grain.dispose(); if (envTex) envTex.dispose(); } catch (e) {}
      try { disposeObj3D(group); } catch (e) {}
      renderer.dispose(); sceneRef.current = null; if (apiRef) apiRef.current = null;
    };
  }, [ready]);

  if (failed && fallback) return <>{fallback}</>;
  const ctrlBtn = { width: 34, height: 34, borderRadius: 8, border: '1px solid #e3e3e6', background: 'rgba(255,255,255,.92)', color: 'var(--shop-ink, #1d1d1f)', fontSize: 18, lineHeight: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.08)' };
  return (
    <div style={{ width: '100%', height: tall ? '100%' : (mobile ? 340 : 460), minHeight: tall ? (mobile?340:560) : undefined, position: 'relative' }} ref={mountRef}>
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13 }}>Loading 3D…</div>}
      {ready && tall && (
        <>
          <div style={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
            <button type="button" aria-label="Zoom in" style={ctrlBtn} onClick={() => sceneRef.current && sceneRef.current.zoomBy(-1.2)}>+</button>
            <button type="button" aria-label="Zoom out" style={ctrlBtn} onClick={() => sceneRef.current && sceneRef.current.zoomBy(1.2)}>−</button>
            <button type="button" aria-label="Reset view" style={{ ...ctrlBtn, fontSize: 14 }} onClick={() => sceneRef.current && sceneRef.current.reset()}>⟲</button>
          </div>
          <div style={{ position: 'absolute', left: 12, bottom: 12, fontSize: 11, color: '#8a8a8e', background: 'rgba(255,255,255,.7)', padding: '4px 9px', borderRadius: 20, pointerEvents: 'none' }}>{t('sw3DragRotateZoom')}</div>
        </>
      )}
    </div>
  );
}

/* ── ROOM DESIGNER (Wren-style interactive material visualiser) ──────────
   Full-screen overlay. Left = the room scene (base image + mask tint layers +
   clickable "+" hotspots, or a 3D scene). Right = a material panel grouped by
   group_name with circular swatches. Three render approaches share one
   `selections` state:
     A) live mask tint over the base image (graceful no-mask fallback)
     B) photoreal render via the existing render_photoreal edge function
     C) interactive 3D via <KitchenScene3D/>
   Reads design_scenes / scene_surfaces / design_materials over REST. */
function RoomDesigner({ mobile, sceneShapeFallback, onClose, onReflectMaterial, onGoToSummary, photorealReq, indicativeTotal, category = 'kitchen', dimensions = null, layoutParams = {} }) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [scene, setScene] = useState(null);
  const [scenes, setScenes] = useState([]);                // all active scenes (for the switcher)
  const [surfaces, setSurfaces] = useState([]);            // scene_surfaces rows (ordered)
  const [materials, setMaterials] = useState([]);          // design_materials rows (ordered)
  const [selections, setSelections] = useState({});        // { [surface_key]: materialRow }
  const [activeSurface, setActiveSurface] = useState(null);// open panel surface_key (null = closed)
  const [panelOpen, setPanelOpen] = useState(false);
  const [productRules, setProductRules] = useState([]);    // active public.product_rules rows (soft material guards)
  const is3DCapable = ['kitchen','wardrobe','tv','door','office'].includes(category); // categories with a real 3D scene
  // Product-aware copy so nothing reads "kitchen" for a wardrobe/door/office/TV design.
  const PRODUCT_NOUNS = { kitchen: 'kitchen', wardrobe: 'wardrobe', tv: 'TV unit', door: 'door', office: 'home office' };
  const PRODUCT_NOUN_KEY = { kitchen: 'rdNounKitchen', wardrobe: 'rdNounWardrobe', tv: 'rdNounTv', door: 'rdNounDoor', office: 'rdNounOffice' };
  const productNoun = PRODUCT_NOUNS[category] || 'design';
  const productNounL = t(PRODUCT_NOUN_KEY[category] || 'rdNounDesign');   // localized noun for copy
  // Reuse the Wave-1 'summary' label; English keeps "Go to <Product> Summary", Arabic reads naturally.
  const summaryLabel = lang === 'ar'
    ? t('rdGoToSummary') + ' (' + productNounL + ')'
    : 'Go to ' + (productNoun.charAt(0).toUpperCase() + productNoun.slice(1)) + ' Summary';
  const summaryArrow = lang === 'ar' ? '←' : '→';
  const [mode, setMode] = useState(is3DCapable ? '3d' : 'live'); // 3D hero for kitchen/wardrobe; Photo for others
  const [pulseKey, setPulseKey] = useState(null);          // hotspot pulse for no-mask feedback
  const [hoverKey, setHoverKey] = useState(null);          // hotspot hover label
  // Photoreal render state (Approach B)
  const [prBusy, setPrBusy] = useState(false);
  const [prUrl, setPrUrl] = useState(null);
  const [prErr, setPrErr] = useState('');
  // ── New premium-layout UI state (presentational unless noted) ──
  const [activeGroup, setActiveGroup] = useState(null);         // material-type tab (group name)
  const [pendingMaterial, setPendingMaterial] = useState(null); // swatch highlighted, pre-Apply
  const [finish, setFinish] = useState('smooth');               // Smooth | Matt | Satin (cosmetic-but-real)
  const [quickStyle, setQuickStyle] = useState('modern');       // Modern | Classic | Minimal | Luxury (cosmetic)
  const [viewNonce, setViewNonce] = useState(0);                // bump to remount the scene (Reset View)

  // ── Defensive data load ──
  // Load this category's active scenes. The `category` column may not exist yet
  // (older DB) or may be unseeded for a product — so we try the filtered query
  // first, and gracefully fall back to all active scenes so the designer is never
  // left empty/broken just because the data wasn't authored per-category.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setLoadErr('');
      try {
        let all = [];
        try {
          const filtered = await api('design_scenes?active=is.true&deleted_at=is.null&category=eq.' + encodeURIComponent(category) + '&order=sort.asc');
          all = Array.isArray(filtered) ? filtered : [];
        } catch (_) { all = []; }   // column missing / 400 → fall through to unfiltered
        if (!all.length) {
          const allList = await api('design_scenes?active=is.true&deleted_at=is.null&order=sort.asc');
          all = Array.isArray(allList) ? allList : [];
        }
        const sc = all[0] || null;
        if (!sc) { if (alive) { setLoadErr('No room scene is set up for this product yet. Your finishes still apply in the planner.'); setLoading(false); } return; }
        const [surf, mats, rules] = await Promise.all([
          api('scene_surfaces?scene_id=eq.' + encodeURIComponent(sc.id) + '&deleted_at=is.null&order=sort.asc'),
          api('design_materials?active=is.true&deleted_at=is.null&order=sort.asc'),
          // Soft product-rules guard (Part B). Never let a missing table / 400 break the designer.
          api('product_rules?active=is.true&deleted_at=is.null').catch(() => []),
        ]);
        if (!alive) return;
        setScenes(all);
        setScene(sc);
        setSurfaces(Array.isArray(surf) ? surf : []);
        setMaterials(Array.isArray(mats) ? mats : []);
        setProductRules(Array.isArray(rules) ? rules : []);
        setLoading(false);
      } catch (e) {
        if (alive) { setLoadErr('Could not load the room designer. Please try again.'); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [category]);

  // Switch to another room scene: reload its surfaces, reset the panel + selections.
  const selectScene = useCallback(async (sc) => {
    if (!sc || (scene && sc.id === scene.id)) return;
    setScene(sc); setPanelOpen(false); setActiveSurface(null); setSelections({}); setPrUrl(null); setPrErr('');
    try {
      const surf = await api('scene_surfaces?scene_id=eq.' + encodeURIComponent(sc.id) + '&deleted_at=is.null&order=sort.asc');
      setSurfaces(Array.isArray(surf) ? surf : []);
    } catch (e) { setSurfaces([]); }
  }, [scene]);

  // A category-appropriate default shape (kitchen → island; everything else → straight/single run).
  const defaultShape = category === 'kitchen' ? 'island' : 'straight';
  const sceneShape = (scene && scene.shape_key) || sceneShapeFallback || defaultShape;
  const aspect = (scene && scene.img_w && scene.img_h) ? (scene.img_h / scene.img_w) : (602 / 1017);

  // ── Product-rules: soft finish/width availability guard (Part B) ──
  // Returns a filtered material list for the active surface. A rule applies when:
  //   • rule_type ∈ ('finish_availability','width_options')
  //   • product matches this category (or the rule has no product → applies to all)
  //   • scope.surface === activeSurface
  // We keep only materials whose name is in effect.allowed_finishes (case-insensitive).
  // EMPTY-GUARD: if the filter would leave the panel empty, we return the full list
  // unchanged plus a flag so the UI can show an "all finishes shown" note. Rules must
  // NEVER crash or empty the picker — every step is defensive.
  // TODO: deeper if/then enforcement (e.g. worktop-thickness → hide a finish) is out of
  // scope here; only finish/width availability is wired for now.
  const applyRuleFilter = useCallback((list, surfaceKey) => {
    try {
      if (!Array.isArray(productRules) || !productRules.length || !surfaceKey) return { list, filtered: false, emptied: false };
      const allowed = new Set();
      let matched = false;
      productRules.forEach(r => {
        if (!r || r.active === false) return;
        const rt = r.rule_type;
        if (rt !== 'finish_availability' && rt !== 'width_options') return;
        // product match: rule's product equals this category, or rule has no product (global).
        const prod = r.product;
        if (prod && String(prod).toLowerCase() !== String(category).toLowerCase()) return;
        const scope = r.scope || {};
        if (scope.surface && scope.surface !== surfaceKey) return;
        const eff = r.effect || {};
        const fins = Array.isArray(eff.allowed_finishes) ? eff.allowed_finishes : [];
        if (!fins.length) return;
        matched = true;
        fins.forEach(f => { if (f != null) allowed.add(String(f).toLowerCase().trim()); });
      });
      if (!matched || !allowed.size) return { list, filtered: false, emptied: false };
      const next = list.filter(m => m && m.name && allowed.has(String(m.name).toLowerCase().trim()));
      if (!next.length) return { list, filtered: false, emptied: true }; // empty-guard: show all
      return { list: next, filtered: true, emptied: false };
    } catch (_) {
      return { list, filtered: false, emptied: false }; // any error → unchanged
    }
  }, [productRules, category]);

  // Materials for the currently-open surface, grouped by group_name (ordered).
  const groupedForActive = useCallback(() => {
    const raw = materials.filter(m => m.category === activeSurface);
    const { list, filtered, emptied } = applyRuleFilter(raw, activeSurface);
    const groups = [];
    const byName = new Map();
    list.forEach(m => {
      const g = m.group_name || 'Finishes';
      if (!byName.has(g)) { const arr = []; byName.set(g, arr); groups.push([g, arr]); }
      byName.get(g).push(m);
    });
    return { count: list.length, groups, ruleFiltered: filtered, ruleEmptied: emptied };
  }, [materials, activeSurface, applyRuleFilter]);

  // Auto-select the first surface once surfaces load (the right picker is always visible).
  useEffect(() => {
    if (!activeSurface && surfaces.length > 0) setActiveSurface(surfaces[0].surface_key);
  }, [surfaces, activeSurface]);
  // Reset the material-type tab + pending swatch whenever the active surface changes.
  useEffect(() => { setActiveGroup(null); setPendingMaterial(null); }, [activeSurface]);

  const openPanelFor = (key) => { setActiveSurface(key); setPanelOpen(true); };
  const surfaceLabel = (key) => { const s = surfaces.find(x => x.surface_key === key); const raw = (s && s.label) || (key ? key.charAt(0).toUpperCase() + key.slice(1) : ''); return trRd(raw, lang); };

  const chooseMaterial = (key, m) => {
    setSelections(s => ({ ...s, [key]: m }));
    // No-mask responsiveness: pulse the hotspot briefly.
    setPulseKey(key);
    setTimeout(() => setPulseKey(k => (k === key ? null : k)), 650);
    // Defensive pricing reflection into the configurator.
    try { if (onReflectMaterial) onReflectMaterial(key, m); } catch (e) {}
  };

  // Map selections → KitchenScene3D `materials` prop shape.
  const selectionsAsMaterials = (() => {
    const out = {};
    Object.keys(selections).forEach(k => { const m = selections[k]; if (m) out[k] = { hex: m.hex || undefined, texture_url: m.texture_url || undefined }; });
    return out;
  })();

  const anySurfaceHasMask = surfaces.some(s => s.mask_url);

  // Resolve a possibly-relative URL (e.g. "/layouts/…") to an absolute one.
  const absUrl = (u) => {
    if (!u) return u;
    if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u;
    try { return new URL(u, window.location.origin).href; } catch (_) { return u; }
  };

  // Load an image with CORS enabled; resolves to the HTMLImageElement.
  const loadImg = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img load failed: ' + src));
    img.src = absUrl(src);
  });

  // ── Self-capture the Live preview onto an offscreen canvas (base + tinted masks). ──
  // Returns a JPEG data-URI, or null if everything (incl. the base fallback) fails.
  const captureLivePreview = useCallback(async () => {
    if (!scene || !scene.base_image_url) return null;
    try {
      const base = await loadImg(scene.base_image_url);
      const w = Number(scene.img_w) || base.naturalWidth || base.width || 1017;
      const h = Number(scene.img_h) || base.naturalHeight || base.height || 602;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(base, 0, 0, w, h);

      // Tint each masked surface that has a selected material.
      for (const s of surfaces) {
        const m = selections[s.surface_key];
        if (!m || !s.mask_url) continue;
        let mask;
        try { mask = await loadImg(s.mask_url); } catch (_) { continue; }
        // 1) Build the tinted shape on a temp canvas via source-in.
        const tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(mask, 0, 0, w, h);
        tctx.globalCompositeOperation = 'source-in';
        tctx.fillStyle = m.hex || '#888888';
        tctx.fillRect(0, 0, w, h);
        // 2) Composite the tinted shape onto the main canvas.
        ctx.save();
        ctx.globalCompositeOperation = (s.blend_mode === 'multiply') ? 'multiply' : 'source-over';
        ctx.globalAlpha = 0.9;
        ctx.drawImage(tmp, 0, 0, w, h);
        ctx.restore();
      }
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      // CORS-tainted canvas or any failure → fall back to the plain base image as a data URL.
      try {
        const r = await fetch(absUrl(scene.base_image_url));
        const blob = await r.blob();
        return await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(blob);
        });
      } catch (_) { return null; }
    }
  }, [scene, surfaces, selections]);

  // ── Approach B: photoreal render reusing the existing edge function shape ──
  const renderPhotoreal = async () => {
    setPrBusy(true); setPrErr(''); setPrUrl(null);
    // Prefer an external planner snapshot (backward compat); otherwise self-capture.
    let img = null;
    try { img = (photorealReq && photorealReq.getImage && photorealReq.getImage()) || null; } catch (_) { img = null; }
    if (!img) img = await captureLivePreview();
    if (!img) { setPrErr('We couldn’t prepare your design for rendering. Please pick a finish or two and try again.'); setPrBusy(false); return; }
    const surfacesPayload = surfaces
      .map(s => { const m = selections[s.surface_key]; return m ? { key: s.surface_key, name: m.name, hex: m.hex } : null; })
      .filter(Boolean);
    // Fire-and-forget: log render history + decrement the credit counter.
    const logRender = (ok, url) => { try {
      fetch(SUPA_URL + '/rest/v1/rpc/log_render', {
        method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_product: (photorealReq && photorealReq.product) || category || 'kitchen', p_scene: scene ? scene.id : null, p_config: null, p_customer: null, p_name: null, p_surfaces: surfacesPayload, p_image: ok ? (url || null) : null, p_status: ok ? 'success' : 'failed', p_by: 'website' }),
      });
    } catch (_) {} };
    try {
      const r = await aiFetch(SUPA_URL + '/functions/v1/render_photoreal', {
        method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: img, product: (photorealReq && photorealReq.product) || category || 'kitchen', finish: photorealReq && photorealReq.finish, surfaces: surfacesPayload }),
      });
      const d = await r.json().catch(() => ({}));
      const ok = !!(d && d.ok && d.url);
      if (ok) setPrUrl(d.url);
      else setPrErr(d && d.error === 'Render not configured' ? t('w4RenderNotOn') : t('w4RenderDidntCome'));
      logRender(ok, ok ? d.url : null);
    } catch (e) { setPrErr(t('w4NetworkHiccup')); logRender(false, null); }
    setPrBusy(false);
  };

  const seg = (active) => ({ padding:'7px 16px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', background: active?'var(--clay)':'transparent', color: active?'#fff':'var(--ink-soft)', borderRadius:8 });

  // ── Scene stage (left) ──
  const scene3DHeight = mobile ? 360 : 560; // shared px height for every 3D scene (matches the stage container)
  const sceneStage = (
    <div style={{ position:'relative', width:'100%', maxWidth:880, margin:'0 auto' }}>
      <div style={ mode === '3d'
        ? { position:'relative', width:'100%', height: mobile ? 360 : 560, minHeight: mobile ? 360 : 520, borderRadius:16, overflow:'hidden', background:'#f4f1ea', boxShadow:'0 6px 30px rgba(0,0,0,.14)' }
        : { position:'relative', width:'100%', paddingTop:(aspect*100)+'%', borderRadius:16, overflow:'hidden', background:'#e9e4dc', boxShadow:'0 6px 30px rgba(0,0,0,.14)' } }>
        {/* Reset View chip (best-effort remount of the scene) */}
        <button type="button" onClick={()=>setViewNonce(n=>n+1)} aria-label="Reset view"
          style={{ position:'absolute', top:12, right:12, zIndex:4, display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, border:'1px solid var(--line)', background:'rgba(245,241,234,.92)', color:'var(--ink)', fontSize:12, fontWeight:600, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.12)' }}>↻ Reset View</button>
        <div key={'rd-scene-'+viewNonce} style={{ position:'absolute', inset:0 }}>
        {(mode === '3d' && is3DCapable) ? (
          <div style={{ position:'absolute', inset:0 }}>
            {category === 'wardrobe' ? (() => {
              // Wire the customer's real run dimensions (mm → cm) into the parametric
              // Wardrobe3D. Guard every value against NaN/Infinity and fall back to the
              // previous 180/240/60 defaults when no dimensions were passed (backward compat).
              const cmFrom = (mm, fb) => { const n = Number(mm) / 10; return Number.isFinite(n) && n > 0 ? n : fb; };
              const wWidthCm  = cmFrom(dimensions && dimensions.widthMm, 180);
              const wHeightCm = cmFrom(dimensions && dimensions.heightMm, 240);
              const wDepthCm  = cmFrom(dimensions && dimensions.depthMm, 60);
              const sideAmm = (layoutParams && (layoutParams.sideA != null ? layoutParams.sideA : layoutParams.wallA));
              const sideBmm = (layoutParams && (layoutParams.sideB != null ? layoutParams.sideB : layoutParams.wallB));
              const sideAn = Number(sideAmm) / 10, sideBn = Number(sideBmm) / 10;
              const wSideACm = Number.isFinite(sideAn) && sideAn > 0 ? sideAn : undefined;
              const wSideBCm = Number.isFinite(sideBn) && sideBn > 0 ? sideBn : undefined;
              return (
              <Wardrobe3D
                finishHex={(selections.door_front && selections.door_front.hex) || (selections.door && selections.door.hex) || (selections.body && selections.body.hex) || (selections.carcass && selections.carcass.hex) || '#e8e4dc'}
                layout={sceneShape}
                handles={!!(selections.handle || selections.handles)}
                glass={false}
                led={false}
                product="wardrobe"
                mobile={mobile}
                tall
                widthCm={wWidthCm} heightCm={wHeightCm} depthCm={wDepthCm}
                sideACm={wSideACm} sideBCm={wSideBCm}
                scaleMode="fit"
              />
              );
            })() : category === 'tv' ? (
              <TVUnit3D
                materials={selectionsAsMaterials}
                shape={sceneShape}
                dimensions={dimensions}
                layoutParams={layoutParams}
                activeSurface={activeSurface}
                onPickSurface={(key)=>openPanelFor(key)}
                height={scene3DHeight}
              />
            ) : category === 'door' ? (
              <Door3D
                materials={selectionsAsMaterials}
                shape={(layoutParams && layoutParams.style) || sceneShape}
                dimensions={dimensions}
                layoutParams={layoutParams}
                activeSurface={activeSurface}
                onPickSurface={(key)=>openPanelFor(key)}
                height={scene3DHeight}
              />
            ) : category === 'office' ? (
              <Office3D
                materials={selectionsAsMaterials}
                shape={sceneShape}
                dimensions={dimensions}
                layoutParams={layoutParams}
                activeSurface={activeSurface}
                onPickSurface={(key)=>openPanelFor(key)}
                height={scene3DHeight}
              />
            ) : (
              <KitchenScene3D materials={selectionsAsMaterials} shape={sceneShape} activeSurface={activeSurface} onPickSurface={(key)=>openPanelFor(key)} height={scene3DHeight} dimensions={dimensions} layoutParams={layoutParams} />
            )}
          </div>
        ) : (
          <>
            {/* base image */}
            {scene && scene.base_image_url && (
              <img src={absUrl(scene.base_image_url)} alt="Room" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} onError={(e)=>{ e.target.style.display='none'; }} />
            )}
            {/* Approach A: mask tint layers (one per surface that has a mask + selection) */}
            {surfaces.map(s => {
              const m = selections[s.surface_key];
              if (!m || !s.mask_url) return null;
              const maskUrl = `url(${absUrl(s.mask_url)})`;
              return (
                <div key={'mask-'+s.id} aria-hidden="true"
                  style={{ position:'absolute', inset:0, pointerEvents:'none',
                    backgroundColor: m.hex || 'transparent',
                    backgroundImage: m.texture_url ? `url(${absUrl(m.texture_url)})` : undefined,
                    backgroundSize: m.texture_url ? 'cover' : undefined,
                    mixBlendMode: s.blend_mode || 'multiply',
                    transition:'background-color .45s ease, opacity .45s ease',
                    WebkitMaskImage: maskUrl, maskImage: maskUrl,
                    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
              );
            })}
            {/* Refined hotspots: white disc + clay glyph, active pulse + hover label */}
            {surfaces.map(s => {
              const x = Number(s.hotspot_x_pct) || 50, y = Number(s.hotspot_y_pct) || 50;
              const chosen = selections[s.surface_key];
              const isActive = activeSurface === s.surface_key;
              const pulsing = pulseKey === s.surface_key;
              const showLabel = hoverKey === s.surface_key || isActive;
              return (
                <div key={'hs-'+s.id} style={{ position:'absolute', left:x+'%', top:y+'%', transform:'translate(-50%,-50%)', zIndex: isActive ? 3 : 2 }}>
                  {/* active pulse ring */}
                  {(isActive || pulsing) && (
                    <span aria-hidden="true" style={{ position:'absolute', left:'50%', top:'50%', width:36, height:36, marginLeft:-18, marginTop:-18, borderRadius:'50%', border:'2px solid var(--clay)', animation:'rdPulse 1.6s ease-out infinite', pointerEvents:'none' }} />
                  )}
                  <button type="button"
                    onClick={()=>openPanelFor(s.surface_key)}
                    onMouseEnter={()=>setHoverKey(s.surface_key)} onMouseLeave={()=>setHoverKey(k=>k===s.surface_key?null:k)}
                    aria-label={trRd(s.label || s.surface_key, lang) + (chosen ? (' — ' + trRd(chosen.name, lang)) : '')} title={trRd(s.label || s.surface_key, lang)}
                    style={{ position:'relative', width:32, height:32, borderRadius:'50%', border:'none', cursor:'pointer',
                      background:'#fff', color: chosen ? '#1D9E75' : 'var(--clay)', fontSize:17, fontWeight:800, lineHeight:'32px', textAlign:'center',
                      boxShadow: isActive ? '0 4px 16px rgba(0,0,0,.30)' : '0 2px 9px rgba(0,0,0,.24)',
                      outline: isActive ? '3px solid var(--clay)' : '2px solid rgba(255,255,255,.85)', outlineOffset:0,
                      transform: pulsing ? 'scale(1.28)' : (isActive ? 'scale(1.08)' : 'scale(1)'),
                      transition:'transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease' }}>
                    {chosen ? '✓' : '+'}
                  </button>
                  {/* hover / active label with a tiny swatch */}
                  {showLabel && (
                    <div aria-hidden="true" style={{ position:'absolute', left:'50%', top:-12, transform:'translate(-50%,-100%)', whiteSpace:'nowrap', background:'rgba(28,24,20,.92)', color:'#fff', fontSize:11.5, fontWeight:600, padding:'5px 9px', borderRadius:8, boxShadow:'0 4px 14px rgba(0,0,0,.28)', display:'flex', alignItems:'center', gap:6, pointerEvents:'none' }}>
                      <span style={{ width:11, height:11, borderRadius:'50%', flexShrink:0, background: chosen ? (chosen.hex || 'var(--sand)') : 'rgba(255,255,255,.35)', boxShadow:'inset 0 0 0 1px rgba(255,255,255,.4)' }} />
                      <span>{trRd(s.label || s.surface_key, lang)}{chosen ? ' · ' + trRd(chosen.name, lang) : ''}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
        </div>
        {/* Floating surface toolbar — one button per clickable area, active one highlighted */}
        {surfaces.length > 0 && (
          <div style={{ position:'absolute', left:'50%', bottom:14, transform:'translateX(-50%)', maxWidth:'calc(100% - 24px)', display:'flex', gap:6, padding:6, borderRadius:16, background:'rgba(245,241,234,.94)', border:'1px solid var(--line)', boxShadow:'0 6px 22px rgba(0,0,0,.18)', overflowX:'auto', zIndex:4 }}>
            {surfaces.map(s => {
              const m = selections[s.surface_key];
              const on = activeSurface === s.surface_key;
              return (
                <button key={'tb-'+s.id} type="button" onClick={()=>openPanelFor(s.surface_key)} title={surfaceLabel(s.surface_key)}
                  style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:4, padding:'7px 12px', borderRadius:11, flexShrink:0, cursor:'pointer',
                    border:'1px solid ' + (on ? 'var(--clay)' : 'transparent'),
                    background: on ? 'var(--clay)' : 'transparent', transition:'all .18s ease' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, boxShadow:'inset 0 0 0 1px rgba(0,0,0,.18)',
                    background: m ? (m.hex || 'var(--sand)') : 'var(--sand)', backgroundImage: m && m.swatch_url ? `url(${absUrl(m.swatch_url)})` : undefined, backgroundSize:'cover', backgroundPosition:'center' }} />
                  <span style={{ fontSize:11, fontWeight:700, whiteSpace:'nowrap', color: on ? 'var(--cream)' : 'var(--ink)' }}>{surfaceLabel(s.surface_key)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ textAlign:'center', fontSize:12, color:'var(--muted)', marginTop:12 }}>
        {surfaces.length > 0 ? 'Click on any area to change materials' : (lang==='ar' ? `تشطيبات ${productNounL} ${t('rdPanelEmpty')}` : `Finishes for this ${productNoun} ${t('rdPanelEmpty')}`)}
      </div>
    </div>
  );

  // ── Material picker (always-visible right column / stacked on mobile) ──
  const { count, groups, ruleFiltered, ruleEmptied } = groupedForActive();
  const currentGroupName = (activeGroup && groups.some(g => g[0] === activeGroup)) ? activeGroup : (groups[0] ? groups[0][0] : null);
  const currentItems = (groups.find(g => g[0] === currentGroupName) || [null, []])[1];
  const appliedMat = activeSurface ? selections[activeSurface] : null;
  const highlightMat = pendingMaterial || appliedMat;
  const finishOpts = [['smooth','Smooth'],['matt','Matt'],['satin','Satin']];
  const materialPicker = (
    <div style={ mobile
      ? { width:'100%', background:'var(--cream)', borderRadius:16, border:'1px solid var(--line)', display:'flex', flexDirection:'column', boxShadow:'0 6px 22px rgba(0,0,0,.08)' }
      : { width:330, flexShrink:0, background:'var(--cream)', borderRadius:16, border:'1px solid var(--line)', display:'flex', flexDirection:'column', maxHeight:'calc(100vh - 150px)', position:'sticky', top:0, boxShadow:'0 6px 22px rgba(0,0,0,.08)' } }>
      <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--line)' }}>
        <div style={{ fontSize:17, fontWeight:800, color:'var(--ink)', letterSpacing:'-.01em' }}>{activeSurface ? surfaceLabel(activeSurface) : t('rdChooseFinish')}</div>
        <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>{activeSurface ? ('Select a material for ' + surfaceLabel(activeSurface).toLowerCase()) : ''}</div>
      </div>
      {/* material-type tabs (group names) */}
      {groups.length > 0 && (
        <div style={{ display:'flex', gap:6, padding:'12px 16px 4px', overflowX:'auto', flexShrink:0 }}>
          {groups.map(([gname]) => {
            const on = gname === currentGroupName;
            return (
              <button key={gname} type="button" onClick={()=>setActiveGroup(gname)}
                style={{ flexShrink:0, padding:'7px 13px', borderRadius:999, cursor:'pointer', fontSize:12.5, fontWeight:700,
                  border:'1px solid ' + (on ? 'var(--clay)' : 'var(--line)'),
                  background: on ? 'var(--clay)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>{trRd(gname, lang)}</button>
            );
          })}
        </div>
      )}
      <div style={{ overflowY:'auto', padding:'12px 16px', flex:1, minHeight: mobile ? 0 : 120 }}>
        {count === 0 && <div style={{ padding:'30px 6px', color:'var(--muted)', fontSize:13.5, textAlign:'center' }}>{activeSurface ? t('rdNoOptions') : 'Pick an area from the toolbar to choose a material.'}</div>}
        {ruleFiltered && <div style={{ margin:'2px 4px 8px', fontSize:11.5, color:'var(--muted)' }}>{t('rdShowingAvailable')}</div>}
        {ruleEmptied && <div style={{ margin:'2px 4px 8px', fontSize:11.5, color:'var(--muted)' }}>{t('rdAllShown')}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
          {currentItems.map(m => {
            const on = highlightMat && highlightMat.id === m.id;
            const applied = appliedMat && appliedMat.id === m.id;
            return (
              <button key={m.id} type="button" onClick={()=>{ setPendingMaterial(m); chooseMaterial(activeSurface, m); }} title={trRd(m.name, lang)}
                style={{ display:'flex', flexDirection:'column', alignItems:'stretch', gap:7, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                <span style={{ position:'relative', width:'100%', paddingTop:'86%', borderRadius:12, background: m.hex || 'var(--sand)', backgroundImage: m.swatch_url ? `url(${absUrl(m.swatch_url)})` : undefined, backgroundSize:'cover', backgroundPosition:'center',
                  boxShadow: on ? '0 0 0 3px var(--cream), 0 0 0 5px var(--clay), 0 4px 12px rgba(168,75,41,.28)' : 'inset 0 0 0 1px rgba(0,0,0,.12)',
                  transition:'box-shadow .18s ease' }}>
                  {applied && <span style={{ position:'absolute', right:6, bottom:6, width:22, height:22, borderRadius:'50%', background:'var(--clay)', color:'var(--cream)', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--cream)' }}>✓</span>}
                </span>
                <span style={{ fontSize:12, lineHeight:1.25, textAlign:'left', color: on ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: on ? 700 : 600 }}>{trRd(m.name, lang)}</span>
                {m.price_per_m2 ? <span style={{ fontSize:10.5, color:'var(--muted)', textAlign:'left', marginTop:-4 }}>{fmt(m.price_per_m2)}/m²</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      {/* Finish + Apply pinned to the bottom */}
      <div style={{ padding:'12px 16px 16px', borderTop:'1px solid var(--line)', flexShrink:0 }}>
        <div style={{ fontSize:10.5, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', fontWeight:700, marginBottom:7 }}>Finish</div>
        <div style={{ display:'flex', gap:4, background:'var(--sand)', border:'1px solid var(--line)', borderRadius:10, padding:3, marginBottom:12 }}>
          {finishOpts.map(([k,label]) => (
            <button key={k} type="button" onClick={()=>setFinish(k)}
              style={{ flex:1, padding:'7px 0', fontSize:12.5, fontWeight:700, cursor:'pointer', border:'none', borderRadius:8,
                background: finish===k ? 'var(--clay)' : 'transparent', color: finish===k ? 'var(--cream)' : 'var(--ink-soft)' }}>{label}</button>
          ))}
        </div>
        <button type="button" disabled={!activeSurface || !highlightMat}
          onClick={()=>{ if (activeSurface && highlightMat) chooseMaterial(activeSurface, highlightMat); }}
          style={{ width:'100%', padding:'12px 0', borderRadius:12, border:'none', cursor: (activeSurface && highlightMat) ? 'pointer' : 'not-allowed',
            background: (activeSurface && highlightMat) ? 'var(--ink)' : 'var(--sand)', color: (activeSurface && highlightMat) ? 'var(--cream)' : 'var(--muted)', fontSize:14, fontWeight:800 }}>Apply Material</button>
      </div>
    </div>
  );

  // ── Left column cards (stacked below on mobile) ──
  const rdCard = { background:'var(--cream)', border:'1px solid var(--line)', borderRadius:14, padding:'14px 16px' };
  const rdCardLabel = { fontSize:10.5, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--muted)', fontWeight:700, marginBottom:9 };
  const leftColumn = (
    <div style={{ width: mobile ? '100%' : 248, flexShrink:0, display:'flex', flexDirection:'column', gap:14 }}>
      <div style={rdCard}>
        <div style={rdCardLabel}>{(productNoun.charAt(0).toUpperCase() + productNoun.slice(1))} Layout</div>
        <select value={scene ? scene.id : ''} onChange={e=>{ const sc = scenes.find(s=>s.id===e.target.value); if (sc) selectScene(sc); }}
          aria-label={t('rdSceneSwitcher')}
          style={{ width:'100%', padding:'9px 11px', borderRadius:10, border:'1px solid var(--line)', background:'#fff', color:'var(--ink)', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>
          {scenes.length ? scenes.map(s => <option key={s.id} value={s.id}>{trRd(s.name, lang)}</option>) : <option>{productNounL}</option>}
        </select>
      </div>
      <div style={rdCard}>
        <div style={rdCardLabel}>View Mode</div>
        <div style={{ display:'flex', gap:4, background:'var(--sand)', border:'1px solid var(--line)', borderRadius:10, padding:3 }}>
          <button type="button" onClick={()=>setMode('live')} aria-pressed={mode==='live'} style={{ flex:1, padding:'8px 0', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:8, background: mode==='live'?'var(--clay)':'transparent', color: mode==='live'?'var(--cream)':'var(--ink-soft)' }}>2D</button>
          <button type="button" onClick={()=>setMode('3d')} aria-pressed={mode==='3d'} style={{ flex:1, padding:'8px 0', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:8, background: mode==='3d'?'var(--clay)':'transparent', color: mode==='3d'?'var(--cream)':'var(--ink-soft)' }}>3D</button>
        </div>
      </div>
      <div style={rdCard}>
        <div style={rdCardLabel}>Quick Style</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[['modern','Modern'],['classic','Classic'],['minimal','Minimal'],['luxury','Luxury']].map(([k,label]) => {
            const on = quickStyle===k;
            return <button key={k} type="button" onClick={()=>setQuickStyle(k)}
              style={{ padding:'9px 0', borderRadius:999, cursor:'pointer', fontSize:12.5, fontWeight:700,
                border:'1px solid ' + (on ? 'var(--clay)' : 'var(--line)'), background: on ? 'var(--clay)' : '#fff', color: on ? 'var(--cream)' : 'var(--ink-soft)' }}>{label}</button>;
          })}
        </div>
      </div>
      <div style={{ ...rdCard, background:'var(--ink)', border:'none' }}>
        <div style={{ ...rdCardLabel, color:'rgba(245,241,234,.6)' }}>Estimated Price</div>
        <div style={{ fontSize:26, fontWeight:800, color:'var(--cream)', letterSpacing:'-.02em' }}>{indicativeTotal != null ? fmt(indicativeTotal) : '—'}</div>
        <button type="button" onClick={onGoToSummary} style={{ marginTop:8, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:12.5, fontWeight:700, color:'var(--brass)' }}>View Full Quote ›</button>
      </div>
    </div>
  );

  // ── Top-bar stepper (Materials is the active step) ──
  const rdSteps = [
    { n:1, label:'Layout', done:true },
    { n:2, label:'Materials', active:true },
    { n:3, label:'Appliances' },
    { n:4, label:'Review', go:true },
  ];

  return (
    <ModalPanel className="rd-root" label={lang==='ar' ? 'مصمم الغرفة' : 'Room designer'} onClose={onClose} style={{ position:'fixed', inset:0, zIndex:11000, background:'var(--cream)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes rdPulse { 0% { transform:scale(.7); opacity:.85; } 70% { opacity:0; } 100% { transform:scale(1.9); opacity:0; } }
        @keyframes rdSheetUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes rdPanelIn { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes rdSpin { to { transform:rotate(360deg); } }
        @keyframes rdFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .rd-root *, .rd-root *::before, .rd-root *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; } }
      `}</style>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 16px', borderBottom:'1px solid var(--line)', background:'#fff', flexShrink:0 }}>
        {/* left: back + title chip */}
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <button type="button" aria-label={t('rdClose')} onClick={onClose} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:34, height:34, background:'#fff', border:'1px solid var(--line)', borderRadius:10, cursor:'pointer', fontSize:16, fontWeight:700, color:'var(--ink-soft)' }}>{lang==='ar'?'›':'‹'}</button>
          <span style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:10, background:'var(--sand)', border:'1px solid var(--line)', fontSize:13.5, fontWeight:800, color:'var(--ink)', whiteSpace:'nowrap' }}>🎨 {t('rdRoomDesigner')}</span>
        </div>
        {/* center: stepper */}
        {!mobile && (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {rdSteps.map((st, i) => [
              <button key={'st'+st.n} type="button" onClick={st.go ? onGoToSummary : undefined}
                style={{ display:'inline-flex', alignItems:'center', gap:7, background:'none', border:'none', padding:'2px 4px', cursor: st.go ? 'pointer' : 'default' }}>
                <span style={{ width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800,
                  background: (st.active||st.done) ? 'var(--ink)' : '#fff', color: (st.active||st.done) ? 'var(--cream)' : 'var(--muted)', border:'1px solid ' + ((st.active||st.done) ? 'var(--ink)' : 'var(--line)') }}>{st.done ? '✓' : st.n}</span>
                <span style={{ fontSize:12.5, fontWeight: st.active ? 800 : 600, color: st.active ? 'var(--ink)' : 'var(--muted)' }}>{st.label}</span>
              </button>,
              i < rdSteps.length - 1 ? <span key={'sd'+st.n} aria-hidden="true" style={{ width:20, height:1, background:'var(--line)' }} /> : null
            ])}
          </div>
        )}
        {/* right: save / share / render */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!mobile && <button type="button" style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--line)', background:'#fff', color:'var(--ink-soft)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Save</button>}
          {!mobile && <button type="button" style={{ padding:'8px 14px', borderRadius:10, border:'1px solid var(--line)', background:'#fff', color:'var(--ink-soft)', fontSize:13, fontWeight:700, cursor:'pointer' }}>Share</button>}
          <button type="button" onClick={renderPhotoreal} disabled={prBusy}
            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'none', cursor: prBusy ? 'wait' : 'pointer', background:'var(--ink)', color:'var(--cream)', fontSize:13, fontWeight:800, whiteSpace:'nowrap' }}>
            <i className={prBusy ? 'ti ti-loader-2' : 'ti ti-sparkles'} aria-hidden="true" /> {prBusy ? t('rdRendering') : (mobile ? 'Render' : t('rdRenderPhotoreal'))}{!prBusy ? ' ✨' : ''}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', padding: mobile ? '12px 12px 40px' : '18px 22px' }}>
        {loading && <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--muted)' }}><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize:24 }} /><div style={{ marginTop:10 }}>{t('rdLoading')}</div></div>}
        {!loading && loadErr && (
          <div style={{ textAlign:'center', padding:'70px 20px', color:'var(--muted)' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:6 }}>{t('rdUnavailable')}</div>
            <div style={{ fontSize:13.5, marginBottom:16 }}>{loadErr}</div>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ borderRadius:12 }}>{t('rdClose')}</button>
          </div>
        )}
        {!loading && !loadErr && (
          <div style={{ display:'flex', gap:18, alignItems:'flex-start', flexDirection: mobile ? 'column' : 'row', maxWidth:1360, margin:'0 auto' }}>
            {!mobile && leftColumn}
            {/* Center stage */}
            <div style={{ flex:1, minWidth:0, width:'100%' }}>
              {sceneStage}
              {prErr && <div role="alert" style={{ marginTop:14, maxWidth:540, marginLeft:'auto', marginRight:'auto', background:'#fff7f3', border:'1px solid var(--line)', color:'var(--clay-deep)', borderRadius:12, padding:'11px 16px', fontSize:13, textAlign:'center', animation:'rdFade .25s ease' }}>{prErr}</div>}
              {prUrl && (
                <div style={{ marginTop:18, maxWidth:640, marginLeft:'auto', marginRight:'auto', background:'#fff', borderRadius:20, border:'1px solid var(--line)', boxShadow:'0 12px 40px rgba(0,0,0,.12)', overflow:'hidden', animation:'rdFade .35s ease' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:'1px solid var(--line)' }}>
                    <span style={{ fontSize:12.5, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase', color:'var(--clay-deep)' }}>{t('rdPhotorealRender')}</span>
                    <button type="button" onClick={()=>{ setPrUrl(null); setPrErr(''); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--ink-soft)' }}>{lang==='ar'?'→':'←'} {t('rdBackToDesign')}</button>
                  </div>
                  <img src={prUrl} alt={'Photoreal render of your ' + productNoun} style={{ display:'block', width:'100%' }} />
                  <div style={{ padding:'14px 18px 16px', textAlign:'center' }}>
                    <a href={prUrl} download="closets-room.jpg" style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:11, background:'var(--clay)', color:'var(--cream)', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(168,75,41,.32)' }}>↓ {t('rdDownloadRender')}</a>
                    <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:10 }}>{t('rdAiDisclaimer')}</div>
                  </div>
                </div>
              )}
            </div>
            {/* Right material picker (always visible) */}
            {materialPicker}
            {/* Left column stacked at the bottom on mobile */}
            {mobile && leftColumn}
          </div>
        )}
      </div>
      {/* Photoreal pending overlay */}
      {prBusy && (
        <div style={{ position:'fixed', inset:0, zIndex:11050, background:'rgba(15,18,22,.74)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:20, padding:'38px 48px', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.4)', maxWidth:340 }}>
            <span aria-hidden="true" style={{ display:'inline-block', width:38, height:38, borderRadius:'50%', border:'3px solid var(--sand)', borderTopColor:'var(--clay)', animation:'rdSpin .8s linear infinite' }} />
            <div style={{ marginTop:16, fontSize:15.5, fontWeight:800, color:'var(--ink)' }}>{t('rdRenderingYour')} {productNounL}…</div>
            <div style={{ marginTop:6, fontSize:13, color:'var(--muted)' }}>{t('rdCompositing')}</div>
          </div>
        </div>
      )}
    </ModalPanel>
  );
}

export { Wardrobe3D, RoomDesigner };
