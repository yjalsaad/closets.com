/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - the five cards of the closet's GLOBAL tab, in the owner's order:
 *   Closet Dimensions | 01 Heights and depths | 02 Carcass Boards | 03 Doors & Hinges | 04 Drawers | 05 Shelves & Rails
 * 02 / 03 / 04 are the Neo Kitchen CarcassCard / DoorsCard / DrawersCard (their diagrams, active-row mechanism and issue lists) driven through an ADAPTER:
 * the kitchen rows read model.g[k] and write through P.setField(k, mm). Here g is a view of the wardrobe's x (+ the built model's runs for the issue lists)
 * and setField writes back into design.x, so a value typed here goes to the same place as everywhere else: the model, then the 3D, the elevation, the cut list.
 * Every numeric input is the shared ParameterField (UX-23), straight or through the kitchen's NumField that wraps it. */
import React, { useMemo, useState } from 'react';
import ParameterField from '../neoKitchen/ParameterField';
import { getOutput } from '../neoKitchen/outputSettings';
import { Toggle, Seg } from '../neoKitchen/ui';
import CarcassCard from '../neoKitchen/CarcassCard';
import DoorsCard from '../neoKitchen/DoorsCard';
import DrawersCard from '../neoKitchen/DrawersCard';
import { useActiveRow, CardRows } from '../neoKitchen/activeRow';
import { shelfIssues } from '../neoKitchen/shelfLogic';
import { Step } from './wardrobeParts';
import { HeightsArt, RailArt } from './ClosetArt';
import { CLOSET_CARDS, CARD_KEYS } from './closetCards';
import { innerSize, bodyHeight, WFIELD } from './wardrobeModel';
import '../neoKitchen/carcassCard.css';

const HEIGHT_ACTIVE = [['plinth'], ['body'], ['topbox'], ['depth', 'sidebody'], ['setback']];
const RAIL_ACTIVE = [['shelf'], ['rail'], ['drop'], ['floor']];
const Cnum = ({ n }) => <span className="nk-cnum">{String(n).padStart(2, '0')}</span>;

/** the kitchen-shaped parameter source of the shared cards: g = the card keys read from design.x (+ depth) */
export function cardSource(G) {
  const { x, design, model } = G;
  const g = { ...model.g, baseD: design.dims.d };
  CARD_KEYS.forEach((k) => { g[k] = x[k]; });
  return { model: { ...model, g }, lang: G.lang, get unit() { return getOutput().unit; }, commit: () => {}, setField: G.setField }; // [NEO-OUTPUT-UX34] a getter: the memoised source never shows a stale unit
}

/* ---- Closet Dimensions ------------------------------------------------------------------------------------------------------------ */
export function ClosetDimensionsCard({ G }) {
  const { lang, design, dimRange } = G; const L = (en, ar) => (lang === 'ar' ? ar : en);
  const inner = innerSize(design); const n = design.mods.length;
  return (
    <section className="nk-card nkw-card nkw-dimcard" data-testid="card-dims" aria-labelledby="nkw-dims-h">
      <div className="nk-card-head"><h3 className="nk-h3" id="nkw-dims-h">{L('Closet Dimensions', 'أبعاد الخزانة')}</h3><span className="nkw-unit-tag">mm</span></div>
      <p className="nk-cdesc nkw-desc">{L('Total width, height and depth of the main unit. Width growth goes to the last free column — pinned columns never move.', 'العرض والارتفاع والعمق الكلية للوحدة الرئيسية. زيادة العرض تذهب إلى آخر عمود حر — الأعمدة المثبتة لا تتحرك أبدًا.')}</p>
      <div className="nkw-tiles">
        <div className="nkw-tile">
          <ParameterField id="nkw-in-width" label={L('Width (mm)', 'العرض (مم)')} value={design.dims.w} min={dimRange.w[0]} max={dimRange.w[1]} step={10} slider={false} compact hideRange lang={lang}
            helper={<span className="nkw-inner" data-testid="inner-w">{L('inner', 'داخلي')} {inner.w}</span>} onChange={(v) => G.onWidth(Math.round(v))} />
        </div>
        <div className="nkw-tile">
          <ParameterField id="nkw-in-height" label={L('Height (mm)', 'الارتفاع (مم)')} value={design.dims.h} min={dimRange.h[0]} max={dimRange.h[1]} step={10} slider={false} compact hideRange lang={lang}
            helper={<span className="nkw-inner" data-testid="inner-h">{L('inner', 'داخلي')} {inner.h}</span>} onChange={(v) => G.onHeight(Math.round(v))} />
        </div>
        <div className="nkw-tile">
          <ParameterField id="nkw-in-depth" label={L('Depth (mm)', 'العمق (مم)')} value={design.dims.d} min={dimRange.d[0]} max={dimRange.d[1]} step={10} slider={false} compact hideRange lang={lang}
            onChange={(v) => G.onDepth(Math.round(v))} />
        </div>
      </div>
      <div className="nkw-colsrow" role="group" aria-label={L('Columns', 'الأعمدة')}>
        <span className="nkw-colslbl">{L('Columns', 'الأعمدة')}</span>
        <Step value={n} min={1} max={12} label={L('Columns', 'الأعمدة')} onChange={G.onCols} />
      </div>
      <label className="nk-chk nkw-keep nkw-keepbig"><input type="checkbox" checked={G.keepW} onChange={(e) => G.onKeepW(e.target.checked)} data-testid="keep-width-g" /> <b>{L("Keep the closet's total width", 'الحفاظ على العرض الكلي للخزانة')}</b></label>
      <p className="nk-sub nkw-note" data-testid="keep-width-note">{G.keepW
        ? L(`Main unit stays ${Math.round(design.dims.w / 10)} cm; a new column takes its width from the free column.`, `تبقى الوحدة الرئيسية ${Math.round(design.dims.w / 10)} سم؛ والعمود الجديد يأخذ عرضه من العمود الحر.`)
        : L('The total width follows the columns.', 'العرض الكلي يتبع الأعمدة.')}</p>
    </section>
  );
}

/* ---- 01 Heights and depths -------------------------------------------------------------------------------------------------------- */
function HRow({ n, label, desc, htmlFor, on, onSel, children, dark = true }) {
  return (
    <div className="nk-shelf-row nk-ar-row nkw-hrow" data-on={on ? '1' : '0'} aria-current={on ? 'true' : undefined} onFocus={onSel} onPointerDown={onSel}>
      <span className="nk-cn" aria-hidden="true" data-dark={dark ? '1' : '0'}>{n}</span>
      <div className="nk-ctl-t"><label htmlFor={htmlFor} className="nk-ctl-name">{label}</label><p className="nk-ctl-d">{desc}</p></div>
      <div className="nk-shelf-in">{children}</div>
    </div>
  );
}
export function HeightsCard({ G }) {
  const { lang, design, x, dimRange } = G; const L = (en, ar) => (lang === 'ar' ? ar : en);
  const [sel, setSel] = useState(0);
  const card = CLOSET_CARDS.heights; const f = (i) => card.f[i];
  const pick = (i) => { setSel(i); const el = document.getElementById(i === 3 ? 'nkw-in-cdepth' : `nk-in-${f(i).k}`); if (el) { el.focus(); if (el.select) el.select(); } };
  const body = bodyHeight(design);
  const field = (k, i, extra = {}) => (
    <ParameterField id={`nk-in-${k}`} hideLabel label={L(f(i).en, f(i).ar)} value={x[k]} min={f(i).min} max={f(i).max} step={f(i).step} slider={false} compact hideRange lang={lang}
      onChange={(v) => G.setField(k, v)} {...extra} />
  );
  return (
    <section className="nk-card nk-ccard nk-shelfcard nkw-heights" id="nk-card-heights" data-testid="card-heights" aria-labelledby="nk-card-h-heights">
      <div className="nk-card-head"><Cnum n={1} /><h3 className="nk-h3" id="nk-card-h-heights">{L(card.en, card.ar)}</h3></div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <figure className="nk-shelf-stage">
        <HeightsArt v={{ h: design.dims.h, plinthH: x.plinthH, topBoxH: x.topBoxH, depth: design.dims.d, setback: x.plinthSetback, cols: design.mods.filter((m) => !m.hidden).map((m) => m.width) }} active={HEIGHT_ACTIVE[sel]} onPick={pick} lang={lang} />
      </figure>
      <div className="nk-summary nkw-overall" role="status"><span>{L('Overall height', 'الارتفاع الكلي')}</span><b dir="ltr" data-testid="overall-h">{design.dims.h} mm</b></div>
      <label className="nk-chk nkw-keep nkw-keepbig"><input type="checkbox" checked={G.keepH} onChange={(e) => G.onKeepH(e.target.checked)} data-testid="keep-height" /> <b>{L("Keep the closet's overall height", 'الحفاظ على الارتفاع الكلي للخزانة')}</b></label>
      <p className="nk-sub nkw-note" data-testid="keep-height-note">{G.keepH
        ? L(`Overall stays ${Math.round(design.dims.h / 10)} cm; the body absorbs a top-box change.`, `يبقى الارتفاع الكلي ${Math.round(design.dims.h / 10)} سم؛ ويمتص الهيكل تغيّر الصندوق العلوي.`)
        : L('The overall height follows the plinth and the top box; the body keeps its height.', 'الارتفاع الكلي يتبع القاعدة والصندوق العلوي؛ ويحتفظ الهيكل بارتفاعه.')}</p>
      <HRow n={1} label={L(f(0).en, f(0).ar)} desc={f(0).d[lang]} htmlFor="nk-in-plinthH" on={sel === 0} onSel={() => setSel(0)} dark={false}>{field('plinthH', 0)}</HRow>
      <HRow n={2} label={L(f(1).en, f(1).ar)} desc={f(1).d[lang]} htmlFor="nkw-body" on={sel === 1} onSel={() => setSel(1)}>
        <span className="nkw-ro" id="nkw-body" role="status" tabIndex={0} data-testid="body-h" aria-label={L('Body height (computed)', 'ارتفاع الهيكل (محسوب)')}><b dir="ltr">{body}</b><span className="nk-unit">mm</span></span>
      </HRow>
      <HRow n={3} label={L(f(2).en, f(2).ar)} desc={f(2).d[lang]} htmlFor="nk-in-topBoxH" on={sel === 2} onSel={() => setSel(2)}>{field('topBoxH', 2)}</HRow>
      <div className="nkw-sub" role="presentation">{L('Depths · side view', 'الأعماق · منظر جانبي')}</div>
      <HRow n={4} label={L(f(3).en, f(3).ar)} desc={f(3).d[lang]} htmlFor="nkw-in-cdepth" on={sel === 3} onSel={() => setSel(3)}>
        <ParameterField id="nkw-in-cdepth" hideLabel label={L('Closet depth (mm)', 'عمق الخزانة (مم)')} value={design.dims.d} min={dimRange.d[0]} max={dimRange.d[1]} step={10} slider={false} compact hideRange lang={lang} onChange={(v) => G.onDepth(Math.round(v))} />
      </HRow>
      <HRow n={5} label={L(f(4).en, f(4).ar)} desc={f(4).d[lang]} htmlFor="nk-in-plinthSetback" on={sel === 4} onSel={() => setSel(4)}>{field('plinthSetback', 4)}</HRow>
      {G.heightNote && <ul className="nk-shelf-warn" role="status" aria-live="polite" data-testid="height-issues"><li data-level="warn">{G.heightNote}</li></ul>}
    </section>
  );
}

/* ---- 02 / 03 / 04: the kitchen cards through the adapter --------------------------------------------------------------------------- */
export function ClosetCarcassCard({ G, num = 2 }) {
  const P = useMemo(() => cardSource(G), [G.x, G.design.dims.d, G.model, G.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return <CarcassCard card={CLOSET_CARDS.carcass} num={num} P={P} closet />;
}
export function ClosetDoorsCard({ G, num = 3 }) {
  const P = useMemo(() => cardSource(G), [G.x, G.design.dims.d, G.model, G.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = (en, ar) => (G.lang === 'ar' ? ar : en);
  return (
    <DoorsCard card={CLOSET_CARDS.doors} num={num} P={P}>
      <div className="nkw-toggle-row" data-testid="handles-row">
        <div className="nk-ctl-t"><b className="nk-ctl-name">{L('Handles', 'المقابض')}</b><p className="nk-ctl-d">{L('Finger pulls on wood doors', 'مقابض إصبع على الأبواب الخشبية')}</p></div>
        <Toggle on={G.handlesOn} onChange={G.onHandles} label={L('Handles', 'المقابض')} />
      </div>
    </DoorsCard>
  );
}
/** [NEO-CLOSETS-UX30] where the drawers go: the closet-wide default (Front | Inside) and what an Inside drawer is made of. A column's own Front | Inside (Main tab, Drawers tab) wins over the default. */
export function InsideDrawerSettings({ G, testid = 'inside-settings' }) {
  const { lang, x } = G; const L = (en, ar) => (lang === 'ar' ? ar : en);
  const f = (k) => WFIELD[k];
  const num = (k, en, ar, helper) => (
    <ParameterField id={`${testid}-${k}`} label={L(en, ar)} value={x[k]} min={f(k).min} max={f(k).max} step={f(k).step} slider={false} compact hideRange lang={lang} helper={helper}
      onChange={(v) => G.setField(k, v)} testid={`${testid}-${k}-in`} />
  );
  return (
    <div className="nkw-inside" data-testid={testid}>
      <div className="nkw-toggle-row" data-testid="drawer-mode-row">
        <div className="nk-ctl-t"><b className="nk-ctl-name">{L('Drawer position', 'موضع الأدراج')}</b>
          <p className="nk-ctl-d">{x.drawerMode === 'inside'
            ? L('Inside: drawer boxes sit in the carcass behind the column door, which covers them. Open the door to reach them.', 'داخلي: صناديق الأدراج داخل الهيكل خلف باب العمود الذي يغطيها. افتح الباب للوصول إليها.')
            : L('Front: the drawer fronts are exposed and the door stops above them.', 'أمامي: واجهات الأدراج ظاهرة والباب يتوقف فوقها.')}</p></div>
        <Seg label={L('Default drawer position', 'موضع الأدراج الافتراضي')} value={x.drawerMode} onChange={G.onDrawerMode} options={[['front', L('Front', 'أمامي')], ['inside', L('Inside', 'داخلي')]]} />
      </div>
      <div className="nkw-toggle-row" data-testid="door-cover-row">
        <div className="nk-ctl-t"><b className="nk-ctl-name">{L('Door height', 'ارتفاع الباب')}</b><p className="nk-ctl-d">{L('Inside drawers: the door spans the drawer zone, or stops above it (the drawers then show an inset front).', 'الأدراج الداخلية: الباب يغطي منطقة الأدراج أو يتوقف فوقها (فتظهر لها واجهة غائرة).')}</p></div>
        <Seg label={L('Door height over inside drawers', 'ارتفاع الباب فوق الأدراج الداخلية')} value={x.doorCover} onChange={G.onDoorCover} options={[['full', L('Full', 'كامل')], ['above', L('Above drawers', 'فوق الأدراج')]]} />
      </div>
      <div className="nkw-toggle-row" data-testid="inner-front-row">
        <div className="nk-ctl-t"><b className="nk-ctl-name">{L('Inside drawer front', 'واجهة الدرج الداخلي')}</b><p className="nk-ctl-d">{L('Inner front: a thin board on the box. Box front: the box front is the front.', 'واجهة داخلية: لوح رقيق على الصندوق. واجهة الصندوق: أمام الصندوق هو الواجهة.')}</p></div>
        <Seg label={L('Inside drawer front', 'واجهة الدرج الداخلي')} value={x.innerFront} onChange={G.onInnerFront} options={[['inner', L('Inner front', 'واجهة داخلية')], ['box', L('Box front', 'أمام الصندوق')]]} />
      </div>
      {num('innerThk', 'Inner front board (mm)', 'لوح الواجهة الداخلية (مم)', L('thickness of the inset front', 'سماكة الواجهة الغائرة'))}
      {num('innerClear', 'Door clearance (mm)', 'خلوص الباب (مم)', L('gap behind the door; the box is this much shorter', 'الفراغ خلف الباب؛ ويقصر الصندوق بهذا المقدار'))}
    </div>
  );
}
export function ClosetDrawersCard({ G, num = 4 }) {
  const P = useMemo(() => cardSource(G), [G.x, G.design.dims.d, G.model, G.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return <DrawersCard card={CLOSET_CARDS.drawers} num={num} P={P}><InsideDrawerSettings G={G} /></DrawersCard>;
}

/* ---- 05 Shelves & Rails ----------------------------------------------------------------------------------------------------------- */
export function ShelvesRailsCard({ G, num = 5 }) {
  const { lang, x } = G; const L = (en, ar) => (lang === 'ar' ? ar : en);
  const card = CLOSET_CARDS.shelves;
  const P = useMemo(() => cardSource(G), [G.x, G.design.dims.d, G.model, G.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = useActiveRow(card);
  const issues = shelfIssues(P.model);
  return (
    <section className="nk-card nk-ccard nk-shelfcard nkw-railcard" id="nk-card-shelves" data-testid="card-shelves" aria-labelledby="nk-card-h-shelves">
      <div className="nk-card-head"><Cnum n={num} /><h3 className="nk-h3" id="nk-card-h-shelves">{L(card.en, card.ar)}</h3></div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <figure className="nk-shelf-stage">
        <RailArt v={{ board: x.board, shelfThk: x.shelfThk, railDia: x.railDia, railDrop: x.railDrop, railH: x.railH }} active={RAIL_ACTIVE[active.sel]} onPick={active.pick} lang={lang} />
        <figcaption className="nk-shelf-cap">{L('front view · rail under the top, shelves between the sides', 'منظر أمامي · المعلاق تحت السقف والرفوف بين الجانبين')}</figcaption>
      </figure>
      <CardRows card={card} P={P} active={active} />
      {issues.length > 0 && (
        <ul className="nk-shelf-warn" role="status" aria-live="polite" data-testid="shelf-issues">
          {issues.map((it, i) => <li key={i} data-level={it.level}>{L(it.en, it.ar)}</li>)}
        </ul>
      )}
    </section>
  );
}

/** the five cards, in the owner's order */
export default function GlobalCards({ G }) {
  return (
    <>
      <ClosetDimensionsCard G={G} />
      <HeightsCard G={G} />
      <ClosetCarcassCard G={G} num={2} />
      <ClosetDoorsCard G={G} num={3} />
      <ClosetDrawersCard G={G} num={4} />
      <ShelvesRailsCard G={G} num={5} />
    </>
  );
}
