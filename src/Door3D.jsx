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

/**
 * Door3D - standalone interactive, premium-looking 3D door.
 *
 * Props:
 *   materials   : { leaf, frame, handle, glass } each { hex?, texture_url? }
 *   shape       : 'flush' | 'shaker' | 'groove' | 'panel' | 'glass' (door style)
 *   activeSurface : surface key to highlight (emissive pulse).
 *   onPickSurface : fn(surfaceKey) on click.
 *   height      : px height (default 460).
 *   dimensions  : { widthMm, heightMm }
 *   layoutParams: { leaves } - 1 (single) or 2 (double).
 *
 * Surface keys: 'leaf' | 'frame' | 'handle' | 'glass'
 */

const DEFAULTS = {
  leaf: { hex: '#e7e3da', rough: 0.46, metal: 0.03, clearcoat: 0.18, clearcoatRough: 0.3 },
  frame: { hex: '#d6d0c4', rough: 0.6, metal: 0.0, clearcoat: 0.08, clearcoatRough: 0.4 },
  handle: { hex: '#b0b4b8', rough: 0.26, metal: 0.94 },
  glass: { hex: '#aebfc4', rough: 0.06, metal: 0.0, clearcoat: 1.0, clearcoatRough: 0.04, transmission: 0.85 },
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

export default function Door3D({
  materials = {},
  shape = 'shaker',
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
    const lp = layoutParams || {};
    const DOOR_W = mmToM(dim.widthMm, 900);
    const DOOR_H = mmToM(dim.heightMm, 2040);
    const leaves = clampNum(lp.leaves, 1, 2, 1) >= 2 ? 2 : 1;
    const FRAME_W = 0.09;   // frame casing width
    const LEAF_T = 0.045;   // leaf thickness
    const hasGlass = shape === 'glass';

    const wallW = DOOR_W + FRAME_W * 2 + 1.6;
    const wallH = DOOR_H + FRAME_W * 2 + 0.6;
    const roomDiag = Math.hypot(wallW, wallH);

    const scene = new Scene();
    scene.background = new Color('#f4f1ea');
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(38, width / h, 0.1, 200);
    const fitDist = Math.max(2.6, (Number.isFinite(roomDiag) ? roomDiag : 3.5) * 0.95);
    camera.position.set(
      Number.isFinite(DOOR_W) ? DOOR_W * 0.55 : 0.6,
      Number.isFinite(DOOR_H) ? DOOR_H * 0.5 : 1.0,
      Number.isFinite(fitDist) ? fitDist : 3.2
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

    scene.add(new AmbientLight(0xffffff, 0.22));
    scene.add(new HemisphereLight(0xfdfbf7, 0x8c7a68, 0.6));
    const key = new DirectionalLight(0xfff4e6, 2.2);
    key.position.set(3, 6, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const fill = new DirectionalLight(0xdfe7f2, 0.5);
    fill.position.set(-4, 3, 4);
    scene.add(fill);

    const makeMat = (mkey) => {
      const d = DEFAULTS[mkey] || DEFAULTS.leaf;
      const usePhysical = d.clearcoat != null;
      const m = usePhysical
        ? new MeshPhysicalMaterial({
            color: new Color(d.hex),
            roughness: d.rough,
            metalness: d.metal,
            clearcoat: d.clearcoat || 0,
            clearcoatRoughness: d.clearcoatRough != null ? d.clearcoatRough : 0.2,
            transmission: d.transmission || 0,
            transparent: !!d.transmission,
            opacity: d.transmission ? 0.55 : 1,
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

    // ---- Floor + wall with opening ----------------------------------------
    const floor = addMesh(new PlaneGeometry(wallW + 2, 4), 'frame', { cast: false });
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0.6);
    surfaceMatsRef.current.frame.userData.repeat = [Math.max(2, Math.round(wallW)), 3];

    const wallZ = -0.06;
    // Wall built around the opening: left, right, header pieces (frame surface
    // tinted as wall via shared frame material is acceptable — wall is the frame
    // casing here). Opening = DOOR_W + frame on each side.
    const openW = DOOR_W + FRAME_W * 2;
    const openH = DOOR_H + FRAME_W;
    const sideW = (wallW - openW) / 2;
    const wallL = addMesh(new BoxGeometry(sideW, wallH, 0.1), 'frame', { cast: false });
    wallL.position.set(-(openW / 2 + sideW / 2), wallH / 2, wallZ);
    const wallR = addMesh(new BoxGeometry(sideW, wallH, 0.1), 'frame', { cast: false });
    wallR.position.set(openW / 2 + sideW / 2, wallH / 2, wallZ);
    const headH = wallH - openH;
    const wallTop = addMesh(new BoxGeometry(openW, headH, 0.1), 'frame', { cast: false });
    wallTop.position.set(0, openH + headH / 2, wallZ);

    // ---- Frame casing (frame surface) -------------------------------------
    function addFrame() {
      const grp = new Group();
      scene.add(grp);
      const fT = 0.07; // frame proud depth
      // jambs
      const jL = addMesh(new BoxGeometry(FRAME_W, openH, fT), 'frame');
      jL.position.set(-(DOOR_W / 2 + FRAME_W / 2), openH / 2, wallZ + 0.06);
      const jR = addMesh(new BoxGeometry(FRAME_W, openH, fT), 'frame');
      jR.position.set(DOOR_W / 2 + FRAME_W / 2, openH / 2, wallZ + 0.06);
      const head = addMesh(new BoxGeometry(openW, FRAME_W, fT), 'frame');
      head.position.set(0, openH - FRAME_W / 2, wallZ + 0.06);
      return grp;
    }
    addFrame();

    // ---- Leaf + style insets ----------------------------------------------
    // Recessed shaker rails/stiles or grooves drawn as thin proud/inset slabs.
    function addStyleInsets(cx, leafW, leafZ) {
      const innerW = leafW - 0.16;
      const innerH = DOOR_H - 0.2;
      if (shape === 'shaker' || shape === 'panel') {
        // 2 (or 4 for panel) recessed panels framed by rails/stiles.
        const rows = shape === 'panel' ? 3 : 2;
        const panelGap = 0.06;
        const panelH = (innerH - panelGap * (rows + 1)) / rows;
        for (let r = 0; r < rows; r += 1) {
          const py = DOOR_H / 2 - 0.1 - panelGap - panelH / 2 - r * (panelH + panelGap);
          const inset = addMesh(new BoxGeometry(innerW, panelH, 0.012), 'leaf', { cast: false });
          inset.position.set(cx, py, leafZ - 0.018);
        }
      } else if (shape === 'groove') {
        // horizontal grooves as thin recessed strips.
        const lines = 4;
        for (let i = 1; i <= lines; i += 1) {
          const gy = DOOR_H * (i / (lines + 1));
          const groove = addMesh(new BoxGeometry(innerW, 0.012, 0.01), 'leaf', { cast: false });
          groove.position.set(cx, gy, leafZ - 0.012);
        }
      }
      // flush => no insets.
    }

    function addLeaf(cx, leafW) {
      const leafZ = wallZ + 0.06 + 0.04;
      if (hasGlass) {
        // slim leaf border + large glass panel.
        const borderT = 0.12;
        // top/bottom/left/right border strips
        const top = addMesh(new BoxGeometry(leafW, borderT, LEAF_T), 'leaf');
        top.position.set(cx, DOOR_H - borderT / 2, leafZ);
        const bot = addMesh(new BoxGeometry(leafW, borderT, LEAF_T), 'leaf');
        bot.position.set(cx, borderT / 2, leafZ);
        const lft = addMesh(new BoxGeometry(borderT, DOOR_H, LEAF_T), 'leaf');
        lft.position.set(cx - leafW / 2 + borderT / 2, DOOR_H / 2, leafZ);
        const rgt = addMesh(new BoxGeometry(borderT, DOOR_H, LEAF_T), 'leaf');
        rgt.position.set(cx + leafW / 2 - borderT / 2, DOOR_H / 2, leafZ);
        const glass = addMesh(
          new BoxGeometry(leafW - borderT * 2, DOOR_H - borderT * 2, 0.012),
          'glass',
          { cast: false, receive: false }
        );
        glass.position.set(cx, DOOR_H / 2, leafZ);
      } else {
        const leaf = addMesh(new BoxGeometry(leafW, DOOR_H, LEAF_T), 'leaf');
        leaf.position.set(cx, DOOR_H / 2, leafZ);
        addStyleInsets(cx, leafW, leafZ + LEAF_T / 2);
      }
    }

    // ---- Handle ------------------------------------------------------------
    function addHandle(cx, side, leafW) {
      const leafZ = wallZ + 0.06 + 0.04 + LEAF_T / 2 + 0.02;
      const hx = cx + side * (leafW / 2 - 0.07);
      const lever = addMesh(new CylinderGeometry(0.012, 0.012, 0.1, 12), 'handle');
      lever.rotation.z = Math.PI / 2;
      lever.position.set(hx - side * 0.05, DOOR_H * 0.45, leafZ);
      const rose = addMesh(new CylinderGeometry(0.03, 0.03, 0.012, 16), 'handle');
      rose.rotation.x = Math.PI / 2;
      rose.position.set(hx, DOOR_H * 0.45, leafZ - 0.012);
    }

    if (leaves === 2) {
      const leafW = (DOOR_W - 0.01) / 2;
      addLeaf(-DOOR_W / 4, leafW);
      addLeaf(DOOR_W / 4, leafW);
      addHandle(-DOOR_W / 4, 1, leafW);  // meeting-stile handles
      addHandle(DOOR_W / 4, -1, leafW);
    } else {
      addLeaf(0, DOOR_W);
      addHandle(0, 1, DOOR_W);
    }

    applyMaterials(materials, surfaceMatsRef.current, disposablesRef.current, () => render());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = Math.max(1.6, fitDist * 0.55);
    controls.maxDistance = Math.max(7, fitDist * 2.0);
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minPolarAngle = 0.5;
    controls.enablePan = false;
    controls.target.set(0, DOOR_H * 0.45, 0.1);
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
