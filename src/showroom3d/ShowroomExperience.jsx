/* The mounted 3D experience: canvas + engine + GSAP director + overlays. Everything heavy is created in effects and disposed on unmount. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShowroomEngine } from './3d/engine';
import { createProgress } from './3d/progress';
import { pickTier, readSignals, probeRenderer, isSoftwareRenderer } from './3d/quality';
import { createDirector } from './cinematic/director';
import { HANDOVER, DURATION } from './cinematic/timeline';
import { LookAround } from './navigation/lookAround';
import { useReducedMotion } from '../a11y/motion';
import { t } from './strings';
import LoadingScreen from './ui/LoadingScreen';
import IntroLayer from './ui/IntroLayer';
import Hud from './ui/Hud';
import { withLang } from '../seo/routes';

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

  const paintOverlay = useCallback((s) => {
    if (veilRef.current) veilRef.current.style.opacity = String(s.veil);
    if (logoRef.current) { logoRef.current.style.opacity = String(s.logo); logoRef.current.style.transform = `translate(-50%, -50%) scale(${0.96 + 0.04 * s.logo})`; }
    if (barsRef.current) barsRef.current.style.setProperty('--sr-bars', String(Math.min(1, Math.min(s.t / 3, (DURATION - s.t) / 2.5))));
    if (capRef.current !== s.caption) { capRef.current = s.caption; setCaption(s.caption); }
  }, []);

  const handover = useCallback(() => {
    const a = api.current; if (!a.engine) return;
    if (a.look) a.look.setPose(HANDOVER); else a.look = new LookAround(a.engine.camera, a.engine.canvas, HANDOVER);
    a.look.enable(); setPhase('explore');
  }, []);

  useEffect(() => {
    let cancelled = false, ro = null, onVis = null;
    const q = new URLSearchParams(window.location.search);
    const debug = q.get('debug') === '1';
    const sig = readSignals(); sig.softwareRenderer = isSoftwareRenderer(probeRenderer());
    const tier = pickTier(sig); setTierId(tier);
    const progress = createProgress(); const unsub = progress.subscribe((v) => setPct(v));
    const engine = new ShowroomEngine(canvasRef.current, { tier, lang: langRef.current, progress, adaptive: !sig.override && !debug, aa: debug && q.get('aa') === '0' ? false : null });
    const director = createDirector({
      onUpdate: (s) => {
        engine.setPose(s.cam.p, s.cam.l, s.cam.fov); engine.applyState({ doorOpen: s.doorOpen, led: s.led }); paintOverlay(s);
      },
      onComplete: () => { if (!cancelled) handover(); },
    });
    api.current = { engine, director, progress };
    engine.onFrame = () => { const a = api.current; if (a.look && a.look.active) a.look.update(); };

    (async () => {
      try {
        await engine.init();
      } catch (e) { if (!cancelled) onFail && onFail(e); return; }
      if (cancelled) return;
      ro = new ResizeObserver(() => { const w = wrapRef.current; if (w) engine.setSize(w.clientWidth, w.clientHeight); });
      ro.observe(wrapRef.current);
      engine.setSize(wrapRef.current.clientWidth, wrapRef.current.clientHeight);
      engine.setLanguage(langRef.current);
      engine.start();
      onVis = () => { if (document.hidden) engine.stop(); else engine.start(); };
      document.addEventListener('visibilitychange', onVis);
      if (debug) {
        window.__showroom = {
          ready: true, tier, director, engine,
          seek: (tt) => { director.seek(tt); }, info: () => engine.info(), phase: () => api.current.phaseNow,
          state: () => director.state(), look: () => api.current.look && { yaw: api.current.look.yaw, pitch: api.current.look.pitch, pos: api.current.look.pos },
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
      if (api.current.look) api.current.look.dispose();
      director.kill(); engine.dispose(); api.current = {}; if (window.__showroom) delete window.__showroom;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (api.current.engine && api.current.engine.scene) api.current.engine.setLanguage(lang); }, [lang]);
  useEffect(() => { api.current.phaseNow = phase; }, [phase]);

  const onSkip = () => { const a = api.current; if (!a.director) return; a.director.skip(() => handover()); };
  const onReplay = () => {
    const a = api.current; if (!a.director) return;
    if (a.look) a.look.disable();
    setPhase('intro'); a.director.play();
  };
  const loaded = !loaderOn && phase !== 'loading';
  const intro = phase === 'intro';
  const showHud = phase === 'explore';
  const home = withLang('/', lang);

  return (
    <div className="sr-stage" ref={wrapRef} data-phase={phase} data-loaded={loaded ? '1' : '0'}>
      <canvas ref={canvasRef} className="sr-canvas" tabIndex={-1} aria-label={t('pageTitle', lang)} role="img" />
      <IntroLayer ref={{ veil: veilRef, logo: logoRef, bars: barsRef }} lang={lang} caption={intro ? caption : null} onSkip={onSkip} active={intro} />
      {showHud && <Hud lang={lang} tier={tierId} reduced={reduced} onLang={onLang} onReplay={onReplay} homeHref={home} />}
      {loaderOn ? <LoadingScreen pct={pct} lang={lang} leaving={leaving} /> : null}
    </div>
  );
}
