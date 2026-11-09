/* [HOME 2026-11-09] "Walk into our showroom" — a scroll-driven, first-person tour on the home page.
 * Scrolling walks the visitor in: the glass entrance doors slide open, the camera dollies forward through each room and steps
 * through a doorway into the next one (the next room opens as a portal and grows), wardrobe doors swing open to look inside,
 * feature tags float in, and the pointer lets you "look around". Real room photography; no 3D engine, no extra downloads.
 * Reduced motion: no zoom / portal / doors — rooms simply cross-fade while you scroll. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './showroom-tour.css';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export default function ShowroomTour({ lang = 'en', img = {}, setPage }) {
  const ar = lang === 'ar';
  const T = (en, a) => (ar ? a : en);
  const ROOMS = useMemo(() => { const L = (en, a) => (ar ? a : en); return [
    { k: 'walkin', src: img.walkin, page: 'wardrobes', doors: 'glass', no: L('Walk-in closets', 'غرف الملابس'),
      sub: L('Warm light on every shelf. A place for everything you own.', 'إضاءة دافئة على كل رف، ومكان لكل ما تملك.'),
      tags: [L('LED profile lighting', 'إضاءة LED مدمجة'), L('Glass-front drawers', 'أدراج بواجهات زجاجية'), L('Island with jewellery tray', 'جزيرة بدرج للمجوهرات')] },
    { k: 'kitchen', src: img.kitchen, page: 'kitchen', no: L('Kitchens', 'المطابخ'),
      sub: L('Handle-free fronts, stone tops and appliances built in.', 'واجهات بدون مقابض، أسطح حجرية وأجهزة مدمجة.'),
      tags: [L('Push-to-open fronts', 'فتح بالضغط'), L('Stone worktops', 'أسطح من الحجر'), L('Built-in appliances', 'أجهزة مدمجة')] },
    { k: 'living', src: img.living, page: 'tv', no: L('Living & TV walls', 'الصالات وجدران التلفاز'),
      sub: L('Media walls and shelving made to the centimetre.', 'جدران تلفاز ورفوف مصنوعة بدقة السنتيمتر.'),
      tags: [L('Hidden cable channels', 'قنوات مخفية للأسلاك'), L('Floating shelves', 'رفوف معلّقة'), L('Fluted panels', 'ألواح مضلّعة')] },
    { k: 'wardrobe', src: img.wardrobe, page: 'wardrobes', doors: 'wood', no: L('Wardrobes', 'الخزائن'),
      sub: L('Open the doors — every hanger, drawer and shoe rack is planned.', 'افتح الأبواب — كل علاقة ودرج ورف أحذية مخطط له.'),
      tags: [L('Soft-close hinges', 'مفصلات هادئة الإغلاق'), L('Pull-out shoe racks', 'رفوف أحذية منزلقة'), L('Full-height mirrors', 'مرايا بطول كامل')] },
    { k: 'doors', src: img.door, page: 'doors', no: L('Doors', 'الأبواب'),
      sub: L('Flush, tall and quiet — doors that finish the room.', 'أبواب مستوية وطويلة وهادئة — تكمل جمال المكان.'),
      tags: [L('Floor-to-ceiling doors', 'أبواب من الأرض للسقف'), L('Hidden frames', 'إطارات مخفية'), L('Magnetic locks', 'أقفال مغناطيسية')] },
  ].filter((r) => r.src); }, [img, ar]);
  const N = ROOMS.length;
  const wrap = useRef(null); const stage = useRef(null); const raf = useRef(0);
  const [p, setP] = useState(0);              // tour progress: 0 … N  (0–0.6 = entrance doors, i … i+1 = room i)
  const rm = useMemo(reduced, []);

  const measure = useCallback(() => {
    raf.current = 0; const el = wrap.current; if (!el) return;
    const r = el.getBoundingClientRect(); const run = el.offsetHeight - window.innerHeight;
    setP(clamp(-r.top / Math.max(run, 1), 0, 1) * N);
  }, [N]);
  useEffect(() => {
    const on = () => { if (!raf.current) raf.current = requestAnimationFrame(measure); };
    on(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [measure]);
  // preload the photos once the tour is near
  useEffect(() => { ROOMS.forEach((r) => { const i = new Image(); i.src = r.src; }); }, [ROOMS]);

  // look around with the pointer (desktop)
  const look = (e) => {
    if (rm || e.pointerType !== 'mouse' || !stage.current) return;
    const b = stage.current.getBoundingClientRect();
    stage.current.style.setProperty('--lx', (((e.clientX - b.left) / b.width) - 0.5).toFixed(3));
    stage.current.style.setProperty('--ly', (((e.clientY - b.top) / b.height) - 0.5).toFixed(3));
  };
  const goRoom = (i) => { const el = wrap.current; if (!el) return; const run = el.offsetHeight - window.innerHeight; window.scrollTo({ top: el.offsetTop + run * ((i + 0.35) / N), behavior: rm ? 'auto' : 'smooth' }); };

  if (!N) return null;
  const cur = Math.min(N - 1, Math.floor(p));
  const local = p - cur;                         // 0 … 1 inside the current room
  const entrance = clamp(p / 0.55);              // glass doors 0 → 1 (open)
  const end = clamp((p - (N - 0.18)) / 0.18);    // final call to action

  return (
    <section ref={wrap} className={'st-wrap' + (rm ? ' st-rm' : '')} style={{ height: (N + 1) * 100 + 'vh' }} dir={ar ? 'rtl' : 'ltr'} aria-label={T('Showroom tour', 'جولة في المعرض')} data-testid="home-showroom-tour">
      <div ref={stage} className="st-stage" onPointerMove={look}>
        {ROOMS.map((r, i) => {
          const t = p - i;                         // −1 … 0 approaching (portal), 0 … 1 inside
          if (t < -1 || t > 1.05) return null;
          const inside = clamp(t), approach = clamp(t + 1);   // approach: 0 → 1 while the previous room is being walked through
          const portal = i === 0 ? 1 : ease(clamp((approach - 0.55) / 0.45));   // doorway grows into the full view
          const scale = rm ? 1 : i === 0 && t < 0 ? 1 : (0.78 + 0.27 * portal) * (1 + 0.42 * ease(inside));
          const fade = t > 0.8 ? 1 - clamp((t - 0.8) / 0.25) : 1;
          const blur = rm ? 0 : t > 0.82 ? (t - 0.82) * 14 : 0;
          const inset = rm ? 0 : (1 - portal) * 22;
          const style = {
            zIndex: 10 + i, opacity: rm ? (t < 0 ? clamp(approach * 3 - 2) : fade) : (i > 0 && approach < 0.55 ? 0 : fade),
            clipPath: inset > 0.1 ? `inset(${inset}% ${inset * 1.35}% ${inset * 0.6}% ${inset * 1.35}% round ${18 + inset}px)` : 'none',
          };
          return (
            <div key={r.k} className={'st-room' + (i === cur ? ' is-cur' : '')} style={style} aria-hidden={i !== cur}>
              <div className="st-cam" style={{ transform: `scale(${scale.toFixed(4)})`, filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none' }}>
                <img src={r.src} alt="" draggable="false" />
              </div>
              <div className="st-shade" />
              {r.doors === 'wood' && !rm && (() => {
                const open = ease(clamp((t + 0.15) / 0.45));     // wardrobe doors swing open as you arrive
                return (<div className="st-doors st-wood" style={{ opacity: 1 - clamp((open - 0.85) / 0.15) }} aria-hidden="true">
                  <i style={{ transform: `rotateY(${(-104 * open).toFixed(1)}deg)` }} /><i style={{ transform: `rotateY(${(104 * open).toFixed(1)}deg)` }} />
                </div>);
              })()}
            </div>
          );
        })}

        {/* entrance: frosted glass doors with the logo slide apart */}
        {!rm && entrance < 1 && (
          <div className="st-doors st-glass" aria-hidden="true">
            <i style={{ transform: `translateX(${(-102 * ease(entrance)).toFixed(1)}%)` }}><b>THE CLOSETS</b></i>
            <i style={{ transform: `translateX(${(102 * ease(entrance)).toFixed(1)}%)` }}><b>الخزائن العالمية</b></i>
          </div>
        )}
        <div className="st-dust" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <span key={i} style={{ '--x': ((i * 41) % 100) + '%', '--y': ((i * 67) % 100) + '%', '--d': (i % 7) * 0.9 + 's', '--s': 1 + (i % 3) + 'px' }} />)}</div>

        {/* HUD */}
        <div className="st-hud">
          <div className={'st-intro' + (entrance > 0.35 ? ' is-gone' : '')}>
            <p className="st-eyebrow">{T('Showroom tour', 'جولة في المعرض')}</p>
            <h2 className="display">{T('Step inside our showroom.', 'ادخل إلى معرضنا.')}</h2>
            <p className="st-hint">{T('Scroll to walk in', 'مرّر للدخول')} <span aria-hidden="true">↓</span></p>
          </div>
          {ROOMS.map((r, i) => (
            <div key={r.k} className={'st-copy' + (i === cur && entrance >= 0.55 && end < 0.5 && local < 0.86 ? ' is-on' : '')} aria-live={i === cur ? 'polite' : undefined}>
              <span className="st-no">{String(i + 1).padStart(2, '0')} <em>/ {String(N).padStart(2, '0')}</em></span>
              <h3 className="display">{r.no}</h3>
              <p>{r.sub}</p>
              <ul>{r.tags.map((g, j) => <li key={g} style={{ '--j': j }}>{g}</li>)}</ul>
              <button type="button" className="st-btn" onClick={() => setPage && setPage(r.page)} tabIndex={i === cur ? 0 : -1}>{T('Explore', 'استكشف')} {r.no} <span aria-hidden="true">{ar ? '←' : '→'}</span></button>
            </div>
          ))}
          <div className={'st-end' + (end > 0.4 ? ' is-on' : '')}>
            <h3 className="display">{T('Now see it for real.', 'والآن شاهدها على الطبيعة.')}</h3>
            <p>{T('Visit a showroom or let our designer come to you — free.', 'زر معرضنا أو دع مصممنا يزورك — مجانًا.')}</p>
            <div className="st-ctas">
              <button type="button" className="st-btn st-btn-main" onClick={() => setPage && setPage('booking')} tabIndex={end > 0.4 ? 0 : -1}>{T('Book a showroom visit', 'احجز زيارة للمعرض')}</button>
              <button type="button" className="st-btn" onClick={() => setPage && setPage('planner')} tabIndex={end > 0.4 ? 0 : -1}>{T('Design yours', 'صمّم خزانتك')}</button>
            </div>
          </div>
          <nav className="st-rail" aria-label={T('Rooms', 'الأقسام')}>
            {ROOMS.map((r, i) => (
              <button key={r.k} type="button" className={i === cur && entrance >= 0.55 ? 'is-on' : i < cur ? 'is-past' : ''} onClick={() => goRoom(i)}>
                <i style={{ '--f': i < cur ? 1 : i === cur ? clamp(local) : 0 }} /><span>{r.no}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
