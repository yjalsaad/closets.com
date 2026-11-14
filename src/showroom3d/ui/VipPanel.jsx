import React, { useEffect, useRef } from 'react';
import { t } from '../strings';
import * as C from '../products/vipContent';
import { projectCard } from '../products/projectsFeed';

const Lx = C.L;

function Station({ lang, idx, ex, st }) {
  if (idx === 0) {
    const cf = C.contestedFacts();
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[0].lead, lang)}</p>
      <ul className="sr-spec">{C.storyLines().map((l, i) => <li key={i}>{Lx(l, lang)}</li>)}</ul>
      <ul className="sr-vip-facts" data-testid="sr-vip-facts">{cf.map((f) => (
        <li key={f.key} className={f.confirmed ? 'is-ok' : 'is-ph'} data-fact={f.key} data-confirmed={f.confirmed ? '1' : '0'}>
          <span>{Lx(f.label, lang)}</span><b>{Lx(f.value, lang)}</b><em>{t(f.confirmed ? 'vipConfirmed' : 'vipPlaceholderTag', lang)}</em>
        </li>))}</ul>
    </>);
  }
  if (idx === 1) {
    const rows = (ex && ex.vipRows) || [], status = st.vipProjects || (ex && ex.projectsPromise ? 'loading' : 'idle');
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[1].lead, lang)}</p>
      <div className="sr-panel-sec">
        <h3>{t('vipBusinessLines', lang)}</h3>
        <ul className="sr-vip-lines" data-testid="sr-vip-lines">{C.businessLines(lang).map((l) => (
          <li key={l.id}>{l.href ? <a href={l.href} data-testid={'sr-vip-line-' + l.id}>{Lx(l.name, lang)}</a> : <span data-testid={'sr-vip-line-' + l.id}>{Lx(l.name, lang)} <em>{t('vipNoPage', lang)}</em></span>}</li>))}</ul>
      </div>
      <div className="sr-panel-sec" data-testid="sr-vip-projects" data-status={status}>
        <h3>{status === 'ok' ? t('vipProjectsFrom', lang) : t('vipProjectsNone', lang)}</h3>
        {status === 'ok' && <ul className="sr-vip-projects">{rows.map((r, i) => { const c = projectCard(r, lang); return <li key={c.id + i}><b>{c.title}</b>{c.meta && <span>{c.meta}</span>}</li>; })}</ul>}
        {status === 'idle' || status === 'loading' ? <p className="sr-note">{t('vipProjectsLoading', lang)}</p> : null}
        <a className="sr-btn sr-btn-line" href={C.projectsHref(lang)} data-testid="sr-vip-projects-link">{t('vipOpenProjects', lang)}</a>
      </div>
    </>);
  }
  if (idx === 2) {
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[2].lead, lang)}</p>
      <ol className="sr-vip-flow" data-testid="sr-vip-flow">{C.HUB_FLOW.map((s) => <li key={s.id}><b>{Lx(s.name, lang)}</b><span>{Lx(s.sub, lang)}</span></li>)}</ol>
      <ul className="sr-vip-caps" data-testid="sr-vip-caps">{C.HUB_CAPABILITIES.map((c) => <li key={c.id}><b>{Lx(c.title, lang)}</b><span>{Lx(c.body, lang)}</span></li>)}</ul>
      <div className="sr-panel-sec"><h3>{lang === 'ar' ? 'الوحدات لكل قسم' : 'Modules per department'}</h3>
        <ul className="sr-vip-depts">{C.HUB_DEPARTMENTS.map((d) => <li key={d.name.en}><span>{Lx(d.name, lang)}</span><b>{d.modules} {t('vipModules', lang)}</b></li>)}</ul></div>
      <p className="sr-note">{Lx(C.ILLUSTRATIVE, lang)}. {t('vipHubSource', lang)}</p>
    </>);
  }
  if (idx === 3) {
    return (<>
      <p className="sr-lead">{Lx(C.STATIONS[3].lead, lang)}</p>
      <ol className="sr-steps" data-testid="sr-vip-steps">{C.INVEST_STEPS.map((s, i) => <li key={s.id}><span className="sr-step-n" aria-hidden="true">{i + 1}</span><div><b>{Lx(s.title, lang)}</b><span>{Lx(s.body, lang)}</span></div></li>)}</ol>
      <p className="sr-note sr-vip-disc" data-testid="sr-vip-disclaimer">{Lx(C.DISCLAIMER, lang)}</p>
    </>);
  }
  const contact = C.contactLines(lang);
  return (<>
    <p className="sr-lead">{Lx(C.STATIONS[4].lead, lang)}</p>
    <ul className="sr-vip-contact">{contact.map((c) => <li key={c.id}>{Lx(c.label, lang)}: {c.href ? <a href={c.href} dir={c.dir} data-testid={'sr-vip-' + c.id}>{c.text}</a> : <span data-testid={'sr-vip-' + c.id}>{c.text}</span>}</li>)}</ul>
    <div className="sr-panel-sec"><h3>{t('vipStillNeeded', lang)}</h3>
      <ul className="sr-vip-facts" data-testid="sr-vip-pending">{['Investor information pack|الحزمة التعريفية للمستثمرين', 'Funding sought|التمويل المطلوب', 'Financial statements|القوائم المالية', 'Dedicated management contact|جهة اتصال مخصصة في الإدارة'].map((s) => { const [en, ar] = s.split('|'); return <li key={en} className="is-ph"><span>{lang === 'ar' ? ar : en}</span><em>{Lx(C.PLACEHOLDER, lang)}</em></li>; })}</ul></div>
    <p className="sr-note sr-vip-disc" data-testid="sr-vip-disclaimer">{Lx(C.DISCLAIMER, lang)}</p>
  </>);
}

/** VIP meeting room: guided presentation panel. One station at a time, Previous / Next + station dots; arrow keys work too (mirrored in RTL). */
export function VipPanel({ lang, touch, explorerRef, st }) {
  const ex = explorerRef.current, headRef = useRef(null), idx = Number.isInteger(st.vipStation) ? st.vipStation : 0, n = C.STATIONS.length, s = C.STATIONS[idx];
  useEffect(() => { if (headRef.current) headRef.current.focus({ preventScroll: true }); }, [st.focus, idx]);
  const rtl = lang === 'ar';
  return (
    <aside className="sr-panel sr-panel-vip" aria-label={t('vipAria', lang)} data-testid="sr-vip-panel" data-station={s.id} dir={rtl ? 'rtl' : 'ltr'}>
      <header className="sr-panel-head">
        <p className="sr-eyebrow">{t('vipKicker', lang)}</p>
        <p className="sr-vip-count" data-testid="sr-vip-count">{t('vipStationOf', lang)} <b>{idx + 1}</b> / {n}</p>
        <h2 tabIndex={-1} ref={headRef} data-testid="sr-vip-title">{Lx(s.title, lang)}</h2>
        <button type="button" className="sr-btn sr-btn-line sr-panel-close" onClick={() => ex.exitFocus()} data-testid="sr-panel-close">{t('panelBack', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">Esc</kbd>}</button>
      </header>
      <div className="sr-panel-body" aria-live="polite"><Station lang={lang} idx={idx} ex={ex} st={st} /></div>
      <footer className="sr-panel-foot">
        {idx === n - 1 && <a className="sr-btn sr-quote" href={C.briefingUrl(lang)} data-testid="sr-vip-cta">{t('vipBriefing', lang)}</a>}
        {idx === n - 1 && <p className="sr-note">{t('vipBriefingNote', lang)}</p>}
        <nav className="sr-vip-nav" aria-label={t('vipStations', lang)}>
          <button type="button" className="sr-btn sr-btn-line" onClick={() => ex.stepStation(-1)} disabled={idx === 0} data-testid="sr-vip-prev">{t('vipPrev', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">{rtl ? '→' : '←'}</kbd>}</button>
          <ol className="sr-vip-dots">{C.STATIONS.map((x, i) => <li key={x.id}><button type="button" className="sr-vip-dot" aria-label={`${t('vipStationOf', lang)} ${i + 1}: ${Lx(x.title, lang)}`} aria-current={i === idx ? 'step' : undefined} onClick={() => ex.setStation(i)} data-testid={'sr-vip-dot-' + i} /></li>)}</ol>
          <button type="button" className="sr-btn" onClick={() => ex.stepStation(1)} disabled={idx === n - 1} data-testid="sr-vip-next">{t('vipNext', lang)}{!touch && <kbd className="sr-kbd" aria-hidden="true">{rtl ? '←' : '→'}</kbd>}</button>
        </nav>
      </footer>
    </aside>
  );
}
