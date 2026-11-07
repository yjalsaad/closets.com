/* =============================================================================
 * Room Visualizer — 3D viewer [ROOM-VIZ 2026-11-07]
 * createViewer(el, { onPick, onHover, onProgress }) -> api
 *   api.setRoom(room)                     build a sample room (rooms.js)
 *   api.apply(key, sel)                   sel = { product, layout, grout:{mm,color}, rotation, product2 } -> Promise
 *   api.setMode('2d' | '360')             fixed room view  |  stand in the middle and look around (drag / gyro / zoom)
 *   api.setView(i)                        2D camera preset
 *   api.snapshot(type, q) -> dataURL      api.areas() -> { key: m² }   api.flash(key)   api.gyro(on)   api.dispose()
 * Renders on demand (no idle loop). Shadows from the window sun, soft fill, environment reflections for gloss finishes.
 * ===========================================================================*/
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { drawLayout } from './layout';
import { isContinuous, repeatSizeM, roughnessOf, hexRgb, rgbHex } from './materials';

const DECOR = {
  plinth: { color: '#2b2a28', roughness: 0.8 },
  carcass: { color: '#e9e5de', roughness: 0.7 },
  steel: { color: '#b9bcbf', roughness: 0.32, metalness: 0.85 },
  chrome: { color: '#e6e8ea', roughness: 0.12, metalness: 1 },
  metal: { color: '#2a2b2d', roughness: 0.45, metalness: 0.7 },
  glassblack: { color: '#0b0b0c', roughness: 0.08, metalness: 0.2 },
  dark: { color: '#151517', roughness: 0.5 },
  screen: { color: '#0c0f14', roughness: 0.12, metalness: 0.1, emissive: '#11161f' },
  woodlight: { color: '#b48a5c', roughness: 0.55 },
  porcelain: { color: '#f6f6f3', roughness: 0.12 },
  mirror: { color: '#e8eef1', roughness: 0.06, metalness: 0.55, emissive: '#3a4144', emissiveIntensity: 0.6 },
  glass: { color: '#dfeef2', roughness: 0.05, transparent: true, opacity: 0.18 },
  fabric: { color: '#d7d0c4', roughness: 0.95 },
  fabric2: { color: '#8e8577', roughness: 0.95 },
  linen: { color: '#f4f1ea', roughness: 0.92 },
  leaf: { color: '#55704a', roughness: 0.8 },
  pot: { color: '#cbbfae', roughness: 0.85 },
  brass: { color: '#c8a46a', roughness: 0.3, metalness: 1 },
  lampshade: { color: '#f3eadb', roughness: 0.9, emissive: '#5a4a32' },
  frame: { color: '#efeeea', roughness: 0.5 },
  sky: { color: '#f2f7ff', emissive: '#e6f0ff', emissiveIntensity: 1.1, roughness: 1 },
  downlight: { color: '#ffffff', emissive: '#fff4e2', emissiveIntensity: 2.0 },
};

function meterUV(geo, w, h, d, ox = 0, oy = 0) {
  const uv = geo.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] + ox, uv.getY(i) * dims[f][1] + oy);
  }
  uv.needsUpdate = true; return geo;
}

export function createViewer(el, cb = {}, opts = {}) {
  const mobile = !!opts.lowRes || Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(opts.lowRes ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'vz-canvas';
  el.appendChild(renderer.domElement);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  let scene, room, camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);
  let surfaces = {};      // key -> { meshes:[{mesh,w,h,box}], area, mats:[] }
  let mode = '2d', viewIdx = 0, disposed = false, raf = 0;
  const look = { yaw: 0, pitch: 0, fov: 75, vyaw: 0, vpitch: 0 };
  const decorMats = {};
  const decor = (name) => {
    if (decorMats[name]) return decorMats[name];
    const o = DECOR[name] || DECOR.carcass;
    const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: o.roughness ?? 0.6, metalness: o.metalness || 0, transparent: !!o.transparent, opacity: o.opacity ?? 1,
      emissive: o.emissive || '#000000', emissiveIntensity: o.emissiveIntensity ?? (o.emissive ? 1 : 0), envMapIntensity: 0.8 });
    decorMats[name] = m; return m;
  };

  const render = () => { if (raf || disposed) return; raf = requestAnimationFrame(frame); };
  function frame() {
    raf = 0; if (disposed || !scene) return;
    if (mode === '360') {
      if (!dragging && (Math.abs(look.vyaw) > 1e-4 || Math.abs(look.vpitch) > 1e-4)) { look.yaw += look.vyaw; look.pitch += look.vpitch; look.vyaw *= 0.92; look.vpitch *= 0.92; render(); }
      look.pitch = Math.max(-1.35, Math.min(1.35, look.pitch));
      const c = new THREE.Vector3(room.W / 2, 1.6, room.D / 2);
      camera.position.copy(c); camera.fov = look.fov;
      camera.lookAt(c.x + Math.sin(look.yaw) * Math.cos(look.pitch), c.y + Math.sin(look.pitch), c.z - Math.cos(look.yaw) * Math.cos(look.pitch));
    }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = el.clientWidth || 800, h = el.clientHeight || 500;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    if (mode === '2d') fitView();
    render();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(el); else window.addEventListener('resize', resize);

  function fitView() {
    const v = room.views[viewIdx] || room.views[0];
    camera.position.set(...v.pos); camera.fov = v.fov * (camera.aspect < 1 ? Math.min(1.35, 1 / camera.aspect * 0.85) : 1);
    camera.lookAt(...v.target);
  }

  /* ── build ─────────────────────────────────────────────────────────────────────────────────────────────── */
  function clear() {
    if (!scene) return;
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    Object.values(surfaces).forEach((s) => s.mats.forEach((m) => { if (m.map) m.map.dispose(); if (m.bumpMap) m.bumpMap.dispose(); m.dispose(); }));
    surfaces = {};
  }
  function setRoom(r) {
    clear(); room = r;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e6e0'); scene.environment = envTex;
    scene.add(new THREE.HemisphereLight('#fffaf2', '#a59a88', 0.9));
    scene.add(new THREE.AmbientLight('#ffffff', 0.25));
    const W = r.W, D = r.D, H = r.H;
    const reg = (key, mesh, w, h, box) => {
      const s = surfaces[key] || (surfaces[key] = { meshes: [], area: 0, mats: [] });
      s.meshes.push({ mesh, w, h, box }); mesh.userData.surface = key;
      s.area += box ? w * h : w * h;
    };
    const add = (mesh, cast = true) => { mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); return mesh; };
    const ctx = {
      W, D, H,
      panel(key, facing, x, y, z, w, h) {
        const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#dddddd' })), false);
        if (facing === '+z') m.position.set(x + w / 2, y + h / 2, z);
        else if (facing === '-z') { m.rotation.y = Math.PI; m.position.set(x - w / 2, y + h / 2, z); }
        else if (facing === '+x') { m.rotation.y = Math.PI / 2; m.position.set(x, y + h / 2, z + w / 2); }
        else if (facing === '-x') { m.rotation.y = -Math.PI / 2; m.position.set(x, y + h / 2, z + w / 2); }
        else if (facing === '+y') { m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, y, z + h / 2); }
        else if (facing === '-y') { m.rotation.x = Math.PI / 2; m.position.set(x + w / 2, y, z + h / 2); }
        reg(key, m, w, h, false); return m;
      },
      box(key, x, y, z, w, h, d, o = {}) {
        const isSurf = !!(r.surfaces.includes(key));
        const geo = o.round ? new RoundedBoxGeometry(w, h, d, 3, o.round) : new THREE.BoxGeometry(w, h, d);
        if (isSurf) meterUV(geo, w, h, d, (x + z) * 0.37, y * 0.21);
        const m = add(new THREE.Mesh(geo, isSurf ? new THREE.MeshStandardMaterial({ color: '#dddddd' }) : decor(key)), o.cast !== false);
        m.position.set(x + w / 2, y + h / 2, z + d / 2);
        if (isSurf) reg(key, m, (key === 'countertop' ? w : w), key === 'countertop' ? d : (d < 0.05 || w < 0.05 ? Math.max(h, 0) : h), true);
        return m;
      },
      room(o = {}) {
        ctx.panel('floor', '+y', 0, 0, 0, W, D);
        ctx.panel('ceiling', '-y', 0, H, 0, W, D);
        ctx.panel(r.surfaces.includes('feature') ? 'feature' : 'walls', '+z', 0, 0, 0, W, o.featureH || H);
        ctx.panel('walls', '+x', 0, 0, 0, D, H);
        ctx.panel('walls', '-x', W, 0, 0, D, H);
        ctx.panel('walls', '-z', W, 0, D, W, H);
        // skirting
        add(new THREE.Mesh(new THREE.BoxGeometry(W, 0.07, 0.012), decor('frame')), false).position.set(W / 2, 0.035, D - 0.006);
        [[0.006, D / 2, 0.012, D], [W - 0.006, D / 2, 0.012, D]].forEach(([x, z, w, d]) => add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), decor('frame')), false).position.set(x, 0.035, z));
      },
      handle(dir, x, y, z, len, sign = 1) {
        const t = 0.012;
        if (dir === 'x') add(new THREE.Mesh(new THREE.BoxGeometry(len, t, t), decor('metal'))).position.set(x, y, z + 0.018);
        else if (dir === 'y') add(new THREE.Mesh(new THREE.BoxGeometry(t, len, t), decor('metal'))).position.set(x, y + len / 2, z + 0.018);
        else add(new THREE.Mesh(new THREE.BoxGeometry(t, len, t), decor('metal'))).position.set(x + 0.018 * sign, y + len / 2, z);
      },
      window(wall, a, y, w, h) {
        const g = new THREE.Group();
        const sky = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decor('sky'));
        const fr = 0.05;
        const parts = [[w + fr * 2, fr, 0, h / 2 + fr / 2], [w + fr * 2, fr, 0, -h / 2 - fr / 2], [fr, h, -w / 2 - fr / 2, 0], [fr, h, w / 2 + fr / 2, 0], [0.03, h, 0, 0]];
        g.add(sky);
        parts.forEach(([pw, ph, px, py]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.06), decor('frame')); b.position.set(px, py, 0.02); b.castShadow = true; g.add(b); });
        const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.03, 0.2), decor('frame')); sill.position.set(0, -h / 2 - 0.05, 0.08); g.add(sill);
        if (wall === 'right') { g.rotation.y = -Math.PI / 2; g.position.set(W - 0.004, y + h / 2, a + w / 2); }
        else if (wall === 'left') { g.rotation.y = Math.PI / 2; g.position.set(0.004, y + h / 2, a + w / 2); }
        else { g.position.set(a + w / 2, y + h / 2, 0.004); }
        scene.add(g);
        const sun = new THREE.DirectionalLight('#fff3e0', 2.4);
        const wc = g.position.clone();
        const out = wall === 'right' ? new THREE.Vector3(3.5, 2.6, -1.2) : wall === 'left' ? new THREE.Vector3(-3.5, 2.6, -1.2) : new THREE.Vector3(1, 2.6, -3.5);
        sun.position.copy(wc).add(out); sun.target.position.set(W / 2, 0, D / 2);
        sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
        const sc = sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 0.5; sc.far = 20;
        scene.add(sun); scene.add(sun.target);
        const spill = new THREE.PointLight('#f4f8ff', 3.5, 6, 2); spill.position.copy(wc).add(out.clone().setLength(0.6).negate()); scene.add(spill);
      },
      light(x, y, z) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 20), decor('downlight')); d.position.set(x, y + 0.04, z); scene.add(d);
        const p = new THREE.PointLight('#ffe9cc', 2.6, 7, 2); p.position.set(x, y - 0.15, z); scene.add(p);
      },
      pendant(x, z, y) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, H - y, 6), decor('dark')); cord.position.set(x, (H + y) / 2, z); scene.add(cord);
        const sh = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), decor('brass'))); sh.position.set(x, y, z); sh.rotation.x = Math.PI;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), decor('downlight')); bulb.position.set(x, y - 0.05, z); scene.add(bulb);
        const p = new THREE.PointLight('#ffdcae', 1.4, 3, 2); p.position.set(x, y - 0.2, z); scene.add(p);
      },
      plant(x, z, s = 1) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.12 * s, 0.34 * s, 20), decor('pot'))).position.set(x, 0.17 * s, z);
        for (let i = 0; i < 7; i++) {
          const leaf = add(new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 8), decor('leaf')));
          const a = i * 0.9; leaf.scale.set(0.7, 1.3, 0.5); leaf.position.set(x + Math.cos(a) * 0.13 * s, (0.5 + (i % 3) * 0.17) * s, z + Math.sin(a) * 0.13 * s); leaf.rotation.set(Math.cos(a) * 0.5, a, Math.sin(a) * 0.5);
        }
      },
      stool(x, z) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24), decor('woodlight'))).position.set(x, 0.68, z);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8), decor('metal'))); l.position.set(x + a * 0.11, 0.33, z + b * 0.11); });
      },
      bed(x, z, w, l) {
        ctx.box('fabric2', x, 0.05, z + 0.05, w, 0.3, l, { round: 0.04 });
        ctx.box('fabric2', x - 0.05, 0.05, z, w + 0.1, 1.1, 0.1, { round: 0.04 });
        ctx.box('linen', x + 0.04, 0.35, z + 0.15, w - 0.08, 0.22, l - 0.15, { round: 0.06 });
        ctx.box('fabric', x + 0.02, 0.5, z + 0.75, w - 0.04, 0.12, l - 0.72, { round: 0.05 });
        ctx.box('linen', x + 0.15, 0.56, z + 0.2, w / 2 - 0.22, 0.16, 0.42, { round: 0.07 });
        ctx.box('linen', x + w / 2 + 0.07, 0.56, z + 0.2, w / 2 - 0.22, 0.16, 0.42, { round: 0.07 });
      },
      nightstand(x, z) { ctx.box('woodlight', x, 0.06, z + 0.02, 0.48, 0.48, 0.4, { round: 0.01 }); ctx.box('metal', x + 0.05, 0, z + 0.06, 0.38, 0.06, 0.3); },
      lamp(x, y, z) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 16), decor('pot'))).position.set(x, y + 0.14, z);
        const sh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.2, 24, 1, true), decor('lampshade'))); sh.position.set(x, y + 0.36, z);
        const p = new THREE.PointLight('#ffd9a8', 0.9, 2.5, 2); p.position.set(x, y + 0.35, z + 0.05); scene.add(p);
      },
      floorlamp(x, z) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), decor('metal'))).position.set(x, 0.75, z);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 20), decor('metal'))).position.set(x, 0.01, z);
        const sh = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.28, 24, 1, true), decor('lampshade'))); sh.position.set(x, 1.55, z);
        const p = new THREE.PointLight('#ffd9a8', 1.6, 4, 2); p.position.set(x, 1.5, z); scene.add(p);
      },
      rug(x, z, w, d, color) {
        const m = new THREE.MeshStandardMaterial({ color, roughness: 1 }); const r2 = add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), m), false); r2.position.set(x + w / 2, 0.006, z + d / 2);
      },
      sofa(x, z, side) {
        const L = 2.4, dpt = 0.95;
        if (side === 'left') {
          ctx.box('fabric', x, 0.12, z, dpt, 0.32, L, { round: 0.05 });
          ctx.box('fabric', x, 0.12, z, 0.22, 0.75, L, { round: 0.06 });
          ctx.box('fabric', x, 0.12, z - 0.02, dpt, 0.6, 0.2, { round: 0.06 }); ctx.box('fabric', x, 0.12, z + L - 0.18, dpt, 0.6, 0.2, { round: 0.06 });
          for (let k = 0; k < 3; k++) ctx.box('fabric', x + 0.22, 0.44, z + 0.2 + k * (L - 0.4) / 3 + 0.01, dpt - 0.25, 0.14, (L - 0.4) / 3 - 0.02, { round: 0.06 });
          ctx.box('fabric2', x + 0.24, 0.6, z + 0.35, 0.14, 0.38, 0.42, { round: 0.06 }); ctx.box('fabric2', x + 0.24, 0.6, z + L - 0.8, 0.14, 0.38, 0.42, { round: 0.06 });
          ctx.box('metal', x + 0.1, 0, z + 0.1, 0.05, 0.12, 0.05); ctx.box('metal', x + 0.1, 0, z + L - 0.15, 0.05, 0.12, 0.05);
        }
      },
      chair(x, z) {
        ctx.box('fabric2', x - 0.27, 0.45, z - 0.27, 0.54, 0.08, 0.52, { round: 0.03 });
        ctx.box('fabric2', x - 0.27, 0.5, z + 0.2, 0.54, 0.5, 0.07, { round: 0.03 });
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10), decor('metal'))).position.set(x, 0.23, z);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 5), decor('metal'))).position.set(x, 0.03, z);
      },
      decor(kind, x, y, z) {
        if (kind === 'bowl') { const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), decor('porcelain'))); b.position.set(x, y + 0.12, z); for (let i = 0; i < 4; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), decor(i % 2 ? 'brass' : 'leaf'))).position.set(x + (i - 1.5) * 0.06, y + 0.05, z + (i % 2) * 0.05); }
        else if (kind === 'vase') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 18), decor('pot'))).position.set(x, y + 0.15, z); }
        else if (kind === 'books') { for (let i = 0; i < 8; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22 + (i % 3) * 0.03, 0.18), decor(['fabric2', 'linen', 'dark', 'woodlight'][i % 4]))).position.set(x + i * 0.04, y + 0.12, z + 0.1); }
      },
    };
    r.build(ctx);
    // a few surfaces register boxes with the wrong face for area: recompute countertops (top area) and fronts precisely
    Object.values(surfaces).forEach((s) => { s.area = s.meshes.reduce((a, m) => a + (m.box ? (m.mesh.geometry.parameters ? frontArea(m.mesh.geometry.parameters, s === surfaces.countertop) : 0) : m.w * m.h), 0); });
    if (mode === '360') { look.yaw = 0; look.pitch = -0.05; } else fitView();
    resize();
    return Object.keys(surfaces);
  }
  function frontArea(p, top) { const w = p.width, h = p.height, d = p.depth; if (top) return w * d; return Math.max(w * h, d * h, 0); }

  /* ── apply a product to a surface ──────────────────────────────────────────────────────────────────────── */
  const applyTokens = {};
  async function apply(key, sel) {
    const s = surfaces[key]; if (!s || !sel || !sel.product) return;
    const token = (applyTokens[key] = (applyTokens[key] || 0) + 1);
    const p = sel.product;
    const rough = roughnessOf(p);
    const flat = p.procedural && p.procedural.type === 'paint' && !p.texture_url;
    const maxPx = mobile ? 1024 : 2048;
    const opts = { layout: sel.layout, grout: sel.grout, rotation: sel.rotation || 0, product2: sel.product2, maxPx };
    const made = [];
    const mkMat = (canv, bump, repeat) => {
      const m = new THREE.MeshStandardMaterial({ roughness: rough, metalness: 0, envMapIntensity: rough < 0.2 ? 0.9 : 0.45 });
      if (flat) { m.color = new THREE.Color(p.procedural.base || p.hex); return m; }
      const t = new THREE.CanvasTexture(canv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / repeat[0], 1 / repeat[1]); }
      m.map = t;
      if (bump && !isContinuous(p)) { const bt = new THREE.CanvasTexture(bump); if (repeat) { bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.copy(t.repeat); } m.bumpMap = bt; m.bumpScale = 1.2; }
      return m;
    };
    // panels: one exact texture each; boxes: one shared repeating texture in real-world scale
    const boxes = s.meshes.filter((m) => m.box), panels = s.meshes.filter((m) => !m.box);
    if (boxes.length) {
      const rep = isContinuous(p) ? repeatSizeM(p) : [2, 2];
      const lay = flat ? null : await drawLayout(p, { ...opts, w: rep[0], h: rep[1], maxPx: 1024 });
      if (token !== applyTokens[key]) return;
      const mat = mkMat(lay && lay.canvas, lay && lay.bump, rep); made.push(mat);
      boxes.forEach((b) => { b.mesh.material = mat; });
    }
    for (const pn of panels) {
      const lay = flat ? null : await drawLayout(p, { ...opts, w: pn.w, h: pn.h, seed: Math.round(pn.w * 100 + pn.h * 7) });
      if (token !== applyTokens[key]) { made.forEach((m) => m.dispose()); return; }
      const mat = mkMat(lay && lay.canvas, lay && lay.bump, null); made.push(mat); pn.mesh.material = mat;
      // matt paint on walls: a faint plaster texture keeps big walls from looking like plastic
      if (flat && (key === 'walls' || key === 'feature' || key === 'ceiling')) mat.roughness = 0.9;
    }
    s.mats.forEach((m) => { if (m.map) m.map.dispose(); if (m.bumpMap) m.bumpMap.dispose(); m.dispose(); });
    s.mats = made;
    render();
  }

  function flash(key) {
    const s = surfaces[key]; if (!s) return;
    const mats = s.mats.length ? s.mats : s.meshes.map((m) => m.mesh.material);
    const t0 = performance.now();
    const step = () => {
      const t = (performance.now() - t0) / 700; const k = t < 1 ? Math.sin(t * Math.PI) * 0.35 : 0;
      mats.forEach((m) => { if (m.emissive) { m.emissive.set('#c65d2e'); m.emissiveIntensity = k; } });
      render(); if (t < 1) requestAnimationFrame(step); else mats.forEach((m) => { if (m.emissive) m.emissive.set('#000000'); });
    };
    step();
  }

  /* ── pointer: pick + 360 look ─────────────────────────────────────────────────────────────────────────── */
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let dragging = false, down = null, last = null, pinch = null;
  const pickAt = (cx, cy) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.visible && !(h.object.material && h.object.material.transparent));
    return hit && hit.object.userData.surface ? hit.object.userData.surface : null;
  };
  const cvs = renderer.domElement;
  cvs.style.touchAction = 'none';
  const pts = new Map();
  cvs.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); down = [e.clientX, e.clientY, performance.now()]; last = [e.clientX, e.clientY]; dragging = true; look.vyaw = look.vpitch = 0; try { cvs.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), fov: look.fov }; } });
  cvs.addEventListener('pointermove', (e) => {
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); look.fov = Math.max(35, Math.min(95, pinch.fov * pinch.d / Math.max(10, d))); render(); return; }
    if (dragging && mode === '360' && last) {
      const k = (look.fov / 75) * 0.0045; const dx = e.clientX - last[0], dy = e.clientY - last[1];
      look.yaw -= dx * k; look.pitch += dy * k; look.vyaw = -dx * k * 0.5; look.vpitch = dy * k * 0.5; last = [e.clientX, e.clientY]; render(); return;
    }
    if (!dragging && cb.onHover && e.pointerType === 'mouse') { const k = pickAt(e.clientX, e.clientY); cvs.style.cursor = k ? 'pointer' : (mode === '360' ? 'grab' : 'default'); cb.onHover(k, e.clientX, e.clientY); }
  });
  const up = (e) => {
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 7 && performance.now() - down[2] < 600) { const k = pickAt(e.clientX, e.clientY); if (cb.onPick) cb.onPick(k); }
    dragging = false; down = null; render();
  };
  cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
  cvs.addEventListener('pointerleave', () => { if (cb.onHover) cb.onHover(null); });
  cvs.addEventListener('wheel', (e) => { if (mode !== '360') return; e.preventDefault(); look.fov = Math.max(35, Math.min(95, look.fov + e.deltaY * 0.04)); render(); }, { passive: false });

  let gyroOn = false; let gyroBase = null;
  const onOrient = (e) => {
    if (!gyroOn || mode !== '360' || e.alpha == null) return;
    const yaw = (-(e.alpha || 0) * Math.PI) / 180, pitch = (((e.beta || 90) - 90) * Math.PI) / 180;
    if (!gyroBase) gyroBase = { yaw: yaw - look.yaw };
    look.yaw = yaw - gyroBase.yaw; look.pitch = Math.max(-1.3, Math.min(1.3, pitch)); render();
  };
  async function gyro(on) {
    if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') return false; } catch (e) { return false; }
    }
    gyroOn = !!on; gyroBase = null;
    if (on) window.addEventListener('deviceorientation', onOrient); else window.removeEventListener('deviceorientation', onOrient);
    return gyroOn;
  }

  return {
    setRoom, apply, flash, gyro, resize, render,
    setMode(m) { mode = m === '360' ? '360' : '2d'; if (mode === '360') { look.yaw = 0; look.pitch = -0.08; look.fov = mobile ? 80 : 75; cvs.style.cursor = 'grab'; } else { fitView(); cvs.style.cursor = 'default'; } render(); },
    setView(i) { viewIdx = i; if (mode === '2d') fitView(); render(); },
    turn(d) { look.yaw += d; render(); },
    areas() { const out = {}; Object.entries(surfaces).forEach(([k, s]) => { out[k] = Math.round(s.area * 100) / 100; }); return out; },
    snapshot(type = 'image/jpeg', q = 0.9) { frame(); return renderer.domElement.toDataURL(type, q); },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      window.removeEventListener('deviceorientation', onOrient); clear(); Object.values(decorMats).forEach((m) => m.dispose());
      envTex.dispose(); pmrem.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}

export const tint = (hex, k) => { const c = hexRgb(hex); return rgbHex(c[0] * k, c[1] * k, c[2] * k); };
