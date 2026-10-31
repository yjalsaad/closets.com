/* Neo Custom Designer [NEO-CUSTOM-UX28] - the sheet-nesting section under the cut list. It runs the SAME nesting helper the "DXF Cutting Plan" export uses
 * (neoKitchen/dxfPlan.js nestBOM: shelf packer, grain along the sheet length, kerf between neighbours; glass, solid timber and worktop slabs are listed, not nested),
 * so what this screen shows is exactly the sheet count and utilisation in the exported plan. Sheet size and kerf are the export's own remembered settings. */
import React, { useMemo, useState } from 'react';
import ParameterField from '../neoKitchen/ParameterField';
import { useOutput } from '../neoKitchen/OutputSettingsControl';
import { dimText, unitLabel } from '../neoKitchen/outputSettings';
import { nestBOM, loadSheet, saveSheet, cleanSheet, SHEET_LIMITS } from '../neoKitchen/dxfPlan';

function SheetSvg({ sh, W, H, label }) {
  const fs = Math.max(W, H) / 38;
  return (
    <svg className="nkc-sheet" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <rect className="nkc-sheet-bg" x={0} y={0} width={W} height={H} />
      {sh.parts.map((q) => (
        <g key={q.id} className="nkc-sheet-p">
          <rect x={q.x} y={q.y} width={q.w} height={q.h} vectorEffect="non-scaling-stroke" />
          {q.w > fs * 3 && q.h > fs * 1.6 && <text x={q.x + q.w / 2} y={q.y + q.h / 2} textAnchor="middle" dominantBaseline="central" style={{ fontSize: fs }}>{q.id}</text>}
        </g>
      ))}
    </svg>
  );
}

export default function CustomNesting({ bom, lang }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [out] = useOutput(); // [NEO-OUTPUT-UX34] sizes printed under the sheets follow the Output unit
  const [sheet, setSheet] = useState(() => loadSheet());
  const nest = useMemo(() => nestBOM(bom, sheet), [bom, sheet]);
  const set = (k, v) => { const n = cleanSheet({ ...sheet, [k]: v }); setSheet(n); saveSheet(n); };
  return (
    <section className="nk-card nkc-card nkc-nest" aria-label={L('Sheet nesting', 'ترتيب الألواح')} data-testid="nesting">
      <div className="nk-card-head"><b className="nk-card-title">{L('Sheet nesting', 'ترتيب القطع على الألواح')} <small dir="ltr" data-testid="nest-total">{nest.totalSheets} {L('sheet(s)', 'لوح')}</small></b></div>
      <div className="nkc-nest-cfg">
        <ParameterField label={L('Sheet width', 'عرض اللوح')} value={sheet.sheetW} min={SHEET_LIMITS.sheet[0]} max={SHEET_LIMITS.sheet[1]} step={10} slider={false} compact hideRange lang={lang} onChange={(v) => set('sheetW', v)} testid="nest-w" />
        <ParameterField label={L('Sheet height', 'ارتفاع اللوح')} value={sheet.sheetH} min={SHEET_LIMITS.sheet[0]} max={SHEET_LIMITS.sheet[1]} step={10} slider={false} compact hideRange lang={lang} onChange={(v) => set('sheetH', v)} testid="nest-h" />
        <ParameterField label={L('Saw kerf', 'سماكة المنشار')} value={sheet.kerf} min={SHEET_LIMITS.kerf[0]} max={SHEET_LIMITS.kerf[1]} step={1} slider={false} compact hideRange lang={lang} onChange={(v) => set('kerf', v)} testid="nest-kerf" />
      </div>
      {nest.materials.length === 0 && <p className="nk-sub">{L('Nothing to nest yet: sheet goods appear here when the piece has boards.', 'لا شيء للترتيب بعد: تظهر ألواح الشيت هنا عندما تحتوي القطعة على ألواح.')}</p>}
      {nest.materials.map((m) => (
        <div key={`${m.material}|${m.thk}`} className="nkc-nest-m" data-testid="nest-material">
          <div className="nkc-nest-h"><b dir="auto">{m.material}</b> <span dir="ltr">{dimText(m.thk, out)} {unitLabel(out.unit)}</span> · <span dir="ltr">{m.pieces} {L('pieces', 'قطعة')} · {m.sheetsCount} {L('sheet(s)', 'لوح')} · {(m.utilisation * 100).toFixed(0)}% {L('used', 'مستخدم')}</span></div>
          <div className="nkc-nest-sheets">{m.sheets.map((sh) => <SheetSvg key={sh.index} sh={sh} W={nest.sheetW} H={nest.sheetH} label={`${m.material} ${L('sheet', 'لوح')} ${sh.index}`} />)}</div>
        </div>
      ))}
      {nest.skipped.length > 0 && (
        <p className="nk-sub" data-testid="nest-skipped">{L('Not nested', 'غير مرتّب')}: {nest.skipped.map((s) => `${s.name} ×${s.qty} (${s.reason})`).join('; ')}</p>
      )}
      {nest.oversize.length > 0 && (
        <p className="nk-sub nkc-bad" role="status" data-testid="nest-oversize">{L('Too big for the sheet', 'أكبر من اللوح')}: {nest.oversize.map((s) => `${s.name} ${dimText(s.L, out)}×${dimText(s.W, out)} ${unitLabel(out.unit)}`).join('; ')}</p>
      )}
    </section>
  );
}
