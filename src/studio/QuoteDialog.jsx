/* =============================================================================
 * Customer quote dialog [WEB-STUDIO 2026-10-31] — opened by the "Get quote" button of every Neo designer on the website.
 * Shows the design (picture + key facts), the price the way the admin chose (Bonsai > Website Studio > price mode:
 *   none = no money at all · indicative = one rounded "from" figure · full = the priced lines), then
 *   Save to My designs  -> cp_studio_design_save
 *   Request a quote     -> save + cp_studio_request_quote (freezes the design, opens / updates the Bonsai lead)
 * Signed-out customers are sent through the account dialog first and come straight back here.
 * ===========================================================================*/
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getStudio, setStudio, useStudio, fmtBD, indicative } from './studioStore';
import { captureStorage, nameOf } from './designers';
import { getSession, onSession, rpc, authError } from './customerAuth';

const GROUPS = {
  carcass: ['Carcass and structure', 'الهيكل والبنية'], doors: ['Doors and fronts', 'الأبواب والواجهات'], interior: ['Interior fittings', 'التجهيز الداخلي'],
  materials: ['Materials', 'المواد'], hardware: ['Hardware and accessories', 'الاكسسوارات والمعدات'], labour: ['Workshop labour', 'عمالة الورشة'],
  finishing: ['Finishing', 'التشطيب'], boards: ['Boards and worktop', 'الألواح وسطح العمل'], extras: ['Specialist items', 'بنود خاصة'],
  services: ['Services', 'الخدمات'], allowance: ['Allowances', 'مخصصات'], other: ['Other', 'أخرى'], lump: ['Design, supply and manufacture', 'التصميم والتوريد والتصنيع'],
};
const n0 = (v) => Math.round(Number(v) || 0);
const txt = (v, ar) => (v && typeof v === 'object' ? (ar ? v.ar || v.en : v.en || v.ar) : v) || '';

/** the few facts a customer recognises, as [label, value] rows */
export function factRows(f, ar) {
  if (!f) return [];
  const L = (en, a) => (ar ? a : en);
  const rows = [];
  const mm = (...v) => v.filter((x) => x > 0).map(n0).join(' × ') + ' mm';
  if (f.product === 'kitchen') {
    const runs = (f.runs || []).filter((r) => r.len > 0);
    if (runs.length) rows.push([L('Runs', 'الأجزاء'), runs.map((r) => n0(r.len) + ' mm').join(' + ')]);
    if (f.h) rows.push([L('Height', 'الارتفاع'), n0(f.h) + ' mm']);
  } else if (f.product === 'door') {
    rows.push([L('Opening', 'الفتحة'), mm(f.ow, f.oh)]);
    if (f.leaves > 1) rows.push([L('Leaves', 'الدرف'), String(f.leaves)]);
  } else if (f.w || f.h || f.d) {
    rows.push([L('Size (W × H × D)', 'المقاس (عرض × ارتفاع × عمق)'), mm(f.w, f.h, f.d)]);
  }
  const fin = txt(f.finish, ar); if (fin) rows.push([L('Finish', 'التشطيب'), fin]);
  const c = f.counts || {};
  const parts = [];
  if (c.doors) parts.push(c.doors + ' ' + L('doors', 'أبواب'));
  if (c.drawers) parts.push(c.drawers + ' ' + L('drawers', 'أدراج'));
  if (c.shelves) parts.push(c.shelves + ' ' + L('shelves', 'رفوف'));
  if (parts.length) rows.push([L('Includes', 'يشمل'), parts.join(' · ')]);
  return rows;
}

async function shrink(dataUrl, maxW = 560) {
  if (!dataUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, maxW / img.width); const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.78));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export default function QuoteDialog({ ctx, shot, lang = 'en', onClose }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const st = useStudio();
  const mode = (st.settings && st.settings.price_mode) || 'indicative';
  const [signedIn, setSignedIn] = useState(!!getSession());
  useEffect(() => onSession((s) => setSignedIn(!!s)), []);
  const facts = ctx.facts || {};
  const [title, setTitle] = useState(() => st.title || facts.title || (ar ? 'تصميمي' : 'My ') + (ar ? '' : nameOf(st.kind, false).replace(/^Neo\s+|\s+Designer$/g, '').toLowerCase()));
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);   // { kind:'saved'|'requested', ref }
  const [thumb, setThumb] = useState(null);
  const box = useRef(null);
  useEffect(() => { let on = true; shrink((shot && ((shot.view3d && shot.view3d.dataUrl) || (shot.elevation && shot.elevation.dataUrl))) || null).then((t) => { if (on) setThumb(t); }); return () => { on = false; }; }, [shot]);
  useEffect(() => { if (!signedIn) return; rpc('cp_profile_get', {}).then((p) => { if (p && p.phone) setPhone((v) => v || p.phone); }).catch(() => {}); }, [signedIn]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); try { box.current && box.current.focus(); } catch (e) { /* ignore */ } return () => window.removeEventListener('keydown', k); }, [onClose]);

  const auto = ctx.auto || { lines: [], net: 0 };
  const net = Number(auto.net) || 0;
  const vatPct = Number.isFinite(Number(ctx.vatPct)) ? Number(ctx.vatPct) : 10;
  const grouped = useMemo(() => {
    const g = {};
    (auto.lines || []).forEach((l) => { const k = l.group || 'other'; const amt = (Number(l.unitPrice) || 0) * (Number(l.qty) || 1); g[k] = (g[k] || 0) + amt; });
    return Object.entries(g).filter(([, v]) => v > 0.0005);
  }, [auto]);
  const rows = factRows(facts, ar);

  const payload = () => ({
    kind: st.kind,
    design: { v: 1, storage: captureStorage(st.kind), product: ctx.product, design: ctx.design },
    summary: { facts, thumb, net, vatPct, placeholder: !!ctx.placeholder, lines: (auto.lines || []).map((l) => ({ group: l.group, en: l.en, ar: l.ar, qty: l.qty, unitPrice: l.unitPrice })) },
  });

  const ensureSignedIn = async () => {
    if (getSession()) return true;
    const fn = getStudio().openAuth;
    return fn ? fn('quote') : false;
  };

  const save = async () => {
    const p = payload(); const s = getStudio();
    const call = (id) => rpc('cp_studio_design_save', { p_id: id, p_kind: p.kind, p_title: title, p_design: p.design, p_summary: p.summary, p_estimate: net || null });
    let row;
    try { row = await call(s.designId && s.status === 'draft' ? s.designId : null); }
    catch (e) { if (/locked/.test(e.message)) row = await call(null); else throw e; }
    setStudio({ designId: row.id, title: row.title, status: row.status });
    if (typeof s.onSaved === 'function') s.onSaved(row);
    return row;
  };

  const doSave = async () => {
    setErr('');
    if (!(await ensureSignedIn())) return;
    setBusy('save');
    try { await save(); setDone({ kind: 'saved' }); } catch (e) { setErr(authError(e, ar)); } finally { setBusy(''); }
  };
  const doRequest = async () => {
    setErr('');
    if (phone && !/^[+()\d\s-]{7,}$/.test(phone.trim())) { setErr(L('Please enter a valid phone number.', 'يرجى إدخال رقم هاتف صحيح.')); return; }
    if (!(await ensureSignedIn())) return;
    setBusy('request');
    try {
      const row = await save();
      const r = await rpc('cp_studio_request_quote', { p_id: row.id, p_note: note || null, p_phone: phone || null });
      if (!r || !r.ok) { setErr(r && r.error === 'rate_limited' ? L('You have sent several requests today — our team will be in touch.', 'أرسلت عدة طلبات اليوم — سيتواصل معك فريقنا.') : L('Could not send your request — please try again.', 'تعذّر إرسال طلبك — حاول مرة أخرى.')); return; }
      setStudio({ status: 'requested' });
      setDone({ kind: 'requested', ref: r.ref });
    } catch (e) { setErr(authError(e, ar)); } finally { setBusy(''); }
  };

  return (
    <div className="wsq-scrim" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wsq" role="dialog" aria-modal="true" aria-labelledby="wsq-h" tabIndex={-1} ref={box}>
        <div className="wsq-head">
          <div>
            <div className="wsq-eyebrow">{nameOf(st.kind, ar)}</div>
            <h2 id="wsq-h">{done ? (done.kind === 'requested' ? L('Request sent', 'تم إرسال طلبك') : L('Design saved', 'تم حفظ التصميم')) : L('Your design', 'تصميمك')}</h2>
          </div>
          <button type="button" className="wsq-x" onClick={onClose} aria-label={L('Close', 'إغلاق')}>×</button>
        </div>

        {done ? (
          <div className="wsq-body wsq-done">
            {thumb && <img className="wsq-pic" src={thumb} alt="" />}
            {done.kind === 'requested' ? (
              <>
                <p className="wsq-lead">{L('Thank you — our design team has your design and will contact you to confirm measurements, finishes and your quote.', 'شكرًا لك — وصل تصميمك إلى فريق التصميم وسيتواصل معك لتأكيد المقاسات والتشطيبات وعرض السعر.')}</p>
                {done.ref && <p className="wsq-ref">{L('Reference', 'المرجع')}: <b>{done.ref}</b></p>}
              </>
            ) : (
              <p className="wsq-lead">{L('Saved to My designs. Keep designing, or request a quote whenever you are ready.', 'تم الحفظ في تصاميمي. تابع التصميم أو اطلب عرض سعر متى كنت جاهزًا.')}</p>
            )}
            <div className="wsq-actions">
              <a className="wsq-btn" href="/studio/account">{L('My designs', 'تصاميمي')}</a>
              <button type="button" className="wsq-btn wsq-primary" onClick={onClose}>{L('Back to the designer', 'العودة إلى المصمم')}</button>
            </div>
          </div>
        ) : (
          <div className="wsq-body">
            <div className="wsq-top">
              {thumb ? <img className="wsq-pic" src={thumb} alt={L('Your design', 'تصميمك')} /> : <div className="wsq-pic wsq-pic-empty">{L('Switch to the 3D view to include a picture', 'انتقل إلى العرض ثلاثي الأبعاد لإرفاق صورة')}</div>}
              <div className="wsq-facts">
                <label className="wsq-field"><span>{L('Design name', 'اسم التصميم')}</span>
                  <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label>
                {rows.length > 0 && <dl className="wsq-dl">{rows.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>}
              </div>
            </div>

            {mode !== 'none' && net > 0 && (
              <div className="wsq-price" data-mode={mode}>
                {mode === 'indicative' ? (
                  <>
                    <div className="wsq-price-row"><span>{L('Indicative price', 'السعر التقديري')}</span><b>{L('from', 'من')} {fmtBD(indicative(net)).replace('.000', '')}</b></div>
                    <p className="wsq-fine">{L(`Excludes VAT (${vatPct}%). Your final quote is confirmed after a free site visit.`, `لا يشمل ضريبة القيمة المضافة (${vatPct}%). يُعتمد عرض السعر النهائي بعد زيارة موقع مجانية.`)}</p>
                  </>
                ) : (
                  <>
                    <table className="wsq-lines"><tbody>
                      {grouped.map(([g, v]) => <tr key={g}><td>{(GROUPS[g] || GROUPS.other)[ar ? 1 : 0]}</td><td>{fmtBD(v)}</td></tr>)}
                      <tr className="wsq-sub"><td>{L('Subtotal', 'المجموع الفرعي')}</td><td>{fmtBD(net)}</td></tr>
                      <tr><td>{L(`VAT ${vatPct}%`, `ضريبة القيمة المضافة ${vatPct}%`)}</td><td>{fmtBD(net * vatPct / 100)}</td></tr>
                      <tr className="wsq-total"><td>{L('Estimated total', 'الإجمالي التقديري')}</td><td>{fmtBD(net * (1 + vatPct / 100))}</td></tr>
                    </tbody></table>
                    <p className="wsq-fine">{L('An estimate from your design. Your final quote is confirmed after a free site visit.', 'تقدير من تصميمك. يُعتمد عرض السعر النهائي بعد زيارة موقع مجانية.')}</p>
                  </>
                )}
              </div>
            )}
            {(mode === 'none' || !(net > 0)) && <p className="wsq-fine wsq-price-none">{L('Our design team prices every design by hand and sends you a detailed quote.', 'يقوم فريق التصميم بتسعير كل تصميم بدقة ويرسل لك عرض سعر مفصلًا.')}</p>}

            <div className="wsq-grid">
              <label className="wsq-field"><span>{L('Phone (for our designer to call you)', 'الهاتف (ليتصل بك المصمم)')}</span>
                <input type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} placeholder="+973" dir="ltr" /></label>
              <label className="wsq-field"><span>{L('Anything we should know? (optional)', 'هل هناك ما يجب أن نعرفه؟ (اختياري)')}</span>
                <textarea rows={3} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder={L('Preferred colours, timing, site access…', 'الألوان المفضلة، التوقيت، الوصول إلى الموقع…')} /></label>
            </div>

            {err && <div className="wsq-err" role="alert">{err}</div>}
            {!signedIn && <p className="wsq-fine">{L('You will sign in or create a free account first — it keeps your designs and quotes in one place.', 'ستسجّل الدخول أو تنشئ حسابًا مجانيًا أولًا — ليحفظ تصاميمك وعروض أسعارك في مكان واحد.')}</p>}
            <div className="wsq-actions">
              <button type="button" className="wsq-btn" onClick={doSave} disabled={!!busy}>{busy === 'save' ? L('Saving…', 'جارٍ الحفظ…') : L('Save to My designs', 'احفظ في تصاميمي')}</button>
              <button type="button" className="wsq-btn wsq-primary" onClick={doRequest} disabled={!!busy} data-testid="ws-request">{busy === 'request' ? L('Sending…', 'جارٍ الإرسال…') : L('Request a quote', 'اطلب عرض سعر')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
