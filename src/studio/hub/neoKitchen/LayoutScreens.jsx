/* Neo Kitchen Designer - NEO-KITCHEN-UX29 run screens for the three additive layouts: Run 2 (galley), Peninsula, Island.
 * One screen, three variants. The layout settings (aisle / clearance / projection / overhang / finished panels / cut-out hint) are
 * ParameterFields and switches that edit model.xl through setXl() - one undoable commit() each; the run itself is edited with the SAME
 * components as the main run: BaseScreen (front plan with dividers, add unit, unit cards) for Base, RowPanel for Wall / Top. */
import React, { useMemo, useState } from 'react';
import ParameterField from './ParameterField';
import { Seg } from './ui';
import { PlanCard, SegTabs, OptionSwitch, IssueList } from './RowKit';
import BaseScreen from './BaseScreen';
import { RowPanel } from './RowScreens';
import { XL, XL_RUN_OF } from './constants';
import { setXl, setRunWidth, setLayout, rowWidth, penProjection, penLengthFor, xlKind } from './model';
import { layoutIssues } from './layoutRules';
import { LayoutPlan } from './LayoutPicker';
import './layouts29.css';

const TITLES = {
  run2: ['Run 2 — galley', 'الصف ٢ — مطبخ ممر'],
  pen: ['Peninsula', 'الجزيرة الممتدة'],
  isl: ['Island', 'الجزيرة'],
};
const DESC = {
  run2: ['The second run, on the opposite wall and facing the main run. It has its own base and wall units; the aisle between the two worktops is set here.', 'الصف الثاني على الجدار المقابل ويواجه الصف الرئيسي. له وحدات سفلية وعلوية خاصة، ويُضبط هنا عرض الممر بين السطحين.'],
  pen: ['A run that projects from the end of the main run into the room. Its far end and its back are open, so they get finished panels; the worktop can overhang for seating.', 'صف يمتد من طرف الصف الرئيسي إلى الغرفة. نهايته البعيدة وظهره مفتوحان فيُغطيان بألواح مشطّبة، ويمكن أن يبرز السطح للجلوس.'],
  isl: ['A freestanding run in the room, open on all sides: finished panels on the back and both ends, optional seating overhang, no wall units.', 'صف حر في الغرفة ومفتوح من كل الجهات: ألواح مشطّبة على الظهر والطرفين، وبروز اختياري للجلوس، بلا وحدات علوية.'],
};

export default function LayoutScreen({ P, rk, layers, toggleLayer }) {
  const { model, lang, unit, commit, scene } = P;
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [row, setRow] = useState('base');
  const xl = model.xl;
  const kind = xlKind(model);
  const active = !!kind && XL_RUN_OF[kind] === rk;
  const issues = useMemo(() => layoutIssues(model), [model]);
  const title = TITLES[rk][ar ? 1 : 0];
  const want = { run2: 'galley', pen: 'peninsula', isl: 'island' }[rk];
  if (!active) {
    return (
      <div className="nk-pbody nk-rk-screen" data-testid={`xrun-screen-${rk}`}>
        <PlanCard title={title} id={`nk-xr-${rk}`}>
          <div className="nk-xr-empty" data-testid={`xrun-empty-${rk}`}>
            <p className="nk-cdesc">{L(`${title} is not part of the current layout.`, `${title} ليس جزءًا من التخطيط الحالي.`)}</p>
            <button type="button" className="nk-btn nk-btn-ghost" data-testid={`xrun-make-${rk}`} onClick={() => commit(setLayout(model, want), 'layout')}>
              {rk === 'run2' ? L('Make it a galley', 'حوّله إلى مطبخ ممر') : rk === 'pen' ? L('Add a peninsula', 'أضف جزيرة ممتدة') : L('Add an island', 'أضف جزيرة')}
            </button>
          </div>
        </PlanCard>
      </div>
    );
  }

  const run = model.runs[rk];
  const len = rowWidth(run.base);
  const mainLen = rowWidth(model.runs.main.base);
  const set = (patch, key) => { const m = setXl(model, patch); commit(m, `xl:${key}`); return m; };
  /** a number field of model.xl: returns what the model did so the field can say "clamped" */
  const numXl = (id, k, label, rng, helper, extra = {}) => (
    <ParameterField id={id} testid={id} label={label} value={xl[k]} min={rng.min} max={rng.max} step={10} unit="mm" uiUnit={unit} lang={lang} helper={helper} {...extra}
      onChange={(v) => { const m = set({ [k]: v }, k); return { clamped: m.xl[k] !== Math.round(v), value: m.xl[k] }; }} />
  );
  const lenField = (id, label, helper, disabled) => {
    const r = XL.len[rk];
    return (
      <ParameterField id={id} testid={id} label={label} value={len} min={r.min} max={r.max} step={10} unit="mm" uiUnit={unit} lang={lang} helper={helper} disabled={disabled}
        onChange={(v) => { const m = setRunWidth(model, rk, v); commit(m.model, `xrl:${rk}`); return { clamped: m.clamped, value: m.value }; }} />
    );
  };
  const seatBlock = (
    <>
      <OptionSwitch label={L('Seating overhang', 'بروز للجلوس')} hint={L('The worktop extends past the finished back so people can sit.', 'يمتد السطح خلف الظهر المشطّب ليجلس الناس.')} on={xl.seatOn} onChange={(v) => set({ seatOn: v }, 'seatOn')} />
      {numXl(`nk-xr-seatd-${rk}`, 'seatD', L('Overhang depth (mm)', 'عمق البروز (مم)'), XL.seat, L(`Up to ${XL.seat.supportAbove} mm needs no support; more needs concealed brackets (added to the hardware list), above 450 mm legs or posts.`, `حتى ${XL.seat.supportAbove} مم بلا دعم؛ أكثر يحتاج كوابيل مخفية (تُضاف إلى الاكسسوار)، وأكثر من ٤٥٠ مم أرجلاً أو أعمدة.`), { disabled: !xl.seatOn })}
    </>
  );
  const panelsBlock = (
    <>
      <OptionSwitch label={L('Finished end panel', 'لوح نهاية مشطّب')} hint={rk === 'isl' ? L('A panel on each open end (door finish).', 'لوح على كل طرف مفتوح (بتشطيب الأبواب).') : L('A panel on the open far end (door finish).', 'لوح على الطرف البعيد المفتوح (بتشطيب الأبواب).')} on={xl.endPanel} onChange={(v) => set({ endPanel: v }, 'endPanel')} />
      <OptionSwitch label={L('Finished back panel', 'لوح ظهر مشطّب')} hint={L('A panel over the open back of every base unit.', 'لوح فوق الظهر المفتوح لكل وحدة سفلية.')} on={xl.backPanel} onChange={(v) => set({ backPanel: v }, 'backPanel')} />
    </>
  );

  const rowsAvail = rk === 'run2' ? ['base', 'wall', 'top'] : ['base'];
  const cur = rowsAvail.includes(row) ? row : 'base';
  return (
    <div className="nk-pbody nk-rk-screen" data-testid={`xrun-screen-${rk}`}>
      <PlanCard title={title} id={`nk-xr-${rk}`}>
        <p className="nk-cdesc" data-testid={`xrun-desc-${rk}`}>{DESC[rk][ar ? 1 : 0]}</p>
        <div className="nk-xr-fields">
          {rk === 'run2' && (
            <>
              {numXl('nk-xr-aisle', 'aisle', L('Aisle width (mm)', 'عرض الممر (مم)'), XL.aisle, L(`Clear space between the two worktop fronts. A work aisle is ${XL.aisle.rec[0]}-${XL.aisle.rec[1]} mm; outside it you get a warning.`, `المسافة الصافية بين واجهتي السطحين. ممر العمل ${XL.aisle.rec[0]}-${XL.aisle.rec[1]} مم؛ وخارجه يظهر تحذير.`))}
              <OptionSwitch label={L('Match the main run length', 'مطابقة طول الصف الرئيسي')} hint={xl.match ? L(`Run 2 follows the main run (${mainLen} mm).`, `يتبع الصف ٢ الصف الرئيسي (${mainLen} مم).`) : L('Run 2 keeps its own length.', 'يحتفظ الصف ٢ بطوله الخاص.')} on={xl.match} onChange={(v) => set({ match: v }, 'match')} />
              {lenField('nk-xr-len', L('Run 2 length (mm)', 'طول الصف ٢ (مم)'), xl.match ? L('Follows the main run while "match" is on.', 'يتبع الصف الرئيسي ما دام خيار المطابقة مفعّلًا.') : L('Independent of the main run.', 'مستقل عن الصف الرئيسي.'), xl.match)}
            </>
          )}
          {rk === 'pen' && (
            <>
              <div className="nk-xr-seg">
                <span>{L('Projects from the', 'يمتد من')}</span>
                <Seg label={L('Peninsula: which end of the main run', 'الجزيرة الممتدة: أي طرف من الصف الرئيسي')} value={xl.side} onChange={(v) => set({ side: v }, 'side')} options={[['left', L('Left end', 'الطرف الأيسر')], ['right', L('Right end', 'الطرف الأيمن')]]} />
              </div>
              <ParameterField id="nk-xr-proj" testid="nk-xr-proj" label={L('Projection into the room (mm)', 'الامتداد داخل الغرفة (مم)')} value={penProjection(model)} min={XL.len.pen.min - model.g.baseD} max={XL.len.pen.max - model.g.baseD} step={10} unit="mm" uiUnit={unit} lang={lang}
                helper={L(`Beyond the main run. The run is ${len} mm long including the ${model.g.baseD} mm corner unit that sits behind the main run.`, `بعد الصف الرئيسي. طول الصف ${len} مم شاملًا وحدة الركن ${model.g.baseD} مم خلف الصف الرئيسي.`)}
                onChange={(v) => { const m = setRunWidth(model, 'pen', penLengthFor(model, v)); commit(m.model, 'xrl:pen'); return { clamped: m.clamped, value: m.value - model.g.baseD }; }} />
              {seatBlock}
              {panelsBlock}
            </>
          )}
          {rk === 'isl' && (
            <>
              {numXl('nk-xr-gap', 'gap', L('Clearance from the main run (mm)', 'الخلوص عن الصف الرئيسي (مم)'), XL.gap, L(`Between the two worktop fronts. Keep ${XL.gap.rec[0]}-${XL.gap.rec[1]} mm; outside it you get a warning.`, `بين واجهتي السطحين. اتركها ${XL.gap.rec[0]}-${XL.gap.rec[1]} مم؛ وخارجها يظهر تحذير.`))}
              {lenField('nk-xr-len', L('Island length (mm)', 'طول الجزيرة (مم)'), L('Independent of the main run.', 'مستقل عن الصف الرئيسي.'), false)}
              {numXl('nk-xr-off', 'off', L('Position along the main run (mm)', 'الموضع على امتداد الصف الرئيسي (مم)'), { min: 0, max: Math.max(300, mainLen) }, L('Distance from the left end of the main run to the left end of the island.', 'المسافة من الطرف الأيسر للصف الرئيسي إلى الطرف الأيسر للجزيرة.'))}
              {seatBlock}
              {panelsBlock}
              <div className="nk-xr-seg">
                <span>{L('Cut-out hint in the worktop', 'تلميح فتحة في السطح')}</span>
                <Seg label={L('Island cut-out hint', 'تلميح فتحة الجزيرة')} value={xl.hint} onChange={(v) => set({ hint: v }, 'hint')} options={[['none', L('None', 'بدون')], ['hob', L('Hob', 'موقد')], ['sink', L('Sink', 'حوض')]]} />
              </div>
            </>
          )}
        </div>
        {scene && <LayoutPlan scene={scene} lang={lang} compact model={model} commit={commit} />}
      </PlanCard>
      <IssueList issues={issues} lang={lang} testid={`xrun-issues-${rk}`} />
      {rowsAvail.length > 1 && <SegTabs value={cur} onChange={setRow} label={L('Run 2 row', 'صف الصف ٢')} options={[['base', L('Base', 'سفلي')], ['wall', L('Wall', 'علوي')], ['top', L('Top', 'ثالث')]]} />}
      {cur === 'base' ? <BaseScreen P={P} rk={rk} layers={layers || {}} toggleLayer={toggleLayer} embedded /> : <RowPanel P={P} rk={rk} row={cur} layers={layers || {}} toggleLayer={toggleLayer} />}
    </div>
  );
}
