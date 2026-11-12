/* ShowroomEngine: owns the renderer, scene, lights, the procedural build (with real progress reporting), the render loop,
 * adaptive resolution and disposal. React only mounts a canvas and talks to this class. */
import * as THREE from 'three';
import { TIERS, adaptScale, effectivePixelRatio, isSoftwareRenderer } from './quality';
import { PALETTE } from './palette';
import { SUN_DIR, buildEnvironment } from './sky';
import { stoneSet, woodSet, plasterSet, paverSet, grassSet, sandSet, leafSet, trunkSet, frondCanvas } from './textures';
import { createMaterials, glowTexture } from './materials';
import { disposeTree } from './geom';
import { LOGO_URL } from '../logo';
import { buildExterior } from '../scenes/exterior';
import { buildEntrance } from '../scenes/entrance';
import { buildHallShell } from '../scenes/main-hall/hall';
import { buildBays } from '../scenes/main-hall/bays';
import { layoutBays } from '../scenes/main-hall/departments';
import { buildProducts } from '../scenes/products';
import { ensureFonts } from '../scenes/main-hall/signs';

const nextFrame = () => new Promise((r) => { let done = false; const f = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(f); setTimeout(f, 40); });

export class ShowroomEngine {
  constructor(canvas, { tier = 'high', lang = 'en', progress, adaptive = true, aa = null, bloom = true } = {}) {
    this.aaOverride = aa; this.noBloom = !bloom;
    this.canvas = canvas; this.tierId = tier; this.tier = TIERS[tier] || TIERS.low; this.lang = lang; this.progress = progress; this.adaptive = adaptive;
    this.scale = 1; this.frames = 0; this.fpsAcc = 0; this.fpsT = 0; this.fps = 0; this.running = false; this.disposed = false;
    this.state = { doorOpen: 0, led: 0.55 }; this.pointLights = []; this.glowMats = []; this.onFrame = null; this.stats = { gpu: '' };
  }

  report(id, f) { if (this.progress) this.progress.report(id, f); }

  async init() {
    const { tier } = this;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.aaOverride == null ? tier.antialias : this.aaOverride, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer = renderer;
    try { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); this.stats.gpu = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; this.stats.software = isSoftwareRenderer(this.stats.gpu); } catch (e) { /* ignore */ }
    renderer.info.autoReset = false;      // draw calls / triangles are summed over every pass (scene + bloom) and reset once per frame
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = tier.id === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.setClearColor(PALETTE.skyHorizon, 1);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.25, 1500);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0034);

    // logo (the official PNG, never redrawn) + fonts for the canvas signs
    const logoTex = await this.loadLogo(); this.report('logo', 1);
    await ensureFonts(); this.report('fonts', 1);

    // procedural texture sets, one at a time so the loading bar moves for real
    const S = tier.texSize, sets = {};
    const jobs = [
      ['stone', () => stoneSet(S, 7)], ['oak', () => woodSet(S, 3, 0)], ['walnut', () => woodSet(Math.max(256, S >> 1), 8, 1)], ['plaster', () => plasterSet(Math.max(256, S >> 1), 5)],
      ['paver', () => paverSet(Math.max(256, S >> 1), 9)], ['grass', () => grassSet(Math.max(256, S >> 1), 21)], ['sand', () => sandSet(Math.max(128, S >> 2), 31)],
      ['leaf', () => leafSet(Math.max(128, S >> 2), 41)], ['trunk', () => trunkSet(Math.max(128, S >> 2), 51)], ['frond', () => frondCanvas(256, 512)],
    ];
    for (let i = 0; i < jobs.length; i++) { await nextFrame(); if (this.disposed) return; sets[jobs[i][0]] = jobs[i][1](); this.report('textures', (i + 1) / jobs.length); }

    // image-based lighting from the same sky, then materials
    await nextFrame();
    this.envMap = buildEnvironment(renderer, tier.clouds); this.report('environment', 1);
    const M = this.M = createMaterials(sets, tier, this.envMap);
    this.baseLed = { warm: M.led.color.clone(), cool: M.ledCool.color.clone() };
    const glowTex = this.glowTex = glowTexture();
    const ctx = { M, tier, logoTex, glowTex, lang: this.lang };

    await nextFrame(); this.exterior = buildExterior(ctx); this.scene.add(this.exterior.group); this.report('exterior', 0.6);
    this.entrance = buildEntrance(ctx); this.scene.add(this.entrance.group); this.report('exterior', 1);
    await nextFrame(); this.hall = buildHallShell(ctx); this.scene.add(this.hall.group); this.report('hall', 0.6);
    this.report('hall', 1); await nextFrame();
    // Phase 4: furnished departments (kitchens, wardrobes, doors) + the Ikhtarha stage; they build their own materials from the generated interior environment
    this.products = buildProducts({ renderer, hallM: M, tier, lang: this.lang, bays: layoutBays(), reduced: !!this.reduced });
    this.scene.add(this.products.group); this.products.lights.forEach((l) => this.scene.add(l)); this.report('products', 0.6);
    this.bays = buildBays({ ...ctx, products: this.products }); this.scene.add(this.bays.group); this.report('products', 1);
    this.glowMats = [...this.hall.glows]; this.glowBase = this.glowMats.map((m) => m.opacity);
    this.setupLights();
    this.applyState(this.state);

    // compile shaders up-front (async where the driver supports parallel compile) so the intro never hitches on first use
    await nextFrame(); this.setSize(this.canvas.clientWidth || 800, this.canvas.clientHeight || 600);
    this.report('compile', 0.2);
    try { if (renderer.compileAsync) await renderer.compileAsync(this.scene, this.camera); else renderer.compile(this.scene, this.camera); } catch (e) { /* ignore: first render compiles */ }
    this.report('compile', 1);
    // restrained bloom on the high tier only (lazy chunk); anything that goes wrong keeps the plain renderer
    if (tier.id === 'high' && !this.noBloom) {
      try { const { createBloom } = await import('./post'); this.post = await createBloom(renderer, this.scene, this.camera, { width: this.width, height: this.height, pixelRatio: effectivePixelRatio(this.tierId, window.devicePixelRatio, this.scale) }); } catch (e) { this.post = null; }
    }
    this.renderOnce(); this.report('firstFrame', 1);
  }

  loadLogo() {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(LOGO_URL, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 1; resolve(t); }, undefined, () => resolve(null));
    });
  }

  setupLights() {
    const { scene, tier } = this;
    const sun = new THREE.DirectionalLight(PALETTE.sun, 8.2);
    const target = new THREE.Object3D(); target.position.set(0, 0, -6); scene.add(target); sun.target = target;
    sun.position.copy(SUN_DIR).multiplyScalar(130).add(target.position);
    sun.castShadow = true; sun.shadow.mapSize.set(tier.shadowMap, tier.shadowMap);
    const c = sun.shadow.camera; c.left = -52; c.right = 52; c.top = 46; c.bottom = -46; c.near = 20; c.far = 300;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 2.5;
    scene.add(sun); this.sun = sun;
    this.hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.stoneMid, 0.55); scene.add(this.hemi);
    const spots = [[-8, 7.4, -8], [8, 7.4, -8], [0, 7.4, -18], [-8, 7.4, -28], [8, 7.4, -28], [0, 7.4, -4]].slice(0, tier.pointLights);
    this.pointLights = spots.map((p) => { const l = new THREE.PointLight(PALETTE.ledWarm, 130, 42, 2); l.position.set(...p); scene.add(l); l.userData.base = 130; return l; });
  }

  /** push the cinematic state (door opening, interior light level) into the scene */
  applyState(s) {
    this.state = { ...this.state, ...s };
    if (this.entrance) this.entrance.update(this.state);
    const k = this.state.led;
    if (this.M) { this.M.led.color.copy(this.baseLed.warm).multiplyScalar(k); this.M.ledCool.color.copy(this.baseLed.cool).multiplyScalar(0.4 + 0.6 * k); }
    this.glowMats.forEach((m, i) => { m.opacity = this.glowBase[i] * k; });
    this.pointLights.forEach((l) => { l.intensity = l.userData.base * k; });
    if (this.products) this.products.setLevel(k);
    if (this.hemi) this.hemi.intensity = 0.42 + 0.2 * k;
  }

  setPose(p, l, fov) {
    const c = this.camera; c.position.set(p[0], p[1], p[2]); c.lookAt(l[0], l[1], l[2]);
    if (fov) this.baseFov = fov;
    this.applyFov();
  }
  /** portrait screens: widen the vertical fov so the facade / hall still fits horizontally */
  applyFov() {
    const c = this.camera, base = this.baseFov || 50;
    const k = c.aspect < 1 ? Math.min(2.2, 1 / Math.pow(c.aspect, 0.8)) : 1;
    const f = Math.min(95, base * k);
    if (Math.abs(c.fov - f) > 1e-3) { c.fov = f; c.updateProjectionMatrix(); }
  }

  /** shift the rendered view by (x, y) pixels inside the canvas (used while a product panel covers part of the screen, so the product stays centred in what is left) */
  setViewShift(x = 0, y = 0) {
    const c = this.camera, w = this.width || 1, h = this.height || 1, key = x + ',' + y + ',' + w + ',' + h;
    if (this._shiftKey === key) return; this._shiftKey = key;
    if (!x && !y) { if (c.view && c.view.enabled) { c.clearViewOffset(); } return; }
    c.setViewOffset(w, h, x, y, w, h);
  }
  setLanguage(lang) { this.lang = lang; if (this.bays) this.bays.relabel(lang); if (this.products) this.products.setLanguage(lang); }

  setSize(w, h) {
    this.width = Math.max(2, w); this.height = Math.max(2, h);
    this.camera.aspect = this.width / this.height;
    // wide fov on portrait phones so the facade still fits
    this.camera.updateProjectionMatrix(); this.applyFov();
    this.applyPixelRatio();
  }
  applyPixelRatio() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(effectivePixelRatio(this.tierId, dpr, this.scale));
    this.renderer.setSize(this.width, this.height, false);
    if (this.post) this.post.setSize(this.width, this.height, effectivePixelRatio(this.tierId, dpr, this.scale));
  }

  renderOnce() { this.renderer.info.reset(); if (this.post) this.post.render(); else this.renderer.render(this.scene, this.camera); }

  start() {
    if (this.running) return; this.running = true; let last = performance.now();
    const loop = (now) => {
      if (!this.running) return; this.raf = requestAnimationFrame(loop);
      const dt = Math.min(this.maxDt || 0.1, (now - last) / 1000); last = now;
      if (this.onFrame) this.onFrame(dt, now);
      if (this.products) this.products.update(dt, this.camera);
      this.renderer.info.reset();
      if (this.post) this.post.render(); else this.renderer.render(this.scene, this.camera);
      this.measure(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; if (this.raf) cancelAnimationFrame(this.raf); }

  measure(dt) {
    this.frames++; this.fpsAcc += dt; this.fpsT += dt;
    if (this.fpsT >= 2) {
      this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
      if (this.adaptive && this.width) {
        const next = adaptScale({ scale: this.scale, fps: this.fps, min: 0.5, max: 1 });
        if (next !== this.scale) { this.scale = next; this.applyPixelRatio(); }
      }
    }
  }

  info() { const i = this.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, fps: Math.round(this.fps * 10) / 10, scale: this.scale, tier: this.tierId, gpu: this.stats.gpu }; }

  dispose() {
    this.disposed = true; this.stop();
    if (this.scene) disposeTree(this.scene);
    if (this.post) { try { this.post.dispose(); } catch (e) { /* ignore */ } }
    if (this.products) this.products.dispose();
    if (this.envMap) this.envMap.dispose();
    if (this.glowTex) this.glowTex.dispose();
    if (this.renderer) { this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { /* ignore */ } }
  }
}
