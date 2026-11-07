/*! The Closets Room Visualizer — website embed [ROOM-VIZ 2026-11-07]
 * 1) Inline visualizer:
 *      <div data-closets-visualizer data-room="kitchen" data-mode="2d" data-lang="en" style="height:640px"></div>
 *      <script src="https://closets-website.vercel.app/visualizer-embed.js" async></script>
 * 2) "Visualize" buttons on any product page (opens a full-screen visualizer with that product applied):
 *      <button data-closets-visualize="vp_carrara">See it in a room</button>
 */
(function () {
  var s = document.currentScript; var base = (s && s.src ? s.src.replace(/\/visualizer-embed\.js.*$/, '') : 'https://closets-website.vercel.app');
  function url(o) {
    var q = []; for (var k in o) if (o[k]) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k]));
    return base + '/visualizer/embed' + (q.length ? '?' + q.join('&') : '');
  }
  function frame(src) {
    var f = document.createElement('iframe'); f.src = src; f.title = 'The Closets Room Visualizer'; f.loading = 'lazy';
    f.allow = 'fullscreen; gyroscope; accelerometer; clipboard-write'; f.style.cssText = 'width:100%;height:100%;border:0;display:block;border-radius:12px;';
    return f;
  }
  function inline() {
    var els = document.querySelectorAll('[data-closets-visualizer]:not([data-cv-done])');
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; el.setAttribute('data-cv-done', '1'); if (!el.style.height) el.style.height = '640px';
      el.appendChild(frame(url({ room: el.getAttribute('data-room'), product: el.getAttribute('data-product'), mode: el.getAttribute('data-mode'), lang: el.getAttribute('data-lang') })));
    }
  }
  function open(pid, lang) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:2vh 2vw;';
    var box = document.createElement('div'); box.style.cssText = 'position:relative;width:100%;height:100%;max-width:1400px;background:#fff;border-radius:14px;overflow:hidden;';
    var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    x.style.cssText = 'position:absolute;top:10px;right:10px;z-index:2;width:40px;height:40px;border-radius:50%;border:0;background:#fff;font:600 24px/1 sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.2);cursor:pointer;';
    var close = function () { document.body.removeChild(wrap); document.removeEventListener('keydown', esc); };
    var esc = function (e) { if (e.key === 'Escape') close(); };
    x.onclick = close; wrap.onclick = function (e) { if (e.target === wrap) close(); }; document.addEventListener('keydown', esc);
    box.appendChild(frame(url({ product: pid, lang: lang }))); box.appendChild(x); wrap.appendChild(box); document.body.appendChild(wrap);
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-closets-visualize]');
    if (t) { e.preventDefault(); open(t.getAttribute('data-closets-visualize'), t.getAttribute('data-lang')); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inline); else inline();
})();
