import React from 'react';
import { LangLink } from './lang';
import { BY_PAGE } from './routes';

const COPY = {
  en: { title: 'Page not found', body: 'The page you are looking for does not exist or may have moved. Try one of these instead.', home: 'Back to the home page', browse: 'Popular pages' },
  ar: { title: 'الصفحة غير موجودة', body: 'الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها. جرّب إحدى هذه الصفحات.', home: 'العودة إلى الصفحة الرئيسية', browse: 'صفحات مقترحة' },
};
const LINKS = ['kitchen', 'wardrobes', 'tv', 'doors', 'office', 'products', 'projects', 'offers', 'booking', 'contact'];

/** Soft-404 replacement: real heading, noindex head (see useRouteHead(null)), crawlable link set. */
export default function NotFound({ lang }) {
  const c = COPY[lang === 'ar' ? 'ar' : 'en'];
  const L = lang === 'ar' ? 'ar' : 'en';
  return (
    <div data-not-found="1" style={{ minHeight: '70vh', padding: '120px 24px 80px', textAlign: 'center', background: 'var(--cream, transparent)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h1 className="display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', color: 'var(--ink)', margin: '0 0 14px' }}>{c.title}</h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-soft)', margin: '0 0 28px' }}>{c.body}</p>
        <LangLink to="/" className="btn-clay" style={{ display: 'inline-block', textDecoration: 'none' }}>{c.home}</LangLink>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '40px 0 14px' }}>{c.browse}</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {LINKS.map((k) => (
            <li key={k}>
              <LangLink to={BY_PAGE[k].path} style={{ display: 'inline-block', padding: '9px 18px', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', background: 'var(--c-surface)', color: 'var(--ink)', textDecoration: 'none', fontSize: 14 }}>{BY_PAGE[k].label[L]}</LangLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
