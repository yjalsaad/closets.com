/* Neo Kitchen Designer - the row screens of the Parameters sidebar (UX-6): L-Left / L-Right (LegScreen), and the Wall and Top
 * screens. All of them are built from the same RowKit components and read every number from the live model; every edit goes
 * through the designer's commit() (one undoable history step, same as a manual edit) and re-draws the plan, the 3D view and the elevation. */
import React, { useState, useRef, useEffect } from 'react';
import { NumField, Toggle, Collapse } from './ui';
import { RowUnitCard } from './WallUnitCard';
import { matchWallPlan, matchWallToBase, rowGapIssue } from './wallLogic';
import { LEG, FIELD, LED } from './constants';
import {
  setLeg, toggleLeg, clearLegOverride, setRunWidth, addUnit, rowWidth, runDepth, legHeightShown, totalH, worktopH, runWallH, setRowHeight,
  setUnitHeight, setRowUnitsHeight, unitDrawH, setLed, lowerH, runHasTop,
} from './model';
import { widthShown, widthUnit } from './unitDraft';
import { planLayout, rowTitle, rowLineLabel, rowStats } from './rowPlan';
import { rowIssues } from './rowLogic';
import { UnitEditor } from './UnitsPanel';
import { Fields, CATEGORY_FIELDS } from './CategoryPanels';
import {
  PlanCard, RowPlan, SummaryCards, KeepCheck, AddUnitMenu, SegTabs, IssueList, CmField, HeightSlider, OptionSwitch, UnitHeightRow,
} from './RowKit';

export const cm = (mm, unit, lang = 'en') => `${widthShown(mm, unit)} ${lang === 'ar' && unit !== 'in' ? 'سم' : widthUnit(unit)}`;

/** plan card: title, "N units · live", the vector plan and its row line */
export function RowPlanCard({ P, rk, row, children }) {
  const { model, lang, sel, setSel, resize } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const layout = planLayout(model, { rk, row, selId: sel ? sel.unitId : null });
  const arr = model.runs[rk][row] || [];
  return (
    <PlanCard title={rowTitle(rk, row, lang)} count={arr.length} lang={lang} testid={`plan-card-${rk}-${row}`}>
      <RowPlan layout={layout} lang={lang} label={L('Front plan of the run (live from the model)', 'المخطط الأمامي للصف (مباشر من النموذج)')}
        lineLabel={rowLineLabel(rk, row, layout.line.mm, lang)} onSelect={setSel} onResize={resize}
        resizeLabel={L('Resize the selected unit', 'تغيير عرض الوحدة المحددة')} />
      {children}
    </PlanCard>
  );
}

/** add button (one click, type menu), validation messages and one card per unit - the same cards on every row */
export function RowUnits({ P, rk, row, hint }) {
  const { model, lang } = P;
  const arr = model.runs[rk][row] || [];
  return (
    <>
      <AddUnitMenu P={P} rk={rk} row={row} lang={lang} />
      {hint && <p className="nk-rk-hint" data-testid="row-hint">{hint}</p>}
      <IssueList issues={rowIssues(model, rk, row)} lang={lang} />
      {arr.map((u, i) => (row === 'base' ? <UnitEditor key={u.id} P={P} rk={rk} row={row} u={u} idx={i} variant="rk" /> : <RowUnitCard key={u.id} P={P} rk={rk} row={row} u={u} idx={i} />))}
    </>
  );
}

/** one Leg Dimensions row: label, inherited / custom state, slider + numeric input, and a button to drop the override */
function LegField({ id, label, hint, inherited, value, min, max, unit, lang, onChange, onReset }) {
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <div className="nk-rk-lf" data-inherited={inherited ? '1' : '0'} data-testid={`${id}-field`}>
      <div className="nk-rk-lf-head">
        <label htmlFor={id} className="nk-rk-lf-l">{label}</label>
        <span className={`nk-rk-state${inherited ? '' : ' nk-rk-state-own'}`} data-testid={`${id}-state`}>{inherited ? L('Same as main', 'مثل الرئيسي') : L('Custom', 'مخصص')}</span>
        {!inherited && <button type="button" className="nk-rk-reset" data-testid={`${id}-reset`} onClick={onReset}>{L('Use main kitchen', 'استخدم المطبخ الرئيسي')}</button>}
      </div>
      <NumField id={id} label={label} value={value} min={min} max={max} step={10} uiUnit={unit} lang={lang} onChange={onChange} />
      <p className="nk-rk-hint">{inherited ? L('Same as the main kitchen (type a value to give this leg its own size)', 'نفس المطبخ الرئيسي (اكتب قيمة لإعطاء الرجل حجمًا خاصًا)') : hint}</p>
    </div>
  );
}

export function LegScreen({ P, side, layers, toggleLayer }) {
  const { model, lang, unit, commit, legRow, setLegRow } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const lg = model.legs[side];
  const sideName = side === 'left' ? L('Left', 'اليسرى') : L('Right', 'اليمنى');
  const title = side === 'left' ? L('L — Left Leg', 'L — الرجل اليسرى') : L('L — Right Leg', 'L — الرجل اليمنى');
  const enable = side === 'left' ? L('Enable left leg', 'تفعيل الرجل اليسرى') : L('Enable right leg', 'تفعيل الرجل اليمنى');
  const row = legRow;
  const topOk = model.topOn && lg.matchH;
  const len = rowWidth(model.runs[side].base);
  const stats = rowStats(model, side, row === 'top' && !topOk ? 'base' : row);
  const overall = lg.matchH ? totalH(model) : lg.height;
  const tabs = [['base', L('Base', 'سفلي')], ['wall', L('Wall', 'علوي')], ['top', L('Top', 'ثالث')]];
  const cells = row === 'base'
    ? [
      { k: 'length', label: L('Leg length', 'طول الرجل'), node: <CmField id={`nk-ll-${side}`} label={L('Leg length', 'طول الرجل')} mm={len} min={LEG.length.min} max={LEG.length.max} unit={unit} lang={lang}
        onChange={(v) => { const r = setRunWidth(model, side, v); commit(r.model, `ll:${side}`); }} /> },
      { k: 'overall', label: L('Overall height', 'الارتفاع الكلي'), value: cm(overall, unit, lang) },
      { k: 'worktop', label: L('Worktop height', 'ارتفاع السطح'), value: cm(worktopH(model.g), unit, lang) },
    ]
    : [
      { k: 'width', label: L('Row width', 'عرض الصف'), value: cm(stats.width, unit, lang) },
      { k: 'bottom', label: L('Bottom from floor', 'من الأرض (أسفل)'), value: cm(stats.bottom, unit, lang) },
      { k: 'top', label: L('Top from floor', 'من الأرض (أعلى)'), value: cm(stats.top, unit, lang) },
    ];
  return (
    <div className="nk-pbody nk-rk-screen" data-testid={`leg-screen-${side}`}>
      <PlanCard title={title} id={`nk-leg-${side}`}>
        <p className="nk-cdesc" data-testid={`leg-desc-${side}`}>{side === 'left'
          ? L('Left return leg. Unit 01 sits in the corner — its first part (= base depth) is hidden behind the main run, so make it wider than the depth.', 'رجل راجعة يسرى. الوحدة ٠١ في الزاوية — أول جزء منها (= عمق السفلي) مخفي خلف الصف الرئيسي، لذا اجعلها أعرض من العمق.')
          : L('Right return leg. Unit 01 sits in the corner — its first part (= base depth) is hidden behind the main run, so make it wider than the depth.', 'رجل راجعة يمنى. الوحدة ٠١ في الزاوية — أول جزء منها (= عمق السفلي) مخفي خلف الصف الرئيسي، لذا اجعلها أعرض من العمق.')}</p>
        <div className="nk-toggle-row"><span>{enable}</span>
          <Toggle on={lg.on} label={enable} onChange={(v) => commit(toggleLeg(model, side, v), `leg:${side}`)} /></div>
      </PlanCard>
      {!lg.on && (
        <section className="nk-card nk-ctr" data-testid={`leg-empty-${side}`}>
          <p className="nk-cdesc">{side === 'left' ? L('Enable the toggle above to add the left leg.', 'فعّل المفتاح أعلاه لإضافة الرجل اليسرى.') : L('Enable the toggle above to add the right leg.', 'فعّل المفتاح أعلاه لإضافة الرجل اليمنى.')}</p>
        </section>
      )}
      {lg.on && (
        <>
          <PlanCard title={L('Leg Dimensions', 'أبعاد الرجل')} tag="mm" id={`nk-legdim-${side}`}>
            <LegField id={`nk-ld-${side}`} label={L('Depth (mm)', 'العمق (مم)')} hint={L(`Own depth. The main kitchen's base depth is ${model.g.baseD} mm.`, `عمق خاص. عمق السفلي الرئيسي ${model.g.baseD} مم.`)}
              inherited={!!lg.matchD} value={runDepth(model, side)} min={LEG.depth.min} max={LEG.depth.max} unit={unit} lang={lang}
              onChange={(v) => { const r = setLeg(model, side, 'depth', v); commit(r.model, `ld:${side}`); return r; }}
              onReset={() => commit(clearLegOverride(model, side, 'depth'), `ld:${side}`)} />
            <LegField id={`nk-lh-${side}`} label={L('Height (mm)', 'الارتفاع (مم)')} hint={L(`Own height; the wall row of this leg is fitted to it. The main kitchen is ${totalH(model)} mm.`, `ارتفاع خاص؛ يُضبط الصف العلوي للرجل عليه. المطبخ الرئيسي ${totalH(model)} مم.`)}
              inherited={!!lg.matchH} value={legHeightShown(model, side)} min={LEG.height.min} max={LEG.height.max} unit={unit} lang={lang}
              onChange={(v) => { const r = setLeg(model, side, 'height', v); commit(r.model, `lh:${side}`); return r; }}
              onReset={() => commit(clearLegOverride(model, side, 'height'), `lh:${side}`)} />
          </PlanCard>
          <SegTabs value={row} onChange={setLegRow} label={L('Leg row', 'صف الرجل')} options={tabs} />
          {row === 'top' && !topOk ? (
            <section className="nk-card nk-ctr" data-testid="leg-top-off">
              {!model.topOn
                ? (<><p className="nk-cdesc">{L('The top row is switched off.', 'الصف الثالث مُطفأ.')}</p><button type="button" className="nk-btn nk-btn-ghost" data-testid="turn-on-top" onClick={() => commit({ ...model, topOn: true }, 'topOn')}>{L('Turn it on', 'تشغيله')}</button></>)
                : (<><p className="nk-cdesc">{L('A leg with its own height has no top row.', 'الرجل ذات الارتفاع الخاص ليس لها صف ثالث.')}</p><button type="button" className="nk-btn nk-btn-ghost" onClick={() => commit(clearLegOverride(model, side, 'height'), `lh:${side}`)}>{L('Use the main kitchen height', 'استخدم ارتفاع المطبخ الرئيسي')}</button></>)}
            </section>
          ) : (
            <>
              {row !== 'base' ? <RowPanel P={P} rk={side} row={row} layers={layers || {}} toggleLayer={toggleLayer} /> : (<>
              <RowPlanCard P={P} rk={side} row={row}>
                <KeepCheck id={`nk-keep-${side}`} checked={!!model.keepWidth} onChange={(v) => commit({ ...model, keepWidth: v }, 'keep')}
                  title={L("Keep the leg's total length", 'تثبيت الطول الكلي للرجل')}
                  helper={model.keepWidth ? L(`${sideName} leg stays ${cm(len, unit, lang)}; the other units share a change.`, `تبقى الرجل ${sideName} ${cm(len, unit, lang)}؛ باقي الوحدات تتشارك التغيير.`) : L('Total length follows the units.', 'الطول الكلي يتبع الوحدات.')} />
                <SummaryCards cells={cells} />
                {row === 'wall' && <p className="nk-rk-hint">{L(`Wall row height for this leg: ${runWallH(model, side)} mm`, `ارتفاع الصف العلوي لهذه الرجل: ${runWallH(model, side)} مم`)}</p>}
              </RowPlanCard>
              <RowUnits P={P} rk={side} row={row} />
              </>)}
            </>
          )}
        </>
      )}
    </div>
  );
}

/** one "label + numeric input + slider" option row (module level, so typing never remounts the input) */
function LedNum({ id, label, value, min, max, onChange, disabled, lang }) {
  return (
    <div className="wp-optnum" data-off={disabled ? '1' : '0'} data-testid={`${id}-field`}>
      <label htmlFor={id}>{label}</label>
      <NumField id={id} label={label} value={value} min={min} max={max} step={1} uiUnit="mm" lang={lang} onChange={onChange} />
    </div>
  );
}

/** the rows' shared panel (Wall and Top of the main run AND of both legs): plan, summary cards, height slider with the keep-overall-height rule,
 *  unit height row, one-click add unit, OPTIONS, warnings and one card per unit. */
export function RowPanel({ P, rk = 'main', row, layers, toggleLayer }) {
  const { model, lang, unit, commit, sel } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const key = row === 'wall' ? 'wallH' : 'topH';
  const leg = rk === 'left' || rk === 'right'; // UX29: run 2 (galley) shares the main rows' heights like the main run, it is not a leg
  const idp = rk !== 'main' ? `${rk}-` : '';
  /* a leg with its own height has its own wall row: the wall slider then edits THAT height (the top row does not exist); an inheriting leg shares the main rows */
  const ownLeg = leg && !model.legs[rk].matchH;
  const stats = rowStats(model, rk, row);
  const total = totalH(model);
  const [note, setNote] = useState(''); const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (t) => { setNote(t); clearTimeout(timer.current); timer.current = setTimeout(() => setNote(''), 4200); };
  const off = row === 'top' && !model.topOn;
  const rowH = row === 'wall' ? runWallH(model, rk) : model.g.topH;
  const onHeight = (mm) => {
    if (ownLeg && row === 'wall') {
      const r = setLeg(model, rk, 'height', lowerH(model.g) + mm); commit(r.model, `lh:${rk}`);
      if (r.clamped) flash(L(`Clamped: the leg height is limited to ${cm(LEG.height.min, unit, lang)} - ${cm(LEG.height.max, unit, lang)}.`, `ضُبطت القيمة: ارتفاع الرجل بين ${cm(LEG.height.min, unit, lang)} و${cm(LEG.height.max, unit, lang)}.`));
      return;
    }
    const r = setRowHeight(model, row, mm);
    commit(r.model, `g:${key}`);
    if (r.clamped && r.absorbed) flash(L(`Limit reached: the ${r.absorbed === 'gap' ? 'gap' : r.absorbed === 'wallH' ? 'wall row' : 'top row'} cannot take more, so the overall height stays ${cm(total, unit, lang)}.`, `بلغ الحد: لا يمكن ${r.absorbed === 'gap' ? 'للفراغ' : r.absorbed === 'wallH' ? 'للصف العلوي' : 'للصف الثالث'} استيعاب المزيد، فيبقى الارتفاع الكلي ${cm(total, unit, lang)}.`));
    else if (r.clamped) flash(L(`Clamped to ${cm(r.value, unit, lang)} (range ${cm(FIELD[key].min, unit, lang)} - ${cm(FIELD[key].max, unit, lang)}).`, `ضُبطت القيمة على ${cm(r.value, unit, lang)} (المدى ${cm(FIELD[key].min, unit, lang)} - ${cm(FIELD[key].max, unit, lang)}).`));
  };
  const helper = ownLeg ? L(`This leg has its own height, so its wall row is fitted to it (${cm(model.legs[rk].height, unit, lang)} overall).`, `لهذه الرجل ارتفاعها الخاص فيُلائم الصف العلوي عليه (${cm(model.legs[rk].height, unit, lang)} كلي).`)
    : !model.keepHeight ? L('Overall height follows the rows.', 'الارتفاع الكلي يتبع الصفوف.')
      : off ? L('The top row is off, so its height does not change the overall height.', 'الصف الثالث مُطفأ، فارتفاعه لا يغيّر الارتفاع الكلي.')
        : row === 'wall' ? L(`Overall stays ${cm(total, unit, lang)}; the top row (or the gap) takes the change.`, `يبقى الارتفاع الكلي ${cm(total, unit, lang)}؛ الصف الثالث (أو الفراغ) يتحمل التغيير.`)
          : L(`Overall stays ${cm(total, unit, lang)}; the wall row takes the change.`, `يبقى الارتفاع الكلي ${cm(total, unit, lang)}؛ الصف العلوي يتحمل التغيير.`);
  const cells = [
    { k: 'width', label: L('Row width', 'عرض الصف'), value: cm(stats.width, unit, lang) },
    { k: 'bottom', label: L('Bottom from floor', 'من الأرض (أسفل)'), value: cm(stats.bottom, unit, lang) },
    { k: 'top', label: L('Top from floor', 'من الأرض (أعلى)'), value: cm(stats.top, unit, lang) },
  ];
  /* Unit height: the selected unit of this row, or every unit of the row when none is selected. Wall AND top units (bottom-aligned, never taller than the row). */
  const rowUnits = model.runs[rk][row] || [];
  const selU = sel ? rowUnits.find((u) => u.id === sel.unitId) : null;
  const unitH = selU ? unitDrawH(model, rk, row, selU) : (rowUnits.length ? Math.max(...rowUnits.map((u) => unitDrawH(model, rk, row, u))) : rowH);
  const onUnitH = (mm) => commit(selU ? setUnitHeight(model, rk, row, selU.id, mm) : setRowUnitsHeight(model, rk, row, mm), selU ? `uh:${selU.id}` : `uh:${rk}${row}`);
  const rowWord = row === 'wall' ? L('wall', 'علوية') : L('top', 'ثالثة'); const rowWordCap = row === 'wall' ? L('Wall', 'علوية') : L('Top', 'ثالثة');
  const selIdx = selU ? rowUnits.indexOf(selU) + 1 : 0;
  const hFld = FIELD[key];
  const led = model.led || { strip: false, on: true, w: LED.w.def, off: LED.off.def };
  const main = rk === 'main';
  const match = row === 'wall' ? matchWallPlan(model, rk) : null;
  const gap = rowGapIssue(model, rk, row, lang === 'ar' ? 'ar' : 'en');
  const issues = [...rowIssues(model, rk, row), ...(gap ? [gap] : [])];
  return (
    <>
      <RowPlanCard P={P} rk={rk} row={row}>
        {off && (
          <div className="nk-rk-off" data-testid="top-off">
            <p className="nk-cdesc">{L('The top row is switched off.', 'الصف الثالث مُطفأ.')}</p>
            <button type="button" className="nk-btn nk-btn-ghost" data-testid="turn-on-top" onClick={() => commit({ ...model, topOn: true }, 'topOn')}>{L('Turn it on', 'تشغيله')}</button>
          </div>
        )}
        <SummaryCards cells={cells} />
        <HeightSlider id={`nk-rh-${idp}${row}`} label={row === 'wall' ? L('Wall height', 'ارتفاع العلوي') : L('Top height', 'ارتفاع الثالث')} mm={rowH} min={hFld.min} max={hFld.max} step={10}
          onChange={onHeight} shown={cm(rowH, unit, lang)} />
        {rk === 'run2' && <p className="nk-rk-hint" data-testid="run2-height-shared">{L('Run 2 shares the wall and top row heights with the main run (one overall height for the whole kitchen).', 'الصف ٢ يشارك الصف الرئيسي ارتفاعي الصف العلوي والثالث (ارتفاع كلي واحد للمطبخ).')}</p>}
        {leg && !ownLeg && <p className="nk-rk-hint" data-testid="leg-height-shared">{L('This leg matches the main kitchen, so this height is shared with the main run.', 'هذه الرجل تطابق المطبخ الرئيسي، فهذا الارتفاع مشترك مع الصف الرئيسي.')}</p>}
        <div className="nk-clamp nk-rk-note" role="status" aria-live="polite" data-testid="row-note">{note}</div>
        {!ownLeg && <KeepCheck id={`nk-keeph-${idp}${row}`} checked={!!model.keepHeight} onChange={(v) => commit({ ...model, keepHeight: v }, 'keepH')} title={L("Keep the kitchen's overall height", 'تثبيت الارتفاع الكلي للمطبخ')} helper={helper} />}
        {ownLeg && <p className="nk-rk-hint" data-testid="nk-keeph-helper-own">{helper}</p>}
        <UnitHeightRow id={`nk-uh-${idp}${row}`} label={L('Unit height', 'ارتفاع الوحدة')} mm={unitH} min={Math.min(hFld.min, rowH)} max={rowH} unit={unit} lang={lang} disabled={!rowUnits.length} onChange={onUnitH}
          hint={!rowUnits.length ? L('Add a unit first.', 'أضف وحدة أولاً.') : selU ? L(`Applies to ${rowWordCap} ${selIdx}. A unit can be shorter than the row (it hangs from the same bottom), never taller.`, `ينطبق على وحدة ${rowWord} ${selIdx}. يمكن أن تكون الوحدة أقصر من الصف (من نفس الأسفل)، وليس أطول.`) : L(`Applies to every ${rowWord} unit. Select a unit in the drawing to change just that one.`, `ينطبق على كل وحدة ${rowWord}. اختر وحدة في الرسم لتغيير واحدة فقط.`)} />
        <AddUnitMenu P={P} rk={rk} row={row} lang={lang} />
        <p className="nk-rk-hint" data-testid="row-hint">{L('Tap a unit in the drawing — or click a cabinet in the 3D view — to edit it here.', 'اضغط على وحدة في الرسم — أو انقر خزانة في العرض ثلاثي الأبعاد — لتعديلها هنا.')}</p>
        <hr className="nk-rk-sep" />
        <p className="nk-rk-eyebrow">{L('OPTIONS', 'خيارات')}</p>
        {row === 'top' && main && <OptionSwitch label={L('Top row', 'الصف الثالث')} hint={L('Switch the third-tier row on or off; its units are kept.', 'تشغيل أو إطفاء الصف الثالث؛ تبقى وحداته محفوظة.')} on={model.topOn} onChange={(v) => commit({ ...model, topOn: v }, 'topOn')} />}
        {row === 'wall' && main && (
          <div data-testid="wall-options">
            <OptionSwitch label={L('LED Strip', 'شريط LED')} hint={L('A groove in the underside of each wall unit, with a light strip in it.', 'مجرى في أسفل كل وحدة علوية وفيه شريط إضاءة.')} on={!!led.strip} onChange={(v) => commit(setLed(model, { strip: v }), 'led:strip')} />
            <OptionSwitch label={L('LED Light On', 'إضاءة LED مشغّلة')} hint={led.strip ? undefined : L('Turn the LED strip on first.', 'شغّل شريط LED أولاً.')} on={led.on !== false && !!led.strip} onChange={(v) => { if (led.strip) commit(setLed(model, { on: v }), 'led:on'); }} />
            <LedNum lang={lang} id="nk-led-w" label={L('LED Groove Width (mm)', 'عرض مجرى LED (مم)')} value={led.w} min={LED.w.min} max={LED.w.max} disabled={!led.strip}
              onChange={(v) => { const r = setLed(model, { w: v }); commit(r, 'led:w'); return { clamped: r.led.w !== Math.round(v), value: r.led.w }; }} />
            <LedNum lang={lang} id="nk-led-off" label={L('LED Offset from front (mm)', 'إزاحة LED عن الواجهة (مم)')} value={led.off} min={LED.off.min} max={LED.off.max} disabled={!led.strip}
              onChange={(v) => { const r = setLed(model, { off: v }); commit(r, 'led:off'); return { clamped: r.led.off !== Math.round(v), value: r.led.off }; }} />
            <OptionSwitch label={L('Bottom Cover', 'غطاء سفلي')} hint={L('A cover board under the wall units (door board, flush with the fronts).', 'لوح تغطية تحت الوحدات العلوية (لوح أبواب، بمحاذاة الواجهات).')} on={!!model.bottomCover} onChange={(v) => commit({ ...model, bottomCover: v }, 'bcover')} />
          </div>
        )}
        {row === 'wall' && (
          <>
            <button type="button" className="wp-match" data-testid="match-wall" disabled={!match.ok} aria-describedby="nk-match-why" onClick={() => commit(matchWallToBase(model, rk), `match:${rk}`)}>⇅ {L('Match wall widths to base row', 'مطابقة عرض العلوي مع الصف السفلي')}</button>
            <p className="wp-match-why" id="nk-match-why" data-testid="match-why">{match.ok ? L(`Resizes the wall units so the row spans ${cm(match.target, unit, lang)}, the space of the base row (units share the change in proportion).`, `يغيّر عرض الوحدات العلوية ليغطي الصف ${cm(match.target, unit, lang)} وهو مساحة الصف السفلي (تتشارك الوحدات التغيير بالتناسب).`) : (lang === 'ar' ? match.ar : match.en)}</p>
          </>
        )}
        <OptionSwitch label={L('Show in 3D / drawing', 'إظهار في الرسم')} on={!!(layers && layers[row])} onChange={() => toggleLayer && toggleLayer(row)} />
        {row === 'wall' && main && <Collapse title={L('Row dimensions', 'أبعاد الصف')} defaultOpen={false}><Fields keys={CATEGORY_FIELDS.wallRest} P={P} /></Collapse>}
      </RowPlanCard>
      <IssueList issues={issues} lang={lang} />
      {rowUnits.map((u, i) => <RowUnitCard key={u.id} P={P} rk={rk} row={row} u={u} idx={i} />)}
    </>
  );
}

/** Wall and Top screens of the main run */
export function MainRowScreen({ P, row, rk = 'main', layers, toggleLayer }) {
  return (
    <div className="nk-pbody nk-rk-screen" data-testid={`row-screen-${row}`}>
      <RowPanel P={P} rk={rk} row={row} layers={layers} toggleLayer={toggleLayer} />
    </div>
  );
}
