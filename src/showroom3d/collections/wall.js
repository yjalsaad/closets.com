/* Collections feature wall (three.js): three backlit lightboxes in bronze frames on a dark backing board, a warm LED line above and a
 * travertine plinth below, on the inside face of the right front wing (see layout.js). The faces are canvas textures: the collection
 * title in the middle, the finishes either side. A finish shows its swatch once its image has loaded; images are requested only when
 * the visitor is near the wall (or opens the panel), never at start-up. Colours come from palette.js only. */
import * as THREE from 'three';
import { PALETTE, hex, rgba } from '../3d/palette';
import { box, mesh } from '../3d/geom';
import { COLLECTIONS } from './data';
import { WALL, PLINTH, wallPanels, wallWidth, splitItems, tierOf, shouldLoad } from './layout';
import { ct } from './strings';

const FACE = PALETTE.paperWhite, INK = PALETTE.ink, SOFT = PALETTE.walnutDeep, LINE = PALETTE.brassBrushed;
export const WALL_COLOURS = { face: FACE, ink: INK, soft: SOFT };
const EN_DISPLAY = '"Fraunces", Georgia, serif', EN_SANS = '"Inter", sans-serif', AR_DISPLAY = '"Noto Naskh Arabic", "IBM Plex Sans Arabic", serif', AR_SANS = '"IBM Plex Sans Arabic", sans-serif';

function face(g, w, h) {
  g.fillStyle = hex(FACE); g.fillRect(0, 0, w, h);
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);     // a lightbox is brightest in the middle
  v.addColorStop(0, rgba(FACE, 0)); v.addColorStop(1, rgba(PALETTE.shadeLinen, 0.9)); g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.strokeStyle = hex(LINE); g.lineWidth = 2; g.strokeRect(18, 18, w - 36, h - 36);
}
function begin(canvas, w, h) { const g = canvas.getContext('2d'), k = canvas.width / w; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, w, h); return g; }

/** the middle lightbox: eyebrow, collection name, count, materials, how to open it */
export function drawTitle(canvas, { col, lang, touch = false }) {
  const w = 920, h = 1000, g = begin(canvas, w, h), ar = lang === 'ar', L = ar ? 'ar' : 'en', cx = w / 2;
  face(g, w, h); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = ar ? 'rtl' : 'ltr';
  g.fillStyle = hex(SOFT); g.font = ar ? `600 40px ${AR_SANS}` : `600 30px ${EN_SANS}`;
  const eyebrow = col.eyebrow[L]; g.fillText(ar ? eyebrow : eyebrow.toUpperCase().split('').join(' '), cx, 190, w - 140);
  g.fillStyle = hex(LINE); g.fillRect(cx - 44, 246, 88, 3);
  g.fillStyle = hex(INK);
  const name = col.name[L], parts = /^(.*?)\s+(\d{4}\D\d{4})$/.exec(name) || [null, name, ''];
  g.font = ar ? `700 132px ${AR_DISPLAY}` : `500 124px ${EN_DISPLAY}`; g.fillText(parts[1], cx, 380, w - 120);
  if (parts[2]) { g.font = ar ? `600 104px ${AR_SANS}` : `500 124px ${EN_DISPLAY}`; g.direction = 'ltr'; g.fillText(parts[2], cx, 520, w - 120); g.direction = ar ? 'rtl' : 'ltr'; }
  g.fillStyle = hex(SOFT); g.font = ar ? `500 40px ${AR_SANS}` : `500 34px ${EN_SANS}`;
  g.fillText(`${col.items.length} ${col.countLabel[L]}`, cx, 650, w - 140);
  g.fillText(col.materials.map((m) => m[L]).join(ar ? ' · ' : '  ·  '), cx, 712, w - 140);
  const hint = ct(touch ? 'wallHintTouch' : 'wallHint', L); g.font = ar ? `600 38px ${AR_SANS}` : `600 32px ${EN_SANS}`;
  const tw = Math.min(w - 200, g.measureText(hint).width + 90), y = 850;
  g.fillStyle = hex(INK); g.beginPath(); if (g.roundRect) g.roundRect(cx - tw / 2, y - 40, tw, 80, 40); else g.rect(cx - tw / 2, y - 40, tw, 80); g.fill();
  g.fillStyle = hex(FACE); g.fillText(hint, cx, y + 2, tw - 50);
}

/** a side lightbox: 3 x 6 finishes. With its image a tile is the swatch + a caption; without, the name and reference code as a specification index. */
export function drawFinishes(canvas, { items, lang, images = {}, cols = WALL.cols, rows = WALL.rows, startIndex = 0 }) {
  const w = 820, h = 1000, g = begin(canvas, w, h), ar = lang === 'ar', pad = 40, tw = (w - pad * 2) / cols, th = (h - pad * 2) / rows;
  face(g, w, h); g.textBaseline = 'middle'; g.direction = 'ltr';
  items.forEach((it, i) => {
    const c = i % cols, r = Math.floor(i / cols), x = pad + (ar ? cols - 1 - c : c) * tw, y = pad + r * th, img = images[it.id], cx = x + tw / 2;
    g.strokeStyle = rgba(SOFT, 0.28); g.lineWidth = 1.5; g.strokeRect(x + 6, y + 6, tw - 12, th - 12);
    if (img) {
      const bx = x + 10, by = y + 10, bw = tw - 20, bh = th - 62, s = Math.max(bw / img.width, bh / img.height), sw = bw / s, sh = bh / s;
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, bx, by, bw, bh);
      g.fillStyle = hex(INK); g.textAlign = 'center'; g.font = `600 24px ${EN_SANS}`; g.fillText(it.name.en, cx, y + th - 38, tw - 24);
      g.fillStyle = hex(SOFT); g.font = `500 18px ${EN_SANS}`; g.fillText(it.code, cx, y + th - 16, tw - 24);
    } else {
      g.textAlign = 'center';
      g.fillStyle = hex(SOFT); g.font = `600 20px ${EN_SANS}`; g.fillText(String(startIndex + i + 1).padStart(2, '0'), cx, y + 34);
      g.fillStyle = hex(INK); g.font = `600 31px ${EN_SANS}`; g.fillText(it.name.en, cx, y + th / 2 + 2, tw - 30);
      g.fillStyle = hex(SOFT); g.font = `500 23px ${EN_SANS}`; g.fillText(it.code || '—', cx, y + th - 36, tw - 30);
    }
  });
}

export function buildCollectionsWall({ tier = 'high', lang = 'en', collection = COLLECTIONS[0] } = {}) {
  const T = tierOf(tier), group = new THREE.Group(); group.name = 'collections-wall';
  group.position.set(WALL.x, WALL.y, WALL.z); group.rotation.y = Math.PI;                    // local +z faces the hall, local +x is the visitor's right
  const state = { lang, touch: false, images: {}, loading: false, loaded: false, disposed: false };
  const total = wallWidth(), parts = splitItems(collection), disposables = [];
  const keep = (o) => { disposables.push(o); return o; };
  const backM = keep(new THREE.MeshStandardMaterial({ color: PALETTE.bronzeDark, roughness: 0.55, metalness: 0.35 }));
  const frameM = keep(new THREE.MeshStandardMaterial({ color: PALETTE.brassBrushed, roughness: 0.38, metalness: 0.9 }));
  const stoneM = keep(new THREE.MeshStandardMaterial({ color: PALETTE.stoneLight, roughness: 0.62 }));
  const add = (geo, mat, pos) => { const m = mesh(keep(geo), mat, pos); group.add(m); return m; };
  add(box(total + 0.5, WALL.panelH + 0.62, 0.05), backM, { z: 0.025 }).receiveShadow = true;
  add(box(total + 0.5, PLINTH.h, PLINTH.depth), stoneM, { y: PLINTH.h / 2 - WALL.y, z: PLINTH.depth / 2 }).receiveShadow = true;
  if (T.picLight) add(box(total + 0.2, 0.035, 0.05), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(T.glow > 1 ? 2.4 : 1), toneMapped: false })), { y: WALL.panelH / 2 + 0.2, z: 0.09 });

  const faces = wallPanels().map((p) => {
    const lx = -(p.x - WALL.x);
    add(box(p.w + WALL.frame * 2, p.h + WALL.frame * 2, WALL.depth), frameM, { x: lx, z: WALL.depth / 2 });
    const canvas = document.createElement('canvas'); canvas.width = Math.round(T.tex * p.w / p.h); canvas.height = T.tex;
    const tex = keep(new THREE.CanvasTexture(canvas)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = T.anisotropy; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const mat = keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); mat.color.setScalar(T.glow);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(p.w, p.h)), mat); m.position.set(lx, 0, WALL.depth + 0.003); m.name = 'collections-' + p.id; group.add(m);
    return { p, canvas, tex, mesh: m };
  });
  const draw = () => {
    if (state.disposed) return;
    for (const f of faces) {
      if (f.p.kind === 'title') drawTitle(f.canvas, { col: collection, lang: state.lang, touch: state.touch });
      else drawFinishes(f.canvas, { items: parts[f.p.part], lang: state.lang, images: state.images, startIndex: f.p.part * WALL.cols * WALL.rows });
      f.tex.needsUpdate = true;
    }
  };
  /** fetch the swatch images (once). Nothing to do while the collection has no downloaded images. */
  const load = () => {
    if (state.loading || state.loaded || state.disposed) return; state.loading = true;
    const todo = collection.items.filter((it) => it.image && (it.image[T.image] || it.image.thumb)); let left = todo.length;
    if (!left) { state.loaded = true; return; }
    const done = () => { if (--left <= 0) { state.loaded = true; draw(); } };
    for (const it of todo) { const im = new Image(); im.decoding = 'async'; im.onload = () => { state.images[it.id] = im; done(); }; im.onerror = done; im.src = it.image[T.image] || it.image.thumb; }
  };
  const p = new THREE.Vector3();
  faces[1].mesh.onBeforeRender = (r, s, camera) => { if (!state.loading && !state.loaded) { camera.getWorldPosition(p); if (shouldLoad(p.x, p.z)) load(); } };   // only runs while the wall is in view
  draw();
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(draw).catch(() => {});
  return {
    group, load, state,
    setLanguage(l) { if (l !== state.lang) { state.lang = l; draw(); } },
    setTouch(v) { if (!!v !== state.touch) { state.touch = !!v; draw(); } },
    dispose() { state.disposed = true; for (const d of disposables) d.dispose(); },
  };
}
