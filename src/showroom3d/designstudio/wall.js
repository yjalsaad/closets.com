/* The Design Studio station (three.js; Kitchen + TV Unit share it): name sign, a 4.8 x 2.7 m wall screen (bronze bezel, LED halo) that loops real screenshots of the website's designers (every section's frames in turn), a travertine /
 * walnut base and a free-standing touch podium whose tablet has one button per section. It is a POSTER: the screen never runs a second WebGL context or the designer itself (the real designer opens full-viewport on
 * E / tap, see DesignerOverlay.jsx). Frames load only when the visitor is near; the low tier shows one still frame. Colours come from palette.js only.
 *
 * Local frame (same as collections/wall.js): the group sits on the wall face, rotated so +z faces the hall and +x is the visitor's right. */
import * as THREE from 'three';
import { PALETTE as P, hex, rgba } from '../3d/palette';
import { box, mesh } from '../3d/geom';
import { bevelBox, placed, mergeColored } from '../3d/builders';
import { makePanel, FONT, roundedRect, wrap } from '../scenes/products/screens';
import { SECTIONS, stationSections, stationName, sectionName, sectionShort } from './sections';
import { SCREEN, SIGN, BASE, PODIUM, placement, tierOf, shouldLoad, loopAt, LOOP } from './layout';
import { posterUrls } from './sections';
import { dt, sdt } from './strings';

const SS = 2;   // sign canvas is drawn at 2x and mipmapped: crisp at the stand point and on high-DPR screens
const EN_DISPLAY = '"Fraunces", Georgia, serif', EN_SANS = '"Inter", sans-serif', AR_DISPLAY = '"Noto Naskh Arabic", "IBM Plex Sans Arabic", serif', AR_SANS = '"IBM Plex Sans Arabic", sans-serif';

/** the name sign: "Kitchen Design Studio" / "استوديو تصميم المطابخ" with "by YAS WOOD" (same wording as the hall's column plates), brass border on charcoal like the bay signs */
export function drawSign(canvas, { lang, title }) {
  const w = 2048, h = 264, g = canvas.getContext('2d'), k = canvas.width / w, ar = lang === 'ar';
  g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, w, h);
  g.fillStyle = hex(P.charcoal); g.fillRect(0, 0, w, h);
  g.strokeStyle = hex(P.brass); g.lineWidth = 5; g.strokeRect(14, 14, w - 28, h - 28);
  g.textBaseline = 'middle'; g.direction = ar ? 'rtl' : 'ltr';
  const pad = 96, x0 = ar ? w - pad : pad, al = ar ? 'right' : 'left';
  g.fillStyle = hex(P.brass); g.beginPath(); g.arc(x0 + (ar ? -14 : 14), h / 2, 14, 0, Math.PI * 2); g.fill();
  const tx = x0 + (ar ? -52 : 52);
  g.fillStyle = hex(P.sand); g.textAlign = al; g.font = ar ? `700 128px ${AR_DISPLAY}` : `600 120px ${EN_DISPLAY}`; g.fillText(title || dt('title', lang), tx, h * 0.5, w - pad * 2 - 560);
  g.fillStyle = hex(P.brassPale); g.textAlign = ar ? 'left' : 'right'; g.font = ar ? `600 66px ${AR_SANS}` : `600 58px ${EN_SANS}`; g.fillText(dt('byline', lang), ar ? pad : w - pad, h * 0.52, 520);
}

/** the screen while no poster frame is available (and the layer under them): the designer's name and an illustrative plan, drawn with the same helpers as the hall's other screens */
export function drawAttract(g, w, h, lang, { title, tagline } = {}) {
  const rtl = lang === 'ar', x0 = rtl ? w - 80 : 80, al = rtl ? 'right' : 'left';
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(P.charcoal)); gr.addColorStop(1, hex(P.screenDark)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = hex(P.brandOrange); g.fillRect(rtl ? w - 80 - 90 : 80, 90, 90, 6);
  g.fillStyle = hex(P.sand); g.textAlign = al; g.font = `700 96px ${FONT}`; g.fillText(title || dt('title', lang), x0, 215, w * 0.5);
  g.font = `500 44px ${FONT}`; g.fillStyle = hex(P.brassPale); wrap(g, tagline || dt('tagline', lang), x0, 295, w * 0.45, 58, al);
  const px = rtl ? 90 : w * 0.56, py = 110, pw = w * 0.38, ph = h * 0.62;
  g.strokeStyle = 'rgba(233,226,214,0.75)'; g.lineWidth = 4; g.strokeRect(px, py, pw, ph);
  g.strokeStyle = hex(P.brass); g.lineWidth = 3; g.strokeRect(px + 14, py + 14, pw - 28, 40); g.strokeRect(px + 14, py + 14, 40, ph - 28); g.strokeRect(px + pw * 0.38, py + ph * 0.42, pw * 0.38, ph * 0.2);
}

const OVERLAY_W = 1600, OVERLAY_H = 900;
/** the layer over the poster: a "Preview" tag and the call to action (E / tap) so the screen invites the visitor */
function drawOverlay(canvas, { lang, touch, section, sections = [] }) {
  const g = canvas.getContext('2d'), k = canvas.width / OVERLAY_W, ar = lang === 'ar'; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, OVERLAY_W, OVERLAY_H); g.direction = ar ? 'rtl' : 'ltr'; g.textBaseline = 'middle';
  const sh = g.createLinearGradient(0, OVERLAY_H * 0.72, 0, OVERLAY_H); sh.addColorStop(0, rgba(P.ink, 0)); sh.addColorStop(1, rgba(P.ink, 0.78)); g.fillStyle = sh; g.fillRect(0, OVERLAY_H * 0.72, OVERLAY_W, OVERLAY_H * 0.28);
  const label = dt('start', lang), hint = dt(touch ? 'podiumTouch' : 'podiumKey', lang);
  g.font = ar ? `700 54px ${AR_SANS}` : `700 50px ${EN_SANS}`; const lw = g.measureText(label).width; g.font = ar ? `600 38px ${AR_SANS}` : `600 34px ${EN_SANS}`; const hw = g.measureText(hint).width;
  const bw = lw + hw + 150, bx = (OVERLAY_W - bw) / 2, by = OVERLAY_H - 150, bh = 92;
  g.fillStyle = hex(P.brandOrange); roundedRect(g, bx, by, bw, bh, 46); g.fill();
  g.fillStyle = hex(P.ink); g.textAlign = 'center'; g.font = ar ? `700 54px ${AR_SANS}` : `700 50px ${EN_SANS}`; g.fillText(label, bx + 46 + lw / 2, by + bh / 2 + 2, lw + 4);
  g.fillStyle = rgba(P.ink, 0.16); roundedRect(g, bx + 46 + lw + 24, by + 16, hw + 40, bh - 32, 26); g.fill();
  g.fillStyle = hex(P.ink); g.font = ar ? `600 38px ${AR_SANS}` : `600 34px ${EN_SANS}`; g.fillText(hint, bx + 46 + lw + 44 + hw / 2, by + bh / 2 + 2, hw + 4);
  const tag = sdt(section, 'preview', lang); g.font = ar ? `600 30px ${AR_SANS}` : `600 26px ${EN_SANS}`; const tw = g.measureText(tag).width + 44, tx = ar ? 36 : OVERLAY_W - 36 - tw;
  g.fillStyle = rgba(P.ink, 0.62); roundedRect(g, tx, 32, tw, 52, 26); g.fill(); g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.fillText(tag, tx + tw / 2, 59, tw - 10);
  if (sections.length > 1) {   // a shared wall: one pill per section in the opposite top corner, the one on screen filled
    g.font = ar ? `700 30px ${AR_SANS}` : `700 26px ${EN_SANS}`; let px = ar ? OVERLAY_W - 36 : 36;
    for (const s of sections) {
      const nm = sectionShort(s, lang), pw = g.measureText(nm).width + 44, on = s.id === section.id, x = ar ? px - pw : px;
      g.fillStyle = on ? hex(P.brandOrange) : rgba(P.ink, 0.62); roundedRect(g, x, 32, pw, 52, 26); g.fill();
      g.fillStyle = on ? hex(P.ink) : hex(P.sand); g.textAlign = 'center'; g.fillText(nm, x + pw / 2, 59, pw - 10); px += ar ? -(pw + 12) : pw + 12;
    }
  }
}

/** the touch podium's tablet: what the visitor taps / presses E for */
export function drawTablet(g, w, h, lang, L, touch, sections = []) {
  const rtl = lang === 'ar'; g.direction = rtl ? 'rtl' : 'ltr';
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, hex(P.screenDark)); gr.addColorStop(1, hex(P.charcoal)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = hex(P.brass); g.lineWidth = 3; roundedRect(g, 10, 10, w - 20, h - 20, 14); g.stroke();
  g.fillStyle = hex(P.sand); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${Math.round(h * 0.15)}px ${FONT}`; g.fillText(stationName(sections, lang) || dt('title', lang), w / 2, h * 0.2, w - 60);
  if (sections.length > 1) {   // one big button per section (left to right in English, right to left in Arabic): a tap / click on a half opens that section
    const n = sections.length, gap = 24, bw2 = (w - 60 - gap * (n - 1)) / n, bh2 = h * 0.34, by2 = h * 0.36;
    sections.forEach((s, i) => {
      const slot = rtl ? n - 1 - i : i, bx2 = 30 + slot * (bw2 + gap);
      g.fillStyle = hex(P.brandOrange); roundedRect(g, bx2, by2, bw2, bh2, bh2 / 2.4); g.fill();
      g.fillStyle = hex(P.ink); g.font = `700 ${Math.round(h * 0.105)}px ${FONT}`; g.fillText(sectionShort(s, lang), bx2 + bw2 / 2, by2 + bh2 / 2 + 2, bw2 - 36);
    });
    g.fillStyle = hex(P.brassPale); g.font = `600 ${Math.round(h * 0.085)}px ${FONT}`; g.fillText(dt('tabletPick', lang), w / 2, h * 0.84, w - 60);
    return;
  }
  const bw = w * 0.62, bh = h * 0.24, bx = (w - bw) / 2, by = h * 0.4; g.fillStyle = hex(P.brandOrange); roundedRect(g, bx, by, bw, bh, bh / 2); g.fill();
  g.fillStyle = hex(P.ink); g.font = `700 ${Math.round(h * 0.12)}px ${FONT}`; g.fillText(dt('start', lang), w / 2, by + bh / 2 + 2, bw - 40);
  g.fillStyle = hex(P.brassPale); g.font = `600 ${Math.round(h * 0.085)}px ${FONT}`; g.fillText(dt(touch ? 'podiumTouch' : 'podiumKey', lang), w / 2, h * 0.8, w - 60);
}

const texOf = (canvas, aniso) => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };

export function buildDesignStudio({ tier = 'high', lang = 'en', reduced = false, section = SECTIONS[0], sections } = {}) {
  const secs = sections && sections.length ? sections : stationSections(section).length ? stationSections(section) : [section];   // every section that shares this wall (the first one is the station's id)
  section = secs[0];
  const T = tierOf(tier), pl = placement(section), disposables = [], keep = (o) => { disposables.push(o); return o; };
  const group = new THREE.Group(); group.name = 'design-studio-' + section.id; group.position.set(pl.x, 0, pl.z); group.rotation.y = Math.PI;
  const state = { lang, touch: false, reduced, frames: [], framesLang: null, loading: false, loaded: false, disposed: false, t: 0, near: 0, nearGoal: 0, pulse: 0, shown: 0, sec: 0 };   // `sec`: the section whose frame is on top of the screen
  const add = (geo, mat, pos) => { const m = mesh(keep(geo), mat, pos); group.add(m); return m; };
  const std = (o) => keep(new THREE.MeshStandardMaterial(o));

  // ---- base (floor to the screen's bottom edge): walnut, travertine cap, brass line, warm toe-kick LED ----
  const baseW = SCREEN.w + 0.5, bottom = SCREEN.cy - SCREEN.h / 2;
  const baseItems = [
    { geo: placed(bevelBox(baseW, BASE.h - 0.1, BASE.depth, { b: 0.012 }), { y: (BASE.h - 0.1) / 2 + 0.08, z: BASE.depth / 2 }), color: P.walnutDeep },
    { geo: placed(bevelBox(baseW + 0.04, 0.05, BASE.depth + 0.04, { b: 0.008 }), { y: BASE.h - 0.02, z: BASE.depth / 2 + 0.02 }), color: P.travertineTint },
    { geo: placed(bevelBox(baseW - 0.2, 0.022, 0.02), { y: BASE.h * 0.62, z: BASE.depth + 0.004 }), color: P.brass },
    { geo: placed(bevelBox(baseW, 0.08, BASE.depth - 0.06), { y: 0.04, z: (BASE.depth - 0.06) / 2 }), color: P.bronzeDark },
  ];
  const baseMat = std({ vertexColors: true, roughness: 0.6, metalness: 0.06, envMapIntensity: 0.5, emissive: P.walnutDeep, emissiveIntensity: 0.85 });   // the wing is in shade: a little self-light keeps the walnut reading as walnut, not black (same trick as collections/wall.js)
  { const m = new THREE.Mesh(keep(mergeColored(baseItems)), baseMat); m.castShadow = true; m.receiveShadow = true; m.name = 'ds-base'; group.add(m); }
  add(box(baseW - 0.3, 0.02, 0.012), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(P.ledWarm).multiplyScalar(T.bloom ? 2.2 : 1), toneMapped: false })), { y: 0.095, z: BASE.depth - 0.032 });   // toe-kick LED line

  // ---- screen: bezel, glass, layers (fallback drawing, poster frame A, frame B fading in, call-to-action overlay) ----
  const bz = SCREEN.bezel, sw = SCREEN.w, sh = SCREEN.h;
  add(box(sw + bz * 2, sh + bz * 2, SCREEN.depth), std({ color: P.bronzeDark, roughness: 0.42, metalness: 0.4, emissive: P.bronzeDark, emissiveIntensity: 0.25 }), { y: SCREEN.cy, z: SCREEN.depth / 2 + 0.02 });
  add(box(sw + bz * 2 + 0.05, 0.03, 0.05), std({ color: P.brassBrushed, roughness: 0.45, metalness: 0.3, emissive: P.brassBrushed, emissiveIntensity: 0.3 }), { y: SCREEN.cy + sh / 2 + bz + 0.02, z: SCREEN.depth + 0.02 });   // brass cap line
  const fz = SCREEN.depth + 0.02 + 0.004;
  const stationTitle = (l) => stationName(secs, l), stationTag = (l) => (secs.length > 1 ? dt('stationTagline', l) : sdt(section, 'tagline', l));
  const attract = makePanel(1600, 900, (g, w, h, l) => drawAttract(g, w, h, l, { title: stationTitle(l), tagline: stationTag(l) }), lang, { design: { w: 1600, h: 900 }, anisotropy: T.anisotropy }); keep(attract.tex);
  const layer = (map, z, order, opacity = 1) => {
    const mat = keep(new THREE.MeshBasicMaterial({ map, toneMapped: false, transparent: opacity < 1 || order > 0, opacity, depthWrite: order === 0 })); mat.color.setScalar(T.glow);
    const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(sw, sh)), mat); m.position.set(0, SCREEN.cy, z); m.renderOrder = order; group.add(m); return m;
  };
  const base = layer(attract.tex, fz, 0); base.name = 'ds-screen';
  const frameA = layer(null, fz + 0.0006, 1, 0), frameB = layer(null, fz + 0.0012, 2, 0); frameA.visible = frameB.visible = false;
  // one call-to-action layer per section (its own "Preview of the ... designer" tag and the section pills); the one of the frame on top is shown (1280 x 720 each: the text is large)
  const ocs = secs.map(() => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; return c; }), overlayTexs = ocs.map((c) => keep(texOf(c, T.anisotropy)));
  const overlayMat = keep(new THREE.MeshBasicMaterial({ map: overlayTexs[0], transparent: true, toneMapped: false, depthWrite: false })); const overlay = new THREE.Mesh(keep(new THREE.PlaneGeometry(sw, sh)), overlayMat); overlay.position.set(0, SCREEN.cy, fz + 0.002); overlay.renderOrder = 3; group.add(overlay);

  // ---- LED halo: warm wash on the wall around the bezel + a soft pool on the floor (additive, one tiny gradient texture; no real light, so no shader variants for the hall) ----
  if (T.glow >= 1) {
    const gc = document.createElement('canvas'); gc.width = 64; gc.height = 64; const gg = gc.getContext('2d'), rg = gg.createRadialGradient(32, 32, 4, 32, 32, 32);
    rg.addColorStop(0, rgba(P.ledWarm, 0.95)); rg.addColorStop(0.55, rgba(P.ledWarm, 0.22)); rg.addColorStop(1, rgba(P.ledWarm, 0)); gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
    const gt = keep(new THREE.CanvasTexture(gc)); gt.colorSpace = THREE.SRGBColorSpace;
    const wash = (w, h, o, pos, rx = 0) => { const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), keep(new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))); m.position.set(pos.x || 0, pos.y || 0, pos.z || 0); m.rotation.x = rx; m.renderOrder = 2; group.add(m); return m; };
    wash(sw + 2.6, sh + 1.9, 0.34, { y: SCREEN.cy, z: 0.03 });                                           // halo on the wall behind the bezel
    wash(sw + 1.4, 2.6, 0.2, { y: 0.014, z: 1.3 }, -Math.PI / 2);                                        // spill on the floor in front
  }

  // ---- sign ----
  const sc = document.createElement('canvas'); sc.width = 2048 * (SS / 2); sc.height = Math.round(264 * (SS / 2)); const signTex = keep(texOf(sc, 16));
  add(new THREE.PlaneGeometry(SIGN.w, SIGN.h), keep(new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false, color: new THREE.Color(P.signTint) })), { y: SIGN.cy, z: 0.05 }).name = 'ds-sign';
  add(box(SIGN.w + 0.12, SIGN.h + 0.12, 0.03), std({ color: P.bronzeDark, roughness: 0.5, metalness: 0.3 }), { y: SIGN.cy, z: 0.03 });

  // ---- touch podium: soft walnut body, stone top, brass line, slanted tablet (one merged mesh + one tablet plane) ----
  const podLocal = { x: -PODIUM.dx, z: PODIUM.dz };   // group local frame: z outward from the wall, +x = the visitor's right (so toward the glass wall is -x)
  const bodyH = PODIUM.h - 0.07, podItems = [
    { geo: placed(bevelBox(PODIUM.w, bodyH, PODIUM.d, { b: 0.02 }), { x: podLocal.x, y: bodyH / 2 + 0.04, z: podLocal.z }), color: P.walnutDeep },
    { geo: placed(bevelBox(PODIUM.w + 0.08, 0.06, PODIUM.d + 0.08, { b: 0.012 }), { x: podLocal.x, y: PODIUM.h - 0.03, z: podLocal.z }), color: P.marbleWhite },
    { geo: placed(bevelBox(PODIUM.w - 0.16, 0.02, 0.02), { x: podLocal.x, y: 0.62, z: podLocal.z + PODIUM.d / 2 + 0.004 }), color: P.brass },
    { geo: placed(bevelBox(PODIUM.w + 0.02, 0.06, PODIUM.d + 0.02, { b: 0.01 }), { x: podLocal.x, y: 0.03, z: podLocal.z }), color: P.bronzeDark },
  ];
  { const m = new THREE.Mesh(keep(mergeColored(podItems)), std({ vertexColors: true, roughness: 0.55, metalness: 0.06, envMapIntensity: 0.5, emissive: P.walnutDeep, emissiveIntensity: 0.7 })); m.castShadow = true; m.receiveShadow = true; m.name = 'ds-podium'; group.add(m); }
  const tilt = 0.28, tabW = 1.08, tabH = 0.5, tabY = PODIUM.h + 0.05; let tabFace = null;
  const tab = makePanel(1024, 480, (g, w, h, l, L) => drawTablet(g, w, h, l, L, state.touch, secs), lang, { design: { w: 1024, h: 480 }, anisotropy: 8 }); keep(tab.tex);
  { const tg = new THREE.Group(); tg.position.set(podLocal.x, tabY, podLocal.z); tg.rotation.x = -Math.PI / 2 + tilt;
    const frame = new THREE.Mesh(keep(new THREE.BoxGeometry(tabW + 0.06, tabH + 0.06, 0.03)), std({ color: P.bronzeDark, roughness: 0.4, metalness: 0.4 })); frame.position.z = 0.0; tg.add(frame);
    const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(tabW, tabH)), keep(new THREE.MeshBasicMaterial({ map: tab.tex, toneMapped: false }))); face.position.z = 0.017; face.name = 'ds-tablet'; tg.add(face); tabFace = face;
    group.add(tg); }

  // ---- the floor halo in front of the podium: a soft orange pool that fades in near it and pulses on E ----
  const hc = document.createElement('canvas'); hc.width = 64; hc.height = 64; { const hg2 = hc.getContext('2d'), rg2 = hg2.createRadialGradient(32, 32, 2, 32, 32, 32); rg2.addColorStop(0, rgba(P.brandOrange, 1)); rg2.addColorStop(0.5, rgba(P.brandOrange, 0.35)); rg2.addColorStop(1, rgba(P.brandOrange, 0)); hg2.fillStyle = rg2; hg2.fillRect(0, 0, 64, 64); }
  const haloTex = keep(new THREE.CanvasTexture(hc)); haloTex.colorSpace = THREE.SRGBColorSpace;
  const hm = keep(new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6, 1.7)), hm); halo.rotation.x = -Math.PI / 2; halo.position.set(podLocal.x, 0.02, podLocal.z + PODIUM.d / 2 + 0.7); halo.renderOrder = 3; halo.visible = false; group.add(halo);

  // ---- drawing ----
  const drawSignNow = () => { if (!state.disposed) { drawSign(sc, { lang: state.lang, title: stationTitle(state.lang) }); signTex.needsUpdate = true; } };
  const drawOverlayNow = () => { if (!state.disposed) { secs.forEach((s, i) => { drawOverlay(ocs[i], { lang: state.lang, touch: state.touch, section: s, sections: secs }); overlayTexs[i].needsUpdate = true; }); } };
  const showSec = (i) => { if (i === state.sec) return; state.sec = i; overlayMat.map = overlayTexs[i]; overlayMat.needsUpdate = true; };
  drawSignNow(); drawOverlayNow();
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSignNow(); drawOverlayNow(); attract.redraw(state.lang); attract.tex.needsUpdate = true; tab.redraw(state.lang); tab.tex.needsUpdate = true; }).catch(() => {});

  // ---- poster frames: requested once, only when the visitor is near (or on demand); a language change fetches that language's set ----
  const setFrame = (mesh3, f) => { if (!f) { mesh3.visible = false; return; } mesh3.material.map = f.tex; mesh3.material.needsUpdate = true; };
  const load = () => {
    if (state.loading || state.disposed) return; const want = state.lang; if (state.loaded && state.framesLang === want) return;
    state.loading = true; const urls = [], owner = []; secs.forEach((sc2, si) => posterUrls(sc2, want).slice(0, T.frames).forEach((u) => { urls.push(u); owner.push(si); }));   // every section's frames, section by section
    const got = []; let left = urls.length;
    const done = () => {
      if (--left > 0) return; state.loading = false; if (state.disposed) { got.forEach((f) => f && f.tex.dispose()); return; }
      state.frames.forEach((f) => f && f.tex.dispose()); state.frames = got.filter(Boolean); state.framesLang = want; state.loaded = true; state.t = 0;
      if (state.frames.length) { setFrame(frameA, state.frames[0]); frameA.material.opacity = 1; frameA.visible = true; frameB.visible = false; state.shown = 0; showSec(state.frames[0].si); }
      if (state.lang !== want) load();    // the language changed while the frames were loading: fetch the right set
    };
    urls.forEach((u, i) => { const im = new Image(); im.decoding = 'async'; im.onload = () => { const tex = new THREE.Texture(im); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = T.anisotropy; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true; got[i] = { tex, si: owner[i] }; done(); }; im.onerror = () => done(); im.src = u; });
  };
  const camP = new THREE.Vector3();
  base.onBeforeRender = (r, s, camera) => { if (!state.loading && !state.loaded) { camera.getWorldPosition(camP); if (shouldLoad(camP.x, camP.z, section)) load(); } };

  return {
    group, load, state, section,
    /** per frame: the attract loop (cross-fade) and the floor halo */
    update(dt) {
      if (state.disposed) return; state.t += dt;
      state.near += (state.nearGoal - state.near) * (1 - Math.exp(-6 * dt)); state.pulse = Math.max(0, state.pulse - dt / 1.6);
      const o = state.near * 0.22 + state.pulse * (0.4 + 0.15 * Math.sin(state.pulse * 12)); hm.opacity = o; halo.visible = o > 0.004;
      const n = state.frames.length; if (!n) return;
      const loopOn = (T.loop || secs.length > 1) && !state.reduced;           // a shared wall always alternates its sections (even the still low tier: the frames are already loaded), unless motion is reduced
      if (n < 2 || !loopOn) { if (state.shown !== 0) { setFrame(frameA, state.frames[0]); frameA.material.opacity = 1; frameB.visible = false; state.shown = 0; } showSec(state.frames[0].si); return; }
      const l = loopAt(state.t, n, LOOP);
      showSec(state.frames[l.k >= 0.5 ? l.b : l.a].si);
      if (l.a !== state.shown) { setFrame(frameA, state.frames[l.a]); frameA.material.opacity = 1; frameA.visible = true; state.shown = l.a; }
      if (l.k > 0) { if (frameB.material.map !== state.frames[l.b].tex) setFrame(frameB, state.frames[l.b]); frameB.visible = true; frameB.material.opacity = l.k; } else frameB.visible = false;
    },
    setNear(v) { state.nearGoal = v ? 1 : 0; },
    /** the sections that share this wall, and the id of the one whose frame is on screen right now (what a click on the screen means) */
    sections: secs, sectionShown: () => secs[Math.min(state.sec, secs.length - 1)].id,
    /** a ray (THREE.Raycaster) at the podium tablet: the id of the section whose button it hits (a shared wall only), else null */
    pickSection(raycaster) {
      if (secs.length < 2 || !tabFace) return null; const h = raycaster.intersectObject(tabFace, false)[0]; if (!h || !h.uv) return null;
      const n = secs.length, slot = Math.min(n - 1, Math.max(0, Math.floor(h.uv.x * n))); return secs[state.lang === 'ar' ? n - 1 - slot : slot].id;
    },
    pulseHalo() { state.pulse = 1; },
    setLanguage(l) { if (l === state.lang) return; state.lang = l; drawSignNow(); drawOverlayNow(); attract.redraw(l); attract.tex.needsUpdate = true; tab.redraw(l); tab.tex.needsUpdate = true; if (state.loaded || state.loading) { state.loaded = false; if (!state.loading) load(); } },
    setTouch(v) { if (!!v === state.touch) return; state.touch = !!v; drawOverlayNow(); tab.redraw(state.lang); tab.tex.needsUpdate = true; },
    setReduced(v) { state.reduced = !!v; },
    /** does a ray (THREE.Raycaster) hit the screen, sign or podium? */
    pick(raycaster) { const hits = raycaster.intersectObjects([base, group.getObjectByName('ds-podium'), group.getObjectByName('ds-tablet')].filter(Boolean), false); return hits.length ? hits[0].distance : null; },
    dispose() { state.disposed = true; state.frames.forEach((f) => f && f.tex.dispose()); for (const d of disposables) if (d && d.dispose) d.dispose(); },
  };
}
