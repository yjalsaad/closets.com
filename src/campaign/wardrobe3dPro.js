/* [IKHTARHA 2026-11-08 · PRO] اختارها — cinematic 3D wardrobe (sample engine; same API as wardrobe3d.js).
 * createWardrobe(host, opts) → { count, intro(), select(i), reveal(i, ms), setPreview(on), dispose() }
 * Rendering: bloom (LEDs, halos, burst glow), volumetric light beam with drifting dust, warm back wall with slats, soft contact
 *   shadow, emissive LED strips that switch on row by row, physical materials (desktop) / standard materials (phones).
 * Motion: spring physics everywhere (doors overshoot and settle, boxes pop in, hover lifts and tilts toward the pointer),
 *   crane-and-dolly camera path with lens zoom, pointer parallax, key light that follows the chosen box, anticipation squash,
 *   arced flight with spin, build-up tremble with rotating light rays, lid launch, flash, 3D ribbon confetti + sparkles, camera shake.
 * Reduced motion: no camera flight, shake, confetti or tremble; short fades only. The reward is never known here. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const THEMES = {
  walnut:   { wood: ['#5b3a26', '#3b2416'], inner: '#e9dccb', accent: '#3FB6B0', rim: '#4A2C82', handle: '#c9a35a', bg: '#1A0D33', wall: '#2A1650' },
  oak:      { wood: ['#b88a58', '#8a6234'], inner: '#f1e6d6', accent: '#3FB6B0', rim: '#4A2C82', handle: '#c9a35a', bg: '#1A0D33', wall: '#2A1650' },
  ivory:    { wood: ['#efe8dc', '#d9cfbf'], inner: '#fbf7f1', accent: '#3FB6B0', rim: '#4A2C82', handle: '#b8924e', bg: '#1A0D33', wall: '#2A1650', lacquer: true },
  charcoal: { wood: ['#3a3634', '#262322'], inner: '#d8cdc0', accent: '#3FB6B0', rim: '#4A2C82', handle: '#b87333', bg: '#1A0D33', wall: '#2A1650' },
};
const BOX_PALETTE = [   // [2026-11-09 brand kit] purple · turquoise · white gift boxes (scene-gift-boxes.svg)
  { body: '#3FB6B0', ribbon: '#4A2C82', rough: 0.45 }, { body: '#7B5BB5', ribbon: '#3FB6B0', rough: 0.6 }, { body: '#FFFFFF', ribbon: '#3FB6B0', rough: 0.5 },
  { body: '#4A2C82', ribbon: '#9FDDD8', rough: 0.4 }, { body: '#23807C', ribbon: '#FFFFFF', rough: 0.5 }, { body: '#9A86C4', ribbon: '#4A2C82', rough: 0.45 },
];
const HEX = /^#[0-9A-Fa-f]{6}$/;
function brandPalette(b) {
  if (!b || !HEX.test(b.primary || '') || !HEX.test(b.accent || '')) return BOX_PALETTE;
  const sand = HEX.test(b.sand || '') ? b.sand : '#f3ece2'; const taupe = HEX.test(b.taupe || '') ? b.taupe : '#b8924e';
  return [
    { body: b.accent, ribbon: sand, rough: 0.42 }, { body: b.primary, ribbon: '#3FB6B0', rough: 0.68 }, { body: sand, ribbon: b.accent, rough: 0.5 },
    { body: taupe, ribbon: b.primary, rough: 0.35, metal: 0.3 }, { body: b.primary, ribbon: sand, rough: 0.6 }, { body: b.accent, ribbon: b.primary, rough: 0.4 },
  ];
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** critically-tunable spring (semi-implicit Euler, sub-stepped) */
class Spring {
  constructor(v = 0, k = 140, c = 16) { this.x = v; this.v = 0; this.t = v; this.k = k; this.c = c; }
  step(dt) { const h = dt / 2; for (let i = 0; i < 2; i++) { const f = -this.k * (this.x - this.t) - this.c * this.v; this.v += f * h; this.x += this.v * h; } return this.x; }
  set(v) { this.x = v; this.t = v; this.v = 0; }
}

function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
function woodTexture(c1, c2, seed = 7, lacquer = false) {
  const t = canvasTex(512, 1024, (g, W, H) => {
    g.fillStyle = c1; g.fillRect(0, 0, W, H);
    if (lacquer) { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.06)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return; }
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      const x = rnd() * W; g.strokeStyle = c2; g.globalAlpha = 0.04 + rnd() * 0.16; g.lineWidth = 0.6 + rnd() * 2.6; g.beginPath();
      const amp = 2 + rnd() * 8; const f = 0.003 + rnd() * 0.01; const ph = rnd() * 6;
      for (let y = 0; y <= H; y += 8) { const xx = x + Math.sin(y * f + ph) * amp; if (y === 0) g.moveTo(xx, y); else g.lineTo(xx, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const glowTexture = (color) => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, color); gr.addColorStop(0.3, color + 'aa'); gr.addColorStop(1, color + '00'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const raysTexture = () => canvasTex(512, 512, (g) => {
  g.translate(256, 256); const n = 22;
  for (let i = 0; i < n; i++) {
    g.rotate((Math.PI * 2) / n); const w = 0.05 + (i % 3) * 0.025; const gr = g.createLinearGradient(0, 0, 0, -256);
    gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.tan(w) * 256, -256); g.lineTo(-Math.tan(w) * 256, -256); g.closePath(); g.fill();
  }
});
const shadowTexture = () => canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}

export function createWardrobe(host, opts = {}) {
  const base0 = THEMES[opts.theme] || THEMES.walnut; const br = opts.brand || {};
  const theme = { ...base0, accent: HEX.test(br.accent || '') ? br.accent : base0.accent, rim: HEX.test(br.primary || '') ? br.primary : base0.rim };
  const PAL = brandPalette(br);
  const n = Math.max(3, Math.min(16, opts.boxes || 9));
  const reduced = !!opts.reduced;
  const mobile = Math.min(host.clientWidth, host.clientHeight) < 560;

  // ── renderer + post ──
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr); renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block'; renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); scene.background = new THREE.Color(theme.bg); scene.fog = new THREE.Fog(theme.bg, 8, 17);
  const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = envTex; scene.environmentIntensity = 0.3;
  const baseFov = mobile ? 46 : 36;
  const camera = new THREE.PerspectiveCamera(baseFov + 6, host.clientWidth / host.clientHeight, 0.05, 60);

  const composer = new EffectComposer(renderer); composer.setPixelRatio(mobile ? 1 : dpr); composer.setSize(host.clientWidth, host.clientHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(host.clientWidth, host.clientHeight), mobile ? 0.38 : 0.5, 0.42, 1.0);   // only true highlights glow (LEDs, halos, burst)
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const bloomBase = bloom.strength;

  // ── lights ──
  const hemi = new THREE.HemisphereLight('#ffe9d6', '#1A0D33', 0.32); scene.add(hemi);
  const key = new THREE.SpotLight('#fff1e2', 20, 16, Math.PI / 7.5, 0.6, 1.6); key.position.set(-1.4, 5.6, 4.0); key.castShadow = !mobile; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004;
  key.target.position.set(0, 1.2, 0); scene.add(key, key.target);
  const accent = new THREE.PointLight(theme.accent, 7, 9, 2); accent.position.set(-3.2, 1.6, 1.4); scene.add(accent);
  const rim = new THREE.PointLight(theme.rim, 10, 9, 2); rim.position.set(3.0, 2.8, -1.0); scene.add(rim);
  const burst = new THREE.PointLight('#ffd8a6', 0, 7, 2); scene.add(burst);

  // ── room: floor, contact shadow, back wall with slats, beam + dust ──
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshStandardMaterial({ color: '#1c1213', roughness: 0.28, metalness: 0.12 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: glowTexture(theme.accent), transparent: true, opacity: 0.16, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.004, 0.7); scene.add(pool);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.4), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.85, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(0, 0.006, 0.02); scene.add(contact);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.9 }));
  wall.position.set(0, 3.2, -1.5); wall.receiveShadow = true; scene.add(wall);
  const slatMat = new THREE.MeshStandardMaterial({ color: '#4a2f22', roughness: 0.55 });
  for (let i = 0; i < (mobile ? 10 : 16); i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 6, 0.05), slatMat); s.position.set(-6.2 + i * 0.12, 3, -1.45); scene.add(s); }
  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: glowTexture(theme.accent), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
  wallGlow.position.set(0, 2.0, -1.44); scene.add(wallGlow);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffd9b0') }, uStrength: { value: 0.0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.6) * (0.55 + 0.45 * sin(vUv.x * 6.2831)); gl_FragColor = vec4(uColor, a * uStrength); }',
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5.4, 48, 1, true), beamMat);
  beam.position.set(-0.7, 3.0, 2.0); beam.lookAt(new THREE.Vector3(0, 1.0, 0)); beam.rotateX(-Math.PI / 2); scene.add(beam);
  const DN = mobile ? 160 : 360; const dGeo = new THREE.BufferGeometry(); const dPos = new Float32Array(DN * 3); const dSeed = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dPos[i * 3] = (Math.random() - 0.5) * 4.2; dPos[i * 3 + 1] = Math.random() * 3.6; dPos[i * 3 + 2] = Math.random() * 3.2 - 0.2; dSeed[i] = Math.random() * 100; }
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: glowTexture('#ffe3c2'), size: mobile ? 0.03 : 0.022, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  // ── wardrobe ──
  const W = 2.4, H = 2.62, D = 0.66, T = 0.045, base = 0.09;
  const woodTex = woodTexture(theme.wood[0], theme.wood[1], 11, theme.lacquer);
  const wood = mobile ? new THREE.MeshStandardMaterial({ map: woodTex, roughness: theme.lacquer ? 0.25 : 0.5 })
    : new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: theme.lacquer ? 0.2 : 0.46, clearcoat: theme.lacquer ? 0.9 : 0.4, clearcoatRoughness: 0.3 });
  const innerTone = new THREE.Color(theme.inner).multiplyScalar(0.72);   // interior a touch darker so lit boxes read against it
  const innerMat = new THREE.MeshStandardMaterial({ color: innerTone, roughness: 0.8 });
  const backMat = new THREE.MeshStandardMaterial({ color: innerTone.clone().multiplyScalar(0.85), roughness: 0.85, emissive: new THREE.Color('#ffb070'), emissiveIntensity: 0 });
  const gold = new THREE.MeshStandardMaterial({ color: theme.handle, metalness: 1, roughness: 0.2 });
  const wardrobe = new THREE.Group(); scene.add(wardrobe);
  const panel = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = !mobile; m.receiveShadow = true; wardrobe.add(m); return m; };
  panel(T, H, D, wood, -W / 2 + T / 2, base + H / 2, 0); panel(T, H, D, wood, W / 2 - T / 2, base + H / 2, 0);
  panel(W, T, D, wood, 0, base + H - T / 2, 0); panel(W, T, D, wood, 0, base + T / 2, 0); panel(W - 2 * T, H - 2 * T, 0.02, backMat, 0, base + H / 2, -D / 2 + 0.01);
  panel(W + 0.08, 0.07, D + 0.08, wood, 0, base + H + 0.035, 0);
  panel(W - 0.06, base, D - 0.06, new THREE.MeshStandardMaterial({ color: '#120b0b', roughness: 0.6 }), 0, base / 2, 0);
  const rows = n <= 4 ? 1 : n <= 9 ? 3 : 4; const perRow = Math.ceil(n / rows);
  const innerTop = base + H - T, innerBot = base + T; const rowH = (innerTop - innerBot) / rows;
  const leds = []; const shelfLights = [];
  for (let r = 1; r <= rows; r++) {
    const y = innerBot + rowH * r;
    if (r < rows) panel(W - 2 * T, T * 0.7, D - 0.05, innerMat, 0, y, -0.01);
    const m = new THREE.MeshStandardMaterial({ color: '#2a1a12', emissive: new THREE.Color('#ffc58a'), emissiveIntensity: 0 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T - 0.04, 0.014, 0.014), m); led.position.set(0, y - T * 0.5 - 0.012, D / 2 - 0.07); wardrobe.add(led); leds.push(m);
  }
  for (let r = 0; r < Math.min(rows, mobile ? 1 : 3); r++) { const l = new THREE.PointLight('#ffb978', 0, 2.3, 2); l.position.set(0, innerBot + rowH * (r + 1) - 0.12, 0.15); wardrobe.add(l); shelfLights.push(l); }

  const doorW = W / 2 - 0.004, doorH = H - 0.01;
  const makeDoor = (side) => {
    const hinge = new THREE.Group(); hinge.position.set(side * W / 2, base + H / 2, D / 2 + 0.012);
    const leaf = new THREE.Group(); leaf.position.x = -side * doorW / 2; hinge.add(leaf);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.024), wood); slab.castShadow = !mobile; slab.receiveShadow = true; leaf.add(slab);
    const fr = 0.08;
    [[0, doorH / 2 - fr / 2, doorW, fr], [0, -doorH / 2 + fr / 2, doorW, fr], [-doorW / 2 + fr / 2, 0, fr, doorH], [doorW / 2 - fr / 2, 0, fr, doorH], [0, -0.08, doorW, fr * 0.8]].forEach(([x, y, w, h]) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), wood); s.position.set(x, y, 0.016); leaf.add(s);
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 16), gold); handle.position.set(side * (doorW / 2 - 0.11), 0.05, 0.05); leaf.add(handle);
    [-0.29, 0.29].forEach((dy) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 12), gold); p.rotation.x = Math.PI / 2; p.position.set(side * (doorW / 2 - 0.11), 0.05 + dy, 0.03); leaf.add(p); });
    wardrobe.add(hinge); return hinge;
  };
  const doorL = makeDoor(-1); const doorR = makeDoor(1);
  const doorSpL = new Spring(0, 60, 7.5); const doorSpR = new Spring(0, 60, 7.5);   // under-damped → overshoot then settle

  // ── boxes ──
  const boxes = [];
  const slotW = (W - 2 * T - 0.08) / perRow; const size = Math.min(0.34, slotW * 0.72, rowH * 0.62);
  const ribbonMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.2 });
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow); const inRow = Math.min(perRow, n - r * perRow); const c = i - r * perRow;
    const x = (c - (inRow - 1) / 2) * slotW; const y = innerTop - rowH * (r + 1) + T * 0.4 + size / 2 + 0.005;
    const pal = PAL[(i * 5 + r) % PAL.length];
    const bodyMat = mobile ? new THREE.MeshStandardMaterial({ color: pal.body, roughness: pal.rough, metalness: pal.metal || 0 })
      : new THREE.MeshPhysicalMaterial({ color: pal.body, roughness: pal.rough, metalness: pal.metal || 0, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: pal.rough > 0.6 ? 0.7 : 0, sheenColor: new THREE.Color('#ffd9c0') });
    const g = new THREE.Group(); g.position.set(x, y, 0.06);
    g.userData = { index: i, home: new THREE.Vector3(x, y, 0.06), phase: i * 1.37, color: new THREE.Color(pal.body),
      lift: new Spring(0, 180, 16), push: new Spring(0, 160, 15), scale: new Spring(0, 220, 13), tiltX: new Spring(0, 120, 12), tiltZ: new Spring(0, 120, 12), dim: new Spring(1, 90, 14) };
    const body = new THREE.Mesh(new RoundedBoxGeometry(size, size * 0.86, size, 4, size * 0.07), bodyMat); body.position.y = -size * 0.07; body.castShadow = !mobile; body.receiveShadow = true;
    const lid = new THREE.Group(); lid.position.y = size * 0.36;
    const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(size * 1.06, size * 0.2, size * 1.06, 4, size * 0.05), bodyMat); lidMesh.castShadow = !mobile; lid.add(lidMesh);
    const rm = ribbonMat(pal.ribbon);
    const rb1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.87, size * 1.005), rm); rb1.position.y = -size * 0.07;
    const rb2 = new THREE.Mesh(new THREE.BoxGeometry(size * 1.005, size * 0.87, size * 0.16), rm); rb2.position.y = -size * 0.07;
    lid.add(new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.205, size * 1.07), rm), new THREE.Mesh(new THREE.BoxGeometry(size * 1.07, size * 0.205, size * 0.16), rm));
    const bowGeo = new THREE.TorusGeometry(size * 0.15, size * 0.04, 12, 28);
    [-1, 1].forEach((s2) => { const b = new THREE.Mesh(bowGeo, rm); b.position.set(s2 * size * 0.13, size * 0.17, 0); b.rotation.set(Math.PI / 2.4, 0, s2 * 0.6); lid.add(b); });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.06, 16, 12), rm); knot.position.y = size * 0.14; lid.add(knot);
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.86, size * 0.86), new THREE.MeshBasicMaterial({ map: glowTexture('#9FDDD8'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    inside.rotation.x = -Math.PI / 2; inside.position.y = size * 0.36; g.add(inside);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.78, size * 0.022, 8, 64), new THREE.MeshBasicMaterial({ color: '#9FDDD8', transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = -size * 0.5; g.add(ring);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#9FDDD8'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.set(size * 3, size * 3, 1); g.add(halo);
    g.add(body, rb1, rb2, lid); g.scale.setScalar(0.0001); wardrobe.add(g);
    boxes.push({ g, body, lid, ring, halo, inside, bodyMat, size });
  }

  // ── reveal FX: rays, sparkles, ribbon confetti, light column ──
  const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: raysTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  rays.scale.set(3.2, 3.2, 1); scene.add(rays);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.2, 32, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * uA; gl_FragColor = vec4(1.0, 0.82, 0.55, a * 0.55); }',
  }));
  column.visible = false; scene.add(column);
  const PN = mobile ? 180 : 360; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(PN * 3); const pVel = new Float32Array(PN * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const sparks = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: glowTexture('#E2F5F3'), size: mobile ? 0.07 : 0.055, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(sparks);
  const CN = reduced ? 0 : mobile ? 70 : 150;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.11), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.45, metalness: 0.35 }), Math.max(1, CN));
  confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage); confetti.frustumCulled = false; confetti.visible = false; scene.add(confetti);
  const cState = Array.from({ length: CN }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), f: Math.random() * 6 }));
  const confCols = [theme.accent, theme.rim, '#9FDDD8', '#FFFFFF', '#7B5BB5'].map((c) => new THREE.Color(c));
  for (let i = 0; i < CN; i++) confetti.setColorAt(i, confCols[i % confCols.length]);
  const dummy = new THREE.Object3D();

  // ── camera rig ──
  const camFar = { pos: new THREE.Vector3(0, 1.8, mobile ? 9.5 : 7.4), look: new THREE.Vector3(0, 1.35, 0) };
  const camIn = { pos: new THREE.Vector3(0, 1.42, mobile ? 7.4 : 5.6), look: new THREE.Vector3(0, 1.26, 0) };
  const cam = { pos: camFar.pos.clone(), look: camFar.look.clone(), fov: baseFov + 6 };
  let shake = 0; const parallax = new THREE.Vector2(); const parT = new THREE.Vector2();
  const tweens = [];
  const tween = (ms, fn, e = ease) => new Promise((res) => { tweens.push({ t0: performance.now(), ms: Math.max(1, reduced ? Math.min(ms, 250) : ms), fn, done: res, e }); });
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 80) : ms));

  let preview = !!opts.preview; const side = opts.side || 0;
  if (preview && side && !mobile) { wardrobe.position.x = side * 1.05; cam.look.x = side * 0.35; cam.pos.x = side * 0.2; }
  let hovered = -1; let selected = -1; let locked = false; let revealing = -1; let alive = true; let opened = false; let ledOn = 0; let raysA = 0; let colA = 0;
  const ledTarget = new Array(rows).fill(0);
  const pointer = new THREE.Vector2(); const ray = new THREE.Raycaster(); const keyAim = new THREE.Vector3(0, 1.2, 0);

  const pickBox = (ev) => {
    const r = renderer.domElement.getBoundingClientRect(); pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pointer, camera); const hit = ray.intersectObjects(boxes.map((b) => b.g), true)[0];
    if (!hit) return -1; let o = hit.object; while (o && o.userData.index === undefined) o = o.parent; return o ? o.userData.index : -1;
  };
  const onMove = (ev) => {
    const r = renderer.domElement.getBoundingClientRect(); parT.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    if (preview || locked || !opened) { renderer.domElement.style.cursor = 'default'; return; }
    hovered = pickBox(ev); renderer.domElement.style.cursor = hovered >= 0 ? 'pointer' : 'default'; if (opts.onHover) opts.onHover(hovered);
  };
  const onClick = (ev) => { if (preview || locked || !opened) return; const i = pickBox(ev); if (i >= 0 && opts.onPick) opts.onPick(i); };
  renderer.domElement.addEventListener('pointermove', onMove); renderer.domElement.addEventListener('click', onClick);
  const onResize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null; if (ro) ro.observe(host); else window.addEventListener('resize', onResize);

  // ── frame loop ──
  let last = performance.now(); const tmp = new THREE.Vector3();
  const loop = (now) => {
    if (!alive) return; requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; const k = clamp01((now - tw.t0) / tw.ms); tw.fn(tw.e(k), k); if (k >= 1) { tweens.splice(i, 1); tw.done(); } }

    // wardrobe idle + doors
    if (preview) { wardrobe.rotation.y = Math.sin(t * 0.25) * 0.24; accent.intensity = 6 + Math.sin(t * 1.2) * 1.6; } else wardrobe.rotation.y = lerp(wardrobe.rotation.y, 0, 0.06);
    doorL.rotation.y = -doorSpL.step(dt) * 1.95; doorR.rotation.y = doorSpR.step(dt) * 1.95;
    for (let r = 0; r < rows; r++) { const m = leds[r]; m.emissiveIntensity = lerp(m.emissiveIntensity, ledTarget[r] * (1.8 + (ledTarget[r] && Math.random() < 0.02 ? -1.0 : 0)), 0.2); }
    shelfLights.forEach((l, r) => { l.intensity = lerp(l.intensity, ledTarget[Math.min(r, rows - 1)] * 1.1, 0.12); });
    backMat.emissiveIntensity = lerp(backMat.emissiveIntensity, ledOn * 0.025, 0.05);
    beamMat.uniforms.uStrength.value = lerp(beamMat.uniforms.uStrength.value, (revealing >= 0 ? 0.05 : 0.12) * (preview ? 0.8 : 1), 0.04);
    dust.material.opacity = lerp(dust.material.opacity, reduced ? 0.25 : 0.55, 0.02);
    if (!reduced) { const p = dGeo.attributes.position.array; for (let i = 0; i < DN; i++) { p[i * 3] += Math.sin(t * 0.3 + dSeed[i]) * 0.0009; p[i * 3 + 1] += 0.0012 + Math.sin(t * 0.5 + dSeed[i] * 2) * 0.0006; if (p[i * 3 + 1] > 3.6) p[i * 3 + 1] = 0; } dGeo.attributes.position.needsUpdate = true; }

    // key light follows the chosen box
    if (selected >= 0 && boxes[selected]) { boxes[selected].g.getWorldPosition(tmp); keyAim.lerp(tmp, 0.08); } else keyAim.lerp(new THREE.Vector3(0, 1.2, 0), 0.05);
    key.target.position.copy(keyAim);

    boxes.forEach((b, i) => {
      const u = b.g.userData; if (revealing === i) return;
      const isSel = i === selected; const isHov = i === hovered && !locked;
      u.lift.t = isHov ? 1 : 0; u.push.t = isSel ? 1 : 0; u.dim.t = selected >= 0 && !isSel ? 0.45 : 1;
      if (isHov && !reduced) { u.tiltX.t = -parT.y * 0.18; u.tiltZ.t = -parT.x * 0.18; } else { u.tiltX.t = 0; u.tiltZ.t = 0; }
      const lift = u.lift.step(dt), push = u.push.step(dt), sc = u.scale.step(dt), dim = u.dim.step(dt), tx = u.tiltX.step(dt), tz = u.tiltZ.step(dt);
      const bob = reduced ? 0 : Math.sin(t * 1.6 + u.phase) * 0.01 * ledOn;
      b.g.position.set(u.home.x, u.home.y + bob + lift * 0.035 + push * 0.06, u.home.z + push * 0.24 + lift * 0.05);
      b.g.rotation.set(tx, (reduced ? 0 : Math.sin(t * 0.7 + u.phase) * 0.06 * ledOn) + push * Math.sin(t * 2.2) * 0.1, tz);
      b.g.scale.setScalar(Math.max(0.0001, sc * (1 + lift * 0.07 + push * 0.12)));
      b.ring.material.opacity = push * (0.65 + Math.sin(t * 4) * 0.25); b.ring.rotation.z = t * 0.9; b.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.04 * push);
      b.halo.material.opacity = push * 0.6 + lift * 0.22;
      b.bodyMat.emissive.set(theme.accent); b.bodyMat.emissiveIntensity = lift * 0.08 + push * 0.16;
      b.bodyMat.color.copy(u.color).multiplyScalar(dim);
    });

    // reveal FX
    rays.material.opacity = lerp(rays.material.opacity, raysA, 0.12); rays.material.rotation += dt * 0.35;
    column.material.uniforms.uA.value = lerp(column.material.uniforms.uA.value, colA, 0.06);
    if (sparks.material.opacity > 0) {
      const p = pGeo.attributes.position.array;
      for (let i = 0; i < PN; i++) { pVel[i * 3 + 1] -= 1.4 * dt; pVel[i * 3] *= 0.992; pVel[i * 3 + 2] *= 0.992; p[i * 3] += pVel[i * 3] * dt; p[i * 3 + 1] += pVel[i * 3 + 1] * dt; p[i * 3 + 2] += pVel[i * 3 + 2] * dt; }
      pGeo.attributes.position.needsUpdate = true; sparks.material.opacity = Math.max(0, sparks.material.opacity - dt * 0.3);
    }
    if (confetti.visible) {
      for (let i = 0; i < CN; i++) {
        const s = cState[i]; s.v.y -= 2.2 * dt; s.v.multiplyScalar(0.985); s.p.addScaledVector(s.v, dt);
        s.p.x += Math.sin(t * 3 + s.f) * 0.004; s.r.x += s.w.x * dt; s.r.y += s.w.y * dt; s.r.z += s.w.z * dt;
        dummy.position.copy(s.p); dummy.rotation.copy(s.r); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
      }
      confetti.instanceMatrix.needsUpdate = true;
    }

    // camera: path + parallax + shake + lens
    if (!reduced && !mobile) parallax.lerp(parT, 0.04);
    shake *= 0.9;
    camera.position.set(cam.pos.x + parallax.x * 0.18 + (Math.random() - 0.5) * shake, cam.pos.y + parallax.y * 0.1 + (Math.random() - 0.5) * shake, cam.pos.z);
    camera.lookAt(cam.look);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = lerp(camera.fov, cam.fov, 0.08); camera.updateProjectionMatrix(); }
    bloom.strength = lerp(bloom.strength, bloomBase + burst.intensity * 0.02, 0.2);
    composer.render(dt);
  };

  // preview: boxes already inside, lights low; play mode waits for intro()
  boxes.forEach((b) => { b.g.userData.scale.set(preview ? 1 : 0.0001); });
  if (preview) { ledTarget.fill(0.6); ledOn = 0.6; }
  requestAnimationFrame(loop);

  const api = {
    get count() { return n; },
    setPreview(on) { preview = !!on; },
    /** crane down + dolly in with a lens zoom → handles jiggle → doors swing open with overshoot → LEDs switch on row by row → boxes pop in */
    async intro() {
      preview = false; const fromX = wardrobe.position.x;
      const curve = new THREE.CatmullRomCurve3([cam.pos.clone(), new THREE.Vector3(mobile ? 0.6 : 1.2, 2.5, (mobile ? 8.9 : 6.9)), new THREE.Vector3(0.25, 1.62, mobile ? 8.0 : 6.3), camIn.pos.clone().add(new THREE.Vector3(0, 0.08, 0.5))]);
      const l0 = cam.look.clone();
      const camMove = tween(2600, (k) => { cam.pos.copy(curve.getPoint(k)); cam.look.lerpVectors(l0, camIn.look, k); cam.fov = lerp(baseFov + 6, baseFov, k); wardrobe.position.x = lerp(fromX, 0, k); });
      await wait(900);
      if (!reduced) { doorSpL.t = -0.04; doorSpR.t = -0.04; await wait(220); }   // anticipation: a tiny pull before opening
      doorSpL.t = 1; await wait(reduced ? 0 : 140); doorSpR.t = 1;
      for (let r = 0; r < rows; r++) { await wait(170); ledTarget[r] = 1; }
      ledOn = 1;
      const order = boxes.map((b, i) => i).sort((a, b) => Math.abs(boxes[a].g.userData.home.x) - Math.abs(boxes[b].g.userData.home.x) || boxes[b].g.userData.home.y - boxes[a].g.userData.home.y);
      order.forEach((i, k) => { setTimeout(() => { boxes[i].g.userData.scale.t = 1; }, reduced ? 0 : k * 60); });
      await camMove;
      const p1 = cam.pos.clone(); await tween(700, (k) => { cam.pos.lerpVectors(p1, camIn.pos, k); }, easeOut);
      opened = true;
    },
    select(i) { if (locked || i < 0 || i >= n) return; selected = i; if (!reduced) shake = 0.004; },
    /** anticipation squash → arced flight with spin → build-up (tremble, rays, glow) → lid launch, flash, confetti, sparkles.
     *  Resolves when the lid is off (the moment the reward should appear). */
    async reveal(i, ms = 3000) {
      if (locked) return false; const b = boxes[i]; if (!b) return false;
      locked = true; selected = i; hovered = -1; revealing = i; opened = true;
      const total = Math.max(1200, ms); const tLift = total * 0.12, tFly = total * 0.3, tBuild = total * 0.33, tPop = total * 0.25;
      const start = b.g.position.clone(); const s0 = b.g.scale.x;
      const target = wardrobe.worldToLocal(new THREE.Vector3(0, 1.32, camIn.pos.z - (mobile ? 3.5 : 2.9)));
      const ctrl = start.clone().lerp(target, 0.5).add(new THREE.Vector3(0, 0.75, 0.2));
      boxes.forEach((o, j) => { if (j !== i) o.g.userData.dim.t = 0.3; });
      // 1) anticipation: dip + squash
      await tween(tLift, (k) => { const sq = Math.sin(k * Math.PI); b.g.scale.set(s0 * (1 + sq * 0.08), s0 * (1 - sq * 0.12), s0 * (1 + sq * 0.08)); b.g.position.y = start.y - sq * 0.03; });
      // 2) flight on a curve with 1.5 turns, lights shift, lens tightens
      const camP0 = cam.pos.clone(); const camL0 = cam.look.clone();
      await tween(tFly, (k) => {
        const a = 1 - k; b.g.position.set(a * a * start.x + 2 * a * k * ctrl.x + k * k * target.x, a * a * start.y + 2 * a * k * ctrl.y + k * k * target.y, a * a * start.z + 2 * a * k * ctrl.z + k * k * target.z);
        b.g.rotation.set(Math.sin(k * Math.PI) * 0.25, k * Math.PI * 3, 0); b.g.scale.setScalar(lerp(s0, 1.5, easeOutBack(k)));
        cam.pos.lerpVectors(camP0, camP0.clone().add(new THREE.Vector3(0, -0.04, -0.35)), k); cam.look.lerpVectors(camL0, new THREE.Vector3(0, 1.32, 0), k); cam.fov = lerp(baseFov, baseFov - 3, k);
        key.intensity = lerp(20, 12, k); accent.intensity = lerp(7, 12, k); hemi.intensity = lerp(0.32, 0.2, k);
      });
      b.g.rotation.set(0, 0, 0);
      // 3) build-up: tremble grows, halo + rays fade in, light pulses
      const wp = new THREE.Vector3(); b.g.getWorldPosition(wp); rays.position.copy(wp).add(new THREE.Vector3(0, 0.05, -0.1)); raysA = reduced ? 0.25 : 0.55;
      burst.position.copy(wp).add(new THREE.Vector3(0, 0.25, 0.25));
      await tween(tBuild, (k, raw) => {
        const a = reduced ? 0 : 0.015 + raw * raw * 0.09;
        b.g.rotation.z = Math.sin(raw * 70) * a; b.g.rotation.x = Math.cos(raw * 53) * a * 0.6; b.g.position.y = target.y + Math.abs(Math.sin(raw * 35)) * a * 0.3;
        b.halo.material.opacity = 0.35 + raw * 0.65; b.halo.scale.setScalar(b.size * (3 + raw * 4));
        burst.intensity = (0.3 + 0.7 * raw) * (4 + Math.sin(raw * 40) * 3); b.bodyMat.emissiveIntensity = 0.1 + raw * 0.5;
        b.lid.position.y = b.size * 0.36 + (reduced ? 0 : Math.max(0, Math.sin(raw * 90)) * raw * b.size * 0.06);
        if (!reduced) shake = raw * 0.006;
      }, (x) => x);
      b.g.rotation.set(0, 0, 0); b.g.position.y = target.y;
      // 4) pop
      if (!reduced) shake = 0.05;
      b.lid.getWorldPosition(wp);
      const p = pGeo.attributes.position.array;
      for (let k = 0; k < PN; k++) { p[k * 3] = wp.x; p[k * 3 + 1] = wp.y; p[k * 3 + 2] = wp.z; const ang = Math.random() * Math.PI * 2; const sp = 0.4 + Math.random() * 2.4; pVel[k * 3] = Math.cos(ang) * sp * 0.9; pVel[k * 3 + 1] = 1.2 + Math.random() * 3.0; pVel[k * 3 + 2] = Math.sin(ang) * sp * 0.6 + 0.4; }
      pGeo.attributes.position.needsUpdate = true; sparks.material.opacity = opts.calm ? 0.4 : 1;
      if (CN && !opts.calm) {
        confetti.visible = true;
        cState.forEach((s) => { s.p.copy(wp); const ang = Math.random() * Math.PI * 2; const sp = 0.6 + Math.random() * 2.2; s.v.set(Math.cos(ang) * sp, 2.4 + Math.random() * 2.6, Math.sin(ang) * sp * 0.5 + 0.6); s.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); s.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14); });
      }
      column.position.copy(wp).add(new THREE.Vector3(0, 1.5, 0)); column.visible = true; colA = 1; raysA = reduced ? 0.3 : 0.9;
      b.inside.material.opacity = 1;
      if (opts.onBurst) opts.onBurst();
      const ly = b.lid.position.y; const lx = b.lid.position.x;
      await tween(tPop, (k) => {
        b.lid.position.y = ly + easeOut(k) * b.size * 2.6 - k * k * b.size * 0.6; b.lid.position.x = lx + k * b.size * 1.1;
        b.lid.rotation.set(-k * 0.9, k * 1.4, k * 1.6);
        burst.intensity = (opts.calm ? 8 : 24) * Math.max(0, 1 - k) + 3; b.halo.material.opacity = 1 - k * 0.3;
        b.g.scale.setScalar(1.5 + Math.sin(k * Math.PI) * 0.06);
      }, (x) => x);
      key.intensity = 16; tween(1400, (k) => { raysA = lerp(0.9, 0.45, k); }, easeOut);
      return true;
    },
    dispose() {
      alive = false; if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onMove); renderer.domElement.removeEventListener('click', onClick);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      composer.dispose(); envTex.dispose(); pmrem.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
  return api;
}
