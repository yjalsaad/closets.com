// Loads Google <model-viewer> on demand (it used to be a global <script> in public/index.html: ~254 KB gzip
// + a third-party connection on every route). Only the product-AR block calls this, and only for products that
// actually have a 3D model. Idempotent; safe to call from effects.
const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

export function loadModelViewer() {
  if (typeof document === 'undefined') return;
  try {
    if (window.customElements && window.customElements.get('model-viewer')) return;
    if (document.getElementById('model-viewer-script')) return;
    const s = document.createElement('script');
    s.id = 'model-viewer-script';
    s.type = 'module';
    s.src = MODEL_VIEWER_SRC;
    document.head.appendChild(s);
  } catch (e) { /* AR preview is progressive enhancement; the poster image still shows */ }
}
