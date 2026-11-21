// Theme switch. Two complete themes share the same tokens (src/design/tokens.css): "warm" (default) and "sea".
//   build time : REACT_APP_THEME=warm|sea   (public/index.html writes it on <html data-theme>)
//   preview    : append ?theme=sea or ?theme=warm to any URL; the choice is kept for the tab session (sessionStorage)
//   reset      : ?theme=default
export const THEMES = ['warm', 'sea'];
export const DEFAULT_THEME = THEMES.includes(process.env.REACT_APP_THEME) ? process.env.REACT_APP_THEME : 'warm';
const KEY = 'closets_theme_preview';

export function resolveTheme() {
  try {
    const q = new URLSearchParams(window.location.search).get('theme');
    if (q === 'default') { try { window.sessionStorage.removeItem(KEY); } catch (e) { /* private mode */ } return DEFAULT_THEME; }
    if (THEMES.includes(q)) { try { window.sessionStorage.setItem(KEY, q); } catch (e) { /* private mode */ } return q; }
    let s = null; try { s = window.sessionStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (THEMES.includes(s)) return s;
  } catch (e) { /* no window (prerender / tests) */ }
  return DEFAULT_THEME;
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const t = THEMES.includes(theme) ? theme : resolveTheme();
  document.documentElement.setAttribute('data-theme', t);
  try { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'sea' ? '#f1f5f4' : '#f5f1ea'); } catch (e) { /* ignore */ }
  return t;
}
