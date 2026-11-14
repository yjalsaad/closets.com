/* The Ikhtarha (اختارها) hero stage in the middle of the nave: a round platform with three closed gift boxes (the campaign's own motif, see
 * public/brand/ikhtarha/illustrations/scene-gift-boxes.svg and hero-wide.jpg), a floor LED ring in the campaign teal, a suspended halo ring
 * and a two-sided screen blade. Front = the campaign's own hero artwork + logo + slogan; back = the three "how it works" steps.
 * Copy comes from products/campaignCopy.js (copied from the existing campaign code). No prizes, values or dates anywhere.
 * Colours: the campaign kit (palette.js ik*), mirrored from IkhtarhaRoot.jsx BRAND. Images are the campaign's existing public assets. */
import * as THREE from 'three';
import { PALETTE as P, hex, rgba } from '../../3d/palette';
import { bevelBox, placed, prep } from '../../3d/builders';
import { mergeGeometries } from '../../3d/geom';
import { poolTexture } from '../../3d/pbr';
import { IK, ikt } from '../../products/campaignCopy';
import { STAGE } from '../../products/catalog';

export const ASSETS = { hero: '/brand/ikhtarha/hero-wide.jpg', logo: '/brand/ikhtarha/logo-light.png' };
const SW = 1920, SH = 1080;   // screen canvas (16:9)

const loadImage = (src) => new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = () => resolve(null); i.crossOrigin = 'anonymous'; i.src = src; });

function wrap(g, text, x, y, maxW, lh, rtl) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = w; yy += lh; } else line = t; }
  if (line) { g.fillText(line, x, yy); yy += lh; } return yy;
}
const fontFor = (ar, weight, px) => (ar ? `${weight} ${px}px "IBM Plex Sans Arabic", "Noto Naskh Arabic", sans-serif` : `${weight} ${px}px "Inter", sans-serif`);

export function drawFront(c, imgs, lang) {
  const g = c.getContext('2d'), ar = lang === 'ar';
  g.clearRect(0, 0, SW, SH);
  g.fillStyle = hex(P.ikPurple); g.fillRect(0, 0, SW, SH);
  if (imgs.hero) g.drawImage(imgs.hero, 0, 0, SW, SH);
  // the campaign artwork keeps its gift boxes bottom-left, so the text lives on the right half (both languages)
  const grd = g.createLinearGradient(SW * 0.42, 0, SW, 0); grd.addColorStop(0, rgba(P.ikPurpleDeep, 0)); grd.addColorStop(0.5, rgba(P.ikPurpleDeep, 0.55)); g.fillStyle = grd; g.fillRect(SW * 0.42, 0, SW * 0.58, SH);
  g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = ar ? 'right' : 'left'; g.textBaseline = 'alphabetic';
  const W = 760, x0 = SW - 110 - W, x = ar ? SW - 110 : x0;
  g.fillStyle = hex(P.ikTeal); const chip = ikt(IK.eyebrow, lang); g.font = fontFor(ar, 600, 38); const cw = Math.min(W, g.measureText(chip).width + 64);
  const cx = ar ? x - cw : x; g.beginPath(); if (g.roundRect) g.roundRect(cx, 96, cw, 68, 34); else g.rect(cx, 96, cw, 68); g.fill();
  g.fillStyle = hex(P.ikWhite); g.fillText(chip, ar ? x - 32 : x + 32, 144);
  if (imgs.logo) { const lw = 520, lh = lw * imgs.logo.height / imgs.logo.width; g.drawImage(imgs.logo, ar ? x - lw : x, 210, lw, lh); }
  g.fillStyle = hex(P.ikWhite); g.font = fontFor(ar, 600, ar ? 62 : 56); wrap(g, ikt(IK.title, lang), x, 610, W, ar ? 90 : 80, ar);
  g.fillStyle = hex(P.ikMint); g.font = fontFor(ar, 500, 40); g.fillText(ikt(IK.slogan, lang), x, 880);
}

export function drawBack(c, lang) {
  const g = c.getContext('2d'), ar = lang === 'ar';
  g.clearRect(0, 0, SW, SH); g.fillStyle = hex(P.ikWhite); g.fillRect(0, 0, SW, SH);
  g.fillStyle = hex(P.ikPurple); g.fillRect(0, 0, SW, 14);
  g.direction = ar ? 'rtl' : 'ltr'; g.textAlign = ar ? 'right' : 'left'; g.textBaseline = 'alphabetic';
  const x = ar ? SW - 120 : 120;
  g.fillStyle = hex(P.ikTeal); g.font = fontFor(ar, 600, 40); g.fillText(ikt(IK.eyebrow, lang), x, 130);
  g.fillStyle = hex(P.ikPurpleDeep); g.font = fontFor(ar, 600, ar ? 72 : 64); wrap(g, ikt(IK.title, lang), x, 235, 1500, ar ? 98 : 84, ar);
  IK.steps.forEach((s, i) => {
    const y = 470 + i * 160;
    g.fillStyle = hex(P.ikTeal); g.beginPath(); g.arc(ar ? SW - 120 - 40 : 160, y - 18, 40, 0, 7); g.fill();
    g.fillStyle = hex(P.ikWhite); g.font = fontFor(false, 600, 40); g.textAlign = 'center'; g.fillText(String(i + 1), ar ? SW - 160 : 160, y - 4);
    g.textAlign = ar ? 'right' : 'left'; const tx = ar ? SW - 220 : 230;
    g.fillStyle = hex(P.ikPurpleDeep); g.font = fontFor(ar, 600, 50); g.fillText(ikt(s.t, lang), tx, y - 8);
    g.fillStyle = hex(P.brandGrey); g.font = fontFor(ar, 400, 36); wrap(g, ikt(s.d, lang), tx, y + 44, 1400, 46, ar);
  });
  g.fillStyle = hex(P.brandGrey); g.font = fontFor(ar, 400, 30); g.fillText(ikt(IK.fine, lang), x, SH - 56);
}

export function buildStage({ M, tier, lang = 'en', glowTex }) {
  const g = new THREE.Group(); g.name = 'ikhtarha-stage'; g.position.set(STAGE.x, 0, STAGE.z);
  const C = (n, k = 1) => new THREE.Color(n).multiplyScalar(k);
  const env = M.stoneInlay.envMap;
  const std = (o) => new THREE.MeshStandardMaterial({ envMap: env, ...o });
  // platform: dark polished top, brass edge, teal LED ring set into the top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.6, 0.16, 64), std({ color: C(P.ikPurpleDeep, 0.5), roughness: 0.28, metalness: 0.05, envMapIntensity: 0.9 })); top.position.y = 0.08; top.castShadow = top.receiveShadow = true; g.add(top);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.58, 0.022, 8, 96), M.brass); edge.rotation.x = Math.PI / 2; edge.position.y = 0.16; g.add(edge);
  const ringMat = new THREE.MeshBasicMaterial({ color: C(P.ikTealBright, 1.6), toneMapped: false }); const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.016, 6, 128), ringMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.162; g.add(ring);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6), new THREE.MeshBasicMaterial({ map: poolTexture(), color: C(P.ikTeal, 0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.012; pool.renderOrder = 4; g.add(pool);
  // gift boxes: closed boxes with lids, ribbons and bows (white / teal / mint, like the campaign illustration)
  const boxes = [[0, 0.16, 0.1, 0.62, P.ikWhite, P.ikTeal, 0.2], [0.78, 0.16, -0.32, 0.5, P.ikTeal, P.ikWhite, -0.35], [-0.72, 0.16, -0.36, 0.42, P.ikMint, P.ikPurple, 0.5]];
  const matBox = (c) => std({ color: C(c), roughness: 0.45, envMapIntensity: 0.7 });
  boxes.forEach(([x, y, z, s, c, rc, ry], i) => {
    const bx = new THREE.Group(); bx.position.set(x, y, z); bx.rotation.y = ry; g.add(bx);
    const body = new THREE.Mesh(bevelBox(s, s * 0.82, s, { b: 0.012 }), matBox(c)); body.position.y = s * 0.41; body.castShadow = body.receiveShadow = true; bx.add(body);
    const lid = new THREE.Mesh(bevelBox(s * 1.06, s * 0.16, s * 1.06, { b: 0.01 }), matBox(c)); lid.position.y = s * 0.82 + s * 0.08; lid.castShadow = true; bx.add(lid);
    const rib = new THREE.Mesh(mergeGeometries([prep(placed(bevelBox(s * 0.16, s * 0.99, s * 1.075, { b: 0.006 }), { y: s * 0.495 })), prep(placed(bevelBox(s * 1.075, s * 0.99, s * 0.16, { b: 0.006 }), { y: s * 0.495 }))]), matBox(rc)); bx.add(rib);
    for (const sgn of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(s * 0.17, s * 0.035, 8, 20), matBox(rc)); loop.position.set(sgn * s * 0.17, s * 0.98 + s * 0.1, 0); loop.rotation.set(0, 0, sgn * 0.6); loop.scale.set(1, 1.25, 0.8); bx.add(loop); }
  });
  // suspended halo ring (LED) above the platform
  const haloMat = new THREE.MeshBasicMaterial({ color: C(P.ikMint, 2.2), toneMapped: false }); const halo = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.03, 8, 128), haloMat); halo.rotation.x = Math.PI / 2; halo.position.y = 4.1; g.add(halo);
  const wires = []; for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; wires.push(prep(placed(new THREE.CylinderGeometry(0.004, 0.004, 9.6 - 4.1, 4), { x: Math.cos(a) * 2.0, y: (9.6 + 4.1) / 2, z: Math.sin(a) * 2.0 }))); }
  g.add(new THREE.Mesh(mergeGeometries(wires), M.charcoal));
  // screen blade: lacquer body, front = hero + logo + slogan, back = how it works
  const blade = new THREE.Group(); blade.position.set(0, 0, -2.9); g.add(blade);
  const bladeBody = new THREE.Mesh(bevelBox(6.2, 3.55, 0.12, { b: 0.006 }), std({ color: C(P.ikPurpleDeep, 0.8), roughness: 0.35, envMapIntensity: 0.8 })); bladeBody.position.y = 0.2 + 1.775; bladeBody.castShadow = true; blade.add(bladeBody);
  const mkScreen = (z, ry) => {
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Math.min(8, tier.anisotropy || 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.84, 3.285), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, color: C(0xffffff, 0.92) })); m.position.set(0, 0.2 + 1.775, z); m.rotation.y = ry; blade.add(m); return { cv, tx, m };
  };
  const front = mkScreen(0.062, 0), back = mkScreen(-0.062, Math.PI);
  const feet = [-2.6, 2.6].map((x) => prep(placed(bevelBox(0.16, 0.2, 0.5, { b: 0.004 }), { x, y: 0.1 })));
  blade.add(new THREE.Mesh(mergeGeometries(feet), M.bronze));
  const imgs = { hero: null, logo: null };
  const paint = (l) => { drawFront(front.cv, imgs, l); front.tx.needsUpdate = true; drawBack(back.cv, l); back.tx.needsUpdate = true; };
  paint(lang);
  Promise.all([loadImage(ASSETS.hero), loadImage(ASSETS.logo)]).then(([h, l]) => { imgs.hero = h; imgs.logo = l; paint(g.userData.lang || lang); });
  g.userData.lang = lang;
  // purple wash on the blade foot so the screen reads as light
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), new THREE.MeshBasicMaterial({ map: poolTexture(), color: C(P.ikPurple, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); bw.rotation.x = -Math.PI / 2; bw.position.set(0, 0.014, -2.2); bw.renderOrder = 4; g.add(bw);
  return {
    group: g, relabel(l) { g.userData.lang = l; paint(l); },
    setLevel(k) { ringMat.color.copy(C(P.ikTealBright, 1.6 * k)); haloMat.color.copy(C(P.ikMint, 2.2 * k)); },
    dispose() { for (const s of [front, back]) { s.tx.dispose(); s.m.material.dispose(); } },
  };
}
