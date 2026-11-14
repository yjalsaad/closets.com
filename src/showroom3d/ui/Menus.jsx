import React from 'react';
import { t } from '../strings';
import { DEPARTMENTS } from '../scenes/main-hall/departments';
import { useDialog } from './useDialog';
import { VIP_DEPT } from '../products/vipContent';
import { COLLECTIONS_DEPT } from '../collections/layout';

const name = (d, lang) => (lang === 'ar' ? d.ar : d.en);

/** Department quick-nav: a sheet listing the eight bays and the VIP meeting room; choosing one glides the camera to its entrance. */
export function DeptMenu({ lang, touch, onPick, onClose, fallbackFocus }) {
  const ref = useDialog(true, onClose, fallbackFocus);
  return (
    <div className="sr-modal sr-modal-sheet" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sr-dialog" role="dialog" aria-modal="true" aria-labelledby="sr-dept-title" ref={ref} data-testid="sr-dept-menu">
        <div className="sr-dialog-head">
          <h2 id="sr-dept-title">{t('departments', lang)}</h2>
          <button type="button" className="sr-btn sr-btn-line" onClick={onClose} aria-label={t('departmentsClose', lang)}>{t('departmentsClose', lang)}</button>
        </div>
        <p className="sr-dialog-sub">{t('departmentsHint', lang)}</p>
        <ol className="sr-dept-list">
          {[...DEPARTMENTS, VIP_DEPT, COLLECTIONS_DEPT].map((d, i) => (
            <li key={d.id}>
              <button type="button" className="sr-dept" onClick={() => onPick(d.id)} data-dept={d.id} data-autofocus={i === 0 ? '' : undefined}>
                <span className="sr-dept-n" aria-hidden="true">{i + 1}</span>
                <span className="sr-dept-name">{name(d, lang)}</span>
                {!touch && i < 9 && <kbd className="sr-kbd" aria-hidden="true">{i + 1}</kbd>}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** ESC / Menu overlay: resume, departments, replay intro, language, head-bob, tips, back to website. */
export function PauseMenu({ lang, touch, reduced, bob, homeHref, explorerRef, st = {}, onResume, onDepts, onReplay, onLang, onBob, onTips, fallbackFocus }) {
  const ref = useDialog(true, () => onResume(false), fallbackFocus);
  return (
    <div className="sr-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onResume(false); }}>
      <div className="sr-dialog" role="dialog" aria-modal="true" aria-labelledby="sr-pause-title" ref={ref} data-testid="sr-pause-menu">
        <h2 id="sr-pause-title">{t('menuTitle', lang)}</h2>
        <div className="sr-menu-list">
          <button type="button" className="sr-btn" onClick={() => onResume(true)} data-autofocus data-testid="sr-resume">{t('resume', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onDepts}>{t('departments', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onReplay}>{reduced ? t('playIntro', lang) : t('replayIntro', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onLang} lang={lang === 'ar' ? 'en' : 'ar'} aria-label={t('langToggleLabel', lang)}>{t('langToggle', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => explorerRef && explorerRef.current && explorerRef.current.toggleCameraMode()} aria-pressed={st.camMode === 'third'} data-testid="sr-menu-cam">{t('camLabel', lang)}: {t(st.camMode === 'third' ? 'camThird' : 'camFirst', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => explorerRef && explorerRef.current && explorerRef.current.cycleAvatar()} data-testid="sr-menu-avatar">{t('avatarLabel', lang)}: {t('avatar_' + (st.avatar || 'female'), lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onBob} aria-pressed={bob && !reduced} disabled={reduced}>{bob && !reduced ? t('headBobOn', lang) : t('headBobOff', lang)}</button>
          <button type="button" className="sr-btn sr-btn-line" onClick={onTips}>{t('showTips', lang)}</button>
          <a className="sr-btn sr-btn-line" href={homeHref}>{t('exit', lang)}</a>
        </div>
        {reduced && <p className="sr-dialog-note">{t('headBobReduced', lang)}</p>}
        <h3>{t('controlsTitle', lang)}</h3>
        <p className="sr-dialog-note">{t(touch ? 'controlsTouch' : 'controlsKeys', lang)}</p>
        <p className="sr-dialog-note"><span className="sr-badge">{t('previewBadge', lang)}</span> {t('previewNote', lang)}</p>
      </div>
    </div>
  );
}

/** First-run coach marks: three short tips for the current input type. Non-modal (never traps focus). */
export function CoachMarks({ lang, touch, onDone }) {
  const tips = touch ? ['coachWalkTouch', 'coachLookTouch', 'coachUseTouch'] : ['coachWalkDesk', 'coachLookDesk', 'coachUseDesk'];
  return (
    <section className="sr-coach" role="region" aria-labelledby="sr-coach-title" data-testid="sr-coach">
      <h2 id="sr-coach-title">{t('coachTitle', lang)}</h2>
      <ol>{tips.map((k, i) => <li key={k}><span className="sr-coach-n" aria-hidden="true">{i + 1}</span><span>{t(k, lang)}</span></li>)}</ol>
      <button type="button" className="sr-btn" onClick={onDone} data-testid="sr-coach-done">{t('coachGotIt', lang)}</button>
    </section>
  );
}
