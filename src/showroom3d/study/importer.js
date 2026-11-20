/* Study IMPORT: turns the owner's study file into the content model, on the owner's device. The file is never uploaded and never part of the repository.
 *   - a JSON bundle (what Export writes) goes through store.parseBundle();
 *   - an HTML file is parsed with DOMParser into an INERT document (no script runs, no image loads, no stylesheet applies) and only TEXT is read from it:
 *     scripts, styles, event-handler attributes, iframes, forms, links and images are never copied. Chart numbers are read from `new Chart(...)` calls in the
 *     page's scripts by a literal-only tokenizer (quoted strings and numbers): the script text is never evaluated.
 *   Everything then goes through sanitizeStudy(), the same gate as every other source. The report says what was mapped and what was not. */
import { sanitizeStudy, uid } from './model';
import { parseBundle } from './store';

export const MAX_HTML = 3 * 1024 * 1024;
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'IMG', 'PICTURE', 'VIDEO', 'AUDIO', 'CANVAS', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'FORM', 'NAV', 'HEADER', 'FOOTER', 'HEAD', 'META', 'LINK', 'BASE']);
const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const txt = (el) => norm(el.textContent);

/** literal-only tokenizer: quoted strings and numbers of a JS array literal body. Never evaluates anything. */
export function literalItems(src) {
  const out = []; const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?)/g; let m;
  while ((m = re.exec(src))) out.push(m[3] !== undefined ? Number(m[3]) : (m[1] !== undefined ? m[1] : m[2]).replace(/\\(.)/g, '$1'));
  return out;
}
const arrayAfter = (s, key, from = 0) => { const i = s.indexOf(key, from); if (i < 0) return null; const a = s.indexOf('[', i); if (a < 0) return null; let d = 0; for (let k = a; k < s.length && k < a + 20000; k++) { if (s[k] === '[') d++; else if (s[k] === ']' && --d === 0) return { body: s.slice(a + 1, k), end: k }; } return null; };

/** { canvasId: { kind, labels, series } } read from `new Chart(document.getElementById('id'), { type, data: { labels, datasets } })` */
export function chartsFromScripts(scriptText) {
  const out = {}; const re = /new\s+Chart\(\s*document\.getElementById\(\s*['"]([\w-]+)['"]\s*\)\s*,/g; let m; const starts = [];
  while ((m = re.exec(scriptText))) starts.push({ id: m[1], at: m.index });
  starts.forEach((c, i) => {
    const seg = scriptText.slice(c.at, i + 1 < starts.length ? starts[i + 1].at : c.at + 12000);
    const type = (/type:\s*['"](\w+)['"]/.exec(seg) || [])[1] || 'bar', horiz = /indexAxis:\s*['"]y['"]/.test(seg);
    const lab = arrayAfter(seg, 'labels:'); if (!lab) return;
    const labels = literalItems(lab.body).map(String), series = []; let pos = lab.end;
    for (;;) {
      const di = seg.indexOf('data:', pos); if (di < 0) break; const arr = arrayAfter(seg, 'data:', pos); if (!arr) break;
      const before = seg.slice(Math.max(pos, di - 300), di); const nm = [...before.matchAll(/label:\s*['"]((?:[^'"\\]|\\.)*)['"]/g)].pop(); const ty = [...before.matchAll(/type:\s*['"](\w+)['"]/g)].pop();
      series.push({ name: nm ? nm[1] : '', values: literalItems(arr.body).filter((v) => typeof v === 'number'), line: !!(ty && ty[1] === 'line') }); pos = arr.end;
    }
    if (!series.length) return;
    out[c.id] = { kind: type === 'doughnut' || type === 'pie' ? 'donut' : series.some((s) => s.line) ? 'combo' : horiz ? 'hbar' : type === 'line' ? 'combo' : 'bar', labels, series };
  });
  return out;
}

function tableBlock(t) {
  const rows = [...t.querySelectorAll('tr')].map((tr) => [...tr.children].filter((c) => c.tagName === 'TD' || c.tagName === 'TH').map(txt)).filter((r) => r.some(Boolean)); if (!rows.length) return null;
  const hasTh = !!t.querySelector('th') || !!t.querySelector('thead'); const head = hasTh ? rows.shift() : [];
  return rows.length || head.length ? { id: uid('b'), type: 'table', head, rows: rows.length ? rows : [head.map(() => '')] } : null;
}
/** @returns {{ok, study, images, errors, warnings, report}} */
export function importStudyFile(text, env = {}) {
  const P = env.DOMParser || (typeof DOMParser !== 'undefined' ? DOMParser : null);
  const s = typeof text === 'string' ? text : '';
  if (!s.trim()) return { ok: false, study: null, images: {}, errors: ['The file is empty.'], warnings: [], report: null };
  if (s.trimStart().startsWith('{')) { const r = parseBundle(s); return { ...r, report: r.ok ? { source: 'bundle', sections: r.study.sections.length, notMapped: [] } : null }; }
  if (s.length > MAX_HTML) return { ok: false, study: null, images: {}, errors: [`The file is too large (${Math.round(s.length / 1024)} KB; the limit is ${MAX_HTML / 1024} KB).`], warnings: [], report: null };
  if (!P) return { ok: false, study: null, images: {}, errors: ['This browser cannot read HTML files.'], warnings: [], report: null };
  let doc; try { doc = new P().parseFromString(s, 'text/html'); } catch (e) { return { ok: false, study: null, images: {}, errors: ['The file could not be read.'], warnings: [], report: null }; }
  const scripts = [...doc.querySelectorAll('script')].map((x) => x.textContent || '').join('\n'), charts = chartsFromScripts(scripts);
  const notMapped = []; const names = [...scripts.matchAll(/\bconst\s+(\w+)\s*=\s*[[{]/g)].map((m) => m[1]).filter((n) => !/^(EXCHANGE_RATE)$/.test(n));
  if (names.length) notMapped.push(`Interactive data held inside the page's scripts (${names.slice(0, 8).join(', ')}${names.length > 8 ? ', ...' : ''}) is not imported; the scripts were discarded. Add that content in edit mode.`);
  const imgs = doc.querySelectorAll('img').length; if (imgs) notMapped.push(`${imgs} image reference(s) were not imported (images stay on the device they were uploaded on). Upload them in edit mode.`);
  if (doc.querySelector('canvas') && !Object.keys(charts).length) notMapped.push('Charts were found but their numbers could not be read; re-enter them in edit mode.');
  const rep = { source: 'html', sections: 0, tables: 0, charts: 0, paragraphs: 0, lists: 0, notMapped };
  const root = doc.body || doc.documentElement;
  let secEls = [...root.querySelectorAll('section')].filter((x) => !x.parentElement.closest('section') && txt(x).length > 20);
  if (!secEls.length) secEls = [root];
  const sections = [];
  secEls.forEach((el, i) => {
    const h = el.querySelector('h2') || el.querySelector('h1') || el.querySelector('h3'); const title = h ? txt(h) : (i === 0 ? 'Study' : `Section ${i + 1}`); const part = /(^|\s)hidden(\s|$)/.test(el.getAttribute('class') || '') ? 'full' : 'dashboard';
    const blocks = []; let pend = '', lead = '';
    const walk = (n) => {
      for (const c of [...n.children]) {
        if (SKIP.has(c.tagName.toUpperCase())) { if (c.tagName === 'CANVAS' && c.id && charts[c.id]) { const ch = charts[c.id]; blocks.push({ id: uid('b'), type: 'chart', title: pend, kind: ch.kind, labels: ch.labels, series: ch.series }); pend = ''; rep.charts++; } continue; }
        if (c === h) continue;
        if (/^H[1-6]$/.test(c.tagName)) { pend = txt(c); continue; }
        if (c.tagName === 'TABLE') { const b = tableBlock(c); if (b) { if (pend) b.title = pend; pend = ''; blocks.push(b); rep.tables++; } continue; }
        if (c.tagName === 'UL' || c.tagName === 'OL') { const items = [...c.children].map(txt).filter(Boolean); if (items.length) { blocks.push({ id: uid('b'), type: 'bullets', title: pend, items, ordered: c.tagName === 'OL' }); pend = ''; rep.lists++; } continue; }
        if (!c.querySelector('canvas,table,ul,ol,p,h1,h2,h3,h4,h5,div,section,li')) { const t = txt(c); if (t.length >= 3) { if (!lead && c.tagName === 'P' && !blocks.length) lead = t; else { blocks.push({ id: uid('b'), type: 'paragraph', text: t }); rep.paragraphs++; } } continue; }
        walk(c);
      }
    };
    walk(el);
    if (blocks.length || lead) sections.push({ id: (el.id || 's' + (i + 1)).toLowerCase(), part, title, lead, blocks });
  });
  rep.sections = sections.length;
  const h1 = doc.querySelector('h1'), dt = doc.querySelector('title');
  const raw = { id: 'imported-study', title: norm(h1 ? txt(h1) : dt ? dt.textContent : '') || 'Imported study', subtitle: (sections[0] && sections[0].lead) || '', sections };
  if (!sections.length) return { ok: false, study: null, images: {}, errors: ['No readable sections were found in this file.'], warnings: [], report: rep };
  const r = sanitizeStudy(raw); return { ok: r.ok, study: r.study, images: {}, errors: r.errors, warnings: r.warnings, report: rep };
}
