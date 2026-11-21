/* The study document, kept ON THIS DEVICE ONLY (localStorage, same mechanism and guards as vip/deckStore.js). Two keys: the working copy and the
 * "original" (the last file / sample the person loaded), which "Reset to original" restores. Reads are re-sanitised, so edited or corrupted storage
 * can never reach the renderer. The bundle (export / import) carries the study and its images as data URLs so it moves between devices. */
import { sanitizeStudy, imageIds, LIMITS } from './model';
import { checkDataUrl, DATA_URL, ERR as UERR } from './upload';

export const DOC_KEY = 'sr3d.yasWoodStudy.v1', BASE_KEY = 'sr3d.yasWoodStudy.base.v1';
export const ERR = { blocked: 'blocked', full: 'full', corrupt: 'corrupt' };
const defaultStorage = () => { try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (e) { return null; } };

export function makeStudyStore(getStorage = defaultStorage) {
  const st = () => { try { return getStorage(); } catch (e) { return null; } };
  const read = (key) => {
    const s = st(); if (!s) return { study: null, error: ERR.blocked };
    let txt; try { txt = s.getItem(key); } catch (e) { return { study: null, error: ERR.blocked }; }
    if (!txt) return { study: null, error: null };
    const r = sanitizeStudy(txt); return r.ok ? { study: r.study, error: null } : { study: null, error: ERR.corrupt };
  };
  const write = (key, study) => {
    const s = st(); if (!s) return ERR.blocked;
    const txt = JSON.stringify(study); if (txt.length > LIMITS.maxChars) return ERR.full;
    try { s.setItem(key, txt); return null; } catch (e) { return /quota/i.test((e && (e.name + e.message)) || '') ? ERR.full : ERR.blocked; }
  };
  return {
    load: () => read(DOC_KEY), loadBase: () => read(BASE_KEY),
    save: (study) => write(DOC_KEY, study),
    /** a freshly loaded file / sample becomes both the working copy and the original */
    saveBoth(study) { const e = write(DOC_KEY, study); return e || write(BASE_KEY, study); },
    clear() { const s = st(); if (!s) return ERR.blocked; try { s.removeItem(DOC_KEY); s.removeItem(BASE_KEY); return null; } catch (e) { return ERR.blocked; } },
  };
}
export const studyStore = makeStudyStore();

/** { v: 1, kind: 'yas-wood-study', study, images: { id: 'data:image/webp;base64,...' } } */
export const BUNDLE_KIND = 'yas-wood-study';
export function makeBundle(study, images = {}) { return { v: 1, kind: BUNDLE_KIND, study, images }; }
/** parse an exported / imported file: -> { ok, study, images, errors, warnings } ; images that fail the type / magic-number check are dropped with a warning */
export function parseBundle(text) {
  const r = sanitizeStudy(text); if (!r.ok) return { ok: false, study: null, images: {}, errors: r.errors, warnings: r.warnings };
  let raw = null; try { raw = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { raw = null; }
  const warnings = r.warnings.slice(), images = {}, wanted = new Set(imageIds(r.study));
  const src = raw && raw.images && typeof raw.images === 'object' && !Array.isArray(raw.images) ? raw.images : {};
  Object.keys(src).slice(0, 80).forEach((id) => {
    if (!wanted.has(id)) return; const v = src[id];
    if (typeof v !== 'string' || !DATA_URL.test(v)) { warnings.push(`Image "${id}" was skipped (not a JPEG, PNG or WebP data address).`); return; }
    const bad = checkDataUrl(v); if (bad) { warnings.push(`Image "${id}" was skipped (${bad === UERR.sniff ? 'its content is not the declared type' : bad === UERR.big ? 'too large' : 'unreadable'}).`); return; }
    images[id] = v;
  });
  wanted.forEach((id) => { if (!images[id] && !(src[id])) warnings.push(`Image "${id}" is not in the file: the slot stays empty until an image is uploaded.`); });
  return { ok: true, study: r.study, images, errors: [], warnings };
}
