/* =============================================================================
 * Neo Kitchen Designer - the EXPORT menu (UX-19). Six entries, in this order:
 *   PDF Production Report | Excel Cutting List | - | OBJ 3D Model | STL 3D Model | Rhino 3DM Model | - | DXF Cutting Plan
 * plus a "More" group that keeps the older exports reachable (Project JSON, Cut list CSV, DXF Elevation, Print).
 * The writers (xlsx / obj / stl / 3dm / nesting) are loaded on first use (dynamic import), so the designer's
 * first paint does not carry them. Every export reads the same scene / bom as the screen and ignores hidden units
 * (they are not in the scene). An empty kitchen disables the entries with a visible reason.
 * Styling: exportMenu.css (scoped under .nk, owner palette as --nk-xm-* custom properties).
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; import { useStudio } from '../../studioStore'; // [WEB-STUDIO]
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Ic } from './icons';
import { useDismiss } from './ui';
import { download, safeName } from './exporters';
import PdfReportSheet from './PdfReportSheet';
import { reportMeta } from './pdfReport';
import { productInfo, appName } from './productInfo';
import { loadSheet, saveSheet, cleanSheet, SHEET_LIMITS } from './dxfPlan';
import OutputSettings, { useOutput } from './OutputSettingsControl';
import { UNIT_INFO, PRECISION_LABEL, PRECISION_INFO, toUnit, fromUnit, roundTo, dimText } from './outputSettings';
import DocSettingsDialog from './DocSettingsDialog';
import { useDocStore, attach, docFor, openSettings } from './docStore';
import { coverDoc } from './docCover';
import './exportMenu.css';

/** the Rhino 3DM writer is only enabled when its file has been read back by an openNURBS reader (see rhino3dm.js) */
export const THREE_DM_ENABLED = true;

const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', obj: 'model/obj', mtl: 'model/mtl', stl: 'model/stl', '3dm': 'application/octet-stream', dxf: 'application/dxf',
};

/** one menu row: blue download icon + label (+ the reason when it is disabled, or a hint line) */
function Item({ id, en, a, why, testid, off, sub, tip, lang, busy, run }) {
  const L = (e, ar) => (lang === 'ar' ? ar : e);
  const dis = !!off;
  return (
    <button type="button" role="menuitem" className="nk-xm-i" disabled={dis || busy === id} title={dis ? why : tip} aria-describedby={dis && why ? `nk-xm-why-${id}` : undefined} onClick={() => run(id)} data-testid={testid} data-fmt={id}>
      <span className="nk-xm-ic"><Ic n="download" size={18} /></span>
      <span className="nk-xm-t"><span className="nk-xm-n">{L(en, a)}</span>{(dis && why) ? <span className="nk-xm-s" id={`nk-xm-why-${id}`}>{why}</span> : sub ? <span className="nk-xm-s">{sub}</span> : null}</span>
    </button>
  );
}

/** `drawing` (optional, custom furniture): (lang) => node, the product's own technical drawing for the PDF report instead of the kitchen elevations */
/** [NEO-CUTLIST-UX32] `user` (id) scopes the remembered company details; the menu hosts the Production Document Settings dialog for every studio. */
function ExportMenuInner({ lang, model, scene, bom, hardware, warnings, ui, onLegacy, log, onLog, notify, product, drawing, user }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [cfg, setCfg] = useState(false);
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision: one shared setting, applied to every export below
  const [ouOpen, setOuOpen] = useState(false);
  const un = UNIT_INFO[output.unit]; const unit = output.unit;
  const uw = ar ? un.ar : un.en; // unit word for the toasts
  const ptag = output.precision === 'standard' ? '' : `, ${ar ? PRECISION_LABEL[output.precision][1] : output.precision}`;
  const shownU = (mm) => roundTo(toUnit(mm, unit), unit === 'in' ? 3 : 1); // sheet fields: stored in mm, shown in the output unit
  const [sheet, setSheet] = useState(() => loadSheet());
  const [busy, setBusy] = useState('');
  const reg = productInfo(product); // a registered product (wardrobe, bathroom, laundry, TV, office) names its own files and props; none = the kitchen
  const wd = !!(reg && reg.props);
  const [props, setProps] = useState(false); // [NEO-CLOSETS-UX24] wardrobe only: also write the rails and clothes into OBJ / STL / 3DM. Off by default; never in the cut list or the price.
  const hasProps = wd && !!(scene.props && scene.props.length);
  const [reporting, setReporting] = useState(false);
  const store = useDocStore();
  useEffect(() => { attach({ user: user || '', product: product || 'kitchen', title: model.title || '' }); }, [user, product, model.title]);
  const wrap = useRef(null);
  const panel = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrap);
  const empty = bom.rows.length === 0;
  const emptyWhy = product === 'custom' ? L('Nothing to export yet - add a part first.', 'لا يوجد ما يُصدَّر بعد - أضف جزءًا أولًا.') : L('Nothing to export yet - add a cabinet first.', 'لا يوجد ما يُصدَّر بعد - أضف خزانة أولًا.');

  /* ------- PDF: the A4 report sheet is portalled, the browser prints it (Save as PDF), then it is removed ------- */
  useEffect(() => {
    if (!reporting) return undefined;
    const prevTitle = document.title;
    const themed = document.querySelector('[data-theme]');
    const prevTheme = themed ? themed.getAttribute('data-theme') : null;
    let restored = false;
    document.documentElement.classList.add('nk-reporting'); // paper: no app background behind the sheet
    const restore = () => {
      if (restored) return; restored = true;
      document.documentElement.classList.remove('nk-reporting');
      document.title = prevTitle;
      if (themed && prevTheme != null) themed.setAttribute('data-theme', prevTheme);
      setReporting(false);
    };
    window.addEventListener('afterprint', restore);
    const t = setTimeout(() => {
      try {
        document.title = `${safeName(model.title)}-production-report`; // the default file name in "Save as PDF"
        if (themed && prevTheme === 'dark') themed.setAttribute('data-theme', 'light'); // paper is white: print the light palette
        window.print();
      } catch (e) { /* ignore */ }
      if (!('onafterprint' in window)) setTimeout(restore, 600);
    }, 300);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', restore); restore(); };
  }, [reporting]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = (name, en, a) => { onLog(name); notify(L(en, a)); };
  const run = async (id) => {
    if (busy) return;
    const base = safeName(model.title);
    setOpen(false); setCfg(false);
    try {
      if (id === 'pdf') { setReporting(true); done('PDF', `Production report${unit === 'mm' && !ptag ? '' : ` (${uw}${ptag})`}: choose "Save as PDF" in the print dialog.`, `تقرير الإنتاج${unit === 'mm' && !ptag ? '' : ` (${uw}${ptag})`}: اختر "حفظ كـ PDF" في نافذة الطباعة.`); return; }
      setBusy(id);
      if (id === 'xlsx') {
        const { buildXLSX } = await import('./xlsxExport');
        const meta = reportMeta(model, scene, { lang, product, output });
        const cover = await coverDoc(store, model.title, ar);
        const x = buildXLSX({ model, bom, hardware, warnings, lang, meta, product, doc: cover, output });
        download(`${base}-cutting-list.xlsx`, x.bytes, MIME.xlsx);
        done('XLSX', `Excel cutting list exported (${bom.rows.length} rows, ${x.sheets.length} sheets, ${uw}${ptag}).`, `تم تصدير قائمة القص Excel (${bom.rows.length} صف، ${x.sheets.length} أوراق، ${uw}${ptag}).`);
      } else if (id === 'obj') {
        const { buildOBJ } = await import('./objExport');
        const o = buildOBJ(scene, { mtlName: `${base}.mtl`, title: model.title, product, props: props && hasProps, output });
        download(`${base}.obj`, o.obj, MIME.obj);
        setTimeout(() => download(`${base}.mtl`, o.mtl, MIME.mtl), 350);
        done('OBJ', `OBJ + MTL exported: ${o.stats.objects} parts, ${o.stats.faces} faces (${uw}${ptag}, Y-up). Keep both files together.`, `تم تصدير OBJ + MTL: ${o.stats.objects} قطعة، ${o.stats.faces} وجه (${uw}${ptag}، Y لأعلى). احتفظ بالملفين معًا.`);
      } else if (id === 'stl') {
        const { buildSTL } = await import('./stlExport');
        const s = buildSTL(scene, { title: model.title, product, props: props && hasProps, output });
        download(`${base}.stl`, s.bytes, MIME.stl);
        done('STL', `STL exported: ${s.triangles} triangles (${uw}${ptag}, Z-up).`, `تم تصدير STL: ${s.triangles} مثلث (${uw}${ptag}، Z لأعلى).`);
      } else if (id === '3dm') {
        const { build3DM } = await import('./rhino3dm');
        const r = build3DM(scene, { title: model.title, product, props: props && hasProps, output });
        download(`${base}.3dm`, r.bytes, MIME['3dm']);
        done('3DM', `Rhino 3DM exported: ${r.stats.objects} meshes (${uw}${ptag}, Z-up).`, `تم تصدير Rhino 3DM: ${r.stats.objects} شبكة (${uw}${ptag}، Z لأعلى).`);
      } else if (id === 'plan') {
        const { nestBOM, buildPlanDXF } = await import('./dxfPlan');
        const n = nestBOM(bom, sheet);
        download(`${base}-cutting-plan.dxf`, buildPlanDXF(n, { title: model.title, doc: docFor(store, model.title), output }), MIME.dxf);
        const extra = n.oversize.length ? L(` ${n.oversize.length} oversize piece(s) listed in the file notes.`, ` ${n.oversize.length} قطعة أكبر من اللوح مذكورة في ملاحظات الملف.`) : '';
        done('DXF plan', `DXF cutting plan exported: ${n.totalSheets} sheet(s) of ${dimText(n.sheetW, output)} × ${dimText(n.sheetH, output)} ${uw}, kerf ${dimText(n.kerf, output)} ${uw}.${extra}`, `تم تصدير خطة القص DXF: ${n.totalSheets} لوح بمقاس ${dimText(n.sheetW, output)} × ${dimText(n.sheetH, output)} ${uw}، سماكة المنشار ${dimText(n.kerf, output)} ${uw}.${extra}`);
      }
    } catch (e) {
      notify(L(`Export failed: ${e && e.message ? e.message : e}`, `فشل التصدير: ${e && e.message ? e.message : e}`));
    } finally { setBusy(''); }
  };
  const legacy = (kind) => { setOpen(false); setMore(false); onLegacy(kind); };
  const setS = (k, v) => { const next = { ...sheet, [k]: v === '' ? '' : fromUnit(Number(v), unit) }; setSheet(next); }; // typed in the output unit, kept in mm
  const commitSheet = () => { const c = cleanSheet(sheet); setSheet(c); saveSheet(c); };

  /* arrow keys move between the enabled items */
  const onKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...panel.current.querySelectorAll('[role="menuitem"]:not([disabled]),[role="menuitemradio"]')];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  };

  return (
    <div className="nk-menuwrap nk-xm-wrap" ref={wrap}>
      <button type="button" className="nk-hb" aria-haspopup="menu" aria-expanded={open} aria-label={L('Export', 'تصدير')} onClick={() => setOpen((o) => !o)} data-testid="export-menu"><Ic n="export" /><span className="nk-hb-t">{L('Export', 'تصدير')}</span></button>
      {open && (
        <div className="nk-xm" role="menu" aria-label={L('Export', 'تصدير')} ref={panel} onKeyDown={onKey} data-testid="export-panel">
          <button type="button" role="menuitem" className="nk-ou-sum" aria-expanded={ouOpen} aria-controls="nk-xm-output" onClick={() => setOuOpen((o) => !o)} data-testid="export-output-toggle" title={L('Output settings: units and precision for every export', 'إعدادات المخرجات: الوحدات والدقة لكل تصدير')}>
            <span className="nk-ou-sum-t"><span className="nk-ou-sum-n">{L('Output settings', 'إعدادات المخرجات')}</span>
              <span className="nk-ou-sum-v" dir="ltr" data-testid="export-output-summary">{un.en.toUpperCase()} · {PRECISION_LABEL[output.precision][0].toUpperCase()} · {PRECISION_INFO[output.precision].points}{PRECISION_INFO[output.precision].plus ? '+' : ''} pts</span></span>
            <Ic n="params" size={16} />
          </button>
          {ouOpen && <div id="nk-xm-output" className="nk-ou-pop"><OutputSettings lang={lang} variant="menu" testid="export-output" eyebrow={false} /></div>}
          <Item lang={lang} busy={busy} run={run} id="pdf" testid="export-pdf" en="PDF Production Report" a="تقرير الإنتاج PDF" off={empty} why={emptyWhy} />
          <Item lang={lang} busy={busy} run={run} id="xlsx" testid="export-xlsx" en="Excel Cutting List" a="قائمة القص Excel" off={empty} why={emptyWhy} />
          <div className="nk-xm-sep" role="separator" />
          <Item lang={lang} busy={busy} run={run} id="obj" testid="export-obj" en="OBJ 3D Model" a="نموذج ثلاثي الأبعاد OBJ" off={empty} why={emptyWhy} />
          <Item lang={lang} busy={busy} run={run} id="stl" testid="export-stl" en="STL 3D Model" a="نموذج ثلاثي الأبعاد STL" off={empty} why={emptyWhy} />
          <Item lang={lang} busy={busy} run={run} id="3dm" testid="export-3dm" en="Rhino 3DM Model" a="نموذج Rhino 3DM" off={empty || !THREE_DM_ENABLED}
            why={!THREE_DM_ENABLED ? L('Coming soon', 'قريبًا') : emptyWhy}
            sub={L(`Beta · mesh, ${un.en}, Z up`, `تجريبي · شبكة، ${un.ar}، Z لأعلى`)} tip={L(`Written by ${appName(product)} in the openNURBS 3dm layout and read back with the openNURBS toolkit; not yet confirmed in the Rhino application.`, `يكتبه ${appName(product, true)} بتنسيق openNURBS 3dm وتمت قراءته بمكتبة openNURBS؛ لم يُختبر بعد داخل برنامج Rhino.`)} />
          {hasProps && (
            <label className="nk-xm-chk" data-testid="export-props">
              <input type="checkbox" role="menuitemcheckbox" aria-checked={!!props} checked={props} onChange={(e) => setProps(e.target.checked)} />
              <span className="nk-xm-t"><span className="nk-xm-n">{L('Include props', 'تضمين الإكسسوارات المعروضة')}</span><span className="nk-xm-s">{L(...(reg && reg.propsNote ? reg.propsNote : ['Display props in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'عناصر العرض في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.']))}</span></span>
            </label>
          )}
          <div className="nk-xm-sep" role="separator" />
          <div className="nk-xm-row">
            <Item lang={lang} busy={busy} run={run} id="plan" testid="export-dxf-plan" en="DXF Cutting Plan" a="خطة القص DXF" off={empty} why={emptyWhy} sub={<><bdi dir="ltr">{shownU(sheet.sheetW)} × {shownU(sheet.sheetH)} {un.en}</bdi> · {L('kerf', 'منشار')} <bdi dir="ltr">{shownU(sheet.kerf)}</bdi></>} />
            <button type="button" role="menuitem" className="nk-xm-cfg" aria-expanded={cfg} aria-label={L('Sheet size and kerf', 'مقاس اللوح وسماكة المنشار')} data-tip={L('Sheet size and kerf', 'مقاس اللوح وسماكة المنشار')} onClick={() => setCfg((c) => !c)} data-testid="export-plan-cfg"><Ic n="params" size={16} /></button>
          </div>
          {cfg && (
            <div className="nk-xm-sheet" role="group" aria-label={L('Cutting plan sheet', 'لوح خطة القص')} data-testid="export-plan-sheet">
              {[['sheetW', L('Sheet W', 'عرض اللوح'), SHEET_LIMITS.sheet], ['sheetH', L('Sheet H', 'ارتفاع اللوح'), SHEET_LIMITS.sheet], ['kerf', L('Kerf', 'المنشار'), SHEET_LIMITS.kerf]].map(([k, lab, lim]) => (
                <label key={k} className="nk-xm-f"><span>{lab}</span>
                  <input type="number" inputMode="decimal" dir="ltr" min={shownU(lim[0])} max={shownU(lim[1])} step={unit === 'in' ? '0.125' : unit === 'cm' ? '0.1' : '1'} value={sheet[k] === '' ? '' : shownU(sheet[k])} onChange={(e) => setS(k, e.target.value)} onBlur={commitSheet} onKeyDown={(e) => { if (e.key === 'Enter') { commitSheet(); e.stopPropagation(); } }} aria-label={lab} />
                </label>
              ))}
              <span className="nk-xm-u">{un.en}</span>
            </div>
          )}
          <div className="nk-xm-sep" role="separator" />
          <button type="button" role="menuitem" className="nk-xm-more" aria-expanded={more} aria-controls="nk-xm-more" onClick={() => setMore((m) => !m)} data-testid="export-more"><span>{L('More', 'المزيد')}</span><Ic n="down" size={16} /></button>
          {more && (
            <div id="nk-xm-more" className="nk-xm-moreg">
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" onClick={() => legacy('json')} data-testid="export-json"><span className="nk-xm-t"><span className="nk-xm-n">{L('Project JSON', 'مشروع JSON')}</span></span></button>
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" disabled={empty} title={empty ? emptyWhy : undefined} onClick={() => legacy('csv')} data-testid="export-csv"><span className="nk-xm-t"><span className="nk-xm-n">{L('Cut list CSV', 'قائمة القص CSV')}</span></span></button>
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" disabled={empty} title={empty ? emptyWhy : undefined} onClick={() => legacy('dxf')} data-testid="export-dxf"><span className="nk-xm-t"><span className="nk-xm-n">{L('DXF Elevation (R12)', 'واجهات DXF (R12)')}</span></span></button>
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" disabled={empty} title={empty ? emptyWhy : undefined} onClick={() => legacy('print')} data-testid="export-print"><span className="nk-xm-t"><span className="nk-xm-n">{L('Print cutting list / elevations', 'طباعة قائمة القص / الواجهات')}</span></span></button>
            </div>
          )}
          <button type="button" role="menuitem" className="nk-xm-more" onClick={() => { setOpen(false); setMore(false); openSettings(); }} data-testid="export-doc-settings"><span>{L('Production document settings… (logo, project, QR)', 'إعدادات مستندات الإنتاج… (الشعار والمشروع وQR)')}</span><Ic n="params" size={16} /></button>
          <div className="nk-xm-foot" title={log.join('\n') || L('No exports yet', 'لا توجد تصديرات بعد')} data-testid="export-count">{L('Exports this session', 'تصديرات هذه الجلسة')}: {log.length}</div>
        </div>
      )}
      <DocSettingsDialog lang={lang} />
      {reporting && typeof document !== 'undefined' && createPortal(
        <PdfReportSheet model={model} scene={scene} bom={bom} hardware={hardware} warnings={warnings} lang={lang} unit={unit} output={output} ui={ui} date={new Date()} product={product} drawing={drawing} doc={docFor(store, model.title)} />,
        document.body,
      )}
    </div>
  );
}

/* [WEB-STUDIO 2026-10-31] customers get the export menu only when the admin turns factory outputs on */
export default function ExportMenu(props) { useStudio(); return wsShowFactory() ? <ExportMenuInner {...props} /> : null; }
