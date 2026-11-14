/* [GLASS 2026-11-14] The finished-projects strip on the home page: the company's real projects, shown like a strip of film.
 *   · one large frosted stage with the chosen project's picture, its name, its category and (when the row has one) its location
 *   · under it a strip of every project; choosing a frame cross-fades the stage. Arrows on the stage and the arrow keys do the same.
 *   · a button to the full Projects page
 * The rows are the same ones the Projects page reads (website_projects); they are handed in through `load`, so this file knows nothing
 * about the database. Nothing is made up here: a project without a picture is left out, a picture that fails to load is dropped, and
 * when there is nothing to show (no rows, or the request failed) the whole section renders nothing at all.
 * Colours are the site's tokens; motion stops for reduced-motion visitors. */
import React, { useEffect, useRef, useState } from 'react';

/** the picture a project leads with: the same order the home gallery uses */
export const picOf = (p) => (p && (p.cover_url || p.after_url)) || '';
/** a row's own Arabic text when it has one, else the text as stored */
const txt = (p, f, ar) => String((ar && p[f + '_ar']) || p[f] || '').trim();
/** category values are stored in English; these are the Projects page's own translation keys for them */
const CAT_KEYS = { 'Kitchens': 'swPortCatKitchens', 'Wardrobes': 'swPortCatWardrobes', 'Walk-In Closets': 'swPortCatWalkin', 'TV Units': 'swPortCatTv', 'Doors': 'swPortCatDoors', 'Storage Solutions': 'swPortCatStorage', 'Office Furniture': 'swPortCatOffice' };
const two = (n) => String(n).padStart(2, '0');

export default function ProjectStrip({ load, ar = false, t = null, onAll, testid = 'project-strip' }) {
  const [rows, setRows] = useState([]);
  const [bad, setBad] = useState({});                  // pictures that failed to load, by project id
  const [selId, setSelId] = useState(null); const [prevId, setPrevId] = useState(null);
  const track = useRef(null);
  useEffect(() => {
    let live = true;
    if (typeof load !== 'function') return undefined;
    Promise.resolve().then(load).then((d) => { if (live && Array.isArray(d)) setRows(d); }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = rows.filter((p) => p && p.id != null && picOf(p) && !bad[p.id]);
  const at = Math.max(0, list.findIndex((p) => p.id === selId));
  const cur = list[at];
  // keep the chosen frame in view inside the strip (sideways only: the page itself never jumps)
  useEffect(() => {
    const box = track.current; if (!box || selId == null) return;
    const el = box.querySelector('[aria-selected="true"]'); if (!el || !box.scrollBy) return;
    const a = el.getBoundingClientRect(); const b = box.getBoundingClientRect();
    const calm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollBy({ left: (a.left + a.width / 2) - (b.left + b.width / 2), behavior: calm ? 'auto' : 'smooth' });
  }, [selId]);
  if (!cur) return null;
  const prev = list.find((p) => p.id === prevId && p.id !== cur.id) || null;
  const pick = (i) => { const n = list[(i + list.length) % list.length]; if (!n || n.id === cur.id) return; setPrevId(cur.id); setSelId(n.id); };
  const drop = (id) => setBad((b) => ({ ...b, [id]: true }));
  const keys = (e) => { const fwd = ar ? 'ArrowLeft' : 'ArrowRight'; const back = ar ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) { e.preventDefault(); pick(at + 1); } else if (e.key === back) { e.preventDefault(); pick(at - 1); } };
  const cat = (p) => { const c = txt(p, 'category', ar); const k = CAT_KEYS[p.category]; return ar && !p.category_ar && k && t ? t(k) : c; };
  const name = txt(cur, 'name', ar); const place = txt(cur, 'location', ar); const many = list.length > 1;
  const L = ar
    ? { eyebrow: 'مشاريع منجزة', title: 'أعمالنا، لقطة بلقطة.', all: '← شاهد كل المشاريع', strip: 'المشاريع المنجزة', prev: 'المشروع السابق', next: 'المشروع التالي' }
    : { eyebrow: 'Finished projects', title: 'Our work, frame by frame.', all: 'See all projects →', strip: 'Finished projects', prev: 'Previous project', next: 'Next project' };
  return (
    <section className="gps" dir={ar ? 'rtl' : 'ltr'} data-testid={testid} aria-label={L.strip}>
      <style>{CSS}</style>
      <div className="gps-head rv">
        <div>
          <div className="eyebrow">{L.eyebrow}</div>
          <h2 className="display">{L.title}</h2>
        </div>
        {onAll ? <button type="button" className="btn-line" onClick={onAll} data-testid={testid + '-all'}>{L.all}</button> : null}
      </div>
      <div className="gps-body rv">
        <figure className="gps-stage">
          <div className="gps-frame">
            {prev ? <img key={'p' + prev.id} className="gps-pic" src={picOf(prev)} alt="" aria-hidden="true" /> : null}
            <img key={cur.id} className="gps-pic in" src={picOf(cur)} alt={name} onError={() => drop(cur.id)} />
            {many ? <span className="gps-count" dir="ltr" aria-hidden="true">{two(at + 1)} / {two(list.length)}</span> : null}
            {many ? <button type="button" className="gps-nav gps-prev" aria-label={L.prev} onClick={() => pick(at - 1)} data-testid={testid + '-prev'}><i /></button> : null}
            {many ? <button type="button" className="gps-nav gps-next" aria-label={L.next} onClick={() => pick(at + 1)} data-testid={testid + '-next'}><i /></button> : null}
          </div>
          <figcaption className="gps-cap" key={cur.id} aria-live="polite">
            {cat(cur) ? <span className="gps-cat">{cat(cur)}</span> : null}
            {name ? <h3 className="display">{name}</h3> : null}
            {place ? <p>{place}</p> : null}
          </figcaption>
        </figure>
        {many ? (
          <div className="gps-film">
            <div className="gps-track" ref={track} role="listbox" aria-label={L.strip} aria-orientation="horizontal" onKeyDown={keys}>{list.map((p, i) => (
              <button key={p.id} type="button" role="option" aria-selected={i === at} className={i === at ? 'on' : ''} onClick={() => pick(i)} data-testid={testid + '-pick-' + p.id}>
                <span className="gps-th"><img src={picOf(p)} alt="" loading="lazy" onError={() => drop(p.id)} /><b dir="ltr" aria-hidden="true">{two(i + 1)}</b></span>
                <span className="gps-name">{txt(p, 'name', ar)}</span>
              </button>))}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const CSS = `
.gps{max-width:1280px;margin:0 auto;padding:80px 48px}
.gps-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-block-end:28px}
.gps-head .eyebrow{margin-block-end:14px}
.gps-head h2{font-size:42px;color:var(--ink)}
.gps-body{display:grid;gap:14px;min-width:0}
.gps-stage{position:relative;margin:0;padding:10px;border-radius:26px;border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);background:color-mix(in srgb,#fff 56%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);box-shadow:var(--shadow,0 24px 60px -32px color-mix(in srgb,var(--ink) 55%,transparent))}
.gps-frame{position:relative;overflow:hidden;border-radius:18px;background:var(--sand);aspect-ratio:16/9;max-height:640px;width:100%;line-height:0}
.gps-pic{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover}
.gps-pic.in{animation:gpsFade .7s ease both}
.gps-count{position:absolute;inset-block-start:14px;inset-inline-end:14px;padding:5px 12px;border-radius:999px;background:color-mix(in srgb,var(--ink) 62%,transparent);color:#fff;font-size:12px;font-weight:600;line-height:1.4;letter-spacing:.08em;font-variant-numeric:tabular-nums;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.gps-nav{position:absolute;inset-block-start:50%;transform:translateY(-50%);display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:50%;border:1px solid color-mix(in srgb,#fff 55%,transparent);background:color-mix(in srgb,#fff 62%,transparent);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);color:var(--ink);cursor:pointer;transition:background-color .2s ease,transform .2s ease}
.gps-nav:hover{background:#fff}.gps-nav:active{transform:translateY(-50%) scale(.95)}
.gps-prev{inset-inline-start:14px}.gps-next{inset-inline-end:14px}
.gps-nav i{display:block;width:9px;height:9px;border-block-start:2px solid currentColor;border-inline-end:2px solid currentColor;transform:translateX(-2px) rotate(45deg)}
.gps-prev i{transform:translateX(2px) rotate(-135deg)}
[dir="rtl"] .gps-next i{transform:translateX(2px) rotate(-45deg)}[dir="rtl"] .gps-prev i{transform:translateX(-2px) rotate(135deg)}
.gps-nav:focus-visible,.gps-track button:focus-visible{outline:2px solid var(--clay);outline-offset:2px}
.gps-cap{position:absolute;inset-block-end:24px;inset-inline-start:24px;max-width:min(440px,calc(100% - 48px));display:grid;gap:6px;padding:16px 20px;border-radius:16px;border:1px solid color-mix(in srgb,var(--ink) 10%,transparent);background:color-mix(in srgb,#fff 78%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);box-shadow:0 14px 34px -16px color-mix(in srgb,var(--ink) 60%,transparent);text-align:start;animation:gpsRise .5s cubic-bezier(.2,.7,.2,1) both}
.gps-cat{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--clay);line-height:1.4}
[dir="rtl"] .gps-cat{letter-spacing:0;font-size:13px}
.gps-cap h3{margin:0;font-size:24px;color:var(--ink);line-height:1.2;overflow-wrap:anywhere}
.gps-cap p{margin:0;font-size:13.5px;color:var(--ink-soft);line-height:1.5}
/* the strip: a frosted band with a row of sprocket holes along each edge */
.gps-film{position:relative;border-radius:18px;border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);background-color:color-mix(in srgb,#fff 52%,transparent);background-image:repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 14%,transparent) 0 9px,transparent 9px 22px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 14%,transparent) 0 9px,transparent 9px 22px);background-size:calc(100% - 28px) 5px,calc(100% - 28px) 5px;background-position:14px 7px,14px calc(100% - 7px);background-repeat:no-repeat;-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);min-width:0}
.gps-track{display:flex;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;padding:18px 10px;scroll-snap-type:x proximity;scroll-padding-inline:10px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.gps-track button{flex:0 0 auto;display:grid;gap:6px;width:156px;padding:6px 6px 8px;border:1.5px solid transparent;border-radius:13px;background:transparent;cursor:pointer;font:inherit;color:var(--ink-soft);text-align:center;scroll-snap-align:start;transition:background-color .2s ease,border-color .2s ease,transform .2s ease}
.gps-track button:hover{background:color-mix(in srgb,#fff 70%,transparent)}.gps-track button:active{transform:scale(.98)}
.gps-track button.on{border-color:var(--clay);background:#fff;color:var(--ink)}
.gps-th{position:relative;display:block;height:92px;border-radius:9px;overflow:hidden;background:var(--sand);line-height:0}
.gps-th img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.2,.7,.2,1)}
.gps-track button:hover .gps-th img{transform:scale(1.05)}
.gps-th b{position:absolute;inset-block-start:6px;inset-inline-start:6px;padding:2px 7px;border-radius:999px;background:color-mix(in srgb,var(--ink) 60%,transparent);color:#fff;font-size:10.5px;font-weight:600;line-height:1.5;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.gps-name{display:block;font-size:12.5px;font-weight:600;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (max-width:767px){
.gps{padding:48px 24px}
.gps-head h2{font-size:28px}
.gps-stage{padding:8px;border-radius:22px;display:grid;gap:8px}
.gps-frame{aspect-ratio:4/3;border-radius:15px}
.gps-cap{position:static;max-width:none;padding:12px 14px;border-radius:14px;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.gps-cap h3{font-size:20px}
.gps-nav{width:40px;height:40px}.gps-prev{inset-inline-start:10px}.gps-next{inset-inline-end:10px}
.gps-track{scroll-snap-type:x mandatory}
.gps-track button{width:132px}.gps-th{height:80px}
}
@keyframes gpsFade{from{opacity:0;transform:scale(1.02)}}
@keyframes gpsRise{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion:reduce){.gps *{animation:none!important;transition:none!important}}
`;
