/* Steady Path Careers, public pages: reveals, the scroll-drawn path, light parallax.
   Rules: nothing is hidden unless this script is running, and nothing moves with reduced motion. */
(function () {
  'use strict';
  var d = document, de = d.documentElement, w = window;
  var RM = false;
  try { RM = w.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  de.classList.add(RM ? 'rm' : 'motion');
  var hasIO = 'IntersectionObserver' in w;

  /* 1. Reveals: only things below the first screen get hidden, and only until they scroll in. */
  var revs = [].slice.call(d.querySelectorAll('[data-reveal], .stagger'));
  var lives = [].slice.call(d.querySelectorAll('[data-live]'));
  if (!RM && hasIO) {
    var vh = w.innerHeight || 800;
    /* Hiding only takes effect once .reveal-ready is set, which happens inside the observer's first callback.
       If anything fails before that, .pre does nothing and the page stays fully visible. */
    /* Start the reveal before a section reaches the screen (rootMargin 15% below), so content is already fading in as it
       arrives. A scroll check also shows anything that is on or above the screen at once, so a fast scroll, an anchor jump
       or a restored scroll position never leaves a blank area waiting on the observer. */
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(e.target); });
      if (!de.classList.contains('reveal-ready')) de.classList.add('reveal-ready');
    }, { rootMargin: '0px 0px 15% 0px', threshold: 0 });
    var pending = [];
    function show(el) { el.classList.remove('pre'); io.unobserve(el); }
    function sweep() {
      var lim = (w.innerHeight || vh) * 1.05;
      pending = pending.filter(function (el) { if (el.getBoundingClientRect().top < lim) { show(el); return false; } return true; });
      if (!pending.length) { w.removeEventListener('scroll', onScroll); w.removeEventListener('resize', onScroll); w.removeEventListener('hashchange', onScroll); }
    }
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; (w.requestAnimationFrame || setTimeout)(function () { ticking = false; sweep(); }); }
    revs.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add('pre'); io.observe(el); pending.push(el); }
    });
    if (pending.length) {
      w.addEventListener('scroll', onScroll, { passive: true }); w.addEventListener('resize', onScroll); w.addEventListener('hashchange', onScroll);
      w.addEventListener('beforeprint', function () { pending.forEach(show); pending = []; });
      w.addEventListener('pageshow', onScroll);
    }
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('live'); lio.unobserve(e.target); } });
    }, { threshold: 0.2 });
    lives.forEach(function (el) { lio.observe(el); });
  } else {
    lives.forEach(function (el) { el.classList.add('live'); });
  }
  /* Pause looping illustration animations while they are off screen. */
  if (!RM && hasIO) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('off', !e.isIntersecting); });
    }, { rootMargin: '80px 0px 80px 0px' });
    [].slice.call(d.querySelectorAll('[data-live], .phero-art, .finale')).forEach(function (el) { pio.observe(el); });
  }
  /* Print: open every FAQ answer so nothing is left out. */
  w.addEventListener('beforeprint', function () { [].slice.call(d.querySelectorAll('details')).forEach(function (x) { x.open = true; }); });
  /* Escape closes the mobile menu and returns focus to its button. */
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var panel = d.querySelector('.mnav.open'), btn = d.querySelector('.mnav-btn');
    if (panel && btn) { btn.click(); btn.focus(); }
  });
  (function () { var panel = d.querySelector('.mnav'), btn = d.querySelector('.mnav-btn'); if (panel && btn) { if (!panel.id) panel.id = 'mnav'; btn.setAttribute('aria-controls', panel.id); } })();

  /* 2. The path: one line down the page, drawn as you scroll, with a marker at each section. */
  var main = d.querySelector('[data-trail]');
  var NS = 'http://www.w3.org/2000/svg';
  var T = null, VH = w.innerHeight || 800;
  function el(n, a) { var x = d.createElementNS(NS, n); for (var k in a) x.setAttribute(k, a[k]); return x; }
  /* The line is split into small SVG pieces (a narrow one down each section, a short one for each crossing),
     so scrolling only repaints a small area. */
  function build() {
    if (!main) return;
    var miles = [].slice.call(main.querySelectorAll('[data-mile]')).filter(function (s) { return s.offsetHeight > 0; });
    if (!miles.length) return;
    var mr = main.getBoundingClientRect(), W = main.clientWidth, H = main.offsetHeight;
    if (!W || !H) return;
    var gut = (W - Math.min(W, 1100)) / 2, wide = gut >= 100;
    var X = function (i) { if (!wide) return 9; var g = Math.max(36, gut / 2); return i % 2 ? W - g : g; };
    var amp = wide ? 16 : 0, pieces = [], sy = 0, R = wide ? 8 : 6;
    miles.forEach(function (s, i) {
      var r = s.getBoundingClientRect(), top = r.top - mr.top, bot = r.bottom - mr.top, x = X(i);
      var my = top + Math.min(84, r.height * 0.25), last = i === miles.length - 1;
      var end = last ? bot - Math.min(60, r.height * 0.2) : bot - 34;
      if (!i) sy = Math.max(2, top + 10);
      var p = 'M' + x + ' ' + sy.toFixed(1) + ' L' + x + ' ' + my.toFixed(1), h = end - my;
      if (h > 20) p += ' C' + (x + amp) + ' ' + (my + h / 3).toFixed(1) + ' ' + (x - amp) + ' ' + (my + 2 * h / 3).toFixed(1) + ' ' + x + ' ' + end.toFixed(1);
      else end = my;
      pieces.push({ d: p, x0: x - amp - 14, x1: x + amp + 14, y0: sy - 14, y1: end + 14, mark: { x: x, y: my }, s: s });
      if (!last) {
        var n = miles[i + 1].getBoundingClientRect(), nTop = n.top - mr.top, nx = X(i + 1), ny = nTop + 34;
        pieces.push({ d: 'M' + x + ' ' + end.toFixed(1) + ' C' + x + ' ' + (bot + 8).toFixed(1) + ' ' + nx + ' ' + (nTop - 8).toFixed(1) + ' ' + nx + ' ' + ny.toFixed(1),
          x0: Math.min(x, nx) - 14, x1: Math.max(x, nx) + 14, y0: end - 14, y1: ny + 14 });
        sy = ny;
      }
    });
    if (T) T.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    T = { nodes: [], segs: [], top: mr.top + (w.pageYOffset || de.scrollTop) };
    var svg0 = el('svg', { 'class': 'trail', 'aria-hidden': 'true', focusable: 'false', width: 0, height: 0 }), defs = el('defs', {});
    var gr = el('linearGradient', { id: 'trailg', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H });
    [['0', '#C9A227'], ['.45', '#E9A23B'], ['.75', '#D9783F'], ['1', '#F2D98A']].forEach(function (s) { gr.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
    defs.appendChild(gr); svg0.appendChild(defs); main.insertBefore(svg0, main.firstChild); T.nodes.push(svg0);
    pieces.forEach(function (g) {
      var x0 = Math.floor(Math.max(0, g.x0)), x1 = Math.ceil(Math.min(W, g.x1)), y0 = Math.floor(g.y0), y1 = Math.ceil(g.y1), ww = Math.max(1, x1 - x0), hh = Math.max(1, y1 - y0);
      var svg = el('svg', { 'class': 'trail', 'aria-hidden': 'true', focusable: 'false', viewBox: x0 + ' ' + y0 + ' ' + ww + ' ' + hh, width: ww, height: hh });
      svg.style.left = x0 + 'px'; svg.style.top = y0 + 'px'; svg.style.width = ww + 'px'; svg.style.height = hh + 'px';
      var track = el('path', { 'class': 'track', d: g.d }), line = el('path', { 'class': 'line', d: g.d, stroke: 'url(#trailg)' });
      svg.appendChild(track); svg.appendChild(line);
      var mark = null; if (g.mark) { mark = el('circle', { 'class': 'mark', cx: g.mark.x, cy: g.mark.y, r: R }); svg.appendChild(mark); }
      main.insertBefore(svg, main.firstChild); T.nodes.push(svg);
      var L = line.getTotalLength(), N = Math.max(12, Math.min(200, Math.round(L / 20))), tb = [];
      for (var k = 0; k <= N; k++) { var l = L * k / N, q = line.getPointAtLength(l); tb.push([l, q.y, q.x]); }
      line.style.strokeDasharray = L + ' ' + L;
      T.segs.push({ line: line, mark: mark, s: g.s, my: g.mark ? g.mark.y : 0, L: L, tb: tb, last: -1 });
    });
    var tip = d.createElement('span'); tip.className = 'trail-tip'; tip.setAttribute('aria-hidden', 'true');
    main.insertBefore(tip, main.firstChild); T.nodes.push(tip); T.tip = tip;
    paint(true);
  }
  function at(tb, y) {
    var lo = 0, hi = tb.length - 1;
    if (y <= tb[0][1]) return [0, tb[0][2], tb[0][1]];
    if (y >= tb[hi][1]) return [tb[hi][0], tb[hi][2], tb[hi][1]];
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tb[m][1] < y) lo = m; else hi = m; }
    var a = tb[lo], b = tb[hi], k = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * k, a[2] + (b[2] - a[2]) * k, y];
  }
  function paint(force) {
    if (!T || !T.segs.length) return;
    var y = RM ? 1e9 : (w.pageYOffset || de.scrollTop) + VH * 0.62 - T.top, tipAt = null;
    T.segs.forEach(function (g) {
      var hit = at(g.tb, y), len = hit[0];
      if (len > 0 && len < g.L) tipAt = hit;
      if (force || Math.abs(len - g.last) >= 0.5) { g.last = len; g.line.style.strokeDashoffset = (g.L - len).toFixed(1); }
      if (!g.mark) return;
      var on = g.my <= y + 2;
      if (on !== g.mark.classList.contains('on')) { g.mark.classList.toggle('on', on); g.s.classList.toggle('reached', on); }
    });
    if (!RM && tipAt) { T.tip.style.transform = 'translate3d(' + tipAt[1].toFixed(1) + 'px,' + tipAt[2].toFixed(1) + 'px,0)'; T.tip.style.display = ''; }
    else T.tip.style.display = 'none';
  }

  /* 3. Parallax on hero layers (data-par="0.1"), only near the top of the page. */
  var pars = RM ? [] : [].slice.call(d.querySelectorAll('[data-par]'));
  function parallax() {
    var sy = w.pageYOffset || de.scrollTop;
    if (sy > VH * 1.4) return;
    pars.forEach(function (p) { p.style.transform = 'translate3d(0,' + (sy * parseFloat(p.getAttribute('data-par'))).toFixed(1) + 'px,0)'; });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    (w.requestAnimationFrame || setTimeout)(function () { ticking = false; paint(false); if (pars.length) parallax(); });
  }
  var rt = null;
  function soon() { VH = w.innerHeight || 800; clearTimeout(rt); rt = setTimeout(build, 120); }
  function start() {
    try { build(); } catch (e) {}
    if (!RM) w.addEventListener('scroll', onScroll, { passive: true });
    w.addEventListener('resize', soon);
    w.addEventListener('load', soon);
    if (main && 'ResizeObserver' in w) { var lastH = 0; new ResizeObserver(function () { var h = main.offsetHeight; if (Math.abs(h - lastH) > 2) { lastH = h; soon(); } }).observe(main); }
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(soon);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
