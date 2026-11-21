// Route chunk "CheckoutPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: CheckoutPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { useSubmit } from '../forms/useSubmit';
import { computeTotal, placeOrder, checkoutMsg, failureMessage } from '../checkout/checkout';
import * as acct from '../account/api';
import { isBot, validateForm, msg as vmsg } from '../forms/validate';
import Field, { Honeypot, FormStatus } from '../forms/Field';
import FormNotice from '../privacy/FormNotice';
import { formatBHD } from '../i18n/format';
import { CMS_LANG, api, fmt, useI18n, useMobile, useReveal } from '../App';

/* ── CHECKOUT ── */
function CheckoutPage({ cart, setCart, user, setPage }) {
  const [step, setStep] = useState(1);
  useReveal();
  const { t, lang } = useI18n();
  // Card is the default — it is the only method that gets the money in today.
  const [form, setForm] = useState({ name:user?.name||'', email:user?.email||'', phone:user?.phone||'', address:'', city:'Manama', payment:'Card', notes:'' });
  const [settings, setSettings] = useState({});
  const [months, setMonths] = useState(0); // 0 = pay in full
  const sub = useSubmit({ timeoutMs: 45000 });     // single in-flight guard (ref), offline pre-check, slow-network hint, timeout
  const placing = sub.busy;
  const [errs, setErrs] = useState({});
  const [placeErr, setPlaceErr] = useState('');
  const [hp, setHp] = useState('');
  const [result, setResult] = useState(null);          // the SERVER-confirmed outcome (order ref + total when the RPC returns one)
  useEffect(() => { api('rpc/marketplace_settings_get', { method:'POST', body:{} }).then(d => setSettings(d && typeof d==='object' ? d : {})).catch(()=>{}); }, []);
  const total = computeTotal(cart);                // DISPLAY ONLY: an estimate. The server recomputes and confirms the amount.
  const mobile = useMobile();
  const plans = Array.isArray(settings.installment_plans) ? settings.installment_plans : [];
  const instEnabled = settings.product_installments_enabled && total >= (Number(settings.installment_min_amount)||0) && plans.length > 0;
  const monthly = months > 0 ? (total / months) : 0;
  // ── Loyalty redemption ──────────────────────────────────────────────────
  const [bal, setBal] = useState(null);
  const [useRedeem, setUseRedeem] = useState(false);
  // Loyalty is looked up for the SIGNED-IN customer only (session token, or the stored profile's own phone) — never for a phone
  // typed into the form, which would let anyone read someone else's balance. Guests simply see no points option.
  useEffect(() => {
    if (!user) { setBal(null); return; }
    let alive = true;
    acct.loyaltyBalance(user).then(d => { if (alive && d && d.ok) setBal(d); }).catch(() => {});
    return () => { alive = false; };
  }, [user]);
  const rppb = (bal && Number(bal.redeem_points_per_bd)) || 100;
  const maxDiscount = (bal && bal.enabled && bal.points > 0) ? Math.min(Number(bal.value_bd) || 0, total) : 0;
  const discount = useRedeem ? maxDiscount : 0;
  const pointsUsed = discount > 0 ? Math.round(discount * rppb) : 0;
  const payable = Math.max(0, +(total - discount).toFixed(3));
  const place = async () => {
    setPlaceErr('');
    if (isBot(hp)) return;                          // honeypot filled: do nothing
    const res = await sub.run((signal) => placeOrder({
      deps: { rpc: (fn, body, o) => api('rpc/' + fn, { method:'POST', body, signal: (o && o.signal) || signal }), redeem: acct.redeemPoints, award: acct.awardPoints },
      cart, form, user, months, monthly, payable, pointsUsed, loyalty: bal, lang, signal,
    }));
    if (res.skipped) return;                        // a request is already in flight: ignore the repeat click
    if (!res.ok) {                                  // failure is SURFACED; the cart is kept; pressing the button again retries only the failed step
      setPlaceErr(res.offline ? checkoutMsg('offline', lang) : failureMessage(res.error, lang));
      return;
    }
    const done = res.value;
    setCart([]);                                    // cleared ONLY after the server confirmed the order
    setResult(done);
    if (done.redirectUrl) { window.location.href = done.redirectUrl; return; }   // card: straight to the secure payment page
    setStep(3);
  };
  const goStep2 = () => {
    const v = validateForm(form, { name:{type:'name',required:true}, email:{type:'email',required:true}, phone:{type:'phone'}, address:{type:'text',max:300}, city:{type:'name',required:true,max:80} }, lang);
    setErrs(v.errors);
    if (!v.ok) { setPlaceErr(vmsg('fix', lang)); setTimeout(() => { const el = document.getElementById('co-' + v.first); if (el) el.focus(); }, 0); return; }
    setPlaceErr(''); setForm(f => ({ ...f, ...v.clean })); setStep(2);
  };
  return (
    <div style={{ minHeight:'100dvh', paddingTop: mobile ? 0 : 56, paddingBottom: mobile ? 80 : 0, background:'var(--shop-fill)' }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding: mobile ? '24px 16px' : '40px 40px 80px' }}>
        <h1 style={{ fontSize: mobile ? 26 : 32, fontWeight:700, letterSpacing:'-.03em', color:'var(--shop-ink)', marginBottom:24 }}>{t('checkout')}</h1>
        {step===3 ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(26,122,64,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:32 }}>✓</div>
            <h2 id="co-done" tabIndex={-1} style={{ fontSize:26, fontWeight:700, color:'var(--shop-ink)', marginBottom:10 }}>{t('orderPlaced')}</h2>
            {result && result.orderId && <p style={{ fontSize:14, marginBottom:8 }}>{checkoutMsg('orderRef', lang)}: <bdi dir="ltr">{String(result.orderId).slice(0, 40)}</bdi></p>}
            {result && result.total != null && <p style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>{checkoutMsg('confirmedTotal', lang)}: {fmt(result.total)}</p>}
            <p style={{ color:'var(--shop-muted)', fontSize:15, marginBottom:32 }}>{t('swContactConfirm24')}</p>
            <button type="button" className="btn" onClick={()=>setPage('home')} style={{ borderRadius:'var(--radius-lg)' }}>{t('backHome')}</button>
          </div>
        ) : (
          <div style={{ display: mobile ? 'flex' : 'grid', flexDirection: mobile ? 'column' : undefined, gridTemplateColumns: mobile ? undefined : '1fr 320px', gap:16 }}>
            {/* Order summary — show first on mobile */}
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:20, border:'1px solid var(--shop-line)', order: mobile ? -1 : 1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--shop-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:14 }}>{t('summary')}</div>
              {cart.map((item,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--shop-fill)' }}>
                  <span style={{ fontSize:14, color:'var(--shop-ink)' }}>{item.name}</span>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--shop-ink)' }}>{fmt(item.price)}</span>
                </div>
              ))}
              {bal && bal.enabled && bal.points > 0 && maxDiscount > 0 && (
                <label style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0 10px', cursor:'pointer', fontSize:13, color:'var(--shop-ink)' }}>
                  <input type="checkbox" checked={useRedeem} onChange={e=>setUseRedeem(e.target.checked)} />
                  <span>{lang==='ar' ? ('استخدم '+bal.points+' نقطة (خصم '+fmt(maxDiscount)+')') : ('Use '+bal.points+' points (−'+fmt(maxDiscount)+')')}</span>
                </label>
              )}
              {discount > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, color:'var(--clay-deep)', fontSize:14, fontWeight:600 }}>
                  <span>{lang==='ar' ? 'خصم النقاط' : 'Points discount'}</span><span>−{fmt(discount)}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:4 }}>
                <span style={{ fontSize:16, fontWeight:700 }}>{checkoutMsg('estimatedTotal', lang)}</span>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--clay)' }}>{fmt(payable)}</span>
              </div>
              <div className="form-note" style={{ marginTop:6 }}>{checkoutMsg('estimateNote', lang)}</div>
              {user && <div style={{ fontSize:12, color:'var(--shop-muted)', marginTop:8 }}>+{Math.floor(payable*10)} {t('swCoLoyaltyPts')}</div>}
            </div>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding: mobile ? 20 : 28, border:'1px solid var(--shop-line)' }}>
              {step===1&&<>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--shop-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:20 }}>{t('swCoStep1')}</div>
                <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
                  {[[t('swCoFullName'),'name','text','name'],[t('swCoEmail'),'email','email','email'],[t('swCoPhone'),'phone','tel','tel'],[t('swCoCity'),'city','text','address-level2']].map(([label,key,type,ac])=>(
                    <Field key={key} id={'co-'+key} hideLabel={false} labelStyle={{ fontSize:13, fontWeight:500, color:'var(--shop-muted)', display:'block', marginBottom:6 }} label={label} required={key==='name'||key==='email'} error={errs[key]} className="inp" type={type} inputMode={type==='tel'?'tel':type==='email'?'email':undefined} autoComplete={ac} maxLength={key==='email'?254:key==='phone'?20:key==='city'?80:120} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} />
                  ))}
                  <Field id="co-address" wrapStyle={{ gridColumn: mobile ? '1' : 'span 2' }} hideLabel={false} labelStyle={{ fontSize:13, fontWeight:500, color:'var(--shop-muted)', display:'block', marginBottom:6 }} label={t('swCoAddress')} error={errs.address} className="inp" autoComplete="street-address" maxLength={300} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} />
                </div>
                <Honeypot value={hp} onChange={setHp} />
                <FormNotice kind="order" lang={lang} style={{ marginBottom:12 }} />
                <div aria-live="polite" role="status">{placeErr && <div className="form-banner form-banner--err" role="alert" style={{ marginBottom:12 }}>{placeErr}</div>}</div>
                <button type="button" className="btn" onClick={goStep2} style={{ borderRadius:'var(--radius-md)' }}>{t('swCoContinue')}</button>
              </>}
              {step===2&&<>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--shop-muted)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:20 }}>{t('swCoStep2')}</div>
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  {[['Card',t('swCoCard')],['Bank Transfer',t('swCoBankTransfer')],['Cash',t('swCoCash')],['Cheque',t('swCoCheque')]].map(([p,plabel])=>(
                    <button type="button" key={p} onClick={()=>{ setForm(f=>({...f,payment:p})); setMonths(0); }} style={{ flex:1, padding:'12px 8px', borderRadius:'var(--radius-md)', border:`1.5px solid ${form.payment===p&&months===0?'var(--clay)':'var(--shop-line)'}`, background:form.payment===p&&months===0?'rgba(168,75,41,.08)':'#fff', color:form.payment===p&&months===0?'var(--clay)':'var(--shop-ink-2)', fontSize:13, cursor:'pointer', fontWeight:form.payment===p&&months===0?500:400, transition:'all .15s' }}>{plabel}</button>
                  ))}
                </div>
                {form.payment==='Card' && months===0 && (
                  <div style={{ marginBottom:16, background:'rgba(168,75,41,.06)', border:'1px solid rgba(168,75,41,.22)', borderRadius:'var(--radius-md)', padding:'11px 13px', fontSize:12.5, color:'var(--shop-ink-2)', lineHeight:1.6 }}>
                    {t('swCoCardNote')}
                  </div>
                )}
                {instEnabled && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--shop-ink)', marginBottom:8 }}>{t('swCheckoutSplit')}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {plans.map(m=>(
                        <button type="button" key={m} onClick={()=>setMonths(months===m?0:m)} style={{ padding:'10px 14px', borderRadius:'var(--radius-md)', border:`1.5px solid ${months===m?'var(--clay)':'var(--shop-line)'}`, background:months===m?'rgba(168,75,41,.08)':'#fff', cursor:'pointer', textAlign:'left' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:months===m?'var(--clay)':'var(--shop-ink)' }}>{m} {t('swCoMonths')}</div>
                          <div style={{ fontSize:12, color:'var(--shop-muted)' }}>{formatBHD(total/m, CMS_LANG)}{CMS_LANG==='ar' ? '/شهر' : '/mo'}</div>
                        </button>
                      ))}
                    </div>
                    {months>0 && <div style={{ marginTop:10, fontSize:13, color:'var(--ok)', fontWeight:600 }}>✓ {months} {t('swCoInstConfirmPre')} {monthly.toFixed(2)} {t('swCoInstConfirmPost')}</div>}
                  </div>
                )}
                <textarea className="inp" rows={3} maxLength={1000} placeholder={t('swCoNotes')} aria-label={t('swCoNotesAria')} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ resize:'vertical', marginBottom:16 }} />
                <FormStatus offline={sub.offline} slow={sub.slow} error={placeErr} lang={lang} t={(k)=>vmsg(k, lang)} />
                <div style={{ display:'flex', gap:10, marginTop:placeErr?12:0 }}>
                  <button type="button" className="btn-secondary" onClick={()=>setStep(1)} disabled={placing} style={{ borderRadius:'var(--radius-md)' }}>{t('swCoBack')}</button>
                  <button type="button" className="btn" onClick={place} disabled={placing} aria-busy={placing} style={{ flex:1, borderRadius:'var(--radius-md)', opacity: placing ? 0.6 : 1, cursor: placing ? 'not-allowed' : 'pointer' }}>{placing ? t('swCoPlacing') : t('swCoPlaceOrder')}</button>
                </div>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { CheckoutPage };
