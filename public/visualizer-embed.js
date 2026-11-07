/*! The Closets Room Visualizer — website embed [ROOM-VIZ 2026-11-07]
 * 1) Inline visualizer:
 *      <div data-closets-visualizer data-room="kitchen" data-mode="2d" data-lang="en" style="height:640px"></div>
 *      <script src="https://closets-website.vercel.app/visualizer-embed.js" async></script>
 * 2) "Visualize" buttons on any product page (opens a full-screen visualizer with that product applied):
 *      <button data-closets-visualize="vp_carrara">See it in a room</button>
 * 3) Floating launcher on every page (colour, side, text and delay set in Bonsai → Digital Showroom → Visualizer settings):
 *      <div data-closets-visualizer-widget data-lang="ar"></div>
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
  var SUPA = 'https://jflmbfxbhpioyniibjsj.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0';  // public anon key (same one the website ships)
  function widget() {
    var el = document.querySelector('[data-closets-visualizer-widget]:not([data-cv-done])'); if (!el) return;
    el.setAttribute('data-cv-done', '1');
    var lang = el.getAttribute('data-lang') || (document.documentElement.lang || '').slice(0, 2);
    var ar = lang === 'ar';
    var draw = function (w) {
      w = w || {};
      var b = document.createElement('button'); b.type = 'button';
      b.textContent = '\u2728 ' + ((ar ? w.label_ar : w.label_en) || (ar ? '\u0634\u0627\u0647\u062f \u063a\u0631\u0641\u062a\u0643' : 'Visualize your room'));
      b.setAttribute('aria-label', b.textContent.slice(2));
      b.style.cssText = 'position:fixed;bottom:20px;' + (w.position === 'left' ? 'left' : 'right') + ':20px;z-index:2147482000;padding:12px 18px;border:0;border-radius:999px;cursor:pointer;' +
        'font:700 14px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.22);background:' + (/^#[0-9a-f]{3,8}$/i.test(w.color || '') ? w.color : '#A94A22') + ';direction:' + (ar ? 'rtl' : 'ltr');
      b.onclick = function () { open(null, lang); };
      setTimeout(function () { document.body.appendChild(b); }, Math.max(0, Math.min(60, Number(w.delay_s) || 0)) * 1000);
    };
    try {
      var x = new XMLHttpRequest(); x.open('POST', SUPA + '/rest/v1/rpc/viz_public_settings'); x.setRequestHeader('Content-Type', 'application/json');
      x.setRequestHeader('apikey', KEY); x.setRequestHeader('Authorization', 'Bearer ' + KEY);
      x.onload = function () { var j = null; try { j = JSON.parse(x.responseText); } catch (e) { /* defaults */ } draw(j && j.widget); };
      x.onerror = function () { draw(null); }; x.send('{}');
    } catch (e) { draw(null); }
  }
  function boot() { inline(); widget(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
