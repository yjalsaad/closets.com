/* [DESIGN 2026-11-12] The ONE dark espresso "showroom" band on the home page.
 * Static, robust layout: a heading, then five rooms as a numbered list. Every room is real content in the DOM (so nothing depends on
 * scripting, images or a scroll-pin that can leave a black void). Progressive enhancement: on wide screens the image column is sticky and
 * crossfades to the room currently in view (IntersectionObserver). Reduced motion: no crossfade animation, the image just switches.
 * Replaces the earlier 5-screen scroll-pin (broken headline overlap + empty black space when images/JS failed). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../design/Icon';

export default function ShowroomTour({ lang = 'en', img = {}, fallback = {}, LinkC, pathOf, title, eyebrow, lede }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const ROOMS = useMemo(() => [
    { k: 'walkin', src: img.walkin, page: 'wardrobes', no: L('Walk-in closets', 'غرف الملابس'), sub: L('Warm light on every shelf. A place for everything you own.', 'إضاءة دافئة على كل رف، ومكان لكل ما تملك.'), tags: [L('LED profile lighting', 'إضاءة LED مدمجة'), L('Glass-front drawers', 'أدراج بواجهات زجاجية'), L('Island with jewellery tray', 'جزيرة بدرج للمجوهرات')] },
    { k: 'kitchen', src: img.kitchen, page: 'kitchen', no: L('Kitchens', 'المطابخ'), sub: L('Handle-free fronts, stone tops and appliances built in.', 'واجهات بدون مقابض، أسطح حجرية وأجهزة مدمجة.'), tags: [L('Push-to-open fronts', 'فتح بالضغط'), L('Stone worktops', 'أسطح من الحجر'), L('Built-in appliances', 'أجهزة مدمجة')] },
    { k: 'living', src: img.living, page: 'tv', no: L('Living & TV walls', 'الصالات وجدران التلفاز'), sub: L('Media walls and shelving made to the centimetre.', 'جدران تلفاز ورفوف مصنوعة بدقة السنتيمتر.'), tags: [L('Hidden cable channels', 'قنوات مخفية للأسلاك'), L('Floating shelves', 'رفوف معلّقة'), L('Fluted panels', 'ألواح مضلّعة')] },
    { k: 'wardrobe', src: img.wardrobe, page: 'wardrobes', no: L('Wardrobes', 'الخزائن'), sub: L('Open the doors — every hanger, drawer and shoe rack is planned.', 'افتح الأبواب — كل علاقة ودرج ورف أحذية مخطط له.'), tags: [L('Soft-close hinges', 'مفصلات هادئة الإغلاق'), L('Pull-out shoe racks', 'رفوف أحذية منزلقة'), L('Full-height mirrors', 'مرايا بطول كامل')] },
    { k: 'doors', src: img.door, page: 'doors', no: L('Doors', 'الأبواب'), sub: L('Flush, tall and quiet — doors that finish the room.', 'أبواب مستوية وطويلة وهادئة — تكمل جمال المكان.'), tags: [L('Floor-to-ceiling doors', 'أبواب من الأرض للسقف'), L('Hidden frames', 'إطارات مخفية'), L('Magnetic locks', 'أقفال مغناطيسية')] },
  ].filter((r) => r.src), [img, ar]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cur, setCur] = useState(0);
  const refs = useRef([]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { const i = Number(e.target.getAttribute('data-i')); if (!Number.isNaN(i)) setCur(i); } });
    }, { rootMargin: '-40% 0px -45% 0px' });
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [ROOMS.length]);
  if (!ROOMS.length) return null;
  const onErr = (k) => (e) => { const fb = fallback[k === 'doors' ? 'door' : k]; if (fb && e.currentTarget.src !== fb) e.currentTarget.src = fb; };
  return (
    <section className="band-dark showroom" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="showroom-title" data-testid="home-showroom-tour">
      <div className="container">
        <header className="showroom__head">
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="showroom-title">{title}</h2>
          <p>{lede}</p>
        </header>
        <div className="showroom__grid">
          <div className="showroom__stage" aria-hidden="true">
            {ROOMS.map((r, i) => (
              <img key={r.k} src={r.src} alt="" className={i === cur ? 'is-on' : ''} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" width="1600" height="1000" onError={onErr(r.k)} />
            ))}
          </div>
          <ol className="showroom__list">
            {ROOMS.map((r, i) => (
              <li key={r.k} data-i={i} ref={(el) => { refs.current[i] = el; }} className={i === cur ? 'is-on' : ''}>
                <img className="showroom__inline" src={r.src} alt="" loading="lazy" decoding="async" width="1600" height="1000" onError={onErr(r.k)} />
                <span className="showroom__no">{String(i + 1).padStart(2, '0')}</span>
                <h3>{r.no}</h3>
                <p>{r.sub}</p>
                <ul>{r.tags.map((g) => <li key={g}>{g}</li>)}</ul>
                <LinkC to={pathOf(r.page)} className="btn-text">{L('Explore', 'استكشف')} {r.no}<Icon name="arrow" flip={ar} size={16} /></LinkC>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
