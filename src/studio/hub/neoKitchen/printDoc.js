/* [NEO-CUTLIST-UX32] printHtml(html): the one way the new production documents (cut list, nesting sheets, labels) reach the printer.
 *  - the document is written into a HIDDEN SAME-ORIGIN IFRAME, so the Hub's global print CSS, the .app-root wrapper, a dark theme and the
 *    Neo studios' own `body > *:not(...) { display:none }` print rules can never hide or clip it (the cause of the blank "Print / PDF");
 *  - waits for images (logo, pictures) and fonts, then calls print() on the iframe window; cleans up on afterprint (or after 2 minutes);
 *  - it can be called twice in a row (every call owns its iframe);
 *  - if the iframe cannot print it falls back to a new window; if that is blocked it resolves { ok:false, reason:'blocked' } so the caller can toast.
 * `impl.print(win)` and `impl.open()` are injectable for tests. Returns a Promise<{ ok, via, reason }>. */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function ready(win, maxMs = 4000) {
  const t0 = Date.now();
  try { if (win.document.fonts && win.document.fonts.ready) await Promise.race([win.document.fonts.ready, wait(1500)]); } catch (e) { /* ignore */ }
  while (Date.now() - t0 < maxMs) {
    const imgs = [...win.document.images];
    if (imgs.every((i) => i.complete)) break;
    await wait(60);
  }
  await wait(30);
}

export async function printHtml(html, { title = '', impl = {}, doc = typeof document !== 'undefined' ? document : null, keepMs = 120000 } = {}) {
  if (!doc) return { ok: false, reason: 'nodoc' };
  const doPrint = impl.print || ((w) => { w.focus(); w.print(); });
  let ifr = null;
  try {
    ifr = doc.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true'); ifr.setAttribute('title', title || 'print');
    ifr.style.cssText = 'position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    doc.body.appendChild(ifr);
    const w = ifr.contentWindow; const d = w.document;
    d.open(); d.write(html); d.close();
    if (title) { try { d.title = title; } catch (e) { /* ignore */ } }
    await ready(w);
    const cleanup = () => { try { if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr); } catch (e) { /* ignore */ } };
    try { w.addEventListener('afterprint', () => setTimeout(cleanup, 300)); } catch (e) { /* ignore */ }
    setTimeout(cleanup, keepMs);
    doPrint(w);
    return { ok: true, via: 'iframe' };
  } catch (e) {
    try { if (ifr && ifr.parentNode) ifr.parentNode.removeChild(ifr); } catch (e2) { /* ignore */ }
    try {
      const pw = impl.open ? impl.open() : (typeof window !== 'undefined' ? window.open('', '_blank') : null);
      if (!pw) return { ok: false, reason: 'blocked' };
      pw.document.open(); pw.document.write(html); pw.document.close();
      await ready(pw);
      doPrint(pw);
      return { ok: true, via: 'window' };
    } catch (e3) { return { ok: false, reason: 'blocked' }; }
  }
}
