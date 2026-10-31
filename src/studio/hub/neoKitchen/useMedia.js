/* Neo Kitchen / Neo Wardrobe - live media-query flag (tablet / phone layouts); false where matchMedia does not exist.
 * Shared by NeoKitchenDesigner and NeoWardrobeStudio. */
import { useState, useEffect } from 'react';

export function useMedia(q) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(q); const f = () => setM(mq.matches); f();
    if (mq.addEventListener) mq.addEventListener('change', f); else mq.addListener(f);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', f); else mq.removeListener(f); };
  }, [q]);
  return m;
}
