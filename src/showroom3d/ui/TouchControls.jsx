import React, { useRef } from 'react';
import { t } from '../strings';

const isTap = (g, e) => Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 10 && performance.now() - g.t0 < 380;
const R = 56;            // joystick travel radius in CSS px
const DEAD = 0.1;        // dead zone (fraction of the travel)
const JOG_AT = 0.97;     // push the thumb to the very rim to jog

/**
 * Touch overlay: a floating virtual joystick on the LEFT half, a look area on the RIGHT half, and a round Interact button.
 * Every gesture lives on its own element with pointer capture and `touch-action: none`, so page scroll / pinch-zoom never see it and the
 * two thumbs work independently (multi-touch). A second finger landing in a zone that is already tracking one is ignored.
 * The joystick stays physically on the left and the look area on the right in Arabic / RTL too (thumb ergonomics do not mirror).
 */
export default function TouchControls({ lang, explorerRef, onInteract }) {
  const joy = useRef({ id: null, cx: 0, cy: 0, sx: 0, sy: 0, t0: 0 }), look = useRef({ id: null, x: 0, y: 0, sx: 0, sy: 0, t0: 0 });
  const baseRef = useRef(null), thumbRef = useRef(null), zoneRef = useRef(null);
  const ex = () => explorerRef.current;

  const joyDown = (e) => {
    if (joy.current.id !== null) return;
    const z = zoneRef.current, b = baseRef.current, rect = z.getBoundingClientRect();
    try { z.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    const m = R + 12;
    const cx = Math.min(rect.right - m, Math.max(rect.left + m, e.clientX)), cy = Math.min(rect.bottom - m, Math.max(rect.top + m, e.clientY));
    joy.current = { id: e.pointerId, cx, cy, sx: e.clientX, sy: e.clientY, t0: performance.now() };
    b.style.left = (cx - rect.left) + 'px'; b.style.top = (cy - rect.top) + 'px'; b.style.bottom = 'auto'; b.classList.add('is-active');
    joyMove(e);
  };
  const joyMove = (e) => {
    const j = joy.current; if (j.id !== e.pointerId) return;
    const dx = e.clientX - j.cx, dy = e.clientY - j.cy, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / R);
    const nx = dx / len, ny = dy / len, m = k < DEAD ? 0 : (k - DEAD) / (1 - DEAD);
    thumbRef.current.style.transform = `translate(${nx * Math.min(len, R)}px, ${ny * Math.min(len, R)}px)`;
    if (ex()) ex().touchMove(nx * m, -ny * m, k >= JOG_AT);
  };
  const joyUp = (e) => {
    const j = joy.current; if (j.id !== e.pointerId) return;
    joy.current = { id: null, cx: 0, cy: 0, sx: 0, sy: 0, t0: 0 };
    if (e.type === 'pointerup' && isTap(j, e) && ex()) ex().tap(e.clientX, e.clientY);          // a quick tap (not a drag) on a drawer / door works it
    const b = baseRef.current; b.classList.remove('is-active'); b.style.left = b.style.top = b.style.bottom = ''; thumbRef.current.style.transform = '';
    if (ex()) ex().touchMove(0, 0, false);
  };
  const lookDown = (e) => { if (look.current.id !== null) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } look.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now() }; };
  const lookMove = (e) => { const l = look.current; if (l.id !== e.pointerId) return; const dx = e.clientX - l.x, dy = e.clientY - l.y; l.x = e.clientX; l.y = e.clientY; if (ex()) ex().touchLook(dx, dy); };
  const lookUp = (e) => { const l = look.current; if (l.id !== e.pointerId) return; look.current = { id: null, x: 0, y: 0, sx: 0, sy: 0, t0: 0 }; if (e.type === 'pointerup' && isTap(l, e) && ex()) ex().tap(e.clientX, e.clientY); };
  const noMenu = (e) => e.preventDefault();

  return (
    <div className="sr-touch" data-testid="sr-touch">
      <div className="sr-lookzone" role="group" aria-label={t('lookAria', lang)} data-testid="sr-lookzone" onPointerDown={lookDown} onPointerMove={lookMove} onPointerUp={lookUp} onPointerCancel={lookUp} onContextMenu={noMenu} />
      <div className="sr-joyzone" ref={zoneRef} role="group" aria-label={t('joystickAria', lang)} data-testid="sr-joyzone" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp} onContextMenu={noMenu}>
        <div className="sr-joy" ref={baseRef} data-testid="sr-joy" aria-hidden="true"><i className="sr-joy-thumb" ref={thumbRef} /></div>
      </div>
      <button type="button" className="sr-interact" onClick={onInteract} aria-label={t('interactAria', lang)} data-testid="sr-interact">{t('interactBtn', lang)}</button>
    </div>
  );
}
