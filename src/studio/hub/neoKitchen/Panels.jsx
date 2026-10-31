/* Neo Kitchen Designer - Global / M&S / Library / Project panels (numbered control cards). */
import React, { useRef } from 'react';
import CardArt from './Art';
import ShelvesCard from './ShelvesCard';
import DrawersCard from './DrawersCard';
import DoorsCard from './DoorsCard';
import CarcassCard from './CarcassCard';
import LookBlock from './LookBlock';
import ProductionMaterials from './ProductionMaterials';
import { LayoutPicker, LayoutPlan } from './LayoutPicker';
import { NumField, Toggle, Badge, Collapse, fmtLen } from './ui';
import OutputSettings from './OutputSettingsControl';
import {
  CARDS, FINISHES, COUNTERS, HANDLES, HANDLE_LENS, KITCHEN, GRAIN_KINDS,
} from './constants';
import {
  setGlobal, setRunWidth, setKitchenHeight, totalH, overallH, rowWidth, PRESETS, addUnit,
} from './model';

export const NewBadge = ({ lang }) => <Badge>{lang === 'ar' ? 'جديد' : 'NEW'}</Badge>;

/** one numbered spec control (label + description + slider/number field) - shared by the cards and the category panels */
export function FieldCtl({ f, i, P }) {
  const { model, lang, unit, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <div className="nk-ctl">
      <div className="nk-ctl-head">
        <span className="nk-cn" aria-hidden="true">{i + 1}</span>
        <div className="nk-ctl-t">
          <label htmlFor={`nk-in-${f.k}`} className="nk-ctl-name">{L(f.en, f.ar)} {f.src === 'new' && <NewBadge lang={lang} />}</label>
          <p className="nk-ctl-d">{f.d[lang]}</p>
        </div>
      </div>
      <NumField id={`nk-in-${f.k}`} label={L(f.en, f.ar)} value={model.g[f.k]} min={f.min} max={f.max} step={f.step || 1} uiUnit={unit} lang={lang}
        rangeNote={`${L('default', 'الافتراضي')} ${unit === 'in' ? (f.def / 25.4).toFixed(2) : f.def}`}
        onChange={(v) => { const r = setGlobal(model, f.k, v); commit(r.model, `g:${f.k}`); return r; }} />
    </div>
  );
}

export function CardView({ card, num, P }) {
  if (card.id === 'shelves') return <ShelvesCard card={card} num={num} P={P} />;
  if (card.id === 'drawers') return <DrawersCard card={card} num={num} P={P} />;
  if (card.id === 'doors') return <DoorsCard card={card} num={num} P={P} />;
  if (card.id === 'carcass') return <CarcassCard card={card} num={num} P={P} />;
  const { model, lang, unit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const pick = (i) => { const el = document.getElementById(`nk-in-${card.f[i].k}`); if (el) { el.focus(); el.select && el.select(); } };
  return (
    <section className="nk-card nk-ccard" id={`nk-card-${card.id}`} aria-labelledby={`nk-card-h-${card.id}`}>
      <div className="nk-card-head">
        <span className="nk-cnum">{String(num).padStart(2, '0')}</span>
        <h3 className="nk-h3" id={`nk-card-h-${card.id}`}>{L(card.en, card.ar)}</h3>
      </div>
      <p className="nk-cdesc">{card.d[lang]}</p>
      <CardArt id={card.art} g={model.g} onPick={pick} lang={lang} />
      {card.id === 'heights' && (
        <div className="nk-summary" role="status">
          <span>{L('Overall height', 'الارتفاع الكلي')}</span>
          <b dir="ltr" data-testid="overall-h">{fmtLen(overallH(model), unit)}</b>
        </div>
      )}
      {card.f.map((f, i) => <FieldCtl key={f.k} f={f} i={i} P={P} />)}
    </section>
  );
}

/** the numbered explanation cards 02..06 (Carcass, Doors & Hinges, Drawers, Shelves, Worktop) - shown at the bottom of BOTH the Global and the M&S tab.
 * Same components, same model.g, same NumField -> setGlobal -> commit path: an edit in one tab is the same edit in the other. */
export function ExplainCards({ P }) {
  return CARDS.slice(1).map((c, i) => <CardView key={c.id} card={c} num={i + 2} P={P} />);
}

export function GlobalPanel({ P }) {
  const { model, lang, unit, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const W = rowWidth(model.runs.main.base);
  const H = totalH(model);
  return (
    <div className="nk-pbody">
      <section className="nk-card" id="nk-card-dims">
        <div className="nk-card-head"><span className="nk-bar" /><h3 className="nk-h3">{L('Kitchen Dimensions', 'أبعاد المطبخ')}</h3><span className="nk-unit-tag">{unit}</span></div>
        <div className="nk-dimblock">
          <LayoutPicker P={P} goTab={P.goTab} />
          {P.scene && <LayoutPlan scene={P.scene} lang={lang} model={model} commit={commit} />}
        </div>
        <div className="nk-dimblock">
          <label className="nk-ctl-name" htmlFor="nk-in-kw">{L('Width', 'العرض')}</label>
          <NumField id="nk-in-kw" label={L('Kitchen width', 'عرض المطبخ')} value={W} min={KITCHEN.width.min} max={KITCHEN.width.max} step={10} uiUnit={unit} lang={lang}
            onChange={(v) => { const r = setRunWidth(model, 'main', v); commit(r.model, 'kw'); return r; }} />
        </div>
        <div className="nk-dimblock">
          <label className="nk-ctl-name" htmlFor="nk-in-kh">{L('Height', 'الارتفاع')}</label>
          <NumField id="nk-in-kh" label={L('Kitchen height', 'ارتفاع المطبخ')} value={H} min={KITCHEN.height.min} max={KITCHEN.height.max} step={10} uiUnit={unit} lang={lang}
            rangeNote={L(`Plinth ${model.g.plinthH} · base carcass ${model.g.baseH} kept · ${model.topOn ? 'base + wall + top' : 'base + wall (no top)'}`, `التوكيك ${model.g.plinthH} · الهيكل السفلي ${model.g.baseH} ثابت · ${model.topOn ? 'سفلي + علوي + ثالث' : 'سفلي + علوي (بدون ثالث)'}`)}
            onChange={(v) => { const r = setKitchenHeight(model, v); commit(r.model, 'kh'); return r; }} />
        </div>
        <div className="nk-dimblock">
          <label className="nk-ctl-name" htmlFor="nk-in-kd">{L('Depth', 'العمق')}</label>
          <NumField id="nk-in-kd" label={L('Base depth', 'عمق السفلي')} value={model.g.baseD} min={500} max={700} uiUnit={unit} lang={lang}
            rangeNote={L('base depth, owner range', 'عمق السفلي')}
            onChange={(v) => { const r = setGlobal(model, 'baseD', v); commit(r.model, 'g:baseD'); return r; }} />
        </div>
      </section>
      <CardView card={CARDS[0]} num={1} P={P} />
      <ExplainCards P={P} />
      <OutputSettings lang={lang} variant="card" testid="global-output" />
    </div>
  );
}

/** handle style / length / position (the same three model.handle fields everywhere they are shown) */
export function HandleControls({ P }) {
  const { model, lang, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const setHandle = (patch) => commit({ ...model, handle: { ...model.handle, ...patch } }, 'handle');
  return (
    <>
        <div className="nk-ctl-name nk-mt">{L('Handles', 'المقابض')} <NewBadge lang={lang} /></div>
        <div className="nk-row-wrap">
          <label className="nk-sel-l"><span>{L('Style', 'النوع')}</span>
            <select className="nk-select" value={model.handle.style} onChange={(e) => setHandle({ style: e.target.value })}>
              {Object.entries(HANDLES).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
            </select></label>
          <label className="nk-sel-l"><span>{L('Length (c/c)', 'الطول (مركز-مركز)')}</span>
            <select className="nk-select" value={model.handle.len} disabled={model.handle.style !== 'bar'} onChange={(e) => setHandle({ len: +e.target.value })}>
              {HANDLE_LENS.map((n) => <option key={n} value={n}>{n} mm</option>)}
            </select></label>
          <label className="nk-sel-l"><span>{L('Position', 'الموضع')}</span>
            <select className="nk-select" value={model.handle.pos} onChange={(e) => setHandle({ pos: e.target.value })}>
              {[['auto', L('Auto', 'تلقائي')], ['top', L('Top', 'أعلى')], ['center', L('Centre', 'وسط')], ['bottom', L('Bottom', 'أسفل')]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
        </div>
    </>
  );
}

export function MSPanel({ P }) {
  const { model, lang, commit } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  return (
    <div className="nk-pbody">
      <section className="nk-card">
        <div className="nk-card-head"><span className="nk-bar" /><h3 className="nk-h3">{L('Finish (PBR)', 'التشطيب (PBR)')}</h3></div>
        <div className="nk-chips" role="radiogroup" aria-label={L('Finish', 'التشطيب')}>
          {Object.entries(FINISHES).map(([k, f]) => (
            <button key={k} type="button" role="radio" aria-checked={model.finish === k} className="nk-chip" onClick={() => commit({ ...model, finish: k }, 'finish')}>
              <span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}
            </button>
          ))}
        </div>
        <div className="nk-ctl-name nk-mt">{L('Countertop material', 'مادة سطح العمل')} <NewBadge lang={lang} /></div>
        <div className="nk-chips" role="radiogroup" aria-label={L('Countertop material', 'مادة سطح العمل')}>
          {Object.entries(COUNTERS).map(([k, f]) => (
            <button key={k} type="button" role="radio" aria-checked={model.counter === k} className="nk-chip" onClick={() => commit({ ...model, counter: k }, 'counter')}>
              <span className="nk-swatch" style={{ background: `var(${f.cssVar})` }} />{f[lang]}
            </button>
          ))}
        </div>
        <HandleControls P={P} />
      </section>
      <LookBlock P={P} />
      <ProductionMaterials P={P} />
      <ExplainCards P={P} />
    </div>
  );
}

export function LibraryPanel({ P }) {
  const { model, lang, commit, activeRun, notify } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const rk = activeRun;
  return (
    <div className="nk-pbody">
      <section className="nk-card">
        <div className="nk-card-head"><span className="nk-bar" /><h3 className="nk-h3">{L('Cabinet library', 'مكتبة الوحدات')} <NewBadge lang={lang} /></h3></div>
        <p className="nk-cdesc">{L(`Ready-made units added to the ${rk} run. Edit them afterwards like any other unit.`, `وحدات جاهزة تُضاف إلى الصف (${rk}). عدّلها بعد ذلك كأي وحدة.`)}</p>
        {['base', 'wall'].map((row) => (
          <div key={row}>
            <div className="nk-ctl-name nk-mt">{row === 'base' ? L('Base / tall / corner', 'سفلي / طويل / ركن') : L('Wall', 'علوي')}</div>
            <div className="nk-lib">
              {PRESETS.filter((p) => p.row === row).map((p) => (
                <button key={p.k} type="button" className="nk-lib-b" onClick={() => { commit(addUnit(model, rk, row, p.unit()), `lib:${p.k}`); if (notify) notify(`${p[lang]} +`); }}>
                  <span>{p[lang]}</span><span className="nk-lib-add">+</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function ProjectPanel({ P }) {
  const { model, lang, commit, prices, setPrices, importFile, resetAll, undo, redo, canUndo, canRedo, autosaveAt, doExport } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const fileRef = useRef(null);
  const setHW = (k, v) => setPrices({ ...prices, hw: { ...prices.hw, [k]: +v || 0 } });
  const grainOpts = [['V', L('Vertical', 'عمودي')], ['H', L('Horizontal', 'أفقي')], ['N', L('None', 'بدون')]];
  const grainNames = { side: ['Side', 'جانب'], bottom: ['Bottom', 'قاعدة'], top: ['Top panel', 'لوح علوي'], stretcher: ['Stretcher', 'رباط'], divider: ['Divider', 'فاصل'], back: ['Back', 'ظهر'], shelf: ['Shelf', 'رف'], door: ['Door', 'باب'], drawerFront: ['Drawer front', 'واجهة درج'], drawerBox: ['Drawer box', 'صندوق درج'], plinth: ['Plinth', 'قاعدة'], counter: ['Worktop', 'سطح'] };
  return (
    <div className="nk-pbody">
      <section className="nk-card">
        <div className="nk-card-head"><span className="nk-bar" /><h3 className="nk-h3">{L('Project', 'المشروع')}</h3></div>
        <div className="nk-ctl-name">{L('Title', 'العنوان')}</div>
        <input type="text" className="nk-inp nk-inp-wide" aria-label={L('Project title', 'عنوان المشروع')} maxLength={80} value={model.title} onChange={(e) => commit({ ...model, title: e.target.value }, 'title')} />
        <div className="nk-ctl-name nk-mt">{L('Units', 'الوحدات')} <NewBadge lang={lang} /></div>
        <OutputSettings lang={lang} variant="card" testid="project-output" />
        <p className="nk-cdesc">{L('Values are always stored in millimetres; this only changes how they are shown, typed and exported.', 'القيم تُخزَّن دائمًا بالمليمتر؛ هذا يغيّر العرض والإدخال والتصدير فقط.')}</p>
        <div className="nk-ctl-name nk-mt">{L('History', 'السجل')} <NewBadge lang={lang} /></div>
        <div className="nk-row-wrap">
          <button type="button" className="nk-btn" disabled={!canUndo} onClick={undo}>↶ {L('Undo', 'تراجع')}</button>
          <button type="button" className="nk-btn" disabled={!canRedo} onClick={redo}>↷ {L('Redo', 'إعادة')}</button>
          <button type="button" className="nk-btn nk-btn-danger" onClick={resetAll}>{L('New project', 'مشروع جديد')}</button>
        </div>
        <p className="nk-cdesc" role="status">{autosaveAt ? L(`Autosaved in this browser at ${autosaveAt}.`, `حُفظ تلقائيًا في هذا المتصفح الساعة ${autosaveAt}.`) : L('Autosave is on (this browser only).', 'الحفظ التلقائي مفعّل (هذا المتصفح فقط).')}</p>
        <div className="nk-ctl-name nk-mt">{L('Share', 'مشاركة')} <NewBadge lang={lang} /></div>
        <div className="nk-row-wrap">
          <button type="button" className="nk-btn" onClick={() => doExport('json')}>⤓ {L('Save project JSON', 'حفظ المشروع JSON')}</button>
          <button type="button" className="nk-btn" onClick={() => fileRef.current && fileRef.current.click()}>⤒ {L('Import project JSON', 'استيراد مشروع JSON')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="nk-sr" aria-label={L('Import project JSON', 'استيراد مشروع JSON')} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) importFile(f); e.target.value = ''; }} />
        </div>
      </section>
      <Collapse title={<>{L('Grain direction per panel', 'اتجاه العرق لكل لوح')} <NewBadge lang={lang} /></>} defaultOpen={false}>
        <p className="nk-cdesc">{L('Sets the grain used in the cut list. Doors can also be overridden per unit.', 'يحدد العرق في قائمة القص. يمكن تغييره للأبواب لكل وحدة.')}</p>
        {GRAIN_KINDS.map((k) => (
          <label key={k} className="nk-mat-row"><span>{grainNames[k][lang === 'ar' ? 1 : 0]}</span>
            <select className="nk-select" value={model.grain[k]} onChange={(e) => commit({ ...model, grain: { ...model.grain, [k]: e.target.value } }, `grain:${k}`)}>
              {grainOpts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></label>
        ))}
      </Collapse>
      <Collapse title={<>{L('Prices (estimate)', 'الأسعار (تقدير)')} <NewBadge lang={lang} /></>} defaultOpen={false}>
        <p className="nk-cdesc">{L('Placeholder prices in BHD - replace with your own costs. Stored in this browser only.', 'أسعار تقريبية بالدينار البحريني - استبدلها بتكاليفك. تُحفظ في هذا المتصفح فقط.')}</p>
        {Object.keys(prices.board).map((k) => <label key={k} className="nk-mat-row"><span>{k} / m²</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label={`${k} price per m2`} value={prices.board[k]} onChange={(e) => setPrices({ ...prices, board: { ...prices.board, [k]: +e.target.value || 0 } })} /></label>)}
        {Object.keys(prices.counter).map((k) => <label key={k} className="nk-mat-row"><span>{COUNTERS[k][lang]} / m²</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label={`${k} counter price per m2`} value={prices.counter[k]} onChange={(e) => setPrices({ ...prices, counter: { ...prices.counter, [k]: +e.target.value || 0 } })} /></label>)}
        <label className="nk-mat-row"><span>{L('Edge band / m', 'شريط حواف / م')}</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label="edge band price per metre" value={prices.edgeBandM} onChange={(e) => setPrices({ ...prices, edgeBandM: +e.target.value || 0 })} /></label>
        {Object.keys(prices.hw).map((k) => <label key={k} className="nk-mat-row"><span>{k}</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label={`${k} hardware price`} value={prices.hw[k]} onChange={(e) => setHW(k, e.target.value)} /></label>)}
        <label className="nk-mat-row"><span>{L('Labour %', 'العمالة %')}</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label="labour percent" value={prices.labourPct} onChange={(e) => setPrices({ ...prices, labourPct: +e.target.value || 0 })} /></label>
        <label className="nk-mat-row"><span>{L('VAT %', 'ضريبة %')}</span><input type="text" inputMode="decimal" dir="ltr" className="nk-inp" aria-label="vat percent" value={prices.vatPct} onChange={(e) => setPrices({ ...prices, vatPct: +e.target.value || 0 })} /></label>
      </Collapse>
      <Collapse title={<>{L('Toggles', 'خيارات')}</>} defaultOpen>
        <div className="nk-toggle-row"><span>{L('Top (third-tier) row', 'الصف الثالث')}</span><Toggle on={model.topOn} label={L('Top row', 'الصف الثالث')} onChange={(v) => commit({ ...model, topOn: v }, 'topOn')} /></div>
      </Collapse>
    </div>
  );
}
