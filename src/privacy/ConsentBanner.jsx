// ConsentBanner.jsx — consent that actually gates things (see consent.js). Mounted in every shell
// (marketing site, visualizer, studio, campaign, games). It is a non-modal region, not a dialog.
import { useEffect, useState } from 'react';
import { getConsent, setConsent, onOpenConsentSettings } from './consent';
import { tr, curLang } from './strings';
import { hydration } from '../hydration';

export default function ConsentBanner({ lang: langProp, linkAs: LinkAs }) {
  // While hydrating prerendered HTML the banner is client-only (not in the snapshot): start hidden, show it right after mount.
  const [show, setShow] = useState(() => (hydration.active ? false : !getConsent().decided));
  useEffect(() => { if (hydration.active && !getConsent().decided) setShow(true); }, []);
  const [, force] = useState(0);
  useEffect(() => onOpenConsentSettings(() => setShow(true)), []);
  useEffect(() => { if (!langProp) { const h = () => force((n) => n + 1); window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); } return undefined; }, [langProp]);
  if (!show) return null;
  const lang = langProp || curLang();
  const rtl = lang === 'ar';
  const decide = (analytics) => { setConsent({ analytics }); setShow(false); };
  const A = ({ to, children }) => (LinkAs ? <LinkAs to={to}>{children}</LinkAs> : <a href={to}>{children}</a>);
  return (
    <section role="region" aria-label={tr('bannerTitle', lang)} dir={rtl ? 'rtl' : 'ltr'} data-testid="consent-banner" data-noprerender="1"
      style={{ position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 9999, maxWidth: 560, margin: '0 auto', background: '#fff', color: '#1d1d1f',
        border: '1px solid rgba(0,0,0,.14)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,.18)', padding: '18px 20px', textAlign: rtl ? 'right' : 'left' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>{tr('bannerTitle', lang)}</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: '0 0 14px' }}>
        {tr('bannerBody', lang)}{' '}
        <A to="/privacy"><span style={{ textDecoration: 'underline', fontWeight: 600 }}>{tr('privacyLink', lang)}</span></A>
        {' · '}
        <A to="/terms"><span style={{ textDecoration: 'underline', fontWeight: 600 }}>{tr('termsLink', lang)}</span></A>
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: rtl ? 'flex-start' : 'flex-end' }}>
        <button type="button" onClick={() => decide(false)} style={{ background: '#fff', color: '#1d1d1f', border: '1px solid rgba(0,0,0,.3)', borderRadius: 980, padding: '10px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{tr('decline', lang)}</button>
        <button type="button" onClick={() => decide(true)} style={{ background: '#1d1d1f', color: '#fff', border: '1px solid #1d1d1f', borderRadius: 980, padding: '10px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>{tr('accept', lang)}</button>
      </div>
    </section>
  );
}
