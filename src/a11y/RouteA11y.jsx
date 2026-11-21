// RouteA11y.jsx — skip link, route-change focus + announcement, language-change announcement.
import { useEffect, useRef, useState } from 'react';
import './a11y.css';

const T = {
  skip: { en: 'Skip to main content', ar: 'تخطَّ إلى المحتوى الرئيسي' },
  langAr: 'تم التبديل إلى العربية',
  langEn: 'Language changed to English',
};

export function focusMain() {
  if (typeof document === 'undefined') return;
  const main = document.getElementById('main'); if (!main) return;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  try { main.focus({ preventScroll: false }); } catch (e) { /* ignore */ }
}

export function SkipLink({ lang = 'en' }) {
  return (
    <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); focusMain(); }}>{T.skip[lang] || T.skip.en}</a>
  );
}

// Polite live region + focus move on every pathname change (not on first load, so the skip link stays first).
export function RouteAnnouncer({ pathname, lang = 'en' }) {
  const [msg, setMsg] = useState('');
  const first = useRef(true);
  const firstLang = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    const t = setTimeout(() => {
      const main = document.getElementById('main');
      const h = main && main.querySelector('h1');
      const target = h || main;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
      setMsg(document.title || '');
    }, 150);
    return () => clearTimeout(t);
  }, [pathname]);
  useEffect(() => {
    if (firstLang.current) { firstLang.current = false; return; }
    setMsg(lang === 'ar' ? T.langAr : T.langEn);
  }, [lang]);
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="route-announcer">{msg}</div>;
}
