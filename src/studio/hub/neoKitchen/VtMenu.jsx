/* Neo Kitchen Designer UX-23 - a popover for the viewport tools column that is placed by measurement (position: fixed), so the column can
 * scroll on a short screen without clipping its menus: it opens on the stage side of the button, aligned to the button's top, and is moved up
 * when it would run off the bottom of the window. `anchorRef` = the button's wrapper.
 * UX-24: the wrapper's ref is attached AFTER this child's layout effect on the commit that opens the menu, so the first measurement can miss the
 * anchor; the menu is therefore placed again on the next frame (and on resize), which is what makes it appear beside its button the first time. */
import React, { useLayoutEffect, useEffect, useRef } from 'react';

export default function VtMenu({ anchorRef, rtl = false, className = '', children, ...rest }) {
  const el = useRef(null);
  const place = () => {
    const a = anchorRef && anchorRef.current; const m = el.current; if (!a || !m || typeof window === 'undefined') return;
    const b = a.getBoundingClientRect(); const h = m.offsetHeight;
    m.style.top = `${Math.max(8, Math.min(b.top, window.innerHeight - h - 12))}px`;
    if (rtl) { m.style.left = `${b.right + 8}px`; m.style.right = 'auto'; } else { m.style.right = `${Math.max(8, window.innerWidth - b.left + 8)}px`; m.style.left = 'auto'; }
  };
  useLayoutEffect(place);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.requestAnimationFrame ? window.requestAnimationFrame(place) : 0;
    window.addEventListener('resize', place);
    return () => { if (id && window.cancelAnimationFrame) window.cancelAnimationFrame(id); window.removeEventListener('resize', place); };
  });
  return <div ref={el} className={`${className} nk-menu-fixed`} {...rest}>{children}</div>;
}
