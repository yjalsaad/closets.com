/* =============================================================================
 * Room Visualizer — sample rooms [ROOM-VIZ 2026-11-07]
 * Each room is built from simple, true-to-size geometry (metres). x → right, y ↑, z → toward the camera.
 * The back wall is z = 0, the left wall x = 0, the floor y = 0.
 * Surfaces customers can change are tagged with a surface key; everything else is decor.
 *   ctx.panel(key, facing, x, y, z, w, h)   flat tiled surface (exact, non-repeating texture)
 *   ctx.box(key|decor, x, y, z, w, h, d, opts)   box from its min corner (repeating texture in real-world scale)
 *   ctx.window(wall, a, y, w, h)   ctx.light(x, y, z)   ctx.pendant(x, z, y)   ctx.plant(x, z, s)
 * ===========================================================================*/

export const SURFACES = {
  floor:      { en: 'Floor', ar: 'الأرضية', apps: ['floor'] },
  walls:      { en: 'Walls', ar: 'الجدران', apps: ['wall'] },
  feature:    { en: 'Feature wall', ar: 'الجدار الرئيسي', apps: ['wall', 'wall_panel'] },
  backsplash: { en: 'Backsplash', ar: 'الحاجز الخلفي', apps: ['backsplash'] },
  shower:     { en: 'Shower walls', ar: 'جدران الدش', apps: ['shower', 'backsplash'] },
  countertop: { en: 'Countertop', ar: 'سطح العمل', apps: ['countertop'] },
  cabinets:   { en: 'Cabinets', ar: 'الخزائن', apps: ['cabinet'] },
  wardrobe:   { en: 'Wardrobe', ar: 'خزانة الملابس', apps: ['wardrobe'] },
  panel:      { en: 'Wall panel', ar: 'ألواح الجدار', apps: ['wall_panel'] },
  ceiling:    { en: 'Ceiling', ar: 'السقف', apps: ['ceiling'] },
};

/* reusable pieces ──────────────────────────────────────────────────────────────────────────────────────────────── */
// a run of base units along the back wall (x from x0, width w) — carcass + doors / drawers + plinth + handles
function baseRunX(ctx, key, x0, w, z0, o = {}) {
  const H = o.h || 0.87, D = o.d || 0.6, P = 0.1, y0 = o.y0 ?? P;
  if (o.y0 == null) ctx.box('plinth', x0 + 0.01, 0, z0 + 0.05, w - 0.02, P, D - 0.1);
  ctx.box('carcass', x0, y0, z0, w, H - 0.002, D - 0.02);
  const n = Math.max(1, Math.round(w / (o.unit || 0.6))); const uw = w / n;
  for (let i = 0; i < n; i++) {
    const ux = x0 + i * uw;
    const drawers = o.drawers && o.drawers.includes(i);
    if (drawers) {
      const parts = [0.2, 0.33, 0.47];
      let yy = y0 + H; parts.forEach((f) => { const hh = H * f; yy -= hh; ctx.box(key, ux + 0.0015, yy + 0.0015, z0 + D - 0.02, uw - 0.003, hh - 0.003, 0.019); ctx.handle('x', ux + uw / 2, yy + hh - 0.05, z0 + D, Math.min(0.32, uw * 0.55)); });
    } else {
      ctx.box(key, ux + 0.0015, y0 + 0.0015, z0 + D - 0.02, uw - 0.003, H - 0.003, 0.019);
      ctx.handle('x', ux + uw / 2, y0 + H - 0.06, z0 + D, Math.min(0.3, uw * 0.5));
    }
  }
}
// wall units hung on the back wall
function wallRunX(ctx, key, x0, w, y0, h, o = {}) {
  const D = o.d || 0.35;
  ctx.box('carcass', x0, y0, 0, w, h, D - 0.02);
  const n = Math.max(1, Math.round(w / (o.unit || 0.6))); const uw = w / n;
  for (let i = 0; i < n; i++) { ctx.box(key, x0 + i * uw + 0.0015, y0 + 0.0015, D - 0.02, uw - 0.003, h - 0.003, 0.019); ctx.handle('y', x0 + i * uw + (i % 2 ? 0.05 : uw - 0.05), y0 + 0.16, D, 0.18); }
}
// a tall wardrobe run along a wall: 'back' (x from a, width len) | 'left' (z from a) | 'right'
function wardrobe(ctx, key, wall, a, len, o = {}) {
  const H = o.h || 2.4, D = o.d || 0.62, W = ctx.W, doorW = o.door || 0.5;
  const n = Math.max(1, Math.round(len / doorW)); const dw = len / n;
  const plinth = 0.08;
  if (wall === 'back') {
    ctx.box('carcass', a, plinth, 0, len, H - plinth, D - 0.02); ctx.box('plinth', a, 0, 0.02, len, plinth, D - 0.06);
    if (o.top !== false) ctx.box(key, a, H, 0, len, ctx.H - H, 0.02 + D - 0.04);
    for (let i = 0; i < n; i++) { ctx.box(key, a + i * dw + 0.0015, plinth + 0.002, D - 0.02, dw - 0.003, H - plinth - 0.004, 0.019); ctx.handle('y', a + i * dw + (i % 2 ? 0.04 : dw - 0.04), 1.05, D, 0.6); }
  } else {
    const left = wall === 'left'; const x0 = left ? 0 : W - D;
    ctx.box('carcass', x0 + (left ? 0 : 0.02), plinth, a, D - 0.02, H - plinth, len); ctx.box('plinth', x0 + (left ? 0.02 : 0.04), 0, a, D - 0.06, plinth, len);
    if (o.top !== false) ctx.box(key, x0, H, a, D, ctx.H - H, len);
    const fx = left ? D - 0.02 : W - D + 0.001;
    for (let i = 0; i < n; i++) { ctx.box(key, fx, plinth + 0.002, a + i * dw + 0.0015, 0.019, H - plinth - 0.004, dw - 0.003); ctx.handle('yz', left ? D : W - D, 1.05, a + i * dw + (i % 2 ? 0.04 : dw - 0.04), 0.6, left ? 1 : -1); }
  }
}

/* rooms ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const ROOMS = [
  {
    id: 'kitchen', en: 'Kitchen', ar: 'المطبخ', icon: '🍳', W: 4.6, D: 5.4, H: 2.8,
    surfaces: ['floor', 'feature', 'walls', 'backsplash', 'countertop', 'cabinets', 'ceiling'],
    defaults: { floor: 'vp_oak_natural', feature: 'vp_p_white', walls: 'vp_p_white', backsplash: 'vp_subway_white', countertop: 'vp_q_calacatta', cabinets: 'vp_matt_sage', ceiling: 'vp_p_white' },
    views: [{ pos: [3.9, 1.72, 5.25], target: [1.7, 0.95, 0.9], fov: 60 }, { pos: [0.6, 1.7, 5.2], target: [3.0, 0.95, 0.9], fov: 60 }],
    build(ctx) {
      ctx.room();
      ctx.panel('backsplash', '+z', 0, 0.9, 0.001, 3.55, 0.55);
      ctx.panel('backsplash', '+z', 2.35, 1.45, 0.001, 1.2, 0.85);
      ctx.box('steel', 2.55, 2.2, 0, 0.8, 0.12, 0.5); ctx.box('steel', 2.8, 2.32, 0.05, 0.3, ctx.H - 2.32, 0.3);
      baseRunX(ctx, 'cabinets', 0, 3.55, 0, { drawers: [3, 4] });
      ctx.box('countertop', 0, 0.97, 0, 3.55, 0.03, 0.62);
      wallRunX(ctx, 'cabinets', 0, 2.35, 1.45, 0.8);
      ctx.box('cabinets', 3.58, 0, 0, 0.98, 2.35, 0.6); ctx.box('carcass', 3.58, 2.35, 0, 0.98, ctx.H - 2.35, 0.58);
      ctx.handle('y', 3.66, 1.1, 0.6, 0.9); ctx.handle('y', 4.48, 1.1, 0.6, 0.9);
      ctx.box('glassblack', 2.75, 1.0, 0.1, 0.6, 0.006, 0.5);                   // hob
      ctx.box('steel', 0.95, 0.985, 0.12, 0.7, 0.02, 0.42); ctx.box('dark', 1.0, 0.99, 0.15, 0.6, 0.02, 0.36); // sink
      ctx.box('chrome', 1.28, 1.0, 0.06, 0.04, 0.32, 0.04); ctx.box('chrome', 1.28, 1.3, 0.06, 0.04, 0.03, 0.2);
      // island
      baseRunX(ctx, 'cabinets', 1.3, 2.0, 2.2, { d: 0.9, drawers: [0, 1, 2] });
      ctx.box('countertop', 1.25, 0.97, 2.15, 2.1, 0.03, 1.15);
      ctx.stool(1.65, 3.55); ctx.stool(2.3, 3.55); ctx.stool(2.95, 3.55);
      ctx.pendant(1.8, 2.7, 2.05); ctx.pendant(2.75, 2.7, 2.05);
      ctx.window('right', 1.5, 1.05, 1.6, 1.4);
      ctx.plant(0.35, 4.9, 1.0); ctx.decor('bowl', 2.2, 1.0, 3.1);
      ctx.light(1.2, 2.75, 1.4); ctx.light(3.2, 2.75, 1.4); ctx.light(2.3, 2.75, 3.8);
    },
  },
  {
    id: 'bedroom', en: 'Bedroom & wardrobe', ar: 'غرفة النوم والخزانة', icon: '🛏️', W: 4.8, D: 5.2, H: 2.8,
    surfaces: ['floor', 'feature', 'walls', 'panel', 'wardrobe', 'ceiling'],
    defaults: { floor: 'vp_oak_white', feature: 'vp_p_stone', walls: 'vp_p_white', panel: 'vp_fluted_oak', wardrobe: 'vp_matt_cashmere', ceiling: 'vp_p_white' },
    views: [{ pos: [3.9, 1.6, 5.05], target: [2.0, 0.85, 0.9], fov: 62 }, { pos: [4.5, 1.6, 3.4], target: [0.4, 1.1, 2.3], fov: 62 }],
    build(ctx) {
      ctx.room();
      ctx.panel('panel', '+z', 1.3, 0, 0.001, 3.0, ctx.H);
      wardrobe(ctx, 'wardrobe', 'left', 0.25, 3.6, { door: 0.6 });
      ctx.bed(1.85, 0.05, 1.9, 2.1);
      ctx.nightstand(1.25, 0.05); ctx.nightstand(3.8, 0.05);
      ctx.lamp(1.5, 0.55, 0.25); ctx.lamp(4.05, 0.55, 0.25);
      ctx.window('right', 2.4, 0.9, 1.7, 1.55);
      ctx.plant(4.4, 4.7, 1.2);
      ctx.light(2.4, 2.75, 1.6); ctx.light(1.0, 2.75, 3.5); ctx.light(3.6, 2.75, 3.6);
    },
  },
  {
    id: 'living', en: 'Living room & TV', ar: 'غرفة المعيشة والتلفزيون', icon: '📺', W: 5.4, D: 5.6, H: 2.9,
    surfaces: ['floor', 'feature', 'walls', 'panel', 'cabinets', 'ceiling'],
    defaults: { floor: 'vp_travertine', feature: 'vp_p_clay', walls: 'vp_p_white', panel: 'vp_fluted_black', cabinets: 'vp_fin-yas-102019-tx04', ceiling: 'vp_p_white' },
    views: [{ pos: [4.4, 1.55, 5.4], target: [2.4, 1.05, 0.7], fov: 60 }, { pos: [0.9, 1.6, 5.3], target: [3.2, 1.05, 0.8], fov: 60 }],
    build(ctx) {
      ctx.room();
      ctx.panel('panel', '+z', 1.3, 0, 0.001, 2.8, ctx.H);
      ctx.box('carcass', 1.0, 0.2, 0, 3.4, 0.42, 0.4);
      for (let i = 0; i < 4; i++) { ctx.box('cabinets', 1.0 + i * 0.85 + 0.0015, 0.2, 0.4, 0.847, 0.42, 0.019); }
      ctx.box('cabinets', 0.98, 0.62, 0, 3.44, 0.025, 0.44);
      ctx.box('dark', 1.85, 1.15, 0.03, 1.7, 0.96, 0.04); ctx.box('screen', 1.88, 1.18, 0.071, 1.64, 0.9, 0.002);
      ctx.sofa(0.15, 1.6, 'left');
      ctx.box('woodlight', 1.55, 0.34, 2.1, 1.2, 0.04, 0.7, { round: 0.015 }); [[1.6, 2.15], [2.69, 2.15], [1.6, 2.74], [2.69, 2.74]].forEach(([lx, lz]) => ctx.box('metal', lx, 0, lz, 0.03, 0.34, 0.03));
      ctx.window('right', 1.4, 0.75, 2.2, 1.8);
      ctx.plant(4.95, 0.5, 1.4); ctx.floorlamp(0.4, 4.4);
      ctx.decor('vase', 3.9, 0.645, 0.2);
      ctx.light(1.6, 2.85, 1.4); ctx.light(3.8, 2.85, 1.4); ctx.light(2.7, 2.85, 3.8);
    },
  },
  {
    id: 'bathroom', en: 'Bathroom', ar: 'الحمّام', icon: '🛁', W: 3.4, D: 4.0, H: 2.7,
    surfaces: ['floor', 'feature', 'walls', 'shower', 'cabinets', 'countertop', 'ceiling'],
    defaults: { floor: 'vp_concrete', feature: 'vp_carrara', walls: 'vp_p_white', shower: 'vp_subway_sage', cabinets: 'vp_fin-yas-298016-tx04', countertop: 'vp_q_white', ceiling: 'vp_p_white' },
    views: [{ pos: [2.1, 1.6, 3.9], target: [1.5, 1.05, 0.3], fov: 66 }, { pos: [0.4, 1.6, 3.8], target: [2.5, 1.0, 0.5], fov: 64 }],
    build(ctx) {
      ctx.room({ featureH: ctx.H });
      ctx.panel('shower', '+z', 2.2, 0, 0.002, 1.2, ctx.H);
      ctx.panel('shower', '-x', ctx.W - 0.002, 0, 0, 1.25, ctx.H);
      ctx.box('glass', 2.18, 0.0, 1.22, 1.22, 2.0, 0.01);
      ctx.box('chrome', 2.8, 2.05, 0.02, 0.04, 0.04, 0.3); ctx.box('chrome', 2.72, 2.03, 0.3, 0.2, 0.02, 0.2);
      ctx.box('carcass', 0.35, 0.35, 0, 1.3, 0.48, 0.48);
      ctx.box('cabinets', 0.351, 0.351, 0.48, 0.648, 0.478, 0.019); ctx.box('cabinets', 1.001, 0.351, 0.48, 0.648, 0.478, 0.019);
      ctx.box('countertop', 0.33, 0.83, 0, 1.34, 0.03, 0.5);
      ctx.box('porcelain', 0.7, 0.86, 0.1, 0.6, 0.12, 0.34); ctx.box('chrome', 0.98, 0.98, 0.04, 0.04, 0.2, 0.04);
      ctx.box('mirror', 0.45, 1.25, 0.005, 1.1, 0.8, 0.02);
      ctx.box('porcelain', 0.02, 0, 2.2, 0.55, 0.42, 0.38); ctx.box('porcelain', 0.02, 0.42, 2.2, 0.2, 0.38, 0.38);
      ctx.rug(0.6, 1.0, 1.0, 0.6, '#d9d2c5');
      ctx.plant(0.25, 3.7, 0.8);
      ctx.light(1.0, 2.65, 1.0); ctx.light(2.7, 2.65, 0.6); ctx.light(1.7, 2.65, 2.8);
    },
  },
  {
    id: 'closet', en: 'Walk-in closet', ar: 'غرفة الملابس', icon: '👔', W: 4.2, D: 4.8, H: 2.7,
    surfaces: ['floor', 'walls', 'wardrobe', 'cabinets', 'countertop', 'ceiling'],
    defaults: { floor: 'vp_carpet_grey', walls: 'vp_p_stone', wardrobe: 'vp_fin-yas-32374-tx04', cabinets: 'vp_fin-yas-32374-tx04', countertop: 'vp_nero', ceiling: 'vp_p_white' },
    views: [{ pos: [2.9, 1.65, 4.65], target: [1.7, 0.95, 0.8], fov: 64 }, { pos: [0.6, 1.65, 4.6], target: [2.8, 0.95, 1.0], fov: 64 }],
    build(ctx) {
      ctx.room();
      wardrobe(ctx, 'wardrobe', 'back', 0.0, ctx.W, { door: 0.52 });
      wardrobe(ctx, 'wardrobe', 'left', 0.62, 2.8, { door: 0.56 });
      wardrobe(ctx, 'wardrobe', 'right', 0.62, 2.8, { door: 0.56 });
      baseRunX(ctx, 'cabinets', 1.35, 1.5, 2.0, { d: 0.75, h: 0.82, unit: 0.5, drawers: [0, 1, 2] });
      ctx.box('countertop', 1.3, 0.92, 1.95, 1.6, 0.03, 0.85);
      ctx.decor('bowl', 2.0, 0.95, 2.3);
      ctx.pendant(2.1, 2.4, 1.9);
      ctx.light(1.2, 2.65, 1.2); ctx.light(3.0, 2.65, 1.2); ctx.light(2.1, 2.65, 3.6);
    },
  },
  {
    id: 'office', en: 'Home office', ar: 'المكتب المنزلي', icon: '💼', W: 4.4, D: 4.8, H: 2.8,
    surfaces: ['floor', 'feature', 'walls', 'panel', 'cabinets', 'countertop', 'ceiling'],
    defaults: { floor: 'vp_walnut', feature: 'vp_p_sage', walls: 'vp_p_white', panel: 'vp_fluted_oak', cabinets: 'vp_matt_navy', countertop: 'vp_fin-yas-298016-tx04', ceiling: 'vp_p_white' },
    views: [{ pos: [3.6, 1.6, 4.65], target: [1.8, 0.95, 0.7], fov: 62 }, { pos: [0.6, 1.65, 4.6], target: [2.8, 0.95, 0.9], fov: 62 }],
    build(ctx) {
      ctx.room();
      ctx.panel('panel', '+x', 0.001, 0, 1.0, 2.8, ctx.H);
      baseRunX(ctx, 'cabinets', 0.4, 3.6, 0, { d: 0.45, h: 0.72, unit: 0.6, drawers: [1, 4] });
      ctx.box('countertop', 0.38, 0.82, 0, 3.64, 0.03, 0.47);
      for (let k = 0; k < 3; k++) ctx.box('countertop', 0.4, 1.35 + k * 0.42, 0, 3.6, 0.03, 0.3);
      ctx.box('countertop', 0.4, 1.35, 0, 0.03, 0.87, 0.3); ctx.box('countertop', 3.97, 1.35, 0, 0.03, 0.87, 0.3); ctx.box('countertop', 2.185, 1.35, 0, 0.03, 0.87, 0.3);
      ctx.decor('books', 0.7, 1.38, 0.05); ctx.decor('books', 2.5, 1.8, 0.05); ctx.decor('vase', 3.4, 1.38, 0.12);
      // desk
      ctx.box('countertop', 1.2, 0.74, 2.0, 1.8, 0.04, 0.8);
      ctx.box('metal', 1.25, 0, 2.05, 0.04, 0.74, 0.7); ctx.box('metal', 2.91, 0, 2.05, 0.04, 0.74, 0.7);
      ctx.box('dark', 1.85, 0.79, 2.15, 0.55, 0.35, 0.02); ctx.box('screen', 1.87, 0.81, 2.171, 0.51, 0.31, 0.002);
      ctx.chair(2.1, 3.1);
      ctx.window('right', 1.2, 0.9, 1.8, 1.5);
      ctx.plant(4.0, 4.4, 1.2);
      ctx.light(1.4, 2.75, 1.2); ctx.light(3.0, 2.75, 1.2); ctx.light(2.2, 2.75, 3.4);
    },
  },
];
export const roomById = (id) => ROOMS.find((r) => r.id === id) || ROOMS[0];
