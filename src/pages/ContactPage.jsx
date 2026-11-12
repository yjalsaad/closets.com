// Route chunk "ContactPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ContactPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { useSubmit } from '../forms/useSubmit';
import { isBot, validateForm, msg as vmsg } from '../forms/validate';
import Field, { Honeypot, FormStatus } from '../forms/Field';
import FormNotice from '../privacy/FormNotice';
import { api, cms, toast, useI18n, useMobile, useReveal } from '../App';
import { CardTile, cardRpc } from './shared_DirectoryPage_ContactPage';

function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', product:'', budget:'', message:'' });
  const [sent, setSent] = useState(false);
  const [errs, setErrs] = useState({}); const [formErr, setFormErr] = useState(''); const [hp, setHp] = useState('');
  const sub = useSubmit(); const busy = sub.busy;
  const [team, setTeam] = useState([]);
  useEffect(() => {
    cardRpc('card_directory', { p_type:'employee', p_search:null, p_limit:12 })
      .then(r => setTeam(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  const mobile = useMobile();
  const { t, lang } = useI18n();
  useReveal();
  const submit = async () => {
    setFormErr('');
    if (isBot(hp)) { setSent(true); return; }
    const v = validateForm(form, { name:{type:'name',required:true}, email:{type:'email',required:true}, phone:{type:'phone'}, message:{type:'text',max:2000} }, lang);
    setErrs(v.errors);
    if (!v.ok) { setFormErr(vmsg('fix', lang)); setTimeout(() => { const el = document.getElementById('ct-' + v.first); if (el) el.focus(); }, 0); return; }
    const c = v.clean;
    // Route through the audited public_lead_submit RPC (validates, writes lead, queues team notification)
    const res = await sub.run((signal) => api('rpc/public_lead_submit', { method:'POST', signal, body:{
      p_name: c.name, p_phone: c.phone || null, p_email: c.email || null,
      p_source: 'Website - Contact', p_interest: form.product || null,
      p_message: c.message || null, p_budget: Number.isFinite(Number(form.budget)) && form.budget ? Number(form.budget) : null,   // option labels like 'BD 200–500' are not numeric: null, exactly as before
      p_meta: { page: 'contact' }
    }}));
    if (res.ok) { setSent(true); toast('Message sent ✓', 'success'); }
    else if (res.offline) setFormErr(vmsg('offline', lang));
    else if (!res.skipped) { setFormErr(vmsg('failed', lang)); toast('Could not send, please try again', 'error'); }
  };
  return (
    <div style={{ minHeight:'100dvh', paddingTop: mobile ? 88 : 112, paddingBottom: mobile ? 80 : 60, background:'var(--cream)' }}>
      <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile ? '0 24px' : '0 32px', display: mobile ? 'block' : 'grid', gridTemplateColumns:'1fr 1fr', gap:72, alignItems:'start' }}>
        <div className="rv-l" style={{ marginBottom: mobile ? 36 : 0 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>{cms('contact.hero.eyebrow', 'Get in touch')}</div>
          <h1 className="display" style={{ fontSize: mobile ? 36 : 56, color:'var(--ink)', marginBottom:16, lineHeight:1.05 }}>{cms('contact.hero.title', 'Let’s start your project.')}</h1>
          <p style={{ fontSize:17, color:'var(--ink-soft)', lineHeight:1.7, marginBottom:30 }}>{cms('contact.hero.subtitle', 'Tell us about your space and we’ll arrange a free home or showroom visit — no obligation.')}</p>
          {[['📍','Showrooms','Manama · Riffa · Saar · Isa Town', null],['📞','Phone','+973 17555095','tel:+97317555095'],['✉️','Email','info@the-closets.com','mailto:info@the-closets.com'],['⏰','Hours','Sat–Thu · 9am–8pm', null]].map(([icon,label,val,href])=>(
            <div key={label} style={{ display:'flex', gap:14, padding:'15px 0', borderBottom:'1px solid var(--line)' }}>
              <span aria-hidden="true" style={{ fontSize:18 }}>{icon}</span>
              <div><div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:3 }}>{label}</div>
                {href ? <a href={href} style={{ fontSize:15, color:'var(--clay)', fontWeight:600, textDecoration:'none' }}>{val}</a> : <div style={{ fontSize:15, color:'var(--ink)' }}>{val}</div>}
              </div>
            </div>
          ))}
        </div>
        {sent ? (
          <div className="rv-r" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding:'56px 32px', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(176,97,59,.12)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28, color:'var(--clay)' }}>✓</div>
            <h3 className="display" style={{ fontSize:26, color:'var(--ink)', marginBottom:10 }}>{t('msgReceived')}</h3>
            <p style={{ color:'var(--ink-soft)', fontSize:15 }}>{t('swContactWithin24')}</p>
          </div>
        ) : (
          <form noValidate onSubmit={e=>{ e.preventDefault(); submit(); }} className="rv-r" style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding: mobile?22:30, display:'flex', flexDirection:'column', gap:12 }}>
            <Field id="ct-name" className="inp" label={t("yourName")} required error={errs.name} placeholder={t("yourName")} autoComplete="name" maxLength={120} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <Field id="ct-email" className="inp" label={t('swContactEmail')} required error={errs.email} placeholder={t('swContactEmail')} type="email" inputMode="email" autoComplete="email" maxLength={254} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <Field id="ct-phone" className="inp" label={t("phone")} error={errs.phone} placeholder={t("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }} />
            <Field id="ct-product" as="select" className="inp" label={t('swContactInterestedAria')} value={form.product} onChange={e=>setForm(p=>({...p,product:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }}>
              <option value="">{t('swContactInterested')}</option>
              {['Walk-In Wardrobe','Sliding Door','Hinged Door','Kitchen','Office','Kids Room'].map(o=><option key={o}>{o}</option>)}
            </Field>
            <Field id="ct-budget" as="select" className="inp" label={t('budgetRange')} value={form.budget} onChange={e=>setForm(p=>({...p,budget:e.target.value}))} style={{ background:'var(--cream)', border:'1px solid var(--line)' }}>
              <option value="">{t('budgetRange')}</option>
              {['BD 200–500','BD 500–1,000','BD 1,000–2,500','BD 2,500–5,000','BD 5,000+'].map(o=><option key={o}>{o}</option>)}
            </Field>
            <Field id="ct-message" as="textarea" className="inp" label={t("tellProject")} error={errs.message} placeholder={t("tellProject")} rows={4} maxLength={2000} value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} style={{ resize:'vertical', background:'var(--cream)', border:'1px solid var(--line)' }} />
            <Honeypot value={hp} onChange={setHp} />
            <FormNotice kind="request" lang={lang} />
            <FormStatus offline={sub.offline} slow={sub.slow} error={formErr} lang={lang} t={(k)=>vmsg(k, lang)} />
            <button type="submit" className="btn-clay" disabled={busy} aria-busy={busy} style={{ marginTop:4, opacity:busy?.6:1 }}>{busy ? t('swContactSending') : t('sendMessage')}</button>
          </form>
        )}
      </div>
      {team.length > 0 && (
        <div className="reveal" style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'48px 24px 20px':'72px 32px 20px' }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>{t('swContactOurTeam')}</div>
          <h2 className="display" style={{ fontSize: mobile?26:34, color:'var(--ink)', marginBottom:24 }}>{t('swContactSaveCard')}</h2>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
            {team.map(c => <CardTile key={c.slug} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export { ContactPage };
