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
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    revs.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add('pre'); io.observe(el); }
    });
    var lio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('live'); lio.unobserve(e.target); } });
    }, { threshold: 0.2 });
    lives.forEach(function (el) { lio.observe(el); });
  } else {
    lives.forEach(function (el) { el.classList.add('live'); });
  }

  /* 2. The path: one line down the page, drawn as you scroll, with a marker at each section. */
  var main = d.querySelector('[data-trail]');
  var NS = 'http://www.w3.org/2000/svg';
  var T = null;
  function el(n, a) { var x = d.createElementNS(NS, n); for (var k in a) x.setAttribute(k, a[k]); return x; }
  function build() {
    if (!main) return;
    var miles = [].slice.call(main.querySelectorAll('[data-mile]')).filter(function (s) { return s.offsetHeight > 0; });
    if (!miles.length) return;
    var mr = main.getBoundingClientRect(), W = main.clientWidth, H = main.offsetHeight;
    if (!W || !H) return;
    var gut = (W - Math.min(W, 1100)) / 2, wide = gut >= 100;
    var X = function (i) { if (!wide) return 9; var g = Math.max(36, gut / 2); return i % 2 ? W - g : g; };
    var amp = wide ? 16 : 0;
    var marks = [], p = '';
    miles.forEach(function (s, i) {
      var r = s.getBoundingClientRect(), top = r.top - mr.top, bot = r.bottom - mr.top, x = X(i);
      var pad = Math.min(84, r.height * 0.25), my = top + pad;
      var last = i === miles.length - 1;
      var end = last ? bot - Math.min(60, r.height * 0.2) : bot - 34;
      if (!i) p = 'M' + x + ' ' + Math.max(2, top + 10);
      p += ' L' + x + ' ' + my.toFixed(1);
      var h = end - my;
      if (h > 20) p += ' C' + (x + amp) + ' ' + (my + h / 3).toFixed(1) + ' ' + (x - amp) + ' ' + (my + 2 * h / 3).toFixed(1) + ' ' + x + ' ' + end.toFixed(1);
      if (!last) {
        var n = miles[i + 1].getBoundingClientRect(), nTop = n.top - mr.top, nx = X(i + 1);
        p += ' C' + x + ' ' + (bot + 8).toFixed(1) + ' ' + nx + ' ' + (nTop - 8).toFixed(1) + ' ' + nx + ' ' + (nTop + 34).toFixed(1);
      }
      marks.push({ x: x, y: my, s: s });
    });
    if (!T) {
      var svg = el('svg', { 'class': 'trail', 'aria-hidden': 'true', focusable: 'false' });
      var defs = el('defs', {}), g = el('linearGradient', { id: 'trailg', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H });
      [['0', '#C9A227'], ['.45', '#E9A23B'], ['.75', '#D9783F'], ['1', '#F2D98A']].forEach(function (s) { g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1] })); });
      defs.appendChild(g); svg.appendChild(defs);
      T = { svg: svg, grad: g, track: el('path', { 'class': 'track' }), glow: el('path', { 'class': 'glow', stroke: 'url(#trailg)' }), line: el('path', { 'class': 'line', stroke: 'url(#trailg)' }), mg: el('g', {}), tip: el('circle', { 'class': 'tip', r: 7 }) };
      svg.appendChild(T.track); svg.appendChild(T.glow); svg.appendChild(T.line); svg.appendChild(T.mg); svg.appendChild(T.tip);
      main.insertBefore(svg, main.firstChild);
    }
    T.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    T.svg.setAttribute('width', W); T.svg.setAttribute('height', H);
    T.grad.setAttribute('y2', H);
    [T.track, T.glow, T.line].forEach(function (x) { x.setAttribute('d', p); });
    T.L = T.line.getTotalLength();
    T.top = mr.top + (w.pageYOffset || de.scrollTop);
    // y -> length lookup (the path only moves downward)
    var N = Math.max(60, Math.min(400, Math.round(T.L / 20))), tb = [];
    for (var i = 0; i <= N; i++) { var l = T.L * i / N; tb.push([l, T.line.getPointAtLength(l).y]); }
    T.tb = tb;
    while (T.mg.firstChild) T.mg.removeChild(T.mg.firstChild);
    T.marks = marks.map(function (m) { var c = el('circle', { 'class': 'mark', cx: m.x, cy: m.y, r: wide ? 8 : 6 }); T.mg.appendChild(c); return { c: c, y: m.y, s: m.s }; });
    [T.line, T.glow].forEach(function (x) { x.style.strokeDasharray = T.L + ' ' + T.L; });
    T.last = -1;
    paint(true);
  }
  function lenAt(y) {
    var tb = T.tb, lo = 0, hi = tb.length - 1;
    if (y <= tb[0][1]) return 0;
    if (y >= tb[hi][1]) return T.L;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tb[m][1] < y) lo = m; else hi = m; }
    var a = tb[lo], b = tb[hi], k = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
    return a[0] + (b[0] - a[0]) * k;
  }
  function paint(force) {
    if (!T || !T.L) return;
    var y = RM ? 1e9 : (w.pageYOffset || de.scrollTop) + (w.innerHeight || 800) * 0.62 - T.top;
    var len = lenAt(y);
    if (!force && Math.abs(len - T.last) < 0.5) return;
    T.last = len;
    var off = (T.L - len).toFixed(1);
    T.line.style.strokeDashoffset = off; T.glow.style.strokeDashoffset = off;
    if (!RM && len > 0 && len < T.L) { var pt = T.line.getPointAtLength(len); T.tip.setAttribute('cx', pt.x.toFixed(1)); T.tip.setAttribute('cy', pt.y.toFixed(1)); T.tip.style.display = ''; }
    else T.tip.style.display = 'none';
    T.marks.forEach(function (m) {
      var on = m.y <= y + 2;
      if (on !== m.c.classList.contains('on')) { m.c.classList.toggle('on', on); m.s.classList.toggle('reached', on); }
    });
  }

  /* 3. Parallax on hero layers (data-par="0.1"), only near the top of the page. */
  var pars = RM ? [] : [].slice.call(d.querySelectorAll('[data-par]'));
  function parallax() {
    var sy = w.pageYOffset || de.scrollTop;
    if (sy > (w.innerHeight || 800) * 1.4) return;
    pars.forEach(function (p) { p.style.transform = 'translate3d(0,' + (sy * parseFloat(p.getAttribute('data-par'))).toFixed(1) + 'px,0)'; });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    (w.requestAnimationFrame || setTimeout)(function () { ticking = false; paint(false); if (pars.length) parallax(); });
  }
  var rt = null;
  function soon() { clearTimeout(rt); rt = setTimeout(build, 120); }
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
