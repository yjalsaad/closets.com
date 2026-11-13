/* [GLASS 2026-11-14] The type showcase (stage 2 of the new look): one large picture you can explore, instead of a grid of small cards.
 *   · the picture of the chosen type, with small dots on the things worth noticing; tap a dot to read the note
 *   · a glass panel beside it: name, what it is, its features, what it suits, and the button into the design studio
 *   · a strip of every type underneath; choosing one cross-fades the picture
 * The dots belong to OUR picture files: they are looked up by the picture's own path, so a picture replaced from the admin shows no dots
 * rather than dots in the wrong places. Colours are the site's tokens; motion stops for reduced-motion visitors. */
import React, { useEffect, useState } from 'react';

/** notes on our own pictures: x, y in percent of the picture */
export const SPOTS = {
  '/layouts/kitchen/single-wall.jpg': [{ x: 45, y: 39, en: 'Lighting under the wall units', ar: 'إضاءة تحت الخزائن العلوية' }, { x: 48, y: 72, en: 'Handleless drawer fronts', ar: 'واجهات أدراج بدون مقابض' }, { x: 67, y: 72, en: 'Built-in oven housing', ar: 'مكان مخصص للفرن' }, { x: 21, y: 22, en: 'Lit open niche', ar: 'رف مفتوح مضاء' }],
  '/layouts/kitchen/galley.jpg': [{ x: 12, y: 58, en: 'Stone worktop with an undermount sink', ar: 'سطح حجري مع حوض سفلي' }, { x: 65, y: 57, en: 'The hob faces the sink', ar: 'الموقد مقابل الحوض' }, { x: 85, y: 28, en: 'Wall units with lighting below', ar: 'خزائن علوية بإضاءة سفلية' }],
  '/layouts/kitchen/l-shape.jpg': [{ x: 64, y: 50, en: 'The corner is used, not wasted', ar: 'الزاوية مستغلة بالكامل' }, { x: 80, y: 55, en: 'Hob with the extractor above', ar: 'الموقد والشفاط فوقه' }, { x: 5, y: 45, en: 'Tall housing for oven and fridge', ar: 'عمود للفرن والثلاجة' }],
  '/layouts/kitchen/u-shape.jpg': [{ x: 36, y: 69, en: 'Built-in oven', ar: 'فرن مدمج' }, { x: 72, y: 56, en: 'Sink under the window', ar: 'الحوض تحت النافذة' }, { x: 9, y: 40, en: 'Lit display tower', ar: 'عمود عرض مضاء' }],
  '/layouts/kitchen/island.jpg': [{ x: 40, y: 62, en: 'Island with seating', ar: 'جزيرة مع جلسة' }, { x: 84, y: 50, en: 'Glass display cabinet with lighting', ar: 'خزانة عرض زجاجية مضاءة' }, { x: 50, y: 35, en: 'Handleless wall units', ar: 'خزائن علوية بدون مقابض' }],
  '/layouts/TV/floating.jpg': [{ x: 48, y: 78, en: 'Floating base cabinet', ar: 'قاعدة معلّقة' }, { x: 27, y: 35, en: 'Slatted wood panel', ar: 'لوح خشبي مضلّع' }, { x: 16, y: 35, en: 'Lit display shelves', ar: 'أرفف عرض مضاءة' }],
  '/layouts/TV/full-wall.jpg': [{ x: 15, y: 60, en: 'Tall display cabinets', ar: 'خزائن عرض طويلة' }, { x: 50, y: 52, en: 'Lit shelf above the screen', ar: 'رف مضاء فوق الشاشة' }, { x: 50, y: 82, en: 'Centre panel for the screen', ar: 'لوح وسطي للشاشة' }],
  '/layouts/TV/display-shelves.jpg': [{ x: 17, y: 45, en: 'Open display niches', ar: 'فتحات عرض مفتوحة' }, { x: 50, y: 95, en: 'Low storage base', ar: 'قاعدة تخزين منخفضة' }, { x: 90, y: 45, en: 'Slatted side panel', ar: 'لوح جانبي مضلّع' }],
  '/layouts/TV/fireplace.jpg': [{ x: 48, y: 74, en: 'Built-in electric fireplace', ar: 'مدفأة كهربائية مدمجة' }, { x: 40, y: 30, en: 'Stone-look panel behind the screen', ar: 'لوح بمظهر حجري خلف الشاشة' }, { x: 78, y: 45, en: 'Lit display shelves', ar: 'أرفف عرض مضاءة' }],
  '/layouts/TV/minimal.jpg': [{ x: 47, y: 30, en: 'Backlit wall panel', ar: 'لوح جداري بإضاءة خلفية' }, { x: 47, y: 72, en: 'Floating base with an open bay', ar: 'قاعدة معلّقة بفتحة مفتوحة' }],
  '/layouts/TV/storage-wall.jpg': [{ x: 92, y: 50, en: 'Full-height closed storage', ar: 'تخزين مغلق بكامل الارتفاع' }, { x: 48, y: 52, en: 'Framed recess for the screen, with lighting', ar: 'تجويف مؤطّر للشاشة مع إضاءة' }, { x: 12, y: 45, en: 'Open shelving', ar: 'أرفف مفتوحة' }],
  '/layouts/office/wall-storage.jpg': [{ x: 88, y: 50, en: 'Full-height cupboards', ar: 'خزائن بكامل الارتفاع' }, { x: 45, y: 72, en: 'Built-in desk', ar: 'مكتب مدمج' }, { x: 73, y: 84, en: 'Drawer stack', ar: 'مجموعة أدراج' }, { x: 25, y: 45, en: 'Lit open shelves', ar: 'أرفف مفتوحة مضاءة' }],
  '/layouts/office/corner.jpg': [{ x: 45, y: 65, en: 'Corner desk with two work sides', ar: 'مكتب زاوية بجهتي عمل' }, { x: 60, y: 40, en: 'Wall shelves with lighting', ar: 'أرفف جدارية مضاءة' }, { x: 20, y: 78, en: 'Drawers under the desk', ar: 'أدراج تحت المكتب' }],
  '/layouts/office/built-in.jpg': [{ x: 47, y: 82, en: 'Built-in desk', ar: 'مكتب مدمج' }, { x: 20, y: 50, en: 'Lit shelving on both sides', ar: 'أرفف مضاءة على الجانبين' }, { x: 87, y: 50, en: 'Slatted panel', ar: 'لوح مضلّع' }],
  '/layouts/office/storage-desk.jpg': [{ x: 12, y: 55, en: 'Full-height storage', ar: 'تخزين بكامل الارتفاع' }, { x: 60, y: 78, en: 'Desk nook', ar: 'ركن المكتب' }, { x: 60, y: 25, en: 'Lit shelves above the desk', ar: 'أرفف مضاءة فوق المكتب' }],
  '/layouts/office/minimal.jpg': [{ x: 35, y: 25, en: 'Floating shelves with lighting', ar: 'أرفف معلّقة مضاءة' }, { x: 40, y: 68, en: 'Wall-to-wall desk', ar: 'مكتب من الجدار إلى الجدار' }, { x: 66, y: 80, en: 'Drawer stack', ar: 'مجموعة أدراج' }],
  '/layouts/office/l-shaped.jpg': [{ x: 40, y: 70, en: 'L-shaped desk', ar: 'مكتب على شكل L' }, { x: 65, y: 35, en: 'Lit shelving', ar: 'أرفف مضاءة' }, { x: 88, y: 50, en: 'Tall cupboard', ar: 'خزانة طويلة' }],
};
export const spotsFor = (img) => SPOTS[String(img || '').split('?')[0]] || [];
const chipsOf = (t) => (Array.isArray(t.bullets) && t.bullets.length ? t.bullets : t.feats || t.chips || []).slice(0, 5);

export default function TypeShowcase({ types = [], ar = false, cta = '', onDesign, testid = 'type-showcase' }) {
  const [sel, setSel] = useState(0); const [open, setOpen] = useState(-1);
  const cur = types[Math.min(sel, types.length - 1)];
  useEffect(() => { if (open < 0) return undefined; const k = (e) => { if (e.key === 'Escape') setOpen(-1); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  if (!cur) return null;
  const spots = spotsFor(cur.img); const chips = chipsOf(cur);
  const pick = (i) => { setSel(i); setOpen(-1); };
  return (
    <div className="gts" data-testid={testid}>
      <style>{CSS}</style>
      <div className="gts-main">
        <div className="gts-stage" onClick={() => setOpen(-1)}>
          {cur.img ? <img key={cur.id} src={cur.img} alt={cur.name} loading="lazy" /> : <div className="gts-noimg" />}
          {spots.map((s, i) => { const on = open === i; const label = ar ? s.ar : s.en; return (
            <div key={cur.id + i} className={'gts-spot' + (on ? ' on' : '') + (s.x > 62 ? ' left' : '') + (s.y > 70 ? ' up' : '')} style={{ left: s.x + '%', top: s.y + '%', '--i': i }}>
              <button type="button" aria-expanded={on} aria-label={label} onClick={(e) => { e.stopPropagation(); setOpen(on ? -1 : i); }} onMouseEnter={() => setOpen(i)} data-testid={testid + '-spot-' + i}><i /></button>
              {on ? <span role="note">{label}</span> : null}
            </div>); })}
          {spots.length ? <small className="gts-hint">{ar ? 'اضغط على النقاط' : 'Tap the dots'}</small> : null}
        </div>
        <aside className="gts-info" key={cur.id}>
          <h3>{cur.name}</h3>
          {cur.sub ? <p className="gts-sub">{cur.sub}</p> : null}
          {cur.desc ? <p className="gts-desc">{cur.desc}</p> : null}
          {chips.length ? <ul>{chips.map((c) => <li key={c}>{c}</li>)}</ul> : null}
          {cur.best ? <p className="gts-best"><b>{ar ? 'يناسب' : 'Best for'}</b> {cur.best}</p> : null}
          {onDesign ? <button type="button" className="btn-clay" onClick={() => onDesign(cur)} data-testid={testid + '-cta'}>{cta}</button> : null}
        </aside>
      </div>
      <div className="gts-film" role="listbox" aria-label={ar ? 'الأنواع' : 'Types'}>{types.map((t, i) => (
        <button key={t.id} type="button" role="option" aria-selected={i === sel} className={i === sel ? 'on' : ''} onClick={() => pick(i)} data-testid={testid + '-pick-' + t.id}>
          {t.img ? <img src={t.img} alt="" loading="lazy" /> : null}<span>{t.name}</span></button>))}</div>
    </div>
  );
}

const CSS = `
.gts{display:grid;gap:14px}
.gts-main{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(260px,1fr);gap:14px;align-items:stretch}
@media (max-width:860px){.gts-main{grid-template-columns:minmax(0,1fr)}}
.gts-stage{position:relative;border-radius:20px;overflow:hidden;border:1px solid var(--line);background:var(--sand);box-shadow:var(--shadow);line-height:0}
.gts-stage>img{display:block;width:100%;height:auto;animation:gtsFade .6s ease both}
.gts-noimg{aspect-ratio:3/2;background:linear-gradient(135deg,var(--sand),var(--cream))}
.gts-spot{position:absolute;transform:translate(-50%,-50%);line-height:1.35;animation:gtsPop .45s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(.35s + var(--i)*.09s)}
.gts-spot button{display:grid;place-items:center;width:40px;height:40px;border:0;background:transparent;cursor:pointer;padding:0}
.gts-spot i{display:block;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 0 5px color-mix(in srgb,#fff 38%,transparent),0 2px 10px rgba(20,16,12,.45);transition:transform .2s ease,background-color .2s ease}
.gts-spot button:hover i,.gts-spot.on i{transform:scale(1.25);background:var(--clay)}
.gts-spot button:focus-visible{outline:2px solid #fff;outline-offset:-6px;border-radius:50%}
.gts-spot button::after{content:"";position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;opacity:0;animation:gtsPing 2.6s ease-out infinite;animation-delay:calc(1s + var(--i)*.4s);pointer-events:none}
.gts-spot span{position:absolute;inset-block-start:calc(50% + 16px);inset-inline-start:50%;min-width:150px;max-width:230px;padding:9px 12px;border-radius:12px;background:color-mix(in srgb,#fff 82%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);color:var(--ink);font-size:13px;font-weight:600;box-shadow:0 12px 30px -12px rgba(20,16,12,.45);border:1px solid color-mix(in srgb,var(--ink) 10%,transparent);animation:gtsNote .22s ease both;z-index:2}
.gts-spot.left span{inset-inline-start:auto;inset-inline-end:50%}
.gts-spot.up span{inset-block-start:auto;inset-block-end:calc(50% + 16px)}
.gts-hint{position:absolute;inset-block-end:10px;inset-inline-start:12px;padding:4px 10px;border-radius:999px;background:rgba(20,16,12,.55);color:#fff;font-size:11px;line-height:1.4;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);pointer-events:none}
.gts-info{display:flex;flex-direction:column;gap:10px;padding:22px;border-radius:20px;border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);background:color-mix(in srgb,#fff 60%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.25);backdrop-filter:blur(18px) saturate(1.25);box-shadow:var(--shadow);animation:gtsRise .5s cubic-bezier(.2,.7,.2,1) both}
.gts-info h3{font-size:24px;font-weight:700;color:var(--ink);letter-spacing:-.01em;line-height:1.15}
.gts-sub{font-size:14px;color:var(--muted)}.gts-desc{font-size:14px;color:var(--ink-soft);line-height:1.6}
.gts-info ul{display:flex;flex-wrap:wrap;gap:6px;list-style:none;padding:0}.gts-info li{font-size:12px;background:var(--sand);color:var(--ink-soft);border-radius:999px;padding:5px 11px}
.gts-best{font-size:13px;color:var(--ink-soft)}.gts-best b{color:var(--ink);font-weight:600}
.gts-info .btn-clay{margin-top:auto;align-self:flex-start}
.gts-film{display:flex;gap:8px;overflow-x:auto;padding:8px;border-radius:18px;border:1px solid color-mix(in srgb,var(--ink) 9%,transparent);background:color-mix(in srgb,#fff 52%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);scroll-snap-type:x proximity}
.gts-film button{flex:0 0 auto;display:grid;gap:6px;width:132px;padding:6px 6px 8px;border:1.5px solid transparent;border-radius:13px;background:transparent;cursor:pointer;font:inherit;color:var(--ink-soft);text-align:center;scroll-snap-align:start;transition:background-color .2s ease,border-color .2s ease,transform .2s ease}
.gts-film button:hover{background:color-mix(in srgb,#fff 70%,transparent)}.gts-film button:active{transform:scale(.98)}
.gts-film button.on{border-color:var(--clay);background:#fff;color:var(--ink)}
.gts-film img{display:block;width:100%;height:74px;object-fit:cover;border-radius:9px}
.gts-film span{font-size:12.5px;font-weight:600;line-height:1.25}
.gts-film button:focus-visible{outline:2px solid var(--clay);outline-offset:2px}
@keyframes gtsFade{from{opacity:0;transform:scale(1.02)}}
@keyframes gtsPop{from{opacity:0;transform:translate(-50%,-50%) scale(.4)}}
@keyframes gtsPing{0%{opacity:.8;transform:scale(1)}70%,100%{opacity:0;transform:scale(3.2)}}
@keyframes gtsNote{from{opacity:0;transform:translateY(-4px)}}
@keyframes gtsRise{from{opacity:0;transform:translateY(12px)}}
@media (prefers-reduced-motion:reduce){.gts *,.gts *::after{animation:none!important;transition:none!important}}
`;
