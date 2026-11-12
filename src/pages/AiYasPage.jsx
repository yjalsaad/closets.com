// Route chunk "AiYasPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: AiYasPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { aiFetch } from '../privacy/ai';
import { ModalPanel } from '../a11y/dialog';
import { formatBHDRange, formatBHD } from '../i18n/format';
import { useState, useRef, useEffect } from 'react';
import { AiNotice } from '../privacy/FormNotice';
import { CMS_LANG, Photo, SUPA_KEY, SUPA_URL, Spark, toast, useI18n, useMobile, useReveal } from '../App';
import { YasChip, yasReadImage } from './shared_AiYasPage_DesignLabPage';

// ════════════════════════════════════════════════════════════════════════
//  AI YAS — flagship AI hub. Launches every AI capability of the platform.
//  Defensive everywhere: any failed/unconfigured AI call shows a friendly
//  state and a CTA, never crashes the UI.
// ════════════════════════════════════════════════════════════════════════
const YAS_HEAD = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };

async function yasCall(fn, body) {
  // Returns { ok, data } | { ok:false, warm:true } — never throws.
  try {
    const r = await aiFetch(SUPA_URL + '/functions/v1/' + fn, { method: 'POST', headers: YAS_HEAD, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d && d.ok !== false) return { ok: true, data: d };
    return { ok: false, warm: true, error: (d && d.error) || ('AI error ' + r.status) };
  } catch (e) { return { ok: false, warm: true, error: 'network' }; }
}

const YAS_PRODUCTS = [
  { id: '', label: 'Any space' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'tv', label: 'TV unit' },
  { id: 'doors', label: 'Doors' },
  { id: 'storage', label: 'Office' },
];

const YAS_STYLES = [
  'Modern', 'Minimalist', 'Scandinavian', 'Luxury', 'Industrial', 'Japandi',
  'Classic', 'Boho', 'Coastal', 'Monochrome', 'Warm Neutral', 'Bold',
];

// Map friendly style names → ai_room_redesign style ids (defensive default).
const YAS_STYLE_MAP = {
  Modern: 'minimal', Minimalist: 'minimal', Scandinavian: 'scandinavian', Luxury: 'modern_luxe',
  Industrial: 'modern_luxe', Japandi: 'warm_oak', Classic: 'warm_oak', Boho: 'coastal',
  Coastal: 'coastal', Monochrome: 'modern_luxe', 'Warm Neutral': 'warm_oak', Bold: 'bold_walnut',
};

function YasModal({ title, subtitle, onClose, children }) {
  return (
    <div className="yas-modal-back" onClick={onClose}>
      <ModalPanel className="yas-modal" label={typeof title === 'string' ? title : undefined} onClose={onClose} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '22px 24px 14px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <h3 className="display" style={{ fontSize: 24, color: 'var(--ink)' }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="hit44" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '50%', width: 38, height: 38, fontSize: 20, cursor: 'pointer', color: 'var(--ink-soft)', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px 26px' }}>{children}</div>
      </ModalPanel>
    </div>
  );
}

function YasNote({ children }) {
  const { t } = useI18n();
  return <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>{children || t('yasDisclaimer')}</div>;
}

// ── Reusable concept-result card (shared by hero + Text-to-Design tool) ──
function YasConceptCard({ concept, setPage }) {
  const { t } = useI18n();
  const chip = (val, i) => <span key={i} style={{ background: 'var(--sand)', color: 'var(--clay-deep)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 500 }}>{val}</span>;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 18, padding: 22, marginTop: 16 }}>
      <div className="eyebrow">AI concept</div>
      <h3 className="display" style={{ fontSize: 24, color: 'var(--ink)', margin: '6px 0 4px' }}>{concept.title}</h3>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{concept.product} · {concept.layout} · {concept.finish_id} finish · {concept.width_cm}×{concept.height_cm}cm</div>
      {concept.summary && <p style={{ fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.65, marginTop: 12 }}>{concept.summary}</p>}
      {Array.isArray(concept.materials) && concept.materials.length > 0 && (
        <><h4 style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginTop: 16, marginBottom: 8, letterSpacing: '.06em' }}>MATERIALS</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{concept.materials.map(chip)}</div></>
      )}
      {Array.isArray(concept.colors) && concept.colors.length > 0 && (
        <><h4 style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginTop: 16, marginBottom: 8, letterSpacing: '.06em' }}>COLOURS</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{concept.colors.map(chip)}</div></>
      )}
      {Array.isArray(concept.storage_ideas) && concept.storage_ideas.length > 0 && (
        <><h4 style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginTop: 16, marginBottom: 8, letterSpacing: '.06em' }}>SMART STORAGE</h4>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7 }}>{concept.storage_ideas.map((m, i) => <li key={i}>{m}</li>)}</ul></>
      )}
      {Array.isArray(concept.packages) && concept.packages.length > 0 && (
        <><h4 style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)', marginTop: 18, marginBottom: 8, letterSpacing: '.06em' }}>PACKAGES (indicative)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            {concept.packages.map((p, i) => (
              <div key={p.tier} style={{ border: '1px solid ' + (i === 1 ? 'var(--clay)' : 'var(--line)'), background: i === 1 ? 'var(--sand)' : '#fff', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: i === 1 ? 'var(--clay-deep)' : 'var(--ink)' }}>{p.tier}{i === 1 ? ' · recommended' : ''}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginTop: 3 }}>{formatBHDRange(p.price_from || 0, p.price_to || 0, CMS_LANG)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>{p.includes}</div>
              </div>
            ))}
          </div></>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" className="btn-clay" onClick={() => setPage('planner')} style={{ borderRadius: 999, padding: '11px 20px', fontSize: 14 }}>{t('sw3YasRefine3D')}</button>
        <button type="button" onClick={() => setPage('booking')} style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{t('bookFreeVisit')}</button>
      </div>
      <YasNote />
    </div>
  );
}

// ── A styled fallback concept when no AI backend is available ──
function yasFallbackConcept(prompt, product) {
  const p = product || 'kitchen';
  const titles = { kitchen: 'Warm Handleless Kitchen', wardrobe: 'Tailored Walk-in Wardrobe', tv: 'Floating Media Wall', doors: 'Bespoke Fitted Doors', storage: 'Integrated Home Office' };
  const base = { kitchen: 4200, wardrobe: 2400, tv: 1500, doors: 1200, storage: 2800 }[p] || 3000;
  const mk = (m) => [Math.round(base * m * 0.9), Math.round(base * m * 1.15)];
  return {
    title: titles[p] || 'Your Bespoke Concept',
    product: p, layout: p === 'kitchen' ? 'l-shape' : 'single', finish_id: 'oak',
    width_cm: p === 'kitchen' ? 320 : 200, height_cm: p === 'kitchen' ? 90 : 240,
    summary: (prompt ? '"' + prompt.slice(0, 120) + '" — ' : '') + 'a cohesive starting concept in warm, durable materials, designed around how you live and built in our Bahrain workshop.',
    materials: ['Premium laminate', 'Soft-close hardware', 'LED-ready interiors', 'Brushed-metal handles'],
    colors: ['Warm oak', 'Cream', 'Graphite accent'],
    storage_ideas: ['Full-height pull-outs', 'Hidden internal lighting', 'Custom dividers for your items'],
    packages: [
      { tier: 'Economy', price_from: mk(0.72)[0], price_to: mk(0.72)[1], includes: 'Quality essentials, laminate finishes' },
      { tier: 'Standard', price_from: mk(1)[0], price_to: mk(1)[1], includes: 'Premium laminate/veneer, soft-close, LED-ready' },
      { tier: 'Premium', price_from: mk(1.45)[0], price_to: mk(1.45)[1], includes: 'Veneer/painted finishes, integrated lighting' },
      { tier: 'Luxury', price_from: mk(2.1)[0], price_to: mk(2.1)[1], includes: 'Top-tier materials, bespoke detailing' },
    ],
  };
}

// ════════════ TOOL PANELS (each rendered inside a YasModal) ════════════

// 1) Text-to-Design (also powers the hero) — ai_design_concept w/ fallback.
function YasTextToDesign({ initialPrompt, initialProduct, setPage }) {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [product, setProduct] = useState(initialProduct || '');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [concept, setConcept] = useState(null);
  const [warm, setWarm] = useState(false);
  const run = async () => {
    if (!prompt.trim()) { toast('Describe your space first', 'error'); return; }
    setBusy(true); setConcept(null); setWarm(false);
    const res = await yasCall('ai_design_concept', { requirements: prompt.trim(), product: product || undefined, budget: budget ? Number(budget) : undefined });
    if (res.ok && res.data.concept) { setConcept(res.data.concept); }
    else { setConcept(yasFallbackConcept(prompt.trim(), product)); setWarm(true); }
    setBusy(false);
  };
  return (
    <div>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="inp" placeholder="Describe your dream space — e.g. a warm oak walk-in wardrobe with lots of shoe storage and soft lighting" style={{ resize: 'vertical', marginBottom: 12 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {YAS_PRODUCTS.map(p => <YasChip key={p.id || 'any'} active={product === p.id} onClick={() => setProduct(p.id)}>{p.label}</YasChip>)}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={budget} onChange={e => setBudget(e.target.value)} inputMode="numeric" className="inp" placeholder="Budget BHD (optional)" style={{ maxWidth: 220 }} />
        <button type="button" className="btn-clay" disabled={busy} onClick={run} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Designing…' : '✨ Generate concept'}</button>
      </div>
      {busy && <div className="yas-shimmer-box" style={{ height: 120, marginTop: 16 }} />}
      {warm && concept && <div style={{ fontSize: 12.5, color: 'var(--clay-deep)', marginTop: 14, background: 'var(--sand)', padding: '9px 12px', borderRadius: 10 }}>{t('sw3YasWarming')} <button type="button" onClick={() => setPage('booking')} style={{ background: 'none', border: 'none', color: 'var(--clay-deep)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>{t('bookFreeDesignConsult')}</button> {t('sw3YasForTailored')}</div>}
      {concept && <YasConceptCard concept={concept} setPage={setPage} />}
    </div>
  );
}

// 2) AI Room Redesign — upload photo + style → ai_room_redesign, before/after.
function YasRoomRedesign({ setPage }) {
  const { t } = useI18n();
  const [image, setImage] = useState(null);
  const [style, setStyle] = useState('Modern');
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  const [pos, setPos] = useState(55);
  const run = async (styleName) => {
    if (!image) { toast('Add a room photo first', 'error'); return; }
    const sName = styleName || style;
    setBusy(true); setErr(''); setUrl(null);
    const res = await yasCall('ai_room_redesign', { image_base64: image.base64, style: YAS_STYLE_MAP[sName] || 'minimal', strength: 0.7 });
    if (res.ok && res.data.url) { setUrl(res.data.url); setPos(55); }
    else { setErr(res.error === 'Render not configured' ? 'Photoreal rendering isn’t switched on yet — book a free design visit and we’ll show you in person.' : 'Couldn’t render that one — try another photo.'); }
    setBusy(false);
  };
  return (
    <div>
      <AiNotice style={{ margin: '0 0 8px' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px dashed var(--line)', background: '#fff', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', marginBottom: 14 }}>
        {image ? <img src={image.dataUrl} alt="your room" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 9 }} /> : <Spark size={24} color="var(--clay)" />}
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{image ? 'Photo added — tap to change' : 'Upload a photo of your room'}</span>
        <input type="file" accept="image/*" onChange={e => yasReadImage(e.target.files && e.target.files[0], img => { if (img) { setImage(img); setUrl(null); setErr(''); } })} style={{ display: 'none' }} />
      </label>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -8, marginBottom: 14 }}>{t('imgHintRoomPhoto')}</div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Pick a style</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {YAS_STYLES.map(s => <YasChip key={s} active={style === s} onClick={() => { setStyle(s); if (image && url) run(s); }}>{s}</YasChip>)}
      </div>
      <button type="button" className="btn-clay" disabled={busy} onClick={() => run()} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Redesigning…' : '✨ Redesign my room'}</button>
      {busy && <div className="yas-shimmer-box" style={{ height: 240, marginTop: 16 }} />}
      {!busy && err && <div style={{ marginTop: 16, padding: '16px', background: 'var(--sand)', borderRadius: 12, color: 'var(--clay-deep)', fontSize: 14 }}>{err}</div>}
      {!busy && url && image && (
        <div style={{ marginTop: 16 }}>
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', aspectRatio: '4 / 3', background: '#000' }}>
            <img src={url} alt="After — AI redesign" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <img src={image.dataUrl} alt="Before — your room" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', clipPath: 'inset(0 ' + (100 - pos) + '% 0 0)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: pos + '%', width: 2, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,.4)' }} />
            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(20,16,12,.7)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>BEFORE</span>
            <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>AFTER ✦</span>
            <input type="range" min={0} max={100} value={pos} onChange={e => setPos(Number(e.target.value))} aria-label="Compare before and after" style={{ position: 'absolute', left: '6%', right: '6%', bottom: 12, width: '88%', accentColor: 'var(--clay)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <a href={url} download="closets-ai-redesign.jpg" target="_blank" rel="noreferrer" style={{ padding: '8px 14px', borderRadius: 99, background: 'var(--ink)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Download</a>
            <button type="button" onClick={() => setPage('booking')} className="btn-clay" style={{ padding: '8px 14px', borderRadius: 99, fontSize: 13 }}>Make it real →</button>
          </div>
          <YasNote />
        </div>
      )}
    </div>
  );
}

// 3) Style Finder / Moodboard — vibe tags → ai_design_concept → palette (fallback curated).
const YAS_VIBES = ['Calm', 'Warm', 'Bold', 'Natural', 'Luxe', 'Airy', 'Moody', 'Playful', 'Timeless', 'Coastal'];

const YAS_PALETTES = {
  default: { style: 'Warm Modern', colors: [['Warm Oak', '#c89b5e'], ['Soft Cream', '#ebe4d8'], ['Graphite', '#3a3a3c'], ['Clay', '#A84B29']], materials: ['Natural oak veneer', 'Matt lacquer', 'Brushed brass', 'Linen textiles'] },
  Moody: { style: 'Bold Walnut', colors: [['Deep Walnut', '#3f2a17'], ['Forest', '#2f4030'], ['Bronze', '#8a6a3a'], ['Charcoal', '#1f1c19']], materials: ['Walnut veneer', 'Smoked glass', 'Antique bronze', 'Velvet accents'] },
  Coastal: { style: 'Coastal Calm', colors: [['Whitewash', '#eef1f0'], ['Sea Blue', '#7fa9b3'], ['Sand', '#d8c8ad'], ['Driftwood', '#b6a892']], materials: ['Whitewashed oak', 'Woven rattan', 'Soft cotton', 'Matte ceramic'] },
  Luxe: { style: 'Modern Luxe', colors: [['Matte Black', '#1d1d1f'], ['Marble White', '#f3f1ec'], ['Champagne Gold', '#cbab73'], ['Slate', '#54585c']], materials: ['Marble surfaces', 'Brushed gold', 'High-gloss lacquer', 'Smoked mirror'] },
};

function YasStyleFinder({ setPage }) {
  const { t } = useI18n();
  const [vibes, setVibes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState(null);
  const toggle = (v) => setVibes(s => s.includes(v) ? s.filter(x => x !== v) : (s.length < 3 ? [...s, v] : s));
  const run = async () => {
    if (vibes.length === 0) { toast('Pick a few vibes', 'error'); return; }
    setBusy(true); setBoard(null);
    const res = await yasCall('ai_design_concept', { requirements: 'Suggest an interior style and a material + colour palette for a bespoke space with these vibes: ' + vibes.join(', ') + '. Focus on materials and colours.' });
    let pal = YAS_PALETTES.default;
    for (const v of vibes) { if (YAS_PALETTES[v]) { pal = YAS_PALETTES[v]; break; } }
    if (res.ok && res.data.concept) {
      const c = res.data.concept;
      const colors = Array.isArray(c.colors) && c.colors.length ? c.colors.map((n, i) => [n, pal.colors[i % pal.colors.length][1]]) : pal.colors;
      const materials = Array.isArray(c.materials) && c.materials.length ? c.materials : pal.materials;
      setBoard({ style: c.title || pal.style, colors, materials, summary: c.summary });
    } else {
      setBoard({ style: pal.style, colors: pal.colors, materials: pal.materials, summary: 'A curated moodboard to start your project.' });
    }
    setBusy(false);
  };
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{t('sw3YasPickVibes')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {YAS_VIBES.map(v => <YasChip key={v} active={vibes.includes(v)} onClick={() => toggle(v)}>{v}</YasChip>)}
      </div>
      <button type="button" className="btn-clay" disabled={busy} onClick={run} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Curating…' : '✨ Build my moodboard'}</button>
      {busy && <div className="yas-shimmer-box" style={{ height: 140, marginTop: 16 }} />}
      {board && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 20 }}>
          <div className="eyebrow">Your AI moodboard</div>
          <h3 className="display" style={{ fontSize: 22, color: 'var(--ink)', margin: '6px 0 12px' }}>{board.style}</h3>
          {board.summary && <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>{board.summary}</p>}
          <div style={{ display: 'flex', gap: 0, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            {board.colors.map(([name, hex], i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 56, background: hex }} />
                <div style={{ fontSize: 10.5, color: 'var(--muted)', padding: '5px 2px', background: '#fff' }}>{name}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {board.materials.map((m, i) => <span key={i} style={{ background: 'var(--sand)', color: 'var(--clay-deep)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 500 }}>{m}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" className="btn-clay" onClick={() => setPage('planner')} style={{ borderRadius: 999, padding: '10px 18px', fontSize: 13.5 }}>{t('sw3YasUse3D')}</button>
            <button type="button" onClick={() => setPage('booking')} style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{t('bookFreeVisit')}</button>
          </div>
          <YasNote />
        </div>
      )}
    </div>
  );
}

// 4) Budget Assistant — budget + product → ai_design_concept packages (fallback tiered).
function YasBudgetAssistant({ setPage }) {
  const [budget, setBudget] = useState('');
  const [product, setProduct] = useState('kitchen');
  const [busy, setBusy] = useState(false);
  const [concept, setConcept] = useState(null);
  const run = async () => {
    const b = Number(budget);
    if (!b || b < 100) { toast('Enter a budget in BHD', 'error'); return; }
    setBusy(true); setConcept(null);
    const res = await yasCall('ai_design_concept', { requirements: 'Recommend a sensible ' + product + ' specification that fits within a budget of BHD ' + b + '. List the best materials and storage we can include at this budget.', product, budget: b });
    if (res.ok && res.data.concept) setConcept(res.data.concept);
    else setConcept(yasFallbackConcept('within BHD ' + b, product));
    setBusy(false);
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {YAS_PRODUCTS.filter(p => p.id).map(p => <YasChip key={p.id} active={product === p.id} onClick={() => setProduct(p.id)}>{p.label}</YasChip>)}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>BHD</span>
          <input value={budget} onChange={e => setBudget(e.target.value)} inputMode="numeric" className="inp" placeholder="Your budget" style={{ paddingLeft: 48, maxWidth: 220 }} />
        </div>
        <button type="button" className="btn-clay" disabled={busy} onClick={run} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Calculating…' : '✨ Recommend a spec'}</button>
      </div>
      {busy && <div className="yas-shimmer-box" style={{ height: 120, marginTop: 16 }} />}
      {concept && <YasConceptCard concept={concept} setPage={setPage} />}
    </div>
  );
}

// 5) Material & Product Picks — recommend_products (always returns ok with fallback).
function YasProductPicks({ setPage }) {
  const { t } = useI18n();
  const [interest, setInterest] = useState('kitchen');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(null);
  const [warm, setWarm] = useState(false);
  const run = async () => {
    setBusy(true); setItems(null); setWarm(false);
    const res = await yasCall('recommend_products', { interest });
    if (res.ok && Array.isArray(res.data.items)) { setItems(res.data.items); if (res.data.items.length === 0) setWarm(true); }
    else { setItems([]); setWarm(true); }
    setBusy(false);
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {['kitchen', 'wardrobe', 'tv', 'doors', 'storage', 'vanity'].map(c => <YasChip key={c} active={interest === c} onClick={() => setInterest(c)}>{c.charAt(0).toUpperCase() + c.slice(1)}</YasChip>)}
      </div>
      <button type="button" className="btn-clay" disabled={busy} onClick={run} style={{ opacity: busy ? .6 : 1 }}>{busy ? 'Finding…' : '✨ Recommend products'}</button>
      {busy && <div className="yas-shimmer-box" style={{ height: 100, marginTop: 16 }} />}
      {items && items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 16 }}>
          {items.map((it, i) => (
            <button type="button" key={it.id || i} onClick={() => it.id && setPage('product-' + it.id)} style={{ textAlign: 'left', background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, cursor: 'pointer' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{it.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{it.category}{it.price ? ' · ' + formatBHD(it.price, CMS_LANG, { whole:true }) : ''}</div>
              {it.reason && <div style={{ fontSize: 12, color: 'var(--clay-deep)', marginTop: 8, fontStyle: 'italic' }}>{it.reason}</div>}
            </button>
          ))}
        </div>
      )}
      {items && items.length === 0 && warm && (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--sand)', borderRadius: 12, color: 'var(--clay-deep)', fontSize: 14 }}>{t('sw3YasRecWarming')} <button type="button" onClick={() => setPage('products')} style={{ background: 'none', border: 'none', color: 'var(--clay-deep)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>{t('sw3YasBrowseAll')}</button>.</div>
      )}
    </div>
  );
}

// 6) Ask YAS — compact chat over support_chat (defensive).
function YasChat() {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: 'Hi! I’m YAS, your design assistant. Ask me about products, lead times, finance, our process — anything.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs, busy]);
  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setInput(''); setBusy(true);
    const res = await yasCall('support_chat', { messages: next.filter(m => m.role === 'user' || m.role === 'assistant') });
    if (res.ok && res.data.reply) setMsgs(m => [...m, { role: 'assistant', content: res.data.reply }]);
    else setMsgs(m => [...m, { role: 'assistant', content: 'I’m having a quick connection hiccup. You can WhatsApp our team on +973 17555095 or book a free design visit and we’ll help right away.' }]);
    setBusy(false);
  };
  return (
    <div>
      <div ref={endRef} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 16, height: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%', background: m.role === 'user' ? 'var(--clay)' : 'var(--sand)', color: m.role === 'user' ? '#fff' : 'var(--ink)', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
        ))}
        {busy && <div style={{ alignSelf: 'flex-start', background: 'var(--sand)', padding: '12px 16px', borderRadius: 14 }}><span className="yas-typing"><span /><span /><span /></span></div>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} className="inp" placeholder="Ask YAS anything…" />
        <button type="button" className="btn-clay" disabled={busy} onClick={send} style={{ flexShrink: 0, opacity: busy ? .6 : 1 }}>Send</button>
      </div>
    </div>
  );
}

// ── The flagship hub page ──
function AiYasPage({ setPage }) {
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const arrow = lang === 'ar' ? '←' : '→';   // RTL-aware trailing arrow
  useReveal();
  const [heroPrompt, setHeroPrompt] = useState('');
  const [heroProduct, setHeroProduct] = useState('');
  const [openTool, setOpenTool] = useState(null); // tool id | { id, prompt, product }
  const launchHero = () => {
    if (!heroPrompt.trim()) { toast('Describe your space to generate', 'info'); return; }
    setOpenTool({ id: 'text', prompt: heroPrompt, product: heroProduct });
  };
  const TOOLS = [
    { id: 'text', icon: '✶', title: t('yasT1t'), value: t('yasT1v'), cta: t('yasCtaDescribeGenerate') },
    { id: 'redesign', icon: '🖼', title: t('yasT2t'), value: t('yasT2v'), cta: t('yasCtaUploadRestyle') },
    { id: 'moodboard', icon: '◑', title: t('yasT3t'), value: t('yasT3v'), cta: t('yasCtaBuildMoodboard') },
    { id: 'budget', icon: '◈', title: t('yasT4t'), value: t('yasT4v'), cta: t('yasCtaPlanToBudget') },
    { id: 'picks', icon: '❖', title: t('yasT5t'), value: t('yasT5v'), cta: t('yasCtaGetPicks') },
    { id: 'chat', icon: '✦', title: t('yasT6t'), value: t('yasT6v'), cta: t('yasCtaStartChatting') },
    { id: 'render', icon: '◆', title: t('yasT7t'), value: t('yasT7v'), action: () => setPage('planner'), cta: t('yasCtaOpenInPlanner') },
    { id: 'visualiser', icon: '⬡', title: t('yasT8t'), value: t('yasT8v'), action: () => setPage('planner'), cta: t('openRoomDesigner') },
  ];
  const CAPS = [t('yasCapTextToDesign'), t('yasCapRoomRedesign'), t('yasCapPhotorealRender'), t('yasCapStyleMoodboards'), t('yasCapBudgetPlanning'), t('yasCapProductPicks'), t('yasCapDesignChat'), t('yasCap3dVisualiser'), t('yasCapSmartRecs'), t('yasCapInstantConcepts')];
  const STEPS = [
    { n: '01', t: t('yasStep1Title'), d: t('yasStep1Desc'), img: '/layouts/wardrobe/wardrobe-walkin.jpg' },
    { n: '02', t: t('yasStep2Title'), d: t('yasStep2Desc'), img: '/layouts/kitchen/island.jpg' },
    { n: '03', t: t('yasStep3Title'), d: t('yasStep3Desc'), img: '/layouts/TV/floating.jpg' },
  ];
  // Resolve a robust image for the 3 steps (defensive — Photo handles errors anyway).
  const renderToolModal = () => {
    if (!openTool) return null;
    const id = typeof openTool === 'string' ? openTool : openTool.id;
    const close = () => setOpenTool(null);
    if (id === 'text') return <YasModal title="Text-to-Design" subtitle="Describe your dream space — YAS designs it." onClose={close}><YasTextToDesign initialPrompt={typeof openTool === 'object' ? openTool.prompt : ''} initialProduct={typeof openTool === 'object' ? openTool.product : ''} setPage={setPage} /></YasModal>;
    if (id === 'redesign') return <YasModal title="AI Room Redesign" subtitle="Upload a photo and reimagine your room." onClose={close}><YasRoomRedesign setPage={setPage} /></YasModal>;
    if (id === 'moodboard') return <YasModal title="Style Finder & Moodboard" subtitle="Pick your vibe — get a curated board." onClose={close}><YasStyleFinder setPage={setPage} /></YasModal>;
    if (id === 'budget') return <YasModal title="AI Budget Assistant" subtitle="Tell YAS your budget — get the best spec." onClose={close}><YasBudgetAssistant setPage={setPage} /></YasModal>;
    if (id === 'picks') return <YasModal title="Material & Product Picks" subtitle="AI picks from our live collection." onClose={close}><YasProductPicks setPage={setPage} /></YasModal>;
    if (id === 'chat') return <YasModal title="Ask YAS" subtitle="Your AI design assistant." onClose={close}><YasChat /></YasModal>;
    return null;
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream)' }}>
      {/* ── HERO ── */}
      <section className="yas-hero" style={{ paddingTop: mobile ? 96 : 130, paddingBottom: mobile ? 56 : 84 }}>
        <div className="yas-aurora" />
        <div className="yas-gridlines" />
        <div className="yas-noise" />
        <div className="yas-orb" style={{ width: 90, height: 90, top: '22%', left: '8%', animationDelay: '0s' }} />
        <div className="yas-orb" style={{ width: 50, height: 50, top: '60%', right: '12%', animationDelay: '1.5s' }} />
        <div className="yas-orb" style={{ width: 30, height: 30, top: '30%', right: '24%', animationDelay: '3s' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto', padding: mobile ? '0 22px' : '0 32px', textAlign: 'center' }}>
          <div className="yas-cap" style={{ marginBottom: 26 }}><span className="yas-spark" style={{ color: 'var(--clay)' }}><Spark size={14} /></span> {t('sw3YasPoweredBy')}</div>
          {/* AI YAS — Closets sub-brand lockup */}
          <div className="yas-lockup" style={{ justifyContent: 'center', marginBottom: 18 }}>
            <span className="yas-lockup-spark" style={{ width: mobile ? 48 : 64, height: mobile ? 48 : 64, borderRadius: mobile ? 14 : 18 }}><Spark size={mobile ? 26 : 36} color="var(--clay)" /></span>
            <span className="yas-lockup-word" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <h1 className="display" style={{ fontSize: mobile ? 52 : 92, lineHeight: .9, letterSpacing: '-.03em', color: 'var(--ink)', margin: 0 }}>AI&nbsp;YAS</h1>
              <div className="yas-lockup-kicker">{t('yasByClosets')}</div>
            </span>
          </div>
          <p style={{ fontSize: mobile ? 17 : 21, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 640, margin: '0 auto 34px' }}>{t('yasHeroTag')}</p>
          {/* Flagship prompt bar */}
          <div className="yas-promptbar" style={{ padding: mobile ? 14 : 18, textAlign: 'left', maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="yas-spark" style={{ color: 'var(--clay)', display: 'inline-flex' }}><Spark size={20} /></span>
              <input
                className="yas-prompt-input"
                value={heroPrompt}
                onChange={e => setHeroPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') launchHero(); }}
                placeholder={t('yasPromptPh')}
                aria-label="Describe your dream space"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {YAS_PRODUCTS.filter(p => p.id).map(p => <YasChip key={p.id} active={heroProduct === p.id} onClick={() => setHeroProduct(heroProduct === p.id ? '' : p.id)}>{p.label}</YasChip>)}
              </div>
              <button type="button" className="btn-clay" onClick={launchHero} style={{ borderRadius: 14, padding: '12px 22px', fontSize: 15, flexShrink: 0 }}>{t('yasGenerate')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
            <span>{t('sw3YasNoSignup')}</span><span>·</span><span>{t('yasHeroInstantConcepts')}</span><span>·</span><span>{t('sw3YasVisitConfirm')}</span>
          </div>
        </div>
      </section>

      {/* ── AI TOOLS GRID ── */}
      <section className="reveal" style={{ maxWidth: 1180, margin: '0 auto', padding: mobile ? '56px 22px' : '88px 32px' }}>
        <div className="rv" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{t('yasHubEyebrow')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 32 : 46, color: 'var(--ink)' }}>{t('yasHubTitle')}</h2>
          <p style={{ fontSize: mobile ? 15 : 17, color: 'var(--ink-soft)', marginTop: 14, lineHeight: 1.6 }}>{t('yasHubSub')}</p>
        </div>
        <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fit,minmax(270px,1fr))', gap: 18 }}>
          {TOOLS.map((tool, i) => (
            <div key={tool.id} className="yas-glass yas-int rv lift" style={{ '--d': (i * 0.05) + 's', padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,var(--sand),#fff)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--clay)', marginBottom: 16 }}>{tool.icon}</div>
              <h3 className="display" style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>{tool.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, flex: 1, marginBottom: 18 }}>{tool.value}</p>
              <button type="button" onClick={() => tool.action ? tool.action() : setOpenTool(tool.id)} style={{ alignSelf: 'flex-start', background: 'var(--sand)', color: 'var(--clay-deep)', border: '1px solid var(--line)', borderRadius: 999, padding: '10px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{tool.cta} {arrow}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW AI YAS WORKS ── */}
      <section className="reveal" style={{ background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: mobile ? '56px 22px' : '88px 32px' }}>
          <div className="rv" style={{ textAlign: 'center', marginBottom: 44 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>{t('yasHowTitle')}</div>
            <h2 className="display" style={{ fontSize: mobile ? 32 : 46, color: 'var(--ink)' }}>{t('yasHowHeadline')}</h2>
          </div>
          <div className="reveal reveal-stagger" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)', gap: 20 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className="rv" style={{ '--d': (i * 0.08) + 's' }}>
                <div className="zoomwrap" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', aspectRatio: '4 / 3', marginBottom: 16 }}>
                  <Photo src={s.img} alt={s.t} style={{ position: 'absolute', inset: 0 }} />
                  <div style={{ position: 'absolute', top: 14, left: 14, width: 44, height: 44, borderRadius: '50%', background: 'var(--clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, boxShadow: '0 8px 20px -8px rgba(176,97,59,.8)' }}>{s.n}</div>
                </div>
                <h3 className="display" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>{s.t}</h3>
                <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES STRIP ── */}
      <section className="reveal" style={{ background: 'var(--sand)', position: 'relative', overflow: 'hidden', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="yas-aurora" style={{ opacity: .8 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: mobile ? '50px 22px' : '70px 32px', textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>{t('yasCapsTitle')}</div>
          <h2 className="display" style={{ fontSize: mobile ? 28 : 40, color: 'var(--ink)', marginBottom: 26 }}>{t('yasCapsHeadline')}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {CAPS.map(c => <span key={c} className="yas-cap" style={{ background: '#fff' }}><Spark size={13} color="var(--clay)" /> {c}</span>)}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="reveal" style={{ maxWidth: 1180, margin: '0 auto', padding: mobile ? '56px 22px' : '88px 32px' }}>
        <div className="rv" style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 28, padding: mobile ? '40px 26px' : '64px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 70px -40px rgba(33,28,24,.45)' }}>
          <div className="yas-aurora" style={{ opacity: .9 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="yas-cap" style={{ marginBottom: 18 }}><Spark size={14} color="var(--clay)" /> {t('yasByClosets')}</div>
            <h2 className="display" style={{ fontSize: mobile ? 32 : 52, color: 'var(--ink)', lineHeight: 1.05, marginBottom: 16 }}>{t('yasCtaTitle')}</h2>
            <p style={{ fontSize: mobile ? 16 : 19, color: 'var(--ink-soft)', maxWidth: 540, margin: '0 auto 30px', lineHeight: 1.6 }}>{t('yasCtaSub')}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-clay" onClick={() => setPage('planner')} style={{ fontSize: 16, padding: '16px 30px' }}>{t('openRoomDesignerArrow')}</button>
              <button type="button" className="btn-line" onClick={() => setPage('booking')} style={{ fontSize: 16, padding: '15px 28px' }}>{t('bookFreeDesignVisit')}</button>
            </div>
          </div>
        </div>
      </section>

      {renderToolModal()}
    </div>
  );
}

export { AiYasPage };
