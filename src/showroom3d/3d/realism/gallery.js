/* YAS Wood gallery: four owner-supplied concept images (owner-confirmed, each shows the YAS WOOD sign), shipped as <= 200 KB WebP under public/yas-bloom/realism/gallery.
 * Used as the loader backdrop (CSS) and as framed pictures on the hall back wall (lazy: textures load after the first frame). Alt text is bilingual. */
import * as THREE from 'three';
import { REAL_BASE } from './config';
import { PALETTE } from '../palette';
import { box, mesh } from '../geom';

export const GALLERY = [
  { id: 'walkin-vanity', file: 'yw-walkin-vanity.webp', en: 'YAS Wood walk-in dressing room: walnut glass-fronted wardrobes, green marble vanity and round mirror', ar: 'غرفة ملابس من ياس وود: خزائن جوز بواجهات زجاجية وتسريحة رخام أخضر ومرآة دائرية' },
  { id: 'kitchen-dining', file: 'yw-kitchen-dining.webp', en: 'YAS Wood kitchen with a dark marble island, slatted walnut ceiling and dining table', ar: 'مطبخ من ياس وود بجزيرة رخام داكن وسقف شرائح جوز وطاولة طعام' },
  { id: 'showroom-axis', file: 'yw-showroom-axis.webp', en: 'YAS Wood showroom axis with a lit floor line, walnut columns and living displays', ar: 'محور معرض ياس وود بخط إضاءة أرضي وأعمدة جوز وعروض معيشة' },
  { id: 'columns-aisle', file: 'yw-columns-aisle.webp', en: 'YAS Wood showroom aisle with walnut-clad columns, kitchens and a bouclé living area', ar: 'ممر معرض ياس وود بأعمدة مكسوة بالجوز ومطابخ ومنطقة جلوس' },
];
export const galleryUrl = (g) => REAL_BASE + 'gallery/' + g.file;

/** four framed pictures (brass frame, dark mat, a soft warm picture light) on the hall back wall, either side of the logo panel; textures load lazily and fade in */
export function buildGalleryFrames({ depth, lang = 'en' }) {
  const group = new THREE.Group(); group.name = 'yas-wood-gallery'; const mats = [];
  const slots = [-17.6, -10.2, 10.2, 17.6], W = 5.6, H = W * 9 / 16, y = 2.55, z = -depth + 0.14;
  const frameM = new THREE.MeshStandardMaterial({ color: PALETTE.brass, metalness: 1, roughness: 0.32 }), matM = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.9 });
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.ledWarm).multiplyScalar(3), toneMapped: false });
  GALLERY.forEach((g, i) => {
    const x = slots[i], grp = new THREE.Group(); grp.position.set(x, y, z); grp.userData.label = lang === 'ar' ? g.ar : g.en; grp.name = 'frame-' + g.id; group.add(grp);
    grp.add(mesh(box(W + 0.34, H + 0.34, 0.06), frameM, {})); grp.add(mesh(box(W + 0.16, H + 0.16, 0.07), matM, {}));
    const m = new THREE.MeshBasicMaterial({ color: PALETTE.ink, toneMapped: true }); mats.push(m);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, H), m); pic.position.z = 0.04; grp.add(pic);
    grp.add(mesh(box(1.4, 0.04, 0.12), light, { y: H / 2 + 0.34, z: 0.1 }));
  });
  const loader = new THREE.TextureLoader(), tex = [];
  const load = () => GALLERY.forEach((g, i) => loader.load(galleryUrl(g), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; tex.push(t); mats[i].map = t; mats[i].color.setHex(PALETTE.photoTint); mats[i].needsUpdate = true; }, undefined, () => { group.children[i].visible = false; }));
  return { group, load, setLanguage(l) { group.children.forEach((c, i) => { c.userData.label = l === 'ar' ? GALLERY[i].ar : GALLERY[i].en; }); }, dispose() { tex.forEach((t) => t.dispose()); mats.forEach((m) => m.dispose()); } };
}
