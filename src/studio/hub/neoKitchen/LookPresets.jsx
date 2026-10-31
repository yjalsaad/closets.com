/* 3D VIEW LOOK: four preset cards (+ Sun slider under Daylight). Stateless: the designer owns `look` / `sun`. */
import React from 'react';
import { LOOK_ORDER, LOOKS, SUN, clampSun } from './lookProfiles';

export default function LookPresets({ lang, look, sun, onLook, onSun }) {
  const ar = lang === 'ar';
  return (
    <div className="nk-look" role="radiogroup" aria-label={ar ? 'مظهر العرض ثلاثي الأبعاد' : '3D view look'} data-testid="look-presets">
      <div className="nk-menu-h">{ar ? 'مظهر العرض ثلاثي الأبعاد' : '3D VIEW LOOK'}</div>
      {LOOK_ORDER.map((id) => {
        const [title, desc] = LOOKS[id][ar ? 'ar' : 'en'];
        return (
          <React.Fragment key={id}>
            <button type="button" role="radio" aria-checked={look === id} className="nk-look-card" data-look={id} onClick={() => onLook(id)}>
              <span className="nk-look-sw" aria-hidden="true" />
              <span className="nk-look-tx"><b>{title}</b><small>{desc}</small></span>
            </button>
            {id === 'daylight' && look === 'daylight' && (
              <label className="nk-look-sun">
                <span>{ar ? 'الشمس' : 'Sun'}</span>
                <input type="range" className="nk-range" min={SUN.min} max={SUN.max} step={1} value={sun} aria-label={ar ? 'ارتفاع الشمس' : 'Sun elevation'} onChange={(e) => onSun(clampSun(e.target.value))} data-testid="sun-slider" />
                <output dir="ltr" data-testid="sun-readout">{sun}°</output>
              </label>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
