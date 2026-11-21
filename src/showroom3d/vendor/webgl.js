/* VENDORED for the add-only YAS Bloom port (docs/showroom3d/ADDON-PORT.md). Copy of the website-integration branch file; kept here so the main site needs no changes. Do not import from the rest of the app. */
// webgl.js — one cached capability probe. Used by <WebGLGate> and anything that wants to
// pick a non-3D alternative before three.js throws "Error creating WebGL context".
let cached = null;
export function webglAvailable() {
  if (cached !== null) return cached;
  try {
    if (typeof document === 'undefined') return (cached = false);
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    cached = !!(gl && typeof gl.getParameter === 'function');
    try { const lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) { /* ignore */ }
  } catch (e) { cached = false; }
  return cached;
}
export function _resetWebglCache() { cached = null; }
