import { useEffect, useRef } from 'react';
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
  Mesh,
  Group,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  Shape,
  ExtrudeGeometry,
  TextureLoader,
  CanvasTexture,
  RepeatWrapping,
  Raycaster,
  Vector2,
  Clock,
  PMREMGenerator,
  EquirectangularReflectionMapping,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { fitModules } from './moduleFit';

/**
 * KitchenScene3D - standalone interactive, premium-looking 3D kitchen.
 *
 * Props (unchanged API):
 *   materials   : {
 *                   cabinet:    { hex?: string, texture_url?: string },
 *                   worktop:    { hex?, texture_url? },
 *                   splashback: { hex?, texture_url? },
 *                   wall:       { hex?, texture_url? },
 *                   floor:      { hex?, texture_url? },
 *                   handle:     { hex?, texture_url? },
 *                 } - any subset; hex => material color, texture_url => map (falls back to hex on error).
 *   shape       : 'l-shape' | 'galley' | 'u-shape' | 'island' | 'straight' | 'peninsula' (default 'l-shape')
 *   activeSurface : string  - surface key to subtly highlight (emissive pulse).
 *   onPickSurface : fn(surfaceKey) - called on click with the picked mesh's surface key.
 *   height      : number (default 460)
 *   dimensions  : { lengthMm, widthMm, ceilingMm } - real room size (mm). Optional;
 *                 when omitted the legacy 7x7x3.2m box is used (backward compatible).
 *   layoutParams: { wallLen, wallA, wallB, galleyGap, uA, uB, uC, islandW, islandD,
 *                   penW, penD } - run lengths (mm) used per `shape` to size cabinet rows.
 *
 * Surface keys (used by onPickSurface & materials): one of
 *   'cabinet' | 'worktop' | 'splashback' | 'wall' | 'floor' | 'handle' | 'appliance'
 */

// Premium PBR defaults per surface key.
const DEFAULTS = {
  cabinet: { hex: '#e8e4dc', rough: 0.5, metal: 0.04, clearcoat: 0.0 },
  worktop: { hex: '#36363b', rough: 0.18, metal: 0.06, clearcoat: 0.7, clearcoatRough: 0.12 },
  splashback: { hex: '#cfd4d6', rough: 0.22, metal: 0.04, clearcoat: 0.25, clearcoatRough: 0.2 },
  wall: { hex: '#f2efe9', rough: 0.96, metal: 0.0 },
  floor: { hex: '#9a8472', rough: 0.72, metal: 0.0, clearcoat: 0.1, clearcoatRough: 0.35 },
  handle: { hex: '#b8bcc0', rough: 0.28, metal: 0.92 },
  appliance: { hex: '#b9bcc0', rough: 0.38, metal: 0.6, clearcoat: 0.2, clearcoatRough: 0.25 },
};

// Appliance types we know how to place in a run. Unknown types are ignored.
const KNOWN_APPLIANCES = ['oven', 'hob', 'hood', 'fridge', 'sink', 'dishwasher'];
// Sensible standard set used when no appliances prop is supplied (and as the
// fallback the BOM mirrors so the 3D and the production docs agree).
const DEFAULT_APPLIANCES = [
  { type: 'oven' },
  { type: 'hob' },
  { type: 'hood' },
  { type: 'fridge' },
  { type: 'sink' },
  { type: 'dishwasher' },
];

// Normalise an appliances prop into a de-duped Set of known type strings.
// Accepts [{type:'oven'}], ['oven'], or a mix; ignores unknown / falsy entries.
function normalizeApplianceSet(list) {
  const src = Array.isArray(list) && list.length ? list : DEFAULT_APPLIANCES;
  const set = new Set();
  src.forEach((a) => {
    const t = typeof a === 'string' ? a : a && a.type;
    if (typeof t === 'string') {
      const key = t.trim().toLowerCase();
      if (KNOWN_APPLIANCES.indexOf(key) !== -1) set.add(key);
    }
  });
  return set;
}

// ---- Dimension helpers (module scope; no React. globals) -------------------
// Safe number coercion: NaN / non-finite / non-positive falls back.
function num(v, fallback) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function clampNum(v, lo, hi, fallback) {
  const n = num(v, fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}
// mm -> metres, guarded so geometry is never zero/negative.
function mmToM(v, fallbackMm) {
  const n = num(v, fallbackMm);
  const m = n / 1000;
  const fb = fallbackMm / 1000;
  return Number.isFinite(m) && m > 0 ? m : fb;
}

export default function KitchenScene3D({
  materials = {},
  shape = 'l-shape',
  activeSurface = null,
  onPickSurface = null,
  height = 460,
  dimensions = null,
  layoutParams = null,
  appliances = null,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(0);
  const surfaceMatsRef = useRef({}); // key -> THREE.Material (one shared per surface key)
  const meshesRef = useRef([]); // all pickable meshes (carry .userData.surfaceKey)
  const disposablesRef = useRef([]); // geometries/textures to dispose
  const envRef = useRef(null);
  const activeRef = useRef(activeSurface);
  const pickRef = useRef(onPickSurface);

  // keep latest callback/active without re-creating the scene
  activeRef.current = activeSurface;
  pickRef.current = onPickSurface;

  // Stable JSON signatures so the build effect only re-runs on real changes.
  const dimsSig = JSON.stringify(dimensions || {});
  const lpSig = JSON.stringify(layoutParams || {});
  // Sorted, de-duped signature of the appliance set so the scene rebuilds only
  // when the actual set of appliances changes (order-insensitive).
  const appSig = JSON.stringify(Array.from(normalizeApplianceSet(appliances)).sort());

  // ---- One-time scene construction ------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth || 640;
    const h = height;

    // ---- Resolve REAL room dimensions (mm -> metres, clamped) --------------
    // Backward compatible: when `dimensions` is absent we keep the legacy 7x7x3.2.
    const dim = dimensions || {};
    const DEFAULT_LEN_MM = 4000;
    const DEFAULT_WID_MM = 4000;
    const DEFAULT_CEIL_MM = 2700;
    const hasDims = dimensions && (dim.lengthMm != null || dim.widthMm != null || dim.ceilingMm != null);
    const roomLenMm = clampNum(dim.lengthMm, 1500, 8000, DEFAULT_LEN_MM);
    const roomWidMm = clampNum(dim.widthMm, 1500, 8000, DEFAULT_WID_MM);
    const ceilMm = clampNum(dim.ceilingMm, 2200, 3600, DEFAULT_CEIL_MM);
    // Legacy box vs real box. ROOM_X spans the back wall (length), ROOM_Z the side (width).
    const ROOM_X = hasDims ? mmToM(roomLenMm, DEFAULT_LEN_MM) : 7;
    const ROOM_Z = hasDims ? mmToM(roomWidMm, DEFAULT_WID_MM) : 7;
    const WALL_H = hasDims ? mmToM(ceilMm, DEFAULT_CEIL_MM) : 3.2;
    // Layout run lengths (mm), guarded; default to room extents.
    const lp = layoutParams || {};
    const roomDiag = Math.hypot(ROOM_X, ROOM_Z, WALL_H);

    // Resolve which appliances to place (a Set of known type strings). Each
    // layout below only adds an appliance when `wantApp(type)` is true, so the
    // scene reflects the exact supplied/default set.
    const applianceSet = normalizeApplianceSet(appliances);
    const wantApp = (t) => applianceSet.has(t);

    // ---- Scene + soft warm off-white background ----------------------------
    const scene = new Scene();
    scene.background = new Color('#f4f1ea');
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(42, width / h, 0.1, 200);
    // Frame the camera to fit the room: distance scales with room size so a big
    // room zooms out and a small one zooms in. Guarded against NaN/0.
    const fitDist = Math.max(4.5, (Number.isFinite(roomDiag) ? roomDiag : 12) * 0.92);
    const camX = ROOM_X * 0.34 + fitDist * 0.34;
    const camY = Math.max(2.4, WALL_H * 0.92);
    const camZ = ROOM_Z * 0.42 + fitDist * 0.58;
    camera.position.set(
      Number.isFinite(camX) ? camX : 4.6,
      Number.isFinite(camY) ? camY : 3.1,
      Number.isFinite(camZ) ? camZ : 5.6
    );
    cameraRef.current = camera;

    // ---- Renderer (physically-based, tone-mapped, soft shadows) ------------
    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // r160: physically-correct lighting is the default; expose color space + tone mapping.
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    if ('useLegacyLights' in renderer) {
      // r155+ - false === physically-correct lights.
      renderer.useLegacyLights = false;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // ---- Procedural environment for realistic PBR reflections --------------
    // RoomEnvironment gives soft, neutral studio reflections via PMREM.
    try {
      const pmrem = new PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      envRef.current = envTex;
      if (roomEnv.dispose) roomEnv.dispose();
      pmrem.dispose();
    } catch (e) {
      // If PMREM/RoomEnvironment is unavailable, fall back to a faint gradient env.
      try {
        const pmrem = new PMREMGenerator(renderer);
        const grad = makeGradientEnv();
        grad.mapping = EquirectangularReflectionMapping;
        const envTex = pmrem.fromEquirectangular(grad).texture;
        scene.environment = envTex;
        envRef.current = envTex;
        grad.dispose();
        pmrem.dispose();
      } catch (e2) {
        /* no env map - PBR still renders, just flatter */
      }
    }

    // ---- Lighting: soft 3-point setup --------------------------------------
    // Faint ambient so shadow cores never go fully black.
    scene.add(new AmbientLight(0xffffff, 0.18));

    // Hemisphere (sky / ground) for natural ambient gradient.
    const hemi = new HemisphereLight(0xfdfbf7, 0x8c7a68, 0.65);
    scene.add(hemi);

    // Key light - soft shadows from upper-right.
    const key = new DirectionalLight(0xfff4e6, 2.4);
    key.position.set(6, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);

    // Fill - cool, soft, no shadows, from the opposite side.
    const fill = new DirectionalLight(0xdfe7f2, 0.55);
    fill.position.set(-6, 4, 3);
    scene.add(fill);

    // ---- Material factory (one shared material per surface key) -------------
    const makeMat = (mkey) => {
      const d = DEFAULTS[mkey] || DEFAULTS.cabinet;
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

    // Rounded-box (small bevels) via extrude - so cabinets/worktops don't look
    // like raw boxes. Falls back to BoxGeometry on failure.
    const roundedBox = (w, hh, d, r = 0.02) => {
      try {
        const rr = Math.min(r, w / 2 - 0.001, hh / 2 - 0.001);
        const shp = new Shape();
        const x = -w / 2;
        const y = -hh / 2;
        shp.moveTo(x + rr, y);
        shp.lineTo(x + w - rr, y);
        shp.quadraticCurveTo(x + w, y, x + w, y + rr);
        shp.lineTo(x + w, y + hh - rr);
        shp.quadraticCurveTo(x + w, y + hh, x + w - rr, y + hh);
        shp.lineTo(x + rr, y + hh);
        shp.quadraticCurveTo(x, y + hh, x, y + hh - rr);
        shp.lineTo(x, y + rr);
        shp.quadraticCurveTo(x, y, x + rr, y);
        const geo = new ExtrudeGeometry(shp, {
          depth: d,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.008,
          bevelSegments: 2,
          steps: 1,
        });
        geo.translate(0, 0, -d / 2);
        geo.computeVertexNormals();
        return geo;
      } catch (e) {
        return new BoxGeometry(w, hh, d);
      }
    };

    // ---- Room shell (built to real L x W x H) ------------------------------
    // ROOM_X = back-wall span (length), ROOM_Z = side-wall span (width).
    // Floor (plane, receives shadows).
    const floor = addMesh(new PlaneGeometry(ROOM_X, ROOM_Z), 'floor', { cast: false });
    floor.rotation.x = -Math.PI / 2;
    // Repeat the floor texture ~1 tile / metre so big rooms aren't a smear.
    surfaceMatsRef.current.floor.userData.repeat = [
      Math.max(2, Math.round(ROOM_X)),
      Math.max(2, Math.round(ROOM_Z)),
    ];

    // Back wall (faces +Z, along -Z plane) and Left wall (faces +X, along -X plane).
    const backWall = addMesh(new PlaneGeometry(ROOM_X, WALL_H), 'wall', { cast: false });
    backWall.position.set(0, WALL_H / 2, -ROOM_Z / 2);

    const leftWall = addMesh(new PlaneGeometry(ROOM_Z, WALL_H), 'wall', { cast: false });
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ROOM_X / 2, WALL_H / 2, 0);

    // ---- Cabinet run constants (real-world scale, metres) ------------------
    const BASE_H = 0.9;     // worktop sits at ~0.9 m
    const BASE_D = 0.62;    // base depth
    const TOP_T = 0.04;     // worktop thickness
    const UPSTAND_H = 0.06; // small upstand behind worktop
    const SPLASH_H = 0.5;
    const UPPER_H = 0.72;
    const UPPER_D = 0.34;
    const UPPER_Y = 1.42;   // bottom of upper cabinets (~1.4 m)
    const TOE = 0.09;       // toe-kick recess height

    // Build one straight run of base+worktop+upstand+splashback+uppers+handles.
    // axis 'x' = run extends along X at fixed z (wall at -Z); 'z' = along Z at fixed x (wall at -X).
    const buildRun = (run) => {
      const { axis, length, center, wallPos, withUpper = true, withSplash = true } = run;
      const grp = new Group();
      scene.add(grp);

      const bodyH = BASE_H - TOE;
      const REVEAL = 0.003; // ~3mm reveal gap between adjacent modules

      // ── DISCRETE MODULE SNAPPING (shared with the BOM via fitModules) ──
      // Divide this run into real standard-width modules. The visible cabinet
      // count == fitModules(runMm).length, the SAME function the BOM uses.
      const runMm = Math.max(0, length * 1000);
      const mods = fitModules(runMm); // [{ width(mm), filler }]
      // Guard: if nothing fits (tiny run), fall back to a single body so we
      // never render an empty run; widths still sum to the run length.
      const fitList = mods.length ? mods : [{ width: runMm, filler: false }];
      // Convert to metres and figure each module's centre offset along the run.
      // We lay modules out from -length/2, inserting a reveal between bodies so
      // the run still spans ~`length` overall.
      const widthsM = fitList.map(m => Math.max(0.001, (Number(m.width) || 0) / 1000));
      const n = widthsM.length;
      const totalReveals = REVEAL * Math.max(0, n - 1);
      const bodySpan = Math.max(0.001, length - totalReveals);
      const widthsSum = widthsM.reduce((s, w) => s + w, 0) || 1;
      // Normalise widths so bodies + reveals exactly fill `length` (no drift).
      const scaledW = widthsM.map(w => (w / widthsSum) * bodySpan);

      // Helper: signed offset of each module centre from the run centre.
      const offsets = [];
      let cursor = -length / 2;
      for (let i = 0; i < n; i += 1) {
        const w = scaledW[i];
        offsets.push(cursor + w / 2);
        cursor += w + REVEAL;
      }

      // ── Per-module base body + door front + handle ──
      for (let i = 0; i < n; i += 1) {
        const w = scaledW[i];
        const off = offsets[i];
        // body (slightly inset width so the reveal reads as a gap)
        const mw = Math.max(0.05, w - REVEAL);
        const bGeo =
          axis === 'x'
            ? roundedBox(mw, bodyH, BASE_D, 0.012)
            : rotateGeoY(roundedBox(mw, bodyH, BASE_D, 0.012));
        const body = addMesh(bGeo, 'cabinet');
        const bZ = axis === 'x' ? wallPos + BASE_D / 2 : center + off;
        const bX = axis === 'x' ? center + off : wallPos + BASE_D / 2;
        body.position.set(bX, TOE + bodyH / 2, bZ);

        // door front (thin slab proud of the carcass) — picks as 'cabinet'
        const frontDepth = 0.02;
        const fGeo =
          axis === 'x'
            ? roundedBox(Math.max(0.04, mw - 0.02), bodyH - 0.04, frontDepth, 0.008)
            : rotateGeoY(roundedBox(Math.max(0.04, mw - 0.02), bodyH - 0.04, frontDepth, 0.008));
        const front = addMesh(fGeo, 'cabinet');
        const fFront = BASE_D / 2 + frontDepth / 2 + 0.002;
        const fZ = axis === 'x' ? wallPos + BASE_D / 2 + fFront : center + off;
        const fX = axis === 'x' ? center + off : wallPos + BASE_D / 2 + fFront;
        front.position.set(fX, TOE + bodyH / 2, fZ);

        // one handle per module front
        const frontOff = BASE_D + frontDepth + 0.012;
        const hGeo = new CylinderGeometry(0.01, 0.01, 0.14, 12);
        const handle = addMesh(hGeo, 'handle');
        handle.rotation.z = Math.PI / 2;
        if (axis === 'x') {
          handle.position.set(center + off, BASE_H - 0.16, wallPos + frontOff);
        } else {
          handle.rotation.y = Math.PI / 2;
          handle.position.set(wallPos + frontOff, BASE_H - 0.16, center + off);
        }

        // matching upper module + handle (where uppers are present)
        if (withUpper) {
          const uGeo =
            axis === 'x'
              ? roundedBox(mw, UPPER_H, UPPER_D, 0.012)
              : rotateGeoY(roundedBox(mw, UPPER_H, UPPER_D, 0.012));
          const upper = addMesh(uGeo, 'cabinet');
          const uZ = axis === 'x' ? wallPos + UPPER_D / 2 : center + off;
          const uX = axis === 'x' ? center + off : wallPos + UPPER_D / 2;
          upper.position.set(uX, UPPER_Y + UPPER_H / 2, uZ);

          const hGeo2 = new CylinderGeometry(0.009, 0.009, 0.12, 12);
          const handle2 = addMesh(hGeo2, 'handle');
          handle2.rotation.z = Math.PI / 2;
          const upFront = UPPER_D + 0.012;
          if (axis === 'x') {
            handle2.position.set(center + off, UPPER_Y + 0.06, wallPos + upFront);
          } else {
            handle2.rotation.y = Math.PI / 2;
            handle2.position.set(wallPos + upFront, UPPER_Y + 0.06, center + off);
          }
        }
      }

      // Recessed plinth / toe-kick stays continuous under the run.
      const baseZ = axis === 'x' ? wallPos + BASE_D / 2 : center;
      const baseX = axis === 'x' ? center : wallPos + BASE_D / 2;
      const plinthGeo =
        axis === 'x'
          ? new BoxGeometry(Math.max(0.05, length - 0.04), TOE, BASE_D - 0.12)
          : new BoxGeometry(BASE_D - 0.12, TOE, Math.max(0.05, length - 0.04));
      const plinth = addMesh(plinthGeo, 'appliance', { cast: false });
      plinth.position.set(baseX, TOE / 2, baseZ);

      // Worktop slab stays CONTINUOUS over the whole run (worktops aren't modular).
      const wGeo =
        axis === 'x'
          ? roundedBox(length + 0.04, TOP_T, BASE_D + 0.04, 0.01)
          : rotateGeoY(roundedBox(length + 0.04, TOP_T, BASE_D + 0.04, 0.01));
      const wtop = addMesh(wGeo, 'worktop');
      wtop.position.set(baseX, BASE_H + TOP_T / 2, baseZ);

      // Upstand behind the worktop (same stone) for a built-in feel.
      const upGeo =
        axis === 'x'
          ? new BoxGeometry(length, UPSTAND_H, 0.03)
          : new BoxGeometry(0.03, UPSTAND_H, length);
      const upstand = addMesh(upGeo, 'worktop', { cast: false });
      const upOff = wallPos + 0.02;
      if (axis === 'x') upstand.position.set(center, BASE_H + TOP_T + UPSTAND_H / 2, upOff);
      else upstand.position.set(upOff, BASE_H + TOP_T + UPSTAND_H / 2, center);

      // Splashback strip on wall (continuous).
      if (withSplash) {
        const sGeo =
          axis === 'x'
            ? new BoxGeometry(length, SPLASH_H, 0.015)
            : new BoxGeometry(0.015, SPLASH_H, length);
        const splash = addMesh(sGeo, 'splashback', { cast: false });
        const sOff = 0.009;
        const sX = axis === 'x' ? center : wallPos + sOff;
        const sZ = axis === 'x' ? wallPos + sOff : center;
        splash.position.set(sX, BASE_H + TOP_T + UPSTAND_H + SPLASH_H / 2, sZ);
      }
    };

    // ---- Appliance materials & block builders ------------------------------
    // All appliance meshes carry userData.surfaceKey='appliance' (so they pick
    // as an appliance and follow the shared 'appliance' material's pulse), but
    // some get a per-mesh material *variant* so they read correctly: dark glass
    // for oven/hob/dishwasher fronts, a lighter metal for the sink basin.
    const applianceMatVariants = {}; // variantKey -> THREE.Material (disposed on cleanup)
    function applianceVariant(variantKey, spec) {
      if (applianceMatVariants[variantKey]) return applianceMatVariants[variantKey];
      const m = new MeshPhysicalMaterial({
        color: new Color(spec.hex),
        roughness: Number.isFinite(spec.rough) ? spec.rough : 0.3,
        metalness: Number.isFinite(spec.metal) ? spec.metal : 0.6,
        clearcoat: Number.isFinite(spec.clearcoat) ? spec.clearcoat : 0.4,
        clearcoatRoughness: Number.isFinite(spec.clearcoatRough) ? spec.clearcoatRough : 0.18,
        envMapIntensity: 1.0,
      });
      m.userData = { baseEmissive: new Color(0x000000) };
      applianceMatVariants[variantKey] = m;
      return m;
    }
    // Dark glass front (oven door / dishwasher integrated panel / hob glass).
    const darkGlass = () => applianceVariant('darkGlass', { hex: '#1c1d20', rough: 0.12, metal: 0.5, clearcoat: 0.85, clearcoatRough: 0.08 });
    // Lighter brushed metal for the sink basin.
    const sinkMetal = () => applianceVariant('sinkMetal', { hex: '#d6d9dc', rough: 0.32, metal: 0.95, clearcoat: 0.3, clearcoatRough: 0.2 });

    // Generic appliance block (shared 'appliance' metal material).
    function addAppliance(w, hh, d, pos, mat) {
      const a = addMesh(roundedBox(w, hh, d, 0.012), 'appliance');
      a.position.set(pos.x, pos.y, pos.z);
      if (mat) a.material = mat; // keep surfaceKey='appliance', swap the look
      return a;
    }

    // Tall fridge/freezer block (full height) at a run end.
    function addFridge(x, z, wallY) {
      const fh = Math.min(1.95, Math.max(1.6, WALL_H - 0.6)); // full-height, clamped under ceiling
      addAppliance(0.78, fh, 0.62, { x, y: TOE + fh / 2, z });
      // a thin dark seam/handle line down the front so it reads as a fridge
      const seam = addMesh(new BoxGeometry(0.02, fh * 0.5, 0.02), 'appliance', { cast: false });
      seam.material = darkGlass();
      seam.position.set(x + 0.3, TOE + fh / 2, z + 0.32);
    }

    // Built-in oven housing with a dark glass front (under-counter style).
    function addOven(x, z) {
      const oh = 0.85;
      addAppliance(0.6, oh, 0.6, { x, y: TOE + oh / 2 + 0.02, z });
      // dark glass door proud of the housing
      const door = addMesh(new BoxGeometry(0.54, 0.5, 0.02), 'appliance', { cast: false });
      door.material = darkGlass();
      door.position.set(x, TOE + oh / 2 + 0.02, z + 0.31);
    }

    // Hob inset - a dark glossy glass slab flush in the worktop, mid-run.
    function addHob(x, z) {
      const hob = addMesh(new BoxGeometry(0.58, 0.012, 0.5), 'appliance', { cast: false });
      hob.material = darkGlass();
      hob.position.set(x, BASE_H + TOP_T + 0.006, z);
    }

    // Extractor hood block above the hob, on the wall / uppers line.
    function addHood(x, zWall) {
      addAppliance(0.72, 0.34, 0.46, { x, y: UPPER_Y + 0.22, z: zWall + 0.27 });
    }

    // Sink — an inset basin on the worktop in lighter metal, with a mixer tap.
    function addSink(x, z) {
      const basin = addMesh(new BoxGeometry(0.5, 0.02, 0.4), 'appliance', { cast: false });
      basin.material = sinkMetal();
      basin.position.set(x, BASE_H + TOP_T + 0.002, z);
      // recessed bowl (slightly below the worktop)
      const bowl = addMesh(new BoxGeometry(0.4, 0.12, 0.3), 'appliance', { cast: false });
      bowl.material = sinkMetal();
      bowl.position.set(x, BASE_H + TOP_T - 0.06, z);
      // mixer tap (thin cylinder) behind the basin
      const tap = addMesh(new CylinderGeometry(0.012, 0.012, 0.26, 12), 'appliance', { cast: false });
      tap.material = sinkMetal();
      tap.position.set(x, BASE_H + TOP_T + 0.13, z - 0.16);
    }

    // Dishwasher — an integrated front in a base module (subtly different front).
    function addDishwasher(x, z) {
      const dh = BASE_H - TOE - 0.02;
      const front = addMesh(roundedBox(0.58, dh, 0.02, 0.008), 'appliance', { cast: false });
      front.material = darkGlass();
      front.position.set(x, TOE + dh / 2, z + BASE_D / 2 + 0.012);
    }

    // ---- Layout per shape (built to REAL run lengths) -----------------------
    // Wall planes from the resolved room. Back wall on -Z, left/right on +/-X.
    const wallZ = -ROOM_Z / 2;          // back wall plane (runs along X here)
    const wallX = -ROOM_X / 2;          // left wall plane (runs along Z here)
    const rightZWall = ROOM_Z / 2;      // opposite (front) wall, for galley/u-shape
    const rightXWall = ROOM_X / 2;      // opposite side wall

    // Run length helpers: convert a layoutParam mm value to metres, fall back to
    // the room extent, and cap to the wall it sits on so it never exceeds the room.
    const capX = ROOM_X - 0.05;         // max along the back wall
    const capZ = ROOM_Z - 0.05;         // max along a side wall
    const runX = (mm) => clampNum(mmToM(mm, roomLenMm) * 1000, 600, capX * 1000, capX * 1000) / 1000;
    const runZ = (mm) => clampNum(mmToM(mm, roomWidMm) * 1000, 600, capZ * 1000, capZ * 1000) / 1000;

    // Centre a side-wall run so it starts at the back wall and grows toward the room.
    const sideCenterFromBack = (len) => wallZ + BASE_D / 2 + len / 2;

    const buildIsland = (z, islWm, islDm, thick = 0.08) => {
      const w = clampNum(islWm * 1000, 600, (ROOM_X - 0.8) * 1000, 2200) / 1000;
      const d = clampNum(islDm * 1000, 400, (ROOM_Z - 1.4) * 1000, 1000) / 1000;
      const islBase = addMesh(roundedBox(w, BASE_H - TOE, d, 0.02), 'cabinet');
      islBase.position.set(0, TOE + (BASE_H - TOE) / 2, z);
      const islPlinth = addMesh(new BoxGeometry(Math.max(0.2, w - 0.1), TOE, Math.max(0.2, d - 0.12)), 'appliance', { cast: false });
      islPlinth.position.set(0, TOE / 2, z);
      // thicker worktop slab on the island (overhangs)
      const islTop = addMesh(roundedBox(w + 0.14, thick, d + 0.12, 0.012), 'worktop');
      islTop.position.set(0, BASE_H + thick / 2, z);
      // a couple of island handles
      for (let i = 0; i < 2; i += 1) {
        const hx = i === 0 ? -w * 0.27 : w * 0.27;
        const hh = new CylinderGeometry(0.01, 0.01, 0.16, 12);
        const handle = addMesh(hh, 'handle');
        handle.rotation.z = Math.PI / 2;
        handle.position.set(hx, BASE_H - 0.16, z + d / 2 + 0.01);
      }
    };

    const buildPeninsula = (penWm, penDm) => {
      // A block projecting into the room from the back run (no uppers).
      const w = clampNum(penWm * 1000, 600, (ROOM_X - 0.6) * 1000, 1800) / 1000; // depth into room
      const d = clampNum(penDm * 1000, 400, (ROOM_Z - 1.0) * 1000, 600) / 1000;  // breadth
      const x = -ROOM_X / 4;                       // offset toward the left third
      const startZ = wallZ + BASE_D;               // begins just off the back run
      const centerZ = startZ + w / 2;
      const body = addMesh(rotateGeoY(roundedBox(w, BASE_H - TOE, d, 0.015)), 'cabinet');
      body.position.set(x, TOE + (BASE_H - TOE) / 2, centerZ);
      const plinth = addMesh(new BoxGeometry(Math.max(0.2, d - 0.12), TOE, Math.max(0.2, w - 0.04)), 'appliance', { cast: false });
      plinth.position.set(x, TOE / 2, centerZ);
      const top = addMesh(rotateGeoY(roundedBox(w + 0.04, TOP_T, d + 0.08, 0.01)), 'worktop');
      top.position.set(x, BASE_H + TOP_T / 2, centerZ);
    };

    // Clamp a position to the room interior so nothing exceeds the walls.
    const clampX = (x) => clampNum(x, -ROOM_X / 2 + 0.4, ROOM_X / 2 - 0.4, 0);
    const clampZ = (z) => clampNum(z, -ROOM_Z / 2 + 0.4, ROOM_Z / 2 - 0.4, 0);

    const layouts = {
      straight: () => {
        const L = runX(lp.wallLen);
        buildRun({ axis: 'x', length: L, center: 0, wallPos: wallZ });
        const end = Math.min(L / 2 - 0.45, ROOM_X / 2 - 0.45); // run-end x for the tall fridge
        if (wantApp('fridge')) addFridge(clampX(end), wallZ + 0.31);
        if (wantApp('oven')) addOven(clampX(-end * 0.6), wallZ + 0.3);
        if (wantApp('hob')) addHob(clampX(0.2), wallZ + 0.31);
        if (wantApp('hood')) addHood(clampX(0.2), wallZ);
        if (wantApp('sink')) addSink(clampX(-0.2), wallZ + 0.31);
        if (wantApp('dishwasher')) addDishwasher(clampX(end * 0.3), wallZ);
      },
      single: () => { layouts.straight(); },
      'l-shape': () => {
        const A = runX(lp.wallA);                 // back run
        const B = runZ(lp.wallB);                 // left-wall run
        buildRun({ axis: 'x', length: A, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: B, center: sideCenterFromBack(B), wallPos: wallX, withSplash: true });
        const ovenX = clampX(-Math.min(A / 2 - 0.45, 0.8));
        if (wantApp('oven')) addOven(ovenX, wallZ + 0.3);
        if (wantApp('hob')) addHob(clampX(Math.min(A / 4, 0.7)), wallZ + 0.31);
        if (wantApp('hood')) addHood(clampX(Math.min(A / 4, 0.7)), wallZ);
        if (wantApp('sink')) addSink(clampX(Math.min(A / 2 - 0.5, 1.2)), wallZ + 0.31);
        // fridge at the far end of the side run (tall unit block)
        if (wantApp('fridge')) addFridge(wallX + 0.4, clampZ(sideCenterFromBack(B) + B / 2 - 0.5));
        if (wantApp('dishwasher')) addDishwasher(ovenX - 0.65, wallZ);
      },
      galley: () => {
        const L = runX(lp.wallLen);
        // Gap between the two opposing runs, clamped to room width.
        const gapM = clampNum(mmToM(lp.galleyGap, 1400) * 1000, 900, Math.max(900, (roomWidMm - 1200)), 1400) / 1000;
        const halfGap = gapM / 2;
        const backZ = -halfGap - BASE_D;          // back run wall
        buildRun({ axis: 'x', length: L, center: 0, wallPos: backZ });
        buildRun({ axis: 'x', length: L, center: 0, wallPos: halfGap, withUpper: false });
        if (wantApp('oven')) addOven(clampX(-Math.min(L / 4, 0.8)), backZ + 0.3);
        if (wantApp('hob')) addHob(0, backZ + 0.31);
        if (wantApp('hood')) addHood(0, backZ);
        if (wantApp('fridge')) addFridge(clampX(Math.min(L / 2 - 0.45, ROOM_X / 2 - 0.45)), backZ + 0.31);
        // sink on the opposite (front) run worktop
        if (wantApp('sink')) addSink(0, halfGap + BASE_D / 2);
        if (wantApp('dishwasher')) addDishwasher(clampX(-0.7), halfGap + BASE_D - 0.62);
      },
      'u-shape': () => {
        const A = runX(lp.uA);                    // back
        const B = runZ(lp.uB);                    // left
        const C = runZ(lp.uC);                    // right
        buildRun({ axis: 'x', length: A, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: B, center: sideCenterFromBack(B), wallPos: wallX });
        buildRun({ axis: 'z', length: C, center: sideCenterFromBack(C), wallPos: rightXWall - BASE_D, withUpper: false });
        if (wantApp('oven')) addOven(0, wallZ + 0.3);
        if (wantApp('hob')) addHob(clampX(Math.min(A / 4, 0.8)), wallZ + 0.31);
        if (wantApp('hood')) addHood(clampX(Math.min(A / 4, 0.8)), wallZ);
        // fridge at the end of the left run; sink on the right run
        if (wantApp('fridge')) addFridge(wallX + 0.4, clampZ(sideCenterFromBack(B) + B / 2 - 0.5));
        if (wantApp('sink')) addSink(clampX(rightXWall - BASE_D / 2 - 0.05), clampZ(sideCenterFromBack(C)));
        if (wantApp('dishwasher')) addDishwasher(clampX(-Math.min(A / 4, 0.8)), wallZ);
      },
      island: () => {
        const L = runX(lp.wallLen);
        buildRun({ axis: 'x', length: L, center: 0, wallPos: wallZ });
        const islWm = mmToM(lp.islandW, 2400);
        const islDm = mmToM(lp.islandD, 1000);
        const islZ = Math.min(ROOM_Z / 2 - islDm / 2 - 0.4, wallZ + BASE_D + 1.0 + islDm / 2);
        const zIsl = Number.isFinite(islZ) ? islZ : 1.4;
        buildIsland(zIsl, islWm, islDm, 0.08);
        if (wantApp('oven')) addOven(clampX(-Math.min(L / 2 - 0.45, 1.4)), wallZ + 0.3);
        if (wantApp('hood')) addHood(0, wallZ);
        if (wantApp('hob')) addHob(0, clampZ(zIsl)); // hob inset into the island
        if (wantApp('fridge')) addFridge(clampX(Math.min(L / 2 - 0.45, ROOM_X / 2 - 0.45)), wallZ + 0.31);
        if (wantApp('sink')) addSink(clampX(Math.min(L / 2 - 0.6, 1.0)), wallZ + 0.31);
        if (wantApp('dishwasher')) addDishwasher(clampX(-Math.min(L / 4, 0.6)), wallZ);
      },
      peninsula: () => {
        const L = runX(lp.wallLen);
        buildRun({ axis: 'x', length: L, center: 0, wallPos: wallZ });
        buildPeninsula(mmToM(lp.penW, 1800), mmToM(lp.penD, 600));
        if (wantApp('oven')) addOven(clampX(Math.min(L / 2 - 0.45, 1.4)), wallZ + 0.3);
        if (wantApp('hob')) addHob(clampX(0.2), wallZ + 0.31);
        if (wantApp('hood')) addHood(clampX(0.2), wallZ);
        if (wantApp('fridge')) addFridge(clampX(-Math.min(L / 2 - 0.45, ROOM_X / 2 - 0.45)), wallZ + 0.31);
        if (wantApp('sink')) addSink(clampX(-0.4), wallZ + 0.31);
        if (wantApp('dishwasher')) addDishwasher(clampX(Math.min(L / 4, 0.7)), wallZ);
      },
    };

    (layouts[shape] || layouts['l-shape'])();

    // ---- Apply current materials immediately --------------------------------
    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    // ---- Controls -----------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(2.4, fitDist * 0.45);
    controls.maxDistance = Math.max(12, fitDist * 2.0);
    controls.maxPolarAngle = Math.PI / 2.05; // never under the floor
    controls.minPolarAngle = 0.25;
    controls.enablePan = false; // keep camera centred on room
    controls.autoRotate = false; // gentle auto-rotate optional-off
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 0.95, Math.min(0.4, ROOM_Z * 0.06)); // around counter height
    controls.update();
    controlsRef.current = controls;

    // ---- Picking (click-vs-drag discrimination) ----------------------------
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    let downXY = null;
    const onPointerDown = (e) => { downXY = [e.clientX, e.clientY]; };
    const onPointerUp = (e) => {
      if (!downXY) return;
      const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
      downXY = null;
      if (moved > 6 || !pickRef.current) return; // treat as drag
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

    // ---- Render loop --------------------------------------------------------
    const clock = new Clock();
    function render() {
      renderer.render(scene, camera);
    }
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      // subtle emissive pulse on the active surface
      const t = clock.getElapsedTime();
      const pulse = 0.16 + 0.1 * Math.sin(t * 3);
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

    // ---- Responsive width ---------------------------------------------------
    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth || width;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    });
    ro.observe(mount);

    // ---- Cleanup ------------------------------------------------------------
    return () => {
      cancelAnimationFrame(frameRef.current);
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
      // dispose per-mesh appliance material variants (dark glass / sink metal)
      Object.values(applianceMatVariants).forEach((m) => { if (m && m.dispose) m.dispose(); });
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
  }, [shape, height, dimsSig, lpSig, appSig]);

  // ---- Live material updates (no scene rebuild) -----------------------------
  useEffect(() => {
    if (!surfaceMatsRef.current || !rendererRef.current) return;
    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });
  }, [materials]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}
    />
  );
}

// ---- Helpers ----------------------------------------------------------------

// Rotate an extruded geometry 90deg about Y so a run can run along Z.
function rotateGeoY(geo) {
  try {
    geo.rotateY(Math.PI / 2);
    geo.computeVertexNormals();
  } catch (e) { /* ignore */ }
  return geo;
}

// A very cheap equirectangular gradient used only as an env-map fallback.
function makeGradientEnv() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#fbf8f2');
  g.addColorStop(0.55, '#e9e4db');
  g.addColorStop(1, '#bdb4a6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const _loader = new TextureLoader();

/**
 * Apply a materials prop onto the shared per-surface materials.
 * - hex => material.color
 * - texture_url => loaded as .map, with graceful fallback to hex on error.
 */
function applyMaterials(materials, mats, disposables, onChange) {
  if (!mats) return;
  Object.entries(materials || {}).forEach(([key, spec]) => {
    const m = mats[key];
    if (!m || !spec) return;

    if (spec.hex) {
      try {
        m.color.set(spec.hex);
      } catch (e) {
        /* invalid color string - ignore, keep previous */
      }
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
            } catch (inner) {
              /* assignment failed - keep hex */
            }
          },
          undefined,
          () => {
            // load error => graceful fallback: drop any map, keep hex color
            if (m.map) {
              m.map.dispose();
              m.map = null;
              m.needsUpdate = true;
              if (onChange) onChange();
            }
          }
        );
      } catch (e) {
        /* loader threw synchronously - keep hex */
      }
    } else if (m.map) {
      // texture removed from spec => revert to hex
      m.map.dispose();
      m.map = null;
      m.needsUpdate = true;
    }
  });
  if (onChange) onChange();
}
