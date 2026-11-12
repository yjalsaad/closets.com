// Route chunk "PlannerPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: PlannerPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { aiFetch } from '../privacy/ai';
import { validateForm } from '../forms/validate';
import { formatDate, formatBHD } from '../i18n/format';
import { ModalPanel } from '../a11y/dialog';
import FormNotice from '../privacy/FormNotice';
import { H, SUPA_KEY, SUPA_URL, Spark, api, fmt, toast, trMap, useI18n, useMobile } from '../App';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { RoomDesigner, Wardrobe3D } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';

// Planner "Designing: {product}" label — translate the product noun by its English name.
const PLANNER_PROD_KEY = {
  'Wardrobe':'plProdWardrobe', 'Kitchen':'plProdKitchen', 'TV Unit':'plProdTvUnit',
  'Doors':'plProdDoors', 'Walk-in Closet':'plProdWalkInCloset', 'Walk-In Closet':'plProdWalkInCloset',
  'Storage / Office':'plProdStorageOffice',
};

/* ── PRODUCT CATALOG (planner step 1) ── */
const PLANNER_PRODUCTS = [
  { id:'wardrobe', name:'Wardrobe', sub:'Reach-in & built-in', icon:'M4 3h16v18h-16z M12 3v18 M9 8v3 M15 8v3', ready:true,
    layouts:[{id:'single',label:'Single wall',desc:'One straight run'},{id:'l-shape',label:'L-shaped',desc:'Two sides, corner'},{id:'walk-in',label:'Walk-in',desc:'Dressing room'},{id:'sliding',label:'Sliding doors',desc:'Space-saving'}] },
  { id:'kitchen', name:'Kitchen', sub:'Wall · L · U · island', icon:'M3 3h18v18h-18z', ready:false,
    layouts:[{id:'wall',label:'Wall',desc:'Single run'},{id:'l-shape',label:'L-shaped',desc:'Corner'},{id:'u-shape',label:'U-shaped',desc:'Three sides'},{id:'island',label:'Island',desc:'With centre island'}] },
  { id:'tv', name:'TV Unit', sub:'Floating & full-wall', icon:'M2 6h20v12h-20z', ready:false,
    layouts:[{id:'floating',label:'Floating',desc:'Wall-mounted'},{id:'floor',label:'Floor',desc:'Standing'},{id:'full-wall',label:'Full-wall',desc:'With towers'}] },
  { id:'doors', name:'Doors', sub:'Hinged · sliding', icon:'M5 3h14v18h-14z', ready:false,
    layouts:[{id:'hinged',label:'Hinged',desc:'Classic swing'},{id:'sliding',label:'Sliding',desc:'Space-saving'},{id:'folding',label:'Folding',desc:'Bi-fold'}] },
  { id:'walkin', name:'Walk-in Closet', sub:'Dressing room', icon:'M4 3h16v18h-16z', ready:false,
    layouts:[{id:'u-shape',label:'U-shape',desc:'Three walls'},{id:'l-shape',label:'L-shape',desc:'Two walls'},{id:'parallel',label:'Parallel',desc:'Two facing runs'}] },
  { id:'storage', name:'Storage / Office', sub:'Shelving & cabinets', icon:'M3 4h18v16h-18z', ready:false,
    layouts:[{id:'open',label:'Open',desc:'Shelving'},{id:'closed',label:'Closed',desc:'Cabinets'},{id:'mixed',label:'Mixed',desc:'Open + closed'}] },
];

/* ── CONFIGURATOR ── */
function PlannerPage({ setPage, user, openAuth, siteLogo }) {
  const mobile = useMobile();
  const { t, lang } = useI18n();
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // stage: 'product' -> 'ai' -> 'config'
  const [stage, setStage] = useState('product');
  const [selProduct, setSelProduct] = useState(null);
  const [layout, setLayout] = useState('single');
  const [dims, setDims] = useState({ width: 200, height: 240, depth: 60, sideA: 200, sideB: 150 });
  const [sel, setSel] = useState({});
  const [price, setPrice] = useState(null);
  const [pricing, setPricing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Photorealistic AI render (fal.ai FLUX image-to-image)
  const plannerApi = useRef(null);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState(null);
  const [renderErr, setRenderErr] = useState('');
  // ── Room Designer (Wren-style interactive material visualiser) ──
  // Opened as a full-screen overlay from the Configure/Visualise steps (kitchen only).
  const [roomDesignerOpen, setRoomDesignerOpen] = useState(false);
  // Wrap a design image (3D snapshot or AI render) in a branded "The Closets" template
  // (logo header + spec/date strip + footer). Falls back to the raw image on any failure.
  // opts: { footTitle, footNote, specLine, dateStr } — all optional.
  const brandRender = (srcUri, opts = {}) => new Promise((resolve) => {
    const footTitle = opts.footTitle || 'Your design — photorealistic concept';
    const footNote  = opts.footNote  || 'AI impression. Exact finishes confirmed at your free design consultation.';
    const specLine  = opts.specLine || '';
    const dateStr   = opts.dateStr || '';
    const base = new Image();
    base.onload = () => {
      try {
        const iw = base.naturalWidth || 1024, ih = base.naturalHeight || 768;
        const sc = iw > 1280 ? 1280 / iw : 1, w = Math.round(iw * sc), h = Math.round(ih * sc);
        const pad = Math.round(w * 0.045), head = Math.round(w * 0.135), foot = Math.round(w * 0.09);
        const cw = w + pad * 2, ch = head + h + foot;
        const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
        const x = cv.getContext('2d');
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, cw, ch);
        const finish = (logoImg) => {
          let tx = pad;
          if (logoImg) {
            const lh = Math.round(head * 0.46);
            const lw = Math.min(Math.round(w * 0.34), Math.round(lh * (logoImg.naturalWidth / Math.max(1, logoImg.naturalHeight))));
            try { x.drawImage(logoImg, pad, Math.round((head - lh) / 2) - Math.round(head * 0.05), lw, lh); tx = pad + lw + Math.round(w * 0.025); } catch (e) {}
          }
          x.textBaseline = 'alphabetic'; x.textAlign = 'left';
          x.fillStyle = '#1d1d1f'; x.font = `800 ${Math.round(head * 0.30)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          x.fillText('THE CLOSETS', tx, Math.round(head * 0.46));
          x.fillStyle = '#86868b'; x.font = `500 ${Math.round(head * 0.135)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          x.fillText('Bespoke furniture · Kingdom of Bahrain', tx, Math.round(head * 0.69));
          // Date (top-right of the header)
          if (dateStr) {
            x.textAlign = 'right'; x.fillStyle = '#86868b'; x.font = `600 ${Math.round(head * 0.135)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
            x.fillText(dateStr, cw - pad, Math.round(head * 0.46));
            x.textAlign = 'left';
          }
          // Project name / spec line (just under the header, above the image)
          if (specLine) {
            x.fillStyle = '#3a3a3c'; x.font = `600 ${Math.round(head * 0.155)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
            x.fillText(specLine, tx, Math.round(head * 0.90));
          }
          x.fillStyle = '#A84B29'; x.fillRect(pad, head - 4, w, 4);
          x.drawImage(base, pad, head, w, h);
          const fy = head + h;
          x.fillStyle = '#1d1d1f'; x.font = `700 ${Math.round(foot * 0.26)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          x.fillText(footTitle, pad, fy + Math.round(foot * 0.36));
          x.fillStyle = '#9aa0a6'; x.font = `400 ${Math.round(foot * 0.19)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          x.fillText(footNote, pad, fy + Math.round(foot * 0.66));
          x.textAlign = 'right'; x.fillStyle = '#A84B29'; x.font = `700 ${Math.round(foot * 0.22)}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          x.fillText('the-closets.com · +973 17555095', cw - pad, fy + Math.round(foot * 0.50));
          x.textAlign = 'left';
          try { resolve(cv.toDataURL('image/jpeg', 0.92)); } catch (e) { resolve(srcUri); }
        };
        if (siteLogo) {
          fetch(siteLogo).then(r => r.ok ? r.blob() : Promise.reject(0)).then(bl => {
            const fr = new FileReader();
            fr.onload = () => { const li = new Image(); li.onload = () => finish(li); li.onerror = () => finish(null); li.src = fr.result; };
            fr.onerror = () => finish(null); fr.readAsDataURL(bl);
          }).catch(() => finish(null));
        } else finish(null);
      } catch (e) { resolve(srcUri); }
    };
    base.onerror = () => resolve(srcUri);
    base.src = srcUri;
  });
  const doPhotoreal = async () => {
    if (!user) { if (openAuth) openAuth('register'); else setPage('portal'); return; }
    const api = plannerApi.current;
    // Use the live 3D snapshot if the canvas is mounted (Configure stage); otherwise fall back to the
    // snapshot captured when entering Visualise (where the live canvas is not mounted).
    const img = (api && api.snapshot && api.snapshot()) || quoteImg || null;
    if (!img) { setRenderErr('Could not capture the design — go back to Configure, rotate the model once, then try again.'); return; }
    setRendering(true); setRenderErr(''); setRenderUrl(null);
    try {
      const r = await aiFetch(SUPA_URL + '/functions/v1/render_photoreal', {
        method: 'POST', headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: img, product: prodKey, finish: finishId })
      });
      const d = await r.json().catch(() => ({}));
      if (d && d.ok && d.url) { const branded = await brandRender(d.url, { specLine: brandSpecLine(), dateStr: brandDateStr() }); setRenderUrl(branded || d.url); }
      else setRenderErr(d && d.error === 'Render not configured' ? 'Photorealistic rendering isn’t switched on yet.' : 'Render failed — please try again.');
    } catch (e) { setRenderErr('Network error — please try again.'); }
    setRendering(false);
  };
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiImage, setAiImage] = useState(null); // { dataUrl, media_type, base64 }
  // Downscale an uploaded room photo client-side so the payload stays small.
  const onAiPhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let { width:w, height:h } = img;
        if (w > h && w > max) { h = Math.round(h*max/w); w = max; } else if (h > max) { w = Math.round(w*max/h); h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.72);
        setAiImage({ dataUrl, media_type: 'image/jpeg', base64: dataUrl.split(',')[1] });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  // ── Wave 2: living configurator accordion (multiple sections open at once) ──
  // Essentials open by default; optional categories collapsed.
  // ── Guided one-step-at-a-time configurator ──
  const [stepIndex, setStepIndex] = useState(0);          // current step in the guided flow
  const [visitedSteps, setVisitedSteps] = useState(() => new Set()); // step keys the user has opened/skipped
  const [customSize, setCustomSize] = useState(false);     // Size step: standard presets vs custom numeric inputs
  // ── Wave 2: 3D toolbar state (lifted into PlannerPage, passed to Wardrobe3D) ──
  const [unit, setUnit] = useState('cm');         // 'cm' | 'in'
  const [camPreset, setCamPreset] = useState('iso'); // 'front' | 'iso' | 'top'
  const [scaleMode, setScaleMode] = useState('fit'); // 'fit' | 'true'
  const [railCollapsed, setRailCollapsed] = useState(false); // expand 3D to near full width
  // Re-fit the 3D after the rail collapses/expands (container width changed).
  useEffect(() => {
    const id = setTimeout(() => { try { if (plannerApi.current && plannerApi.current.refit) plannerApi.current.refit(); } catch (e) {} }, 360);
    return () => clearTimeout(id);
  }, [railCollapsed]);
  const [pkg, setPkg] = useState(1); // selected package index (Standard default)
  const [showItemized, setShowItemized] = useState(true);
  const [quoteImg, setQuoteImg] = useState(null); // captured 3D snapshot shown in the quote area
  const [brandedImg, setBrandedImg] = useState(null); // The Closets-branded version of the snapshot (logo + date + project name) for Visualise display + download
  const [quoteSent, setQuoteSent] = useState(false); // post-submit success (guest → account invite)
  // Stable-per-design quotation reference: TC-YYMMDD-XXXX. Generated once (lazy ref) so it
  // doesn't change on every render. 4-char token derived from the live config id if present,
  // else a random base36 token. Format: TC-260627-A1B2.
  const quoteRefRef = useRef(null);
  if (!quoteRefRef.current) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    let token = '';
    try {
      const seed = (plannerApi.current && plannerApi.current.configId) || (selProduct && selProduct.id) || '';
      token = String(seed).replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    } catch (e) {}
    if (token.length < 4) token = (token + Math.random().toString(36).slice(2, 6).toUpperCase()).slice(0, 4);
    quoteRefRef.current = 'TC-' + yy + mm + dd + '-' + token;
  }
  const quoteRef = quoteRefRef.current;
  const priceTimer = useRef(null);
  // Package tiers — multipliers + labels. Single source of truth: the shared
  // configurator config (website_configurator_settings.config.packages), so the
  // website, the customer portal and the pricing engine never drift. Falls back
  // to the built-in list if the config key is missing.
  const PACKAGES = (Array.isArray(settings?.packages) && settings.packages.length
    && settings.packages.every(p => p && p.name && isFinite(Number(p.mult))))
    ? settings.packages.map(p => ({ name: p.name, mult: Number(p.mult), hl: p.hl || p.highlight || '' }))
    : [
        { name:'Economy', mult:0.72, hl:'Quality essentials' },
        { name:'Standard', mult:1, hl:'Most popular' },
        { name:'Premium', mult:1.45, hl:'Premium finishes' },
        { name:'Luxury', mult:2.1, hl:'Top-tier materials' },
      ];

  useEffect(() => {
    let alive = true; setLoadError(false);
    const timer = setTimeout(() => { if (alive && !settings) setLoadError(true); }, 8000);
    api('website_configurator_settings?id=eq.main-config&select=config').then(d => {
      if (!alive) return; clearTimeout(timer);
      if (d && d[0] && d[0].config) { setSettings(d[0].config); setLoadError(false); } else setLoadError(true);
    }).catch(() => { if (alive) { clearTimeout(timer); setLoadError(true); } });
    return () => { alive = false; clearTimeout(timer); };
  }, [loadAttempt]);

  // Product-aware config: prefer the selected product's spec, fall back to flat wardrobe
  const prodKey = selProduct?.id || 'wardrobe';
  const prodCfg = settings?.products?.[prodKey] || null;
  const cats = (prodCfg?.categories) || (prodKey === 'wardrobe' ? (settings?.categories || {}) : {});
  const catKeys = Object.keys(cats);
  const prodLayouts = Array.isArray(prodCfg?.layouts) ? prodCfg.layouts : null;

  // ── Per-product dimension model (driven by DB config) ──
  // Kitchen layouts are runs (length), doors carry a thin "thickness" depth, etc.
  const KITCHEN_RUN_LAYOUTS = ['l-shape','u-shape','parallel'];
  const isKitchen = prodKey === 'kitchen';
  const isDoors = prodKey === 'doors';
  // L-shape Side A/B only makes sense for these products (wardrobe/walkin/walk-in dressing rooms).
  const supportsSideAB = (prodKey === 'wardrobe' || prodKey === 'walkin');
  // Build a {min,max,step,allowed} spec for a dimension from the config array.
  const dimSpec = useCallback((axis, fallback) => {
    const arr = prodCfg && Array.isArray(prodCfg[axis]) ? prodCfg[axis].map(Number).filter(n => !isNaN(n)) : null;
    if (arr && arr.length) {
      const sorted = [...arr].sort((a,b)=>a-b);
      return { min: sorted[0], max: sorted[sorted.length-1], allowed: sorted, discrete: sorted.length > 1 };
    }
    return { min: fallback[0], max: fallback[1], allowed: null, discrete: false };
  }, [prodCfg]);
  const widthSpec  = dimSpec('widths_cm',  [120,400]);
  const heightSpec = dimSpec('heights_cm', [180,300]);
  const depthSpec  = dimSpec('depths_cm',  [40,80]);
  // Snap a value to the nearest allowed discrete value (or clamp into [min,max]).
  const snapDim = useCallback((spec, val) => {
    const v = Number(val);
    if (spec.allowed && spec.allowed.length) {
      return spec.allowed.reduce((best,a)=> Math.abs(a-v) < Math.abs(best-v) ? a : best, spec.allowed[0]);
    }
    return Math.max(spec.min, Math.min(spec.max, isNaN(v) ? spec.min : v));
  }, []);
  // A sensible default for a product: middle-ish allowed value, or midpoint of range.
  const defaultDim = useCallback((spec) => {
    if (spec.allowed && spec.allowed.length) return spec.allowed[Math.floor((spec.allowed.length-1)/2)];
    return Math.round((spec.min + spec.max) / 2);
  }, []);

  // When the product changes, reset layout + option selections + dims to that product's defaults
  const lastProdRef = useRef(prodKey);
  useEffect(() => {
    if (lastProdRef.current !== prodKey) {
      lastProdRef.current = prodKey;
      const firstLayout = (prodLayouts && prodLayouts[0]?.id) || 'single';
      setLayout(firstLayout);
      setSel({});
      // Initialise dims from this product's config so sliders/3D start in-range.
      const w = defaultDim(widthSpec), h = defaultDim(heightSpec), d = defaultDim(depthSpec);
      setDims({ width: w, height: h, depth: d, sideA: w, sideB: Math.round(w * 0.7) });
    }
  }, [prodKey, prodLayouts, widthSpec, heightSpec, depthSpec, defaultDim]);

  const buildSelection = useCallback(() => {
    const ids = [];
    Object.values(sel).forEach(v => { if (Array.isArray(v)) ids.push(...v); else if (v) ids.push(v); });
    const useAB = supportsSideAB && layout === 'l-shape';
    const w = useAB ? (Number(dims.sideA) + Number(dims.sideB)) : dims.width;
    return { product: prodKey, width_cm: w, height_cm: dims.height, depth_cm: dims.depth, delivery: false, installation: false, modules: [{ options: ids }], layout };
  }, [sel, dims, layout, prodKey, supportsSideAB]);

  useEffect(() => {
    if (!settings || stage !== 'config') return;
    setPricing(true);
    if (priceTimer.current) clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(SUPA_URL + '/rest/v1/rpc/fn_configurator_price', {
          method: 'POST', headers: { ...H, 'Prefer': 'return=representation' },
          body: JSON.stringify({ p_selection: buildSelection() }),
        });
        const data = await r.json();
        setPrice(data && !data.error ? data : null);
      } catch { setPrice(null); } finally { setPricing(false); }
    }, 300);
    return () => priceTimer.current && clearTimeout(priceTimer.current);
  }, [settings, buildSelection, stage]);

  const total = price?.total || 0;
  const FINISHES = [
    { id:'oak', name:'Oak', hex:'#c89b5e' }, { id:'walnut', name:'Walnut', hex:'#6b4423' },
    { id:'white', name:'White', hex:'#f3f3f1' }, { id:'graphite', name:'Graphite', hex:'#3a3a3c' },
    { id:'sage', name:'Sage', hex:'#9aa88a' },
  ];
  const [finishId, setFinishId] = useState('oak');
  const finishHex = (FINISHES.find(f => f.id === finishId) || FINISHES[0]).hex;
  const hasGlass = !!sel['glass_options'];
  const hasHandles = !!sel['handles'];
  const hasLed = !!sel['accessories'];

  const LAYOUTS = [
    { id:'single', label:'Single wall' }, { id:'l-shape', label:'L-shaped' },
    { id:'walk-in', label:'Walk-in' }, { id:'sliding', label:'Sliding' },
  ];
  // Small top-down/elevation diagram per layout id (works across products)
  const layoutIcon = (id, active) => {
    const c = active ? 'var(--clay)' : '#c7c7cc';
    const sw = 2.4;
    const P = (d) => <path d={d} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    const R = (x,y,w,h,fill) => <rect x={x} y={y} width={w} height={h} rx="1.5" stroke={c} strokeWidth={sw} fill={fill?(active?'var(--sand)':'#f0f0f2'):'none'} />;
    let inner = null;
    switch (id) {
      case 'single': case 'wall': case 'hinged': case 'open': case 'standard': case 'floating':
        inner = R(5,9,22,5, id==='floating'); break;
      case 'l-shape':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}</>; break;
      case 'u-shape':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}{R(22,5,5,18)}</>; break;
      case 'parallel':
        inner = <>{R(5,5,22,4)}{R(5,19,22,4)}</>; break;
      case 'island':
        inner = <>{R(4,4,24,4)}{R(11,15,10,7,true)}</>; break;
      case 'sliding':
        inner = <>{R(4,9,13,6)}{R(15,11,13,6)}</>; break;
      case 'folding':
        inner = P('M5 8 L11 16 L17 8 L23 16 L27 11'); break;
      case 'full-wall':
        inner = <>{R(4,4,4,18)}{R(24,4,4,18)}{R(9,9,14,8,true)}</>; break;
      case 'floor':
        inner = R(6,14,20,6, true); break;
      case 'closed':
        inner = R(6,6,20,16, true); break;
      case 'mixed':
        inner = <>{R(6,6,20,8)}{R(6,15,20,7,true)}</>; break;
      case 'walk-in':
        inner = <>{R(5,5,5,18)}{R(5,18,22,5)}{R(22,5,5,18)}</>; break;
      default:
        inner = R(5,9,22,5); break;
    }
    return <svg width="32" height="28" viewBox="0 0 32 28" aria-hidden="true">{inner}</svg>;
  };

  const pick = (ck, id, multi) => setSel(s => {
    const n = { ...s };
    if (multi) { const a = Array.isArray(s[ck]) ? [...s[ck]] : []; const i = a.indexOf(id); if (i>=0) a.splice(i,1); else a.push(id); n[ck]=a; }
    else n[ck] = s[ck] === id ? null : id;
    return n;
  });
  const isOn = (ck, id, multi) => multi ? (Array.isArray(sel[ck]) && sel[ck].includes(id)) : sel[ck] === id;

  // Completion status + chosen label for a category section
  const catStatus = (ck) => {
    const v = sel[ck];
    const has = Array.isArray(v) ? v.length > 0 : !!v;
    return has ? 'done' : 'empty';
  };
  const catChosen = (ck) => {
    const v = sel[ck]; const items = cats[ck]?.items || [];
    const nameOf = (id) => (items.find(i => i.id === id)?.name) || '';
    if (Array.isArray(v)) return v.length ? (v.length === 1 ? nameOf(v[0]) : v.length + ' selected') : '';
    return v ? nameOf(v) : '';
  };
  // Card image: photo if set, else swatch, else neutral
  const cardBg = (it) => it.image_url ? `center/cover url(${it.image_url})` : (it.swatch || 'linear-gradient(135deg,#ece7df,#ddd5c8)');

  const runAI = async () => {
    if (!aiText.trim() && !aiImage) return;
    setAiBusy(true);
    try {
      const r = await aiFetch(SUPA_URL + '/functions/v1/planner_ai_design', {
        method: 'POST', headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, product: selProduct?.id || undefined, image_base64: aiImage?.base64, media_type: aiImage?.media_type }),
      });
      const d = await r.json();
      if (d.ok && d.design) {
        const g = d.design;
        // Switch to the AI-chosen product first (this resets layout), then apply the rest after the reset.
        const pp = g.product && PLANNER_PRODUCTS.find(p => p.id === g.product);
        if (pp) setSelProduct({ id: pp.id, name: pp.name, ready: true });
        const apply = () => {
          if (g.layout) setLayout(g.layout);
          if (g.finish_id) setFinishId(g.finish_id);
          setDims(c => ({ ...c, width: g.width_cm || c.width, height: g.height_cm || c.height, depth: g.depth_cm || c.depth }));
          if (g.options && typeof g.options === 'object') {
            const ns = {}; Object.keys(g.options).forEach(k => { ns[k] = g.options[k]; });
            setSel(ns);
          }
          setAiSummary(g.summary || '');
          setStage('config');
        };
        if (pp) setTimeout(apply, 0); else apply();
      } else {
        toast('Could not generate a design — try describing it differently', 'error');
      }
    } catch { toast('AI is unavailable right now', 'error'); }
    finally { setAiBusy(false); }
  };

  const persist = async (status) => {
    const id = uid();
    await api('product_configurations', { method:'POST', body:[{
      id, customer_id:user?.id||null, customer_name:user?.name||null, customer_email:user?.email||null, customer_phone:user?.phone||null,
      product_name:(selProduct?.name ? selProduct.name+' — ' : '')+'Custom ('+layout+', '+((supportsSideAB&&layout==='l-shape')?(dims.sideA+'+'+dims.sideB):dims.width)+'×'+dims.height+'cm)',
      configuration:buildSelection(), total_price:total, subtotal:price?.goods_subtotal||null,
      discount_amount:price?.discount_amount||null, vat_amount:price?.vat_amount||null, price_breakdown:price||null,
      status, share_token:id, created_at:new Date().toISOString() }] });
    return id;
  };
  const save = async () => {
    // Require login to save — remember the intent and resume after auth.
    if (!user) { pendingAction.current = 'save'; if (openAuth) openAuth('register'); else setPage('portal'); return; }
    setBusy(true);
    try { await persist('saved'); setSaved(true); toast(t('w4DesignSaved'),'success'); }
    catch (e) { toast(t('w4CouldNotSave') + ' ' + (e?.message || t('w4PleaseTryAgain')), 'error'); }
    finally { setBusy(false); }
  };
  // Selected package + package-adjusted total (used by config price card AND the quote)
  const selPkg = PACKAGES[Math.max(0, Math.min(pkg, PACKAGES.length-1))] || PACKAGES[1];
  const pkgTotal = Math.round(total * selPkg.mult);
  // Build a REAL itemized quotation straight from fn_configurator_price:
  // base_price line + each RPC line + layout_price + package adjustment + VAT → TOTAL.
  const buildLineItems = useCallback(() => {
    const p = price || {};
    const items = [];
    const round = (n) => Math.round(Number(n) || 0);
    // 1) Base price (carcass + structure for the chosen size)
    const base = round(p.base_price);
    if (base) items.push({ label:'Base price', detail:`${selProduct?.name || 'Wardrobe'} · ${layout}`, price: base });
    // 2) Real priced lines returned by the RPC (chosen options / materials / glass etc.)
    (Array.isArray(p.lines) ? p.lines : []).forEach(ln => {
      const amt = round(ln.amount);
      items.push({ label: ln.name || 'Option', detail: amt===0 ? 'Included' : null, price: amt });
    });
    // 3) Layout price (e.g. L-shape / island uplift) if any
    const layoutPrice = round(p.layout_price);
    if (layoutPrice) { const lay = (prodLayouts||LAYOUTS).find(l=>l.id===layout); items.push({ label:`Layout — ${lay?.label || layout}`, detail:null, price: layoutPrice }); }
    // Goods subtotal as priced by the RPC (pre-VAT, pre-package).
    const goods = round(p.pre_vat_total != null ? p.pre_vat_total : (p.goods_subtotal != null ? p.goods_subtotal : total));
    // 4) Package adjustment — multiplier applied to goods.
    const goodsPkg = round(goods * selPkg.mult);
    const pkgAdj = goodsPkg - goods;
    // 5) VAT on the package-adjusted goods.
    const vatRate = (typeof p.vat_rate === 'number') ? p.vat_rate : 0;
    const vat = round(goodsPkg * vatRate);
    const grand = goodsPkg + vat;
    return {
      items, subtotal: goods,
      pkgName: selPkg.name, pkgMult: selPkg.mult, pkgAdj,
      vatRate, vat, goodsPkg,
      total: grand,
    };
  }, [price, total, selProduct, layout, prodLayouts, selPkg]);
  const [showQuote, setShowQuote] = useState(false);
  const [qForm, setQForm] = useState({ name:'', phone:'', email:'' });
  const [quoteErr, setQuoteErr] = useState(''); // visible inline error for the quote flow
  // Submit the design as a quote through the shared edge function so the team
  // receives the spec + a copy of the live 3D design. Contact = signed-in user or modal input.
  const submitQuote = async (contact) => {
    const name = contact?.name || user?.name, phone = contact?.phone || user?.phone, email = contact?.email || user?.email;
    { const qv = validateForm({ name, phone, email }, { name:{type:'name',required:true}, phone:{type:'phone',required:true}, email:{type:'email'} }, lang); if (!qv.ok) { setQuoteErr(Object.values(qv.errors)[0]); return; } }   // [FORMS]
    setBusy(true); setQuoteErr('');
    // Capture the design image: live 3D snapshot if mounted, else the photoreal render or the snapshot we took entering Visualise.
    let imageB64 = null;
    try { imageB64 = (plannerApi.current && plannerApi.current.snapshot) ? plannerApi.current.snapshot() : null; } catch (e) {}
    if (!imageB64) imageB64 = renderUrl || quoteImg || null;
    try {
      // Build a readable design summary so the sales team sees the spec in the quote itself
      const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
      const sizeStr = (supportsSideAB&&layout==='l-shape') ? `${dims.sideA}+${dims.sideB}×${dims.height}×${dims.depth}cm` : `${dims.width}×${dims.height}×${dims.depth}cm`;
      const chosenOpts = Object.keys(sel).map(ck => { const lbl = catChosen(ck); return lbl ? `${cats[ck]?.label||ck}: ${lbl}` : null; }).filter(Boolean);
      // Full itemized breakdown for the sales team / Bonsai Hub
      const lineData = buildLineItems();
      const noteLines = [
        `🪟 Website Planner quote`,
        `Quotation #${quoteRef} · ${brandDateStr()}`,
        `Product: ${selProduct?.name || 'Wardrobe'}`,
        `Layout: ${layout}  |  Finish: ${finName}  |  Size: ${sizeStr}`,
        `Package: ${lineData.pkgName} (×${lineData.pkgMult})`,
        `— Itemized —`,
        ...lineData.items.map(li => `• ${li.label}${li.detail?` (${li.detail})`:''}: BHD ${li.price}`),
        `Subtotal: BHD ${lineData.subtotal}`,
        ...(lineData.pkgAdj ? [`${lineData.pkgName} package: BHD ${lineData.pkgAdj>0?'+':''}${lineData.pkgAdj}`] : []),
        ...(lineData.vat ? [`VAT (${Math.round(lineData.vatRate*100)}%): BHD ${lineData.vat}`] : []),
        `Estimated total (${lineData.pkgName}): BHD ${lineData.total}`,
      ];
      // Attach the REAL line items + breakdown inside the configuration object too
      const configWithItems = { ...buildSelection(), quote_ref: quoteRef, package: lineData.pkgName, package_multiplier: lineData.pkgMult, line_items: lineData.items, subtotal: lineData.subtotal, package_adjustment: lineData.pkgAdj, vat: lineData.vat, vat_rate: lineData.vatRate, total: lineData.total, price_breakdown: price || null };
      const r = await fetch(SUPA_URL + '/functions/v1/submit_design_quote', {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'website',
          quote_ref: quoteRef,
          customer_id: user?.id || null,
          customer_name: name || 'Website Visitor',
          customer_phone: phone || null,
          customer_email: email || null,
          product_name: (selProduct?.name || 'Wardrobe') + ' — Custom (' + layout + ', ' + sizeStr + ', ' + lineData.pkgName + ')',
          configuration: configWithItems,
          total_price: lineData.total,
          image_base64: imageB64,
          notes: noteLines.join('\n'),
          interest: (selProduct?.name || 'Wardrobe') + ' (planner)',
        }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data && data.ok) {
        toast('Quote requested — our team will contact you soon','success');
        setShowQuote(false);
        if (!user) {
          // Guest: invite them to create an account to track the quote
          setQuoteSent({ name: name || qForm.name, phone: phone || qForm.phone, email: email || qForm.email });
        } else {
          setPage('home');
        }
      } else {
        const msg = 'Could not send your quote: ' + ((data && data.error) || 'please check your details and try again') + '.';
        setQuoteErr(msg); toast(msg, 'error');
      }
    } catch (e) { const msg = 'Could not send your quote: ' + (e?.message || 'network error — please try again') + '.'; setQuoteErr(msg); toast(msg, 'error'); }
    finally { setBusy(false); }
  };
  const requestQuote = () => {
    // Require login for a quote — remember the intent, prefill from any guest form, resume after auth.
    if (!user) {
      pendingAction.current = 'quote';
      const pf = (qForm.name || qForm.phone || qForm.email) ? { name:qForm.name, phone:qForm.phone, email:qForm.email } : undefined;
      setQuoteErr('');
      if (openAuth) openAuth('register', pf); else { setShowQuote(true); }
      return;
    }
    submitQuote();
  };
  // Resume a gated action (save/quote) the moment the user finishes logging in.
  const pendingAction = useRef(null);
  useEffect(() => {
    if (user && pendingAction.current) {
      const act = pendingAction.current; pendingAction.current = null;
      if (act === 'save') save();
      else if (act === 'quote') submitQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  // Today's date, e.g. "27 Jun 2026" — for the branded design image.
  const brandDateStr = () => { try { return formatDate(new Date(), 'en', 'medium'); } catch (e) { return ''; } };
  // Project / spec line for the branded image: "Walk-in Wardrobe — l-shape, 200+150 × 240 × 60 cm".
  const brandSpecLine = () => {
    const sizeString = (supportsSideAB && layout === 'l-shape')
      ? `${dims.sideA}+${dims.sideB} × ${dims.height} × ${dims.depth} cm`
      : `${dims.width} × ${dims.height} × ${dims.depth} cm`;
    return `${selProduct?.name || 'Design'} — ${layout}, ${sizeString}`;
  };
  const goVisualise = () => {
    setQuoteErr(''); setBrandedImg(null);
    // Capture the live 3D snapshot now, while the config canvas is still mounted, for the quote area.
    try {
      const s = plannerApi.current && plannerApi.current.snapshot ? plannerApi.current.snapshot() : null;
      if (s) {
        setQuoteImg(s);
        // Brand the snapshot (logo header + date + project name + consultation footer) for display + download.
        brandRender(s, {
          footTitle: 'Your design — 3D concept',
          footNote: 'Indicative 3D impression. Exact finishes confirmed at your free design consultation.',
          specLine: brandSpecLine(),
          dateStr: brandDateStr(),
        }).then(b => { if (b) setBrandedImg(b); }).catch(() => {});
      }
    } catch (e) {}
    setStage('visualise');
  };
  // Map the chosen Room Designer materials into the configurator's `sel` map where a
  // clean category match exists, so the live price + Quote update. Defensive: only writes
  // categories that actually exist in the active product's config (single-select only).
  const reflectRoomMaterial = (surfaceKey, material) => {
    try {
      if (!material || !cats || !cats[surfaceKey]) return false;
      const opts = (cats[surfaceKey].options) || [];
      // Match by id or by (case-insensitive) name.
      const found = opts.find(o => o.id === material.id || (o.name && material.name && String(o.name).toLowerCase() === String(material.name).toLowerCase()));
      if (!found) return false;
      pick(surfaceKey, found.id, false);
      return true;
    } catch (e) { return false; }
  };
  // Build the Room Designer overlay once; shown from Configure or Visualise (kitchen only).
  const roomDesignerOverlay = (isKitchen && roomDesignerOpen) ? (
    <RoomDesigner
      mobile={mobile}
      sceneShapeFallback={layout}
      onClose={() => setRoomDesignerOpen(false)}
      onReflectMaterial={reflectRoomMaterial}
      onGoToSummary={() => { setRoomDesignerOpen(false); goVisualise(); }}
      photorealReq={{ product: prodKey, finish: finishId, getImage: () => { try { const a = plannerApi.current; return (a && a.snapshot && a.snapshot()) || quoteImg || null; } catch (e) { return quoteImg || null; } } }}
      indicativeTotal={(() => { try { return buildLineItems().total; } catch (e) { return null; } })()}
    />
  ) : null;
  // ── Option A: formal printable quotation (PDF via the browser print dialog) ──
  // Builds a self-contained HTML document (letterhead, spec, branded design image,
  // itemized table, subtotal/VAT/TOTAL, footer) and opens it in a new window, then
  // calls print() so the user can "Save as PDF". No external lib — print-to-PDF is the deliverable.
  const downloadQuotePdf = () => {
    const ld = buildLineItems();
    const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
    const sizeStr = (supportsSideAB&&layout==='l-shape') ? `${dims.sideA}+${dims.sideB} × ${dims.height} × ${dims.depth} cm` : `${dims.width} × ${dims.height} × ${dims.depth} cm`;
    const dateStr = brandDateStr();
    const preparedFor = (user && user.name) || (qForm && qForm.name) || 'Valued client';
    const img = brandedImg || renderUrl || quoteImg || '';
    const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const money = (n) => formatBHD(n, 'en');   // printed quote is English; BHD has 3 decimals
    const rows = ld.items.map(li => (
      `<tr><td class="desc">${esc(li.label)}${li.detail ? `<span class="sub">${esc(li.detail)}</span>` : ''}</td>`
      + `<td class="amt">${li.price === 0 ? 'Included' : money(li.price)}</td></tr>`
    )).join('');
    const pkgRow = ld.pkgAdj !== 0
      ? `<tr><td class="desc">${esc(ld.pkgName)} package (×${ld.pkgMult})</td><td class="amt">${ld.pkgAdj > 0 ? '+ ' : '− '}${money(Math.abs(ld.pkgAdj))}</td></tr>`
      : '';
    const vatRow = ld.vat > 0
      ? `<tr><td class="desc">VAT (${Math.round(ld.vatRate*100)}%)</td><td class="amt">${money(ld.vat)}</td></tr>`
      : '';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>`
      + `<meta name="viewport" content="width=device-width, initial-scale=1"/>`
      + `<title>Quotation ${esc(quoteRef)} — The Closets</title>`
      + `<style>`
      + `*{box-sizing:border-box;margin:0;padding:0}`
      + `body{font-family:-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;color:var(--ink);background:#f3f3f3;padding:28px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}`
      + `.sheet{max-width:820px;margin:0 auto;background:#ffffff;padding:48px 52px;box-shadow:0 6px 30px rgba(0,0,0,.12)}`
      + `.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--clay);padding-bottom:18px;margin-bottom:24px}`
      + `.wordmark{font-size:24px;font-weight:800;letter-spacing:.02em;color:var(--ink)}`
      + `.tag{font-size:12px;color:var(--muted);margin-top:3px}`
      + `.qbox{text-align:right}`
      + `.qbox .t{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}`
      + `.qbox .ref{font-size:16px;font-weight:800;color:var(--clay-deep);margin-top:2px}`
      + `.qbox .date{font-size:12px;color:var(--ink-soft);margin-top:2px}`
      + `.prepared{font-size:13px;color:var(--ink-soft);margin-bottom:4px}`
      + `.prepared b{color:var(--ink)}`
      + `.spec{font-size:12.5px;color:var(--ink-soft);background:var(--cream);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:14px 0 20px}`
      + `.img{width:100%;border:1px solid var(--line);border-radius:8px;display:block;margin-bottom:22px}`
      + `table{width:100%;border-collapse:collapse;margin-bottom:6px}`
      + `th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--ink);padding:8px 0}`
      + `th.amt,td.amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}`
      + `td{padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px;vertical-align:top}`
      + `td.desc .sub{display:block;font-size:11px;color:var(--muted);margin-top:2px}`
      + `tr.sum td{border-bottom:none;padding:6px 0;color:var(--ink-soft);font-size:13px}`
      + `tr.total td{border-top:2px solid var(--ink);padding-top:12px;font-size:17px;font-weight:800;color:var(--ink)}`
      + `tr.total td.amt{color:var(--clay-deep)}`
      + `.foot{margin-top:28px;padding-top:16px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)}`
      + `.foot .contact{color:var(--clay-deep);font-weight:700;margin-top:6px}`
      + `@page{size:A4;margin:14mm}`
      + `@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;max-width:none;padding:0}}`
      + `</style></head><body><div class="sheet">`
      + `<div class="head"><div><div class="wordmark">THE CLOSETS</div><div class="tag">Bespoke furniture · Bahrain</div></div>`
      + `<div class="qbox"><div class="t">Quotation</div><div class="ref">#${esc(quoteRef)}</div><div class="date">${esc(dateStr)}</div></div></div>`
      + `<div class="prepared">Prepared for <b>${esc(preparedFor)}</b></div>`
      + `<div class="spec">${esc(selProduct?.name || 'Wardrobe')} · ${esc(layout)} · ${esc(sizeStr)} · ${esc(finName)} · ${esc(ld.pkgName)} package</div>`
      + (img ? `<img class="img" src="${img}" alt="Your design"/>` : '')
      + `<table><thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead><tbody>`
      + rows
      + `<tr class="sum"><td class="desc">Subtotal</td><td class="amt">${money(ld.subtotal)}</td></tr>`
      + pkgRow
      + vatRow
      + `<tr class="total"><td>TOTAL</td><td class="amt">${money(ld.total)}</td></tr>`
      + `</tbody></table>`
      + `<div class="foot">Indicative — valid 30 days. Free design visit confirms an exact quote.`
      + `<div class="contact">the-closets.com · +973 17555095</div></div>`
      + `</div>`
      + `<script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>`
      + `</body></html>`;
    let win = null;
    try { win = window.open('', '_blank'); } catch (e) {}
    if (!win) { toast('Please allow pop-ups to download your quotation PDF.', 'error'); return; }
    try { win.document.open(); win.document.write(html); win.document.close(); }
    catch (e) { toast('Could not open the quotation — please try again.', 'error'); }
  };

  // Reusable 5-step progress spine (clone of Raumplus/Wren step counter), shared across stages.
  const planSteps = (cur) => {
    const order = ['product','ai','config','visualise','quote'];
    const labels = { product:t('pgProduct'), ai:t('pgKickstart'), config:t('pgConfigure'), visualise:t('pgVisualise'), quote:t('pgQuote') };
    const ci = order.indexOf(cur);
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap', margin:'0 auto 18px', fontSize:12.5, maxWidth:640 }}>
        {order.map((k,i)=>{
          const done = i<ci, now = i===ci;
          const go = (i<ci && (k==='product'||k==='ai'||k==='config'||k==='visualise')) ? ()=>setStage(k) : undefined;
          return (
            <Fragment key={k}>
              <span onClick={go} style={{ display:'flex', alignItems:'center', gap:6, cursor:go?'pointer':'default' }}>
                <span style={{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0,
                  background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color: (!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':i+1}</span>
                <span style={{ fontWeight: now?700:500, color: now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)' }}>{labels[k]}</span>
              </span>
              {i<order.length-1 && <span style={{ width:18, height:2, background:'var(--line)', borderRadius:'var(--radius-xs)' }} />}
            </Fragment>
          );
        })}
      </div>
    );
  };

  if (!settings) return (
    <div style={{ minHeight:'70vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'140px 24px', textAlign:'center', color:'var(--shop-muted)' }}>
      {loadError ? (<>
        <div style={{ fontSize:17, fontWeight:600, color:'var(--shop-ink)', marginBottom:8 }}>{t('sw3PlannerLoadErr')}</div>
        <div style={{ fontSize:14, marginBottom:20, maxWidth:360 }}>{t('sw3PlannerLoadErrSub')}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button type="button" className="btn" onClick={()=>{ setLoadError(false); setLoadAttempt(a=>a+1); }} style={{ borderRadius:'var(--radius-lg)' }}>Try again</button>
          <button type="button" className="btn-secondary" onClick={()=>setPage('contact')} style={{ borderRadius:'var(--radius-lg)' }}>Contact us</button>
        </div>
      </>) : <div>Loading planner…</div>}
    </div>
  );

  // ── STAGE 1: PRODUCT PICKER ──
  if (stage === 'product') return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop:64, paddingBottom:80 }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px' }}>
        {planSteps('product')}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Design studio</div>
          <h2 className="display" style={{ fontSize: mobile?30:44, color:'var(--ink)' }}>{t('whatDesign')}</h2>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:12 }}>{t('pickProduct')}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'repeat(3,1fr)', gap:16 }}>
          {PLANNER_PRODUCTS.map(p=>{
            const on = selProduct?.id === p.id;
            // Ready = has product config, enabled, and prices reviewed (not placeholder)
            const pc = settings?.products?.[p.id];
            const ready = p.id === 'wardrobe' ? true : !!(pc && pc.enabled !== false && !pc.placeholder_prices);
            return (
              <div key={p.id} className="lift" onClick={()=>setSelProduct({ id:p.id, name:p.name, ready })} style={{ cursor:'pointer', border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:'var(--radius-lg)', background:'var(--c-surface)', textAlign:'left', position:'relative', padding:'16px 16px 14px' }}>
                {on && <span style={{ position:'absolute', top:12, right:12, width:22, height:22, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 6"/></svg></span>}
                {!ready && !on && <span style={{ position:'absolute', top:12, right:12, fontSize:10, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:'var(--radius-sm)' }}>{t('quoteOnly')}</span>}
                <div style={{ width:42, height:42, borderRadius:'var(--radius-md)', background: on?'var(--clay)':'rgba(168,75,41,.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={on?'#fff':'var(--clay)'} strokeWidth="1.6" aria-hidden="true"><path d={p.icon}/></svg>
                </div>
                <div className="display" style={{ fontSize:17, color:'var(--ink)' }}>{p.name}</div>
                <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:3, marginBottom:10 }}>{p.sub}</div>
                <div style={{ fontSize:12.5, color:'var(--clay)', fontWeight:600 }}>{ready ? 'Start' : 'Request a quote'} →</div>
              </div>
            );
          })}
        </div>
        {selProduct && !selProduct.ready && (
          <div style={{ maxWidth:520, margin:'24px auto 0', padding:'18px 22px', background:'var(--c-surface)', border:'1px solid var(--line)', borderLeft:'3px solid var(--clay)', borderRadius:'var(--radius-lg)', textAlign:'center' }}>
            <div className="display" style={{ fontSize:18, color:'var(--ink)', marginBottom:6 }}>{selProduct.name} — request a quote</div>
            <div style={{ fontSize:14, color:'var(--ink-soft)', marginBottom:14 }}>Online design for {selProduct.name.toLowerCase()} is coming soon. Our team will design it with you.</div>
            <button type="button" className="btn-clay" onClick={()=>setPage('contact')}>{t('requestQuote')}</button>
          </div>
        )}
        {selProduct && selProduct.ready && (
          <div style={{ textAlign:'center', marginTop:30 }}>
            <button type="button" className="btn-clay" onClick={()=>setStage('ai')} style={{ minWidth:180 }}>{t('pContinueArrow')}</button>
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:24 }}>
          <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button>
        </div>
      </div>
    </div>
  );

  // ── STAGE 2: AI STARTER ──
  if (stage === 'ai') return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'104px 24px 80px' }}>
      <div style={{ width:'100%', maxWidth:640 }}>{planSteps('ai')}</div>
      <div style={{ maxWidth:580, width:'100%', background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding: mobile?22:30 }}>
        {(() => { const pp = PLANNER_PRODUCTS.find(p=>p.id===(selProduct?.id||'wardrobe')); return (
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'7px 14px 7px 7px', background:'var(--sand)', border:'1px solid var(--line)', borderRadius:'var(--radius-pill)', marginBottom:16 }}>
            <span style={{ width:30, height:30, borderRadius:'var(--radius-sm)', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" aria-hidden="true"><path d={pp?.icon || ''}/></svg>
            </span>
            <span style={{ fontSize:13, color:'var(--ink-soft)' }}>{t('plDesigning')} <strong style={{ color:'var(--ink)' }}>{trMap(selProduct?.name || pp?.name || 'Wardrobe', PLANNER_PROD_KEY, lang)}</strong></span>
          </div>
        ); })()}
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
          <Spark size={22} color="var(--clay)" />
          <span className="display" style={{ fontSize:20, color:'var(--ink)' }}>{t('plDescribeSpace')}</span>
        </div>
        <p style={{ fontSize:14, color:'var(--ink-soft)', marginBottom:16, lineHeight:1.6 }}>{t('sw3PlannerTailored')}</p>
        <textarea value={aiText} onChange={e=>setAiText(e.target.value)} aria-label={t('plDescribeSpace')} placeholder={t('plDescribePh')} rows={3} style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'inherit', resize:'vertical', marginBottom:12 }} />
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
          {[['Small bedroom, sliding doors, white', t('plChipSmallBedroom')],['Walk-in, oak, lots of shoes', t('plChipWalkInOak')],['Modern L-shape kitchen, white, quartz', t('plChipLShapeKitchen')]].map(([val,label])=>(
            <button key={val} type="button" onClick={()=>setAiText(val)} style={{ fontSize:12, border:'1px solid var(--line)', borderRadius:'var(--radius-lg)', padding:'6px 13px', background:'var(--cream)', color:'var(--ink-soft)', cursor:'pointer' }}>{label}</button>
          ))}
        </div>
        {/* Room photo (vision) */}
        <label style={{ display:'flex', alignItems:'center', gap:12, background:'var(--cream)', border:'1px dashed var(--line)', borderRadius:'var(--radius-md)', padding:'12px 14px', cursor:'pointer', marginBottom:16 }}>
          {aiImage
            ? <img src={aiImage.dataUrl} alt="room" style={{ width:54, height:42, objectFit:'cover', borderRadius:'var(--radius-sm)' }} />
            : <i className="ti ti-camera" style={{ fontSize:22, color:'var(--clay)' }} aria-hidden="true" />}
          <span style={{ fontSize:14, color:'var(--ink)', fontWeight:500 }}>{aiImage ? t('plPhotoAdded') : t('plAddPhoto')}</span>
          <input type="file" accept="image/*" onChange={e=>onAiPhoto(e.target.files?.[0])} style={{ display:'none' }} />
          {aiImage && <span onClick={e=>{ e.preventDefault(); setAiImage(null); }} style={{ marginLeft:'auto', color:'var(--muted)', fontSize:18 }}>×</span>}
        </label>
        <div style={{ fontSize:12, color:'var(--muted)', marginTop:-10, marginBottom:16 }}>{t('imgHintRoomPhoto')}</div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button type="button" className="btn-clay" disabled={aiBusy || (!aiText.trim() && !aiImage)} onClick={runAI} style={{ opacity:(aiBusy||(!aiText.trim()&&!aiImage))?0.6:1 }}>{aiBusy ? t('plDesigningNow') : t('plGenerateMyDesign')}</button>
          <button type="button" onClick={()=>setStage('config')} style={{ background:'none', border:'none', color:'var(--ink-soft)', fontSize:14, cursor:'pointer' }}>{t('sw3PlannerScratch')}</button>
        </div>
        <div style={{ marginTop:18 }}><span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{lang==='ar'?'رجوع ›':'‹ Back'}</span></div>
      </div>
    </div>
  );

  // ── STAGE 3: SINGLE-SCREEN CONFIG ──
  const sizeW = (supportsSideAB && layout === 'l-shape') ? (Number(dims.sideA)+Number(dims.sideB)) : dims.width;

  // ── STAGE 4: VISUALISE (real stage, after config) ──
  if (stage === 'visualise') {
    const lineData = buildLineItems();
    const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
    const sizeStr = (supportsSideAB&&layout==='l-shape') ? `${dims.sideA}+${dims.sideB} × ${dims.height} × ${dims.depth} cm` : `${dims.width} × ${dims.height} × ${dims.depth} cm`;
    return (
      <div style={{ minHeight:'100dvh', paddingTop:80, paddingBottom:'calc(56px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth:1440, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'12px 0 10px' }}>
            <span onClick={()=>setStage('config')} style={{ cursor:'pointer', fontSize:13, color:'var(--ink-soft)' }}>‹ Back to configure</span>
            <span style={{ fontSize:13, color:'var(--muted)' }}>{selProduct?.name || 'Wardrobe'}</span>
            <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button>
          </div>
          {planSteps('visualise')}
          {/* ── OPTION B: visual hero (left) + on-screen quotation (right) ── */}
          <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.25fr 1fr', gap:20, alignItems:'start' }}>
            {/* LEFT — branded design image / live 3D hero with a quotation chip overlaid */}
            <div style={{ background:'var(--shop-fill)', borderRadius:'var(--radius-xl)', position:'relative', minHeight: mobile?300:560, overflow:'hidden' }}>
              {(renderUrl || brandedImg)
                ? <img src={renderUrl || brandedImg} alt="Your design" style={{ width:'100%', display:'block' }} />
                : (quoteImg
                    ? <img src={quoteImg} alt="Your design" style={{ width:'100%', display:'block' }} />
                    : <Wardrobe3D apiRef={plannerApi} finishHex={finishHex} layout={layout} glass={hasGlass} handles={hasHandles} led={hasLed} mobile={mobile} tall product={prodKey} widthCm={sizeW} heightCm={dims.height} depthCm={dims.depth} sideACm={dims.sideA} sideBCm={dims.sideB} unit={unit} />)}
              {/* Quotation #ref · date chip (top-left so it clears the photoreal CTA top-right) */}
              <div style={{ position:'absolute', top:12, left:12, zIndex:3, display:'inline-flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:'var(--radius-pill)', background:'rgba(33,28,24,.82)', color:'#fff', fontSize:11.5, fontWeight:600, letterSpacing:'.02em', backdropFilter:'blur(4px)' }}>
                <i className="ti ti-file-invoice" aria-hidden="true" /> #{quoteRef} · {brandDateStr()}
              </div>
              {/* Top-right so it never overlaps the 3D zoom controls (bottom-right) or the drag-to-rotate hint (bottom-left). */}
              <button type="button" onClick={doPhotoreal} disabled={rendering} style={{ position:'absolute', top:12, right:12, zIndex:3, display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:'var(--radius-md)', border:'none', cursor: rendering?'wait':'pointer', background:'linear-gradient(135deg,var(--clay),#89391E)', color:'#fff', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(168,75,41,.4)' }}>
                <i className={rendering ? 'ti ti-loader-2' : 'ti ti-sparkles'} aria-hidden="true" />
                {rendering ? 'Rendering…' : (renderUrl ? 'Regenerate' : 'Make it photorealistic')}
              </button>
              {(renderUrl || brandedImg || quoteImg) && (
                <a href={renderUrl || brandedImg || quoteImg} download="closets-design.jpg" style={{ position:'absolute', bottom:12, right:12, zIndex:3, display:'inline-flex', alignItems:'center', gap:6, padding:'8px 13px', borderRadius:'var(--radius-md)', background:'rgba(33,28,24,.82)', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:700, backdropFilter:'blur(4px)' }}>
                  <i className="ti ti-download" aria-hidden="true" /> Save image
                </a>
              )}
              {isKitchen && (
                <button type="button" onClick={()=>setRoomDesignerOpen(true)} style={{ position:'absolute', bottom:12, left:12, zIndex:3, display:'inline-flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', background:'rgba(255,255,255,.95)', color:'var(--clay-deep)', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(0,0,0,.18)' }}>
                  {t('pOpenRoomDesigner')}
                </button>
              )}
            </div>
            {/* RIGHT — on-screen quotation */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding:'20px 20px 18px' }}>
                {/* Quote header: ref + date prominent */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, paddingBottom:14, borderBottom:'2px solid var(--ink)', marginBottom:14 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom:4 }}>Quotation</div>
                    <div className="display" style={{ fontSize:19, color:'var(--ink)', lineHeight:1.2 }}>#{quoteRef}</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>{brandDateStr()}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11.5, color:'var(--ink-soft)' }}>Estimated total</div>
                    <div style={{ fontSize:26, fontWeight:800, color:'var(--clay)', fontVariantNumeric:'tabular-nums' }}>{fmt(lineData.total)}</div>
                  </div>
                </div>
                {/* Your design summary */}
                <div className="display" style={{ fontSize:16, color:'var(--ink)', marginBottom:8 }}>Your design</div>
                {[['Product', selProduct?.name || 'Wardrobe'],['Layout', layout],['Finish', finName],['Size', sizeStr],['Package', `${selPkg.name} (×${selPkg.mult})`]].map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--line)', fontSize:13.5 }}>
                    <span style={{ color:'var(--ink-soft)' }}>{k}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Itemized quotation */}
              <div style={{ background:'var(--c-surface)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', padding:'16px 20px' }}>
                <div onClick={()=>setShowItemized(s=>!s)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--ink)' }}>Itemized quotation</span>
                  <i className={`ti ti-chevron-${showItemized?'up':'down'}`} style={{ color:'var(--muted)' }} aria-hidden="true" />
                </div>
                {showItemized && (
                  <div style={{ marginTop:12 }}>
                    {lineData.items.map((li,i)=>(
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'6px 0', borderBottom:'1px solid var(--line)', fontSize:13 }}>
                        <span style={{ color:'var(--ink)' }}>{li.label}{li.detail?<span style={{ color:'var(--muted)', display:'block', fontSize:11 }}>{li.detail}</span>:null}</span>
                        <span style={{ fontWeight:600, color: li.price===0?'var(--muted)':'var(--ink)', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{li.price===0?'Included':fmt(li.price)}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:13, color:'var(--ink-soft)' }}>
                      <span>Subtotal</span><span style={{ fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{fmt(lineData.subtotal)}</span>
                    </div>
                    {lineData.pkgAdj !== 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13, color:'var(--ink-soft)' }}>
                        <span>{selPkg.name} package (×{selPkg.mult})</span><span style={{ fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{lineData.pkgAdj>0?'+ ':'− '}{fmt(Math.abs(lineData.pkgAdj))}</span>
                      </div>
                    )}
                    {lineData.vat > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13, color:'var(--ink-soft)' }}>
                        <span>VAT ({Math.round(lineData.vatRate*100)}%)</span><span style={{ fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{fmt(lineData.vat)}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', marginTop:6, borderTop:'2px solid var(--ink)', fontSize:15, fontWeight:800, color:'var(--ink)' }}>
                      <span>TOTAL</span><span style={{ color:'var(--clay)', fontVariantNumeric:'tabular-nums' }}>{fmt(lineData.total)}</span>
                    </div>
                  </div>
                )}
                <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:10 }}>{t('sw3PlannerIndic30')}</div>
              </div>
              {quoteErr && <div role="alert" style={{ background:'#fdecea', border:'1px solid #f5c6c0', color:'#b3261e', borderRadius:'var(--radius-md)', padding:'10px 14px', fontSize:13 }}>{quoteErr}</div>}
              {/* CTAs — primary (quote) + secondary (download PDF). Edit + PDF on one row, primary below. */}
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="btn-secondary" disabled={busy} onClick={()=>setStage('config')} style={{ flex:1, borderRadius:'var(--radius-md)', color:'var(--ink-soft)' }}>‹ Edit</button>
                <button type="button" className="btn-secondary" onClick={downloadQuotePdf} style={{ flex:2, borderRadius:'var(--radius-md)', color:'var(--ink-soft)', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7 }}><i className="ti ti-download" aria-hidden="true" /> Download quotation (PDF)</button>
              </div>
              {!mobile && (
                <button type="button" className="btn-clay" disabled={busy} onClick={requestQuote} style={{ width:'100%', borderRadius:'var(--radius-md)' }}>{busy?t('pSending'):(user?t('pGetMyQuoteArrow'):t('pgSignInQuoteArrow'))}</button>
              )}
            </div>
          </div>
        </div>
        {/* Mobile sticky CTA bar */}
        {mobile && (
          <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:80, background:'rgba(245,241,234,.96)', backdropFilter:'blur(8px)', borderTop:'1px solid var(--line)', padding:'10px 16px calc(10px + env(safe-area-inset-bottom))', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flexShrink:0 }}>
              <div style={{ fontSize:10.5, color:'var(--ink-soft)' }}>Total</div>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--clay)', fontVariantNumeric:'tabular-nums' }}>{fmt(lineData.total)}</div>
            </div>
            <button type="button" className="btn-clay" disabled={busy} onClick={requestQuote} style={{ flex:1, borderRadius:'var(--radius-md)', minHeight:46 }}>{busy?t('pSending'):(user?t('pGetMyQuoteArrow'):t('pgSignInQuoteArrow'))}</button>
          </div>
        )}
        {/* photoreal modal (shared) */}
        {(rendering || renderUrl || renderErr) && (
          <div onClick={()=>{ if(!rendering){ setRenderErr(''); } }} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display: renderErr?'flex':'none', alignItems:'center', justifyContent:'center', padding:20 }}>
            {renderErr && !rendering && <div onClick={e=>e.stopPropagation()} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', maxWidth:420, padding:'24px', textAlign:'center', color:'#c0392b', fontSize:14 }}>{renderErr}<div style={{ marginTop:14 }}><button type="button" onClick={()=>setRenderErr('')} className="btn-secondary" style={{ borderRadius:'var(--radius-md)' }}>OK</button></div></div>}
          </div>
        )}
        {rendering && (
          <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', padding:'40px 50px', textAlign:'center', color:'var(--shop-ink-2)', fontSize:14 }}><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize:26 }} /><div style={{ marginTop:10 }}>{t('sw3PlannerRendering')}</div></div>
          </div>
        )}
        {roomDesignerOverlay}
        {/* guest quote success → account invite */}
        {quoteSent && (
          <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
            <ModalPanel onClose={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:440, width:'100%', padding:28, textAlign:'center' }}>
              <div style={{ width:54, height:54, borderRadius:'50%', background:'#1D9E7522', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><i className="ti ti-check" style={{ color:'#1D9E75', fontSize:28 }} aria-hidden="true" /></div>
              <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 8px' }}>Quote sent!</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 20px', lineHeight:1.6 }}>{t('sw3PlannerCreateAcct')}</p>
              <button type="button" className="btn-clay" onClick={()=>{ const c = quoteSent; if (openAuth) openAuth('register', c && typeof c==='object' ? c : undefined); else setPage('portal'); }} style={{ width:'100%', borderRadius:'var(--radius-md)', marginBottom:10 }}>Create my account</button>
              <button type="button" onClick={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'none', border:'none', fontSize:13.5, color:'var(--muted)', cursor:'pointer' }}>Maybe later</button>
            </ModalPanel>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100dvh', paddingTop:80, paddingBottom: mobile?120:110, fontSize: mobile?15:16 }}>
      <div style={{ maxWidth:1560, margin:'0 auto', padding: mobile?'0 14px':'0 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'12px 0 10px' }}>
          <span onClick={()=>setStage('product')} style={{ cursor:'pointer', fontSize:13, color:'var(--ink-soft)' }}>‹ All products</span>
          <span style={{ fontSize:13, color:'var(--muted)' }}>{selProduct?.name || 'Wardrobe'}</span>
          <button type="button" aria-label="Close" onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button>
        </div>
        {planSteps('config')}

        {isKitchen && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <button type="button" onClick={()=>setRoomDesignerOpen(true)} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:'var(--radius-pill)', border:'1px solid var(--clay)', cursor:'pointer', background:'var(--sand)', color:'var(--clay-deep)', fontSize:13.5, fontWeight:700 }}>
              🎨 Open Room Designer
            </button>
          </div>
        )}

        {(() => {
          // toolbar pill styles (literal hex / tokens only)
          const seg = (active) => ({ padding:'6px 11px', fontSize:12, fontWeight:600, cursor:'pointer', border:'none', background: active?'var(--clay)':'transparent', color: active?'#fff':'var(--ink-soft)', borderRadius:'var(--radius-sm)' });
          const segWrap = { display:'flex', gap:2, background:'rgba(255,255,255,.92)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:3, boxShadow:'0 1px 3px rgba(0,0,0,.08)' };
          return (<>
        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':(railCollapsed?'1fr 0px':'1.9fr 1fr'), gap: railCollapsed?0:20, alignItems:'stretch', transition:'grid-template-columns .35s ease, gap .35s ease' }}>
          {/* BIG 3D STAGE */}
          <div style={{ background:'var(--shop-fill)', borderRadius:'var(--radius-xl)', minHeight: mobile?'46vh':(railCollapsed?720:640), height: mobile?'46vh':undefined, position: mobile?'sticky':'relative', top: mobile?64:undefined, zIndex: mobile?5:undefined, overflow:'hidden' }}>
            <Wardrobe3D apiRef={plannerApi} finishHex={finishHex} layout={layout} glass={hasGlass} handles={hasHandles} led={hasLed} mobile={mobile} tall product={prodKey} widthCm={sizeW} heightCm={dims.height} depthCm={dims.depth} sideACm={dims.sideA} sideBCm={dims.sideB} unit={unit} preset={camPreset} scaleMode={scaleMode} />
            {aiSummary && <div style={{ position:'absolute', top:54, left:12, right:12, fontSize:12, background:'var(--sand)', color:'var(--clay-deep)', padding:'8px 12px', borderRadius:'var(--radius-md)' }}><Spark size={12} color="var(--clay-deep)" style={{ verticalAlign:'-1px' }} /> {aiSummary}</div>}
            {/* 3D TOOLBAR — units · presets · true-scale · expand rail */}
            <div style={{ position:'absolute', top:12, left:12, right:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <div style={segWrap} role="group" aria-label="Units">
                <button type="button" style={seg(unit==='cm')} onClick={()=>setUnit('cm')}>cm</button>
                <button type="button" style={seg(unit==='in')} onClick={()=>setUnit('in')}>in</button>
              </div>
              <div style={segWrap} role="group" aria-label="Camera view">
                <button type="button" style={seg(camPreset==='front')} onClick={()=>setCamPreset('front')}>Front</button>
                <button type="button" style={seg(camPreset==='iso')} onClick={()=>setCamPreset('iso')}>Iso</button>
                <button type="button" style={seg(camPreset==='top')} onClick={()=>setCamPreset('top')}>Top</button>
              </div>
              <div style={segWrap} role="group" aria-label="Scale mode">
                <button type="button" style={seg(scaleMode==='fit')} onClick={()=>setScaleMode('fit')}>Fit</button>
                <button type="button" style={seg(scaleMode==='true')} onClick={()=>setScaleMode('true')}>True scale</button>
              </div>
              {!mobile && (
                <button type="button" aria-label={railCollapsed?'Show options':'Expand 3D'} onClick={()=>setRailCollapsed(c=>!c)} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid var(--line)', background:'rgba(255,255,255,.92)', color:'var(--ink-soft)', borderRadius:'var(--radius-md)', boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
                  <i className={`ti ti-${railCollapsed?'layout-sidebar-right-expand':'arrows-maximize'}`} aria-hidden="true" /> {railCollapsed?'Show options':'Expand 3D'}
                </button>
              )}
            </div>
            <div style={{ position:'absolute', bottom:12, left:12, display:'flex', gap:6, alignItems:'center', fontSize:12, color:'var(--shop-ink-2)', background:'rgba(255,255,255,.85)', padding:'5px 10px', borderRadius:'var(--radius-md)' }}>
              <i className="ti ti-ruler-2" aria-hidden="true" />
              {(() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+' in' : cm+' cm'; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)} + ${cv(dims.sideB)} × ${cv(dims.height)} × ${cv(dims.depth)}` : `${cv(dims.width)} × ${cv(dims.height)} × ${cv(dims.depth)}`; })()}
            </div>
            <button type="button" onClick={doPhotoreal} disabled={rendering} style={{ position:'absolute', bottom:12, right:12, display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:'var(--radius-md)', border:'none', cursor: rendering?'wait':'pointer', background:'linear-gradient(135deg,var(--clay),var(--clay-deep))', color:'#fff', fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(168,75,41,.4)' }}>
              <i className={rendering ? 'ti ti-loader-2' : 'ti ti-sparkles'} aria-hidden="true" />
              {rendering ? 'Rendering…' : 'Make it photorealistic'}
            </button>
          </div>

          {(rendering || renderUrl || renderErr) && (
            <div onClick={()=>{ if(!rendering){ setRenderUrl(null); setRenderErr(''); } }} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(15,18,22,.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
              <ModalPanel onClose={()=>{ if(!rendering){ setRenderUrl(null); setRenderErr(''); } }} onClick={e=>e.stopPropagation()} style={{ background:'var(--c-surface)', borderRadius:'var(--radius-xl)', maxWidth:880, width:'100%', maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.4)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #eee' }}>
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--shop-ink)' }}><Spark size={15} style={{ verticalAlign:'-2px' }} /> Photorealistic render</span>
                  <button type="button" aria-label="Close" onClick={()=>{ if(!rendering){ setRenderUrl(null); setRenderErr(''); } }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--c-text-3)', fontSize:18 }}>✕</button>
                </div>
                <div style={{ padding:18, textAlign:'center' }}>
                  {rendering && <div style={{ padding:'50px 0', color:'var(--shop-ink-2)', fontSize:14 }}><i className="ti ti-loader-2" aria-hidden="true" style={{ fontSize:26 }} /><div style={{ marginTop:10 }}>{t('sw3PlannerRendering')}</div></div>}
                  {!rendering && renderErr && <div style={{ padding:'40px 10px', color:'#c0392b', fontSize:14 }}>{renderErr}</div>}
                  {!rendering && renderUrl && (<>
                    <img src={renderUrl} alt="Photorealistic render of your design" style={{ width:'100%', borderRadius:'var(--radius-md)', display:'block' }} />
                    <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:14, flexWrap:'wrap' }}>
                      <a href={renderUrl} download="closets-render.jpg" target="_blank" rel="noreferrer" style={{ padding:'10px 18px', borderRadius:'var(--radius-md)', background:'var(--shop-ink)', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>Download</a>
                      <button type="button" onClick={doPhotoreal} style={{ padding:'10px 18px', borderRadius:'var(--radius-md)', border:'1px solid #ddd', background:'var(--c-surface)', color:'var(--shop-ink)', cursor:'pointer', fontSize:13, fontWeight:700 }}>Regenerate</button>
                    </div>
                    <div style={{ marginTop:10, fontSize:11, color:'var(--c-text-3)' }}>{t('w4AiImpression')}</div>
                  </>)}
                </div>
              </ModalPanel>
            </div>
          )}

          {/* OPTIONS RAIL — living configurator (accordion) + sticky summary */}
          <div style={{ display: railCollapsed?'none':'flex', flexDirection:'column', gap:10, maxHeight: mobile?'none':720, overflowY: mobile?'visible':'auto', overflowX:'hidden', paddingRight:4, marginTop: mobile?14:0 }}>
            {(() => {
              const lay = (prodLayouts || LAYOUTS);
              const layoutBody = (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {lay.map(l=>{ const on = layout===l.id; return (
                    <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px', border: on?'2px solid var(--clay)':'0.5px solid #e6e6e6', borderRadius:'var(--radius-md)', background: on?'var(--sand)':'#fff', cursor:'pointer', textAlign:'left' }}>
                      {layoutIcon(l.id, on)}
                      <span style={{ fontSize:13, fontWeight:on?600:500, color:'var(--shop-ink)' }}>{l.label}{(l.price>0)&&<span style={{ display:'block', fontSize:11, color:'var(--clay-deep)', fontWeight:400 }}>+{fmt(l.price)}</span>}</span>
                    </button> ); })}
                </div>
              );
              // Width label adapts: kitchen/walkin runs are "run length"; doors width is the leaf width.
              const widthLabel = isKitchen ? (KITCHEN_RUN_LAYOUTS.includes(layout) ? 'Run length' : 'Run width')
                : (prodKey==='walkin' ? 'Room width' : (isDoors ? 'Door width' : 'Width'));
              const depthLabel = isDoors ? 'Thickness' : 'Depth';
              const useAB = supportsSideAB && layout==='l-shape';
              // Standard chips: discrete presets straight from the product's dim spec.
              const stdChips = (lbl, key, spec) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:600, color:'var(--clay)' }}>{dims[key]} cm</span></div>
                  {spec.allowed && spec.allowed.length ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {spec.allowed.map(v=>{ const on = Number(dims[key])===v; return (
                        <button key={v} type="button" onClick={()=>setDims(c=>({ ...c, [key]: snapDim(spec, v) }))} style={{ minWidth:52, padding:'7px 10px', borderRadius:'var(--radius-sm)', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', fontSize:13, fontWeight: on?700:500, color: on?'var(--clay)':'var(--ink)', cursor:'pointer' }}>{v}</button>
                      ); })}
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:'var(--muted)' }}>{t('sw3PlannerCustomSize')}</div>
                  )}
                </div>
              );
              // Custom numeric input: free value snapped/clamped to the product min/max on blur.
              const numInput = (lbl, key, spec) => (
                <div key={key} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:11.5, color:'var(--muted)' }}>{spec.min}–{spec.max} cm</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min={spec.min} max={spec.max} defaultValue={dims[key]} key={dims[key]}
                      onBlur={e=>setDims(c=>({ ...c, [key]: snapDim(spec, e.target.value) }))}
                      onKeyDown={e=>{ if(e.key==='Enter') e.currentTarget.blur(); }}
                      style={{ flex:1, padding:'10px 12px', border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>cm</span>
                  </div>
                </div>
              );
              const sizeBody = (
                <div>
                  {/* Standard / Custom segmented toggle */}
                  <div style={{ display:'flex', gap:2, background:'var(--sand)', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:3, marginBottom:14 }} role="group" aria-label="Size mode">
                    <button type="button" onClick={()=>setCustomSize(false)} style={{ flex:1, padding:'8px 10px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:'var(--radius-sm)', background: !customSize?'var(--clay)':'transparent', color: !customSize?'#fff':'var(--ink-soft)' }}>Standard sizes</button>
                    <button type="button" onClick={()=>setCustomSize(true)} style={{ flex:1, padding:'8px 10px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', borderRadius:'var(--radius-sm)', background: customSize?'var(--clay)':'transparent', color: customSize?'#fff':'var(--ink-soft)' }}>Custom size</button>
                  </div>
                  {useAB && <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:10 }}>{t('sw3PlannerLShape')}</div>}
                  {!useAB && isKitchen && KITCHEN_RUN_LAYOUTS.includes(layout) && <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:10 }}>Total run length across all sides of your {layout} kitchen.</div>}
                  {customSize ? (<>
                    {useAB ? (<>{numInput('Side A','sideA',widthSpec)}{numInput('Side B','sideB',widthSpec)}</>) : numInput(widthLabel,'width',widthSpec)}
                    {numInput('Height','height',heightSpec)}
                    {numInput(depthLabel,'depth',depthSpec)}
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{t('sw3PlannerSnap')}</div>
                  </>) : (<>
                    {useAB ? (<>{stdChips('Side A','sideA',widthSpec)}{stdChips('Side B','sideB',widthSpec)}</>) : stdChips(widthLabel,'width',widthSpec)}
                    {stdChips('Height','height',heightSpec)}
                    {stdChips(depthLabel,'depth',depthSpec)}
                  </>)}
                </div>
              );
              const finishBody = (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {FINISHES.map(f=>(
                    <button key={f.id} type="button" onClick={()=>setFinishId(f.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:7, border: finishId===f.id?'2px solid var(--clay)':'0.5px solid #e6e6e6', borderRadius:'var(--radius-md)', background:'var(--c-surface)', cursor:'pointer' }}>
                      <span style={{ width:44, height:44, borderRadius:'var(--radius-sm)', background:f.hex, border:'0.5px solid rgba(0,0,0,.12)' }} />
                      <span style={{ fontSize:11, color:'var(--shop-ink-2)' }}>{f.name}</span>
                    </button>
                  ))}
                </div>
              );
              // ── Option-card UI: pick a style per category (A swatch tile / B list row / C compact chip) ──
              // Style A: swatch/image-forward grid for finish/material/door-ish categories.
              const STYLE_A_KEYS = ['finish','material','door','worktop','glass','cabinet_finish','body_materials'];
              // Style B: rich list rows for richer catalogs.
              const STYLE_B_KEYS = ['handles','accessories','appliances','storage','hanging','shelves','drawers','lighting','hardware'];
              const cardStyleFor = (ck, items) => {
                const k = String(ck).toLowerCase();
                if (STYLE_A_KEYS.some(s => k.includes(s))) return 'A';
                if (STYLE_B_KEYS.some(s => k.includes(s))) return 'B';
                if ((items||[]).length <= 4) return 'C';
                return 'B';
              };
              const catBody = (ck) => {
                const cat=cats[ck]; const multi=cat.select==='multi';
                const items = (cat.items||[]).filter(it=>it.active!==false);
                const style = cardStyleFor(ck, items);
                const inclOf = (it) => it.price_type==='included'||+it.price===0;
                // STYLE A — swatch tile (image/swatch-forward, 2–3 cols, check badge + clay ring + sand bg)
                if (style === 'A') {
                  const cols = items.length >= 6 ? 3 : 2;
                  return (
                    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:8 }}>
                      {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                        <div key={it.id} onClick={()=>pick(ck,it.id,multi)} style={{ cursor:'pointer', border: on?'2px solid var(--clay)':'0.5px solid var(--line)', borderRadius:'var(--radius-md)', overflow:'hidden', background: on?'var(--sand)':'#fff' }}>
                          <div style={{ height:72, background:cardBg(it), position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {!it.image_url && !it.swatch && <i className="ti ti-photo" style={{ fontSize:20, color:'rgba(0,0,0,.22)' }} aria-hidden="true" />}
                            {on && <span style={{ position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%', background:'var(--clay)', display:'flex', alignItems:'center', justifyContent:'center' }}><i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /></span>}
                          </div>
                          <div style={{ padding:'7px 9px' }}>
                            <div style={{ fontSize:12.5, fontWeight: on?600:500, lineHeight:1.2, color:'var(--ink)' }}>{it.name}</div>
                            <div style={{ fontSize:11.5, color: incl?'var(--muted)':'var(--clay-deep)', marginTop:3 }}>{incl?'Included':'+ '+fmt(it.price)}</div>
                          </div>
                        </div> ); })}
                    </div>
                  );
                }
                // STYLE C — compact chip (swatch dot + label + price, filled clay when selected)
                if (style === 'C') {
                  return (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                        <button key={it.id} type="button" onClick={()=>pick(ck,it.id,multi)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:'var(--radius-pill)', cursor:'pointer', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--clay)':'#fff' }}>
                          <span style={{ width:14, height:14, borderRadius:'50%', flexShrink:0, background:cardBg(it), border:'0.5px solid rgba(0,0,0,.15)' }} />
                          <span style={{ fontSize:13, fontWeight:600, color: on?'#fff':'var(--ink)' }}>{it.name}</span>
                          <span style={{ fontSize:11.5, color: on?'rgba(255,255,255,.85)':(incl?'var(--muted)':'var(--clay-deep)') }}>{incl?'Included':'+ '+fmt(it.price)}</span>
                          {on && <i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" />}
                        </button> ); })}
                    </div>
                  );
                }
                // STYLE B — list row (thumbnail + name + small desc + price on right + check/radio)
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {items.map(it=>{ const on=isOn(ck,it.id,multi); const incl=inclOf(it); return (
                      <div key={it.id} onClick={()=>pick(ck,it.id,multi)} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 11px', cursor:'pointer', borderRadius:'var(--radius-md)', border: on?'2px solid var(--clay)':'0.5px solid var(--line)', background: on?'var(--sand)':'#fff' }}>
                        <span style={{ width:42, height:42, borderRadius:'var(--radius-sm)', flexShrink:0, background:cardBg(it), border:'0.5px solid rgba(0,0,0,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {!it.image_url && !it.swatch && <i className="ti ti-photo" style={{ fontSize:18, color:'rgba(0,0,0,.22)' }} aria-hidden="true" />}
                        </span>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:'block', fontSize:13.5, fontWeight: on?600:500, color:'var(--ink)', lineHeight:1.25 }}>{it.name}</span>
                          {it.type_label && <span style={{ display:'block', fontSize:11.5, color:'var(--muted)', marginTop:1, lineHeight:1.3 }}>{it.type_label}</span>}
                        </span>
                        <span style={{ fontSize:12.5, fontWeight:600, color: incl?'var(--muted)':'var(--clay-deep)', whiteSpace:'nowrap' }}>{incl?'Included':'+ '+fmt(it.price)}</span>
                        <span style={{ width:22, height:22, borderRadius: multi?6:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: on?'var(--clay)':'transparent', border: on?'2px solid var(--clay)':'1.5px solid var(--line)' }}>
                          {on && <i className="ti ti-check" style={{ color:'#fff', fontSize:13 }} aria-hidden="true" />}
                        </span>
                      </div> ); })}
                  </div>
                );
              };
              // ── Living accordion: essentials (expanded) + optional categories (collapsed) ──
              const finName = (FINISHES.find(f=>f.id===finishId)||{}).name || finishId;
              const layLabel = (lay.find(l=>l.id===layout)||{}).label || layout;
              const sizeLabel = (() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+'"' : cm; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)}+${cv(dims.sideB)}×${cv(dims.height)}` : `${cv(dims.width)}×${cv(dims.height)}×${cv(dims.depth)} ${unit}`; })();
              const layoutSet = !!layout, sizeSet = dims.width>0 || (supportsSideAB&&layout==='l-shape'), finishSet = !!finishId;
              const readyForQuote = layoutSet && sizeSet && finishSet;
              const optionalCats = catKeys.filter(k=>k!=='door_finishes');
              // ── Guided one-step-at-a-time flow: Layout → Size → Finish → [each option category] ──
              const steps = [
                { id:'layout', title:'Layout', essential:true, body:layoutBody, chosen: layLabel, done: layoutSet },
                { id:'size', title:'Size', essential:true, body:sizeBody, chosen: sizeLabel, done: sizeSet },
                { id:'door_finishes', title:'Finish', essential:true, body:finishBody, chosen: finName, done: finishSet },
                ...optionalCats.map(ck => ({ id:ck, title:(cats[ck].label||ck), essential:false, body:catBody(ck), chosen: catChosen(ck), done: catStatus(ck)==='done' })),
              ];
              const curIdx = Math.max(0, Math.min(stepIndex, steps.length-1));
              const cur = steps[curIdx];
              const isLast = curIdx === steps.length-1;
              const goStep = (i) => { const n = Math.max(0, Math.min(i, steps.length-1)); setStepIndex(n); setVisitedSteps(v=>{ const s=new Set(v); s.add(steps[n].id); return s; }); };
              const stepIsDone = (st) => st.done || (!st.essential && visitedSteps.has(st.id));
              return (<>
                {/* Header + Ready-for-a-quote pill */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                  <span className="eyebrow" style={{ fontSize:12 }}>Your design · step {curIdx+1} of {steps.length}</span>
                  <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:'var(--radius-pill)', transition:'all .25s',
                    color: readyForQuote?'#1D9E75':'var(--muted)', background: readyForQuote?'#1D9E7522':'var(--sand)' }}>
                    {readyForQuote ? '✓ Ready for a quote' : 'Set layout · size · finish'}
                  </span>
                </div>
                {/* COMPLETED steps — compact "done" rows above (tap to edit) */}
                {steps.slice(0, curIdx).map(st => {
                  const done = stepIsDone(st);
                  return (
                    <button key={st.id} type="button" onClick={()=>goStep(steps.indexOf(st))} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:'var(--radius-md)', border:'0.5px solid var(--line)', background:'var(--c-surface)', cursor:'pointer', textAlign:'left', flexShrink:0 }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: done?'#1D9E75':'var(--sand)' }}>
                        {done ? <i className="ti ti-check" style={{ color:'#fff', fontSize:14 }} aria-hidden="true" /> : <span style={{ fontSize:11, fontWeight:700, color:'var(--muted)' }}>–</span>}
                      </span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{st.title}</span>
                      <span style={{ marginLeft:'auto', fontSize:12.5, color:'var(--ink-soft)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{st.chosen || (st.essential?'—':'Skipped')}</span>
                      <i className="ti ti-pencil" style={{ color:'var(--muted)', fontSize:14, flexShrink:0 }} aria-hidden="true" />
                    </button>
                  );
                })}
                {/* CURRENT step — expanded */}
                <div style={{ border:'2px solid var(--clay)', borderRadius:'var(--radius-lg)', overflow:'hidden', flexShrink:0, background:'var(--c-surface)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, padding:'14px 16px 6px' }}>
                    <span style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--clay)', color:'#fff', fontSize:12, fontWeight:700 }}>{curIdx+1}</span>
                    <span style={{ fontSize:16, fontWeight:700, color:'var(--ink)' }}>{cur.title}</span>
                    {!cur.essential && <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:'var(--radius-sm)' }}>optional</span>}
                  </div>
                  <div style={{ padding:'6px 16px 16px' }}>{cur.body}</div>
                  {/* Step nav */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 16px 16px' }}>
                    {curIdx>0 && <button type="button" onClick={()=>goStep(curIdx-1)} style={{ background:'none', border:'none', fontSize:13.5, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer', padding:'8px 4px' }}>‹ Back</button>}
                    {!cur.essential && !isLast && <button type="button" onClick={()=>goStep(curIdx+1)} style={{ background:'none', border:'none', fontSize:13, fontWeight:600, color:'var(--muted)', cursor:'pointer', padding:'8px 4px' }}>Skip</button>}
                    {isLast
                      ? <button type="button" className="btn-clay" disabled={busy} onClick={goVisualise} style={{ marginLeft:'auto', borderRadius:'var(--radius-md)', padding:'10px 20px', fontSize:14.5 }}>{t('w4VisualiseDesign')}</button>
                      : <button type="button" className="btn-clay" disabled={cur.essential && !cur.done} onClick={()=>goStep(curIdx+1)} style={{ marginLeft:'auto', borderRadius:'var(--radius-md)', padding:'10px 22px', fontSize:14.5, opacity:(cur.essential && !cur.done)?0.55:1 }}>Next →</button>}
                  </div>
                </div>
                {/* UPCOMING steps — muted/locked rows below (clickable-forward only if essentials before are done) */}
                {steps.slice(curIdx+1).map((st, i) => {
                  const absIdx = curIdx+1+i;
                  // Allow forward jump only when all essential steps before it are satisfied.
                  const blockingEssential = steps.slice(0, absIdx).some(s => s.essential && !s.done);
                  const locked = blockingEssential;
                  return (
                    <button key={st.id} type="button" disabled={locked} onClick={()=>{ if(!locked) goStep(absIdx); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:'var(--radius-md)', border:'0.5px solid var(--line)', background: locked?'transparent':'#fff', cursor: locked?'default':'pointer', textAlign:'left', flexShrink:0, opacity: locked?0.55:1 }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid var(--line)', color:'var(--muted)', fontSize:11, fontWeight:700 }}>{locked ? <i className="ti ti-lock" style={{ fontSize:12 }} aria-hidden="true" /> : absIdx+1}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--ink-soft)' }}>{st.title}</span>
                      {!st.essential && <span style={{ fontSize:10.5, fontWeight:600, color:'var(--muted)', background:'var(--sand)', padding:'2px 8px', borderRadius:'var(--radius-sm)' }}>optional</span>}
                    </button>
                  );
                })}
              </>);
            })()}

            {/* STICKY SUMMARY — single primary CTA */}
            {!mobile && (
              <div style={{ marginTop:6, background:'var(--c-surface)', border:'0.5px solid var(--shop-line)', borderRadius:'var(--radius-lg)', padding:'16px', position:'sticky', bottom:0, boxShadow:'0 -2px 12px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize:13, color:'var(--ink-soft)', marginBottom:10, lineHeight:1.5 }}>
                  <strong style={{ color:'var(--ink)' }}>{selProduct?.name || 'Wardrobe'}</strong> · {((prodLayouts||LAYOUTS).find(l=>l.id===layout)||{}).label || layout} · {(() => { const cv = (cm)=> unit==='in' ? (Math.round((cm/2.54)*10)/10)+'"' : cm+'cm'; return (supportsSideAB&&layout==='l-shape') ? `${cv(dims.sideA)}+${cv(dims.sideB)}` : `${cv(dims.width)}×${cv(dims.height)}`; })()} · {(FINISHES.find(f=>f.id===finishId)||{}).name || finishId}
                </div>
                {total>0 && !pricing && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, color:'var(--shop-muted)', marginBottom:6 }}>Package</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {PACKAGES.map((p,i)=>{ const on = i===pkg; return (
                        <button key={p.name} type="button" onClick={()=>setPkg(i)} style={{ border:'1px solid '+(on?'var(--clay)':'var(--shop-line)'), background:on?'var(--sand)':'#fff', borderRadius:'var(--radius-md)', padding:'8px 6px', textAlign:'center', cursor:'pointer' }}>
                          <div style={{ fontSize:11, fontWeight:700, color:on?'var(--clay)':'var(--shop-ink)' }}>{p.name}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--shop-ink)', marginTop:3 }}>{fmt(Math.round(total*p.mult))}</div>
                        </button>
                      ); })}
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 }}>
                  <span style={{ fontSize:12, color:'var(--shop-muted)' }}>Estimated total · {selPkg.name}</span>
                  <span style={{ fontSize:24, fontWeight:700, color:'var(--clay)' }}>{pricing?'…':fmt(pkgTotal)}</span>
                </div>
                {total>0 && !pricing && (
                  <div style={{ marginBottom:10 }}>
                    <button type="button" onClick={()=>setShowItemized(s=>!s)} style={{ background:'none', border:'none', padding:0, fontSize:12.5, fontWeight:600, color:'var(--clay-deep)', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                      <i className={`ti ti-chevron-${showItemized?'up':'down'}`} aria-hidden="true" /> See itemized breakdown
                    </button>
                    {showItemized && (() => { const ld = buildLineItems(); return (
                      <div style={{ marginTop:8, borderTop:'1px solid var(--line)', paddingTop:8 }}>
                        {ld.items.map((li,i)=>(
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'3px 0', fontSize:12.5 }}>
                            <span style={{ color:'var(--ink-soft)' }}>{li.label}</span>
                            <span style={{ fontWeight:600, color: li.price===0?'var(--muted)':'var(--ink)', whiteSpace:'nowrap' }}>{li.price===0?'Included':fmt(li.price)}</span>
                          </div>
                        ))}
                        {ld.pkgAdj !== 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:12.5, color:'var(--ink-soft)' }}><span>{ld.pkgName} package</span><span style={{ fontWeight:600 }}>{ld.pkgAdj>0?'+ ':'− '}{fmt(Math.abs(ld.pkgAdj))}</span></div>}
                        {ld.vat>0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', fontSize:12.5, color:'var(--ink-soft)' }}><span>VAT ({Math.round(ld.vatRate*100)}%)</span><span style={{ fontWeight:600 }}>{fmt(ld.vat)}</span></div>}
                      </div>
                    ); })()}
                  </div>
                )}
                <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:12 }}>{t('sw3PlannerIndic')}</div>
                {/* Secondary: save the design (quote/visualise handled by guided steps + sticky bar) */}
                <button type="button" className="btn-secondary" disabled={busy} onClick={save} style={{ width:'100%', borderRadius:'var(--radius-md)', color: saved?'var(--good)':'var(--ink-soft)' }}>{saved?'✓ Saved':'Save my design'}</button>
              </div>
            )}
          </div>
        </div>
        {/* FULL-WIDTH STICKY ACTION BAR — live total (left) + one big quote button (right).
            Desktop: spans the config area. Mobile: fixed bottom with safe-area. Always visible. */}
        <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:40, background:'var(--c-surface)', borderTop:'1px solid var(--line)', boxShadow:'0 -4px 18px rgba(0,0,0,.08)', padding:`12px 0 calc(12px + env(safe-area-inset-bottom))` }}>
          <div style={{ maxWidth:1560, margin:'0 auto', padding: mobile?'0 14px':'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize:11.5, color:'var(--muted)' }}>Estimated · {selPkg.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize: mobile?22:26, fontWeight:800, color:'var(--clay)' }}>{pricing?'…':fmt(pkgTotal)}</span>
                <span style={{ fontSize:11, color:'var(--muted)' }}>incl. VAT</span>
              </div>
            </div>
            <button type="button" className="btn-clay" disabled={busy} onClick={requestQuote} style={{ borderRadius:'var(--radius-lg)', padding: mobile?'13px 20px':'14px 34px', fontSize: mobile?14.5:16, fontWeight:700, whiteSpace:'nowrap', flexShrink:0 }}>
              {busy ? t('pSending') : (user ? t('pGetMyQuoteArrow') : t('pgSignInQuoteArrow'))}
            </button>
          </div>
        </div>
        </>
        );
        })()}
      </div>

      {/* Inline branded quote contact form (replaces window.prompt) */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:440, width:'100%', padding:26 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:24, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw3PlannerSendQuote')}</h3>
            <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 18px', lineHeight:1.6 }}>Our design team will review your {selProduct?.name?.toLowerCase()||'design'} and get back with an exact, itemised quote.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={qForm.name} onChange={e=>setQForm(s=>({...s,name:e.target.value}))} aria-label="Your name" placeholder="Your name" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
              <input value={qForm.phone} onChange={e=>setQForm(s=>({...s,phone:e.target.value}))} aria-label="Phone (+973…)" placeholder="Phone (+973…)" inputMode="tel" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
              <input value={qForm.email} onChange={e=>setQForm(s=>({...s,email:e.target.value}))} aria-label="Email (optional)" placeholder="Email (optional)" inputMode="email" style={{ width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'var(--c-surface)', borderRadius:'var(--radius-md)', fontSize:15, fontFamily:'inherit', color:'var(--ink)' }} />
            </div>
            {quoteErr && <div role="alert" style={{ marginTop:12, background:'#fdecea', border:'1px solid #f5c6c0', color:'#b3261e', borderRadius:'var(--radius-md)', padding:'10px 14px', fontSize:13 }}>{quoteErr}</div>}
            <FormNotice kind="request" style={{ marginTop:12 }} />
            <div style={{ display:'flex', gap:10, marginTop:18 }}>
              <button type="button" onClick={()=>setShowQuote(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:'var(--radius-md)', padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>Cancel</button>
              <button type="button" className="btn-clay" disabled={busy || !qForm.name.trim() || !qForm.phone.trim()} onClick={()=>submitQuote(qForm)} style={{ flex:2, borderRadius:'var(--radius-md)', opacity:(busy||!qForm.name.trim()||!qForm.phone.trim())?.6:1 }}>{busy?'Sending…':'Send my quote request'}</button>
            </div>
          </ModalPanel>
        </div>
      )}

      {roomDesignerOverlay}
      {/* guest quote success → account invite (also reachable from config-direct quote) */}
      {quoteSent && (
        <div style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:'var(--radius-xl)', maxWidth:440, width:'100%', padding:28, textAlign:'center' }}>
            <div style={{ width:54, height:54, borderRadius:'50%', background:'#1D9E7522', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}><i className="ti ti-check" style={{ color:'#1D9E75', fontSize:28 }} aria-hidden="true" /></div>
            <h3 className="display" style={{ fontSize:23, color:'var(--ink)', margin:'0 0 8px' }}>Quote sent!</h3>
            <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 20px', lineHeight:1.6 }}>{t('sw3PlannerCreateAcct')}</p>
            <button type="button" className="btn-clay" onClick={()=>{ const c = quoteSent; if (openAuth) openAuth('register', c && typeof c==='object' ? c : undefined); else setPage('portal'); }} style={{ width:'100%', borderRadius:'var(--radius-md)', marginBottom:10 }}>Create my account</button>
            <button type="button" onClick={()=>{ setQuoteSent(false); setPage('home'); }} style={{ background:'none', border:'none', fontSize:13.5, color:'var(--muted)', cursor:'pointer' }}>Maybe later</button>
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

export { PlannerPage };
