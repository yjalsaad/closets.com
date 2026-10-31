/* Neo Kitchen Designer - UX-16 "Look" block of the M&S tab: colour + texture per part group, live in 3D.
 * Writes model.paint through the designer's commit() (one undoable history step per edit, coalesced while a colour is dragged).
 * model.paint is display data: it never reaches buildScene geometry, the cut list or the Finish presets (model.finish stays as it was). */
import React, { useState, useRef } from 'react';
import './materialsPro.css';
import MaterialMap, { useGroupColours, ColourProbe } from './MaterialMap';
import { PAINT_GROUPS, PAINT_TEX } from './constants';
import { setPaint, clearPaint, hasPaint } from './materials';

/* the texture a group shows when nothing was chosen: doors, drawer fronts and the worktop carry their own grain / veins */
const DEF_TEX = { carcass: 'off', doors: 'default', drawerFronts: 'default', shelves: 'off', back: 'off', counter: 'default', plinth: 'off', handles: 'off' };

export default function LookBlock({ P }) {
  const { model, lang, commit, scene } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const probe = useRef(null);
  const [hover, setHover] = useState(null);
  const { effective } = useGroupColours(model, probe);
  const paint = model.paint || {};
  const on = (g) => () => setHover(g);
  const off = () => setHover(null);
  return (
    <section className="nk-card nk-mp" data-testid="look-block" aria-labelledby="nk-lk-h">
      <ColourProbe ref={probe} />
      <div className="nk-card-head nk-mp-head">
        <h3 className="nk-h3" id="nk-lk-h">{L('Look', 'المظهر')}</h3>
        <span className="nk-mp-live">{L('live in 3D', 'مباشر في 3D')}</span>
      </div>
      <div className="nk-mp-map"><MaterialMap scene={scene} target={hover ? { group: hover } : null} colours={effective} paint={paint} label={P.partMapLabel ? L(P.partMapLabel[0], P.partMapLabel[1]) : L('Kitchen part map', 'خريطة أجزاء المطبخ')} testid="look-map" /></div>
      <p className="nk-mp-cap">{L('Colour and texture per part. Hover a row to see which parts it paints.', 'اللون والخامة لكل جزء. مرّر على صف لترى الأجزاء التي يلوّنها.')}</p>
      <div className="nk-lk-rows">
        {PAINT_GROUPS.filter((g) => !(P.hideGroups || []).includes(g.k)).map((g) => { // P.hideGroups (wardrobe studio): groups the product does not have (worktop)
          const o = paint[g.k] || null; const name = L(g.en, g.ar);
          const hex = effective[g.k];
          return (
            <div key={g.k} className={`nk-lk-row${hover === g.k ? ' is-on' : ''}`} data-group={g.k} data-edited={o ? '1' : '0'}
              onMouseEnter={on(g.k)} onMouseLeave={off} onFocus={on(g.k)} onBlur={off}>
              <span className="nk-lk-name">{name}</span>
              <label className="nk-lk-sw" title={L('Colour', 'اللون')}>
                <input type="color" className="nk-lk-color" aria-label={`${name} - ${L('colour', 'اللون')}`} value={hex} data-testid={`look-color-${g.k}`}
                  onChange={(e) => commit(setPaint(model, g.k, { c: e.target.value }), `paint:${g.k}`)} />
                <span className="nk-lk-chip" style={{ background: hex }} aria-hidden="true" />
              </label>
              {g.tex ? (
                <span className="nk-lk-tex" data-tex={(o && o.t) || DEF_TEX[g.k]}>
                  <i className="nk-lk-tex-ic" aria-hidden="true" />
                  <select className="nk-lk-sel" aria-label={`${name} - ${L('texture', 'الخامة')}`} title={L('Texture', 'الخامة')} value={(o && o.t) || DEF_TEX[g.k]} data-testid={`look-tex-${g.k}`}
                    onChange={(e) => commit(setPaint(model, g.k, { t: e.target.value === DEF_TEX[g.k] ? '' : e.target.value }), `paint:${g.k}`)}>
                    {PAINT_TEX.map((t) => <option key={t.k} value={t.k}>{L(t.en, t.ar)}</option>)}
                  </select>
                </span>
              ) : <span className="nk-lk-note">{L('Colour only', 'اللون فقط')}</span>}
              <button type="button" className="nk-lk-reset" disabled={!o} aria-label={`${name} - ${L('reset to default', 'إعادة للافتراضي')}`} title={L('Reset to default', 'إعادة للافتراضي')} onClick={() => commit(clearPaint(model, g.k), `paint:${g.k}:reset`)}>↺</button>
            </div>
          );
        })}
      </div>
      <div className="nk-mp-foot">
        <span className="nk-mp-hint">{L('Look is display only: sizes, cut list and the finish presets are not affected.', 'المظهر للعرض فقط: لا يتغير المقاس ولا قائمة القص ولا التشطيبات الجاهزة.')}</span>
        <button type="button" className="nk-btn" disabled={!hasPaint(model)} data-testid="look-reset-all" onClick={() => commit({ ...model, paint: {} }, 'paint:reset')}>{L('Reset look', 'إعادة المظهر')}</button>
      </div>
    </section>
  );
}
