/* [NEO-CUTLIST-UX32] Labels: one label per part (qty expanded) or per part type, toggle-able fields (logo, project, order, customer, part id, name, cabinet,
 * L x W x T, material, grain arrow, edge-banding diagram, qty n/N, notes, QR, Code 128, picture), A4 sheet and thermal roll presets (editable "Custom"),
 * selection (all / selected / material / cabinet), sort order, a live preview that is the SAME HTML that is printed, browser print with an exact @page
 * size in mm, test grid, ZPL (Zebra) and CSV for external label software. Settings are remembered per user in this browser. */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ParameterField from './ParameterField';
import {
  PRESETS, presetById, cleanPreset, fitCheck, perPage, pageSize, pageCount, expandLabels, selectRows, sortItems, labelsHtml, testGridHtml, zplDoc, labelsCSV,
  FIELD_KEYS, FIELD_LABELS, DEFAULT_FIELDS, SORTS, DPMM,
} from './labelLayout';
import { planSheets, nestOrderMap } from './clSheet';
import { loadSheet } from './dxfPlan';
import { useDocStore, docFor } from './docStore';
import { printHtml } from './printDoc';
import { download, safeName } from './exporters';
import './cutListPro2.css';

const KEY = (u) => `neoCutList.labels.v1.${u || 'anon'}`;
const load = (u) => { try { return JSON.parse(localStorage.getItem(KEY(u)) || 'null') || {}; } catch (e) { return {}; } };
const SORT_LABEL = { cabinet: ['By cabinet', 'حسب الخزانة'], material: ['By material', 'حسب المادة'], pid: ['By part ID', 'حسب رمز القطعة'], nest: ['By nesting sheet', 'حسب لوح القص'] };

export default function LabelsPanel({ rows, allRows, sel, bom, rowsByNo, scene, lang, title, text, notify, user }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const store = useDocStore();
  const saved = useMemo(() => load(user), [user]);
  const [presetId, setPresetId] = useState(saved.presetId || 'a4-3x7');
  const [custom, setCustom] = useState(() => cleanPreset({ id: 'custom', ...(saved.custom || {}) }));
  const [fields, setFields] = useState(() => ({ ...DEFAULT_FIELDS, ...(saved.fields || {}) }));
  const [count, setCount] = useState(saved.count || 'each');
  const [mode, setMode] = useState(saved.mode || 'all');
  const [matArg, setMatArg] = useState('');
  const [cabArg, setCabArg] = useState('');
  const [order, setOrder] = useState(saved.order || 'cabinet');
  const [skip, setSkip] = useState(0);
  const [dpi, setDpi] = useState(saved.dpi || 203);
  const [outline, setOutline] = useState(!!saved.outline);
  useEffect(() => { try { localStorage.setItem(KEY(user), JSON.stringify({ presetId, custom, fields, count, mode, order, dpi, outline })); } catch (e) { /* ignore */ } }, [user, presetId, custom, fields, count, mode, order, dpi, outline]);

  const preset = useMemo(() => (presetId === 'custom' ? cleanPreset(custom) : cleanPreset(presetById(presetId))), [presetId, custom]);
  const fit = fitCheck(preset);
  const materials = useMemo(() => [...new Set(allRows.map((r) => r.matName))], [allRows]);
  const cabinets = useMemo(() => [...new Set(allRows.map((r) => r.group))], [allRows]);
  const mArg = matArg || materials[0] || ''; const cArg = cabArg || cabinets[0] || '';
  const picked = useMemo(() => selectRows(allRows, mode, mode === 'selected' ? sel : mode === 'material' ? mArg : cArg), [allRows, mode, sel, mArg, cArg]);
  const nestMap = useMemo(() => (order === 'nest' ? nestOrderMap(planSheets(bom, rowsByNo, loadSheet())) : null), [order, bom, rowsByNo]);
  const items = useMemo(() => sortItems(expandLabels(picked, count), order, nestMap), [picked, count, order, nestMap]);
  const doc = docFor(store, title);
  const ctx = useMemo(() => ({ fields, preset, ar, lang, doc, scene, nameAr: text.nameAr, noteText: ar ? text.noteAr : text.noteEn }), [fields, preset, ar, lang, doc, scene, text]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = pageCount(items.length, preset, skip);
  const pg = pageSize(preset);
  const previewHtml = useMemo(() => labelsHtml(items.slice(0, Math.max(1, perPage(preset) - (preset.group === 'roll' ? 0 : skip))), ctx, { skip, title, outline: true }), [items, ctx, skip, title, preset]);

  const boxRef = useRef(null); const [boxW, setBoxW] = useState(520);
  useEffect(() => { const el = boxRef.current; if (!el || typeof ResizeObserver === 'undefined') return undefined; const ro = new ResizeObserver(() => setBoxW(el.clientWidth || 520)); ro.observe(el); setBoxW(el.clientWidth || 520); return () => ro.disconnect(); }, []);
  const PXMM = 3.7795; const scale = Math.min(1.6, Math.max(0.2, (boxW - 24) / (pg.w * PXMM)));

  const doPrint = async (html, name, list) => {
    if (!list.length && !html.includes('lbl box')) { notify && notify(L('No labels to print: choose some parts first.', 'لا توجد ملصقات للطباعة: اختر قطعًا أولًا.')); return; }
    const r = await printHtml(html, { title: `${safeName(title)}-${name}` });
    if (r && !r.ok && notify) notify(L('The browser blocked printing. Allow pop-ups for this site and try again.', 'منع المتصفح الطباعة. اسمح بالنوافذ المنبثقة لهذا الموقع وأعد المحاولة.'));
  };
  const printAll = () => doPrint(labelsHtml(items, ctx, { skip, title }), 'labels', items);
  const reprintSel = () => { const its = sortItems(expandLabels(selectRows(allRows, 'selected', sel), count), order, nestMap); doPrint(labelsHtml(its, ctx, { skip, title }), 'labels-reprint', its); };
  const printTest = () => doPrint(testGridHtml(preset, { ar, lang }), 'label-test', [1]);
  const zpl = () => { download(`${safeName(title)}-labels-${dpi}dpi.zpl`, zplDoc(items, ctx, dpi), 'text/plain'); notify && notify(L(`ZPL exported: ${items.length} label(s) at ${dpi} dpi. Arabic text is not printable with the built-in ZPL fonts and is replaced by "?".`, `تم تصدير ZPL: ${items.length} ملصق بدقة ${dpi}. النص العربي غير مدعوم في خطوط ZPL المدمجة ويُستبدل بـ "?".`)); };
  const csv = () => { download(`${safeName(title)}-labels.csv`, labelsCSV(items, ctx), 'text/csv'); notify && notify(L(`Label CSV exported (${items.length} rows).`, `تم تصدير CSV للملصقات (${items.length} صف).`)); };
  const setC = (k) => (v) => setCustom((c) => cleanPreset({ ...c, id: 'custom', [k]: v }));
  const isCustom = presetId === 'custom';
  const pf = (k, label, min, max, step, unit = 'mm') => <ParameterField key={k} label={label} value={custom[k]} min={min} max={max} step={step} unit={unit} slider={false} compact lang={lang} onChange={setC(k)} />;

  return (
    <div className="nk-pro-labels" data-testid="labels-panel">
      <div className="nk-pro-side">
        <label className="nk-pro-f"><span>{L('Label template', 'قالب الملصق')}</span>
          <select className="nk-select" value={presetId} onChange={(e) => setPresetId(e.target.value)} data-testid="label-preset">
            <optgroup label={L('A4 sheets', 'أوراق A4')}>{PRESETS.filter((p) => p.group === 'sheet').map((p) => <option key={p.id} value={p.id}>{ar ? p.ar : p.en}</option>)}</optgroup>
            <optgroup label={L('Thermal rolls', 'رولات حرارية')}>{PRESETS.filter((p) => p.group === 'roll').map((p) => <option key={p.id} value={p.id}>{ar ? p.ar : p.en}</option>)}</optgroup>
            <optgroup label={L('Custom', 'مخصص')}><option value="custom">{ar ? PRESETS[PRESETS.length - 1].ar : PRESETS[PRESETS.length - 1].en}</option></optgroup>
          </select>
        </label>
        {isCustom && (
          <div className="nk-pro-grid2" data-testid="label-custom">
            {pf('w', L('Label width', 'عرض الملصق'), 15, 300, 0.5)}{pf('h', L('Label height', 'ارتفاع الملصق'), 10, 300, 0.5)}
            {pf('cols', L('Columns', 'الأعمدة'), 1, 12, 1, '')}{pf('rows', L('Rows', 'الصفوف'), 1, 40, 1, '')}
            {pf('top', L('Top margin', 'الهامش العلوي'), 0, 100, 0.1)}{pf('left', L('Left margin', 'الهامش الأيسر'), 0, 100, 0.1)}
            {pf('gx', L('Gap across', 'الفراغ الأفقي'), 0, 50, 0.1)}{pf('gy', L('Gap down', 'الفراغ العمودي'), 0, 50, 0.1)}
          </div>
        )}
        <p className="nk-pro-hint" dir="ltr">{preset.w} × {preset.h} mm · {preset.cols} × {preset.rows} · {pg.w} × {pg.h} mm {preset.group === 'roll' ? '(roll)' : '(A4)'}</p>
        {!fit.ok && <p className="nk-dp-err" role="alert" data-testid="label-fit">{L('This grid does not fit the page: ', 'هذه الشبكة لا تتسع للصفحة: ')}{fit.issues.map((i) => `${i.k === 'w' ? L('width', 'العرض') : L('height', 'الارتفاع')} ${i.need} > ${i.have} mm`).join(', ')}</p>}
        {preset.group !== 'roll' && <ParameterField label={L('Start at cell (part-used sheet)', 'ابدأ من الخانة (ورقة مستخدمة جزئيًا)')} value={skip} min={0} max={Math.max(0, perPage(preset) - 1)} step={1} unit="" slider={false} compact lang={lang} onChange={(v) => setSkip(Math.round(v))} />}
        <fieldset className="nk-pro-fs"><legend>{L('Which parts', 'أي القطع')}</legend>
          <div className="nk-seg" role="group" aria-label={L('Selection', 'التحديد')}>{[['all', L('All', 'الكل')], ['selected', `${L('Selected', 'المحدد')} (${sel.size})`], ['material', L('Material', 'مادة')], ['cabinet', L('Cabinet', 'خزانة')]].map(([k, l]) => <button key={k} type="button" className="nk-seg-b" aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>)}</div>
          {mode === 'material' && <select className="nk-select" value={mArg} onChange={(e) => setMatArg(e.target.value)} aria-label={L('Material', 'المادة')}>{materials.map((m) => <option key={m}>{m}</option>)}</select>}
          {mode === 'cabinet' && <select className="nk-select" value={cArg} onChange={(e) => setCabArg(e.target.value)} aria-label={L('Cabinet', 'الخزانة')}>{cabinets.map((m) => <option key={m}>{m}</option>)}</select>}
          <div className="nk-seg" role="group" aria-label={L('Labels per part', 'ملصقات لكل قطعة')}>{[['each', L('One per piece', 'واحد لكل قطعة')], ['type', L('One per part type', 'واحد لكل نوع')]].map(([k, l]) => <button key={k} type="button" className="nk-seg-b" aria-pressed={count === k} onClick={() => setCount(k)}>{l}</button>)}</div>
          <label className="nk-pro-f"><span>{L('Sort order', 'الترتيب')}</span><select className="nk-select" value={order} onChange={(e) => setOrder(e.target.value)}>{SORTS.map((s) => <option key={s} value={s}>{SORT_LABEL[s][ar ? 1 : 0]}</option>)}</select></label>
        </fieldset>
        <fieldset className="nk-pro-fs"><legend>{L('Fields', 'الحقول')}</legend>
          <div className="nk-pro-fieldgrid">{FIELD_KEYS.map((k) => <label key={k} className="nk-pro-chk"><input type="checkbox" checked={!!fields[k]} onChange={(e) => setFields((f) => ({ ...f, [k]: e.target.checked }))} data-field={k} /><span>{FIELD_LABELS[k][ar ? 1 : 0]}</span></label>)}</div>
          <label className="nk-pro-chk"><input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} /><span>{L('Print label outlines (plain paper)', 'طباعة حدود الملصق (ورق عادي)')}</span></label>
        </fieldset>
      </div>
      <div className="nk-pro-labmain">
        <div className="nk-pro-bar" role="toolbar" aria-label={L('Label actions', 'إجراءات الملصقات')}>
          <b data-testid="label-count">{items.length} {L('labels', 'ملصق')} · {pages} {L('page(s)', 'صفحة')}</b>
          <span className="nk-pro-grow" />
          <button type="button" className="nk-btn nk-btn-primary" onClick={printAll} disabled={!items.length || !fit.ok} data-testid="label-print">🖨 {L('Print labels', 'طباعة الملصقات')}</button>
          <button type="button" className="nk-btn" onClick={reprintSel} disabled={!sel.size || !fit.ok} data-testid="label-reprint">{L('Reprint selected', 'إعادة طباعة المحدد')}</button>
          <button type="button" className="nk-btn" onClick={printTest} disabled={!fit.ok} data-testid="label-test">{L('Test grid', 'صفحة اختبار')}</button>
          <label className="nk-pro-sel-l"><span className="nk-sr">DPI</span><select className="nk-select" value={dpi} onChange={(e) => setDpi(+e.target.value)} aria-label="ZPL DPI">{Object.keys(DPMM).map((d) => <option key={d} value={d}>{d} dpi</option>)}</select></label>
          <button type="button" className="nk-btn" onClick={zpl} disabled={!items.length} data-testid="label-zpl">ZPL</button>
          <button type="button" className="nk-btn" onClick={csv} disabled={!items.length} data-testid="label-csv">CSV</button>
        </div>
        <div className="nk-pro-prevbox" ref={boxRef}>
          {items.length ? (
            <div className="nk-pro-prev" style={{ width: pg.w * PXMM * scale, height: pg.h * PXMM * scale }}>
              <iframe title={L('Label preview (first page)', 'معاينة الملصقات (الصفحة الأولى)')} sandbox="" srcDoc={previewHtml} style={{ width: pg.w * PXMM, height: pg.h * PXMM + 40, transform: `scale(${scale})` }} data-testid="label-preview" />
            </div>
          ) : <div className="nk-cl-empty"><b>{L('No labels', 'لا توجد ملصقات')}</b><span>{L('Choose which parts to label.', 'اختر القطع المراد وضع ملصقات لها.')}</span></div>}
        </div>
        <p className="nk-pro-hint">{L('The preview is the first page, exactly what is printed. Print uses the exact label size in millimetres; set the printer to 100% scale (no "fit to page") and no margins.', 'المعاينة هي الصفحة الأولى كما ستُطبع تمامًا. الطباعة بمقاس الملصق بالمليمتر؛ اضبط الطابعة على مقياس 100% (دون "ملاءمة الصفحة") وبلا هوامش.')}</p>
      </div>
    </div>
  );
}
