/* [IKHTARHA 2026-11-09] Home page campaign + business sections.
 * - IkhtarhaSpotlight: the live reward campaign right under the hero (key visual, how it works, countdown, CTAs).
 * - IkhtarhaPrizes: what customers can win (discount tiers + Franke premium appliances, scrolling strip).
 * - BusinessBand: "The Closets for Business" — sectors, why us, business quotation CTA (always shown).
 * - CampaignPill: small floating "🎁 Ikhtarha" shortcut while the campaign is live.
 * Campaign parts show only while ikh_landing says the campaign is live, so they switch off by themselves when it ends.
 * Every text can be overridden from the site CMS (key, and key + '.ar' for Arabic). */
import React, { useEffect, useMemo, useState } from 'react';
import { landing } from './api';
import './home-campaign.css';

const PLAY = '/campaign/ikhtarha';
const DEMO = '/campaign/ikhtarha/demo';
const PRIZES = [
  ['franke-maxi-fmxo-86', 'Franke Maxi oven 71L', 'فرن فرانكي ماكسي ٧١ لتر'],
  ['franke-mythos-905', 'Franke Mythos black glass hob 90cm', 'موقد فرانكي ميثوس زجاج أسود ٩٠ سم'],
  ['franke-cooker-fck-955', 'Franke free-standing cooker 90cm', 'طباخ فرانكي قائم ٩٠ سم'],
  ['franke-washer-fwmf-805', 'Franke automatic washer', 'غسالة فرانكي أوتوماتيك'],
  ['franke-maris-mrg-651-onyx', 'Franke Maris black granite sink', 'حوض فرانكي ماريس جرانيت أسود'],
  ['franke-island-fne-905', 'Franke black island hood', 'شفاط فرانكي جزيرة أسود'],
  ['franke-joy-fjo-904', 'Franke Joy pyramid hood 90cm', 'شفاط فرانكي جوي هرمي ٩٠ سم'],
  ['franke-neptune-755', 'Franke Neptune stainless hob 75cm', 'موقد فرانكي نبتون ستانلس ٧٥ سم'],
  ['franke-glass-linear-gn86', 'Franke Glass Linear black oven', 'فرن فرانكي زجاجي أسود'],
  ['franke-box-bxx-210-54', 'Franke Box rectangular sink', 'حوض فرانكي بوكس مستطيل'],
];

export function useIkhLanding() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { let on = true; landing(null).then((c) => { if (on) setCfg(c && c.live ? c : false); }).catch(() => on && setCfg(false)); return () => { on = false; }; }, []);
  return cfg;   // null = loading, false = no live campaign, object = live campaign
}

const go = (url) => { window.location.href = url; };

function useCountdown(ends) {
  const end = useMemo(() => (ends ? new Date(String(ends).slice(0, 10) + 'T23:59:59+03:00').getTime() : 0), [ends]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!end) return undefined; const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, [end]);
  if (!end || end <= now) return null;
  const m = Math.floor((end - now) / 60000);
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 };
}

export function IkhtarhaSpotlight({ cfg, lang, mobile, cms, setPage }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
  const cd = useCountdown(cfg && cfg.ends);
  if (!cfg) return null;
  const b = cfg.brand || {};
  // Arabic: the campaign poster (Arabic text baked in); English: the key visual
  const poster = ar ? cms('home.ikh.poster', '/brand/ikhtarha/poster-ar.jpg') : '';
  const kv = poster || (mobile ? b.hero_portrait || b.hero_wide : b.hero_wide || b.hero_portrait) || '/brand/ikhtarha/hero-wide.jpg';
  const name = ar ? (cfg.name_ar || 'اختارها') : (cfg.name_en || 'Ikhtarha');
  const steps = [
    [c('home.ikh.s1', 'Get your quotation', 'احصل على عرض السعر'), c('home.ikh.s1d', 'Visit a showroom or book a free home visit. Quotations from BD 1,300 qualify.', 'زر معرضنا أو احجز زيارة منزلية مجانية. عروض الأسعار من ١٬٣٠٠ د.ب مؤهلة.')],
    [c('home.ikh.s2', 'Receive your code', 'استلم الكود'), c('home.ikh.s2d', 'Your quotation comes with a personal campaign code and link.', 'يصلك مع عرض السعر كود ورابط خاص بك للحملة.')],
    [c('home.ikh.s3', 'Choose your box & win', 'اختار صندوقك واربح'), c('home.ikh.s3d', 'Open your box in our 3D wardrobe — your prize is added to your quotation.', 'افتح صندوقك في خزانتنا ثلاثية الأبعاد — وتُضاف جائزتك إلى عرض السعر.')],
  ];
  const extra = c('home.ikh.extra', '', '');
  return (
    <section className="hc-ikh" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-ikh-h" data-testid="home-ikhtarha">
      <div className="hc-ikh-in">
        <div className="hc-ikh-copy rv">
          <span className="hc-badge"><i aria-hidden="true" />{c('home.ikh.eyebrow', 'Live campaign · ' + name, 'حملة مباشرة · ' + name)}</span>
          <h2 id="hc-ikh-h" className="display">{c('home.ikh.title', 'Every quotation is a chance to win.', 'كل عرض سعر فرصة للفوز.')}</h2>
          <p className="hc-lead">{c('home.ikh.sub', 'Win up to 60% off your order — or a premium Franke appliance for your new kitchen.', 'اربح خصمًا يصل إلى ٦٠٪ على طلبك — أو جهاز فرانكي فاخر لمطبخك الجديد.')}</p>
          {extra && <p className="hc-extra">{extra}</p>}
          <ol className="hc-steps">
            {steps.map(([t, d], i) => <li key={i}><span className="hc-n">{(ar ? '١٢٣' : '123')[i]}</span><div><b>{t}</b><span>{d}</span></div></li>)}
          </ol>
          <div className="hc-ctas">
            <button type="button" className="hc-btn hc-btn-main" onClick={() => go(PLAY)} data-testid="home-ikh-play">🎁 {c('home.ikh.cta1', 'I have a code — play now', 'لدي كود — العب الآن')}</button>
            <button type="button" className="hc-btn hc-btn-ghost" onClick={() => setPage('booking')}>{c('home.ikh.cta2', 'Book a free visit to get a quotation', 'احجز زيارة مجانية للحصول على عرض سعر')}</button>
            <a className="hc-link" href={DEMO}>{c('home.ikh.cta3', 'Try a sample game ↗', 'جرّب لعبة تجريبية ↗')}</a>
          </div>
          {cd && (
            <div className="hc-count" aria-label={ar ? 'الوقت المتبقي على نهاية الحملة' : 'Time left in the campaign'}>
              <span>{c('home.ikh.ends', 'Ends in', 'تنتهي خلال')}</span>
              {[[cd.d, ar ? 'يوم' : 'days'], [cd.h, ar ? 'ساعة' : 'hrs'], [cd.m, ar ? 'دقيقة' : 'min']].map(([n, l]) => <b key={l}><em>{n}</em>{l}</b>)}
            </div>
          )}
        </div>
        <button type="button" className={'hc-ikh-kv rv' + (poster ? ' is-poster' : '')} onClick={() => (poster ? setPage('planner') : go(DEMO))} aria-label={poster ? 'ابدأ تصميمك الآن' : c('home.ikh.cta3', 'Try a sample game', 'جرّب لعبة تجريبية')}>
          <img src={kv} alt={poster ? 'اختارها — تصميمك المفضل وجائزتك باختيارك' : ''} loading="lazy" />
          {!poster && <span className="hc-kv-play" aria-hidden="true">▶</span>}
        </button>
      </div>
      <p className="hc-fine">{c('home.ikh.fine', 'One game per eligible quotation. Prizes are drawn by our system and are subject to the Reward & Gift Card Policy.', 'لعبة واحدة لكل عرض سعر مؤهل. يتم سحب الجوائز آليًا وتخضع لسياسة الجوائز وبطاقات الهدايا.')}</p>
    </section>
  );
}

export function IkhtarhaPrizes({ cfg, lang, cms }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
  if (!cfg) return null;
  const tiers = c('home.ikh.tiers', '20%,30%,40%,60%', '٢٠٪,٣٠٪,٤٠٪,٦٠٪').split(',').map((x) => x.trim()).filter(Boolean);
  const strip = [...PRIZES, ...PRIZES];
  return (
    <section className="hc-prizes" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-prizes-h" data-testid="home-ikh-prizes">
      <div className="hc-prizes-head rv">
        <span className="eyebrow">{c('home.ikh.pz.eyebrow', 'What you can win', 'ماذا يمكنك أن تربح')}</span>
        <h2 id="hc-prizes-h" className="display">{c('home.ikh.pz.title', 'Discounts on your order. Premium Franke for your kitchen.', 'خصومات على طلبك. وأجهزة فرانكي الفاخرة لمطبخك.')}</h2>
      </div>
      <div className="hc-tiers rv">
        {tiers.map((t) => <div key={t} className="hc-tier"><b dir="ltr">{t}</b><span>{c('home.ikh.pz.off', 'off your order', 'خصم على طلبك')}</span></div>)}
        <div className="hc-tier hc-tier-franke"><b>Franke</b><span>{c('home.ikh.pz.franke', 'premium appliances', 'أجهزة فاخرة')}</span></div>
      </div>
      <div className="hc-strip" aria-label={c('home.ikh.pz.list', 'Prizes include', 'من الجوائز')}>
        <div className="hc-strip-track">
          {strip.map(([f, en, a], i) => (
            <figure key={i} className="hc-prize" aria-hidden={i >= PRIZES.length ? 'true' : undefined}>
              <img src={`/brand/ikhtarha/prizes/${f}.jpg`} alt={i < PRIZES.length ? (ar ? a : en) : ''} loading="lazy" />
              <figcaption>{ar ? a : en}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="hc-fine">{c('home.ikh.pz.fine', 'Prizes depend on the quotation value and stock. Pictures are for illustration.', 'تعتمد الجوائز على قيمة عرض السعر وتوفر المخزون. الصور للتوضيح.')}</p>
    </section>
  );
}

export function BusinessBand({ lang, mobile, cms, setPage, live }) {
  const ar = lang === 'ar';
  const c = (k, en, a) => (ar ? cms(k + '.ar', a) : cms(k, en));
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
    <section className="hc-biz" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="hc-biz-h" data-testid="home-business">
      <div className="hc-biz-in">
        <div className="hc-biz-copy rv">
          <span className="eyebrow">{c('home.biz.eyebrow', 'The Closets for Business', 'ذا كلوزتس للأعمال')}</span>
          <h2 id="hc-biz-h" className="display">{c('home.biz.title', 'Fit-outs for projects of every size.', 'تجهيزات لمشاريع بكل الأحجام.')}</h2>
          <p className="hc-lead">{c('home.biz.sub', 'From one office to a full residential tower — designed, manufactured and installed by our own team in Bahrain.', 'من مكتب واحد إلى برج سكني كامل — تصميم وتصنيع وتركيب بفريقنا في البحرين.')}</p>
          <ul className="hc-why">{why.map((w) => <li key={w}>{w}</li>)}</ul>
          {live && <p className="hc-biz-ikh">🎁 {c('home.biz.ikh', 'Business quotations take part in the Ikhtarha campaign too.', 'عروض أسعار الشركات تشارك أيضًا في حملة اختارها.')}</p>}
          <div className="hc-ctas">
            <button type="button" className="hc-btn hc-btn-dark" onClick={() => setPage('contact')} data-testid="home-biz-quote">{c('home.biz.cta', 'Request a business quotation', 'اطلب عرض سعر للشركات')}</button>
            <a className="hc-btn hc-btn-line" href={'https://wa.me/' + c('home.biz.wa', '97317555095', '97317555095').replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">{c('home.biz.cta2', 'WhatsApp our projects team', 'تواصل مع فريق المشاريع عبر واتساب')}</a>
          </div>
        </div>
        <div className={'hc-sectors' + (mobile ? ' is-m' : '')}>
          {sectors.map(([i, t, d], n) => <div key={t} className="hc-sector rv" style={{ '--d': (n * 0.08) + 's' }}><span aria-hidden="true">{i}</span><b>{t}</b><p>{d}</p></div>)}
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
      <a href={PLAY}>🎁 <b>{ar ? (cfg.name_ar || 'اختارها') : (cfg.name_en || 'Ikhtarha')}</b><span>{ar ? 'اختار صندوقك واربح' : 'Choose your box & win'}</span></a>
      <button type="button" aria-label={ar ? 'إخفاء' : 'Hide'} onClick={() => { setHide(true); try { sessionStorage.setItem('hc_pill_x', '1'); } catch (e) { /* ignore */ } }}>×</button>
    </div>
  );
}
