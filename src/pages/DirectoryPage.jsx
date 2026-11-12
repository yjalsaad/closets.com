// Route chunk "DirectoryPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DirectoryPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useEffect } from 'react';
import { cms, useMobile } from '../App';
import { CardTile, cardRpc } from './shared_DirectoryPage_ContactPage';
import { PageWrap } from './shared_DirectoryPage_ShowroomsPage_plus10';

function DirectoryPage({ setPage }) {
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const mobile = useMobile();
  useEffect(() => {
    let on = true;
    cardRpc('card_directory', { p_type: type || null, p_search: q || null, p_limit: 120 })
      .then(r => { if (on) setList(Array.isArray(r) ? r : []); }).catch(() => { if (on) setList([]); });
    return () => { on = false; };
  }, [type, q]);
  const tabs = [['','All'],['vendor','Vendors & Partners'],['customer','Members'],['employee','Team']];
  return (
    <PageWrap title={cms('directory.hero.title','Directory')} sub={cms('directory.hero.subtitle','Verified vendors, partners and members of The Closets International')}>
      <input value={q} onChange={e=>setQ(e.target.value)} aria-label="Search by name, trade or location" placeholder="Search by name, trade or location…"
        style={{ width:'100%', maxWidth:520, padding:'13px 18px', borderRadius:980, border:'1px solid #ececec', fontSize:15, marginBottom:16, fontFamily:'inherit' }}/>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24 }}>
        {tabs.map(([id,label]) => (
          <button type="button" key={id||'all'} onClick={()=>setType(id)} style={{ padding:'8px 16px', borderRadius:980, border:'1px solid #ececec', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background: type===id ? 'var(--clay)' : '#fff', color: type===id ? '#fff' : 'var(--shop-ink, #1d1d1f)' }}>{label}</button>
        ))}
      </div>
      {list === null ? <div style={{ color:'var(--shop-muted, #86868b)', padding:40 }}>Loading…</div>
        : list.length === 0 ? <div style={{ color:'var(--shop-muted, #86868b)', padding:40 }}>No cards found.</div>
        : <div style={{ display:'grid', gridTemplateColumns:`repeat(${mobile?2:4}, 1fr)`, gap:14 }}>{list.map(c => <CardTile key={c.slug} c={c} />)}</div>}
    </PageWrap>
  );
}

export { DirectoryPage };
