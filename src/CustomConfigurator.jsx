// CustomConfigurator — customer designs any product (closet, kitchen, TV unit, door, custom),
// the real factory engine prices it, and it becomes a lead + a real quotation.
// Self-contained: floating launcher + full-screen overlay. Mount once at the app root.
import React, { useState, useEffect, useCallback, useRef } from 'react';

const SUPA_URL = 'https://jflmbfxbhpioyniibjsj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0';
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
const WA = '97317555095';

const LBL = {
  width_mm: 'Width (mm)', height_mm: 'Height (mm)', depth_mm: 'Depth (mm)', doors: 'Doors', shelves: 'Shelves',
  drawers: 'Drawers', rails: 'Hanging rails', partitions: 'Partitions', led: 'LED lighting', mirror: 'Mirror',
  sliding: 'Sliding doors', wall_units: 'Wall units', worktop: 'Worktop',
};
const BOOLS = ['led', 'mirror', 'sliding', 'wall_units', 'worktop'];
const m3 = (n) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const rpc = (table) =>
  fetch(SUPA_URL + '/rest/v1/rpc/db_read', { method: 'POST', headers: H, body: JSON.stringify({ p_table: table }) })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);

export default function CustomConfigurator() {
  const [open, setOpen] = useState(false);
  const [pts, setPts] = useState([]);
  const [mats, setMats] = useState([]);
  const [secs, setSecs] = useState([]);
  const [priced, setPriced] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [err, setErr] = useState('');
  const tmr = useRef(null);

  useEffect(() => {
    Promise.all([rpc('product_types'), rpc('materials')]).then(([p, m]) => {
      const srt = (a) => (Array.isArray(a) ? a : []).filter((x) => x.active !== false).sort((x, y) => (x.sort || 0) - (y.sort || 0));
      setPts(srt(p)); setMats(srt(m));
    });
    if (typeof window !== 'undefined' && /[?&]configure=1/.test(window.location.search)) setOpen(true);
  }, []);

  const matOf = useCallback((kind) => mats.filter((m) => m.kind === kind), [mats]);
  const ptOf = useCallback((id) => pts.find((p) => p.id === id) || pts[0], [pts]);

  const addSection = (pt) => {
    const c = matOf('carcass')[0], d = matOf('door')[0], b = matOf('back')[0], w = matOf('worktop')[0];
    setSecs((s) => [...s, {
      name: pt.name, product_type: pt.id, ...(pt.defaults || {}),
      carcass_id: c ? c.id : '', door_id: d ? d.id : '', back_id: b ? b.id : '', worktop_id: w ? w.id : '',
    }]);
  };

  // live price from the real factory engine
  useEffect(() => {
    if (!secs.length) { setPriced(null); return; }
    clearTimeout(tmr.current);
    tmr.current = setTimeout(() => {
      fetch(SUPA_URL + '/rest/v1/rpc/fn_config_price', {
        method: 'POST', headers: H, body: JSON.stringify({ p_selection: { sections: secs, opts: {} } }),
      }).then((r) => r.json()).then((d) => { if (d && !d.error) setPriced(d); }).catch(() => {});
    }, 350);
    return () => clearTimeout(tmr.current);
  }, [secs]);

  const submit = () => {
    setErr('');
    if (!form.name.trim() || !form.phone.trim()) { setErr('Please enter your name and mobile number.'); return; }
    setBusy(true);
    fetch(SUPA_URL + '/rest/v1/rpc/config_quote_submit', {
      method: 'POST', headers: H,
      body: JSON.stringify({
        p_selection: { sections: secs, opts: {} },
        p_name: form.name.trim(), p_phone: form.phone.trim(),
        p_email: form.email.trim() || null, p_notes: 'Designed on the website',
      }),
    }).then((r) => r.json()).then((d) => {
      setBusy(false);
      if (!d || !d.ok) { setErr((d && d.error) || 'Could not create the quotation. Please try again.'); return; }
      setDone(d);
    }).catch(() => { setBusy(false); setErr('Network error — please try again.'); });
  };

  const upd = (i, k, v) => setSecs((list) => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const S = {
    inp: { width: '100%', boxSizing: 'border-box', background: '#fff', border: '1px solid var(--line,#e6ddd1)', borderRadius: 10, padding: '12px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink,#211c18)', outline: 'none' },
    lbl: { display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted,#8a7f72)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 },
    chip: { background: '#fff', border: '1px solid var(--line,#e6ddd1)', borderRadius: 999, padding: '9px 14px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink,#211c18)' },
  };

  if (!pts.length || !mats.length) return null;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)}
          style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 18, zIndex: 9990,
            background: 'linear-gradient(135deg,var(--clay,#A84B29),var(--clay-deep,#89391E))', color: '#fff', border: 'none', borderRadius: 999,
            padding: '14px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(0,0,0,.28)' }}>
          🧩 Design &amp; price your own
        </button>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'var(--cream,#f7f2ec)', overflow: 'auto', padding: 16 }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink,#211c18)' }}>🧩 Design your own</div>
                <div style={{ color: 'var(--muted,#8a7f72)', fontSize: 13 }}>Your sizes, your materials — priced instantly by our factory in Bahrain.</div>
              </div>
              <button onClick={() => { setOpen(false); setDone(null); }} style={{ ...S.chip }}>← Close</button>
            </div>

            {done ? (
              <div style={{ background: '#fff', border: '1px solid var(--line,#e6ddd1)', borderRadius: 16, padding: 30, textAlign: 'center' }}>
                <div style={{ fontSize: 44 }}>✅</div>
                <h2 style={{ margin: '8px 0 4px', color: 'var(--ink,#211c18)' }}>Your quotation is ready</h2>
                <div style={{ color: 'var(--muted,#8a7f72)', fontSize: 14, marginBottom: 14 }}>{done.quote_no}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--clay,#A84B29)' }}>BD {m3(done.total)}</div>
                <div style={{ color: 'var(--muted,#8a7f72)', fontSize: 12.5, margin: '6px 0 20px' }}>Includes VAT. Indicative — a free measurement confirms the final price.</div>
                <a href={`https://wa.me/${WA}?text=${encodeURIComponent('Hi, I designed a custom piece on your website. My quotation is ' + done.quote_no + ' (BD ' + m3(done.total) + '). Can we book a free measurement?')}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 800, padding: '14px 24px', borderRadius: 12 }}>
                  💬 Continue on WhatsApp
                </a>
                <div style={{ marginTop: 14 }}>
                  <a href={`/customer.html?q=${encodeURIComponent(done.quote_no)}&p=${encodeURIComponent(form.phone.trim())}`}
                    style={{ color: 'var(--clay,#A84B29)', fontWeight: 700, fontSize: 13 }}>View &amp; approve my quotation →</a>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {pts.map((p) => (
                    <button key={p.id} onClick={() => addSection(p)} style={S.chip}>{p.icon} {p.name}</button>
                  ))}
                </div>

                {!secs.length && (
                  <div style={{ textAlign: 'center', color: 'var(--muted,#8a7f72)', padding: 30, fontSize: 14.5 }}>
                    Pick what you want above — a wardrobe, kitchen, TV unit, door or anything custom.
                  </div>
                )}

                {secs.map((s, i) => {
                  const pt = ptOf(s.product_type) || {};
                  const fields = Array.isArray(pt.fields) ? pt.fields : [];
                  const nums = fields.filter((f) => !BOOLS.includes(f));
                  const bools = fields.filter((f) => BOOLS.includes(f));
                  const slots = [['carcass_id', 'Body material', 'carcass'], ['door_id', 'Door / front', 'door'], ['back_id', 'Back panel', 'back']]
                    .concat(fields.includes('worktop') ? [['worktop_id', 'Worktop', 'worktop']] : []);
                  return (
                    <div key={i} style={{ background: '#fff', border: '1px solid var(--line,#e6ddd1)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1, fontWeight: 800, color: 'var(--ink,#211c18)' }}>{pt.icon} {s.name}</div>
                        <button onClick={() => setSecs((l) => l.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: 'var(--danger,#DC4444)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10, marginBottom: 10 }}>
                        {nums.map((f) => (
                          <div key={f}>
                            <label style={S.lbl}>{LBL[f] || f}</label>
                            <input type="number" min="0" value={s[f] ?? 0} onChange={(e) => upd(i, f, Number(e.target.value) || 0)} style={S.inp} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))', gap: 10, marginBottom: 10 }}>
                        {slots.map(([k, l, kind]) => (
                          <div key={k}>
                            <label style={S.lbl}>{l}</label>
                            <select value={s[k] || ''} onChange={(e) => upd(i, k, e.target.value)} style={S.inp}>
                              {matOf(kind).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      {bools.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                          {bools.map((f) => (
                            <label key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--ink,#211c18)', cursor: 'pointer' }}>
                              <input type="checkbox" checked={!!s[f]} onChange={(e) => upd(i, f, e.target.checked)} /> {LBL[f] || f}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {priced && priced.costing && (
                  <div style={{ background: '#fff', border: '2px solid var(--clay,#A84B29)', borderRadius: 16, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ color: 'var(--muted,#8a7f72)', fontSize: 13.5 }}>Your price</span>
                      <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--clay,#A84B29)' }}>BD {m3(priced.costing.total)}</span>
                    </div>
                    <div style={{ color: 'var(--muted,#8a7f72)', fontSize: 12.5, marginBottom: 14 }}>
                      {m3(priced.costing.net)} + VAT {m3(priced.costing.vat)} · {priced.summary?.board_m2 || 0} m² board · {(priced.cutting_list || []).length} parts
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 10 }}>
                      <input placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={S.inp} />
                      <input placeholder="Mobile number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={S.inp} />
                      <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={S.inp} />
                    </div>
                    {err && <div style={{ color: 'var(--danger,#DC4444)', fontSize: 12.5, marginBottom: 8, fontWeight: 600 }}>{err}</div>}
                    <button onClick={submit} disabled={busy}
                      style={{ width: '100%', background: 'linear-gradient(135deg,var(--clay,#A84B29),var(--clay-deep,#89391E))', border: 'none', color: '#fff',
                        fontWeight: 800, fontSize: 15, padding: 15, borderRadius: 12, cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
                      {busy ? 'Preparing your quotation…' : 'Get my quotation'}
                    </button>
                    <div style={{ color: 'var(--muted,#8a7f72)', fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>
                      Indicative price — a free measurement confirms the final quote.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
