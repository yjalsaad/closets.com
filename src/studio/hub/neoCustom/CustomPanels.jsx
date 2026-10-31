/* =============================================================================
 * Neo Custom Designer [NEO-CUSTOM-UX28] - the Global, M&S and Hardware tabs of the Parameters panel (the Parts tab is CustomParts.jsx).
 *   Global    starter templates, overall W x H x D, board values, Look presets + Daylight, the warnings list, the placeholder price rates
 *   M&S       board finish + the SHARED Look and Production-materials blocks (colour / texture / names / inventory mapping), run on this design
 *   Hardware  handle style, the hardware list (hinges, runners, handles, feet, joinery estimate ...), quick-add hardware parts
 * All numeric inputs are the shared ParameterField. Nothing here owns state: every change goes through the studio's commit().
 * ===========================================================================*/
import React from 'react';
import ParameterField from '../neoKitchen/ParameterField';
import { Seg, Toggle, Collapse } from '../neoKitchen/ui';
import LookBlock from '../neoKitchen/LookBlock';
import ProductionMaterials from '../neoKitchen/ProductionMaterials';
import LookPresets from '../neoKitchen/LookPresets';
import { FINISHES, HANDLE_LENS, BOARD } from '../neoKitchen/constants';
import { DIM, G_RANGE, SLOTS, setDims, setG, setX, FINISH_KEYS, normalizeDesign } from './customModel';
import { TEMPLATES } from './customTemplates';
import { PLACEHOLDER_RATES, INVENTED, mergeRates, money } from './customPrice';

const Card = ({ title, children, note, testid }) => (
  <section className="nk-card nkc-card" data-testid={testid}>
    <div className="nk-card-head"><b className="nk-card-title">{title}</b></div>
    <div className="nkc-card-body">{children}</div>
    {note ? <p className="nk-sub nkc-note">{note}</p> : null}
  </section>
);
const Row = ({ label, children }) => (<div className="nkc-row"><span className="nkc-row-l">{label}</span><div className="nkc-row-c">{children}</div></div>);
const PF = ({ label, value, min, max, step = 1, unit = 'mm', onChange, lang, slider = false, helper, testid }) => (
  <ParameterField label={label} value={value} min={min} max={max} step={step} unit={unit} onChange={onChange} slider={slider} compact={!slider} lang={lang} helper={helper} testid={testid} />
);

/* ---- Global ----------------------------------------------------------------------------------------------------- */
export function GlobalPanel({ P }) {
  const { design, commit, lang, built, onTemplate, look, onLook, onSun, daylight, onDaylight, grid, onGrid, warnings, onPickPart } = P;
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const setDim = (k, v) => commit(setDims(design, { [k]: Math.round(v) }), `dim:${k}`);
  return (
    <>
      <Card title={L('Starter template', 'قالب جاهز')} note={L('A template is only a starting set of ordinary parts with constraints — change anything in the Parts tab.', 'القالب مجرد مجموعة أجزاء عادية بقيود للبدء — غيّر أي شيء من تبويب الأجزاء.')} testid="tpl-card">
        <div className="nk-chips" role="group" aria-label={L('Starter templates', 'القوالب الجاهزة')}>
          {TEMPLATES.map((t) => <button key={t.k} type="button" className="nk-chip" aria-pressed={design.tpl === t.k} onClick={() => onTemplate(t.k)} data-testid={`tpl-${t.k}`}>{ar ? t.ar : t.en}</button>)}
          <button type="button" className="nk-chip" aria-pressed={design.tpl === 'blank'} onClick={() => onTemplate('blank')} data-testid="tpl-blank">{L('Blank', 'فارغ')}</button>
        </div>
      </Card>
      <Card title={L('Overall size', 'الأبعاد الكلية')} note={L('Parts that Fill, align to an end or the centre, or are spaced equally follow these sizes; parts with a fixed offset and size keep them.', 'الأجزاء التي تملأ أو تتبع طرفًا أو المنتصف أو متباعدة بالتساوي تتبع هذه الأبعاد؛ والأجزاء ذات الإزاحة والمقاس الثابتين تحتفظ بهما.')} testid="size-card">
        <PF label={L('Width (mm)', 'العرض (مم)')} value={design.dims.w} min={DIM.w[0]} max={DIM.w[1]} step={10} slider lang={lang} onChange={(v) => setDim('w', v)} testid="dim-w" />
        <PF label={L('Height (mm)', 'الارتفاع (مم)')} value={design.dims.h} min={DIM.h[0]} max={DIM.h[1]} step={10} slider lang={lang} onChange={(v) => setDim('h', v)} testid="dim-h" />
        <PF label={L('Depth (mm)', 'العمق (مم)')} value={design.dims.d} min={DIM.d[0]} max={DIM.d[1]} step={10} slider lang={lang} onChange={(v) => setDim('d', v)} testid="dim-d" />
      </Card>
      <Card title={L('Boards and fronts', 'الألواح والواجهات')} note={L('"New panels" only sets the thickness a freshly added panel starts with. Door gap and drawer values shape the generated drawer boxes and fronts.', '«الألواح الجديدة» تحدد سماكة اللوح المضاف حديثًا فقط. قيم الباب والدرج تشكّل صناديق وواجهات الأدراج.')}>
        {Object.keys(G_RANGE).map((k) => (
          <PF key={k} label={`${ar ? G_RANGE[k][3] : G_RANGE[k][2]} (mm)`} value={design.g[k]} min={G_RANGE[k][0]} max={G_RANGE[k][1]} step={k === 'edgeBand' ? 0.1 : 0.5} lang={lang} onChange={(v) => commit(setG(design, { [k]: v }), `g:${k}`)} testid={`g-${k}`} />
        ))}
      </Card>
      <Card title={L('Look and light', 'المظهر والإضاءة')}>
        <LookPresets lang={lang} look={look.look} sun={look.sun} onLook={onLook} onSun={onSun} />
        <Row label={L('Daylight', 'ضوء النهار')}><Toggle on={daylight} onChange={onDaylight} label={L('Daylight', 'ضوء النهار')} /></Row>
        <Row label={L('Floor grid', 'شبكة الأرضية')}><Toggle on={grid} onChange={onGrid} label={L('Floor grid', 'شبكة الأرضية')} /></Row>
        <div className="nk-chips" role="group" aria-label={L('Board finish', 'تشطيب الألواح')}>
          {FINISH_KEYS.map((k) => <button key={k} type="button" className="nk-chip" aria-pressed={design.finishKey === k} onClick={() => commit(normalizeDesign({ ...design, finishKey: k }), 'finish')}><span className="nk-swatch" style={{ background: `var(${FINISHES[k].cssVar})` }} />{FINISHES[k][lang]}</button>)}
        </div>
      </Card>
      <Card title={`${L('Checks', 'الفحوصات')} · ${warnings.length}`} testid="checks-card">
        {warnings.length === 0
          ? <p className="nk-sub" data-testid="checks-ok">{L('No collisions, nothing outside the overall size, no floating part.', 'لا تصادمات ولا شيء خارج الأبعاد الكلية ولا جزء معلّق.')}</p>
          : (
            <ul className="nkc-warnlist">
              {warnings.map((w) => (
                <li key={w.id}><button type="button" className="nkc-warnbtn" onClick={() => onPickPart(w.partIds && w.partIds[0])} disabled={!w.partIds || !w.partIds.length}>{w[lang]}</button></li>
              ))}
            </ul>
          )}
      </Card>
      <RatesCard P={P} />
    </>
  );
}

/* ---- the placeholder price rates ----------------------------------------------------------------------------------- */
export function RatesCard({ P }) {
  const { design, commit, lang, built } = P;
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const R = mergeRates(design.x.rates);
  const patch = (path, v) => {
    const r = { ...design.x.rates };
    if (path.length === 2) r[path[0]] = { ...(r[path[0]] || {}), [path[1]]: v }; else r[path[0]] = v;
    commit(setX(design, { rates: r }), `rate:${path.join('.')}`);
  };
  const hwKeys = built.hardware.map((h) => h.k);
  const isNew = (p) => INVENTED.includes(p.join('.'));
  const field = (label, path, value, unit = 'BD') => (
    <ParameterField key={path.join('.')} label={`${label}${isNew(path) ? ' *' : ''}`} value={value} min={0} max={100000} step={0.05} unit={unit} slider={false} compact hideRange lang={lang} onChange={(v) => patch(path, v)} testid={`rate-${path.join('-')}`} />
  );
  return (
    <Collapse title={L('Price rates · PLACEHOLDERS', 'أسعار الوحدات · أرقام مؤقتة')} defaultOpen={false}>
      <div className="nkc-rates" data-testid="rates-card">
        <p className="nk-sub nkc-ratenote" data-testid="rates-note">{L('These rates are placeholders — the owner has not supplied a price list for custom furniture. Edit them here (saved inside the design file) or replace them before quoting. Rates marked * are invented here; the others are the Neo Kitchen estimate\'s own placeholders.', 'هذه الأسعار مؤقتة — لم يزوّد المالك قائمة أسعار للأثاث المخصص. عدّلها هنا (تُحفظ داخل ملف التصميم) أو استبدلها قبل التسعير. الأسعار المعلّمة بـ * وُضعت هنا افتراضيًا؛ والبقية هي الأسعار المؤقتة لتقدير المطبخ.')}</p>
        <h4 className="nkc-h4">{L('Board, per m² of cut board', 'الألواح، لكل م² مقصوص')}</h4>
        <div className="nkc-grid2">{Object.keys(PLACEHOLDER_RATES.board).map((k) => field(BOARD[k][lang], ['board', k], R.board[k], 'BD/m²'))}</div>
        <h4 className="nkc-h4">{L('Solid timber, per metre', 'الخشب الصلب، للمتر')}</h4>
        <div className="nkc-grid2">{field(L('Rectangular section', 'مقطع مستطيل'), ['timberM', 'rect'], R.timberM.rect, 'BD/m')}{field(L('Round section', 'مقطع دائري'), ['timberM', 'round'], R.timberM.round, 'BD/m')}</div>
        {field(L('Edge banding, per metre', 'شريط الحواف، للمتر'), ['edgeBandM'], R.edgeBandM, 'BD/m')}
        {hwKeys.length > 0 && <h4 className="nkc-h4">{L('Hardware in this design, per piece', 'الاكسسوارات في هذا التصميم، للقطعة')}</h4>}
        <div className="nkc-grid2">{built.hardware.map((h) => field(h[lang], ['hw', h.k], R.hw[h.k] || 0, 'BD'))}</div>
        <div className="nkc-grid2">{field(L('Labour %', 'العمالة %'), ['labourPct'], R.labourPct, '%')}{field(L('VAT %', 'الضريبة %'), ['vatPct'], R.vatPct, '%')}</div>
        <button type="button" className="nk-btn" onClick={() => commit(setX(design, { rates: {} }), 'rates:reset')} data-testid="rates-reset">{L('Back to the built-in placeholders', 'العودة إلى الأرقام المؤقتة الأصلية')}</button>
      </div>
    </Collapse>
  );
}

/* ---- M&S --------------------------------------------------------------------------------------------------------- */
export function MsPanel({ P }) {
  const { design, commit, lang, msP } = P;
  const L = (en, a) => (lang === 'ar' ? a : en);
  return (
    <>
      <Card title={L('Board finish', 'تشطيب الألواح')} note={L('The finish colours every board that is not painted in the Look block below (grain and tone in 3D).', 'التشطيب يلوّن كل لوح لم يُطلَ في كتلة المظهر أدناه (العرق واللون في العرض ثلاثي الأبعاد).')}>
        <div className="nk-chips" role="group" aria-label={L('Board finish', 'تشطيب الألواح')}>
          {FINISH_KEYS.map((k) => <button key={k} type="button" className="nk-chip" aria-pressed={design.finishKey === k} onClick={() => commit(normalizeDesign({ ...design, finishKey: k }), 'finish')} data-testid={`finish-${k}`}><span className="nk-swatch" style={{ background: `var(${FINISHES[k].cssVar})` }} />{FINISHES[k][lang]}</button>)}
        </div>
      </Card>
      <p className="nk-sub nkc-note">{L('Each part picks its material slot in the Parts tab; here you colour the slots (Look) and name the production material of each slot, optionally linked to an inventory item.', 'كل جزء يختار خانة المادة من تبويب الأجزاء؛ وهنا تلوّن الخانات (المظهر) وتسمّي مادة الإنتاج لكل خانة مع ربطها بصنف مخزون اختياريًا.')}</p>
      <div className="nkc-shared" data-testid="ms-shared"><LookBlock P={msP} /><ProductionMaterials P={msP} /></div>
    </>
  );
}
export const SLOT_ROWS = SLOTS.map((s) => ({ k: s.k, en: s.en, ar: s.ar }));

/* ---- Hardware ------------------------------------------------------------------------------------------------------ */
export function HardwarePanel({ P }) {
  const { design, commit, lang, built, onAddHw } = P;
  const L = (en, a) => (lang === 'ar' ? a : en);
  const h = design.x.handle;
  const setH = (patch) => commit(setX(design, { handle: { ...h, ...patch } }), 'handle');
  const HS = { bar: ['Bar handle', 'مقبض شريط'], knob: ['Knob', 'مقبض كرة'], profile: ['Profile (J-pull)', 'مقبض بروفايل'], push: ['Push-to-open', 'فتح بالضغط'], none: ['None', 'بدون'] };
  const POS = { auto: ['Auto', 'تلقائي'], top: ['Top', 'أعلى'], center: ['Centre', 'وسط'], bottom: ['Bottom', 'أسفل'] };
  return (
    <>
      <Card title={L('Handles', 'المقابض')} note={L('The project handle style for every door and drawer set to "Auto"; a single door or drawer can override it in the Parts tab.', 'نمط المقبض للمشروع لكل باب ودرج مضبوط على «تلقائي»؛ ويمكن لباب أو درج واحد تجاوزه من تبويب الأجزاء.')}>
        <div className="nk-chips" role="group" aria-label={L('Handle style', 'نوع المقبض')}>{Object.keys(HS).map((k) => <button key={k} type="button" className="nk-chip" aria-pressed={h.style === k} onClick={() => setH({ style: k })} data-testid={`handle-${k}`}>{HS[k][lang === 'ar' ? 1 : 0]}</button>)}</div>
        {h.style === 'bar' && <Row label={L('Length', 'الطول')}><div className="nk-chips">{HANDLE_LENS.map((n) => <button key={n} type="button" className="nk-chip nk-chip-sm" aria-pressed={h.len === n} onClick={() => setH({ len: n })}><span dir="ltr">{n}</span></button>)}</div></Row>}
        <Row label={L('Position on a door', 'الموضع على الباب')}><Seg label={L('Handle position', 'موضع المقبض')} value={h.pos} onChange={(v) => setH({ pos: v })} options={Object.keys(POS).map((k) => [k, POS[k][lang === 'ar' ? 1 : 0]])} /></Row>
      </Card>
      <Card title={L('Hardware list', 'قائمة الاكسسوارات')} testid="hw-card">
        {built.hardware.length === 0
          ? <p className="nk-sub">{L('No hardware yet: hinges, runners, handles and joinery appear here as soon as the design uses them.', 'لا اكسسوارات بعد: تظهر المفصلات والسكك والمقابض والتجميعات هنا عند استخدامها في التصميم.')}</p>
          : <table className="nk-table nk-table-sm"><tbody>{built.hardware.map((x) => <tr key={x.k}><td className="nk-td-name">{x[lang]}</td><td className="nk-mono nk-qty" data-testid={`hw-${x.k}`}>{x.qty}</td></tr>)}</tbody></table>}
        <Row label={L('Joinery estimate (dowels, minifix)', 'تقدير التجميعات (خوابير، ميني فكس)')}><Toggle on={design.x.joinery} onChange={(v) => commit(setX(design, { joinery: v }), 'joinery')} label={L('Joinery estimate', 'تقدير التجميعات')} /></Row>
        <p className="nk-sub nkc-note">{L('Joinery is an ESTIMATE from where boards touch (n = longer side of the joint / 300 mm, at least 2). The edge band is', 'التجميعات تقدير من أماكن تلامس الألواح (ن = الضلع الأطول للوصلة / 300 مم، 2 على الأقل). شريط الحواف')} <b dir="ltr">{built.bom.edgeMetres.toFixed(1)} m</b> {L('and solid timber is', 'والخشب الصلب')} <b dir="ltr">{built.bom.timberM.toFixed(2)} m</b>.</p>
      </Card>
      <Card title={L('Add a hardware part', 'إضافة جزء اكسسوار')}>
        <div className="nk-chips" role="group" aria-label={L('Add hardware', 'إضافة اكسسوار')}>
          <button type="button" className="nk-chip" onClick={() => onAddHw('foot')} data-testid="add-foot">+ {L('Adjustable foot', 'قدم قابلة للضبط')}</button>
          <button type="button" className="nk-chip" onClick={() => onAddHw('handle')} data-testid="add-handle">+ {L('Handle', 'مقبض')}</button>
          <button type="button" className="nk-chip" onClick={() => onAddHw('bracket')} data-testid="add-bracket">+ {L('Bracket', 'حامل')}</button>
        </div>
        <p className="nk-sub nkc-note">{money(built.est.net)} · {L('placeholder rates', 'أسعار مؤقتة')}</p>
      </Card>
    </>
  );
}
