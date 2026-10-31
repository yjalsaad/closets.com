/* =============================================================================
 * [NEO-HANDLES-UX36] Neo Custom Designer handles (the technical drawing: front / side / top views). PURE.
 * Coordinates are the VIEW's own (millimetres, y DOWN, origin at the view's top-left: drawingMath.viewRect), so the layer is rendered inside each view's <g>.
 *   - the envelope: width, height, depth (setDims -> normalizeDesign clamps to DIM)
 *   - the selected part: both edges of each axis the view shows are SIZE handles (setAx on that axis: the far edge moves while the near edge stays, and vice versa;
 *     the constraint's fields are patched with the inverse of solve()'s axisSpan, so the solved box is exactly what the pill shows)
 *   - a repeated part: its COPIES count (setRep) - the equal-spacing gap follows
 * Moving a part is the drawing's own drag (snapping to edges / centres); these handles resize and count.
 * ===========================================================================*/
import { setAx, setDims, setRep, DIM } from '../neoCustom/customModel';
import { viewRect, VIEW_AXES, viewSize } from '../neoCustom/drawingMath';
import { makeHandle, T } from './handleModel';

const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const SIGN = { front: { h: 1, v: -1 }, side: { h: -1, v: -1 }, top: { h: 1, v: 1 } };
const AXN = { x: ['Width', 'العرض'], y: ['Height', 'الارتفاع'], z: ['Depth', 'العمق'] };

/** the constraint `a` that places the span [lo, hi] against the parent range [p0, p1] (and the referenced sibling's range `ref` on that axis): the inverse of customSolve.axisSpan */
export function invAxis(a, lo, hi, p0, p1, ref) {
  const s = r2(hi - lo);
  switch (a.a) {
    case 'max': return { ...a, o: r2(p1 - hi), s };
    case 'center': return { ...a, o: r2((lo + hi) / 2 - (p0 + p1) / 2), s };
    case 'fill':
      if (ref) { if ((ref[0] + ref[1]) / 2 >= (p0 + p1) / 2) return { ...a, o: r2(lo - p0), e: r2(ref[0] - hi) }; return { ...a, o: r2(lo - ref[1]), e: r2(p1 - hi) }; }
      return { ...a, o: r2(lo - p0), e: r2(p1 - hi) };
    case 'after': return { ...a, o: r2(lo - (ref ? ref[1] : p0)), s };
    case 'before': return { ...a, o: r2((ref ? ref[0] : p1) - hi), s };
    default: return { ...a, o: r2(lo - p0), s };
  }
}

/** @param {{ design, solved, view: 'front'|'side'|'top', sel?: string|null }} o  @returns handles in view coordinates */
export function customHandles({ design, solved, view, sel = null }) {
  const dims = { w: design.dims.w, h: design.dims.h, d: design.dims.d };
  const va = VIEW_AXES[view]; const sg = SIGN[view]; const sz = viewSize(view, dims);
  const out = [];
  const dirOf = (horizontal, hi) => (horizontal ? ((sg.h > 0) === hi ? 'right' : 'left') : ((sg.v > 0) === hi ? 'down' : 'up'));

  /* ---- the envelope ---- */
  const env = (k, label, labelAr, axis, horizontal, at) => out.push(makeHandle({
    id: `env:${k}:${view}`, kind: axis === 'x' ? 'width' : axis === 'y' ? 'height' : 'depth', dir: dirOf(horizontal, true), at, value: dims[k], min: DIM[k][0], max: DIM[k][1], step: 10, group: 'overall', level: 1,
    label: T(label, labelAr), tip: T(`Drag to change: ${label.toLowerCase()} (the parts follow their anchors)`, `اسحب للتغيير: ${labelAr} (تتبع القطع نقاط تثبيتها)`),
    reasons: { min: T(`Minimum ${DIM[k][0]} mm`, `الحد الأدنى ${DIM[k][0]} مم`), max: T(`Maximum ${DIM[k][1]} mm`, `الحد الأقصى ${DIM[k][1]} مم`) },
    apply: (v) => { const next = setDims(design, { [k]: Math.round(v) }); return { next, value: next.dims[k], clamped: next.dims[k] !== Math.round(v) }; },
  }));
  const hAxis = va.h; const vAxis = va.v;
  const key = (axis) => ({ x: 'w', y: 'h', z: 'd' }[axis]);
  const NAME = { x: ['Overall width', 'العرض الكلي'], y: ['Overall height', 'الارتفاع الكلي'], z: ['Overall depth', 'العمق الكلي'] };
  /* the horizontal axis' envelope handle on the view's far side, the vertical one on its top / bottom edge */
  env(key(hAxis), NAME[hAxis][0], NAME[hAxis][1], hAxis, true, { u: sg.h > 0 ? sz.w : 0, y: sz.h / 2 });
  env(key(vAxis), NAME[vAxis][0], NAME[vAxis][1], vAxis, false, { u: sz.w / 2, y: sg.v < 0 ? 0 : sz.h });

  /* ---- the selected part ---- */
  const items = sel ? solved.items.filter((q) => q.base === sel) : [];
  const it = items[0];
  if (it && it.part.type !== 'group') {
    const part = it.part; const r = viewRect(it.box, view, dims); const pid = part.id;
    const parent = part.parent && solved.byBase.get(part.parent) ? solved.byBase.get(part.parent)[0].box : solved.root;
    const nm = part.name || pid;
    [[hAxis, true], [vAxis, false]].forEach(([axis, horizontal]) => {
      if (part.rep && part.rep.axis === axis) return; // a repeated axis is the copies handle below
      const a = part[axis]; const lo = it.box[`${axis}0`]; const hi = it.box[`${axis}1`]; const size = r2(hi - lo);
      const p0 = parent[`${axis}0`]; const p1 = parent[`${axis}1`];
      let ref = null;
      if ((a.a === 'after' || a.a === 'before' || (a.a === 'fill' && a.r)) && a.r && solved.byBase.get(a.r)) { const its = solved.byBase.get(a.r); ref = [Math.min(...its.map((q) => q.box[`${axis}0`])), Math.max(...its.map((q) => q.box[`${axis}1`]))]; }
      const mid = horizontal ? (r.y0 + r.y1) / 2 : (r.x0 + r.x1) / 2;
      [true, false].forEach((hiEdge) => {
        const sgn = horizontal ? sg.h : sg.v;
        const edgeAtMaxCoord = (sgn > 0) === hiEdge; // the hi edge sits at the larger view coordinate when the axis points along the screen axis
        const c = horizontal ? (edgeAtMaxCoord ? r.x1 : r.x0) : (edgeAtMaxCoord ? r.y1 : r.y0);
        out.push(makeHandle({
          id: `part:${pid}:${axis}:${hiEdge ? 'hi' : 'lo'}`, unitId: pid, kind: axis === 'x' ? 'width' : axis === 'y' ? 'height' : 'depth', dir: dirOf(horizontal, hiEdge), at: horizontal ? { u: c, y: mid } : { u: mid, y: c },
          value: size, min: 5, max: 6000, step: 5, snap: [], group: 'unit', level: 1,
          label: T(`${nm} ${AXN[axis][0].toLowerCase()}`, `${nm} ${AXN[axis][1]}`), tip: T(`Drag this edge: ${AXN[axis][0].toLowerCase()} of the selected part`, `اسحب هذه الحافة: ${AXN[axis][1]} القطعة المحددة`),
          reasons: { min: T('Parts are at least 5 mm', 'أقل مقاس للقطعة 5 مم'), max: T('Parts are at most 6000 mm', 'أقصى مقاس للقطعة 6000 مم') },
          apply: (v) => {
            const n = clamp(Math.round(v), 5, 6000);
            const nlo = hiEdge ? lo : hi - n; const nhi = hiEdge ? lo + n : hi;
            return { next: setAx(design, pid, axis, invAxis(a, nlo, nhi, p0, p1, ref)), value: n, clamped: n !== Math.round(v) };
          },
        }));
      });
    });
    /* copies of a repeated part: drag along the repeat axis, one more copy per spacing */
    if (part.rep && (part.rep.axis === hAxis || part.rep.axis === vAxis)) {
      const horizontal = part.rep.axis === hAxis;
      const pitch = Math.max(40, (horizontal ? (r.x1 - r.x0) : (r.y1 - r.y0)) * 1.5);
      out.push(makeHandle({
        id: `part:${pid}:rep`, unitId: pid, kind: 'count', dir: dirOf(horizontal, true), pitch, at: { u: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }, value: part.rep.n, min: 2, max: 60, step: 1, group: 'count', level: 1, unit: '',
        label: T(`${nm} copies`, `نسخ ${nm}`), tip: T('Drag to change the number of equally spaced copies', 'اسحب لتغيير عدد النسخ المتساوية التباعد'), reasons: { min: T('At least 2 copies (use the panel to remove the repeat)', 'نسختان على الأقل'), max: T('At most 60 copies', 'ستون نسخة على الأكثر') },
        apply: (v) => { const n = clamp(Math.round(v), 2, 60); return { next: setRep(design, pid, { ...part.rep, n }), value: n, clamped: n !== Math.round(v) }; },
      }));
    }
  }
  return out;
}
