/* Shared pieces: logo, dawn scene, helpers. */
window.SP = (function () {
  function mark(u) { return '<svg aria-hidden="true" viewBox="0 0 100 100"><defs><linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F3A5F"/><stop offset="0.7" stop-color="#5A5F8E"/><stop offset="1" stop-color="#B9786A"/></linearGradient><clipPath id="' + u + 'r"><rect width="100" height="100" rx="22"/></clipPath></defs><g clip-path="url(#' + u + 'r)"><rect width="100" height="100" fill="#1F3A5F"/><rect width="100" height="40" fill="url(#' + u + 's)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-72 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-48 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-24 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(24 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(48 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(72 50 40)"/><path d="M49.0 41.1 L49.1 42.3 L49.2 43.6 L49.6 44.8 L50.0 45.9 L50.6 46.9 L51.2 47.9 L51.9 48.8 L52.7 49.6 L53.5 50.4 L54.3 51.2 L55.2 52.0 L56.0 52.7 L56.8 53.4 L57.6 54.1 L58.4 54.8 L59.1 55.5 L59.7 56.2 L60.2 56.8 L60.7 57.5 L61.0 58.2 L61.3 58.9 L61.4 59.5 L61.5 60.2 L61.4 60.9 L61.3 61.6 L61.0 62.0 L60.6 62.4 L60.0 62.9 L59.2 63.4 L58.2 63.9 L57.0 64.4 L55.6 64.8 L54.1 65.3 L52.5 65.7 L50.8 66.1 L49.0 66.5 L47.2 66.9 L45.4 67.4 L43.6 67.8 L41.8 68.3 L40.1 68.9 L38.4 69.6 L36.8 70.5 L35.2 71.5 L33.7 72.9 L32.4 74.6 L31.5 76.7 L31.2 78.7 L31.1 80.0 L31.1 81.0 L31.1 82.0 L31.2 83.1 L31.4 84.1 L31.6 85.0 L31.8 86.0 L32.2 86.9 L32.5 87.9 L33.0 88.8 L33.4 89.7 L33.9 90.5 L34.4 91.3 L35.0 92.1 L35.6 92.9 L36.2 93.7 L36.8 94.4 L37.5 95.2 L38.2 95.9 L38.9 96.6 L39.6 97.3 L40.3 97.9 L41.1 98.6 L41.8 99.2 C49.83 104.73 58.24 92.31 50.20 86.79 L49.4 86.4 L48.8 86.1 L48.1 85.7 L47.5 85.4 L46.9 85.1 L46.3 84.8 L45.8 84.5 L45.3 84.2 L44.8 83.9 L44.4 83.6 L44.0 83.3 L43.6 83.0 L43.2 82.7 L42.9 82.4 L42.6 82.1 L42.3 81.9 L42.1 81.6 L41.9 81.3 L41.6 81.0 L41.4 80.6 L41.3 80.3 L41.1 79.9 L41.0 79.5 L40.8 79.3 L40.7 78.9 L40.7 78.6 L41.0 78.2 L41.5 77.7 L42.3 77.1 L43.4 76.5 L44.7 75.9 L46.1 75.3 L47.7 74.7 L49.3 74.1 L51.0 73.5 L52.7 72.9 L54.5 72.3 L56.2 71.6 L57.9 70.9 L59.5 70.2 L61.1 69.4 L62.5 68.4 L63.8 67.3 L65.0 66.0 L65.9 64.5 L66.4 62.8 L66.6 61.1 L66.4 59.6 L66.0 58.3 L65.5 57.1 L64.9 56.0 L64.2 55.0 L63.4 54.1 L62.5 53.3 L61.7 52.6 L60.7 51.9 L59.8 51.3 L58.9 50.7 L58.0 50.1 L57.1 49.5 L56.2 48.9 L55.4 48.3 L54.6 47.6 L53.8 47.0 L53.2 46.3 L52.6 45.6 L52.1 44.8 L51.6 44.0 L51.3 43.1 L51.1 42.1 L51.0 40.9 Z" fill="#FAF6EC"/><rect x="60.36" y="54.61" width="1.81" height="0.56" rx="0.28" transform="rotate(45.8 61.27 54.89)" fill="#E3B23C"/><rect x="61.36" y="64.02" width="2.55" height="0.79" rx="0.40" transform="rotate(131.7 62.64 64.42)" fill="#E3B23C"/><rect x="46.22" y="70.08" width="3.38" height="1.05" rx="0.53" transform="rotate(163.6 47.91 70.60)" fill="#E3B23C"/><rect x="33.95" y="77.37" width="4.28" height="1.33" rx="0.67" transform="rotate(100.9 36.09 78.04)" fill="#E3B23C"/><rect x="35.15" y="84.55" width="5.28" height="1.64" rx="0.82" transform="rotate(58.6 37.79 85.37)" fill="#E3B23C"/><rect x="39.30" y="89.41" width="6.21" height="1.93" rx="0.97" transform="rotate(39.1 42.40 90.38)" fill="#E3B23C"/><path d="M36 40 A14 14 0 0 1 64 40 Z" fill="#FFD166"/><rect x="0" y="38.4" width="100" height="3.2" fill="#E3B23C"/></g></svg>'; }
  var LOGO = mark('spl');
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
  document.querySelectorAll('[data-logo]').forEach(function (el, i) { el.innerHTML = mark('spl' + i); });
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
  // r30: light and dark themes. The page follows the system setting until the visitor picks one with the
  // header button; the pick is kept in localStorage ("sp-theme") and applied before first paint by a tiny script in <head>.
  var THEME_KEY = 'sp-theme', de = document.documentElement, mq = null;
  try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) {}
  function themeNow() { var t = de.getAttribute('data-theme'); if (t === 'light' || t === 'dark') return t; return mq && mq.matches ? 'dark' : 'light'; }
  function themeLabel(m) { return m === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; }
  function themeBtn() {
    var m = themeNow();
    return '<button type="button" class="theme-btn" data-theme-toggle data-mode="' + m + '" aria-label="' + themeLabel(m) + '" title="' + themeLabel(m) + '">' +
      '<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
      '<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
  }
  function themeSync() {
    var m = themeNow();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { b.setAttribute('data-mode', m); b.setAttribute('aria-label', themeLabel(m)); b.setAttribute('title', themeLabel(m)); });
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) { if (!tc.hasAttribute('data-light')) tc.setAttribute('data-light', tc.getAttribute('content') || ''); tc.setAttribute('content', m === 'dark' ? '#0E1A2C' : tc.getAttribute('data-light')); }
  }
  function themeSet(m) { de.setAttribute('data-theme', m); try { localStorage.setItem(THEME_KEY, m); } catch (e) {} themeSync(); }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!b) return;
    themeSet(themeNow() === 'dark' ? 'light' : 'dark');
  });
  if (mq) { var onMq = function () { themeSync(); }; if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
  (function () {
    var bar = document.querySelector('.topbar');
    if (!bar || bar.querySelector('[data-theme-toggle]')) return;
    var holder = document.createElement('span'); holder.innerHTML = themeBtn();
    var btn = holder.firstChild, menu = bar.querySelector('.mnav-btn');
    if (menu) bar.insertBefore(btn, menu); else bar.appendChild(btn);
  })();
  themeSync();
  return { LOGO: LOGO, mark: mark, scene: scene, themeBtn: themeBtn, themeSync: themeSync, esc: esc, fmtDate: fmtDate, daysFrom: daysFrom, toast: toast, greeting: greeting };
})();
