import { useEffect } from 'react';
import { buildHead } from './routes';

/**
 * Tiny head manager (no react-helmet dependency; React 19 + a single <head> owner is all we need).
 * applyHead() is idempotent: it upserts every tag it owns and removes stale ones, so it is safe on every
 * route change AND it is what the prerender snapshots (the static HTML is whatever this wrote into <head>).
 */
function upsertMeta(doc, attr, key, content) {
  const sel = `meta[${attr}="${key}"]`;
  let el = doc.head.querySelector(sel);
  if (content == null || content === '') { if (el) el.remove(); return; }
  if (!el) { el = doc.createElement('meta'); el.setAttribute(attr, key); doc.head.appendChild(el); }
  el.setAttribute('content', content);
}

export function applyHead(head, doc) {
  doc = doc || (typeof document !== 'undefined' ? document : null);
  if (!doc || !head) return;
  const html = doc.documentElement;
  html.setAttribute('lang', head.lang);
  html.setAttribute('dir', head.lang === 'ar' ? 'rtl' : 'ltr');
  doc.title = head.title;
  upsertMeta(doc, 'name', 'description', head.description);
  upsertMeta(doc, 'name', 'robots', head.robots);
  // canonical
  let can = doc.head.querySelector('link[rel="canonical"]');
  if (!head.canonical) { if (can) can.remove(); }
  else { if (!can) { can = doc.createElement('link'); can.setAttribute('rel', 'canonical'); doc.head.appendChild(can); } can.setAttribute('href', head.canonical); }
  // hreflang alternates
  doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
  head.alternates.forEach((a) => {
    const l = doc.createElement('link'); l.setAttribute('rel', 'alternate'); l.setAttribute('hreflang', a.hreflang); l.setAttribute('href', a.href); l.setAttribute('data-seo', '1');
    doc.head.appendChild(l);
  });
  // Open Graph + Twitter
  const og = head.og;
  upsertMeta(doc, 'property', 'og:type', 'website');
  upsertMeta(doc, 'property', 'og:site_name', og.siteName);
  upsertMeta(doc, 'property', 'og:title', og.title);
  upsertMeta(doc, 'property', 'og:description', og.description);
  upsertMeta(doc, 'property', 'og:url', og.url);
  upsertMeta(doc, 'property', 'og:image', og.image);
  upsertMeta(doc, 'property', 'og:locale', og.locale);
  upsertMeta(doc, 'property', 'og:locale:alternate', og.localeAlt);
  upsertMeta(doc, 'name', 'twitter:card', 'summary_large_image');
  upsertMeta(doc, 'name', 'twitter:title', og.title);
  upsertMeta(doc, 'name', 'twitter:description', og.description);
  upsertMeta(doc, 'name', 'twitter:image', og.image);
  // JSON-LD: drop every previous block (including any static one) and write this route's graph
  doc.head.querySelectorAll('script[type="application/ld+json"]').forEach((n) => n.remove());
  if (head.jsonld) {
    const s = doc.createElement('script'); s.type = 'application/ld+json'; s.setAttribute('data-seo', '1');
    s.textContent = JSON.stringify(head.jsonld);
    doc.head.appendChild(s);
  }
}

/** page === null renders the NotFound head (noindex). */
export function useRouteHead(page, lang) {
  useEffect(() => { try { applyHead(buildHead(page, lang)); } catch (e) { /* non-DOM env */ } }, [page, lang]);
}
