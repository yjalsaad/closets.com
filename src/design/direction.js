// Art-direction preview switch for the HOME page (exploration branch only; nothing here changes the default site).
//   preview : append ?direction=a|b|c to the URL; the choice is kept for the tab session. ?direction=off (or default) clears it.
//   a = Noir & Champagne   (dark cinematic)       b = Washi & Oak (light gallery)       c = Forest & Brass (bold modern)
// The attribute lands on <html data-direction>, which re-themes tokens (src/design/directions.css) and swaps the home composition.
export const DIRECTIONS = ['a', 'b', 'c'];
const KEY = 'closets_direction_preview';

export function resolveDirection() {
  try {
    const q = new URLSearchParams(window.location.search).get('direction');
    if (q === 'off' || q === 'default' || q === '') { try { window.sessionStorage.removeItem(KEY); } catch (e) { /* private mode */ } return null; }
    if (DIRECTIONS.includes(q)) { try { window.sessionStorage.setItem(KEY, q); } catch (e) { /* private mode */ } return q; }
    let s = null; try { s = window.sessionStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (DIRECTIONS.includes(s)) return s;
  } catch (e) { /* no window (prerender / tests) */ }
  return null;
}

export function applyDirection() {
  if (typeof document === 'undefined') return null;
  const d = resolveDirection();
  if (d) document.documentElement.setAttribute('data-direction', d); else document.documentElement.removeAttribute('data-direction');
  return d;
}

export function currentDirection() {
  if (typeof document === 'undefined') return null;
  const d = document.documentElement.getAttribute('data-direction');
  return DIRECTIONS.includes(d) ? d : null;
}
