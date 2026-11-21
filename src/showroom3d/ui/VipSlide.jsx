import React, { useEffect, useState } from 'react';
import { t } from '../strings';
import { withLang } from '../siteBridge';
import { L, DISCLAIMER } from '../vip/deckSchema';
import { countValue, formatNumber } from '../vip/motion';

const YEAR = /^(\d{4}):\s*(.*)$/;

/** a number that counts up from 0 to its value (1.7 s) when the slide appears; the final value at once under reduced motion */
export function Count({ value, prefix = '', suffix = '', reduced = false, delay = 0.3 }) {
  const [t0, setT0] = useState(reduced ? 99 : 0);
  useEffect(() => {
    if (reduced) { setT0(99); return undefined; }
    let raf = 0, start = 0; const step = (ts) => { if (!start) start = ts; const s = (ts - start) / 1000; setT0(s); if (s < delay + 1.5) raf = requestAnimationFrame(step); else setT0(99); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [reduced, value, delay]);
  return <span data-testid="sr-count" data-final={value}>{prefix}{formatNumber(countValue(value, t0, { delay }))}{suffix}</span>;
}

/** a generic (imported / saved / profile) slide in the panel. `slide` is RESOLVED (strings for one language). Plain text only: React escapes everything; images are https or the committed
 *  /yas-bloom/profile paths (the sanitiser guarantees it). Motion: the slide fades and slides in, bullets and blocks appear in turn, stats count up, bars grow, photos drift slowly
 *  (Ken Burns, not on the low tier); `reduced` switches all of it off (the CSS also honours prefers-reduced-motion). Layouts: split (default), hero, duo. */
export function SlideBody({ lang, slide: s, reduced = false, tier = 'medium' }) {
  const max = (b) => Math.max(...b.data.map((d) => d.value), 1e-9), kb = !reduced && tier !== 'low';
  const lay = s.layout || 'split'; let n = 0; const st = (extra = {}) => ({ '--i': n++, ...extra });
  return (
    <div className={`sr-vip-slide sr-vip-slide--${lay}`} data-testid="sr-vip-slide" data-layout={lay} data-motion={reduced ? 'off' : 'on'} data-accent={s.accent || undefined} data-disclaimer={s.disclaimer ? '1' : undefined}>
      {s.lead && <p className="sr-lead sr-rv" style={st()}>{s.lead}</p>}
      {s.blocks.filter((b) => b.type === 'image' && lay === 'hero').slice(0, 1).map((b, i) => <figure className={`sr-vip-block sr-vip-hero${kb ? ' sr-kb' : ''}`} key={'h' + i} data-block="image" style={st()}><img src={b.url} alt={b.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" /></figure>)}
      {s.bullets.length > 0 && (s.disclaimer ? <p className="sr-note sr-vip-disc sr-rv" style={st()} data-testid="sr-vip-disclaimer">{s.bullets[0]}</p> : <ul className="sr-spec sr-vip-bullets">{s.bullets.map((b, i) => { const m = YEAR.exec(b); return <li key={i} className="sr-rv" style={st()}>{m ? <><b className="sr-yr">{m[1]}</b> {m[2]}</> : b}</li>; })}</ul>)}
      <div className={lay === 'duo' ? 'sr-vip-duo' : undefined}>
        {s.blocks.filter((b) => !(lay === 'hero' && b.type === 'image' && s.blocks.indexOf(b) === s.blocks.findIndex((x) => x.type === 'image'))).map((b, i) => (
          <figure className="sr-vip-block sr-rv" key={i} data-block={b.type} style={st()}>
            {b.type === 'image' && <div className={`sr-vip-imgwrap${kb ? ' sr-kb' : ''}`}><img src={b.url} alt={b.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" /></div>}
            {b.type === 'table' && <div className="sr-vip-tablewrap"><table className="sr-vip-table">{b.head && <thead><tr>{b.head.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr></thead>}<tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table></div>}
            {b.type === 'bar' && (<div className="sr-vip-bars" role="group" aria-label={b.title || t('vipSlides', lang)}>{b.title && <b className="sr-vip-bars-title">{b.title}</b>}
              {b.data.map((d, j) => <div className="sr-vip-bar" key={j}><span>{d.label}</span><i style={{ '--w': (d.value / max(b)) * 100 + '%', '--d': j * 0.12 + 's' }} aria-hidden="true" /><b>{d.value}{b.unit ? ' ' + b.unit : ''}</b></div>)}</div>)}
            {b.type === 'stat' && <div className="sr-vip-stats" data-testid="sr-vip-stats">{b.items.map((d, j) => <div className="sr-vip-stat" key={j}><b><Count value={d.value} prefix={d.prefix} suffix={d.suffix} reduced={reduced} delay={0.3 + j * 0.15} /></b><span>{d.label}</span></div>)}</div>}
            {(b.caption || (b.type !== 'image' && (b.source || b.illustrative))) && <figcaption>{b.caption}{b.caption && b.illustrative ? ' · ' : ''}{b.illustrative ? (lang === 'ar' ? 'توضيحي' : 'Illustrative') : ''}{b.type !== 'image' && b.source && b.source !== s.source ? `${b.caption || b.illustrative ? ' · ' : ''}${t('vipSource', lang)}: ${b.source}` : ''}</figcaption>}
          </figure>))}
      </div>
      {s.links.length > 0 && <div className="sr-panel-sec"><h3>{t('vipLinks', lang)}</h3><ul className="sr-vip-lines">{s.links.map((l, i) => <li key={i}><a href={withLang(l.route, lang === 'ar' ? 'ar' : 'en')} data-testid="sr-vip-slide-link">{l.label}</a></li>)}</ul></div>}
      {(s.source || s.illustrative) && <p className="sr-note" data-testid="sr-vip-slide-source">{s.illustrative ? (lang === 'ar' ? 'توضيحي' : 'Illustrative') : ''}{s.illustrative && s.source ? ' · ' : ''}{s.source ? `${t('vipSource', lang)}: ${s.source}` : ''}</p>}
      {!s.disclaimer && <p className="sr-note sr-vip-foot" data-testid="sr-vip-foot-disclaimer">{L(DISCLAIMER, lang)}</p>}
    </div>
  );
}
