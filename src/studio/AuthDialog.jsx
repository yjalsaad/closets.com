/* [WEB-STUDIO 2026-10-31] Customer sign in / create account / forgot password — used as a dialog (from Get quote / Save) and as the
 * body of /studio/account when signed out. E-mail + password on Supabase Auth (customerAuth.js). */
import React, { useState } from 'react';
import { signIn, signUp, resetPassword, authError } from './customerAuth';
import { validateEmail, validatePhone, normalizePhone } from '../forms/validate';
import FormNotice from '../privacy/FormNotice';

export default function AuthForm({ lang = 'en', onDone, reason, initialMode = 'signin' }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [mode, setMode] = useState(initialMode);  // signin | signup | reset | sent | resetSent
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const strong = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!validateEmail(f.email)) { setErr(L('Please enter a valid e-mail.', 'يرجى إدخال بريد إلكتروني صحيح.')); return; }
    if (mode === 'signup' && f.phone && f.phone.trim() && !validatePhone(f.phone)) { setErr(L('Please enter a valid phone number.', 'يرجى إدخال رقم هاتف صحيح.')); return; }
    setBusy(true);
    try {
      if (mode === 'signin') { await signIn(f); if (onDone) onDone(true); }
      else if (mode === 'signup') {
        if (!f.name.trim()) { setErr(L('Please enter your name.', 'يرجى إدخال اسمك.')); return; }
        if (!strong(f.password)) { setErr(L('Use 8+ characters with upper & lower case, a number and a symbol.', 'استخدم 8 أحرف على الأقل مع أحرف كبيرة وصغيرة ورقم ورمز.')); return; }
        const r = await signUp({ ...f, phone: f.phone ? normalizePhone(f.phone) : f.phone });
        if (r.signedIn) { if (onDone) onDone(true); } else setMode('sent');
      } else if (mode === 'reset') { await resetPassword(f.email); setMode('resetSent'); }
    } catch (e2) { setErr(authError(e2, ar)); } finally { setBusy(false); }
  };

  if (mode === 'sent' || mode === 'resetSent') {
    return (
      <div className="wsa">
        <h3>{L('Check your e-mail', 'تحقق من بريدك الإلكتروني')}</h3>
        <p className="wsa-sub">{mode === 'sent'
          ? L(`We sent a confirmation link to ${f.email}. Open it on this device to activate your account — your design stays saved in this browser meanwhile.`, `أرسلنا رابط تأكيد إلى ${f.email}. افتحه على هذا الجهاز لتفعيل حسابك — يبقى تصميمك محفوظًا في هذا المتصفح.`)
          : L(`If an account exists for ${f.email}, a reset link is on its way.`, `إذا كان هناك حساب لـ ${f.email} فسيصلك رابط إعادة التعيين.`)}</p>
        <button type="button" className="wsq-btn" onClick={() => setMode('signin')}>{L('Back to sign in', 'العودة لتسجيل الدخول')}</button>
      </div>
    );
  }

  return (
    <form className="wsa" onSubmit={submit} noValidate>
      <h3>{mode === 'signup' ? L('Create your account', 'أنشئ حسابك') : mode === 'reset' ? L('Reset your password', 'إعادة تعيين كلمة المرور') : L('Sign in', 'تسجيل الدخول')}</h3>
      <p className="wsa-sub">{reason === 'quote'
        ? L('Sign in to save your design and request a quote.', 'سجّل الدخول لحفظ تصميمك وطلب عرض سعر.')
        : L('Your account keeps every design and quote request in one place.', 'يحفظ حسابك جميع تصاميمك وطلبات عروض الأسعار في مكان واحد.')}</p>
      <div className="wsa-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setErr(''); }}>{L('Sign in', 'دخول')}</button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>{L('Create account', 'حساب جديد')}</button>
      </div>
      {mode === 'signup' && <label className="wsq-field"><span>{L('Full name', 'الاسم الكامل')}</span><input value={f.name} onChange={set('name')} autoComplete="name" maxLength={120} required /></label>}
      <label className="wsq-field"><span>{L('E-mail', 'البريد الإلكتروني')}</span><input type="email" value={f.email} onChange={set('email')} autoComplete="email" dir="ltr" required /></label>
      {mode === 'signup' && <label className="wsq-field"><span>{L('Mobile (optional)', 'الجوال (اختياري)')}</span><input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" dir="ltr" placeholder="+973" maxLength={30} /></label>}
      {mode !== 'reset' && <label className="wsq-field"><span>{L('Password', 'كلمة المرور')}</span><input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>}
      {mode === 'signup' && <FormNotice kind="request" lang={ar ? 'ar' : 'en'} />}
      {err && <div className="wsq-err" role="alert">{err}</div>}
      <button type="submit" className="wsq-btn wsq-primary wsa-go" disabled={busy}>
        {busy ? L('Please wait…', 'يرجى الانتظار…') : mode === 'signup' ? L('Create account', 'إنشاء الحساب') : mode === 'reset' ? L('Send reset link', 'أرسل رابط إعادة التعيين') : L('Sign in', 'تسجيل الدخول')}
      </button>
      {mode === 'signin' && <button type="button" className="wsa-link" onClick={() => { setMode('reset'); setErr(''); }}>{L('Forgot your password?', 'نسيت كلمة المرور؟')}</button>}
      {mode === 'reset' && <button type="button" className="wsa-link" onClick={() => setMode('signin')}>{L('Back to sign in', 'العودة لتسجيل الدخول')}</button>}
    </form>
  );
}
