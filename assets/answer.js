/* /answer/: confirms one answer from an email before anything is saved (API v1.48).
   The link carries its token in the URL fragment (#k=... for a weekly match email, #t=...&job=...&a=yes|no for an older job
   card). A fragment is never sent to a server or in a Referer, and the page removes it from the address bar at once. On open
   the page asks the API what the link is for (answerLook, which records nothing), so an email scanner that opens the link answers
   nothing. Only the button calls answerSave. The page loads nothing from another host, sends no Referer, and sets no cookie. */
(function () {
  'use strict';
  var API = 'https://script.google.com/macros/s/AKfycbywIXNDqOMhCuyNx9px8cKGQy4zsuDwxihOF_jMr_jTxv8QOy2OxBrlXC9WffPWZcU/exec';
  var root = document.getElementById('ans'), head = document.getElementById('ansH');
  if (!root) return;
  var q = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
  var ref = { k: q.get('k') || '', t: q.get('t') || '', job: q.get('job') || '', a: (q.get('a') || '').toLowerCase() };
  try { if (location.hash) history.replaceState(null, '', location.pathname); } catch (e) {}
  var body = /^[a-f0-9]{40}$/.test(ref.k) ? { k: ref.k } : ref.t.length >= 20 && ref.job && (ref.a === 'yes' || ref.a === 'no') ? { t: ref.t, job: ref.job, a: ref.a } : null;
  var PORTAL = '/portal/';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function line(j) { j = j || {}; var t = [j.title, j.company].filter(function (x) { return x; }).join(' at '); return t + (j.pay ? ' (' + j.pay + ')' : ''); }
  function show(h, html) { if (head) head.textContent = h; root.innerHTML = html; try { head.focus({ preventScroll: true }); } catch (e) {} }
  var SIGNIN = '<p>Please sign in to your portal to answer: <a href="' + PORTAL + '">steadypathcareers.com/portal/</a></p>';
  var WHY = {
    'used or expired': 'This link has expired or was already used. Nothing was saved.',
    expired: 'Your sign-in link has expired. Nothing was saved.',
    closed: 'This job posting has closed, so nothing was saved.',
    answered: 'You already answered this one. You can change it in your portal.',
    limit: 'Too many tries just now. Please try again in a few minutes.',
    'not found': 'We could not find that job for you. Nothing was saved.'
  };
  function fail(e) { show('Nothing was saved', '<p class="err">' + esc(WHY[e] || 'This link is not active. Nothing was saved.') + '</p>' + SIGNIN); }
  function call(action) {
    var b = { action: action }; Object.keys(body).forEach(function (k) { b[k] = body[k]; });
    if (typeof window.__spAnswerPost === 'function') return Promise.resolve(window.__spAnswerPost(b)); /* the site checks only: they never reach the API */
    return fetch(API, { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', referrerPolicy: 'no-referrer', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); });
  }
  function offline(retry) {
    show('We could not reach Steady Path', '<p class="err">Please check your connection and try again. Nothing was saved.</p><p><button type="button" class="btn" id="ansRetry">Try again</button></p>' + SIGNIN);
    var b = document.getElementById('ansRetry'); if (b) b.addEventListener('click', retry);
  }
  function look() {
    show('Confirm your answer', '<p class="soft">Checking your link…</p>');
    call('answerLook').then(function (d) {
      if (!d || !d.ok) { fail(d && d.error); return; }
      var yes = d.answer === 'yes';
      show(yes ? 'Say yes to this job?' : 'Pass on this job?', '<p class="job">' + esc(line(d.job)) + '</p>' +
        (yes ? '<p>A yes starts your resume and cover letter tailored to this job.</p>' : '') +
        '<p><button type="button" class="btn' + (yes ? ' yes' : '') + '" id="ansGo">' + (yes ? 'Yes, save my answer' : 'No, save my answer') + '</button></p>' +
        '<p class="soft">Nothing is saved until you tap the button. Changed your mind? <a href="' + PORTAL + '">Open your portal</a>.</p>');
      var go = document.getElementById('ansGo'); if (go) go.addEventListener('click', function () { saveIt(go, yes); });
    }).catch(function () { offline(look); });
  }
  function saveIt(btn, yes) {
    btn.disabled = true; btn.textContent = 'Saving…';
    call('answerSave').then(function (d) {
      if (!d || !d.ok) { fail(d && d.error); return; }
      var said = /^yes/i.test(String(d.answer || '')) ? 'yes' : 'no';
      show('Saved', '<p class="job">Saved. You said ' + said + ' to ' + esc(line(d.job) || 'this job') + '.</p>' +
        (said === 'yes' ? '<p>We will tailor your resume and cover letter to this job. They show up in your portal for your OK.</p>' : '') +
        '<p><a class="btn" href="' + PORTAL + '">Open your portal</a></p>');
    }).catch(function () { btn.disabled = false; btn.textContent = yes ? 'Yes, save my answer' : 'No, save my answer'; offline(function () { look(); }); });
  }
  if (!body) { show('Nothing was saved', '<p class="err">This link is missing its details. Nothing was saved.</p>' + SIGNIN); return; }
  look();
})();
