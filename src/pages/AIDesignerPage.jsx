// Route chunk "AIDesignerPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: AIDesignerPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState } from 'react';
import { aiFetch } from '../privacy/ai';
import { formatBHDRange } from '../i18n/format';
import { CMS_LANG, SUPA_KEY, SUPA_URL, Spark, api, toast, useI18n, useMobile } from '../App';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function AIDesignerPage({ setPage, user }) {
  const mobile=useMobile();
  const { t } = useI18n();
  const STYLES=[
    { id:'warm_oak', name:'Warm Oak', g:'linear-gradient(135deg,#c89b5e,#9c6b34)' },
    { id:'modern_luxe', name:'Modern Luxe', g:'linear-gradient(135deg,#3a3a3c,#171717)' },
    { id:'scandinavian', name:'Scandinavian', g:'linear-gradient(135deg,#e8e2d8,#bfb3a0)' },
    { id:'minimal', name:'Minimal', g:'linear-gradient(135deg,#f3f3f1,#d6cfc4)' },
    { id:'bold_walnut', name:'Bold Walnut', g:'linear-gradient(135deg,#6b4423,#3f2a17)' },
    { id:'coastal', name:'Coastal', g:'linear-gradient(135deg,#dfe7e8,#a9c2c4)' },
  ];
  const ROOMS=[['bedroom','Bedroom'],['living','Living room'],['kitchen','Kitchen'],['office','Home office'],['walkin','Walk-in']];
  const PRODUCTS=[['','Any piece'],['wardrobe','Wardrobe'],['kitchen','Kitchen'],['walkin','Walk-in closet'],['tv','TV unit'],['doors','Doors'],['storage','Storage / office']];
  const MODES=[['redesign','Redesign my room','Restyle the room you have'],['furnish','Furnish empty room','Fill a bare space'],['describe','From a description','No photo — just describe it']];
  const [mode,setMode]=useState('redesign');
  const [f,setF]=useState({ requirements:'', product:'', room:'bedroom', style:'warm_oak', w:'', h:'', budget:'' });
  const [image,setImage]=useState(null);
  const [busy,setBusy]=useState(false); const [concept,setConcept]=useState(null); const [saved,setSaved]=useState(false);
  const [renderUrl,setRenderUrl]=useState(null); const [renderBusy,setRenderBusy]=useState(false); const [renderErr,setRenderErr]=useState('');
  const [baPos,setBaPos]=useState(55);
  const set=(k,v)=>setF(s=>({...s,[k]:v}));
  const needsPhoto = mode!=='describe';
  const inpS={ width:'100%', padding:'11px 13px', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:12, fontSize:14, fontFamily:'inherit', color:'var(--ink)' };
  const saveConcept=async()=>{
    if(!user){ toast(t('w4SignInToSaveConcept'),'info'); setPage('portal'); return; }
    try{
      const id='AIC-'+Date.now().toString(36).toUpperCase();
      await api('product_configurations',{method:'POST',body:[{ id, customer_id:user.id, customer_name:user.name, customer_email:user.email, product_name:'AI concept — '+concept.title, configuration:{...concept, render_url:renderUrl||undefined}, total_price:concept.estimate_bhd, status:'ai-concept', share_token:id, created_at:new Date().toISOString() }]});
      setSaved(true); toast(t('w4SavedToAccount'),'success');
    }catch{ toast(t('w4CouldNotSaveNow'),'error'); }
  };
  const onPhoto=(file)=>{ if(!file) return; const rd=new FileReader(); rd.onload=()=>{ const im=new Image(); im.onload=()=>{ const max=1024; let{width:w,height:h}=im; if(w>h&&w>max){h=Math.round(h*max/w);w=max;}else if(h>max){w=Math.round(w*max/h);h=max;} const c=document.createElement('canvas'); c.width=w;c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); const u=c.toDataURL('image/jpeg',0.72); setImage({ dataUrl:u, media_type:'image/jpeg', base64:u.split(',')[1] }); setRenderUrl(null); }; im.src=rd.result; }; rd.readAsDataURL(file); };
  const renderVisual=async(styleOverride)=>{
    if(!image) return;
    setRenderBusy(true); setRenderErr(''); setRenderUrl(null);
    try{
      const r=await aiFetch(SUPA_URL+'/functions/v1/ai_room_redesign',{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({ image_base64:image.base64, style:styleOverride||f.style, room:f.room, product:f.product||undefined, strength: mode==='furnish'?0.82:0.7 })});
      const d=await r.json().catch(()=>({}));
      if(d&&d.ok&&d.url){ setRenderUrl(d.url); setBaPos(55); } else { setRenderErr(d&&d.error==='Render not configured'?'Photoreal rendering isn’t switched on yet.':'Could not render — try another photo.'); }
    }catch{ setRenderErr('Network error — please try again.'); } finally{ setRenderBusy(false); }
  };
  const tryStyle=(sid)=>{ set('style',sid); if(image) renderVisual(sid); };
  const generate=async()=>{
    if(needsPhoto && !image){ toast('Add a photo of your room first','error'); return; }
    if(!needsPhoto && !f.requirements.trim()){ toast('Describe your space','error'); return; }
    setBusy(true); setConcept(null);
    const styleName=(STYLES.find(s=>s.id===f.style)||{}).name||'';
    const roomName=(ROOMS.find(r=>r[0]===f.room)||[])[1]||'';
    const brief=[f.requirements, needsPhoto?`Style: ${styleName}. Room: ${roomName}.`:''].filter(Boolean).join(' ');
    if(needsPhoto && image) renderVisual();
    try{
      const r=await aiFetch(SUPA_URL+'/functions/v1/ai_design_concept',{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'Content-Type':'application/json'},body:JSON.stringify({ requirements:brief, product:f.product||undefined, budget:f.budget?Number(f.budget):undefined, dimensions:{ width_cm:f.w?Number(f.w):undefined, height_cm:f.h?Number(f.h):undefined }, image_base64:image?.base64, media_type:image?.media_type })});
      const d=await r.json();
      if(d.ok&&d.concept){ setConcept(d.concept); setSaved(false); } else { toast('Could not generate — try adding more detail','error'); }
    }catch{ toast('AI is unavailable right now','error'); } finally{ setBusy(false); }
  };
  const chip=(t)=>(<span style={{ background:'var(--sand)', color:'var(--clay-deep)', borderRadius:980, padding:'6px 12px', fontSize:13, fontWeight:500 }}>{t}</span>);
  const hasResult = renderUrl || renderBusy || renderErr || concept || busy;
  return (<PageWrap eyebrow="AI design studio" title="Redesign your room in seconds." sub="Upload a photo of your space, pick a style, and our AI reimagines it — then turns it into a tailored concept with materials, storage ideas and indicative pricing.">
    <div className="resp-2col" style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'400px 1fr', gap:26, alignItems:'start' }}>
      {/* ── INTAKE ── */}
      <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:20, boxShadow:'var(--shadow)' }}>
        {/* Step 1 — mode */}
        <div className="eyebrow" style={{ marginBottom:10 }}>1 · How do you want to start?</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7, marginBottom:18 }}>
          {MODES.map(([id,label,sub])=>{ const on=mode===id; return (
            <button key={id} type="button" onClick={()=>{ setMode(id); setRenderUrl(null); }} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'#fff':'var(--cream)', borderRadius:12, padding:'9px 10px', cursor:'pointer' }}>
              <div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)', lineHeight:1.25 }}>{label}</div>
              <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:3, lineHeight:1.3 }}>{sub}</div>
            </button>); })}
        </div>
        {/* Step 2 — photo */}
        {needsPhoto && (<>
          <div className="eyebrow" style={{ marginBottom:10 }}>2 · Add your room</div>
          <label style={{ display:'flex', alignItems:'center', gap:12, border:'1.5px dashed var(--line)', background:'var(--cream)', borderRadius:14, padding:'14px 16px', cursor:'pointer', marginBottom:18 }}>
            {image ? <img src={image.dataUrl} alt="room" style={{ width:60, height:46, objectFit:'cover', borderRadius:9 }} /> : <i className="ti ti-camera" style={{ fontSize:24, color:'var(--clay)' }} aria-hidden="true" />}
            <span style={{ fontSize:14, fontWeight:500, color:'var(--ink)' }}>{image?'Photo added — tap to change':'Upload or take a photo'}</span>
            <input type="file" accept="image/*" onChange={e=>onPhoto(e.target.files?.[0])} style={{ display:'none' }} />
            {image && <span onClick={e=>{ e.preventDefault(); setImage(null); setRenderUrl(null); }} style={{ marginLeft:'auto', color:'var(--muted)', fontSize:20 }}>×</span>}
          </label>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:-12, marginBottom:18 }}>{t('imgHintRoomPhoto')}</div>
        </>)}
        {/* Step 3 — room + product */}
        <div className="eyebrow" style={{ marginBottom:10 }}>{needsPhoto?'3':'2'} · Room &amp; piece</div>
        {needsPhoto && <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {ROOMS.map(([id,label])=>{ const on=f.room===id; return (
            <button key={id} type="button" onClick={()=>set('room',id)} style={{ fontSize:12.5, fontWeight:500, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'#fff':'var(--cream)', color: on?'var(--clay-deep)':'var(--ink-soft)', borderRadius:99, padding:'6px 13px', cursor:'pointer' }}>{label}</button>); })}
        </div>}
        <select value={f.product} onChange={e=>set('product',e.target.value)} style={{...inpS, marginBottom:18}}>{PRODUCTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        {/* Step 4 — style */}
        {needsPhoto && (<>
          <div className="eyebrow" style={{ marginBottom:10 }}>4 · Pick a style</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
            {STYLES.map(s=>{ const on=f.style===s.id; return (
              <button key={s.id} type="button" onClick={()=>set('style',s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:12, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0 }}>
                <div style={{ height:42, background:s.g }} />
                <div style={{ fontSize:11, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)', padding:'6px 4px' }}>{s.name}</div>
              </button>); })}
          </div>
        </>)}
        {/* Notes / describe */}
        <div className="eyebrow" style={{ marginBottom:10 }}>{needsPhoto?'5 · Anything specific? (optional)':'3 · Describe your space'}</div>
        <textarea value={f.requirements} onChange={e=>set('requirements',e.target.value)} rows={needsPhoto?2:4} aria-label="Describe your requirements" placeholder={needsPhoto?'e.g. more shoe storage, soft lighting, hidden laundry':'e.g. a walk-in closet for a master bedroom, warm oak, lots of shoe and hanging space, soft lighting'} style={{...inpS, resize:'vertical', marginBottom:12}} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <input value={f.budget} onChange={e=>set('budget',e.target.value)} aria-label="Budget BHD (optional)" placeholder="Budget BHD (optional)" inputMode="numeric" style={inpS} />
          <input value={f.w} onChange={e=>set('w',e.target.value)} aria-label="Width cm (optional)" placeholder="Width cm (optional)" inputMode="numeric" style={inpS} />
        </div>
        <button type="button" className="btn-clay" disabled={busy||renderBusy} onClick={generate} style={{ width:'100%', borderRadius:14, padding:'14px', fontSize:15, opacity:(busy||renderBusy)?.6:1 }}>{(busy||renderBusy)?'Designing…':'Generate my design ✦'}</button>
      </div>

      {/* ── RESULT ── */}
      <div>
        {!hasResult && <div style={{ border:'1px dashed var(--line)', borderRadius:20, padding:'56px 24px', textAlign:'center', color:'var(--muted)', fontSize:15, background:'#fff' }}>
          <Spark size={30} color="var(--clay)" style={{ display:'block', marginBottom:12 }} />
          {needsPhoto?'Your before / after redesign and a tailored concept will appear here.':'Your AI concept — layout, materials, colours and package options — will appear here.'}
        </div>}

        {/* Visual before/after */}
        {needsPhoto && (renderBusy || renderUrl || renderErr) && (
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:16, boxShadow:'var(--shadow)', marginBottom:16 }}>
            {renderBusy && <div style={{ padding:'60px 0', textAlign:'center', color:'var(--ink-soft)', fontSize:14 }}><i className="ti ti-loader-2" style={{ fontSize:26, color:'var(--clay)' }} aria-hidden="true" /><div style={{ marginTop:10 }}>{t('sw3AiRedesigning')}</div></div>}
            {!renderBusy && renderErr && <div style={{ padding:'40px 12px', textAlign:'center', color:'var(--clay-deep)', fontSize:14 }}>{renderErr}</div>}
            {!renderBusy && renderUrl && (<>
              <div style={{ position:'relative', borderRadius:14, overflow:'hidden', aspectRatio:'4 / 3', background:'#000' }}>
                <img src={renderUrl} alt="After — AI redesign" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                <img src={image.dataUrl} alt="Before — your room" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', clipPath:`inset(0 ${100-baPos}% 0 0)` }} />
                <div style={{ position:'absolute', top:0, bottom:0, left:`${baPos}%`, width:2, background:'#fff', boxShadow:'0 0 8px rgba(0,0,0,.4)' }} />
                <span style={{ position:'absolute', top:10, left:10, background:'rgba(20,16,12,.7)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>BEFORE</span>
                <span style={{ position:'absolute', top:10, right:10, background:'var(--clay)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99 }}>AFTER ✦</span>
                <input type="range" min={0} max={100} value={baPos} onChange={e=>setBaPos(Number(e.target.value))} style={{ position:'absolute', left:'6%', right:'6%', bottom:12, width:'88%', accentColor:'var(--clay)' }} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center', marginTop:12, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color:'var(--muted)' }}>{t('sw3AiSliderCompare')}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <a href={renderUrl} download="closets-redesign.jpg" target="_blank" rel="noreferrer" style={{ padding:'8px 14px', borderRadius:99, background:'var(--ink)', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>Download</a>
                  <button type="button" onClick={()=>renderVisual()} style={{ padding:'8px 14px', borderRadius:99, border:'1px solid var(--line)', background:'#fff', color:'var(--ink)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Regenerate</button>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:12 }}>
                <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'center', marginRight:2 }}>Try another style:</span>
                {STYLES.map(s=>(<button key={s.id} type="button" onClick={()=>tryStyle(s.id)} title={s.name} aria-label={'Try ' + s.name} style={{ width:26, height:26, borderRadius:8, background:s.g, border: f.style===s.id?'2px solid var(--clay)':'1px solid var(--line)', cursor:'pointer' }} />))}
              </div>
            </>)}
          </div>
        )}

        {/* Concept */}
        {busy && !concept && <div style={{ color:'var(--ink-soft)', fontSize:15, padding:'18px 2px' }}>✦ Reading your brief and composing a concept…</div>}
        {concept && (<div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?20:26, boxShadow:'var(--shadow)' }}>
          <div className="eyebrow">AI concept</div>
          <h2 className="display" style={{ fontSize:26, color:'var(--ink)', margin:'6px 0 4px' }}>{concept.title}</h2>
          <div style={{ fontSize:13, color:'var(--muted)' }}>{concept.product} · {concept.layout} · {concept.finish_id} finish · {concept.width_cm}×{concept.height_cm}cm</div>
          <p style={{ fontSize:15, color:'var(--ink-soft)', lineHeight:1.65, marginTop:12 }}>{concept.summary}</p>
          {concept.materials?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>MATERIALS</h3><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.materials.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.colors?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>COLOURS</h3><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{concept.colors.map((m,i)=><span key={i}>{chip(m)}</span>)}</div></>}
          {concept.storage_ideas?.length>0 && <><h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:16, marginBottom:8 }}>STORAGE IDEAS</h3><ul style={{ margin:0, paddingLeft:18, color:'var(--ink-soft)', fontSize:14, lineHeight:1.7 }}>{concept.storage_ideas.map((m,i)=><li key={i}>{m}</li>)}</ul></>}
          <h3 style={{ fontSize:12, fontWeight:700, color:'var(--ink)', marginTop:18, marginBottom:8 }}>PACKAGES (indicative)</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {(concept.packages||[]).map((p,i)=>(<div key={p.tier} style={{ border:'1px solid '+(i===1?'var(--clay)':'var(--line)'), background:i===1?'var(--sand)':'#fff', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:13, fontWeight:700, color:i===1?'var(--clay-deep)':'var(--ink)' }}>{p.tier}{i===1?' · recommended':''}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginTop:3 }}>{formatBHDRange(p.price_from, p.price_to, CMS_LANG)}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, lineHeight:1.4 }}>{p.includes}</div>
            </div>))}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>{t('sw3AiIndicOnly')}</div>
          <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
            <button type="button" className="btn-clay" onClick={()=>setPage('booking')} style={{ borderRadius:980, padding:'11px 20px', fontSize:14 }}>{t('bookFreeVisit')}</button>
            <button type="button" onClick={()=>setPage('planner')} style={{ background:'var(--ink)', color:'#fff', border:'none', borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{t('sw3YasRefine3D')}</button>
            <button type="button" disabled={saved} onClick={saveConcept} style={{ background:'#fff', color: saved?'var(--good)':'var(--ink)', border:'1px solid '+(saved?'var(--good)':'var(--line)'), borderRadius:980, padding:'11px 20px', fontSize:14, fontWeight:600, cursor:'pointer' }}>{saved?'✓ Saved to account':(user?'Save to my account':'Sign in to save')}</button>
          </div>
        </div>)}
      </div>
    </div>
  </PageWrap>);
}

export { AIDesignerPage };
