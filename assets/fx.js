/* Steady Path Careers: small celebration bursts (portal and intake). Hand-written, transform and opacity only, about 0.8s,
   then the pieces are removed. Does nothing with reduced motion or without the Web Animations API. */
window.SPFX = window.SPFX || (function () {
  'use strict';
  /* Reduced motion is read live, so turning it on mid-session stops bursts at once. */
  var mq = null; try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function RM() { return mq ? mq.matches : true; }
  var layer = null;
  var COLORS = ['#C9A227', '#F2D98A', '#1f7a46', '#E9A23B', '#2E4C78', '#D9783F'];
  function getLayer() {
    if (!layer || !layer.isConnected) {
      layer = document.createElement('div');
      layer.className = 'fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }
  function piece(l, cls, x, y) { var p = document.createElement('i'); p.className = cls; p.style.left = x + 'px'; p.style.top = y + 'px'; l.appendChild(p); return p; }
  function burst(x, y, o) {
    if (RM() || !document.body || !document.body.animate) return;
    o = o || {};
    var n = Math.min(o.n || 8, 12), r = o.r || 70, cols = o.colors || COLORS, l = getLayer();
    var ring = piece(l, 'fx-ring', x, y);
    ring.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.85 }, { transform: 'translate(-50%,-50%) scale(1.7)', opacity: 0 }],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = function () { ring.remove(); };
    for (var i = 0; i < n; i++) {
      (function (i) {
        var p = piece(l, 'fx-p' + (i % 3 === 0 ? ' s' : i % 3 === 1 ? ' r' : ''), x, y);
        p.style.background = cols[i % cols.length];
        var a = (Math.PI * 2 * i / n) + (Math.random() - 0.5) * 0.5, d = r * (0.6 + Math.random() * 0.6);
        var dx = Math.cos(a) * d, dy = Math.sin(a) * d - 12, rot = Math.round(Math.random() * 540 - 270);
        p.animate([
          { transform: 'translate(-50%,-50%) scale(.5) rotate(0deg)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx.toFixed(1) + 'px), calc(-50% + ' + dy.toFixed(1) + 'px)) scale(1) rotate(' + rot + 'deg)', opacity: 1, offset: 0.65 },
          { transform: 'translate(calc(-50% + ' + dx.toFixed(1) + 'px), calc(-50% + ' + (dy + 18).toFixed(1) + 'px)) scale(.8) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: 720 + Math.random() * 220, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = function () { p.remove(); };
      })(i);
    }
  }
  /* Burst from the middle of an element, if it is on screen. */
  function burstAt(el, o) {
    if (RM() || !el || !el.getBoundingClientRect) return;
    var b = el.getBoundingClientRect(), vh = window.innerHeight || 800, vw = window.innerWidth || 400;
    if (!b.width || b.bottom < 0 || b.top > vh) { if (o && o.fallback) burst(vw / 2, vh * 0.7, o); return; }
    burst(b.left + b.width / 2, b.top + b.height / 2, o);
  }
  return { burst: burst, burstAt: burstAt, reduced: RM };
})();
