/* Neo Kitchen Designer UX-23 - the drag handle between two workspace columns (Parameters | stage | assistant).
 * An ARIA window splitter: role="separator" + aria-valuenow/min/max, focusable, pointer drag (with pointer capture, so the drag survives
 * leaving the 8px handle), arrow keys (Shift = bigger step), Home / End to the limits, Enter / double-click to reset. It only reports a width;
 * the owner decides what to do with it (state + remembered preference). `dir` = +1 when moving the pointer toward the inline-end enlarges
 * the column (the Parameters panel), -1 for the column on the other side (the assistant); RTL flips the pointer axis, never the meaning. */
import React, { useRef, useState } from 'react';
import { LAYOUT, clampWidth, widthFromDrag, widthFromKey } from './layoutLogic';

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Delete'];

export default function PanelResizer({ kind, value, onChange, onCommit, dir = 1, rtl = false, label }) {
  const drag = useRef(null);
  const [on, setOn] = useState(false);
  const r = kind === 'asst' ? LAYOUT.ASST : LAYOUT.PANEL;
  const sign = dir * (rtl ? -1 : 1);
  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: value }; setOn(true);
  };
  const move = (e) => { const d = drag.current; if (d) onChange(widthFromDrag(kind, d.w, e.clientX - d.x, sign)); };
  const up = (e) => {
    if (!drag.current) return;
    if (e.currentTarget.releasePointerCapture) e.currentTarget.releasePointerCapture(e.pointerId);
    drag.current = null; setOn(false); if (onCommit) onCommit();
  };
  const key = (e) => {
    if (!KEYS.includes(e.key)) return;
    e.preventDefault();
    /* arrows are physical: in RTL the inline-end is on the left, so the two horizontal arrows swap before the shared rule reads them */
    const k = rtl && e.key === 'ArrowLeft' ? 'ArrowRight' : rtl && e.key === 'ArrowRight' ? 'ArrowLeft' : e.key;
    const w = widthFromKey(kind, value, k, e.shiftKey, dir);
    if (w !== value) onChange(clampWidth(kind, w));
    if (onCommit) onCommit();
  };
  return (
    <div className="nk-resizer" role="separator" aria-orientation="vertical" tabIndex={0} aria-label={label} aria-valuemin={r.min} aria-valuemax={r.max} aria-valuenow={value}
      data-kind={kind} data-active={on ? '1' : '0'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
      onDoubleClick={() => { onChange(r.def); if (onCommit) onCommit(); }} title={label}>
      <i aria-hidden="true" />
    </div>
  );
}
