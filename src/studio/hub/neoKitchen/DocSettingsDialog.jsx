/* [NEO-CUTLIST-UX32] Production Document Settings dialog: company (logo + details, remembered per user), project details (travel with the
 * project) and the document options (QR payload, scale, tolerance, title block switches). Opened from the cut list toolbar and from the
 * Export menu; both read the same store (docStore.js). Tokens only (the .nk-dp-* rules live in cutListPro2.css). EN / AR + RTL. */
import React, { useEffect, useRef, useState } from 'react';
import { useDocStore, setCompany, setProject, setOpts, closeSettings, docFor, addHost, isPrimaryHost } from './docStore';
import { COMPANY_FIELDS, COMPANY_LABELS, PROJECT_FIELDS, PROJECT_LABELS, fileToLogo, qrPayload, hubBrand } from './docInfo';
import { qrSvg } from './clCodes';
import ParameterField from './ParameterField';
import './fileMenu.css';
import './cutListPro2.css';

const WIDE = new Set(['siteAddress', 'materialSpec', 'notes', 'project', 'customer']);
const QR_HELP = {
  ref: ['Plain text: NEO | order | part id | n/N. A phone only shows the text; it opens nothing.', 'نص عادي: NEO | الطلب | رمز القطعة | ن/م. يعرض الهاتف النص فقط ولا يفتح شيئًا.'],
  url: ['Recommended. Scanning opens a part page in this Hub (project, order, part, qty, size, material). Sign-in is required first. Long names are shortened to keep the QR small.', 'موصى به. المسح يفتح صفحة القطعة في النظام (المشروع، الطلب، القطعة، الكمية، المقاس، المادة). يلزم تسجيل الدخول أولًا. تُختصر الأسماء الطويلة ليبقى الرمز صغيرًا.'],
  json: ['Compact JSON {o, p, id, n, d} for scanners that parse it.', 'JSON مختصر {o, p, id, n, d} للماسحات التي تقرأه.'],
};

export default function DocSettingsDialog({ lang = 'en' }) {
  const st = useDocStore();
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  const [tab, setTab] = useState('company');
  const [msg, setMsg] = useState('');
  const hostId = useRef({});
  useEffect(() => addHost(hostId.current), []);
  const primary = isPrimaryHost(hostId.current);
  const dlg = useRef(null); const opener = useRef(null); const file = useRef(null);
  useEffect(() => {
    if (!st.open || !primary) return undefined;
    opener.current = document.activeElement;
    const t = setTimeout(() => { const f = dlg.current && dlg.current.querySelector('input,select,button'); if (f) f.focus(); }, 0);
    return () => { clearTimeout(t); const o = opener.current; if (o && o.focus && document.contains(o)) { try { o.focus(); } catch (e) { /* ignore */ } } };
  }, [st.open, primary]);
  if (!st.open || !primary) return null;
  const doc = docFor(st);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); closeSettings(); return; }
    if (e.key !== 'Tab' || !dlg.current) return;
    const b = [...dlg.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')]; if (!b.length) return;
    const first = b[0]; const last = b[b.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  const upload = async (f) => {
    if (!f) return;
    try { const url = await fileToLogo(f); setCompany({ logo: url, logoMode: 'upload' }); setMsg(''); } catch (e) {
      setMsg(e.message === 'type' ? L('Use a PNG, JPG or SVG file.', 'استخدم ملف PNG أو JPG أو SVG.') : e.message === 'big' ? L('The logo is too large (keep it under about 240 KB).', 'الشعار كبير جدًا (أقل من 240 كيلوبايت تقريبًا).') : L('The file could not be read.', 'تعذرت قراءة الملف.'));
    }
  };
  const hb = hubBrand();
  const TABS = [['company', L('Company', 'الشركة')], ['project', L('Project', 'المشروع')], ['options', L('Document options', 'خيارات المستند')]];
  const sample = qrPayload(st.opts.qrKind, doc.project, { pid: 'K-B01-P03', n: 1, N: 4, dims: '564x600x18', mat: 'Oak Veneer 18 mm' });
  const inp = (val, on, extra = {}) => <input className="nk-inp nk-inp-wide" value={val} dir="auto" onChange={(e) => on(e.target.value)} {...extra} />;
  return (
    <div className="nk-fm-scrim" dir={ar ? 'rtl' : 'ltr'} onMouseDown={(e) => { if (e.target === e.currentTarget) closeSettings(); }}>
      <div className="nk-fm-dlg nk-dp" role="dialog" aria-modal="true" aria-labelledby="nk-dp-t" ref={dlg} onKeyDown={onKey} data-testid="doc-settings">
        <h3 className="nk-fm-dt" id="nk-dp-t">{L('Production document settings', 'إعدادات مستندات الإنتاج')}</h3>
        <p className="nk-dp-sub">{L('Printed on the cut list, PDF report, nesting sheets and labels, and written into the Excel cover sheet and DXF header.', 'تُطبع على قائمة القص وتقرير PDF وأوراق القص والملصقات، وتُكتب في ورقة الغلاف في Excel وترويسة DXF.')}</p>
        <div className="nk-dp-tabs" role="tablist" aria-label={L('Sections', 'الأقسام')}>
          {TABS.map(([k, lab]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className="nk-dp-tab" onClick={() => setTab(k)} data-tab={k}>{lab}</button>)}
        </div>
        <div className="nk-dp-body" role="tabpanel">
          {tab === 'company' && (
            <>
              <div className="nk-dp-logo">
                <div className="nk-dp-logobox" aria-label={L('Logo preview', 'معاينة الشعار')}>{doc.company.logo ? <img src={doc.company.logo} alt="" /> : <span>{L('No logo', 'بلا شعار')}</span>}</div>
                <div className="nk-dp-logoctl">
                  <div className="nk-seg" role="group" aria-label={L('Logo source', 'مصدر الشعار')}>
                    {[['hub', L('Hub logo', 'شعار النظام')], ['upload', L('Upload', 'رفع')], ['none', L('None', 'بدون')]].map(([k, lab]) => (
                      <button key={k} type="button" className="nk-seg-b" aria-pressed={st.company.logoMode === k} disabled={k === 'upload' && !st.company.logo} title={k === 'upload' && !st.company.logo ? L('Choose a file first', 'اختر ملفًا أولًا') : undefined} onClick={() => setCompany({ logoMode: k })}>{lab}</button>
                    ))}
                  </div>
                  <input ref={file} type="file" accept="image/png,image/jpeg,image/svg+xml" className="nk-sr" aria-label={L('Upload logo file', 'رفع ملف الشعار')} data-testid="logo-file" onChange={(e) => { upload(e.target.files && e.target.files[0]); e.target.value = ''; }} />
                  <button type="button" className="nk-btn" onClick={() => file.current && file.current.click()}>{L('Choose logo (PNG, JPG, SVG)…', 'اختيار شعار (PNG, JPG, SVG)…')}</button>
                  <p className="nk-dp-hint">{L(`Hub logo: ${hb.fromHub ? 'the company logo set in the Hub' : 'the bundled The Closets logo (the Hub has none set)'}. An uploaded logo is kept in this browser only.`, `شعار النظام: ${hb.fromHub ? 'شعار الشركة المضبوط في النظام' : 'شعار The Closets المرفق (لم يُضبط شعار في النظام)'}. الشعار المرفوع يبقى في هذا المتصفح فقط.`)}</p>
                  {msg && <p className="nk-dp-err" role="alert">{msg}</p>}
                </div>
              </div>
              <div className="nk-dp-grid">
                {COMPANY_FIELDS.map((k) => (
                  <label key={k} className={`nk-dp-f ${k === 'address' ? 'wide' : ''}`}><span>{COMPANY_LABELS[k][ar ? 1 : 0]}</span>{inp(st.company[k], (v) => setCompany({ [k]: v }), k === 'phone' || k === 'cr' ? { dir: 'ltr' } : {})}</label>
                ))}
              </div>
              <p className="nk-dp-hint">{L('Blank company name uses the Hub brand name. Remembered for you on this browser.', 'اسم الشركة الفارغ يستخدم اسم العلامة في النظام. يُحفظ لك على هذا المتصفح.')}</p>
            </>
          )}
          {tab === 'project' && (
            <>
              <div className="nk-dp-grid">
                {PROJECT_FIELDS.map((k) => (
                  <label key={k} className={`nk-dp-f ${WIDE.has(k) ? 'wide' : ''}`}><span>{PROJECT_LABELS[k][ar ? 1 : 0]}</span>
                    {k === 'notes' || k === 'materialSpec' || k === 'siteAddress'
                      ? <textarea className="nk-dp-ta" rows={2} dir="auto" value={st.project[k]} onChange={(e) => setProject({ [k]: e.target.value })} />
                      : inp(st.project[k], (v) => setProject({ [k]: v }), k === 'date' || k === 'deliveryDate' ? { type: 'date', dir: 'ltr' } : k === 'customerPhone' || k === 'orderNo' || k === 'jobNo' || k === 'revision' ? { dir: 'ltr' } : {})}
                  </label>
                ))}
              </div>
              <p className="nk-dp-hint">{L('Saved with the project (project file and autosave). Empty fields are left out of the title block.', 'تُحفظ مع المشروع (ملف المشروع والحفظ التلقائي). الحقول الفارغة لا تظهر في إطار العنوان.')}</p>
            </>
          )}
          {tab === 'options' && (
            <>
              <fieldset className="nk-dp-fs"><legend>{L('QR code content', 'محتوى رمز QR')}</legend>
                {['url', 'ref', 'json'].map((k) => (
                  <label key={k} className="nk-dp-radio"><input type="radio" name="qrkind" checked={st.opts.qrKind === k} onChange={() => setOpts({ qrKind: k, qrKindSet: true })} /><span><b>{{ ref: L('Reference text', 'نص مرجعي'), url: L('Link to the Hub', 'رابط إلى النظام'), json: L('Compact JSON', 'JSON مختصر') }[k]}</b><small>{QR_HELP[k][ar ? 1 : 0]}</small></span></label>
                ))}
                <p className="nk-dp-sample" dir="ltr" data-testid="qr-sample">{sample}</p>
                <div className="nk-dp-qr" dangerouslySetInnerHTML={{ __html: qrSvg(sample, { size: 96, quiet: 1 }) }} />
              </fieldset>
              <div className="nk-dp-grid">
                <label className="nk-dp-f"><span>{L('Drawing scale', 'مقياس الرسم')}</span>{inp(st.opts.scale, (v) => setOpts({ scale: v }), { dir: 'ltr', maxLength: 12 })}</label>
                <div className="nk-dp-f"><ParameterField label={L('Cut size tolerance (±)', 'سماحية قياس القص (±)')} value={st.opts.tolerance} min={0} max={5} step={0.1} unit="mm" slider={false} lang={lang} onChange={(v) => setOpts({ tolerance: v })} testid="tol" /></div>
              </div>
              <div className="nk-dp-sw">
                {[['titleBlock', L('Title block on every sheet', 'إطار العنوان في كل ورقة')], ['logo', L('Logo in the title block', 'الشعار في إطار العنوان')], ['qr', L('QR code in the title block', 'رمز QR في إطار العنوان')]].map(([k, lab]) => (
                  <label key={k} className="nk-dp-chk"><input type="checkbox" checked={!!st.opts[k]} onChange={(e) => setOpts({ [k]: e.target.checked })} /><span>{lab}</span></label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="nk-fm-da"><button type="button" className="nk-btn nk-btn-primary" onClick={closeSettings} data-testid="doc-settings-done">{L('Done', 'تم')}</button></div>
      </div>
    </div>
  );
}
