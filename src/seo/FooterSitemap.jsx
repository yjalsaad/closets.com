import React from 'react';
import { LangLink } from './lang';
import { INDEXABLE } from './routes';

const GROUPS = [
  { key: 'rooms', en: 'Rooms & products', ar: 'الغرف والمنتجات' },
  { key: 'explore', en: 'Explore', ar: 'استكشف' },
  { key: 'help', en: 'Help & services', ar: 'المساعدة والخدمات' },
  { key: 'company', en: 'Company', ar: 'الشركة' },
];

/** Crawlable site map in the footer: every indexable route as a real <a href>, language-aware. */
export default function FooterSitemap({ lang }) {
  const L = lang === 'ar' ? 'ar' : 'en';
  return (
    <nav aria-label={L === 'ar' ? 'خريطة الموقع' : 'Site map'} data-seo-sitemap="1" style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 24 }}>
        {GROUPS.map((g) => (
          <div key={g.key}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: L === 'ar' ? 'none' : 'uppercase', letterSpacing: L === 'ar' ? 0 : '.08em', marginBottom: 10 }}>{g[L]}</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {INDEXABLE.filter((p) => p.group === g.key).map((p) => (
                <li key={p.page}><LangLink to={p.path} style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 14, padding: '5px 0', textDecoration: 'none' }}>{p.label[L]}</LangLink></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
