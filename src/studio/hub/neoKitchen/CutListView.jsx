/* Neo Kitchen Designer - "Production -> Cutting List" screen: live metrics, material cards, a warnings panel
 * (de-duplicated, from the real validation rules), a sticky-header scrolling table, hardware and the price estimate.
 * Area convention (ONE, everywhere): m2 of a row = qty x largest face of the cut part (two largest dimensions).
 * All styling lives in cutListPro.css (scoped under .nk, owner palette as --nk-cl-* custom properties). */
import React, { useMemo, useEffect } from 'react';
import { BOARD } from './constants';
import { Badge } from './ui';
import { partNameAr, noteAr, noteEn } from './cutlist';
import { normName } from './materials';
import { productInfo } from './productInfo';
import { useOutput } from './OutputSettingsControl';
import { dimText } from './outputSettings';
import { proRows } from './clParts';
import { hwIconSvg } from './clPics';
import ProCutList from './ProCutList';
import { useDocStore, attach } from './docStore';
import { download, safeName } from './exporters';
import { reportMeta } from './pdfReport';
import { coverDoc } from './docCover';
import './cutListPro.css';

const RUN_NAME = { main: ['Main', 'الرئيسي'], left: ['Left', 'الأيسر'], right: ['Right', 'الأيمن'], run2: ['Run 2', 'الصف ٢'], pen: ['Peninsula', 'الجزيرة الممتدة'], isl: ['Island', 'الجزيرة'] };

const TEXT = { nameAr: partNameAr, noteAr, noteEn };

/** `product` (optional): 'wardrobe' says closet / wardrobe where the kitchen text says kitchen / run / cabinet; omitted = the kitchen screen, unchanged.
 *  [NEO-CUTLIST-UX32] optional: `scene` (drilling, hardware and the picture in its cabinet), `user` (id: the table view is saved per user), `onPick(row)` (show the
 *  part in the drawing / 3D), `notify(text)`, `hwImages` ({ hardwareKey: imagePath } from the Hub inventory). `compact` (the print sheet) keeps the simple table. */
export default function CutListView({ bom, hardware, warnings, est, prices, lang, unit, onExport, model, compact, product, priceNote, scene, user, onPick, notify, hwImages }) {
  const ar = lang === 'ar';
  const wd = product === 'wardrobe';
  const cu = product === 'custom'; // [NEO-CUSTOM-UX28] custom furniture: no run / cabinet wording, per-row Arabic names + notes, no nominal footer
  const reg = productInfo(product); const cat = !!reg && !wd && !cu; // another registered product (bathroom, laundry, TV, office): its own nouns, kitchen layout
  const runName = (k) => (wd ? (k === 'main' ? ['Main unit', 'الوحدة الرئيسية'] : ['Return wing', 'الجناح الجانبي']) : cat && reg.runNames && reg.runNames[k] ? reg.runNames[k] : RUN_NAME[k] || [k, k]);
  const L = (en, a) => (ar ? a : en);
  const empty = bom.rows.length === 0;
  const [stored] = useOutput(); // [NEO-OUTPUT-UX34] sizes follow the Output setting (unit prop first, precision + fractions from the shared setting)
  const O = { ...stored, unit: unit === 'in' || unit === 'cm' || unit === 'mm' ? unit : stored.unit };
  const mm = (v) => dimText(v, O);
  const u = O.unit;
  const namedKeys = Object.keys(bom.named).filter((k) => !Object.values(BOARD).some((b) => b.en === k));
  const nominal = bom.nominal || [];
  const eb = model ? model.g.edgeBand : 0;
  const store = useDocStore();
  const title = (model && model.title) || '';
  useEffect(() => { if (!compact) attach({ user: user || '', product: product || 'kitchen', title }); }, [compact, user, product, title]);
  const rows = useMemo(() => (compact ? null : proRows(bom, { product, scene, model, tol: store.opts.tolerance, runLabel: (k) => runName(k)[ar ? 1 : 0] })), [compact, bom, product, scene, model, store.opts.tolerance, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const hwList = useMemo(() => hardware.map((h) => ({ ...h, image: hwImages && hwImages[h.k] })), [hardware, hwImages]);
  const exportXlsxView = async ({ rows: rs, cols }) => {
    try {
      const { buildXLSX } = await import('./xlsxExport');
      const { rasterizeSvgs } = await import('./clRaster');
      const { isoPicSvg, PAL_PRINT } = await import('./clPics');
      const meta = scene ? reportMeta(model, scene, { lang, product }) : {};
      const pics = cols.some((c) => c.id === 'pic') ? await rasterizeSvgs(rs.map((r) => isoPicSvg(r, { scene, size: 64, pal: PAL_PRINT, key: 'xlsx' })), 96) : null;
      const x = buildXLSX({ model, bom, hardware, warnings, lang, meta, product, doc: await coverDoc(store, title, ar), pro: { rows: rs, cols, ctx: { ar, ...TEXT }, pics } });
      download(`${safeName(title)}-cutting-list-view.xlsx`, x.bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (notify) notify(ar ? `تم تصدير Excel (${rs.length} صف${pics ? '، مع الصور' : ''}).` : `Excel exported (${rs.length} rows${pics ? ', with pictures' : ''}).`);
    } catch (e) { if (notify) notify(ar ? `فشل التصدير: ${e.message}` : `Export failed: ${e.message}`); }
  };
  return (
    <div className={`nk-cut nk-cl ${compact ? 'nk-cl--compact nk-cut-print' : ''}`}>
      <div className="nk-cl-panel">
        <div className="nk-cl-head">
          <div>
            <div className="nk-cl-eyebrow">{L('PRODUCTION', 'الإنتاج')}</div>
            <h2 className="nk-cl-h2">{L('Cutting List', 'قائمة القص')}</h2>
            {model && <div className="nk-cl-sub">{model.title}</div>}
          </div>
          <div className="nk-cl-metrics" role="group" aria-label={L('Totals', 'الإجماليات')}>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('PIECES', 'قطع')}</div><div className="nk-cl-mv nk-cl-blue" data-testid="pieces">{bom.pieces}</div></div>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('BOARD M²', 'م² ألواح')}</div><div className="nk-cl-mv nk-cl-teal" data-testid="area">{bom.boardArea.toFixed(2)}</div></div>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('UNIQUE PARTS', 'قطع فريدة')}</div><div className="nk-cl-mv nk-cl-orange" data-testid="unique">{bom.unique}</div></div>
          </div>
        </div>

        {bom.cards.length > 0 && (
          <div className="nk-cl-cards" data-testid="mat-cards">
            {bom.cards.map((c) => (
              <div key={c.k} className="nk-cl-card" data-k={c.k}><div className="nk-cl-card-t">{BOARD[c.k][lang]}</div><div className="nk-cl-card-s" dir="ltr">{c.pcs} pcs · {c.m2.toFixed(2)} m²</div></div>
            ))}
          </div>
        )}
        {namedKeys.length > 0 && (
          <div className="nk-cl-named">
            <span className="nk-cl-eyebrow">{L('PRODUCTION MATERIALS', 'مواد الإنتاج')}</span>
            {namedKeys.map((k) => { const e = model && model.matMap && model.matMap[normName(k)]; return <span key={k} className="nk-cl-badge" dir="ltr">{k} · {bom.named[k].pcs} pcs · {bom.named[k].m2.toFixed(2)} m²{e ? ` · ${e.sku || e.id}` : ''}</span>; })}
          </div>
        )}

        {warnings.length > 0 && (
          <section className="nk-cl-warn" role="status" aria-live="polite" aria-label={L('Warnings', 'تنبيهات')} data-testid="warnings">
            <div className="nk-cl-warn-h">{L('WARNINGS', 'تنبيهات')} · {warnings.length}</div>
            <ul className="nk-cl-warn-l">{warnings.map((w) => <li key={w.id}>{w[lang]}</li>)}</ul>
          </section>
        )}

        {!compact && (
          <div className="nk-cl-actions">
            <button type="button" className="nk-btn" disabled={empty} onClick={() => onExport('csv')}>⤓ CSV</button>
            <button type="button" className="nk-btn" disabled={empty} onClick={() => onExport('dxf')}>⤓ DXF</button>
            <button type="button" className="nk-btn" onClick={() => onExport('json')}>⤓ JSON</button>
            <button type="button" className="nk-btn" disabled={empty} onClick={() => onExport('print')}>🖨 {L('Print / PDF', 'طباعة / PDF')}</button>
          </div>
        )}

        {empty ? (
          <div className="nk-cl-empty" data-testid="cut-empty">
            <b>{L('Nothing to cut yet', 'لا يوجد ما يُقص بعد')}</b>
            <span>{cu ? L('Add a panel, a leg or a drawer to the piece and its parts will be listed here, with sizes, quantities and board area.', 'أضف لوحًا أو رجلًا أو درجًا إلى القطعة وستظهر أجزاؤها هنا مع المقاسات والكميات ومساحة الألواح.') : cat ? L(`Add a unit to the ${reg.noun[0].toLowerCase()} and its panels will be listed here, with sizes, quantities and board area.`, `أضف وحدة إلى ${reg.noun[1]} وستظهر ألواحها هنا مع المقاسات والكميات ومساحة الألواح.`) : wd ? L('Add a column to the wardrobe and its panels will be listed here, with sizes, quantities and board area.', 'أضف عمودًا إلى الخزانة وستظهر ألواحها هنا مع المقاسات والكميات ومساحة الألواح.') : L('Add a cabinet to a run and its panels will be listed here, with sizes, quantities and board area.', 'أضف خزانة إلى صف وستظهر ألواحها هنا مع المقاسات والكميات ومساحة الألواح.')}</span>
          </div>
        ) : compact ? (
          <div className="nk-cl-scroll" tabIndex={0} role="region" aria-label={L('Cutting list table', 'جدول قائمة القص')}>
            <table className="nk-cl-table" data-testid="cut-table">
              <caption className="nk-sr">{L('Cut list', 'قائمة القص')}</caption>
              <thead>
                <tr>
                  <th scope="col" className="nk-cl-c">#</th><th scope="col" className="nk-cl-start">{L('COMPONENT', 'المكوّن')}</th>
                  <th scope="col">W <i>{u}</i></th><th scope="col">D <i>{u}</i></th><th scope="col">H <i>{u}</i></th>
                  <th scope="col" className="nk-cl-qtyh">{L('QTY', 'العدد')}</th><th scope="col" className="nk-cl-start">{L('MATERIAL', 'المادة')}</th><th scope="col">M²</th>
                </tr>
              </thead>
              <tbody>
                {bom.rows.map((r) => {
                  const detail = [
                    `${L('Cut', 'قص')} ${mm(r.cut.L)} × ${mm(r.cut.W)} × ${mm(r.cut.T)}`,
                    r.edges ? `${L('Edges', 'حواف')} ${r.edges}` : '',
                    r.grain && r.grain !== '-' ? `${L('Grain', 'عرق')} ${r.grain}` : '',
                    r.maps.length ? `${L('Map', 'خريطة')} ${r.maps.slice(0, 4).join(' ')}` : '',
                  ].filter(Boolean).join(' · ');
                  return (
                    <tr key={r.key}>
                      <td className="nk-cl-c nk-cl-mute">{String(r.no).padStart(2, '0')}</td>
                      <td className="nk-cl-start">
                        <div className="nk-cl-pname">{ar ? (r.nameAr || partNameAr(r.name)) : r.name}</div>
                        {r.note && <div className="nk-cl-pnote" dir={ar ? 'rtl' : 'ltr'}>{ar ? (r.noteAr || noteAr(r.note)) : noteEn(r.note)}</div>}
                        <div className="nk-cl-pcut" dir={ar ? 'rtl' : 'ltr'}>{detail}</div>
                      </td>
                      <td>{mm(r.w)}</td><td>{mm(r.d)}</td><td>{mm(r.h)}</td>
                      <td className="nk-cl-qty">{r.qty}</td>
                      <td className="nk-cl-start"><span className="nk-cl-mat" dir="auto">{r.matName === BOARD[r.mat].en ? BOARD[r.mat][lang] : r.matName}</span>{(() => { const e = model && model.matMap && model.matMap[normName(r.matName)]; return e ? <small className="nk-cl-inv" dir="ltr" title={e.name}>{e.sku || e.id}</small> : null; })()}</td>
                      <td>{r.area.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><th scope="row" colSpan={5} className="nk-cl-start">{L('Total', 'الإجمالي')}</th><td className="nk-cl-qty">{bom.pieces}</td><td /><td>{bom.boardArea.toFixed(2)}</td></tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <ProCutList bom={bom} rows={rows} hardware={hwList} model={model} scene={scene} lang={lang} unit={unit} product={product} user={user || ''} onPick={onPick} notify={notify} text={TEXT} title={title} onExportXlsx={exportXlsxView} />
        )}
        <p className="nk-cl-foot" data-testid="cut-foot">
          <b>{L('Area:', 'المساحة:')}</b> {L('M² = quantity × the largest face of the cut part (the product of its two largest dimensions), in m². Cards, metrics, table and exports all use this one rule; the table shows 3 decimals, totals 2.', 'م² = العدد × أكبر وجه للقطعة المقصوصة (حاصل أكبر بعدين) بالمتر المربع. البطاقات والمؤشرات والجدول والتصدير تستخدم هذه القاعدة وحدها؛ الجدول بثلاث خانات عشرية والإجماليات بخانتين.')}
          {nominal.length > 0 && (
            <>
              {' '}<b>{L('Nominal module sizes (as designed):', 'مقاسات الوحدات الاسمية (كما صُمّمت):')}</b>{' '}
              <span dir="ltr">{nominal.map((n) => `${runName(n.key)[ar ? 1 : 0]}: ${mm(n.base)}${n.wall ? ` / ${mm(n.wall)}` : ''}${n.top ? ` / ${mm(n.top)}` : ''} ${u}`).join(' · ')}</span>
              {' '}{cat ? L('(total width of the units). W, D and H above are the actual panel sizes from the design engine; Cut = after deducting', '(إجمالي عرض الوحدات). W وD وH أعلاه هي مقاسات الألواح الفعلية من محرك التصميم؛ القص = بعد خصم') : wd ? L('(total width of the columns). W, D and H above are the actual panel sizes from the design engine; Cut = after deducting', '(إجمالي عرض الأعمدة). W وD وH أعلاه هي مقاسات الألواح الفعلية من محرك التصميم؛ القص = بعد خصم') : L('(base / wall / top). W, D and H above are the actual panel sizes from the design engine; Cut = after deducting', '(سفلي / علوي / ثالث). W وD وH أعلاه هي مقاسات الألواح الفعلية من محرك التصميم؛ القص = بعد خصم')} <span dir="ltr">{eb} mm</span> {L('edge banding per banded edge.', 'لشريط الحواف على كل حافة مشطوبة.')}
            </>
          )}
        </p>
      </div>
      <div className="nk-cl-below">
        <div className="nk-cut-cols">
          <section className="nk-card nk-card-flat">
            <div className="nk-eyebrow">{L('HARDWARE', 'الاكسسوارات')}</div>
            <table className="nk-table nk-table-sm">
              <tbody>{hwList.map((h) => <tr key={h.k}><td className="nk-td-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: hwIconSvg(h.k, { size: 24, image: h.image }) }} /><td className="nk-td-name">{h[lang]}</td><td className="nk-mono nk-qty">{h.qty}</td></tr>)}</tbody>
            </table>
            <div className="nk-sub">{L('Edge banding', 'شريط الحواف')}: <span dir="ltr">{bom.edgeMetres.toFixed(1)} m</span> · {model ? model.g.edgeBand : 0} mm</div>
          </section>
          {est && (
            <section className="nk-card nk-card-flat" aria-label={L('Price estimate', 'تقدير السعر')}>
              <div className="nk-eyebrow">{L('PRICE ESTIMATE', 'تقدير السعر')} <Badge>{L('NEW', 'جديد')}</Badge></div>
              <table className="nk-table nk-table-sm">
                <tbody>
                  {est.lines.filter((l) => l.amount > 0).map((l) => <tr key={l.k}><td className="nk-td-name">{l[lang]}</td><td className="nk-mono" dir="ltr">{l.amount.toFixed(3)}</td></tr>)}
                  <tr><td className="nk-td-name">{L('Subtotal', 'المجموع الفرعي')}</td><td className="nk-mono" dir="ltr">{est.sub.toFixed(3)}</td></tr>
                  <tr><td className="nk-td-name">{L('Labour', 'العمالة')} {prices.labourPct}%</td><td className="nk-mono" dir="ltr">{est.labour.toFixed(3)}</td></tr>
                  <tr><td className="nk-td-name">{L('VAT', 'ضريبة')} {prices.vatPct}%</td><td className="nk-mono" dir="ltr">{est.vat.toFixed(3)}</td></tr>
                  <tr className="nk-total"><td className="nk-td-name">{L('Total', 'الإجمالي')} ({prices.currency})</td><td className="nk-mono" dir="ltr" data-testid="total">{est.total.toFixed(3)}</td></tr>
                </tbody>
              </table>
              <div className="nk-sub" data-testid="price-note">{priceNote ? L(priceNote[0], priceNote[1]) : L('Placeholder prices: edit them in Project → Prices (kept in this browser only).', 'أسعار تقريبية: عدّلها من المشروع ← الأسعار (تُحفظ في هذا المتصفح فقط).')}</div>
            </section>
          )}
        </div>
        <div className="nk-cl-foot nk-cl-layers">{cu ? L('Layer toggles hide parts in the drawings only; the cut list always lists the whole piece.', 'مفاتيح الطبقات تخفي الأجزاء من الرسومات فقط؛ قائمة القص تشمل القطعة كاملة.') : cat ? L(`Layer toggles hide parts in the drawings only; the cut list always lists the whole ${reg.noun[0].toLowerCase()}.`, `مفاتيح الطبقات تخفي الأجزاء من الرسومات فقط؛ قائمة القص تشمل ${reg.noun[1]} كاملة.`) : wd ? L('Layer toggles hide parts in the drawings only; the cut list always lists the whole wardrobe (closet).', 'مفاتيح الطبقات تخفي الأجزاء من الرسومات فقط؛ قائمة القص تشمل الخزانة كاملة.') : L('Layer toggles hide parts in the drawings only; the cut list always lists the whole kitchen.', 'مفاتيح الطبقات تخفي الأجزاء من الرسومات فقط؛ قائمة القص تشمل المطبخ كاملًا.')}</div>
      </div>
    </div>
  );
}
