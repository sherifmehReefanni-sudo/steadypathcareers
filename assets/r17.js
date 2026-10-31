/* Steady Path Careers, design upgrade (r17). Marketing pages only: /start/ and /portal/ never load this file.
   Every effect checks reduced motion and has a still version. Nothing here sends data anywhere. */
(function () {
  'use strict';
  var d = document, w = window, de = d.documentElement;
  var mq = null; try { mq = w.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function RM() { return mq ? mq.matches : false; }
  var path = location.pathname;
  if (/^\/(start|portal)(\/|$)/.test(path)) return;

  /* ---------- 2. Live swipe demo: 3 sample jobs. Mouse, touch, buttons and arrow keys; results are announced. ---------- */
  (function () {
    var root = d.getElementById('swipeDemo'); if (!root) return;
    root.classList.add('js-sw');
    var stack = root.querySelector('.sw-stack'), cards = [].slice.call(root.querySelectorAll('.sw-card')), done = root.querySelector('.sw-done'), status = root.querySelector('.sw-status');
    var btns = [].slice.call(root.querySelectorAll('[data-sw]'));
    var i = 0, touched = false;
    done.setAttribute('tabindex', '-1');
    function info(c) { return c.querySelector('.t').textContent + ', ' + c.querySelector('.pay').textContent; }
    function badges(c, v) { c.querySelector('.sw-badge.yes').style.opacity = Math.max(0, Math.min(1, v / 90)); c.querySelector('.sw-badge.no').style.opacity = Math.max(0, Math.min(1, -v / 90)); }
    function layout() {
      cards.forEach(function (c, k) {
        var pos = k - i;
        if (pos < 0) {
          c.setAttribute('aria-hidden', 'true'); c.style.pointerEvents = 'none';
          if (RM()) c.style.visibility = 'hidden'; else setTimeout(function () { if (cards.indexOf(c) < i) c.style.visibility = 'hidden'; }, 480);
          return;
        }
        c.style.visibility = ''; c.style.pointerEvents = ''; c.style.zIndex = String(10 - pos); c.style.opacity = '1';
        c.style.transform = pos ? 'translateY(' + pos * 12 + 'px) scale(' + (1 - pos * 0.04) + ')' : 'none';
        c.setAttribute('aria-hidden', pos ? 'true' : 'false'); badges(c, 0);
      });
      done.hidden = i < cards.length;
      btns.forEach(function (b) { b.disabled = i >= cards.length; });
    }
    function decide(yes) {
      if (i >= cards.length) return;
      touched = true;
      var c = cards[i], t = c.querySelector('.t').textContent, hadFocus = root.contains(d.activeElement);
      c.style.transform = 'translateX(' + (yes ? 130 : -130) + '%) rotate(' + (yes ? 16 : -16) + 'deg)'; c.style.opacity = '0';
      i++;
      var msg = yes ? 'Yes to ' + t + '. In your portal, this starts your tailored resume and cover letter.' : 'Passed on ' + t + '. A Pass helps aim your next matches.';
      msg += i < cards.length ? ' Next: ' + info(cards[i]) + '.' : ' That was the last sample job.';
      status.textContent = msg;
      layout();
      if (i >= cards.length && hadFocus) setTimeout(function () { done.focus(); }, RM() ? 0 : 320);
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sw]'); if (b) { decide(b.getAttribute('data-sw') === 'yes'); return; }
      if (e.target.closest('[data-again]')) { i = 0; status.textContent = 'Starting over. ' + info(cards[0]) + '.'; cards.forEach(function (c) { c.style.opacity = '1'; }); layout(); stack.focus(); }
    });
    stack.addEventListener('keydown', function (e) {
      if (e.target !== stack) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); decide(true); } else if (e.key === 'ArrowLeft') { e.preventDefault(); decide(false); }
    });
    var drag = false, pid = null, sx = 0, sy = 0, dx = 0, axis = null;
    stack.addEventListener('pointerdown', function (e) {
      var c = cards[i]; if (!c || !c.contains(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = 0; axis = null; c.classList.remove('nudge'); c.classList.add('dragging');
      if (e.pointerType === 'mouse') e.preventDefault();
    });
    stack.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== pid) return;
      var c = cards[i], mx = e.clientX - sx, my = e.clientY - sy;
      if (axis === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) { axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; if (axis === 'x') { try { stack.setPointerCapture(pid); } catch (er) {} } }
      if (axis !== 'x') return;
      dx = mx; c.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 18).toFixed(2) + 'deg)'; badges(c, dx);
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== pid)) return;
      drag = false; var c = cards[i]; if (!c) return; c.classList.remove('dragging');
      if (axis === 'x' && Math.abs(dx) > 90) decide(dx > 0); else { c.style.transform = 'none'; badges(c, 0); }
    }
    /* No lostpointercapture handler: taking capture ourselves releases the browser's implicit touch capture, and that must not end the drag. */
    stack.addEventListener('pointerup', end); stack.addEventListener('pointercancel', end);
    layout();
    /* One gentle hint that the card moves: a small lean to the right and back, once, only with motion and only if nobody has touched it. */
    if (!RM() && 'IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        setTimeout(function () {
          var c = cards[0]; if (touched || i !== 0 || RM() || drag) return;
          c.classList.add('nudge'); c.style.transform = 'translateX(26px) rotate(3deg)'; badges(c, 40);
          setTimeout(function () { if (touched || drag) return; c.style.transform = 'none'; badges(c, 0); setTimeout(function () { c.classList.remove('nudge'); }, 520); }, 560);
        }, 1400);
      }, { threshold: 0.6 });
      io.observe(stack);
    }
  })();

  /* ---------- 1. Welcome video. One flag: data-video on #me. Empty means the button stays hidden. ---------- */
  (function () {
    var me = d.getElementById('me'), dlg = d.getElementById('welcomeDlg');
    if (!me || !dlg) return;
    var src = (me.getAttribute('data-video') || '').trim(), caps = (me.getAttribute('data-captions') || '').trim();
    var btn = me.querySelector('[data-welcome]');
    /* The button shows only when both the video and its captions are set. */
    if (!src || !caps || !btn || typeof dlg.showModal !== 'function') return;
    btn.hidden = false;
    var v = dlg.querySelector('video'), loaded = false;
    function load() {
      if (loaded) return; loaded = true;
      v.src = src;
      if (caps) {
        var t = d.createElement('track'); t.kind = 'captions'; t.srclang = 'en'; t.label = 'English'; t.src = caps; t.default = true;
        v.appendChild(t);
      }
    }
    function capsOn() { for (var k = 0; k < v.textTracks.length; k++) if (v.textTracks[k].kind === 'captions') v.textTracks[k].mode = 'showing'; }
    btn.addEventListener('click', function () {
      load(); dlg.showModal(); capsOn();
      v.addEventListener('loadedmetadata', capsOn, { once: true });
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      dlg.querySelector('[data-close]').focus();
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
    dlg.addEventListener('close', function () { v.pause(); btn.focus(); });
    /* Keep Tab inside the dialog. */
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [].slice.call(dlg.querySelectorAll('button, video[controls], a[href]')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  })();

  /* ---------- 3. Before and after slider ---------- */
  (function () {
    var ba = d.querySelector('.rs'); if (!ba) return;
    var frame = ba.querySelector('.rs-frame'), range = ba.querySelector('.rs-range'), panel = ba.querySelector('.rs-panel');
    if (!frame || !range || !panel) return;
    var tabs = [].slice.call(ba.querySelectorAll('[role="tab"]')), user = false, tween = null;
    function set(v, fromUser) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      if (fromUser) { user = true; if (tween) { cancelAnimationFrame(tween); tween = null; } }
      frame.style.setProperty('--p', v + '%'); range.value = v;
      range.setAttribute('aria-valuetext', v >= 96 ? 'Generic version only' : v <= 4 ? 'Tailored version only' : v + '% generic on the left, the rest tailored on the right');
    }
    range.addEventListener('input', function () { set(+range.value, true); });
    var drag = false, pid = null, sx = 0, sy = 0, axis = null;
    function fromX(x) { var r = frame.getBoundingClientRect(); return (x - r.left) / r.width * 100; }
    frame.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY; axis = e.pointerType === 'mouse' ? 'x' : null;
      if (axis === 'x') { try { frame.setPointerCapture(pid); } catch (er) {} set(fromX(e.clientX), true); e.preventDefault(); }
      range.focus({ preventScroll: true });
    });
    frame.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== pid) return;
      if (axis === null && (Math.abs(e.clientX - sx) > 6 || Math.abs(e.clientY - sy) > 6)) { axis = Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy) ? 'x' : 'y'; if (axis === 'x') { try { frame.setPointerCapture(pid); } catch (er) {} } }
      if (axis === 'x') set(fromX(e.clientX), true);
    });
    function end(e) { if (!drag || e.pointerId !== pid) return; if (axis === null) set(fromX(e.clientX), true); drag = false; }
    frame.addEventListener('pointerup', end); frame.addEventListener('pointercancel', function () { drag = false; });
    function show(k, focus) {
      var tpl = ba.querySelector('template[data-rs-ex="' + k + '"]'); if (!tpl) return;
      var x = tpl.content;
      panel.querySelector('[data-f="title"]').textContent = x.querySelector('b').textContent;
      panel.querySelector('[data-f="wants"]').textContent = x.querySelector('span').textContent;
      var ps = x.querySelectorAll('p');
      panel.querySelector('[data-f="gen"]').lastChild.textContent = ps[0].textContent;
      panel.querySelector('[data-f="tail"]').lastChild.textContent = ps[1].textContent;
      tabs.forEach(function (t) { var on = t.getAttribute('data-rs') === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) { panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus(); } });
      set(50, false);
    }
    ba.querySelector('.rs-tabs').addEventListener('click', function (e) { var t = e.target.closest('[role="tab"]'); if (t) show(t.getAttribute('data-rs')); });
    ba.querySelector('.rs-tabs').addEventListener('keydown', function (e) {
      var n = tabs.indexOf(d.activeElement); if (n < 0) return;
      var m = e.key === 'ArrowRight' ? n + 1 : e.key === 'ArrowLeft' ? n - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (m === null) return; e.preventDefault(); m = (m + tabs.length) % tabs.length; show(tabs[m].getAttribute('data-rs'), true);
    });
    set(50, false);
    /* With motion, the handle sweeps once when it first comes into view, to show it moves. Any touch stops it. */
    if (!RM() && 'IntersectionObserver' in w && w.requestAnimationFrame) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        var keys = [[0, 50], [700, 22], [1500, 78], [2200, 50]], t0 = null;
        function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
        function step(ts) {
          if (user || RM()) return;
          if (t0 === null) t0 = ts; var t = ts - t0, k = 1;
          while (k < keys.length - 1 && t > keys[k][0]) k++;
          var a = keys[k - 1], b = keys[k], f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
          set(a[1] + (b[1] - a[1]) * ease(f), false);
          if (t < keys[keys.length - 1][0]) tween = requestAnimationFrame(step); else tween = null;
        }
        setTimeout(function () { if (!user) tween = requestAnimationFrame(step); }, 500);
      }, { threshold: 0.7 });
      io.observe(frame);
    }
  })();

  /* ======================= Tier 2 ======================= */
  var hasIO = 'IntersectionObserver' in w, raf = w.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- 6a. "How it works" stops light up as they come into view. With reduced motion they are simply lit. ---------- */
  [].forEach.call(d.querySelectorAll('.road[data-stops]'), function (road) {
    var lis = [].slice.call(road.children);
    if (RM() || !hasIO) { lis.forEach(function (li) { li.classList.add('lit'); }); return; }
    road.classList.add('armed');
    /* Light every stop whose top has passed 82% of the screen, so a fast scroll or an anchor jump never skips one. */
    var tick = false;
    function sweep() {
      tick = false;
      var lim = (w.innerHeight || 800) * 0.82;
      lis = lis.filter(function (li) { if (li.getBoundingClientRect().top < lim) { li.classList.add('lit'); return false; } return true; });
      if (!lis.length) { w.removeEventListener('scroll', on); w.removeEventListener('resize', on); }
    }
    function on() { if (!tick) { tick = true; raf(sweep); } }
    w.addEventListener('scroll', on, { passive: true }); w.addEventListener('resize', on);
    sweep();
  });

  /* ---------- 6b. Slim progress line on the right edge: how far down the page you are. ---------- */
  (function () {
    if (!d.querySelector('[data-trail]')) return;
    var bar = d.createElement('div'); bar.className = 'sp-prog'; bar.setAttribute('aria-hidden', 'true');
    var fill = d.createElement('i'); bar.appendChild(fill); d.body.appendChild(bar);
    var tick = false;
    function paint() {
      tick = false;
      var max = Math.max(1, de.scrollHeight - w.innerHeight), y = w.pageYOffset || de.scrollTop;
      bar.style.display = de.scrollHeight > w.innerHeight * 1.6 ? '' : 'none';
      fill.style.transform = 'scaleY(' + Math.min(1, Math.max(0, y / max)).toFixed(4) + ')';
    }
    function on() { if (!tick) { tick = true; raf(paint); } }
    w.addEventListener('scroll', on, { passive: true }); w.addEventListener('resize', on); w.addEventListener('load', on);
    paint();
  })();

  /* ---------- 7a. Check marks draw themselves when they come into view (motion only). ---------- */
  if (!RM() && hasIO) {
    var lists = [].slice.call(d.querySelectorAll('.fit2 ul, .price2 ul'));
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('live'); cio.unobserve(e.target); } });
    }, { threshold: 0.35 });
    lists.forEach(function (ul) {
      /* only lists still below the fold, so nothing already on screen blinks */
      if (ul.getBoundingClientRect().top < (w.innerHeight || 800)) return;
      [].forEach.call(ul.querySelectorAll('li > svg'), function (svg) {
        var ps = svg.querySelectorAll('path'); var p = ps[ps.length - 1]; if (!p) return;
        p.setAttribute('pathLength', '1'); p.classList.add('ckp');
      });
      ul.classList.add('ckdraw'); cio.observe(ul);
    });
  }

  /* ---------- 7b. One gold shimmer on the hero "Start free", about 8 seconds after load. Never repeats. ---------- */
  (function () {
    var b = d.querySelector('.phero a.btn[data-cta][href="/start/"]'); if (!b) return;
    setTimeout(function () {
      if (RM() || d.hidden) return;
      b.classList.add('shimmer'); setTimeout(function () { b.classList.remove('shimmer'); }, 1400);
    }, 8000);
  })();

  /* ---------- 9. Sticky action bar on phones: shows once you are past the hero; hidden while typing and while the footer is in view. ---------- */
  (function () {
    var hero = d.querySelector('.phero'); if (!hero) return;
    var bar = d.createElement('div');
    bar.className = 'mbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Quick actions');
    bar.innerHTML = '<a class="btn gold" href="/start/">Start free</a>' +
      '<a class="btn line" href="sms:+17327590008" aria-label="Text me at (732) 759-0008"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5h16v10.5H9.5L5.5 19.5V16H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Text me</a>';
    d.body.appendChild(bar); d.body.classList.add('has-mbar');
    var mq2 = null; try { mq2 = w.matchMedia('(max-width: 760px)'); } catch (e) {}
    var shown = false, tick = false, footIn = false;
    function set(on) { if (on === shown) return; shown = on; bar.classList.toggle('on', on); if (on) bar.removeAttribute('inert'); else bar.setAttribute('inert', ''); }
    set(false); bar.setAttribute('inert', '');
    /* Hidden while the footer is on screen, so it never covers the footer links. */
    var foot = d.querySelector('.foot');
    if (foot && hasIO) new IntersectionObserver(function (es) { footIn = es[0].isIntersecting; check(); }).observe(foot);
    function check() {
      tick = false;
      if (mq2 && !mq2.matches) { set(false); return; }
      var y = w.pageYOffset || de.scrollTop;
      var past = y > hero.offsetTop + hero.offsetHeight - 40;
      var typing = d.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(d.activeElement.tagName);
      set(past && !typing && !footIn);
    }
    w.addEventListener('scroll', function () { if (!tick) { tick = true; raf(check); } }, { passive: true });
    w.addEventListener('resize', check);
    d.addEventListener('focusout', function () { setTimeout(check, 0); });
    d.addEventListener('focusin', check);
  })();
})();
