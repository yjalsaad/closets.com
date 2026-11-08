/* [IKHTARHA 2026-11-08] اختارها — printable reward certificate + quotation invite section (A4, Arabic RTL first).
 * Pure functions → HTML strings, so the same page prints from OneQuote (appended after the untouched quotation pages),
 * from the campaign studio, and (a copy) from the website. QR codes are inline SVG (no canvas, prints sharp).
 * Copy of closets-hub/src/campaigns/ikhtarha/certificate.js — keep the two in step. */
import qrcode from 'qrcode-generator';

export const LOGO = (typeof window !== 'undefined' ? window.location.origin : 'https://closets-website.vercel.app') + '/brand/closets-logo-clear.png';
const C = { orange: '#D9692F', burgundy: '#4B1F24', cream: '#F7F2EC', grey: '#EDEBE8', ink: '#2A1A1C', muted: '#7A6A66', gold: '#B8924E' };
const ORIGIN = LOGO.replace(/\/brand\/.*$/, '');
/** campaign asset URL: absolute https, or a /brand/… path served by this app */
export const assetUrl = (u) => (!u ? '' : /^https:\/\//.test(u) ? u : ORIGIN + (u.startsWith('/') ? u : '/' + u));
const HEX = /^#[0-9A-Fa-f]{6}$/;
/** inline CSS variables from a campaign brand (only well-formed hex values are used) */
export const brandVars = (b) => { b = b || {}; const v = []; if (HEX.test(b.primary || '')) v.push('--ikh-b:' + b.primary); if (HEX.test(b.accent || '')) v.push('--ikh-o:' + b.accent); if (HEX.test(b.sand || '')) v.push('--ikh-s:' + b.sand); return v.join(';'); };
export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function qrSvg(text, cell = 4) {
  const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}
const money = (n) => 'BD ' + Number(n || 0).toFixed(3);
const day = (d, ar) => (d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString(ar ? 'ar-BH' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

/** headline value of a reward: "10%", "BD 50.000", or the gift name */
export function rewardValueText(r, ar) {
  if (!r) return '';
  if (r.type === 'percent') return `${Number(r.value)}%`;
  if (r.type === 'fixed') return money(r.value);
  return ar ? (r.name_ar || r.name_en) : (r.name_en || r.name_ar);
}
export function rewardSentence(r, ar) {
  if (!r) return '';
  if (r.type === 'percent') return ar ? `لقد حصلت على خصم ${Number(r.value)}٪` : `You won ${Number(r.value)}% off`;
  if (r.type === 'fixed') return ar ? `لقد حصلت على خصم ${money(r.value)}` : `You won ${money(r.value)} off`;
  return ar ? `لقد حصلت على: ${r.name_ar || r.name_en}` : `You won: ${r.name_en || r.name_ar}`;
}

const CSS = `
.ikh-page,.ikh-invite{--ikh-b:#5B1520;--ikh-o:#FF7A00;--ikh-s:#F7F2EC}
.ikh-page{width:210mm;min-height:297mm;box-sizing:border-box;padding:16mm 16mm 14mm;margin:0 auto;background:var(--ikh-s);color:${C.ink};
  font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","IBM Plex Sans Arabic","Segoe UI","Noto Sans Arabic",Tahoma,Arial,sans-serif;position:relative;page-break-before:always;break-before:page;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden}
.ikh-page *{box-sizing:border-box}
.ikh-frame{position:absolute;inset:8mm;border:1.2px solid color-mix(in srgb,var(--ikh-b) 14%,transparent);border-radius:6mm;pointer-events:none}
.ikh-frame:after{content:"";position:absolute;inset:3mm;border:.6px solid ${C.gold}66;border-radius:4mm}
.ikh-top{display:flex;justify-content:space-between;align-items:center;position:relative}
.ikh-logo{height:24mm;width:auto}
.ikh-tag{font-size:9pt;letter-spacing:.2em;color:${C.muted};text-transform:uppercase}
.ikh-hero{margin:18mm 0 8mm;text-align:center;position:relative}
.ikh-clogo{height:30mm;width:auto;display:block;margin:0 auto 4mm}
.ikh-eyebrow{font-size:11pt;color:var(--ikh-o);font-weight:700;letter-spacing:.08em}
.ikh-title{font-size:40pt;font-weight:800;color:var(--ikh-b);margin:2mm 0 1mm;line-height:1.1}
.ikh-sub{font-size:13pt;color:${C.ink}}
.ikh-prize{margin:8mm auto 6mm;max-width:150mm;background:#fff;border-radius:6mm;padding:9mm 10mm;text-align:center;box-shadow:0 0 0 .6px color-mix(in srgb,var(--ikh-b) 14%,transparent);position:relative}
.ikh-prize:before{content:"";position:absolute;inset-inline:0;top:0;height:2.2mm;border-radius:6mm 6mm 0 0;background:linear-gradient(90deg,var(--ikh-o),${C.gold},var(--ikh-b))}
.ikh-value{font-size:46pt;font-weight:800;color:var(--ikh-o);line-height:1;margin:2mm 0}
.ikh-name{font-size:15pt;font-weight:700;color:var(--ikh-b)}
.ikh-desc{font-size:10.5pt;color:${C.muted};margin-top:2mm}
.ikh-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;max-width:150mm;margin:0 auto;font-size:10.5pt}
.ikh-grid div{display:flex;justify-content:space-between;align-items:baseline;border-bottom:.5px solid color-mix(in srgb,var(--ikh-b) 14%,transparent);padding:2mm 0;gap:3mm}
.ikh-grid span{white-space:nowrap}
.ikh-grid b{color:var(--ikh-b)}
.ikh-foot{display:grid;grid-template-columns:34mm 1fr;gap:6mm;align-items:center;max-width:150mm;margin:12mm auto 0}
.ikh-qr svg{width:34mm;height:34mm;display:block;background:#fff;border-radius:2mm}
.ikh-terms{font-size:9pt;color:${C.muted};line-height:1.6}
.ikh-ref{font-family:"SF Mono",Menlo,Consolas,monospace;letter-spacing:.04em;direction:ltr;unicode-bidi:embed;white-space:nowrap;font-size:.92em}
.ikh-band{position:absolute;inset-inline:0;bottom:0;height:9mm;background:var(--ikh-b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9pt;letter-spacing:.14em}
.ikh-invite{border:1px solid color-mix(in srgb,var(--ikh-b) 20%,transparent);border-radius:5mm;padding:7mm 8mm;background:var(--ikh-s);display:grid;grid-template-columns:1fr 34mm;gap:6mm;align-items:center;
  font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif;color:${C.ink};page-break-inside:avoid;break-inside:avoid;margin-top:8mm;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.ikh-invite h3{margin:0 0 1mm;font-size:16pt;color:var(--ikh-b)}
.ikh-invite .k{display:inline-block;margin-top:2mm;padding:1.5mm 3mm;border-radius:2mm;background:#fff;border:1px dashed var(--ikh-o);font-weight:800;color:var(--ikh-o);font-size:12pt}
.ikh-invite .qr svg{width:34mm;height:34mm;display:block;background:#fff}
@media print{.ikh-page{margin:0;box-shadow:none}}
@page{size:A4;margin:0}
`;
export const CERT_CSS = CSS;

/** the reward certificate page (one A4 page, its own page break) */
export function certificatePage(r, { ar = true, verifyBase = (typeof window !== 'undefined' ? window.location.origin : 'https://closets-website.vercel.app') + '/campaign/ikhtarha/verify' } = {}) {
  const L = (en, a) => (ar ? a : en);
  const verify = `${verifyBase}?t=${encodeURIComponent(r.verify_token || '')}`;
  const desc = ar ? (r.description_ar || r.description_en) : (r.description_en || r.description_ar);
  const discount = Number(r.discount_amount) > 0 ? money(r.discount_amount) : null;
  const b = r.brand || {}; const clogo = assetUrl(b.logo);
  return `<section class="ikh-page" dir="${ar ? 'rtl' : 'ltr'}" lang="${ar ? 'ar' : 'en'}" style="${esc(brandVars(b))}">
  <div class="ikh-frame"></div>
  <div class="ikh-top"><img class="ikh-logo" src="${LOGO}" alt="The Closets International"><span class="ikh-tag">${L('Reward certificate', 'شهادة جائزة')}</span></div>
  <div class="ikh-hero">
    ${clogo ? `<img class="ikh-clogo" src="${esc(clogo)}" alt="${L('Ikhtarha', 'اختارها')}">` : `<div class="ikh-eyebrow">${L('IKHTARHA · CHOOSE YOUR BOX', 'اختارها · اختر صندوقك')}</div>`}
    <div class="ikh-title">${L('Congratulations!', 'مبروك!')}</div>
    <div class="ikh-sub">${esc(L('You chose — and your reward is here.', 'اختارها وجائزتك وصلت!'))}</div>
  </div>
  <div class="ikh-prize">
    ${r.image_url && /^https:\/\//.test(r.image_url) ? `<img src="${esc(r.image_url)}" alt="" style="display:block;width:38mm;height:38mm;object-fit:contain;margin:0 auto 3mm;background:#fff;border-radius:3mm">` : ''}
    <div class="ikh-name">${esc(rewardSentence(r, ar))}</div>
    <div class="ikh-value">${esc(rewardValueText(r, ar))}</div>
    <div class="ikh-name">${esc(ar ? r.name_ar : r.name_en)}</div>
    ${desc ? `<div class="ikh-desc">${esc(desc)}</div>` : ''}
    <div class="ikh-desc">${esc(L('On your order with The Closets International.', 'على طلبك من الخزائن العالمية.'))}</div>
  </div>
  <div class="ikh-grid">
    <div><span>${L('Customer', 'العميل')}</span><b>${esc(r.customer_name)}</b></div>
    <div><span>${L('Quotation', 'الكوتيشن')}</span><b class="ikh-ref">${esc(r.quote_no)}</b></div>
    <div><span>${L('Reward reference', 'مرجع الجائزة')}</span><b class="ikh-ref">${esc(r.ref)}</b></div>
    <div><span>${L('Valid until', 'صالحة حتى')}</span><b>${esc(day(r.expires_at, ar))}</b></div>
    ${discount ? `<div><span>${L('Discount value', 'قيمة الخصم')}</span><b>${esc(discount)}</b></div>` : ''}
    ${discount && Number(r.quote_total) > 0 ? `<div><span>${L('Quotation total', 'إجمالي الكوتيشن')}</span><b>${esc(money(r.quote_total))}</b></div><div><span>${L('Total after reward', 'الإجمالي بعد الجائزة')}</span><b>${esc(money(Math.max(Number(r.quote_total) - Number(r.discount_amount || 0), 0)))}</b></div>` : ''}
    <div><span>${L('Issued', 'تاريخ الإصدار')}</span><b>${esc(day(r.revealed_at, ar))}</b></div>
  </div>
  <div class="ikh-foot">
    <div class="ikh-qr">${qrSvg(verify, 3)}</div>
    <div class="ikh-terms"><b>${L('How to use it', 'طريقة الاستخدام')}</b><br>${esc(L('Show this certificate (printed or on your phone) when you confirm your order. Our team scans the code to verify it.', 'اعرض هذه الشهادة (مطبوعة أو على جوالك) عند تأكيد طلبك، وسيقوم فريقنا بمسح الرمز للتحقق منها.'))}<br>
      ${esc(ar ? (r.terms_ar || '') : (r.terms_en || ''))}</div>
  </div>
  <div class="ikh-band">THE CLOSETS INTERNATIONAL · الخزائن العالمية</div>
</section>`;
}

/** the "you have a surprise" block added at the end of the quotation */
export function inviteBlock({ code, link, ends, ar = true, brand }) {
  const L = (en, a) => (ar ? a : en); const clogo = assetUrl((brand || {}).logo);
  return `<div class="ikh-invite" dir="${ar ? 'rtl' : 'ltr'}" style="${esc(brandVars(brand))}">
  <div>${clogo ? `<img src="${esc(clogo)}" alt="" style="height:16mm;width:auto;display:block;margin-bottom:2mm">` : ''}
    <h3>${esc(L('A surprise from The Closets International!', 'عندك مفاجأة من الخزائن العالمية!'))}</h3>
    <div>${esc(L('Scan the code or open the link, choose your box and discover your reward.', 'امسح الكود أو افتح الرابط، واختار صندوقك لتكتشف جائزتك.'))}</div>
    <div class="k ikh-ref">${esc(code)}</div>
    <div style="font-size:9pt;margin-top:2mm;direction:ltr;text-align:${ar ? 'right' : 'left'}">${esc(link)}</div>
    <div style="font-size:9pt;color:${C.muted};margin-top:1mm">${esc(L('Campaign: Ikhtarha — one box per quotation', 'الحملة: اختارها — صندوق واحد لكل كوتيشن'))}${ends ? ' · ' + esc(L('until ', 'حتى ')) + esc(day(ends, ar)) : ''}</div>
  </div>
  <div class="qr">${qrSvg(link, 3)}</div>
</div>`;
}

/** full stand-alone document (studio / website print) */
export function certificateDocument(rewards, { ar = true, title } = {}) {
  const list = Array.isArray(rewards) ? rewards : [rewards];
  return `<!doctype html><html dir="${ar ? 'rtl' : 'ltr'}" lang="${ar ? 'ar' : 'en'}"><head><meta charset="utf-8"><title>${esc(title || 'Ikhtarha')}</title>
<style>html,body{margin:0;background:#e9e6e2}${CSS}.ikh-page:first-of-type{page-break-before:auto;break-before:auto}</style></head>
<body>${list.map((r) => certificatePage(r, { ar })).join('')}<script>window.onload=function(){var im=[].slice.call(document.images);Promise.all(im.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r;})})).then(function(){setTimeout(function(){window.print()},300)})}<\/script></body></html>`;
}

/** append extra sections to a complete quotation HTML document (the quotation pages stay untouched) */
export function appendToQuoteHtml(html, extraHtml) {
  const extra = `<style>${CSS}</style>${extraHtml}`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, extra + '</body>') : html + extra;
}

/** "invite card" print for Quote+ quotations (customer_quotes) that have no OneQuote PDF to extend */
export function inviteDocument({ code, link, ends, customer, quoteNo, ar = true, brand }) {
  return `<!doctype html><html dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>Ikhtarha ${esc(code)}</title><style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","IBM Plex Sans Arabic","Segoe UI","Noto Sans Arabic",Tahoma,sans-serif;color:#2A1A1C}${CSS}
  .wrap{width:148mm;margin:12mm auto}.hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4mm}.hd img{height:16mm}
  @page{size:A5 landscape;margin:0}</style></head><body><div class="wrap">
  <div class="hd"><img src="${LOGO}" alt="The Closets International"><div style="text-align:${ar ? 'left' : 'right'};font-size:10pt">${esc(customer || '')}<br><span class="ikh-ref">${esc(quoteNo || '')}</span></div></div>
  ${inviteBlock({ code, link, ends, ar, brand })}</div><script>window.onload=function(){var im=[].slice.call(document.images);Promise.all(im.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r;})})).then(function(){setTimeout(function(){window.print()},300)})}<\/script></body></html>`;
}
