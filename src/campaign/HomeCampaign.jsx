/* [IKHTARHA 2026-11-09] Home page campaign + business sections — [2026-11-09 brand kit] «ticket» look (ekhtarha-brand-kit).
 * - IkhtarhaSpotlight: one big white ticket on the purple ground — chip, headline, steps, illustration, tear-off line, stub (CTA · اختارها · dates) + stamp.
 * - IkhtarhaDesigns: the five campaign design categories (closets, doors, kitchens, bedrooms, TV units), each with its kit illustration and a "price it" button.
 *   Public materials never name prizes or values (brand kit rule) — the prize is revealed only inside the game.
 * - BusinessBand: "The Closets for Business" — sectors, why us, business quotation CTA (always shown).
 * - CampaignPill: small floating shortcut while the campaign is live.
 * Campaign parts show only while ikh_landing says the campaign is live, so they switch off by themselves when it ends.
 * Every text can be overridden from the site CMS (key, and key + '.ar' for Arabic). */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { landing } from './api';
import './home-campaign.css';

const PLAY = '/campaign/ikhtarha';
const DEMO = '/campaign/ikhtarha/demo';
const ILL = '/brand/ikhtarha/illustrations/';
const DESIGNS = [
  ['closets', 'Closets', 'خزائن', 'Organised inside, stunning outside.', 'مرتبة من الداخل… فخمة من الخارج'],
  ['doors', 'Doors', 'أبواب', 'Your home’s first impression starts at the door.', 'أول انطباع لبيتك… يبدأ من الباب'],
  ['kitchens', 'Kitchens', 'مطابخ', 'A kitchen you’ll love, made to measure.', 'مطبخ يفتح النفس… مصمم على مقاسك'],
  ['bedrooms', 'Bedrooms', 'غرف نوم', 'Your comfort, in one complete design.', 'راحتك… بتصميم واحد متكامل'],
  ['tv-units', 'TV units', 'وحدات تلفزيون', 'Your evening corner, done elegantly.', 'زاوية السهرة… بأناقة'],
];
const arNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

export function useIkhLanding() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { let on = true; landing(null).then((c) => { if (on) setCfg(c && c.live ? c : false); }).catch(() => on && setCfg(false)); return () => { on = false; }; }, []);
  return cfg;   // null = loading, false = no live campaign, object = live campaign
}

const go = (url) => { window.location.href = url; };

/* sections animate in once when they scroll into view (200–300ms, ease-out — brand kit); off with reduced motion */
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function useInView(ready = true) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (reducedMotion() || typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); } }), { threshold: 0.15 });
    io.observe(el); const t = setTimeout(() => el.classList.add('is-in'), 4000);   // never leave content hidden
    return () => { io.disconnect(); clearTimeout(t); };
  }, [ready]);
  return ref;
}
/** pointer tilt for a card: sets --rx / --ry on the element */
const tilt = (max = 6) => ({
  onPointerMove: (e) => { if (e.pointerType !== 'mouse' || reducedMotion()) return; const el = e.currentTarget; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', ((x - 0.5) * max * 2).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((0.5 - y) * max * 2).toFixed(2) + 'deg'); },
  onPointerLeave: (e) => { const el = e.currentTarget; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); },
  onAnimationEnd: (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hc-done'); },
});

function useCountdown(ends) {
  const end = useMemo(() => (ends ? new Date(String(ends).slice(0, 10) + 'T23:59:59+03:00').getTime() : 0), [ends]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!end) return undefined; const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, [end]);
  if (!end || end <= now) return null;
  const m = Math.floor((end - now) / 60000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

const Stamp = ({ text, cls = '' }) => <span className={'hc-stamp ' + cls} aria-hidden="true"><span>{text}</span></span>;

export function IkhtarhaSpotlight({ cfg, lang, cms, setPage }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
  const cd = useCountdown(cfg && cfg.ends);
  const ref = useInView(!!cfg);
  if (!cfg) return null;
  const n = (x) => (ar ? arNum(x) : String(x));
  const steps = [
    [c('home.ikh.s1', 'Price your design', 'سعّر تصميمك'), c('home.ikh.s1d', 'Visit a showroom or book a free home visit — every quotation takes part.', 'زر معرضنا أو احجز زيارة منزلية مجانية — كل عروض الأسعار تشارك.')],
    [c('home.ikh.s2', 'Get your Ikhtarha code', 'استلم كود اختارها'), c('home.ikh.s2d', 'Your quotation comes with a personal code and link.', 'يوصلك مع عرض السعر كود ورابط خاص فيك.')],
    [c('home.ikh.s3', 'Pick your prize box', 'اختار صندوق جائزتك'), c('home.ikh.s3d', 'Open it and reveal your prize — it’s added to your quotation.', 'افتحه واكتشف جائزتك — وتنضاف على عرض السعر.')],
  ];
  return (
    <section ref={ref} className="hc-ekh" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-ikh-h" data-testid="home-ikhtarha">
      <img className="hc-hills" src={ILL + 'scene-hills.svg'} alt="" aria-hidden="true" />
      <i className="hc-dot d1" aria-hidden="true" /><i className="hc-dot d2" aria-hidden="true" /><i className="hc-dot d3" aria-hidden="true" />
      <article className="hc-tk" {...tilt(2)}>
        <div className="hc-tk-top">
          <div className="hc-tk-copy">
            <span className="hc-chip">{c('home.ikh.eyebrow', 'Ikhtarha · by The Closets', 'حملة اختارها · من الخزائن')}</span>
            <h2 id="hc-ikh-h" className="display hc-title">{c('home.ikh.title', 'Beautiful designs… and the prize is your choice.', 'تصاميم روعة… والجائزة باختيارك')}</h2>
            <p className="hc-lead">{c('home.ikh.sub', 'Beautiful designs. Ready for you. Price your design and pick your prize box.', 'تصاميم جميلة. جاهزة لك. سعّر تصميمك واختار صندوق جائزتك.')}</p>
            <ol className="hc-steps">
              {steps.map(([t, d], i) => <li key={i} style={{ '--i': i }}><span className="hc-n">{n('0' + (i + 1))}</span><div><b>{t}</b><span>{d}</span></div></li>)}
            </ol>
          </div>
          <div className="hc-tk-art"><img src={ILL + 'scene-gift-boxes.svg'} alt={ar ? 'ثلاثة صناديق هدايا مغلقة' : 'Three closed gift boxes'} /></div>
        </div>
        <div className="hc-tear" aria-hidden="true" />
        <div className="hc-stub">
          <div className="hc-stub-cta">
            <b className="display">{c('home.ikh.cta.t', 'Price your design', 'سعّر تصميمك')}</b>
            <span>{c('home.ikh.cta.s', 'and pick your prize box', 'واختار صندوق جائزتك')}</span>
            <div className="hc-ctas">
              <button type="button" className="hc-btn hc-btn-teal" onClick={() => setPage('booking')} data-testid="home-ikh-price">{c('home.ikh.cta2', 'Price & pick your box', 'سعّر واختار صندوقك')}</button>
              <button type="button" className="hc-btn hc-btn-purple" onClick={() => go(PLAY)} data-testid="home-ikh-play">{c('home.ikh.cta1', 'I have a code — play', 'عندي كود — العب الآن')}</button>
              <a className="hc-link" href={DEMO}>{c('home.ikh.cta3', 'Try a sample game', 'جرّب لعبة تجريبية')}</a>
            </div>
          </div>
          <div className="hc-stub-mid" aria-hidden="true"><img src="/brand/ikhtarha/logo.png" alt="" /></div>
          <div className="hc-stub-date">
            <b className="display">{c('home.ikh.dates1', 'From 10 November', 'من ١٠ نوفمبر')}</b>
            <b className="display">{c('home.ikh.dates2', 'to 10 January', 'حتى ١٠ يناير')}</b>
            {cd && (
              <div className="hc-count" aria-label={ar ? 'الوقت المتبقي على نهاية الحملة' : 'Time left in the campaign'}>
                {[[cd.d, ar ? 'يوم' : 'days'], [cd.h, ar ? 'ساعة' : 'hrs'], [cd.m, ar ? 'دقيقة' : 'min']].map(([v, l]) => <span key={l}><em>{n(v)}</em>{l}</span>)}
              </div>
            )}
          </div>
          <Stamp text={c('home.ikh.stamp', 'Ikhtarha now!', 'اختارها الآن!')} />
        </div>
      </article>
      <p className="hc-fine">{c('home.ikh.fine', 'One game per quotation. Prizes are drawn by our system. Terms & conditions apply.', 'لعبة واحدة لكل عرض سعر. يتم سحب الجوائز آليًا. تطبق الشروط والأحكام.')}</p>
    </section>
  );
}

export function IkhtarhaDesigns({ cfg, lang, cms, setPage }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
  const ref = useInView(!!cfg);
  if (!cfg) return null;
  return (
    <section ref={ref} className="hc-designs" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-designs-h" data-testid="home-ikh-designs">
      <div className="hc-designs-head">
        <span className="hc-chip">{c('home.ikh.ds.eyebrow', 'Ikhtarha designs', 'تصاميم اختارها')}</span>
        <h2 id="hc-designs-h" className="display">{c('home.ikh.ds.title', 'Pick your design. Your prize, your choice.', 'اختار تصميمك… والجائزة باختيارك')}</h2>
      </div>
      <div className="hc-dgrid">
        {DESIGNS.map(([id, en, a, ten, tar], i) => (
          <article key={id} className="hc-dcard" style={{ '--i': i }} {...tilt(5)} data-testid={'home-ikh-design-' + id}>
            <span className="hc-chip hc-chip-sm">{ar ? `${arNum('0' + (i + 1))} / ${arNum('05')}` : `0${i + 1} / 05`}</span>
            <h3 className="display">{ar ? a : en}</h3>
            <p>{ar ? tar : ten}</p>
            <div className="hc-dart"><img src={`${ILL}scene-${id}.svg`} alt="" loading="lazy" /></div>
            <div className="hc-dfoot">
              <button type="button" className="hc-btn hc-btn-purple hc-btn-sm" onClick={() => setPage('booking')}>{c('home.ikh.ds.cta', 'Price it', 'سعّر')}</button>
              <span>{c('home.ikh.ds.note', 'and pick your prize box', 'واختار صندوق جائزتك')}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BusinessBand({ lang, mobile, cms, setPage, live }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
  const ref = useInView();
  const sectors = [
    ['🏢', c('home.biz.s1', 'Residential developers', 'المطورون العقاريون'), c('home.biz.s1d', 'Kitchens, wardrobes and doors for whole buildings and compounds.', 'مطابخ وخزائن وأبواب لمبانٍ ومجمعات كاملة.')],
    ['🏨', c('home.biz.s2', 'Hotels & serviced apartments', 'الفنادق والشقق الفندقية'), c('home.biz.s2d', 'Durable joinery built to a schedule, room after room.', 'نجارة متينة تُنفذ وفق جدول زمني، غرفة بعد غرفة.')],
    ['💼', c('home.biz.s3', 'Offices & headquarters', 'المكاتب والمقرات'), c('home.biz.s3d', 'Storage walls, pantries, reception and executive furniture.', 'جدران تخزين ومطابخ صغيرة واستقبال وأثاث تنفيذي.')],
    ['📐', c('home.biz.s4', 'Contractors & designers', 'المقاولون والمصممون'), c('home.biz.s4d', 'Your drawings, our factories — priced from your BOQ.', 'رسوماتك وتصنيعنا — بأسعار حسب جدول الكميات.')],
  ];
  const why = [
    c('home.biz.w1', 'Two factories in Bahrain', 'مصنعان في البحرين'),
    c('home.biz.w2', 'One project manager from survey to handover', 'مدير مشروع واحد من القياس حتى التسليم'),
    c('home.biz.w3', 'Samples and quotations within days', 'عينات وعروض أسعار خلال أيام'),
    c('home.biz.w4', 'Installation and after-sales care', 'التركيب وخدمة ما بعد البيع'),
  ];
  return (
    <section ref={ref} className="hc-biz" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-biz-h" data-testid="home-business">
      <div className="hc-biz-in">
        <div className="hc-biz-copy">
          <span className="eyebrow">{c('home.biz.eyebrow', 'The Closets for Business', 'ذا كلوزتس للأعمال')}</span>
          <h2 id="hc-biz-h" className="display">{c('home.biz.title', 'Fit-outs for projects of every size.', 'تجهيزات لمشاريع بكل الأحجام.')}</h2>
          <p className="hc-lead">{c('home.biz.sub', 'From one office to a full residential tower — designed, manufactured and installed by our own team in Bahrain.', 'من مكتب واحد إلى برج سكني كامل — تصميم وتصنيع وتركيب بفريقنا في البحرين.')}</p>
          <ul className="hc-why">{why.map((w, i) => <li key={w} style={{ '--i': i }}>{w}</li>)}</ul>
          {live && <p className="hc-biz-ikh">{c('home.biz.ikh', 'Business quotations take part in the Ikhtarha campaign too.', 'عروض أسعار الشركات تشارك أيضًا في حملة اختارها.')}</p>}
          <div className="hc-ctas">
            <button type="button" className="hc-btn hc-btn-dark" onClick={() => setPage('contact')} data-testid="home-biz-quote">{c('home.biz.cta', 'Request a business quotation', 'اطلب عرض سعر للشركات')}</button>
            <a className="hc-btn hc-btn-line" href={'https://wa.me/' + c('home.biz.wa', '97317555095', '97317555095').replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">{c('home.biz.cta2', 'WhatsApp our projects team', 'تواصل مع فريق المشاريع عبر واتساب')}</a>
          </div>
        </div>
        <div className={'hc-sectors' + (mobile ? ' is-m' : '')}>
          {sectors.map(([i, t, d], n) => <div key={t} className="hc-sector" {...tilt(6)} style={{ '--i': n }}><span aria-hidden="true">{i}</span><b>{t}</b><p>{d}</p></div>)}
        </div>
      </div>
    </section>
  );
}

export function CampaignPill({ cfg, lang }) {
  const [hide, setHide] = useState(() => { try { return sessionStorage.getItem('hc_pill_x') === '1'; } catch (e) { return false; } });
  if (!cfg || hide) return null;
  const ar = lang === 'ar';
  return (
    <div className="hc-pill" dir={ar ? 'rtl' : 'ltr'} data-testid="home-ikh-pill">
      <a href={PLAY}><img src="/brand/ikhtarha/logo-light.png" alt={ar ? (cfg.name_ar || 'اختارها') : (cfg.name_en || 'Ikhtarha')} /><span>{ar ? 'اختار صندوق جائزتك' : 'Pick your prize box'}</span></a>
      <button type="button" aria-label={ar ? 'إخفاء' : 'Hide'} onClick={() => { setHide(true); try { sessionStorage.setItem('hc_pill_x', '1'); } catch (e) { /* ignore */ } }}>×</button>
    </div>
  );
}
