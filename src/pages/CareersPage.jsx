// Route chunk "CareersPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: CareersPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { api, cms, toast, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { inp } from './shared_CareersPage_BookingPage_plus2';

function CareersPage() {
  const { t } = useI18n();
  const [rows,setRows]=useState([]); const [openId,setOpenId]=useState(null);
  const [f,setF]=useState({name:'',email:'',phone:'',note:''}); const [sentFor,setSentFor]=useState(null);
  useEffect(()=>{ api('website_jobs?active=eq.true').then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  const apply=async(job)=>{
    if(!f.name||!f.phone){ toast(t('swCarNamePhoneReq'),'error'); return; }
    await api('rpc/public_lead_submit',{method:'POST',body:{ p_name:f.name, p_phone:f.phone, p_email:f.email||null, p_source:'Website - Careers', p_interest:job.job_title, p_message:'Career application — '+job.job_title+(f.note?(' — '+f.note):''), p_meta:{ job_id:job.id, type:'career' } }});
    setSentFor(job.id); toast(t('swCarReceived'),'success');
  };
  return (<PageWrap title={cms('careers.hero.title','Careers')} sub={cms('careers.hero.subtitle','Join a team that builds beautiful, lasting spaces.')}>
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {rows.map(j=>(<div key={j.id} style={{ background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:24, boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--shop-ink, #1d1d1f)' }}>{j.job_title}</div>
            <div style={{ fontSize:13, color:'var(--shop-muted, #86868b)', marginTop:4 }}>{[j.department,j.employment_type,j.location].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" onClick={()=>setOpenId(openId===j.id?null:j.id)} style={{ background:'var(--clay)', color:'#fff', border:'none', borderRadius:980, padding:'10px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{openId===j.id?t('swCarClose'):t('swCarApply')}</button>
        </div>
        {j.description && <div style={{ fontSize:14, color:'#555', marginTop:12, lineHeight:1.6 }}>{j.description}</div>}
        {j.requirements && <div style={{ fontSize:13, color:'var(--shop-muted, #86868b)', marginTop:8, lineHeight:1.6 }}><strong>{t('swCarRequirements')}</strong> {j.requirements}</div>}
        {openId===j.id && (sentFor===j.id
          ? <div style={{ marginTop:16, color:'#1D7A4D', fontWeight:600 }}>{t('swCarThankYou')}</div>
          : <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input placeholder={t('swCarFullName')} aria-label={t('swCarFullNameAria')} value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp} />
              <input placeholder={t('swCarPhone')} aria-label={t('swCarPhoneAria')} value={f.phone} onChange={e=>setF({...f,phone:e.target.value})} style={inp} />
              <input placeholder={t('swCarEmail')} aria-label={t('swCarEmail')} value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={inp} />
              <input placeholder={t('swCarNote')} aria-label={t('swCarNote')} value={f.note} onChange={e=>setF({...f,note:e.target.value})} style={inp} />
              <button type="button" onClick={()=>apply(j)} style={{ gridColumn:'1 / -1', background:'var(--shop-ink, #1d1d1f)', color:'#fff', border:'none', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('swCarSubmit')}</button>
            </div>)}
      </div>))}
      {rows.length===0 && <div style={{ color:'#aaa' }}>{t('swCareersNoRoles')}</div>}
    </div>
  </PageWrap>);
}

export { CareersPage };
