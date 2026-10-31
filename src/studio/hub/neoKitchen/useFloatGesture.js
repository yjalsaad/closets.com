/* Neo Kitchen Designer UX-23 / Neo Wardrobe UX-24 - the drag / resize / keyboard gestures of the floating assistant window, as one hook so the kitchen's
 * AssistantPanel and the wardrobe's WardrobeAssistant behave identically. Pure rules live in floatRect.js; this only wires pointer + key events to them.
 * `rect` is the window box (px, from the top-left of the .nk-body), `bounds` = { w, h } of that body, `docked` windows never float. */
import { useRef } from 'react';
import { moveFloatRect, resizeFloatRect, FLOAT } from './floatRect';

export function useFloatGesture({ docked = false, rect, bounds, rtl = false, onRect, onRectCommit }) {
  const floating = !docked && !!rect && !!onRect;
  const gesture = useRef(null);
  const rectRef = useRef(rect); rectRef.current = rect;
  const startGesture = (kind) => (e) => {
    if (!floating || (e.button !== undefined && e.button !== 0)) return;
    if (kind === 'move' && e.target.closest && e.target.closest('button, input, a')) return;
    e.preventDefault(); if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind, x: e.clientX, y: e.clientY, r: rect };
  };
  const moveGesture = (e) => {
    const g = gesture.current; if (!g) return;
    const dx = e.clientX - g.x; const dy = e.clientY - g.y;
    onRect(g.kind === 'move' ? moveFloatRect(g.r, dx, dy, bounds.w, bounds.h) : resizeFloatRect(g.r, rtl ? -dx : dx, dy, bounds.w, bounds.h, rtl));
  };
  const endGesture = (e) => {
    if (!gesture.current) return;
    if (e.currentTarget.releasePointerCapture) { try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    gesture.current = null; if (onRectCommit) onRectCommit(rectRef.current);
  };
  const keyGesture = (kind) => (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || !floating) return;
    e.preventDefault();
    const st = (e.shiftKey ? FLOAT.bigStep : FLOAT.step);
    const r = kind === 'move' ? moveFloatRect(rect, d[0] * st, d[1] * st, bounds.w, bounds.h) : resizeFloatRect(rect, (rtl ? -d[0] : d[0]) * st, d[1] * st, bounds.w, bounds.h, rtl);
    onRect(r); if (onRectCommit) onRectCommit(r);
  };
  return { floating, startGesture, moveGesture, endGesture, keyGesture };
}
