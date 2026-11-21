/* The night view from Floor 2: a procedural, very cheap Bahrain-inspired skyline (silhouettes with lit windows, no photographs, no texture files).
 * Landmarks are only INSPIRED by Bahrain World Trade Center (two sail towers with wind turbines between them) and Bahrain Financial Harbour (twin slender towers with slanted tops).
 * One merged mesh for the towers, one for the same towers mirrored in the sea, one dome (stars + moon), one water plane, three turbines: about 10 draw calls. */
import * as THREE from 'three';
import { mergeGeometries } from '../../3d/geom';
import { NIGHT, BLOOM_LIGHT } from '../../bloom/palette';

const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const SEA_Y = -9;

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'), r = rng(7);
  g.fillStyle = '#0a1222'; g.fillRect(0, 0, 64, 128);
  for (let y = 2; y < 126; y += 4) for (let x = 2; x < 62; x += 4) { const q = r(); if (q < 0.17) { g.fillStyle = q < 0.04 ? '#9fb8e8' : q < 0.11 ? '#e9c27a' : '#c58a4a'; g.fillRect(x, y, 3, 3); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
function domeTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'), r = rng(21), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#04070f'); gr.addColorStop(0.55, '#0c1730'); gr.addColorStop(0.8, '#1d2b52'); gr.addColorStop(1, '#3a3f66'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 380; i++) { const y = Math.pow(r(), 1.6) * 300, a = 0.25 + r() * 0.7; g.fillStyle = `rgba(235,240,255,${a})`; g.fillRect(r() * 1024, y, r() > 0.9 ? 2 : 1, r() > 0.9 ? 2 : 1); }
  const mx = 700, my = 120, mg = g.createRadialGradient(mx, my, 4, mx, my, 70); mg.addColorStop(0, 'rgba(235,240,255,0.95)'); mg.addColorStop(0.15, 'rgba(210,224,255,0.5)'); mg.addColorStop(1, 'rgba(120,150,220,0)'); g.fillStyle = mg; g.fillRect(mx - 80, my - 80, 160, 160);
  g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(mx, my, 13, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** a tower with its UVs scaled so one window cell is the same size on every tower. taper > 0: a four-sided sail that narrows to the top */
function tower(w, h, d, x, z, ry = 0, taper = 0) {
  let g = taper ? new THREE.CylinderGeometry(w * taper, w, h, 4, 1, false) : new THREE.BoxGeometry(w, h, d);
  if (taper) { g.rotateY(Math.PI / 4); g.scale(1, 1, d / w); }
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + d) / 22, uv.getY(i) * h / 44);
  g.rotateY(ry); g.translate(x, SEA_Y + h / 2, z); return g;
}
const flat = (g) => { const o = g.index ? g.toNonIndexed() : g; if (!o.attributes.uv) o.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(o.attributes.position.count * 2), 2)); if (!o.attributes.normal) o.computeVertexNormals(); return o; };

export function buildSkyline({ tier }) {
  const group = new THREE.Group(); group.name = 'f2-skyline'; const low = tier.id === 'low';
  const winTex = windowTexture(), winMat = new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false, color: 0x8794b4 });
  const polar = (deg, R) => { const a = (deg * Math.PI) / 180; return [Math.sin(a) * R, -Math.cos(a) * R]; };
  const parts = [], r = rng(99), turbines = [];
  { const [x, z] = polar(-8, 400); parts.push(tower(34, 230, 14, x - 40, z, 0.18, 0.18), tower(34, 230, 14, x + 40, z, 0.18, 0.18)); turbines.push([x, SEA_Y + 150, z + 10], [x, SEA_Y + 105, z + 10], [x, SEA_Y + 60, z + 10]); }   // Bahrain WTC inspired
  { const [x, z] = polar(24, 360); for (const dx of [-24, 24]) { parts.push(tower(22, 262, 22, x + dx, z)); const g = new THREE.BoxGeometry(22, 18, 22); const p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + (p.getX(i) + 11) * 0.8); g.translate(x + dx, SEA_Y + 262 + 9, z); parts.push(g); } parts.push(tower(78, 38, 30, x, z + 14)); }   // Financial Harbour inspired
  for (let i = 0; i < (low ? 22 : 46); i++) { const deg = -62 + r() * 150, R = 330 + r() * 260, [x, z] = polar(deg, R), h = 28 + Math.pow(r(), 2) * 150, w = 12 + r() * 22; parts.push(tower(w, h, 10 + r() * 20, x, z, r() * 0.4)); }
  const towers = mergeGeometries(parts.map(flat));
  const tm = new THREE.Mesh(towers, winMat); tm.frustumCulled = false; tm.name = 'f2-towers'; group.add(tm);
  const refl = new THREE.Mesh(towers, winMat); refl.scale.y = -1; refl.position.y = 2 * SEA_Y; refl.frustumCulled = false; refl.name = 'f2-towers-reflection'; group.add(refl);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: NIGHT.water, transparent: true, opacity: 0.8, toneMapped: false })); water.position.set(0, SEA_Y, -400); water.name = 'f2-sea'; group.add(water);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.MeshBasicMaterial({ map: domeTexture(), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })); dome.renderOrder = -10; dome.frustumCulled = false; dome.name = 'f2-dome'; group.add(dome);
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0x3a4766, toneMapped: false }), blades = new THREE.Group(); blades.name = 'f2-turbines';
  for (const [x, y, z] of turbines) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 30, 1), bladeMat); b.position.y = 15; const piv = new THREE.Group(); piv.rotation.z = (k * Math.PI * 2) / 3; piv.add(b); g.add(piv); } g.position.set(x, y, z); blades.add(g); } group.add(blades);
  { const pts = new Float32Array(60 * 3); for (let i = 0; i < 60; i++) { pts[i * 3] = 140 + i * 4; pts[i * 3 + 1] = SEA_Y + 2; pts[i * 3 + 2] = -60 + i * 1.2; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pts, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 3.2, color: BLOOM_LIGHT.warm, toneMapped: false, sizeAttenuation: true })); p.frustumCulled = false; group.add(p); }
  return { group, update(dt, t) { blades.children.forEach((g, i) => { g.rotation.z = t * (0.35 + i * 0.05); }); }, dispose() { winTex.dispose(); towers.dispose(); dome.material.map.dispose(); } };
}
