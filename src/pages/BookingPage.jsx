// Route chunk "BookingPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: BookingPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { useSubmit } from '../forms/useSubmit';
import { isBot, validateForm, msg as vmsg } from '../forms/validate';
import Field, { Honeypot, FormStatus } from '../forms/Field';
import FormNotice from '../privacy/FormNotice';
import { api, cms, toast, trMap, useI18n, useMobile } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { inp } from './shared_CareersPage_BookingPage_plus2';

// Booking form display maps. Keys map the saved/posted English value → an I18N key
// for the DISPLAYED text only. The posted value (APPT_KINDS / APPT_SLOTS / interest)
// stays English. Unknown values fall back to the English literal.
const APPT_KIND_KEY = {
  'Design Consultation':'bkKindDesignConsult', 'Free Site Visit':'bkKindFreeSiteVisit',
  'Showroom Visit':'bkKindShowroomVisit', 'Online Consultation':'bkKindOnlineConsult',
};

const APPT_KIND_LC_KEY = {
  'Design Consultation':'bkApptDesignConsultLc', 'Free Site Visit':'bkApptFreeSiteVisitLc',
  'Showroom Visit':'bkApptShowroomVisitLc', 'Online Consultation':'bkApptOnlineConsultLc',
};

const APPT_SLOT_KEY = {
  'Morning (9–12)':'bkSlotMorning', 'Afternoon (12–4)':'bkSlotAfternoon', 'Evening (4–7)':'bkSlotEvening',
};

const BK_INT_KEY = {
  'Kitchen':'bkIntKitchen', 'Wardrobe':'bkIntWardrobe', 'Walk-In Closet':'bkIntWalkIn',
  'TV Unit':'bkIntTvUnit', 'Doors':'bkIntDoors', 'Storage':'bkIntStorage', 'Other':'bkIntOther',
};

const APPT_KINDS = ['Design Consultation','Free Site Visit','Showroom Visit','Online Consultation'];

const APPT_SLOTS = ['Morning (9–12)','Afternoon (12–4)','Evening (4–7)'];

function BookingPage({ setPage }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [f,setF]=useState({ type:'Design Consultation', name:'', phone:'', email:'', date:'', slot:APPT_SLOTS[0], address:'', interest:'Kitchen', notes:'' });
  const [sent,setSent]=useState(false);
  const [errs,setErrs]=useState({}); const [formErr,setFormErr]=useState(''); const [hp,setHp]=useState('');
  const sub = useSubmit(); const busy = sub.busy;
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const todayIso = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
  const submit=async()=>{
    setFormErr('');
    if (isBot(hp)) { setSent(true); return; }                       // honeypot: act done, send nothing
    const v = validateForm(f, { name:{type:'name',required:true}, phone:{type:'phone',required:true}, email:{type:'email'}, date:{type:'date'}, address:{type:'text',max:300}, notes:{type:'text',max:2000} }, lang);
    setErrs(v.errors);
    if (!v.ok) { setFormErr(vmsg('fix', lang)); setTimeout(() => { const el = document.getElementById('bk-' + v.first); if (el) el.focus(); }, 0); return; }
    const c = v.clean;
    const res = await sub.run((signal) => api('rpc/book_appointment',{method:'POST',signal,body:{ p_name:c.name, p_phone:c.phone, p_email:c.email||null, p_type:f.type, p_date:c.date||null, p_slot:f.slot, p_address:c.address||null, p_interest:f.interest, p_notes:c.notes||null }}));
    if (res.ok) { setSent(true); toast(t('bkRequested'),'success'); }
    else if (res.offline) setFormErr(vmsg('offline', lang));
    else if (!res.skipped) { setFormErr(vmsg('failed', lang)); toast(t('bkSubmitErr'),'error'); }
  };
  if(sent) return (<PageWrap eyebrow={t('bkBooked')} title={t('bkThankYou')}><div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:36, maxWidth:560 }}><div aria-hidden="true" style={{ fontSize:40 }}>✅</div><div className="display" style={{ fontSize:24, color:'var(--ink)', marginTop:14 }}>{t('bkRequestedPrefix')} {trMap(f.type, APPT_KIND_LC_KEY, lang)} {t('bkRequestedSuffix')}</div><div style={{ fontSize:15, color:'var(--ink-soft)', marginTop:10, lineHeight:1.6 }}>{t('sw3BookCallConfirm')}</div><button type="button" className="btn-clay" onClick={()=>setPage('home')} style={{ marginTop:22 }}>{t('bkBackHome')}</button></div></PageWrap>);
  return (<PageWrap eyebrow={cms('booking.hero.eyebrow','Free design visit')} title={cms('booking.hero.title','Book your free visit.')} sub={cms('booking.hero.subtitle','A designer measures your space and creates a bespoke 2D & 3D concept — free, with no obligation.')}>
    <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?22:30, maxWidth:720 }}>
      <div className="eyebrow" style={{ fontSize:11, marginBottom:10 }}>{t('bkApptType')}</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:18 }}>
        {APPT_KINDS.map(k=>(<button type="button" key={k} onClick={()=>set('type',k)} style={{ padding:'9px 16px', borderRadius:980, cursor:'pointer', fontSize:13, fontWeight:600, background:f.type===k?'var(--clay)':'var(--sand)', color:f.type===k?'#fff':'var(--ink)', border:'1px solid '+(f.type===k?'var(--clay)':'var(--line)') }}>{trMap(k, APPT_KIND_KEY, lang)}</button>))}
      </div>
      <form noValidate onSubmit={e=>{ e.preventDefault(); submit(); }}>
      <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
        <Field id="bk-name" label={t('bkFullName')} required error={errs.name} placeholder={t('bkFullName')} autoComplete="name" maxLength={120} value={f.name} onChange={e=>set('name',e.target.value)} style={inp} />
        <Field id="bk-phone" label={t('bkPhone')} required error={errs.phone} placeholder={t('bkPhone')} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={e=>set('phone',e.target.value)} style={inp} />
        <Field id="bk-email" label={t('bkEmail')} error={errs.email} placeholder={t('bkEmail')} type="email" inputMode="email" autoComplete="email" maxLength={254} value={f.email} onChange={e=>set('email',e.target.value)} style={inp} />
        <Field id="bk-interest" as="select" label={lang==='ar' ? 'الاهتمام' : 'Interested in'} value={f.interest} onChange={e=>set('interest',e.target.value)} style={inp}>{['Kitchen','Wardrobe','Walk-In Closet','TV Unit','Doors','Storage','Other'].map(x=><option key={x} value={x}>{trMap(x, BK_INT_KEY, lang)}</option>)}</Field>
        <Field id="bk-date" label={lang==='ar' ? 'التاريخ المفضل' : 'Preferred date'} error={errs.date} type="date" min={todayIso} value={f.date} onChange={e=>set('date',e.target.value)} style={inp} />
        <Field id="bk-slot" as="select" label={lang==='ar' ? 'الوقت المفضل' : 'Preferred time'} value={f.slot} onChange={e=>set('slot',e.target.value)} style={inp}>{APPT_SLOTS.map(x=><option key={x} value={x}>{trMap(x, APPT_SLOT_KEY, lang)}</option>)}</Field>
        <Field id="bk-address" label={t('bkAddress')} error={errs.address} placeholder={t('bkAddress')} autoComplete="street-address" maxLength={300} value={f.address} onChange={e=>set('address',e.target.value)} style={inp} wrapStyle={{ gridColumn: mobile?'auto':'1 / -1' }} />
        <Field id="bk-notes" as="textarea" label={t('bkNotes')} error={errs.notes} placeholder={t('bkNotes')} rows={3} maxLength={2000} value={f.notes} onChange={e=>set('notes',e.target.value)} style={{...inp, resize:'vertical'}} wrapStyle={{ gridColumn: mobile?'auto':'1 / -1' }} />
      </div>
      <Honeypot value={hp} onChange={setHp} />
      <FormNotice kind="request" lang={lang} style={{ marginTop:14 }} />
      <FormStatus offline={sub.offline} slow={sub.slow} error={formErr} lang={lang} t={(k)=>vmsg(k, lang)} />
      <button type="submit" className="btn-clay" disabled={busy} aria-busy={busy} style={{ marginTop:18, width:'100%', opacity:busy?.6:1 }}>{busy?t('bkSubmitting'):t('bkSubmit')}</button>
      </form>
    </div>
  </PageWrap>);
}

export { BookingPage };
