/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - the Export menu of the door header: the Neo Kitchen floating panel (exportMenu.css, `.nk-xm-*`) with the
 * door's own entries: PDF Production Report (the browser prints the A4 sheet), Cut List CSV (opens in Excel), OBJ 3D Model | DXF Leaf for CNC,
 * and a "More" group (Project JSON, Price lines CSV). Every file is built by the pure writers in doorExports.js from the same engine result as the screen.
 * ===========================================================================*/
import { wsShowFactory } from '../wsFlags'; import { useStudio } from '../../studioStore'; // [WEB-STUDIO]
import React, { useState, useRef, useCallback } from 'react';
import { Ic } from '../neoKitchen/icons';
import { useDismiss } from '../neoKitchen/ui';
import OutputSettings, { useOutput } from '../neoKitchen/OutputSettingsControl';
import { UNIT_INFO, PRECISION_LABEL, PRECISION_INFO } from '../neoKitchen/outputSettings';
import '../neoKitchen/exportMenu.css';

function Item({ id, en, a, sub, lang, run, testid }) {
  return (
    <button type="button" role="menuitem" className="nk-xm-i" onClick={() => run(id)} data-testid={testid} data-fmt={id}>
      <span className="nk-xm-ic"><Ic n="download" size={18} /></span>
      <span className="nk-xm-t"><span className="nk-xm-n">{lang === 'ar' ? a : en}</span>{sub ? <span className="nk-xm-s">{sub}</span> : null}</span>
    </button>
  );
}

function DoorExportMenuInner({ lang, onExport, log }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] units + precision for every export below
  const [ouOpen, setOuOpen] = useState(false);
  const un = UNIT_INFO[output.unit];
  const wrap = useRef(null); const panel = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrap);
  const run = (id) => { setOpen(false); setMore(false); onExport(id); };
  const onKey = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...panel.current.querySelectorAll('[role="menuitem"]:not([disabled]),[role="menuitemradio"]')]; if (!items.length) return;
    e.preventDefault(); const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  };
  return (
    <div className="nk-menuwrap nk-xm-wrap" ref={wrap}>
      <button type="button" className="nk-hb" aria-haspopup="menu" aria-expanded={open} aria-label={L('Export', 'تصدير')} onClick={() => setOpen((o) => !o)} data-testid="export-menu"><Ic n="export" /><span className="nk-hb-t">{L('Export', 'تصدير')}</span></button>
      {open && (
        <div className="nk-xm" role="menu" aria-label={L('Export', 'تصدير')} ref={panel} onKeyDown={onKey} data-testid="export-panel">
          <button type="button" role="menuitem" className="nk-ou-sum" aria-expanded={ouOpen} aria-controls="nkd-xm-output" onClick={() => setOuOpen((o) => !o)} data-testid="export-output-toggle" title={L('Output settings: units and precision for every export', 'إعدادات المخرجات: الوحدات والدقة لكل تصدير')}>
            <span className="nk-ou-sum-t"><span className="nk-ou-sum-n">{L('Output settings', 'إعدادات المخرجات')}</span>
              <span className="nk-ou-sum-v" dir="ltr" data-testid="export-output-summary">{un.en.toUpperCase()} · {PRECISION_LABEL[output.precision][0].toUpperCase()} · {PRECISION_INFO[output.precision].points}{PRECISION_INFO[output.precision].plus ? '+' : ''} pts</span></span>
            <Ic n="params" size={16} />
          </button>
          {ouOpen && <div id="nkd-xm-output" className="nk-ou-pop"><OutputSettings lang={lang} variant="menu" testid="export-output" eyebrow={false} /></div>}
          <Item lang={lang} run={run} id="pdf" testid="export-pdf" en="PDF Production Report" a="تقرير الإنتاج PDF" sub={L('Drawing, cut list, hardware, price', 'الرسم وقائمة القص والاكسسوار والسعر')} />
          <Item lang={lang} run={run} id="csv" testid="export-csv" en="Cut List (Excel / CSV)" a="قائمة القص (Excel / CSV)" sub={L('Opens in Excel', 'تُفتح في Excel')} />
          <div className="nk-xm-sep" role="separator" />
          <Item lang={lang} run={run} id="obj" testid="export-obj" en="OBJ 3D Model" a="نموذج ثلاثي الأبعاد OBJ" sub={L(`Closed door, ${un.en}, Y up`, `الباب مغلقًا، ${un.ar}، Y لأعلى`)} />
          <div className="nk-xm-sep" role="separator" />
          <Item lang={lang} run={run} id="dxf" testid="export-dxf" en="DXF Leaf for CNC" a="ضلفة DXF للـ CNC" sub={L(`Bores, hinge recesses, lock prep (R12, ${un.en})`, `الثقوب وتجاويف المفصلات وتجهيز القفل (R12، ${un.ar})`)} />
          <div className="nk-xm-sep" role="separator" />
          <button type="button" role="menuitem" className="nk-xm-more" aria-expanded={more} aria-controls="nkd-xm-more" onClick={() => setMore((m) => !m)} data-testid="export-more"><span>{L('More', 'المزيد')}</span><Ic n="down" size={16} /></button>
          {more && (
            <div id="nkd-xm-more" className="nk-xm-moreg">
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" onClick={() => run('json')} data-testid="export-json"><span className="nk-xm-t"><span className="nk-xm-n">{L('Project JSON', 'مشروع JSON')}</span></span></button>
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" onClick={() => run('price')} data-testid="export-price"><span className="nk-xm-t"><span className="nk-xm-n">{L('Price lines CSV (placeholder rates)', 'بنود السعر CSV (أسعار تقريبية)')}</span></span></button>
              <button type="button" role="menuitem" className="nk-xm-i nk-xm-i2" onClick={() => run('print')} data-testid="export-print"><span className="nk-xm-t"><span className="nk-xm-n">{L('Print drawing + cut list', 'طباعة الرسم وقائمة القص')}</span></span></button>
            </div>
          )}
          <div className="nk-xm-foot" title={log.join('\n') || L('No exports yet', 'لا توجد تصديرات بعد')} data-testid="export-count">{L('Exports this session', 'تصديرات هذه الجلسة')}: {log.length}</div>
        </div>
      )}
    </div>
  );
}

/* [WEB-STUDIO 2026-10-31] customers get the export menu only when the admin turns factory outputs on */
export default function DoorExportMenu(props) { useStudio(); return wsShowFactory() ? <DoorExportMenuInner {...props} /> : null; }
