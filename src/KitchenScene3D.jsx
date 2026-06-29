import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * KitchenScene3D — standalone interactive 3D kitchen.
 *
 * Props:
 *   materials   : {
 *                   cabinet:    { hex?: string, texture_url?: string },
 *                   worktop:    { hex?, texture_url? },
 *                   splashback: { hex?, texture_url? },
 *                   wall:       { hex?, texture_url? },
 *                   floor:      { hex?, texture_url? },
 *                   handle:     { hex?, texture_url? },
 *                 } — any subset; hex => material color, texture_url => map (falls back to hex on error).
 *   shape       : 'l-shape' | 'galley' | 'u-shape' | 'island' | 'straight'  (default 'l-shape')
 *   activeSurface : string  — surface key to subtly highlight (emissive pulse).
 *   onPickSurface : fn(surfaceKey) — called on click with the picked mesh's surface key.
 *   height      : number (default 460)
 *
 * Surface keys (used by onPickSurface & materials): one of
 *   'cabinet' | 'worktop' | 'splashback' | 'wall' | 'floor' | 'handle' | 'appliance'
 */

// Neutral PBR defaults per surface key
const DEFAULTS = {
  cabinet: { hex: '#e8e4dc', rough: 0.55, metal: 0.05 },
  worktop: { hex: '#3a3a3e', rough: 0.35, metal: 0.1 },
  splashback: { hex: '#cfd4d6', rough: 0.25, metal: 0.05 },
  wall: { hex: '#f2efe9', rough: 0.95, metal: 0.0 },
  floor: { hex: '#9a8472', rough: 0.8, metal: 0.0 },
  handle: { hex: '#9aa0a6', rough: 0.3, metal: 0.85 },
  appliance: { hex: '#b9bcc0', rough: 0.4, metal: 0.6 },
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eceae6');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 100);
    camera.position.set(4.2, 3.2, 5.4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // ---- Lights -------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8472, 0.55);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 8, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 30;
    dir.shadow.camera.left = -8;
    dir.shadow.camera.right = 8;
    dir.shadow.camera.top = 8;
    dir.shadow.camera.bottom = -8;
    scene.add(dir);

    // ---- Material factory (one shared material per surface key) -------------
    const makeMat = (key) => {
      const d = DEFAULTS[key] || DEFAULTS.cabinet;
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(d.hex),
        roughness: d.rough,
        metalness: d.metal,
      });
      m.userData = { baseEmissive: new THREE.Color(0x000000) };
      surfaceMatsRef.current[key] = m;
      return m;
    };
    Object.keys(DEFAULTS).forEach(makeMat);

    const track = (geo) => {
      disposablesRef.current.push(geo);
      return geo;
    };
    const addMesh = (geo, surfaceKey, opts = {}) => {
      const mesh = new THREE.Mesh(track(geo), surfaceMatsRef.current[surfaceKey]);
      mesh.userData.surfaceKey = surfaceKey;
      if (opts.cast !== false) mesh.castShadow = true;
      if (opts.receive !== false) mesh.receiveShadow = true;
      scene.add(mesh);
      meshesRef.current.push(mesh);
      return mesh;
    };

    // ---- Room dimensions ----------------------------------------------------
    const ROOM = 7; // floor side length
    const WALL_H = 3.2;

    // Floor
    const floor = addMesh(new THREE.PlaneGeometry(ROOM, ROOM), 'floor', { cast: false });
    floor.rotation.x = -Math.PI / 2;

    // Back wall (along -Z) and Left wall (along -X)
    const backWall = addMesh(new THREE.PlaneGeometry(ROOM, WALL_H), 'wall', { cast: false });
    backWall.position.set(0, WALL_H / 2, -ROOM / 2);

    const leftWall = addMesh(new THREE.PlaneGeometry(ROOM, WALL_H), 'wall', { cast: false });
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-ROOM / 2, WALL_H / 2, 0);

    // ---- Cabinet run builder ------------------------------------------------
    const BASE_H = 0.9;
    const BASE_D = 0.62;
    const TOP_T = 0.05; // worktop thickness
    const SPLASH_H = 0.5;
    const UPPER_H = 0.7;
    const UPPER_D = 0.34;
    const UPPER_Y = 1.55; // bottom of upper cabinets

    // hood helper (uses appliance surface) — declared before use in layouts
    function addHood(x, zWall) {
      addAppliance(0.7, 0.35, 0.45, { x, y: UPPER_Y + 0.2, z: zWall + 0.25 });
    }

    // Build one straight run of base+worktop+splashback+uppers+handles.
    // `axis`: 'x' run extends along X at fixed z (wall at -Z); 'z' run extends along Z at fixed x (wall at -X).
    const buildRun = (run) => {
      const { axis, length, center, wallPos, withUpper = true, withSplash = true } = run;
      // Base cabinet body
      const baseGeo =
        axis === 'x'
          ? new THREE.BoxGeometry(length, BASE_H, BASE_D)
          : new THREE.BoxGeometry(BASE_D, BASE_H, length);
      const base = addMesh(baseGeo, 'cabinet');
      const baseZ = axis === 'x' ? wallPos + BASE_D / 2 : center;
      const baseX = axis === 'x' ? center : wallPos + BASE_D / 2;
      base.position.set(baseX, BASE_H / 2, baseZ);

      // Worktop slab (slightly overhangs)
      const wGeo =
        axis === 'x'
          ? new THREE.BoxGeometry(length + 0.04, TOP_T, BASE_D + 0.04)
          : new THREE.BoxGeometry(BASE_D + 0.04, TOP_T, length + 0.04);
      const wtop = addMesh(wGeo, 'worktop');
      wtop.position.set(baseX, BASE_H + TOP_T / 2, baseZ);

      // Splashback strip on wall
      if (withSplash) {
        const sGeo =
          axis === 'x'
            ? new THREE.BoxGeometry(length, SPLASH_H, 0.02)
            : new THREE.BoxGeometry(0.02, SPLASH_H, length);
        const splash = addMesh(sGeo, 'splashback', { cast: false });
        const sOff = 0.011;
        const sX = axis === 'x' ? center : wallPos + sOff;
        const sZ = axis === 'x' ? wallPos + sOff : center;
        splash.position.set(sX, BASE_H + TOP_T + SPLASH_H / 2, sZ);
      }

      // Upper cabinets
      if (withUpper) {
        const uGeo =
          axis === 'x'
            ? new THREE.BoxGeometry(length, UPPER_H, UPPER_D)
            : new THREE.BoxGeometry(UPPER_D, UPPER_H, length);
        const upper = addMesh(uGeo, 'cabinet');
        const uZ = axis === 'x' ? wallPos + UPPER_D / 2 : center;
        const uX = axis === 'x' ? center : wallPos + UPPER_D / 2;
        upper.position.set(uX, UPPER_Y + UPPER_H / 2, uZ);
      }

      // Handles — thin bars along the run, on base + upper fronts.
      const handleCount = Math.max(2, Math.round(length / 0.8));
      for (let i = 0; i < handleCount; i += 1) {
        const t = handleCount === 1 ? 0.5 : i / (handleCount - 1);
        const along = -length / 2 + 0.2 + t * (length - 0.4);
        // base handle
        const hGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8);
        const handle = addMesh(hGeo, 'handle');
        handle.rotation.z = Math.PI / 2; // lie horizontal
        const frontOff = BASE_D + 0.02;
        if (axis === 'x') {
          handle.position.set(center + along, BASE_H - 0.12, wallPos + frontOff);
        } else {
          handle.rotation.y = Math.PI / 2;
          handle.position.set(wallPos + frontOff, BASE_H - 0.12, center + along);
        }
      }
    };

    // ---- Appliance block builder -------------------------------------------
    function addAppliance(w, hh, d, pos) {
      const a = addMesh(new THREE.BoxGeometry(w, hh, d), 'appliance');
      a.position.set(pos.x, pos.y, pos.z);
      return a;
    }

    // ---- Layout per shape ---------------------------------------------------
    const wallZ = -ROOM / 2; // back wall plane
    const wallX = -ROOM / 2; // left wall plane
    const RUN_LEN = 4.0;

    const layouts = {
      straight: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        addAppliance(0.8, 1.85, 0.62, { x: 1.6, y: 0.925, z: wallZ + 0.31 }); // fridge
        addAppliance(0.62, 0.85, 0.6, { x: -1.4, y: 0.95, z: wallZ + 0.31 }); // oven
      },
      'l-shape': () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: wallX, withSplash: true });
        addAppliance(0.62, 0.85, 0.6, { x: -0.8, y: 0.95, z: wallZ + 0.31 }); // oven
        addHood(-0.8, wallZ);
        addAppliance(0.8, 1.85, 0.62, { x: wallX + 0.31, y: 0.925, z: 2.2 }); // fridge
      },
      galley: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: ROOM / 2 - BASE_D, withUpper: false });
        addAppliance(0.62, 0.85, 0.6, { x: 0, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
      },
      'u-shape': () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: wallX });
        buildRun({ axis: 'z', length: 3.0, center: 1.0, wallPos: ROOM / 2 - BASE_D, withUpper: false });
        addAppliance(0.62, 0.85, 0.6, { x: 0, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
      },
      island: () => {
        buildRun({ axis: 'x', length: RUN_LEN, center: 0, wallPos: wallZ });
        // free-standing island (no splash/upper)
        const islBase = addMesh(new THREE.BoxGeometry(2.2, BASE_H, 1.0), 'cabinet');
        islBase.position.set(0, BASE_H / 2, 1.4);
        const islTop = addMesh(new THREE.BoxGeometry(2.3, TOP_T, 1.1), 'worktop');
        islTop.position.set(0, BASE_H + TOP_T / 2, 1.4);
        addAppliance(0.62, 0.85, 0.6, { x: -1.4, y: 0.95, z: wallZ + 0.31 });
        addHood(0, wallZ);
      },
    };

    (layouts[shape] || layouts['l-shape'])();

    // ---- Apply current materials immediately --------------------------------
    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    // ---- Controls -----------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 11;
    controls.maxPolarAngle = Math.PI / 2.05; // don't go under floor
    controls.minPolarAngle = 0.2;
    controls.enablePan = false; // keep camera centered on room
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    // ---- Picking ------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
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
        const key = hits[0].object.userData.surfaceKey;
        if (key) pickRef.current(key);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ---- Render loop --------------------------------------------------------
    const clock = new THREE.Clock();
    function render() {
      renderer.render(scene, camera);
    }
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      // subtle emissive pulse on active surface
      const t = clock.getElapsedTime();
      const pulse = 0.18 + 0.12 * Math.sin(t * 3);
      Object.entries(surfaceMatsRef.current).forEach(([key, m]) => {
        if (activeRef.current && key === activeRef.current) {
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

const _loader = new THREE.TextureLoader();

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
        /* invalid color string — ignore, keep previous */
      }
    }

    if (spec.texture_url) {
      try {
        _loader.load(
          spec.texture_url,
          (tex) => {
            try {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.wrapS = THREE.RepeatWrapping;
              tex.wrapT = THREE.RepeatWrapping;
              if (m.map && m.map !== tex) m.map.dispose();
              m.map = tex;
              m.needsUpdate = true;
              if (disposables) disposables.push(tex);
              if (onChange) onChange();
            } catch (inner) {
              /* assignment failed — keep hex */
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
        /* loader threw synchronously — keep hex */
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
