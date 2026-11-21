// Route chunk "shared_AiYasPage_DesignLabPage" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: AiYasPage, DesignLabPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).

// FileReader → downscaled JPEG data URL (reuses the planner's resize approach).
function yasReadImage(file, cb) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const max = 1024; let w = im.width, h = im.height;
      if (w > h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
      try {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        const u = c.toDataURL('image/jpeg', 0.72);
        cb({ dataUrl: u, media_type: 'image/jpeg', base64: u.split(',')[1] });
      } catch (e) { cb({ dataUrl: rd.result, media_type: 'image/jpeg', base64: String(rd.result).split(',')[1] }); }
    };
    im.onerror = () => cb(null);
    im.src = rd.result;
  };
  rd.onerror = () => cb(null);
  rd.readAsDataURL(file);
}

// A pill chip used across the page.
function YasChip({ active, onClick, children, dark }) {
  const base = dark
    ? { borderColor: active ? 'var(--clay)' : 'rgba(255,255,255,.22)', background: active ? 'var(--clay)' : 'rgba(255,255,255,.06)', color: active ? '#fff' : 'rgba(255,255,255,.9)' }
    : { borderColor: active ? 'var(--clay)' : 'var(--line)', background: active ? 'var(--sand)' : '#fff', color: active ? 'var(--clay-deep)' : 'var(--ink-soft)' };
  return <button type="button" className="yas-chip" onClick={onClick} style={base}>{children}</button>;
}

export { yasReadImage, YasChip };
