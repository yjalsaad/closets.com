/* =============================================================================
 * Neo Doors Designer [NEO-DOORS-UX27] - "Production -> Cut List" for a door: live metrics, material cards with the stock needed (sheets of 2440 x 1220,
 * 3 m lengths, glass cut to size), warnings, the table with cut sizes and grain, machining operations, hardware and the price (placeholder rates).
 * Same look as the Neo Kitchen cut list: it uses cutListPro.css (.nk-cl-*), only the content differs.
 * ===========================================================================*/
import React, { useMemo, useEffect } from 'react';
import { Badge } from '../neoKitchen/ui';
import ProCutList from '../neoKitchen/ProCutList';
import { proRows } from '../neoKitchen/clParts';
import { partNameAr, noteEn } from '../neoKitchen/cutlist';
import { useDocStore, attach } from '../neoKitchen/docStore';
import { MAT } from './doorGeometry';
import { GROUP_NAME, noteAr } from './doorBom';
import { doorMachining } from './doorExports';
import { useOutput } from '../neoKitchen/OutputSettingsControl';
import { dimText } from '../neoKitchen/outputSettings';
import '../neoKitchen/cutListPro.css';

const OP_NAME = {
  hinge: ['Hinge recess', 'تجويف مفصلة'], 'lock-mortise': ['Lock mortise', 'تجويف القفل'], 'spindle-bore': ['Handle spindle bore', 'ثقب محور المقبض'], 'cylinder-bore': ['Cylinder bore', 'ثقب السلندر'],
  'pull-bore': ['Pull handle fixing bore', 'ثقب تثبيت مقبض السحب'], 'vision-cutout': ['Vision panel cut-out', 'قطع فتحة الرؤية'], 'grille-cutout': ['Grille cut-out', 'قطع شبكة التهوية'],
};
const opText = (o) => (o.op === 'hinge' ? `${o.edge} edge, y=${o.y}, ${o.len ? `${o.len} x ${o.w} x ${o.depth} deep` : 'pivot'}` : o.op === 'lock-mortise' ? `${o.edge} edge, y=${o.y}, ${o.h} x ${o.t} x ${o.depth} deep`
  : o.op.endsWith('bore') ? `x=${o.x}, y=${o.y}, dia ${o.dia}` : `x ${Math.round(o.x0)}-${Math.round(o.x1)}, y ${Math.round(o.y0)}-${Math.round(o.y1)}`);

const TEXT = { nameAr: (n) => { const g = Object.values(GROUP_NAME).find((x) => x[0] === n); return g ? g[1] : partNameAr(n); }, noteAr, noteEn: (n) => n };
/** [NEO-CUTLIST-UX32] the door BOM in the shape the shared pro cut list reads (L = cut length along the grain, W = across, T = thickness; no edge banding rows) */
function adaptBom(bom) {
  return { ...bom, rows: bom.rows.map((r) => ({ ...r, nameAr: r.ar, group: GROUP_NAME[r.group] ? GROUP_NAME[r.group][0] : r.group, w: r.L, d: r.W, h: r.T, cut: { L: r.L, W: r.W, T: r.T }, grain: r.grain === 'L' ? 'L' : '-', edges: '', edgeLen: 0, maps: [], matNameAr: r.matAr, mat: r.mat === 'glass' ? 'Glass' : (MAT[r.mat] && MAT[r.mat].sheet) ? 'Door' : 'Timber' })) };
}

/** `user` / `notify` (optional) scope the saved table view and report print problems */
export default function DoorCutList({ W, d, lang, onExport, compact, user, notify }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const { bom, hardware, warnings, price } = W;
  const [output] = useOutput(); // [NEO-OUTPUT-UX34] cut sizes follow the Output setting (mm at standard = what the table always showed)
  const mm = (v) => dimText(v, output);
  const kg = W.weight.reduce((s, v) => s + v, 0);
  const store = useDocStore();
  useEffect(() => { if (!compact) attach({ user: user || '', product: 'doors', title: d.title || '' }); }, [compact, user, d.title]);
  const pbom = useMemo(() => (compact ? null : adaptBom(bom)), [compact, bom]);
  const prows = useMemo(() => (pbom ? proRows(pbom, { product: 'doors', tol: store.opts.tolerance }) : null), [pbom, store.opts.tolerance]);
  const ops = W.leaves.flatMap((lf, i) => doorMachining(d, W, i).map((o) => ({ ...o, leaf: i + 1 })));
  return (
    <div className={`nk-cut nk-cl ${compact ? 'nk-cl--compact nk-cut-print' : ''}`}>
      <div className="nk-cl-panel">
        <div className="nk-cl-head">
          <div>
            <div className="nk-cl-eyebrow">{L('PRODUCTION', 'الإنتاج')}</div>
            <h2 className="nk-cl-h2">{L('Cut List', 'قائمة القص')}</h2>
            <div className="nk-cl-sub">{d.title}</div>
          </div>
          <div className="nk-cl-metrics" role="group" aria-label={L('Totals', 'الإجماليات')}>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('PIECES', 'قطع')}</div><div className="nk-cl-mv nk-cl-blue" data-testid="pieces">{bom.pieces}</div></div>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('BOARD M²', 'م² ألواح')}</div><div className="nk-cl-mv nk-cl-teal" data-testid="area">{bom.boardArea.toFixed(2)}</div></div>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('GLASS M²', 'م² زجاج')}</div><div className="nk-cl-mv nk-cl-orange" data-testid="glass-area">{bom.glassArea.toFixed(2)}</div></div>
            <div className="nk-cl-metric"><div className="nk-cl-mk">{L('WEIGHT KG', 'الوزن كغ')}</div><div className="nk-cl-mv nk-cl-blue" data-testid="weight">{kg.toFixed(1)}</div></div>
          </div>
        </div>

        {bom.cards.length > 0 && (
          <div className="nk-cl-cards" data-testid="mat-cards">
            {bom.cards.map((c) => (
              <div key={c.mat} className="nk-cl-card" data-k={c.mat}>
                <div className="nk-cl-card-t">{ar ? c.matAr : c.matName}</div>
                <div className="nk-cl-card-s" dir="ltr">{c.pcs} pcs · {c.sheet ? `${c.m2.toFixed(2)} m²` : c.mat === 'glass' ? `${c.m2.toFixed(2)} m²` : `${c.lm.toFixed(2)} m`}</div>
                <div className="nk-cl-card-s" dir="ltr" data-testid={`stock-${c.mat}`}>{c.stock.kind === 'sheet' ? `${c.stock.n} × ${c.stock.size}` : c.stock.kind === 'glass' ? L('cut to size', 'يُقص بالمقاس') : `${c.stock.n} × ${c.stock.size}`}</div>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <section className="nk-cl-warn" role="status" aria-live="polite" aria-label={L('Warnings', 'تنبيهات')} data-testid="warnings">
            <div className="nk-cl-warn-h">{L('WARNINGS', 'تنبيهات')} · {warnings.length}</div>
            <ul className="nk-cl-warn-l">{warnings.map((w) => <li key={w.id} data-level={w.level}><b>{w.level === 'error' ? L('Error: ', 'خطأ: ') : w.level === 'info' ? L('Note: ', 'ملاحظة: ') : ''}</b>{ar ? w.ar : w.en}</li>)}</ul>
          </section>
        )}

        {!compact && (
          <div className="nk-cl-actions">
            <button type="button" className="nk-btn" onClick={() => onExport('csv')}>⤓ CSV</button>
            <button type="button" className="nk-btn" onClick={() => onExport('dxf')}>⤓ DXF</button>
            <button type="button" className="nk-btn" onClick={() => onExport('json')}>⤓ JSON</button>
            <button type="button" className="nk-btn" onClick={() => onExport('print')}>🖨 {L('Print / PDF', 'طباعة / PDF')}</button>
          </div>
        )}

        {compact ? (
        <div className="nk-cl-scroll" tabIndex={0} role="region" aria-label={L('Cutting list table', 'جدول قائمة القص')}>
          <table className="nk-cl-table" data-testid="cut-table">
            <caption className="nk-sr">{L('Cut list', 'قائمة القص')}</caption>
            <thead>
              <tr>
                <th scope="col" className="nk-cl-c">#</th><th scope="col" className="nk-cl-start">{L('COMPONENT', 'المكوّن')}</th>
                <th scope="col">L <i>{output.unit}</i></th><th scope="col">W <i>{output.unit}</i></th><th scope="col">T <i>{output.unit}</i></th>
                <th scope="col" className="nk-cl-qtyh">{L('QTY', 'العدد')}</th><th scope="col" className="nk-cl-start">{L('MATERIAL', 'المادة')}</th><th scope="col">{L('GRAIN', 'العرق')}</th><th scope="col">M²</th>
              </tr>
            </thead>
            <tbody>
              {bom.rows.map((r) => (
                <tr key={r.key} data-row={r.no}>
                  <td className="nk-cl-c nk-cl-mute">{String(r.no).padStart(2, '0')}</td>
                  <td className="nk-cl-start">
                    <div className="nk-cl-pname">{ar ? r.ar : r.name}</div>
                    <div className="nk-cl-pcut" dir={ar ? 'rtl' : 'ltr'}>{(ar ? GROUP_NAME[r.group][1] : GROUP_NAME[r.group][0])}{r.note ? ` · ${ar ? noteAr(r.note) : r.note}` : ''}</div>
                  </td>
                  <td>{mm(r.L)}</td><td>{mm(r.W)}</td><td>{mm(r.T)}</td>
                  <td className="nk-cl-qty">{r.qty}</td>
                  <td className="nk-cl-start"><span className="nk-cl-mat" dir="auto">{ar ? r.matAr : r.matName}</span></td>
                  <td>{r.grain === 'L' ? L('along L', 'على الطول') : '-'}</td>
                  <td>{r.area.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th scope="row" colSpan={5} className="nk-cl-start">{L('Total', 'الإجمالي')}</th><td className="nk-cl-qty">{bom.pieces}</td><td /><td /><td>{bom.rows.reduce((s, r) => s + r.area, 0).toFixed(2)}</td></tr>
            </tfoot>
          </table>
        </div>
        ) : (
          <ProCutList bom={pbom} rows={prows} hardware={hardware} model={null} scene={undefined} lang={lang} unit="mm" product="doors" user={user || ''} notify={notify} text={TEXT} title={d.title || ''} />
        )}
        <p className="nk-cl-foot" data-testid="cut-foot">
          <b>{L('Cut sizes:', 'مقاسات القص:')}</b> {L('L runs along the grain. Rails and muntins include their 25 mm tenons; panels and louvre slats include the 10 mm they sit in the grooves; glass includes the 8 mm rebate on every side; mitred pieces (mouldings, beads, architrave) are given at the long point. M² = quantity × L × W. Sheet counts assume 80% yield on 2440 × 1220 boards; timber counts assume 3 m lengths at 90% yield.', 'L على اتجاه العرق. العوارض والقواطع تشمل لسانها 25 مم؛ البانوهات والشيش تشمل 10 مم داخل الحزوز؛ الزجاج يشمل 8 مم في الشقّ من كل جانب؛ القطع المائلة (القولبة والأشرطة والكورنيش) بالنقطة الأطول. م² = العدد × L × W. عدد الألواح بفرض مردود 80% على 2440 × 1220؛ الخشب بأطوال 3 م ومردود 90%.')}
        </p>
      </div>
      <div className="nk-cl-below">
        <div className="nk-cut-cols">
          {ops.length > 0 && (
            <section className="nk-card nk-card-flat" aria-label={L('Machining', 'التشغيل')}>
              <div className="nk-eyebrow">{L('MACHINING (CNC / DXF)', 'التشغيل (CNC / DXF)')}</div>
              <table className="nk-table nk-table-sm" data-testid="ops-table"><tbody>
                {ops.map((o, i) => <tr key={i}><td className="nk-td-name">{W.leaves.length > 1 ? `L${o.leaf} · ` : ''}{OP_NAME[o.op][ar ? 1 : 0]}{o.n ? ` ${o.n}` : ''}</td><td className="nk-mono" dir="ltr">{opText(o)}</td></tr>)}
              </tbody></table>
            </section>
          )}
          <section className="nk-card nk-card-flat">
            <div className="nk-eyebrow">{L('HARDWARE', 'الاكسسوارات')}</div>
            <table className="nk-table nk-table-sm" data-testid="hw-table"><tbody>
              {hardware.map((h) => <tr key={h.k}><td className="nk-td-name">{ar ? h.ar : h.en}{h.note ? <div className="nk-sub">{ar ? noteAr(h.note) : h.note}</div> : null}</td><td className="nk-mono nk-qty" dir="ltr">{h.qty} {h.unit}</td></tr>)}
            </tbody></table>
          </section>
          <section className="nk-card nk-card-flat" aria-label={L('Price estimate', 'تقدير السعر')}>
            <div className="nk-eyebrow">{L('PRICE ESTIMATE', 'تقدير السعر')} <Badge>{L('PLACEHOLDER RATES', 'أسعار تقريبية')}</Badge></div>
            <table className="nk-table nk-table-sm" data-testid="price-table"><tbody>
              {price.lines.map((l) => <tr key={l.k}><td className="nk-td-name">{ar ? l.ar : l.en}<div className="nk-sub" dir="ltr">{l.qty} {l.unit} × {l.rate}</div></td><td className="nk-mono" dir="ltr">{l.amount.toFixed(3)}</td></tr>)}
              <tr><td className="nk-td-name">{L('Cost', 'التكلفة')}</td><td className="nk-mono" dir="ltr">{price.cost.toFixed(3)}</td></tr>
              <tr><td className="nk-td-name">{L('Markup', 'هامش الربح')} {price.markupPct}%</td><td className="nk-mono" dir="ltr">{price.markup.toFixed(3)}</td></tr>
              <tr><td className="nk-td-name">{L('VAT', 'ضريبة')} {price.vatPct}%</td><td className="nk-mono" dir="ltr">{price.vat.toFixed(3)}</td></tr>
              <tr className="nk-total"><td className="nk-td-name">{L('Total', 'الإجمالي')} ({price.currency})</td><td className="nk-mono" dir="ltr" data-testid="total">{price.total.toFixed(3)}</td></tr>
            </tbody></table>
            <div className="nk-sub">{L('Every rate is a placeholder: the owner has not supplied a door price list yet. Do not quote from these numbers.', 'كل الأسعار تقريبية: لم يزوّد المالك قائمة أسعار للأبواب بعد. لا تُسعّر للعميل من هذه الأرقام.')}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
