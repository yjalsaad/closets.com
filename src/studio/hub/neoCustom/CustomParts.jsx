/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the Parts tab: the tree of parts (add / edit / duplicate / mirror / delete / reorder) and the editor of the selected part.
 * The editor is the whole constraint model made visible: for each axis (width x, height y, depth z) the anchor (Start / End / Centre / Fill / After / Before),
 * the offset, the size or the end margin, and the sibling a part follows; plus Repeat (equal spacing), material slot, grain, edge banding, cut-outs, door /
 * drawer / glass / hardware options. Every numeric input is the shared ParameterField. Pure design edits come from customModel.js; this file only calls them.
 * ===========================================================================*/
import React, { useRef, useState } from 'react';
import ParameterField from '../neoKitchen/ParameterField';
import { Seg, useDismiss } from '../neoKitchen/ui';
import { Ic } from '../neoKitchen/icons';
import ConfirmDialog from '../neoKitchen/ConfirmDialog';
import './customIcons';
import {
  PRESETS, TYPES, TYPE_NAME, AXES, AXIS_NAME, ANCHORS, ANCHOR_NAME, ANCHOR_TIP, SLOTS, BOARD_SLOTS, HW, HW_KEYS, GRAINS, EDGE_CODES, HANDLE_STYLES,
  addPart, updatePart, setAx, setRep, deletePart, duplicatePart, mirrorPart, movePart, setParent, treeOrder, getPart, descendants, partName, numbering, CORNERS,
} from './customModel';
import { repGap } from './customSolve';

const r1 = (v) => Math.round(v * 10) / 10;

const F = ({ label, value, min, max, step = 1, onChange, lang, unit = 'mm', helper, testid, disabled }) => (
  <ParameterField label={label} value={value} min={min} max={max} step={step} unit={unit} onChange={onChange} slider={false} compact hideRange lang={lang} helper={helper} testid={testid} disabled={disabled} />
);

const GRAIN_LBL = { auto: ['Auto', 'تلقائي'], x: ['Width', 'العرض'], y: ['Height', 'الارتفاع'], z: ['Depth', 'العمق'], none: ['None', 'بدون'] };
const CORNER_LBL = { tl: ['Top-left', 'أعلى اليسار'], tr: ['Top-right', 'أعلى اليمين'], bl: ['Bottom-left', 'أسفل اليسار'], br: ['Bottom-right', 'أسفل اليمين'] };
const SLOT_LBL = Object.fromEntries(SLOTS.map((s) => [s.k, [s.en, s.ar]]));
const HANDLE_LBL = { auto: ['Auto (project style)', 'تلقائي (نمط المشروع)'], bar: ['Bar', 'شريط'], knob: ['Knob', 'كرة'], profile: ['Profile', 'بروفايل'], push: ['Push-to-open', 'فتح بالضغط'], none: ['None', 'بدون'] };

/* ---- one axis ------------------------------------------------------------------------------------------------------ */
function AxisCard({ axis, spec, range, rep, siblings, onPatch, lang }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const isRep = rep && rep.axis === axis;
  const fill = !isRep && spec.a === 'fill';
  const follow = !isRep && (spec.a === 'after' || spec.a === 'before');
  const fillRef = fill; // a Fill may stop at / start after a sibling (a leg fills from the floor up to the underside of the top)
  const size = r1(range[1] - range[0]);
  return (
    <section className="nkc-ax" data-axis={axis} aria-label={AXIS_NAME[axis][ar ? 1 : 0]}>
      <header className="nkc-ax-h">
        <b>{AXIS_NAME[axis][ar ? 1 : 0]}</b>
        <small dir="ltr" data-testid={`ax-range-${axis}`}>{r1(range[0])} → {r1(range[1])} mm · {size}</small>
      </header>
      {isRep ? (
        <p className="nk-sub nkc-note">{L('Repeated along this axis: the copies are spaced equally between the start margin and the end margin.', 'مكرر على هذا المحور: النسخ متباعدة بالتساوي بين هامش البداية وهامش النهاية.')}</p>
      ) : (
        <Seg className="nkc-anchors" label={L('Anchor', 'التثبيت')} value={spec.a} onChange={(a) => onPatch({ a, ...((a === 'after' || a === 'before') && !spec.r && siblings.length ? { r: siblings[0].id } : null) })}
          options={ANCHORS.map((a) => [a, ANCHOR_NAME[a][ar ? 1 : 0], ANCHOR_TIP[a][ar ? 1 : 0]])} />
      )}
      {follow && (
        <label className="nkc-sel">
          <span>{spec.a === 'after' ? L('Starts after', 'يبدأ بعد') : L('Ends before', 'ينتهي قبل')}</span>
          <select className="nk-select" value={spec.r} onChange={(e) => onPatch({ r: e.target.value })} aria-label={L('Reference part', 'الجزء المرجعي')} data-testid={`ax-ref-${axis}`}>
            <option value="">{L('— pick a part —', '— اختر جزءًا —')}</option>
            {siblings.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      )}
      {fillRef && (
        <label className="nkc-sel">
          <span>{L('Fill up to (or after) a part', 'املأ حتى (أو بعد) جزء')}</span>
          <select className="nk-select" value={spec.r} onChange={(e) => onPatch({ r: e.target.value })} aria-label={L('Fill reference part', 'الجزء المرجعي للملء')} data-testid={`ax-fillref-${axis}`}>
            <option value="">{L('— the whole parent —', '— الأصل كاملًا —')}</option>
            {siblings.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      )}
      <div className="nkc-ax-f">
        <F label={isRep || fill ? L('Start margin', 'هامش البداية') : spec.a === 'center' ? L('Offset from centre', 'الإزاحة من المنتصف') : spec.a === 'max' ? L('From the end', 'من النهاية') : L('Offset', 'الإزاحة')}
          value={spec.o} min={-5000} max={20000} step={1} lang={lang} onChange={(v) => onPatch({ o: v })} testid={`ax-o-${axis}`} />
        {(isRep || fill) && <F label={L('End margin', 'هامش النهاية')} value={spec.e} min={-5000} max={20000} step={1} lang={lang} onChange={(v) => onPatch({ e: v })} testid={`ax-e-${axis}`} />}
        {(isRep || !fill) && <F label={L('Size', 'المقاس')} value={spec.s} min={0.5} max={20000} step={1} lang={lang} onChange={(v) => onPatch({ s: v })} testid={`ax-s-${axis}`} />}
        {fill && <div className="nkc-computed"><span>{L('Size', 'المقاس')}</span><b dir="ltr" data-testid={`ax-size-${axis}`}>{size} mm</b><small>{L('computed', 'محسوب')}</small></div>}
      </div>
    </section>
  );
}

/* ---- edge banding ------------------------------------------------------------------------------------------------ */
function EdgeCard({ part, onChange, lang }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const on = new Set(part.eb);
  const toggle = (c) => { const n = new Set(on); if (n.has(c)) n.delete(c); else n.add(c); onChange(['L1', 'L2', 'W1', 'W2'].filter((k) => n.has(k))); };
  return (
    <section className="nkc-card2" aria-label={L('Edge banding', 'شريط الحواف')}>
      <header className="nkc-ax-h"><b>{L('Edge banding', 'شريط الحواف')}</b><small>{L('L = the two long edges, W = the two short edges (as the cut list prints them)', 'L = الحافتان الطويلتان، W = الحافتان القصيرتان (كما في قائمة القص)')}</small></header>
      <div className="nkc-eb">
        <svg viewBox="0 0 120 60" className="nkc-eb-svg" role="img" aria-label={L('Edge key', 'مفتاح الحواف')}>
          <rect x="10" y="10" width="100" height="40" className="nkc-eb-body" />
          <line x1="10" y1="10" x2="110" y2="10" className={on.has('L1') ? 'is-on' : ''} /><line x1="10" y1="50" x2="110" y2="50" className={on.has('L2') ? 'is-on' : ''} />
          <line x1="10" y1="10" x2="10" y2="50" className={on.has('W1') ? 'is-on' : ''} /><line x1="110" y1="10" x2="110" y2="50" className={on.has('W2') ? 'is-on' : ''} />
        </svg>
        <div className="nk-chips" role="group" aria-label={L('Banded edges', 'الحواف المشطوبة')}>
          {EDGE_CODES.map((c) => <button key={c} type="button" className="nk-chip nk-chip-sm" aria-pressed={on.has(c)} onClick={() => toggle(c)} data-testid={`eb-${c}`}><span dir="ltr">{c}</span></button>)}
          <button type="button" className="nk-chip nk-chip-sm" onClick={() => onChange([...EDGE_CODES])} data-testid="eb-all">{L('All', 'الكل')}</button>
          <button type="button" className="nk-chip nk-chip-sm" onClick={() => onChange([])} data-testid="eb-none">{L('None', 'بدون')}</button>
        </div>
      </div>
    </section>
  );
}

/* ---- cut-outs ------------------------------------------------------------------------------------------------------ */
function CutCard({ part, onChange, lang }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const set = (i, patch) => onChange(part.cuts.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const add = (k) => onChange([...part.cuts, k === 'hole' ? { k, x: 100, y: 100, d: 35 } : k === 'radius' ? { k, c: 'tr', r: 30 } : { k, c: 'tl', w: 100, h: 60 }]);
  return (
    <section className="nkc-card2" aria-label={L('Cut-outs', 'القطع والتجاويف')} data-testid="cuts-card">
      <header className="nkc-ax-h"><b>{L('Cut-outs, notches, radius corners', 'قطع وشقوق وزوايا مدورة')}</b><small>{L('Written in the cut list and drawn in the drawing; the 3D view shows the plain board.', 'تُكتب في قائمة القص وتُرسم في الرسم؛ العرض ثلاثي الأبعاد يعرض اللوح بسيطًا.')}</small></header>
      {part.cuts.map((c, i) => (
        <div className="nkc-cut" key={i} data-testid={`cut-${i}`}>
          <b>{c.k === 'notch' ? L('Notch', 'شق') : c.k === 'radius' ? L('Radius', 'تدوير') : L('Hole', 'ثقب')}</b>
          {c.k !== 'hole' && <Seg label={L('Corner', 'الزاوية')} value={c.c} onChange={(v) => set(i, { c: v })} options={CORNERS.map((k) => [k, CORNER_LBL[k][ar ? 1 : 0]])} />}
          {c.k === 'notch' && (<><F label={L('Width', 'العرض')} value={c.w} min={1} max={5000} lang={lang} onChange={(v) => set(i, { w: v })} /><F label={L('Height', 'الارتفاع')} value={c.h} min={1} max={5000} lang={lang} onChange={(v) => set(i, { h: v })} /></>)}
          {c.k === 'radius' && <F label={L('Radius R', 'نصف القطر R')} value={c.r} min={1} max={1000} lang={lang} onChange={(v) => set(i, { r: v })} />}
          {c.k === 'hole' && (<><F label={L('Diameter', 'القطر')} value={c.d} min={2} max={2000} lang={lang} onChange={(v) => set(i, { d: v })} /><F label="X" value={c.x} min={0} max={20000} lang={lang} onChange={(v) => set(i, { x: v })} /><F label="Y" value={c.y} min={0} max={20000} lang={lang} onChange={(v) => set(i, { y: v })} /></>)}
          <button type="button" className="nk-ib" aria-label={L('Remove this cut-out', 'حذف هذا القطع')} onClick={() => onChange(part.cuts.filter((_, j) => j !== i))}><Ic n="close" size={16} /></button>
        </div>
      ))}
      <div className="nk-chips">
        <button type="button" className="nk-chip nk-chip-sm" onClick={() => add('notch')} data-testid="cut-add-notch">+ {L('Notch', 'شق')}</button>
        <button type="button" className="nk-chip nk-chip-sm" onClick={() => add('radius')} data-testid="cut-add-radius">+ {L('Radius corner', 'زاوية مدورة')}</button>
        <button type="button" className="nk-chip nk-chip-sm" onClick={() => add('hole')} data-testid="cut-add-hole">+ {L('Hole', 'ثقب')}</button>
      </div>
    </section>
  );
}

/* ---- the Parts tab --------------------------------------------------------------------------------------------- */
export default function CustomParts({ built, sel, onSel, commit, lang, notify, partWarn }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const { design, solved } = built;
  const [menu, setMenu] = useState(null); // 'add' | 'mirror'
  const [ask, setAsk] = useState(false);
  const menuRef = useRef(null);
  useDismiss(!!menu, () => setMenu(null), menuRef);
  const nums = numbering(design);
  const order = treeOrder(design);
  const part = sel && sel.unitId ? getPart(design, sel.unitId) : null;
  const its = part ? solved.byBase.get(part.id) || [] : [];
  const rangeOf = (k) => (its.length ? [Math.min(...its.map((q) => q.box[`${k}0`])), Math.max(...its.map((q) => q.box[`${k}1`]))] : [0, 0]);
  const sizeText = (p) => { const q = solved.byBase.get(p.id); if (!q || !q.length) return ''; const b = q[0].box; return `${r1(b.x1 - b.x0)}×${r1(b.y1 - b.y0)}×${r1(b.z1 - b.z0)}`; };
  const pick = (id) => onSel(id ? { unitId: id } : null);

  const run = (fn, key, after) => { const out = fn(); commit(out.design || out, key || `parts:${Date.now()}`); if (after) after(out); };
  const parentBox = (parentId) => {
    const b = parentId && solved.byBase.get(parentId) ? solved.byBase.get(parentId)[0].box : solved.root;
    return { w: r1(b.x1 - b.x0), h: r1(b.y1 - b.y0), d: r1(b.z1 - b.z0) };
  };
  const doAdd = (key) => {
    const parent = part && part.type === 'group' ? part.id : part ? part.parent : null; // a new part joins the selected part's group
    const r = addPart(design, key, { parent, pb: parentBox(parent) });
    commit(r.design, `add:${Date.now()}`); pick(r.id); setMenu(null);
  };
  const doDup = () => { if (!part) return; const r = duplicatePart(design, part.id); commit(r.design, `dup:${Date.now()}`); pick(r.id); };
  const doMirror = (axis) => { if (!part) return; const r = mirrorPart(design, part.id, axis, { solved }); commit(r.design, `mir:${Date.now()}`); pick(r.id); setMenu(null); };
  const doDelete = () => {
    if (!part) return;
    const sibs = treeOrder(design).map((o) => o.part.id); const i = sibs.indexOf(part.id);
    commit(deletePart(design, part.id), `del:${Date.now()}`);
    const rest = sibs.filter((x) => x !== part.id && !descendants(design, part.id).includes(x));
    pick(rest[Math.min(i, rest.length - 1)] || null);
    setAsk(false);
  };
  const onDeleteClick = () => { if (part && (part.type === 'group' && descendants(design, part.id).length)) setAsk(true); else doDelete(); };
  const onListKey = (e) => {
    if (!order.length) return;
    const ids = order.map((o) => o.part.id); const i = part ? ids.indexOf(part.id) : -1;
    if (e.key === 'ArrowDown') { e.preventDefault(); pick(ids[Math.min(ids.length - 1, i + 1)]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pick(ids[Math.max(0, i - 1)]); }
    else if (e.key === 'Delete' && part) { e.preventDefault(); onDeleteClick(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && part) { e.preventDefault(); doDup(); }
  };

  const patchPart = (patch, key) => commit(updatePart(design, part.id, patch), key || `p:${part.id}:${Object.keys(patch).join()}`);
  const patchAx = (axis, patch) => commit(setAx(design, part.id, axis, patch), `ax:${part.id}:${axis}:${Object.keys(patch).join()}`);
  const siblings = part ? design.parts.filter((p) => p.id !== part.id && p.type !== 'group' && !descendants(design, part.id).includes(p.id)).map((p) => ({ id: p.id, label: `${nums.get(p.id) || '·'}  ${partName(design, p, lang)}` })) : [];
  const groups = part ? design.parts.filter((p) => p.type === 'group' && p.id !== part.id && !descendants(design, part.id).includes(p.id)) : [];
  const flat = part && ['panel', 'shelf', 'back', 'door', 'glass'].includes(part.type);
  const slots = part && part.type === 'door' ? ['baseDoors', 'drawerFronts'] : part && part.type === 'drawer' ? ['drawers', 'drawerFronts'] : BOARD_SLOTS;
  const repGapV = part && part.rep && its.length > 1 ? (() => { const par = part.parent && solved.byBase.get(part.parent) ? solved.byBase.get(part.parent)[0].box : solved.root; const k = part.rep.axis; return repGap(part[k], par[`${k}0`], par[`${k}1`], part.rep.n, part.rep.mode); })() : null;
  const warnHere = part ? partWarn(part.id) : [];

  return (
    <div className="nkc-parts" data-testid="parts-tab">
      <section className="nk-card nkc-card">
        <div className="nk-card-head"><b className="nk-card-title">{L('Parts', 'الأجزاء')} <small dir="ltr" data-testid="parts-count">{design.parts.filter((p) => p.type !== 'group').length}</small></b></div>
        <div className="nkc-tools" role="toolbar" aria-label={L('Part actions', 'إجراءات الجزء')}>
          <div className="nk-menuwrap" ref={menu === 'add' ? menuRef : null}>
            <button type="button" className="nk-btn nk-btn-primary" aria-haspopup="menu" aria-expanded={menu === 'add'} onClick={() => setMenu(menu === 'add' ? null : 'add')} data-testid="part-add"><Ic n="plus" size={16} /> {L('Add part', 'إضافة جزء')}</button>
            {menu === 'add' && (
              <div className="nk-menu nkc-addmenu" role="menu" aria-label={L('Add part', 'إضافة جزء')} data-testid="add-menu">
                {PRESETS.map((p) => <button key={p.k} type="button" role="menuitem" className="nk-mi" data-preset={p.k} onClick={() => doAdd(p.k)}>{ar ? p.ar : p.en}</button>)}
              </div>
            )}
          </div>
          <button type="button" className="nk-btn" disabled={!part} onClick={doDup} data-testid="part-dup" title={L('Duplicate (Ctrl+D)', 'تكرار (Ctrl+D)')}><Ic n="cuCopy" size={16} /> {L('Duplicate', 'تكرار')}</button>
          <div className="nk-menuwrap" ref={menu === 'mirror' ? menuRef : null}>
            <button type="button" className="nk-btn" disabled={!part} aria-haspopup="menu" aria-expanded={menu === 'mirror'} onClick={() => setMenu(menu === 'mirror' ? null : 'mirror')} data-testid="part-mirror"><Ic n="cuMirror" size={16} /> {L('Mirror', 'عكس')}</button>
            {menu === 'mirror' && (
              <div className="nk-menu" role="menu" aria-label={L('Mirror across', 'العكس عبر')}>
                {AXES.map((k) => <button key={k} type="button" role="menuitem" className="nk-mi" data-axis={k} onClick={() => doMirror(k)}>{L(`Across ${AXIS_NAME[k][0].toLowerCase()} (${k.toUpperCase()})`, `عبر ${AXIS_NAME[k][1]} (${k.toUpperCase()})`)}</button>)}
              </div>
            )}
          </div>
          <button type="button" className="nk-ib" disabled={!part} aria-label={L('Move up in the list', 'تحريك لأعلى في القائمة')} onClick={() => run(() => movePart(design, part.id, -1), 'mv')}><Ic n="cuUp" size={16} /></button>
          <button type="button" className="nk-ib" disabled={!part} aria-label={L('Move down in the list', 'تحريك لأسفل في القائمة')} onClick={() => run(() => movePart(design, part.id, 1), 'mv')}><Ic n="down" size={16} /></button>
          <button type="button" className="nk-btn nk-btn-danger" disabled={!part} onClick={onDeleteClick} data-testid="part-delete" title={L('Delete (Del)', 'حذف (Del)')}><Ic n="cuTrash" size={16} /> {L('Delete', 'حذف')}</button>
        </div>
        {order.length === 0 ? (
          <p className="nk-sub nkc-empty" data-testid="parts-empty">{L('No parts yet. Add a panel, a leg or a drawer — or pick a starter template in the Global tab.', 'لا توجد أجزاء بعد. أضف لوحًا أو رجلًا أو درجًا — أو اختر قالبًا من تبويب عام.')}</p>
        ) : (
          <ul className="nkc-tree" role="tree" aria-label={L('Parts', 'الأجزاء')} onKeyDown={onListKey} data-testid="parts-tree">
            {order.map(({ part: p, depth }) => {
              const on = part && part.id === p.id;
              const w = partWarn(p.id).length;
              return (
                <li key={p.id} role="treeitem" aria-selected={!!on} aria-level={depth + 1}>
                  <button type="button" className={`nkc-tr${on ? ' is-on' : ''}`} style={{ '--nkc-depth': depth }} data-part={p.id} data-type={p.type} onClick={() => pick(p.id)} tabIndex={on || (!part && p === order[0].part) ? 0 : -1}>
                    <span className="nkc-tr-no" dir="ltr">{p.type === 'group' ? '▸' : nums.get(p.id)}</span>
                    <span className="nkc-tr-n" dir="auto">{partName(design, p, lang)}</span>
                    {p.rep && <span className="nkc-tr-rep" dir="ltr" title={L('Repeated with equal spacing', 'مكرر بتباعد متساوٍ')}>×{p.rep.n}</span>}
                    <span className="nkc-tr-s" dir="ltr">{p.type === 'group' ? `${descendants(design, p.id).length}` : sizeText(p)}</span>
                    {w > 0 && <span className="nkc-tr-w" role="img" aria-label={L(`${w} warning`, `${w} تنبيه`)} title={partWarn(p.id).map((x) => x[lang]).join('\n')}>!</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {part && (
        <section className="nk-card nkc-card nkc-editor" aria-label={L('Selected part', 'الجزء المحدد')} data-testid="part-editor" data-part={part.id}>
          <div className="nk-card-head"><b className="nk-card-title"><span dir="auto">{partName(design, part, lang)}</span> <small>{TYPE_NAME[part.type][ar ? 1 : 0]} · #{nums.get(part.id) || '—'}</small></b></div>
          {warnHere.length > 0 && (
            <ul className="nkc-warn" role="status" data-testid="part-warnings">{warnHere.map((w) => <li key={w.id}>{w[lang]}</li>)}</ul>
          )}
          <div className="nkc-row2">
            <label className="nkc-sel"><span>{L('Name', 'الاسم')}</span>
              <input className="nk-inp nk-inp-wide" value={part.name} maxLength={60} placeholder={partName({ ...design, parts: design.parts.map((p) => (p.id === part.id ? { ...p, name: '' } : p)) }, part, lang)} onChange={(e) => patchPart({ name: e.target.value }, `name:${part.id}`)} data-testid="part-name" aria-label={L('Part name', 'اسم الجزء')} />
            </label>
            <label className="nkc-sel"><span>{L('Type', 'النوع')}</span>
              <select className="nk-select" value={part.type} onChange={(e) => patchPart({ type: e.target.value, mat: undefined }, `type:${part.id}`)} data-testid="part-type" aria-label={L('Part type', 'نوع الجزء')}>
                {TYPES.map((t) => <option key={t.k} value={t.k}>{ar ? t.ar : t.en}</option>)}
              </select>
            </label>
            <label className="nkc-sel"><span>{L('Inside', 'داخل')}</span>
              <select className="nk-select" value={part.parent || ''} onChange={(e) => commit(setParent(design, part.id, e.target.value || null), `par:${part.id}`)} data-testid="part-parent" aria-label={L('Parent group', 'المجموعة الأصل')}>
                <option value="">{L('Whole piece (envelope)', 'القطعة كاملة (الإطار)')}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{partName(design, g, lang)}</option>)}
              </select>
            </label>
          </div>

          {AXES.map((k) => <AxisCard key={k} axis={k} spec={part[k]} range={rangeOf(k)} rep={part.rep} siblings={siblings} onPatch={(patch) => patchAx(k, patch)} lang={lang} />)}

          {part.type !== 'group' && (
            <section className="nkc-card2" aria-label={L('Repeat with equal spacing', 'تكرار بتباعد متساوٍ')} data-testid="rep-card">
              <header className="nkc-ax-h"><b>{L('Repeat · equal spacing', 'تكرار · تباعد متساوٍ')}</b>{repGapV != null && <small dir="ltr" data-testid="rep-gap">{L('gap', 'الفراغ')} {r1(repGapV)} mm</small>}</header>
              <div className="nkc-rep">
                <span className="nkc-step" role="group" aria-label={L('Copies', 'النسخ')}>
                  <button type="button" className="nk-ib" aria-label={L('Fewer copies', 'نسخ أقل')} disabled={!part.rep} onClick={() => commit(setRep(design, part.id, part.rep.n <= 2 ? null : { ...part.rep, n: part.rep.n - 1 }), `rep:${part.id}`)} data-testid="rep-minus">−</button>
                  <output dir="ltr" data-testid="rep-n">{part.rep ? part.rep.n : 1}</output>
                  <button type="button" className="nk-ib" aria-label={L('More copies', 'نسخ أكثر')} disabled={part.rep && part.rep.n >= 60} onClick={() => commit(setRep(design, part.id, part.rep ? { ...part.rep, n: part.rep.n + 1 } : { n: 2, axis: 'x', mode: 'even' }), `rep:${part.id}`)} data-testid="rep-plus">+</button>
                </span>
                {part.rep && (
                  <>
                    <Seg label={L('Along', 'على المحور')} value={part.rep.axis} onChange={(v) => commit(setRep(design, part.id, { ...part.rep, axis: v }), `rep:${part.id}`)} options={AXES.map((k) => [k, k.toUpperCase()])} />
                    <Seg label={L('Spacing', 'التباعد')} value={part.rep.mode} onChange={(v) => commit(setRep(design, part.id, { ...part.rep, mode: v }), `rep:${part.id}`)} options={[['even', L('Equal gaps', 'فراغات متساوية'), L('Equal gaps at both ends and between the copies', 'فراغات متساوية عند الطرفين وبين النسخ')], ['edge', L('Flush ends', 'ملاصق للطرفين'), L('First copy at the start, last at the end', 'النسخة الأولى عند البداية والأخيرة عند النهاية')]]} />
                  </>
                )}
              </div>
            </section>
          )}

          {part.type !== 'group' && part.type !== 'hardware' && (
            <div className="nkc-row2">
              {part.type !== 'glass' && (
                <label className="nkc-sel"><span>{L('Material slot (M&S)', 'خانة المادة (المواد)')}</span>
                  <select className="nk-select" value={slots.includes(part.mat) ? part.mat : slots[0]} onChange={(e) => patchPart({ mat: e.target.value }, `mat:${part.id}`)} data-testid="part-slot" aria-label={L('Material slot', 'خانة المادة')}>
                    {slots.map((k) => <option key={k} value={k}>{SLOT_LBL[k][ar ? 1 : 0]}</option>)}
                  </select>
                </label>
              )}
              {part.type !== 'drawer' && part.type !== 'glass' && (
                <div className="nkc-sel"><span>{L('Grain direction', 'اتجاه العرق')}</span>
                  <Seg label={L('Grain direction', 'اتجاه العرق')} value={part.grain} onChange={(v) => patchPart({ grain: v }, `grain:${part.id}`)} options={GRAINS.map((g) => [g, GRAIN_LBL[g][ar ? 1 : 0]])} />
                </div>
              )}
              {part.type === 'frame' && (
                <div className="nkc-sel"><span>{L('Section', 'المقطع')}</span>
                  <Seg label={L('Section', 'المقطع')} value={part.sec} onChange={(v) => patchPart({ sec: v }, `sec:${part.id}`)} options={[['rect', L('Rectangular', 'مستطيل')], ['round', L('Round', 'دائري')]]} />
                </div>
              )}
              {part.type === 'shelf' && (
                <div className="nkc-sel"><span>{L('Fixing', 'التثبيت')}</span>
                  <Seg label={L('Shelf fixing', 'تثبيت الرف')} value={part.fix} onChange={(v) => patchPart({ fix: v }, `fix:${part.id}`)} options={[['fixed', L('Fixed', 'ثابت')], ['adjustable', L('Adjustable (4 pins)', 'متحرك (4 مسامير)')]]} />
                </div>
              )}
            </div>
          )}

          {part.type === 'door' && (
            <div className="nkc-row2">
              <div className="nkc-sel"><span>{L('Behaviour', 'السلوك')}</span>
                <Seg label={L('Door behaviour', 'سلوك الباب')} value={part.mode} onChange={(v) => patchPart({ mode: v }, `mode:${part.id}`)} options={[['door', L('Hinged', 'مفصلي')], ['flip', L('Flip-up', 'قلاب')], ['fixed', L('Fixed front', 'واجهة ثابتة')]]} />
              </div>
              {part.mode === 'door' && (
                <div className="nkc-sel"><span>{L('Hinge side', 'جهة المفصلة')}</span>
                  <Seg label={L('Hinge side', 'جهة المفصلة')} value={part.hinge} onChange={(v) => patchPart({ hinge: v }, `hinge:${part.id}`)} options={[['L', L('Left', 'يسار')], ['R', L('Right', 'يمين')]]} />
                </div>
              )}
              {part.mode !== 'fixed' && (
                <label className="nkc-sel"><span>{L('Handle', 'المقبض')}</span>
                  <select className="nk-select" value={part.handle} onChange={(e) => patchPart({ handle: e.target.value }, `handle:${part.id}`)} aria-label={L('Handle', 'المقبض')}>
                    {HANDLE_STYLES.map((h) => <option key={h} value={h}>{HANDLE_LBL[h][ar ? 1 : 0]}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          {part.type === 'drawer' && (
            <div className="nkc-row2">
              <label className="nkc-sel"><span>{L('Handle', 'المقبض')}</span>
                <select className="nk-select" value={part.handle} onChange={(e) => patchPart({ handle: e.target.value }, `handle:${part.id}`)} aria-label={L('Handle', 'المقبض')}>
                  {HANDLE_STYLES.map((h) => <option key={h} value={h}>{HANDLE_LBL[h][ar ? 1 : 0]}</option>)}
                </select>
              </label>
              <p className="nk-sub nkc-note">{L('The drawer box (sides, box front and back, bottom), the runner pair and the front are generated from this opening and listed in the cut list.', 'صندوق الدرج (الجوانب والأمام والخلف والقاع) وزوج السكك والواجهة تُولَّد من هذه الفتحة وتظهر في قائمة القص.')}</p>
            </div>
          )}
          {part.type === 'hardware' && (
            <div className="nkc-row2">
              <label className="nkc-sel"><span>{L('Item', 'البند')}</span>
                <select className="nk-select" value={part.hw} onChange={(e) => patchPart({ hw: e.target.value }, `hw:${part.id}`)} data-testid="part-hw" aria-label={L('Hardware item', 'بند الاكسسوار')}>
                  {HW_KEYS.map((k) => <option key={k} value={k}>{ar ? HW[k].ar : HW[k].en}</option>)}
                </select>
              </label>
              <p className="nk-sub nkc-note">{L('Hardware is counted in the hardware list (use Repeat for several) and priced per piece; it is not a cut part.', 'الاكسسوار يُحسب في قائمة الاكسسوارات ويُسعَّر بالقطعة؛ وليس قطعة قص.')}</p>
            </div>
          )}

          {flat && <EdgeCard part={part} lang={lang} onChange={(eb) => patchPart({ eb }, `eb:${part.id}`)} />}
          {flat && <CutCard part={part} lang={lang} onChange={(cuts) => patchPart({ cuts }, `cuts:${part.id}`)} />}
          <label className="nkc-sel"><span>{L('Note (shown in the cut list)', 'ملاحظة (تظهر في قائمة القص)')}</span>
            <input className="nk-inp nk-inp-wide" value={part.note} maxLength={200} onChange={(e) => patchPart({ note: e.target.value }, `note:${part.id}`)} aria-label={L('Part note', 'ملاحظة الجزء')} />
          </label>
        </section>
      )}
      <ConfirmDialog open={ask} lang={lang} title={L('Delete this group?', 'حذف هذه المجموعة؟')} message={L('Everything inside the group is deleted with it. You can still use Undo afterwards.', 'كل ما بداخل المجموعة يُحذف معها. يمكنك التراجع بعد ذلك.')} confirmLabel={L('Delete', 'حذف')} cancelLabel={L('Cancel', 'إلغاء')} onConfirm={doDelete} onCancel={() => setAsk(false)} testid="confirm-del" />
    </div>
  );
}
