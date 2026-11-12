// Route chunk "DesignBuilderPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: DesignBuilderPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useRef, useEffect, Fragment } from 'react';
import { H, SUPA_URL, fmt, toast, useI18n, useMobile } from '../App';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';

/* ── Guided customer-facing DESIGN BUILDER (end-to-end) ── */
const rpc = async (fn, body) => {
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) { let m = 'request failed (' + r.status + ')'; try { const e = await r.json(); m = e.message || e.hint || e.details || m; } catch (_) {} throw new Error(m); }
  try { return await r.json(); } catch (_) { return null; }
};

const DB_PROJECT_TYPES = [
  { id:'wardrobe', name:'Wardrobe', sub:'Hanging, drawers & shelving', ic:'M3 4h18M5 4v16M19 4v16M12 4v16M7 9h2M15 9h2' },
  { id:'tv', name:'TV Unit', sub:'Media wall & console', ic:'M3 5h18v11H3zM8 20h8M12 16v4' },
  { id:'kitchen', name:'Kitchen', sub:'Cabinets, worktops & pantry', ic:'M4 4h16v16H4zM4 10h16M9 4v6M14 14v3' },
  { id:'walkin', name:'Walk-in', sub:'Dressing room & island', ic:'M4 3h16v18H4zM4 12h16M10 3v18' },
  { id:'storage', name:'Storage', sub:'Utility & garage systems', ic:'M3 7h18v13H3zM3 7l9-4 9 4M8 11h8' },
  { id:'doors', name:'Doors', sub:'Sliding & panel systems', ic:'M5 3h14v18H5zM12 3v18M9 12h0.01M15 12h0.01' },
];

const DB_PART_KINDS = [
  { kind:'cabinet',   name:'Cabinet',   w:60, h:200, depth:60, cost:85, ic:'M4 3h16v18H4zM4 9h16M9 6h0.01' },
  { kind:'drawer',    name:'Drawer',    w:60, h:30,  depth:55, cost:34, ic:'M3 7h18v10H3zM10 12h4' },
  { kind:'shelf',     name:'Shelf',     w:90, h:4,   depth:35, cost:14, ic:'M3 12h18M3 12v3M21 12v3' },
  { kind:'hanging',   name:'Hanging',   w:90, h:8,   depth:55, cost:22, ic:'M4 6h16M12 6v3M8 9a4 4 0 008 0' },
  { kind:'accessory', name:'Accessory', w:40, h:40,  depth:40, cost:28, ic:'M5 5h14v14H5zM9 9h6v6H9z' },
  { kind:'lighting',  name:'LED',       w:90, h:3,   depth:4,  cost:18, ic:'M9 18h6M10 21h4M7 9a5 5 0 1110 0c0 2-1 3-2 4H9c-1-1-2-2-2-4z' },
  { kind:'tv',        name:'TV',        w:120,h:70,  depth:6,  cost:0,  ic:'M3 5h18v11H3zM8 20h8' },
  { kind:'panel',     name:'Panel',     w:60, h:240, depth:2,  cost:26, ic:'M7 3h10v18H7zM7 12h10' },
];

const DB_FEATURES = [
  ['windows','Windows'],['doors','Doors'],['outlets','Electrical outlets'],['ac','AC unit'],
  ['columns','Columns'],['beams','Beams'],['plumbing','Plumbing'],['lighting','Existing lighting'],
];

const DB_STEPS = [
  ['req','Requirements'],['survey','Site Survey'],['build','Design Builder'],['style','Style'],
  ['materials','Materials'],['mood','Moodboard'],['cost','Cost'],['ai','AI Assistant'],
];

function DesignBuilderPage({ setPage, user }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [step, setStep] = useState('req');
  const [catalog, setCatalog] = useState({ styles:[], materials:[] });
  const [catErr, setCatErr] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [busy, setBusy] = useState(false);

  // requirements
  const [ptype, setPtype] = useState('wardrobe');
  const [req, setReq] = useState({});
  const [roomType, setRoomType] = useState('bedroom');
  const [lifestyle, setLifestyle] = useState('');
  const [family, setFamily] = useState(2);
  const [budget, setBudget] = useState({ min:500, max:2500 });
  const [timeline, setTimeline] = useState('4-6 weeks');
  const [special, setSpecial] = useState('');

  // survey
  const [survey, setSurvey] = useState({ room_w:300, room_l:280, ceiling_h:260, features:{}, media:{ photos:[] } });

  // builder
  const [parts, setParts] = useState([]);
  const [activeKind, setActiveKind] = useState('cabinet');
  const [wall, setWall] = useState('back');
  const [selId, setSelId] = useState(null);

  // style / materials
  const [styleId, setStyleId] = useState(null);
  const [boardId, setBoardId] = useState(null);
  const [finishId, setFinishId] = useState(null);

  // moodboard
  const [mood, setMood] = useState([]);
  const [moodUrl, setMoodUrl] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [swatch, setSwatch] = useState('#b0613b');

  // pricing
  const [price, setPrice] = useState(null);
  const [prevTotal, setPrevTotal] = useState(null);
  const [pricing, setPricing] = useState(false);
  const priceT = useRef(null);

  // inline contact (guest)
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'' });

  useEffect(() => {
    let alive = true;
    rpc('design_catalog', {}).then(d => {
      if (!alive) return;
      if (d && (Array.isArray(d.styles) || Array.isArray(d.materials))) setCatalog({ styles:d.styles||[], materials:d.materials||[] });
      else setCatErr(true);
    }).catch(() => { if (alive) setCatErr(true); });
    return () => { alive = false; };
  }, []);

  const boards = catalog.materials.filter(m => m.category === 'board');
  const finishes = catalog.materials.filter(m => m.category === 'finish');
  const hardwares = catalog.materials.filter(m => m.category === 'hardware');
  const accessories = catalog.materials.filter(m => m.category === 'accessory');
  const board = boards.find(b => b.id === boardId);
  const finish = finishes.find(f => f.id === finishId);
  const style = catalog.styles.find(s => s.id === styleId);

  const areaSqm = Math.max(0.5, (survey.room_w / 100) * (survey.room_l / 100));

  // ── live price (debounced) ──
  useEffect(() => {
    if (parts.length === 0 && !board) { setPrice(null); return; }
    setPricing(true);
    if (priceT.current) clearTimeout(priceT.current);
    priceT.current = setTimeout(async () => {
      try {
        const items = parts.map(p => ({ unit_cost: p.unit_cost, qty: p.qty || 1 }));
        const d = await rpc('design_price', {
          items, area_sqm: Number(areaSqm.toFixed(2)),
          board_id: boardId || null, finish_id: finishId || null, margin_pct: 35,
        });
        if (d && !d.error) { setPrice(prev => { if (prev && typeof prev.total_price === 'number') setPrevTotal(prev.total_price); return d; }); }
      } catch (_) { /* keep last */ } finally { setPricing(false); }
    }, 350);
    return () => priceT.current && clearTimeout(priceT.current);
  }, [parts, boardId, finishId, areaSqm, board]);

  // ── builder geometry ──
  const VW = 460, VH = 320, PAD = 26, GRID = 10;
  const IW = VW - PAD * 2, IH = VH - PAD * 2;
  const snap = v => Math.round(v / GRID) * GRID;
  const colForKind = k => k === 'lighting' ? 'var(--clay)' : k === 'tv' ? 'var(--ink)' : k === 'panel' ? 'var(--muted)' : style ? 'var(--clay-deep)' : 'var(--clay)';

  const addPart = (def) => {
    // click-to-place: append along the selected wall left→right, stacking when full
    const same = parts.filter(p => p.wall === wall);
    let x = PAD + 6, y = PAD + 6;
    if (same.length) { const last = same[same.length - 1]; x = snap(last.x + last.vw + 8); y = last.y; if (x + 40 > PAD + IW) { x = PAD + 6; y = snap(last.y + 60); } }
    const vw = Math.max(18, Math.min(IW - 12, def.w * 0.7));
    const vh = Math.max(8, Math.min(IH - 12, def.h * 0.28));
    setParts(p => [...p, { id: uid(), kind: def.kind, name: def.name, wall, x, y, vw, vh, w: def.w, h: def.h, depth: def.depth, qty: 1, unit_cost: def.cost, props: {} }]);
  };
  const removePart = id => { setParts(p => p.filter(x => x.id !== id)); if (selId === id) setSelId(null); };
  const clearParts = () => { setParts([]); setSelId(null); };

  // overlap detection (axis-aligned)
  const overlaps = (a, b) => a.x < b.x + b.vw && a.x + a.vw > b.x && a.y < b.y + b.vh && a.y + a.vh > b.y;
  const overlapSet = (() => { const s = new Set(); for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { if (overlaps(parts[i], parts[j])) { s.add(parts[i].id); s.add(parts[j].id); } } return s; })();

  // free drag via pointer events
  const svgRef = useRef(null);
  const drag = useRef(null);
  const toLocal = (e) => { const svg = svgRef.current; if (!svg) return { x:0, y:0 }; const r = svg.getBoundingClientRect(); const sx = VW / r.width, sy = VH / r.height; return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; };
  const onPartDown = (e, p) => { e.stopPropagation(); setSelId(p.id); const loc = toLocal(e); drag.current = { id: p.id, dx: loc.x - p.x, dy: loc.y - p.y }; try { e.target.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => { if (!drag.current) return; const loc = toLocal(e); const d = drag.current; setParts(list => list.map(p => { if (p.id !== d.id) return p; let nx = snap(loc.x - d.dx), ny = snap(loc.y - d.dy); nx = Math.max(PAD, Math.min(PAD + IW - p.vw, nx)); ny = Math.max(PAD, Math.min(PAD + IH - p.vh, ny)); return { ...p, x: nx, y: ny }; })); };
  const onUp = () => { drag.current = null; };

  // ── style auto-apply ──
  const applyStyle = (s) => {
    setStyleId(s.id);
    // try to match a board / finish suggested by the style by name
    const sm = (s.materials || []).map(x => (x || '').toLowerCase());
    const mb = boards.find(b => sm.some(n => (b.name || '').toLowerCase().includes(n) || n.includes((b.name || '').toLowerCase())));
    const mf = finishes.find(f => sm.some(n => (f.name || '').toLowerCase().includes(n) || n.includes((f.name || '').toLowerCase())));
    if (mb) setBoardId(mb.id);
    if (mf) setFinishId(mf.id);
    toast((mb || mf ? t('sw2DbStyleAppliedMat') : t('sw2DbStyleApplied')), 'success');
  };

  // ── AI heuristic suggestions ──
  const aiSuggestions = (() => {
    const out = [];
    if (finish && /acrylic|gloss/i.test(finish.name || '')) {
      const mel = finishes.find(f => /melamine|matte|laminate/i.test(f.name || ''));
      if (mel) { const delta = Math.max(0, (Number(finish.cost) || 0) - (Number(mel.cost) || 0)) * areaSqm; out.push({ id:'fin', label:t('sw2DbAiSwitchFin').replace('{a}', finish.name).replace('{b}', mel.name).replace('{s}', fmt(delta)), apply:() => { setFinishId(mel.id); toast(t('sw2DbAiFinSwitched').replace('{n}', mel.name), 'success'); } }); }
    }
    const hasLed = parts.some(p => p.kind === 'lighting');
    if (!hasLed) { const def = DB_PART_KINDS.find(d => d.kind === 'lighting'); out.push({ id:'led', label:t('sw2DbAiAddLed').replace('{c}', fmt(def.cost)), apply:() => { addPart(def); toast(t('sw2DbAiLedAdded'), 'success'); } }); }
    const drawers = parts.filter(p => p.kind === 'drawer').length;
    if (parts.length >= 2 && drawers === 0) { const def = DB_PART_KINDS.find(d => d.kind === 'drawer'); out.push({ id:'drw', label:t('sw2DbAiAddDrawer'), apply:() => { addPart(def); toast(t('sw2DbAiDrawerAdded'), 'success'); } }); }
    if (board) { const cheapest = boards.slice().sort((a, b) => (a.cost || 0) - (b.cost || 0))[0]; if (cheapest && cheapest.id !== board.id && (board.cost || 0) > (cheapest.cost || 0)) { const save = ((board.cost || 0) - (cheapest.cost || 0)) * areaSqm; out.push({ id:'brd', label:t('sw2DbAiUseBoard').replace('{n}', cheapest.name).replace('{s}', fmt(save)), apply:() => { setBoardId(cheapest.id); toast(t('sw2DbAiBoardSwitched').replace('{n}', cheapest.name), 'success'); } }); } }
    if (parts.length === 0) out.push({ id:'start', label:t('sw2DbAiStart'), apply:() => setStep('build') });
    return out;
  })();

  // ── save payload ──
  const buildPayload = (stage) => ({
    id: savedId || undefined,
    customer_id: user?.id || null,
    customer_name: contact.name || user?.name || null,
    customer_phone: contact.phone || user?.phone || null,
    customer_email: contact.email || user?.email || null,
    project_type: ptype, room_type: roomType, stage,
    style_id: styleId || null,
    budget_min: budget.min, budget_max: budget.max, timeline,
    requirements: { ...req, lifestyle, family_members: family, special_requirements: special, board_id: boardId, finish_id: finishId },
    survey: { room_w: survey.room_w, room_l: survey.room_l, ceiling_h: survey.ceiling_h, features: survey.features, media: { photos: survey.media.photos } },
    items: parts.map(p => ({ kind: p.kind, name: p.name, wall: p.wall, x: p.x, y: p.y, w: p.w, h: p.h, depth: p.depth, qty: p.qty || 1, unit_cost: p.unit_cost, props: p.props || {} })),
    moodboard: mood.map(m => ({ kind: m.kind, url: m.url || null, note: m.note || null })),
  });
  const needContact = !user && (!contact.name.trim() || !contact.phone.trim());

  const saveDraft = async () => {
    if (needContact) { toast(t('w4AddNamePhoneFirst'), 'error'); setStep('req'); return; }
    setBusy(true);
    try { const id = await rpc('design_save', buildPayload('draft')); const rid = (typeof id === 'string') ? id : (id && id.id) || id; if (rid) setSavedId(rid); toast(t('w4DraftSaved'), 'success'); }
    catch (e) { toast(t('w4CouldNotSave') + ' ' + (e?.message || t('w4TryAgain')), 'error'); }
    finally { setBusy(false); }
  };
  const submitApproval = async () => {
    if (needContact) { toast(t('w4AddNamePhoneFirst'), 'error'); setStep('req'); return; }
    setBusy(true);
    try {
      const id = await rpc('design_save', buildPayload('review'));
      const rid = (typeof id === 'string') ? id : (id && id.id) || id;
      if (rid) setSavedId(rid);
      await rpc('design_approval', { p_id: rid, p_kind: 'concept', p_status: 'pending', p_by: contact.name || user?.name || 'Customer', p_signature: null, p_note: 'Submitted from website Design Builder' });
      toast(t('w4SubmittedApproval'), 'success');
      setPage('home');
    } catch (e) { toast(t('w4CouldNotSubmit') + ' ' + (e?.message || t('w4TryAgain')), 'error'); }
    finally { setBusy(false); }
  };

  // photo upload (compress → data URL)
  const onSurveyPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width:w, height:h } = img;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.72);
        setSurvey(s => ({ ...s, media: { ...s.media, photos: [...s.media.photos, dataUrl].slice(0, 8) } }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // ── shared field styles ──
  const inS = { width:'100%', padding:'11px 13px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:14.5, fontFamily:'inherit', color:'var(--ink)' };
  const lblS = { fontSize:12.5, fontWeight:600, color:'var(--ink-soft)', marginBottom:6, display:'block' };
  const card = { background:'#fff', border:'1px solid var(--line)', borderRadius:18, padding: mobile?16:22, boxShadow:'var(--shadow)' };
  const chip = (on) => ({ padding:'8px 14px', borderRadius:99, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', color: on?'var(--clay-deep)':'var(--ink-soft)', fontSize:13, fontWeight: on?700:500, cursor:'pointer' });

  const Toggle = ({ label, val, set }) => (
    <button type="button" onClick={() => set(!val)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'10px 13px', border:'1px solid var(--line)', background: val?'var(--sand)':'#fff', borderRadius:12, cursor:'pointer', fontSize:14, color:'var(--ink)' }}>
      <span>{label}</span><span style={{ width:18, height:18, borderRadius:6, border:'2px solid '+(val?'var(--clay)':'var(--line)'), background: val?'var(--clay)':'#fff', color:'#fff', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{val?'✓':''}</span>
    </button>
  );
  const Counter = ({ label, k }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0' }}>
      <span style={{ fontSize:14, color:'var(--ink)' }}>{label}</span>
      <span style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button type="button" onClick={() => setReq(r => ({ ...r, [k]: Math.max(0, (r[k]||0) - 1) }))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--line)', background:'#fff', fontSize:16, cursor:'pointer', color:'var(--ink)' }}>−</button>
        <span style={{ minWidth:22, textAlign:'center', fontWeight:700, color:'var(--clay-deep)' }}>{req[k]||0}</span>
        <button type="button" onClick={() => setReq(r => ({ ...r, [k]: (r[k]||0) + 1 }))} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--line)', background:'#fff', fontSize:16, cursor:'pointer', color:'var(--ink)' }}>+</button>
      </span>
    </div>
  );

  const total = price?.total_price || 0;
  const variation = prevTotal != null ? total - prevTotal : 0;
  const dbStepLabels = { req:t('sw2DbStepReq'), survey:t('sw2DbStepSurvey'), build:t('sw2DbStepBuild'), style:t('sw2DbStepStyle'), materials:t('sw2DbStepMaterials'), mood:t('sw2DbStepMood'), cost:t('sw2DbStepCost'), ai:t('sw2DbStepAi') };
  const dbFeatureLabels = { windows:t('sw2DbFeatWindows'), doors:t('sw2DbFeatDoors'), outlets:t('sw2DbFeatOutlets'), ac:t('sw2DbFeatAc'), columns:t('sw2DbFeatColumns'), beams:t('sw2DbFeatBeams'), plumbing:t('sw2DbFeatPlumbing'), lighting:t('sw2DbFeatLighting') };

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:64, paddingBottom:90 }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2DbEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile?28:44, color:'var(--ink)' }}>{t('sw2DbTitle')}</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:15.5, marginTop:8 }}>{t('sw2DbSub')}</p>
        </div>

        {catErr && <div style={{ ...card, marginBottom:16, borderColor:'var(--clay)', color:'var(--clay-deep)', textAlign:'center' }}>{t('sw2DbCatErr')}</div>}

        {/* step tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', marginBottom:18, paddingBottom:4 }}>
          {DB_STEPS.map(([id, label], i) => { const on = step === id; return (
            <button key={id} type="button" onClick={() => setStep(id)} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:99, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: on?'var(--clay)':'var(--sand)', color: on?'#fff':'var(--ink-soft)' }}>
              <span style={{ width:18, height:18, borderRadius:99, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', background: on?'rgba(255,255,255,.25)':'var(--line)', color: on?'#fff':'var(--muted)' }}>{i+1}</span>{dbStepLabels[id]||label}
            </button>); })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.05fr 1fr', gap:20, alignItems:'start' }}>
          {/* LEFT: live canvas + cost rail (sticky) */}
          <div style={{ position: mobile?'static':'sticky', top:96, display:'flex', flexDirection:'column', gap:16 }}>
            <div style={card}>
              <div style={{ background:'var(--sand)', borderRadius:14, padding:10 }}>
                <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerDown={() => setSelId(null)} style={{ width:'100%', height:'auto', display:'block', touchAction:'none', cursor: drag.current?'grabbing':'default' }} aria-label="Design canvas">
                  <defs>
                    <pattern id="dbgrid" width={GRID} height={GRID} patternUnits="userSpaceOnUse"><path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="rgba(0,0,0,.05)" strokeWidth="1" /></pattern>
                  </defs>
                  <rect x={PAD} y={PAD} width={IW} height={IH} rx="6" fill="#fff" stroke="#cbbfae" strokeWidth="2" strokeDasharray="5 5" />
                  <rect x={PAD} y={PAD} width={IW} height={IH} fill="url(#dbgrid)" />
                  {parts.map(p => { const sel = selId === p.id; const bad = overlapSet.has(p.id); return (
                    <g key={p.id} onPointerDown={e => onPartDown(e, p)} style={{ cursor:'grab' }}>
                      <rect x={p.x} y={p.y} width={p.vw} height={p.vh} rx="3" fill={colForKind(p.kind)} opacity={p.kind==='lighting'?0.75:0.92} stroke={bad?'#d93025':sel?'var(--ink)':'rgba(0,0,0,.18)'} strokeWidth={sel||bad?2:1} />
                      {p.vw > 30 && p.vh > 14 && <text x={p.x + p.vw/2} y={p.y + p.vh/2 + 3} textAnchor="middle" fontSize="9" fill="#fff" style={{ pointerEvents:'none' }}>{p.name}</text>}
                      {sel && <text x={p.x + p.vw/2} y={p.y - 4} textAnchor="middle" fontSize="9" fill="var(--ink)" style={{ pointerEvents:'none' }}>{p.w}×{p.h}cm</text>}
                    </g>); })}
                  <text x={VW/2} y={VH-7} textAnchor="middle" fontSize="10" fill="var(--muted)">{survey.room_w} × {survey.room_l} cm · {parts.length} part{parts.length===1?'':'s'}</text>
                </svg>
              </div>
              {selId && (() => { const p = parts.find(x => x.id === selId); if (!p) return null; return (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, fontSize:12.5, color:'var(--ink-soft)' }}>
                  <span>{t('sw2DbSelected')}: <b style={{ color:'var(--ink)' }}>{p.name}</b> · {fmt(p.unit_cost)}{overlapSet.has(p.id) && <span style={{ color:'#d93025', marginLeft:8 }}>{t('sw2DbOverlapping')}</span>}</span>
                  <button type="button" onClick={() => removePart(p.id)} style={{ background:'none', border:'1px solid var(--line)', borderRadius:99, padding:'4px 12px', fontSize:12, cursor:'pointer', color:'var(--clay)' }}>{t('sw2DbRemove')}</button>
                </div>); })()}
            </div>

            {/* real-time cost panel */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span className="eyebrow" style={{ margin:0 }}>{t('sw2DbLiveEst')}</span>
                {pricing && <span style={{ fontSize:11, color:'var(--muted)' }}>{t('sw2DbUpdating')}</span>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>{t('sw2DbCurrentPrice')}</div><div className="display" style={{ fontSize:26, color:'var(--clay)' }}>{price?fmt(total):'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>{t('sw2DbVariation')}</div><div style={{ fontSize:18, fontWeight:700, color: variation>0?'var(--clay-deep)':variation<0?'var(--clay)':'var(--muted)' }}>{prevTotal!=null?(variation>=0?'+':'')+(variation<0?'−':'')+fmt(Math.abs(variation)):'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>{t('sw2DbMargin')}</div><div style={{ fontSize:18, fontWeight:700, color:'var(--ink)' }}>{price?Math.round(price.margin_pct||0)+'%':'—'}</div></div>
                <div><div style={{ fontSize:11, color:'var(--muted)' }}>{t('sw2DbEstDelivery')}</div><div style={{ fontSize:14.5, fontWeight:700, color:'var(--ink)' }}>{price?.estimated_delivery?new Date(price.estimated_delivery).toLocaleDateString(lang==='ar'?'ar-BH-u-ca-gregory-nu-latn':'en-GB',{ day:'numeric', month:'short' }):'—'}</div></div>
              </div>
              {price && <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--line)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12, color:'var(--ink-soft)' }}>
                <span>{t('sw2DbMaterials')}</span><span style={{ textAlign:'right' }}>{fmt(price.material_cost)}</span>
                <span>{t('sw2DbLabour')}</span><span style={{ textAlign:'right' }}>{fmt(price.labor_cost)}</span>
                <span>{t('sw2DbDelivery')}</span><span style={{ textAlign:'right' }}>{fmt(price.delivery_cost)}</span>
                <span>{t('sw2DbInstall')}</span><span style={{ textAlign:'right' }}>{fmt(price.install_cost)}</span>
              </div>}
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:10 }}>{t('sw2DbIndicConf')}</div>
            </div>
          </div>

          {/* RIGHT: step panels */}
          <div style={card}>
            {/* STEP 1 — REQUIREMENTS */}
            {step === 'req' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbWhatDesign')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbPickType')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:18 }}>
                {DB_PROJECT_TYPES.map(t => { const on = ptype === t.id; return (
                  <button key={t.id} type="button" onClick={() => { setPtype(t.id); setReq({}); }} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:14, padding:'11px 12px', cursor:'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5" aria-hidden="true"><path d={t.ic} /></svg>
                    <div style={{ fontSize:13.5, fontWeight:700, color: on?'var(--clay-deep)':'var(--ink)', marginTop:6 }}>{trOpt(t.name, lang)}</div>
                    <div style={{ fontSize:10.5, color:'var(--muted)' }}>{trOpt(t.sub, lang)}</div>
                  </button>); })}
              </div>

              {/* type-aware fields */}
              {ptype === 'wardrobe' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>{t('sw2DbHangStorage')}</span>
                <Counter label={t('sw2DbLongHang')} k="long_hanging" />
                <Counter label={t('sw2DbShortHang')} k="short_hanging" />
                <Counter label={t('sw2DbDrawerBanks')} k="drawers" />
                <Counter label={t('sw2DbShoeStorage')} k="shoe_storage" />
                <span style={{ ...lblS, marginTop:12 }}>{t('sw2DbAccessories')}</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['safe_box',t('sw2DbSafeBox')],['jewelry_drawer',t('sw2DbJewelry')],['ironing_board',t('sw2DbIroning')],['laundry_basket',t('sw2DbLaundry')]].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {ptype === 'tv' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>{t('sw2DbTvSize')}</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>{['43"','55"','65"','75"','85"+'].map(s => <button key={s} type="button" onClick={() => setReq(r => ({ ...r, tv_size: s }))} style={chip(req.tv_size === s)}>{s}</button>)}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['console',t('sw2DbConsole')],['display_shelves',t('sw2DbDisplayShelves')],['gaming',t('sw2DbGaming')],['sound_system',t('sw2DbSound')]].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {ptype === 'kitchen' && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>{t('sw2DbAppliances')}</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                  {[['oven',t('sw2DbOven')],['hob',t('sw2DbHob')],['dishwasher',t('sw2DbDishwasher')],['fridge',t('sw2DbFridge')],['microwave',t('sw2DbMicrowave')]].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
                <span style={lblS}>{t('sw2DbCooking')}</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>{[['Light',t('sw2DbCookLight')],['Everyday',t('sw2DbCookEveryday')],['Avid cook',t('sw2DbCookAvid')],['Entertainer',t('sw2DbCookEntertainer')]].map(([v,lbl]) => <button key={v} type="button" onClick={() => setReq(r => ({ ...r, cooking: v }))} style={chip(req.cooking === v)}>{lbl}</button>)}</div>
                <span style={lblS}>{t('sw2DbStoragePantry')}</span>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['pantry',t('sw2DbPantry')],['extra_storage',t('sw2DbExtraStorage')],['island',t('sw2DbIslandStorage')]].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}
              {(ptype === 'walkin' || ptype === 'storage' || ptype === 'doors') && (<div style={{ marginBottom:16 }}>
                <span style={lblS}>{t('sw2DbMainFeatures')}</span>
                <Counter label={t('sw2DbHanging')} k="hanging" />
                <Counter label={t('sw2DbDrawerBanks')} k="drawers" />
                <Counter label={t('sw2DbShelving')} k="shelving" />
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:10 }}>
                  {[['island',t('sw2DbIslandDresser')],['mirror',t('sw2DbMirror')],['lighting',t('sw2DbLighting')]].map(([k,l]) => <Toggle key={k} label={l} val={!!req[k]} set={v => setReq(r => ({ ...r, [k]: v }))} />)}
                </div>
              </div>)}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div><span style={lblS}>{t('sw2DbRoomType')}</span>
                  <select value={roomType} onChange={e => setRoomType(e.target.value)} style={inS}>{['bedroom','master bedroom','living room','dressing room','hallway','kitchen','office','kids room','utility'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><span style={lblS}>{t('sw2DbFamilyMembers')}</span>
                  <input type="number" min={1} max={12} value={family} onChange={e => setFamily(parseInt(e.target.value) || 1)} style={inS} /></div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>{t('sw2DbLifestyle')}</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{[['Minimal',t('sw2DbLifeMinimal')],['Family',t('sw2DbLifeFamily')],['Collector',t('sw2DbLifeCollector')],['Busy professional',t('sw2DbLifeBusy')],['Luxury',t('sw2DbLifeLuxury')]].map(([v,lbl]) => <button key={v} type="button" onClick={() => setLifestyle(v)} style={chip(lifestyle === v)}>{lbl}</button>)}</div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>{t('sw2DbBudgetRange')} — {fmt(budget.min)} {t('sw2DbBudgetTo')} {fmt(budget.max)}</span>
                <div style={{ display:'flex', gap:10 }}>
                  <input type="range" min={200} max={10000} step={100} value={budget.min} onChange={e => setBudget(b => ({ ...b, min: Math.min(parseInt(e.target.value), b.max - 100) }))} style={{ flex:1, accentColor:'var(--clay)' }} />
                  <input type="range" min={300} max={20000} step={100} value={budget.max} onChange={e => setBudget(b => ({ ...b, max: Math.max(parseInt(e.target.value), b.min + 100) }))} style={{ flex:1, accentColor:'var(--clay)' }} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}><span style={lblS}>{t('sw2DbTimeline')}</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{[['2-3 weeks',t('sw2DbTl1')],['4-6 weeks',t('sw2DbTl2')],['2-3 months',t('sw2DbTl3')],['Flexible',t('sw2DbTlFlexible')]].map(([v,lbl]) => <button key={v} type="button" onClick={() => setTimeline(v)} style={chip(timeline === v)}>{lbl}</button>)}</div>
              </div>
              <div style={{ marginBottom:4 }}><span style={lblS}>{t('sw2DbSpecialReq')}</span>
                <textarea value={special} onChange={e => setSpecial(e.target.value)} rows={3} aria-label={t('sw2DbSpecialAria')} placeholder={t('sw2DbSpecialPh')} style={{ ...inS, resize:'vertical' }} /></div>
            </Fragment>)}

            {/* STEP 2 — SITE SURVEY */}
            {step === 'survey' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbSiteSurvey')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbSurveySub')}</p>
              {[[t('sw2DbRoomWidth'),'room_w',150,800],[t('sw2DbRoomLength'),'room_l',150,800],[t('sw2DbCeilingHeight'),'ceiling_h',200,400]].map(([lbl,k,mn,mx]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{survey[k]}cm</span></div>
                  <input type="range" min={mn} max={mx} step={5} value={survey[k]} onChange={e => setSurvey(s => ({ ...s, [k]: parseInt(e.target.value) }))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>
              ))}
              <span style={{ ...lblS, marginTop:6 }}>{t('sw2DbExistingFeatures')}</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {DB_FEATURES.map(([k,l]) => <Toggle key={k} label={dbFeatureLabels[k]||l} val={!!survey.features[k]} set={v => setSurvey(s => ({ ...s, features: { ...s.features, [k]: v } }))} />)}
              </div>
              <span style={lblS}>{t('sw2DbRoomPhotos')} ({survey.media.photos.length}/8)</span>
              <div style={{ fontSize:12, color:'var(--muted)', margin:'2px 0 8px' }}>{t('imgHintRoomPhoto')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {survey.media.photos.map((src, i) => (
                  <div key={i} style={{ position:'relative', width:78, height:78, borderRadius:12, overflow:'hidden', border:'1px solid var(--line)' }}>
                    <img src={src} alt={'room '+(i+1)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button type="button" onClick={() => setSurvey(s => ({ ...s, media: { ...s.media, photos: s.media.photos.filter((_, j) => j !== i) } }))} style={{ position:'absolute', top:3, right:3, width:20, height:20, borderRadius:99, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, cursor:'pointer', lineHeight:1 }}>×</button>
                  </div>
                ))}
                {survey.media.photos.length < 8 && (
                  <label style={{ width:78, height:78, borderRadius:12, border:'1.5px dashed var(--line)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--muted)', fontSize:24, background:'var(--cream)' }}>+
                    <input type="file" accept="image/*" onChange={e => onSurveyPhoto(e.target.files?.[0])} style={{ display:'none' }} />
                  </label>
                )}
              </div>
            </Fragment>)}

            {/* STEP 3 — DESIGN BUILDER */}
            {step === 'build' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbDesignBuilder')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 12px' }}>{t('sw2DbBuilderSub')}</p>
              <span style={lblS}>{t('sw2DbPlaceWall')}</span>
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>{[['back',t('sw2DbWallBack')],['left',t('sw2DbWallLeft')],['right',t('sw2DbWallRight')],['front',t('sw2DbWallFront')]].map(([w,lbl]) => <button key={w} type="button" onClick={() => setWall(w)} style={{ ...chip(wall === w), flex:1 }}>{lbl}</button>)}</div>
              <span style={lblS}>{t('sw2DbAddPart')}</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {DB_PART_KINDS.map(d => (
                  <button key={d.kind} type="button" onClick={() => { setActiveKind(d.kind); addPart(d); }} style={{ display:'flex', alignItems:'center', gap:9, textAlign:'left', border: activeKind===d.kind?'1.5px solid var(--clay)':'1px solid var(--line)', background:'var(--cream)', borderRadius:12, padding:'9px 11px', cursor:'pointer' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.6" aria-hidden="true"><path d={d.ic} /></svg>
                    <span style={{ lineHeight:1.2 }}><span style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--ink)' }}>{d.name}</span><span style={{ fontSize:11, color:'var(--muted)' }}>{d.w}×{d.h}cm · {fmt(d.cost)}</span></span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink)' }}>{t('sw2DbPlacedParts')} ({parts.length})</span>
                {parts.length > 0 && <button type="button" onClick={clearParts} style={{ fontSize:12, color:'var(--clay)', background:'none', border:'none', cursor:'pointer' }}>{t('sw2DbClearAll')}</button>}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {parts.length === 0 && <span style={{ fontSize:13, color:'var(--muted)' }}>{t('sw2DbNoParts')}</span>}
                {parts.map(p => <button key={p.id} type="button" onClick={() => setSelId(p.id)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, border: selId===p.id?'1.5px solid var(--clay)':'1px solid var(--line)', background:'#fff', borderRadius:99, padding:'5px 10px', cursor:'pointer', color:'var(--ink)' }}>{p.name} <span onClick={e => { e.stopPropagation(); removePart(p.id); }} style={{ color:'var(--muted)' }}>×</span></button>)}
              </div>
            </Fragment>)}

            {/* STEP 4 — STYLE */}
            {step === 'style' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbChooseStyle')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbStyleSub')}</p>
              {catalog.styles.length === 0 && <div style={{ fontSize:13, color:'var(--muted)' }}>{t('sw2DbStylesLoading')}</div>}
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:12 }}>
                {catalog.styles.map(s => { const on = styleId === s.id; return (
                  <div key={s.id} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff' }}>
                    <button type="button" onClick={() => applyStyle(s)} style={{ width:'100%', textAlign:'left', border:'none', background:'none', cursor:'pointer', padding:0 }}>
                      <div style={{ display:'flex', height:46 }}>{(s.colors && s.colors.length ? s.colors : ['#b0613b','#ebe4d8','#1f1913']).slice(0,5).map((c, i) => <div key={i} style={{ flex:1, background: c }} />)}</div>
                      <div style={{ padding:'10px 12px' }}>
                        <div style={{ fontSize:14, fontWeight:700, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}{on?(' '+t('sw2DbStyleSelected')):''}</div>
                        <div style={{ fontSize:11.5, color:'var(--muted)' }}>{trOpt(s.sub, lang)}</div>
                      </div>
                    </button>
                    {on && (
                      <div style={{ padding:'0 12px 12px', fontSize:11.5, color:'var(--ink-soft)' }}>
                        {[[t('sw2DbMaterialsLbl'), s.materials],[t('sw2DbHandlesLbl'), s.handles],[t('sw2DbLightingLbl'), s.lighting],[t('sw2DbAccessoriesLbl'), s.accessories],[t('sw2DbProfilesLbl'), s.profiles]].filter(([, v]) => v && v.length).map(([lbl, v]) => (
                          <div key={lbl} style={{ marginTop:6 }}><b style={{ color:'var(--ink)' }}>{lbl}:</b> {v.join(', ')}</div>
                        ))}
                      </div>
                    )}
                  </div>); })}
              </div>
            </Fragment>)}

            {/* STEP 5 — MATERIALS */}
            {step === 'materials' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbMaterialsShowroom')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbMaterialsShowroomSub')}</p>
              {[[t('sw2DbBoards'), boards, boardId, setBoardId],[t('sw2DbFinishes'), finishes, finishId, setFinishId]].map(([title, list, sel, setSel]) => (
                <div key={title} style={{ marginBottom:14 }}>
                  <span style={lblS}>{title}</span>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {list.length === 0 && <span style={{ fontSize:12.5, color:'var(--muted)' }}>{t('sw2DbLoading')}</span>}
                    {list.map(m => { const on = sel === m.id; return (
                      <button key={m.id} type="button" onClick={() => setSel(m.id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{m.name}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{m.sub||''} · {fmt(m.cost)}/{m.unit||'unit'}</div>
                      </button>); })}
                  </div>
                </div>
              ))}
              {(hardwares.length > 0 || accessories.length > 0) && (
                <div style={{ marginBottom:14 }}>
                  <span style={lblS}>{t('sw2DbHardwareAccessories')}</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {[...hardwares, ...accessories].map(m => <span key={m.id} style={{ fontSize:11.5, border:'1px solid var(--line)', borderRadius:99, padding:'5px 11px', color:'var(--ink-soft)', background:'#fff' }}>{m.name} · {fmt(m.cost)}</span>)}
                  </div>
                </div>
              )}
              {(boards.length + finishes.length) > 0 && (
                <div style={{ marginTop:8, border:'1px solid var(--line)', borderRadius:12, overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5, minWidth:560 }}>
                    <thead><tr style={{ background:'var(--sand)' }}>{[t('sw2DbThMaterial'),t('sw2DbThCost'),t('sw2DbThWarranty'),t('sw2DbThDurability'),t('sw2DbThScratch'),t('sw2DbThWater'),t('sw2DbThLead'),t('sw2DbThSupplier'),t('sw2DbThMaint')].map(h => <th key={h} style={{ textAlign:'left', padding:'8px 10px', color:'var(--ink-soft)', fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...boards, ...finishes].map(m => (
                        <tr key={m.id} style={{ borderTop:'1px solid var(--line)', background:(m.id===boardId||m.id===finishId)?'var(--cream)':'#fff' }}>
                          <td style={{ padding:'8px 10px', fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap' }}>{m.name}</td>
                          <td style={{ padding:'8px 10px' }}>{fmt(m.cost)}</td>
                          <td style={{ padding:'8px 10px' }}>{m.warranty_months?m.warranty_months+'mo':'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.durability||'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.scratch_resist||'—'}</td>
                          <td style={{ padding:'8px 10px' }}>{m.water_resist||'—'}</td>
                          <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>{m.lead_days?m.lead_days+'d':'—'}</td>
                          <td style={{ padding:'8px 10px', whiteSpace:'nowrap' }}>{m.supplier||'—'}{m.supplier_rating?' ★'+m.supplier_rating:''}</td>
                          <td style={{ padding:'8px 10px' }}>{m.maintenance||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Fragment>)}

            {/* STEP 6 — MOODBOARD */}
            {step === 'mood' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbMoodboard')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbMoodSub')}</p>
              <span style={lblS}>{t('sw2DbInspoUrl')}</span>
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <input value={moodUrl} onChange={e => setMoodUrl(e.target.value)} aria-label={t('sw2DbInspoUrl')} placeholder="https://…" style={inS} />
                <button type="button" onClick={() => { if (!moodUrl.trim()) return; setMood(m => [...m, { id:uid(), kind:'image', url:moodUrl.trim() }]); setMoodUrl(''); }} className="btn-clay" style={{ borderRadius:12, padding:'0 16px', whiteSpace:'nowrap' }}>{t('sw2DbAdd')}</button>
              </div>
              <span style={lblS}>{t('sw2DbColourPalette')}</span>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
                <input type="color" value={swatch} onChange={e => setSwatch(e.target.value)} style={{ width:44, height:40, border:'1px solid var(--line)', borderRadius:10, background:'#fff', cursor:'pointer' }} />
                <button type="button" onClick={() => setMood(m => [...m, { id:uid(), kind:'color', note:swatch }])} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:12, padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--ink)' }}>{t('sw2DbAddSwatch')}</button>
              </div>
              <span style={lblS}>{t('sw2DbSampleNote')}</span>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input value={moodNote} onChange={e => setMoodNote(e.target.value)} aria-label={t('sw2DbInspoNoteAria')} placeholder={t('sw2DbMoodNotePh')} style={inS} />
                <button type="button" onClick={() => { if (!moodNote.trim()) return; setMood(m => [...m, { id:uid(), kind:'note', note:moodNote.trim() }]); setMoodNote(''); }} style={{ border:'1px solid var(--line)', background:'#fff', borderRadius:12, padding:'0 16px', fontSize:13, fontWeight:600, cursor:'pointer', color:'var(--ink)', whiteSpace:'nowrap' }}>{t('sw2DbAdd')}</button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {mood.length === 0 && <span style={{ fontSize:13, color:'var(--muted)' }}>{t('sw2DbNothingPinned')}</span>}
                {mood.map(m => (
                  <div key={m.id} style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid var(--line)' }}>
                    {m.kind === 'image' && <img src={m.url} alt="inspiration" style={{ width:96, height:96, objectFit:'cover', display:'block' }} onError={e => { e.target.style.display='none'; }} />}
                    {m.kind === 'color' && <div style={{ width:96, height:96, background:m.note }} />}
                    {m.kind === 'note' && <div style={{ width:140, height:96, padding:10, fontSize:12, color:'var(--ink-soft)', background:'var(--cream)', overflow:'hidden' }}>{m.note}</div>}
                    <button type="button" onClick={() => setMood(x => x.filter(p => p.id !== m.id))} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:99, border:'none', background:'rgba(0,0,0,.55)', color:'#fff', fontSize:12, cursor:'pointer', lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            </Fragment>)}

            {/* STEP 7 — COST */}
            {step === 'cost' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbRealtimeCost')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbCostSub')}</p>
              {!price && <div style={{ fontSize:13.5, color:'var(--muted)' }}>{t('sw2DbAddPartsHint')}</div>}
              {price && (<Fragment>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                  {[[t('sw2DbCurrentPrice'), fmt(total), 'var(--clay)'],[t('sw2DbVariation'), prevTotal!=null?((variation>=0?'+':'−')+fmt(Math.abs(variation))):'—', variation<0?'var(--clay)':'var(--clay-deep)'],[t('sw2DbMargin'), Math.round(price.margin_pct||0)+'%', 'var(--ink)'],[t('sw2DbEstDelivery'), price.estimated_delivery?new Date(price.estimated_delivery).toLocaleDateString(lang==='ar'?'ar-BH-u-ca-gregory-nu-latn':'en-GB',{ day:'numeric', month:'short', year:'numeric' }):'—', 'var(--ink)']].map(([l, v, c]) => (
                    <div key={l} style={{ border:'1px solid var(--line)', borderRadius:12, padding:'12px 14px', background:'var(--cream)' }}><div style={{ fontSize:11, color:'var(--muted)' }}>{l}</div><div className="display" style={{ fontSize:20, color:c, marginTop:2 }}>{v}</div></div>
                  ))}
                </div>
                <div style={{ border:'1px solid var(--line)', borderRadius:12, overflow:'hidden' }}>
                  {[[t('sw2DbMaterialCost'), price.material_cost,'mat'],[t('sw2DbLabour'), price.labor_cost,'lab'],[t('sw2DbDelivery'), price.delivery_cost,'del'],[t('sw2DbInstallation'), price.install_cost,'ins'],[t('sw2DbSubtotal'), price.subtotal,'sub']].map(([l, v, kk], i, a) => (
                    <div key={kk} style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', fontSize:13.5, borderBottom: i<a.length-1?'1px solid var(--line)':'none', fontWeight: kk==='sub'?700:500, color: kk==='sub'?'var(--ink)':'var(--ink-soft)', background: kk==='sub'?'var(--sand)':'#fff' }}><span>{l}</span><span>{fmt(v)}</span></div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'13px 14px', fontSize:15, fontWeight:700, color:'var(--clay-deep)', background:'var(--sand)', borderTop:'1px solid var(--line)' }}><span>{t('sw2DbTotalMargin').replace('{m}', Math.round(price.margin_pct||0))}</span><span>{fmt(total)}</span></div>
                </div>
              </Fragment>)}
            </Fragment>)}

            {/* STEP 8 — AI ASSISTANT */}
            {step === 'ai' && (<Fragment>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2DbAiAssistant')}</h3>
              <p style={{ fontSize:13, color:'var(--muted)', margin:'0 0 14px' }}>{t('sw2DbAiSub')}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {aiSuggestions.length === 0 && <div style={{ fontSize:13.5, color:'var(--muted)' }}>{t('sw2DbAiNone')}</div>}
                {aiSuggestions.map(s => (
                  <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'space-between', border:'1px solid var(--line)', borderRadius:14, padding:'12px 14px', background:'var(--cream)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:18 }}>✨</span>
                      <span style={{ fontSize:13.5, color:'var(--ink)', lineHeight:1.45 }}>{s.label}</span>
                    </div>
                    <button type="button" onClick={s.apply} className="btn-clay" style={{ borderRadius:99, padding:'8px 16px', flexShrink:0 }}>{t('sw2DbApply')}</button>
                  </div>
                ))}
              </div>
            </Fragment>)}

            {/* contact (guest) */}
            {!user && (
              <div style={{ marginTop:18, paddingTop:16, borderTop:'1px solid var(--line)' }}>
                <span style={lblS}>{t('sw2DbYourDetails')}</span>
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:8 }}>
                  <input value={contact.name} onChange={e => setContact(c => ({ ...c, name:e.target.value }))} aria-label={t('sw2KsYourName')} placeholder={t('sw2KsYourName')} style={inS} />
                  <input value={contact.phone} onChange={e => setContact(c => ({ ...c, phone:e.target.value }))} aria-label={t('sw2KsPhonePh')} placeholder={t('sw2KsPhonePh')} inputMode="tel" style={inS} />
                  <input value={contact.email} onChange={e => setContact(c => ({ ...c, email:e.target.value }))} aria-label={t('sw2KsEmailOpt')} placeholder={t('sw2KsEmailOpt')} inputMode="email" style={{ ...inS, gridColumn: mobile?'auto':'1 / -1' }} />
                </div>
              </div>
            )}

            {/* step nav + footer actions */}
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              {(() => { const i = DB_STEPS.findIndex(s => s[0] === step); return (<Fragment>
                <button type="button" disabled={i===0} onClick={() => setStep(DB_STEPS[Math.max(0, i-1)][0])} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor: i===0?'default':'pointer', opacity:i===0?.5:1 }}>{t('sw2DbBack')}</button>
                <button type="button" disabled={i===DB_STEPS.length-1} onClick={() => setStep(DB_STEPS[Math.min(DB_STEPS.length-1, i+1)][0])} className="btn-clay" style={{ flex:1, borderRadius:12, opacity:i===DB_STEPS.length-1?.5:1 }}>{t('sw2DbNext')}</button>
              </Fragment>); })()}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <button type="button" disabled={busy} onClick={saveDraft} style={{ flex:1, background:'#fff', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink)', cursor:'pointer', opacity:busy?.6:1 }}>{busy?t('sw2DbSaving'):(savedId?t('sw2DbUpdateDraft'):t('sw2DbSaveDraft'))}</button>
              <button type="button" disabled={busy} onClick={submitApproval} className="btn-clay" style={{ flex:1.4, borderRadius:12, opacity:busy?.6:1 }}>{busy?t('sw2DbSubmitting'):t('sw2DbSubmitApproval')}</button>
            </div>
            <div style={{ marginTop:14, textAlign:'center' }}><button type="button" aria-label={t('pgClose')} onClick={() => setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DesignBuilderPage };
