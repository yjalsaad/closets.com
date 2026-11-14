/* The mounted 3D experience: canvas + engine + GSAP director + overlays. Everything heavy is created in effects and disposed on unmount. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import StaffChat from './ui/StaffChat';
import { ShowroomEngine } from './3d/engine';
import { createProgress } from './3d/progress';
import { pickTier, readSignals, probeRenderer, isSoftwareRenderer } from './3d/quality';
import { createDirector } from './cinematic/director';
import { HANDOVER, DURATION } from './cinematic/timeline';
import gsap from 'gsap';
import { Explorer } from './navigation/explorer';
import { useReducedMotion } from '../a11y/motion';
import { t } from './strings';
import LoadingScreen from './ui/LoadingScreen';
import IntroLayer from './ui/IntroLayer';
import Hud from './ui/Hud';
import { DeptMenu, PauseMenu, CoachMarks } from './ui/Menus';
import { ProductPanel, CampaignPanel } from './ui/ProductPanel';
import { VipPanel } from './ui/VipPanel';
import { withLang } from '../seo/routes';

const COACH_KEY = 'closets_showroom_coach', BOB_KEY = 'closets_showroom_bob';
const readFlag = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (x) { return d; } };
const writeFlag = (k, v) => { try { localStorage.setItem(k, v); } catch (x) { /* private mode etc. */ } };
/** touch overlay from the start on phones / tablets (coarse primary pointer, or a touch screen on a small display); later input flips it either way */
const coarse = (q) => {
  try {
    if (q.get('touch') === '1') return true;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    return (navigator.maxTouchPoints || 0) > 0 && Math.min(window.innerWidth, window.innerHeight) <= 820 && !(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  } catch (x) { return false; }
};

export default function ShowroomExperience({ lang, onLang, onFail }) {
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const langRef = useRef(lang); langRef.current = lang;
  const canvasRef = useRef(null), wrapRef = useRef(null);
  const veilRef = useRef(null), logoRef = useRef(null), barsRef = useRef(null);
  const api = useRef({});       // engine / director / look controller for handlers
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState('loading');   // loading | intro | explore
  const [leaving, setLeaving] = useState(false);
  const [loaderOn, setLoaderOn] = useState(true);
  const [caption, setCaption] = useState(null);
  const [tierId, setTierId] = useState('high');
  const capRef = useRef(null);
  const explorerRef = useRef(null);
  const [st, setSt] = useState({});
  const [touch, setTouch] = useState(() => coarse(new URLSearchParams(window.location.search)));
  const [deptOpen, setDeptOpen] = useState(false);
  const [coach, setCoach] = useState(false);
  const [chat, setChat] = useState(null);       // staff id of the open adviser chat
  const [bubble, setBubble] = useState(null);     // the Reception greeting bubble
  const [bob, setBob] = useState(() => readFlag(BOB_KEY, '1') !== '0');

  const paintOverlay = useCallback((s) => {
    if (veilRef.current) veilRef.current.style.opacity = String(s.veil);
    if (logoRef.current) { logoRef.current.style.opacity = String(s.logo); logoRef.current.style.transform = `translate(-50%, -50%) scale(${0.96 + 0.04 * s.logo})`; }
    if (barsRef.current) barsRef.current.style.setProperty('--sr-bars', String(Math.min(1, Math.min(s.t / 3, (DURATION - s.t) / 2.5))));
    if (capRef.current !== s.caption) { capRef.current = s.caption; setCaption(s.caption); }
  }, []);

  const handover = useCallback(() => {
    const a = api.current; if (!a.engine || !a.explorer) return;
    a.explorer.enable(HANDOVER); setPhase('explore'); setCoach(readFlag(COACH_KEY, '0') !== '1');
  }, []);

  useEffect(() => {
    let cancelled = false, ro = null, onVis = null;
    const q = new URLSearchParams(window.location.search);
    const debug = q.get('debug') === '1';
    const sig = readSignals(); sig.softwareRenderer = isSoftwareRenderer(probeRenderer());
    const tier = pickTier(sig); setTierId(tier);
    const progress = createProgress(); const unsub = progress.subscribe((v) => setPct(v));
    const engine = new ShowroomEngine(canvasRef.current, { tier, lang: langRef.current, progress, adaptive: !sig.override && !debug, aa: debug && q.get('aa') === '0' ? false : null, bloom: !(debug && q.get('bloom') === '0') });
    const director = createDirector({
      onUpdate: (s) => {
        engine.setPose(s.cam.p, s.cam.l, s.cam.fov); engine.applyState({ doorOpen: s.doorOpen, led: s.led }); paintOverlay(s);
      },
      onComplete: () => { if (!cancelled) handover(); },
    });
    if (debug && q.get('scale')) engine.scale = Math.max(0.3, Math.min(1, parseFloat(q.get('scale')) || 1));   // QA: render at a fraction of the resolution (software GL is slow)
    if (debug) engine.maxDt = 0.5;    // QA under software GL runs at ~1-2 fps: let animations (drawers, doors) finish in fewer frames
    api.current = { engine, director, progress };
    const explorer = new Explorer({ engine, canvas: canvasRef.current, reduced: reducedRef.current, bob: readFlag(BOB_KEY, '1') !== '0' && !reducedRef.current, onState: (p) => setSt((s) => ({ ...s, ...p })) });
    api.current.explorer = explorer; explorerRef.current = explorer;
    engine.onFrame = (dt) => explorer.update(dt);

    (async () => {
      try {
        await engine.init();
      } catch (e) { if (!cancelled) onFail && onFail(e); return; }
      if (cancelled) return;
      if (engine.products) engine.products.setReduced(reducedRef.current);   // the products are built after the first render of this component: apply the reduced-motion setting now
      ro = new ResizeObserver(() => { const w = wrapRef.current; if (w) engine.setSize(w.clientWidth, w.clientHeight); });
      ro.observe(wrapRef.current);
      engine.setSize(wrapRef.current.clientWidth, wrapRef.current.clientHeight);
      engine.setLanguage(langRef.current);
      engine.start();
      onVis = () => { if (document.hidden) engine.stop(); else engine.start(); };
      document.addEventListener('visibilitychange', onVis);
      if (debug) {
        gsap.ticker.lagSmoothing(0);   // QA under software GL runs at ~1 fps: let GSAP keep real time so glides finish in their real duration
        window.__showroom = {
          ready: true, tier, director, engine,
          seek: (tt) => { director.seek(tt); }, info: () => engine.info(), phase: () => api.current.phaseNow,
          state: () => director.state(), explore: explorer.debug(),
        };
      }
      // fade the loader out; the cinematic (or the static reveal) starts underneath
      setLeaving(true); setTimeout(() => { if (!cancelled) setLoaderOn(false); }, 700);
      const at = q.get('at');
      if (reducedRef.current) { director.finish(); handover(); }
      else if (debug && at !== null) { director.seek(parseFloat(at)); setPhase('intro'); }
      else if (debug && q.get('autoplay') === '0') { director.seek(0); setPhase('intro'); }
      else { setPhase('intro'); director.play(); }
    })();

    return () => {
      cancelled = true; unsub(); if (ro) ro.disconnect(); if (onVis) document.removeEventListener('visibilitychange', onVis);
      explorer.dispose(); explorerRef.current = null;
      director.kill(); engine.dispose(); api.current = {}; if (window.__showroom) delete window.__showroom;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (api.current.engine && api.current.engine.scene) api.current.engine.setLanguage(lang); }, [lang]);
  useEffect(() => { api.current.phaseNow = phase; }, [phase]);

  // keep the explorer in sync with the UI
  useEffect(() => { const x = explorerRef.current; if (x) { x.setReduced(reduced); x.setBob(bob && !reduced); } const e = api.current.engine; if (e && e.products) e.products.setReduced(reduced); }, [reduced, bob]);
  useEffect(() => { const x = explorerRef.current; if (x) x.setUiOpen(deptOpen || !!st.paused || !!chat); }, [deptOpen, st.paused, chat]);
  useEffect(() => { if (st.talk && st.talkN) { setBubble(null); setChat(st.talk); } }, [st.talkN]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (st.greet === 'reception' && st.greetN && !chat) { setBubble(true); const id = setTimeout(() => setBubble(null), 6500); return () => clearTimeout(id); } return undefined; }, [st.greetN]);   // eslint-disable-line react-hooks/exhaustive-deps
  // the control scheme follows the last input device (touch overlay for fingers, keyboard + mouse otherwise)
  useEffect(() => {
    const f = (e) => setTouch(e.pointerType === 'touch');
    window.addEventListener('pointerdown', f, true); return () => window.removeEventListener('pointerdown', f, true);
  }, []);

  const canvasFocus = () => canvasRef.current;
  const onResume = (click) => { const x = explorerRef.current; if (!x) return; x.resume(); x.setUiOpen(false); if (click && !touch) x.requestLock(); };
  const onPick = (id) => { setDeptOpen(false); const x = explorerRef.current; if (x) { x.setUiOpen(false); x.glideTo(id); } };
  const onInteract = () => { const x = explorerRef.current; if (x) x.interact(); };
  const onBob = () => { const v = !bob; setBob(v); writeFlag(BOB_KEY, v ? '1' : '0'); };
  const closeCoach = () => { setCoach(false); writeFlag(COACH_KEY, '1'); };
  const onSkip = () => { const a = api.current; if (!a.director) return; a.director.skip(() => handover()); };
  const onReplay = () => {
    const a = api.current; if (!a.director) return;
    if (a.explorer) a.explorer.disable();
    setDeptOpen(false); setCoach(false); setPhase('intro'); a.director.play();
  };
  const loaded = !loaderOn && phase !== 'loading';
  const intro = phase === 'intro';
  const showHud = phase === 'explore';
  const home = withLang('/', lang);

  return (
    <div className="sr-stage" ref={wrapRef} data-phase={phase} data-touch={touch ? "1" : "0"} data-loaded={loaded ? '1' : '0'} data-focus={st.focus ? '1' : '0'}>
      <canvas ref={canvasRef} className="sr-canvas" tabIndex={-1} aria-label={t('pageTitle', lang)} role="img" />
      <IntroLayer ref={{ veil: veilRef, logo: logoRef, bars: barsRef }} lang={lang} caption={intro ? caption : null} onSkip={onSkip} active={intro} />
      {showHud && <Hud lang={lang} tier={tierId} touch={touch} st={st} explorerRef={explorerRef} homeHref={home} onDepts={() => setDeptOpen(true)} onMenu={() => explorerRef.current && explorerRef.current.pause()} onInteract={onInteract} onTalk={() => { const x = explorerRef.current; if (x) x.talkToStaff(); }} chatOpen={!!chat} coach={coach} />}
      {showHud && st.focus && (st.focusKind === 'vip' ? <VipPanel lang={lang} touch={touch} explorerRef={explorerRef} st={st} /> : st.focusKind === 'stage' ? <CampaignPanel lang={lang} touch={touch} explorerRef={explorerRef} st={st} /> : <ProductPanel lang={lang} touch={touch} explorerRef={explorerRef} st={st} />)}
      {showHud && chat && <StaffChat lang={lang} reduced={reduced} explorerRef={explorerRef} engineRef={api} staffId={chat} onClose={() => { setChat(null); const c = canvasRef.current; if (c && c.focus) c.focus({ preventScroll: true }); }} />}
      {showHud && bubble && !chat && <p className="sr-bubble" role="status" data-testid="sr-greet-bubble">{t('chatGreetBubble', lang)}</p>}
      {showHud && coach && !st.paused && !deptOpen && !st.focus && <CoachMarks lang={lang} touch={touch} onDone={closeCoach} />}
      {showHud && deptOpen && <DeptMenu lang={lang} touch={touch} onPick={onPick} onClose={() => setDeptOpen(false)} fallbackFocus={canvasFocus} />}
      {showHud && st.paused && <PauseMenu lang={lang} touch={touch} reduced={reduced} bob={bob} explorerRef={explorerRef} st={st} homeHref={home} onResume={onResume} onDepts={() => { onResume(false); setDeptOpen(true); }} onReplay={onReplay} onLang={onLang} onBob={onBob} onTips={() => { onResume(false); setCoach(true); }} fallbackFocus={canvasFocus} />}
      {loaderOn ? <LoadingScreen pct={pct} lang={lang} leaving={leaving} /> : null}
    </div>
  );
}
