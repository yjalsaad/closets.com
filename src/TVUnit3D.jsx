import { useEffect, useRef, useCallback } from 'react';
import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  HemisphereLight,
  DirectionalLight,
  AmbientLight,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  Mesh,
  Group,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  TextureLoader,
  CanvasTexture,
  RepeatWrapping,
  Raycaster,
  Vector2,
  Clock,
  PMREMGenerator,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { fitModules } from './moduleFit';

/**
 * TVUnit3D - standalone interactive, premium-looking 3D TV media wall.
 *
 * Props:
 *   materials   : { unit, wall_panel, shelf, handle, appliance } each { hex?, texture_url? }
 *   shape       : 'floating' | 'full-wall' | 'fireplace' | 'minimal' | 'storage-wall'
 *   activeSurface : surface key to highlight (emissive pulse).
 *   onPickSurface : fn(surfaceKey) on click.
 *   height      : px height (default 460).
 *   dimensions  : { wallWidthMm, wallHeightMm, tvInch }
 *   layoutParams: optional tweaks (unused defaults).
 *
 * Surface keys: 'unit' | 'wall_panel' | 'shelf' | 'handle' | 'appliance'
 */

const DEFAULTS = {
  unit: { hex: '#e6e2da', rough: 0.5, metal: 0.04, clearcoat: 0.0 },
  wall_panel: { hex: '#cdc6ba', rough: 0.78, metal: 0.0, clearcoat: 0.06, clearcoatRough: 0.4 },
  shelf: { hex: '#8a7560', rough: 0.55, metal: 0.0, clearcoat: 0.12, clearcoatRough: 0.35 },
  handle: { hex: '#b8bcc0', rough: 0.28, metal: 0.92 },
  appliance: { hex: '#15161a', rough: 0.22, metal: 0.4, clearcoat: 0.6, clearcoatRough: 0.12 },
};

function num(v, fallback) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampNum(v, lo, hi, fallback) {
  const n = num(v, fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}
function mmToM(v, fallbackMm) {
  const n = num(v, fallbackMm);
  const m = n / 1000;
  const fb = fallbackMm / 1000;
  return Number.isFinite(m) && m > 0 ? m : fb;
}

export default function TVUnit3D({
  materials = {},
  shape = 'floating',
  activeSurface = null,
  onPickSurface = null,
  height = 460,
  dimensions = null,
  layoutParams = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(0);
  const surfaceMatsRef = useRef({});
  const meshesRef = useRef([]);
  const disposablesRef = useRef([]);
  const envRef = useRef(null);
  const activeRef = useRef(activeSurface);
  const pickRef = useRef(onPickSurface);

  activeRef.current = activeSurface;
  pickRef.current = onPickSurface;

  const dimsSig = JSON.stringify(dimensions || {});
  const lpSig = JSON.stringify(layoutParams || {});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth || 640;
    const h = height;

    const reduce = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
    const extraMaterials = [];

    const dim = dimensions || {};
    const WALL_W = mmToM(dim.wallWidthMm, 4000);
    const WALL_H = mmToM(dim.wallHeightMm, 2700);
    const tvInch = clampNum(dim.tvInch, 24, 110, 65);
    // TV diagonal (16:9) -> width/height in metres (1 inch = 25.4mm).
    const tvDiagM = (tvInch * 25.4) / 1000;
    const tvW = tvDiagM * (16 / Math.hypot(16, 9));
    const tvH = tvDiagM * (9 / Math.hypot(16, 9));

    const roomDiag = Math.hypot(WALL_W, WALL_H);

    const scene = new Scene();
    scene.background = new Color('#f4f1ea');
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(40, width / h, 0.1, 200);
    const fitDist = Math.max(3.6, (Number.isFinite(roomDiag) ? roomDiag : 5) * 1.0);
    camera.position.set(
      Number.isFinite(WALL_W) ? WALL_W * 0.18 : 0.8,
      Number.isFinite(WALL_H) ? WALL_H * 0.55 : 1.5,
      Number.isFinite(fitDist) ? fitDist : 4.2
    );
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if ('useLegacyLights' in renderer) renderer.useLegacyLights = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    try {
      const pmrem = new PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      envRef.current = envTex;
      if (roomEnv.dispose) roomEnv.dispose();
      pmrem.dispose();
    } catch (e) {
      /* PBR still renders without env map */
    }

    scene.add(new AmbientLight(0xffffff, 0.2));
    const hemi = new HemisphereLight(0xfdfbf7, 0x8c7a68, 0.6);
    scene.add(hemi);
    const key = new DirectionalLight(0xfff4e6, 2.3);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const fill = new DirectionalLight(0xdfe7f2, 0.5);
    fill.position.set(-5, 3, 4);
    scene.add(fill);
    // Rim / back light for premium edge separation from the feature wall.
    const rim = new DirectionalLight(0xffe9cf, 0.85);
    rim.position.set(-3, 6, -7);
    scene.add(rim);

    const makeMat = (mkey) => {
      const d = DEFAULTS[mkey] || DEFAULTS.unit;
      const usePhysical = d.clearcoat != null;
      const m = usePhysical
        ? new MeshPhysicalMaterial({
            color: new Color(d.hex),
            roughness: d.rough,
            metalness: d.metal,
            clearcoat: d.clearcoat || 0,
            clearcoatRoughness: d.clearcoatRough != null ? d.clearcoatRough : 0.2,
            envMapIntensity: 1.0,
          })
        : new MeshStandardMaterial({
            color: new Color(d.hex),
            roughness: d.rough,
            metalness: d.metal,
            envMapIntensity: 0.9,
          });
      m.userData = { baseEmissive: new Color(0x000000) };
      surfaceMatsRef.current[mkey] = m;
      return m;
    };
    Object.keys(DEFAULTS).forEach(makeMat);

    const track = (geo) => {
      disposablesRef.current.push(geo);
      return geo;
    };
    const addMesh = (geo, surfaceKey, opts = {}) => {
      const mesh = new Mesh(track(geo), surfaceMatsRef.current[surfaceKey]);
      mesh.userData.surfaceKey = surfaceKey;
      if (opts.cast !== false) mesh.castShadow = true;
      if (opts.receive !== false) mesh.receiveShadow = true;
      scene.add(mesh);
      meshesRef.current.push(mesh);
      return mesh;
    };

    // ---- Soft contact shadow (grounding AO under floor-standing units) -----
    const shadowTex = track(makeSoftShadowTex());
    const shadowMat = new MeshBasicMaterial({
      map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false,
    });
    extraMaterials.push(shadowMat);
    const addContactShadow = (cx, cz, w, d) => {
      const g = track(new PlaneGeometry(Math.max(0.1, w), Math.max(0.1, d)));
      const m = new Mesh(g, shadowMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(cx, 0.006, cz);
      m.renderOrder = 1;
      scene.add(m);
      return m;
    };

    // ---- Floor + feature wall ---------------------------------------------
    const floor = addMesh(new PlaneGeometry(Math.max(WALL_W + 2, 4), 5), 'wall_panel', { cast: false });
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.0);
    surfaceMatsRef.current.wall_panel.userData.repeat = [
      Math.max(2, Math.round(WALL_W)),
      4,
    ];

    // Back feature wall (wall_panel) sized to wallWidth x wallHeight.
    const wallZ = -0.05;
    const featureWall = addMesh(new BoxGeometry(WALL_W, WALL_H, 0.08), 'wall_panel', { cast: false });
    featureWall.position.set(0, WALL_H / 2, wallZ - 0.04);

    // ---- Builders ----------------------------------------------------------
    const MEDIA_H = 0.42;    // low media unit height
    const MEDIA_D = 0.42;    // depth
    const FRONT_T = 0.02;

    // Build a low media run split into bays via fitModules.
    function buildMediaRun(runM, yBottom, floating) {
      const grp = new Group();
      scene.add(grp);
      const runMm = Math.max(0, runM * 1000);
      const mods = fitModules(runMm);
      const fitList = mods.length ? mods : [{ width: runMm, filler: false }];
      const widthsM = fitList.map((m) => Math.max(0.05, (Number(m.width) || 0) / 1000));
      const sum = widthsM.reduce((s, w) => s + w, 0) || 1;
      const scaled = widthsM.map((w) => (w / sum) * runM);
      let cursor = -runM / 2;
      const yCenter = yBottom + MEDIA_H / 2;
      for (let i = 0; i < scaled.length; i += 1) {
        const w = scaled[i];
        const off = cursor + w / 2;
        cursor += w;
        const mw = Math.max(0.05, w - 0.006);
        const body = addMesh(new BoxGeometry(mw, MEDIA_H, MEDIA_D), 'unit');
        body.position.set(off, yCenter, wallZ + MEDIA_D / 2);
        const front = addMesh(new BoxGeometry(Math.max(0.04, mw - 0.02), MEDIA_H - 0.04, FRONT_T), 'unit');
        front.position.set(off, yCenter, wallZ + MEDIA_D + FRONT_T / 2 + 0.002);
        // bar handle along the top of the front
        const hGeo = new CylinderGeometry(0.008, 0.008, Math.min(0.18, mw * 0.5), 12);
        const handle = addMesh(hGeo, 'handle');
        handle.rotation.z = Math.PI / 2;
        handle.position.set(off, yCenter + MEDIA_H / 2 - 0.06, wallZ + MEDIA_D + FRONT_T + 0.012);
      }
      // continuous plinth (unless floating)
      if (!floating) {
        const plinth = addMesh(new BoxGeometry(Math.max(0.1, runM - 0.04), yBottom, MEDIA_D - 0.1), 'unit', { cast: false });
        plinth.position.set(0, yBottom / 2, wallZ + MEDIA_D / 2);
        addContactShadow(0, wallZ + MEDIA_D / 2, runM + 0.3, MEDIA_D + 0.32);
      }
      return grp;
    }

    // Floating shelf (shelf surface).
    function addShelf(yCenter, lenM, depth = 0.26) {
      const sh = addMesh(new BoxGeometry(lenM, 0.045, depth), 'shelf');
      sh.position.set(0, yCenter, wallZ + depth / 2);
      return sh;
    }

    // A tall storage column (unit) with front + handle.
    function addColumn(x, colW, colH, yBottom) {
      const body = addMesh(new BoxGeometry(colW, colH, MEDIA_D), 'unit');
      body.position.set(x, yBottom + colH / 2, wallZ + MEDIA_D / 2);
      if (yBottom < 0.05) addContactShadow(x, wallZ + MEDIA_D / 2, colW + 0.26, MEDIA_D + 0.3);
      const front = addMesh(new BoxGeometry(Math.max(0.04, colW - 0.03), colH - 0.05, FRONT_T), 'unit');
      front.position.set(x, yBottom + colH / 2, wallZ + MEDIA_D + FRONT_T / 2 + 0.002);
      const hGeo = new CylinderGeometry(0.008, 0.008, 0.16, 12);
      const handle = addMesh(hGeo, 'handle');
      handle.position.set(x + colW / 2 - 0.05, yBottom + colH / 2, wallZ + MEDIA_D + FRONT_T + 0.012);
    }

    // TV (dark appliance) centred on wall.
    function addTV(yCenter) {
      const tv = addMesh(new BoxGeometry(tvW, tvH, 0.04), 'appliance');
      tv.position.set(0, yCenter, wallZ + 0.06);
      return tv;
    }

    // Fireplace recess block (appliance) with glow front.
    function addFireplace(yBottom, fpW, fpH) {
      const recess = addMesh(new BoxGeometry(fpW, fpH, 0.18), 'appliance', { cast: false });
      recess.position.set(0, yBottom + fpH / 2, wallZ + 0.02);
      const surround = addMesh(new BoxGeometry(fpW + 0.12, fpH + 0.12, 0.06), 'unit', { cast: false });
      surround.position.set(0, yBottom + fpH / 2, wallZ - 0.01);
    }

    const runW = Math.min(WALL_W - 0.4, 3.2);

    const layouts = {
      floating: () => {
        // wall-mounted media unit, no floor contact
        buildMediaRun(runW, 0.45, true);
        addTV(Math.min(WALL_H - tvH / 2 - 0.2, 1.55));
        addShelf(Math.min(WALL_H - 0.35, 2.0), runW * 0.7);
      },
      'full-wall': () => {
        // full-height cabinetry + shelves
        const colH = Math.max(0.8, WALL_H - 0.1);
        const colW = Math.min(0.7, WALL_W * 0.2);
        addColumn(-WALL_W / 2 + colW / 2 + 0.1, colW, colH, 0.0);
        addColumn(WALL_W / 2 - colW / 2 - 0.1, colW, colH, 0.0);
        buildMediaRun(runW - colW * 2 - 0.4, 0.05, false);
        addTV(Math.min(WALL_H - tvH / 2 - 0.4, 1.5));
        addShelf(Math.min(WALL_H - 0.5, 1.95), runW - colW * 2 - 0.6);
      },
      fireplace: () => {
        addFireplace(0.35, Math.min(1.3, WALL_W * 0.4), 0.55);
        buildMediaRun(runW, 0.05, false);
        addTV(Math.min(WALL_H - tvH / 2 - 0.3, 1.65));
        addShelf(Math.min(WALL_H - 0.4, 2.05), runW * 0.6);
      },
      minimal: () => {
        buildMediaRun(Math.min(runW, 2.2), 0.16, false);
        addTV(Math.min(WALL_H - tvH / 2 - 0.3, 1.45));
      },
      'storage-wall': () => {
        const colH = Math.max(0.8, WALL_H - 0.1);
        const colW = Math.min(0.6, WALL_W * 0.18);
        addColumn(-WALL_W / 2 + colW / 2 + 0.1, colW, colH, 0.0);
        addColumn(-WALL_W / 2 + colW * 1.5 + 0.16, colW, colH, 0.0);
        addColumn(WALL_W / 2 - colW / 2 - 0.1, colW, colH, 0.0);
        buildMediaRun(runW - colW * 3 - 0.5, 0.05, false);
        addTV(Math.min(WALL_H - tvH / 2 - 0.4, 1.5));
        addShelf(Math.min(WALL_H - 0.5, 1.9), runW * 0.4);
        addShelf(Math.min(WALL_H - 0.9, 1.5), runW * 0.4);
      },
    };

    (layouts[shape] || layouts.floating)();

    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(2.0, fitDist * 0.5);
    controls.maxDistance = Math.max(9, fitDist * 2.0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minPolarAngle = 0.4;
    controls.enablePan = false;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.5;
    controls.target.set(0, WALL_H * 0.42, 0.2);
    controls.update();
    controlsRef.current = controls;

    const raycaster = new Raycaster();
    const ndc = new Vector2();
    let downXY = null;
    let idleTimer = null;
    const pauseOrbit = () => {
      if (reduce) return;
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { controls.autoRotate = true; }, 3500);
    };
    const onPointerDown = (e) => { downXY = [e.clientX, e.clientY]; pauseOrbit(); };
    const onPointerUp = (e) => {
      if (!downXY) return;
      const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
      downXY = null;
      if (moved > 6 || !pickRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(meshesRef.current, false);
      if (hits.length) {
        const k = hits[0].object.userData.surfaceKey;
        if (k) pickRef.current(k);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const clock = new Clock();
    function render() {
      renderer.render(scene, camera);
    }
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      const t = clock.getElapsedTime();
      const pulse = reduce ? 0.2 : 0.16 + 0.1 * Math.sin(t * 3);
      Object.entries(surfaceMatsRef.current).forEach(([k, m]) => {
        if (activeRef.current && k === activeRef.current) {
          m.emissive.setHex(0xffffff);
          m.emissiveIntensity = pulse;
        } else if (m.emissiveIntensity) {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
      });
      render();
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || width;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (idleTimer) clearTimeout(idleTimer);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      disposablesRef.current.forEach((g) => g && g.dispose && g.dispose());
      disposablesRef.current = [];
      Object.values(surfaceMatsRef.current).forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      surfaceMatsRef.current = {};
      extraMaterials.forEach((m) => { if (m && m.dispose) m.dispose(); });
      meshesRef.current = [];
      if (envRef.current && envRef.current.dispose) { try { envRef.current.dispose(); } catch (e) {} }
      envRef.current = null;
      if (scene) scene.environment = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, height, dimsSig, lpSig]);

  useEffect(() => {
    if (!surfaceMatsRef.current || !rendererRef.current) return;
    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });
  }, [materials]);

  const saveRender = useCallback(() => {
    captureBrandedRender(rendererRef.current, sceneRef.current, cameraRef.current, 'tv-unit');
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <button
        type="button"
        onClick={saveRender}
        aria-label="Save a branded render of this design"
        title="Save render"
        style={captureBtnStyle}
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>⬇</span>
        Save render
      </button>
    </div>
  );
}

const captureBtnStyle = {
  position: 'absolute', top: 12, right: 12, zIndex: 4,
  display: 'inline-flex', alignItems: 'center', gap: 7,
  background: 'rgba(33,28,24,0.82)', color: '#f7f2ec',
  border: '1px solid rgba(247,242,236,0.22)', borderRadius: 999,
  padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'inherit', letterSpacing: '.01em', backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)', boxShadow: '0 6px 18px rgba(0,0,0,.28)',
};

function makeSoftShadowTex() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(24,17,10,0.9)');
  g.addColorStop(0.5, 'rgba(24,17,10,0.45)');
  g.addColorStop(1, 'rgba(24,17,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function captureBrandedRender(renderer, scene, camera, label) {
  if (!renderer || !scene || !camera) return;
  const canvas = renderer.domElement;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  const restore = () => {
    try {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(cssW, cssH, false);
      camera.aspect = cssW / cssH;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    } catch (e) { /* ignore */ }
  };
  try {
    const exportDpr = Math.min(3, (window.devicePixelRatio || 1) * 1.5);
    renderer.setPixelRatio(exportDpr);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const w = canvas.width;
    const hh = canvas.height;
    const barH = Math.max(48, Math.round(w * 0.085));
    const out = document.createElement('canvas');
    out.width = w;
    out.height = hh + barH;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0, w, hh);
    ctx.fillStyle = '#211c18';
    ctx.fillRect(0, hh, out.width, barH);
    const pad = Math.round(barH * 0.42);
    const cy = hh + barH / 2;
    ctx.fillStyle = '#F2731C';
    ctx.fillRect(pad, cy - barH * 0.18, barH * 0.09, barH * 0.36);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f7f2ec';
    ctx.font = `600 ${Math.round(barH * 0.32)}px Georgia,'Times New Roman',serif`;
    ctx.fillText('THE CLOSETS', pad + barH * 0.26, cy - barH * 0.13);
    ctx.fillStyle = 'rgba(247,242,236,0.62)';
    ctx.font = `500 ${Math.round(barH * 0.185)}px -apple-system,Arial,sans-serif`;
    ctx.fillText('Bespoke furniture · Bahrain', pad + barH * 0.26, cy + barH * 0.19);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(247,242,236,0.5)';
    ctx.fillText('Design preview', out.width - pad, cy);
    ctx.textAlign = 'left';

    const finish = (blob) => {
      restore();
      if (!blob) return;
      const fname = `the-closets-${label || 'design'}.png`;
      try {
        const file = new File([blob], fname, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'My design — The Closets' }).catch(() => downloadBlob(blob, fname));
          return;
        }
      } catch (e) { /* fall through */ }
      downloadBlob(blob, fname);
    };
    if (out.toBlob) out.toBlob(finish, 'image/png');
    else { restore(); }
  } catch (e) {
    restore();
  }
}

function downloadBlob(blob, fname) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (e) { /* ignore */ }
}

const _loader = new TextureLoader();

function applyMaterials(materials, mats, disposables, onChange) {
  if (!mats) return;
  Object.entries(materials || {}).forEach(([key, spec]) => {
    const m = mats[key];
    if (!m || !spec) return;
    if (spec.hex) {
      try { m.color.set(spec.hex); } catch (e) { /* keep previous */ }
    }
    if (spec.texture_url) {
      try {
        _loader.load(
          spec.texture_url,
          (tex) => {
            try {
              tex.colorSpace = SRGBColorSpace;
              tex.wrapS = RepeatWrapping;
              tex.wrapT = RepeatWrapping;
              const rep = m.userData && m.userData.repeat;
              if (rep) tex.repeat.set(rep[0], rep[1]);
              if (m.map && m.map !== tex) m.map.dispose();
              m.map = tex;
              m.needsUpdate = true;
              if (disposables) disposables.push(tex);
              if (onChange) onChange();
            } catch (inner) { /* keep hex */ }
          },
          undefined,
          () => {
            if (m.map) {
              m.map.dispose();
              m.map = null;
              m.needsUpdate = true;
              if (onChange) onChange();
            }
          }
        );
      } catch (e) { /* keep hex */ }
    } else if (m.map) {
      m.map.dispose();
      m.map = null;
      m.needsUpdate = true;
    }
  });
  if (onChange) onChange();
}
