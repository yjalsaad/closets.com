/* Neo Kitchen Designer - sidebar category panels (UX-1). The owner's seven component categories are
 * Base / Wall / Top / Counter / Plinth / Doors / Hardware. Base, Wall and Top already had a unit editor (UnitsPanel); the other
 * four had their controls spread over the Global and M&S tabs. These panels GROUP those same controls by category - every field
 * is the existing FIELD spec (same ranges, same setGlobal clamping, same history key), nothing new is calculated here.
 * The old Global / M&S tabs stay as they were, so no field is lost. */
import React from 'react';
import { Toggle, Collapse } from './ui';
import { FIELD, FINISHES, COUNTERS } from './constants';
import { FieldCtl, HandleControls, NewBadge } from './Panels';
import { Ic } from './icons';

export const CATEGORY_FIELDS = {
  base: ['baseH', 'baseD'],
  wall: ['wallH', 'wallD', 'gap'],
  top: ['topH'],
  /* UX-6: the Wall / Top screens own the height slider (with the keep-overall-height rule), the Row dimensions card keeps the rest */
  wallRest: ['wallD', 'gap'],
  counter: ['counterThk', 'overhang', 'backsplashH'],
  plinth: ['plinthH', 'plinthSetback'],
  doors: ['doorThk', 'doorGap', 'drawerGap'],
  hardware: ['hingeCup', 'cupEdge'],
};

export const CATEGORY_TITLE = {
  base: ['Base cabinets', 'الوحدات السفلية'], wall: ['Wall cabinets', 'الوحدات العلوية'], top: ['Top cabinets', 'الوحدات الثالثة'],
  counter: ['Countertop', 'سطح العمل'], plinth: ['Plinth', 'القاعدة'], doors: ['Doors & fronts', 'الأبواب والواجهات'], hardware: ['Hardware', 'الاكسسوار'],
};

export function Fields({ keys, P }) {
  return keys.map((k, i) => <FieldCtl key={k} f={FIELD[k]} i={i} P={P} />);
}

function Head({ cat, lang, on, onToggle }) {
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <div className="nk-cat-head">
      <span className="nk-cat-ic"><Ic n={cat} size={20} /></span>
      <h3 className="nk-h3">{CATEGORY_TITLE[cat][lang === 'ar' ? 1 : 0]}</h3>
      {onToggle && (
        <span className="nk-cat-vis">
          <span id={`nk-vis-${cat}`}>{L('Show in 3D / drawing', 'إظهار في الرسم')}</span>
          <Toggle on={on} label={L('Show in 3D / drawing', 'إظهار في الرسم')} onChange={onToggle} />
        </span>
      )}
    </div>
  );
}

const Chips = ({ items, value, onPick, label, lang }) => (
  <div className="nk-chips" role="radiogroup" aria-label={label}>
    {Object.entries(items).map(([k, f]) => (
      <button key={k} type="button" role="radio" aria-checked={value === k} className="nk-chip" onClick={() => onPick(k)}>
        <span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}
      </button>
    ))}
  </div>
);

/** dimension block shown on top of the unit editor for Base / Wall / Top */
export function RowDims({ row, P, layers, toggleLayer }) {
  const { model, lang, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <section className="nk-card nk-cat">
      <Head cat={row} lang={lang} on={layers[row]} onToggle={() => toggleLayer(row)} />
      {row === 'top' && (
        <div className="nk-toggle-row"><span>{L('Top (third-tier) row', 'الصف الثالث')}</span><Toggle on={model.topOn} label={L('Top row', 'الصف الثالث')} onChange={(v) => commit({ ...model, topOn: v }, 'topOn')} /></div>
      )}
      <Collapse title={L('Row dimensions', 'أبعاد الصف')} defaultOpen>
        <Fields keys={CATEGORY_FIELDS[row]} P={P} />
      </Collapse>
    </section>
  );
}

export function CategoryPanel({ cat, P, layers, toggleLayer, goTab }) {
  const { model, lang, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const head = <Head cat={cat} lang={lang} on={layers[cat]} onToggle={() => toggleLayer(cat)} />;
  if (cat === 'counter') {
    return (
      <div className="nk-pbody">
        <section className="nk-card nk-cat">
          {head}
          <div className="nk-ctl-name">{L('Material', 'المادة')} <NewBadge lang={lang} /></div>
          <Chips items={COUNTERS} value={model.counter} lang={lang} label={L('Countertop material', 'مادة سطح العمل')} onPick={(k) => commit({ ...model, counter: k }, 'counter')} />
          <Fields keys={CATEGORY_FIELDS.counter} P={P} />
        </section>
      </div>
    );
  }
  if (cat === 'plinth') {
    return (
      <div className="nk-pbody">
        <section className="nk-card nk-cat">
          {head}
          <p className="nk-cdesc">{L('The recessed base the cabinets stand on, with its adjustable feet.', 'القاعدة المتراجعة التي تقف عليها الوحدات مع أرجلها القابلة للضبط.')}</p>
          <Fields keys={CATEGORY_FIELDS.plinth} P={P} />
        </section>
      </div>
    );
  }
  if (cat === 'doors') {
    return (
      <div className="nk-pbody">
        <section className="nk-card nk-cat">
          {head}
          <div className="nk-ctl-name">{L('Finish', 'التشطيب')}</div>
          <Chips items={FINISHES} value={model.finish} lang={lang} label={L('Finish', 'التشطيب')} onPick={(k) => commit({ ...model, finish: k }, 'finish')} />
          <Fields keys={CATEGORY_FIELDS.doors} P={P} />
          <div className="nk-ctl-name nk-mt">{L('Front style per cabinet', 'نوع الواجهة لكل وحدة')}</div>
          <p className="nk-cdesc">{L('Door, drawers, flip-up, glass or open shelf is chosen for each cabinet section in its unit editor.', 'يُختار نوع الباب أو الأدراج أو القلاب أو الزجاج أو الرف المفتوح لكل قسم في محرر الوحدة.')}</p>
          <div className="nk-row-wrap">
            {['base', 'wall', 'top'].map((r) => <button key={r} type="button" className="nk-btn" onClick={() => goTab(r)}>{CATEGORY_TITLE[r][lang === 'ar' ? 1 : 0]}</button>)}
          </div>
        </section>
      </div>
    );
  }
  /* hardware */
  return (
    <div className="nk-pbody">
      <section className="nk-card nk-cat">
        {head}
        <HandleControls P={P} />
        <Fields keys={CATEGORY_FIELDS.hardware} P={P} />
        <p className="nk-cdesc">{L('Hinge cups follow the 32 mm system; handle position "Auto" lets the drawer / door decide.', 'كوبات المفصلات حسب نظام 32 مم؛ الوضع «تلقائي» يترك الموضع للباب أو الدرج.')}</p>
      </section>
    </div>
  );
}

