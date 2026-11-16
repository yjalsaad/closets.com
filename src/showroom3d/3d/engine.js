/* ShowroomEngine: owns the renderer, scene, lights, the procedural build (with real progress reporting), the render loop,
 * adaptive resolution and disposal. React only mounts a canvas and talks to this class. */
import * as THREE from 'three';
import { TIERS, adaptQuality, minScale, effectivePixelRatio, isSoftwareRenderer, SHED_MAX } from './quality';
import { PALETTE } from './palette';
import { SUN_DIR, buildEnvironment } from './sky';
import { tileSet } from './pbr';
import { stoneSet, woodSet, plasterSet, paverSet, grassSet, sandSet, leafSet, trunkSet, frondCanvas } from './textures';
import { createMaterials, glowTexture } from './materials';
import { disposeTree } from './geom';
import { FloorMirror } from './mirror';
import { StaffManager } from '../staff/staffScene';
import { VisitorAvatar } from '../characters/visitorAvatar';
import { sunScale, gradeFor, mixGrade } from './lighting';
import { LOGO_URL } from '../logo';
import { buildExterior } from '../scenes/exterior';
import { buildEntrance } from '../scenes/entrance';
import { buildHallShell } from '../scenes/main-hall/hall';
import { buildCollectionsWall } from '../collections/wall';
import { buildDesignStudio } from '../designstudio/wall';
import { buildBays } from '../scenes/main-hall/bays';
import { layoutBays } from '../scenes/main-hall/departments';
import { buildProducts } from '../scenes/products';
import { ensureFonts } from '../scenes/main-hall/signs';
import { loadRealism, loadInteriorHdr, viaReal, upgradeTexturesStaged, disposeRealism } from './realism/registry';
import { LOOK, kelvin } from './realism/look';
import { buildGalleryFrames } from './realism/gallery';
import { HALL } from './dimensions';
import { staffModeFrom } from '../staff/config';

const nextFrame = () => new Promise((r) => { let done = false; const f = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(f); setTimeout(f, 40); });

export class ShowroomEngine {
  constructor(canvas, { tier = 'high', lang = 'en', progress, adaptive = true, aa = null, bloom = true } = {}) {
    this.aaOverride = aa; this.noBloom = !bloom;
    this.canvas = canvas; this.tierId = tier; this.tier = TIERS[tier] || TIERS.low; this.lang = lang; this.progress = progress; this.adaptive = adaptive;
    this.scale = 1; this.shed = 0; this.frames = 0; this.fpsAcc = 0; this.fpsT = 0; this.fps = 0; this.running = false; this.disposed = false;
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
    renderer.toneMapping = LOOK.toneMapping; renderer.toneMappingExposure = LOOK.exposure;
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
      ['stone', () => stoneSet(S, 7)], ['floor', () => viaReal('microcement', S, () => tileSet(S, 47, 'white'))], ['oak', () => woodSet(S, 3, 0)], ['walnut', () => woodSet(Math.max(256, S >> 1), 8, 1)], ['plaster', () => plasterSet(Math.max(256, S >> 1), 5)],
      ['paver', () => paverSet(Math.max(256, S >> 1), 9)], ['grass', () => grassSet(Math.max(256, S >> 1), 21)], ['sand', () => sandSet(Math.max(128, S >> 2), 31)],
      ['leaf', () => leafSet(Math.max(128, S >> 2), 41)], ['trunk', () => trunkSet(Math.max(128, S >> 2), 51)], ['frond', () => frondCanvas(256, 512)],
    ];
    for (let i = 0; i < jobs.length; i++) { await nextFrame(); if (this.disposed) return; sets[jobs[i][0]] = jobs[i][1](); this.report('textures', (i + 1) / jobs.length); }

    // image-based lighting from the same sky, then materials
    await nextFrame();
    this.envMap = buildEnvironment(renderer, tier.clouds); this.report('environment', 1);
    const M = this.M = createMaterials(sets, tier, this.envMap, null);
    this.baseLed = { warm: M.led.color.clone(), cool: M.ledCool.color.clone() };
    const glowTex = this.glowTex = glowTexture();
    const ctx = { M, tier, logoTex, glowTex, lang: this.lang };

    await nextFrame(); this.exterior = buildExterior(ctx); this.scene.add(this.exterior.group); this.report('exterior', 0.6);
    this.entrance = buildEntrance(ctx); this.scene.add(this.entrance.group); this.report('exterior', 1);
    await nextFrame(); this.hall = buildHallShell(ctx); this.scene.add(this.hall.group); this.report('hall', 0.6);
    this.report('hall', 1); await nextFrame();
    // Phase 4: furnished departments (kitchens, wardrobes, doors) + the Ikhtarha stage; they build their own materials from the generated interior environment
    this.products = buildProducts({ renderer, hallM: M, tier, lang: this.lang, bays: layoutBays(), reduced: !!this.reduced, logoTex });
    this.scene.add(this.products.group); this.products.lights.forEach((l) => this.scene.add(l)); this.report('products', 0.6);
    this.avatar = new VisitorAvatar({ tier: this.tierId }); this.scene.add(this.avatar.group);
    this.staff = new StaffManager({ tier: this.tierId, lang: this.lang, mode: staffModeFrom(typeof window !== 'undefined' ? window.location.search : '') }); this.scene.add(this.staff.group);
    this.bays = buildBays({ ...ctx, products: this.products }); this.scene.add(this.bays.group); this.report('products', 1);
    this.collections = buildCollectionsWall({ tier: this.tierId, lang: this.lang }); this.scene.add(this.collections.group);
    this.designStudio = buildDesignStudio({ tier: this.tierId, lang: this.lang, reduced: !!this.reduced }); this.scene.add(this.designStudio.group);   // the Kitchen Design Studio station (left front wing)
    if (tier.id === 'high') {   // planar floor reflections of the furnished bays + stage (high tier only)
      const rects = layoutBays().filter((b) => b.product).map((b) => (b.facing > 0 ? { x0: b.x - 3, x1: b.x + 6.5, z0: b.z - 3.3, z1: b.z + 3.3 } : { x0: b.x - 6.5, x1: b.x + 3, z0: b.z - 3.3, z1: b.z + 3.3 }));
      rects.push({ x0: -4.2, x1: 4.2, z0: -24.8, z1: -16.2 });
      try { this.mirror = new FloorMirror(renderer, this.scene, rects, { strength: 0.55 }); } catch (e) { this.mirror = null; }
    }
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
      try { const { createBloom } = await import('./post'); this.post = await createBloom(renderer, this.scene, this.camera, { width: this.width, height: this.height, pixelRatio: this.pixelRatio(), ao: /[?&]ao=1/.test(window.location.search) }); } catch (e) { this.post = null; }
    }
    this.gallery = buildGalleryFrames({ depth: HALL.depth, lang: this.lang }); this.scene.add(this.gallery.group);
    this.renderOnce(); this.report('firstFrame', 1);
    setTimeout(() => { if (!this.disposed && this.gallery) this.gallery.load(); }, 1500);
    this.realism = 'loading'; this.lazyRealism();   // real textures + HDRI download AFTER the first frame: the loader is no longer than before the realism pass   // lazy: the four YAS Wood pictures (180 KB) load after the intro has started
  }

  // ---------------------------------------------------------------- Floor 2 (Bloom Meeting): a lazy chunk, shown only while a visitor is up there
  /** fetch + build the Bloom chunk (Floor 2 and the glass lift in the hall) once; resolves with { floor, lift } or null on any failure (the lift simply never appears) */
  ensureBloom() {
    if (this.bloomP) return this.bloomP;
    this.bloomP = import(/* webpackChunkName: "bloom-meeting" */ '../scenes/bloom').then((m) => {
      if (this.disposed || !this.products) return null;
      const b = m.buildBloom({ M: this.products.M, tier: this.tier, lang: this.lang, logoTex: null, glowTex: this.glowTex, reduced: !!this.reduced });
      b.floor.group.visible = false; this.scene.add(b.floor.group, b.lift.group); this.bloom = b; this.floorId = this.floorId || 'ground';
      if (this.lang) { b.floor.setLanguage(this.lang); b.lift.setLanguage(this.lang); }
      return b;
    }).catch((e) => { this.bloomErr = e; return null; });   // (kept for QA: window.__showroom.engine.bloomErr)
    return this.bloomP;
  }
  /** 'ground' | 'l2': hide the hall, the exterior and the sun while up on Floor 2, and light it with the hall's point lights moved there (no new lights, no shader recompile) */
  setFloor(id) {
    const b = this.bloom, up = id === 'l2' && !!b; if (!b && id === 'l2') return false;
    const was = this.floorId === 'l2'; if (up === was) return true; this.floorId = up ? 'l2' : 'ground';
    const groups = [this.exterior, this.entrance, this.hall, this.products, this.bays, this.collections, this.designStudio, this.gallery, this.staff].map((o) => o && o.group).filter(Boolean);
    const scene = this.scene, r = this.renderer;
    if (up) {
      this._f = { vis: groups.map((g) => g.visible), sunI: this.sun.intensity, sunC: this.sun.castShadow, sunPos: this.sun.position.clone(), sunCol: this.sun.color.getHex(), sunT: this.sun.target.position.clone(), fog: [scene.fog.color.getHex(), scene.fog.density], clear: r.getClearColor(new THREE.Color()).getHex(), pl: this.pointLights.map((l) => [l.position.clone(), l.intensity, l.color.getHex(), l.distance]), avatar: this.avatar ? this.avatar.group.visible : false };
      groups.forEach((g) => { g.visible = false; }); this.sun.castShadow = false; this.sun.color.setHex(0xdde4ff); this.sun.intensity = this.tier.pointLights ? 2.6 : 4.2; this.sun.target.position.set(0, 0, 150); this.sun.position.set(-30, 120, 190);   // the moon: a cool directional fill (the hall's hemisphere light is not in the scene)
      scene.fog.color.setHex(0x0b1428); scene.fog.density = 0.0011; r.setClearColor(0x050a14, 1);
      const Z = 150, spots = [[8, 3.7, -5], [-10, 3.7, -5], [-4, 3.7, 7], [12, 3.7, 6], [-6, 3.3, 18.5], [6, 3.3, 18.5]];   // (the last two light the executive wing)
      this.pointLights.forEach((l, i) => { const p = spots[i % spots.length]; l.position.set(p[0], p[1], p[2] + Z); l.intensity = 42; l.color.setHex(0xffe0b8); l.distance = 24; });
      b.lift.group.visible = false; b.floor.setActive(true);
      if (!this._bloomCompiled) { this._bloomCompiled = true; try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* the first render compiles */ } }   // the Floor 2 shaders compile once, behind the lift fade
    } else if (this._f) {
      const f = this._f; groups.forEach((g, i) => { g.visible = f.vis[i]; }); this.sun.intensity = f.sunI; this.sun.castShadow = f.sunC; this.sun.color.setHex(f.sunCol); this.sun.position.copy(f.sunPos); this.sun.target.position.copy(f.sunT);
      scene.fog.color.setHex(f.fog[0]); scene.fog.density = f.fog[1]; r.setClearColor(f.clear, 1); this.pointLights.forEach((l, i) => { const o = f.pl[i]; l.position.copy(o[0]); l.intensity = o[1]; l.color.setHex(o[2]); l.distance = o[3]; });
      b.lift.group.visible = true; b.floor.setActive(false); this._f = null;
    }
    return true;
  }

  /** lazy realism: the scene starts on the procedural sets (exactly the old loader time); the CC0 textures and the HDRI replace them in place when they arrive. Every failure keeps the procedural look. */
  async lazyRealism() {
    try {
      const ok = await loadRealism(this.tierId); if (this.disposed) return;
      if (ok) await upgradeTexturesStaged({ cancelled: () => this.disposed });   // a few textures per frame instead of one multi-hundred-ms freeze in the intro
      const env = await loadInteriorHdr(this.renderer); if (this.disposed) return;
      if (env) {
        const sky = this.envMap, seen = new Set(), swap = (m) => { if (!m || !m.isMaterial || seen.has(m)) return; seen.add(m); if (m.envMap && (m.envMap !== sky || (m.userData && m.userData.interior))) { m.envMap = env; m.needsUpdate = true; } };
        const walk = (o, d = 0) => { if (!o || d > 3) return; if (o.isMaterial) swap(o); else if (typeof o === 'object' && !o.isTexture && !o.isObject3D) for (const v of Object.values(o)) walk(v, d + 1); };
        this.scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(swap); });
        walk(this.M); if (this.products && this.products.M) walk(this.products.M);
      }
      this.realism = ok || env ? 'ready' : 'procedural';
    } catch (e) { this.realism = 'procedural'; }
  }

  loadLogo() {
    return new Promise((resolve) => {
      new THREE.TextureLoader().load(LOGO_URL, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; resolve(t); }, undefined, () => resolve(null));
    });
  }

  setupLights() {
    const { scene, tier } = this;
    const sun = new THREE.DirectionalLight(PALETTE.sun, 8.2);
    const target = new THREE.Object3D(); target.position.set(0, 0, -6); scene.add(target); sun.target = target;
    sun.position.copy(SUN_DIR).multiplyScalar(130).add(target.position);
    const sm = tier.id === 'high' ? Math.min(4096, this.renderer.capabilities.maxTextureSize) : tier.shadowMap;   // high tier: a 4k sun map (2.5 cm texels in the hall) for clean soft edges
    sun.castShadow = true; sun.shadow.mapSize.set(sm, sm); this.sunMapSize = sm;
    const c = sun.shadow.camera; c.left = -52; c.right = 52; c.top = 46; c.bottom = -46; c.near = 20; c.far = 300;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; sun.shadow.radius = 2.5;
    scene.add(sun); this.sun = sun;
    this.hemi = new THREE.HemisphereLight(kelvin(LOOK.fillK), kelvin(LOOK.keyK), 0.55);   // cool fill from above, warm bounce from the floor scene.add(this.hemi);
    const spots = [[-8, 5.3, -8], [8, 5.3, -8], [0, 5.3, -18], [-8, 5.3, -28], [8, 5.3, -28], [0, 5.3, -4]].slice(0, tier.pointLights);
    this.pointLights = spots.map((p) => { const l = new THREE.PointLight(kelvin(LOOK.keyK), 70, 34, 2); l.position.set(...p); scene.add(l); l.userData.base = 70; return l; });
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
    if (this.hemi) this.hemi.intensity = 0.22 + 0.2 * k;
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
  /** inside the hall the hard window-sun stripes fade out (the bay key lights take over); the colour grade glides to the nearest room's grade; the floor mirror renders */
  daylight(dt) {
    const z = this.camera.position.z;
    if (this.sun && !this.cinematic && this.floorId !== 'l2') this.sun.intensity = 8.2 * sunScale(z);
    if (this.post && this.post.setGrade && this.products) {
      const id = z < 0.6 ? this.products.anchorId() : 'neutral', want = gradeFor(id); this.grade = this.grade ? mixGrade(this.grade, want, 1 - Math.exp(-2.5 * dt)) : want; this.post.setGrade(this.grade);
    }
    const fwdY = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).y;   // looking steeply down: the mirrored camera sees nothing useful and the overlay misrenders, so skip the pass
    if (this.mirror && !this.mirrorOff && z < -0.5 && fwdY > -0.42) { this.mirror.setSize(this.width * (this.scale || 1), this.height * (this.scale || 1)); this.mirror.mesh.visible = true; this.mirror.render(this.camera, [this.hall && this.hall.group, this.exterior && this.exterior.group, this.entrance && this.entrance.group, ...(this.products ? [...this.products.outlines, this.products.vip && this.products.vip.group, ...this.products.farGroups(this.camera, 13)] : [])]); }
    else if (this.mirror) this.mirror.mesh.visible = false;
  }
  setLanguage(lang) { this.lang = lang; if (this.gallery) this.gallery.setLanguage(lang); if (this.hall && this.hall.relabel) this.hall.relabel(lang); if (this.exterior && this.exterior.relabel) this.exterior.relabel(lang); if (this.bays) this.bays.relabel(lang); if (this.collections) this.collections.setLanguage(lang); if (this.designStudio) this.designStudio.setLanguage(lang); if (this.products) this.products.setLanguage(lang); if (this.staff) this.staff.setLanguage(lang);  if (this.bloom) { this.bloom.floor.setLanguage(lang); this.bloom.lift.setLanguage(lang); } }

  setSize(w, h) {
    const nw = Math.max(2, w), nh = Math.max(2, h), dprNow = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    if (nw === this.width && nh === this.height && dprNow === this.dpr) return;   // nothing changed: do not reallocate (and clear) the drawing buffer
    this.width = nw; this.height = nh;
    this.camera.aspect = this.width / this.height;
    // wide fov on portrait phones so the facade still fits
    this.camera.updateProjectionMatrix(); this.applyFov();
    this.applyPixelRatio();
  }
  /** device pixels per CSS pixel of the drawing buffer. `debugScale` (QA only, ?debug=1&scale=) may go below the visitor floor because software GL is slow. */
  pixelRatio() {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return this.debugScale ? Math.max(0.3, Math.min(this.tier.pixelRatioCap, dpr) * this.scale) : effectivePixelRatio(this.tierId, dpr, this.scale);
  }
  /** the canvas is sized by CSS (100% of the stage); the drawing buffer is CSS size x pixelRatio (never a small buffer stretched by CSS), and the post chain uses the same ratio */
  applyPixelRatio() {
    const pr = this.pixelRatio(); this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    if (this.post) this.post.setSize(this.width, this.height, pr);
  }
  /** adaptive quality: costs shed in order BEFORE the resolution (see quality.js SHED_STEPS). Reversible. */
  applyShed(level) {
    const n = Math.max(0, Math.min(SHED_MAX, level | 0)); this.shed = n;
    if (this.sun && this.sunMapSize) {   // 1: smaller sun shadow map
      const want = n >= 1 ? Math.max(512, this.sunMapSize / 2) : this.sunMapSize;
      if (this.sun.shadow.mapSize.x !== want) { this.sun.shadow.mapSize.set(want, want); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } this.renderer.shadowMap.needsUpdate = true; }
    }
    this.postOff = n >= 2;                                   // 2: plain renderer instead of the bloom / grade chain (same tone mapping, MSAA from the canvas)
    this.mirrorOff = n >= 3; if (this.mirrorOff && this.mirror) this.mirror.mesh.visible = false;   // 3: no planar floor reflections
    const live = n < 4; if (this.renderer.shadowMap.autoUpdate !== live) { this.renderer.shadowMap.autoUpdate = live; this.renderer.shadowMap.needsUpdate = true; }   // 4: shadows drawn once, not every frame
  }

  renderOnce() { this.renderer.info.reset(); if (this.post && !this.postOff) this.post.render(); else this.renderer.render(this.scene, this.camera); }

  start() {
    if (this.running) return; this.running = true; let last = performance.now();
    const loop = (now) => {
      if (!this.running) return; this.raf = requestAnimationFrame(loop);
      this.renderer.info.reset();   // counts the whole frame: floor-mirror pass + shadow + scene + bloom
      const dt = Math.min(this.maxDt || 0.1, (now - last) / 1000); last = now;
      if (this.onFrame) this.onFrame(dt, now);
      if (this.products) this.products.update(dt, this.camera);
      if (this.designStudio) this.designStudio.update(dt);
      if (this.bloom) { if (this.floorId === 'l2') this.bloom.floor.update(dt, this.camera); else this.bloom.lift.update(dt); }
      this.daylight(dt);
      if (this.post && !this.postOff) this.post.render(); else this.renderer.render(this.scene, this.camera);
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
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const next = adaptQuality({ shed: this.shed, scale: this.scale, fps: this.fps, min: minScale(this.tierId, dpr) });
        if (next.shed !== this.shed) this.applyShed(next.shed);
        if (next.scale !== this.scale) { this.scale = next.scale; this.applyPixelRatio(); }
      }
    }
  }

  info() { const i = this.renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, fps: Math.round(this.fps * 10) / 10, scale: this.scale, shed: this.shed, pixelRatio: Math.round(this.pixelRatio() * 100) / 100, buffer: [this.renderer.domElement.width, this.renderer.domElement.height], css: [this.width, this.height], dpr: typeof window !== 'undefined' ? window.devicePixelRatio : 1, antialias: !!(this.renderer.getContextAttributes && this.renderer.getContextAttributes() || {}).antialias, tier: this.tierId, gpu: this.stats.gpu }; }

  dispose() {
    this.disposed = true; this.stop();
    if (this.bloom) { try { this.bloom.floor.dispose(); this.bloom.lift.dispose(); } catch (e) { /* ignore */ } }
    if (this.scene) disposeTree(this.scene);
    if (this.mirror) { try { this.mirror.dispose(); } catch (e) { /* ignore */ } }
    if (this.post) { try { this.post.dispose(); } catch (e) { /* ignore */ } }
    if (this.products) this.products.dispose();
    if (this.collections) this.collections.dispose();
    if (this.designStudio) this.designStudio.dispose();
    if (this.envMap) this.envMap.dispose();
    disposeRealism();
    if (this.glowTex) this.glowTex.dispose();
    if (this.renderer) { this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) { /* ignore */ } }
  }
}
