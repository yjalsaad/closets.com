/* [IKHTARHA 2026-11-08 · SCRATCH] Scratch-card game for a reward campaign.
 * A brand-coloured metallic foil (campaign colours + logo) covers the prize. The server draws the prize on the first scratch
 * (onStart → ikh_reveal, idempotent) — the card never knows prizes in advance. When about half the foil is gone, the rest
 * melts away, the card pops and onDone() hands over to the reward screen. "Reveal all" does the same without scratching
 * (keyboard / accessibility). Reduced motion: no dust, no wobble; the foil simply fades. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { rewardValueText } from './certificate';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (x) => Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((x) => f(x).toString(16).padStart(2, '0')).join(''); };

export default function ScratchCard({ ar, brand = {}, gameName, firstName, drawLabel, reduced, onStart, onDone }) {
  const wrap = useRef(null); const cv = useRef(null); const last = useRef(null); const moves = useRef(0);
  const [reward, setReward] = useState(null); const [started, setStarted] = useState(false); const [cleared, setCleared] = useState(false);
  const [pct, setPct] = useState(0); const done = useRef(false); const req = useRef(null);
  const T = (en, a) => (ar ? a : en);
  const accent = HEX.test(brand.accent || '') ? brand.accent : '#23807C'; const primary = HEX.test(brand.primary || '') ? brand.primary : '#4A2C82';

  // paint the foil
  useEffect(() => {
    const c = cv.current; if (!c) return undefined;
    const paint = () => {
      const r = c.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.globalCompositeOperation = 'source-over';
      const w = r.width, h = r.height;
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, shade(accent, -0.25)); gr.addColorStop(0.35, shade(accent, 0.35)); gr.addColorStop(0.5, '#9FDDD8'); gr.addColorStop(0.65, shade(accent, 0.2)); gr.addColorStop(1, shade(accent, -0.35));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.12; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
      for (let x = -h; x < w; x += 7) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
      g.globalAlpha = 1;
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.3, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([6, 6]); g.lineWidth = 1.5; g.strokeRect(10, 10, w - 20, h - 20); g.setLineDash([]);
      g.fillStyle = shade(primary, -0.2); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 ${Math.round(h * 0.13)}px ${getComputedStyle(c).fontFamily}`; g.fillText(T('Scratch here', 'امسح هنا'), w / 2, h * 0.62);
      g.font = `600 ${Math.round(h * 0.075)}px ${getComputedStyle(c).fontFamily}`; g.fillStyle = 'rgba(40,10,14,.75)'; g.fillText(T('to reveal your reward', 'لتكشف جائزتك'), w / 2, h * 0.78);
      if (brand.logo_light) {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { if (started) return; const lh = h * 0.3; const lw = (img.width / img.height) * lh; g.globalAlpha = 0.9; g.drawImage(img, (w - lw) / 2, h * 0.12, lw, lh); g.globalAlpha = 1; };
        img.src = brand.logo_light.startsWith('http') ? brand.logo_light : window.location.origin + brand.logo_light;
      }
    };
    paint();
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = useCallback(() => {
    if (req.current) return req.current;
    setStarted(true);
    req.current = Promise.resolve(onStart()).then((r) => { if (r && r.ok && r.reward) setReward(r.reward); return r; });
    return req.current;
  }, [onStart]);

  const finish = useCallback(async () => {
    if (done.current) return; done.current = true;
    const r = await begin(); setCleared(true);
    setTimeout(() => onDone(r), reduced ? 200 : 1800);
  }, [begin, onDone, reduced]);

  const measure = () => {
    const c = cv.current; const g = c.getContext('2d'); const { data } = g.getImageData(0, 0, c.width, c.height); let clear = 0, tot = 0;
    for (let i = 3; i < data.length; i += 4 * 24) { tot++; if (data[i] < 40) clear++; }
    const p = tot ? clear / tot : 0; setPct(p); if (p > 0.5 && reward !== undefined) finish();
  };
  const dust = (x, y) => {
    if (reduced || !wrap.current) return;
    const s = document.createElement('span'); s.className = 'ik-sc-dust'; s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px'); s.style.background = Math.random() < 0.5 ? accent : '#9FDDD8';
    wrap.current.appendChild(s); setTimeout(() => s.remove(), 700);
  };
  const scratch = (ev) => {
    if (done.current) return;
    const c = cv.current; const r = c.getBoundingClientRect(); const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const g = c.getContext('2d'); g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(30, r.width * 0.11);
    g.beginPath(); const p0 = last.current || { x, y }; g.moveTo(p0.x, p0.y); g.lineTo(x, y); g.stroke();
    g.beginPath(); g.arc(x, y, g.lineWidth / 2, 0, Math.PI * 2); g.fill();
    last.current = { x, y };
    if (++moves.current % 3 === 0) dust(x, y);
    if (moves.current % 10 === 0) measure();
  };
  const down = (ev) => { ev.preventDefault(); try { cv.current.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ } last.current = null; begin(); scratch(ev); };
  const move = (ev) => { if (ev.buttons === 0 && ev.pointerType === 'mouse') { last.current = null; return; } if (last.current !== null || ev.pointerType !== 'mouse') scratch(ev); };
  const up = () => { last.current = null; measure(); };

  const value = reward ? rewardValueText(reward, ar) : '';
  return (
    <main className="ik-scratch-wrap">
      <div className="ik-scratch-head">
        {(firstName || drawLabel) && <p className="ik-eyebrow">{firstName ? T('Welcome, ', 'أهلًا ') + firstName : ''}{drawLabel ? <span className="ik-draw-chip" data-testid="ik-draw-label">{drawLabel}</span> : null}</p>}
        <h2>{cleared ? T('Your reward is here!', 'جائزتك وصلت!') : T('Scratch the card', 'امسح البطاقة')}</h2>
        <p className="ik-muted">{T('Use your finger or mouse to scratch the gold foil.', 'استخدم إصبعك أو الماوس لمسح الطبقة الذهبية.')}</p>
      </div>
      <div ref={wrap} className={'ik-scratch' + (cleared ? ' is-cleared' : '') + (started ? ' is-started' : '')} style={{ '--sc-accent': accent, '--sc-primary': primary }} data-testid="ik-scratch">
        <div className="ik-scratch-prize" aria-live="polite">
          <span className="ik-scratch-eyebrow">{gameName} · {T('Your reward', 'جائزتك')}</span>
          {reward ? (<>
            <b className="ik-scratch-value" dir="auto" data-testid="ik-scratch-value">{value}</b>
            <span className="ik-scratch-name">{ar ? reward.name_ar : reward.name_en}</span>
          </>) : <span className="ik-scratch-wait"><span className="ik-spin" /></span>}
        </div>
        <canvas ref={cv} className="ik-scratch-foil" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true" />
        {!started && !reduced && <span className="ik-scratch-coin" aria-hidden="true">🪙</span>}
      </div>
      <div className="ik-scratch-foot">
        <div className="ik-scratch-bar" aria-hidden="true"><i style={{ width: Math.round(Math.min(1, pct / 0.5) * 100) + '%' }} /></div>
        <button type="button" className="ik-btn ik-btn-ghost" onClick={finish} disabled={cleared} data-testid="ik-scratch-all">{T('Reveal all', 'اكشف الكل')}</button>
      </div>
    </main>
  );
}
