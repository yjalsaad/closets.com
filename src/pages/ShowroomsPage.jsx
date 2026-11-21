// Route chunk "ShowroomsPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: ShowroomsPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { sanitizeRows } from '../safety/sanitize';
import { HOME_IMG, Photo, api, cms, useI18n } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';
import { Icon } from '../design/Icon';
import { FACTS } from '../content/facts';
import { LangLink as Link } from '../seo/lang';

function ShowroomsPage() {
  const { lang } = useI18n();
  const [rows,setRows]=useState([]);
  // Single source of truth: same content the Hub manages & the app shows.
  useEffect(()=>{ api('rpc/content_list',{method:'POST',body:{p_section:'showroom'}}).then(d=>{ if(Array.isArray(d)) setRows(sanitizeRows(d)); }).catch(()=>{}); },[]);
  return (<PageWrap eyebrow={cms('showrooms.hero.eyebrow',lang==='ar' ? 'زيارتنا' : 'Visit us')} title={cms('showrooms.hero.title',lang==='ar' ? 'صالات العرض' : 'Showrooms')} sub={cms('showrooms.hero.subtitle','Experience our craftsmanship in person — see the finishes, open the drawers, feel the build.')}>
    {rows.length>0 ? (
      <div className="reveal card-grid">
        {rows.map(s=>{ const m=s.meta||{}; return (
          <article key={s.id} className="media-card">
            <div className="img-frame ar-43 tile-zoom"><Photo src={s.image_url || HOME_IMG.living} alt={s.title} imgClass="tz" style={{ position:'absolute', inset:0 }} /></div>
            <div className="body">
              <h3>{s.title}</h3>
              <p>{m.address||s.subtitle}</p>
              {m.hours && <p style={{ display:'flex', alignItems:'center', gap:8 }}><Icon name="clock" size={16} />{m.hours}</p>}
              {m.phone && <a className="btn-text" href={'tel:'+m.phone} style={{ justifySelf:'start' }}><bdi dir="ltr">{m.phone}</bdi></a>}
            </div>
          </article>); })}
      </div>
    ) : (
      <div className="split-visit">
        <div className="ph ar-43" role="img" aria-label={lang==='ar' ? 'صورة صالة العرض قيد الإعداد' : 'Showroom photograph in preparation'} />
        <div style={{ display:'grid', gap:'var(--space-4)', alignContent:'center' }}>
          <h2 className="t-h2" style={{ margin:0 }}>{lang==='ar' ? 'نرحّب بزيارتك' : 'Come and see the work'}</h2>
          <p className="t-lede" style={{ margin:0 }}>{lang==='ar' ? 'احجز موعدًا ليؤكّد لك فريقنا أقرب صالة عرض ويجهّز لك العيّنات والتشطيبات.' : 'Book a time and our team will confirm the nearest showroom and have finishes and samples ready for you.'}</p>
          <dl className="visit-list">
            <div><dt><Icon name="clock" size={18} />{lang==='ar' ? 'ساعات العمل' : 'Hours'}</dt><dd>{FACTS.hours[lang==='ar'?'ar':'en']}</dd></div>
            <div><dt><Icon name="phone" size={18} />{lang==='ar' ? 'الهاتف' : 'Phone'}</dt><dd><a href={FACTS.phoneHref}><bdi dir="ltr">{FACTS.phone}</bdi></a></dd></div>
          </dl>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Link to="/booking" className="btn-clay">{lang==='ar' ? 'احجز زيارة' : 'Book a visit'}</Link>
            <a href={FACTS.whatsappHref} className="btn-line">{lang==='ar' ? 'واتساب' : 'WhatsApp'}</a>
          </div>
        </div>
      </div>
    )}
  </PageWrap>);
}

export { ShowroomsPage };
