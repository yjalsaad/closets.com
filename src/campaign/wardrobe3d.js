/* [IKHTARHA 2026-11-08] اختارها — the 3D wardrobe and its mystery boxes (three.js 0.160, already a site dependency).
 * createWardrobe(host, opts) → { intro(), select(i), reveal(i, ms), setPreview(on), dispose() }
 *   - wardrobe: walnut / oak / ivory / charcoal carcass with procedural wood grain, shaker doors on hinges, gold bar handles,
 *     LED-lit shelves, orange + burgundy accent lights, soft shadows, reflective floor
 *   - boxes: n (3–16) individually lit gift boxes with lids, ribbons and bows; idle float, hover lift, selection glow
 *   - reveal: the chosen box glides to the camera, trembles, the lid flies off, light + gold particles burst out
 * Reduced motion: no camera flights or trembling; doors and lids move in short, plain fades.
 * The reward itself is never known here — the server decides it; this only animates the chosen box. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const THEMES = {
  walnut:   { wood: ['#5b3a26', '#3b2416'], inner: '#e9dccb', accent: '#D9692F', rim: '#7a2633', handle: '#c9a35a', bg: '#140b0c' },
  oak:      { wood: ['#b88a58', '#8a6234'], inner: '#f1e6d6', accent: '#E07A3F', rim: '#6d2430', handle: '#c9a35a', bg: '#170e0c' },
  ivory:    { wood: ['#efe8dc', '#d9cfbf'], inner: '#fbf7f1', accent: '#D9692F', rim: '#4B1F24', handle: '#b8924e', bg: '#120a0b', lacquer: true },
  charcoal: { wood: ['#3a3634', '#262322'], inner: '#d8cdc0', accent: '#C9702E', rim: '#5a1d26', handle: '#b87333', bg: '#0e0a0a' },
};
const BOX_PALETTE = [
  { body: '#D9692F', ribbon: '#f6efe5', rough: 0.45 },   // orange satin, cream ribbon
  { body: '#4B1F24', ribbon: '#c9a35a', rough: 0.7 },    // burgundy velvet, gold ribbon
  { body: '#f3ece2', ribbon: '#D9692F', rough: 0.5 },    // cream, orange ribbon
  { body: '#b8924e', ribbon: '#4B1F24', rough: 0.3, metal: 0.6 }, // gold, burgundy ribbon
  { body: '#6b2a33', ribbon: '#f3ece2', rough: 0.6 },    // wine, cream ribbon
  { body: '#e4884f', ribbon: '#4B1F24', rough: 0.45 },   // light orange, burgundy ribbon
];
/** box finishes from the campaign colours (Bonsai → campaign identity); falls back to the default palette */
const HEX = /^#[0-9A-Fa-f]{6}$/;
function brandPalette(b) {
  if (!b || !HEX.test(b.primary || '') || !HEX.test(b.accent || '')) return BOX_PALETTE;
  const sand = HEX.test(b.sand || '') ? b.sand : '#f3ece2'; const taupe = HEX.test(b.taupe || '') ? b.taupe : '#b8924e';
  return [
    { body: b.accent, ribbon: sand, rough: 0.45 }, { body: b.primary, ribbon: '#c9a35a', rough: 0.7 }, { body: sand, ribbon: b.accent, rough: 0.5 },
    { body: taupe, ribbon: b.primary, rough: 0.35, metal: 0.3 }, { body: b.primary, ribbon: sand, rough: 0.6 }, { body: b.accent, ribbon: b.primary, rough: 0.4 },
  ];
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function woodTexture(c1, c2, seed = 7, lacquer = false) {
  const W = 512, H = 1024; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, W, H);
  if (lacquer) {
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'rgba(0,0,0,.05)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  } else {
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W; const w = 0.6 + rnd() * 2.6; const a = 0.05 + rnd() * 0.16;
      g.strokeStyle = c2; g.globalAlpha = a; g.lineWidth = w; g.beginPath();
      const amp = 2 + rnd() * 7; const f = 0.004 + rnd() * 0.01; const ph = rnd() * 6;
      for (let y = 0; y <= H; y += 8) { const xx = x + Math.sin(y * f + ph) * amp; if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
function glowTexture(color) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, color); gr.addColorStop(0.35, color + '88'); gr.addColorStop(1, color + '00');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}

export function createWardrobe(host, opts = {}) {
  const themeBase = THEMES[opts.theme] || THEMES.walnut; const br = opts.brand || {};
  const theme = { ...themeBase, accent: HEX.test(br.accent || "") ? br.accent : themeBase.accent, rim: HEX.test(br.primary || "") ? br.primary : themeBase.rim };
  const PAL = brandPalette(br);
  const n = Math.max(3, Math.min(16, opts.boxes || 9));
  const reduced = !!opts.reduced;
  const mobile = Math.min(host.clientWidth, host.clientHeight) < 560;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block'; renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color(theme.bg); scene.fog = new THREE.Fog(theme.bg, 9, 18);
  const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = envTex; scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(mobile ? 46 : 36, host.clientWidth / host.clientHeight, 0.05, 60);

  // ── lights ──
  scene.add(new THREE.HemisphereLight('#ffe9d6', '#1b0f10', 0.35));
  const key = new THREE.SpotLight('#fff1e2', 26, 16, Math.PI / 7, 0.55, 1.6); key.position.set(-1.6, 5.2, 4.2); key.castShadow = !mobile; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004;
  key.target.position.set(0, 1.2, 0); scene.add(key, key.target);
  const accent = new THREE.PointLight(theme.accent, 7, 9, 2); accent.position.set(-3.2, 1.6, 1.4); scene.add(accent);
  const rim = new THREE.PointLight(theme.rim, 9, 9, 2); rim.position.set(3.0, 2.6, -1.2); scene.add(rim);
  const burst = new THREE.PointLight('#ffd8a6', 0, 6, 2); scene.add(burst);

  // ── floor ──
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: '#1d1314', roughness: 0.32, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: glowTexture('#d9692f'), transparent: true, opacity: 0.18, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.005, 0.6); scene.add(pool);

  // ── wardrobe ──
  const W = 2.4, H = 2.62, D = 0.66, T = 0.045, base = 0.09;
  const woodTex = woodTexture(theme.wood[0], theme.wood[1], 11, theme.lacquer);
  // phones: standard materials (no clearcoat / sheen passes) and fewer lights — same look, much cheaper to shade
  const wood = mobile ? new THREE.MeshStandardMaterial({ map: woodTex, roughness: theme.lacquer ? 0.25 : 0.5 })
    : new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: theme.lacquer ? 0.22 : 0.48, clearcoat: theme.lacquer ? 0.9 : 0.35, clearcoatRoughness: 0.35 });
  const inner = new THREE.MeshStandardMaterial({ color: theme.inner, roughness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({ color: theme.handle, metalness: 1, roughness: 0.22 });
  const wardrobe = new THREE.Group(); scene.add(wardrobe);
  const panel = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = !mobile; m.receiveShadow = true; wardrobe.add(m); return m; };
  panel(T, H, D, wood, -W / 2 + T / 2, base + H / 2, 0); panel(T, H, D, wood, W / 2 - T / 2, base + H / 2, 0);
  panel(W, T, D, wood, 0, base + H - T / 2, 0); panel(W, T, D, wood, 0, base + T / 2, 0); panel(W - 2 * T, H - 2 * T, 0.02, inner, 0, base + H / 2, -D / 2 + 0.01);
  panel(W + 0.08, 0.07, D + 0.08, wood, 0, base + H + 0.035, 0.0);                     // crown
  panel(W - 0.06, base, D - 0.06, new THREE.MeshStandardMaterial({ color: '#120b0b', roughness: 0.6 }), 0, base / 2, 0); // plinth

  // shelves + LED strips
  const rows = n <= 4 ? 1 : n <= 9 ? 3 : 4;
  const perRow = Math.ceil(n / rows);
  const innerTop = base + H - T, innerBot = base + T; const rowH = (innerTop - innerBot) / rows;
  const ledMat = new THREE.MeshBasicMaterial({ color: '#ffcf9a' });
  for (let r = 1; r < rows + 1; r++) {
    const y = innerBot + rowH * r - (r === rows ? 0 : 0);
    if (r < rows) panel(W - 2 * T, T * 0.7, D - 0.05, inner, 0, y, -0.01);
    const led = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T - 0.04, 0.012, 0.012), ledMat); led.position.set(0, y - T * 0.5 - 0.01, D / 2 - 0.07); wardrobe.add(led);
  }
  const shelfLights = [];
  for (let r = 0; r < Math.min(rows, mobile ? 1 : 3); r++) {
    const l = new THREE.PointLight('#ffb978', 0, 2.2, 2); l.position.set(0, innerBot + rowH * (r + 1) - 0.12, 0.15); wardrobe.add(l); shelfLights.push(l);
  }

  // doors (hinged groups at the outer edges) — shaker frame + gold bar handle
  const doorW = W / 2 - 0.004, doorH = H - 0.01;
  const makeDoor = (side) => {
    const hinge = new THREE.Group(); hinge.position.set(side * W / 2, base + H / 2, D / 2 + 0.012);
    const leaf = new THREE.Group(); leaf.position.x = -side * doorW / 2; hinge.add(leaf);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.024), wood); slab.castShadow = !mobile; slab.receiveShadow = true; leaf.add(slab);
    const fr = 0.08; const fz = 0.016;
    [[0, doorH / 2 - fr / 2, doorW, fr], [0, -doorH / 2 + fr / 2, doorW, fr], [-doorW / 2 + fr / 2, 0, fr, doorH], [doorW / 2 - fr / 2, 0, fr, doorH], [0, -0.08, doorW, fr * 0.8]].forEach(([x, y, w, h]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), wood); s.position.set(x, y, fz); leaf.add(s);
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 16), gold); handle.position.set(side * (doorW / 2 - 0.11), 0.05, 0.05); leaf.add(handle);
    [-0.29, 0.29].forEach((dy) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 12), gold); p.rotation.x = Math.PI / 2; p.position.set(side * (doorW / 2 - 0.11), 0.05 + dy, 0.03); leaf.add(p); });
    wardrobe.add(hinge); return hinge;
  };
  const doorL = makeDoor(-1); const doorR = makeDoor(1);

  // ── boxes ──
  const boxes = [];
  const slotW = (W - 2 * T - 0.08) / perRow;
  const size = Math.min(0.34, slotW * 0.72, rowH * 0.62);
  const ribbonMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.15 });
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow); const inRow = Math.min(perRow, n - r * perRow); const c = i - r * perRow;
    const x = (c - (inRow - 1) / 2) * slotW; const y = innerTop - rowH * (r + 1) + T * 0.4 + size / 2 + 0.005;
    const pal = PAL[(i * 5 + r) % PAL.length];
    const bodyMat = mobile ? new THREE.MeshStandardMaterial({ color: pal.body, roughness: pal.rough, metalness: pal.metal || 0 })
      : new THREE.MeshPhysicalMaterial({ color: pal.body, roughness: pal.rough, metalness: pal.metal || 0, clearcoat: 0.25, sheen: pal.rough > 0.6 ? 0.6 : 0, sheenColor: new THREE.Color('#ffd9c0') });
    const g = new THREE.Group(); g.position.set(x, y, 0.06); g.userData = { index: i, home: new THREE.Vector3(x, y, 0.06), phase: i * 1.37, hover: 0, sel: 0 };
    const body = new THREE.Mesh(new RoundedBoxGeometry(size, size * 0.86, size, 3, size * 0.06), bodyMat); body.position.y = -size * 0.07; body.castShadow = !mobile; body.receiveShadow = true;
    const lid = new THREE.Group(); lid.position.y = size * 0.36;
    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(size * 1.06, size * 0.2, size * 1.06, 3, size * 0.05), bodyMat); lidMesh.castShadow = !mobile; lid.add(lidMesh);
    const rm = ribbonMat(pal.ribbon);
    const rb1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.87, size * 1.005), rm); rb1.position.y = -size * 0.07;
    const rb2 = new THREE.Mesh(new THREE.BoxGeometry(size * 1.005, size * 0.87, size * 0.16), rm); rb2.position.y = -size * 0.07;
    const rl1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.205, size * 1.07), rm); const rl2 = new THREE.Mesh(new THREE.BoxGeometry(size * 1.07, size * 0.205, size * 0.16), rm);
    lid.add(rl1, rl2);
    const bowGeo = new THREE.TorusGeometry(size * 0.15, size * 0.04, 10, 24);
    [-1, 1].forEach((s2) => { const b = new THREE.Mesh(bowGeo, rm); b.position.set(s2 * size * 0.13, size * 0.17, 0); b.rotation.set(Math.PI / 2.4, 0, s2 * 0.6); lid.add(b); });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.06, 16, 12), rm); knot.position.y = size * 0.14; lid.add(knot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.75, size * 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffb36b', transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -size * 0.5; g.add(ring);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffb36b'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(size * 3, size * 3, 1); g.add(halo);
    g.add(body, rb1, rb2, lid); wardrobe.add(g);
    boxes.push({ g, body, lid, ring, halo, bodyMat, size });
  }

  // particles for the reveal
  const PN = mobile ? 160 : 320; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PN * 3); const pVel = new Float32Array(PN * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pCols = new Float32Array(PN * 3); const palette = ['#ffcf7a', '#D9692F', '#f6efe5', '#c9a35a'].map((c) => new THREE.Color(c));
  for (let i = 0; i < PN; i++) { const c = palette[i % palette.length]; pCols[i * 3] = c.r; pCols[i * 3 + 1] = c.g; pCols[i * 3 + 2] = c.b; }
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCols, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(particles);

  // ── camera rig ──
  const camFar = { pos: new THREE.Vector3(0, 1.75, mobile ? 9.5 : 7.4), look: new THREE.Vector3(0, 1.35, 0) };
  const camMid = { pos: new THREE.Vector3(0, 1.5, mobile ? 8.2 : 6.6), look: new THREE.Vector3(0, 1.28, 0) };
  const camIn = { pos: new THREE.Vector3(0, 1.42, mobile ? 7.4 : 5.6), look: new THREE.Vector3(0, 1.26, 0) };
  const cam = { pos: camFar.pos.clone(), look: camFar.look.clone() };
  const tweens = [];
  const tween = (ms, fn, done, e = ease) => new Promise((res) => { tweens.push({ t0: performance.now(), ms: Math.max(1, reduced ? Math.min(ms, 250) : ms), fn, done: () => { if (done) done(); res(); }, e }); });

  let preview = !!opts.preview;
  const side = opts.side || 0;   // hero: push the wardrobe to the side opposite the text (desktop only)
  if (preview && side && !mobile) { wardrobe.position.x = side * 1.05; cam.look.x = side * 0.35; cam.pos.x = side * 0.2; } let doorsOpen = 0; let hovered = -1; let selected = -1; let locked = false; let revealing = null; let alive = true;
  const pointer = new THREE.Vector2(); const ray = new THREE.Raycaster();

  const setDoors = (k) => { doorsOpen = k; doorL.rotation.y = -k * 1.92; doorR.rotation.y = k * 1.92; shelfLights.forEach((l) => { l.intensity = k * 1.4; }); };
  const pickBox = (ev) => {
    const r = renderer.domElement.getBoundingClientRect(); pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(boxes.map((b) => b.g), true)[0];
    if (!hit) return -1; let o = hit.object; while (o && o.userData.index === undefined) o = o.parent; return o ? o.userData.index : -1;
  };
  const onMove = (ev) => {
    if (preview || locked || doorsOpen < 0.95) { renderer.domElement.style.cursor = 'default'; return; }
    hovered = pickBox(ev); renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'default';
    if (opts.onHover) opts.onHover(hovered);
  };
  const onClick = (ev) => { if (preview || locked || doorsOpen < 0.95) return; const i = pickBox(ev); if (i >= 0 && opts.onPick) opts.onPick(i); };
  renderer.domElement.addEventListener('pointermove', onMove); renderer.domElement.addEventListener('click', onClick);
  const onResize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null; if (ro) ro.observe(host); else window.addEventListener('resize', onResize);

  // ── frame loop ──
  let last = performance.now();
  const loop = (now) => {
    if (!alive) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; const k = clamp01((now - tw.t0) / tw.ms); tw.fn(tw.e(k), k); if (k >= 1) { tweens.splice(i, 1); tw.done(); } }
    if (preview) { wardrobe.rotation.y = Math.sin(t * 0.25) * 0.22; accent.intensity = 6 + Math.sin(t * 1.2) * 1.5; } else wardrobe.rotation.y = lerp(wardrobe.rotation.y, 0, 0.06);
    boxes.forEach((b, i) => {
      const u = b.g.userData; const isSel = i === selected; const isHov = i === hovered && !locked;
      u.hover = lerp(u.hover, isHov ? 1 : 0, 0.18); u.sel = lerp(u.sel, isSel ? 1 : 0, 0.12);
      if (revealing && revealing.i === i) return;
      const bob = reduced ? 0 : Math.sin(t * 1.6 + u.phase) * 0.008 * doorsOpen;
      b.g.position.set(u.home.x, u.home.y + bob + u.hover * 0.025 + u.sel * 0.05, u.home.z + u.sel * 0.2 + u.hover * 0.04);
      b.g.rotation.y = reduced ? 0 : Math.sin(t * 0.7 + u.phase) * 0.06 * doorsOpen + u.sel * Math.sin(t * 2) * 0.08;
      const s = 1 + u.hover * 0.06 + u.sel * 0.1; b.g.scale.setScalar(s);
      b.ring.material.opacity = u.sel * (0.65 + Math.sin(t * 4) * 0.25); b.ring.rotation.z = t * 0.8;
      b.halo.material.opacity = u.sel * 0.55 + u.hover * 0.2;
      b.bodyMat.emissive.set(theme.accent); b.bodyMat.emissiveIntensity = u.hover * 0.06 + u.sel * 0.12;
      const dim = selected >= 0 && !isSel ? 0.55 : 1; b.bodyMat.color.lerp(new THREE.Color(PAL[(i * 5 + Math.floor(i / perRow)) % PAL.length].body).multiplyScalar(dim), 0.1);
    });
    if (particles.material.opacity > 0) {
      const p = pGeo.attributes.position.array;
      for (let i = 0; i < PN; i++) { pVel[i * 3 + 1] -= 1.6 * dt; p[i * 3] += pVel[i * 3] * dt; p[i * 3 + 1] += pVel[i * 3 + 1] * dt; p[i * 3 + 2] += pVel[i * 3 + 2] * dt; }
      pGeo.attributes.position.needsUpdate = true; particles.material.opacity = Math.max(0, particles.material.opacity - dt * 0.35);
    }
    camera.position.copy(cam.pos); camera.lookAt(cam.look);
    renderer.render(scene, camera);
  };
  setDoors(0); requestAnimationFrame(loop);

  const api = {
    get count() { return n; },
    setPreview(on) { preview = !!on; },
    /** wardrobe appears → camera moves closer → doors open → interior lights up */
    async intro() {
      preview = false; wardrobe.position.x = 0; cam.look.x = 0; cam.pos.x = 0;
      const p0 = cam.pos.clone(); const l0 = cam.look.clone();
      await tween(1700, (k) => { cam.pos.lerpVectors(p0, camMid.pos, k); cam.look.lerpVectors(l0, camMid.look, k); });
      await tween(1500, (k) => setDoors(k), null, easeOut);
      const p1 = cam.pos.clone();
      await tween(1100, (k) => { cam.pos.lerpVectors(p1, camIn.pos, k); });
    },
    select(i) { if (locked || i < 0 || i >= n) return; selected = i; },
    /** lock the selection and play the opening; resolves at the moment the lid is off (when the reward should appear) */
    async reveal(i, ms = 2600) {
      if (locked) return; locked = true; selected = i; hovered = -1; const b = boxes[i]; if (!b) return;
      revealing = { i };
      const start = b.g.position.clone(); const world = new THREE.Vector3(); b.g.getWorldPosition(world);
      const target = wardrobe.worldToLocal(new THREE.Vector3(0, 1.3, cam.pos.z - (mobile ? 3.6 : 3.0)));
      const total = Math.max(800, ms); const fly = total * 0.42, shake = total * 0.33, open = total * 0.25;
      const s0 = b.g.scale.x;
      await tween(fly, (k) => { b.g.position.lerpVectors(start, target, k); b.g.position.y += Math.sin(k * Math.PI) * 0.25; b.g.rotation.y = k * Math.PI * 2; b.g.scale.setScalar(lerp(s0, 1.45, k)); });
      await tween(shake, (k, raw) => { const a = reduced ? 0 : (0.02 + raw * 0.06); b.g.rotation.z = Math.sin(raw * 60) * a; b.g.rotation.x = Math.cos(raw * 47) * a * 0.6; b.halo.material.opacity = 0.4 + raw * 0.6; b.halo.scale.setScalar(b.size * (3 + raw * 3)); }, null, (x) => x);
      b.g.rotation.z = 0; b.g.rotation.x = 0;
      // burst
      const wp = new THREE.Vector3(); b.lid.getWorldPosition(wp); burst.position.copy(wp);
      const p = pGeo.attributes.position.array;
      for (let k = 0; k < PN; k++) { p[k * 3] = wp.x; p[k * 3 + 1] = wp.y; p[k * 3 + 2] = wp.z; const a = Math.random() * Math.PI * 2; const sp = 0.6 + Math.random() * 2.2; pVel[k * 3] = Math.cos(a) * sp * 0.8; pVel[k * 3 + 1] = 1.5 + Math.random() * 2.4; pVel[k * 3 + 2] = Math.sin(a) * sp * 0.5; }
      pGeo.attributes.position.needsUpdate = true; particles.material.opacity = opts.calm ? 0.35 : 1;
      if (opts.onBurst) opts.onBurst();
      const ly = b.lid.position.y;
      await tween(open, (k) => { b.lid.position.y = ly + k * b.size * 2.2; b.lid.rotation.z = k * 1.1; b.lid.rotation.x = -k * 0.6; b.lid.position.x = k * b.size * 0.8; burst.intensity = Math.sin(k * Math.PI) * (opts.calm ? 8 : 26); }, null, easeOut);
      return true;
    },
    dispose() {
      alive = false; if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onMove); renderer.domElement.removeEventListener('click', onClick);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      envTex.dispose(); pmrem.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
  return api;
}
