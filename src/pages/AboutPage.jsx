// Route chunk "AboutPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: AboutPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { HOME_IMG, Photo, cms, useI18n, useMobile, useReveal } from '../App';

/* ── ABOUT ── */
function AboutPage({ setPage = () => {} }) {
  const mobile = useMobile();
  const { t } = useI18n();
  useReveal();

  const STATS = [
    { n: cms('about.stat1.n', '20+'),  l: cms('about.stat1.l', 'Years of craft') },
    { n: cms('about.stat2.n', '500+'), l: cms('about.stat2.l', 'Homes fitted') },
    { n: cms('about.stat3.n', '4'),    l: cms('about.stat3.l', 'Showrooms in Bahrain') },
    { n: cms('about.stat4.n', '10 yr'),l: cms('about.stat4.l', 'Warranty on every piece') },
  ];

  const BELIEFS = [
    { k: '✦', t: cms('about.belief1.t', 'Precision'),   d: cms('about.belief1.d', 'Every panel is cut to the millimetre and dry-fitted in our workshop before it ever reaches your home. Fit is not a finishing touch — it is the whole point.') },
    { k: '❖', t: cms('about.belief2.t', 'Permanence'),  d: cms('about.belief2.d', 'We build furniture meant to outlast trends: solid carcasses, soft-close hardware and finishes chosen to age gracefully in Bahrain’s climate.') },
    { k: '⌂', t: cms('about.belief3.t', 'Made in Bahrain'), d: cms('about.belief3.d', 'Designed, manufactured and installed by our own team in the Kingdom. No middlemen, no outsourced quality — one team, accountable end to end.') },
    { k: '♾', t: cms('about.belief4.t', 'Service for life'),  d: cms('about.belief4.d', 'A ten-year warranty and a maintenance team that answers. When you buy a closet from us, you gain a relationship, not just a receipt.') },
  ];

  const MILES = [
    ['2010', cms('about.m1', 'Founded in Manama — one workshop, one fitted wardrobe at a time.')],
    ['2013', cms('about.m2', 'Opened our first flagship showroom.')],
    ['2016', cms('about.m3', 'Launched the bespoke design configurator.')],
    ['2019', cms('about.m4', 'Grew to four showrooms across Bahrain.')],
    ['2022', cms('about.m5', 'Passed 500 homes fitted — kitchens, wardrobes and beyond.')],
    ['2024', cms('about.m6', 'Opened the digital hub: design, quote and track online.')],
  ];

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)' }}>

      {/* ── CINEMATIC HERO ── */}
      <section style={{ position:'relative', overflow:'hidden', minHeight: mobile?520:'88vh', display:'flex', alignItems:'flex-end' }}>
        <Photo src={cms('about.hero.image', HOME_IMG.hero)} alt="A bespoke walk-in wardrobe by The Closets" imgClass="tz" par="0.18"
          style={{ position:'absolute', inset:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(20,16,12,.20) 0%, rgba(20,16,12,.35) 45%, rgba(20,16,12,.80) 100%)' }} />
        <div style={{ position:'relative', maxWidth:1180, width:'100%', margin:'0 auto', padding: mobile?'0 22px 52px':'0 40px 84px' }}>
          <div className="rv" style={{ display:'inline-flex', alignItems:'center', gap:9, background:'rgba(255,255,255,.14)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,.28)', borderRadius:999, padding:'8px 16px', color:'#fff', fontSize:12.5, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase' }}>
            <span style={{ color:'var(--clay)' }}>✦</span>{cms('about.hero.eyebrow', 'Our story')}
          </div>
          <h1 className="rv display" style={{ '--d':'.06s', fontSize: mobile?42:82, lineHeight:1.02, letterSpacing:'-.035em', color:'#fff', marginTop:20, maxWidth:900 }}>
            {cms('about.hero.title', 'Rooms that feel built for you — because they are.')}
          </h1>
          <p className="rv" style={{ '--d':'.14s', fontSize: mobile?17:21, lineHeight:1.6, color:'rgba(255,255,255,.86)', marginTop:22, maxWidth:640 }}>
            {cms('about.hero.sub', 'For two decades The Closets has designed, made and fitted bespoke joinery across Bahrain — one measured wall, one honest handshake at a time.')}
          </p>
          <div className="rv" style={{ '--d':'.2s', display:'flex', flexWrap:'wrap', gap:14, marginTop:30 }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('booking')} style={{ fontSize:16 }}>{t('bookFreeVisit')}</button>
            <button type="button" onClick={()=>setPage('projects')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.4)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderRadius:14, padding:'15px 26px', fontSize:16, fontWeight:600, cursor:'pointer', minHeight:50 }}>{cms('about.hero.cta2', 'See our work')}</button>
          </div>
        </div>
      </section>

      {/* ── STAT BAND ── */}
      <section style={{ background:'var(--ink)', color:'#fff' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'40px 22px':'56px 40px', display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(4,1fr)', gap: mobile?28:24 }}>
          {STATS.map((s,i)=>(
            <div key={s.l} className="rv" style={{ '--d':`${i*.06}s`, textAlign: mobile?'center':'left' }}>
              <div className="display" style={{ fontSize: mobile?38:52, lineHeight:1, letterSpacing:'-.03em', color:'#fff' }}>{s.n}</div>
              <div style={{ fontSize:13.5, color:'rgba(255,255,255,.62)', marginTop:10, fontWeight:600, letterSpacing:'.02em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ORIGIN NARRATIVE ── */}
      <section>
        <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'60px 22px':'104px 40px', display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?36:72, alignItems:'center' }}>
          <div className="rv-l">
            <div className="eyebrow" style={{ marginBottom:16 }}>{cms('about.origin.eyebrow', 'How it began')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:50, lineHeight:1.06, color:'var(--ink)', letterSpacing:'-.02em' }}>{cms('about.origin.title', 'It started with a single wardrobe.')}</h2>
            <p style={{ fontSize: mobile?16.5:18, lineHeight:1.8, color:'var(--ink-soft)', marginTop:20 }}>
              {cms('about.origin.p1', 'The Closets grew out of a small Manama workshop and a simple frustration: mass-made furniture never quite fit the room, and never quite lasted. So we did it the slow way — measuring each wall ourselves, cutting our own panels, and fitting every piece by hand.')}
            </p>
            <p style={{ fontSize: mobile?16.5:18, lineHeight:1.8, color:'var(--ink-soft)', marginTop:16 }}>
              {cms('about.origin.p2', 'Word travelled the way it does in Bahrain — one satisfied home to the next. Two decades on, that workshop has become four showrooms and a team of designers, makers and installers, but the rule has not changed: if it would not fit our own home, it does not leave the floor.')}
            </p>
          </div>
          <div className="rv-r tile-zoom zoomwrap" style={{ position:'relative', borderRadius:26, overflow:'hidden', minHeight: mobile?300:520, boxShadow:'0 40px 80px -34px rgba(33,28,24,.55)' }}>
            <Photo src={cms('about.origin.image', HOME_IMG.walkin)} alt="Craftsman fitting a bespoke wardrobe" imgClass="tz" style={{ position:'absolute', inset:0 }} />
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ── */}
      <section style={{ background:'var(--sand)', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div className="rv" style={{ maxWidth:940, margin:'0 auto', padding: mobile?'56px 22px':'96px 40px', textAlign:'center' }}>
          <div style={{ fontSize: mobile?40:64, color:'var(--clay)', lineHeight:0, fontFamily:'var(--font-sans)' }}>“</div>
          <blockquote className="display" style={{ fontSize: mobile?26:40, lineHeight:1.22, color:'var(--ink)', letterSpacing:'-.015em', margin:'12px 0 0' }}>
            {cms('about.quote', 'We don’t sell cabinets. We give people back the space they live in — calmer, quieter, and made exactly for them.')}
          </blockquote>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ── */}
      <section>
        <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'60px 22px':'104px 40px' }}>
          <div className="rv" style={{ maxWidth:640, marginBottom: mobile?36:56 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{cms('about.beliefs.eyebrow', 'What we stand for')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:50, lineHeight:1.06, color:'var(--ink)', letterSpacing:'-.02em' }}>{cms('about.beliefs.title', 'Four things we refuse to compromise on.')}</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?16:24 }}>
            {BELIEFS.map((b,i)=>(
              <div key={b.t} className="rv lift" style={{ '--d':`${i*.06}s`, background:'#fff', border:'1px solid var(--line)', borderRadius:22, padding: mobile?'26px 22px':'34px 32px' }}>
                <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:52, height:52, borderRadius:15, background:'var(--sand)', color:'var(--clay-deep)', fontSize:22, marginBottom:18 }} aria-hidden="true">{b.k}</div>
                <h3 className="display" style={{ fontSize: mobile?22:27, color:'var(--ink)', lineHeight:1.14 }}>{b.t}</h3>
                <p style={{ fontSize: mobile?15.5:16.5, lineHeight:1.75, color:'var(--ink-soft)', marginTop:12 }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CRAFT ── */}
      <section style={{ background:'#fff', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'60px 22px':'104px 40px', display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap: mobile?36:72, alignItems:'center' }}>
          <div className="rv-l tile-zoom zoomwrap" style={{ position:'relative', borderRadius:26, overflow:'hidden', minHeight: mobile?300:500, order: mobile?2:1, boxShadow:'0 40px 80px -34px rgba(33,28,24,.5)' }}>
            <Photo src={cms('about.craft.image', HOME_IMG.kitchen)} alt="The Closets workshop and finishing" imgClass="tz" style={{ position:'absolute', inset:0 }} />
            <span style={{ position:'absolute', top:16, left:16, background:'rgba(255,255,255,.95)', color:'var(--clay-deep)', fontSize:12.5, fontWeight:800, borderRadius:999, padding:'7px 14px', boxShadow:'0 4px 14px rgba(0,0,0,.16)' }}>{cms('about.craft.badge', 'Our workshop · Bahrain')}</span>
          </div>
          <div className="rv-r" style={{ order: mobile?1:2 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{cms('about.craft.eyebrow', 'From raw board to fitted room')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:50, lineHeight:1.06, color:'var(--ink)', letterSpacing:'-.02em' }}>{cms('about.craft.title', 'One team, accountable end to end.')}</h2>
            <p style={{ fontSize: mobile?16.5:18, lineHeight:1.8, color:'var(--ink-soft)', marginTop:20, maxWidth:520 }}>
              {cms('about.craft.p', 'A designer measures your space and draws it to scale. Our makers cut, edge and assemble it under one roof. Then our own installers fit it — and stand behind it for ten years. Nothing is subcontracted, so nothing gets lost between promise and delivery.')}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:26 }}>
              {[cms('about.craft.c1','Free home measure'),cms('about.craft.c2','In-house manufacturing'),cms('about.craft.c3','Own install team'),cms('about.craft.c4','10-year warranty')].map(c=>(
                <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:7, background:'var(--sand)', border:'1px solid var(--line)', borderRadius:999, padding:'9px 15px', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)' }}><span style={{ color:'var(--clay)' }}>✦</span>{c}</span>
              ))}
            </div>
            <button type="button" className="btn-clay" onClick={()=>setPage('how-it-works')} style={{ marginTop:28 }}>{cms('about.craft.cta', 'See how it works →')}</button>
          </div>
        </div>
      </section>

      {/* ── MILESTONE RAIL ── */}
      <section>
        <div style={{ maxWidth:900, margin:'0 auto', padding: mobile?'60px 22px':'104px 40px' }}>
          <div className="rv" style={{ marginBottom: mobile?32:52 }}>
            <div className="eyebrow" style={{ marginBottom:14 }}>{cms('about.timeline.eyebrow', 'The journey')}</div>
            <h2 className="display" style={{ fontSize: mobile?32:50, lineHeight:1.06, color:'var(--ink)', letterSpacing:'-.02em' }}>{cms('about.timeline.title', 'A workshop that grew up.')}</h2>
          </div>
          <div style={{ position:'relative', paddingLeft: mobile?26:34 }}>
            <div style={{ position:'absolute', left: mobile?7:9, top:6, bottom:6, width:2, background:'linear-gradient(180deg,var(--clay),var(--line))' }} />
            {MILES.map(([year,event],i)=>(
              <div key={year} className="rv" style={{ '--d':`${i*.05}s`, position:'relative', padding:'0 0 26px' }}>
                <span style={{ position:'absolute', left: mobile?-26:-34, top:3, width: mobile?16:20, height: mobile?16:20, borderRadius:'50%', background:'#fff', border:'3px solid var(--clay)' }} />
                <div style={{ fontSize: mobile?15:16, fontWeight:800, color:'var(--clay-deep)', letterSpacing:'.02em' }}>{year}</div>
                <div style={{ fontSize: mobile?15.5:17, color:'var(--ink)', marginTop:5, lineHeight:1.6 }}>{event}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER SIGNATURE ── */}
      <section style={{ background:'var(--sand)', borderTop:'1px solid var(--line)' }}>
        <div className="rv" style={{ maxWidth:820, margin:'0 auto', padding: mobile?'56px 22px':'96px 40px', textAlign:'center' }}>
          <p className="display" style={{ fontSize: mobile?21:28, lineHeight:1.45, color:'var(--ink)', letterSpacing:'-.01em' }}>
            {cms('about.founder.quote', 'Every home we finish carries our name. That is why we still walk each site before it’s signed off — and why we’ll still answer the phone years later.')}
          </p>
          <div style={{ marginTop:22, fontSize:15, fontWeight:700, color:'var(--ink)' }}>{cms('about.founder.name', 'The Closets Co.')}</div>
          <div style={{ fontSize:13.5, color:'var(--muted)', marginTop:3 }}>{cms('about.founder.role', 'Manama, Kingdom of Bahrain')}</div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section style={{ position:'relative', overflow:'hidden' }}>
        <Photo src={cms('about.cta.image', HOME_IMG.living)} alt="A finished living space by The Closets" imgClass="tz" style={{ position:'absolute', inset:0 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(20,16,12,.55), rgba(20,16,12,.78))' }} />
        <div className="rv" style={{ position:'relative', maxWidth:760, margin:'0 auto', padding: mobile?'64px 22px':'110px 40px', textAlign:'center' }}>
          <h2 className="display" style={{ fontSize: mobile?32:52, lineHeight:1.06, color:'#fff', letterSpacing:'-.02em' }}>{cms('about.cta.title', 'Let’s design your space.')}</h2>
          <p style={{ fontSize: mobile?16.5:19, lineHeight:1.65, color:'rgba(255,255,255,.85)', marginTop:16, maxWidth:520, marginInline:'auto' }}>{cms('about.cta.sub', 'Book a free home visit and meet the team who’ll design, build and fit it — all in Bahrain.')}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginTop:28, justifyContent:'center' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('booking')} style={{ fontSize:16 }}>{t('bookFreeVisit')}</button>
            <a href="https://closets-hub.vercel.app/team.html" target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.14)', color:'#fff', border:'1px solid rgba(255,255,255,.4)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderRadius:14, padding:'15px 26px', fontSize:16, fontWeight:600, textDecoration:'none', minHeight:50 }}>{cms('about.cta.team', 'Meet our team')}</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export { AboutPage };
