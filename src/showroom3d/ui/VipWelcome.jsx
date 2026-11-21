import React from 'react';
import './vipWelcome.css';
import { FLAGS, FLAG_IDS, bahrainEdge } from '../vip/flags';
import { resolveWelcome } from '../vip/welcome';

/** one national flag as an inline SVG (the same geometry the wall and the 3D cloth use, vip/flags.js). Upright, official proportions, never mirrored. */
export function FlagSvg({ id, lang }) {
  const F = FLAGS[id], name = F.name[lang === 'ar' ? 'ar' : 'en'];
  return (
    <svg className={`sr-flag sr-flag--${id}`} viewBox={`0 0 ${F.w} ${F.h}`} role="img" aria-label={name} data-testid={'sr-flag-' + id} data-ratio={F.ratio.join(':')} preserveAspectRatio="xMidYMid meet">
      {id === 'bh'
        ? (<><rect width={F.w} height={F.h} fill={F.white} /><path fill={F.red} d={`M${F.w} 0${bahrainEdge().map(([x, y]) => `L${x} ${y}`).join('')}L${F.w} ${F.h}Z`} /></>)
        : (<><rect width={F.w} height={F.h} fill={F.green} /><path fill={F.white} fillRule="evenodd" d={F.path} /></>)}
    </svg>
  );
}

/** the Welcome slide in the panel / reading mode: greeting, the meeting line (date derived, see vip/welcome.js) and the two flags. `cfg` = the CMS config ({} = defaults). */
export function WelcomeBody({ lang, cfg, now }) {
  const W = resolveWelcome(cfg, lang, now || new Date(), { bh: FLAGS.bh.name, sa: FLAGS.sa.name });
  return (
    <div className="sr-vip-slide sr-vip-welcome" data-testid="sr-vip-welcome" data-rel={W.meeting ? W.meeting.rel : 'none'}>
      {W.meeting && (   /* first: in the short phone sheet the date must be visible without scrolling */
        <p className="sr-vip-meetline" data-testid="sr-vip-meetline"><span className="sr-vip-meetkick">{W.meeting.kicker}</span><b className="sr-vip-meetdate">{W.meeting.date}</b></p>
      )}
      <p className="sr-lead">{W.line}</p>
      <ul className="sr-vip-flags" data-testid="sr-vip-flags">
        {FLAG_IDS.map((id) => (<li key={id}><FlagSvg id={id} lang={lang} /><span>{FLAGS[id].name[lang === 'ar' ? 'ar' : 'en']}</span></li>))}
      </ul>
    </div>
  );
}
