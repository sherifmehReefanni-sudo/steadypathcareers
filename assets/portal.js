/* Steady Path portal: visual layer only. After each render (batched into one animation frame) it reads the portal state,
   never writes it, and adds motion that marks real progress: a burst when a Yes is saved (not on the tap, and not while
   its undo window is open), on "I applied", on an approved document, on a new interview date and when the deck is done;
   the tracker and progress bar grow as things advance; the header eases in when the tab changes; a job's marker on the
   journey map hops to its new stage; the next-step card eases in when the step changes.
   If this file fails or is missing, the portal works exactly as before. Reduced motion (read live): no bursts, no motion. */
(function () {
  'use strict';
  if (window.__spPortalViz) return;
  var app = document.getElementById('app');
  if (!app || typeof window.S !== 'object' || typeof window.ansOf !== 'function') return;
  window.__spPortalViz = true;
  var html = document.documentElement, fx = window.SPFX || { burstAt: function () {}, reduced: function () { return true; } };
  var mq = null; try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function RM() { return mq ? mq.matches : true; }
  var prev = null, prevData = null, lastView = '', wasDone = false, queued = false, bursts = [], lastNx = '', lastTicks = '';
  /* Bursts read layout, so they wait for the next frame and run together. */
  function burst(sel, o) { bursts.push([sel, o]); if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(flush); }
  function flush() { queued = false; var b = bursts; bursts = []; if (RM()) return; b.forEach(function (x) { var el = typeof x[0] === 'function' ? x[0]() : typeof x[0] === 'string' ? q(x[0]) : x[0]; fx.burstAt(el, x[1]); }); }
  /* the saved card grows, so its Yes button can slide below the fold: then burst from the card's status line */
  function onScreen(el) { if (!el) return null; var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || 800) ? el : null; }
  function q(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }
  function esc(v) { return typeof window.cssq === 'function' ? window.cssq(v) : String(v).replace(/["\\]/g, '\\$&'); }
  function snap(S) {
    var d = S.data, s = { yes: {}, stage: {}, apps: {}, iv: {}, ok: {}, dec: 0, tot: d.jobs.length };
    d.jobs.forEach(function (j) {
      var a = window.ansOf(j); if (a) s.dec++;
      /* a Yes counts once it is saved: not waiting in its undo window and not in flight */
      if (a === 'yes' && !(S.deferred && S.deferred[j.id]) && !(S.pending && S.pending[j.id])) s.yes[j.id] = 1;
      if (a === 'yes') { try { s.stage[j.id] = window.stageFor(j); } catch (e) {} }
    });
    (d.apps || []).forEach(function (x) { s.apps[x.id] = x.jobId || ''; if (x.interview) s.iv[x.id] = String(x.interview); });
    (d.docs || []).forEach(function (x) { if (/approved/i.test(x.status || '')) s.ok[x.id] = 1; });
    return s;
  }
  function grow(el, from) {
    if (!el || RM()) return;
    el.style.setProperty('--s0', Math.max(0, Math.min(1, from)).toFixed(3));
    el.classList.add('pv-grow');
  }
  function run() {
    var S = window.S;
    var view = S.status !== 'ready' ? String(S.status) : S.deck ? 'deck' : S.flow && S.flow.kind ? String(S.flow.kind) : String(S.view || 'jobs');
    if (html.getAttribute('data-pv') !== view) html.setAttribute('data-pv', view);
    if (!RM() && S.status === 'ready' && lastView && view !== lastView) {
      ['.deck', '.sky', '.tabbar'].forEach(function (s) { var el = q(s); if (el) el.classList.add('pv-enter'); });
    }
    lastView = view;
    if (S.status !== 'ready' || !S.data) { prev = null; prevData = null; wasDone = false; return; }
    var s = snap(S);
    if (prevData !== S.data || !prev) { prev = s; prevData = S.data; return; }
    var p = prev; prev = s;
    var nx = q('.nx'), nxk = nx ? nx.getAttribute('data-nx') + '|' + (nx.querySelector('h2') || {}).textContent : '';
    if (nx && lastNx && nxk !== lastNx && !RM()) nx.classList.add('pv-new');
    if (nx || view !== 'jobs') lastNx = nxk;
    var ticks = [].map.call(document.querySelectorAll('.ap-st'), function (el) { return el.classList.contains('done') ? 1 : 0; }).join('');
    if (ticks && lastTicks && ticks.length === lastTicks.length && !RM()) [].forEach.call(document.querySelectorAll('.ap-st'), function (el, i) { if (ticks[i] === '1' && lastTicks[i] === '0') el.classList.add('pv-tick'); });
    lastTicks = ticks;
    var done = view === 'deck' && !!q('.dk-done .dk-doneic');
    if (done && !wasDone) burst('.dk-doneic', { n: 12, r: 110 });
    wasDone = done;
    if (RM()) return;
    Object.keys(s.yes).forEach(function (id) {
      if (p.yes[id]) return;
      var inDeck = !!S.deck; burst(function () { return inDeck ? q('.dk-prog') : onScreen(q('[data-ans="yes"][data-j="' + esc(id) + '"]')) || q('[data-jc="' + esc(id) + '"] .jst'); }, { n: 8, r: 64 });
    });
    Object.keys(s.stage).forEach(function (id) {
      var a = p.stage[id] || 0, b = s.stage[id];
      if (b > a) { grow(q('[data-jc="' + esc(id) + '"] .trk'), a / b); var m = q('.jm-m[data-jmgo="' + esc(id) + '"]'); if (m) m.classList.add('pv-hop'); }
    });
    if (s.tot === p.tot && s.dec > p.dec) grow(q('.prog .bar i'), p.dec / s.dec);
    Object.keys(s.apps).forEach(function (id) {
      if (id in p.apps) return;
      var jid = s.apps[id];
      burst(q('.ap-done .ap-doneic') || q(jid ? '[data-jc="' + esc(jid) + '"] .kapplied' : '[data-app="' + esc(id) + '"]') || q('[data-app="' + esc(id) + '"]'), { n: 12, r: 100, fallback: true });
    });
    Object.keys(s.iv).forEach(function (id) {
      if (p.iv[id] === s.iv[id] || !(id in p.apps)) return;
      burst('[data-app="' + esc(id) + '"]', { n: 10, r: 84, colors: ['#2b5aa8', '#C9A227', '#F2D98A', '#1f7a46'], fallback: true });
    });
    Object.keys(s.ok).forEach(function (id) {
      if (p.ok[id]) return;
      burst('[data-doc="' + esc(id) + '"]', { n: 10, r: 84, fallback: true });
    });
  }
  /* Runs right after each render (no layout reads here), so growth starts on the same frame the new state appears. */
  if ('MutationObserver' in window) new MutationObserver(run).observe(app, { childList: true });
  run();
})();
