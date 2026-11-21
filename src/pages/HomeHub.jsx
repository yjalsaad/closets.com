// Route chunk "HomeHub" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: HomeHub.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import * as acct from '../account/api';
import { handleError } from '../errors';
import { formatBHD, formatDate, formatNumber } from '../i18n/format';
import { ModalPanel } from '../a11y/dialog';
import { CMS_LANG, I18N, SUPA_KEY, SUPA_URL, api, cms, fmt, toast, useI18n, useMobile } from '../App';
import { HUB_ORIGIN } from './shared_HomeHub_DirectoryPage_plus1';

// Merge two design lists by id (incoming entries override/add; existing kept), newest first
const mergeDesigns = (existing, incoming) => {
  const byId = new Map();
  (existing || []).forEach(d => { if (d && d.id != null) byId.set(String(d.id), d); });
  (incoming || []).forEach(d => { if (d && d.id != null) byId.set(String(d.id), { ...byId.get(String(d.id)), ...d }); });
  return Array.from(byId.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

/* ── HOME HUB ── */
function HomeHub({ user, setUser, setPage }) {
  const { t, lang, dir } = useI18n();
  const rtl = dir === 'rtl';
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orderItems, setOrderItems] = useState({}); // { [orderId]: array | 'loading' }
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [rwInfo, setRwInfo] = useState(null); // CUS loyalty balance {points, tier, value_bd}
  const [designs, setDesigns] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [svcBookings, setSvcBookings] = useState([]);
  const [cardSlug, setCardSlug] = useState(null);
  const [cardPhoto, setCardPhoto] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [cmpForm, setCmpForm] = useState({ category: 'Quality Issue', description: '' });
  const [tktForm, setTktForm] = useState({ subject: '', description: '', priority: 'Medium' });
  const mobile = useMobile();
  const tierC = { Bronze: '#9c6f2e', Silver: 'var(--shop-ink-2)', Gold: '#b8860b', Platinum: '#6e3fa3' };
  useEffect(() => {
    if (!user?.email) return;
    // Scoped SECURITY DEFINER RPCs — direct anon reads on sales_orders/invoices are 403 (RLS)
    // [IDENTITY] every account RPC goes through src/account/api.js (session-token twin when signed in, legacy params otherwise)
    acct.myOrders(user).then(r => setOrders(Array.isArray(r)?r:[])).catch(()=>{});
    acct.myInvoices(user).then(r => setInvoices(Array.isArray(r)?r:[])).catch(()=>{});
    // Loyalty now lives in the unified CUS ledger — pull history + live balance from the shared engine
    acct.rewards(user).then(r => setRewards(Array.isArray(r?.history)?r.history:[])).catch(()=>{});
    acct.loyaltyBalance(user).then(d => { if (d && d.ok) setRwInfo(d); }).catch(()=>{});
    api(`product_configurations?customer_id=eq.${user.id}&order=created_at.desc&limit=20`).then(r => setDesigns(p => mergeDesigns(p, Array.isArray(r)?r:[]))).catch(()=>{});
    acct.savedDesigns(user).then(r => setDesigns(p => mergeDesigns(p, Array.isArray(r)?r:[]))).catch(()=>{});
    api(`complaints?customer_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setComplaints(Array.isArray(r)?r:[])).catch(()=>{});
    api(`it_tickets?requester_email=eq.${encodeURIComponent(user.email)}&order=created_at.desc&limit=20`).then(r => setTickets(Array.isArray(r)?r:[])).catch(()=>{});
    acct.bookingsList(user).then(r => setSvcBookings(Array.isArray(r)?r:[])).catch(()=>{});
    acct.cardOwnerSlug(user.id).then(r => { setCardSlug(r && r.slug); setCardPhoto(r && r.photo_url); }).catch(()=>{});
  }, [user]);
  const totalSpent = invoices.reduce((s, i) => s + parseFloat(i.total_amount || i.amount || 0), 0);
  const submitComplaint = async () => {
    if (!cmpForm.description) { toast('Please describe your issue', 'error'); return; }
    const id = 'CMP-' + Date.now().toString(36).toUpperCase();
    await api('complaints', { method: 'POST', body: [{ id, category: cmpForm.category, description: cmpForm.description, customer: user.name, customer_email: user.email, customer_id: user.id, status: 'Open', channel: 'website', created_at: new Date().toISOString() }] });
    setComplaints(p => [{ id, ...cmpForm, status: 'Open', created_at: new Date().toISOString() }, ...p]);
    setCmpForm({ category: 'Quality Issue', description: '' }); toast('Request submitted ✓', 'success');
  };
  const submitTicket = async () => {
    if (!tktForm.subject) { toast('Please add a subject', 'error'); return; }
    const id = 'TKT-' + Date.now().toString(36).toUpperCase();
    await api('it_tickets', { method: 'POST', body: [{ id, title: tktForm.subject, description: tktForm.description, priority: tktForm.priority, requester: user.name, requester_email: user.email, customer_id: user.id, status: 'Open', created_at: new Date().toISOString() }] });
    setTickets(p => [{ id, ...tktForm, status: 'Open', created_at: new Date().toISOString() }, ...p]);
    setTktForm({ subject: '', description: '', priority: 'Medium' }); toast('Ticket submitted ✓', 'success');
  };
  const saveProfile = async () => {
    try {
      // SECURITY DEFINER RPC — direct anon PATCH on customers is 403 (RLS)
      await acct.updateProfile(user, { name: editForm.name, phone: editForm.phone });
      const u = acct.persistUser({ ...user, ...editForm }); setUser(u); toast('Saved ✓', 'success');
    } catch (e) {
      handleError(e, { toast, ctx: { action: 'saveProfile' } }); // classified bilingual toast + log
    }
  };
  const tabs = [['dashboard','Dashboard'],['card','My Card'],['svcbookings','Bookings'],['ledger','Ledger'],['orders','Orders'],['designs','My Designs'],['rewards','Rewards'],['requests','Requests'],['support','Support'],['profile','Profile']];
  // Lazily fetch line items for a given order (cached in orderItems state).
  const loadOrderItems = async (orderId) => {
    if (!orderId || orderItems[orderId] !== undefined) return;
    setOrderItems(p => ({ ...p, [orderId]: 'loading' }));
    try {
      const r = await api(`sales_order_items?order_id=eq.${encodeURIComponent(orderId)}&select=*`);
      setOrderItems(p => ({ ...p, [orderId]: Array.isArray(r) ? r : [] }));
    } catch (_) { setOrderItems(p => ({ ...p, [orderId]: [] })); }
  };
  // Normalise a raw line-item row into { name, qty, unit, total }.
  const normItem = (it) => {
    const name = it.description || it.name || it.product_name || it.product || it.product_id || t('hubItems');
    const qty = Number(it.quantity != null ? it.quantity : (it.qty != null ? it.qty : 1)) || 1;
    const unit = Number(it.unit_price != null ? it.unit_price : (it.price != null ? it.price : (it.unit_cost || 0))) || 0;
    const total = it.line_total != null ? Number(it.line_total) : (it.total != null ? Number(it.total) : qty * unit);
    return { name, qty, unit, total };
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const bd = (n) => formatBHD(n, 'en');   // printed invoice is English
  const logoSrc = cms('header.logo', '') || '';
  const brandTxt = cms('header.brand', 'THE CLOSETS CO.');
  // Build a branded, print-clean A4 invoice HTML document for an order (or invoice row).
  const buildInvoiceHtml = (doc, items) => {
    const num = doc.order_number || doc.order_num || doc.invoice_number || doc.id || '';
    const dateStr = doc.created_at ? formatDate(doc.created_at, 'en') : '';
    const subtotal = doc.subtotal != null ? Number(doc.subtotal) : null;
    const discount = doc.discount != null ? Number(doc.discount) : (doc.discount_amount != null ? Number(doc.discount_amount) : null);
    const shipping = doc.shipping != null ? Number(doc.shipping) : (doc.shipping_amount != null ? Number(doc.shipping_amount) : null);
    const tax = doc.tax != null ? Number(doc.tax) : (doc.tax_amount != null ? Number(doc.tax_amount) : null);
    const total = Number(doc.total != null ? doc.total : (doc.total_amount != null ? doc.total_amount : (doc.amount || 0)));
    const payStatus = doc.payment_status || doc.status || '';
    const rows = (items || []).map(normItem);
    const rowsHtml = rows.length
      ? rows.map(r => `<tr><td>${esc(r.name)}</td><td class="c">${r.qty}</td><td class="r">${esc(bd(r.unit))}</td><td class="r">${esc(bd(r.total))}</td></tr>`).join('')
      : `<tr><td colspan="4" class="muted c">${esc(t('hubNoItems'))}</td></tr>`;
    // Matches the canonical Bonsai document template (public/closets-documents.html):
    // same theme (--brand #F97316, ink #2C2017), logo + serif title, From/Bill-to
    // parties, bordered meta cells, dark-header items table, orange footer band —
    // so a customer's invoice looks identical from the website portal or the Hub.
    const invTitle = doc.invoice_number ? t('hubInvoiceNo') : t('hubOrderNo');
    const rowsCanon = rows.length
      ? rows.map((r, i) => `<tr><td>${i + 1}</td><td class="desc"><b>${esc(r.name)}</b></td><td class="r">${r.qty}</td><td class="r">${esc(bd(r.unit))}</td><td class="r">${esc(bd(r.total))}</td></tr>`).join('')
      : `<tr><td colspan="5" class="muted" style="text-align:center;padding:22px">${esc(t('hubNoItems'))}</td></tr>`;
    const trow = (label, val) => (val != null ? `<div class="tr"><span>${esc(label)}</span><span>${esc(bd(val))}</span></div>` : '');
    return `<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${lang}"><head><meta charset="utf-8"/>
<title>Invoice ${esc(num)}</title>
<style>
:root{--brand:#F97316;--brand-d:#C2410C;--ink:#2C2017;--muted:#6F6157;--line:#E7DDCF;--head:#2C2017}
*{box-sizing:border-box} body{font-family:${lang==='ar'?'\'IBM Plex Sans Arabic\', -apple-system, BlinkMacSystemFont, \'SF Arabic\', \'IBM Plex Sans Arabic\', \'Segoe UI\', Tahoma, sans-serif':'-apple-system, BlinkMacSystemFont, \'SF Pro Text\', \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif'};color:var(--ink);margin:0;background:#fff}
.page{max-width:820px;margin:0 auto;padding:36px 40px 0;position:relative}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid var(--brand);padding-bottom:14px}
.hd .co-l{display:flex;align-items:center;gap:14px;min-width:0}
.hd img{height:56px;width:auto}
.hd .co-nm{font-size:15px;font-weight:800;letter-spacing:.3px;line-height:1.2}
.hd .co-ar{font-size:12px;font-weight:700;color:var(--muted);direction:rtl}
.hd .doc{text-align:${rtl ? 'left' : 'right'}}
.hd .doc .t{font-size:26px;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
.hd .doc .n{font-size:13px;color:var(--muted);margin-top:2px}
.hd .doc .badge{display:inline-block;margin-top:6px;font-size:11px;font-weight:700;border-radius:999px;padding:3px 12px;background:#FFF1E6;color:var(--brand-d);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:18px}
.parties .lbl{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-d);font-weight:700;margin-bottom:5px}
.parties .nm{font-weight:700;font-size:14.5px}
.parties .ln{font-size:12.5px;color:var(--muted);line-height:1.7}
.meta{display:flex;flex-wrap:wrap;margin-top:16px;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.meta .c{flex:1;min-width:120px;padding:9px 14px;border-right:1px solid var(--line)}
.meta .c:last-child{border-right:none}
.meta .k{font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.meta .v{font-size:13px;font-weight:600;margin-top:2px}
table.items{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
table.items th{background:var(--head);color:#fff;text-align:${rtl ? 'right' : 'left'};padding:10px 12px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.items th.r,table.items td.r{text-align:${rtl ? 'left' : 'right'}}
table.items td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
table.items tr:nth-child(even) td{background:#FBF7F1;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.items .desc b{display:block}.muted{color:var(--muted)}
.totrow{display:flex;justify-content:${rtl ? 'flex-start' : 'flex-end'};margin-top:14px}
.totals{width:300px}
.totals .tr{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px dashed var(--line)}
.totals .tr.grand{border-bottom:none;border-top:2px solid var(--ink);margin-top:4px;padding-top:10px;font-size:16px;font-weight:800}
.totals .tr.grand span:last-child{color:var(--brand-d)}
.foot-note{margin-top:24px;font-size:11px;color:var(--muted);line-height:1.7}
.bandfoot{margin-top:40px;background:var(--brand);color:#fff;font-size:11px;padding:9px 40px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-left:-40px;margin-right:-40px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:22px 24px 0}.bandfoot{margin-left:-24px;margin-right:-24px;padding:9px 24px}}
</style></head><body><div class="page">
<div class="hd">
  <div class="co-l"><img src="https://closets-hub.vercel.app/the-closets-logo.png" alt="" onerror="this.style.display='none'"/>
    <div><div class="co-nm">The Closets International W.L.L.</div><div class="co-ar">الخزائن العالمية</div></div>
  </div>
  <div class="doc"><div class="t">${esc(t('hubInvoice'))}</div>${num ? `<div class="n">${esc(invTitle)} #${esc(num)}</div>` : ''}${payStatus ? `<div class="badge">${esc(payStatus)}</div>` : ''}</div>
</div>
<div class="parties">
  <div><div class="lbl">From</div><div class="nm">The Closets International W.L.L.</div>
    <div class="ln">Building 2249, Road 90, Block 1014, P.O. Box 31613 — Hamala, Kingdom of Bahrain<br>CR 64299 · VAT 220000826600002<br>+973 17555095 · Info@the-closets.com</div></div>
  <div><div class="lbl">${esc(t('hubBillTo'))}</div><div class="nm">${esc(doc.customer_name || user.name || '')}</div>
    <div class="ln">${esc(doc.customer_email || user.email || '')}</div></div>
</div>
<div class="meta">
  ${num ? `<div class="c"><div class="k">${esc(invTitle)}</div><div class="v">${esc(num)}</div></div>` : ''}
  ${dateStr ? `<div class="c"><div class="k">${esc(t('hubDate'))}</div><div class="v">${esc(dateStr)}</div></div>` : ''}
  ${payStatus ? `<div class="c"><div class="k">${esc(t('hubStatus'))}</div><div class="v">${esc(payStatus)}</div></div>` : ''}
</div>
<table class="items"><thead><tr><th style="width:30px">#</th><th>${esc(t('hubItems'))}</th><th class="r">${esc(t('hubQty'))}</th><th class="r">${esc(t('hubUnitPrice'))}</th><th class="r">${esc(t('hubLineTotal'))}</th></tr></thead><tbody>${rowsCanon}</tbody></table>
<div class="totrow"><div class="totals">
  ${trow(t('hubSubtotal'), subtotal)}
  ${trow(t('hubDiscount'), discount)}
  ${trow(t('hubShipping'), shipping)}
  ${trow(t('hubTax'), tax)}
  <div class="tr grand"><span>${esc(t('hubTotal'))}</span><span>${esc(bd(total))}</span></div>
</div></div>
<div class="bandfoot"><span>The Closets International W.L.L. · closets-website.vercel.app</span><span>+973 17555095 · CR 64299 · VAT 220000826600002</span></div>
</div></body></html>`;
  };
  // Ensure items are loaded (await) then run a callback with them.
  // Invoices (key starts with 'inv-') try invoice_items; orders use sales_order_items.
  const withItems = async (doc, key, fn) => {
    let items = orderItems[key];
    if (items === undefined && doc.id) {
      const isInvoice = typeof key === 'string' && key.startsWith('inv-');
      try {
        const path = isInvoice
          ? `invoice_items?invoice_id=eq.${encodeURIComponent(doc.id)}&select=*`
          : `sales_order_items?order_id=eq.${encodeURIComponent(doc.id)}&select=*`;
        const r = await api(path);
        items = Array.isArray(r) ? r : [];
      } catch (_) { items = []; }
      // Fallback: invoice may store line data inline (items / line_items column).
      if (isInvoice && (!items || !items.length)) {
        try {
          const inline = doc.items || doc.line_items;
          const parsed = typeof inline === 'string' ? JSON.parse(inline) : inline;
          if (Array.isArray(parsed)) items = parsed;
        } catch (_) {}
      }
      setOrderItems(p => ({ ...p, [key]: Array.isArray(items) ? items : [] }));
    }
    fn(Array.isArray(items) ? items : []);
  };
  const invoiceView = async (doc, key) => {
    await withItems(doc, key, (items) => {
      const w = window.open('', '_blank');
      if (!w) { toast('Please allow pop-ups to view the invoice', 'error'); return; }
      w.document.write(buildInvoiceHtml(doc, items));
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 350);
    });
  };
  const invoiceDownload = async (doc, key) => {
    await withItems(doc, key, (items) => {
      const num = doc.order_number || doc.order_num || doc.invoice_number || doc.id || 'invoice';
      const blob = new Blob([buildInvoiceHtml(doc, items)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice-${String(num).replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    });
  };
  // Reusable itemized table + invoice actions block.
  const ItemsBlock = ({ doc, withInvoice }) => {
    const key = doc.id;
    const items = orderItems[key];
    const rows = Array.isArray(items) ? items.map(normItem) : [];
    return (
      <div style={{ marginTop:12 }}>
        {items === 'loading'
          ? <div style={{ fontSize:13, color:'var(--shop-muted)', padding:'8px 0' }}>…</div>
          : rows.length === 0
            ? <div style={{ fontSize:13, color:'var(--shop-muted)', padding:'8px 0' }}>{t('hubNoItems')}</div>
            : (
              <div style={{ border:'1px solid #ececec', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:0, fontSize:11.5, textTransform:'uppercase', letterSpacing:'.04em', color:'#9a948d', background:'#faf6f1', padding:'8px 12px' }}>
                  <span>{t('hubItems')}</span>
                  <span style={{ textAlign:'center', minWidth:42 }}>{t('hubQty')}</span>
                  <span style={{ textAlign: rtl ? 'left' : 'right', minWidth:80 }}>{t('hubUnitPrice')}</span>
                  <span style={{ textAlign: rtl ? 'left' : 'right', minWidth:90 }}>{t('hubLineTotal')}</span>
                </div>
                {rows.map((row, ri) => (
                  <div key={ri} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:0, fontSize:13, padding:'10px 12px', borderTop:'1px solid #f2efe9', alignItems:'center' }}>
                    <span style={{ color:'var(--shop-ink)' }}>{row.name}</span>
                    <span style={{ textAlign:'center', minWidth:42, color:'var(--shop-ink-2)' }}>{row.qty}</span>
                    <span style={{ textAlign: rtl ? 'left' : 'right', minWidth:80, color:'var(--shop-ink-2)' }}>{bd(row.unit)}</span>
                    <span style={{ textAlign: rtl ? 'left' : 'right', minWidth:90, fontWeight:600, color:'var(--shop-ink)' }}>{bd(row.total)}</span>
                  </div>
                ))}
              </div>
            )}
        {withInvoice && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12, alignItems:'center' }}>
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--shop-muted)' }}>{t('hubInvoice')}:</span>
            <button type="button" onClick={()=>invoiceView(doc, key)} style={invBtn}>{t('hubView')}</button>
            <button type="button" onClick={()=>invoiceView(doc, key)} style={invBtn}>{t('hubPrint')}</button>
            <button type="button" onClick={()=>invoiceDownload(doc, key)} style={invBtn}>{t('hubDownload')}</button>
          </div>
        )}
      </div>
    );
  };
  const invBtn = { background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-pill)', padding:'6px 14px', fontSize:13, fontWeight:600, color:'var(--clay)', cursor:'pointer' };
  const cardUrl = cardSlug ? `${HUB_ORIGIN}/card.html?c=${encodeURIComponent(cardSlug)}` : null;
  const shareCard = async () => {
    if (!cardUrl) return;
    if (navigator.share) { try { await navigator.share({ title: user.name + ' — The Closets', url: cardUrl }); } catch(_){} }
    else { try { await navigator.clipboard.writeText(cardUrl); toast('Card link copied ✓','success'); } catch(_){} }
  };
  const uploadPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
    setPhotoBusy(true);
    try {
      const path = 'customer/' + user.id + '/photo-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const up = await fetch(SUPA_URL + '/storage/v1/object/card-media/' + path, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file
      });
      if (!up.ok) throw new Error('upload failed');
      const publicUrl = SUPA_URL + '/storage/v1/object/public/card-media/' + path;
      const r = await acct.setCardPhoto(user, publicUrl);
      if (r && r.ok) { setCardPhoto(publicUrl); toast('Profile photo updated ✓', 'success'); }
      else { toast((r && r.error) || t('w4CouldNotSavePhoto'), 'error'); }
    } catch (_) { toast('Upload failed, please try again', 'error'); }
    setPhotoBusy(false);
    e.target.value = '';
  };
  const Pill = ({ label, color, bg }) => <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 'var(--radius-pill)', background: bg, color, fontSize: 12, fontWeight: 500 }}>{label}</span>;
  const tabLabel = (key, fallback) => {
    const map = { dashboard:'w4PDashboardTab', ledger:'w4PLedgerTab', orders:'w4POrdersTab', rewards:'w4PRewards', requests:'w4PServiceRequests', support:'w4PSupport', profile:'w4PProfile', designs:'w4PMyDesigns' };
    return map[key] && I18N[map[key]] ? t(map[key]) : fallback;
  };
  return (
    <div dir={dir} style={{ minHeight: '100dvh', paddingBottom: mobile ? 80 : 0, background: 'var(--shop-fill)' }}>
      {/* ── Single cohesive account bar (logo + account + back/sign-out, with tab row) ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--cream)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile ? '12px 16px 0' : '12px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button type="button" onClick={() => setPage('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
              {logoSrc
                ? <img src={logoSrc} alt={brandTxt} style={{ height: 30, width: 'auto', maxWidth: 120, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                : <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '.02em' }}>{brandTxt}</span>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 8 : 12 }}>
              {!mobile && (
                <div style={{ textAlign: rtl ? 'left' : 'right', lineHeight: 1.25 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{user.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{user.tier||'Bronze'} · {formatNumber(user.points||0, CMS_LANG)} pts</div>
                </div>
              )}
              <button type="button" onClick={() => setPage('home')} style={{ background: 'var(--c-surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-pill)', padding: '7px 13px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{rtl ? '→ ' : '← '}{t('hubBackToSite')}</button>
              <button type="button" onClick={() => { setUser(null); acct.clearUser(); setPage('home'); }} style={{ background: 'rgba(217,48,37,.08)', border: 'none', borderRadius: 'var(--radius-pill)', padding: '7px 13px', fontSize: 13, fontWeight: 500, color: 'var(--c-err)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('hubSignOut')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 0 0', scrollbarWidth: 'none' }}>
            {tabs.map(([key, label]) => (
              <button type="button" key={key} onClick={() => setTab(key)} style={{ padding: '8px 14px', borderRadius: '12px 12px 0 0', border: 'none', borderBottom: tab === key ? '2px solid var(--clay)' : '2px solid transparent', background: 'transparent', color: tab === key ? 'var(--clay-deep, var(--clay))' : 'var(--ink-soft)', fontSize: 13.5, fontWeight: tab === key ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{tabLabel(key, label)}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile ? '16px var(--gutter)' : '32px var(--gutter)', display: 'block' }}>
        {/* Content */}
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          {tab === 'card' && <>
            {!mobile && <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--shop-ink)', marginBottom: 20 }}>My Digital Card</h2>}
            <div style={{ background:'var(--c-surface)', border:'1px solid #ececec', borderRadius:'var(--radius-xl)', padding:28, maxWidth:560 }}>
              {cardSlug ? <>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
                  <div style={{ position:'relative', width:64, height:64 }}>
                    <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#A855F7,#A855F799)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff' }}>
                      {cardPhoto ? <img src={cardPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (user.name?.[0]||'?')}
                    </div>
                    <button type="button" onClick={()=>document.getElementById('cust-photo-input').click()} title="Change photo" style={{ position:'absolute', right:-2, bottom:-2, width:24, height:24, borderRadius:'50%', border:'2px solid #fff', background:'var(--clay)', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>✎</button>
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:'var(--shop-ink)' }}>{user.name}</div>
                    <div style={{ fontSize:13, color:'var(--shop-muted)' }}>{(user.tier||'Bronze')} member · {formatNumber(user.points||0, CMS_LANG)} pts</div>
                  </div>
                </div>
                <input id="cust-photo-input" type="file" accept="image/*" style={{ display:'none' }} onChange={uploadPhoto} />
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>{t('imgHintAvatar')}</div>
                <p style={{ fontSize:14, color:'var(--shop-ink-2)', lineHeight:1.6, marginBottom:18 }}>{t('sw3HubCardLive')}</p>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <a href={cardUrl} target="_blank" rel="noreferrer" className="btn" style={{ borderRadius:'var(--radius-lg)', textDecoration:'none' }}>Open my card ↗</a>
                  <button type="button" className="btn-secondary" onClick={shareCard} style={{ borderRadius:'var(--radius-lg)' }}>Share</button>
                  <button type="button" className="btn-secondary" onClick={()=>document.getElementById('cust-photo-input').click()} disabled={photoBusy} style={{ borderRadius:'var(--radius-lg)' }}>{photoBusy ? 'Uploading…' : (cardPhoto ? 'Change photo' : 'Upload photo')}</button>
                </div>
              </> : <>
                <div style={{ fontSize:40, marginBottom:10 }}>🪪</div>
                <div style={{ fontSize:17, fontWeight:600, color:'var(--shop-ink)' }}>{t('sw3HubNoCard')}</div>
                <p style={{ fontSize:14, color:'var(--shop-muted)', marginTop:8 }}>{t('sw3HubNoCardSub')}</p>
                <button type="button" className="btn" onClick={()=>setPage('contact')} style={{ borderRadius:'var(--radius-lg)', marginTop:14 }}>Contact us</button>
              </>}
            </div>
          </>}
          {tab === 'dashboard' && <>
            {!mobile && <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--shop-ink)', marginBottom: 20 }}>Home Hub</h2>}
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[['Total Invested', fmt(totalSpent), 'var(--clay)'], ['Active Orders', orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).length, '#1d1d1f'], ['Points', formatNumber(user.points||0, CMS_LANG), '#b8860b'], ['Designs', designs.length, '#1d1d1f']].map(([label,val,color])=>(
                <div key={label} style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-xl)', padding: '18px 16px', border: '1px solid var(--shop-line)' }}>
                  <div style={{ fontSize: mobile ? 18 : 22, fontWeight: 700, color, letterSpacing: '-.02em', marginBottom: 4 }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'var(--shop-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            {orders.filter(o=>!['Delivered','Cancelled'].includes(o.status)).slice(0,2).map(order=>{
              const steps=['Confirmed','Materials','Production','Quality','Ready','Delivered'];
              const idx=Math.max(0,steps.findIndex(s=>(order.status||'').toLowerCase().startsWith(s.toLowerCase().slice(0,4))));
              const pct=Math.round(((idx+1)/steps.length)*100);
              return <div key={order.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'18px 20px', border:'1px solid var(--shop-line)', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--shop-ink)' }}>{order.order_number||order.id}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{pct}%</span>
                </div>
                <div style={{ background:'var(--shop-fill)', borderRadius:'var(--radius-pill)', height:6, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--clay),#ea6c0a)', borderRadius:'var(--radius-pill)', transition:'width 1s ease' }} />
                </div>
                <div style={{ fontSize:12, color:'var(--shop-muted)', marginTop:6 }}>{order.status||'In Progress'}</div>
              </div>;
            })}
          </>}

          {tab === 'ledger' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em' }}>{t('w4PLedgerTab')}</h2>
              <span style={{ fontSize:18, fontWeight:700, color:'var(--clay)' }}>{fmt(totalSpent)}</span>
            </div>
            {orders.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'var(--shop-muted)', background:'var(--c-surface)', borderRadius:'var(--radius-lg)', fontSize:14 }}>{t('hubNoItems')}</div> : orders.map(order=>{
              const open = expandedOrder === ('ledger-'+order.id);
              return (
                <div key={order.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'16px 18px', border:'1px solid var(--shop-line)', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--clay)', marginBottom:2 }}>{order.order_number||order.order_num||order.id}</div>
                      <div style={{ fontSize:12, color:'var(--shop-muted)' }}>{order.notes||order.description||'Order'} · {order.created_at?formatDate(order.created_at, CMS_LANG):'—'}</div>
                    </div>
                    <div style={{ textAlign: rtl ? 'left' : 'right' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink)', marginBottom:4 }}>{fmt(order.total||order.total_amount||order.amount)}</div>
                      <Pill label={order.status||'Processing'} color="var(--clay)" bg="rgba(168,75,41,.1)" />
                    </div>
                  </div>
                  <button type="button" onClick={()=>{ const k='ledger-'+order.id; if(open){setExpandedOrder(null);} else {setExpandedOrder(k); loadOrderItems(order.id);} }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--clay)', fontSize:13, fontWeight:600, padding:'8px 0 0', display:'inline-flex', gap:5 }}>{open ? t('hubHideItems') : t('hubViewItems')} {open ? '▴' : '▾'}</button>
                  {open && <ItemsBlock doc={order} withInvoice={false} />}
                </div>
              );
            })}
            {invoices.length>0 && (
              <div style={{ marginTop:24 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink)', marginBottom:10 }}>{t('hubInvoice')}</h3>
                <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', overflow:'hidden', border:'1px solid var(--shop-line)' }}>
                  {invoices.map((inv,i)=>(
                    <div key={inv.id} style={{ padding:'14px 18px', borderBottom:i<invoices.length-1?'1px solid var(--shop-fill)':'none' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:500, color:'var(--clay)', marginBottom:2 }}>{inv.invoice_number||inv.id}</div>
                          <div style={{ fontSize:12, color:'var(--shop-muted)' }}>{inv.description||'Order'} · {inv.created_at?formatDate(inv.created_at, CMS_LANG):'—'}</div>
                        </div>
                        <div style={{ textAlign: rtl ? 'left' : 'right' }}>
                          <div style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink)', marginBottom:4 }}>{fmt(inv.total_amount||inv.amount)}</div>
                          <Pill label={inv.status||'Pending'} color={inv.status==='Paid'?'#1a7a40':'#b8860b'} bg={inv.status==='Paid'?'rgba(26,122,64,.1)':'rgba(184,134,11,.1)'} />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12.5, fontWeight:600, color:'var(--shop-muted)' }}>{t('hubInvoice')}:</span>
                        <button type="button" onClick={()=>invoiceView(inv, 'inv-'+inv.id)} style={invBtn}>{t('hubView')}</button>
                        <button type="button" onClick={()=>invoiceView(inv, 'inv-'+inv.id)} style={invBtn}>{t('hubPrint')}</button>
                        <button type="button" onClick={()=>invoiceDownload(inv, 'inv-'+inv.id)} style={invBtn}>{t('hubDownload')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}

          {tab === 'svcbookings' && <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', margin:0 }}>Service bookings</h2>
              <button type="button" className="btn" onClick={()=>setPage('services')} style={{ borderRadius:'var(--radius-md)', padding:'8px 16px', fontSize:14 }}>+ Book a service</button>
            </div>
            {svcBookings.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'var(--shop-muted)', background:'var(--c-surface)', borderRadius:'var(--radius-lg)', fontSize:14 }}>{t('sw3HubNoBookings')}</div> : svcBookings.map(b=>{
              const s=(b.status||'').toLowerCase();
              const col = /complet/.test(s)?'#16a34a' : /cancel|disput/.test(s)?'#dc2626' : /request/.test(s)?'var(--clay)' : '#3b82f6';
              return (
                <div key={b.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'16px 18px', border:'1px solid var(--shop-line)', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:15, fontWeight:600, color:'var(--shop-ink)' }}>{b.category_name||'Service'}</div>
                    <Pill label={b.status||'Requested'} color={col} bg={col+'18'} />
                  </div>
                  <div style={{ fontSize:12.5, color:'var(--shop-muted)', marginTop:5 }}>
                    {b.provider_name?('👷 '+b.provider_name):(b.mode==='on_demand'?'ASAP':'Scheduled')}{b.area?(' · '+b.area):''}{b.slot?(' · '+b.slot):''}
                    {b.price_approval_status==='pending'?'  ·  ⏳ price approval needed':''}
                  </div>
                  {!!b.notes && <div style={{ fontSize:12.5, color:'var(--shop-ink-2)', marginTop:6 }}>{b.notes}</div>}
                </div>
              );
            })}
          </>}

          {tab === 'orders' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4POrdersTab')}</h2>
            {orders.length===0 ? <div style={{ textAlign:'center', padding:'40px', color:'var(--shop-muted)', background:'var(--c-surface)', borderRadius:'var(--radius-lg)', fontSize:14 }}>{t('hubNoItems')}</div> : orders.map(o=>{
              const open = expandedOrder === ('orders-'+o.id);
              return (
                <div key={o.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'16px 18px', border:'1px solid var(--shop-line)', marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    <div><div style={{ fontSize:14, fontWeight:600, color:'var(--shop-ink)', marginBottom:3 }}>{o.order_number||o.order_num||o.id}</div><div style={{ fontSize:12, color:'var(--shop-muted)' }}>{o.created_at?formatDate(o.created_at, CMS_LANG):'—'}</div></div>
                    <div style={{ textAlign: rtl ? 'left' : 'right' }}><div style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink)', marginBottom:6 }}>{fmt(o.total||o.total_amount||o.amount)}</div><Pill label={o.status||'Processing'} color="var(--clay)" bg="rgba(168,75,41,.1)" /></div>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:8, flexWrap:'wrap' }}>
                    <button type="button" onClick={()=>{ const k='orders-'+o.id; if(open){setExpandedOrder(null);} else {setExpandedOrder(k); loadOrderItems(o.id);} }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--clay)', fontSize:13, fontWeight:600, padding:0, display:'inline-flex', gap:5 }}>{open ? t('hubHideItems') : t('hubViewItems')} {open ? '▴' : '▾'}</button>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--shop-muted)' }}>{t('hubInvoice')}:</span>
                      <button type="button" onClick={()=>invoiceView(o, o.id)} style={invBtn}>{t('hubView')}</button>
                      <button type="button" onClick={()=>invoiceView(o, o.id)} style={invBtn}>{t('hubPrint')}</button>
                      <button type="button" onClick={()=>invoiceDownload(o, o.id)} style={invBtn}>{t('hubDownload')}</button>
                    </div>
                  </div>
                  {open && <ItemsBlock doc={o} withInvoice={false} />}
                </div>
              );
            })}
          </>}

          {tab === 'designs' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4PMyDesigns')}</h2>
            {designs.length===0 ? (
              <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--shop-muted)', background:'var(--c-surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--shop-line)' }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🪟</div>
                <div style={{ fontSize:15, color:'var(--shop-ink)', fontWeight:600, marginBottom:6 }}>{t('w4PNoDesigns')}</div>
                <p style={{ fontSize:13.5, marginBottom:16 }}>{t('w4PStartStudio')}</p>
                <button type="button" className="btn" onClick={()=>setPage('planner')} style={{ borderRadius:'var(--radius-lg)' }}>{t('w4POpenStudio')}</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:14 }}>
                {designs.map(d=>{
                  const s=(d.status||'saved').toLowerCase();
                  const sCol = /quote/.test(s)?'#1a7a40' : 'var(--clay)';
                  return (
                    <div key={d.id} onClick={()=>setSelectedDesign(d)} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', border:'1px solid var(--shop-line)', overflow:'hidden', cursor:'pointer', transition:'box-shadow .15s' }}>
                      <div style={{ width:'100%', height:160, background:'var(--shop-fill)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                        {d.render_url
                          ? <img src={d.render_url} alt={d.product_name||'Design'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : <span style={{ fontSize:38, opacity:.45 }}>🪟</span>}
                      </div>
                      <div style={{ padding:16 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                          <div style={{ fontSize:15, fontWeight:600, color:'var(--shop-ink)' }}>{d.product_name||'Design'}</div>
                          <Pill label={d.status||'Saved'} color={sCol} bg={sCol+'18'} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ fontSize:16, fontWeight:700, color:'var(--clay)' }}>{fmt(d.total_price)}</div>
                          <div style={{ fontSize:12, color:'var(--shop-muted)' }}>{d.created_at?formatDate(d.created_at, CMS_LANG):'—'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedDesign && (
              <div onClick={()=>setSelectedDesign(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, zIndex:1000 }}>
                <ModalPanel onClose={()=>setSelectedDesign(null)} onClick={e=>e.stopPropagation()} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', maxWidth:520, width:'100%', maxHeight:'90vh', overflow:'auto', border:'1px solid var(--shop-line)' }}>
                  <div style={{ position:'relative', width:'100%', height:220, background:'var(--shop-fill)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                    {selectedDesign.render_url
                      ? <img src={selectedDesign.render_url} alt={selectedDesign.product_name||'Design'} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:54, opacity:.45 }}>🪟</span>}
                    <button type="button" onClick={()=>setSelectedDesign(null)} style={{ position:'absolute', top:12, right:12, width:30, height:30, borderRadius:'50%', border:'none', background:'rgba(0,0,0,.5)', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>×</button>
                  </div>
                  <div style={{ padding:22 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:19, fontWeight:700, color:'var(--shop-ink)' }}>{selectedDesign.product_name||'Design'}</div>
                        <div style={{ fontSize:12, color:'var(--shop-muted)', marginTop:2 }}>{selectedDesign.created_at?formatDate(selectedDesign.created_at, CMS_LANG):''}</div>
                      </div>
                      <Pill label={selectedDesign.status||'Saved'} color={/quote/.test((selectedDesign.status||'').toLowerCase())?'#1a7a40':'var(--clay)'} bg={(/quote/.test((selectedDesign.status||'').toLowerCase())?'#1a7a40':'var(--clay)')+'18'} />
                    </div>
                    {selectedDesign.configuration && typeof selectedDesign.configuration==='object' && (
                      <div style={{ background:'#f8f8f8', borderRadius:'var(--radius-lg)', padding:'14px 16px', marginBottom:16 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--shop-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.04em' }}>{t('w4PSpecification')}</div>
                        {Object.entries(selectedDesign.configuration).filter(([,v])=>v!=null && typeof v!=='object').map(([k,v])=>(
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid #efefef' }}>
                            <span style={{ color:'var(--shop-muted)', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                            <span style={{ color:'var(--shop-ink)', fontWeight:500, textAlign:'right' }}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                      <span style={{ fontSize:13, color:'var(--shop-muted)' }}>{t('w4PTotal')}</span>
                      <span style={{ fontSize:22, fontWeight:700, color:'var(--clay)' }}>{fmt(selectedDesign.total_price)}</span>
                    </div>
                    <button type="button" className="btn" onClick={()=>{ setSelectedDesign(null); setPage('planner'); }} style={{ borderRadius:'var(--radius-lg)', width:'100%' }}>{t('w4PDesignAgain')}</button>
                  </div>
                </ModalPanel>
              </div>
            )}
          </>}

          {tab === 'rewards' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4PRewards')}</h2>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, marginBottom:14, border:'1px solid var(--shop-line)' }}>
              <div style={{ fontSize:12, color:'var(--shop-muted)', marginBottom:4 }}>{t('w4PBalance')}</div>
              <div style={{ fontSize:44, fontWeight:700, color:'var(--clay)', letterSpacing:'-.03em', marginBottom:4 }}>{formatNumber((rwInfo?rwInfo.points:user.points)||0, CMS_LANG)}</div>
              <div style={{ fontSize:13, color:'var(--shop-muted)', marginBottom:20 }}>{t('w4PPoints')} · {(rwInfo&&rwInfo.tier)||user.tier||'Bronze'} {t('w4PMember')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[['Bronze','0–999'],['Silver','1k–5k'],['Gold','5k–15k'],['Platinum','15k+']].map(([tier,range])=>{
                  const curTier=(rwInfo&&rwInfo.tier)||user.tier;
                  return (
                  <div key={tier} style={{ background:curTier===tier?`${tierC[tier]}15`:'var(--shop-fill)', borderRadius:'var(--radius-md)', padding:'10px 8px', opacity:curTier===tier?1:.4, border:curTier===tier?`1.5px solid ${tierC[tier]}`:'1.5px solid transparent' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:tierC[tier], marginBottom:1 }}>{tier}</div>
                    <div style={{ fontSize:10, color:'var(--shop-muted)' }}>{range}</div>
                  </div>
                  );
                })}
              </div>
            </div>
            {rewards.map((r,i)=>(
              <div key={i} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'14px 18px', border:'1px solid var(--shop-line)', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, color:'var(--shop-ink)', marginBottom:2 }}>{r.description}</div><div style={{ fontSize:12, color:'var(--shop-muted)' }}>{r.created_at?formatDate(r.created_at, CMS_LANG):''}</div></div>
                <span style={{ fontSize:16, fontWeight:700, color:r.type==='earned'?'#1a7a40':'var(--c-err)' }}>{r.type==='earned'?'+':'-'}{r.points}</span>
              </div>
            ))}
          </>}

          {tab === 'requests' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4PServiceRequests')}</h2>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:20, border:'1px solid var(--shop-line)', marginBottom:14 }}>
              <select className="inp" value={cmpForm.category} onChange={e=>setCmpForm(p=>({...p,category:e.target.value}))} style={{ marginBottom:10 }}>
                {['Quality Issue','Delivery Problem','Incomplete Install','Design Discrepancy','Maintenance','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
              <textarea className="inp" rows={3} aria-label={t('w4PDescribeIssue')} placeholder={t('w4PDescribeIssue')} value={cmpForm.description} onChange={e=>setCmpForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:12, resize:'vertical' }} />
              <button type="button" className="btn" onClick={submitComplaint} style={{ borderRadius:'var(--radius-md)' }}>{t('w4PSubmitRequest')}</button>
            </div>
            {complaints.map(c=>(
              <div key={c.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'14px 18px', border:'1px solid var(--shop-line)', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:'var(--shop-ink)', marginBottom:2 }}>{c.category}</div><div style={{ fontSize:12, color:'var(--shop-muted)' }}>{c.id}</div></div>
                <Pill label={c.status||'Open'} color={c.status==='Resolved'?'#1a7a40':'#b8860b'} bg={c.status==='Resolved'?'rgba(26,122,64,.1)':'rgba(184,134,11,.1)'} />
              </div>
            ))}
          </>}

          {tab === 'support' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4PSupport')}</h2>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:20, border:'1px solid var(--shop-line)', marginBottom:14 }}>
              <input className="inp" placeholder={t('w4PSubject')} aria-label={t('w4PSubject')} value={tktForm.subject} onChange={e=>setTktForm(p=>({...p,subject:e.target.value}))} style={{ marginBottom:10 }} />
              <textarea className="inp" rows={3} placeholder={t('w4PDescription')} aria-label={t('w4PDescription')} value={tktForm.description} onChange={e=>setTktForm(p=>({...p,description:e.target.value}))} style={{ marginBottom:10, resize:'vertical' }} />
              <select className="inp" value={tktForm.priority} onChange={e=>setTktForm(p=>({...p,priority:e.target.value}))} style={{ marginBottom:12 }}>
                {['Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}
              </select>
              <button type="button" className="btn" onClick={submitTicket} style={{ borderRadius:'var(--radius-md)' }}>{t('w4PSubmitTicket')}</button>
            </div>
            {tickets.map(t=>(
              <div key={t.id} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-lg)', padding:'14px 18px', border:'1px solid var(--shop-line)', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div><div style={{ fontSize:14, fontWeight:500, color:'var(--shop-ink)', marginBottom:2 }}>{t.subject}</div><div style={{ fontSize:12, color:'var(--shop-muted)' }}>{t.id} · {t.priority}</div></div>
                <Pill label={t.status||'Open'} color="var(--clay)" bg="rgba(168,75,41,.1)" />
              </div>
            ))}
          </>}

          {tab === 'profile' && <>
            <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-.02em', marginBottom:18 }}>{t('w4PProfile')}</h2>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:24, border:'1px solid var(--shop-line)' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--shop-muted)', display:'block', marginBottom:6 }}>{t('w4PFullName')}</label><input className="inp" value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--shop-muted)', display:'block', marginBottom:6 }}>{t('w4PEmail')}</label><input className="inp" value={user.email} disabled style={{ opacity:.5 }} /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--shop-muted)', display:'block', marginBottom:6 }}>{t('w4PPhone')}</label><input className="inp" value={editForm.phone} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))} /></div>
                <button type="button" className="btn" onClick={saveProfile} style={{ borderRadius:'var(--radius-lg)', marginTop:4 }}>{t('w4PSaveChanges')}</button>
              </div>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

export { HomeHub };
