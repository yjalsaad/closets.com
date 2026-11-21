// Route chunk "BookingPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: BookingPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { useSubmit } from '../forms/useSubmit';
import { isBot, validateForm, msg as vmsg } from '../forms/validate';
import Field, { Honeypot, FormStatus } from '../forms/Field';
import FormNotice from '../privacy/FormNotice';
import { api, cms, toast, trMap, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { Icon } from '../design/Icon';
import { FACTS } from '../content/facts';
import { parseBookingPrefill } from '../showroom3d/products/quote';

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
  // [SHOWROOM-3D] /booking?interest=Kitchen&notes=... (built by the virtual showroom's "Request a quotation") only PRE-FILLS the form; the visitor reviews and submits it
  const [f,setF]=useState(() => { let pre = { interest:null, notes:null }; try { pre = parseBookingPrefill(window.location.search); } catch (e) {} return { type:'Design Consultation', name:'', phone:'', email:'', date:'', slot:APPT_SLOTS[0], address:'', interest:pre.interest || 'Kitchen', notes:pre.notes || '' }; });
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
  if(sent) return (<PageWrap eyebrow={t('bkBooked')} title={t('bkThankYou')}><div className="empty-state" style={{ maxWidth:640 }}><Icon name="check" /><h2>{t('bkRequestedPrefix')} {trMap(f.type, APPT_KIND_LC_KEY, lang)} {t('bkRequestedSuffix')}</h2><p>{t('sw3BookCallConfirm')}</p><button type="button" className="btn-clay" onClick={()=>setPage('home')}>{t('bkBackHome')}</button></div></PageWrap>);
  const prettyDate = f.date ? (() => { try { return new Intl.DateTimeFormat(lang==='ar' ? 'ar-BH-u-nu-latn' : 'en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date(f.date + 'T12:00:00')); } catch (e) { return ''; } })() : '';
  const expect = lang==='ar'
    ? ['يقيس المصمّم مساحتك', 'نعدّ لك تصوّرًا ثنائي وثلاثي الأبعاد', 'مجانًا ودون أي التزام']
    : ['A designer measures your space', 'We draw a 2D and 3D concept', 'Free, with no obligation'];
  return (<PageWrap eyebrow={cms('booking.hero.eyebrow','Free design visit')} title={cms('booking.hero.title','Book your free visit.')} sub={cms('booking.hero.subtitle','A designer measures your space and creates a bespoke 2D & 3D concept — free, with no obligation.')}>
    <div className="booking-grid">
      <form noValidate onSubmit={e=>{ e.preventDefault(); submit(); }} className="booking-form">
        <fieldset className="booking-kind">
          <legend className="field-label">{t('bkApptType')}</legend>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {APPT_KINDS.map(k=>(<button type="button" key={k} className="chip" aria-pressed={f.type===k} onClick={()=>set('type',k)}>{trMap(k, APPT_KIND_KEY, lang)}</button>))}
          </div>
        </fieldset>
        <div className="booking-fields">
          <Field id="bk-name" label={t('bkFullName')} required error={errs.name} autoComplete="name" maxLength={120} value={f.name} onChange={e=>set('name',e.target.value)} />
          <Field id="bk-phone" label={t('bkPhone')} required error={errs.phone} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={f.phone} onChange={e=>set('phone',e.target.value)} />
          <Field id="bk-email" label={t('bkEmail')} error={errs.email} type="email" inputMode="email" autoComplete="email" maxLength={254} value={f.email} onChange={e=>set('email',e.target.value)} />
          <Field id="bk-interest" as="select" label={lang==='ar' ? 'الاهتمام' : 'Interested in'} value={f.interest} onChange={e=>set('interest',e.target.value)}>{['Kitchen','Wardrobe','Walk-In Closet','TV Unit','Doors','Storage','Other'].map(x=><option key={x} value={x}>{trMap(x, BK_INT_KEY, lang)}</option>)}</Field>
          <Field id="bk-date" label={lang==='ar' ? 'التاريخ المفضل' : 'Preferred date'} error={errs.date} type="date" min={todayIso} lang={lang==='ar' ? 'ar' : 'en-GB'} value={f.date} onChange={e=>set('date',e.target.value)} hint={prettyDate || (lang==='ar' ? 'اختر يومًا مناسبًا' : 'Choose a day that suits you')} />
          <Field id="bk-slot" as="select" label={lang==='ar' ? 'الوقت المفضل' : 'Preferred time'} value={f.slot} onChange={e=>set('slot',e.target.value)}>{APPT_SLOTS.map(x=><option key={x} value={x}>{trMap(x, APPT_SLOT_KEY, lang)}</option>)}</Field>
          <Field id="bk-address" label={t('bkAddress')} error={errs.address} autoComplete="street-address" maxLength={300} value={f.address} onChange={e=>set('address',e.target.value)} wrapStyle={{ gridColumn:'1 / -1' }} />
          <Field id="bk-notes" as="textarea" label={t('bkNotes')} error={errs.notes} rows={3} maxLength={2000} value={f.notes} onChange={e=>set('notes',e.target.value)} wrapStyle={{ gridColumn:'1 / -1' }} />
        </div>
        <Honeypot value={hp} onChange={setHp} />
        <FormNotice kind="request" lang={lang} style={{ marginTop:14 }} />
        <FormStatus offline={sub.offline} slow={sub.slow} error={formErr} lang={lang} t={(k)=>vmsg(k, lang)} />
        <button type="submit" className="btn-clay" disabled={busy} aria-busy={busy} style={{ marginTop:'var(--space-5)', width:'100%' }}>{busy?t('bkSubmitting'):t('bkSubmit')}</button>
      </form>
      <aside className="booking-aside" aria-label={lang==='ar' ? 'ما الذي ينتظرك' : 'What to expect'}>
        <div className="ph ar-43" role="img" aria-label={lang==='ar' ? 'صورة صالة العرض قيد الإعداد' : 'Showroom photograph in preparation'} />
        <h2 className="t-h3" style={{ margin:'var(--space-5) 0 var(--space-3)' }}>{lang==='ar' ? 'ما الذي ينتظرك' : 'What to expect'}</h2>
        <ul className="tick-list">{expect.map(x=><li key={x}><Icon name="check" size={18} />{x}</li>)}</ul>
        <dl className="visit-list" style={{ marginTop:'var(--space-5)' }}>
          <div><dt><Icon name="clock" size={18} />{lang==='ar' ? 'ساعات العمل' : 'Hours'}</dt><dd>{FACTS.hours[lang==='ar'?'ar':'en']}</dd></div>
          <div><dt><Icon name="phone" size={18} />{lang==='ar' ? 'اتصل أو راسلنا' : 'Call or message'}</dt><dd><a href={FACTS.phoneHref}><bdi dir="ltr">{FACTS.phone}</bdi></a> · <a href={FACTS.whatsappHref}>{lang==='ar' ? 'واتساب' : 'WhatsApp'}</a></dd></div>
          <div><dt><Icon name="shield" size={18} />{lang==='ar' ? 'الضمان' : 'Warranty'}</dt><dd>{lang==='ar' ? 'ضمان ' + FACTS.warrantyYears + ' سنوات على الخزائن ومفصلات الإغلاق الهادئ' : FACTS.warrantyYears + ' years on cabinetry and soft-close hardware'}</dd></div>
        </dl>
      </aside>
    </div>
  </PageWrap>);
}

export { BookingPage };
