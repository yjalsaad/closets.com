// Route chunk "unused" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: (none: not reachable from any route).
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { useRef, useState, useEffect, Fragment } from 'react';
import { validateForm } from '../forms/validate';
import { ModalPanel } from '../a11y/dialog';
import { formatBHD } from '../i18n/format';
import FormNotice from '../privacy/FormNotice';
import { CARD_COLORS, CARD_VIDEOS, CMS_LANG, KITCHEN_HANDLES, KITCHEN_SHAPES, KITCHEN_STYLES, KITCHEN_WORKTOPS, KU_UNITS, KU_WT, K_APPLIANCES, K_FINISHES, K_STORAGE, api, fmt, toast, useI18n, useMobile } from '../App';
import { cardRpc } from './shared_DirectoryPage_ContactPage';
import { K_CAB_STYLES, K_LAYOUTS, K_WORKTOPS } from './KitchenPage';
import { TV_BLOCKS } from './TVUnitPlannerWizard';
import { mergeLayout, useLayouts } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus8';
import { uid } from './shared_PlannerPage_TVUnitPlannerWizard_plus5';
import { KITCHEN_CATALOG_ANCHORS } from './KitchenPlannerWizard';
import { trStep } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus3';
import { Wardrobe3D } from './shared_PlannerPage_TVUnitPlannerWizard_plus4';
import { trOpt } from './shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5';

function DigitalCardCarousel({ user, setPage }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const progressRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const cardRefs = useRef([]);
  const reduceMotion = useRef(false);
  const thicknessLayers = [-1.47, -0.73, 0, 0.73, 1.47];

  // Aliases so the verbatim source render-loop math reads unchanged.
  const progress = progressRef;
  const mouse = mouseRef;
  const cardsRefs = cardRefs;

  // ── Real card data ──────────────────────────────────────────────────────
  // Fetch the logged-in customer's own slug, then the rendered card. We reuse
  // the module-level cardRpc helper (card_owner_slug → card_render), mirroring
  // the customer-portal fetch pattern.
  const [cards, setCards] = useState(null); // null = loading, [] = no card, [..] = ready
  useEffect(() => {
    let alive = true;
    if (!user || !user.id) { setCards([]); return; }
    setCards(null);
    cardRpc('card_owner_slug', { p_owner_type: 'customer', p_owner_id: user.id })
      .then((r) => {
        const slug = r && r.slug;
        if (!slug) { if (alive) setCards([]); return null; }
        return cardRpc('card_render', { p_slug: slug });
      })
      .then((res) => {
        if (!alive || !res) return;
        if (res && res.ok && res.card) setCards([res.card]);
        else setCards([]);
      })
      .catch(() => { if (alive) setCards([]); });
    return () => { alive = false; };
  }, [user]);

  // Map a real card → the face model used by the front/back faces.
  const details = (cards || []).map((c) => ({
    name: String(c.display_name || (user && user.name) || '').toUpperCase(),
    number: c.membership_no || c.id || '',
    title: c.title || '',
    company: c.company_name || '',
    contact: c.phone || c.mobile || c.whatsapp || '',
    website: c.website || '',
    email: c.email || '',
    location: c.location || '',
    photo: c.photo_url || '',
    logo: c.logo_url || '',
    slug: c.slug || '',
  }));

  // ONE card → single premium 3D card (auto-advance disabled). Multiple cards →
  // auto-advancing carousel. Guarded so cardCount is never 0 in the render loop.
  const cardCount = Math.max(1, details.length);
  const singleCard = details.length <= 1;

  // Responsive card metrics (kept from source). The overlay text/fontMetrics
  // layer from the source is dropped — the section heading lives outside the scene.
  const metricsRef = useRef({ cardW: 336, cardH: Math.round(336 / 1.5925) });
  useEffect(() => {
    const computeMetrics = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const heightFactor = Math.max(0.6, Math.min(1, h / 800));
      const cardW = Math.round(Math.max(150, Math.min(336, (w * 0.16 + 130) * heightFactor)));
      const cardH = Math.round(cardW / 1.5925);
      metricsRef.current = { cardW, cardH };
    };
    computeMetrics();
    window.addEventListener('resize', computeMetrics);
    try { reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return () => window.removeEventListener('resize', computeMetrics);
  }, []);

  // Mouse parallax — listener attached to the SECTION container (not window),
  // with inertia damping; falls back to centered when the pointer leaves.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.tx = nx;
      mouseRef.current.ty = ny;
    };
    const onLeave = () => { mouseRef.current.tx = 0; mouseRef.current.ty = 0; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  // Render loop — math reproduced verbatim from the source. Mouse-target
  // aliases bridge our scoped pointer state (tx/ty) to the source's targetX/targetY.
  useEffect(() => {
    let raf;
    const renderLoop = () => {
      mouse.current.targetX = mouse.current.tx;
      mouse.current.targetY = mouse.current.ty;
      // Single card → keep it centered (no auto-advance); still tilts to mouse.
      if (singleCard) { progress.current = 0; }
      else { const speed = reduceMotion.current ? 0.00045 : 0.0016; progress.current += speed; }
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;
      const cards = cardsRefs.current;
      const h = (containerRef.current && containerRef.current.clientHeight) || 540;
      const metrics = metricsRef.current;
      const { cardH } = metrics;
      const continuousProgress = progress.current;
      const roundedIndex = Math.round(continuousProgress);
      const diffFromRound = continuousProgress - roundedIndex;
      const easedDiff = Math.sign(diffFromRound) * Math.pow(Math.abs(diffFromRound) * 2, 4.2) / 2;
      const virtualActiveIndex = roundedIndex + easedDiff;
      for (let i = 0; i < cardCount; i++) {
        const card = cards[i]; if (!card) continue;
        let offset = i - virtualActiveIndex; const halfCount = cardCount / 2;
        while (offset > halfCount) offset -= cardCount;
        while (offset < -halfCount) offset += cardCount;
        const absOffset = Math.abs(offset); const sign = Math.sign(offset);
        if (absOffset > 3.0) { card.style.visibility = 'hidden'; continue; } else { card.style.visibility = 'visible'; }
        const gap = 36; const peekAmount = -55; const D = 1350;
        let y = 0; let z = 0; let rot = 0;
        if (absOffset <= 1) {
          const t = absOffset; const easedT = t * t * (3 - 2 * t);
          const targetY = cardH + gap; y = -sign * (easedT * targetY);
          z = 400 + easedT * (220 - 400); rot = easedT * 132;
        } else if (absOffset <= 2) {
          const t = absOffset - 1; const easedT = t * t * (3 - 2 * t);
          const yStart = cardH + gap; const zStart = 220; const rotStart = 132; const zEnd = -60; const rotEnd = 175;
          const sEnd = D / (D - zEnd); const yEnd = (h / 2 - peekAmount) / sEnd - (cardH / 2);
          const currentY = yStart + easedT * (yEnd - yStart);
          y = -sign * currentY; z = zStart + easedT * (zEnd - zStart); rot = rotStart + easedT * (rotEnd - rotStart);
        } else {
          const t = Math.min(absOffset - 2, 1); const easedT = t * t * (3 - 2 * t);
          const zStart = -60; const rotStart = 175; const zEnd3 = -250; const rotEnd3 = 195;
          const sEnd2 = D / (D - zStart); const yEnd2 = (h / 2 - peekAmount) / sEnd2 - (cardH / 2);
          const sEnd3 = D / (D - zEnd3); const yEnd3 = (h / 2 + 100) / sEnd3 + (cardH / 2);
          const currentY = yEnd2 + easedT * (yEnd3 - yEnd2);
          y = -sign * currentY; z = zStart + easedT * (zEnd3 - zStart); rot = rotStart + easedT * (rotEnd3 - rotStart);
        }
        const localCardRotation = -sign * rot;
        const centerFactor = Math.max(0, 1 - absOffset);
        const maxTiltY = 15; const maxTiltX = 12;
        const activeTiltX = -mouse.current.y * maxTiltX * centerFactor;
        const activeTiltY = mouse.current.x * maxTiltY * centerFactor;
        const totalRotX = localCardRotation + activeTiltX;
        const totalRotY = activeTiltY;
        card.style.zIndex = Math.round(z).toString();
        card.style.opacity = '1';
        card.style.transform = `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg) rotateZ(-3deg)`;
        card.style.width = metrics.cardW + 'px';
        card.style.height = metrics.cardH + 'px';
      }
      raf = window.requestAnimationFrame(renderLoop);
    };
    raf = window.requestAnimationFrame(renderLoop);
    return () => window.cancelAnimationFrame(raf);
  }, [cardCount, singleCard]);

  // ── Loading skeleton — don't flash sample data ──────────────────────────
  if (cards === null) {
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 336, maxWidth: '82%', aspectRatio: '1.5925 / 1', borderRadius: 18, border: '1px solid #3a3128', background: 'linear-gradient(110deg, #15120f 30%, #241d14 50%, #15120f 70%)', backgroundSize: '200% 100%', animation: 'cardShimmer 1.4s ease-in-out infinite', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }} />
        <style>{'@keyframes cardShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'}</style>
      </div>
    );
  }

  // ── No-card fallback — slim on-brand prompt (no big black 3D scene) ──────
  if (!details.length) {
    return (
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 460, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>{t('sw3DigCardTitle')}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20 }}>{t('sw3DigCardSub')}</div>
          <button
            type="button"
            onClick={() => setPage && setPage('portal')}
            style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 14, border: '1px solid rgba(231,187,160,0.5)', background: 'transparent', color: '#E7BBA0', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', cursor: 'pointer' }}
          >
            Set up my card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, perspective: '1350px', background: '#000', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {Array.from({ length: cardCount }).map((_, i) => {
          const det = details[i % details.length];
          const video = CARD_VIDEOS[i % CARD_VIDEOS.length];
          const accent = CARD_COLORS[i % CARD_COLORS.length];
          return (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              style={{ position: 'absolute', top: '50%', left: '50%', transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
            >
              {/* Volumetric thickness layers — middle slices grey */}
              {thicknessLayers.map((tz, li) => {
                const isFront = li === thicknessLayers.length - 1;
                const isBack = li === 0;
                return (
                  <div
                    key={li}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 18,
                      overflow: 'hidden',
                      transform: 'translateZ(' + tz + 'px)',
                      backgroundColor: (isFront || isBack) ? 'transparent' : '#2a241c',
                      boxShadow: isFront ? '0 30px 80px rgba(0,0,0,0.65)' : 'none',
                    }}
                  >
                    {/* FRONT FACE — Metal Black (matte near-black + gold foil) */}
                    {isFront && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', backgroundColor: '#15120f', border: '1px solid #3a3128', backgroundImage: 'radial-gradient(120% 80% at 82% -10%, rgba(214,163,92,0.12), transparent 58%)' }}>
                        {/* subtle vignette + sheen */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.35) 100%)', zIndex: 1 }} />
                        {/* top row: wordmark + sub on left, emblem on right */}
                        <div style={{ position: 'absolute', top: '11%', left: '8%', zIndex: 3 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#d6a35c' }}>THE CLOSETS</div>
                          {(det.title || det.company) && (
                            <div style={{ fontSize: 8.5, color: '#9b8a73', marginTop: 3, letterSpacing: '0.04em' }}>
                              {[det.title, det.company].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                        {/* Real avatar near the emblem (if a photo exists) */}
                        {det.photo && (
                          <div style={{ position: 'absolute', top: '30%', right: '8%', zIndex: 3, width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid #d6a35c', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}>
                            <img src={det.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {/* Gold chip */}
                        <div style={{ position: 'absolute', top: '32%', left: '8%', zIndex: 2 }}>
                          <div style={{ width: 38, height: 27, borderRadius: 6, background: 'linear-gradient(135deg,#e6c074,#a9803a)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.45)', position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: '5px 6px', borderRadius: 3, boxShadow: 'inset 0 0 0 1px rgba(122,86,30,0.55)' }} />
                          </div>
                        </div>
                        {/* Gold wordmark/logo emblem top-right */}
                        <div style={{ position: 'absolute', top: '11%', right: '8%', zIndex: 2, width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #3a3128', background: 'radial-gradient(circle at 35% 30%, rgba(214,163,92,0.25), transparent 60%)' }}>
                          {det.logo ? (
                            <img src={det.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }}>
                              <path d="M4 19V7l8-4 8 4v12" stroke="#d6a35c" strokeWidth="1.6" strokeLinejoin="round" />
                              <path d="M9 19v-6h6v6" stroke="#d6a35c" strokeWidth="1.6" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        {/* hidden ref-keepers — preserve unused source vars without rendering them */}
                        <div style={{ display: 'none' }} aria-hidden="true">
                          <span>{video}</span><span>{accent}</span>
                          <svg viewBox="0 0 341 49" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:0,height:0}}>
                            <path d="M8.75294 47.68C6.10761 47.68 4.10227 47.04 2.73694 45.76C1.41427 44.48 0.582275 42.7733 0.240941 40.64C-0.100392 38.464 -0.0790588 36.0747 0.304941 33.472C0.731608 30.8267 1.37161 28.1813 2.22494 25.536C3.07827 22.848 3.99561 20.3307 4.97694 17.984C6.00094 15.5947 6.93961 13.5893 7.79294 11.968C8.26227 11.072 8.88094 10.56 9.64894 10.432C10.4169 10.2613 11.1423 10.368 11.8249 10.752C12.5503 11.136 13.0623 11.6907 13.3609 12.416C13.7023 13.1413 13.6383 13.9307 13.1689 14.784C11.2916 18.368 9.79828 21.7813 8.68894 25.024C7.57961 28.2667 6.85427 31.1467 6.51294 33.664C6.21427 36.1387 6.23561 38.1013 6.57694 39.552C6.96094 40.96 7.68628 41.664 8.75294 41.664C9.73428 41.664 10.8009 41.3013 11.9529 40.576C13.1049 39.8507 14.3423 38.5493 15.6649 36.672C17.0303 34.6667 18.3529 32.064 19.6329 28.864C20.9556 25.6213 22.1289 21.8667 23.1529 17.6C23.4089 16.6187 23.8783 15.9573 24.5609 15.616C25.2863 15.2747 26.0329 15.2107 26.8009 15.424C27.5689 15.6373 28.1876 16.064 28.6569 16.704C29.1263 17.3013 29.2543 18.0693 29.0409 19.008C27.9316 23.616 27.3769 27.5627 27.3769 30.848C27.4196 34.1333 27.7609 36.5227 28.4009 38.016C28.8703 39.0827 29.4249 39.8507 30.0649 40.32C30.7476 40.7893 31.4943 41.024 32.3049 41.024C33.1156 41.024 33.9689 40.7253 34.8649 40.128C35.8036 39.488 36.7209 38.4 37.6169 36.864C38.5556 35.328 39.3876 33.216 40.1129 30.528C37.6809 28.48 35.6756 25.7707 34.0969 22.4C32.5183 19.0293 31.7289 15.168 31.7289 10.816C31.7289 8.93867 31.9423 7.21067 32.3689 5.632C32.7956 4.05333 33.5209 2.79467 34.5449 1.856C35.5689 0.874666 36.9769 0.383999 38.7689 0.383999C40.9449 0.383999 42.7156 1.17333 44.0809 2.752C45.4463 4.288 46.4489 6.37867 47.0889 9.024C47.7289 11.6267 48.0063 14.5493 47.9209 17.792C47.8783 21.0347 47.5369 24.3413 46.8969 27.712C47.5369 28.0107 48.2196 28.2453 48.9449 28.416C49.7129 28.5867 50.4809 28.672 51.2489 28.672C52.9983 28.672 54.7903 28.416 56.6249 27.904C58.5023 27.3493 60.1023 26.6453 61.4249 25.792C62.2783 25.2373 63.0676 25.088 63.7929 25.344C64.5183 25.5573 65.0943 26.0053 65.521 26.688C65.9476 27.328 66.1183 28.0533 66.0329 28.864C65.9903 29.632 65.5636 30.272 64.7529 30.784C62.8756 32.0213 60.7423 33.0027 58.3529 33.728C56.0063 34.4533 53.6383 34.816 51.2489 34.816C49.2863 34.816 47.3449 34.4533 45.4249 33.728C44.1876 37.7387 42.5023 40.96 40.3689 43.392C38.2356 45.824 35.5476 47.04 32.3049 47.04C30.2569 47.04 28.3583 46.4427 26.6089 45.248C24.9023 44.0107 23.6223 42.4107 22.7689 40.448C22.5983 40.064 22.4276 39.6587 22.2569 39.232C22.1289 38.8053 22.0223 38.4 21.9369 38.016C21.7236 38.4 21.4889 38.7627 21.2329 39.104C21.0196 39.4453 20.7849 39.7867 20.5289 40.128C18.9503 42.3467 17.1796 44.16 15.2169 45.568C13.2969 46.976 11.1423 47.68 8.75294 47.68ZM41.5849 23.104C42.0116 19.9893 42.1183 17.3653 41.9049 15.232C41.6916 13.0987 41.3503 11.392 40.8809 10.112C40.4116 8.78933 39.9423 7.85067 39.4729 7.296C39.0463 6.69867 38.8116 6.4 38.7689 6.4C38.7689 6.4 38.6836 6.42133 38.5129 6.464C38.3849 6.464 38.2356 6.76267 38.0649 7.36C37.9369 7.91467 37.8729 9.06667 37.8729 10.816C37.8729 12.992 38.1929 15.168 38.8329 17.344C39.4729 19.4773 40.3903 21.3973 41.5849 23.104Z" fill="white"/>
                            <path d="M91.5429 48.768C89.5376 48.768 87.9163 48.3627 86.6789 47.552C85.4843 46.784 84.6096 45.76 84.0549 44.48C83.5003 43.1573 83.2016 41.7493 83.1589 40.256C81.3243 42.4747 79.2763 44.224 77.0149 45.504C74.7963 46.7413 72.4709 47.36 70.0389 47.36C68.1189 47.36 66.3056 46.912 64.5989 46.016C62.8923 45.0773 61.5056 43.6907 60.4389 41.856C59.4149 39.9787 58.9029 37.6107 58.9029 34.752C58.9029 31.7653 59.5216 28.8427 60.7589 25.984C62.0389 23.0827 63.7669 20.48 65.9429 18.176C68.1616 15.8293 70.6789 13.9733 73.4949 12.608C76.3536 11.2 79.3403 10.496 82.4549 10.496C84.5029 10.496 86.5296 10.752 88.5349 11.264C90.5403 11.776 92.2896 12.5227 93.7829 13.504C94.6363 14.0587 95.1056 14.72 95.1909 15.488C95.2763 16.256 95.0843 16.9813 94.6149 17.664C94.1883 18.304 93.6123 18.752 92.8869 19.008C92.1616 19.264 91.3936 19.136 90.5829 18.624C89.7723 18.112 88.5563 17.6427 86.9349 17.216C85.3563 16.7467 83.8629 16.512 82.4549 16.512C80.0229 16.512 77.7616 17.0667 75.6709 18.176C73.5803 19.2853 71.7243 20.736 70.1029 22.528C68.5243 24.32 67.2869 26.2827 66.3909 28.416C65.4949 30.5493 65.0469 32.6613 65.0469 34.752C65.0469 35.8187 65.1749 36.864 65.4309 37.888C65.7296 38.8693 66.2416 39.7013 66.9669 40.384C67.6923 41.024 68.7163 41.344 70.0389 41.344C71.3189 41.344 72.7483 40.9173 74.3269 40.064C75.9483 39.168 77.4843 37.76 78.9349 35.84C79.8309 34.6453 80.7696 33.216 81.7509 31.552C82.7323 29.8453 83.6283 28.16 84.4389 26.496C85.2923 24.7893 85.9749 23.3387 86.4869 22.144C86.8283 21.2907 87.3403 20.736 88.0229 20.48C88.7483 20.224 89.4736 20.224 90.1989 20.48C90.9243 20.6933 91.5003 21.0987 91.9269 21.696C92.3536 22.2933 92.4816 23.04 92.3109 23.936L89.4949 37.632C89.1963 39.1253 89.1963 40.2347 89.4949 40.96C89.7936 41.6853 90.1776 42.176 90.6469 42.432C91.1163 42.6453 91.4149 42.752 91.5429 42.752C92.2256 42.752 93.1003 42.432 94.1669 41.792C95.2336 41.1093 96.5563 39.8507 98.1349 38.016C99.4576 36.5227 100.823 34.7733 102.231 32.768C103.682 30.72 105.068 28.6293 106.391 26.496C107.756 24.32 108.972 22.272 110.039 20.352C111.148 18.3893 112.023 16.768 112.663 15.488C113.09 14.592 113.687 14.0587 114.455 13.888C115.223 13.7173 115.948 13.824 116.631 14.208C117.356 14.5493 117.868 15.0827 118.167 15.808C118.508 16.4907 118.466 17.28 118.039 18.176C117.356 19.584 116.439 21.2907 115.287 23.296C114.178 25.3013 112.919 27.4347 111.511 29.696C110.146 31.9147 108.695 34.0907 107.159 36.224C105.666 38.3573 104.194 40.2773 102.743 41.984C101.036 43.9467 99.2869 45.568 97.4949 46.848C95.7456 48.128 93.7616 48.768 91.5429 48.768Z" fill="white"/>
                            <path d="M118.45 48.448C115.549 48.448 113.351 47.6373 111.858 46.016C110.407 44.352 109.533 42.0267 109.234 39.04C108.978 36.0533 109.17 32.5547 109.81 28.544C110.493 24.5333 111.517 20.16 112.882 15.424C113.181 14.4427 113.693 13.8027 114.418 13.504C115.143 13.1627 115.89 13.12 116.658 13.376C117.426 13.632 118.023 14.08 118.45 14.72C118.919 15.36 119.026 16.1493 118.77 17.088C117.191 22.464 116.146 26.8373 115.634 30.208C115.165 33.536 115.037 36.096 115.25 37.888C115.463 39.6373 115.869 40.832 116.466 41.472C117.106 42.112 117.767 42.432 118.45 42.432C119.303 42.432 120.413 41.9413 121.778 40.96C123.143 39.936 124.594 38.5067 126.13 36.672C127.666 34.8373 129.138 32.7253 130.546 30.336C129.778 27.904 129.394 25.152 129.394 22.08C129.394 20.2027 129.501 18.176 129.714 16C129.97 13.7813 130.397 11.6907 130.994 9.728C131.634 7.76533 132.509 6.18667 133.618 4.992C134.77 3.79733 136.242 3.264 138.034 3.392C139.485 3.52 140.573 4.032 141.298 4.928C142.066 5.824 142.535 6.95467 142.706 8.32C142.919 9.68533 142.941 11.1573 142.77 12.736C142.599 14.272 142.343 15.808 142.002 17.344C141.661 18.8373 141.319 20.16 140.978 21.312C139.954 24.8107 138.781 28.032 137.458 30.976C138.61 33.024 140.061 34.432 141.81 35.2C143.559 35.968 145.33 36.2453 147.122 36.032C148.914 35.776 150.45 35.2427 151.73 34.432C152.583 33.8773 153.373 33.728 154.098 33.984C154.823 34.1973 155.399 34.6453 155.826 35.328C156.295 35.968 156.487 36.6933 156.402 37.504C156.317 38.272 155.869 38.912 155.058 39.424C152.967 40.7893 150.642 41.6427 148.082 41.984C145.565 42.3253 143.09 42.0907 140.658 41.28C138.226 40.4693 136.093 39.04 134.258 36.992C132.039 40.576 129.586 43.392 126.898 45.44C124.253 47.4453 121.437 48.448 118.45 48.448ZM135.666 18.112C136.391 15.5947 136.882 13.7173 137.138 12.48C137.394 11.2427 137.522 10.432 137.522 10.048C137.522 9.62133 137.522 9.408 137.522 9.408C137.522 9.408 137.394 9.68533 137.138 10.24C136.882 10.752 136.605 11.648 136.306 12.928C136.007 14.1653 135.794 15.8933 135.666 18.112Z" fill="white"/>
                            <path d="M164.834 48.512C161.762 48.512 159.117 47.808 156.898 46.4C154.68 44.9493 152.973 43.008 151.778 40.576C150.584 38.1013 149.986 35.328 149.986 32.256C149.986 29.2267 150.562 26.3893 151.714 23.744C152.866 21.056 154.36 18.7093 156.194 16.704C158.072 14.656 160.056 13.0773 162.146 11.968C164.28 10.816 166.306 10.24 168.226 10.24C169.762 10.24 171.17 10.5387 172.45 11.136C173.73 11.7333 174.754 12.5867 175.522 13.696C176.333 14.8053 176.738 16.1493 176.738 17.728C176.738 20.0747 176.034 22.1227 174.626 23.872C173.261 25.5787 171.384 27.4773 168.994 29.568C167.202 31.1467 165.325 32.64 163.362 34.048C161.4 35.456 159.352 36.8427 157.218 38.208C158.584 41.0667 161.122 42.496 164.834 42.496C165.858 42.496 166.946 42.3467 168.098 42.048C169.25 41.7067 170.552 41.024 172.002 40C173.453 38.976 175.16 37.376 177.122 35.2C177.762 34.4747 178.466 34.1333 179.234 34.176C180.045 34.2187 180.749 34.5173 181.346 35.072C181.944 35.584 182.285 36.2453 182.37 37.056C182.498 37.824 182.242 38.5707 181.602 39.296C178.445 42.7947 175.458 45.2053 172.642 46.528C169.869 47.8507 167.266 48.512 164.834 48.512ZM156.13 31.744C157.752 30.6773 159.309 29.6107 160.802 28.544C162.296 27.4347 163.704 26.2827 165.026 25.088C167.245 23.1253 168.738 21.504 169.506 20.224C170.317 18.9013 170.722 18.0693 170.722 17.728C170.722 17.5573 170.594 17.28 170.338 16.896C170.082 16.4693 169.378 16.256 168.226 16.256C167.16 16.256 165.944 16.6613 164.578 17.472C163.256 18.24 161.954 19.328 160.674 20.736C159.437 22.144 158.392 23.7867 157.538 25.664C156.685 27.5413 156.216 29.568 156.13 31.744Z" fill="white"/>
                            <path d="M201.487 13.248C204.773 13.248 207.717 13.9733 210.319 15.424C212.922 16.8747 214.949 18.9013 216.399 21.504C217.893 24.1067 218.639 27.1147 218.639 30.528C218.639 33.9413 217.893 36.9707 216.399 39.616C214.949 42.2187 212.922 44.2453 210.319 45.696C207.717 47.1467 204.773 47.872 201.487 47.872C198.97 47.872 196.666 47.3813 194.575 46.4C192.485 45.4187 190.757 43.9893 189.391 42.112V47.488H183.503V0H189.647V18.688C191.013 16.896 192.719 15.552 194.767 14.656C196.815 13.7173 199.055 13.248 201.487 13.248ZM200.975 42.496C203.151 42.496 205.093 42.0053 206.799 41.024C208.549 40 209.914 38.592 210.895 36.8C211.919 34.9653 212.431 32.8747 212.431 30.528C212.431 28.1813 211.919 26.112 210.895 24.32C209.914 22.4853 208.549 21.0773 206.799 20.096C205.093 19.1147 203.151 18.624 200.975 18.624C198.842 18.624 196.901 19.1147 195.151 20.096C193.402 21.0773 192.037 22.4853 191.055 24.32C190.074 26.112 189.583 28.1813 189.583 30.528C189.583 32.8747 190.074 34.9653 191.055 36.8C192.037 38.592 193.402 40 195.151 41.024C196.901 42.0053 198.842 42.496 200.975 42.496Z" fill="white"/>
                            <path d="M256.568 13.568V47.488H250.68V42.112C249.315 43.9893 247.587 45.4187 245.496 46.4C243.406 47.3813 241.102 47.872 238.584 47.872C235.299 47.872 232.355 47.1467 229.752 45.696C227.15 44.2453 225.102 42.2187 223.608 39.616C222.158 36.9707 221.432 33.9413 221.432 30.528C221.432 27.1147 222.158 24.1067 223.608 21.504C225.102 18.9013 227.15 16.8747 229.752 15.424C232.355 13.9733 235.299 13.248 238.584 13.248C241.016 13.248 243.256 13.7173 245.304 14.656C247.352 15.552 249.059 16.896 250.424 18.688V13.568H256.568ZM239.096 42.496C241.23 42.496 243.171 42.0053 244.92 41.024C246.67 40 248.035 38.592 249.016 36.8C249.998 34.9653 250.488 32.8747 250.488 30.528C250.488 28.1813 249.998 26.112 249.016 24.32C248.035 22.4853 246.67 21.0773 244.92 20.096C243.171 19.1147 241.23 18.624 239.096 18.624C236.92 18.624 234.958 19.1147 233.208 20.096C231.502 21.0773 230.136 22.4853 229.112 24.32C228.131 26.112 227.64 28.1813 227.64 30.528C227.64 32.8747 228.131 34.9653 229.112 36.8C230.136 38.592 231.502 40 233.208 41.024C234.958 42.0053 236.92 42.496 239.096 42.496Z" fill="white"/>
                            <path d="M283.745 13.248C288.055 13.248 291.468 14.5067 293.985 17.024C296.545 19.4987 297.825 23.1467 297.825 27.968V47.488H291.681V28.672C291.681 25.3867 290.892 22.912 289.313 21.248C287.735 19.584 285.473 18.752 282.529 18.752C279.201 18.752 276.577 19.7333 274.657 21.696C272.737 23.616 271.777 26.3893 271.777 30.016V47.488H265.633V13.568H271.521V18.688C272.759 16.9387 274.423 15.5947 276.513 14.656C278.647 13.7173 281.057 13.248 283.745 13.248ZM319.82 31.68L312.78 38.208V47.488H306.636V0H312.78V30.464L331.276 13.568H338.7L324.428 27.584L340.108 47.488H332.556L319.82 31.68Z" fill="white"/>
                          </svg>
                        </div>
                        {/* Bottom identity block — holder name, role, member id */}
                        <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '9%', zIndex: 3 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#f3ead9', letterSpacing: '0.01em', lineHeight: 1.15 }}>{det.name}</div>
                          {(det.title || det.company) && (
                            <div style={{ fontSize: 10, color: '#b6a489', marginTop: 3, letterSpacing: '0.02em', lineHeight: 1.25 }}>
                              {[det.title, det.company].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {det.number && (
                            <div style={{ fontSize: 9.5, color: '#8f7f69', marginTop: 7, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.14em' }}>
                              ID · {det.number}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* BACK FACE — Metal Black: wordmark + gold QR panel + contact row */}
                    {isBack && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', backgroundColor: '#15120f', border: '1px solid #3a3128', backgroundImage: 'radial-gradient(110% 70% at 50% -10%, rgba(214,163,92,0.10), transparent 60%)', transform: 'rotateY(180deg)' }}>
                        {/* wordmark top */}
                        <div style={{ position: 'absolute', top: '10%', left: '8%', right: '8%', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#d6a35c', zIndex: 2 }}>THE CLOSETS</div>
                        {/* gold QR panel with dark modules */}
                        <div style={{ position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)', zIndex: 2, background: 'linear-gradient(135deg,#e6c074,#caa256)', padding: 7, borderRadius: 9, boxShadow: '0 6px 16px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.4)' }}>
                          <img
                            alt=""
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&color=15120f&bgcolor=e6c074&data=${encodeURIComponent('https://closets-website.vercel.app/card.html?c=' + (det.slug || ''))}`}
                            style={{ display: 'block', width: 64, height: 64 }}
                          />
                        </div>
                        {/* membership + identity + contact — mono */}
                        <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '10%', color: '#b6a489', fontFamily: "'JetBrains Mono', monospace", zIndex: 2 }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: '#8f7f69', marginBottom: 4 }}>MEMBERSHIP</div>
                          <div style={{ fontSize: 13, letterSpacing: '0.12em', color: '#f3ead9', marginBottom: 10 }}>{det.number}</div>
                          <div style={{ fontSize: 11, letterSpacing: '0.06em', color: '#f3ead9', marginBottom: 4 }}>{det.name}</div>
                          {(det.title || det.company) && (
                            <div style={{ fontSize: 9, letterSpacing: '0.04em', color: '#b6a489', marginBottom: 4 }}>{[det.title, det.company].filter(Boolean).join(' · ')}</div>
                          )}
                          {(det.contact || det.website) && (
                            <div style={{ fontSize: 9, letterSpacing: '0.04em', color: '#b6a489' }}>{[det.contact, det.website].filter(Boolean).join('  ·  ')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Layout id → Wardrobe3D layout the kitchen builder understands.
const k3dLayout = (id) => (K_LAYOUTS.find(l=>l.id===id)?.model) || 'single';

const tvBlock = (id) => TV_BLOCKS.find(b=>b.id===id);

/* ── PART 1 + 4 · KITCHEN DESIGN STUDIO (guided configurator + live 3D + quote) ── */
function KitchenStudio({ setPage, user, openAuth }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const { map: dbLayouts } = useLayouts('kitchen');
  // DISPLAY-ONLY merge (icon-card studio): pricing / model maps stay on K_LAYOUTS.
  const kLayoutsView = K_LAYOUTS.map(l => mergeLayout(l, dbLayouts));
  const [step, setStep] = useState(0);
  const [layout, setLayout] = useState('l-shape');
  const [styleId, setStyleId] = useState('shaker');
  const [worktop, setWorktop] = useState('quartz');
  const [finishId, setFinishId] = useState('sage');
  const [handle, setHandle] = useState('bar');
  const [appliances, setAppliances] = useState(['hob','oven','hood','sink']);
  const [storage, setStorage] = useState(['cutlery','bin']);
  const [view3d, setView3d] = useState(true);
  const [specOpen, setSpecOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const lay = K_LAYOUTS.find(l=>l.id===layout) || K_LAYOUTS[0];
  const cab = K_CAB_STYLES.find(s=>s.id===styleId) || K_CAB_STYLES[0];
  const wt  = K_WORKTOPS.find(w=>w.id===worktop) || K_WORKTOPS[0];
  const fin = K_FINISHES.find(f=>f.id===finishId) || K_FINISHES[0];
  const hd  = KITCHEN_HANDLES.find(h=>h[0]===handle) || KITCHEN_HANDLES[0];
  const runM = lay.runM;
  const appsList = appliances.map(id=>K_APPLIANCES.find(a=>a.id===id)).filter(Boolean);
  const storeList = storage.map(id=>K_STORAGE.find(s=>s.id===id)).filter(Boolean);

  // ── Transparent pricing model (BHD) ──
  const CABINET_RATE = 720;                              // per linear metre, base
  const cabinetCost  = Math.round(runM * CABINET_RATE * cab.mult);
  const worktopCost  = Math.round(runM * wt.perM);
  const handleCost   = Math.round(runM / 0.6) * (hd[3] > 0 ? Math.round(hd[3] / 15) : 0); // ~1 handle / 0.6m
  const applianceCost= appsList.reduce((s,a)=>s+a.price, 0);
  const storageCost  = storeList.reduce((s,a)=>s+a.price, 0);
  const est = Math.max(0, cabinetCost + worktopCost + handleCost + applianceCost + storageCost);

  const toggle = (arr, set, id) => set(arr.includes(id) ? arr.filter(x=>x!==id) : [...arr, id]);

  const STEPS = [
    { key:'layout',    label:'Layout' },
    { key:'cabinets',  label:'Cabinets' },
    { key:'worktop',   label:'Worktop' },
    { key:'finish',    label:'Finish' },
    { key:'appliances',label:'Appliances' },
    { key:'hardware',  label:'Hardware' },
    { key:'storage',   label:'Storage' },
    { key:'summary',   label:'Quote' },
  ];
  const cur = STEPS[step];

  // top-down plan tinted by chosen finish
  const planSvg = (h=mobile?120:150) => (
    <svg viewBox="0 0 260 200" style={{ width:'100%', height:h, display:'block' }} aria-label="Kitchen layout plan">
      <rect x="10" y="14" width="240" height="172" rx="10" fill="#fff" stroke="#cbbfae" strokeWidth="2" strokeDasharray="5 5" />
      <path d={lay.plan} fill={fin.hex} stroke="rgba(0,0,0,.14)" strokeWidth="1" />
    </svg>
  );

  const submit = async (c) => {
    if (!c.name.trim() || !c.phone.trim()) { toast(t('w4AddNamePhone'),'error'); return; }
    { const qv = validateForm(c, { name:{type:'name',required:true}, phone:{type:'phone',required:true}, email:{type:'email'} }, lang); if (!qv.ok) { toast(Object.values(qv.errors)[0], 'error'); return; } c = { ...c, ...qv.clean }; }   // [FORMS] real e-mail / phone validation
    setBusy(true);
    try {
      const cfgId = uid();
      const breakdown = { cabinets:cabinetCost, worktop:worktopCost, handles:handleCost, appliances:applianceCost, storage:storageCost };
      const spec = { product:'kitchen', layout, layout_name:lay.name, run_metres:runM, cabinet_style:cab.name, cabinet_mult:cab.mult,
        worktop:wt.name, finish:fin.name, handles:hd[1], appliances:appsList.map(a=>a.name), storage:storeList.map(s=>s.name),
        estimate_bhd:est, price_drivers:breakdown };
      await api('product_configurations', { method:'POST', body:[{ id:cfgId, customer_id:user?.id||null, product_id:KITCHEN_CATALOG_ANCHORS.modern.id,
        customer_name:c.name||user?.name||null, customer_email:c.email||user?.email||null, customer_phone:c.phone||user?.phone||null,
        product_name:`Kitchen — ${lay.name}, ${cab.name} (${runM.toFixed(1)}m)`, configuration:spec, total_price:est,
        price_breakdown:breakdown, status:'kitchen-studio', share_token:cfgId, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Website Kitchen Design Studio`, `Layout: ${lay.name}  ·  ${runM.toFixed(1)}m run`,
        `Cabinets: ${cab.name}  ·  Finish: ${fin.name}  ·  Handles: ${hd[1]}`, `Worktop: ${wt.name}`,
        `Appliances: ${appsList.map(a=>a.name).join(', ')||'—'}`, `Storage: ${storeList.map(s=>s.name).join(', ')||'—'}`,
        `Indicative estimate: BHD ${est}`, c.date?`Preferred appointment: ${c.date}`:'', `Plan ref: ${cfgId}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:c.name||'Website Visitor', email:c.email||null, phone:c.phone||null,
        source:'website_kitchen_studio', status:'New', stage:'New', platform:'Website', interest:'Kitchen (design studio)',
        budget:est, value:est, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4QuoteSentKitchen'),'success');
      setShowQuote(false);
      if (!user && openAuth) openAuth('register', { name:c.name, phone:c.phone, email:c.email });
      else setPage('home');
    } catch(e) { toast(t('w4CouldNotSend')+' '+(e?.message||t('w4PleaseTryAgain')),'error'); }
    finally { setBusy(false); }
  };

  const inS = { width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' };
  const card = (on) => ({ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:14, padding:'12px 14px', cursor:'pointer' });
  const next = () => setStep(s=>Math.min(STEPS.length-1, s+1));
  const back = () => setStep(s=>Math.max(0, s-1));

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?80:64, paddingBottom: mobile?120:90 }}>
      <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'0 14px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:16 }}>
          <div className="eyebrow" style={{ marginBottom:10 }}>{t('sw2KsEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile?28:44, color:'var(--ink)' }}>{t('sw2KsTitle')}</h1>
          <p style={{ color:'var(--ink-soft)', fontSize: mobile?14:16, marginTop:8, maxWidth:560, margin:'8px auto 0' }}>{t('sw2KsSub')}</p>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'0 2px 10px', margin:'0 auto 18px', maxWidth:880, justifyContent: mobile?'flex-start':'center' }}>
          {STEPS.map((s,i)=>{ const done=i<step, now=i===step; return (
            <button key={s.key} type="button" onClick={()=>i<=step&&setStep(i)} style={{ flexShrink:0, display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:i<=step?'pointer':'default', padding:'2px 4px' }}>
              <span style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color:(!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':i+1}</span>
              <span style={{ fontSize:12.5, fontWeight: now?700:500, color: now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)' }}>{trStep(s.label, lang)}</span>
            </button>
          ); })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.05fr 1fr', gap:20, alignItems:'start' }}>
          {/* ── PREVIEW + live quote ── */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:16, boxShadow:'var(--shadow)', position: mobile?'static':'sticky', top:90 }}>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <button type="button" onClick={()=>setView3d(true)} style={{ flex:1, padding:'7px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'none', background: view3d?'var(--clay)':'var(--sand)', color: view3d?'#fff':'var(--ink-soft)' }}>{t('sw2Ks3dView')}</button>
              <button type="button" onClick={()=>setView3d(false)} style={{ flex:1, padding:'7px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'none', background:!view3d?'var(--clay)':'var(--sand)', color:!view3d?'#fff':'var(--ink-soft)' }}>{t('sw2Ks2dPlan')}</button>
            </div>
            <div style={{ background:'var(--sand)', borderRadius:14, padding: view3d?0:14, overflow:'hidden', minHeight: mobile?220:320 }}>
              {view3d
                ? <div style={{ height: mobile?240:360 }}><Wardrobe3D product="kitchen" layout={k3dLayout(layout)} finishHex={fin.hex} handles={handle!=='handleless'} led={storage.includes('led')} glass={false} widthCm={Math.round(runM*100)} mobile={mobile} preset="iso" /></div>
                : planSvg()}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{t('sw2KsIndicEst')} · {runM.toFixed(1)}m {t('sw2KsRun')}</span>
              <span className="display" style={{ fontSize: mobile?24:28, color:'var(--clay)' }}>{fmt(est)}</span>
            </div>
            {/* live price drivers */}
            <div style={{ marginTop:10, fontSize:12, color:'var(--ink-soft)', display:'grid', gap:4 }}>
              {[[t('sw2KsCabinets')+' ('+cab.name+', '+runM.toFixed(1)+'m)',cabinetCost],[t('sw2KsWorktop')+' ('+wt.name+')',worktopCost],[t('sw2KsHandles'),handleCost],[t('sw2KsAppliances')+' ('+appsList.length+')',applianceCost],[t('sw2KsStorageAddons')+' ('+storeList.length+')',storageCost]].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between' }}><span>{l}</span><span style={{ fontWeight:600, color:'var(--ink)' }}>{fmt(v)}</span></div>
              ))}
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:8, lineHeight:1.5 }}>{t('sw2KsGuideNote')}</div>
            <button type="button" onClick={()=>setSpecOpen(true)} style={{ marginTop:10, width:'100%', background:'var(--sand)', border:'1px solid var(--line)', borderRadius:12, padding:'10px', fontSize:13, fontWeight:600, color:'var(--ink)', cursor:'pointer' }}>{t('sw2KsViewSpec')}</button>
            {!mobile && <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ width:'100%', marginTop:10, borderRadius:12 }}>{user?t('sw2KsGetQuote'):t('sw2KsSignInQuote')}</button>}
          </div>

          {/* ── STEP PANEL ── */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?16:24, boxShadow:'var(--shadow)' }}>
            {cur.key==='layout' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep1')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsWrapQ')}</p>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:10 }}>
                {kLayoutsView.map(l=>{ const on=layout===l.id; return (
                  <button key={l.id} type="button" onClick={()=>setLayout(l.id)} style={card(on)}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.6"><path d={l.ic} /></svg>
                      <div><div style={{ fontSize:14.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(l.name, lang)}</div><div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{trOpt(l.sub, lang)}</div></div>
                    </div>
                    <div style={{ fontSize:11, color:'var(--ink-soft)', marginTop:8, paddingTop:8, borderTop:'1px solid var(--line)' }}>{trOpt(l.best, lang)} · ~{l.runM}m run</div>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='cabinets' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep2')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep2Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr 1fr', gap:10 }}>
                {K_CAB_STYLES.map(s=>{ const on=styleId===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ ...card(on), padding:0, overflow:'hidden' }}>
                    <div style={{ height:46, background:s.g }} />
                    <div style={{ padding:'9px 11px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}</div>
                      <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{trOpt(s.sub, lang)}</div>
                      <div style={{ fontSize:10.5, color:'var(--ink-soft)', marginTop:4 }}>×{s.mult.toFixed(2)} · {trOpt(s.lead, lang)}</div>
                    </div>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='worktop' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep3')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep3Sub')}</p>
              <div style={{ display:'grid', gap:9 }}>
                {K_WORKTOPS.map(w=>{ const on=worktop===w.id; return (
                  <button key={w.id} type="button" onClick={()=>setWorktop(w.id)} style={card(on)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                      <span style={{ fontSize:14, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(w.name, lang)}</span>
                      <span style={{ fontSize:12.5, fontWeight:700, color:'var(--clay)' }}>{fmt(w.perM)}/m</span>
                    </div>
                    <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:3 }}>{w.sub} · {w.thick} · {w.warranty} warranty · heat {w.heat}</div>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='finish' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep4')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep4Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(92px,1fr))', gap:10 }}>
                {K_FINISHES.map(f=>{ const on=finishId===f.id; return (
                  <button key={f.id} type="button" onClick={()=>setFinishId(f.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:12, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0 }}>
                    <div style={{ height:46, background:f.hex }} />
                    <div style={{ fontSize:11.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)', padding:'7px 6px' }}>{trOpt(f.name, lang)}</div>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='appliances' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep5')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep5Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:9 }}>
                {K_APPLIANCES.map(a=>{ const on=appliances.includes(a.id); return (
                  <button key={a.id} type="button" onClick={()=>toggle(appliances,setAppliances,a.id)} style={{ ...card(on), display:'flex', alignItems:'center', gap:10 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={a.ic} /></svg>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{a.name}</div><div style={{ fontSize:10.5, color:'var(--muted)' }}>{a.sub} · {fmt(a.price)}</div></div>
                    <span style={{ fontSize:16, color: on?'var(--clay)':'var(--line)' }}>{on?'✓':'+'}</span>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='hardware' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep6')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep6Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
                {KITCHEN_HANDLES.map(([id,name,sub,add])=>{ const on=handle===id; return (
                  <button key={id} type="button" onClick={()=>setHandle(id)} style={card(on)}>
                    <div style={{ fontSize:13.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{sub}{add>0?` · +${fmt(add)} (set)`:' · included'}</div>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='storage' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsStep7')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2KsStep7Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr', gap:9 }}>
                {K_STORAGE.map(a=>{ const on=storage.includes(a.id); return (
                  <button key={a.id} type="button" onClick={()=>toggle(storage,setStorage,a.id)} style={{ ...card(on), display:'flex', alignItems:'center', gap:10 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.5"><path d={a.ic} /></svg>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{a.name}</div><div style={{ fontSize:10.5, color:'var(--muted)' }}>{a.sub} · {fmt(a.price)}</div></div>
                    <span style={{ fontSize:16, color: on?'var(--clay)':'var(--line)' }}>{on?'✓':'+'}</span>
                  </button>); })}
              </div>
            </>)}

            {cur.key==='summary' && (<>
              <h3 className="display" style={{ fontSize:21, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2KsYourKitchen')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 14px' }}>{t('sw2KsReviewSub')}</p>
              <div style={{ background:'var(--sand)', borderRadius:12, padding:'14px 16px', fontSize:13.5, color:'var(--ink-soft)', lineHeight:1.85 }}>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsLayout')}</b> · {lay.name} (~{runM.toFixed(1)}m)</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsCabinets')}</b> · {cab.name} in {fin.name}</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsWorktop')}</b> · {wt.name}</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsHandles')}</b> · {hd[1]}</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsAppliances')}</b> · {appsList.map(a=>a.name).join(', ')||t('sw2KsNoneSelected')}</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2KsStorage')}</b> · {storeList.map(s=>s.name).join(', ')||t('sw2KsNoneSelected')}</div>
                <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--line)' }}><b style={{ color:'var(--clay-deep)', fontSize:16 }}>{t('sw2KsEstimate')} · {fmt(est)}</b></div>
              </div>
              <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ width:'100%', marginTop:16, borderRadius:14 }}>{user?t('sw2KsGetQuote'):t('sw2KsSignInQuote')}</button>
              <div style={{ fontSize:11.5, color:'var(--muted)', textAlign:'center', marginTop:8 }}>{t('sw2KsFreeVisitNote')}</div>
            </>)}

            {/* nav */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, gap:10 }}>
              {step>0 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'11px 18px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button>
                : <button type="button" onClick={()=>setPage('kitchen')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('sw2KsBackKitchens')}</button>}
              {step<STEPS.length-1 && <button type="button" className="btn-clay" onClick={next} style={{ borderRadius:12, minWidth:140 }}>{t('pContinueArrow')}</button>}
            </div>
          </div>
        </div>
      </div>

      {/* mobile sticky quote bar */}
      {mobile && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:920, background:'rgba(255,255,255,.96)', backdropFilter:'blur(12px)', borderTop:'1px solid var(--line)', padding:'10px 14px calc(10px + env(safe-area-inset-bottom))', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}><div style={{ fontSize:10.5, color:'var(--muted)' }}>{t('sw2KsEstimate')} · {runM.toFixed(1)}m</div><div className="display" style={{ fontSize:20, color:'var(--clay)' }}>{fmt(est)}</div></div>
          <button type="button" className="btn-clay" onClick={()=>setShowQuote(true)} style={{ borderRadius:12, padding:'12px 18px', fontSize:14, whiteSpace:'nowrap' }}>{user?t('sw2KsGetQuoteShort'):t('sw2KsSignInQuoteShort')}</button>
        </div>
      )}

      {/* SPEC & PRICING DETAIL drawer (Part 3) */}
      {specOpen && (
        <div onClick={()=>setSpecOpen(false)} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.55)', backdropFilter:'blur(3px)', display:'flex', justifyContent:'flex-end' }}>
          <ModalPanel onClose={()=>setSpecOpen(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', width: mobile?'100%':440, maxWidth:'100%', height:'100%', overflowY:'auto', padding:'24px 22px', boxShadow:'-12px 0 40px rgba(0,0,0,.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:0 }}>{t('sw2KsSpecPricing')}</h3>
              <button type="button" onClick={()=>setSpecOpen(false)} style={{ background:'none', border:'none', fontSize:20, color:'var(--muted)', cursor:'pointer' }}>✕</button>
            </div>
            {[
              ['Cabinet style', cab.name, [['Construction',cab.constr],['Cabinetry rate',formatBHD(CABINET_RATE, CMS_LANG, { whole:true })+'/m × '+cab.mult.toFixed(2)+' = '+fmt(Math.round(CABINET_RATE*cab.mult))+'/m'],['Lead time',cab.lead],['Warranty','10 years on cabinetry']]],
              ['Worktop', wt.name, [['Description',wt.desc],['Thickness',wt.thick],['Price driver',fmt(wt.perM)+' per linear metre'],['Heat / scratch',wt.heat+' / '+wt.scratch],['Care',wt.care],['Lead time',wt.lead],['Warranty',wt.warranty]]],
              ['Finish & hardware', fin.name+' · '+hd[1], [['Colour',fin.name],['Handles',hd[1]+' '+(hd[3]>0?'(+'+fmt(hd[3])+' / set)':'(included)')],['Hinges','Soft-close Blum, included'],['Drawers','Soft-close runners, included']]],
            ].map(([title,head,rows])=>(
              <div key={title} style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:14, padding:'14px 16px', marginBottom:12 }}>
                <div className="eyebrow" style={{ fontSize:11, marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', marginBottom:8 }}>{head}</div>
                {rows.map(([k,v])=>(<div key={k} style={{ display:'flex', gap:10, padding:'5px 0', borderTop:'1px solid var(--line)', fontSize:12.5 }}><span style={{ color:'var(--muted)', minWidth:108 }}>{k}</span><span style={{ color:'var(--ink-soft)', flex:1 }}>{v}</span></div>))}
              </div>
            ))}
            <div style={{ background:'var(--sand)', borderRadius:14, padding:'14px 16px', fontSize:12.5, color:'var(--ink-soft)', lineHeight:1.6 }}>
              <b style={{ color:'var(--ink)' }}>How pricing works.</b> Cabinets are charged per linear metre of run × your door-style factor. Worktops are per metre. Appliances and storage add-ons are per unit. Typical base units are 60cm wide × 72cm high × 60cm deep; tall units 200cm+. Every figure here is indicative — your free design visit confirms exact measurements and a fully itemised quote.
            </div>
          </ModalPanel>
        </div>
      )}

      {/* QUOTE modal */}
      {showQuote && (
        <div onClick={()=>!busy&&setShowQuote(false)} style={{ position:'fixed', inset:0, zIndex:10001, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowQuote(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:26 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:24, color:'var(--ink)', margin:'0 0 6px' }}>{t('pQuoteTitleKitchen')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:12, padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)', lineHeight:1.6 }}>{lay.name} · {cab.name} · {wt.name} · <b style={{ color:'var(--clay-deep)' }}>{fmt(est)}</b></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} aria-label={t('sw2KsYourName')} placeholder={t('sw2KsYourName')} style={inS} />
              <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} aria-label={t('sw2KsPhone')} placeholder={t('sw2KsPhonePh')} inputMode="tel" style={inS} />
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} aria-label={t('sw2KsEmail')} placeholder={t('sw2KsEmailOpt')} inputMode="email" style={inS} />
              <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
            </div>
            <FormNotice kind="request" style={{ marginTop:12 }} />
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="button" onClick={()=>setShowQuote(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('sw2Cancel')}</button>
              <button type="button" className="btn-clay" disabled={busy||!contact.name.trim()||!contact.phone.trim()} onClick={()=>submit(contact)} style={{ flex:2, borderRadius:12, opacity:(busy||!contact.name.trim()||!contact.phone.trim())?.6:1 }}>{busy?t('sw2Sending'):(user?t('sw2KsSendQuoteReq'):t('sw2KsSignInSend'))}</button>
            </div>
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

function WrenPlannerPage({ setPage, user }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [step, setStep] = useState(1);
  const [shape, setShape] = useState('l-shape');
  const [dims, setDims] = useState({ a:340, b:260, c:220, island:180 });
  const [styleId, setStyleId] = useState('shaker_oak');
  const [worktop, setWorktop] = useState('quartz');
  const [handle, setHandle] = useState('bar');
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });
  const sh = KITCHEN_SHAPES.find(s=>s.id===shape) || KITCHEN_SHAPES[0];
  const st = KITCHEN_STYLES.find(s=>s.id===styleId) || KITCHEN_STYLES[0];
  const wt = KITCHEN_WORKTOPS.find(w=>w[0]===worktop) || KITCHEN_WORKTOPS[0];
  const hd = KITCHEN_HANDLES.find(h=>h[0]===handle) || KITCHEN_HANDLES[0];
  const runM = (sh.runs.reduce((s,k)=>s+(Number(dims[k])||0),0))/100; // cm → m
  const est = Math.max(0, Math.round(runM*480*st.mult + wt[3] + hd[3]));
  const STEPS = ['Shape','Size','Style','Finishes','Summary'];

  // Simple top-down plan preview, tinted by the chosen door style
  const plan = () => {
    const c = st.hex, line = '#cbbfae';
    const R = (x,y,w,h) => <rect x={x} y={y} width={w} height={h} rx="3" fill={c} stroke="rgba(0,0,0,.12)" strokeWidth="1" />;
    let runs = null;
    switch (shape) {
      case 'straight': runs = R(24,150,212,26); break;
      case 'galley': runs = <>{R(24,40,212,26)}{R(24,150,212,26)}</>; break;
      case 'l-shape': runs = <>{R(24,40,26,136)}{R(24,150,212,26)}</>; break;
      case 'u-shape': runs = <>{R(24,40,26,136)}{R(24,150,212,26)}{R(210,40,26,136)}</>; break;
      case 'island': runs = <>{R(24,150,212,26)}{R(86,80,88,40)}</>; break;
      default: runs = R(24,150,212,26);
    }
    return (
      <svg viewBox="0 0 260 200" style={{ width:'100%', height:'auto', display:'block' }} aria-label="Kitchen plan preview">
        <rect x="10" y="14" width="240" height="172" rx="10" fill="#fff" stroke={line} strokeWidth="2" strokeDasharray="5 5" />
        {runs}
      </svg>
    );
  };

  const book = async () => {
    if (!contact.name.trim() || !contact.phone.trim()) { toast(t('w4AddNamePhone'),'error'); return; }
    setBusy(true);
    try {
      const cfgId = uid();
      const spec = { product:'kitchen', shape, dims, style:styleId, worktop, handle, run_metres:Number(runM.toFixed(2)), estimate_bhd:est };
      await api('product_configurations', { method:'POST', body:[{ id:cfgId, customer_id:user?.id||null, customer_name:contact.name||user?.name||null, customer_email:contact.email||user?.email||null, customer_phone:contact.phone||user?.phone||null, product_name:`Kitchen — ${sh.name}, ${st.name} (${runM.toFixed(1)}m)`, configuration:spec, total_price:est, status:'kitchen-plan', share_token:cfgId, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-' + Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Website Kitchen Planner`, `Shape: ${sh.name}  |  Run: ${runM.toFixed(1)}m`, `Style: ${st.name}  |  Worktop: ${wt[1]}  |  Handles: ${hd[1]}`, `Indicative estimate: BHD ${est}`, contact.date?`Preferred appointment: ${contact.date}`:'', `Plan ref: ${cfgId}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:contact.name||'Website Visitor', email:contact.email||null, phone:contact.phone||null, source:'website_kitchen_planner', status:'New', stage:'New', platform:'Website', interest:'Kitchen (planner)', budget:est, value:est, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4ApptKitchen'),'success');
      setPage('home');
    } catch (e) { toast(t('w4CouldNotSend')+' '+(e?.message||t('w4PleaseTryAgain')),'error'); }
    finally { setBusy(false); }
  };

  const inS = { width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' };
  const next = () => setStep(s=>Math.min(5,s+1));
  const back = () => setStep(s=>Math.max(1,s-1));

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:64, paddingBottom:90 }}>
      <div style={{ maxWidth:1080, margin:'0 auto', padding: mobile?'0 18px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>{t('sw2WrEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile?30:46, color:'var(--ink)' }}>{t('sw2WrTitle')}</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:10 }}>{t('sw2WrSub')}</p>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap', margin:'0 auto 26px', maxWidth:660 }}>
          {STEPS.map((label,i)=>{ const n=i+1, done=n<step, now=n===step; return (
            <Fragment key={label}>
              <span onClick={()=>n<step&&setStep(n)} style={{ display:'flex', alignItems:'center', gap:6, cursor:n<step?'pointer':'default' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: now?'var(--clay)':done?'var(--clay-deep)':'var(--sand)', color:(!now&&!done)?'var(--muted)':'#fff' }}>{done?'✓':n}</span>
                <span style={{ fontSize:12.5, fontWeight: now?700:500, color: now?'var(--ink)':done?'var(--ink-soft)':'var(--muted)' }}>{trStep(label, lang)}</span>
              </span>
              {i<STEPS.length-1 && <span style={{ width:16, height:2, background:'var(--line)', borderRadius:2 }} />}
            </Fragment>
          ); })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:22, alignItems:'start' }}>
          {/* Plan + live estimate */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:20, boxShadow:'var(--shadow)', position: mobile?'static':'sticky', top:96 }}>
            <div style={{ background:'var(--sand)', borderRadius:14, padding:16, marginBottom:16 }}>{plan()}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{t('sw2WrIndicStd')}</span>
              <span className="display" style={{ fontSize:26, color:'var(--clay)' }}>{fmt(est)}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>{sh.name} · {runM.toFixed(1)}m {t('sw2KsRun')} · {st.name} · {wt[1]} {t('sw2WrWorktop')}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>{t('sw2WrGuideNote')}</div>
          </div>

          {/* Step panel */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?18:24, boxShadow:'var(--shadow)' }}>
            {step===1 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2WrStep1')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2WrWrapQ')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {KITCHEN_SHAPES.map(s=>{ const on=shape===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setShape(s.id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:14, padding:'13px 14px', cursor:'pointer' }}>
                    <div style={{ fontSize:14.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:3, lineHeight:1.35 }}>{trOpt(s.sub, lang)}</div>
                  </button>); })}
              </div>
            </>)}
            {step===2 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2WrStep2')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2WrStep2Sub')}</p>
              {sh.runs.map((k)=>{ const labels={a:t('sw2WrRunA'),b:t('sw2WrRunB'),c:t('sw2WrRunC'),island:t('sw2WrIsland')}; return (
                <div key={k} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{labels[k]}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{dims[k]}cm</span></div>
                  <input type="range" min={120} max={600} step={10} value={dims[k]} onChange={e=>setDims(d=>({...d,[k]:parseInt(e.target.value)}))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>); })}
            </>)}
            {step===3 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2WrStep3')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 16px' }}>{t('sw2WrStep3Sub')}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {KITCHEN_STYLES.map(s=>{ const on=styleId===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, textAlign:'left' }}>
                    <div style={{ height:54, background:s.g }} />
                    <div style={{ padding:'8px 10px' }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}</div>
                      <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2 }}>{trOpt(s.sub, lang)}</div>
                    </div>
                  </button>); })}
              </div>
            </>)}
            {step===4 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2WrStep4')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 14px' }}>{t('sw2WrStep4Sub')}</p>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'4px 0 8px' }}>{t('sw2WrWorktopHead')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {KITCHEN_WORKTOPS.map(([id,name,sub,add])=>{ const on=worktop===id; return (
                  <button key={id} type="button" onClick={()=>setWorktop(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{sub}{add>0?` · +${fmt(add)}`:''}</div>
                  </button>); })}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'4px 0 8px' }}>{t('sw2WrHandlesHead')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {KITCHEN_HANDLES.map(([id,name,sub,add])=>{ const on=handle===id; return (
                  <button key={id} type="button" onClick={()=>setHandle(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}>
                    <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{sub}{add>0?` · +${fmt(add)}`:''}</div>
                  </button>); })}
              </div>
            </>)}
            {step===5 && (<>
              <h3 className="display" style={{ fontSize:22, color:'var(--ink)', margin:'0 0 4px' }}>{t('sw2WrStep5')}</h3>
              <p style={{ fontSize:14, color:'var(--ink-soft)', margin:'0 0 14px' }}>{t('sw2WrStep5Sub')}</p>
              <div style={{ background:'var(--sand)', borderRadius:12, padding:'12px 14px', marginBottom:14, fontSize:13.5, color:'var(--ink-soft)', lineHeight:1.7 }}>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2WrShape')}</b> · {sh.name} ({runM.toFixed(1)}m {t('sw2KsRun')})</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2WrStyle')}</b> · {st.name}</div>
                <div><b style={{ color:'var(--ink)' }}>{t('sw2WrWorktopLbl')}</b> · {wt[1]} &nbsp; <b style={{ color:'var(--ink)' }}>{t('sw2WrHandlesLbl')}</b> · {hd[1]}</div>
                <div style={{ marginTop:4 }}><b style={{ color:'var(--clay-deep)' }}>{t('sw2WrEstimate')} · {fmt(est)}</b></div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} aria-label={t('sw2KsYourName')} placeholder={t('sw2KsYourName')} style={inS} />
                <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} aria-label={t('sw2KsPhonePh')} placeholder={t('sw2KsPhonePh')} inputMode="tel" style={inS} />
                <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} aria-label={t('sw2KsEmailOpt')} placeholder={t('sw2KsEmailOpt')} inputMode="email" style={inS} />
                <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
              </div>
              <button type="button" className="btn-clay" disabled={busy} onClick={book} style={{ width:'100%', marginTop:14, borderRadius:14, opacity:busy?.6:1 }}>{busy?t('sw2Sending'):t('sw2WrBookBtn')}</button>
            </>)}

            {/* Nav */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, gap:10 }}>
              {step>1 ? <button type="button" onClick={back} style={{ background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'11px 18px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('pBack')}</button> : <button type="button" aria-label={t('pgClose')} onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button>}
              {step<5 && <button type="button" className="btn-clay" onClick={next} style={{ borderRadius:12, minWidth:140 }}>{t('pContinueArrow')}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenStudioPage({ setPage, user }) {
  const { t, lang } = useI18n();
  const mobile = useMobile();
  const [room, setRoom] = useState({ w:360, l:300 });
  const [wall, setWall] = useState('bottom');
  const [units, setUnits] = useState({ top:[], bottom:[], left:[], right:[] });
  const [styleId, setStyleId] = useState('shaker_oak');
  const [worktop, setWorktop] = useState('quartz');
  const [handle, setHandle] = useState('bar');
  const [tab, setTab] = useState('units');
  const [showBook, setShowBook] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name:user?.name||'', phone:user?.phone||'', email:user?.email||'', date:'' });

  const st = KITCHEN_STYLES.find(s=>s.id===styleId) || KITCHEN_STYLES[0];
  const wt = KITCHEN_WORKTOPS.find(w=>w[0]===worktop) || KITCHEN_WORKTOPS[0];
  const hd = KITCHEN_HANDLES.find(h=>h[0]===handle) || KITCHEN_HANDLES[0];
  const all = [...units.top, ...units.bottom, ...units.left, ...units.right];
  const unitsSum = all.reduce((s,u)=>s+u.price,0);
  const baseRunM = all.filter(u=>u.tier==='base'||u.tier==='tall').reduce((s,u)=>s+u.w,0)/100;
  const handlesAdd = all.length * (handle==='handleless'?12:handle==='brass'?8:0);
  const est = Math.max(0, Math.round(unitsSum*st.mult + (KU_WT[worktop]||0)*baseRunM + handlesAdd + wt[3]*0));
  const add = (u) => setUnits(s => ({ ...s, [wall]: [...s[wall], { id:uid(), ...u }] }));
  const remove = (w,id) => setUnits(s => ({ ...s, [w]: s[w].filter(u=>u.id!==id) }));
  const clearWall = () => setUnits(s => ({ ...s, [wall]: [] }));

  // 2D top-down plan, scaled to room, units laid along each wall
  const PAD=30, VW=420, VH=340, IW=VW-PAD*2, IH=VH-PAD*2, TH=15;
  const sx=IW/room.w, sy=IH/room.l;
  const colFor = (t)=> t==='wall' ? '#d9c4a8' : t==='tall' ? st.hex : st.hex;
  const wallRects = (key) => {
    const list = units[key]; let off=0; const out=[];
    list.forEach((u,i)=>{
      let x,y,w,h;
      if(key==='bottom'){ w=u.w*sx; h=TH; x=PAD+off; y=PAD+IH-TH; off+=w; }
      else if(key==='top'){ w=u.w*sx; h=TH; x=PAD+off; y=PAD; off+=w; }
      else if(key==='left'){ h=u.w*sy; w=TH; x=PAD; y=PAD+off; off+=h; }
      else { h=u.w*sy; w=TH; x=PAD+IW-TH; y=PAD+off; off+=h; }
      out.push(<rect key={u.id} x={x} y={y} width={Math.max(2,w)} height={Math.max(2,h)} rx="2" fill={colFor(u.tier)} stroke="rgba(0,0,0,.18)" strokeWidth="1" opacity={u.tier==='wall'?0.7:1} />);
    });
    return out;
  };
  const wallHi = (key) => {
    const on = wall===key; const c = on?'var(--clay)':'transparent';
    if(key==='bottom') return <rect x={PAD} y={PAD+IH-TH} width={IW} height={TH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    if(key==='top') return <rect x={PAD} y={PAD} width={IW} height={TH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    if(key==='left') return <rect x={PAD} y={PAD} width={TH} height={IH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
    return <rect x={PAD+IW-TH} y={PAD} width={TH} height={IH} fill="none" stroke={c} strokeWidth="2" rx="2" />;
  };

  const book = async () => {
    if(!contact.name.trim() || !contact.phone.trim()){ toast(t('w4AddNamePhone'),'error'); return; }
    setBusy(true);
    try {
      const cfgId = uid();
      const spec = { product:'kitchen', room, style:styleId, worktop, handle, units:all.map(u=>({key:u.key,name:u.name,w:u.w})), unit_count:all.length, run_metres:Number(baseRunM.toFixed(2)), estimate_bhd:est };
      await api('product_configurations', { method:'POST', body:[{ id:cfgId, customer_id:user?.id||null, customer_name:contact.name||user?.name||null, customer_email:contact.email||user?.email||null, customer_phone:contact.phone||user?.phone||null, product_name:`Kitchen — ${all.length} units, ${st.name} (${baseRunM.toFixed(1)}m)`, configuration:spec, total_price:est, status:'kitchen-plan', share_token:cfgId, created_at:new Date().toISOString() }] });
      const leadId = 'LEAD-'+Date.now().toString(36).toUpperCase();
      const note = [`🍽️ Website Kitchen Planner`, `Room: ${room.w}×${room.l}cm  |  Units: ${all.length}  |  Run: ${baseRunM.toFixed(1)}m`, `Style: ${st.name}  |  Worktop: ${wt[1]}  |  Handles: ${hd[1]}`, `Indicative estimate: BHD ${est}`, contact.date?`Preferred appointment: ${contact.date}`:'', `Plan ref: ${cfgId}`].filter(Boolean).join('\n');
      await api('leads', { method:'POST', body:[{ id:leadId, name:contact.name||'Website Visitor', email:contact.email||null, phone:contact.phone||null, source:'website_kitchen_planner', status:'New', stage:'New', platform:'Website', interest:'Kitchen (planner)', budget:est, value:est, notes:note, created_at:new Date().toISOString() }] });
      toast(t('w4ApptKitchen'),'success');
      setPage('home');
    } catch(e){ toast(t('w4CouldNotSend')+' '+(e?.message||t('w4PleaseTryAgain')),'error'); }
    finally { setBusy(false); }
  };

  const inS = { width:'100%', padding:'12px 14px', border:'1px solid var(--line)', background:'#fff', borderRadius:12, fontSize:15, fontFamily:'inherit', color:'var(--ink)' };
  const wallBtn = (id,label) => { const on=wall===id; return <button type="button" onClick={()=>setWall(id)} style={{ flex:1, padding:'8px 6px', fontSize:12.5, fontWeight:on?700:500, border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', color: on?'var(--clay-deep)':'var(--ink-soft)', borderRadius:10, cursor:'pointer' }}>{label}<div style={{ fontSize:10, color:'var(--muted)', fontWeight:500 }}>{units[id].length} {t('sw2StUnitsLower')}</div></button>; };
  const TABS=[['units',t('sw2StTabUnits')],['room',t('sw2StTabRoom')],['style',t('sw2StTabStyle')],['finish',t('sw2StTabFinish')]];

  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?86:64, paddingBottom:90 }}>
      <div style={{ maxWidth:1180, margin:'0 auto', padding: mobile?'0 16px':'0 28px' }}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>{t('sw2WrEyebrow')}</div>
          <h1 className="display" style={{ fontSize: mobile?30:46, color:'var(--ink)' }}>{t('sw2StTitle')}</h1>
          <p style={{ color:'var(--ink-soft)', fontSize:16, marginTop:10 }}>{t('sw2StSub')}</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1.25fr 1fr', gap:20, alignItems:'start' }}>
          {/* CANVAS + price */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding:18, boxShadow:'var(--shadow)', position: mobile?'static':'sticky', top:96 }}>
            <div style={{ background:'var(--sand)', borderRadius:14, padding:12 }}>
              <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:'auto', display:'block' }} aria-label="Kitchen plan">
                <rect x={PAD} y={PAD} width={IW} height={IH} rx="8" fill="#fff" stroke="#cbbfae" strokeWidth="2" strokeDasharray="5 5" />
                {['top','bottom','left','right'].map(k=><Fragment key={k}>{wallRects(k)}</Fragment>)}
                {['top','bottom','left','right'].map(k=><Fragment key={'h'+k}>{wallHi(k)}</Fragment>)}
                <text x={VW/2} y={VH-8} textAnchor="middle" fontSize="11" fill="var(--muted)">{room.w} × {room.l} cm</text>
              </svg>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:14 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{t('sw2StIndic')} · {all.length} {t('sw2StUnits')} · {baseRunM.toFixed(1)}m</span>
              <span className="display" style={{ fontSize:26, color:'var(--clay)' }}>{fmt(est)}</span>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{st.name} · {wt[1]} {t('sw2StGuideNote').replace('{h}', hd[1])}</div>
            <button type="button" className="btn-clay" disabled={all.length===0} onClick={()=>setShowBook(true)} style={{ width:'100%', marginTop:14, borderRadius:12, opacity:all.length===0?.5:1 }}>{t('sw2StBookBtn')}</button>
          </div>

          {/* TOOLS */}
          <div style={{ background:'#fff', border:'1px solid var(--line)', borderRadius:20, padding: mobile?16:22, boxShadow:'var(--shadow)' }}>
            <div style={{ display:'flex', gap:6, marginBottom:18, overflowX:'auto' }}>
              {TABS.map(([id,label])=>{ const on=tab===id; return <button key={id} type="button" onClick={()=>setTab(id)} style={{ flexShrink:0, padding:'8px 15px', borderRadius:99, border:'none', fontSize:13.5, fontWeight:600, cursor:'pointer', background: on?'var(--clay)':'var(--sand)', color: on?'#fff':'var(--ink-soft)' }}>{label}</button>; })}
            </div>

            {tab==='units' && (<>
              <div style={{ fontSize:12.5, color:'var(--ink-soft)', marginBottom:8 }}>{t('sw2StChooseWall')}</div>
              <div style={{ display:'flex', gap:6, marginBottom:14 }}>{wallBtn('top',t('sw2StTop'))}{wallBtn('bottom',t('sw2StBottom'))}{wallBtn('left',t('sw2StLeft'))}{wallBtn('right',t('sw2StRight'))}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {KU_UNITS.map(u=>(
                  <button key={u.key} type="button" onClick={()=>add(u)} style={{ display:'flex', alignItems:'center', gap:9, textAlign:'left', border:'1px solid var(--line)', background:'var(--cream)', borderRadius:12, padding:'9px 11px', cursor:'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--clay)" strokeWidth="1.6" aria-hidden="true"><path d={u.ic} /></svg>
                    <span style={{ lineHeight:1.2 }}><span style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--ink)' }}>{u.name}</span><span style={{ fontSize:11, color:'var(--muted)' }}>{u.w}cm · {fmt(u.price)}</span></span>
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink)' }}>{t('sw2StOnWall').replace('{wall}', wall)} ({units[wall].length})</span>
                {units[wall].length>0 && <button type="button" onClick={clearWall} style={{ fontSize:12, color:'var(--clay)', background:'none', border:'none', cursor:'pointer' }}>{t('sw2StClearWall')}</button>}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {units[wall].length===0 && <span style={{ fontSize:13, color:'var(--muted)' }}>{t('sw2StNoUnits')}</span>}
                {units[wall].map(u=>(
                  <button key={u.id} type="button" onClick={()=>remove(wall,u.id)} title={t('sw2StRemove')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, border:'1px solid var(--line)', background:'#fff', borderRadius:99, padding:'5px 10px', cursor:'pointer', color:'var(--ink)' }}>{u.name} <span style={{ color:'var(--muted)' }}>×</span></button>
                ))}
              </div>
            </>)}

            {tab==='room' && (<>
              <div style={{ fontSize:12.5, color:'var(--ink-soft)', marginBottom:14 }}>{t('sw2StRoomSize')}</div>
              {[[t('sw2StWidth'),'w'],[t('sw2StLength'),'l']].map(([lbl,k])=>(
                <div key={k} style={{ marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'var(--ink-soft)' }}>{lbl}</span><span style={{ fontSize:14, fontWeight:700, color:'var(--clay)' }}>{room[k]}cm</span></div>
                  <input type="range" min={180} max={700} step={10} value={room[k]} onChange={e=>setRoom(r=>({...r,[k]:parseInt(e.target.value)}))} style={{ width:'100%', accentColor:'var(--clay)' }} />
                </div>
              ))}
            </>)}

            {tab==='style' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {KITCHEN_STYLES.map(s=>{ const on=styleId===s.id; return (
                  <button key={s.id} type="button" onClick={()=>setStyleId(s.id)} style={{ border: on?'2px solid var(--clay)':'1px solid var(--line)', borderRadius:14, overflow:'hidden', background:'#fff', cursor:'pointer', padding:0, textAlign:'left' }}>
                    <div style={{ height:50, background:s.g }} />
                    <div style={{ padding:'8px 10px' }}><div style={{ fontSize:12.5, fontWeight:600, color: on?'var(--clay-deep)':'var(--ink)' }}>{trOpt(s.name, lang)}</div><div style={{ fontSize:10.5, color:'var(--muted)' }}>{trOpt(s.sub, lang)}</div></div>
                  </button>); })}
              </div>
            )}

            {tab==='finish' && (<>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'0 0 8px' }}>{t('sw2StWorktopHead')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {KITCHEN_WORKTOPS.map(([id,name,sub])=>{ const on=worktop===id; return (
                  <button key={id} type="button" onClick={()=>setWorktop(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{sub} · {fmt(KU_WT[id]||0)}/m</div></button>); })}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--ink)', margin:'0 0 8px' }}>{t('sw2StHandlesHead')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {KITCHEN_HANDLES.map(([id,name,sub])=>{ const on=handle===id; return (
                  <button key={id} type="button" onClick={()=>setHandle(id)} style={{ textAlign:'left', border: on?'2px solid var(--clay)':'1px solid var(--line)', background: on?'var(--sand)':'#fff', borderRadius:12, padding:'10px 12px', cursor:'pointer' }}><div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{name}</div><div style={{ fontSize:11, color:'var(--muted)' }}>{sub}</div></button>); })}
              </div>
            </>)}

            <div style={{ marginTop:18, textAlign:'center' }}><button type="button" aria-label={t('pgClose')} onClick={()=>setPage('home')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--muted)' }}>{t('pgClose')}</button></div>
          </div>
        </div>
      </div>

      {/* Book modal */}
      {showBook && (
        <div onClick={()=>!busy&&setShowBook(false)} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(20,16,12,.6)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', padding:18 }}>
          <ModalPanel onClose={()=>!busy&&setShowBook(false)} onClick={e=>e.stopPropagation()} style={{ background:'var(--cream)', border:'1px solid var(--line)', borderRadius:22, maxWidth:440, width:'100%', padding:26 }}>
            <div className="eyebrow" style={{ marginBottom:8 }}>{t('pAlmostThere')}</div>
            <h3 className="display" style={{ fontSize:24, color:'var(--ink)', margin:'0 0 6px' }}>{t('sw2StBookTitle')}</h3>
            <div style={{ background:'var(--sand)', borderRadius:12, padding:'10px 14px', margin:'12px 0', fontSize:13, color:'var(--ink-soft)', lineHeight:1.6 }}>{all.length} {t('sw2StUnits')} · {st.name} · {wt[1]} {t('sw2StWorktopWord')} · <b style={{ color:'var(--clay-deep)' }}>{fmt(est)}</b></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))} aria-label={t('sw2KsYourName')} placeholder={t('sw2KsYourName')} style={inS} />
              <input value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))} aria-label={t('sw2KsPhonePh')} placeholder={t('sw2KsPhonePh')} inputMode="tel" style={inS} />
              <input value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))} aria-label={t('sw2KsEmailOpt')} placeholder={t('sw2KsEmailOpt')} inputMode="email" style={inS} />
              <input type="date" value={contact.date} onChange={e=>setContact(c=>({...c,date:e.target.value}))} style={inS} />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button type="button" onClick={()=>setShowBook(false)} disabled={busy} style={{ flex:1, background:'none', border:'1px solid var(--line)', borderRadius:12, padding:'12px', fontSize:14, fontWeight:600, color:'var(--ink-soft)', cursor:'pointer' }}>{t('sw2Cancel')}</button>
              <button type="button" className="btn-clay" disabled={busy||!contact.name.trim()||!contact.phone.trim()} onClick={book} style={{ flex:2, borderRadius:12, opacity:(busy||!contact.name.trim()||!contact.phone.trim())?.6:1 }}>{busy?t('sw2Sending'):t('sw2StRequestAppt')}</button>
            </div>
          </ModalPanel>
        </div>
      )}
    </div>
  );
}

