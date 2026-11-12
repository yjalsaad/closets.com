// Route chunk "shared_MaintenancePage_WarrantyPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: MaintenancePage, WarrantyPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { useSubmit } from '../forms/useSubmit';
import { isBot, validateForm, msg as vmsg } from '../forms/validate';
import Field, { Honeypot, FormStatus } from '../forms/Field';
import FormNotice from '../privacy/FormNotice';
import { api, toast, useI18n, useMobile } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { inp } from './shared_CareersPage_BookingPage_plus2';

function RequestPage({ kind, title, sub, refLabel, kindLabel }) {
  const { t } = useI18n();
  const mobile=useMobile();
  const { lang } = useI18n();
  const [f,setF]=useState({name:'',phone:'',email:'',ref:'',message:''}); const [sent,setSent]=useState(false);
  const [errs,setErrs]=useState({}); const [formErr,setFormErr]=useState(''); const [hp,setHp]=useState('');
  const sb = useSubmit(); const busy = sb.busy;
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const submit=async()=>{
    setFormErr('');
    if (isBot(hp)) { setSent(true); return; }
    const v = validateForm(f, { name:{type:'name',required:true}, phone:{type:'phone',required:true}, email:{type:'email'}, ref:{type:'text',max:100}, message:{type:'text',max:2000} }, lang);
    setErrs(v.errors);
    if (!v.ok) { setFormErr(vmsg('fix', lang)); setTimeout(() => { const el = document.getElementById('rq-' + v.first); if (el) el.focus(); }, 0); return; }
    const c = v.clean;
    const res = await sb.run((signal) => api('rpc/public_lead_submit',{method:'POST',signal,body:{ p_name:c.name, p_phone:c.phone, p_email:c.email||null, p_source:'Website - '+kind, p_interest:kind, p_message:(c.ref?(refLabel+': '+c.ref+' — '):'')+(c.message||''), p_meta:{ type:kind.toLowerCase() } }}));
    if (res.ok) { setSent(true); toast(t('swReqReceived'),'success'); }
    else if (res.offline) setFormErr(vmsg('offline', lang));
    else if (!res.skipped) { setFormErr(vmsg('failed', lang)); toast(t('swReqFailed'),'error'); }
  };
  if(sent) return (<PageWrap title={t('swReqThankYou')}><div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:32, maxWidth:560 }}><div aria-hidden="true" style={{ fontSize:40 }}>✅</div><div style={{ fontSize:19, fontWeight:600, color:'var(--shop-ink, #1d1d1f)', marginTop:12 }}>{t('swReqLoggedPrefix')} {kindLabel} {t('swReqLoggedSuffix')}</div><div style={{ fontSize:15, color:'var(--shop-muted, #86868b)', marginTop:8 }}>{t('swReqLoggedSub')}</div></div></PageWrap>);
  return (<PageWrap title={title} sub={sub}>
    <div style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding: mobile?20:28, maxWidth:640, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
      <form noValidate onSubmit={e=>{ e.preventDefault(); submit(); }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
        <Field id="rq-name" label={t('swReqFullNameAria')} required error={errs.name} placeholder={t('swReqFullName')} autoComplete="name" maxLength={120} value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <Field id="rq-phone" label={t('swReqPhoneAria')} required error={errs.phone} placeholder={t('swReqPhone')} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <Field id="rq-email" label={t('swReqEmail')} error={errs.email} placeholder={t('swReqEmail')} type="email" inputMode="email" autoComplete="email" maxLength={254} value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <Field id="rq-ref" label={refLabel+' '+t('swReqOptional')} error={errs.ref} placeholder={refLabel+' '+t('swReqOptional')} maxLength={100} value={f.ref} onChange={e=>set('ref',e.target.value)} style={inp} />
        <Field id="rq-message" as="textarea" label={t('swReqDescribe')} error={errs.message} placeholder={t('swReqDescribe')} rows={4} maxLength={2000} value={f.message} onChange={e=>set('message',e.target.value)} style={{...inp, resize:'vertical'}} wrapStyle={{ gridColumn: mobile?'auto':'1 / -1' }} />
      </div>
      <Honeypot value={hp} onChange={setHp} />
      <FormNotice kind="request" lang={lang} style={{ marginTop:14 }} />
      <FormStatus offline={sb.offline} slow={sb.slow} error={formErr} lang={lang} t={(k)=>vmsg(k, lang)} />
      <button type="submit" disabled={busy} aria-busy={busy} style={{ marginTop:18, width:'100%', background:'var(--clay)', color:'#fff', border:'none', borderRadius:14, padding:'14px', fontSize:15, fontWeight:600, cursor:'pointer', opacity:busy?.6:1 }}>{busy?t('swReqSubmitting'):t('swReqSubmit')}</button>
      </form>
    </div>
  </PageWrap>);
}

export { RequestPage };
