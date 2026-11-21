/* Neo Kitchen Designer - 3D viewport (Three.js r128, loaded on demand from /vendor like Cabinets3D).
 * Orbit / pan / pinch / keyboard camera, PBR materials with procedural wood + marble textures, layer toggles,
 * X-ray (translucent panels + edges + hinge cups / shelf pins / grooves), Explode (Levels | Fronts | Assembly with
 * joinery markers, % slider, leader-line diagram), animated door + drawer toggle (reduced-motion safe).
 * Colours are read from the CSS custom properties in neoKitchen.css (the constants block).
 * UX-1 additions: named camera views (front / rear / left / right / top / iso) with a short tween, Fit and Reset camera,
 * auto re-fit on resize while the camera has not been moved by hand, soft shadows, a brand-coloured selection outline,
 * overall measurement guides, hover cursor, and a retry on load failure. Nothing in the model / geometry is touched.
 * UX-11 additions (view3dPro.css holds every colour as a scoped --nk-* property): front-facing default camera that re-fits on
 * resize, floating category list (Category3DList) wired to the existing sidebar tab state, restrained matte materials with a
 * contact-shadow / hemisphere "AO-like" look (an approximation, NOT true ambient occlusion), and a real X-Ray / Internal view:
 * fronts ghosted, carcass in opaque blue-gray tones, fine outlines, orange (--nk-select) selection with a diagonal indicator.
 * UX-21 (workspace3d.css): Hold camera (ui.hold - no auto re-fit, no orbit / pan / zoom gestures, selection still works, the pose
 * survives a Design <-> 3D switch through poseRef), free move (left-drag orbit, right / shift / middle drag or two fingers pan,
 * wheel zoom towards the cursor, arrows + WASD nudge-pan, Alt+arrows / Q E orbit, double-click a part to focus it) and a time-based
 * open / close animation whose duration follows ui.openSpeed (openStep in workspace3d.js); double-click a door / drawer toggles it. */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FINISHES, COUNTERS } from './constants';
import { feetPositions } from './cutlist';
import { CAT_MATS } from './propMats';
import { fmtLen } from './ui';
import { useOutput } from './OutputSettingsControl';
import { curveSegs } from './outputSettings';
import { Ic } from './icons';
import {
  VIEW_PRESETS, defaultAngles, fitDistance, fitTarget, shortestYaw, clampPitch, clampDist, easeOut,
  CATEGORY_ORDER, categoryPresence, xrayStyle, pickSelectable, toneHSL, matteRough, usableFrame, fitBounds, fitFill,
  panTarget, nudgeTarget, wheelFactor, zoomAtCursor, clampTarget, focusDistance,
} from './cameraViews';
import { openStep, easeInOut, openDurationMs, gesturesAllowed } from './workspace3d';
import { LOOKS, lookOf, sunPosition, clampSun } from './lookProfiles';
import { hingeSets, hwLod } from './hingeHw'; // [NEO-HINGES-UX35] real hinge hardware: model (pure) + three glue
import { buildHingeHw, selectionOverlay } from './hingeHw3d';
import './hingeHw.css';
import './view3dPro.css';

let threeLoading = null;
export function loadThree() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threeLoading) return threeLoading;
  threeLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/vendor/three-r128.min.js';
    s.onload = () => resolve(window.THREE);
    s.onerror = () => { threeLoading = null; reject(new Error('three')); };
    document.head.appendChild(s);
  });
  return threeLoading;
}

const LEVEL = { plinth: 0, base: 1, counter: 2, wall: 3, top: 4 };
const SPACING = 240;
const DOOR_OPEN = (100 * Math.PI) / 180;

/* deterministic pseudo random (textures must not flicker between rebuilds) */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function woodTexture(THREE, base, dark, vertical, seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const p = r() * 256, w = 0.5 + r() * 2.2;
    x.strokeStyle = dark; x.globalAlpha = 0.06 + r() * 0.16; x.lineWidth = w;
    x.beginPath();
    const wob = r() * 6;
    if (vertical) { x.moveTo(p, 0); x.bezierCurveTo(p + wob, 80, p - wob, 170, p + wob * 0.4, 256); } else { x.moveTo(0, p); x.bezierCurveTo(80, p + wob, 170, p - wob, 256, p + wob * 0.4); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
function marbleTexture(THREE, base, vein, seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    x.strokeStyle = vein; x.globalAlpha = 0.12 + r() * 0.35; x.lineWidth = 0.6 + r() * 2.4;
    x.beginPath(); let px = r() * 256, py = r() * 256; x.moveTo(px, py);
    for (let k = 0; k < 7; k++) { px += (r() - 0.35) * 70; py += (r() - 0.5) * 50; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** [NEO-CLOSETS-UX24] many boxes -> ONE BufferGeometry (flat-shaded quads, positions + normals + index): a wardrobe's hung clothes are a few hundred boxes, one draw call per
 *  material. A box may be tapered: `tb` scales its BOTTOM face depth about the box centre (1.4 = a skirt that flares), the sides stay planar quads. */
function mergeBoxes(THREE, boxes) {
  const P = []; const N = []; const I = []; let off = 0;
  const quad = (a, b, c, d) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]; const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    [a, b, c, d].forEach((p) => { P.push(p[0], p[1], p[2]); N.push(nx, ny, nz); });
    I.push(off, off + 1, off + 2, off, off + 2, off + 3); off += 4;
  };
  boxes.forEach((b) => {
    const u0 = b.u0, u1 = Math.max(b.u1, b.u0 + 0.5), y0 = b.y0, y1 = Math.max(b.y1, b.y0 + 0.5), d0 = b.d0, d1 = Math.max(b.d1, b.d0 + 0.5);
    const dc = (d0 + d1) / 2; const hb = ((d1 - d0) / 2) * (b.tb || 1);
    const bo0 = dc - hb, bo1 = dc + hb; // bottom face depth range
    // 8 corners: bottom (y0) uses the scaled depth range, top (y1) the full one
    const A = [u0, y0, bo0], B = [u1, y0, bo0], C = [u1, y0, bo1], D = [u0, y0, bo1];
    const E = [u0, y1, d0], F = [u1, y1, d0], G = [u1, y1, d1], H = [u0, y1, d1];
    quad(D, C, G, H); // +z (front)
    quad(B, A, E, F); // -z (back)
    quad(C, B, F, G); // +x
    quad(A, D, H, E); // -x
    quad(H, G, F, E); // +y (top)
    quad(A, B, C, D); // -y (bottom)
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setIndex(I);
  return geo;
}

/** `label` (optional): accessible name of the canvas for another product (wardrobe studio) - [en, ar]; omitted = the kitchen text */
export default function Kitchen3D({ scene, ui, model, lang, onSelect, fitTick, camCmd, sel, unit, onToggleFront, poseRef, label, onAnchor }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({});
  const live = useRef({});
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] Precision: the segment count of every round part / handle / foot in the view (standard = the counts below)
  live.current = { scene, ui, model, onSelect, sel, unit, onToggleFront, poseRef, lang, onAnchor, output };

  const css = (name, fallback) => {
    const fb = typeof fallback === 'number' ? '#' + fallback.toString(16).padStart(6, '0') : fallback;
    try { const v = getComputedStyle(wrapRef.current).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  };

  /* ------------------------------ build ------------------------------ */
  const rebuild = useCallback(() => {
    const S = st.current; const THREE = window.THREE;
    if (!S.root || !THREE) return;
    const { scene: sc, ui: u, model: m } = live.current;
    const seg = (n) => curveSegs(n, live.current.output);
    // dispose
    S.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); }); } });
    while (S.root.children.length) S.root.remove(S.root.children[0]);
    S.keepT = new Map((S.recs || []).filter((r) => r.key).map((r) => [r.key, r.t]));
    S.recs = []; S.lines = [];
    const col = (name, fb) => new THREE.Color(css(name, fb));
    const fin = FINISHES[m.finish];
    const finCol = css(fin.cssVar, 0xb08d57), finDark = css('--nk-fin-dark', 0x3a2a1a);
    const ct = COUNTERS[m.counter];
    const xr = u.xray;
    const L = u.layers;
    const mats = {};
    const std = (color, rough, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
    const mk = (key, make) => { if (!mats[key]) mats[key] = make(); return mats[key]; };
    /* X-Ray: fronts are ghosted (opacity from xrayStyle), panels are OPAQUE blue-gray tones with a polygon offset so the fine
     * outlines never z-fight the faces; transparent materials never write depth, so nothing flickers through each other */
    const xrTone = { carcass: '--nk-x-carcass', back: '--nk-x-back', shelf: '--nk-x-shelf', box: '--nk-x-box' };
    const xrFallback = { carcass: 0xaab1bb, back: 0x8f97a3, shelf: 0xbcc2cb, box: 0xb3bac4 };
    const xrayPanel = (role) => mk(`x-${role}`, () => new THREE.MeshStandardMaterial({ color: col(xrTone[role], xrFallback[role]), roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    const xrayGhost = (kind) => mk(`x-ghost-${kind}`, () => { const o = xrayStyle(kind); const m = new THREE.MeshBasicMaterial({ color: col('--nk-x-front', 0xc5ccd8), transparent: true, opacity: o.opacity, depthWrite: false }); m.userData.ghost = true; return m; });
    const panel = (role, make) => (xr ? xrayPanel(role) : mk(role, make));
    const woodTone = (c) => { const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl); const t = toneHSL(hsl.h, hsl.s, hsl.l); return new THREE.Color().setHSL(t[0], t[1], t[2]); };
    /* UX-16 Look: per part-group colour / texture override (model.paint). Display only - the meshes, sizes and cut list are unchanged.
     * X-Ray keeps its neutral tones, so an override only applies to the normal view. */
    const pnt = m.paint || {};
    const ov = (g) => { const o = xr ? null : pnt[g]; return o && (o.c || o.t) ? o : null; };
    const paintMat = (o, defCol, rough, vertical, seed) => {
      const base = o.c ? new THREE.Color(o.c) : new THREE.Color(defCol);
      const hex = `#${base.getHexString()}`;
      if (o.t === 'wood') return std(0xffffff, rough, { map: woodTexture(THREE, hex, finDark, vertical, seed) });
      if (o.t === 'marble') return std(0xffffff, rough, { map: marbleTexture(THREE, hex, css('--nk-vein', 0x777777), seed) });
      return std(base, rough);
    };
    const frontMat = (vertical, kind) => {
      const o = ov(kind === 'door' ? 'doors' : 'drawerFronts');
      if (o) {
        return mk(`front${vertical ? 'V' : 'H'}:ov:${kind}`, () => {
          const tone = woodTone(new THREE.Color(finCol)); const rough = matteRough(fin.rough);
          if (o.t === 'off' || o.t === 'wood' || o.t === 'marble') return paintMat(o, tone, rough, vertical, 7);
          /* Default texture: the finish's own look (grain when the finish has one), only recoloured when a colour was picked */
          if (o.c) { const hex = `#${new THREE.Color(o.c).getHexString()}`; return fin.grain ? std(0xffffff, rough, { map: woodTexture(THREE, hex, finDark, vertical, 7) }) : std(new THREE.Color(o.c), rough); }
          return fin.grain ? std(0xffffff, rough, { map: woodTexture(THREE, `#${tone.getHexString()}`, finDark, vertical, 7) }) : std(tone, rough);
        });
      }
      return xr ? xrayGhost(kind) : mk(`front${vertical ? 'V' : 'H'}`, () => {
        const tone = woodTone(new THREE.Color(finCol)); const rough = matteRough(fin.rough);
        return fin.grain
          ? std(0xffffff, rough, { map: woodTexture(THREE, `#${tone.getHexString()}`, finDark, vertical, 7) })
          : std(tone, rough);
      });
    };
    /* [NEO-CUSTOM-UX28] custom furniture is made of boards in the chosen finish: its structure, shelves and top use the same finish material as a door (grain included)
     * unless the Look block paints them; back and plinth keep their own tones. The kitchen / wardrobe scenes never take this branch. */
    const CU = sc.product === 'custom';
    const finishBase = (vertical, seed) => { const tone = woodTone(new THREE.Color(finCol)); const rough = matteRough(fin.rough); return fin.grain ? std(0xffffff, rough, { map: woodTexture(THREE, `#${tone.getHexString()}`, finDark, vertical, seed) }) : std(tone, rough); };
    /* Default / Off both mean the group's own flat material; Wood grain / Marble reuse the procedural generators above */
    const grouped = (g, key, role, defCol, rough, vertical, seed) => (ov(g) ? mk(`${key}:ov`, () => paintMat(ov(g), css(defCol[0], defCol[1]), rough, vertical, seed)) : CU && !xr && g !== 'back' ? mk(`fin:${key}`, () => finishBase(vertical, seed)) : panel(role, () => std(col(defCol[0], defCol[1]), rough)));
    const carcass = () => grouped('carcass', 'carcass', 'carcass', ['--nk-carcass', 0xd8d6d0], 0.85, true, 3);
    const backM = () => grouped('back', 'back', 'back', ['--nk-back', 0xbdb9b0], 0.92, true, 5);
    const shelfM = () => grouped('shelves', 'shelf', 'shelf', ['--nk-shelf', 0xe4e2dc], 0.85, false, 9);
    const boxM = () => panel('box', () => std(col('--nk-drawerbox', 0xcfc9bd), 0.85));
    /* NEO-CLOSETS-UX24 (wardrobe scenes only): real glass - physical material, glossy, reflecting a small studio environment; clear or SMOKED; black door frames */
    const WD = sc.product === 'wardrobe' || sc.product === 'custom';
    const glassM = (smoked) => (xr ? xrayGhost('glass') : WD ? mk(smoked ? 'glass-smoked' : 'glass-clear', () => new THREE.MeshPhysicalMaterial({
      color: col(smoked ? '--nk-w-smoke' : '--nk-w-glass', smoked ? 0x1b1d21 : 0xcfe3ea), transparent: true, opacity: smoked ? 0.78 : 0.2, roughness: smoked ? 0.07 : 0.04, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.05, reflectivity: 0.9, envMap: S.getEnv ? S.getEnv() : null, envMapIntensity: smoked ? 1.35 : 0.95, depthWrite: false,
    })) : mk('glass', () => new THREE.MeshStandardMaterial({ color: col('--nk-glass', 0x8fb3c0), transparent: true, opacity: 0.34, roughness: 0.5, metalness: 0, depthWrite: false })));
    /* NEO-CATEGORIES-UX26: a mirror part (bathroom mirror cabinet / LED mirror) reflects the same small studio environment as the wardrobe glass */
    const mirrorM = () => (xr ? xrayGhost('glass') : mk('mirror', () => new THREE.MeshStandardMaterial({ color: col('--nk-c-mirror', 0xcfd9df), roughness: 0.05, metalness: 0.92, envMap: S.getEnv ? S.getEnv() : null, envMapIntensity: 1.15 })));
    /* black by default; the Look block's "Doors" colour repaints the frames of glass doors (a glass leaf has no door board to paint) */
    const frameM = () => (xr ? xrayGhost('door') : ov('doors') && ov('doors').c ? mk('frame:ov', () => new THREE.MeshStandardMaterial({ color: new THREE.Color(ov('doors').c), roughness: 0.4, metalness: 0.55 })) : mk('frame', () => new THREE.MeshStandardMaterial({ color: col('--nk-w-frame', 0x0d0e10), roughness: 0.4, metalness: 0.55 })));
    const counterM = () => {
      const o = ov('counter');
      if (o) {
        return mk('counter:ov', () => {
          if (o.t === 'off' || o.t === 'wood') return paintMat(o, css(ct.cssVar, 0xcccccc), matteRough(ct.rough), false, 11);
          return std(0xffffff, matteRough(ct.rough), { map: marbleTexture(THREE, o.c || css(ct.cssVar, 0xcccccc), css('--nk-vein', 0x777777), 11) }); // Default / Marble: the worktop's own veined look in the chosen colour
        });
      }
      if (CU && !xr) return mk('fin:counter', () => finishBase(false, 11));
      return mk('counter', () => std(0xffffff, matteRough(ct.rough), { map: marbleTexture(THREE, css(ct.cssVar, 0xcccccc), css('--nk-vein', 0x777777), 11), ...(xr ? { transparent: true, opacity: 0.62 } : {}) }));
    };
    const plinthM = () => (ov('plinth') ? mk('plinth:ov', () => paintMat(ov('plinth'), css('--nk-plinth', 0x202225), 0.9, false, 13)) : mk('plinth', () => std(col('--nk-plinth', 0x202225), 0.9)));
    const metalM = () => mk('metal', () => new THREE.MeshStandardMaterial({ color: col('--nk-metal', 0x9aa0a6), roughness: 0.55, metalness: 0.35 }));
    const handleM = () => (xr ? xrayGhost('door') : ov('handles') ? mk('metal:ov', () => new THREE.MeshStandardMaterial({ color: new THREE.Color(ov('handles').c || css('--nk-metal', 0x9aa0a6)), roughness: 0.55, metalness: 0.35 })) : metalM());
    const blackM = () => mk('black', () => std(col('--nk-faucet', 0x0b0b0c), 0.5, { metalness: 0.3 }));
    const edgeColor = col(xr ? '--nk-x-edge' : '--nk-edge', 0x444444);
    const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: xr ? 0.7 : 0.42 });
    const ghostEdgeMat = new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.22 });

    const maxZ = Math.max(sc.bounds.z1, 1); const Wm = sc.runs[0].L;
    /* UX29: a galley / island / peninsula can stand outside [0, Wm]; the model is centred on its real x extent (= Wm / 2 for every older layout) */
    const cx = (sc.bounds.x0 + sc.bounds.x1) / 2; const Wb = sc.bounds.x1 - sc.bounds.x0;
    S.root.position.set(-cx, 0, -maxZ / 2);
    const prevB = S.bounds;
    const frames = {};
    sc.runs.forEach((r) => {
      const f = new THREE.Group();
      if (r.key === 'right') { f.position.set(Wm, 0, 0); f.rotation.y = -Math.PI / 2; }
      if (r.key === 'left') { f.position.set(0, 0, r.L); f.rotation.y = Math.PI / 2; }
      if ((r.key === 'run2' || r.key === 'pen' || r.key === 'isl') && r.frame) { f.position.set(r.frame.x, 0, r.frame.z); f.rotation.y = r.frame.rot; } // UX29
      S.root.add(f); frames[r.key] = f;
    });

    const partVisible = (p) => {
      if (!L[p.row]) return false;
      if (p.view === 'front' && !L.doors) return false;
      if (p.anim && p.anim.k && !L.doors && (p.view === 'front')) return false;
      return true;
    };
    const meshOf = (p, material) => {
      const b = p.box; const w = Math.max(0.5, b.u1 - b.u0), h = Math.max(0.5, b.y1 - b.y0), d = Math.max(0.5, b.d1 - b.d0);
      let geo;
      if (p.round && (p.axis === 'u' || p.axis === 'd')) { // [NEO-CUSTOM-UX28] a round bar lying along width (u) or depth (d); the rotation is baked into the geometry so picking / outlines see the real box
        const dia = p.axis === 'u' ? Math.min(h, d) : Math.min(w, h);
        geo = new THREE.CylinderGeometry(dia / 2, dia / 2, p.axis === 'u' ? w : d, seg(28));
        if (p.axis === 'u') geo.rotateZ(Math.PI / 2); else geo.rotateX(Math.PI / 2);
      } else if (p.round) geo = new THREE.CylinderGeometry((p.axis === 'y' ? Math.min(w, d) : w) / 2, (p.axis === 'y' ? Math.min(w, d) : w) / 2, h, seg(40));
      else geo = new THREE.BoxGeometry(w, h, d);
      const me = new THREE.Mesh(geo, material);
      me.userData = { partId: p.id, unitId: p.unitId, kind: p.kind };
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), material.userData.ghost ? ghostEdgeMat : edgeMat); me.add(e);
      return me;
    };
    const centerOf = (b) => [(b.u0 + b.u1) / 2, (b.y0 + b.y1) / 2, (b.d0 + b.d1) / 2];
    /* [NEO-CUSTOM-UX28] custom pieces explode RADIALLY: every part moves away from the middle of the assembly (a kitchen's levels / sides / backs make no sense for a table) */
    const asmC = [sc.bounds.x1 / 2, sc.bounds.h / 2, sc.bounds.z1 / 2];
    const exFor = (p) => (sc.product === 'custom' ? [0.55 * ((p.box.u0 + p.box.u1) / 2 - asmC[0]), 0.55 * ((p.box.y0 + p.box.y1) / 2 - asmC[1]), 0.55 * ((p.box.d0 + p.box.d1) / 2 - asmC[2])] : undefined);
    const cat = (p) => ({ row: p.row, kind: p.kind, view: p.view, sideR: !!p.sideR, front: p.view === 'front' || p.kind === 'drawerBox', ex: exFor(p) });

    /* motion groups (one per anim object) */
    const groups = new Map();
    const groupFor = (frame, p) => {
      if (!p.anim) return null;
      let g = groups.get(p.anim);
      if (g) return g;
      const node = new THREE.Group();
      const c = centerOf(p.box);
      if (p.anim.k === 'door') node.position.set(p.anim.pivotU, 0, p.anim.pivotD);
      else if (p.anim.k === 'flip') node.position.set(c[0], p.anim.pivotY, p.anim.pivotD);
      else node.position.set(0, 0, 0);
      frame.add(node);
      g = { node, anim: p.anim, origin: node.position.clone(), frame, ids: new Set(), cat: { row: p.row, kind: 'front', view: 'front', front: true, ex: exFor(p) } };
      groups.set(p.anim, g);
      S.recs.push({ node, base: node.position.clone(), cat: g.cat, motion: p.anim, ids: g.ids, t: S.keepT && S.keepT.get(p.anim.k + ':' + p.id) || 0, key: p.anim.k + ':' + p.id });
      return g;
    };
    const addTo = (frame, p, mesh) => {
      const g = groupFor(frame, p);
      const c = centerOf(p.box);
      if (g) { g.ids.add(p.id); mesh.position.set(c[0] - g.origin.x, c[1] - g.origin.y, c[2] - g.origin.z); g.node.add(mesh); return g; }
      mesh.position.set(c[0], c[1], c[2]); frame.add(mesh);
      S.recs.push({ node: mesh, base: mesh.position.clone(), cat: cat(p) });
      return null;
    };

    sc.parts.forEach((p) => {
      if (!partVisible(p)) return;
      const frame = frames[p.runKey];
      let material;
      switch (p.kind) {
        case 'side': case 'bottom': case 'top': case 'stretcher': case 'divider': material = carcass(); break;
        case 'back': material = backM(); break;
        case 'shelf': case 'carousel': material = shelfM(); break;
        case 'drawerBox': material = boxM(); break;
        case 'plinth': material = plinthM(); break; // NEO-CATEGORIES-UX26: a plinth board a category adds as a part (the engine's own plinth is drawn from the run)
        case 'glass': material = p.mirror ? mirrorM() : glassM(!!p.smoked); break;
        case 'door': material = WD && p.frame ? frameM() : frontMat(true, 'door'); break;
        case 'drawerFront': material = frontMat(false, 'drawerFront'); break;
        case 'counter': case 'splash': material = counterM(); break; // [NEO-CUSTOM-UX28] a custom part assigned to the Top / worktop slot
        case 'plinth': material = plinthM(); break;
        case 'hw': material = metalM(); break;
        default: material = carcass();
      }
      const me = meshOf(p, material);
      if (p.rotY) me.rotation.y = p.rotY;
      addTo(frame, p, me);
    });

    /* counters, splash, plinth, feet */
    sc.runs.forEach((r) => {
      const frame = frames[r.key];
      const put = (b, material, row, kind) => {
        const w = b.u1 - b.u0, h = b.y1 - b.y0, d = b.d1 - b.d0;
        const geo = new THREE.BoxGeometry(Math.max(1, w), Math.max(1, h), Math.max(1, d));
        const me = new THREE.Mesh(geo, material); me.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
        me.position.set((b.u0 + b.u1) / 2, (b.y0 + b.y1) / 2, (b.d0 + b.d1) / 2); frame.add(me);
        S.recs.push({ node: me, base: me.position.clone(), cat: { row, kind, view: 'level' } });
        return me;
      };
      if (L.counter) {
        r.counters.forEach((c) => {
          put({ u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: c.d0, d1: c.d1 }, counterM(), 'counter', 'counter');
          c.cutouts.forEach((q) => {
            if (q.type === 'sink') {
              const bx = put({ u0: q.u0, u1: q.u1, y0: c.y1, y1: c.y1 + 2, d0: q.d0, d1: q.d1 }, mk('sinkpl', () => std(col('--nk-sink', 0x101113), 0.25, { metalness: 0.4 })), 'counter', 'counter');
              void bx;
              const cx = (q.u0 + q.u1) / 2;
              const tap = new THREE.Group();
              const stem = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, 200, seg(20)), blackM()); stem.position.set(0, 100, 0);
              const spout = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 130, seg(16)), blackM()); spout.rotation.x = Math.PI / 2; spout.position.set(0, 205, 62);
              const lever = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 60), blackM()); lever.position.set(22, 120, 0);
              tap.add(stem, spout, lever); tap.position.set(cx, c.y1, 70); frame.add(tap);
              S.recs.push({ node: tap, base: tap.position.clone(), cat: { row: 'counter', kind: 'counter', view: 'level' } });
            } else {
              put({ u0: q.u0, u1: q.u1, y0: c.y1, y1: c.y1 + 2, d0: q.d0, d1: q.d1 }, mk('hob', () => std(col('--nk-sink', 0x101113), 0.2, { metalness: 0.3 })), 'counter', 'counter');
            }
          });
        });
        r.splashes.forEach((c) => put({ u0: c.u0, u1: c.u1, y0: c.y0, y1: c.y1, d0: c.d0, d1: c.d1 }, counterM(), 'counter', 'counter'));
      }
      if (L.plinth && r.plinth && r.plinth.u1 > r.plinth.u0) {
        const pm = put({ u0: r.plinth.u0, u1: r.plinth.u1, y0: 0, y1: r.plinth.y1, d0: r.plinth.d0, d1: r.plinth.d1 }, plinthM(), 'plinth', 'plinth');
        const pu = sc.product === 'wardrobe' ? r.units.find((q) => !q.unit.hidden) : null; // NEO-CLOSETS-UX31: the wardrobe's plinth is pickable (it belongs to the run's first visible column)
        if (pu) pm.userData = { partId: `plinth:${r.key}`, unitId: pu.unit.id, kind: 'plinth' };
      }
    });
    if (L.plinth) {
      feetPositions(sc).forEach((f) => {
        const geo = new THREE.CylinderGeometry(16, 20, sc.model.g.plinthH, seg(14));
        const me = new THREE.Mesh(geo, metalM());
        me.position.set(f.u, sc.model.g.plinthH / 2, f.d); frames[f.runKey].add(me);
        S.recs.push({ node: me, base: me.position.clone(), cat: { row: 'plinth', kind: 'foot', view: 'level' } });
      });
    }

    /* appliances in niches */
    sc.appliances.forEach((a) => {
      const run = sc.runs.find((r) => r.units.some((x) => x.unit.id === a.unitId)); if (!run || !L[run.units.find((x) => x.unit.id === a.unitId).row]) return;
      const b = { u0: a.u0, u1: a.u1, y0: a.y0, y1: a.y1, d0: a.d0, d1: a.d1 };
      const geo = new THREE.BoxGeometry(b.u1 - b.u0, b.y1 - b.y0, b.d1 - b.d0);
      const me = new THREE.Mesh(geo, mk(`app${a.type}`, () => std(col(a.type === 'oven' ? '--nk-oven' : '--nk-fridge', 0x2a2a2e), 0.4, { metalness: 0.3 })));
      me.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      me.position.set((b.u0 + b.u1) / 2, (b.y0 + b.y1) / 2, (b.d0 + b.d1) / 2); frames[run.key].add(me);
      S.recs.push({ node: me, base: me.position.clone(), cat: { row: run.units.find((x) => x.unit.id === a.unitId).row, kind: 'appliance', view: 'internal' } });
    });

    /* NEO-CLOSETS-UX22 / UX24: optional display props a WARDROBE scene carries in scene.props (hanging rails, hanging and folded clothes, sliding tracks).
     * A kitchen scene has no `props`, so nothing here runs for it. Props are never parts: not in the cut list, not pickable, not in the price.
     * Each prop is { kind, runKey, row, box, boxes:[{u0..d1, mat, tone}] }: the boxes of every prop sharing a run + material + tone are merged into ONE mesh. */
    if (u.props !== false && (sc.props || []).length) {
      const buckets = new Map();
      const propMat = (mat, tone) => {
        const ghost = (m) => { if (xr) { m.transparent = true; m.opacity = 0.4; m.depthWrite = false; } return m; };
        const cm = CAT_MATS[mat]; // NEO-CATEGORIES-UX26: category studio prop materials (--nk-c-* palette); a kitchen / wardrobe prop never uses these names
        if (cm) return ghost(new THREE.MeshStandardMaterial({ color: col(cm.v, cm.fb), roughness: cm.r, metalness: cm.m, ...(cm.emit && !xr ? { emissive: col(cm.v, cm.fb), emissiveIntensity: cm.emit } : null) }));
        if (mat === 'metal') return ghost(new THREE.MeshStandardMaterial({ color: col('--nk-metal', 0x9aa0a6), roughness: 0.4, metalness: 0.7 }));
        if (mat === 'black') return ghost(new THREE.MeshStandardMaterial({ color: col('--nk-w-frame', 0x0d0e10), roughness: 0.45, metalness: 0.5 }));
        if (mat === 'wood') return ghost(new THREE.MeshStandardMaterial({ color: col('--nk-w-wood', 0xb79468), roughness: 0.7, metalness: 0 }));
        return ghost(new THREE.MeshStandardMaterial({ color: col(`--nk-w-c${tone || 0}`, 0x8899aa), roughness: 0.94, metalness: 0 }));
      };
      (sc.props || []).forEach((pr) => {
        if (!L[pr.row || 'base']) return;
        const rk = pr.runKey || 'main'; if (!frames[rk]) return;
        if (pr.kind === 'rail') { // a real tube
          const b = pr.box; const w = Math.max(0.5, b.u1 - b.u0), h = Math.max(0.5, b.y1 - b.y0);
          const me = new THREE.Mesh(new THREE.CylinderGeometry(h / 2, h / 2, w, seg(16)), propMat('metal'));
          me.rotation.z = Math.PI / 2; me.position.set((b.u0 + b.u1) / 2, (b.y0 + b.y1) / 2, (b.d0 + b.d1) / 2); frames[rk].add(me);
          if (sc.product === 'wardrobe' && pr.unitId) me.userData = { partId: `rail:${pr.unitId}`, unitId: pr.unitId, kind: 'rail' }; // NEO-CLOSETS-UX31: a wardrobe rail is pickable (quick-edit menu); a kitchen scene has no such props
          S.recs.push({ node: me, base: me.position.clone(), cat: { row: pr.row || 'base', kind: 'prop', view: 'internal' } });
          return;
        }
        (pr.boxes || [{ ...pr.box, mat: 'cloth', tone: pr.tone }]).forEach((bx) => {
          const key = `${rk}|${bx.mat || 'cloth'}|${bx.mat === 'cloth' || !bx.mat ? (bx.tone != null ? bx.tone : pr.tone || 0) : 0}|${pr.row || 'base'}`;
          if (!buckets.has(key)) buckets.set(key, { rk, mat: bx.mat || 'cloth', tone: bx.tone != null ? bx.tone : pr.tone || 0, row: pr.row || 'base', boxes: [] });
          buckets.get(key).boxes.push(bx);
        });
      });
      buckets.forEach((bk) => {
        const me = new THREE.Mesh(mergeBoxes(THREE, bk.boxes), propMat(bk.mat, bk.tone));
        frames[bk.rk].add(me);
        S.recs.push({ node: me, base: me.position.clone(), cat: { row: bk.row, kind: 'prop', view: 'internal' } });
      });
    }

    /* UX-17 LED strips (Wall tab OPTIONS): one emissive strip in the groove under each wall unit's bottom board; "LED Light On" switches the glow and its light */
    (sc.leds || []).forEach((ld, i) => {
      const run = sc.runs.find((r) => r.key === ld.runKey); const x = run && run.units.find((q) => q.unit.id === ld.unitId); if (!x || !L[x.row]) return;
      const geo = new THREE.BoxGeometry(ld.u1 - ld.u0, ld.y1 - ld.y0, ld.d1 - ld.d0);
      const lm = new THREE.MeshStandardMaterial({ color: col('--nk-look-led', 0xffc46b), emissive: ld.on ? col('--nk-look-led', 0xffc46b) : new THREE.Color(0x000000), emissiveIntensity: ld.on ? 1.6 : 0, roughness: 0.4, metalness: 0 });
      const me = new THREE.Mesh(geo, lm); me.userData.ledStrip = { unitId: ld.unitId, on: ld.on };
      me.position.set((ld.u0 + ld.u1) / 2, (ld.y0 + ld.y1) / 2, (ld.d0 + ld.d1) / 2); frames[run.key].add(me);
      S.recs.push({ node: me, base: me.position.clone(), cat: { row: x.row, kind: 'bottom', view: 'carcass' } });
      if (ld.on && i < 4) { const pl = new THREE.PointLight(0xffb060, 0.5, 1500, 2); pl.position.set((ld.u0 + ld.u1) / 2, ld.y0 - 80, (ld.d0 + ld.d1) / 2); pl.userData.ledStrip = { unitId: ld.unitId, on: true }; frames[run.key].add(pl); }
    });

    /* hardware: handles, hinge cups (x-ray), pins (x-ray), door diagonals (x-ray), joinery (assembly) */
    const partById = new Map(sc.parts.map((p) => [p.id, p]));
    if (L.hardware) {
      sc.handles.forEach((h) => {
        const p = partById.get(h.partId); if (!p || !partVisible(p) || (p.view === 'front' && !L.doors)) return;
        const frame = frames[p.runKey]; const g = groups.get(p.anim);
        let me;
        const m1 = handleM();
        if (h.style === 'knob') { me = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 20, seg(16)), m1); me.rotation.x = Math.PI / 2; }
        else if (h.style === 'profile') me = new THREE.Mesh(h.orient === 'v' ? new THREE.BoxGeometry(10, 300, 14) : new THREE.BoxGeometry(300, 10, 14), m1);
        else me = new THREE.Mesh(h.orient === 'v' ? new THREE.BoxGeometry(12, h.len + 16, 14) : new THREE.BoxGeometry(h.len + 16, 12, 14), m1);
        const pos = [h.u, h.y, h.d + 10];
        if (g) { me.position.set(pos[0] - g.origin.x, pos[1] - g.origin.y, pos[2] - g.origin.z); g.node.add(me); } else { me.position.set(...pos); frame.add(me); S.recs.push({ node: me, base: me.position.clone(), cat: cat(p) }); }
      });
      if (xr) {
        const info = col('--nk-drill', 0x378add);
        const dm = new THREE.MeshBasicMaterial({ color: info });
        sc.hinges.forEach((h) => {
          const p = partById.get(h.partId); if (!p || !L[p.row] || !L.doors) return;
          const g = groups.get(p.anim); const frame = frames[p.runKey];
          const me = new THREE.Mesh(new THREE.CylinderGeometry(h.r, h.r, 12, seg(28)), dm); me.rotation.x = Math.PI / 2;
          const pos = [h.u, h.y, (p.elevBox || p.box).d0 + 5]; // glass doors: the bore is in the frame's inner face (elevBox = whole door), not the thinner glass pane
          if (g) { me.position.set(pos[0] - g.origin.x, pos[1] - g.origin.y, pos[2] - g.origin.z); g.node.add(me); } else { me.position.set(...pos); frame.add(me); S.recs.push({ node: me, base: me.position.clone(), cat: cat(p) }); }
        });
        sc.pins.forEach((pn) => {
          const run = sc.runs.find((r) => r.units.some((x) => x.unit.id === pn.unitId)); if (!run) return;
          const row = run.units.find((x) => x.unit.id === pn.unitId).row; if (!L[row]) return;
          const me = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 10, seg(8)), dm); me.rotation.z = Math.PI / 2;
          me.position.set(pn.u + (pn.side === 'L' ? 4 : -4), pn.y, pn.d); frames[run.key].add(me);
          S.recs.push({ node: me, base: me.position.clone(), cat: { row, kind: 'side', view: 'internal', sideR: pn.side === 'R' } });
        });
        // (door-opening diagonals are drawn for the SELECTED part only - see applySel; a diagonal on every door read as clutter)
      }
      if (u.explode.on && u.explode.mode === 'assembly') {
        const jm = { dowel: col('--nk-dowel', 0xe0c07a), minifix: col('--nk-minifix', 0xd94f4f), cam: col('--nk-cam', 0x4f9d6a) };
        sc.joints.forEach((j) => {
          const carrier = partById.get(j.partId); if (!carrier || !L[carrier.row]) return;
          const frame = frames[carrier.runKey];
          const geo = j.type === 'dowel' ? new THREE.CylinderGeometry(4, 4, 30, seg(10)) : new THREE.CylinderGeometry(j.type === 'cam' ? 8 : 7.5, j.type === 'cam' ? 8 : 7.5, 12, seg(14));
          const me = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: jm[j.type] }));
          if (j.axis === 'u') me.rotation.z = Math.PI / 2;
          me.position.set(j.u, j.y, j.d); frame.add(me);
          S.recs.push({ node: me, base: me.position.clone(), cat: cat(carrier), joint: true });
        });
      }
    }

    /* soft shadows: every opaque mesh casts + receives, a transparent ShadowMaterial floor catches them (X-Ray too, just subtler) */
    {
      S.root.traverse((o) => { if (o.isMesh && o.material && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
      const ext = Math.max(Wm, maxZ, sc.bounds.h) * 0.8 + 600;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(ext * 3, ext * 3), new THREE.ShadowMaterial({ opacity: xr ? 0.08 : 0.11 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(Wm / 2, -1.5, maxZ / 2); floor.receiveShadow = true; floor.userData.catcher = true; S.root.add(floor);
      const sh = S.key.shadow.camera; sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 100; sh.far = 16000; sh.updateProjectionMatrix();
      /* best-effort ambient-occlusion LOOK (not true AO): a blurred dark footprint under the cabinets grounds them like a contact shadow */
      const cw = 256; const cc = document.createElement('canvas'); cc.width = cw; cc.height = cw; const cx = cc.getContext('2d');
      const grad = cx.createRadialGradient(cw / 2, cw / 2, cw * 0.18, cw / 2, cw / 2, cw * 0.5);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grad; cx.fillRect(0, 0, cw, cw);
      const ctex = new THREE.CanvasTexture(cc);
      const cs = new THREE.Mesh(new THREE.PlaneGeometry(Wm + 520, maxZ + 520), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, opacity: xr ? 0.5 : 0.7, depthWrite: false }));
      cs.rotation.x = -Math.PI / 2; cs.position.set(Wm / 2, -0.8, maxZ / 2); cs.renderOrder = -1; cs.userData.contact = true; S.root.add(cs);
    }
    /* [NEO-HINGES-UX35] REAL hinge hardware: the 35 mm cup bores on every door's back face, the clip-on cup + folding arm, and the mounting plate with its two screws on the
     * carcass side panel - four instanced meshes for the whole scene, built after the shadow pass (they cast no shadow) and shown only when they can be seen (a door open,
     * X-Ray, Explode, or the doors hidden), so a closed default scene draws exactly what it drew before. */
    S.hw = null;
    if (L.hardware && sc.hinges && sc.hinges.length) {
      try {
        const nodes = new Map(); S.root.traverse((o) => { if (o.isMesh && o.userData && o.userData.partId && !nodes.has(o.userData.partId)) nodes.set(o.userData.partId, o); });
        S.hw = buildHingeHw(THREE, { sc, root: S.root, nodeOf: (id) => nodes.get(id), col, env: S.getEnv ? S.getEnv() : null, partOk: (h) => !!L[h.row] });
      } catch (e) { S.hw = null; }
    }
    if (wrapRef.current) wrapRef.current.dataset.hinges = S.hw ? String(S.hw.count) : '0';
    S.key.target.position.set(0, sc.bounds.h / 2, 0); S.key.target.updateMatrixWorld();

    /* overall measurement guides (width / height / depth), toggled from the viewport tools */
    S.labels = [];
    if (u.guides) {
      const gcol = col('--brand', 0x356dff);
      const gm = new THREE.LineBasicMaterial({ color: gcol, transparent: true, opacity: 0.9 });
      const gz = sc.bounds.z1; const gh = sc.bounds.h; const off = 140; const tick = 50;
      const line = (pts) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(...q))), gm); l.frustumCulled = false; S.root.add(l); };
      const font = (() => { try { return getComputedStyle(wrapRef.current).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } })();
      const bg = css('--bg-2', 0xffffff), fg = css('--text-1', 0x182033);
      const label = (text, at) => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
        x.fillStyle = bg; x.globalAlpha = 0.92; x.beginPath(); (x.roundRect || x.rect).call(x, 2, 2, 252, 60, 14); x.fill(); x.globalAlpha = 1;
        x.strokeStyle = css('--brand', '#356dff'); x.lineWidth = 3; x.stroke();
        x.fillStyle = fg; x.font = `700 30px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
        const tex = new THREE.CanvasTexture(c);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
        sp.position.set(...at); sp.renderOrder = 20; S.root.add(sp); S.labels.push(sp);
      };
      // width along the front-bottom edge, height up the left end, depth along the right end
      line([[0, 0, gz + off], [Wm, 0, gz + off]]); line([[0, -tick, gz + off], [0, tick, gz + off]]); line([[Wm, -tick, gz + off], [Wm, tick, gz + off]]);
      label(fmtLen(Wm, live.current.unit), [Wm / 2, 0, gz + off]);
      line([[-off, 0, gz], [-off, gh, gz]]); line([[-off - tick, 0, gz], [-off + tick, 0, gz]]); line([[-off - tick, gh, gz], [-off + tick, gh, gz]]);
      label(fmtLen(gh, live.current.unit), [-off, gh / 2, gz]);
      line([[Wm + off, 0, 0], [Wm + off, 0, gz]]); line([[Wm + off, 0, 0 - tick], [Wm + off, 0, tick]]); line([[Wm + off, 0, gz - tick], [Wm + off, 0, gz + tick]]);
      label(fmtLen(gz, live.current.unit), [Wm + off, 0, gz / 2]);
    }

    /* grid + diagram lines */
    if (u.grid) {
      const size = Math.ceil((Math.max(Wm, maxZ) + 1400) / 200) * 200; // a floor patch around the footprint (like the reference), square 200 mm tiles
      const grid = new THREE.GridHelper(size, size / 200, col('--nk-grid', 0x888888), col('--nk-grid', 0x888888));
      grid.material.opacity = 0.35; grid.material.transparent = true;
      grid.position.set(cx, -1, maxZ / 2); S.root.add(grid);
    }
    const prevLeg = prevB && prevB.leg; const prevKind = prevB && prevB.kind;
    S.bounds = { w: Wb, d: maxZ, h: sc.bounds.h, kind: sc.model.xl ? sc.model.xl.kind : null, side: sc.model.xl ? sc.model.xl.side : null, leg: sc.product === 'wardrobe' ? (sc.runs.some((r) => r.key === 'right') ? 'right' : sc.runs.some((r) => r.key === 'left') ? 'left' : null) : null };
    S.sc = sc; S.partById = partById; S.xr = xr;
    { const g = sc.model.g; S.levelY = [0, g.plinthH, g.plinthH + g.baseH, g.plinthH + g.baseH + g.counterThk + g.gap, g.plinthH + g.baseH + g.counterThk + g.gap + g.wallH]; }
    S.diag = [];
    if (u.explode.on && u.explode.diagram && u.explode.mode === 'levels') {
      const lm = new THREE.LineBasicMaterial({ color: col('--nk-diagram', 0x2563eb) });
      [0.12, 0.5, 0.88].forEach((fx) => [1, 2, 3, 4].forEach((lev) => {
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Wm * fx, 0, 0), new THREE.Vector3(Wm * fx, 0, 0)]);
        const ln = new THREE.Line(geo, lm); ln.userData = { lev, x: Wm * fx }; ln.frustumCulled = false; S.root.add(ln); S.diag.push(ln);
      }));
    }
    S.dirty = true;
    S.frames = frames;
    if (S.applyLook) S.applyLook(true); // lights / environment / background (never rebuilt for a look change, only re-applied here after a CAD rebuild)
    wrapRef.current.dataset.parts = String(sc.parts.length);
    wrapRef.current.dataset.meshes = String(S.recs.length);
    if (S.applySel) S.applySel();
    // parameter edits never move the camera. The one exception: while it is still "following" and the kitchen GREW so far that it
    // would leave the viewport, re-fit (once, instantly); a camera moved by hand is never touched
    if (S.follow && !S.hold && S.reset && prevB && ((prevLeg || null) !== S.bounds.leg || (prevKind || null) !== (S.bounds.kind || null))) S.reset(false); // the wing was added / moved / removed while the camera is still on its own: turn to show it
    else if (S.follow && !S.hold && S.frameFor && S.cam && (!prevB || prevB.w !== S.bounds.w || prevB.d !== S.bounds.d || prevB.h !== S.bounds.h)) {
      const fl = fitFill(fitBounds(S.bounds, u.guides), S.yaw, S.pitch, S.cam.fov, S.fitAspect || S.cam.aspect, S.dist);
      if (!prevB || Math.max(fl.x, fl.y) > 1) S.frameFor(null, false);
    }
  }, []);

  /* --------------------------- init once ---------------------------- */
  useEffect(() => {
    let alive = true; let raf = 0; let ro = null;
    loadThree().then((THREE) => {
      if (!alive || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const S = st.current;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { setStatus('nogl'); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scn = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(38, 1, 50, 80000);
      S.amb = new THREE.AmbientLight(0xffffff, 0.75); scn.add(S.amb);
      S.key = new THREE.DirectionalLight(0xfff6ea, 0.62); S.key.position.set(2200, 4200, 3600); scn.add(S.key); scn.add(S.key.target);
      S.key.castShadow = true; S.key.shadow.mapSize.set(2048, 2048); S.key.shadow.bias = -0.0004; S.key.shadow.normalBias = 2;
      S.hemi = new THREE.HemisphereLight(0xffffff, 0x6e7480, 0.3); scn.add(S.hemi); // darker ground bounce = the underside / inner faces read slightly darker
      const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-3000, 1800, 2000); scn.add(fill); S.fill = fill;
      S.env = new THREE.Group(); scn.add(S.env);
      /* NEO-CLOSETS-UX24: a small studio environment (sky gradient + two window lights) pre-filtered once; only the wardrobe's glass uses it as a reflection map */
      S.getEnv = () => {
        if (S.envTex !== undefined) return S.envTex;
        try {
          const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
          const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#d6e6ff'); gr.addColorStop(0.42, '#fff4e4'); gr.addColorStop(0.5, '#9a9285'); gr.addColorStop(1, '#4b4741');
          x.fillStyle = gr; x.fillRect(0, 0, 512, 256); x.fillStyle = '#ffffff'; x.fillRect(70, 64, 96, 64); x.fillRect(318, 58, 128, 70);
          const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping;
          const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
          const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(es, 0.02); S.envTex = rt.texture; pm.dispose(); tex.dispose();
        } catch (e) { S.envTex = null; }
        return S.envTex;
      };
      S.root = new THREE.Group(); scn.add(S.root);
      Object.assign(S, { renderer, scn, cam, yaw: 0, pitch: 0.08, dist: 7000, target: new THREE.Vector3(0, 1000, 0), openT: 0, exT: 0, recs: [], dirty: true, follow: true, tw: null, hold: !!live.current.ui.hold, lastT: 0 });
      if (S.hold) S.follow = false;
      const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      /* camera API: every call keeps the camera target on the middle of the kitchen; `angles` null = keep the current angle.
       * `follow` stays true until the user moves the camera by hand, so a resize / sidebar toggle re-fits only then. */
      S.frameFor = (angles, animate) => {
        const b = S.bounds || { w: 3000, d: 800, h: 2400 };
        const yaw = angles ? shortestYaw(S.yaw, angles.yaw) : S.yaw; const pitch = angles ? clampPitch(angles.pitch) : S.pitch;
        const t = fitTarget(b);
        const to = { yaw, pitch, dist: fitDistance(fitBounds(b, live.current.ui.guides), yaw, pitch, cam.fov, S.fitAspect || cam.aspect), tx: t.x, ty: t.y, tz: t.z };
        S.follow = true;
        if (!animate || reduce()) { S.tw = null; S.yaw = to.yaw; S.pitch = to.pitch; S.dist = to.dist; S.target.set(to.tx, to.ty, to.tz); S.dirty = true; return; }
        S.tw = { t0: performance.now(), ms: 240, from: { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z }, to };
        S.dirty = true;
      };
      S.fit = () => S.frameFor(null, true);
      S.reset = (instant) => S.frameFor(defaultAngles(S.bounds), !instant);
      S.view = (name) => { const v = VIEW_PRESETS[name]; if (v) S.frameFor(v, true); };
      S.manual = () => { S.follow = false; S.tw = null; };
      const resize = () => {
        const w = wrapRef.current.clientWidth || 600, h = wrapRef.current.clientHeight || 400;
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); S.dirty = true;
        /* floating panels over the canvas (category list, viewport tools) are not part of the free area: fit + centre the kitchen in what is left */
        let il = 0, ir = 0;
        try {
          const wr = wrapRef.current.getBoundingClientRect(); const gap = 12;
          wrapRef.current.parentElement.querySelectorAll('.nk-v3cat, .nk-vtools').forEach((el) => {
            const r = el.getBoundingClientRect(); if (!r.width) return;
            if ((r.left + r.right) / 2 < (wr.left + wr.right) / 2) il = Math.max(il, r.right - wr.left + gap); else ir = Math.max(ir, wr.right - r.left + gap);
          });
        } catch (e) { /* no DOM measurement: fit the whole canvas */ }
        const uf = usableFrame(w, h, il, ir); S.fitAspect = uf.aspect;
        if (!S.hold || S.shift === undefined) S.shift = uf.shift; // held: the kitchen must not slide sideways when a panel opens or closes
        if (S.shift) cam.setViewOffset(w, h, -S.shift, 0, w, h); else cam.clearViewOffset();
        cam.updateProjectionMatrix();
        if (S.follow && !S.hold && S.bounds) {
          if (S.tw) { S.tw.to.dist = fitDistance(fitBounds(S.bounds, live.current.ui.guides), S.tw.to.yaw, S.tw.to.pitch, cam.fov, S.fitAspect || cam.aspect); S.dirty = true; } // a tween in flight lands on the NEW size
          else S.frameFor(null, false);
        }
      };
      resize();
      if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(wrapRef.current); }


      /* ---- 3D Look presets (lookProfiles.js): lights, environment meshes and the background only; the CAD scene is never rebuilt ---- */
      const woodFloor = (base, seed) => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'); const r = rng(seed);
        const bc = new THREE.Color(base); const rows = 8; const ph = 512 / rows;
        for (let row = 0; row < rows; row++) {
          let px = -r() * 256;
          while (px < 512) {
            const w = 200 + r() * 220; const t = bc.clone().offsetHSL(0, 0, (r() - 0.5) * 0.09);
            x.fillStyle = `#${t.getHexString()}`; x.fillRect(px, row * ph, w, ph);
            x.strokeStyle = `#${t.clone().offsetHSL(0, 0, -0.07).getHexString()}`; x.globalAlpha = 0.35;
            for (let g = 0; g < 7; g++) { const gy = row * ph + r() * ph; x.lineWidth = 0.6 + r(); x.beginPath(); x.moveTo(px, gy); x.lineTo(px + w, gy + (r() - 0.5) * 3); x.stroke(); }
            x.globalAlpha = 0.5; x.strokeStyle = `#${bc.clone().offsetHSL(0, 0, -0.16).getHexString()}`; x.lineWidth = 1.2; x.strokeRect(px, row * ph, w, ph); x.globalAlpha = 1;
            px += w;
          }
        }
        const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
      };
      const clearEnv = () => {
        while (S.env.children.length) {
          const o = S.env.children[0]; S.env.remove(o);
          o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } });
        }
      };
      S.applyLook = (force) => {
        const u = live.current.ui; const sc = S.sc; if (!sc || !S.key || !S.env) return;
        const id = lookOf(u.look); const P = LOOKS[id]; const xr = !!u.xray;
        const lp = { neutral: [0xffffff, 0xfff6ea, 0.42], warm: [0xffe2bd, 0xffd2a0, 0.4], cool: [0xdde8ff, 0xc9dcff, 0.48] }[u.lighting] || [0xffffff, 0xfff6ea, 0.42];
        const amb = P.amb || [lp[0], lp[2]]; const key = P.key || [lp[1], xr ? 0.5 : 0.62];
        S.amb.color.setHex(amb[0]); S.amb.intensity = xr ? amb[1] + 0.08 : amb[1];
        S.key.color.setHex(key[0]); S.key.intensity = xr ? Math.min(key[1], 0.5) : key[1];
        S.hemi.color.setHex(P.hemi[0]); S.hemi.groundColor.setHex(P.hemi[1]); S.hemi.intensity = P.hemi[2];
        S.fill.intensity = P.fill;
        const pos = P.sun ? sunPosition(clampSun(u.sun), 6000, sc.bounds.h / 2) : [2200, sc.bounds.h / 2 + 4200, 3600];
        S.key.position.set(pos[0], pos[1], pos[2]); S.key.updateMatrixWorld();
        const env = P.env && !xr;
        if (S.root) S.root.traverse((o) => { if (o.userData && o.userData.catcher) { o.material.opacity = P.catcher * (xr ? 0.7 : 1); o.visible = true; } });
        S.scn.background = P.bg && !xr ? new THREE.Color(css(P.bg, 0xdddddd)) : null;
        const sig = `${id}|${xr}|${S.bounds.w}|${S.bounds.d}|${S.bounds.h}|${live.current.scene === sc ? 1 : 0}|${sc.runs.map((r) => `${r.key}${r.units.length}`).join('.')}`;
        if (force || S.envSig !== sig) {
          clearEnv(); S.envSig = sig;
          if (env) {
            const { w: Wm, d: maxZ, h: H } = S.bounds; const wallH = Math.max(H, 2400) + 1500; const big = Wm + 9000;
            const ft = woodFloor(css(P.env.floor, 0xc59c70), 5); ft.repeat.set(big / 1400, (maxZ + 9000) / 1400);
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(big, maxZ + 9000), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.8, metalness: 0 }));
            floor.rotation.x = -Math.PI / 2; floor.position.set(0, -3, 0); floor.receiveShadow = true; floor.userData.environment = 'floor'; S.env.add(floor);
            const wm = (shade) => new THREE.MeshStandardMaterial({ color: new THREE.Color(css(P.env.walls, 0xe8e2d8)).multiplyScalar(shade), roughness: 1, metalness: 0, side: THREE.DoubleSide });
            const back = new THREE.Mesh(new THREE.PlaneGeometry(big, wallH), wm(1)); back.position.set(0, wallH / 2 - 3, -maxZ / 2 - 4); back.receiveShadow = true; back.userData.environment = 'wall'; S.env.add(back);
            if (sc.runs.some((r) => r.key === 'run2')) { // UX29 galley: the opposite wall stands right behind run 2
              const opp = new THREE.Mesh(new THREE.PlaneGeometry(big, wallH), wm(0.96)); opp.rotation.y = Math.PI; opp.position.set(0, wallH / 2 - 3, maxZ / 2 + 4); opp.receiveShadow = true; opp.userData.environment = 'wall'; S.env.add(opp);
            }
            /* an L-shaped wardrobe stands in a CORNER: the side wall is right behind the return wing (wardrobe scenes only), not 3.5 m away */
            const wingSide = sc.product === 'wardrobe' ? (sc.runs.some((r) => r.key === 'right') ? 1 : sc.runs.some((r) => r.key === 'left') ? -1 : 0) : 0;
            [-1, 1].forEach((sd) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(maxZ + 6000, wallH), wm(0.92)); w.rotation.y = -sd * Math.PI / 2; w.position.set(sd * (sd === wingSide ? Wm / 2 + 4 : Wm / 2 + 3500), wallH / 2 - 3, 3000); w.receiveShadow = true; w.userData.environment = 'wall'; S.env.add(w); });
            if (P.led && S.frames) {
              const ledM = new THREE.MeshBasicMaterial({ color: new THREE.Color(css('--nk-look-led', 0xffc46b)) }); let n = 0;
              sc.runs.forEach((r) => { const fr = S.frames[r.key]; if (!fr) return; fr.updateMatrixWorld(true);
                r.units.filter((x) => x.row === 'wall').forEach((x) => {
                  if (n++ >= 8 || (sc.leds || []).some((q) => q.unitId === x.unit.id)) return; // a unit with a real LED strip (Wall tab) already has one
                  const strip = new THREE.Mesh(new THREE.BoxGeometry(Math.max(20, x.W - 60), 6, 22), ledM); strip.position.set(x.fu0 + x.W / 2, x.y0 - 4, x.D - 40); strip.applyMatrix4(fr.matrixWorld); strip.userData.environment = 'led'; S.env.add(strip);
                  const pl = new THREE.PointLight(0xffb060, 0.7, 1800, 2); pl.position.set(x.fu0 + x.W / 2, x.y0 - 90, x.D - 120); pl.applyMatrix4(fr.matrixWorld); pl.userData.environment = 'led'; S.env.add(pl);
                }); });
            }
          }
        }
        if (S.root) S.root.traverse((o) => { if (o.userData && o.userData.catcher && env) o.visible = true; });
        wrapRef.current.dataset.look = id; wrapRef.current.dataset.sunDeg = String(clampSun(u.sun)); S.dirty = true;
      };

      /* selection outline: a brand-coloured edge trace (whole unit) plus a thin inverted-hull halo (single part).
       * In X-Ray the outline is the orange --nk-select colour, fine (no halo), with a diagonal across the part's front face and
       * a ring at every hinge cup of a selected door - the same indicator the reference X-Ray view uses. */
      const clearSel = () => { (S.selObjs || []).forEach((o) => { if (o.parent) o.parent.remove(o); (o.userData.own || []).forEach((d) => d.dispose()); }); S.selObjs = []; if (S.labels) S.labels = S.labels.filter((sp) => !(sp.userData && sp.userData.sel)); };
      S.applySel = () => {
        clearSel();
        const sl = live.current.sel; if (!sl || !S.root) { S.selTargets = []; if (S.emitAnchor) S.emitAnchor(true); if (wrapRef.current) { wrapRef.current.dataset.selMeshes = '0'; wrapRef.current.dataset.selColor = ''; } return; }
        const xr = !!live.current.ui.xray;
        const brand = new THREE.Color(xr ? css('--nk-select', 0xff8a24) : css('--brand', '#356dff'));
        const targets = [];
        S.root.traverse((o) => { if (o.isMesh && o.userData && o.userData.unitId === sl.unitId && (sl.partId ? o.userData.partId === sl.partId : !/^plinth:/.test(o.userData.partId || ''))) targets.push(o); });
        S.selTargets = targets;
        const lineM = new THREE.LineBasicMaterial({ color: brand, transparent: true, opacity: 0.95, depthTest: false });
        const hullM = new THREE.MeshBasicMaterial({ color: brand, side: THREE.BackSide, transparent: true, opacity: 0.55 });
        const own = [lineM, hullM];
        targets.forEach((o) => {
          const eg = new THREE.EdgesGeometry(o.geometry);
          const ln = new THREE.LineSegments(eg, lineM); ln.renderOrder = 30; ln.userData = { own: [eg] }; o.add(ln); S.selObjs.push(ln);
          o.geometry.computeBoundingBox(); const sz = new THREE.Vector3(); o.geometry.boundingBox.getSize(sz);
          if (sl.partId && !xr) {
            const grow = (n) => (n > 0.5 ? (n + 8) / n : 1);
            const hull = new THREE.Mesh(o.geometry, hullM); hull.scale.set(grow(sz.x), grow(sz.y), grow(sz.z)); hull.userData = { own: [] }; o.add(hull); S.selObjs.push(hull);
          }
          const hwSets = sl.partId && S.sc && S.partById && S.partById.get(sl.partId) && S.partById.get(sl.partId).kind === 'door' ? hingeSets(S.sc).filter((h) => h.partId === sl.partId) : [];
          if (hwSets.length && o.geometry.type === 'BoxGeometry') {
            /* [NEO-HINGES-UX35] selected hinged door: real-size cup rings on the back face (through the door), hinge-edge strip, the swing symbol with its apex on the hinge side,
             * and - with Dimensions on - the labelled cup callouts. Replaces the old corner-to-corner diagonal + two small circles. */
            const pp = S.partById.get(sl.partId);
            const ov = selectionOverlay(THREE, { mesh: o, sets: hwSets, lineM, brand, box: pp.box, face: pp.elevBox || pp.box, dims: !!live.current.ui.dims, lang: live.current.lang || 'en',
              bg: css('--bg-2', '#ffffff'), fg: css('--text-1', '#182033'), accentCss: css('--nk-select', '#ff8a24'), font: (() => { try { return getComputedStyle(wrapRef.current).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } })() });
            ov.objs.forEach((x) => S.selObjs.push(x)); (S.labels = S.labels || []).push(...ov.labels);
          } else if (sl.partId && xr && o.geometry.type === 'BoxGeometry') {
            // diagonal across the front (+z) face, drawn just proud of it
            const z = sz.z / 2 + 0.6;
            const dg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-sz.x / 2, sz.y / 2, z), new THREE.Vector3(sz.x / 2, -sz.y / 2, z)]);
            const dl = new THREE.Line(dg, lineM); dl.renderOrder = 31; dl.userData = { own: [dg] }; o.add(dl); S.selObjs.push(dl);
            const p = S.partById && S.partById.get(sl.partId);
            if (p && S.sc && p.kind === 'door') {
              const c = [(p.box.u0 + p.box.u1) / 2, (p.box.y0 + p.box.y1) / 2, (p.box.d0 + p.box.d1) / 2];
              S.sc.hinges.filter((h) => h.partId === p.id).forEach((h) => {
                const pts = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; pts.push(new THREE.Vector3(h.u - c[0] + Math.cos(a) * h.r * 0.5, h.y - c[1] + Math.sin(a) * h.r * 0.5, z)); }
                const rg = new THREE.BufferGeometry().setFromPoints(pts); const rl = new THREE.Line(rg, lineM); rl.renderOrder = 31; rl.userData = { own: [rg] }; o.add(rl); S.selObjs.push(rl);
              });
            }
          }
        });
        S.selObjs.push({ parent: null, userData: { own } });
        if (S.emitAnchor) S.emitAnchor(true);
        wrapRef.current.dataset.selMeshes = String(targets.length);
        wrapRef.current.dataset.selColor = `#${brand.getHexString()}`;
        S.dirty = true;
      };
      /* NEO-CLOSETS-UX31: the screen box (client px) of the selected part / column, reported to the quick-edit menu after every rendered frame (and when the selection changes).
       * Reported only when it moved by a pixel or more, so a still camera costs nothing. onAnchor(null) = nothing selected. */
      { const av = new THREE.Vector3(); let last = null;
        S.emitAnchor = (force) => {
          const cb = live.current.onAnchor; if (!cb) return;
          const ts = S.selTargets || [];
          if (!ts.length) { if (force || last) { last = null; cb(null); } return; }
          const r = canvas.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          cam.updateMatrixWorld(true);
          ts.forEach((o) => {
            o.updateWorldMatrix(true, false); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            const bb = o.geometry.boundingBox;
            for (let k = 0; k < 8; k++) {
              av.set(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z).applyMatrix4(o.matrixWorld).project(cam);
              const px = r.left + (av.x * 0.5 + 0.5) * r.width; const py = r.top + (-av.y * 0.5 + 0.5) * r.height;
              if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
            }
          });
          const n = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
          if (!force && last && Math.abs(n.x - last.x) < 1 && Math.abs(n.y - last.y) < 1 && Math.abs(n.w - last.w) < 1 && Math.abs(n.h - last.h) < 1) return;
          last = n; cb(n);
        }; }
      rebuild();
      { const pose = live.current.poseRef && live.current.poseRef.current; // a held camera keeps its pose across Design <-> 3D
        if (S.hold && pose) { S.yaw = pose.yaw; S.pitch = pose.pitch; S.dist = pose.dist; S.target.set(pose.tx, pose.ty, pose.tz); S.follow = false; S.dirty = true; } else { S.reset(true); if (S.hold) S.follow = false; } }
      setStatus('ok');

      /* pointer controls (UX-21 free move). Held camera: every gesture below is ignored, a plain click still selects. */
      const ptrs = new Map(); let moved = 0; let pinch = 0;
      const cur = () => ({ x: S.target.x, y: S.target.y, z: S.target.z });
      const setTarget = (t) => { const c = clampTarget(t, S.bounds); S.target.set(c.x, c.y, c.z); };
      const viewH = () => (wrapRef.current ? wrapRef.current.clientHeight : 0) || 600;
      const ndcOf = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
      /* the optical axis sits `shift` px right of the canvas centre while a floating panel takes room on one side */
      const axisNdc = (e) => { const n = ndcOf(e); const r = canvas.getBoundingClientRect(); return { x: n.x - (2 * (S.shift || 0)) / Math.max(1, r.width), y: n.y }; };
      const pickAt = (e) => {
        const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(ndcOf(e).x, ndcOf(e).y), cam);
        const hits = rc.intersectObjects(S.root.children, true).filter((h) => h.object.userData && h.object.userData.partId);
        const top = pickSelectable(hits.map((h) => ({ userData: h.object.userData, object: h.object })), !!live.current.ui.xray);
        return top ? hits.find((h) => h.object.userData === top.userData) || null : null;
      };
      const onDown = (e) => {
        if (gesturesAllowed(S.hold)) S.tw = null;
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, go: false, btn: e.button, shift: e.shiftKey }); moved = 0;
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      };
      const onMove = (e) => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y; moved = Math.max(moved, Math.abs(e.clientX - p.x0) + Math.abs(e.clientY - p.y0));
        if (!gesturesAllowed(S.hold)) { p.x = e.clientX; p.y = e.clientY; return; }
        /* dead zone: a click that wobbles a few pixels never orbits the camera */
        if (!p.go && moved <= 4 && ptrs.size === 1) return;
        p.go = true; S.manual();
        if (ptrs.size === 2) {
          // two fingers: the pinch zooms, the movement of their midpoint pans
          const [a0, b0] = [...ptrs.values()]; const mx0 = (a0.x + b0.x) / 2, my0 = (a0.y + b0.y) / 2;
          p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch && d) S.dist = clampDist(S.dist * (pinch / d)); pinch = d;
          setTarget(panTarget(cur(), S.yaw, S.pitch, S.dist, (a.x + b.x) / 2 - mx0, (a.y + b.y) / 2 - my0, viewH(), cam.fov));
          S.dirty = true; return;
        }
        p.x = e.clientX; p.y = e.clientY;
        if (p.btn === 2 || p.btn === 1 || p.shift) setTarget(panTarget(cur(), S.yaw, S.pitch, S.dist, dx, dy, viewH(), cam.fov));
        else { S.yaw -= dx * 0.006; S.pitch = clampPitch(S.pitch + dy * 0.006); }
        S.dirty = true;
      };
      let hoverT = 0;
      const onHover = (e) => {
        if (ptrs.size || e.pointerType === 'touch') return;
        const now = performance.now(); if (now - hoverT < 70) return; hoverT = now;
        canvas.style.cursor = pickAt(e) ? 'pointer' : (S.hold ? 'default' : 'grab');
      };
      const onUp = (e) => {
        const was = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinch = 0;
        if (was && moved < 5 && ptrs.size === 0 && live.current.onSelect) {
          const hit = pickAt(e);
          live.current.onSelect(hit ? { unitId: hit.object.userData.unitId, partId: hit.object.userData.partId } : null);
        }
      };
      /* wheel zoom towards the cursor: the world point under the pointer stays under it */
      const onWheel = (e) => {
        e.preventDefault(); if (!gesturesAllowed(S.hold)) return;
        S.manual(); const nd = clampDist(S.dist * wheelFactor(e.deltaY, e.deltaMode)); const n = axisNdc(e);
        setTarget(zoomAtCursor(cur(), S.yaw, S.pitch, S.dist, nd, n.x, n.y, cam.fov, cam.aspect)); S.dist = nd; S.dirty = true;
      };
      /* keys on the canvas: arrows / WASD nudge-pan, Alt+arrows / Q / E orbit, + - zoom, 0 reset, f fit (Shift+F is the Focus-workspace key and bubbles up) */
      const onKey = (e) => {
        const k = e.key; const lk = k.length === 1 ? k.toLowerCase() : k;
        if (e.ctrlKey || e.metaKey) return;
        if (k === '0') { e.preventDefault(); S.reset(); return; }
        if ((lk === 'f') && !e.shiftKey) { e.preventDefault(); S.fit(); return; }
        if (!gesturesAllowed(S.hold)) return;
        let used = true; const big = e.shiftKey ? 3 : 1;
        const nudge = (vx, vy) => setTarget(nudgeTarget(cur(), S.yaw, S.pitch, S.dist, vx * big, vy * big, viewH(), cam.fov));
        const orbit = k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown';
        if (e.altKey && orbit) {
          if (k === 'ArrowLeft') S.yaw += 0.08; else if (k === 'ArrowRight') S.yaw -= 0.08; else if (k === 'ArrowUp') S.pitch = clampPitch(S.pitch + 0.06); else S.pitch = clampPitch(S.pitch - 0.06);
        } else if (e.altKey) used = false;
        else if (k === 'ArrowLeft' || lk === 'a') nudge(-1, 0); else if (k === 'ArrowRight' || lk === 'd') nudge(1, 0);
        else if (k === 'ArrowUp' || lk === 'w') nudge(0, 1); else if (k === 'ArrowDown' || lk === 's') nudge(0, -1);
        else if (lk === 'q') S.yaw += 0.08; else if (lk === 'e') S.yaw -= 0.08;
        else if (k === '+' || k === '=') S.dist = clampDist(S.dist * 0.9); else if (k === '-') S.dist = clampDist(S.dist * 1.1); else used = false;
        if (used) { S.manual(); e.preventDefault(); S.dirty = true; }
      };
      /* double-click: a door / drawer / flip-up toggles just that front; any other part is focused (camera glides to it); empty space fits the kitchen.
       * Held: only the front toggle works (the camera does not move). */
      const onDbl = (e) => {
        const hit = pickAt(e); const pid = hit && hit.object.userData.partId;
        const part = pid && S.partById && S.partById.get(pid);
        if (part && part.anim && live.current.onToggleFront) { live.current.onToggleFront(pid); return; }
        if (!gesturesAllowed(S.hold)) return;
        if (!hit) { S.fit(); return; }
        const box = new THREE.Box3().setFromObject(hit.object); const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length() / 2;
        const t = clampTarget({ x: c.x, y: c.y, z: c.z }, S.bounds);
        S.follow = false;
        S.tw = { t0: performance.now(), ms: 320, from: { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z }, to: { yaw: S.yaw, pitch: S.pitch, dist: Math.min(S.dist, focusDistance(r, cam.fov, S.fitAspect || cam.aspect)), tx: t.x, ty: t.y, tz: t.z } };
        S.dirty = true;
      };
      const onCtx = (e) => e.preventDefault();
      canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointermove', onHover); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('keydown', onKey); canvas.addEventListener('dblclick', onDbl); canvas.addEventListener('contextmenu', onCtx);

      const loop = () => {
        raf = requestAnimationFrame(loop);
        const u = live.current.ui;
        if (S.tw) {
          const k = easeOut((performance.now() - S.tw.t0) / S.tw.ms); const a = S.tw.from; const b = S.tw.to;
          S.yaw = a.yaw + (b.yaw - a.yaw) * k; S.pitch = a.pitch + (b.pitch - a.pitch) * k; S.dist = a.dist + (b.dist - a.dist) * k;
          S.target.set(a.tx + (b.tx - a.tx) * k, a.ty + (b.ty - a.ty) * k, a.tz + (b.tz - a.tz) * k);
          if (k >= 1) S.tw = null;
          S.dirty = true;
        }
        const tEx = u.explode.on ? Math.max(0, Math.min(1, u.explode.amt)) : 0;
        const step = (cur, tgt) => { if (reduce()) return tgt; const d = tgt - cur; if (Math.abs(d) < 0.002) return tgt; return cur + d * 0.12 + Math.sign(d) * 0.002; };
        const ne = step(S.exT, tEx);
        if (ne !== S.exT) { S.exT = ne; S.dirty = true; }
        /* open / close: time-based, so the duration is BASE_OPEN_MS / speed whatever the frame rate (UX-21 Speed slider) */
        const nowT = performance.now(); const dtMs = S.lastT ? Math.min(100, nowT - S.lastT) : 16; S.lastT = nowT;
        const spd = u.openSpeed || 1;
        let sum = 0, cnt = 0;
        S.recs.forEach((r) => {
          if (!r.motion) return;
          let tgt = u.openDoors ? 1 : 0;
          if (!tgt && u.openIds && u.openIds.size) { for (const id of r.ids) if (u.openIds.has(id)) { tgt = 1; break; } }
          const nt = openStep(r.t, tgt, dtMs, spd, reduce());
          if (nt !== r.t) { r.t = nt; S.dirty = true; }
          sum += r.t; cnt++;
        });
        S.openT = cnt ? sum / cnt : 0;
        if (S.dirty) {
          applyMotion(THREE, S, u);
          syncHinges(S, u);
          cam.position.set(S.target.x + S.dist * Math.cos(S.pitch) * Math.sin(S.yaw), S.target.y + S.dist * Math.sin(S.pitch), S.target.z + S.dist * Math.cos(S.pitch) * Math.cos(S.yaw));
          cam.lookAt(S.target);
          if (S.labels) {
            const per = (2 * S.dist * Math.tan((cam.fov * Math.PI) / 360)) / viewH(); // mm per screen pixel at the target
            S.labels.forEach((sp) => { if (sp.userData.px) { const hh = sp.userData.px * per; sp.scale.set(hh * sp.userData.ar, hh, 1); } else { const k = S.dist * 0.02; sp.scale.set(k * 4, k, 1); } });
          }
          renderer.render(scn, cam);
          S.dirty = false;
          if (S.emitAnchor) S.emitAnchor(false);
          const d = wrapRef.current && wrapRef.current.dataset; if (d) { d.openT = S.openT.toFixed(3); d.explodeT = S.exT.toFixed(3); d.frames = String((+d.frames || 0) + 1); d.yaw = S.yaw.toFixed(3); d.pitch = S.pitch.toFixed(3); d.dist = String(Math.round(S.dist)); d.follow = S.follow ? '1' : '0'; d.hold = S.hold ? '1' : '0'; d.tx = S.target.x.toFixed(1); d.ty = S.target.y.toFixed(1); d.tz = S.target.z.toFixed(1); d.openMs = String(Math.round(openDurationMs(spd))); d.shift = String(Math.round(S.shift || 0)); d.calls = String(renderer.info.render.calls); d.tris = String(renderer.info.render.triangles); d.fitAspect = (S.fitAspect || 0).toFixed(3); }
        }
      };
      loop();
      S.cleanup = () => {
        cancelAnimationFrame(raf); if (ro) ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointermove', onHover); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('keydown', onKey); canvas.removeEventListener('dblclick', onDbl); canvas.removeEventListener('contextmenu', onCtx);
        const pr = live.current.poseRef; if (pr && S.target) pr.current = { yaw: S.yaw, pitch: S.pitch, dist: S.dist, tx: S.target.x, ty: S.target.y, tz: S.target.z };
        if (S.envTex && S.envTex.dispose) S.envTex.dispose();
        renderer.dispose();
      };
    }).catch(() => { if (alive) setStatus('fail'); });
    return () => { alive = false; cancelAnimationFrame(raf); const S = st.current; if (S && S.cleanup) S.cleanup(); st.current = {}; };
  }, [rebuild, attempt]);

  /* rebuild when anything structural changes (debounced a few frames so a slider drag does not rebuild on every tick) */
  const sig = [scene, ui.layers, ui.xray, model.finish, model.counter, model.paint, ui.lighting, ui.grid, ui.guides, ui.props, unit, ui.explode.on && ui.explode.mode === 'assembly', ui.explode.on && ui.explode.diagram && ui.explode.mode, output.precision];
  useEffect(() => {
    if (!(st.current.root && window.THREE)) return undefined;
    const t = setTimeout(() => rebuild(), 40);
    return () => clearTimeout(t);
  }, sig); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const S = st.current; if (S.root && S.applySel) S.applySel(); }, [sel, ui.dims, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const S = st.current; if (S.root && S.applyLook) S.applyLook(false); }, [ui.look, ui.sun]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const S = st.current; if (S.fit && fitTick) S.fit(); }, [fitTick]);
  /* Hold camera: freeze the camera where it is (stop a tween in flight, stop following the layout) */
  useEffect(() => {
    const S = st.current; S.hold = !!ui.hold;
    if (S.hold) { S.follow = false; S.tw = null; }
    if (wrapRef.current) wrapRef.current.dataset.hold = S.hold ? '1' : '0';
  }, [ui.hold]);
  useEffect(() => {
    const S = st.current; if (!camCmd || !S.fit) return;
    if (camCmd.name === 'fit') S.fit(); else if (camCmd.name === 'reset') S.reset(); else S.view(camCmd.name);
  }, [camCmd]);
  useEffect(() => { const S = st.current; if (S.root) S.dirty = true; }, [ui.openDoors, ui.openIds, ui.openSpeed, ui.explode.on, ui.explode.mode, ui.explode.amt]);

  const msg = status === 'fail' ? (lang === 'ar' ? 'العرض ثلاثي الأبعاد يحتاج اتصالًا بالإنترنت (Three.js).' : '3D needs an internet connection (Three.js from the CDN).')
    : status === 'nogl' ? (lang === 'ar' ? 'المتصفح لا يدعم WebGL.' : 'WebGL is not available in this browser.')
      : status === 'loading' ? (lang === 'ar' ? 'جارِ تحميل العرض ثلاثي الأبعاد…' : 'Loading the 3D view…') : '';
  return (
    <div ref={wrapRef} className="nk-3d" data-status={status} data-open-t="0" data-explode-t="0">
      <canvas ref={canvasRef} className="nk-canvas" tabIndex={0} role="img" aria-label={label ? label[lang === 'ar' ? 1 : 0] : lang === 'ar' ? 'عرض ثلاثي الأبعاد للمطبخ. الأسهم أو WASD للتحريك، Alt مع الأسهم أو Q وE للدوران، + و - للتكبير، F للملاءمة، 0 للإعادة، L لتثبيت الكاميرا.' : '3D kitchen view. Arrow keys or WASD move the view, Alt with arrows or Q and E orbit, + and - zoom, F fits, 0 resets, L holds the camera.'} style={{ display: status === 'ok' ? 'block' : 'none' }} />
      {msg && (
        <div className="nk-3d-msg" role="status" data-kind={status}>
          {status === 'loading' && <span className="nk-spin" aria-hidden="true" />}
          <span>{msg}</span>
          {(status === 'fail' || status === 'nogl') && (
            <button type="button" className="nk-btn" onClick={() => { setStatus('loading'); setAttempt((a) => a + 1); }}>{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- per-frame transforms: explode + open ----------------- */
function exOffset(c, mode, amt) {
  if (c.ex && mode !== 'fronts') return [c.ex[0] * amt, c.ex[1] * amt, c.ex[2] * amt]; // custom furniture: radial
  const lev = c.kind === 'foot' || c.row === 'plinth' ? 0 : LEVEL[c.row] === undefined ? 1 : LEVEL[c.row];
  let dx = 0, dy = 0, dz = 0;
  if (mode === 'levels') dy = lev * SPACING * amt;
  else if (mode === 'fronts') { if (c.front) dz = 340 * amt; }
  else {
    dy = lev * SPACING * 0.55 * amt;
    switch (c.kind) {
      case 'side': dx = (c.sideR ? 1 : -1) * 130 * amt; break;
      case 'bottom': dy -= 120 * amt; break;
      case 'top': case 'stretcher': dy += 120 * amt; break;
      case 'divider': dy += 40 * amt; dz += 40 * amt; break;
      case 'back': dz = -150 * amt; break;
      case 'shelf': case 'carousel': dz = 70 * amt; dy += 30 * amt; break;
      case 'drawerBox': dz = 190 * amt; break;
      case 'front': dz = 300 * amt; break;
      default: if (c.front) dz = 300 * amt; break;
    }
  }
  return [dx, dy, dz];
}
/** [NEO-HINGES-UX35] show / hide + re-pose the instanced hinge hardware for this frame */
function syncHinges(S, u) {
  const hw = S.hw; if (!hw) return;
  const anyOpen = S.recs.some((r) => r.motion && (r.motion.k === 'door' || r.motion.k === 'flip') && r.t > 0.01);
  hw.sync({ show: anyOpen || !!u.xray || S.exT > 0.02 || !u.layers.doors, detail: hwLod({ dist: S.dist, hinges: hw.count }), explode: S.exT > 0.02 });
}
function applyMotion(THREE, S, u) {
  const amt = S.exT, mode = u.explode.mode;
  S.recs.forEach((r) => {
    const o = amt > 0.0005 ? exOffset(r.cat, mode, amt) : [0, 0, 0];
    let ox = o[0], oy = o[1], oz = o[2];
    if (r.joint) { /* joints follow the carrier panel */ }
    const mo = r.motion;
    if (mo) {
      const ot = easeInOut(r.t || 0);
      if (mo.k === 'drawer') oz += mo.slide * ot;
      r.node.rotation.set(0, 0, 0);
      if (mo.k === 'door') r.node.rotation.y = (mo.side === 'L' ? -1 : 1) * DOOR_OPEN * ot;
      if (mo.k === 'flip') r.node.rotation.x = -(95 * Math.PI / 180) * ot;
      if (mo.k === 'slide') ox += mo.dx * ot; // NEO-CLOSETS-UX22: a sliding wardrobe leaf runs along its track (u)
    }
    r.node.position.set(r.base.x + ox, r.base.y + oy, r.base.z + oz);
    if (r.joint) r.node.visible = amt > 0.02;
  });
  S.diag.forEach((ln) => {
    const lev = ln.userData.lev; const a = ln.geometry.attributes.position;
    const y0 = S.levelY[lev];
    a.setXYZ(0, ln.userData.x, y0, 80);
    a.setXYZ(1, ln.userData.x, y0 + lev * SPACING * amt, 80);
    a.needsUpdate = true; ln.visible = amt > 0.02;
  });
}

/* ---------------- floating category list (UX-11) ----------------
 * A compact vertical list over the 3D viewport: Base, Wall, Top, Counter, Plinth, Doors, Hardware. It owns NO state - `tab`
 * and `onPick` are the sidebar's own tab state (goTab), so a click opens the same configuration controls without leaving 3D.
 * Categories the current project does not contain stay in the list, muted and struck through (data-absent); they are never
 * removed and never disabled, so the panel that adds them is still one click away. */
const CAT_LABEL = {
  base: ['Base', 'سفلي'], wall: ['Wall', 'علوي'], top: ['Top', 'ثالث'], counter: ['Counter', 'السطح'],
  plinth: ['Plinth', 'القاعدة'], doors: ['Doors', 'الأبواب'], hardware: ['Hardware', 'الاكسسوار'],
};
export function Category3DList({ lang, scene, layers, tab, onPick }) {
  const ar = lang === 'ar';
  const present = categoryPresence(scene);
  return (
    <nav className="nk-v3cat" aria-label={ar ? 'فئات المطبخ' : 'Kitchen categories'} data-testid="v3-cats">
      {CATEGORY_ORDER.map((k) => {
        const absent = !present[k]; const hidden = layers && layers[k] === false;
        return (
          <button
            key={k} type="button" className="nk-v3cat-b" data-cat={k} data-absent={absent ? '1' : '0'} data-hidden={hidden ? '1' : '0'}
            aria-current={tab === k ? 'true' : undefined} onClick={() => onPick(k)}
            title={absent ? (ar ? 'غير مستخدم في هذا المشروع - افتح اللوحة لإضافته' : 'Not in this project - open the panel to add it') : (ar ? 'فتح إعدادات ' : 'Open ') + CAT_LABEL[k][ar ? 1 : 0]}
          >
            <Ic n={k} size={16} />
            <span className="nk-v3cat-t">{CAT_LABEL[k][ar ? 1 : 0]}</span>
            {absent && <span className="nk-sr">{ar ? ' (غير موجود في المشروع)' : ' (not in this project)'}</span>}
          </button>
        );
      })}
    </nav>
  );
}
