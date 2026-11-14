/* [GLASS 2026-11-14] The site-wide "glass" layer (stage 1 of the new look).
 * What it adds, on every page, without touching any page's content:
 *   · an ambient backdrop behind the whole site: warm drifting light, plus the open page's own hero picture, heavily blurred, cross-fading as you move
 *   · frosted surfaces: cards (.lift, .gl-card and the tiles of a .reveal-stagger grid), bands (.gl-band), the footer (.gl-foot), fields (.inp) and the top bar sit on the backdrop like glass
 *   · motion: a page rises into place piece by piece when you arrive, and sections sharpen as they scroll into view
 * It is one switch: remove <GlassLayer /> from App.js (or set GLASS_ON to false) and the site is exactly as before.
 * Colours come from the site's own tokens (--cream, --clay, --ink, --line). All motion stops for visitors who ask for reduced motion. */
import React, { useEffect, useRef, useState } from 'react';

export const GLASS_ON = true;

/** the picture a page leads with: the first inline background image, else the first large image near the top. '' when there is none. */
export function heroOf(doc) {
  try {
    const withBg = Array.from(doc.querySelectorAll('section[style*="url("], header[style*="url("], div[style*="url("]')).find((n) => { const r = n.getBoundingClientRect(); return r.width >= 320 && r.height >= 200 && r.top < 900; });
    if (withBg) { const all = String(withBg.style.backgroundImage || '').match(/url\((['"]?)(.*?)\1\)/g) || []; const last = all.length ? /url\((['"]?)(.*?)\1\)/.exec(all[all.length - 1]) : null; if (last && last[2] && !/^data:image\/svg/.test(last[2])) return last[2]; }
    const img = Array.from(doc.querySelectorAll('img')).find((n) => { const r = n.getBoundingClientRect(); return r.width >= 320 && r.height >= 200 && r.top < 900 && n.currentSrc; });
    return img ? img.currentSrc : '';
  } catch (e) { return ''; }
}

export default function GlassLayer({ page }) {
  const [pics, setPics] = useState(['', '']);          // two layers, so one fades out while the other fades in
  const [top, setTop] = useState(0);
  const last = useRef('');
  useEffect(() => {
    if (!GLASS_ON) return undefined;
    const root = document.documentElement; root.classList.add('glassy');
    return () => { root.classList.remove('glassy', 'glass-enter'); };
  }, []);
  // arriving on a page: play the entrance once, then read the page's hero picture for the backdrop
  useEffect(() => {
    if (!GLASS_ON) return undefined;
    const root = document.documentElement; root.classList.remove('glass-enter');
    const raf = window.requestAnimationFrame(() => root.classList.add('glass-enter'));
    const done = window.setTimeout(() => root.classList.remove('glass-enter'), 1400);
    const read = window.setTimeout(() => { const src = heroOf(document); if (src === last.current) return; last.current = src; setTop((t) => { const n = t ? 0 : 1; setPics((p) => { const q = p.slice(); q[n] = src; return q; }); return n; }); }, 420);
    return () => { window.cancelAnimationFrame(raf); window.clearTimeout(done); window.clearTimeout(read); };
  }, [page]);
  if (!GLASS_ON) return null;
  return (
    <div className="glass-back" aria-hidden="true" data-testid="glass-back">
      <style>{CSS}</style>
      <i className="gl-a" /><i className="gl-b" />
      {pics.map((src, i) => (src ? <img key={i + src} src={src} alt="" className={i === top ? 'on' : ''} decoding="async" /> : null))}
    </div>
  );
}

const CSS = `
html.glassy{background:var(--cream)}
html.glassy body{background:transparent}
/* the pages paint their own cream sheet: let the backdrop show through it */
html.glassy div[style*="min-height: 100dvh"][style*="var(--cream)"]{background:transparent!important}
.glass-back{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:var(--cream)}
.glass-back i{position:absolute;display:block;border-radius:50%;filter:blur(90px);will-change:transform}
.glass-back .gl-a{width:60vmax;height:60vmax;inset-block-start:-22vmax;inset-inline-start:-16vmax;background:color-mix(in srgb,var(--clay) 16%,transparent);animation:glassDriftA 26s ease-in-out infinite alternate}
.glass-back .gl-b{width:52vmax;height:52vmax;inset-block-end:-20vmax;inset-inline-end:-14vmax;background:color-mix(in srgb,var(--ink) 9%,transparent);animation:glassDriftB 32s ease-in-out infinite alternate}
/* the hero picture is drawn small and scaled up, so the blur stays cheap on phones */
.glass-back img{position:absolute;inset-block-start:0;inset-inline-start:0;width:25%;height:25%;object-fit:cover;transform:scale(4.2);transform-origin:0 0;filter:blur(16px) saturate(1.15);opacity:0;transition:opacity 1.1s ease}
[dir="rtl"] .glass-back img{transform-origin:100% 0}
.glass-back img.on{opacity:.26}
/* frosted surfaces */
html.glassy .lift,html.glassy .reveal-stagger>*{background-color:color-mix(in srgb,#fff 58%,transparent)!important;-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);border-color:color-mix(in srgb,var(--ink) 9%,transparent)}
/* [GLASS pages] the same frost for the cards and panels of the inner pages (class gl-card), the portfolio cards, the full-width white / sand bands (gl-band) and the footer (gl-foot).
   background-color only, so a card that carries a picture keeps it; gl-plain drops a decorative gradient so the frost shows. Bands and footer sit straight on the already-blurred backdrop, so they need no blur of their own. */
html.glassy .gl-card,html.glassy .pf-card{background-color:color-mix(in srgb,#fff 58%,transparent)!important;-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);border-color:color-mix(in srgb,var(--ink) 9%,transparent)}
html.glassy .gl-plain{background-image:none!important}
html.glassy .gl-band{background-color:color-mix(in srgb,#fff 46%,transparent)!important}
html.glassy .gl-band[style*="var(--sand)"]{background-color:color-mix(in srgb,var(--sand) 58%,transparent)!important}
html.glassy .gl-foot{background-color:color-mix(in srgb,var(--sand) 66%,transparent)!important}
html.glassy .inp{background-color:color-mix(in srgb,#fff 66%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
html.glassy .btn-clay,html.glassy .btn,html.glassy .btn-secondary,html.glassy .btn-line{transition:transform .18s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease,background-color .2s ease}
html.glassy .btn-clay:active,html.glassy .btn:active,html.glassy .btn-secondary:active,html.glassy .btn-line:active{transform:translateY(1px) scale(.985)}
/* sections sharpen as they come into view */
html.glassy .reveal,html.glassy .rv{filter:blur(7px);transition:opacity .7s cubic-bezier(.22,.61,.36,1),transform .7s cubic-bezier(.22,.61,.36,1),filter .7s ease}
html.glassy .reveal.vis,html.glassy .reveal.in,html.glassy .rv.vis,html.glassy .rv.in{filter:none}
/* arriving on a page: its blocks rise into place one after another */
html.glass-enter div[style*="min-height: 100dvh"]>*{animation:glassRise .7s cubic-bezier(.2,.7,.2,1) both}
html.glass-enter div[style*="min-height: 100dvh"]>*:nth-child(2){animation-delay:.07s}
html.glass-enter div[style*="min-height: 100dvh"]>*:nth-child(3){animation-delay:.14s}
html.glass-enter div[style*="min-height: 100dvh"]>*:nth-child(4){animation-delay:.21s}
html.glass-enter div[style*="min-height: 100dvh"]>*:nth-child(n+5){animation-delay:.28s}
@keyframes glassRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes glassDriftA{to{transform:translate(9vmax,6vmax) scale(1.12)}}
@keyframes glassDriftB{to{transform:translate(-8vmax,-5vmax) scale(1.1)}}
@media (prefers-reduced-motion:reduce){.glass-back i{animation:none}.glass-back img{transition:none}html.glass-enter div[style*="min-height: 100dvh"]>*{animation:none}html.glassy .reveal,html.glassy .rv{filter:none;transition:none}}
@media print{.glass-back{display:none}}
`;
