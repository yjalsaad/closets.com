/* [IKHTARHA GAMES 2026-11-09] Shared effects: synthesized sound (no audio files; off until the visitor turns it on), confetti, value text. */
import React, { useEffect, useRef } from 'react';

let ctx = null; let muted = true;
try { muted = localStorage.getItem('ikg_sound') !== 'on'; } catch (e) { muted = true; }
export const isMuted = () => muted;
export const setMuted = (m) => { muted = m; try { localStorage.setItem('ikg_sound', m ? 'off' : 'on'); } catch (e) { /* ignore */ } };
const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
function tone(f, t0, dur, type = 'sine', vol = 0.12, slideTo) {
  const c = ac(); if (!c) return; const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
export function sfx(kind) {
  if (muted) return;
  try {
    if (kind === 'tap') tone(660, 0, 0.08, 'triangle', 0.08);
    else if (kind === 'tick') tone(1200, 0, 0.03, 'square', 0.03);
    else if (kind === 'whoosh') tone(220, 0, 0.45, 'sawtooth', 0.04, 880);
    else if (kind === 'flip') tone(520, 0, 0.07, 'triangle', 0.07, 780);
    else if (kind === 'match') { tone(784, 0, 0.12, 'triangle', 0.08); tone(1047, 0.08, 0.16, 'triangle', 0.08); }
    else if (kind === 'clunk') tone(140, 0, 0.18, 'square', 0.06, 70);
    else if (kind === 'win') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.42, 'triangle', 0.1));
    else if (kind === 'soft') [392, 330].forEach((f, i) => tone(f, i * 0.14, 0.3, 'sine', 0.08));
  } catch (e) { /* audio is optional */ }
}

export const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

export function Confetti({ on }) {
  const cv = useRef(null);
  useEffect(() => {
    if (!on || reduced() || !cv.current) return undefined;
    const c = cv.current; const g = c.getContext('2d'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (c.width = window.innerWidth * dpr), H = (c.height = window.innerHeight * dpr);
    const cols = ['#D9692F', '#FFB066', '#4B1F24', '#F7F2EC', '#C9A35A'];
    const ps = Array.from({ length: 150 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45, vx: (Math.random() - 0.5) * 22 * dpr, vy: (-Math.random() * 20 - 8) * dpr,
      s: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: cols[Math.floor(Math.random() * cols.length)] }));
    let raf; let t = 0;
    const step = () => {
      t++; g.clearRect(0, 0, W, H);
      ps.forEach((p) => { p.vy += 0.55 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - t / 160); g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (t < 170) raf = requestAnimationFrame(step); else g.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return <canvas ref={cv} className="ikg-confetti" aria-hidden="true" />;
}

const nf = (n, ar) => Number(n || 0).toLocaleString(ar ? 'ar-BH' : 'en-BH', { maximumFractionDigits: 3 });
export function valueText(r, ar) {
  if (!r) return '';
  if (r.type === 'percent') return ar ? `خصم ${nf(r.value, ar)}٪` : `${nf(r.value)}% off`;
  if (r.type === 'fixed') return ar ? `${nf(r.value, ar)} د.ب` : `BD ${nf(r.value)}`;
  return ar ? r.name_ar : r.name_en;
}
export const money = (n, ar) => (ar ? `${Number(n || 0).toLocaleString('ar-BH', { maximumFractionDigits: 3 })} د.ب` : 'BD ' + Number(n || 0).toFixed(3));
