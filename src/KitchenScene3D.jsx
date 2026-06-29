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

export default function KitchenScene3D({
  materials = {},
  shape = 'l-shape',
  activeSurface = null,
  onPickSurface = null,
  height = 460,
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

  // ---- One-time scene construction ------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const width = mount.clientWidth || 640;
    const h = height;

    // ---- Scene + soft warm off-white background ----------------------------
    const scene = new Scene();
    scene.background = new Color('#f4f1ea');
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(42, width / h, 0.1, 100);
    // Flattering 3/4 angle.
    camera.position.set(4.6, 3.1, 5.6);
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

    // ---- Room dimensions ----------------------------------------------------
    const ROOM = 7; // floor side length
    const WALL_H = 3.2;

    // Floor (large plane, receives shadows).
    const floor = addMesh(new PlaneGeometry(ROOM, ROOM), 'floor', { cast: false });
    floor.rotation.x = -Math.PI / 2;
    // Wood/tile texture should repeat if a map is applied.
    surfaceMatsRef.current.floor.userData.repeat = [4, 4];

    // Back wall (along -Z) and Left wall (along -X)
    const backWall = addMesh(new PlaneGeometry(ROOM, WALL_H), 'wall', { cast: false });
    backWall.position.set(0, WALL_H / 2, -ROOM / 2);

    const leftWall = addMesh(new PlaneGeometry(ROOM, WALL_H), 'wall', { cast: false });
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ROOM / 2, WALL_H / 2, 0);

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

    // hood helper (uses appliance surface) - declared before use in layouts
    function addHood(x, zWall) {
      addAppliance(0.72, 0.34, 0.46, { x, y: UPPER_Y + 0.22, z: zWall + 0.27 });
    }

    // Build one straight run of base+worktop+upstand+splashback+uppers+handles.
    // axis 'x' = run extends along X at fixed z (wall at -Z); 'z' = along Z at fixed x (wall at -X).
    const buildRun = (run) => {
      const { axis, length, center, wallPos, withUpper = true, withSplash = true } = run;
      const grp = new Group();
      scene.add(grp);

      // Base cabinet body (rounded front edges), lifted to leave a toe-kick.
      const bodyH = BASE_H - TOE;
      const baseGeo =
        axis === 'x'
          ? roundedBox(length, bodyH, BASE_D, 0.015)
          : rotateGeoY(roundedBox(length, bodyH, BASE_D, 0.015));
      const base = addMesh(baseGeo, 'cabinet');
      const baseZ = axis === 'x' ? wallPos + BASE_D / 2 : center;
      const baseX = axis === 'x' ? center : wallPos + BASE_D / 2;
      base.position.set(baseX, TOE + bodyH / 2, baseZ);

      // Recessed plinth / toe-kick (dark, matte) using appliance material tone.
      const plinthGeo =
        axis === 'x'
          ? new BoxGeometry(length - 0.04, TOE, BASE_D - 0.12)
          : new BoxGeometry(BASE_D - 0.12, TOE, length - 0.04);
      const plinth = addMesh(plinthGeo, 'appliance', { cast: false });
      plinth.position.set(baseX, TOE / 2, baseZ);

      // Worktop slab (overhangs slightly), polished stone.
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

      // Splashback strip on wall.
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

      // Upper cabinets with a slight reveal (gap above worktop run).
      if (withUpper) {
        const uGeo =
          axis === 'x'
            ? roundedBox(length, UPPER_H, UPPER_D, 0.012)
            : rotateGeoY(roundedBox(length, UPPER_H, UPPER_D, 0.012));
        const upper = addMesh(uGeo, 'cabinet');
        const uZ = axis === 'x' ? wallPos + UPPER_D / 2 : center;
        const uX = axis === 'x' ? center : wallPos + UPPER_D / 2;
        upper.position.set(uX, UPPER_Y + UPPER_H / 2, uZ);
      }

      // Handles - thin bars on base + upper fronts.
      const handleCount = Math.max(2, Math.round(length / 0.8));
      for (let i = 0; i < handleCount; i += 1) {
        const t = handleCount === 1 ? 0.5 : i / (handleCount - 1);
        const along = -length / 2 + 0.22 + t * (length - 0.44);
        const frontOff = BASE_D + 0.012;
        // base handle
        const hGeo = new CylinderGeometry(0.01, 0.01, 0.14, 12);
        const handle = addMesh(hGeo, 'handle');
        handle.rotation.z = Math.PI / 2; // lie horizontal
        if (axis === 'x') {
          handle.position.set(center + along, BASE_H - 0.16, wallPos + frontOff);
        } else {
          handle.rotation.y = Math.PI / 2;
          handle.position.set(wallPos + frontOff, BASE_H - 0.16, center + along);
        }
        // upper handle (only where there are uppers)
        if (withUpper) {
          const hGeo2 = new CylinderGeometry(0.009, 0.009, 0.12, 12);
          const handle2 = addMesh(hGeo2, 'handle');
          handle2.rotation.z = Math.PI / 2;
          const upFront = UPPER_D + 0.012;
          if (axis === 'x') {
            handle2.position.set(center + along, UPPER_Y + 0.06, wallPos + upFront);
          } else {
            handle2.rotation.y = Math.PI / 2;
            handle2.position.set(wallPos + upFront, UPPER_Y + 0.06, center + along);
          }
        }
      }
    };

    // ---- Appliance block builder -------------------------------------------
    function addAppliance(w, hh, d, pos) {
      const a = addMesh(roundedBox(w, hh, d, 0.012), 'appliance');
      a.position.set(pos.x, pos.y, pos.z);
      return a;
    }

    // Hob inset - a dark glossy slab flush in the worktop.
    function addHob(x, z) {
      const hob = addMesh(new BoxGeometry(0.58, 0.012, 0.5), 'appliance', { cast: false });
      hob.position.set(x, BASE_H + TOP_T + 0.006, z);
    }

    // ---- Layout per shape ---------------------------------------------------
    const wallZ = -ROOM / 2; // back wall plane
    const wallX = -ROOM / 2; // left wall plane
    const RUN_LEN = 4.0;

    const buildIsland = (z = 1.4, thick = 0.07) => {
      const islBase = addMesh(roundedBox(2.2, BASE_H - TOE, 1.0, 0.02), 'cabinet');
      islBase.position.set(0, TOE + (BASE_H - TOE) / 2, z);
      const islPlinth = addMesh(new BoxGeometry(2.1, TOE, 0.88), 'appliance', { cast: false });
      islPlinth.position.set(0, TOE / 2, z);
      // thicker worktop slab on the island
      const islTop = addMesh(roundedBox(2.34, thick, 1.12, 0.012), 'worktop');
      islTop.position.set(0, BASE_H + thick / 2, z);
      // a couple of island handles
      for (let i = 0; i < 2; i += 1) {
        const hx = i === 0 ? -0.6 : 0.6;
        const hh = new CylinderGeometry(0.01, 0.01, 0.16, 12);
        const handle = addMesh(hh, 'handle');
        handle.rotation.z = Math.PI / 2;
        handle.position.set(hx, BASE_H - 0.16, z + 0.51);
      }
    };

    const layouts = {
      straight: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        addAppliance(0.8, 1.85, 0.62, { x: 1.6, y: 0.925, z: wallZ + 0.31 }); // fridge
        addAppliance(0.62, 0.85, 0.6, { x: -1.4, y: 0.95, z: wallZ + 0.31 }); // oven
        addHob(0.2, wallZ + 0.31);
      },
      'l-shape': () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: wallX, withSplash: true });
        addAppliance(0.62, 0.85, 0.6, { x: -0.8, y: 0.95, z: wallZ + 0.31 }); // oven
        addHood(-0.8, wallZ);
        addHob(0.7, wallZ + 0.31);
        addAppliance(0.8, 1.85, 0.62, { x: wallX + 0.31, y: 0.925, z: 2.2 }); // fridge
      },
      galley: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: ROOM / 2 - BASE_D, withUpper: false });
        addAppliance(0.62, 0.85, 0.6, { x: 0, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
        addHob(0, wallZ + 0.31);
      },
      'u-shape': () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: wallX });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: ROOM / 2 - BASE_D, withUpper: false });
        addAppliance(0.62, 0.85, 0.6, { x: 0, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
        addHob(0.8, wallZ + 0.31);
      },
      island: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildIsland(1.4, 0.08);
        addAppliance(0.62, 0.85, 0.6, { x: -1.4, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
        addHob(0, 1.4); // hob inset into the island
      },
      peninsula: () => {
        // back run + an attached peninsula run extending out into the room.
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: 2.6, center: 1.3, wallPos: -0.31, withUpper: false, withSplash: false });
        addAppliance(0.62, 0.85, 0.6, { x: -1.4, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
        addHob(0, wallZ + 0.31);
      },
    };

    (layouts[shape] || layouts['l-shape'])();

    // ---- Apply current materials immediately --------------------------------
    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    // ---- Controls -----------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.4;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI / 2.05; // never under the floor
    controls.minPolarAngle = 0.25;
    controls.enablePan = false; // keep camera centred on room
    controls.autoRotate = false; // gentle auto-rotate optional-off
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 0.95, 0.4); // around counter height
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
  }, [shape, height]);

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
