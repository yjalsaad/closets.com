/* [GLASS 2026-11-14] A figure on a glass tile (the home page's row of four numbers).
 *   · the number counts up once, the first time the tile scrolls into view
 *   · a thin arc sweeps in above it. Only a real percentage (suffix "%") fills in proportion to its value, over a faint track;
 *     every other figure gets a decorative sweep with no track, so it never suggests "so much out of so much"
 *   · the final value is what is announced (aria-label); the moving digits are hidden from assistive tech
 *   · the final width is reserved from the first paint, so nothing shifts while it counts
 * Same props as the old Stat: to, suffix, label. The values are whatever the caller passes: nothing is invented here.
 * No IntersectionObserver, or a visitor who asks for reduced motion: the final value is shown at once.
 * Colours are the site's tokens. */
import React, { useEffect, useId, useRef, useState } from 'react';

const DUR = 1500;
const calm = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
const canWatch = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function' && typeof window.requestAnimationFrame === 'function';
const hasRtl = (s) => /[֐-ࣿיִ-ﻼ]/.test(String(s));

export default function GlassStat({ to, suffix = '', label, fill }) {
  const end = Number(to) || 0;
  const ref = useRef(null); const started = useRef(false);
  const [still] = useState(() => !canWatch() || calm());      // nothing to animate: show the end state from the first paint
  const [v, setV] = useState(still ? end : 0);
  const [on, setOn] = useState(still);
  const gid = 'gst' + useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    if (still) { setV(end); return undefined; }
    const el = ref.current; if (!el) return undefined;
    let raf = 0; let heard = false; let obs = null;
    const finish = () => { started.current = true; setV(end); setOn(true); };
    const run = () => {
      if (started.current) return; started.current = true; setOn(true);
      const t0 = performance.now();
      const tick = (t) => { const p = Math.min(1, Math.max(0, (t - t0) / DUR)); setV(Math.round(end * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = window.requestAnimationFrame(tick); };
      raf = window.requestAnimationFrame(tick);
    };
    try {
      obs = new window.IntersectionObserver((es) => { heard = true; es.forEach((e) => { if (e.isIntersecting) run(); }); }, { threshold: 0.4 });
      obs.observe(el);
    } catch (e) { finish(); }
    // a real observer always reports once, straight away. One that never does (a stub) would leave "0" on screen for good.
    const guard = window.setTimeout(() => { if (!heard && !started.current) finish(); }, 1200);
    return () => { window.clearTimeout(guard); window.cancelAnimationFrame(raf); if (obs && obs.disconnect) obs.disconnect(); };
  }, [end, still]);

  const sfx = String(suffix == null ? '' : suffix);
  const isPct = sfx.trim() === '%';
  const part = fill != null ? Math.min(1, Math.max(0, Number(fill) || 0)) : (isPct ? Math.min(1, Math.max(0, end / 100)) : null);
  const measured = part != null;
  const spoken = (String(end) + sfx).trim();
  // "10K+" and "100%" stay left-to-right inside an Arabic page; a suffix that is itself Arabic ("20 سنة") follows the page
  const dir = hasRtl(sfx) ? undefined : 'ltr';

  return (
    <div ref={ref} className={'gst' + (on ? ' on' : '') + (measured ? ' gst-m' : '')} data-testid="glass-stat">
      <style>{CSS}</style>
      <svg className="gst-arc" viewBox="0 0 120 22" width="120" height="22" aria-hidden="true" focusable="false">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--clay)" stopOpacity="0" /><stop offset=".55" stopColor="var(--clay)" stopOpacity=".55" /><stop offset="1" stopColor="var(--clay)" /></linearGradient></defs>
        {measured ? <path className="gst-track" d="M4 19 Q60 -11 116 19" pathLength="100" /> : null}
        <path className="gst-sweep" d="M4 19 Q60 -11 116 19" pathLength="100" stroke={measured ? 'var(--clay)' : 'url(#' + gid + ')'} style={{ '--gst-to': measured ? 100 - part * 100 : 0 }} />
        {measured ? null : <circle className="gst-dot" cx="116" cy="19" r="2.4" />}
      </svg>
      <div className="display stat-num gst-num" role="img" aria-label={spoken} dir={dir}>
        <span className="gst-digits" aria-hidden="true"><span className="gst-size">{end}</span><span className="gst-live">{v}</span></span>
        {sfx ? <span className="gst-sfx" aria-hidden="true">{sfx}</span> : null}
      </div>
      <div className="gst-label">{label}</div>
    </div>
  );
}

const CSS = `
.gst{position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;padding:18px 12px 20px;border-radius:20px;text-align:center;border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);background:color-mix(in srgb,#fff 58%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 70%,transparent),var(--shadow,0 14px 34px -22px rgba(20,16,12,.35))}
.gst-arc{display:block;flex:none;max-width:100%;overflow:visible;margin-bottom:6px}
[dir="rtl"] .gst-arc{transform:scaleX(-1)}
.gst-arc path{fill:none;stroke-width:2;stroke-linecap:round}
.gst-track{stroke:color-mix(in srgb,var(--ink) 12%,transparent)}
.gst-sweep{stroke-dasharray:100 100;stroke-dashoffset:100;opacity:0;transition:stroke-dashoffset 1.5s cubic-bezier(.22,.61,.36,1),opacity .3s ease}
.gst.on .gst-sweep{stroke-dashoffset:var(--gst-to,0);opacity:1}
.gst-dot{fill:var(--clay);opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.3);transition:opacity .35s ease 1.25s,transform .45s cubic-bezier(.2,.7,.2,1) 1.25s}
.gst.on .gst-dot{opacity:1;transform:none}
.gst:nth-child(2) .gst-sweep{transition-delay:.08s}.gst:nth-child(3) .gst-sweep{transition-delay:.16s}.gst:nth-child(4) .gst-sweep{transition-delay:.24s}
.gst-num{display:block;max-width:100%;font-size:clamp(38px,4.6vw,60px);line-height:1.1!important;color:var(--ink);font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1,"lnum" 1;white-space:nowrap;unicode-bidi:isolate}
.gst-digits{position:relative;display:inline-block}
.gst-size{visibility:hidden}
.gst-live{position:absolute;inset-block:0;inset-inline-end:0;text-align:end}
.gst-sfx{font-size:.56em;color:var(--clay);letter-spacing:0;white-space:pre}
.gst-label{margin-top:10px;font-size:13px;line-height:1.35;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);overflow-wrap:anywhere}
[dir="rtl"] .gst-label{letter-spacing:0;font-size:14px}
@media (max-width:520px){.gst{padding:16px 8px 16px;border-radius:18px}.gst-label{font-size:11.5px;letter-spacing:.09em}[dir="rtl"] .gst-label{font-size:13px}}
@media (prefers-reduced-motion:reduce){.gst *{transition:none!important;animation:none!important}}
@media print{.gst-sweep{stroke-dashoffset:var(--gst-to,0);opacity:1}.gst-dot{opacity:1;transform:none}}
`;
