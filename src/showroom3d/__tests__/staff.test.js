/* The advisers' offline guide: intents (EN + AR), guardrails over EVERY canned answer, discovery flow, hand-off URLs, rate limit, no network. */
import { reply, newMemory, services, buildHandoff, violation, guardAiReply, createRateLimiter, allCannedTexts, detectRoom, ROOMS, STYLES, BUDGETS, pickFinish, norm } from '../staff/guide';
import { parseBookingPrefill } from '../products/quote';
import { finishIds } from '../products/finishes';
import { DEPARTMENTS } from '../scenes/main-hall/departments';

const ctx = (o = {}) => ({ lang: 'en', staff: { id: 'reception', room: 'reception', name: { en: 'Reception advisor', ar: 'مستشارة الاستقبال' } }, ...o });

describe('guide intents', () => {
  test('services lists every department and the extra service pages, EN and AR, from site data', () => {
    for (const lang of ['en', 'ar']) {
      const s = services(lang), ids = s.map((x) => x.id);
      for (const d of DEPARTMENTS) expect(ids).toContain(d.id);
      expect(ids).toEqual(expect.arrayContaining(['office', 'services', 'maintenance', 'warranty', 'booking']));
      const r = reply('what do you offer?', ctx({ lang }));
      expect(r.intent).toBe('services'); for (const x of s) expect(r.text).toContain(x.label);
    }
  });
  test('take me to <room> returns a glide action + auto action for every room, EN and AR', () => {
    for (const r of ROOMS) { const m = reply('take me to ' + (r.kw[0]), ctx()); expect(['goto']).toContain(m.intent); expect(m.auto && m.auto.type).toBe('glide'); }
    const k = reply('take me to the kitchens', ctx()); expect(k.auto).toEqual({ type: 'glide', id: 'kitchens' });
    const a = reply('خذني إلى المطابخ', ctx({ lang: 'ar' })); expect(a.auto).toEqual({ type: 'glide', id: 'kitchens' });
    expect(reply('where is the VIP room', ctx()).auto.id).toBe('vip');
    expect(reply('#go:walkin', ctx()).auto.id).toBe('walkin');
  });
  test('walk-in wins over wardrobe, bedroom over bed words', () => { expect(detectRoom('walk-in closet')).toBe('walkin'); expect(detectRoom('غرفة ملابس')).toBe('walkin'); expect(detectRoom('my bedroom')).toBe('bedroom'); expect(detectRoom('fitted wardrobe')).toBe('wardrobes'); });
  test('price / discount / delivery / stock questions never get a figure or a promise', () => {
    for (const q of ['how much is a kitchen', 'any discount?', 'when will it be delivered', 'is it in stock', 'what is the lead time', 'كم سعر المطبخ', 'هل يوجد خصم', 'متى التوصيل']) {
      const m = reply(q, ctx({ lang: /[؀-ۿ]/.test(q) ? 'ar' : 'en' })); expect(['price', 'timing']).toContain(m.intent); expect(violation(m.text)).toBeNull();
    }
  });
  test('warranty states only the existing fact, contact only existing facts', () => {
    const w = reply('what is the warranty', ctx()); expect(w.text).toMatch(/10 years/); expect(violation(w.text)).toBeNull();
    const c = reply('phone number', ctx()); expect(c.intent).toBe('contact'); expect(c.actions.some((a) => /^tel:/.test(a.href))).toBe(true); expect(violation(c.text)).toBeNull();
  });
  test('off-topic is declined politely and unknown offers the opt-in AI', () => {
    expect(reply('what is the weather', ctx()).intent).toBe('offtopic');
    expect(reply('الطقس اليوم', ctx({ lang: 'ar' })).intent).toBe('offtopic');
    const u = reply('zzqx plmk', ctx()); expect(u.intent).toBe('unknown'); expect(u.askAi).toBe(true);
    expect(reply('what is the weather', ctx()).askAi).toBe(false);
  });
  test('VIP staff: stations + briefing link, no figures, no promises', () => {
    const v = reply('tell me about investing', ctx({ staff: { id: 'vip', room: 'vip', name: { en: 'VIP advisor', ar: 'مستشارة VIP' } } }));
    expect(v.intent).toBe('vip'); expect(v.text).toMatch(/five stations/); expect(v.actions[0].href).toContain('interest=investor-briefing'); expect(violation(v.text)).toBeNull();
    expect(parseBookingPrefill('?' + v.actions[0].href.split('?')[1]).interest).toBe('Other');
  });
});

describe('discovery flow and hand-off', () => {
  test('room -> look -> budget band -> a recommended REAL finish and a booking link', () => {
    let m = reply('I want a new kitchen', ctx()); expect(m.intent).toBe('plan'); expect(m.memory.room).toBe('kitchens'); expect(m.memory.step).toBe('style');
    m = reply('something warm with wood', ctx({ memory: m.memory })); expect(m.memory.style).toBe('warm'); expect(m.memory.step).toBe('budget'); expect(m.text).toMatch(/cannot quote prices/);
    m = reply('#budget:mid', ctx({ memory: m.memory })); expect(m.memory.step).toBe('done');
    expect(finishIds('kitchen')).toContain(m.memory.finish);
    const link = m.actions.find((a) => a.type === 'link').href, q = new URL(link, 'https://x.test').searchParams;
    expect(link.startsWith('/booking?')).toBe(true); expect(q.get('interest')).toBe('Kitchen'); expect(q.get('source')).toBe('showroom-3d-staff'); expect(q.get('finish')).toBe(m.memory.finish);
    expect(q.get('notes')).toMatch(/not a quotation/); expect(q.get('notes').length).toBeLessThanOrEqual(600);
    expect(parseBookingPrefill('?' + link.split('?')[1]).interest).toBe('Kitchen');
  });
  test('the planning flow asks for the room first when the adviser has none, and understands chips', () => {
    let m = reply('#plan', ctx()); expect(m.memory.step).toBe('room'); m = reply('#room:bedroom', ctx({ memory: m.memory })); expect(m.memory.room).toBe('bedroom'); expect(m.memory.step).toBe('style');
    m = reply('#style:soft', ctx({ memory: m.memory })); m = reply('#budget:skip', ctx({ memory: m.memory })); expect(finishIds('bedroom')).toContain(m.memory.finish);
    expect(new URL(m.actions[0].href, 'https://x.test').searchParams.get('notes')).not.toMatch(/Budget/);
  });
  test('hand-off URLs: Arabic goes under /ar, user text never reaches the notes, every interest is an existing booking option', () => {
    const memory = { ...newMemory(), room: 'wardrobes', style: 'dark', budget: 'premium', finish: 'fluted-walnut' };
    const en = buildHandoff({ lang: 'en', memory }), ar = buildHandoff({ lang: 'ar', memory });
    expect(en.startsWith('/booking?')).toBe(true); expect(ar.startsWith('/booking?')).toBe(true);
    const bad = reply('<script>alert(1)</script> I want a kitchen', ctx()); expect(JSON.stringify(bad)).not.toMatch(/<script/);
    for (const r of ROOMS.filter((x) => x.product)) { const u = buildHandoff({ lang: 'en', memory: { ...newMemory(), room: r.id } }); expect(['Kitchen', 'Wardrobe', 'Doors', 'Other', 'Walk-In Closet', 'TV Unit']).toContain(new URL(u, 'https://x.test').searchParams.get('interest')); }
    expect(pickFinish('kitchen', 'dark').id).toMatch(/charcoal|walnut/);
  });
});

describe('guardrails', () => {
  test('EVERY canned answer, chip label and planning-flow ending is free of digits, currency and promise phrases (apart from the existing contact facts)', () => {
    const all = allCannedTexts(); expect(all.length).toBeGreaterThan(500);
    const bad = all.filter((t) => violation(t)); expect(bad).toEqual([]);
  });
  test('violation() catches what it must', () => {
    for (const t of ['It costs 500 BHD', 'only 20% off', '$99', 'we guarantee it', 'free delivery', 'in stock now', 'ROI of high', 'سعره ٥٠ دينار', 'delivered within a week']) expect(violation(t)).not.toBeNull();
    expect(violation('Call +973 17555095 for the team.')).toBeNull();
  });
  test('AI replies are stripped of markup and dropped when they break the guardrails or are too long', () => {
    expect(guardAiReply('We make **kitchens** <b>and</b> wardrobes.')).toBe('We make kitchens and wardrobes.');
    expect(guardAiReply('A kitchen costs 500 BHD')).toBeNull(); expect(guardAiReply('x'.repeat(800))).toBeNull(); expect(guardAiReply(null)).toBeNull(); expect(guardAiReply('We offer a 20% discount')).toBeNull();
  });
  test('the rate limiter allows 6 per 30 s and recovers', () => {
    let t = 0; const rl = createRateLimiter({ now: () => t }); for (let i = 0; i < 6; i++) expect(rl.take()).toBe(true);
    expect(rl.take()).toBe(false); expect(rl.retryIn()).toBeGreaterThan(0); t = 31000; expect(rl.take()).toBe(true); expect(rl.retryIn()).toBe(0);
  });
  test('the guide is offline: it never touches fetch', () => {
    const f = jest.fn(); const old = global.fetch; global.fetch = f; try { for (const q of ['hello', 'what do you offer', 'price?', '#plan', 'zzqx']) reply(q, ctx()); } finally { global.fetch = old; }
    expect(f).not.toHaveBeenCalled();
  });
  test('Arabic normalisation unifies alef / ya / ta-marbuta and strips diacritics', () => { expect(norm('الأَبْوَابُ')).toBe(norm('الابواب')); expect(norm('غرفة')).toBe(norm('غرفه')); });
  test('looks and budget bands are word labels only', () => { for (const o of [...Object.values(STYLES), ...Object.values(BUDGETS)]) { expect(violation(o.en)).toBeNull(); expect(violation(o.ar)).toBeNull(); } });
});

describe('roster, colliders and the 3D adviser behaviour', () => {
  const { staffRoster, staffColliders, RECEPTION, TALK_RADIUS, nearestStaff } = require('../staff/roster');
  const { buildColliders, PLAYER } = require('../navigation/colliders');
  const { isFree } = require('../navigation/colliders');
  const { buildGraph, deptStops } = require('../navigation/navgraph');
  test('one adviser per room: reception, the eight departments and VIP, each with a distinct look and a role-based placeholder name', () => {
    const r = staffRoster(); expect(r.map((s) => s.id)).toEqual(['reception', ...DEPARTMENTS.map((d) => d.id), 'vip']);
    const looks = r.map((s) => JSON.stringify([s.look.outfit, s.look.color, s.look.scarfColor || s.look.hair, s.look.skin])); expect(new Set(looks).size).toBe(r.length);
    for (const s of r) { expect(s.look.gender).toBe('f'); expect(s.name.en).toMatch(/advisor$/); expect(s.name.ar).toMatch(/^مستشارة/); }
  });
  test('advisers and the desk are solid, never on a stand point, a graph node, or inside any other obstacle', () => {
    const r = staffRoster(), cols = buildColliders({ doorOpen: 1, vipOpen: 1 }), mine = new Set(staffColliders(r).map((c) => c.id));
    expect(cols.filter((c) => mine.has(c.id)).length).toBe(r.length + 1);
    const others = cols.filter((c) => !mine.has(c.id)), g = buildGraph();
    for (const s of r) { expect(isFree(s.at[0], s.at[1], s.radius, others)).toBe(true); for (const [k, p] of Object.entries(g.nodes)) expect({ k, ok: Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) > s.radius + PLAYER.radius + 0.05 }).toEqual({ k, ok: true }); }
    const d = RECEPTION.desk; expect(isFree(d.x, d.z, 0.1, others)).toBe(true);
    for (const st of deptStops()) expect(isFree(st.stand[0], st.stand[1], PLAYER.radius, cols)).toBe(true);
  });
  test('the nearest-adviser lookup honours the talk radius', () => {
    const r = staffRoster(), rec = r[0]; expect(nearestStaff(r, null, rec.at[0], rec.at[1] + 1.5).id).toBe('reception'); expect(nearestStaff(r, null, 0, 0, TALK_RADIUS)).toBeNull();
  });
  test('StaffManager: notices, greets once, approaches only within range and not with reduced motion; talks while speaking; far advisers are one draw call', () => {
    const proto = HTMLCanvasElement.prototype, old = proto.getContext; proto.getContext = () => new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
    try {
      const { StaffManager } = require('../staff/staffScene'); const S = new StaffManager({ tier: 'low' }), it = S.item('kitchens'), home = [...it.def.at], greets = [];
      S.onGreet = (d) => greets.push(d.id);
      const w = { pos: [0, -9], speed: 0 }; S.update(0.05, w); expect(it.char.farOn).toBe(true); expect(S.item('reception').char.farOn).toBe(false); expect(S.item('vip').char.farOn).toBe(true);   // 11+ m away: baked, 1 call each
      w.pos = [home[0] + (home[0] < 0 ? 4.4 : -4.4), home[1]];
      for (let i = 0; i < 90; i++) S.update(1 / 30, w);
      expect(it.char.farOn).toBe(false); expect(greets).toContain('kitchens'); expect(greets.filter((g) => g === 'kitchens').length).toBe(1);
      expect(Math.hypot(it.pos[0] - home[0], it.pos[1] - home[1])).toBeGreaterThan(0.2); expect(Math.hypot(it.pos[0] - home[0], it.pos[1] - home[1])).toBeLessThanOrEqual(0.95);
      expect(Math.hypot(it.pos[0] - w.pos[0], it.pos[1] - w.pos[1])).toBeGreaterThanOrEqual(2.0);
      w.pos = [0, -9]; for (let i = 0; i < 200; i++) S.update(1 / 30, w); expect(Math.hypot(it.pos[0] - home[0], it.pos[1] - home[1])).toBeLessThan(0.05);   // back at her post
      const R = new StaffManager({ tier: 'low' }), ri = R.item('walkin'), h2 = [...ri.def.at]; w.pos = [h2[0] + (h2[0] < 0 ? 4.4 : -4.4), h2[1]]; for (let i = 0; i < 90; i++) R.update(1 / 30, w, { reduced: true });
      expect(Math.hypot(ri.pos[0] - h2[0], ri.pos[1] - h2[1])).toBeLessThan(1e-6);                       // reduced motion: she does not walk
      R.say('walkin', 'Hello and welcome'); R.update(0.1, w); R.update(0.1, w); expect(ri.anim.w.talk).toBeGreaterThan(0); S.dispose(); R.dispose();
    } finally { proto.getContext = old; }
  });
});
