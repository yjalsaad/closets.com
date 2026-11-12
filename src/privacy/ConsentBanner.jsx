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
    <section role="region" aria-label={tr('bannerTitle', lang)} dir={rtl ? 'rtl' : 'ltr'} data-testid="consent-banner" data-noprerender="1" className="consent">
      <div className="consent__inner">
        <p className="consent__text">
          <strong>{tr('bannerTitle', lang)}</strong>
          {tr('bannerBody', lang)}{' '}
          <A to="/privacy">{tr('privacyLink', lang)}</A>
          {' · '}
          <A to="/terms">{tr('termsLink', lang)}</A>
        </p>
        <div className="consent__actions">
          <button type="button" className="btn-line" onClick={() => decide(false)}>{tr('decline', lang)}</button>
          <button type="button" className="btn-ink" onClick={() => decide(true)}>{tr('accept', lang)}</button>
        </div>
      </div>
    </section>
  );
}
