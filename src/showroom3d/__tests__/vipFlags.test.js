/* The two national flags: exact geometry (Bahrain 3:5 with five serrations, Saudi Arabia 2:3 with the official vector inscription), the drawing, and the 3D flagpoles (equal sizes, un-mirrored both faces, no lateral cloth motion, tiers, reduced motion, disposal, collision). */
import * as THREE from 'three';
import { FLAGS, FLAG_IDS, flagAspect, bahrainEdge, drawFlag, drawFlagFit } from '../vip/flags';
import { buildFlags, clothOffset, flagPlacements, CLOTH, TEX_WIDTH } from '../scenes/vip/flags3d';
import { VIP, VIP_FLAGS, vipBoxes } from '../scenes/vip/layout';
import { buildColliders, isFree, PLAYER } from '../navigation/colliders';
import { buildGraph } from '../navigation/navgraph';

const rec = () => { const ops = []; const g = { save: () => ops.push(['save']), restore: () => ops.push(['restore']), translate: (...a) => ops.push(['translate', ...a]), scale: (...a) => ops.push(['scale', ...a]), fillRect: (...a) => ops.push(['fillRect', g.fillStyle, ...a]), beginPath: () => ops.push(['beginPath']), moveTo: (...a) => ops.push(['moveTo', ...a]), lineTo: (...a) => ops.push(['lineTo', ...a]), closePath: () => ops.push(['closePath']), fill: (...a) => ops.push(['fill', g.fillStyle, ...a]) }; return { g, ops }; };

describe('flag data: official geometry', () => {
  test('Bahrain: 3:5 (1500 x 900), white hoist band, red field, FIVE serrations (white points into the red)', () => {
    expect(FLAGS.bh.w / FLAGS.bh.h).toBeCloseTo(5 / 3, 10); expect(FLAGS.bh.ratio).toEqual([5, 3]); expect(FLAGS.bh.teeth).toBe(5); expect(FLAGS.bh.red).toBe('#CE1126'); expect(FLAGS.bh.white).toBe('#FFFFFF');
    const e = bahrainEdge(); expect(e).toHaveLength(1 + 2 * 5); expect(e[0]).toEqual([375, 0]); expect(e[e.length - 1]).toEqual([375, 900]);
    const tips = e.filter(([x]) => x === 600); expect(tips).toHaveLength(5); expect(tips.map(([, y]) => y)).toEqual([90, 270, 450, 630, 810]);   // evenly spaced, symmetric about the middle
    expect(e.filter(([x]) => x === 375)).toHaveLength(6);
  });
  test('Saudi Arabia: 2:3 (750 x 500), green field, the white inscription + sword outline present, never typed text', () => {
    expect(FLAGS.sa.w / FLAGS.sa.h).toBeCloseTo(3 / 2, 10); expect(FLAGS.sa.ratio).toEqual([3, 2]); expect(FLAGS.sa.green).toBe('#006C35'); expect(typeof FLAGS.sa.path).toBe('string'); expect(FLAGS.sa.path.length).toBeGreaterThan(20000);
    expect(FLAGS.sa.path).toMatch(/^m/); expect(FLAGS.sa.path).not.toMatch(/[^0-9a-zA-Z.,\s-]/);   // a pure SVG path
    // bounding box of the outline (absolute coordinates) must sit inside the flag and centred horizontally: inscription above, sword below, both about the vertical axis
    const nums = []; let x = 0, y = 0; const cmds = FLAGS.sa.path.match(/[a-zA-Z][^a-zA-Z]*/g); const xs = [], ys = [];
    for (const c of cmds) { const t = c[0], a = (c.slice(1).match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number); nums.push(a.length);
      const rel = t === t.toLowerCase(); let i = 0;
      const take = (n) => { const r = a.slice(i, i + n); i += n; return r; };
      switch (t.toLowerCase()) {
        case 'm': case 'l': { let first = true; while (i < a.length) { const [dx, dy] = take(2); x = rel ? x + dx : dx; y = rel ? y + dy : dy; xs.push(x); ys.push(y); first = false; } break; }
        case 'h': while (i < a.length) { const [dx] = take(1); x = rel ? x + dx : dx; xs.push(x); } break;
        case 'v': while (i < a.length) { const [dy] = take(1); y = rel ? y + dy : dy; ys.push(y); } break;
        case 'c': while (i < a.length) { const [, , , , ex, ey] = take(6); x = rel ? x + ex : ex; y = rel ? y + ey : ey; xs.push(x); ys.push(y); } break;
        case 's': case 'q': while (i < a.length) { const [, , ex, ey] = take(4); x = rel ? x + ex : ex; y = rel ? y + ey : ey; xs.push(x); ys.push(y); } break;
        case 'a': while (i < a.length) { const r = take(7); x = rel ? x + r[5] : r[5]; y = rel ? y + r[6] : r[6]; xs.push(x); ys.push(y); } break;
        default: break;
      }
    }
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    expect(minX).toBeGreaterThan(100); expect(maxX).toBeLessThan(650); expect(minY).toBeGreaterThan(80); expect(maxY).toBeLessThan(420);
    expect(Math.abs((minX + maxX) / 2 - 375)).toBeLessThan(10);   // centred on the flag's vertical axis
  });
  test('display order is alphabetical (Bahrain, Saudi Arabia); names in both languages', () => {
    expect(FLAG_IDS).toEqual(['bh', 'sa']); expect(FLAGS.bh.name).toEqual({ en: 'Kingdom of Bahrain', ar: 'مملكة البحرين' }); expect(FLAGS.sa.name).toEqual({ en: 'Kingdom of Saudi Arabia', ar: 'المملكة العربية السعودية' });
  });
});

describe('drawFlag', () => {
  test('Bahrain draws white, then the red field with the serrated left edge, scaled to the box, upright (positive scale on both axes)', () => {
    const { g, ops } = rec(); drawFlag(g, 'bh', 10, 20, 500, 300);
    expect(ops[1]).toEqual(['translate', 10, 20]); expect(ops[2]).toEqual(['scale', 500 / 1500, 300 / 900]); expect(ops.find((o) => o[0] === 'fillRect')).toEqual(['fillRect', '#FFFFFF', 0, 0, 1500, 900]);
    const lines = ops.filter((o) => o[0] === 'lineTo'); expect(lines).toHaveLength(12);   // 11 edge points + the corner expect(ops.find((o) => o[0] === 'fill')[1]).toBe('#CE1126');
  });
  test('Saudi Arabia draws the green field and fills the outline with the even-odd rule in white; without Path2D only the field (never a wrong emblem)', () => {
    const seen = []; function P(d) { seen.push(d); } const a = rec(); drawFlag(a.g, 'sa', 0, 0, 750, 500, P);
    expect(a.ops.find((o) => o[0] === 'fillRect')).toEqual(['fillRect', '#006C35', 0, 0, 750, 500]); expect(seen).toEqual([FLAGS.sa.path]); expect(a.ops.find((o) => o[0] === 'fill')).toEqual(['fill', '#FFFFFF', expect.any(P), 'evenodd']);
    const b = rec(); drawFlag(b.g, 'sa', 0, 0, 750, 500, null); expect(b.ops.some((o) => o[0] === 'fill')).toBe(false);
    expect(drawFlag(rec().g, 'xx', 0, 0, 1, 1)).toBe(false);
  });
  test('drawFlagFit keeps the official aspect and centres', () => {
    for (const id of FLAG_IDS) { const { g } = rec(); const r = drawFlagFit(g, id, 100, 100, 300, 300); expect(r.w / r.h).toBeCloseTo(flagAspect(id), 10); expect(r.x + r.w / 2).toBeCloseTo(100); expect(r.y + r.h / 2).toBeCloseTo(100); expect(Math.max(r.w, r.h)).toBeLessThanOrEqual(300.0001); }
  });
});

const fakeCanvas = () => ({ getContext: () => rec().g, width: 0, height: 0 });
const brass = new THREE.MeshStandardMaterial();
describe('3D flagpoles', () => {
  test('placement: equal pole height and cloth height, official proportions, mirror-symmetric about the screen, Bahrain left / Saudi right, in front of the back wall, inside the room', () => {
    const p = flagPlacements(); expect(p.map((x) => x.id)).toEqual(['bh', 'sa']); expect(p[0].x).toBe(-p[1].x); expect(p[0].z).toBe(p[1].z); expect(p[0].h).toBe(p[1].h);
    expect(p[0].w / p[0].h).toBeCloseTo(5 / 3, 10); expect(p[1].w / p[1].h).toBeCloseTo(3 / 2, 10);
    for (const f of p) { expect(f.z).toBeGreaterThan(VIP.z0); expect(f.z).toBeLessThan(VIP.z0 + 1); expect(Math.abs(f.x) + f.w / 2).toBeLessThan(VIP.x1 - 0.5); expect(Math.abs(f.x) - f.w / 2).toBeGreaterThan(VIP.screen.w / 2 + 0.55); }   // clear of the screen's stone border
    expect(VIP_FLAGS.barY - VIP_FLAGS.clothH).toBeGreaterThan(1.5); expect(VIP_FLAGS.poleH).toBeLessThan(VIP.height);   // upright, at eye level, under the ceiling: never on the floor
  });
  test('the rig: 4 cloth meshes (two faces each) + one merged brass mesh; poles of equal height; textures at the tier width and the official aspect', () => {
    for (const tid of ['high', 'medium', 'low']) {
      const f = buildFlags({ tier: { id: tid }, brass, makeCanvas: (w, h) => { const c = fakeCanvas(); c.width = w; c.height = h; return c; } });
      const meshes = f.group.children.filter((m) => m.isMesh); expect(meshes).toHaveLength(5); expect(f.cloths).toHaveLength(2);
      for (const c of f.cloths) { const w = c.tex[0].image.width, h = c.tex[0].image.height; expect(w).toBe(TEX_WIDTH[tid]); expect(w / h).toBeCloseTo(flagAspect(c.id), 2); }
      const bb = new THREE.Box3().setFromObject(f.poles); expect(bb.max.y).toBeLessThan(VIP.height); f.dispose();
    }
  });
  test('both faces read the right way round: the back face uses the same drawing flipped in u (a mirror of the mirror), front uses it as is', () => {
    const f = buildFlags({ tier: { id: 'medium' }, brass, makeCanvas: fakeCanvas });
    for (const c of f.cloths) { const [front, back] = c.tex, [mf, mb] = c.mats; expect(mf.side).toBe(THREE.FrontSide); expect(mb.side).toBe(THREE.BackSide); expect(front.repeat.x).toBe(1); expect(back.repeat.x).toBe(-1); expect(back.offset.x).toBe(1); expect(front.image).toBe(back.image); }
    f.dispose();
  });
  test('cloth motion is along depth only, zero at the bar, bounded, and never lateral: the emblem is not stretched or hidden', () => {
    for (const t of [0, 1.3, 7.7]) for (const u of [0, 0.5, 1]) expect(Math.abs(clothOffset(u, 0, t, 0.03))).toBe(0);
    let max = 0; for (let u = 0; u <= 1; u += 0.05) for (let v = 0; v <= 1; v += 0.05) for (let t = 0; t < 20; t += 0.7) max = Math.max(max, Math.abs(clothOffset(u, v, t, 0.03))); expect(max).toBeLessThan(0.03 * 1.7); expect(max).toBeGreaterThan(0.01);
    const f = buildFlags({ tier: { id: 'high' }, brass, makeCanvas: fakeCanvas }); const c = f.cloths[1], base = c.geo.userData.base; f.freeze(3.3); const pa = c.geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { expect(pa.getX(i)).toBe(base[i * 3]); expect(pa.getY(i)).toBe(base[i * 3 + 1]); expect(Math.abs(pa.getZ(i))).toBeLessThan(0.06); }
    const topRow = []; for (let i = 0; i < pa.count; i++) if (Math.abs(pa.getY(i) - c.h / 2) < 1e-9) topRow.push(pa.getZ(i)); expect(topRow.every((z) => Math.abs(z) === 0)).toBe(true);
    f.dispose();
  });
  test('motion policy: low tier and reduced motion stay still; others animate only while somebody is in the room; the cloth is redrawn at most hz times a second', () => {
    expect(CLOTH.low.hz).toBe(0); expect(CLOTH.high.hz).toBeGreaterThan(CLOTH.medium.hz);
    const low = buildFlags({ tier: { id: 'low' }, brass, makeCanvas: fakeCanvas }); expect(low.update(1, true)).toBe(false);
    const red = buildFlags({ tier: { id: 'high' }, brass, reduced: true, makeCanvas: fakeCanvas }); expect(red.update(1, true)).toBe(false);
    const f = buildFlags({ tier: { id: 'high' }, brass, makeCanvas: fakeCanvas }); expect(f.update(1, false)).toBe(false); expect(f.update(1, true)).toBe(true); expect(f.update(0.001, true)).toBe(false); f.setReduced(true); expect(f.update(1, true)).toBe(false);
    [low, red, f].forEach((x) => x.dispose());
  });
  test('everything it creates is disposed', () => {
    const f = buildFlags({ tier: { id: 'medium' }, brass, makeCanvas: fakeCanvas }); const spies = []; f.group.traverse((o) => { if (o.geometry) spies.push(jest.spyOn(o.geometry, 'dispose')); if (o.material && o.material !== brass) { spies.push(jest.spyOn(o.material, 'dispose')); if (o.material.map) spies.push(jest.spyOn(o.material.map, 'dispose')); } });
    f.dispose(); expect(spies.length).toBeGreaterThan(8); expect(spies.every((s) => s.mock.calls.length >= 1)).toBe(true);
  });
  test('the poles are solid (small colliders), sit clear of the navigation graph, and do not trap a standing point in front of them', () => {
    const boxes = vipBoxes().filter((b) => /^vip-flag-/.test(b.id)); expect(boxes.map((b) => b.id).sort()).toEqual(['vip-flag-bh', 'vip-flag-sa']);
    for (const b of boxes) { expect(b.maxX - b.minX).toBeLessThan(0.4); expect(b.minZ).toBeGreaterThan(VIP.z0); }
    const open = buildColliders({ doorOpen: 1 }), R = PLAYER.radius; for (const p of Object.values(buildGraph().nodes)) expect(isFree(p[0], p[1], R, open)).toBe(true);
    const [bx0, bx1] = [boxes[0].minX, boxes[0].maxX]; expect(isFree((bx0 + bx1) / 2, boxes[0].maxZ + R + 0.05, R, open)).toBe(true);
  });
});
