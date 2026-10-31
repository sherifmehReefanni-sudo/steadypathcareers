/* Steady Path portal, round 18 (API v1.29): the application board (Ready to submit, Submitted, Interview, Offer, Closed) with
   one-tap moves, the follow-up reminder and note, the thank-you note after an interview is logged, milestone celebrations
   (once per client, recorded on the server), the one-time "Add to home screen" card, the offline screen and sign-out clean-up.
   Loaded after the portal's own scripts and before it starts; the portal calls these functions. Every write goes through the
   portal's post() to the API's own actions (board, milestoneSeen); nothing here submits anything for the client. */
var BOARD_COLS = ['Ready to submit', 'Submitted', 'Interview', 'Offer', 'Closed'];
var BOARD_CLOSED = ['Employer declined', 'I turned it down', 'Withdrew'];
var BOARD_STATUS = { submitted: 'Applied', interview: 'Interview scheduled', offer: 'Offer', hired: 'Hired' };
var BOOKING_URL = 'https://calendar.app.google/8wyFoDK5k6k1iamT9';
S.bdBusy = {};
S.msShown = {};

/* ---- board ---- */
/* Board column of an application: Applied and Heard back are Submitted; then Interview, Offer (and Hired), Closed. */
function boardCol(x) { var s = stageOf(x); return s <= 1 ? 1 : s; }
/* Ready to submit: Yes jobs with an approved resume and cover letter and no application yet (open postings only). */
function r18ReadyJobs(d) {
  return orderedJobs(d).filter(function (j) { if (ansOf(j) !== 'yes' || j.closed || S.deferred[j.id] || S.pending[j.id]) return false; var s = jobState(j); return s.applyReady && !s.app; });
}
function r18ReadyCard(j) {
  var id = esc(j.id), busy = S.bdBusy['job:' + j.id];
  return '<div class="app rdy" data-rdy="' + id + '"><b>' + esc(j.company || j.title) + '</b><div class="psub">' + esc(j.title) + '</div>' +
    '<div class="apills"><span class="pill ok">Documents approved</span>' + (j.pay ? '<span class="pill">' + esc(payText(j)) + '</span>' : '') + '</div>' +
    '<p class="bd-note">You submit it yourself on the employer\'s site. Then tap I submitted it, and it moves to Submitted.</p>' +
    '<div class="bd-moves" role="group" aria-label="' + esc('Next for ' + coName(j)) + '"><button type="button" class="kbtn solid" data-applyflow="' + id + '">' + IC.check + 'Apply step by step</button>' +
    '<button type="button" class="kbtn" data-bsubmit="' + id + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + (busy ? 'Saving…' : 'I submitted it') + '</button></div></div>';
}
/* One-tap moves for an application card, by column. Closed asks why (three buttons), still one tap each. */
function r18Moves(x) {
  var id = esc(x.id), c = boardCol(x), busy = !!S.bdBusy[x.id], co = coOr(x);
  if (S.bdClose === x.id) {
    return '<div class="bd-moves bd-why" role="group" aria-labelledby="bdw-' + id + '"><p class="bd-lab" id="bdw-' + id + '">Why did it close?</p>' +
      BOARD_CLOSED.map(function (w) { return '<button type="button" class="kbtn" data-bclosed="' + esc(w) + '" data-bid="' + id + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + esc(w) + '</button>'; }).join('') +
      '<button type="button" class="kbtn ghost" data-bcancel="' + id + '">Cancel</button></div>';
  }
  var hired = /\bhired\b|accepted/i.test(x.status || '');
  var moves = c === 1 ? [['interview', 'Interview'], ['closed', 'Closed']] : c === 2 ? [['offer', 'Offer'], ['closed', 'Closed'], ['submitted', 'Back to Submitted']] :
    c === 3 ? (hired ? [] : [['hired', 'I accepted it'], ['closed', 'Closed']]) : [['submitted', 'Reopen']];
  if (!moves.length) return '';
  return '<div class="bd-moves" role="group" aria-labelledby="bdm-' + id + '"><p class="bd-lab" id="bdm-' + id + '">' + (busy ? 'Saving…' : 'Move to') + '</p>' +
    moves.map(function (m) { return '<button type="button" class="kbtn' + (m[0] === 'closed' || m[0] === 'submitted' ? '' : ' solid') + '" data-bmove="' + m[0] + '" data-bid="' + id + '" aria-label="' + esc((m[0] === 'submitted' && c === 4 ? 'Reopen ' + co : 'Move ' + co + ' to ' + m[1])) + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + esc(m[1]) + '</button>'; }).join('') + '</div>';
}
function r18Ref(x) { return [x.submittedOn, x.applied, x.lastUpdate, x.followUpSent].filter(function (v) { return realISO(v); }).map(function (v) { return String(v).slice(0, 10); }).sort().pop() || ''; }
/* 7 to 30 days in Submitted with no update from the client (and no follow-up logged): time for a short follow-up */
function r18FollowDue(x) {
  if (!x || boardCol(x) !== 1 || isOutreach(x) || !/^(applied)?$/i.test(String(x.status || '').trim())) return false;
  var dd = daysFrom(r18Ref(x)); return dd != null && dd <= -7 && dd >= -30;
}
function r18First() { var c = (S.data && S.data.client) || {}; return c.firstName || String(c.name || '').split(' ')[0] || '[Your name]'; }
function r18RoleNote(x) { var r = String(x.role || '').trim(); return r ? 'the ' + r + ' role' : 'the open role'; }
function r18FollowText(x) {
  var co = String(x.company || '').trim();
  return 'Hi, I applied for ' + r18RoleNote(x) + (co ? ' with ' + co : '') + ' recently and wanted to say I am still very interested. I would welcome the chance to talk about how I can help. Thank you for your time.\n\n' + r18First();
}
function r18ThanksText(x) {
  var co = String(x.company || '').trim();
  return 'Hi [Name],\n\nThank you for taking the time to talk with me about ' + r18RoleNote(x) + (co ? ' at ' + co : '') + '. I enjoyed learning more about the team and the work, and I am even more interested in the job.\n\nI would welcome the next step. Please let me know if there is anything else I can send you.\n\nThank you again,\n' + r18First();
}
/* The thank-you note shows from the day an interview is logged (or from the interview day for older rows) while it sits in Interview. */
function r18ThanksOn(x) {
  if (!x || boardCol(x) !== 2) return false;
  var lg = daysFrom(x.ivLogged), iv = daysFrom(x.interview);
  return (lg != null && lg <= 0) || (iv != null && iv <= 0 && iv >= -14);
}
function r18ThanksOpen(x) { var lg = daysFrom(x.ivLogged), iv = daysFrom(x.interview); return lg === 0 || iv === 0 || iv === -1; }
function r18Extras(x) {
  var id = esc(x.id), h = '';
  if (r18FollowDue(x)) {
    var t = r18FollowText(x);
    h += '<div class="bd-fu" role="note"><p class="bd-fuh"><span class="pill gold">No update in a week</span> A short, polite follow-up can help you stand out. Here is a note you can copy and send to the recruiter or hiring manager.</p>' +
      '<pre class="bd-txt" id="fu-' + id + '">' + esc(t) + '</pre><div class="bd-moves"><button type="button" class="kbtn" data-copy="' + esc(t) + '" aria-describedby="fu-' + id + '">Copy the note</button>' +
      '<button type="button" class="kbtn" data-bfollow="' + id + '"' + (S.bdBusy[x.id] ? ' aria-disabled="true"' : '') + '>I followed up</button></div></div>';
  }
  if (r18ThanksOn(x)) {
    var tt = r18ThanksText(x), open = S.tyOpen && S.tyOpen[x.id] != null ? S.tyOpen[x.id] : r18ThanksOpen(x);
    h += '<details class="bd-ty" data-ty="' + id + '"' + (open ? ' open' : '') + '><summary>Thank-you note to send after your interview</summary>' +
      '<p class="psub">Send it the same day. Swap in the interviewer\'s name and one thing you talked about.</p><pre class="bd-txt" id="ty-' + id + '">' + esc(tt) + '</pre>' +
      '<button type="button" class="kbtn" data-copy="' + esc(tt) + '" aria-describedby="ty-' + id + '">Copy the note</button></details>';
  }
  return h + r18Moves(x);
}
function r18BoardSub() { return 'Move a card with one tap. You submit every application yourself; this board keeps track of where each one stands.'; }

function r18Submit(jobId) {
  var j = jobById(jobId); if (!j || S.bdBusy['job:' + jobId]) return;
  S.bdBusy['job:' + jobId] = true; render();
  post({ action: 'board', t: S.token, stage: 'submitted', jobId: j.id }).then(function (r) {
    delete S.bdBusy['job:' + jobId];
    if (r && r.ok) {
      var t = todayISO(), x = jobApp(j);
      if (!x) { x = { id: r.id, jobId: j.id, company: j.company, role: j.title, applied: t, status: 'Applied', followUpDue: '', interview: '', submittedOn: t, lastUpdate: t }; S.data.apps.unshift(x); }
      r18Opened(x); toast('Moved to Submitted. Nice work.'); r18MsCheck(false);
    } else r18Fail(r && r.error);
    render();
  }).catch(function () { delete S.bdBusy['job:' + jobId]; r18Fail('network'); render(); });
}
function r18Move(id, stage, closedAs) {
  var x = appById(id); if (!x || S.bdBusy[id]) return;
  S.bdBusy[id] = true; render();
  var body = { action: 'board', t: S.token, stage: stage, id: x.id }; if (closedAs) body.closedAs = closedAs;
  post(body).then(function (r) {
    delete S.bdBusy[id];
    if (r && r.ok) {
      var t = todayISO(); x.lastUpdate = t; S.bdClose = null;
      if (stage === 'followedup') { x.followUpSent = t; S.focusTo = '[data-app="' + cssq(x.id) + '"] .bd-moves button'; toast('Noted. No reminder about this one for another week.'); }
      else {
        var wasIv = boardCol(x) === 2 || !!x.interview; x.status = r.status || (closedAs || BOARD_STATUS[stage]);
        if (stage === 'interview' && !wasIv) x.ivLogged = t;
        r18Opened(x); toast(stage === 'hired' ? 'Marked as hired. Congratulations.' : 'Moved to ' + BOARD_COLS[boardCol(x)] + '.'); r18MsCheck(false);
      }
    } else r18Fail(r && r.error);
    render();
  }).catch(function () { delete S.bdBusy[id]; r18Fail('network'); render(); });
}
/* after a move: open the column it landed in, scroll to it, keep the keyboard on that card */
function r18Opened(x) { var k = boardCol(x); if (S.colOpen) S.colOpen[k] = true; else S.openCol = k; S.scrollApp = x.id; S.focusTo = '[data-app="' + cssq(x.id) + '"] .bd-moves button, [data-app="' + cssq(x.id) + '"] [data-upd]'; }
function r18Fail(e) { if (e === 'expired') { S.reauthMsg = true; toast('Your sign-in has expired. Nothing was saved.'); } else if (e === 'limit') toast('That is a lot of moves in one hour. Please try again a little later.'); else toast(errText(e, 'application')); }

/* ---- milestones: first match, first application submitted, first interview, offer, hired ---- */
var MS_ORDER = ['match', 'submitted', 'interview', 'offer', 'hired'];
var MS_TEXT = {
  match: { h: 'Your first match is here.', p: 'Take a look and say yes to the ones you want. For each yes, I tailor your resume and cover letter.' },
  submitted: { h: 'First application sent.', p: 'You submitted your first application. That is a real step forward. Keep your board up to date and I will help with the next one.' },
  interview: { h: 'You landed an interview!', p: 'Nice work. Practice the questions they are likely to ask, and send a thank-you note the same day. It is on the card in Interview.' },
  offer: { h: 'You got an offer!', p: 'Congratulations. Before you say yes, make sure the pay and benefits are right for you. If you want to talk it through, book a free call with me.' },
  hired: { h: 'Congratulations on your new role!', p: 'It has been a pleasure helping you get here.', ask: 'One small favor, only if you are up for it: share a sentence or two about your experience. It helps other job seekers decide whether to work with me.' }
};
/* the same rules as the API (msReached_), from what the portal has */
function r18Reached(d) {
  var r = { match: !!((d.jobs || []).length || (d.closed || []).length) };
  (d.apps || []).forEach(function (a) {
    var st = String(a.status || '');
    if (!isOutreach(a)) r.submitted = true;
    if (/interview|next round/i.test(st) || String(a.interview || '').trim() || /offer|hired/i.test(st)) r.interview = true;
    if (/offer|hired|accepted/i.test(st)) r.offer = true;
    if (/\bhired\b|accepted/i.test(st)) r.hired = true;
  });
  return MS_ORDER.filter(function (k) { return r[k]; });
}
/* fromLoad: the server's unseen list. Otherwise: milestones reached by what the client just did. Shows the biggest one, records
   every one shown as seen on the server (so no other device shows it), and returns true when a celebration opened. */
function r18MsCheck(fromLoad) {
  var m = S.data && S.data.milestones; if (!m || m.on !== true || !Array.isArray(m.reached) || S.status !== 'ready') return false;
  var list = fromLoad ? (m.unseen || []).slice() : r18Reached(S.data).filter(function (k) { return m.reached.indexOf(k) < 0; });
  list = list.filter(function (k) { return MS_ORDER.indexOf(k) >= 0 && !S.msShown[k]; });
  list.forEach(function (k) { if (m.reached.indexOf(k) < 0) m.reached.push(k); });
  m.unseen = (m.unseen || []).filter(function (k) { return list.indexOf(k) < 0; });
  if (!list.length) return false;
  var top = list.slice().sort(function (a, b) { return MS_ORDER.indexOf(b) - MS_ORDER.indexOf(a); })[0];
  list.forEach(function (k) { S.msShown[k] = true; if (!S.demo) { try { post({ action: 'milestoneSeen', t: S.token, k: k }).catch(function () {}); } catch (e) {} } });
  r18Celebrate(top);
  return true;
}
function r18Celebrate(k) {
  var T = MS_TEXT[k]; if (!T) return;
  var old = document.querySelector('.ms-wrap'); if (old) old.remove();
  var prev = document.activeElement;
  var wrap = document.createElement('div'); wrap.className = 'ms-wrap' + (REDUCED ? ' still' : '');
  wrap.innerHTML = '<div class="ms-card" role="dialog" aria-modal="true" aria-labelledby="ms-h" aria-describedby="ms-p" data-ms="' + k + '">' +
    '<div class="ms-sun" aria-hidden="true"><span></span></div>' +
    '<h2 id="ms-h" tabindex="-1">' + esc(T.h) + '</h2><p id="ms-p">' + esc(T.p) + '</p>' + (T.ask ? '<p class="ms-ask">' + esc(T.ask) + '</p>' : '') +
    '<div class="ms-acts">' + (k === 'hired' ? '<button type="button" class="btn gold" data-msfeedback>Share my experience</button>' : '') +
    (k === 'offer' ? '<a class="btn gold" href="' + BOOKING_URL + '" target="_blank" rel="noopener noreferrer">Book a free call</a>' : '') +
    '<button type="button" class="btn ' + (k === 'hired' || k === 'offer' ? 'ghost' : 'gold') + '" data-msclose>' + (k === 'hired' ? 'Maybe later' : 'Thanks') + '</button></div></div>';
  document.body.appendChild(wrap);
  wrap._prev = prev;
  var h = wrap.querySelector('#ms-h'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
  if (!REDUCED && window.SPFX && typeof SPFX.burstAt === 'function') { try { setTimeout(function () { SPFX.burstAt(wrap.querySelector('.ms-sun'), { n: 10, r: 90 }); }, 260); } catch (e) {} }
}
function r18MsClose(then) {
  var w = document.querySelector('.ms-wrap'); if (!w) return;
  var prev = w._prev; w.remove();
  if (then) { then(); return; }
  var t = prev && document.contains(prev) ? prev : document.querySelector('.ptitle h1');
  if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
}
/* after the page loads (and the portal has drawn), the server's unseen milestones */
function r18AfterLoad() { setTimeout(function () { if (S.status === 'ready' && !S.deck && !document.querySelector('.ms-wrap')) r18MsCheck(true); }, 500); }

/* ---- one-time "Add to home screen" card, with iPhone and Android steps ---- */
function r18IsIOS() { var u = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); }
function r18A2hsSeen() { return !!(lsGet('sp_a2hs_once') || lsGet('sp_a2hs')); }
function r18A2hsDone() { lsSet('sp_a2hs_once', '1'); }
function r18InstallCard() {
  if (standalone()) { if (!r18A2hsSeen()) r18A2hsDone(); return ''; }
  if (r18A2hsSeen()) return '';
  var phone = coarse() || r18IsIOS() || /Android/i.test(navigator.userAgent || '');
  if (!phone && !installEvt) return '';
  var ios = '<div class="a2-os"><h3>iPhone</h3><ol><li>In Safari, tap the Share button (the square with an arrow).</li><li>Tap Add to Home Screen.</li><li>Tap Add.</li></ol></div>';
  var and = '<div class="a2-os"><h3>Android</h3><ol><li>In Chrome, tap the menu (three dots, top right).</li><li>Tap Add to Home screen, or Install app.</li><li>Tap Add or Install.</li></ol></div>';
  var ic = '<div class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#F2D98A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7 v7 M8.8 10.8 12 14 l3.2 -3.2"/></svg></div>';
  return '<section class="a2hs a2once" aria-labelledby="a2h-h">' + ic + '<div><h2 id="a2h-h">Add Steady Path to your home screen</h2><p>It opens full screen, like an app, one tap from your jobs.</p></div>' +
    (installEvt ? '<div class="row"><button type="button" class="btn gold" data-a2hs-go>Add it now</button></div>' : '') +
    '<div class="a2-steps">' + (r18IsIOS() ? ios + and : and + ios) + '</div>' +
    '<div class="row"><button type="button" class="btn ghost" data-a2hs-done>Got it, don\'t show this again</button></div></section>';
}
window.addEventListener('appinstalled', function () { r18A2hsDone(); if (S.status === 'ready') render(); });

/* ---- sign-out clean-up: everything the portal kept on this device ---- */
var R18_KEYS = /^(spdemo_)?sp_(token|replyseen|kit_|pvnotes_|jsort|swipehint|a2hs$)/;
function r18ClearDevice() {
  try { for (var k = localStorage.length - 1; k >= 0; k--) { var lk = localStorage.key(k); if (R18_KEYS.test(lk || '')) localStorage.removeItem(lk); } } catch (e) {}
  try { sessionStorage.removeItem('sp_linkkey'); } catch (e) {}
  /* the cached portal page (the app shell); the site's other cached pages and assets stay */
  try {
    if (window.caches && caches.keys) caches.keys().then(function (keys) {
      keys.forEach(function (name) { caches.open(name).then(function (c) { return c.keys().then(function (reqs) { reqs.forEach(function (rq) { try { if (new URL(rq.url).pathname.indexOf('/portal/') === 0) c['delete'](rq); } catch (e) {} }); }); }).catch(function () {}); });
    }).catch(function () {});
  } catch (e) {}
  var w = document.querySelector('.ms-wrap'); if (w) w.remove();
  S.msShown = {}; S.bdBusy = {}; S.bdClose = null; S.tyOpen = null;
}

/* ---- offline ---- */
window.addEventListener('online', function () { if (S.status === 'error' && S.errKind === 'offline') load(); });

/* ---- events ---- */
document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('button'); if (!t) return; var d = t.dataset;
  if (d.a2hsDone != null) { r18A2hsDone(); S.focusTo = '.ptitle h1'; render(); return; }
  if (d.msclose != null) { r18MsClose(); return; }
  if (d.msfeedback != null) { r18MsClose(function () { go('feedback'); }); return; }
  if (S.status !== 'ready') return;
  if (t.getAttribute('aria-disabled') === 'true' && (d.bmove || d.bclosed || d.bsubmit || d.bfollow)) return;
  if (d.bsubmit) { r18Submit(d.bsubmit); return; }
  if (d.bfollow) { r18Move(d.bfollow, 'followedup'); return; }
  if (d.bmove && d.bid) {
    if (d.bmove === 'closed') { S.bdClose = d.bid; S.focusTo = '[data-app="' + cssq(d.bid) + '"] [data-bclosed]'; render(); return; }
    r18Move(d.bid, d.bmove); return;
  }
  if (d.bclosed && d.bid) { if (BOARD_CLOSED.indexOf(d.bclosed) >= 0) r18Move(d.bid, 'closed', d.bclosed); return; }
  if (d.bcancel) { S.bdClose = null; S.focusTo = '[data-app="' + cssq(d.bcancel) + '"] [data-bmove="closed"]'; render(); return; }
});
/* the thank-you note keeps its open or closed state across re-renders */
document.addEventListener('toggle', function (e) { var el = e.target; if (el && el.matches && el.matches('details[data-ty]')) { S.tyOpen = S.tyOpen || {}; S.tyOpen[el.getAttribute('data-ty')] = el.open; } }, true);
/* the celebration: Escape closes it; Tab stays inside it */
document.addEventListener('keydown', function (e) {
  var w = document.querySelector('.ms-wrap'); if (!w) return;
  if (e.key === 'Escape') { e.preventDefault(); r18MsClose(); return; }
  if (e.key !== 'Tab') return;
  var f = [].slice.call(w.querySelectorAll('button, a[href]')); if (!f.length) return;
  var i = f.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  else if (i < 0) { e.preventDefault(); f[0].focus(); }
});
