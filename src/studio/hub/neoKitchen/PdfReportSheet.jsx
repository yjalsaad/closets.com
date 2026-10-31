/* Neo Kitchen Designer - the PDF Production Report as an A4 print sheet (portalled by ExportMenu; the browser's
 * "Save as PDF" turns it into the file, which is what gives true Arabic shaping / RTL and VECTOR elevations).
 * Pages: cover + material summary + warnings, full cut list (header repeats on every page), hardware, one elevation
 * page per run (the same SVG the Design view draws, non-interactive). All numbers come from reportData() = the cut list. */
import React from 'react';
import { reportData } from './pdfReport';
import { appName, productInfo } from './productInfo';
import Elevation from './Elevation';
import { normalizeOutput, dimText, isDefaultOutput, PRECISION_LABEL } from './outputSettings';
import { proRows } from './clParts';
import { isoPicSvg, PAL_PRINT } from './clPics';
import { titleBlockHtml, TB_CSS } from './docPrint';
import './exportMenu.css';

const ALL_LAYERS = { base: true, wall: true, top: true, counter: true, plinth: true, doors: true, hardware: true };

/** `product` (optional): 'wardrobe' retitles the cover and drops the worktop row; omitted = the kitchen report, unchanged */
/** `drawing` (optional, custom furniture): (lang) => node, replaces the kitchen elevation pages with the product's own technical drawing sheet */
/** [NEO-CUTLIST-UX32] `doc` ({ project, company, opts } from docStore.docFor): a CAD title block (logo, company, project fields, sheet X of Y, scale, revision, QR) on every page,
 *  a Part ID + Picture column in the cut list. Without `doc` the report is byte-for-byte what UX-19 printed. */
export default function PdfReportSheet({ model, scene, bom, hardware, warnings, lang, unit, output, ui, date, product, drawing, doc, pics = true }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const d = reportData({ model, scene, bom, hardware, warnings, lang, date, product });
  const O = normalizeOutput(output || { unit: unit === 'in' || unit === 'cm' ? unit : 'mm' }); // [NEO-OUTPUT-UX34] units / precision / fractions of every size on the sheet
  const u = O.unit;
  const mm = (v) => dimText(v, O);
  const pro = doc ? proRows(bom, { scene, model, product, tol: doc.opts.tolerance }) : null;
  const nPages = 3 + (drawing ? 1 : scene.runs.length);
  const tb = (n, title) => (doc && doc.opts.titleBlock !== false ? <div className="nk-rep-tb" dangerouslySetInnerHTML={{ __html: titleBlockHtml(doc, { title, sheet: n, of: nPages, lang, portrait: true, compact: n > 1, fallbackName: model.title }) }} /> : null);
  const eui = { ...(ui || {}), dims: true, xray: false, openDoors: false, openIds: new Set(), internal: false, map: false, center: false, isolate: null, layers: ALL_LAYERS };
  return (
    <div className="nk-rep-root" dir={ar ? 'rtl' : 'ltr'} lang={lang} data-testid="report-sheet">
      <div className="nk nk-rep">
        {doc && <style>{TB_CSS}</style>}
        <section className="nk-rep-page nk-rep-cover">
          {tb(1, L('PRODUCTION REPORT', 'تقرير الإنتاج'))}
          <div className="nk-rep-eyebrow">{L(`${appName(product).toUpperCase()} · PRODUCTION REPORT`, `${appName(product, true)} · تقرير الإنتاج`)}</div>
          <h1 className="nk-rep-title" data-testid="report-title">{d.meta.title}</h1>
          <dl className="nk-rep-facts">
            <div><dt>{L('Date', 'التاريخ')}</dt><dd>{d.meta.date}</dd></div>
            <div><dt>{L('Layout', 'التخطيط')}</dt><dd>{d.meta.layout}</dd></div>
            <div><dt>{L('Overall size (W × D × H)', 'الأبعاد الكلية (ع × ع × ا)')}</dt><dd dir="ltr">{`${mm(d.meta.overallMm.w)} × ${mm(d.meta.overallMm.d)} × ${mm(d.meta.overallMm.h)} ${u}`}</dd></div>
            <div><dt>{L('Finish', 'التشطيب')}</dt><dd>{d.meta.finish}</dd></div>
            {!isDefaultOutput(O) && <div><dt>{L('Output', 'المخرجات')}</dt><dd dir="ltr" data-testid="report-output">{u} · {PRECISION_LABEL[O.precision][ar ? 1 : 0]}{O.fraction ? ' · 1/16' : ''}</dd></div>}
            {product !== 'wardrobe' && !(productInfo(product) && productInfo(product).worktop === false) && <div><dt>{productInfo(product) && productInfo(product).worktop ? L(productInfo(product).worktop[0], productInfo(product).worktop[1]) : L('Worktop', 'سطح العمل')}</dt><dd>{d.meta.counter}</dd></div>}
          </dl>

          <h2 className="nk-rep-h2">{L('Material summary', 'ملخص المواد')}</h2>
          <div className="nk-rep-metrics" data-testid="report-metrics">
            <div><b data-testid="report-pieces">{d.metrics.pieces}</b><span>{L('PIECES', 'قطع')}</span></div>
            <div><b data-testid="report-area">{d.metrics.boardM2.toFixed(2)}</b><span>{L('BOARD M²', 'م² ألواح')}</span></div>
            <div><b data-testid="report-unique">{d.metrics.unique}</b><span>{L('UNIQUE PARTS', 'قطع فريدة')}</span></div>
            <div><b dir="ltr">{d.metrics.edgeMetres.toFixed(1)} m</b><span>{L('EDGE BANDING', 'شريط الحواف')}</span></div>
          </div>
          {d.cards.length > 0 && (
            <table className="nk-rep-table nk-rep-mat" data-testid="report-cards">
              <thead><tr><th scope="col" className="nk-rep-start">{L('Board class', 'فئة اللوح')}</th><th scope="col">{L('Pieces', 'قطع')}</th><th scope="col">M²</th></tr></thead>
              <tbody>{d.cards.map((c) => <tr key={c.k}><td className="nk-rep-start">{c.label}</td><td>{c.pcs}</td><td>{c.m2.toFixed(2)}</td></tr>)}</tbody>
            </table>
          )}
          {d.named.length > 0 && (
            <table className="nk-rep-table nk-rep-mat" data-testid="report-named">
              <thead><tr><th scope="col" className="nk-rep-start">{L('Production material', 'مادة الإنتاج')}</th><th scope="col">{L('Pieces', 'قطع')}</th><th scope="col">M²</th></tr></thead>
              <tbody>{d.named.map((c) => <tr key={c.name}><td className="nk-rep-start" dir="auto">{c.name}</td><td>{c.pcs}</td><td>{c.m2.toFixed(2)}</td></tr>)}</tbody>
            </table>
          )}

          <h2 className="nk-rep-h2">{L('Warnings', 'تنبيهات')} · {d.warnings.length}</h2>
          {d.warnings.length ? (
            <ul className="nk-rep-warn" data-testid="report-warnings">{d.warnings.map((w) => <li key={w.id}>{w.text}</li>)}</ul>
          ) : <p className="nk-rep-ok" data-testid="report-warnings">{L('No warnings - the design passes every check.', 'لا تنبيهات - التصميم يجتاز كل الفحوصات.')}</p>}
        </section>

        <section className="nk-rep-page">
          {tb(2, L('CUTTING LIST', 'قائمة القص'))}
          <h2 className="nk-rep-h2">{L('Cutting list', 'قائمة القص')}</h2>
          {d.rows.length === 0 ? <p>{L('Nothing to cut yet.', 'لا يوجد ما يُقص بعد.')}</p> : (
            <table className="nk-rep-table nk-rep-cut" data-testid="report-cut">
              <thead>
                <tr>
                  <th scope="col">#</th>{pro && <th scope="col">{L('Picture', 'الصورة')}</th>}{pro && <th scope="col" className="nk-rep-start">{L('Part ID', 'الرمز')}</th>}<th scope="col" className="nk-rep-start">{L('Component', 'المكوّن')}</th>
                  <th scope="col">W <i>{u}</i></th><th scope="col">D <i>{u}</i></th><th scope="col">H <i>{u}</i></th>
                  <th scope="col">{L('Qty', 'العدد')}</th><th scope="col" className="nk-rep-start">{L('Material', 'المادة')}</th><th scope="col">M²</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r, ri) => (
                  <tr key={r.no}>
                    <td>{String(r.no).padStart(2, '0')}</td>
                    {pro && pics && <td className="nk-rep-pic" dangerouslySetInnerHTML={{ __html: isoPicSvg(pro[ri], { scene, size: 30, pal: PAL_PRINT, key: 'print' }) }} />}
                    {pro && !pics && <td />}
                    {pro && <td className="nk-rep-start nk-rep-pid" dir="ltr">{pro[ri].pid}</td>}
                    <td className="nk-rep-start">
                      <div className="nk-rep-pn">{r.name}</div>
                      <div className="nk-rep-pd" dir={ar ? 'rtl' : 'ltr'}>{[`${L('Cut', 'قص')} ${mm(r.cut.L)} × ${mm(r.cut.W)} × ${mm(r.cut.T)}`, r.edges ? `${L('Edges', 'حواف')} ${r.edges}` : '', r.grain && r.grain !== '-' ? `${L('Grain', 'عرق')} ${r.grain}` : '', r.note].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>{mm(r.w)}</td><td>{mm(r.d)}</td><td>{mm(r.h)}</td><td>{r.qty}</td><td className="nk-rep-start" dir="auto">{r.material}</td><td>{r.area.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row" colSpan={pro ? 7 : 5} className="nk-rep-start">{L('Total', 'الإجمالي')}</th><td data-testid="report-total-qty">{d.metrics.pieces}</td><td /><td data-testid="report-total-area">{d.metrics.boardM2.toFixed(2)}</td></tr></tfoot>
            </table>
          )}
          <p className="nk-rep-foot">{L('M² = quantity × the largest face of the cut part (product of its two largest dimensions). Cut sizes are after the edge-band deduction.', 'م² = العدد × أكبر وجه للقطعة المقصوصة (حاصل أكبر بعدين). مقاسات القص بعد خصم شريط الحواف.')}</p>
        </section>

        <section className="nk-rep-page nk-rep-avoid">
          {tb(3, L('HARDWARE', 'الاكسسوارات'))}
          <h2 className="nk-rep-h2">{L('Hardware', 'الاكسسوارات')}</h2>
          <table className="nk-rep-table nk-rep-hw" data-testid="report-hw">
            <thead><tr><th scope="col" className="nk-rep-start">{L('Item', 'البند')}</th><th scope="col">{L('Qty', 'العدد')}</th></tr></thead>
            <tbody>{d.hardware.map((h) => <tr key={h.k}><td className="nk-rep-start">{h.text}</td><td>{h.qty}</td></tr>)}</tbody>
          </table>
        </section>

        {drawing ? <section className="nk-rep-page nk-rep-elevs" data-testid="report-elev">{tb(4, L('TECHNICAL DRAWING', 'الرسم الفني'))}<h2 className="nk-rep-h2">{L('Technical drawing', 'الرسم الفني')}</h2><figure className="nk-rep-fig">{drawing(lang)}</figure></section> : scene.runs.map((r, ri) => (
          <section key={r.key} className="nk-rep-page nk-rep-elevs" data-testid="report-elev">
            {tb(4 + ri, L('ELEVATION', 'الواجهة'))}
            <h2 className="nk-rep-h2">{L('Elevation', 'الواجهة')} · {r.label} · <span dir="ltr">{Math.round(r.L)} mm</span></h2>
            <figure className="nk-rep-fig">
              <Elevation scene={scene} runKey={r.key} ui={eui} selected={null} onSelect={() => {}} onDrag={() => {}} lang={lang} interactive={false} />
            </figure>
          </section>
        ))}
      </div>
    </div>
  );
}
