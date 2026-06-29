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
  TextureLoader,
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
 * Office3D - standalone interactive, premium-looking 3D home office.
 *
 * Props:
 *   materials   : { cabinet, desk, shelf, wall } each { hex?, texture_url? }
 *   shape       : 'built-in' | 'corner' | 'wall-storage' | 'storage-desk' | 'minimal' | 'l-shaped'
 *   activeSurface : surface key to highlight (emissive pulse).
 *   onPickSurface : fn(surfaceKey) on click.
 *   height      : px height (default 460).
 *   dimensions  : { wallWidthMm, wallHeightMm, deskMm }
 *   layoutParams: optional tweaks (unused defaults).
 *
 * Surface keys: 'cabinet' | 'desk' | 'shelf' | 'wall'
 */

const DEFAULTS = {
  cabinet: { hex: '#e6e2da', rough: 0.5, metal: 0.04, clearcoat: 0.0 },
  desk: { hex: '#7a6248', rough: 0.42, metal: 0.0, clearcoat: 0.2, clearcoatRough: 0.3 },
  shelf: { hex: '#8a7560', rough: 0.55, metal: 0.0, clearcoat: 0.12, clearcoatRough: 0.35 },
  wall: { hex: '#efece5', rough: 0.95, metal: 0.0 },
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

export default function Office3D({
  materials = {},
  shape = 'built-in',
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

    const dim = dimensions || {};
    const WALL_W = mmToM(dim.wallWidthMm, 4000);
    const WALL_H = mmToM(dim.wallHeightMm, 2700);
    const DESK_LEN = clampNum(mmToM(dim.deskMm, 1600) * 1000, 800, (WALL_W - 0.4) * 1000, 1600) / 1000;
    const DESK_TOP_Y = 0.74;   // ~740mm
    const DESK_D = 0.6;
    const DESK_T = 0.04;

    const roomDiag = Math.hypot(WALL_W, WALL_H);

    const scene = new Scene();
    scene.background = new Color('#f4f1ea');
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(40, width / h, 0.1, 200);
    const fitDist = Math.max(3.4, (Number.isFinite(roomDiag) ? roomDiag : 5) * 0.98);
    camera.position.set(
      Number.isFinite(WALL_W) ? WALL_W * 0.2 : 0.9,
      Number.isFinite(WALL_H) ? WALL_H * 0.52 : 1.4,
      Number.isFinite(fitDist) ? fitDist : 4.0
    );
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
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
      /* PBR still renders */
    }

    scene.add(new AmbientLight(0xffffff, 0.2));
    scene.add(new HemisphereLight(0xfdfbf7, 0x8c7a68, 0.6));
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

    // ---- Floor + back wall -------------------------------------------------
    const floor = addMesh(new PlaneGeometry(Math.max(WALL_W + 2, 4), 5), 'wall', { cast: false });
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 1.0);
    surfaceMatsRef.current.wall.userData.repeat = [Math.max(2, Math.round(WALL_W)), 4];

    const wallZ = -0.05;
    const backWall = addMesh(new BoxGeometry(WALL_W, WALL_H, 0.08), 'wall', { cast: false });
    backWall.position.set(0, WALL_H / 2, wallZ - 0.04);

    // ---- Builders ----------------------------------------------------------
    const CAB_D = 0.4;
    const FRONT_T = 0.02;

    // Desk surface at ~740mm with two leg/gable supports.
    function addDesk(cx, lenM, depth = DESK_D) {
      const top = addMesh(new BoxGeometry(lenM, DESK_T, depth), 'desk');
      top.position.set(cx, DESK_TOP_Y, wallZ + depth / 2);
      // gable supports
      const legW = 0.04;
      const legH = DESK_TOP_Y - DESK_T / 2;
      [-1, 1].forEach((s) => {
        const leg = addMesh(new BoxGeometry(legW, legH, depth - 0.06), 'desk', { cast: false });
        leg.position.set(cx + s * (lenM / 2 - 0.05), legH / 2, wallZ + depth / 2);
      });
      return top;
    }

    // Base cabinet run split into bays via fitModules.
    function buildCabinetRun(cx, runM, yBottom, cabH, depth = CAB_D) {
      const grp = new Group();
      scene.add(grp);
      const runMm = Math.max(0, runM * 1000);
      const mods = fitModules(runMm);
      const fitList = mods.length ? mods : [{ width: runMm, filler: false }];
      const widthsM = fitList.map((m) => Math.max(0.05, (Number(m.width) || 0) / 1000));
      const sum = widthsM.reduce((s, w) => s + w, 0) || 1;
      const scaled = widthsM.map((w) => (w / sum) * runM);
      let cursor = cx - runM / 2;
      const yc = yBottom + cabH / 2;
      for (let i = 0; i < scaled.length; i += 1) {
        const w = scaled[i];
        const off = cursor + w / 2;
        cursor += w;
        const mw = Math.max(0.05, w - 0.006);
        const body = addMesh(new BoxGeometry(mw, cabH, depth), 'cabinet');
        body.position.set(off, yc, wallZ + depth / 2);
        const front = addMesh(new BoxGeometry(Math.max(0.04, mw - 0.02), cabH - 0.04, FRONT_T), 'cabinet');
        front.position.set(off, yc, wallZ + depth + FRONT_T / 2 + 0.002);
        const hGeo = new CylinderGeometry(0.008, 0.008, Math.min(0.16, cabH * 0.3), 12);
        const handle = addMesh(hGeo, 'cabinet');
        handle.position.set(off + mw / 2 - 0.04, yc, wallZ + depth + FRONT_T + 0.012);
      }
      return grp;
    }

    // Floating wall shelf (shelf surface).
    function addShelf(cx, yCenter, lenM, depth = 0.26) {
      const sh = addMesh(new BoxGeometry(lenM, 0.04, depth), 'shelf');
      sh.position.set(cx, yCenter, wallZ + depth / 2);
      return sh;
    }

    const runW = Math.min(WALL_W - 0.4, 3.4);

    const layouts = {
      'built-in': () => {
        // desk centred with tall cabinets either side + shelves above.
        const colW = Math.min(0.7, WALL_W * 0.2);
        const tallH = Math.max(0.9, WALL_H - 0.1);
        buildCabinetRun(-WALL_W / 2 + colW / 2 + 0.1, colW, 0.0, tallH);
        buildCabinetRun(WALL_W / 2 - colW / 2 - 0.1, colW, 0.0, tallH);
        addDesk(0, Math.min(DESK_LEN, runW - colW * 2 - 0.3));
        addShelf(0, Math.min(WALL_H - 0.5, 1.7), runW - colW * 2 - 0.4);
        addShelf(0, Math.min(WALL_H - 0.9, 1.3), runW - colW * 2 - 0.4);
      },
      corner: () => {
        // desk against wall, tall storage on one side only.
        const colW = Math.min(0.7, WALL_W * 0.22);
        buildCabinetRun(WALL_W / 2 - colW / 2 - 0.1, colW, 0.0, Math.max(0.9, WALL_H - 0.1));
        addDesk(-colW / 2, Math.min(DESK_LEN, runW - colW - 0.3));
        addShelf(-colW / 2, Math.min(WALL_H - 0.6, 1.6), runW * 0.5);
      },
      'wall-storage': () => {
        // full wall of cabinets, base + tall, with shelves, slim desk return.
        const baseH = 0.72;
        buildCabinetRun(0, runW, 0.0, baseH);
        buildCabinetRun(0, runW, 1.65, Math.max(0.4, WALL_H - 1.75));
        addShelf(0, 1.3, runW * 0.85);
        addDesk(0, Math.min(DESK_LEN, runW * 0.6), 0.5);
      },
      'storage-desk': () => {
        // base cabinet run as desk pedestals + worktop desk over.
        buildCabinetRun(-runW / 4, runW / 2, 0.0, 0.6);
        buildCabinetRun(runW / 4, runW / 2, 0.0, 0.6);
        addDesk(0, Math.min(DESK_LEN + 0.4, runW));
        addShelf(0, Math.min(WALL_H - 0.6, 1.6), runW * 0.7);
        addShelf(0, Math.min(WALL_H - 1.0, 1.2), runW * 0.7);
      },
      minimal: () => {
        addDesk(0, Math.min(DESK_LEN, runW * 0.7));
        addShelf(0, Math.min(WALL_H - 0.6, 1.55), runW * 0.5);
      },
      'l-shaped': () => {
        // main desk + perpendicular return desk + base cabinet.
        addDesk(-runW * 0.12, Math.min(DESK_LEN, runW * 0.6));
        const retLen = Math.min(1.0, WALL_W * 0.3);
        const ret = addMesh(new BoxGeometry(retLen, DESK_T, 0.5), 'desk');
        ret.position.set(runW / 2 - retLen / 2 - 0.1, DESK_TOP_Y, wallZ + 0.5);
        buildCabinetRun(runW / 2 - 0.35, 0.6, 0.0, 0.6, 0.45);
        addShelf(-runW * 0.12, Math.min(WALL_H - 0.6, 1.6), runW * 0.45);
      },
    };

    (layouts[shape] || layouts['built-in'])();

    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(2.0, fitDist * 0.5);
    controls.maxDistance = Math.max(9, fitDist * 2.0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minPolarAngle = 0.4;
    controls.enablePan = false;
    controls.target.set(0, WALL_H * 0.4, 0.2);
    controls.update();
    controlsRef.current = controls;

    const raycaster = new Raycaster();
    const ndc = new Vector2();
    let downXY = null;
    const onPointerDown = (e) => { downXY = [e.clientX, e.clientY]; };
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
  }, [shape, height, dimsSig, lpSig]);

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
