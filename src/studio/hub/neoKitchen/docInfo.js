/* [NEO-CUTLIST-UX32] Production Document Settings: the company block (logo, name, address ...) and the project details (customer, order no. ...)
 * printed in the title block of every production document (cut list print, PDF report, labels, nesting sheets, xlsx cover, DXF header).
 *   company  - remembered per user in this browser (localStorage, wrapped); defaults to the Hub brand when the Hub published one
 *              (window.__hubBrand, set by App.js from the tenant settings) and otherwise to the bundled /brand/closets-logo-clear.png
 *   project  - travels with the project: the designers keep it in their project JSON / autosave (`docInfo`); a studio that does not store it
 *              falls back to a per-project-title key in this browser
 * Pure helpers + guarded storage. Nothing is fetched from another host: a logo is a data: URL (upload) or a same-origin path. */

export const COMPANY_FIELDS = ['name', 'nameAr', 'address', 'phone', 'email', 'cr'];
export const PROJECT_FIELDS = ['project', 'customer', 'customerPhone', 'orderNo', 'jobNo', 'siteAddress', 'designer', 'salesRep', 'revision', 'date', 'deliveryDate', 'materialSpec', 'notes'];
export const PROJECT_LABELS = {
  project: ['Project name', 'اسم المشروع'], customer: ['Customer name', 'اسم العميل'], customerPhone: ['Customer phone', 'هاتف العميل'], orderNo: ['Order / SO no.', 'رقم الطلب'],
  jobNo: ['Job no.', 'رقم المهمة'], siteAddress: ['Site address', 'عنوان الموقع'], designer: ['Designer', 'المصمم'], salesRep: ['Sales rep', 'مندوب المبيعات'],
  revision: ['Revision', 'المراجعة'], date: ['Date', 'التاريخ'], deliveryDate: ['Delivery date', 'تاريخ التسليم'], materialSpec: ['Material spec', 'مواصفات المواد'], notes: ['Notes', 'ملاحظات'],
};
export const COMPANY_LABELS = { name: ['Company name', 'اسم الشركة'], nameAr: ['Company name (Arabic)', 'اسم الشركة (عربي)'], address: ['Address', 'العنوان'], phone: ['Phone', 'الهاتف'], email: ['Email', 'البريد الإلكتروني'], cr: ['CR no.', 'السجل التجاري'] };

export const QR_KINDS = ['ref', 'url', 'json'];
export const DEFAULT_OPTS = { qrKind: 'url', scale: '1:10', tolerance: 0.5, titleBlock: true, qr: true, logo: true };
export const MAX_LOGO_BYTES = 240 * 1024;
const MAX_TEXT = 300;

const txt = (v, n = MAX_TEXT) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '');
const isImgSrc = (s) => typeof s === 'string' && (/^data:image\/(png|jpe?g|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/.test(s) || /^\/[A-Za-z0-9_./-]+$/.test(s) || /^blob:/.test(s)) && s.length <= MAX_LOGO_BYTES * 1.4;

export const emptyCompany = () => ({ name: '', nameAr: '', address: '', phone: '', email: '', cr: '', logo: '', logoMode: 'hub' });
export const emptyProject = () => PROJECT_FIELDS.reduce((o, k) => { o[k] = ''; return o; }, {});
export function cleanCompany(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const o = emptyCompany();
  COMPANY_FIELDS.forEach((k) => { o[k] = txt(r[k]); });
  o.logoMode = ['hub', 'upload', 'none'].includes(r.logoMode) ? r.logoMode : 'hub';
  o.logo = isImgSrc(r.logo) ? r.logo : '';
  if (o.logoMode === 'upload' && !o.logo) o.logoMode = 'hub';
  return o;
}
export function cleanProject(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const o = emptyProject();
  PROJECT_FIELDS.forEach((k) => { o[k] = txt(r[k], k === 'notes' || k === 'siteAddress' || k === 'materialSpec' ? 600 : MAX_TEXT); });
  return o;
}
export function cleanOpts(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const tol = Number(r.tolerance);
  return {
    // a saved 'ref' from before the Hub link existed is upgraded unless the user picked it afterwards (qrKindSet)
    qrKind: QR_KINDS.includes(r.qrKind) && (r.qrKind !== 'ref' || r.qrKindSet === true) ? r.qrKind : DEFAULT_OPTS.qrKind, qrKindSet: r.qrKindSet === true, scale: txt(r.scale, 12) || DEFAULT_OPTS.scale,
    tolerance: Number.isFinite(tol) ? Math.min(5, Math.max(0, Math.round(tol * 100) / 100)) : DEFAULT_OPTS.tolerance,
    titleBlock: r.titleBlock !== false, qr: r.qr !== false, logo: r.logo !== false,
  };
}

/* ---- storage ---- */
const ck = (user) => `neoCutList.company.v1.${user || 'anon'}`;
const pk = (product, title) => `neoCutList.project.v1.${product || 'kitchen'}.${String(title || '').slice(0, 60)}`;
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
export const loadCompany = (user) => cleanCompany(read(ck(user)));
export const saveCompany = (user, c) => write(ck(user), { ...cleanCompany(c), opts: (read(ck(user)) || {}).opts });
export const loadOpts = (user) => cleanOpts((read(ck(user)) || {}).opts);
export const saveOpts = (user, o) => { const c = read(ck(user)) || {}; return write(ck(user), { ...c, opts: cleanOpts(o) }); };
export const loadProjectLocal = (product, title) => cleanProject(read(pk(product, title)));
export const saveProjectLocal = (product, title, p) => write(pk(product, title), cleanProject(p));

/** what the Hub published about its brand (App.js), or the bundled logo */
export function hubBrand() {
  const b = (typeof window !== 'undefined' && window.__hubBrand) || {};
  const base = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL) || '';
  return { logo: isImgSrc(b.logoUrl) ? b.logoUrl : `${base}/brand/closets-logo-clear.png`, name: txt(b.name), nameAr: txt(b.nameAr), company: txt(b.company), fromHub: isImgSrc(b.logoUrl) };
}
/** the company as the documents print it: logo mode applied, name defaults to the Hub brand */
export function resolveCompany(c) {
  const co = cleanCompany(c); const hb = hubBrand();
  return {
    ...co, name: co.name || hb.company || hb.name || 'The Closets Co. W.L.L.', nameAr: co.nameAr || hb.nameAr || '',
    logo: co.logoMode === 'none' ? '' : co.logoMode === 'upload' && co.logo ? co.logo : hb.logo,
  };
}

/* ---- logo upload ---- */
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
/** File -> data URL, shrunk to <= 480 px wide (raster) and checked against MAX_LOGO_BYTES. Rejects with an Error whose message is an i18n key. */
export function fileToLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !LOGO_TYPES.includes(file.type)) { reject(new Error('type')); return; }
    if (file.size > 4 * 1024 * 1024) { reject(new Error('big')); return; }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('read'));
    fr.onload = () => {
      const url = String(fr.result);
      if (file.type === 'image/svg+xml') { (url.length <= MAX_LOGO_BYTES * 1.4 && !/<script/i.test(atobSafe(url)) ? resolve(url) : reject(new Error('big'))); return; }
      const img = new Image();
      img.onerror = () => reject(new Error('read'));
      img.onload = () => {
        const k = Math.min(1, 480 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        const out = file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.85);
        out.length <= MAX_LOGO_BYTES * 1.4 ? resolve(out) : reject(new Error('big'));
      };
      img.src = url;
    };
    fr.readAsDataURL(file);
  });
}
function atobSafe(u) { try { return atob(u.split(',')[1] || ''); } catch (e) { return ''; } }

/* ---- QR payload ---- */
export const refOf = (p) => p.orderNo || p.jobNo || p.project || 'NEO';
const safeOrigin = () => { try { const o = window.location.origin; return /^https?:\/\//.test(o) ? o : ''; } catch (e) { return ''; } };
/** The url kind is shortened to this many characters (all ASCII after percent-encoding = bytes) so a label QR stays at version <= 8 (49 modules)
 *  and scans from a phone at label size. clCodes.QR_MAX_BYTES (220) is the hard limit. */
export const URL_QR_TARGET = 150;
export const PART_ROUTE = '/#/neo-part';
const cutChars = (s, n) => Array.from(String(s == null ? '' : s)).slice(0, n).join('');
const refText = (ref, part) => ['NEO', ref, part ? part.pid : '', part && part.N > 1 ? `${part.n}/${part.N}` : ''].filter((x, i) => x || i < 2).join('|');
/** text for the QR of a part (part = { pid, n, N, dims, mat }) or of the whole document (part = null).
 *  url  : <origin>/#/neo-part?ref=..&part=..&n=..&N=..&d=LxWxT&pn=<project>&m=<material>   opens the NeoPartPage in the Hub (the origin is the page's own;
 *         no domain is hardcoded). Everything the page shows travels in the URL (no server lookup). ref / part / n / N / d are kept whole; the free-text
 *         pn (project name) and m (material) are shortened, longest first, until the URL fits URL_QR_TARGET. No origin (file://) -> the ref text.
 *  ref  : "NEO|<order|job|project>|<part id>|<n>/<N>"       a plain text reference any phone shows
 *  json : {"o":..,"p":..,"id":..,"n":"1/4","d":"L x W x T"}  compact JSON for scanners that parse it */
export function qrPayload(kind, project, part, origin = safeOrigin()) {
  const p = cleanProject(project); const ref = refOf(p);
  const k = QR_KINDS.includes(kind) ? kind : DEFAULT_OPTS.qrKind;
  const cap = (s) => { const b = String(s); return b.length > 200 ? b.slice(0, 200) : b; };
  if (k === 'url' && origin) {
    const enc = encodeURIComponent;
    const fixed = [`ref=${enc(cutChars(ref, 40))}`];
    if (part) {
      fixed.push(`part=${enc(cutChars(part.pid, 32))}`);
      if (part.N > 1) fixed.push(...(part.n ? [`n=${part.n}`] : []), `N=${part.N}`);
      if (part.dims) fixed.push(`d=${enc(cutChars(part.dims, 24))}`);
    }
    const free = [['pn', p.project && p.project !== ref ? p.project : ''], ['m', part && part.mat ? part.mat : '']].filter((x) => x[1]);
    const lens = free.map((x) => Array.from(x[1]).length);
    const build = () => `${origin}${PART_ROUTE}?` + fixed.concat(free.map((x, i) => (lens[i] > 0 ? `${x[0]}=${enc(cutChars(x[1], lens[i]))}` : ''))).filter(Boolean).join('&');
    let out = build();
    for (let guard = 0; guard < 600 && out.length > URL_QR_TARGET && lens.some((l) => l > 0); guard += 1) {
      const i = lens.indexOf(Math.max(...lens)); lens[i] = Math.max(0, lens[i] - (lens[i] > 8 ? 2 : 1)); out = build();
    }
    return out.length > 200 ? cap(refText(ref, part)) : out;   // a pathological origin / ids: never a truncated (broken) URL
  }
  if (k === 'json') {
    const o = { o: ref, p: p.project || undefined, ...(part ? { id: part.pid, n: part.N > 1 ? `${part.n}/${part.N}` : undefined, d: part.dims || undefined } : {}) };
    let s = JSON.stringify(o);
    if (s.length > 200) { delete o.d; s = JSON.stringify(o); }
    if (s.length > 200) { delete o.p; s = JSON.stringify(o); }
    return cap(s);
  }
  return cap(refText(ref, part));
}

/** project JSON <-> settings: the shape stored under `docInfo` */
export const packDocInfo = (project, opts) => ({ project: cleanProject(project), opts: cleanOpts(opts) });
export const unpackDocInfo = (raw) => ({ project: cleanProject(raw && raw.project), opts: cleanOpts(raw && raw.opts) });
export const projectFilled = (p) => PROJECT_FIELDS.some((k) => String(p[k] || '').trim());
export const todayIso = () => new Date().toISOString().slice(0, 10);

/** [[label, value]] of the filled project fields, for the Excel cover sheet */
export const projectRows = (project, ar = false) => PROJECT_FIELDS.filter((k) => String(project[k] || '').trim()).map((k) => [PROJECT_LABELS[k][ar ? 1 : 0], project[k]]);
