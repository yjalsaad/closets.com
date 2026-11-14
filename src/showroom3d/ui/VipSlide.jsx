import React from 'react';
import { t } from '../strings';
import { withLang } from '../siteBridge';
import { L, DISCLAIMER } from '../vip/deckSchema';

/** a generic (imported / saved) slide in the panel. `slide` is RESOLVED (strings for one language). Plain text only: React escapes everything; images are https only (the sanitiser guarantees it). */
export function SlideBody({ lang, slide: s }) {
  const max = (b) => Math.max(...b.data.map((d) => d.value), 1e-9);
  return (
    <div className="sr-vip-slide" data-testid="sr-vip-slide" data-accent={s.accent || undefined} data-disclaimer={s.disclaimer ? '1' : undefined}>
      {s.lead && <p className="sr-lead">{s.lead}</p>}
      {s.bullets.length > 0 && (s.disclaimer ? <p className="sr-note sr-vip-disc" data-testid="sr-vip-disclaimer">{s.bullets[0]}</p> : <ul className="sr-spec sr-vip-bullets">{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>)}
      {s.blocks.map((b, i) => (
        <figure className="sr-vip-block" key={i} data-block={b.type}>
          {b.type === 'image' && <img src={b.url} alt={b.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
          {b.type === 'table' && <div className="sr-vip-tablewrap"><table className="sr-vip-table">{b.head && <thead><tr>{b.head.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr></thead>}<tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table></div>}
          {b.type === 'bar' && (<div className="sr-vip-bars" role="group" aria-label={b.title || t('vipSlides', lang)}>{b.title && <b className="sr-vip-bars-title">{b.title}</b>}
            {b.data.map((d, j) => <div className="sr-vip-bar" key={j}><span>{d.label}</span><i style={{ '--w': (d.value / max(b)) * 100 + '%' }} aria-hidden="true" /><b>{d.value}{b.unit ? ' ' + b.unit : ''}</b></div>)}</div>)}
          {(b.caption || b.source || b.illustrative) && <figcaption>{b.caption}{b.caption && (b.source || b.illustrative) ? ' · ' : ''}{b.illustrative ? (lang === 'ar' ? 'توضيحي' : 'Illustrative') : ''}{b.illustrative && b.source ? ' · ' : ''}{b.source ? `${t('vipSource', lang)}: ${b.source}` : ''}</figcaption>}
        </figure>))}
      {s.links.length > 0 && <div className="sr-panel-sec"><h3>{t('vipLinks', lang)}</h3><ul className="sr-vip-lines">{s.links.map((l, i) => <li key={i}><a href={withLang(l.route, lang === 'ar' ? 'ar' : 'en')} data-testid="sr-vip-slide-link">{l.label}</a></li>)}</ul></div>}
      {(s.source || s.illustrative) && <p className="sr-note" data-testid="sr-vip-slide-source">{s.illustrative ? (lang === 'ar' ? 'توضيحي' : 'Illustrative') : ''}{s.illustrative && s.source ? ' · ' : ''}{s.source ? `${t('vipSource', lang)}: ${s.source}` : ''}</p>}
      {!s.disclaimer && <p className="sr-note sr-vip-foot" data-testid="sr-vip-foot-disclaimer">{L(DISCLAIMER, lang)}</p>}
    </div>
  );
}
