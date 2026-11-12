// Route chunk "shared_DirectoryPage_ContactPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DirectoryPage, ContactPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { H, api } from '../App';
import { HUB_ORIGIN } from './shared_HomeHub_DirectoryPage_plus1';

const cardRpc = (name, body) => api('rpc/' + name, { method:'POST', headers:{ ...H, Prefer:'return=representation' }, body });

// Shared card-grid tile used by Directory + Contact team
function CardTile({ c }) {
  const theme = { corporate:'var(--clay)', executive:'#D4AF37', vendor:'#22C55E', vip:'#A855F7' }[c.theme] || 'var(--clay)';
  const initials = (c.display_name||'?').split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const img = c.photo_url || c.logo_url;
  const ptype = c.owner_type==='partner' ? 'vendor' : c.owner_type;
  const pillBg = { vendor:'#E7F8EE', customer:'#F5EBFE', employee:'#FFF1E6' }[ptype] || '#FFF1E6';
  const pillCol = { vendor:'#1a7a40', customer:'#7a3fb0', employee:'#b5560f' }[ptype] || '#b5560f';
  return (
    <a href={`${HUB_ORIGIN}/card.html?c=${encodeURIComponent(c.slug)}`} target="_blank" rel="noreferrer"
       style={{ textDecoration:'none', color:'var(--shop-ink, #1d1d1f)', background:'#fff', border:'1px solid #ececec', borderRadius:18, padding:20, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', transition:'transform .15s, box-shadow .15s' }}
       onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 12px 30px rgba(0,0,0,.08)';}}
       onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
      <div style={{ width:66, height:66, borderRadius:'50%', background:`linear-gradient(135deg,${theme},${theme}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff', overflow:'hidden', marginBottom:10 }}>
        {img ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : initials}
      </div>
      <div style={{ fontWeight:700, fontSize:15 }}>{c.display_name}</div>
      {c.title && <div style={{ color:theme, fontSize:12.5, marginTop:2 }}>{c.title}</div>}
      {c.location && <div style={{ color:'var(--shop-muted, #86868b)', fontSize:12, marginTop:4 }}>{c.location}</div>}
      <span style={{ marginTop:10, fontSize:10.5, fontWeight:700, borderRadius:980, padding:'3px 10px', textTransform:'capitalize', background:pillBg, color:pillCol }}>{ptype}</span>
    </a>
  );
}

export { cardRpc, CardTile };
