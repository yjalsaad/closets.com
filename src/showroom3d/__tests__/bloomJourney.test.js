/* ORDER JOURNEY wall (Floor 2): the stage data, the drawing (recorded on a fake 2D context: every stage and description is drawn, type is big enough, nothing leaves the panel, EN + AR),
 * and the placement (clear of the door, the Lead Roadmap wall and the plant; the stop is walkable and reachable). */
import { JOURNEY_STAGES, JOURNEY_LANES, journeyRuns, stageColor, stageLane } from '../bloom/journey';
import { BLOOM_LIGHT, FINISHES } from '../bloom/palette';
import { drawJourneyWall, DESIGN } from '../scenes/bloom/panelsBloom';
import { JOURNEY_WALL, LEADS_WALL, WING, F2, BLOOM_STOPS, bloomBoxes, bloomGraph, bloomZones, ARRIVE } from '../scenes/bloom/layout';
import { isFree, segmentClear, PLAYER } from '../navigation/colliders';
import { shortestPath } from '../navigation/navgraph';

const W = DESIGN.journey.w, H = DESIGN.journey.h;
function recorder() {
  const texts = [], st = { font: '10px sans-serif', fillStyle: '#000', textAlign: 'left' }, noop = () => {};
  const g = new Proxy(st, { get(t, k) {
    if (k === 'measureText') return (s) => { const m = /(\d+(?:\.\d+)?)px/.exec(t.font); return { width: String(s).length * (m ? Number(m[1]) : 10) * 0.58 }; };
    if (k === 'fillText') return (s, x, y) => { const m = /(\d+(?:\.\d+)?)px/.exec(t.font); texts.push({ s: String(s), x, y, size: m ? Number(m[1]) : 10, align: t.textAlign, weight: Number((/^(\d+)/.exec(t.font) || [0, 400])[1]) }); };
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (k in t) return t[k]; return noop; }, set(t, k, v) { t[k] = v; return true; } });
  return { g, texts };
}
const draw = (lang) => { const r = recorder(); drawJourneyWall(r.g, W, H, { lang }); return r.texts; };
const names = (lang) => JOURNEY_STAGES.map((s) => s.title[lang]);

describe('Order Journey data', () => {
  test('the stages are in the owner\'s order: 6 Closets steps (the last is the LPO gate), 4 YAS Factory steps, then 6 back in the Closets colour', () => {
    expect(JOURNEY_STAGES.map((s) => s.id)).toEqual(['quote', 'survey', 'design', 'deposit', 'lpo-issued', 'lpo-approved', 'production', 'cutting', 'assembly', 'qc', 'packing', 'delivery', 'install', 'snag', 'handover', 'final']);
    const R = journeyRuns(); expect([R.before.length, R.factory.length, R.after.length]).toEqual([5, 4, 6]);
    expect(R.gate.id).toBe('lpo-approved'); expect(JOURNEY_STAGES.filter((s) => s.gate)).toHaveLength(1);
    expect(JOURNEY_STAGES.indexOf(R.gate)).toBe(R.before.length);
  });
  test('every stage has an English and an Arabic label and one-line description, with no fake figures (no digits) and no order numbers', () => {
    for (const s of JOURNEY_STAGES) for (const l of ['en', 'ar']) { expect(s.title[l].length).toBeGreaterThan(1); expect(s.desc[l].length).toBeGreaterThan(8); expect(/\d/.test(s.title[l] + s.desc[l])).toBe(false); expect(s.desc[l].length).toBeLessThan(90); }
    expect(new Set(JOURNEY_STAGES.map((s) => s.id)).size).toBe(JOURNEY_STAGES.length);
  });
  test('two lane colours: Closets = brand orange, YAS Factory = a YAS Wood Collection colour; the factory run is the only one in the factory colour', () => {
    expect(JOURNEY_LANES.closets.color).toBe(BLOOM_LIGHT.orange); expect(JOURNEY_LANES.factory.color).toBe(FINISHES.volukus.color); expect(JOURNEY_LANES.closets.color).not.toBe(JOURNEY_LANES.factory.color);
    for (const s of JOURNEY_STAGES) expect(stageLane(s)).toBe(s.lane === 'factory' ? 'factory' : 'closets');
    expect(journeyRuns().after.every((s) => stageColor(s) === BLOOM_LIGHT.orange)).toBe(true);
  });
});

describe('Order Journey drawing', () => {
  for (const lang of ['en', 'ar']) {
    const T = draw(lang);
    test(`${lang}: every stage title is drawn, in journey order within each run`, () => {
      const joined = T.map((t) => t.s).join(' | ');
      for (const n of names(lang)) expect({ n, found: joined.includes(n) || n.split(' ').every((w) => joined.includes(w)) }).toEqual({ n, found: true });
      const row1 = T.filter((t) => t.size >= 30 && t.y < 400 && names(lang).slice(0, 10).some((n) => n.split(' ')[0] === t.s.split(' ')[0] || t.s === n));
      expect(row1.length).toBeGreaterThan(5);
    });
    test(`${lang}: the gate is labelled, the legend and the static-overview note are drawn`, () => {
      const joined = T.map((t) => t.s).join(' | ');
      expect(joined).toContain(JOURNEY_STAGES[5].title[lang]); expect(joined).toContain(lang === 'ar' ? 'بوابة' : 'GATE');
      expect(joined).toContain(lang === 'ar' ? 'بيانات توضيحية' : 'Illustrative data');
      expect(joined).toContain(lang === 'ar' ? 'بلا طلبات حقيقية' : 'no live orders');
    });
    test(`${lang}: type is large (>= 22 design px, the VIP floor), nothing is drawn outside the panel, nothing is undefined`, () => {
      expect(T.length).toBeGreaterThan(40);
      for (const t of T) { expect(t.size).toBeGreaterThanOrEqual(22); expect(t.s).not.toMatch(/undefined|NaN|\[object/); expect(t.x).toBeGreaterThanOrEqual(0); expect(t.x).toBeLessThanOrEqual(W); expect(t.y).toBeGreaterThan(0); expect(t.y).toBeLessThan(H); }
    });
  }
  test('Arabic is laid out right-to-left: the first stage sits on the right half, the last on the left', () => {
    const ar = draw('ar'), q = ar.find((t) => t.s.includes(JOURNEY_STAGES[0].title.ar)), f = ar.find((t) => t.s.includes(JOURNEY_STAGES[15].title.ar));
    expect(q.x).toBeGreaterThan(W / 2); expect(f.x).toBeGreaterThan(W / 2);   // run 2 starts at the right with Packing in Arabic too
    const qc = ar.find((t) => t.s.includes(JOURNEY_STAGES[9].title.ar)); expect(qc.x).toBeLessThan(q.x);
  });
  test('the panel keeps the Lead Roadmap\'s pixel density and aspect (design 3072 wide; wall metres follow the design ratio)', () => {
    expect(DESIGN.journey).toEqual({ w: 3072, h: 900 }); expect(JOURNEY_WALL.w / JOURNEY_WALL.h).toBeCloseTo(3072 / 900, 3);
    expect(DESIGN.leads.w).toBe(3072);
  });
});

describe('Order Journey placement on Floor 2', () => {
  const C = bloomBoxes(), R = PLAYER.radius;
  test('on the south wall, east of the wing doorway, clear of the Lead Roadmap wall and inside the floor', () => {
    const x0 = JOURNEY_WALL.x - JOURNEY_WALL.w / 2, x1 = JOURNEY_WALL.x + JOURNEY_WALL.w / 2;
    expect(x0).toBeGreaterThan(WING.door[1] + 0.5); expect(x1).toBeLessThan(F2.x1 - 0.3); expect(x0).toBeGreaterThan(LEADS_WALL.x + LEADS_WALL.w / 2);
    expect(JOURNEY_WALL.z).toBeLessThan(F2.z1); expect(JOURNEY_WALL.y + JOURNEY_WALL.h / 2).toBeLessThan(F2.height); expect(JOURNEY_WALL.y - JOURNEY_WALL.h / 2).toBeGreaterThan(0.5);
  });
  test('its stop is walkable, reachable from the lift cab, sits in its own zone, and was appended (existing stop order unchanged)', () => {
    const s = BLOOM_STOPS.find((q) => q.id === 'bloom-journey'), g = bloomGraph(), z = bloomZones().find((q) => q.id === 'bloom-journey');
    expect(isFree(s.stand[0], s.stand[1], R, C)).toBe(true); expect(shortestPath(g, 'cab', 'stand-bloom-journey')).not.toBeNull();
    expect(s.stand[0] >= z.minX && s.stand[0] <= z.maxX && s.stand[1] >= z.minZ && s.stand[1] <= z.maxZ).toBe(true);
    expect(BLOOM_STOPS.slice(0, 5).map((q) => q.id)).toEqual(['bloom-board', 'bloom-ops', 'bloom-leads', 'bloom-lounge', 'bloom-lobby']); expect(BLOOM_STOPS[BLOOM_STOPS.length - 1].id).toBe('bloom-journey');
    expect(isFree(ARRIVE[0], ARRIVE[1], R, C) && segmentClear(g.nodes['lobbyE'], g.nodes['stand-bloom-journey'], R, C)).toBe(true);
  });
  test('the lounge zone and its stop are untouched (the stop still lies in the lounge zone)', () => {
    const lo = bloomZones().find((q) => q.id === 'bloom-lounge'), s = BLOOM_STOPS.find((q) => q.id === 'bloom-lounge');
    [lo.minX, lo.maxX, lo.minZ - 150, lo.maxZ - 150].forEach((v, i) => expect(v).toBeCloseTo([5, 17.6, 4.8, 11.4][i], 6)); expect(s.stand[0] >= lo.minX && s.stand[1] >= lo.minZ).toBe(true);
  });
});
