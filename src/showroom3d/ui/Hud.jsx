import React, { useEffect, useState } from 'react';
import { t } from '../strings';
import { DEPARTMENTS } from '../scenes/main-hall/departments';
import LogoImg from './LogoImg';
import TouchControls from './TouchControls';
import { IK, ikt } from '../products/campaignCopy';
import { VIP_DEPT } from '../products/vipContent';

const dept = (id) => DEPARTMENTS.find((d) => d.id === id);
const dname = (id, lang) => { if (id === 'ikhtarha') return ikt(IK.name, lang); if (id === VIP_DEPT.id) return lang === 'ar' ? VIP_DEPT.ar : VIP_DEPT.en; const d = dept(id); return d ? (lang === 'ar' ? d.ar : d.en) : ''; };

/** Exploration HUD: top bar (logo, Departments, Menu), fading guidance, the interaction prompt / stub toast, and the touch controls. */
export default function Hud({ lang, tier, touch, st, explorerRef, homeHref, onDepts, onMenu, onInteract, coach }) {
  const [fade, setFade] = useState(false);
  const [toast, setToast] = useState(null);
  const started = st.locked || st.dragLook || st.moved || touch;

  // the bottom guidance stays until the visitor has started (clicked / dragged / moved), then fades after a few seconds
  useEffect(() => { if (!started) return undefined; const id = setTimeout(() => setFade(true), st.moved ? 3500 : 9000); return () => clearTimeout(id); }, [started, st.moved]);
  useEffect(() => {
    if (!st.interact) return undefined;
    setToast({ n: st.interact, zone: st.interactZone }); const id = setTimeout(() => setToast(null), 4200); return () => clearTimeout(id);
  }, [st.interact, st.interactZone]);
  useEffect(() => {
    if (!st.gliding || !st.glideTo) return undefined;
    setToast({ n: 'g' + st.glideTo, glide: st.glideTo }); const id = setTimeout(() => setToast(null), 2600); return () => clearTimeout(id);
  }, [st.gliding, st.glideTo]);

  const hint = touch ? 'hintTouch' : st.locked ? 'hintDesktopLocked' : st.dragLook ? 'hintDesktopDrag' : 'hintDesktopLock';
  const zoneName = st.zone ? dname(st.zone, lang) : null;
  const toastText = !toast ? '' : toast.glide ? `${t('heading', lang)} ${dname(toast.glide, lang)}` : toast.zone ? `${dname(toast.zone, lang)}. ${t('zoneSoon', lang)}` : t(touch ? 'interactNoneTouch' : 'interactNone', lang);

  return (
    <div className="sr-hud" data-testid="sr-hud">
      {touch && !st.focus && <TouchControls lang={lang} explorerRef={explorerRef} onInteract={onInteract} />}
      <header className="sr-hud-top">
        <div className="sr-hud-brand">
          <a className="sr-pill sr-pill-logo" href={homeHref} aria-label={t('exit', lang)}><LogoImg alt="" width="77" height="44" /></a>
          <span className="sr-badge" title={t('previewNote', lang)}>{t('previewBadge', lang)}</span>
        </div>
        <div className="sr-hud-actions">
          <button type="button" className="sr-btn" onClick={onDepts} data-testid="sr-open-depts">{t('departments', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onMenu} aria-haspopup="dialog" data-testid="sr-open-menu">{t('menu', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
        </div>
      </header>
      <footer className="sr-hud-bottom">
        <div className="sr-live" role="status" aria-live="polite">
          {zoneName && !toast && !st.focus && <p className="sr-prompt" data-testid="sr-prompt"><b>{zoneName}</b><span>{touch ? t('tapInteract', lang) : t('pressE', lang)}</span></p>}
          {toast && <p className="sr-toast" data-testid="sr-toast" key={toast.n}>{toastText}</p>}
        </div>
        {!st.focus && <p className={'sr-hint' + (fade || coach ? ' is-faded' : '')} data-testid="sr-hint">{t(hint, lang)}</p>}
        {st.lockFailed && !fade && <p className="sr-hint-note">{t('dragLookNote', lang)}</p>}
        {!touch && <span className="sr-quality">{t('qualityLabel', lang)}: {t('quality' + tier.charAt(0).toUpperCase() + tier.slice(1), lang)}</span>}
      </footer>
    </div>
  );
}
