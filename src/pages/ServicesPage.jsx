// Route chunk "ServicesPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ServicesPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { formatBHD } from '../i18n/format';
import { ModalPanel } from '../a11y/dialog';
import { CMS_LANG, HOME_IMG, Photo, api, cms, useI18n, useReveal } from '../App';

function ServicesPage({ user, setPage, openAuth }) {
  const { t } = useI18n();
  const [cats, setCats] = useState([]);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('scheduled');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useReveal();
  useEffect(() => { api('rpc/services_list', { method: 'POST', body: {} }).then(d => setCats(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const open = (c) => { if (!user) { openAuth && openAuth('login'); return; } setSel(c); setMode('scheduled'); setDate(''); setSlot((c.slots && c.slots[0]) || 'Morning'); setArea(''); setAddress(''); setNotes(''); setDone(false); };
  const submit = async () => {
    if (!notes.trim()) return;
    setBusy(true);
    try {
      await api('rpc/marketplace_book', { method: 'POST', body: {
        p_customer_id: String(user.id), p_customer_name: user.name || 'Customer', p_customer_phone: user.phone || null,
        p_category_id: sel.id, p_mode: mode, p_scheduled_at: mode === 'scheduled' && date ? new Date(date).toISOString() : null,
        p_address: address || null, p_area: area || null, p_notes: notes, p_photos: [], p_lat: null, p_lng: null,
        p_slot: mode === 'scheduled' ? slot : null,
      } });
      setDone(true);
    } catch (e) { alert('Could not send: ' + e.message); }
    setBusy(false);
  };
  const price = (c) => c.pricing_model === 'fixed' ? ((CMS_LANG==='ar' ? 'ابتداءً من ' : 'From ') + formatBHD(c.base_price, CMS_LANG, { whole:true })) : c.pricing_model === 'hourly' ? (formatBHD(c.base_price, CMS_LANG, { whole:true }) + (CMS_LANG==='ar' ? '/ساعة' : '/hr')) : (CMS_LANG==='ar' ? 'عرض سعر مجاني' : 'Free quote');
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)', paddingTop: 64, paddingBottom: 90 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px' }}>
        <div className="rv" style={{ maxWidth: 680, marginBottom: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>{cms('services.hero.eyebrow', 'Home services')}</div>
          <h1 className="display" style={{ fontSize: 'clamp(36px,5vw,56px)', color: 'var(--ink)', marginBottom: 14 }}>{cms('services.hero.title', 'Help around the home, on demand.')}</h1>
          <p style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{cms('services.hero.subtitle', 'Carpentry, repairs, cleaning, AC and more — scheduled or ASAP, by vetted providers.')}{user ? '' : t('swSvcSignInToBook')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 18 }}>
          {cats.map(c => (
            <div key={c.id} className="rv lift" onClick={() => open(c)} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden', cursor: 'pointer' }}>
              <div className="tile-zoom" style={{ position: 'relative', height: 140 }}>
                <Photo src={c.image_url || HOME_IMG.detail} alt={c.name_en} imgClass="tz" style={{ position: 'absolute', inset: 0 }} />
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div className="display" style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{c.name_en}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>{price(c)} · ~{c.est_minutes}m{Number(c.points) > 0 ? ' · ★ ' + c.points + ' pts' : ''}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {Number(c.discount_pct) > 0 && <span style={{ background: 'rgba(176,97,59,.1)', color: 'var(--clay)', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>−{c.discount_pct}%</span>}
                  {Number(c.warranty_months) > 0 && <span style={{ background: '#e7f0e9', color: '#3f7a52', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{c.warranty_months}-mo warranty</span>}
                </div>
              </div>
            </div>
          ))}
          {cats.length === 0 && <div style={{ color: 'var(--muted)' }}>{t('swServicesSoon')}</div>}
        </div>
      </div>

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,12,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 18 }}>
          <ModalPanel onClose={() => setSel(null)} onClick={e => e.stopPropagation()} style={{ background: 'var(--cream)', borderRadius: 22, maxWidth: 480, width: '100%', padding: 26, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 24, color: 'var(--ink)', margin: 0 }}>{sel.name_en}</h2>
              <button type="button" aria-label="Close" onClick={() => setSel(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 44 }}>✅</div>
                <p className="display" style={{ fontSize: 20, color: 'var(--ink)', marginTop: 8 }}>{t('swSvcRequestSent')}</p>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{t('swSvcSentBody')}</p>
                <button className="btn-clay" onClick={() => { setSel(null); setPage('portal'); }} style={{ marginTop: 16 }}>{t('swSvcGoAccount')}</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', background: 'var(--sand)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                  {[['scheduled', t('swSvcSchedule')], ['on_demand', t('swSvcAsap')]].map(([m, l]) => (
                    <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: 10, borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, background: mode === m ? '#fff' : 'transparent', color: mode === m ? 'var(--clay)' : 'var(--muted)' }}>{l}</button>
                  ))}
                </div>
                {mode === 'scheduled' && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <input type="date" className="inp" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1, background: '#fff', border: '1px solid var(--line)' }} />
                    <select className="inp" value={slot} onChange={e => setSlot(e.target.value)} style={{ flex: 1, background: '#fff', border: '1px solid var(--line)' }}>
                      {(sel.slots || ['Morning', 'Afternoon', 'Evening']).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <input className="inp" value={area} onChange={e => setArea(e.target.value)} aria-label="Area (e.g. Riffa)" placeholder="Area (e.g. Riffa)" style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 10 }} />
                <input className="inp" value={address} onChange={e => setAddress(e.target.value)} aria-label="Address / building, road, block" placeholder="Address / building, road, block" style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 10 }} />
                <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} aria-label="What do you need? Describe the job" placeholder="What do you need? Describe the job…" rows={3} style={{ background: '#fff', border: '1px solid var(--line)', marginBottom: 14, resize: 'vertical' }} />
                <button className="btn-clay" disabled={busy} onClick={submit} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Send request'}</button>
              </>
            )}
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

export { ServicesPage };
