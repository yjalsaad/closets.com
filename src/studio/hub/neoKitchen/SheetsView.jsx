/* [NEO-CUTLIST-UX32] Sheet layout: one nesting diagram per board (dxfPlan.nestBOM), part ids, kerf, offcuts, utilisation, editable sheet size
 * (remembered with the DXF cutting plan's settings), grain along the sheet length, pan / zoom, selection shared with the table, print all sheets. */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ParameterField from './ParameterField';
import { planSheets, sheetSvg, materialStats } from './clSheet';
import { loadSheet, saveSheet, cleanSheet, SHEET_LIMITS } from './dxfPlan';
import { useDocStore, docFor } from './docStore';
import { nestingHtml } from './docPrint';
import { printHtml } from './printDoc';
import { safeName } from './exporters';
import './cutListPro2.css';

const STOCK = [['2800 × 2070', 2800, 2070], ['2440 × 1220', 2440, 1220], ['3050 × 1220', 3050, 1220], ['2750 × 1830', 2750, 1830]];

export default function SheetsView({ bom, rows, rowsByNo, scene, lang, title, sel, onSelect, notify }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const store = useDocStore();
  const [cfg, setCfg] = useState(() => loadSheet());
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [pic, setPic] = useState(true);
  const view = useRef(null); const dragRef = useRef(null);
  const plan = useMemo(() => planSheets(bom, rowsByNo, cfg), [bom, rowsByNo, cfg]);
  const stats = useMemo(() => materialStats(plan), [plan]);
  const sheet = plan.sheets[Math.min(idx, plan.sheets.length - 1)];
  const commit = (next) => { const c = cleanSheet(next); setCfg(c); saveSheet(c); setIdx(0); setT({ k: 1, x: 0, y: 0 }); };
  const svg = useMemo(() => (sheet ? sheetSvg(plan, sheet, { hi: sel, width: undefined }).replace('<svg ', '<svg width="100%" ') : ''), [plan, sheet, sel]);
  useEffect(() => { const el = view.current; if (!el) return undefined; const w = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); const px = e.clientX - r.left; const py = e.clientY - r.top; setT((p) => { const k = Math.min(12, Math.max(1, p.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); const f = k / p.k; return k === 1 ? { k: 1, x: 0, y: 0 } : { k, x: px - (px - p.x) * f, y: py - (py - p.y) * f }; }); }; el.addEventListener('wheel', w, { passive: false }); return () => el.removeEventListener('wheel', w); }, [sheet]);
  const down = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, t, moved: false }; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { const d = dragRef.current; if (!d) return; const dx = e.clientX - d.x; const dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; if (d.t.k > 1) setT({ k: d.t.k, x: d.t.x + dx, y: d.t.y + dy }); };
  const up = (e) => { const d = dragRef.current; dragRef.current = null; if (d && !d.moved) { const g = e.target.closest && e.target.closest('g[data-pid]'); if (g) onSelect(g.getAttribute('data-pid')); } };
  const printAll = async () => {
    const doc = docFor(store, title);
    const r = await printHtml(nestingHtml({ plan, doc, ar, lang, rowsByNo, scene, pic, title }), { title: `${safeName(title)}-cutting-plan` });
    if (r && !r.ok && notify) notify(L('The browser blocked printing. Allow pop-ups for this site and try again.', 'منع المتصفح الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع وأعد المحاولة.'));
  };
  const nSheets = plan.sheets.length;
  const sumUsed = stats.reduce((s, m) => s + m.usedM2, 0); const sumSheet = stats.reduce((s, m) => s + m.sheetM2, 0);
  const st = sheet ? stats.find((m) => m.material === sheet.material && m.thk === sheet.thk) : null;
  return (
    <div className="nk-pro-sheets" data-testid="sheets-view">
      <div className="nk-pro-side">
        <div className="nk-pro-grid2">
          <ParameterField label={L('Sheet length', 'طول اللوح')} value={cfg.sheetW} min={SHEET_LIMITS.sheet[0]} max={SHEET_LIMITS.sheet[1]} step={10} unit="mm" slider={false} compact lang={lang} onChange={(v) => commit({ ...cfg, sheetW: v })} />
          <ParameterField label={L('Sheet width', 'عرض اللوح')} value={cfg.sheetH} min={SHEET_LIMITS.sheet[0]} max={SHEET_LIMITS.sheet[1]} step={10} unit="mm" slider={false} compact lang={lang} onChange={(v) => commit({ ...cfg, sheetH: v })} />
          <ParameterField label={L('Kerf', 'سماكة المنشار')} value={cfg.kerf} min={SHEET_LIMITS.kerf[0]} max={SHEET_LIMITS.kerf[1]} step={0.5} unit="mm" slider={false} compact lang={lang} onChange={(v) => commit({ ...cfg, kerf: v })} />
        </div>
        <div className="nk-seg" role="group" aria-label={L('Stock sizes', 'مقاسات الألواح')}>
          {STOCK.map(([l, w, h]) => <button key={l} type="button" className="nk-seg-b" aria-pressed={cfg.sheetW === w && cfg.sheetH === h} onClick={() => commit({ ...cfg, sheetW: w, sheetH: h })}><bdi dir="ltr">{l}</bdi></button>)}
        </div>
        <p className="nk-pro-hint">{L('Grain runs along the sheet length: a part with grain keeps its grain direction, a part without may be turned. Kerf is the saw cut between parts.', 'العرق باتجاه طول اللوح: القطعة ذات العرق تحافظ على اتجاهه والقطعة بلا عرق يمكن تدويرها. المنشار هو قطع المنشار بين القطع.')}</p>
        <dl className="nk-pro-kvs" data-testid="sheet-stats">
          <div className="nk-pro-kv"><dt>{L('Boards', 'الألواح')}</dt><dd className="nk-mono">{nSheets}</dd></div>
          <div className="nk-pro-kv"><dt>{L('Utilisation', 'الاستخدام')}</dt><dd className="nk-mono">{sumSheet ? ((sumUsed / sumSheet) * 100).toFixed(1) : '0.0'}%</dd></div>
          <div className="nk-pro-kv"><dt>{L('Waste', 'الهدر')}</dt><dd className="nk-mono">{sumSheet ? ((1 - sumUsed / sumSheet) * 100).toFixed(1) : '0.0'}%</dd></div>
        </dl>
        <table className="nk-pro-mini"><thead><tr><th>{L('Material', 'المادة')}</th><th>{L('Boards', 'ألواح')}</th><th>{L('Util.', 'استخدام')}</th></tr></thead>
          <tbody>{stats.map((m) => <tr key={`${m.material}|${m.thk}`}><td dir="auto">{m.material} <small>{m.thk} mm</small></td><td className="nk-mono">{m.sheets}</td><td className="nk-mono">{m.util.toFixed(1)}%</td></tr>)}</tbody></table>
        {(plan.nest.skipped.length > 0 || plan.nest.oversize.length > 0) && (
          <div className="nk-cl-warn" role="status"><div className="nk-cl-warn-h">{L('NOT NESTED', 'غير موزعة')}</div>
            <ul className="nk-cl-warn-l">
              {plan.nest.skipped.map((s) => <li key={s.no}>{s.name} ×{s.qty} - {s.reason === 'glass' ? L('glass', 'زجاج') : s.reason === 'worktop' ? L('worktop', 'سطح عمل') : L('solid timber', 'خشب صلب')}</li>)}
              {plan.nest.oversize.map((s) => <li key={s.id}>{s.name} {s.L}×{s.W} - {L('larger than the sheet', 'أكبر من اللوح')}</li>)}
            </ul></div>
        )}
        <label className="nk-pro-chk"><input type="checkbox" checked={pic} onChange={(e) => setPic(e.target.checked)} /><span>{L('Pictures in the printed legend', 'الصور في مفتاح الطباعة')}</span></label>
        <button type="button" className="nk-btn nk-btn-primary" onClick={printAll} disabled={!nSheets} data-testid="print-sheets">🖨 {L('Print all sheets', 'طباعة كل الألواح')}</button>
      </div>
      <div className="nk-pro-sheetmain">
        {!sheet ? <div className="nk-cl-empty" data-testid="sheets-empty"><b>{L('Nothing to nest', 'لا يوجد ما يوزَّع')}</b></div> : (
          <>
            <div className="nk-pro-bar" role="toolbar" aria-label={L('Sheet tools', 'أدوات اللوح')}>
              <button type="button" className="nk-btn" onClick={() => { setIdx((i) => (i - 1 + nSheets) % nSheets); setT({ k: 1, x: 0, y: 0 }); }} aria-label={L('Previous sheet', 'اللوح السابق')}>{ar ? '›' : '‹'}</button>
              <b className="nk-pro-sheetno" dir="ltr" data-testid="sheet-no">{Math.min(idx, nSheets - 1) + 1} / {nSheets}</b>
              <button type="button" className="nk-btn" onClick={() => { setIdx((i) => (i + 1) % nSheets); setT({ k: 1, x: 0, y: 0 }); }} aria-label={L('Next sheet', 'اللوح التالي')}>{ar ? '‹' : '›'}</button>
              <span className="nk-pro-sheettitle" dir="auto">{sheet.material} · {sheet.thk} mm · {sheet.index}/{sheet.of} · <bdi dir="ltr">{plan.sheetW} × {plan.sheetH}</bdi> · {L('used', 'مستخدم')} {(sheet.used * 100).toFixed(1)}%{st ? ` · ${L('waste', 'هدر')} ${st.waste.toFixed(1)}%` : ''}</span>
              <span className="nk-pro-grow" />
              <button type="button" className="nk-btn" onClick={() => setT((p) => ({ ...p, k: Math.min(12, p.k * 1.4) }))} aria-label={L('Zoom in', 'تكبير')}>+</button>
              <button type="button" className="nk-btn" onClick={() => setT((p) => { const k = Math.max(1, p.k / 1.4); return k === 1 ? { k: 1, x: 0, y: 0 } : { ...p, k }; })} aria-label={L('Zoom out', 'تصغير')}>−</button>
              <button type="button" className="nk-btn" onClick={() => setT({ k: 1, x: 0, y: 0 })}>{L('Fit', 'ملاءمة')}</button>
            </div>
            <div className="nk-pro-sheetview" ref={view} onPointerDown={down} onPointerMove={move} onPointerUp={up} data-zoom={t.k.toFixed(2)} data-testid="sheet-view" role="img" aria-label={L('Nesting diagram. Scroll to zoom, drag to pan.', 'مخطط توزيع القطع. مرّر للتكبير واسحب للتحريك.')}>
              <div className="nk-pro-sheetin" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }} dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <ul className="nk-pro-legend" aria-label={L('Parts on this sheet', 'القطع على هذا اللوح')}>
              {[...new Set(sheet.parts.map((q) => q.pid))].map((pid) => { const n = sheet.parts.filter((q) => q.pid === pid).length; const r = rows.find((x) => x.pid === pid); return (
                <li key={pid}><button type="button" className={sel.has(pid) ? 'on' : ''} onClick={() => onSelect(pid)}><b dir="ltr">{pid}</b><span dir="auto">{r ? (ar ? (r.nameAr || r.name) : r.name) : ''}</span><small dir="ltr">×{n}</small></button></li>
              ); })}
            </ul>
            <p className="nk-pro-hint">{L('Offcuts (dashed) are the free strips of 100 mm or more. Click a part to select it in the table.', 'القصاصات (متقطعة) هي الشرائح الحرة 100 مم فأكثر. اضغط على قطعة لتحديدها في الجدول.')}</p>
          </>
        )}
      </div>
    </div>
  );
}
