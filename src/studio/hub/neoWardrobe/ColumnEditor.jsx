/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - the per-column editor card (Main tab and L-Shape tab): appears under the columns card when a column is picked in the drawing
 * (or a part in the 3D view). Header "Right column 3 · 56 cm" with hide (eye), pin and delete; Width; a small column preview with numbered zone pills; the Zones stepper and one
 * row per zone (type, shelf count / rail height from the floor / drawer count, zone height); Door [None | Door], Material [Wood | Glass | Smoked], Leaves [1 | 2], hinge side [L | R].
 * Everything edits the column's own entry (design.mods[i] / design.x.wing.mods[i]) through onPatch, so the 3D, the elevation, the cut list and the exports follow at once. */
import React from 'react';
import ParameterField from '../neoKitchen/ParameterField';
import { Seg } from '../neoKitchen/ui';
import { cmScale } from '../neoKitchen/fieldLogic';
import { Ic } from '../neoKitchen/icons';
import { Step } from './wardrobeParts';
import { COL_W, HANG_KEYS, DRAWER_H, DRAWER_H_RANGE, zonesOf, setZoneCount, setZoneType, ZONE_KEYS, leafWidth } from './wardrobeModel';

const ZONE_OFF = { shelves: { shelves: 0 }, rail: { hanging: 'none', railH: 0 }, drawers: { drawers: 0 } };
const MODE_CAP = { front: ['exposed fronts - the door stops above them', 'واجهات ظاهرة - الباب يتوقف فوقها'], inside: ['drawer boxes inside, behind the door', 'صناديق أدراج بالداخل خلف الباب'] };
const ZONE_LBL = { shelves: ['Shelves', 'رفوف'], rail: ['Rail', 'معلاق'], drawers: ['Drawers', 'أدراج'] };
const HANG_LBL = { single: ['Single', 'مفرد'], double: ['Double', 'مزدوج'], long: ['Long coats', 'معاطف طويلة'] };
const cm1 = (mm) => (Math.round(mm) / 10).toFixed(1);
const fmtCm = (mm) => `${Math.round(mm) / 10}`;

/** the column preview: a small box in a light 3D (front face + side + top), zones stacked top to bottom with numbered pills, and the width dimension under it */
export function ColumnPreview({ mod, zones, zoneH, width, lang, H = 150 }) {
  const ar = lang === 'ar';
  const bw = 74, bh = H, ox = 14, oy = 14, x0 = 34, y0 = 10;
  const tot = Math.max(1, zones.reduce((t, z) => t + Math.max(1, zoneH[z] || 0), 0));
  let acc = y0 + 4;
  const rects = zones.map((z) => { const h = Math.max(14, ((bh - 8) * Math.max(1, zoneH[z] || 0)) / tot); const r = { z, y: acc, h }; acc += h; return r; });
  const labelOf = (z) => (ar ? ZONE_LBL[z][1] : ZONE_LBL[z][0]);
  return (
    <svg viewBox="0 0 170 214" className="nkw-colprev" role="img" data-testid="col-preview" aria-label={ar ? 'معاينة العمود وتقسيماته' : 'Column preview and its zones'} style={{ direction: 'ltr' }}>
      <path className="nkw-cp-side" d={`M${x0 + bw} ${y0}l${ox} ${-oy + 0}v${bh}l${-ox} ${oy}z`} transform={`translate(0 ${oy})`} />
      <path className="nkw-cp-top" d={`M${x0} ${y0 + oy}l${ox} ${-oy}h${bw}l${-ox} ${oy}z`} />
      <rect className="nkw-cp-front" x={x0} y={y0 + oy} width={bw} height={bh} />
      {rects.map((r) => (
        <g key={r.z} data-zone={r.z}>
          {r.z === 'shelves' && [1, 2, 3].map((k) => (r.h > k * 12 ? <line key={k} className="nkw-cp-shelf" x1={x0 + 3} x2={x0 + bw - 3} y1={y0 + oy + r.y - y0 + (r.h * k) / 4} y2={y0 + oy + r.y - y0 + (r.h * k) / 4} /> : null))}
          {r.z === 'rail' && <line className="nkw-cp-rail" x1={x0 + 6} x2={x0 + bw - 6} y1={y0 + oy + r.y - y0 + 10} y2={y0 + oy + r.y - y0 + 10} />}
          {r.z === 'drawers' && [0, 1, 2].map((k) => (r.h > (k + 1) * 12 ? <rect key={k} className="nkw-cp-drawer" x={x0 + 4} y={y0 + oy + r.y - y0 + (r.h * k) / Math.max(1, mod.drawers) + 2} width={bw - 8} height={Math.max(6, r.h / Math.max(1, mod.drawers) - 4)} /> : null))}
        </g>
      ))}
      {rects.map((r, i) => (
        <g key={`p${r.z}`} className="nkw-cp-pill" aria-label={`${i + 1} ${labelOf(r.z)}`}>
          <rect x={x0 - 28} y={y0 + oy + r.y - y0 + r.h / 2 - 9} width="22" height="18" rx="9" /><text x={x0 - 17} y={y0 + oy + r.y - y0 + r.h / 2 + 4.5} textAnchor="middle">{i + 1}</text>
        </g>
      ))}
      <path className="nk-sh-meas" d={`M${x0} ${y0 + oy + bh + 14}H${x0 + bw}M${x0} ${y0 + oy + bh + 9}v10M${x0 + bw} ${y0 + oy + bh + 9}v10`} />
      <text className="nkw-cp-dim" x={x0 + bw / 2} y={y0 + oy + bh + 30} textAnchor="middle">{fmtCm(width)} cm</text>
    </svg>
  );
}

const DOOR_LBL = { solid: ['wood door', 'باب خشب'], glass: ['glass in a frame', 'زجاج في إطار'], smoked: ['smoked glass in a frame', 'زجاج مدخّن في إطار'] };

export default function ColumnEditor({ lang, rules, title, mod, colInfo, type, doorStyle, doorGap, drawerMode = 'front', doorCover = 'full', onPatch, onDelete, canDelete, testid = 'col-editor' }) {
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const zones = zonesOf(mod);
  const eff = mod.style || doorStyle;
  const hingedOK = type === 'hinged' && !mod.noDoor;
  const leaves = mod.leaves || (colInfo ? colInfo.leaves : 1);
  const zoneH = colInfo ? colInfo.zoneH : { shelves: 0, rail: 0, drawers: mod.drawers * DRAWER_H };
  const hasDoor = type !== 'open' && !mod.noDoor;
  const dMode = mod.dMode || drawerMode; const cover = mod.cover || doorCover;
  const hingeSide = mod.hinge || 'L';
  const maxDr = Math.min(6, (rules && rules.drawer_limit) || 4);
  const patchFull = (m2) => { const { width, id, ...rest } = m2; onPatch(rest); }; // a zone helper returns the whole column: only its zone fields are a patch (the width has its own rule)
  const typeSel = (z) => (
    <label className="nkw-zsel" data-testid={`zone-type-${z}`}>
      <Ic n="retry" size={14} /><select className="nkw-zsel-i" value={z} aria-label={L('Zone type', 'نوع المنطقة')} onChange={(e) => patchFull(setZoneType(mod, z, e.target.value))}>
        {ZONE_KEYS.map((k) => <option key={k} value={k} disabled={k !== z && zones.includes(k)}>{L(...ZONE_LBL[k])}</option>)}
      </select>
    </label>
  );
  return (
    <section className="nk-card nkw-card nkw-ced" data-testid={testid} aria-label={title}>
      <div className="nkw-ced-head">
        <h4 className="nkw-ced-t">{title} <span dir="ltr" className="nkw-ced-w" data-testid={`${testid}-w`}>{fmtCm(mod.width)} cm</span></h4>
        <button type="button" className="nkw-ced-b" aria-pressed={!!mod.pin} onClick={() => onPatch({ pin: !mod.pin })} data-testid={`${testid}-pin`}
          title={L('Pin: this column keeps its width when the closet width changes', 'تثبيت: يحتفظ هذا العمود بعرضه عند تغيّر عرض الخزانة')} aria-label={L('Pin the width of this column', 'تثبيت عرض هذا العمود')}>
          <Ic n="pin" size={16} />
        </button>
        <button type="button" className="nkw-ced-b" aria-pressed={!!mod.hidden} onClick={() => onPatch({ hidden: !mod.hidden })} data-testid={`${testid}-hide`}
          title={mod.hidden ? L('Show this column', 'إظهار هذا العمود') : L('Hide this column (it leaves the 3D, the cut list and the price)', 'إخفاء هذا العمود (يخرج من العرض ثلاثي الأبعاد وقائمة القص والسعر)')} aria-label={mod.hidden ? L('Show column', 'إظهار العمود') : L('Hide column', 'إخفاء العمود')}>
          <Ic n={mod.hidden ? 'eyeOff' : 'eye'} size={16} />
        </button>
        <button type="button" className="nkw-ced-b nkw-ced-del" disabled={!canDelete} onClick={onDelete} data-testid={`${testid}-del`} title={L('Delete this column', 'حذف هذا العمود')} aria-label={L('Delete column', 'حذف العمود')}>
          <Ic n="close" size={16} />
        </button>
      </div>

      <div className="nkw-ced-sec nkw-ced-widthrow">
        <ParameterField id={`${testid}-width`} label={L('Width', 'العرض')} value={mod.width} min={COL_W.min} max={COL_W.max} step={10} scale={cmScale()} slider={false} compact hideRange lang={lang}
          onChange={(v) => onPatch({ width: Math.round(v) }, 'width')} testid={`${testid}-width-in`} />
      </div>

      <div className="nkw-ced-body">
        <ColumnPreview mod={mod} zones={zones} zoneH={zoneH} width={mod.width} lang={lang} />
        <div className="nkw-ced-zones">
          <div className="nkw-ced-line"><span className="nkw-row-l">{L('Zones', 'المناطق')}</span><Step value={zones.length} min={0} max={3} label={L('Zones', 'المناطق')} onChange={(n) => patchFull(setZoneCount(mod, n))} /></div>
          {zones.map((z, i) => (
            <div className="nkw-zone" key={z} data-zone={z} data-testid={`zone-${z}`}>
              <span className="nkw-zn" aria-hidden="true">{i + 1}</span>
              {typeSel(z)}
              <div className="nkw-zc">
                {z === 'shelves' && <Step value={mod.shelves} min={1} max={8} label={L('Shelves', 'الرفوف')} onChange={(v) => onPatch({ shelves: v })} />}
                {z === 'drawers' && (
                  <div className="nkw-dr" data-testid="drawer-opts">
                    <div className="nkw-dr-top">
                      <Step value={mod.drawers} min={1} max={maxDr} label={L('Drawers', 'الأدراج')} onChange={(v) => onPatch({ drawers: v })} />
                      <Seg label={L('Drawer position', 'موضع الأدراج')} value={dMode} onChange={(v) => onPatch({ dMode: v })} options={[['front', L('Front', 'أمامي'), L(...MODE_CAP.front)], ['inside', L('Inside', 'داخلي'), L(...MODE_CAP.inside)]]} />
                    </div>
                    <ParameterField id={`${testid}-drawerh`} label={L('Drawer height', 'ارتفاع الدرج')} value={mod.drawerH || DRAWER_H} min={DRAWER_H_RANGE.min} max={DRAWER_H_RANGE.max} step={10} slider={false} compact hideRange lang={lang}
                      helper={L('mm per drawer slot · 220 = standard', 'مم لكل درج · 220 = القياسي')} onChange={(v) => onPatch({ drawerH: Math.round(v) }, 'drawerH')} testid={`${testid}-drawerh-in`} />
                    <p className="nk-sub nkw-note" data-testid="drawer-mode-cap">{dMode === 'inside' && !hasDoor ? L('This column has no door: the drawers keep exposed fronts.', 'هذا العمود بلا باب: تبقى واجهات الأدراج ظاهرة.') : L(...MODE_CAP[dMode])}</p>
                    {dMode === 'inside' && hasDoor && (
                      <div className="nkw-ced-line"><span className="nkw-row-l">{L('Door height', 'ارتفاع الباب')}</span>
                        <Seg label={L('Door height', 'ارتفاع الباب')} value={cover} onChange={(v) => onPatch({ cover: v })} options={[['full', L('Full', 'كامل'), L('The door covers the drawers', 'الباب يغطي الأدراج')], ['above', L('Above drawers', 'فوق الأدراج'), L('The door stops above the drawers, which show an inset front', 'الباب يتوقف فوق الأدراج وتظهر لها واجهة غائرة')]]} />
                      </div>
                    )}
                  </div>
                )}
                {z === 'rail' && (
                  <div className="nkw-zrail">
                    <select className="nk-inp nkw-zsel-plain" value={mod.hanging} aria-label={L('Rail type', 'نوع المعلاق')} onChange={(e) => onPatch({ hanging: e.target.value })}>
                      {HANG_KEYS.filter((k) => k !== 'none').map((k) => <option key={k} value={k}>{HANG_LBL[k][ar ? 1 : 0]}</option>)}
                    </select>
                    <ParameterField id={`${testid}-railh`} label={L('Rail from floor', 'المعلاق من الأرض')} hideLabel value={mod.railH || 0} min={0} max={2200} step={10} slider={false} compact hideRange lang={lang}
                      helper={L('rail · mm from floor · 0 = standard', 'معلاق · مم من الأرض · 0 = القياسي')} onChange={(v) => onPatch({ railH: Math.round(v) })} testid={`${testid}-railh-in`} />
                  </div>
                )}
                <span className="nkw-zcap" dir="ltr">{z === 'rail' ? '' : `${L('auto', 'تلقائي')} · `}{cm1(zoneH[z] || 0)} cm</span>
              </div>
              <button type="button" className="nkw-ced-b nkw-ced-del" onClick={() => onPatch(ZONE_OFF[z])}
                aria-label={L('Remove zone', 'إزالة المنطقة')} title={L('Remove this zone', 'إزالة هذه المنطقة')} data-testid={`zone-del-${z}`}><Ic n="close" size={14} /></button>
            </div>
          ))}
          {zones.length === 0 && <p className="nk-sub nkw-note">{L('No zones: an empty carcass. Add one with the Zones stepper.', 'لا مناطق: هيكل فارغ. أضف واحدة بزر المناطق.')}</p>}
        </div>
      </div>

      <div className="nkw-ced-sec">
        <div className="nkw-ced-line"><span className="nkw-row-l">{L('Door', 'الباب')}</span>
          <Seg label={L('Door', 'الباب')} value={hasDoor ? 'door' : 'none'} onChange={(v) => onPatch({ noDoor: v === 'none' })} options={[['none', L('None', 'بدون')], ['door', L('Door', 'باب')]]} />
        </div>
        <p className="nk-sub nkw-note" data-testid="door-cap">{!hasDoor ? L('open - the inside shows', 'مفتوح - الداخل ظاهر') : `${L(...DOOR_LBL[eff])}${type === 'sliding' ? L(' · sliding', ' · منزلق') : ''}`}</p>
        <div className="nkw-ced-line"><span className="nkw-row-l">{L('Material', 'المادة')}</span>
          <Seg label={L('Column door material', 'مادة باب العمود')} value={eff} onChange={(v) => onPatch({ style: v })} options={[['solid', L('Wood', 'خشب'), undefined, !hasDoor], ['glass', L('Glass', 'زجاج'), undefined, !hasDoor], ['smoked', L('Smoked', 'مدخّن'), undefined, !hasDoor]]} />
        </div>
        {mod.style && mod.style !== doorStyle && <p className="nk-sub nkw-note" data-testid="mat-note">{L('Drawn and cut as set here. The price engine has one door material for the closet, so the price uses the closet-wide one.', 'يُرسم ويُقص كما هو هنا. محرك السعر له مادة باب واحدة للخزانة، فيستخدم السعر المادة العامة.')}</p>}
        <div className="nkw-ced-line"><span className="nkw-row-l">{L('Leaves', 'الضلف')}</span>
          <Seg label={L('Door leaves', 'ضلف الباب')} value={String(leaves)} onChange={(v) => onPatch({ leaves: +v })} options={[['1', '1', undefined, !hingedOK], ['2', '2', undefined, !hingedOK]]} />
          <span className="nkw-hinge"><Seg label={L('Hinge side', 'جهة المفصلة')} value={hingeSide} onChange={(v) => onPatch({ hinge: v })} options={[['L', L('L', 'يسار'), L('Hinged on the left', 'مفصلة من اليسار'), !hingedOK || leaves !== 1], ['R', L('R', 'يمين'), L('Hinged on the right', 'مفصلة من اليمين'), !hingedOK || leaves !== 1]]} /></span>
        </div>
        <p className="nk-sub nkw-note" data-testid="leaf-cap">{!hingedOK ? (type === 'sliding' ? L('Sliding doors: two tracks, leaves and hinges do not apply.', 'أبواب منزلقة: سكتان، الضلف والمفصلات لا تنطبق.') : L('Leaves and hinges need a hinged door.', 'الضلف والمفصلات تحتاج بابًا مفصليًا.'))
          : leaves === 1 ? `${L('hinged', 'مفصلي')} ${hingeSide === 'L' ? L('left', 'يسار') : L('right', 'يمين')} · ${L('leaf', 'ضلفة')} ${Math.round(leafWidth(mod.width, 1, doorGap))} mm`
            : `${L('2 leaves, hinged at the outer edges', 'ضلفتان مفصلتان من الحافتين الخارجيتين')} · ${Math.round(leafWidth(mod.width, 2, doorGap))} mm`}</p>
      </div>
    </section>
  );
}
