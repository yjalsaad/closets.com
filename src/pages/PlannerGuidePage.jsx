// Route chunk "PlannerGuidePage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: PlannerGuidePage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { Photo, useI18n, useMobile, useReveal } from '../App';

/* ── HOW IT WORKS — Planner guide ── */
function FaqRow({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom:'1px solid var(--line)' }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'20px 4px', fontSize:17, fontWeight:600, color:'var(--ink)' }}>
        <span>{q}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink:0, transform: open?'rotate(45deg)':'none', transition:'transform .25s' }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      {open && <div style={{ padding:'0 4px 22px', fontSize:15.5, lineHeight:1.75, color:'var(--ink-soft)', maxWidth:760 }}>{a}</div>}
    </div>
  );
}

function PlannerGuidePage({ setPage }) {
  const mobile = useMobile();
  const { t } = useI18n();
  useReveal();
  const [openFaq, setOpenFaq] = useState(0);

  const STEPS = [
    {
      n: '01', title: t('guideS1t'),
      body: 'Choose what you are building — a kitchen, wardrobe, TV unit, door or home office — then select the layout that matches your room, from galley and L-shape to walk-in and full-wall.',
      img: '/layouts/kitchen/l-shape.jpg', alt: 'Selecting an L-shape kitchen layout',
    },
    {
      n: '02', title: t('guideS2t'),
      body: 'Enter your wall dimensions and mark openings like windows, doors and sockets. Approximate measurements are fine to start — our team confirms everything on a free site visit.',
      img: '/layouts/wardrobe/wardrobe-walkin.jpg', alt: 'Setting wardrobe dimensions and openings',
    },
    {
      n: '03', title: t('guideS3t'),
      body: 'Pick your finish family, worktops, door fronts, handles and interior accessories. Every choice updates your design live, so you always see what you are getting.',
      img: '/layouts/TV/full-wall.jpg', alt: 'Choosing finishes for a full-wall media unit',
    },
    {
      n: '04', title: t('guideS4t'),
      body: 'Your indicative price in BHD updates as you design. Happy with it? Save your design and request a formal quote — manufactured and installed in Bahrain.',
      img: '/layouts/office/built-in.jpg', alt: 'Reviewing an indicative price for a built-in office',
    },
  ];

  const DESIGNER_FEATURES = [
    { icon: '🎯', title: 'Clickable hotspots', body: 'Tap any surface in a real room — cabinets, worktop, doors, handles — and swap its material in a click.' },
    { icon: '🎨', title: 'Finish per surface', body: 'Mix and match finish families across every surface until the whole space feels right.' },
    { icon: '🔄', title: 'Live photo ⇄ 3D', body: 'Switch between a real photo and an interactive 3D view to judge proportions and depth.' },
    { icon: '✨', title: 'Render photoreal', body: 'Generate a photoreal AI image of your exact choices to share or save before you commit.' },
  ];

  const CATEGORIES = [
    { name: 'Kitchen', page: 'kitchen-planner', img: '/layouts/kitchen/island.jpg', desc: 'Handleless, shaker or traditional — built around how you cook.', steps: 5 },
    { name: 'Wardrobe', page: 'wardrobe-planner', img: '/layouts/wardrobe/wardrobe-sliding.jpg', desc: 'Walk-in, sliding or hinged storage tailored to your room.', steps: 5 },
    { name: 'TV & media', page: 'tv-planner', img: '/layouts/TV/floating.jpg', desc: 'Floating, full-wall or fireplace media walls with hidden storage.', steps: 4 },
    { name: 'Doors', page: 'door-planner', img: '/layouts/door/single-swing.jpg', desc: 'Swing, sliding, pivot or hidden doors in bespoke finishes.', steps: 4 },
    { name: 'Home Office', page: 'office-planner', img: '/layouts/office/corner.jpg', desc: 'Built-in desks and storage that fit the room and the way you work.', steps: 4 },
  ];

  const TIPS = [
    { t: 'Measure twice', d: 'Note wall lengths, ceiling height and any sockets or windows before you start — it makes every step faster.' },
    { t: 'Start with the layout', d: 'Get the shape right first. The right layout solves most design problems before you pick a single finish.' },
    { t: 'Pick a finish family', d: 'Choose one finish direction — warm wood, matt lacquer or two-tone — and let everything else follow it.' },
    { t: 'Use the work triangle', d: 'For kitchens, keep sink, hob and fridge in an easy triangle so cooking always feels effortless.' },
    { t: 'Save & share', d: 'Save your design to revisit later or share it with family — and bring it to your free visit.' },
    { t: 'Book a visit to confirm', d: 'A designer confirms measurements and details on site, so your final piece fits perfectly.' },
  ];

  const FAQS = [
    { q: t('guideQ1'), a: 'Yes — designing and pricing your space is completely free, with no obligation. You only commit once you accept a formal quote.' },
    { q: t('guideQ2'), a: 'No. Approximate dimensions are enough to start and get an indicative price. Our team confirms exact measurements during a free site visit before manufacturing.' },
    { q: t('guideQ3'), a: 'Yes. Create a free account to save any design, come back to it later, and share it. Your saved designs appear in your account portal.' },
    { q: t('guideQ4'), a: 'The planner gives an accurate indicative price in BHD based on your choices. Your final quote is confirmed after a site visit and any custom details are agreed.' },
    { q: t('guideQ5'), a: 'Absolutely. You can revisit your saved design and swap finishes, worktops or accessories any time before you confirm your order.' },
    { q: t('guideQ6'), a: 'Yes. Everything is bespoke — designed, manufactured and installed by our own team in the Kingdom of Bahrain, with a 10-year warranty.' },
  ];

  const HERO_IMG = '/layouts/kitchen/island.jpg';

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)' }}>
      {/* HERO */}
      <section style={{ position:'relative', overflow:'hidden', paddingTop:'calc(var(--nav-h) + var(--space-6))' }}>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'0 var(--gutter)':'0 var(--gutter)', display:'grid', gridTemplateColumns: mobile?'1fr':'1.05fr 1fr', gap: mobile?28:56, alignItems:'center', paddingBottom: mobile?44:72 }}>
          <div className="rv">
            <div className="eyebrow" style={{ marginBottom:16 }}>{t('guideEyebrow')}</div>
            <h1 className="display" style={{ fontSize: mobile?40:68, lineHeight:1.03, color:'var(--ink)', letterSpacing:'-.03em' }}>{t('guideHeadline')}</h1>
            <p style={{ fontSize: mobile?16.5:19, lineHeight:1.7, color:'var(--ink-soft)', marginTop:20, maxWidth:540 }}>
              {t('guideSub')}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:28 }}>
              <button type="button" className="btn-clay" onClick={()=>setPage('planner')} style={{ fontSize:16 }}>{t('startDesigningArrow')}</button>
              <button type="button" onClick={()=>setPage('booking')} style={{ background:'var(--c-surface)', color:'var(--ink)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'15px 26px', fontSize:16, fontWeight:600, cursor:'pointer', minHeight:50 }}>{t('bookFreeVisit')}</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:18, marginTop:30, fontSize:13.5, color:'var(--muted)', fontWeight:600 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--clay)' }}>✦</span>Free to use</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--clay)' }}>✦</span>No obligation</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><span style={{ color:'var(--clay)' }}>✦</span>10-year warranty</span>
            </div>
          </div>
          <div className="rv tile-zoom zoomwrap" style={{ position:'relative', borderRadius:'var(--radius-xl)', overflow:'hidden', minHeight: mobile?260:440, boxShadow:'0 30px 60px -28px rgba(33,28,24,.5)' }}>
            <Photo src={HERO_IMG} alt="Designing a bespoke kitchen with an island" imgClass="tz" style={{ position:'absolute', inset:0 }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(20,16,12,0) 55%, rgba(20,16,12,.45) 100%)' }} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 4 steps */}
      <section style={{ background:'var(--c-surface)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'56px var(--gutter)':'88px var(--gutter)' }}>
          <div className="rv" style={{ maxWidth:680, marginBottom: mobile?40:64 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{t('guideHowEyebrow')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:48, color:'var(--ink)', lineHeight:1.08 }}>{t('guideHowTitle')}</h2>
            <p style={{ fontSize: mobile?16:18, color:'var(--ink-soft)', marginTop:14, lineHeight:1.7 }}>{t('swGuideHowDesc')}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: mobile?40:72 }}>
            {STEPS.map((s, i) => {
              const flip = i % 2 === 1;
              return (
                <div key={s.n} className="rv" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?22:56, alignItems:'center' }}>
                  <div className="tile-zoom" style={{ position:'relative', borderRadius:'var(--radius-xl)', overflow:'hidden', minHeight: mobile?220:340, order: (!mobile && flip)?2:1, boxShadow:'0 22px 44px -26px rgba(33,28,24,.45)' }}>
                    <Photo src={s.img} alt={s.alt} imgClass="tz" style={{ position:'absolute', inset:0 }} />
                  </div>
                  <div style={{ order: (!mobile && flip)?1:2 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:54, height:54, borderRadius:'50%', background:'var(--sand)', color:'var(--clay-deep)', fontSize:20, fontWeight:800, marginBottom:16 }}>{s.n}</div>
                    <h3 className="display" style={{ fontSize: mobile?26:34, color:'var(--ink)', lineHeight:1.12 }}>{s.title}</h3>
                    <p style={{ fontSize: mobile?16:17.5, color:'var(--ink-soft)', marginTop:12, lineHeight:1.75, maxWidth:480 }}>{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* THE ROOM DESIGNER */}
      <section>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'56px var(--gutter)':'88px var(--gutter)' }}>
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?28:56, alignItems:'center' }}>
            <div className="rv tile-zoom" style={{ position:'relative', borderRadius:'var(--radius-xl)', overflow:'hidden', minHeight: mobile?260:420, boxShadow:'0 30px 60px -30px rgba(33,28,24,.5)' }}>
              <Photo src="/layouts/kitchen/island.jpg" alt={t('swGuideRdAlt')} imgClass="tz" style={{ position:'absolute', inset:0 }} />
              <span style={{ position:'absolute', top:16, left:16, background:'rgba(255,255,255,.95)', color:'var(--clay-deep)', fontSize:12.5, fontWeight:800, borderRadius:'var(--radius-pill)', padding:'7px 14px', boxShadow:'0 4px 14px rgba(0,0,0,.16)' }}>{t('swGuideRdBadge')}</span>
            </div>
            <div className="rv">
              <div className="eyebrow" style={{ marginBottom:14 }}>{t('swGuideRdEyebrow')}</div>
              <h2 className="display" style={{ fontSize: mobile?32:46, color:'var(--ink)', lineHeight:1.08 }}>{t('swGuideRdTitle')}</h2>
              <p style={{ fontSize: mobile?16:18, color:'var(--ink-soft)', marginTop:14, lineHeight:1.75, maxWidth:520 }}>
                {t('swGuideRdDesc')}
              </p>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:14, marginTop:26 }}>
                {DESIGNER_FEATURES.map(f => (
                  <div key={f.title} style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'18px 18px' }}>
                    <div style={{ fontSize:22, marginBottom:8 }} aria-hidden="true">{f.icon}</div>
                    <div style={{ fontSize:15.5, fontWeight:700, color:'var(--ink)' }}>{f.title}</div>
                    <div style={{ fontSize:13.5, color:'var(--ink-soft)', marginTop:6, lineHeight:1.6 }}>{f.body}</div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-clay" onClick={()=>setPage('kitchen-planner')} style={{ marginTop:26 }}>{t('guideTryRoomDesigner')}</button>
            </div>
          </div>
        </div>
      </section>

      {/* PLAN ANY PRODUCT */}
      <section style={{ background:'var(--c-surface)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'56px var(--gutter)':'88px var(--gutter)' }}>
          <div className="rv" style={{ maxWidth:680, marginBottom: mobile?32:48 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{t('swGuidePlanEyebrow')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:48, color:'var(--ink)', lineHeight:1.08 }}>{t('swGuidePlanTitle')}</h2>
            <p style={{ fontSize: mobile?16:18, color:'var(--ink-soft)', marginTop:14, lineHeight:1.7 }}>{t('swGuidePlanDesc')}</p>
          </div>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(auto-fill,minmax(230px,1fr))', gap:20 }}>
            {CATEGORIES.map(c => (
              <button type="button" key={c.name} onClick={()=>setPage(c.page)}
                className="rv lift"
                style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', overflow:'hidden', cursor:'pointer', textAlign:'left', padding:0, display:'flex', flexDirection:'column' }}>
                <div className="tile-zoom zoomwrap" style={{ position:'relative', height:180 }}>
                  <Photo src={c.img} alt={c.name} imgClass="tz" style={{ position:'absolute', inset:0 }} />
                  <span style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,.94)', color:'var(--clay-deep)', fontSize:11.5, fontWeight:700, borderRadius:'var(--radius-pill)', padding:'5px 11px' }}>{c.steps} {t('swGuideStepsLabel')}</span>
                </div>
                <div style={{ padding:'20px 20px 22px', flex:1, display:'flex', flexDirection:'column' }}>
                  <div className="display" style={{ fontSize:21, color:'var(--ink)' }}>{c.name}</div>
                  <div style={{ fontSize:14, color:'var(--ink-soft)', marginTop:8, lineHeight:1.6, flex:1 }}>{c.desc}</div>
                  <span style={{ marginTop:16, color:'var(--clay)', fontSize:14, fontWeight:700 }}>{t('swGuideStartPlannerPre')} {c.name.toLowerCase()} {t('swGuideStartPlannerPost')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TIPS */}
      <section>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'56px var(--gutter)':'88px var(--gutter)' }}>
          <div className="rv" style={{ maxWidth:680, marginBottom: mobile?32:48 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{t('swGuideTipsEyebrow')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:48, color:'var(--ink)', lineHeight:1.08 }}>{t('swGuideTipsTitle')}</h2>
          </div>
          <div className="reveal reveal-stagger" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'repeat(auto-fill,minmax(330px,1fr))', gap:18 }}>
            {TIPS.map((tip, i) => (
              <div key={tip.t} className="rv lift" style={{ display:'flex', gap:16, background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding:'22px 22px' }}>
                <div style={{ flexShrink:0, width:38, height:38, borderRadius:'50%', background:'var(--sand)', color:'var(--clay-deep)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:16.5, fontWeight:700, color:'var(--ink)' }}>{tip.t}</div>
                  <div style={{ fontSize:14.5, color:'var(--ink-soft)', marginTop:6, lineHeight:1.65 }}>{tip.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background:'var(--c-surface)', borderTop:'1px solid var(--line)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding: mobile?'56px 22px':'88px 40px' }}>
          <div className="rv" style={{ marginBottom: mobile?24:36 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{t('guideQuestions')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:46, color:'var(--ink)', lineHeight:1.08 }}>{t('guideFaqTitle')}</h2>
          </div>
          <div className="rv">
            {FAQS.map((f, i) => (
              <FaqRow key={f.q} q={f.q} a={f.a} open={openFaq===i} onToggle={()=>setOpenFaq(openFaq===i?-1:i)} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ background:'var(--ink)', color:'#fff' }}>
        <div style={{ maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding: mobile?'56px var(--gutter)':'80px var(--gutter)', textAlign:'center' }}>
          <h2 className="display" style={{ fontSize: mobile?32:48, color:'#fff', lineHeight:1.08 }}>{t('guideReady')}</h2>
          <p style={{ fontSize: mobile?16:18, color:'rgba(255,255,255,.78)', marginTop:14, maxWidth:560, marginLeft:'auto', marginRight:'auto', lineHeight:1.7 }}>
            Design your space in minutes, or book a free visit and a designer will plan it with you.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:14, justifyContent:'center', marginTop:28 }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('planner')} style={{ fontSize:16 }}>{t('startDesigningArrow')}</button>
            <button type="button" onClick={()=>setPage('booking')} style={{ background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,.4)', borderRadius:'var(--radius-lg)', padding:'15px 26px', fontSize:16, fontWeight:600, cursor:'pointer', minHeight:50 }}>{t('bookVisit')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export { PlannerGuidePage };
