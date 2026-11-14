/* Adviser kiosk: a slim bronze / walnut digital totem (1.75 m) with a portrait screen at eye level, a name plate (first name, role, the "(AI)" label, EN / AR), a soft LED frame,
 * a slow breathing zoom + light sweep while idle and a waveform while she answers. It exposes the SAME interface the StaffManager uses for a character
 * (group, setFar, drawCalls, dispose, meshes, bounds, label, setPose) plus update() / setLanguage(), so all staff logic (Talk, T / E, greeting, chat, take-me-to, colliders) is unchanged.
 * The portrait is a real image file when one exists; otherwise a non-human monogram card. Front is +Z (like a character). */
import * as THREE from 'three';
import { bevelBox, placed, mergeColored } from '../3d/builders';
import { PALETTE as P, hex, rgba } from '../3d/palette';
import { portraitUrl } from './config';
import { FONT } from '../scenes/products/screens';

export const KIOSK = { h: 1.75, w: 0.5, d: 0.08, screen: { w: 0.42, h: 0.56, y: 1.36 }, plate: { w: 0.42, h: 0.2, y: 0.95 }, footprint: { hx: 0.31, hz: 0.18 } };
const AR_FONT = "'IBM Plex Sans Arabic','Noto Naskh Arabic',sans-serif";
const ctx2d = (c) => { try { return c.getContext('2d'); } catch (e) { return null; } };
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const texOf = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };

/** the name plate: first name, role and the AI label, drawn at 2x for legibility from the standing position */
export function drawPlate(c, def, lang) {
  const g = ctx2d(c); if (!g) return; const ar = lang === 'ar', w = c.width, h = c.height, L = (o) => (o ? (ar ? o.ar : o.en) : '');
  g.fillStyle = hex(P.ink); g.fillRect(0, 0, w, h); g.strokeStyle = hex(P.brass); g.lineWidth = 5; g.strokeRect(8, 8, w - 16, h - 16);
  g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = hex(P.sand); g.font = `700 ${Math.round(h * 0.34)}px ${ar ? AR_FONT : FONT}`; g.fillText(L(def.first) || L(def.name), w / 2, h * 0.3, w - 60);
  g.fillStyle = hex(P.brassPale); g.font = `600 ${Math.round(h * 0.155)}px ${ar ? AR_FONT : FONT}`; g.fillText(L(def.role) || '', w / 2, h * 0.6, w - 60);
  // the AI label is always part of the plate
  const label = ar ? 'مساعد ذكاء اصطناعي' : 'AI assistant', fs = Math.round(h * 0.125); g.font = `700 ${fs}px ${ar ? AR_FONT : FONT}`; const tw = (g.measureText(label).width || fs * 6) + fs * 1.4;
  g.fillStyle = hex(P.brandOrange); g.fillRect((w - tw) / 2, h * 0.745, tw, fs * 1.55); g.fillStyle = hex(P.ink); g.fillText(label, w / 2, h * 0.745 + fs * 0.8);
}
/** the non-human fallback card: a monogram on a soft gradient with a waveform motif (never a broken image) */
export function drawMonogram(c, def, lang) {
  const g = ctx2d(c); if (!g) return; const ar = lang === 'ar', w = c.width, h = c.height, name = (def.first && (ar ? def.first.ar : def.first.en)) || (def.name && (ar ? def.name.ar : def.name.en)) || '';
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(P.walnutDeep)); gr.addColorStop(0.55, hex(P.brandBrown)); gr.addColorStop(1, hex(P.ink)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const halo = g.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, w * 0.6); halo.addColorStop(0, rgba(P.brassPale, 0.35)); halo.addColorStop(1, rgba(P.brassPale, 0)); g.fillStyle = halo; g.fillRect(0, 0, w, h);
  g.strokeStyle = hex(P.brassPale); g.lineWidth = Math.max(3, w * 0.012); g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.27, 0, Math.PI * 2); g.stroke();
  g.direction = ar ? 'rtl' : 'ltr'; g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(w * 0.3)}px ${ar ? AR_FONT : '"Fraunces", Georgia, serif'}`; g.fillText(Array.from(name)[0] || '', w / 2, h * 0.43);
  g.fillStyle = hex(P.brassPale); const n = 17, bw = w * 0.022; for (let i = 0; i < n; i++) { const k = Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)), bh = h * (0.02 + 0.07 * k); g.fillRect(w / 2 + (i - n / 2) * bw * 1.8, h * 0.8 - bh / 2, bw, bh); }
}
function drawGreet(c, lang) {
  const g = ctx2d(c); if (!g) return; const ar = lang === 'ar'; g.clearRect(0, 0, c.width, c.height); g.direction = ar ? 'rtl' : 'ltr'; g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `600 ${Math.round(c.height * 0.5)}px ${ar ? AR_FONT : FONT}`; g.fillText(ar ? 'أهلًا بك! تحدّث معي في أي وقت.' : 'Welcome! Talk to me any time.', c.width / 2, c.height / 2, c.width - 30);
}
function sweepTexture() {
  const c = cnv(128, 4), g = ctx2d(c); if (g) { const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping; return t;
}

let _body = null;
const bodyMat = () => _body || (_body = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.45, envMapIntensity: 0.8 }));
const BARS = 11;

export function buildKiosk(def, { lang = 'en', q = 1, loader = null } = {}) {
  const K = KIOSK, root = new THREE.Group(); root.name = 'kiosk'; root.userData.label = `${def.name ? def.name.en : def.id} (AI assistant) kiosk`;
  const zf = K.d / 2 + 0.0015, S = K.screen, PL = K.plate;
  // body: bronze totem on a base plate, a walnut lower panel and a brass inlay line (one draw call)
  const body = new THREE.Mesh(mergeColored([
    { geo: placed(bevelBox(K.w, K.h, K.d, { b: 0.012 }), { y: K.h / 2 }), color: P.bronzeDark },
    { geo: placed(bevelBox(K.w + 0.12, 0.035, 0.36, { b: 0.01 }), { y: 0.0175 }), color: P.bronzeDark },
    { geo: placed(bevelBox(K.w - 0.06, 0.66, 0.012, { b: 0.004 }), { y: 0.43, z: K.d / 2 + 0.004 }), color: P.walnutDeep },
    { geo: placed(bevelBox(K.w - 0.06, 0.008, 0.008, { b: 0.001 }), { y: 0.79, z: K.d / 2 + 0.006 }), color: P.brass },
  ]), bodyMat()); body.name = 'kiosk-body'; body.castShadow = true; body.receiveShadow = true; root.add(body);
  // portrait screen (the monogram card until / unless a portrait file loads)
  const fc = cnv(q ? 384 : 192, q ? 512 : 256); drawMonogram(fc, def, lang); const fallback = texOf(fc);
  const screenMat = new THREE.MeshBasicMaterial({ map: fallback, toneMapped: false }), screen = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.h), screenMat); screen.position.set(0, S.y, zf); screen.name = 'kiosk-screen'; root.add(screen);
  const pc = cnv(q ? 840 : 420, q ? 400 : 200); drawPlate(pc, def, lang); const plateTex = texOf(pc);
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false }), plate = new THREE.Mesh(new THREE.PlaneGeometry(PL.w, PL.h), plateMat); plate.position.set(0, PL.y, zf); plate.name = 'kiosk-plate'; root.add(plate);
  // detail (hidden when far): LED frame round the screen, light sweep, waveform, greeting line
  const detail = new THREE.Group(); detail.name = 'kiosk-detail'; root.add(detail);
  const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.ledWarm), toneMapped: false }), fb = 0.008;
  const frame = new THREE.Mesh(mergeColored([[S.w + fb * 2, fb, 0, S.h / 2 + fb / 2], [S.w + fb * 2, fb, 0, -S.h / 2 - fb / 2], [fb, S.h, -S.w / 2 - fb / 2, 0], [fb, S.h, S.w / 2 + fb / 2, 0]].map(([w, h, x, y]) => ({ geo: placed(new THREE.BoxGeometry(w, h, 0.004), { x, y: S.y + y, z: zf }), color: P.ikWhite }))), frameMat); frame.name = 'kiosk-frame'; detail.add(frame);
  const sweepTex = sweepTexture(), sweepMat = new THREE.MeshBasicMaterial({ map: sweepTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 });
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(S.w * 0.5, S.h), sweepMat); sweep.position.set(0, S.y, zf + 0.001); sweep.name = 'kiosk-sweep'; sweep.renderOrder = 5; detail.add(sweep);
  const barMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.brandOrange).multiplyScalar(1.6), toneMapped: false }), bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 1, 0.003), barMat, BARS); bars.name = 'kiosk-wave'; bars.frustumCulled = false; detail.add(bars);
  const gc = cnv(q ? 840 : 420, q ? 110 : 55); drawGreet(gc, lang); const greetTex = texOf(gc), greetMat = new THREE.MeshBasicMaterial({ map: greetTex, transparent: true, toneMapped: false, depthWrite: false, opacity: 0 });
  const greet = new THREE.Mesh(new THREE.PlaneGeometry(PL.w, PL.w * 110 / 840), greetMat); greet.position.set(0, PL.y + PL.h / 2 + 0.035, zf + 0.0005); greet.name = 'kiosk-greet'; detail.add(greet);

  const api = { group: root, kiosk: true, def, label: root.userData.label, meshes: [body, screen, plate, frame, sweep, bars, greet], far: null, farOn: false, awake: 0, hasPortrait: false, portrait: null, joints: {}, scale: 1, q,
    bounds: new THREE.Box3(new THREE.Vector3(-K.footprint.hx, 0, -K.footprint.hz), new THREE.Vector3(K.footprint.hx, K.h, K.footprint.hz)) };
  // portrait: only ever shown when the image really decodes; any failure keeps the monogram card
  if (loader !== false && typeof window !== 'undefined') {
    try { (loader || new THREE.TextureLoader()).load(portraitUrl(def.id), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; api.portrait = t; api.hasPortrait = true; screenMat.map = t; screenMat.needsUpdate = true; }, undefined, () => { api.hasPortrait = false; }); } catch (e) { /* monogram stays */ }
  }
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
  const setBars = (amp, t) => { for (let i = 0; i < BARS; i++) { const k = 0.35 + 0.65 * Math.abs(Math.sin(t * (5.5 + i * 0.7) + i * 1.3)), hgt = 0.006 + amp * 0.07 * k; _p.set((i - (BARS - 1) / 2) * 0.024, S.y - S.h / 2 + 0.06, zf + 0.002); _s.set(1, hgt, 1); _m.compose(_p, _q, _s); bars.setMatrixAt(i, _m); } bars.instanceMatrix.needsUpdate = true; };
  setBars(0, 0);
  /** awake: the visitor is near (the kiosk lights up and shows the greeting); talking + level: she is answering (waveform) */
  api.update = (dt, { awake = false, talking = false, level = 0, reduced = false, t = 0 } = {}) => {
    const goal = awake || talking ? 1 : 0; api.awake = reduced ? goal : api.awake + (goal - api.awake) * (1 - Math.exp(-4 * Math.max(0, dt))); const a = api.awake;
    screenMat.color.setScalar(0.55 + 0.45 * a); plateMat.color.setScalar(0.78 + 0.22 * a); frameMat.color.set(P.ledWarm).multiplyScalar(0.35 + 1.5 * a); greetMat.opacity = a; greet.visible = a > 0.02;
    api.talking = !!talking; bars.visible = a > 0.02; if (bars.visible) setBars(talking ? 0.35 + 0.65 * level : 0, reduced ? 0 : t);
    if (reduced) { sweepMat.opacity = 0; sweep.visible = false; if (api.portrait) { api.portrait.repeat.set(1, 1); api.portrait.offset.set(0, 0); } return; }
    const ph = (t * 0.16 + (def.seed || 0) * 0.37) % 1; sweep.visible = ph < 0.35; sweep.position.x = (ph / 0.35 - 0.5) * S.w * 0.6; sweepMat.opacity = ph < 0.35 ? 0.16 * Math.sin((ph / 0.35) * Math.PI) : 0;
    if (api.portrait) { const z = 1.02 + 0.015 * Math.sin(t * 0.6 + (def.seed || 0)); api.portrait.repeat.set(1 / z, 1 / z); api.portrait.offset.set((1 - 1 / z) / 2, (1 - 1 / z) / 2); }   // slow breathing zoom
  };
  api.setLanguage = (l) => { drawPlate(pc, def, l); plateTex.needsUpdate = true; drawGreet(gc, l); greetTex.needsUpdate = true; drawMonogram(fc, def, l); fallback.needsUpdate = true; };
  api.setFar = (v) => { api.farOn = !!v; detail.visible = !v; };
  api.drawCalls = () => (api.farOn ? 3 : 3 + [frame, sweep, bars, greet].filter((m) => m.visible).length);
  api.setPose = () => {};
  api.dispose = () => { for (const m of api.meshes) m.geometry.dispose(); [screenMat, plateMat, frameMat, sweepMat, barMat, greetMat].forEach((m) => m.dispose()); [fallback, plateTex, sweepTex, greetTex, api.portrait].forEach((t) => t && t.dispose()); };
  api.update(0, {});
  return api;
}
