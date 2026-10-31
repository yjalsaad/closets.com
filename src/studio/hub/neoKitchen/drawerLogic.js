/* Neo Kitchen Designer - pure logic behind the "04 Drawers" card (no React, no colours).
 * drawerIssues(model): plain-language warnings for values that are legal but risky, or that leave no usable drawer box.
 * The isometric diagram geometry lives in drawerArt.js. */

/** drawer box inner width (mm) of the narrowest unit that carries a drawer / hob section; null when no unit has one */
export function narrowestDrawerBox(model) {
  const g = model.g; let best = null;
  Object.values(model.runs || {}).forEach((run) => ['base', 'wall', 'top'].forEach((row) => (run[row] || []).forEach((u) => {
    if (!(u.secs || []).some((s) => s.t === 'drawer' || s.t === 'hob')) return;
    const w = u.w - 2 * g.board - 2 * g.drawerSide;
    if (best === null || w < best) best = w;
  })));
  return best;
}

/** [{ level: 'warn' | 'error', k, en, ar }] - empty when the drawer values are fine */
export function drawerIssues(model) {
  const g = model.g; const out = [];
  const w = narrowestDrawerBox(model);
  const none = w !== null && w <= 0;
  if (none) out.push({ level: 'error', k: 'drawerSide', en: `Clearance ${g.drawerSide} mm per side leaves no drawer box width in the narrowest cabinet. Reduce it.`, ar: `الخلوص ${g.drawerSide} مم لكل جانب لا يترك عرضًا لصندوق الدرج في أضيق وحدة. قلّله.` });
  else if (w !== null && w < 150) out.push({ level: 'warn', k: 'drawerSide', en: `Only ${Math.round(w)} mm of drawer box width is left in the narrowest cabinet.`, ar: `يتبقى ${Math.round(w)} مم فقط من عرض صندوق الدرج في أضيق وحدة.` });
  if (g.drawerSide < 10 && !none) out.push({ level: 'warn', k: 'drawerSide', en: `${g.drawerSide} mm per side is below the 12.5-13 mm that standard runners need - the drawer may not slide.`, ar: `${g.drawerSide} مم لكل جانب أقل من 12.5-13 مم التي تحتاجها السكك القياسية - قد لا ينزلق الدرج.` });
  if (g.drawerSide > 20 && !none) out.push({ level: 'warn', k: 'drawerSide', en: `${g.drawerSide} mm per side is wide - the box gets narrow and the runners may not reach it.`, ar: `${g.drawerSide} مم لكل جانب واسع - يضيق الصندوق وقد لا تصل إليه السكك.` });
  if (g.drawerGap === 0) out.push({ level: 'warn', k: 'drawerGap', en: 'A 0 mm gap leaves the fronts touching - they will rub when a drawer opens.', ar: 'فراغ 0 مم يجعل الواجهات متلاصقة - ستحتك عند فتح الدرج.' });
  if (g.drawerGap > 6) out.push({ level: 'warn', k: 'drawerGap', en: `A ${g.drawerGap} mm gap between fronts is wider than the usual 2-4 mm.`, ar: `فراغ ${g.drawerGap} مم بين الواجهات أوسع من المعتاد 2-4 مم.` });
  if (g.drawerBottom === 0) out.push({ level: 'warn', k: 'drawerBottom', en: 'A 0 mm inset puts the groove on the box edge - there is no board left to hold the bottom.', ar: 'تراجع 0 مم يضع المجرى على حافة الصندوق - لا يتبقى لوح يثبّت القاع.' });
  if (g.drawerBottom > 25) out.push({ level: 'warn', k: 'drawerBottom', en: `A groove ${g.drawerBottom} mm above the edge leaves a deep lip under the bottom panel.`, ar: `مجرى بارتفاع ${g.drawerBottom} مم فوق الحافة يترك حافة عميقة تحت لوح القاع.` });
  return out;
}
