import * as THREE from 'three';
import { kelvin, LOOK } from '../3d/realism/look';
import { VARIANTS, realSet, realReady } from '../3d/realism/registry';
import { GALLERY, galleryUrl } from '../3d/realism/gallery';
import { mapBones, wrapRigged, BONE_NAMES } from '../characters/glbCharacter';
import { GLB_CHARACTERS } from '../characters/glbConfig';
import { createAnim, updateAnim, pose } from '../characters/anim';
import fs from 'fs'; import path from 'path';

const PUB = path.resolve(__dirname, '../../../public/yas-bloom/realism');

describe('realism: colour temperature + look', () => {
  test('kelvin(): warm key is orange-ish, cool fill is bluer', () => {
    const w = kelvin(LOOK.keyK), c = kelvin(LOOK.fillK);
    expect((w >> 16) & 255).toBeGreaterThan(w & 255); expect(c & 255).toBeGreaterThanOrEqual((w & 255));
    expect((kelvin(2700) >> 16) & 255).toBe(255);
  });
});
describe('realism: assets', () => {
  test('every texture variant points at a shipped source set and the registry degrades to null without images', () => {
    expect(realReady()).toBe(false); expect(realSet('oak', 512)).toBeNull();
    const sources = new Set(Object.values(VARIANTS).map((v) => v.from));
    sources.forEach((s) => ['a', 'n', 'orm'].forEach((k) => expect(fs.existsSync(path.join(PUB, 'tex', `${s}_${k}.webp`))).toBe(true)));
  });
  test('shipped size budget: textures + HDRI + gallery <= 3.5 MB (the whole realism folder, excluding the optional GLB drop-in folder)', () => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
    expect(walk(PUB)).toBeLessThan(3.5 * 1024 * 1024);
  });
  test('YAS Wood gallery: four owner-confirmed images, each <= 200 KB, with EN + AR alt text', () => {
    expect(GALLERY).toHaveLength(4);
    GALLERY.forEach((g) => { const f = path.join(PUB, 'gallery', g.file); expect(fs.statSync(f).size).toBeLessThanOrEqual(200 * 1024); expect(g.en.length).toBeGreaterThan(20); expect(/[؀-ۿ]/.test(g.ar)).toBe(true); expect(galleryUrl(g)).toMatch(/^.*\/yas-bloom\/realism\/gallery\//); });
  });
});
describe('realism: GLB character adapter (bone-name retarget)', () => {
  const skeleton = (names) => { const root = new THREE.Group(); const mk = (n, y, parent) => { const b = new THREE.Bone(); b.name = n; b.position.y = y; parent.add(b); return b; }; let p = root; names.forEach((n, i) => { p = i === 0 ? mk(n, 1, root) : mk(n, 0.1, root.children[0]); }); return root; };
  const mixamo = ['mixamorig:Hips', 'mixamorig:Spine', 'mixamorig:Spine2', 'mixamorig:Neck', 'mixamorig:Head', 'mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftForeArm', 'mixamorig:RightForeArm', 'mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg', 'mixamorig:LeftLeg', 'mixamorig:RightLeg'];
  test('maps Mixamo-style names and reports missing bones', () => {
    const r = mapBones(skeleton(mixamo)); expect(r.missing).toEqual([]); expect(Object.keys(r.map).sort()).toEqual(Object.keys(BONE_NAMES).sort());
    expect(mapBones(skeleton(['Hips', 'Head'])).missing).toContain('shoulderL');
  });
  test('wrapRigged returns the same interface and applies a pose; null without the required bones', () => {
    const scene = skeleton(mixamo); const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.3)); m.position.y = 0.9; scene.add(m);
    const c = wrapRigged(scene, { height: 1.68 }); expect(c).not.toBeNull(); ['group', 'setPose', 'setFar', 'drawCalls', 'dispose', 'label', 'meshes', 'bounds'].forEach((k) => expect(c[k]).toBeDefined());
    const a = createAnim({ seed: 2 }); updateAnim(a, 0.5, { speed: 1 }); expect(() => c.setPose(pose(a), 0.016)).not.toThrow();
    expect(wrapRigged(skeleton(['Hips']))).toBeNull();
  });
  test('no GLB is configured by default (procedural characters stay)', () => { expect(Object.keys(GLB_CHARACTERS)).toHaveLength(0); });
  test('pose() now carries eye saccade values inside a small range', () => {
    const a = createAnim({ seed: 1 }); for (let i = 0; i < 200; i++) { updateAnim(a, 0.05, {}); const p = pose(a); expect(Math.abs(p.eyeX)).toBeLessThanOrEqual(1.01); expect(Math.abs(p.eyeY)).toBeLessThanOrEqual(0.31); }
  });
});
