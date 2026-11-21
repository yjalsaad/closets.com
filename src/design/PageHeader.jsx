import React from 'react';
import { LangLink as Link } from '../seo/lang';
import { Icon } from './Icon';
import { FACTS } from '../content/facts';

// The one page-header pattern: breadcrumb, eyebrow, serif title, lede. Offset below the fixed nav comes from --page-top (tokens).
export function Breadcrumb({ items, lang }) {
  const home = lang === 'ar' ? 'الرئيسية' : 'Home';
  return (
    <nav className="breadcrumb" aria-label={lang === 'ar' ? 'مسار التنقل' : 'Breadcrumb'}>
      <Link to="/">{home}</Link>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <Icon name="chevron" className="sep icon-flip" size={12} />
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default function PageHeader({ eyebrow, title, sub, crumbs, lang = 'en', children }) {
  return (
    <header className="page-header">
      <div className="container">
        <div className="inner">
          <Breadcrumb lang={lang} items={crumbs || [{ label: typeof title === 'string' ? title : '' }]} />
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {sub && <p className="lede">{sub}</p>}
          {children}
        </div>
      </div>
    </header>
  );
}

// Intentional empty state: one quiet icon, one sentence, one or two real actions. Never "coming soon".
export function EmptyState({ icon = 'layers', title, body, lang = 'en', primary = true, children }) {
  return (
    <div className="empty-state">
      <Icon name={icon} />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {children}
      {primary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/booking" className="btn-clay">{lang === 'ar' ? 'احجز استشارة تصميم' : 'Book a design consultation'}</Link>
          <a href={FACTS.whatsappHref} className="btn-line">{lang === 'ar' ? 'راسلنا على واتساب' : 'Message us on WhatsApp'}</a>
        </div>
      )}
    </div>
  );
}
