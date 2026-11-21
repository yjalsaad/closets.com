import React from 'react';
import { LangLink } from './lang';
import { INDEXABLE } from './routes';

const GROUPS = [
  { key: 'rooms', en: 'Rooms & products', ar: 'الغرف والمنتجات' },
  { key: 'explore', en: 'Explore', ar: 'استكشف' },
  { key: 'help', en: 'Help & services', ar: 'المساعدة والخدمات' },
  { key: 'company', en: 'Company', ar: 'الشركة' },
];

/** Crawlable site map in the footer: every indexable route as a real <a href>, language-aware. Rendered as the footer's link columns (display: contents inside the grid). */
export default function FooterSitemap({ lang }) {
  const L = lang === 'ar' ? 'ar' : 'en';
  return (
    <nav aria-label={L === 'ar' ? 'خريطة الموقع' : 'Site map'} data-seo-sitemap="1" style={{ display: 'contents' }}>
      {GROUPS.map((g) => (
        <div className="footer__col" key={g.key}>
          <h2>{g[L]}</h2>
          <ul>
            {INDEXABLE.filter((p) => p.group === g.key).map((p) => (
              <li key={p.page}><LangLink to={p.path}>{p.label[L]}</LangLink></li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
