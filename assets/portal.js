/* Steady Path portal: visual layer only. It watches each render, reads the portal state (never writes it),
   and adds motion that marks progress: a burst on a new Yes, on "I applied", on an approved document and on a new
   interview date, the tracker and progress bar growing as things advance, and a gentle entrance when the tab changes.
   If this file fails or is missing, the portal works exactly as before. Reduced motion: no bursts, no motion. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || typeof window.S !== 'object' || typeof window.ansOf !== 'function') return;
  var html = document.documentElement, fx = window.SPFX || { burstAt: function () {}, reduced: true };
  var RM = !!fx.reduced;
  var prev = null, prevData = null, lastView = '', wasDone = false;
  function q(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }
  function esc(v) { return typeof window.cssq === 'function' ? window.cssq(v) : String(v).replace(/["\\]/g, '\\$&'); }
  function snap(d) {
    var s = { yes: {}, stage: {}, apps: {}, iv: {}, ok: {}, dec: 0, tot: d.jobs.length };
    d.jobs.forEach(function (j) {
      var a = window.ansOf(j); if (a) s.dec++;
      if (a === 'yes') { s.yes[j.id] = 1; try { s.stage[j.id] = window.stageFor(j); } catch (e) {} }
    });
    (d.apps || []).forEach(function (x) { s.apps[x.id] = x.jobId || ''; if (x.interview) s.iv[x.id] = String(x.interview); });
    (d.docs || []).forEach(function (x) { if (/approved/i.test(x.status || '')) s.ok[x.id] = 1; });
    return s;
  }
  function grow(el, from) {
    if (!el || RM) return;
    el.style.setProperty('--s0', Math.max(0, Math.min(1, from)).toFixed(3));
    el.classList.add('pv-grow');
  }
  function after() {
    var S = window.S;
    var view = S.status !== 'ready' ? String(S.status) : S.deck ? 'deck' : String(S.view || 'jobs');
    html.setAttribute('data-pv', view);
    if (!RM && S.status === 'ready' && lastView && view !== lastView) {
      ['.deck', '.sky', '.tabbar'].forEach(function (s) { var el = q(s); if (el) el.classList.add('pv-enter'); });
    }
    lastView = view;
    if (S.status !== 'ready' || !S.data) { prev = null; prevData = null; wasDone = false; return; }
    var s = snap(S.data);
    if (prevData !== S.data || !prev) { prev = s; prevData = S.data; return; }
    var p = prev; prev = s;
    var done = view === 'deck' && !!q('.dk-done .dk-doneic');
    if (done && !wasDone) fx.burstAt(q('.dk-doneic'), { n: 22, r: 120 });
    wasDone = done;
    Object.keys(s.yes).forEach(function (id) {
      if (p.yes[id]) return;
      fx.burstAt(S.deck ? q('.dk-acts .dk-yes') : q('[data-ans="yes"][data-j="' + esc(id) + '"]'), { n: 14, r: 72 });
    });
    Object.keys(s.stage).forEach(function (id) {
      var a = p.stage[id] || 0, b = s.stage[id];
      if (b > a) grow(q('[data-jc="' + esc(id) + '"] .trk'), a / b);
    });
    if (s.tot === p.tot && s.dec > p.dec) grow(q('.prog .bar i'), p.dec / s.dec);
    Object.keys(s.apps).forEach(function (id) {
      if (id in p.apps) return;
      var jid = s.apps[id];
      fx.burstAt(q(jid ? '[data-jc="' + esc(jid) + '"] .kapplied' : '[data-app="' + esc(id) + '"]') || q('[data-app="' + esc(id) + '"]'), { n: 22, r: 110 });
    });
    Object.keys(s.iv).forEach(function (id) {
      if (p.iv[id] === s.iv[id] || !(id in p.apps)) return;
      fx.burstAt(q('[data-app="' + esc(id) + '"]'), { n: 18, r: 90, colors: ['#2b5aa8', '#C9A227', '#F2D98A', '#1f7a46'] });
    });
    Object.keys(s.ok).forEach(function (id) {
      if (p.ok[id]) return;
      fx.burstAt(q('[data-doc="' + esc(id) + '"]'), { n: 16, r: 90 });
    });
  }
  if ('MutationObserver' in window) new MutationObserver(after).observe(app, { childList: true });
  after();
})();
