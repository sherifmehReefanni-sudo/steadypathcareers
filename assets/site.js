/* Shared pieces: logo, dawn scene, helpers. */
window.SP = (function () {
  var LOGO = '<svg viewBox="0 0 800 800" aria-hidden="true"><defs><clipPath id="lc"><circle cx="400" cy="400" r="400"/></clipPath></defs><circle cx="400" cy="400" r="400" fill="#1F3A5F"/><g clip-path="url(#lc)"><circle cx="400" cy="318" r="92" fill="#C9A227"/><rect x="0" y="330" width="800" height="470" fill="#1F3A5F"/><path d="M 383 330 C 380 470, 250 560, 230 800 L 570 800 C 550 560, 420 470, 417 330 Z" fill="#FBF6EE"/><circle cx="400" cy="760" r="14" fill="#C9A227"/><circle cx="400" cy="690" r="12" fill="#C9A227"/><circle cx="400" cy="625" r="10" fill="#C9A227"/><circle cx="400" cy="565" r="8" fill="#C9A227"/><circle cx="400" cy="510" r="6.5" fill="#C9A227"/><circle cx="400" cy="460" r="5" fill="#C9A227"/><circle cx="400" cy="415" r="4" fill="#C9A227"/><circle cx="400" cy="375" r="3" fill="#C9A227"/></g><path d="M 120 330 L 383 330 M 417 330 L 680 330" stroke="#C9A227" stroke-width="12" stroke-linecap="round"/></svg>';
  function scene(h, uid) {
    h = h || 250; uid = uid || 'a';
    return '<svg class="scene" viewBox="0 0 1200 ' + h + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
      '<radialGradient id="g' + uid + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F2D98A" stop-opacity=".9"/><stop offset="1" stop-color="#F2D98A" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="r' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6EDD9"/><stop offset="1" stop-color="#FBF6EE"/></linearGradient>' +
      '<linearGradient id="h1' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E4C78"/><stop offset="1" stop-color="#1F3A5F"/></linearGradient></defs>' +
      '<g transform="translate(0 ' + (h - 360) + ')"><ellipse class="glow" cx="600" cy="236" rx="420" ry="150" fill="url(#g' + uid + ')"/><circle class="sun" cx="600" cy="236" r="64" fill="#C9A227"/>' +
      '<path d="M0 250 C 180 200, 300 240, 420 236 L 780 236 C 900 232, 1040 205, 1200 245 L 1200 360 L 0 360 Z" fill="url(#h1' + uid + ')"/>' +
      '<path d="M0 276 C 160 256, 260 268, 380 262 L 820 262 C 960 258, 1080 250, 1200 270 L 1200 360 L 0 360 Z" fill="#1F3A5F"/>' +
      '<path d="M 588 236 C 584 290, 420 330, 300 360 L 900 360 C 780 330, 616 290, 612 236 Z" fill="url(#r' + uid + ')"/>' +
      '<path class="dash" d="M600 360 L600 250" stroke="#C9A227" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 26" fill="none"/>' +
      '<path d="M 200 236 L 588 236 M 612 236 L 1000 236" stroke="#C9A227" stroke-width="5" stroke-linecap="round" opacity=".9"/></g></svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(s) { if (!s) return ''; var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return String(s); return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function daysFrom(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / 864e5); }
  function toast(t) { var el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.remove(); }, 2200); }
  function greeting(name) { var h = new Date().getHours(); var g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; return g + (name ? ', ' + name : '') + '.'; }
  document.querySelectorAll('[data-logo]').forEach(function (el) { el.innerHTML = LOGO; });
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/sw.js'); } catch (e) {} }
  // Mobile menu on public pages: built from the top bar's own links.
  (function () {
    var bar = document.querySelector('.topbar'), links = bar && bar.querySelector('.links');
    if (!bar || !links) return;
    var btn = document.createElement('button');
    btn.className = 'mnav-btn'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    bar.appendChild(btn);
    var panel = document.createElement('nav');
    panel.className = 'mnav wrap'; panel.setAttribute('aria-label', 'Menu');
    var h = '';
    links.querySelectorAll('a').forEach(function (a) { h += '<a href="' + esc(a.getAttribute('href')) + '">' + esc(a.textContent) + '</a>'; });
    if (!/\/portal\//.test(location.pathname)) h += '<a class="signin" href="/portal/">Client sign in</a>';
    h += '<a class="gold" href="/start/">Start free</a>';
    panel.innerHTML = h;
    bar.parentNode.insertBefore(panel, bar.nextSibling);
    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  })();
  return { LOGO: LOGO, scene: scene, esc: esc, fmtDate: fmtDate, daysFrom: daysFrom, toast: toast, greeting: greeting };
})();
