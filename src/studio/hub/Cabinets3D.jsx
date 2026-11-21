// Cabinets3D — interactive WebGL 3D of the assembled run (three.js r128, self-hosted in public/vendor).
// Pro features: real materials (wood grain / marble / gloss / matte, procedural so
// no external textures), a worktop slab, camera presets (Front/Iso/Top), click a
// cabinet to select it, drag to orbit, scroll to zoom. Snapshot exposed via apiRef.
import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { unitFamily } from "./ClosetPreview2D";
import { buildBayUnit } from "./studio3d/bayBuilder";

let threePromise = null;
export function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;
  threePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/three-r128.min.js";
    s.onload = () => resolve(window.THREE);
    s.onerror = () => reject(new Error("three-load-failed"));
    document.head.appendChild(s);
  });
  return threePromise;
}
const mm = (v) => (Number(v) || 0) / 1000;
const ri = (v) => Math.max(0, Math.round(Number(v) || 0));

function woodTex(THREE, hex) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
  x.fillStyle = hex || "#caa06a"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { x.strokeStyle = "rgba(60,40,20," + (0.02 + Math.random() * 0.05).toFixed(3) + ")"; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const xx = Math.random() * 256; x.moveTo(xx, 0); x.bezierCurveTo(xx + (Math.random() * 18 - 9), 85, xx + (Math.random() * 18 - 9), 170, xx, 256); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function marbleTex(THREE, hex) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
  x.fillStyle = hex || "#f1efe9"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 20; i++) { x.strokeStyle = "rgba(110,110,124," + (0.05 + Math.random() * 0.12).toFixed(3) + ")"; x.lineWidth = 0.5 + Math.random() * 1.6; x.beginPath(); let px = Math.random() * 256, py = 0; x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += Math.random() * 56 - 28; py += 32; x.lineTo(px, py); } x.stroke(); }
  const t = new THREE.CanvasTexture(c); return t;
}
function graniteTex(THREE, hex) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
  x.fillStyle = hex || "#33333a"; x.fillRect(0, 0, 256, 256);
  // dense mineral speckle for a granite look
  for (let i = 0; i < 2600; i++) {
    const r = Math.random();
    x.fillStyle = r < 0.5 ? "rgba(210,210,220," + (0.05 + Math.random() * 0.25).toFixed(3) + ")"
      : r < 0.8 ? "rgba(150,120,90," + (0.05 + Math.random() * 0.22).toFixed(3) + ")"
        : "rgba(20,20,26," + (0.1 + Math.random() * 0.35).toFixed(3) + ")";
    const s = 0.6 + Math.random() * 2.4;
    x.fillRect(Math.random() * 256, Math.random() * 256, s, s);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// 🧱 backsplash / wall-tile texture — procedural by kind, tinted by `hex`.
//   fluted → vertical light/shadow flutes · subway → horizontal brick grid ·
//   marble → veined stone · herringbone → diagonal weave · terrazzo → speckle ·
//   plain → flat colour (no overlay). Returns a RepeatWrapping CanvasTexture.
function tileTex(THREE, kind, hex) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
  x.fillStyle = hex || "#eeeeee"; x.fillRect(0, 0, 256, 256);
  if (kind === "fluted") {
    // soft-contrast flutes — reads as panelling, not stripes (no moiré at distance)
    const n = 12, bw = 256 / n;
    for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * bw, 0, (i + 1) * bw, 0); g.addColorStop(0, "rgba(0,0,0,.07)"); g.addColorStop(0.5, "rgba(255,255,255,.08)"); g.addColorStop(1, "rgba(0,0,0,.07)"); x.fillStyle = g; x.fillRect(i * bw, 0, bw, 256); }
  } else if (kind === "subway") {
    x.strokeStyle = "rgba(0,0,0,.20)"; x.lineWidth = 2; const rows = 6, rh = 256 / rows;
    for (let r = 0; r <= rows; r++) { x.beginPath(); x.moveTo(0, r * rh); x.lineTo(256, r * rh); x.stroke(); }
    for (let r = 0; r < rows; r++) { const off = (r % 2) ? 64 : 0; for (let cx = off; cx <= 256; cx += 128) { x.beginPath(); x.moveTo(cx, r * rh); x.lineTo(cx, (r + 1) * rh); x.stroke(); } }
  } else if (kind === "marble") {
    for (let i = 0; i < 18; i++) { x.strokeStyle = "rgba(110,110,124," + (0.05 + Math.random() * 0.12).toFixed(3) + ")"; x.lineWidth = 0.5 + Math.random() * 1.6; x.beginPath(); let px = Math.random() * 256, py = 0; x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += Math.random() * 56 - 28; py += 32; x.lineTo(px, py); } x.stroke(); }
  } else if (kind === "herringbone") {
    x.strokeStyle = "rgba(0,0,0,.15)"; x.lineWidth = 2;
    for (let d = -256; d < 256; d += 28) { x.beginPath(); x.moveTo(d, 0); x.lineTo(d + 256, 256); x.stroke(); x.beginPath(); x.moveTo(d, 256); x.lineTo(d + 256, 0); x.stroke(); }
  } else if (kind === "terrazzo") {
    for (let i = 0; i < 420; i++) { const r = Math.random(); x.fillStyle = r < 0.4 ? "rgba(150,140,120,.5)" : r < 0.7 ? "rgba(90,90,90,.4)" : "rgba(200,190,175,.6)"; const s = 1.5 + Math.random() * 4; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, s, s * 0.7, Math.random() * 3.14, 0, 6.28); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function matFor(THREE, unit, cache) {
  const hex = unit.finishColor || "#ece3d3";
  const name = String(unit.finishName || "").toLowerCase();
  const img = unit.finishImg || null;
  let kind = "matte";
  if (/oak|walnut|wood|timber|veneer|teak|maple|beech/.test(name)) kind = "wood";
  else if (/marble|quartz|granite|stone/.test(name)) kind = "marble";
  else if (/gloss|lacquer|shine|mirror|high.?gloss/.test(name)) kind = "gloss";
  const key = img ? "img|" + img : kind + "|" + hex;
  if (cache.has(key)) return cache.get(key);
  let mat;
  if (img) {
    // Real swatch photo mapped onto the cabinet (wood grain / marble veining / solid).
    const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous");
    const tex = loader.load(img); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;   // swatch photos are sRGB
    mat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color("#ffffff"), roughness: kind === "gloss" ? 0.18 : kind === "marble" ? 0.3 : 0.6, metalness: 0.04 });
  } else if (kind === "wood") mat = new THREE.MeshStandardMaterial({ map: woodTex(THREE, hex), color: new THREE.Color(hex), roughness: 0.55, metalness: 0.05 });
  else if (kind === "marble") mat = new THREE.MeshStandardMaterial({ map: marbleTex(THREE, hex), roughness: 0.25, metalness: 0.02 });
  else if (kind === "gloss") mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.12, metalness: 0.12 });
  else mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.62, metalness: 0.03 });
  cache.set(key, mat); return mat;
}
const WT_COLOR = { quartz: "#eae6df", granite: "#3a3a42", marble: "#f0ede7", solid_surface: "#ece9e3", porcelain: "#f3f2ef", timber: "#b98a55", laminate: "#d8c3a0", dekton: "#dfe0e2", corian: "#f2f1ee" };

export default function Cabinets3D({ units, height = 360, apiRef, worktop = "quartz", worktopHex = null, worktopKind = null, wallTile = null, wallTileHex = null, wallTileKind = null, handleStyle = "bar", onPick, layout = "straight", legs = null, onRemoveUnit, onReorderUnit, onSetDim, finishes = [], onSetUnitFinish, onWorkTriangle, ledOn = false, interiorHex = "#f4f5f7", runGapMm = 2400 }) {
  const mountRef = useRef(null);
  const wrapRef = useRef(null);
  const cleanupRef = useRef(null);
  const viewApi = useRef({});
  const ctrl = useRef({ orbit: false, walk: false, edit: false, strip: false, decor: false, moving: false });
  const selMeshRef = useRef(null);
  const moreRef = useRef(null);
  const cbRef = useRef({});
  cbRef.current.onRemoveUnit = onRemoveUnit;
  cbRef.current.onReorderUnit = onReorderUnit;
  cbRef.current.onPick = onPick;
  cbRef.current.onWorkTriangle = onWorkTriangle;
  cbRef.current.onSetDim = onSetDim;
  const [err, setErr] = useState(false);
  const [sel, setSel] = useState(null);
  const [edit, setEdit] = useState(false);
  const [bg, setBg] = useState("studio");      // room | dark | studio | solid
  const [solidHex, setSolidHex] = useState("#EDEFF3");
  const [lightMode, setLightMode] = useState("studio"); // studio | warm | bright
  const [full, setFull] = useState(false);
  const [walk, setWalk] = useState(false);
  const [orbit, setOrbit] = useState(false);
  const [dims, setDims] = useState(false);
  const [tri, setTri] = useState(false);        // work-triangle overlay (default off)
  const [allOpen, setAllOpen] = useState(false);
  const [strip, setStrip] = useState(ledOn);        // 💡 under-wall LED strip — off unless a Lighting accessory is added
  const [decor, setDecor] = useState(false);        // 🌿 decorative props (plants, styling, stools, rug, art) — default off
  const [moreOpen, setMoreOpen] = useState(false);  // ⋯ More popover
  const [moving, setMoving] = useState(false);       // Edit-mode reorder "moving…" cue
  const [tdims, setTdims] = useState(null);
  React.useEffect(() => { if (viewApi.current.setBg) viewApi.current.setBg(bg, solidHex); }, [bg, solidHex]);
  React.useEffect(() => { if (viewApi.current.setLight) viewApi.current.setLight(lightMode); }, [lightMode]);
  React.useEffect(() => { ctrl.current.orbit = orbit; }, [orbit]);
  React.useEffect(() => { ctrl.current.edit = edit; if (!edit) { selMeshRef.current = null; setSel(null); if (viewApi.current.clearSel) viewApi.current.clearSel(); } }, [edit]);
  const [resz, setResz] = useState(false); // SketchUp-style drag-to-resize mode
  React.useEffect(() => { ctrl.current.resz = resz; }, [resz]);
  React.useEffect(() => { if (viewApi.current.setWalk) viewApi.current.setWalk(walk); ctrl.current.walk = walk; }, [walk]);
  React.useEffect(() => { if (viewApi.current.setDims) viewApi.current.setDims(dims); }, [dims]);
  React.useEffect(() => { if (viewApi.current.setTri) viewApi.current.setTri(tri); }, [tri]);
  React.useEffect(() => { if (viewApi.current.setAllDoors) viewApi.current.setAllDoors(allOpen); }, [allOpen]);
  React.useEffect(() => { ctrl.current.strip = strip; if (viewApi.current.setStrip) viewApi.current.setStrip(strip); }, [strip]);
  React.useEffect(() => { setStrip(ledOn); }, [ledOn]);   // Lighting accessory added/removed → mirror the LED strip
  React.useEffect(() => { ctrl.current.decor = decor; if (viewApi.current.setDecor) viewApi.current.setDecor(decor); }, [decor]);
  React.useEffect(() => { const t = setTimeout(() => { if (viewApi.current.resize) viewApi.current.resize(); }, 60); return () => clearTimeout(t); }, [full]);
  // ⋯ More popover — close on outside-click and Esc
  React.useEffect(() => {
    if (!moreOpen) return undefined;
    const onDoc = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false); };
    const onEsc = (e) => { if (e.key === "Escape") setMoreOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [moreOpen]);
  const sig = (units || []).map(u => [u.code || u.name, u.width_mm, u.height_mm, unitFamily(u), u.finishColor, u.finishName, u.finishImg, u.doors, u.drawers, u.shelves, u.unit_type, u.door, (Array.isArray(u.bays) && u.bays.length) ? JSON.stringify([u.bays, u.bayFinishes, u.bayOpts, u.sliding, u.depth_mm, u.dx]) : ""].join(":")).join("|") + "|" + worktop + "|" + (worktopHex || "") + "|" + (worktopKind || "") + "|" + (wallTile || "") + "|" + (wallTileHex || "") + "|" + (wallTileKind || "") + "|" + handleStyle + "|" + layout + "|" + JSON.stringify(legs || {}) + "|" + (interiorHex || "") + "|" + runGapMm;

  useEffect(() => {
    let alive = true, raf = 0;
    loadThree().then((THREE) => {
      if (!alive || !mountRef.current) return;
      const mount = mountRef.current;
      selMeshRef.current = null;                 // drop any selection from a prior build
      if (cbRef.current.onPick) cbRef.current.onPick(null);   // clear parent's selected-unit key on rebuild
      const W = mount.clientWidth || 640, H = height;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf4f6fa);   // brighter, cleaner studio backdrop
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(W, H); renderer.setPixelRatio(Math.min(3, (window.devicePixelRatio || 1) * 1.25)); // extra-crisp edges
      // TRUE COLOUR — sRGB output + filmic tone mapping so finishes render as their real
      // swatch colour instead of the washed-out linear look (the "finish not clear" bug).
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 200);

      // showroom lighting — soft ambient, one shadow-casting key, cool fill.
      // Ambient deliberately BELOW the key so faces model instead of flattening.
      const hemi = new THREE.HemisphereLight(0xffffff, 0x8f8a82, 0.55); scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xfff6ea, 0.9); dir.position.set(3.5, 6.5, 4.5);
      dir.castShadow = true; dir.shadow.mapSize.set(2048, 2048); dir.shadow.bias = -0.0004; dir.shadow.radius = 4;
      scene.add(dir);
      const dir2 = new THREE.DirectionalLight(0xdde6f2, 0.28); dir2.position.set(-4, 3, -2); scene.add(dir2);

      const list = (units || []).filter(Boolean);
      // stable index of each unit inside the units array (== PricePlus line index
      // for real cabinets, which precede the derived appliance units) — used to
      // reorder/remove the matching source line from 3D.
      const idxOf = new Map(); list.forEach((u, i) => idxOf.set(u, i));
      // the extractor hood is NOT laid in a run — it's planted directly over the hob at
      // the end (deterministic across bent legs, no fragile world reposition). Pull it out.
      const isHoodU = (u) => /hood|extractor|chimney/.test(((u.unit_type || "") + " " + (u.name || "")).toLowerCase());
      const hoodU = list.filter(isHoodU);
      const floorU = list.filter(u => !isHoodU(u) && unitFamily(u) !== "wall");
      const wallU = list.filter(u => !isHoodU(u) && unitFamily(u) === "wall");
      const group = new THREE.Group();
      const GAP = 0.004, D0 = 0.6;
      const RG = Math.max(0.6, mm(runGapMm) || 2.4);   // configurable gap between two facing runs (galley/parallel)
      // Carcass interior colour (default white) — only the doors/drawer fronts/exterior reflect the finish.
      const interiorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(interiorHex || "#f4f5f7"), roughness: 0.85, metalness: 0.02 });
      const matCache = new Map();
      const bodies = [];
      const doorLeaves = [];
      const slidePanels = [];      // 🚪 sliding bypass panels — animated sideways on open
      const drawerSlides = [];
      const drawerFronts = [];     // per-drawer raycast targets → open just that one drawer
      const wallStrips = [];       // 💡 under-wall-unit LED strip meshes + lights (toggle)
      // ── LEVEL COUNTER — real kitchens have ONE worktop height. Pre-scan the base
      //    units, take the tallest as the counter line, and stand shorter carcasses on
      //    a plinth so every top is flush. Kills the floating-worktop / splash-gap bug.
      const counterH = Math.min(1.1, Math.max(0.72, ...floorU.filter(u => unitFamily(u) === "base").map(u => mm(u.height_mm) || 0.72)));
      const maxBaseH = counterH;
      let hobDrawn = false;   // ONE hob per kitchen — only the first oven housing carries it

      // 🧱 Module-aware unit: a unit carrying s.bays[] renders as a row of real modules (own width,
      //    finish A/B/C, door leaves + handles, open interiors with shelves / rails / drawer banks, LED).
      //    Geometry lives in studio3d/bayBuilder.js (shared with the Studio editor); the openable parts
      //    are registered here so the existing click-to-open + Open-all animation drives them.
      const addBayUnit = (u, x, parent) => {
        const r = buildBayUnit(THREE, u, { handleStyle, interiorHex, cache: matCache, matFor: (hex, name) => matFor(THREE, { finishColor: hex, finishName: name }, matCache) });
        const w = Math.max(0.1, r.W), dx = mm(u.dx || 0);
        r.group.position.set(x + dx, 0, 0.005); parent.add(r.group);
        const body = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05, w - GAP), r.H, r.D), new THREE.MeshBasicMaterial({ visible: false }));
        body.position.set(x + dx + w / 2, r.H / 2, r.D / 2 + 0.005);
        body.userData = { name: u.name, w: ri(u.width_mm), h: ri(u.height_mm) || Math.round(r.H * 1000), d: ri(u.depth_mm) || Math.round(r.D * 1000), code: u.code, idx: idxOf.get(u), appliance: false };
        if (r.pivots.length) body.userData.doorPivots = r.pivots;
        if (r.slides.length) body.userData.drawerSlides = r.slides;
        if (r.slidePanels.length) body.userData.slideLeaves = r.slidePanels;
        parent.add(body); bodies.push(body);
        r.pivots.forEach((p) => doorLeaves.push(p)); r.slides.forEach((s) => drawerSlides.push(s)); r.slidePanels.forEach((p) => slidePanels.push(p));
        r.fronts.forEach((fr) => { fr.userData.parentBody = body; drawerFronts.push(fr); });
        return w;
      };
      // Add one cabinet at local x into `parent` (its own run group, wall at local z=0).
      const addUnit = (u, x, parent, nb = {}) => {
        if (Array.isArray(u.bays) && u.bays.length) { try { return addBayUnit(u, x, parent); } catch (e) { /* fall back to the single-box renderer below */ } }
        const f = unitFamily(u);
        const w = Math.max(0.1, mm(u.width_mm) || 0.6);
        const h = f === "tall" ? (mm(u.height_mm) || 2.08) : (mm(u.height_mm) || 0.72);
        const d = f === "wall" ? (mm(u.depth_mm) || 0.35) : (mm(u.depth_mm) || 0.6);
        // base carcasses hang from the counter line (tops flush); tall/wall keep their own line
        const plinthH = f === "base" ? Math.max(0, counterH - h) : 0;
        // 🎛 dx = per-unit free horizontal move (mm) — every mesh derives from cx, so shifting cx moves the whole unit.
        const cx = x + w / 2 + mm(u.dx || 0), cy = f === "wall" ? 1.45 + h / 2 : f === "base" ? counterH - h / 2 : h / 2, cz = d / 2 + 0.005;
        if (plinthH > 0.03) { const pl = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, plinthH, d * 0.86), new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 0.85 })); pl.position.set(cx, plinthH / 2, cz - d * 0.06); parent.add(pl); }
        const drawers = ri(u.drawers), doors = ri(u.doors), door = u.door || "slab";
        // ── type awareness: read glass / sink / appliance from the unit type + name ──
        const _ut = [u.unit_type, u.name].filter(Boolean).join(" ").toLowerCase();
        const isComp = /composition/.test(_ut) || /^bath-model-/.test(String(u.code || ""));   // 🛁 full bathroom model → design board
        const isMirror = /mirror/.test(_ut) && !/cabinet/.test(_ut);   // 🪞 bathroom wall mirror → flat reflective panel
        const isGlass = (door === "glass" || /glass|mirror/.test(_ut)) && !isMirror;
        const isSink = /sink|basin|vanity|\bwc\b/.test(_ut);
        const isVanity = /vanity/.test(_ut);   // 🛁 bathroom vanity → on-top vessel basin (not a kitchen inset)
        const isOven = /\boven\b|microwave/.test(_ut);
        const isHob = /\bhob\b|cooktop|cook top|induction/.test(_ut);
        const isFridge = /fridge|refriger|freezer/.test(_ut);
        const isDish = /dishwash/.test(_ut);
        const isWasher = /washing machine|\bwasher\b|\bdryer\b|tumble/.test(_ut);
        const isHood = /hood|extractor|chimney/.test(_ut);
        const isFascia = isOven || isFridge || isDish || isWasher;
        const fz = cz + d / 2 + 0.006;
        const carcassMat = matFor(THREE, u, matCache);
        // Solid-door cabinets get a hollow carcass + real shelves + a hinged door you can click open.
        // Pure drawer units get a hollow carcass + drawer boxes that slide out on click.
        const drawerUnit = !isFascia && !isSink && !isHob && !isHood && !isGlass && doors === 0 && drawers > 0 && f !== "wall";
        const isCloset = /closet|wardrobe/.test(_ut);
        const wantsHang = /hang/.test(_ut);
        const nShelvesOpen = ri(u.shelves);
        // 🚪 open standard closet: doors===0 → no leaf; show its shelves / drawers / hanging inside the carcass
        const openCloset = isCloset && doors === 0 && !isFascia && !isSink && !isHob && !isHood && !isGlass && f !== "wall";
        // drawers sit in a BOTTOM band; each drawer face is a realistic ~210 mm (never full-height)
        const drawerRegionH = drawers > 0 ? (openCloset ? Math.min(h * 0.55, drawers * 0.21) : (h - 0.02)) : 0;
        const openable = (!isFascia && !isSink && !isHob && !isHood && !isGlass && doors > 0) || drawerUnit || openCloset;
        let body;
        if (openable) {
          const t = 0.018;
          // Open closets have no doors, so the carcass IS the visible exterior → it wears the selected
          // finish. Interior shelves keep the inside colour. Door cabinets keep a plain white interior.
          const carcMat = openCloset ? carcassMat : interiorMat;
          const panel = (pw, ph, pd, px, py, pz, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), mat || interiorMat); m.position.set(px, py, pz); parent.add(m); };
          panel(w - GAP, h, t, cx, cy, cz - d / 2 + t / 2, interiorMat);    // back — carries the INSIDE finish (accent backing)
          panel(w - GAP, t, d, cx, cy + h / 2 - t / 2, cz, carcMat);        // top
          panel(w - GAP, t, d, cx, cy - h / 2 + t / 2, cz, carcMat);        // bottom
          if (!(nb && nb.shareLeft)) panel(t, h, d, cx - (w - GAP) / 2 + t / 2, cy, cz, carcMat); // left gable — skipped when it shares a single panel with the closet on its left
          panel(t, h, d, cx + (w - GAP) / 2 - t / 2, cy, cz, carcMat);      // right
          // door cabinets draw their shelves here; open closets use the dedicated interior builder below
          if (!openCloset) { const nsh = Math.min(drawerUnit ? 0 : (ri(u.shelves) || 2), 6); if (nsh > 0) { const shB = cy - h / 2 + t + drawerRegionH, shT = cy + h / 2 - t; for (let i = 1; i <= nsh; i++) { const sy = shB + (shT - shB) * i / (nsh + 1); const sh = new THREE.Mesh(new THREE.BoxGeometry(w - GAP - 2 * t, 0.016, d - t - 0.03), interiorMat); sh.position.set(cx, sy, cz + 0.005); parent.add(sh); } } }
          body = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, d), new THREE.MeshBasicMaterial({ visible: false }));  // invisible click target
        } else if (isHood) {
          // extractor hood — a tapered stainless canopy + a chimney up to the ceiling line
          body = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, d), new THREE.MeshBasicMaterial({ visible: false })); // invisible click target
          const steel = new THREE.MeshStandardMaterial({ color: 0xd0d4d9, roughness: 0.38, metalness: 0.6 });
          const canopyH = Math.min(h * 0.55, 0.16);
          const canopy = new THREE.Mesh(new THREE.CylinderGeometry((w - GAP) * 0.30, (w - GAP) * 0.52, canopyH, 4), steel);
          canopy.rotation.y = Math.PI / 4; canopy.position.set(cx, cy - h / 2 + canopyH / 2, cz + d * 0.05); parent.add(canopy);
          const chim = new THREE.Mesh(new THREE.BoxGeometry((w - GAP) * 0.34, Math.max(0.08, h - canopyH), d * 0.5), steel);
          chim.position.set(cx, cy - h / 2 + canopyH + Math.max(0.08, h - canopyH) / 2, cz - d * 0.12); parent.add(chim);
          // the visible steel is NOT a child of the click-target body — remember it so the
          // hood-over-hob reposition moves the canopy + chimney together with the body
          body.userData.extraMeshes = [canopy, chim];
        } else if (isComp) {
          // 🛁 full bathroom model — a design board showing the exact catalogue elevation at true width
          body = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
          const bz = 0.06;
          const back = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 }));
          back.position.set(cx, cy, bz); parent.add(back);
          const url = u.image_url || u.finishImg;
          if (url) {
            const tex = new THREE.TextureLoader().load(url);
            if (THREE.sRGBEncoding != null) tex.encoding = THREE.sRGBEncoding;
            const face = new THREE.Mesh(new THREE.PlaneGeometry((w - GAP) * 0.98, h * 0.98), new THREE.MeshBasicMaterial({ map: tex }));
            face.position.set(cx, cy, bz + 0.031); parent.add(face);
          }
        } else if (isMirror) {
          // 🪞 flat wall mirror — a slim dark frame + a reflective pane flush to the wall (no carcass box)
          body = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, 0.03), new THREE.MeshBasicMaterial({ visible: false }));
          const backZ = cz - d / 2 + 0.02;
          const frame = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, 0.03), new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.5, metalness: 0.3 }));
          frame.position.set(cx, cy, backZ); parent.add(frame);
          const glass = new THREE.Mesh(new THREE.BoxGeometry((w - GAP) * 0.94, h * 0.94, 0.006), new THREE.MeshStandardMaterial({ color: 0xdfe7ec, roughness: 0.04, metalness: 0.95 }));
          glass.position.set(cx, cy, backZ + 0.02); parent.add(glass);
        } else {
          // sink/hob bases open to reveal a white interior; appliances keep their finish body
          body = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, h, d), (isSink || isHob) ? interiorMat : carcassMat);
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w - GAP, h, d)), new THREE.LineBasicMaterial({ color: 0x5f472e, transparent: true, opacity: 0.28 }));
          edges.position.set(cx, cy, cz); parent.add(edges);
        }
        body.position.set(cx, cy, cz); body.userData = { name: u.name, w: ri(u.width_mm), h: ri(u.height_mm) || (f === "tall" ? 2080 : 720), d: ri(u.depth_mm) || 600, code: u.code, idx: idxOf.get(u), appliance: /^appl-/.test(String(u.code || "")) }; parent.add(body); bodies.push(body);
        // ── reusable openable builders — shared by normal cabinets AND the sink/hob/
        //    oven special units (so those open too, in addition to their extra geometry). ──
        // one hinged leaf group. axis 'y' swings sideways (normal door); axis 'x' hinges
        // downward about its bottom edge (oven door). `openAngle` is the fully-open target.
        const mkLeaf = (sign, leafW, leafH, yC, zC, opts) => {
          opts = opts || {};
          const ax = opts.axis || "y";
          const pivot = new THREE.Group();
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.02, leafW - 0.006), leafH * 0.985, 0.018), opts.mat || carcassMat);
          leaf.position.set(ax === "x" ? 0 : sign * leafW / 2, ax === "x" ? -leafH / 2 : 0, 0); pivot.add(leaf);
          if (!opts.noHandle) { const hb = new THREE.Mesh(new THREE.BoxGeometry(ax === "x" ? leafW * 0.7 : 0.02, ax === "x" ? 0.02 : Math.min(0.16, leafH * 0.4), 0.03), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.35, metalness: 0.7 })); hb.position.set(ax === "x" ? 0 : sign * (leafW - 0.05), ax === "x" ? -leafH + 0.04 : (f === "wall" ? -leafH * 0.2 : leafH * 0.2), 0.03); pivot.add(hb); }
          pivot.position.set(ax === "x" ? cx : cx - sign * (w - GAP) / 2, yC, zC); pivot.userData = { target: 0, curr: 0, sign, axis: ax, openAngle: opts.openAngle != null ? opts.openAngle : -sign * 1.85 };
          parent.add(pivot); doorLeaves.push(pivot); return pivot;
        };
        // one sliding drawer group; its FRONT is an individually-clickable raycast target
        // so a click on that front opens only that drawer (Part 2b).
        const mkDrawer = (sy, slotH) => {
          const t = 0.016, travel = Math.min(0.42, d * 0.72);
          const g = new THREE.Group();
          const front = new THREE.Mesh(new THREE.BoxGeometry(w - GAP - 0.006, slotH - 0.008, 0.018), carcassMat); front.position.set(0, 0, d / 2 + 0.004); g.add(front);
          const hb = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.2, w * 0.4), 0.02, 0.024), new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.35, metalness: 0.7 })); hb.position.set(0, 0, d / 2 + 0.02); g.add(hb);
          const boxH = slotH * 0.7;
          const bmat = new THREE.MeshStandardMaterial({ color: 0xe9ebee, roughness: 0.8 });
          const dbox = (gw, gh, gd, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), bmat); m.position.set(px, py, pz); g.add(m); };
          dbox(w - GAP - 2 * t, t, d - 0.06, 0, -boxH / 2, 0);              // base
          dbox(w - GAP - 2 * t, boxH, t, 0, 0, -(d - 0.06) / 2);           // back
          dbox(t, boxH, d - 0.06, -(w - GAP) / 2 + t, 0, 0);              // left
          dbox(t, boxH, d - 0.06, (w - GAP) / 2 - t, 0, 0);              // right
          g.position.set(cx, sy, cz); g.userData = { target: 0, curr: 0, travel, baseZ: cz, _open: false }; parent.add(g); drawerSlides.push(g);
          front.userData = { isDrawerFront: true, slide: g, parentBody: body }; drawerFronts.push(front);
          return g;
        };
        const buildDoors = (nDoors, leafH, yC, zC) => { const nLeaf = nDoors >= 2 ? 2 : 1, leafW = (w - GAP) / nLeaf; return nLeaf === 2 ? [mkLeaf(1, leafW, leafH, yC, zC), mkLeaf(-1, leafW, leafH, yC, zC)] : [mkLeaf(1, leafW, leafH, yC, zC)]; };
        const buildDrawers = (nDr, regionH, yBottom) => { const nD = Math.min(nDr, 4), slotH = regionH / nD, sl = []; for (let i = 0; i < nD; i++) sl.push(mkDrawer(yBottom + slotH * (i + 0.5), slotH)); return sl; };
        // 🚪 sliding wardrobe — overlapping BYPASS panels on two depth planes, in an aluminium top+bottom track.
        // Each panel slides sideways on click (click a panel → it steps behind its neighbour).
        const buildSliding = (nLeaves, leafH, yC, zFront) => {
          const panels = Math.max(2, Math.min(nLeaves, 4));
          const overlap = 0.05;
          const panelW = ((w - GAP) + (panels - 1) * overlap) / panels;
          const alu = new THREE.MeshStandardMaterial({ color: 0xc4c8ce, roughness: 0.35, metalness: 0.72 });
          [yC + leafH / 2 - 0.015, yC - leafH / 2 + 0.015].forEach(ty => { const tr = new THREE.Mesh(new THREE.BoxGeometry(w - GAP, 0.03, 0.06), alu); tr.position.set(cx, ty, zFront - 0.015); parent.add(tr); });
          const leaves = [];
          for (let i = 0; i < panels; i++) {
            const baseX = cx - (w - GAP) / 2 + panelW / 2 + i * (panelW - overlap);
            const zc = zFront + (i % 2 ? 0.028 : 0);   // alternate planes → real bypass overlap
            const g = new THREE.Group();
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.004, leafH * 0.985, 0.02), carcassMat); g.add(leaf);
            const stile = new THREE.Mesh(new THREE.BoxGeometry(0.03, leafH * 0.985, 0.024), alu); stile.position.set(panelW / 2 - 0.02, 0, 0.002); g.add(stile);   // aluminium edge frame
            const stile2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, leafH * 0.985, 0.024), alu); stile2.position.set(-panelW / 2 + 0.02, 0, 0.002); g.add(stile2);
            g.position.set(baseX, yC, zc); g.userData = { target: 0, curr: 0, slide: true, dir: (i % 2 ? -1 : 1), baseX, travelX: (panelW - overlap) * 0.9 }; parent.add(g); leaves.push(g); slidePanels.push(g);
          }
          return leaves;
        };

        // door leaf/leaves — sliding shows bypass panels; others swing open on click
        if (openable && doors > 0) {
          if (door === "sliding") body.userData.slideLeaves = buildSliding(doors, h, cy, fz);
          else body.userData.doorPivots = buildDoors(doors, h, cy, fz);
        } else if (drawerUnit) {
          body.userData.drawerSlides = buildDrawers(drawers, drawerRegionH || (h - 0.02), cy - h / 2 + 0.01);
        } else if (isGlass && !isFascia) {
          // glass door — dark interior + shelves + a translucent pane (already shows shelves)
          const interior = new THREE.Mesh(new THREE.BoxGeometry((w - GAP) * 0.8, h * 0.82, 0.004), new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.95, metalness: 0 }));
          interior.position.set(cx, cy, fz - 0.003); parent.add(interior);
          const nsh = Math.min(ri(u.shelves) || 3, 6);
          for (let i = 1; i <= nsh; i++) { const sy = cy - h * 0.4 + (h * 0.8) * i / (nsh + 1); const sh = new THREE.Mesh(new THREE.BoxGeometry((w - GAP) * 0.78, 0.01, 0.05), new THREE.MeshStandardMaterial({ color: 0x6b5a44, roughness: 0.8 })); sh.position.set(cx, sy, fz - 0.02); parent.add(sh); }
          const g = new THREE.Mesh(new THREE.BoxGeometry((w - GAP) * 0.82, h * 0.84, 0.006), new THREE.MeshStandardMaterial({ color: 0xbcd4e6, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.32 }));
          g.position.set(cx, cy, fz); parent.add(g);
        }
        // 🧥 open-closet interior — laid top→bottom: hanging tier(s) with a rail UNDER a shelf,
        //    then open shelves, sitting above the bottom drawer band. Reads true to the drawing.
        if (openCloset) {
          const t2 = 0.018;
          const railMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.85 });
          const railLen = w - GAP - 0.06, railZ = cz - 0.02;
          const shelfW = w - GAP - 2 * t2, shelfD = d - t2 - 0.03;
          const mkShelf = (yy) => { const s = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.016, shelfD), carcassMat); s.position.set(cx, yy, cz + 0.005); parent.add(s); };  // shelves match the carcase (OUTSIDE finish)
          const mkRail = (yy) => { const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, railLen, 12), railMat); rl.rotation.z = Math.PI / 2; rl.position.set(cx, yy, railZ); parent.add(rl); };
          let top = cy + h / 2 - t2;                       // interior ceiling
          const bottom = cy - h / 2 + t2 + drawerRegionH;  // interior floor (above any drawers)
          if (wantsHang) {
            const tiers = /double/.test(_ut) ? 2 : 1;
            const tierH = Math.max(0.35, Math.min(1.05, (top - bottom) / tiers)); // ~1 m garment drop per tier
            for (let i = 0; i < tiers && top - 0.1 > bottom; i++) {
              mkShelf(top);                 // shelf caps this hanging section
              mkRail(top - 0.06);           // rail hangs directly under the shelf
              top -= tierH;                 // next tier starts a garment-drop lower
            }
          }
          // remaining open shelves fill the space between the last hanging tier and the drawers
          if (nShelvesOpen > 0 && top - bottom > 0.12) {
            for (let i = 1; i <= nShelvesOpen; i++) mkShelf(bottom + (top - bottom) * i / (nShelvesOpen + 1));
          } else if (!wantsHang && nShelvesOpen === 0 && drawers === 0) {
            mkShelf(cy + h / 2 - 0.10);      // fallback: a single top shelf so the box isn't empty
          }
        }
        // drawer handles (openable door cabinets carry handles on the leaf; appliances/sinks don't)
        const hStyle = handleStyle || "bar";
        if (!openable && !isFascia && !isSink && !isHob && !isGlass && drawers > 0 && f !== "wall" && hStyle !== "none" && hStyle !== "recessed") {
          const hMat = new THREE.MeshStandardMaterial({ color: hStyle === "knob" ? 0x3a3a3e : 0xb9bcc2, roughness: 0.35, metalness: 0.7 });
          for (let i = 0; i < Math.min(drawers, 4); i++) { const yy = cy - h / 2 + (i + 0.5) * (h / Math.min(drawers, 4)); const hb = hStyle === "knob" ? new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), hMat) : new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.18, w * 0.4), 0.018, 0.02), hMat); hb.position.set(cx, yy, cz + d / 2 + 0.02); parent.add(hb); }
        }
        // 🚰 sink / vanity → basin + gooseneck tap on the worktop. Bathroom vanities get a raised
        //    ceramic VESSEL bowl sitting ON the counter; kitchen sinks get a stainless inset.
        if (isSink && f !== "wall") {
          const topY = maxBaseH + 0.04, zc = 0.32; // worktop surface + worktop centre-line
          const steel = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, roughness: 0.28, metalness: 0.85 });
          if (isVanity) {
            const rad = Math.min(0.21, Math.max(0.13, (w - 0.2) / 2));
            const ceramic = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.02 });
            const bowl = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.82, 0.12, 30), ceramic); bowl.position.set(cx, topY + 0.06, zc); bowl.castShadow = true; parent.add(bowl);
            const inner = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.86, rad * 0.7, 0.02, 30), new THREE.MeshStandardMaterial({ color: 0xeef1f3, roughness: 0.3 })); inner.position.set(cx, topY + 0.113, zc); parent.add(inner);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.26, 12), steel); stem.position.set(cx, topY + 0.13, zc - 0.2); parent.add(stem);
            const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 12), steel); spout.rotation.x = Math.PI / 2.4; spout.position.set(cx, topY + 0.25, zc - 0.14); parent.add(spout);
          } else {
            const bw = Math.min(0.56, Math.max(0.3, w - 0.16)), bdp = Math.min(0.42, Math.max(0.26, d - 0.14));
            const rim = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.028, bdp), steel); rim.position.set(cx, topY + 0.002, zc); parent.add(rim);
            const well = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.07, 0.05, bdp - 0.07), new THREE.MeshStandardMaterial({ color: 0x14181b, roughness: 0.5, metalness: 0.5 })); well.position.set(cx, topY - 0.02, zc); parent.add(well);
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.2, 12), steel); stem.position.set(cx, topY + 0.1, zc - bdp * 0.36); parent.add(stem);
            const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 12), steel); spout.rotation.x = Math.PI / 2; spout.position.set(cx, topY + 0.2, zc - bdp * 0.16); parent.add(spout);
          }
          // …and hinged doors/drawers under the basin so the vanity base opens on click
          body.userData.doorPivots = buildDoors(doors > 0 ? doors : 2, h, cy, fz);
        }
        // 🔥 hob / cooktop → dark glass panel + four burners on top
        if (isHob && f !== "wall") {
          const topY = h + 0.05, pw = Math.min(0.56, w - 0.08), pdp = Math.min(0.5, d - 0.06);
          const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.016, pdp), new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.25, metalness: 0.2 }));
          panel.position.set(cx, topY, cz); parent.add(panel);
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const b = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshStandardMaterial({ color: 0x33373b, roughness: 0.5 })); b.rotation.x = -Math.PI / 2; b.position.set(cx + sx * (pw / 2 - 0.09), topY + 0.012, cz + sz * (pdp / 2 - 0.09)); parent.add(b); });
          // …and openable storage below the hob: drawers if it has them, else hinged doors
          if (drawers > 0) body.userData.drawerSlides = buildDrawers(drawers, h - 0.02, cy - h / 2 + 0.01);
          else body.userData.doorPivots = buildDoors(doors > 0 ? doors : 2, h, cy, fz);
        }
        // 🔌 appliance fascias — fridge / oven / dishwasher / washer
        if (isFascia) {
          const fw = (w - GAP) * 0.94, fh = h * 0.94;
          if (isFridge) {
            const dr = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.02), new THREE.MeshStandardMaterial({ color: 0x969ca3, roughness: 0.3, metalness: 0.75 })); dr.position.set(cx, cy, fz); parent.add(dr);
            const hd = new THREE.Mesh(new THREE.BoxGeometry(0.022, fh * 0.4, 0.03), new THREE.MeshStandardMaterial({ color: 0x60666d, roughness: 0.25, metalness: 0.85 })); hd.position.set(cx + fw / 2 - 0.03, cy + h * 0.1, fz + 0.02); parent.add(hd);
          } else if (isOven) {
            const doorH = Math.min(0.5, h * 0.55);
            const doorY = cy - h * 0.08;                     // door centre
            const ovMat = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9 });
            // the oven DOOR hinges downward (~ -1.4 rad about its bottom edge) on click
            const ovDoor = mkLeaf(1, fw, doorH, doorY + doorH / 2, fz, { axis: "x", openAngle: -1.4, mat: ovMat });
            body.userData.doorPivots = [ovDoor];
            const panel = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.08, 0.022), new THREE.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.3, metalness: 0.6 })); panel.position.set(cx, doorY + doorH / 2 + 0.06, fz); parent.add(panel);
            // any drawer in the oven housing below the door slides out
            if (drawers > 0) { const rB = cy - h / 2 + 0.01, rH = Math.max(0.06, (doorY - doorH / 2) - rB); body.userData.drawerSlides = buildDrawers(drawers, rH, rB); }
            // a built-under oven ALSO carries the hob on its worktop above (one cabinet = hob + oven)
            // — but only the FIRST one, and never a microwave unit (no duplicate hobs)
            if (f === "base" && !hobDrawn && !/microwave/.test(_ut)) {
              hobDrawn = true;
              const hTopY = counterH + 0.055, hpw = Math.min(0.56, w - 0.08), hpdp = Math.min(0.5, d - 0.06);
              const hpanel = new THREE.Mesh(new THREE.BoxGeometry(hpw, 0.016, hpdp), new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.25, metalness: 0.2 }));
              hpanel.position.set(cx, hTopY, cz); parent.add(hpanel);
              [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const bn = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshStandardMaterial({ color: 0x33373b, roughness: 0.5 })); bn.rotation.x = -Math.PI / 2; bn.position.set(cx + sx * (hpw / 2 - 0.09), hTopY + 0.012, cz + sz * (hpdp / 2 - 0.09)); parent.add(bn); });
            }
          } else {
            // dishwasher / washer / generic appliance — graphite front + steel control strip
            const fascia = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.02), new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.32, metalness: 0.5 })); fascia.position.set(cx, cy, fz); parent.add(fascia);
            const strip = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.055, 0.022), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.28, metalness: 0.7 })); strip.position.set(cx, cy + fh / 2 - 0.045, fz + 0.001); parent.add(strip);
            if (isWasher) { const dr = new THREE.Mesh(new THREE.CircleGeometry(Math.min(0.16, fw * 0.35), 20), new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.15, metalness: 0.4 })); dr.position.set(cx, cy, fz + 0.002); parent.add(dr); }
          }
        }
        return w;
      };

      // slab colour: an explicit swatch hex wins, else the legacy per-key colour map
      const wtColor = worktopHex || WT_COLOR[worktop] || WT_COLOR.quartz;
      // Live-Design worktop materials, each with its own look:
      //  quartz → light engineered stone · granite → dark mineral speckle ·
      //  marble → veined stone · solid → smooth matte · porcelain → semi-gloss ·
      //  timber → wood grain. When a swatch `worktopKind` is supplied it drives the
      //  texture/finish (so dummy variants render right); otherwise fall back to `worktop`.
      const worktopMat = () => {
        const C = new THREE.Color(wtColor);
        if (worktopKind) {
          if (worktopKind === "timber") return new THREE.MeshStandardMaterial({ map: woodTex(THREE, wtColor), color: C, roughness: 0.5, metalness: 0.04 });
          if (worktopKind === "granite") return new THREE.MeshStandardMaterial({ map: graniteTex(THREE, wtColor), color: C, roughness: 0.3, metalness: 0.06 });
          if (worktopKind === "marble") return new THREE.MeshStandardMaterial({ map: marbleTex(THREE, wtColor), color: C, roughness: 0.18, metalness: 0.02 });
          if (worktopKind === "solid") return new THREE.MeshStandardMaterial({ color: C, roughness: 0.45, metalness: 0.02 });
          if (worktopKind === "porcelain") return new THREE.MeshStandardMaterial({ color: C, roughness: 0.14, metalness: 0.04 });
          // quartz + any other stone kind → light engineered-stone speckle
          return new THREE.MeshStandardMaterial({ map: marbleTex(THREE, wtColor), color: C, roughness: 0.2, metalness: 0.03 });
        }
        if (worktop === "timber") return new THREE.MeshStandardMaterial({ map: woodTex(THREE, wtColor), color: C, roughness: 0.5, metalness: 0.04 });
        if (worktop === "granite") return new THREE.MeshStandardMaterial({ map: graniteTex(THREE, wtColor), color: C, roughness: 0.3, metalness: 0.06 });
        if (worktop === "solid_surface" || worktop === "corian") return new THREE.MeshStandardMaterial({ color: C, roughness: 0.45, metalness: 0.02 });
        if (worktop === "porcelain" || worktop === "dekton") return new THREE.MeshStandardMaterial({ color: C, roughness: 0.14, metalness: 0.04 });
        if (worktop === "marble") return new THREE.MeshStandardMaterial({ map: marbleTex(THREE, wtColor), color: C, roughness: 0.18, metalness: 0.02 });
        // quartz (default) + legacy laminate → light engineered-stone speckle
        return new THREE.MeshStandardMaterial({ map: marbleTex(THREE, wtColor), color: C, roughness: 0.2, metalness: 0.03 });
      };

      // 🧱 backsplash (wall tiles) material — procedural texture tinted by wallTileHex,
      //    repeat scaled to the run segment so tiles keep a realistic size.
      const wtileColor = wallTileHex || "#eeeeee";
      const wallTileMat = (segW, segH) => {
        const C = new THREE.Color(wtileColor);
        const kind = wallTileKind || "plain";
        if (kind === "plain") return new THREE.MeshStandardMaterial({ color: C, roughness: 0.5, metalness: 0.02 });
        const tex = tileTex(THREE, kind, wtileColor);
        if (kind === "fluted") tex.repeat.set(Math.max(1, Math.round(segW / 0.5)), 1);
        else tex.repeat.set(Math.max(1, Math.round(segW / 0.4)), Math.max(1, Math.round(segH / 0.4)));
        const rough = kind === "subway" ? 0.16 : kind === "marble" ? 0.2 : 0.5;
        return new THREE.MeshStandardMaterial({ map: tex, color: C, roughness: rough, metalness: 0.03 });
      };

      // Build one straight run into a positioned + rotated sub-group. withTop lays a worktop over base runs.
      // opts: { trackHob, legIdx } on floor runs → remember where the hob/oven-housing sits;
      //       { avoid: [x0,x1] } on wall runs → flow wall cabinets AROUND the hood zone so
      //       the extractor gets clearance and cabinets flank it (real kitchen composition).
      let hobAvoid = null, hobLeg = -1; let tallAvoids = [];   // tall-unit x-zones per leg → wall units flow around them
      const stripOn0 = ctrl.current.strip !== false;
      const buildRun = (arr, ox, oz, ry, withTop, opts) => {
        const rg = new THREE.Group();
        let x = 0; const baseSegs = [], wallSegs = [];
        // adjacent open closets share a single gable (one sheet between units) — more cost-effective
        const clozLike = (uu) => uu && /closet|wardrobe/.test(((uu.unit_type || "") + " " + (uu.name || "")).toLowerCase()) && (+uu.doors || 0) === 0;
        (arr || []).forEach((u, _ai) => {
          const f = unitFamily(u);
          const nm = ((u.unit_type || "") + " " + (u.name || "")).toLowerCase();
          const isHoodU = /hood|extractor|chimney/.test(nm);
          const uw0 = mm(u.width_mm) || 0.6;
          if (opts && opts.avoid && f === "wall" && !isHoodU) {
            const ranges = Array.isArray(opts.avoid[0]) ? opts.avoid : [opts.avoid];
            ranges.slice().sort((p, q) => p[0] - q[0]).forEach(([a0, a1]) => { if (x < a1 && x + uw0 > a0) x = a1; });
          }
          const s = x;
          const _before = rg.children.length;
          const uw = addUnit(u, x, rg, { shareLeft: clozLike(u) && clozLike(arr[_ai - 1]) }); x += uw;
          // 🎛 rot = per-unit rotation (deg). Post-wrap the meshes this unit just added into a group
          //    pivoted at the unit's footprint centre, then spin it — no change to addUnit internals.
          const _rot = +u.rot || 0;
          if (_rot) {
            const added = rg.children.slice(_before);
            added.forEach(m => rg.remove(m));
            const cxr = s + uw / 2 + mm(u.dx || 0);
            const dR = f === "wall" ? (mm(u.depth_mm) || 0.35) : (mm(u.depth_mm) || 0.6);
            const czr = dR / 2 + 0.005;
            const ug = new THREE.Group();
            added.forEach(m => { m.position.x -= cxr; m.position.z -= czr; ug.add(m); });
            ug.position.set(cxr, 0, czr);
            ug.rotation.y = _rot * Math.PI / 180;
            rg.add(ug);
          }
          if (f === "base") baseSegs.push([s, x]);
          if (f === "wall" && !isHoodU) wallSegs.push([s, x]);
          if (opts && opts.trackHob && /\bhob\b|cooktop|induction|oven housing/.test(nm)) { hobAvoid = [s - 0.04, x + 0.04]; hobLeg = opts.legIdx || 0; }
          if (opts && opts.trackHob && f === "tall") tallAvoids.push({ leg: opts.legIdx || 0, range: [s - 0.02, x + 0.02] });   // wall units skip tall/fridge zones
        });
        // 💡 under-wall-unit LED strip — per contiguous wall span, in this run's local space
        if (wallSegs.length) {
          const mergedW = [];
          wallSegs.forEach(([a, b]) => { const last = mergedW[mergedW.length - 1]; if (last && a - last[1] < 0.02) last[1] = b; else mergedW.push([a, b]); });
          const wDepth = mm((arr.find(u => unitFamily(u) === "wall") || {}).depth_mm) || 0.35;
          const frontZ = wDepth / 2 + 0.005, under = 1.45 - 0.014;
          mergedW.forEach(([a, b]) => {
            const Ws = b - a; if (Ws < 0.15) return;
            const barMat = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xfff6e6, emissiveIntensity: stripOn0 ? 1.15 : 0, roughness: 0.4, metalness: 0 });
            const bar = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.1, Ws - 0.04), 0.016, 0.028), barMat);
            bar.position.set((a + b) / 2, under, frontZ); bar.visible = stripOn0; rg.add(bar);
            wallStrips.push({ mesh: bar, mat: barMat });
            const nL = Math.max(1, Math.round(Ws / 0.9));
            for (let i = 0; i < nL; i++) {
              const pl = new THREE.PointLight(0xffe9c4, stripOn0 ? 0.5 : 0, 1.5, 2);
              pl.position.set(a + Ws * (i + 0.5) / nL, under - 0.05, frontZ + 0.04); pl.visible = stripOn0;
              rg.add(pl); wallStrips.push({ light: pl, base: 0.5 });
            }
          });
        }
        // worktop lays ONLY over base units — never over tall (larder/oven housing) units
        if (withTop && baseSegs.length) {
          const merged = [];
          baseSegs.forEach(([a, b]) => { const last = merged[merged.length - 1]; if (last && a - last[1] < 0.02) last[1] = b; else merged.push([a, b]); });
          merged.forEach(([a, b]) => { const segW = b - a; if (segW > 0.2) { const top = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.03, 0.04, 0.64), worktopMat()); top.position.set((a + b) / 2, maxBaseH + 0.02, 0.32); rg.add(top); } });
          // 🧱 backsplash — thin vertical panel at the BACK of each base seg (against the
          //    wall plane z≈0), from just above the worktop up to the wall units (1.45m)
          //    or 0.6m tall when there are no wall units above.
          if (wallTileKind && !(opts && opts.noSplash)) {
            const bsBottom = maxBaseH + 0.04;
            // splash rises to the wall units ONLY on legs that actually carry wall units;
            // legs without them get a low counter splash (no tall floating fins)
            const legHasWall = opts && opts.wallLeg !== undefined ? opts.wallLeg : wallU.length > 0;
            const bsTop = legHasWall ? 1.45 : bsBottom + 0.5;
            const bsH = Math.max(0.2, bsTop - bsBottom);
            merged.forEach(([a, b]) => { const segW = b - a; if (segW > 0.2) { const bs = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.02, bsH, 0.02), wallTileMat(segW, bsH)); bs.position.set((a + b) / 2, (bsBottom + bsTop) / 2, 0.02); rg.add(bs); } });
          }
        }
        rg.position.set(ox, 0, oz); rg.rotation.y = ry; group.add(rg);
        return x;
      };
      const runW = (arr) => (arr || []).reduce((s, u) => s + (mm(u.width_mm) || 0.6), 0);
      // Split a unit list into legs proportional to leg lengths (mm).
      const splitByLen = (arr, lengths) => {
        const tot = lengths.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
        const totW = runW(arr);
        const targets = lengths.map(l => ((Number(l) || 0) / tot) * totW);
        const out = lengths.map(() => []); let li = 0, acc = 0;
        (arr || []).forEach(u => { const w = mm(u.width_mm) || 0.6; if (li < out.length - 1 && acc >= targets[li]) { li++; acc = 0; } out[li].push(u); acc += w; });
        return out;
      };
      // CORNER-SAFE split — a sink/hob/oven/dishwasher must never land AT a bend.
      // After splitting, if a leg starts or ends with a work unit, swap it inward
      // with the nearest plain storage unit on the same leg.
      const splitSafe = (arr, lengths) => {
        const out = splitByLen(arr, lengths);
        if (out.length < 2) return out;
        const isWork = (u) => /sink|basin|\bhob\b|cooktop|induction|\boven\b|dishwash|appliance/i.test((u.unit_type || "") + " " + (u.name || ""));
        out.forEach((L, i) => {
          if (!L || L.length < 2) return;
          if (i > 0 && isWork(L[0])) {                       // corner at the START of legs B/C
            const j = L.findIndex((u, k) => k > 0 && !isWork(u));
            if (j > 0) { const t = L[0]; L[0] = L[j]; L[j] = t; }
          }
          const e = L.length - 1;
          if (i < out.length - 1 && isWork(L[e])) {          // corner at the END of legs A/B
            let j = -1; for (let k = e - 1; k >= 0; k--) { if (!isWork(L[k])) { j = k; break; } }
            if (j >= 0) { const t = L[e]; L[e] = L[j]; L[j] = t; }
          }
        });
        return out;
      };

      const lg = legs || {}, D = D0, HALF = Math.PI / 2;
      const num = (v) => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
      const wa = num(lg.a), wb = num(lg.b), wc = num(lg.c);
      let WA = 0;
      // wall run for leg i — hood-zone avoidance applies only on the leg carrying the hob
      const avoidFor = (i) => {
        const ranges = [];
        if (hobLeg === i && hobAvoid) ranges.push(hobAvoid);
        tallAvoids.forEach(t => { if (t.leg === i) ranges.push(t.range); });
        return ranges.length ? { avoid: ranges } : undefined;
      };
      if (layout === "l") {
        // If the second leg isn't sized yet, split evenly so the L still bends.
        const lens = wb ? [wa || 1, wb] : [1, 1];
        const [A, B] = splitSafe(floorU, lens);
        const wl = wallU.length ? splitByLen(wallU, lens) : [[], []];
        WA = buildRun(A, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wl[0].length > 0 });
        buildRun(B, WA, D, -HALF, true, { trackHob: true, legIdx: 1, wallLeg: wl[1].length > 0 }); // right wall, turns toward the front
        if (wl[0].length) buildRun(wl[0], 0, 0, 0, false, avoidFor(0));
        if (wl[1].length) buildRun(wl[1], WA, D, -HALF, false, avoidFor(1));
      } else if (layout === "peninsula") {
        // wall leg A + a base run turning FORWARD at the open end (the peninsula
        // return). Wall units hang on leg A only (matches runTotals: top = ta).
        const [A, B] = splitSafe(floorU, wb ? [wa || 1, wb] : [1, 1]);
        WA = buildRun(A, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wallU.length > 0 });
        buildRun(B, WA, D, -HALF, true, { wallLeg: false, noSplash: true }); // open return — no wall behind it
        if (wallU.length) buildRun(wallU, 0, 0, 0, false, avoidFor(0));
      } else if (layout === "u") {
        const lens = (wb || wc) ? [wa || 1, wb || (wa ? wa * 0.5 : 1), wc || (wa ? wa * 0.5 : 1)] : [1, 1, 1];
        const [A, B, C] = splitSafe(floorU, lens);
        const wl = wallU.length ? splitByLen(wallU, lens) : [[], [], []];
        WA = buildRun(A, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wl[0].length > 0 });
        buildRun(B, WA, D, -HALF, true, { trackHob: true, legIdx: 1, wallLeg: wl[1].length > 0 });   // right wall
        buildRun(C, 0, runW(C) + D, HALF, true, { trackHob: true, legIdx: 2, wallLeg: wl[2].length > 0 }); // left wall
        if (wl[0].length) buildRun(wl[0], 0, 0, 0, false, avoidFor(0));
        if (wl[1].length) buildRun(wl[1], WA, D, -HALF, false, avoidFor(1));
        if (wl[2].length) buildRun(wl[2], 0, runW(C) + D, HALF, false, avoidFor(2));
      } else if (layout === "parallel" || layout === "galley") {
        const lens = wb ? [wa || 1, wb] : [1, 1];
        const [A, B] = splitByLen(floorU, lens);   // no corners in a galley — plain split
        const wl = wallU.length ? splitByLen(wallU, lens) : [[], []];
        WA = buildRun(A, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wl[0].length > 0 });
        buildRun(B, runW(B), RG, Math.PI, true, { trackHob: true, legIdx: 1, wallLeg: wl[1].length > 0 }); // opposite wall, facing back — gap = RG
        if (wl[0].length) buildRun(wl[0], 0, 0, 0, false, avoidFor(0));
        if (wl[1].length) buildRun(wl[1], runW(B), RG, Math.PI, false, avoidFor(1));
      } else if (layout === "island") {
        // an Island module in the design IS the island — lay it out in the room,
        // fully detailed (doors/worktop), instead of a plain procedural box
        const isIsl = (u) => /island/i.test((u.unit_type || "") + " " + (u.name || ""));
        const islU = floorU.filter(isIsl), rest = floorU.filter(u => !isIsl(u));
        WA = buildRun(rest.length ? rest : floorU, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wallU.length > 0 });
        if (wallU.length) buildRun(wallU, 0, 0, 0, false, avoidFor(0));
        if (islU.length) {
          const iw = runW(islU);
          buildRun(islU, WA / 2 - iw / 2, 2.0, 0, true, { wallLeg: false, noSplash: true });
        } else {
          // no island module in the quote — draw a detailed placeholder island
          const iw = Math.max(0.9, Math.min(mm(lg.island) || 1.6, 2.4));
          const isl = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(iw, 0.9 - 0.1, 0.8), interiorMat); body.position.set(0, 0.5, 0); isl.add(body);
          const front = new THREE.Mesh(new THREE.BoxGeometry(iw - 0.02, 0.9 - 0.12, 0.02), matFor(THREE, floorU[0] || { finishName: "", finishColor: "#ece3d3" }, matCache)); front.position.set(0, 0.5, 0.41); isl.add(front);
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(iw - 0.04, 0.1, 0.68), new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 0.85 })); plinth.position.set(0, 0.05, 0); isl.add(plinth);
          const it = new THREE.Mesh(new THREE.BoxGeometry(iw + 0.08, 0.04, 0.92), worktopMat()); it.position.set(0, 0.97, 0); isl.add(it);
          isl.position.set(WA / 2, 0, 2.0); group.add(isl);
        }
      } else {
        WA = buildRun(floorU, 0, 0, 0, true, { trackHob: true, legIdx: 0, wallLeg: wallU.length > 0 });
        if (wallU.length) buildRun(wallU, 0, 0, 0, false, avoidFor(0));
      }

      // (LED strips are now emitted inside buildRun, per wall-run leg.)

      // Center the whole assembly on X/Z (keep floor at y=0).
      group.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(group);
      const ctr = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      group.position.x -= ctr.x; group.position.z -= ctr.z; scene.add(group);
      // all procedural textures (wood/marble/tile) are painted in sRGB — tag them so the
      // sRGB output pipeline shows their true tone instead of a washed-out version.
      // Every mesh also casts + receives soft shadows so the run sits IN the room.
      scene.traverse(o => {
        const m = o.material;
        if (m && m.map && THREE.sRGBEncoding && m.map.encoding !== THREE.sRGBEncoding) { m.map.encoding = THREE.sRGBEncoding; m.needsUpdate = true; }
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      const runW2 = Math.max(size.x, size.z, 0.6);
      // fit the key light's shadow frustum tightly to the run — crisp, no peter-panning
      dir.shadow.camera.left = -(runW2 / 2 + 1.2); dir.shadow.camera.right = runW2 / 2 + 1.2;
      dir.shadow.camera.top = 4; dir.shadow.camera.bottom = -1; dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 22;
      dir.shadow.camera.updateProjectionMatrix();

      // 🌿 Decorative props (toggle, default off) — subtle styling to make renders beautiful.
      //    Added as a child of `group` (after centring) so it rides the same transform as the
      //    cabinets but does NOT affect the camera framing (bbox was measured above).
      const decorGroup = new THREE.Group();
      try {
        const DM = (c, r = 0.75, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
        // mesh helper — three r128 Object3D.position is NON-writable, so always use .position.set()
        const mk = (geo, mat, x, y, z) => { const me = new THREE.Mesh(geo, mat); me.position.set(x || 0, y || 0, z || 0); return me; };
        const wtY = maxBaseH + 0.04;                         // worktop top surface
        const baseW = Math.max(0.6, WA || runW(floorU));     // front-run width
        if (floorU.length) {
          // potted plant on the worktop (right end)
          const pot = new THREE.Group();
          pot.add(mk(new THREE.CylinderGeometry(0.055, 0.045, 0.10, 16), DM(0xc26b4a, 0.85), 0, 0.05, 0));
          [[0, 0.15, 0.09], [0.05, 0.12, 0.07], [-0.05, 0.12, 0.07], [0.015, 0.19, 0.06]].forEach(([dx, dy, rr]) => pot.add(mk(new THREE.SphereGeometry(rr, 16, 16), DM(0x5a8f4e, 0.85), dx, dy + 0.06, 0)));
          pot.position.set(baseW - 0.26, wtY, 0.30); decorGroup.add(pot);
          // tall floor plant near the left end
          const fp = new THREE.Group();
          fp.add(mk(new THREE.CylinderGeometry(0.09, 0.07, 0.24, 20), DM(0x8b9198, 0.8), 0, 0.12, 0));
          [[0, 0.40, 0.14], [0.08, 0.50, 0.11], [-0.08, 0.48, 0.11], [0, 0.60, 0.10]].forEach(([dx, dy, rr]) => fp.add(mk(new THREE.SphereGeometry(rr, 18, 18), DM(0x4f7f43, 0.85), dx, dy, 0)));
          fp.position.set(-0.30, 0, 0.24); decorGroup.add(fp);
          // fruit bowl + fruit
          decorGroup.add(mk(new THREE.CylinderGeometry(0.11, 0.07, 0.05, 20), DM(0xe9e2d4, 0.55), baseW * 0.42, wtY + 0.03, 0.32));
          [[-0.035, 0xe0574b], [0.035, 0xf2b03a], [0, 0x8bbf4c]].forEach(([dx, c]) => decorGroup.add(mk(new THREE.SphereGeometry(0.032, 12, 12), DM(c, 0.6), baseW * 0.42 + dx, wtY + 0.06, 0.32)));
          // chopping board + knife block
          decorGroup.add(mk(new THREE.BoxGeometry(0.26, 0.02, 0.16), DM(0xb0885a, 0.7), baseW * 0.18, wtY + 0.01, 0.34));
          decorGroup.add(mk(new THREE.BoxGeometry(0.08, 0.14, 0.09), DM(0x6f5233, 0.7), baseW * 0.18 + 0.06, wtY + 0.08, 0.30));
          // coffee machine
          const cm = new THREE.Group();
          cm.add(mk(new THREE.BoxGeometry(0.16, 0.17, 0.16), DM(0x2b2f36, 0.5, 0.2), 0, 0.085, 0));
          cm.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 10), DM(0x9aa0a6, 0.4, 0.6), 0, 0.05, 0.09));
          cm.position.set(baseW * 0.62, wtY, 0.30); decorGroup.add(cm);
          // a couple of books/jars
          [[0x7d9bb0, 0], [0xcf8a5a, 1]].forEach(([c, i]) => decorGroup.add(mk(new THREE.BoxGeometry(0.12, 0.03, 0.17), DM(c, 0.8), baseW * 0.28, wtY + 0.015 + i * 0.032, 0.33)));
          decorGroup.add(mk(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 14), DM(0xd9dde1, 0.3, 0.1), baseW * 0.30, wtY + 0.055, 0.30));
          // floor rug in front of the run — raised off the floor to avoid z-fighting/dither
          const rug = new THREE.Mesh(new THREE.BoxGeometry(Math.min(baseW * 0.8, 2.2), 0.02, 1.1), DM(0xe4d9c4, 1)); rug.position.set(baseW / 2, 0.012, 1.15); decorGroup.add(rug);
          // wall art on the back wall (only when no wall units clash)
          if (!wallU.length) {
            decorGroup.add(mk(new THREE.BoxGeometry(0.5, 0.36, 0.02), DM(0x3a3f45, 0.6), baseW * 0.5, 1.35, 0.02));
            decorGroup.add(mk(new THREE.BoxGeometry(0.44, 0.30, 0.005), DM(0xb9946a, 0.8), baseW * 0.5, 1.35, 0.032));
          }
          // bar stools + pendants at the island / peninsula
          if (layout === "island" || layout === "peninsula" || (legs && legs.island)) {
            const stoolX = layout === "island" ? baseW / 2 : baseW;
            const stoolZ = layout === "island" ? 2.0 + 0.75 : D0 + 0.7;
            const nS = 3;
            for (let i = 0; i < nS; i++) {
              const st = new THREE.Group();
              st.add(mk(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), DM(0x2b2f36, 0.5), 0, 0.66, 0));
              [[0.11, 0.11], [-0.11, 0.11], [0.11, -0.11], [-0.11, -0.11]].forEach(([lx, lz]) => st.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.66, 8), DM(0x9aa0a6, 0.4, 0.6), lx, 0.33, lz)));
              st.position.set(stoolX + (i - (nS - 1) / 2) * 0.55, 0, stoolZ); decorGroup.add(st);
            }
            const pendZ = layout === "island" ? 2.0 : D0;
            for (let i = 0; i < 2; i++) {
              const px = stoolX + (i - 0.5) * 0.6;
              decorGroup.add(mk(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), DM(0x2b2f36, 0.6), px, 1.95, pendZ));
              const shadeMat = new THREE.MeshStandardMaterial({ color: 0x2b2f36, emissive: 0xffe9c4, emissiveIntensity: ctrl.current.decor ? 0.9 : 0, roughness: 0.5 });
              decorGroup.add(mk(new THREE.ConeGeometry(0.09, 0.12, 18, 1, true), shadeMat, px, 1.66, pendZ));
              const pl = new THREE.PointLight(0xffe9c4, ctrl.current.decor ? 0.35 : 0, 2.2, 2); pl.position.set(px, 1.55, pendZ); decorGroup.add(pl);
            }
          }
        }
      } catch (e) { /* decor is cosmetic — never break the render */ }
      decorGroup.visible = ctrl.current.decor === true;
      group.add(decorGroup);

      // ── background: room (walls+floor) · dark studio · clean studio · solid color ──
      const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(runW2 + 12, runW2 + 12), new THREE.MeshStandardMaterial({ color: 0xd6d1c9, roughness: 0.95 }));
      floorMesh.rotation.x = -Math.PI / 2; floorMesh.receiveShadow = true; scene.add(floorMesh);
      const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(runW2 + 6, 3.0), new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 1 }));
      backMesh.position.set(0, 1.5, -ctr.z - 0.02); scene.add(backMesh);
      const sideMesh = new THREE.Mesh(new THREE.PlaneGeometry((size.z || 2) + 4, 3.0), new THREE.MeshStandardMaterial({ color: 0xece7de, roughness: 1 }));
      sideMesh.rotation.y = Math.PI / 2; sideMesh.position.set(-(size.x / 2) - 1.2, 1.5, 0); scene.add(sideMesh);
      const walls = [backMesh, sideMesh];
      // soft vertical gradient for a proper studio backdrop
      const gradCanvas = document.createElement("canvas"); gradCanvas.width = 16; gradCanvas.height = 256;
      { const g = gradCanvas.getContext("2d"); const grd = g.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, "#f4f2ee"); grd.addColorStop(0.55, "#e9e7e2"); grd.addColorStop(1, "#d2cdc5"); g.fillStyle = grd; g.fillRect(0, 0, 16, 256); }
      const studioBg = new THREE.CanvasTexture(gradCanvas); studioBg.minFilter = THREE.LinearFilter;
      // (the old grey contact-shadow oval is gone — real cast shadows ground the run now)
      const applyBg = (mode, hex) => {
        if (mode === "dark") { scene.background = new THREE.Color(0x1a1d22); walls.forEach(p => p.visible = false); floorMesh.visible = true; floorMesh.material.color.set(0x24272c); }
        else if (mode === "studio") { scene.background = studioBg; walls.forEach(p => p.visible = false); floorMesh.visible = true; floorMesh.material.color.set(0xd6d1c9); }
        else if (mode === "solid") { const c = new THREE.Color(hex || "#EDEFF3"); scene.background = c; walls.forEach(p => p.visible = false); floorMesh.visible = true; floorMesh.material.color.copy(c).multiplyScalar(0.92); }
        else { scene.background = new THREE.Color(0xe9e7e2); walls.forEach(p => p.visible = true); floorMesh.visible = true; floorMesh.material.color.set(0xd6d1c9); backMesh.material.color.set(0xefebe4); }
      };
      applyBg("studio");
      const applyLight = (m) => {
        if (m === "warm") { hemi.intensity = 0.5; dir.intensity = 0.8; dir.color.set(0xfff0dc); dir2.intensity = 0.3; }
        else if (m === "bright") { hemi.intensity = 0.75; dir.intensity = 1.1; dir.color.set(0xffffff); dir2.intensity = 0.32; }
        else { hemi.intensity = 0.55; dir.intensity = 0.9; dir.color.set(0xfff6ea); dir2.intensity = 0.28; }
      };

      const hl = new THREE.BoxHelper(new THREE.Object3D(), 0x635BFF); hl.visible = false; scene.add(hl);

      // frame the run at ~75% of the viewport, centred — no dead sky above the cabinets
      const target = new THREE.Vector3(0, Math.min(1.3, Math.max(0.95, size.y * 0.45)), 0);
      let az = -0.62, pol = 1.15, dist = Math.max(3.0, runW2 * 0.62 + 1.2, (size.y || 2.4) * 1.55), walkMode = false;
      const applyCam = () => {
        if (walkMode) { camera.position.set(target.x + Math.sin(az) * 0.4, 1.55, target.z + Math.cos(az) * 0.4 + dist * 0.28); camera.lookAt(target.x, 1.2, target.z - 1); }
        else { camera.position.set(target.x + dist * Math.sin(pol) * Math.sin(az), target.y + dist * Math.cos(pol), target.z + dist * Math.sin(pol) * Math.cos(az)); camera.lookAt(target); }
      };
      applyCam();
      const baseDist = dist;
      // smooth 350 ms fly between view presets (ease-out cubic) — stepped in the render loop
      const camTween = { on: false, t0: 0, from: null, to: null };
      const flyTo = (a2, p2, d2) => { walkMode = false; camTween.from = { az, pol, dist }; camTween.to = { az: a2, pol: p2, dist: d2 }; camTween.t0 = performance.now(); camTween.on = true; };
      const doAllDoors = (open) => { bodies.forEach(b => { const pv = b.userData.doorPivots, dr = b.userData.drawerSlides, sl = b.userData.slideLeaves; if (pv || dr || sl) { b.userData._open = open; if (pv) pv.forEach(p => { p.userData.target = open ? (p.userData.openAngle != null ? p.userData.openAngle : -p.userData.sign * 1.85) : 0; if (p.userData.slide) p.userData._open = open; }); if (dr) dr.forEach(p => { p.userData.target = open ? p.userData.travel : 0; p.userData._open = open; }); if (sl) sl.forEach(p => { p.userData.target = open ? p.userData.dir * p.userData.travelX : 0; }); } }); };
      const totalDims = { w: Math.round(size.x * 1000), d: Math.round((size.z || 0.6) * 1000), h: Math.round(size.y * 1000) };
      setTdims(totalDims);
      // ── 📐 measurements: dimension lines + mm labels drawn in 3D (toggle) ──
      const dimGroup = new THREE.Group(); dimGroup.visible = false; scene.add(dimGroup);
      const dimMat = new THREE.LineBasicMaterial({ color: 0x2b2f36, transparent: true, opacity: 0.9 });
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const mkLabel = (txt) => {
        const c = document.createElement("canvas"); c.width = 256; c.height = 72; const g = c.getContext("2d");
        g.fillStyle = "rgba(20,22,26,0.9)"; const rr = 12; g.beginPath(); g.moveTo(rr, 4); g.arcTo(252, 4, 252, 68, rr); g.arcTo(252, 68, 4, 68, rr); g.arcTo(4, 68, 4, 4, rr); g.arcTo(4, 4, 252, 4, rr); g.fill();
        g.fillStyle = "#fff"; g.font = "bold 38px -apple-system,Segoe UI,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 38);
        const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(0.46, 0.13, 1); return s;
      };
      const addDim = (p1, p2, txt) => {
        dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), dimMat));
        [p1, p2].forEach(p => { const t = p.clone(); t.y += 0.04; dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().setY(p.y - 0.04), t]), dimMat)); });
        const mid = p1.clone().add(p2).multiplyScalar(0.5); const spr = mkLabel(txt); spr.position.copy(mid); spr.position.y += 0.09; dimGroup.add(spr);
      };
      const hxD = size.x / 2, zF = (size.z || 0.6) / 2;
      addDim(V(-hxD, -0.05, zF + 0.18), V(hxD, -0.05, zF + 0.18), totalDims.w + " mm");        // overall width (front)
      addDim(V(-hxD - 0.18, 0, zF), V(-hxD - 0.18, size.y, zF), totalDims.h + " mm");           // overall height (left)
      addDim(V(hxD + 0.14, 0.02, -zF), V(hxD + 0.14, 0.02, zF), totalDims.d + " mm");           // depth (right)

      // ── △ work triangle: fridge ↔ sink ↔ hob, measured from the placed meshes ──
      const triGroup = new THREE.Group(); triGroup.visible = false; scene.add(triGroup);
      group.updateMatrixWorld(true);
      const findBody = (re) => { for (let i = 0; i < bodies.length; i++) { if (re.test(String(bodies[i].userData.name || ""))) return bodies[i]; } return null; };
      // hob may live ON the oven housing (hob-over-oven combo) — fall back to that body
      const bFridge = findBody(/fridge|freezer/i), bSink = findBody(/sink|basin/i), bHob = findBody(/\bhob\b|cooktop|induction/i) || findBody(/oven housing/i);
      if (bFridge && bSink && bHob) {
        const pF = bFridge.getWorldPosition(new THREE.Vector3());
        const pS = bSink.getWorldPosition(new THREE.Vector3());
        const pH = bHob.getWorldPosition(new THREE.Vector3());
        const flat = (p) => new THREE.Vector3(p.x, 0, p.z);
        const d2 = (p, q) => flat(p).distanceTo(flat(q));
        const fs = d2(pF, pS), sh = d2(pS, pH), hf = d2(pH, pF), sum = fs + sh + hf;
        const legArr = [fs, sh, hf];
        const allGood = legArr.every(d => d >= 1.2 && d <= 2.7) && sum >= 4 && sum <= 8;
        const rating = allGood ? "good" : (legArr.some(d => d < 1.2) || sum < 4) ? "tight" : "far";
        // dashed overlay at a readable height
        const yT = 1.0;
        const P = { F: new THREE.Vector3(pF.x, yT, pF.z), S: new THREE.Vector3(pS.x, yT, pS.z), H: new THREE.Vector3(pH.x, yT, pH.z) };
        const dashMat = new THREE.LineDashedMaterial({ color: rating === "good" ? 0x16a34a : rating === "tight" ? 0xf59e0b : 0xdc2626, dashSize: 0.09, gapSize: 0.06, linewidth: 2, transparent: true, opacity: 0.95, depthTest: false });
        const mkLeg = (a, b, txt) => {
          const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), dashMat);
          ln.computeLineDistances(); triGroup.add(ln);
          const mid = a.clone().add(b).multiplyScalar(0.5); const spr = mkLabel(txt); spr.position.copy(mid); spr.position.y += 0.05; triGroup.add(spr);
        };
        mkLeg(P.F, P.S, fs.toFixed(2) + " m"); mkLeg(P.S, P.H, sh.toFixed(2) + " m"); mkLeg(P.H, P.F, hf.toFixed(2) + " m");
        [["F", P.F, 0x635BFF], ["S", P.S, 0x0891b2], ["H", P.H, 0xdc2626]].forEach(([lbl, p, col]) => {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
          dot.position.copy(p); triGroup.add(dot);
          const s = mkLabel(lbl); s.scale.set(0.2, 0.11, 1); s.position.set(p.x, p.y + 0.14, p.z); triGroup.add(s);
        });
        if (cbRef.current.onWorkTriangle) cbRef.current.onWorkTriangle({ legs: { fs, sh, hf }, sum, rating });
      } else {
        if (cbRef.current.onWorkTriangle) cbRef.current.onWorkTriangle(null);
      }

      // ── 🍳 hood over the hob — planted directly at the hob's WORLD position, as a top-level
      //    scene child, so it lands right whatever leg the hob is on (single/L/U/galley). ──
      try {
        if (hoodU.length && bHob) {
          const wHob = bHob.getWorldPosition(new THREE.Vector3());
          // face the hood toward the room the same way the hob's run does
          const legQuat = new THREE.Quaternion(); bHob.parent.getWorldQuaternion(legQuat);
          const wq = new THREE.Vector3(0, 0, 1).applyQuaternion(legQuat);   // run's outward normal
          const yaw = Math.atan2(wq.x, wq.z);
          const w = 0.6, h = 0.62, d = 0.4, cy = 1.55;
          const steel = new THREE.MeshStandardMaterial({ color: 0xd0d4d9, roughness: 0.34, metalness: 0.62 });
          const hg = new THREE.Group();
          const canopyH = 0.16;
          const canopy = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.30, w * 0.52, canopyH, 4), steel);
          canopy.rotation.y = Math.PI / 4; canopy.position.set(0, -h / 2 + canopyH / 2, d * 0.05); canopy.castShadow = true; hg.add(canopy);
          const chim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, Math.max(0.08, h - canopyH), d * 0.5), steel);
          chim.position.set(0, -h / 2 + canopyH + Math.max(0.08, h - canopyH) / 2, -d * 0.12); chim.castShadow = true; hg.add(chim);
          // position at the hob's world x/z, on the wall plane, at wall-cabinet height
          hg.position.set(wHob.x, cy, wHob.z - 0.30 * Math.cos(yaw)); hg.rotation.y = yaw;
          // nudge back to the wall along the run normal so it hugs the splash
          hg.position.x = wHob.x - 0.22 * Math.sin(yaw); hg.position.z = wHob.z - 0.22 * Math.cos(yaw);
          scene.add(hg);
        }
      } catch (e) { /* cosmetic — never break the render */ }

      viewApi.current = {
        front: () => { flyTo(0, 1.44, baseDist * 0.92); },
        iso: () => { flyTo(-0.62, 1.15, baseDist); },
        top: () => { flyTo(0, 0.12, baseDist * 1.15); },
        reset: () => { flyTo(-0.62, 1.15, baseDist); },
        setBg: (mode, hex) => applyBg(mode, hex),
        setLight: (m) => applyLight(m),
        setWalk: (on) => { walkMode = on; if (!on) { az = -0.62; pol = 1.15; dist = baseDist; } applyCam(); },
        setAllDoors: (open) => doAllDoors(open),
        setStrip: (on) => { wallStrips.forEach(s => { if (s.mat) s.mat.emissiveIntensity = on ? 1.15 : 0; if (s.mesh) s.mesh.visible = on; if (s.light) { s.light.intensity = on ? s.base : 0; s.light.visible = on; } }); },
        setDecor: (on) => { decorGroup.visible = !!on; decorGroup.traverse(o => { if (o.isPointLight) o.intensity = on ? 0.35 : 0; if (o.material && o.material.emissive && o.geometry && o.geometry.type === "ConeGeometry") o.material.emissiveIntensity = on ? 0.9 : 0; }); },
        setDims: (on) => { dimGroup.visible = on; },
        setTri: (on) => { triGroup.visible = on; },
        totalDims,
        resize: () => { const w2 = mount.clientWidth || W, h2 = mount.clientHeight || H; renderer.setPixelRatio(Math.min(2.5, window.devicePixelRatio || 1)); renderer.setSize(w2, h2); camera.aspect = w2 / h2; camera.updateProjectionMatrix(); applyCam(); },
        snapshot: (twoK) => { try {
          const w2 = mount.clientWidth || W, h2 = mount.clientHeight || H;
          if (twoK) { const tw = 2560, th = Math.max(1, Math.round(2560 * h2 / w2)); const oldPR = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(tw, th, false); camera.aspect = tw / th; camera.updateProjectionMatrix(); renderer.render(scene, camera); const url = renderer.domElement.toDataURL("image/jpeg", 0.95); renderer.setPixelRatio(oldPR); renderer.setSize(w2, h2, false); camera.aspect = w2 / h2; camera.updateProjectionMatrix(); return url; }
          renderer.render(scene, camera); return renderer.domElement.toDataURL("image/jpeg", 0.95);
        } catch (e) { return null; } },
        clearSel: () => { selMeshRef.current = null; hl.visible = false; if (cbRef.current.onPick) cbRef.current.onPick(null); },
        removeSelected: () => { const m = selMeshRef.current; if (!m) return; if (cbRef.current.onRemoveUnit) cbRef.current.onRemoveUnit(m.userData.code); },
      };

      const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
      // raycast targets: unit bodies + every individual drawer front (so a click on
      // one drawer opens just that drawer — Part 2b).
      const pickables = bodies.concat(drawerFronts);
      const resolveBody = (o) => (o && o.userData && o.userData.isDrawerFront) ? o.userData.parentBody : o;
      const toggleUnit = (m) => { const pv = m.userData.doorPivots, dr = m.userData.drawerSlides, sl = m.userData.slideLeaves; if (pv || dr || sl) { const nowOpen = !m.userData._open; m.userData._open = nowOpen; if (pv) pv.forEach(p => { p.userData.target = nowOpen ? (p.userData.openAngle != null ? p.userData.openAngle : -p.userData.sign * 1.85) : 0; }); if (dr) dr.forEach(p => { p.userData.target = nowOpen ? p.userData.travel : 0; p.userData._open = nowOpen; }); if (sl) sl.forEach(p => { p.userData.target = nowOpen ? p.userData.dir * p.userData.travelX : 0; }); } };
      const toggleDrawer = (g) => { const nowOpen = !g.userData._open; g.userData._open = nowOpen; g.userData.target = nowOpen ? g.userData.travel : 0; };
      // In Edit mode a click SELECTS (highlight only). With Edit off it highlights and
      // opens/closes the unit — unless noToggle (used when a single drawer was tapped).
      const selectMesh = (m, noToggle) => {
        selMeshRef.current = m || null;
        if (m) {
          hl.setFromObject(m); hl.visible = true; setSel(m.userData); if (cbRef.current.onPick && m.userData) cbRef.current.onPick(m.userData.code);
          if (!ctrl.current.edit && !noToggle) toggleUnit(m);
        } else { hl.visible = false; setSel(null); if (cbRef.current.onPick) cbRef.current.onPick(null); }
      };
      const hitObjAt = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ptr.x = ((cx - r.left) / r.width) * 2 - 1; ptr.y = -((cy - r.top) / r.height) * 2 + 1; ray.setFromCamera(ptr, camera); const hits = ray.intersectObjects(pickables, false); return hits.length ? hits[0].object : null; };
      const hitBodyAt = (cx, cy) => resolveBody(hitObjAt(cx, cy));
      const pick = (cx, cy) => {
        const o = hitObjAt(cx, cy);
        if (o && o.userData && o.userData.isDrawerFront) {
          if (!ctrl.current.edit) toggleDrawer(o.userData.slide);   // open ONLY this drawer
          selectMesh(o.userData.parentBody, true);                  // highlight its unit, no all-toggle
        } else selectMesh(o);
      };

      let dragging = false, panning = false, reordering = false, lx = 0, ly = 0, movedPx = 0, downX = 0, downY = 0;
      let sizing = false, szW0 = 0, szH0 = 0, szD0 = 0, szShift = false; const SZ_MM_PER_PX = 4;
      const onDown = (e) => {
        if (twoFinger) return;   // ignore single-pointer orbit while a pinch is active
        dragging = true; panning = e.shiftKey || e.button === 1 || e.button === 2; lx = e.clientX; ly = e.clientY; downX = e.clientX; downY = e.clientY; movedPx = 0; reordering = false; sizing = false;
        // Resize mode: press on a unit and drag — right = wider, up = taller (SketchUp-style).
        if (ctrl.current.resz && e.button === 0) {
          const hit = hitBodyAt(e.clientX, e.clientY);
          if (hit && hit.userData) { panning = false; selectMesh(hit, true); sizing = true; szShift = !!e.shiftKey; szW0 = Number(hit.userData.w) || 600; szH0 = Number(hit.userData.h) || 2000; szD0 = Number(hit.userData.d) || 600; return; }
        }
        // Edit mode: pressing on ANY movable unit — including derived sinks/appliances —
        // selects it and arms a reorder drag; a press on empty space still orbits. (Part 3)
        if (ctrl.current.edit && !panning && e.button === 0) {
          const hit = hitBodyAt(e.clientX, e.clientY);
          if (hit && hit.userData) {
            selectMesh(hit, true);
            reordering = true;
          }
        }
      };
      const onMove = (e) => {
        if (!dragging) return; const dx = e.clientX - lx, dy = e.clientY - ly; movedPx += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY;
        if (sizing) { // live dimension readout while dragging (geometry rebuilds on release)
          const nw = Math.max(200, szW0 + (e.clientX - downX) * SZ_MM_PER_PX);
          const vmm = -(e.clientY - downY) * SZ_MM_PER_PX; // vertical drag → height, or DEPTH with Shift
          if (szShift) { const nd = Math.max(150, szD0 + vmm); setSel(s => s ? { ...s, w: Math.round(nw / 10) * 10, d: Math.round(nd / 10) * 10 } : s); }
          else { const nh = Math.max(200, szH0 + vmm); setSel(s => s ? { ...s, w: Math.round(nw / 10) * 10, h: Math.round(nh / 10) * 10 } : s); }
          return;
        }
        if (reordering) { if (Math.abs(e.clientX - downX) > 6 && !ctrl.current.moving) { ctrl.current.moving = true; setMoving(true); } return; }  // reorder drag must not orbit
        if (panning) { const k = dist * 0.0016; target.x -= dx * k * Math.cos(az); target.z += dx * k * Math.sin(az); target.y = Math.max(0.1, target.y + dy * k); }
        else { az -= dx * 0.01; pol = Math.min(1.52, Math.max(0.08, pol - dy * 0.008)); }
        applyCam();
      };
      const onUp = (e) => {
        const wasDrag = dragging; dragging = false;
        const ex = e.clientX != null ? e.clientX : downX, ey = e.clientY != null ? e.clientY : downY;
        if (sizing) {
          sizing = false; const m = selMeshRef.current;
          const dxmm = (ex - downX) * SZ_MM_PER_PX, dymm = -(ey - downY) * SZ_MM_PER_PX;
          const nw = Math.round(Math.max(200, szW0 + dxmm) / 10) * 10;
          if (m && m.userData && cbRef.current.onSetDim) {
            if (Math.abs(dxmm) > 15) cbRef.current.onSetDim(m.userData.code, 'w', nw);
            if (Math.abs(dymm) > 15) cbRef.current.onSetDim(m.userData.code, szShift ? 'd' : 'h', Math.round(Math.max(szShift ? 150 : 200, (szShift ? szD0 : szH0) + dymm) / 10) * 10);
          }
          panning = false; return;
        }
        if (reordering) {
          reordering = false; if (ctrl.current.moving) { ctrl.current.moving = false; setMoving(false); }
          const m = selMeshRef.current;
          const totalDx = ex - downX;
          // ~46px per slot → responsive but not twitchy; drop reorders to the new index
          if (m && Math.abs(totalDx) > 24 && cbRef.current.onReorderUnit) {
            const slots = Math.round(totalDx / 46) || (totalDx > 0 ? 1 : -1);
            cbRef.current.onReorderUnit(m.userData.code, (m.userData.idx || 0) + slots);
          }
          panning = false; return;
        }
        if (wasDrag && !panning && movedPx < 6) pick(ex, ey); panning = false;
      };
      const onKey = (e) => {
        if (!ctrl.current.edit) return; const m = selMeshRef.current; if (!m) return;
        const k = e.key;
        if (k === "Delete" || k === "Backspace") { e.preventDefault(); if (cbRef.current.onRemoveUnit) cbRef.current.onRemoveUnit(m.userData.code); }
        else if (k === "ArrowLeft") { e.preventDefault(); if (cbRef.current.onReorderUnit) cbRef.current.onReorderUnit(m.userData.code, (m.userData.idx || 0) - 1); }
        else if (k === "ArrowRight") { e.preventDefault(); if (cbRef.current.onReorderUnit) cbRef.current.onReorderUnit(m.userData.code, (m.userData.idx || 0) + 1); }
      };
      const onCtx = (e) => e.preventDefault();
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("contextmenu", onCtx);
      window.addEventListener("keydown", onKey);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      const clampDist = (d) => Math.min(runW2 * 2 + 6, Math.max(1.6, d));
      const onWheel = (e) => { e.preventDefault(); dist = clampDist(dist + e.deltaY * 0.003); applyCam(); };
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      // ── touch: pinch to zoom + two-finger pan (mobile has no scroll wheel) ──
      let pinchD0 = 0, pinchDist0 = 0, twoFinger = false, panMid = null;
      const touchDist = (t) => { const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.hypot(dx, dy); };
      const onTouchStart = (e) => {
        if (e.touches.length === 2) { e.preventDefault(); twoFinger = true; pinchD0 = touchDist(e.touches); pinchDist0 = dist; panMid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }; }
      };
      const onTouchMove = (e) => {
        if (twoFinger && e.touches.length === 2) {
          e.preventDefault();
          const d = touchDist(e.touches);
          if (pinchD0 > 0) dist = clampDist(pinchDist0 * (pinchD0 / Math.max(1, d)));  // spread fingers → zoom in
          // two-finger drag also pans the target so you can recentre while zooming
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          if (panMid) { const k = dist * 0.0016; target.x -= (mx - panMid.x) * k * Math.cos(az); target.z += (mx - panMid.x) * k * Math.sin(az); target.y = Math.max(0.1, target.y + (my - panMid.y) * k); panMid = { x: mx, y: my }; }
          applyCam();
        }
      };
      const onTouchEnd = (e) => { if (e.touches.length < 2) { twoFinger = false; panMid = null; } };
      renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
      renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
      renderer.domElement.addEventListener("touchend", onTouchEnd);
      renderer.domElement.style.touchAction = "none"; renderer.domElement.style.cursor = "grab";
      const onResize = () => { const w2 = mount.clientWidth || W, h2 = mount.clientHeight || H; renderer.setPixelRatio(Math.min(2.5, window.devicePixelRatio || 1)); renderer.setSize(w2, h2); camera.aspect = w2 / h2; camera.updateProjectionMatrix(); };
      window.addEventListener("resize", onResize);

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (camTween.on) {
          const k = Math.min(1, (performance.now() - camTween.t0) / 350);
          const e = 1 - Math.pow(1 - k, 3);
          az = camTween.from.az + (camTween.to.az - camTween.from.az) * e;
          pol = camTween.from.pol + (camTween.to.pol - camTween.from.pol) * e;
          dist = camTween.from.dist + (camTween.to.dist - camTween.from.dist) * e;
          applyCam(); if (k >= 1) camTween.on = false;
        }
        if (ctrl.current.orbit) { az += 0.006; applyCam(); }
        for (let i = 0; i < doorLeaves.length; i++) { const p = doorLeaves[i]; if (Math.abs(p.userData.target - p.userData.curr) > 0.001) { p.userData.curr += (p.userData.target - p.userData.curr) * 0.16; if (p.userData.axis === "x") p.rotation.x = p.userData.curr; else p.rotation.y = p.userData.curr; } }
        for (let i = 0; i < drawerSlides.length; i++) { const p = drawerSlides[i]; if (Math.abs(p.userData.target - p.userData.curr) > 0.001) { p.userData.curr += (p.userData.target - p.userData.curr) * 0.18; p.position.z = p.userData.baseZ + p.userData.curr; } }
        for (let i = 0; i < slidePanels.length; i++) { const p = slidePanels[i]; if (Math.abs(p.userData.target - p.userData.curr) > 0.001) { p.userData.curr += (p.userData.target - p.userData.curr) * 0.16; p.position.x = p.userData.baseX + p.userData.curr; } }
        renderer.render(scene, camera);
      };
      loop();
      // twoK defaults to true (unchanged behaviour for existing callers that do
      // apiRef.current.snapshot() with no argument) — pass snapshot(false) for a
      // fast, normal-resolution capture (e.g. many off-screen design-sheet renders).
      if (apiRef) apiRef.current = { snapshot: (twoK) => viewApi.current.snapshot(twoK !== false) };

      cleanupRef.current = () => {
        if (apiRef && apiRef.current) apiRef.current = null;
        cancelAnimationFrame(raf);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("contextmenu", onCtx);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("wheel", onWheel);
        renderer.domElement.removeEventListener("touchstart", onTouchStart);
        renderer.domElement.removeEventListener("touchmove", onTouchMove);
        renderer.domElement.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("resize", onResize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); } });
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      };
    }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; } };
  }, [sig, height, full]);

  // (legacy light-bar styles removed — the dock below owns all control styling)
  // Professional dark control dock — consistent line icons, orange = active only
  const vdiv = { width: 1, height: 22, background: "rgba(255,255,255,.14)", flexShrink: 0, margin: "0 2px" };
  const ibtn = (on) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: on ? "#FF7417" : "transparent", color: on ? "#fff" : "#91A2BB", border: "none", borderRadius: 'var(--radius-lg)', fontSize: 12, fontWeight: 700, padding: "6px 9px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "background .18s, color .18s", flexShrink: 0 });
  const mitem = (on) => ({ display: "block", width: "100%", textAlign: "left", background: on ? "rgba(255,116,23,.16)" : "transparent", color: on ? "#FF9550" : "#C7D2E4", border: "none", borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 700, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "background .15s" });
  // tiny inline line-icon set (stroke = currentColor) — one visual language, no emoji
  const IcSvg = (paths, extra) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {paths.map((d, i) => <path key={i} d={d} />)}{extra || null}
    </svg>
  );
  const icTour = IcSvg(["M3 12a9 9 0 1 0 9-9", "M3 3v6h6"]);
  const icWalk = IcSvg(["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"], <circle cx="12" cy="7" r="4" />);
  const icDoor = IcSvg(["M6 3h12v18H6z", "M14 12h.01", "M6 21h12"]);
  const icEdit = IcSvg(["M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"]);
  const icMore = IcSvg([], <><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></>);
  const cycleBg = () => setBg(b => ({ room: "studio", studio: "dark", dark: "solid", solid: "room" }[b] || "room"));
  const bgLabel = { room: "Room", studio: "Studio", dark: "Dark", solid: "Color" }[bg];
  const saveShot = () => { const url = viewApi.current.snapshot && viewApi.current.snapshot(true); if (url) { const a = document.createElement("a"); a.href = url; a.download = "closets-3d-design.jpg"; document.body.appendChild(a); a.click(); a.remove(); } };
  const cycleLight = () => setLightMode(m => ({ studio: "warm", warm: "bright", bright: "studio" }[m] || "studio"));
  const lightLabel = { studio: "Studio", warm: "Warm", bright: "Bright" }[lightMode];
  const wrapStyle = full
    ? { position: "fixed", inset: 0, zIndex: 2147483000, width: "100vw", height: "100dvh", borderRadius: 0, background: "#F2F1EE" }
    : { position: "relative", width: "100%", height, borderRadius: 'var(--radius-xl)', background: "#F2F1EE" };
  const view = (
    <div ref={wrapRef} style={{ ...wrapStyle, overflow: "hidden" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {!err && (
        <>
          {/* Professional control dock — dark, consistent with the app chrome */}
          <div className="m-dock" style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 'var(--space-1)', background: "rgba(10,22,40,.92)", border: "1px solid #263A55", borderRadius: 'var(--radius-xl)', padding: "5px 8px", boxShadow: "0 14px 34px -12px rgba(0,0,0,.5)", backdropFilter: "blur(8px)", maxWidth: "94%" }}>
            {/* view presets — small segmented group (text labels) */}
            <div style={{ display: "flex", gap: 1, background: "rgba(255,255,255,.06)", borderRadius: 'var(--radius-lg)', padding: 2 }} role="group" aria-label="Camera view">
              {[["Front", "front"], ["Iso", "iso"], ["Top", "top"]].map(([l, k]) => (
                <button key={k} type="button" onClick={() => viewApi.current[k] && viewApi.current[k]()} style={{ background: "transparent", color: "#C7D2E4", border: "none", borderRadius: 'var(--radius-md)', fontSize: 11.5, fontWeight: 700, padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", transition: "color .15s" }} title={l + " view"}
                  onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "#C7D2E4"}>{l}</button>
              ))}
            </div>
            <span style={vdiv} />
            <button type="button" onClick={() => { setOrbit(o => !o); setWalk(false); }} style={ibtn(orbit)} title="Auto 360° tour" aria-label="Tour">{icTour}</button>
            <button type="button" onClick={() => { const nw = !walk; setWalk(nw); setOrbit(false); if (nw) setFull(true); }} style={ibtn(walk)} title="First-person walkthrough" aria-label="Walk">{icWalk}</button>
            <button type="button" onClick={() => setAllOpen(o => !o)} style={{ ...ibtn(allOpen), border: "1px solid " + (allOpen ? "#FF7417" : "rgba(255,255,255,.18)"), borderRadius: 'var(--radius-lg)', padding: "5px 11px" }} title="Toggle EVERY cabinet open or closed at once. To open just one, click that cabinet in the view.">{icDoor} {allOpen ? "Close all" : "Open all"}</button>
            {(onRemoveUnit || onReorderUnit) && <button type="button" onClick={() => setEdit(v => !v)} style={ibtn(edit)} title="Edit mode: click to select, drag or ←/→ to move, Delete to remove" aria-label="Edit">{icEdit}</button>}
            {onSetDim && <button type="button" onClick={() => setResz(v => !v)} style={ibtn(resz)} title="Resize mode: press a cabinet and drag — right = wider, up = taller, Shift+up = deeper" aria-label="Resize">⤡ Resize</button>}
            <span style={vdiv} />
            <div ref={moreRef} style={{ position: "relative", display: "inline-flex" }}>
              <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-haspopup="menu" style={ibtn(moreOpen)} title="More tools">{icMore} More</button>
              {moreOpen && (
                <div role="menu" style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1, background: "rgba(13,26,46,.97)", border: "1px solid #263A55", borderRadius: 'var(--radius-lg)', padding: 6, boxShadow: "0 16px 40px -14px rgba(0,0,0,.55)", minWidth: 196, backdropFilter: "blur(8px)", zIndex: 5 }}>
                  <button type="button" onClick={cycleBg} style={mitem(false)} title="Scene background — click to cycle">🖼 Scene · {bgLabel}</button>
                  {bg === "solid" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 'var(--space-2)', padding: "3px 10px" }}><span style={{ fontSize: 11.5, fontWeight: 700, color: "#C7D2E4" }}>Solid colour</span><input type="color" value={solidHex} onChange={e => setSolidHex(e.target.value)} style={{ width: 30, height: 24, border: "1px solid #263A55", borderRadius: 'var(--radius-sm)', padding: 0, cursor: "pointer", background: "#101E33" }} title="Pick color" /></div>}
                  <button type="button" onClick={cycleLight} style={mitem(false)} title="Lighting — click to cycle">💡 Light · {lightLabel}</button>
                  <button type="button" onClick={() => setDims(d => !d)} style={mitem(dims)} title="Dimensions">📏 Dims{dims ? " ✓" : ""}</button>
                  <button type="button" onClick={() => setTri(t => !t)} style={mitem(tri)} title="Kitchen work triangle: fridge ↔ sink ↔ hob">△ Triangle{tri ? " ✓" : ""}</button>
                  <button type="button" onClick={() => setStrip(s => !s)} style={mitem(strip)} title="Under-cabinet LED strip light">💡 Strip light{strip ? " ✓" : ""}</button>
                  <button type="button" onClick={() => setDecor(d => !d)} style={mitem(decor)} title="Decorative styling — plants, props, stools, rug & art">🌿 Decor{decor ? " ✓" : ""}</button>
                  <span style={{ height: 1, background: "rgba(255,255,255,.1)", margin: "3px 2px" }} />
                  <button type="button" onClick={saveShot} style={mitem(false)} title="Save a 2K image">💾 Save 2K</button>
                  <button type="button" onClick={() => setFull(f => !f)} style={mitem(full)} title="Fullscreen">{full ? "✕ Exit fullscreen" : "⛶ Fullscreen"}</button>
                  {edit && sel && !sel.appliance && <button type="button" onClick={() => { if (viewApi.current.removeSelected) viewApi.current.removeSelected(); setMoreOpen(false); }} style={{ ...mitem(false), color: 'var(--color-danger)' }} title="Remove the selected unit (Delete)">🗑 Remove</button>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {moving && <div style={{ position: "absolute", top: 8, right: 10, background: "rgba(99,91,255,.14)", border: '1px solid var(--color-brand)', color: "#322B9E", borderRadius: 'var(--radius-md)', padding: "4px 10px", fontSize: 11.5, fontWeight: 800, pointerEvents: "none" }}>moving…</div>}
      {sel && <div style={{ position: "absolute", top: 8, left: 10, background: edit ? "rgba(99,91,255,.12)" : "rgba(255,255,255,.9)", border: edit ? '1px solid var(--color-brand)' : "1px solid rgba(0,0,0,.12)", borderRadius: 'var(--radius-md)', padding: "4px 9px", fontSize: 11.5, color: "#1d1d1f", maxWidth: "60%" }}>{edit && <span style={{ fontWeight: 800, color: "#322B9E" }}>Selected: </span>}<b style={{ fontWeight: 700 }}>{sel.name}</b> · {sel.w}×{sel.h} mm{edit && sel.appliance && <span style={{ color: "#6b6b6b" }}> · appliance (not editable)</span>}</div>}
      {dims && tdims && <div style={{ position: "absolute", top: sel ? 34 : 8, left: 10, background: "rgba(20,22,26,.82)", color: "#fff", borderRadius: 'var(--radius-md)', padding: "4px 9px", fontSize: 11, fontWeight: 700 }}>Overall {tdims.w}×{tdims.d}×{tdims.h} mm</div>}
      {edit && sel && !sel.appliance && onSetUnitFinish && finishes.length > 0 && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 54, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.95)", border: "1px solid rgba(0,0,0,.1)", borderRadius: 'var(--radius-lg)', padding: "6px 10px", maxWidth: "92%", overflowX: "auto", boxShadow: "0 10px 26px -14px rgba(0,0,0,.4)" }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: "#322B9E", whiteSpace: "nowrap" }}>🎨 Finish this unit:</span>
          {finishes.map(f => { const img = f.image_url || f.texture_url; return (
            <button key={f.id} type="button" title={f.name + (f.group_no ? " · group " + f.group_no : "")} onClick={() => onSetUnitFinish(sel.code, f.id)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px 3px 4px", borderRadius: 'var(--radius-md)', border: "1px solid rgba(0,0,0,.16)", background: 'var(--bg-2)', cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", fontFamily: "inherit" }}>
              <span style={{ width: 18, height: 18, borderRadius: 'var(--radius-sm)', border: "1px solid rgba(0,0,0,.15)", flexShrink: 0, background: img ? undefined : (f.hex || f.color || "#ccc"), backgroundImage: img ? "url(" + img + ")" : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1d1d1f" }}>{f.name}</span>
            </button>
          ); })}
        </div>
      )}
      {err && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6b6b", fontSize: 12.5, textAlign: "center", padding: 'var(--space-4)' }}>3D viewer needs an internet connection to load. Use ▤ 2D or ✨ Photoreal instead.</div>}
      <div style={{ position: "absolute", left: 10, bottom: 8, fontSize: 10, color: "#5f5f5f", background: "rgba(255,255,255,.6)", borderRadius: 'var(--radius-sm)', padding: "2px 7px", pointerEvents: "none" }}>{edit ? "EDIT: click to select · drag selected or ←/→ to move · 🗑/Delete to remove" : (walk ? "drag to look · scroll to move · " : "drag to rotate · scroll to zoom · shift-drag to pan · ") + "click any cabinet to open just that one"}</div>
    </div>
  );
  return full ? createPortal(view, document.body) : view;
}
