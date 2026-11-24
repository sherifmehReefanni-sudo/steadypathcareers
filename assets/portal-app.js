/* Steady Path portal: the portal's own scripts in one file (assets/portal-app.js), loaded once at the end of portal/index.html
   after assets/site.js and assets/fx.js. Nov 15, 2026: merged from the round files (portal-r18.js, portal.js, fit-r35.js,
   portal-r42.js, portal-r44.js, portal-r45.js) in the order they used to load, each under its own PART heading. Later rounds
   no longer wrap earlier functions: render, go, signOut and toast (portal/index.html) and navRestore, r44Tools and r44Wipe
   (here) are each one definition. The pure helper blocks of the r42, r44 and r45 parts read no DOM and no globals. */

/* ================================ PART: round 18, the application board and more (was assets/portal-r18.js) ================================ */
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
/* r47: on the desktop board, text that makes a card long sits behind a More button (Less when open), so a card is not a strip of
   wrapped text. On phones and tablets the text shows as before and there is no button. Only text is ever folded, never a control.
   The button's accessible name says which card it is about, so it is not confused with the More tab. Nothing is sent. */
function r47Fold(id, name, inner) {
  var open = !!(S.bdMore && S.bdMore[id]);
  return '<button type="button" class="bd-more" data-bdmore="' + esc(id) + '" data-bdname="' + esc(name) + '" aria-expanded="' + open + '" aria-controls="bdn-' + esc(id) + '" aria-label="' + (open ? 'Less' : 'More') + ' about ' + esc(name) + '">' + (open ? 'Less' : 'More') + '</button><div class="bd-fold' + (open ? ' open' : '') + '" id="bdn-' + esc(id) + '">' + inner + '</div>';
}
function r18ReadyCard(j) {
  var id = esc(j.id), busy = S.bdBusy['job:' + j.id];
  return '<div class="app rdy" data-rdy="' + id + '"><b>' + esc(j.company || j.title) + '</b><div class="psub">' + esc(j.title) + '</div>' +
    '<div class="apills"><span class="pill ok">Documents approved</span>' + (j.pay ? '<span class="pill">' + esc(payText(j)) + '</span>' : '') + '</div>' +
    r47Fold('job:' + j.id, coName(j), '<p class="bd-note">You submit it yourself on the employer\'s site. Then tap I submitted it, and it moves to Submitted.</p>') + /* r47: behind More on the desktop board */
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
  var hired = /\bhired\b|accepted/i.test(x.status || ''), ivd = !!String(x.interview || '').trim();
  /* r1: with an interview date there is no "Back to Submitted" (the API refuses it); Reopen goes back to Interview */
  var moves = c === 1 ? [['interview', 'Interview'], ['closed', 'Closed']] : c === 2 ? [['offer', 'Offer'], ['closed', 'Closed']].concat(ivd ? [] : [['submitted', 'Back to Submitted']]) :
    c === 3 ? (hired ? [] : [['hired', 'I accepted it'], ['closed', 'Closed']]) : [[ivd ? 'interview' : 'submitted', 'Reopen']];
  if (!moves.length) return '';
  return '<div class="bd-moves" role="group" aria-labelledby="bdm-' + id + '"><p class="bd-lab" id="bdm-' + id + '">' + (busy ? 'Saving…' : 'Move to') + '</p>' +
    moves.map(function (m) { return '<button type="button" class="kbtn' + (m[0] === 'closed' || m[0] === 'submitted' ? '' : ' solid') + '" data-bmove="' + m[0] + '" data-bid="' + id + '" aria-label="' + esc((c === 4 ? 'Reopen ' + co : 'Move ' + co + ' to ' + m[1])) + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + esc(m[1]) + '</button>'; }).join('') + '</div>';
}
function r18Ref(x) { return [x.submittedOn, x.applied, x.lastUpdate, x.followUpSent].filter(function (v) { return realISO(v); }).map(function (v) { return String(v).slice(0, 10); }).sort().pop() || ''; }
/* 7 to 30 days in Submitted with no update from the client (and no follow-up logged): time for a short follow-up */
function r18FollowDue(x) {
  if (!x || boardCol(x) !== 1 || isOutreach(x) || String(x.interview || '').trim() || !/^(applied)?$/i.test(String(x.status || '').trim())) return false;
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
/* r1/r2: the thank-you note shows on and after the interview date (for two weeks), or, with no date, from the day the interview was logged, while the card sits in Interview; collapsed until opened. */
function r18ThanksOn(x) {
  if (!x || boardCol(x) !== 2) return false;
  var iv = daysFrom(x.interview);
  if (iv != null) return iv <= 0 && iv >= -14; /* a date: on or after it */
  var lg = daysFrom(x.ivLogged); return lg != null && lg <= 0 && lg >= -14; /* r2: no date: from the day the interview was logged */
}
function r18ThanksOpen(x) { return false; }
function r18Extras(x) {
  var id = esc(x.id), h = '';
  if (typeof r44FuLine !== 'function' && r18FollowDue(x)) { /* r45: with the r44 follow-up line on the card, this older block is not shown; "I followed up" lives on that line */
    var t = r18FollowText(x);
    h += '<div class="bd-fu" role="note"><p class="bd-fuh"><span class="pill gold">No update in a week</span> A short, polite follow-up can help you stand out.</p>' +
      '<details class="bd-fud"><summary>Show a note to send</summary><pre class="bd-txt" id="fu-' + id + '">' + esc(t) + '</pre></details><div class="bd-moves"><button type="button" class="kbtn" data-copy="' + esc(t) + '" aria-label="Copy the follow-up note for ' + esc(coOr(x)) + '">Copy the note</button>' +
      '<button type="button" class="kbtn" data-bfollow="' + id + '"' + (S.bdBusy[x.id] ? ' aria-disabled="true"' : '') + '>I followed up</button></div></div>';
  }
  if (r18ThanksOn(x)) {
    var tt = r18ThanksText(x), open = S.tyOpen && S.tyOpen[x.id] != null ? S.tyOpen[x.id] : r18ThanksOpen(x);
    h += '<details class="bd-ty" data-ty="' + id + '"' + (open ? ' open' : '') + '><summary>Thank-you note for your interview</summary>' +
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
        var wasIv = !!x.ivLogged || boardCol(x) === 2 || !!x.interview; x.status = r.status || (closedAs || BOARD_STATUS[stage]);
        if (stage === 'interview' && !wasIv) x.ivLogged = t;
        r18Opened(x); toast(stage === 'hired' ? 'Marked as hired. Congratulations.' : 'Moved to ' + BOARD_COLS[boardCol(x)] + '.'); r18MsCheck(false);
      }
    } else r18Fail(r && r.error);
    render();
  }).catch(function () { delete S.bdBusy[id]; r18Fail('network'); render(); });
}
/* after a move: open the column it landed in, scroll to it, keep the keyboard on that card */
function r18Opened(x) { var k = boardCol(x); if (S.colOpen) S.colOpen[k] = true; else S.openCol = k; S.scrollApp = x.id; S.focusTo = '[data-app="' + cssq(x.id) + '"] .bd-moves button, [data-app="' + cssq(x.id) + '"] [data-upd]'; }
function r18Fail(e) { if (e === 'has interview') toast('This one has an interview date, so it stays in Interview. Change the date with Update if it was a mistake.'); else if (e === 'expired') { S.reauthMsg = true; toast('Your sign-in has expired. Nothing was saved.'); } else if (e === 'limit') toast('That is a lot of moves in one hour. Please try again a little later.'); else toast(errText(e, 'application')); }

/* ---- milestones: first match, first application submitted, first interview, offer, hired ---- */
var MS_ORDER = ['match', 'submitted', 'interview', 'offer', 'hired'];
var MS_TEXT = {
  match: { h: 'Your first match is here.', p: 'Take a look and say yes to the ones you want. For each yes, your tailored resume and cover letter are drafted automatically.' },
  submitted: { h: 'First application sent.', p: 'You submitted your first application. That is a real step forward. Keep your board up to date and we will help with the next one.' },
  interview: { h: 'You landed an interview!', p: 'Nice work. Practice the questions they are likely to ask, and send a thank-you note the same day. It is on the card in Interview.' },
  offer: { h: 'You got an offer!', p: 'Congratulations. Before you say yes, make sure the pay and benefits are right for you. Offer questions go to a person, who answers within 1 business day.' },
  hired: { h: 'Congratulations on your new role!', p: 'It has been a pleasure helping you get here.', ask: 'One small favor, only if you are up for it: share a sentence or two about your experience. It helps other job seekers decide whether to work with Steady Path.' }
};
/* r2: milestones use an ALLOW-LIST of exact statuses (trimmed, any case), the same definition as the API (Code_v1.29.gs MS_STATUS;
   a test checks the two are identical). Any other free text reaches nothing past submitted. stageOf's Closed list stays as a guard. */
function r18Reached(d) {
  var MS_STATUS = { interview: ['interview scheduled', 'interviewed, waiting to hear', 'next round'], offer: ['offer', 'offer accepted', 'hired'], hired: ['hired', 'offer accepted'] };
  var key = function (st) { return String(st == null ? '' : st).replace(/\s+/g, ' ').trim().toLowerCase(); };
  var day = function (v) { var m = String(v || '').match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return false; var x = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return x.getUTCMonth() === +m[2] - 1 && x.getUTCDate() === +m[3]; };
  var r = { match: !!((d.jobs || []).length || (d.closed || []).length) };
  (d.apps || []).forEach(function (a) {
    var k = key(a.status);
    if (!isOutreach(a)) r.submitted = true;
    if (stageOf(a) === 4) return; /* closed or rejected (the API's CLOSED_STATUS_RE_) */
    var offer = MS_STATUS.offer.indexOf(k) >= 0;
    if (MS_STATUS.interview.indexOf(k) >= 0 || offer || day(a.interview)) r.interview = true;
    if (offer) r.offer = true;
    if (MS_STATUS.hired.indexOf(k) >= 0) r.hired = true;
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
var R18_KEYS = /^(spdemo_)?sp_(token|replyseen|kit_|pvnotes_|jsort|swipehint|a2hs(_once)?$)/;
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
  if (d.bdmore) { S.bdMore = S.bdMore || {}; var on = S.bdMore[d.bdmore] = !S.bdMore[d.bdmore]; t.setAttribute('aria-expanded', String(on)); t.textContent = on ? 'Less' : 'More'; t.setAttribute('aria-label', (on ? 'Less' : 'More') + ' about ' + (d.bdname || 'this application')); var bn = document.getElementById(t.getAttribute('aria-controls')); if (bn) bn.classList.toggle('open', on); return; } /* r47: shows or hides a card's folded text; nothing is sent */
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

/* r47: the desktop board fades the edge where columns continue out of view (classes cut-l and cut-r on .board). Layout only. */
(function () {
  if (typeof document === 'undefined') return;
  var edge = function () { var b = document.querySelector('.board'); if (!b) return; var more = b.scrollWidth - b.clientWidth; b.classList.toggle('cut-r', more > 4 && b.scrollLeft < more - 4); b.classList.toggle('cut-l', more > 4 && b.scrollLeft > 4); };
  document.addEventListener('scroll', function (e) { if (e.target && e.target.classList && e.target.classList.contains('board')) edge(); }, true);
  window.addEventListener('resize', edge);
  var app = document.getElementById('app'); if (app && typeof MutationObserver === 'function') new MutationObserver(function () { edge(); }).observe(app, { childList: true });
  edge();
})();

/* ================================ PART: visual layer (was assets/portal.js) ================================ */
/* Steady Path portal: visual layer only. After each render (batched into one animation frame) it reads the portal state,
   never writes it, and adds motion that marks real progress: a burst when a Yes is saved (not on the tap, and not while
   its undo window is open), on "I applied", on an approved document, on a new interview date and when the deck is done;
   the tracker and progress bar grow as things advance; the header eases in when the tab changes; a job's marker on the
   journey map hops to its new stage; the next-step card eases in when the step changes.
   Reduced motion (read live): no bursts, no motion. */
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
    (d.docs || []).forEach(function (x) { if (window.isApprovedSt(x.status)) s.ok[x.id] = 1; });
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

/* ================================ PART: Find Your Fit (was assets/fit-r35.js) ================================ */
/* r27: Find Your Fit (S.view 'fit'). The O*NET Mini Interest Profiler: 30 items and five answer labels exactly as O*NET publishes
   them (CC BY-ND 4.0, no rewording), scored on the server (action fitSubmit). Raw answers live only in this page's memory and are
   cleared once the scores come back. Everything playful is design: the road from the logo fills as they answer, a sun ray lights
   about every four or five questions, each area has its own color and icon. prefers-reduced-motion (REDUCED, read live) turns off
   every animation, the auto-advance delay and the confetti, and still shows everything.
   r35: (1) the full version: the complete 60-question O*NET Interest Profiler Short Form in O*NET's published order (fit.deep
   from the API, O*NET's wording, never split or reordered), same quiz screens, sent whole with action fitDeep; it replaces the
   30-question results; results scale to fit.max (20 or 40). (2) "What matters to you at work":
   our own ten questions (not O*NET, no O*NET credit), action fitPrefs. (3) The weekly "How are your matches?" card on the Jobs
   view, action matchCheck. Each part only shows when the API sends what it needs (fit.deep, fit.prefs, lastMatchCheck). */
var FIT_NAME = 'Find Your Fit';
var FIT_SCALE = ['Strongly Dislike', 'Dislike', 'Unsure', 'Like', 'Strongly Like']; /* O*NET's labels, word for word */
/* O*NET's published item order cycles the six areas (R I A S E C); the page uses it only to tint each question. Scoring is on the server. */
var FIT_CYCLE = ['R', 'I', 'A', 'S', 'E', 'C'];
var FIT_IC = {
  R: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.1-5.4l-2.5 2.5-2.3-.6-.6-2.3z"/></svg>',
  I: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>',
  A: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 3.5c-3 1.2-7.4 5.6-9.2 8.6l1.6 1.6c3-1.8 7.4-6.2 8.6-9.2z"/><path d="M9.6 13.1c-2.2 0-3.6 1.6-3.6 3.6 0 1.1-.7 2-2 2.3 1 1 2.4 1.5 3.8 1.5 2.6 0 4.4-1.8 4.4-4.2z"/></svg>',
  S: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 19c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5"/><path d="M14.5 14.6c.6-.3 1.3-.5 2-.5 2.3 0 4.1 1.6 4.5 4.4"/></svg>',
  E: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c3 2.2 4.6 5.5 4.6 9.2L14.5 16h-5l-2.1-3.8C7.4 8.5 9 5.2 12 3z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M9.5 16l-1.5 4 2.6-1.4M14.5 16l1.5 4-2.6-1.4"/></svg>',
  C: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 8.5l1.3 1.3L11.8 7.3M8 14l1.3 1.3 2.5-2.5M13.5 9h3M13.5 14.5h3"/></svg>'
};
/* plain words, our own; the O*NET area name is shown beside each one */
var FIT_AREA = {
  R: { name: 'Builder', onet: 'Realistic', line: 'Hands-on work with tools, machines, or the outdoors.', c: '#9C4413', t: '#FDEBDF' },
  I: { name: 'Thinker', onet: 'Investigative', line: 'Figuring things out: research, data, and solving puzzles.', c: '#1A6496', t: '#E2EFF8' },
  A: { name: 'Creator', onet: 'Artistic', line: 'Making things: writing, design, music, or new ideas.', c: '#8E3B8F', t: '#F3E4F3' },
  S: { name: 'Helper', onet: 'Social', line: 'Helping, teaching, and caring for people.', c: '#A82B50', t: '#FBE3EA' },
  E: { name: 'Leader', onet: 'Enterprising', line: 'Leading, selling, and persuading people.', c: '#7A5300', t: '#FFF1C9' },
  C: { name: 'Organizer', onet: 'Conventional', line: 'Keeping things in order: records, numbers, and systems.', c: '#196A4E', t: '#E1F2EA' }
};
var FIT_CREDIT_IP = 'This page includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the <a href="https://creativecommons.org/licenses/by-nd/4.0/" target="_blank" rel="noopener noreferrer">CC BY-ND 4.0</a> license. O*NET&reg; is a trademark of USDOL/ETA.';
function fitCreditDb(rel) { return 'Title suggestions and job interest matches: this page includes information from the O*NET ' + SP.esc(rel || '31.0') + ' Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> license. O*NET&reg; is a trademark of USDOL/ETA. Steady Path Careers has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.'; }

S.fx = { step: 'intro', i: 0, ans: [], dans: [], deep: false, lock: false, err: '', share: null, tBusy: {}, fresh: false, pf: null };
function fitOn() { return !!(S.data && S.data.fit && S.data.fit.items && S.data.fit.items.length === 30); }
function fitDone() { return fitOn() && !!S.data.fit.done && !!S.data.fit.scores; }
/* r35: the form being answered: the 30-item Mini-IP (items) or the full 60-item Short Form (deep) */
function fitPart() { var f = S.data.fit, x = S.fx; return x.deep ? { items: f.deep || [], ans: x.dans, off: 0, total: 60 } : { items: f.items, ans: x.ans, off: 0, total: 30 }; }
function fitDeepOn() { var f = S.data.fit; return fitOn() && Array.isArray(f.deep) && f.deep.length === 60; }
/* O*NET's Short Form order is six blocks of ten (R I A S E C); the Mini-IP cycles the six areas. Used only to tint the question. */
function fitAreaAt(i) { return S.fx.deep ? FIT_CYCLE[Math.floor(i / 10)] : FIT_CYCLE[i % 6]; }
function fitMax() { return S.data.fit.max === 40 ? 40 : 20; }
/* r35: say a status line again so screen readers announce it after a re-render */
function fxAnnounce(id) { setTimeout(function () { var el = document.getElementById(id); if (!el) return; var t = el.textContent; el.textContent = ''; setTimeout(function () { el.textContent = t; }, 60); }, 0); }
function fitNames(ks) { var n = ks.map(function (k) { return FIT_AREA[k].name; }); return n.length < 3 ? n.join(' and ') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1]; }

/* ---- the road from the logo: fills from the bottom toward the sun; a ray lights about every 4 or 5 answers ---- */
var FIT_ROAD = null;
function fitRoad(done, total, big) {
  if (!FIT_ROAD) { var m = /<path d="(M49\.0 41\.1[^"]*)" fill="#FAF6EC"\/>/.exec(SP.mark('fxm')); FIT_ROAD = m ? m[1] : ''; }
  var p = Math.max(0, Math.min(1, done / total)), lit = Math.floor(done * 7 / total + 1e-9), rays = '';
  for (var r = 0; r < 7; r++) rays += '<path class="fx-ray' + (r < lit ? ' on' : '') + '" d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" transform="rotate(' + (-72 + r * 24) + ' 50 40)"/>';
  var top = 104 - p * 64; /* the road runs from y 104 (bottom) up to y 40 (the sun) */
  return '<svg class="fx-road' + (big ? ' big' : '') + '" viewBox="0 0 100 106" aria-hidden="true"><defs><linearGradient id="fxsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F3A5F"/><stop offset=".7" stop-color="#5A5F8E"/><stop offset="1" stop-color="#B9786A"/></linearGradient>' +
    '<clipPath id="fxclip"><rect class="fx-fillr" x="0" y="' + top.toFixed(2) + '" width="100" height="' + (106 - top).toFixed(2) + '"/></clipPath><clipPath id="fxbox"><rect width="100" height="106" rx="22"/></clipPath></defs>' +
    '<g clip-path="url(#fxbox)"><rect width="100" height="106" fill="#1F3A5F"/><rect width="100" height="40" fill="url(#fxsky)"/><circle cx="50" cy="40" r="7" class="fx-sun' + (done >= total ? ' on' : '') + '"/>' + rays +
    '<path d="' + FIT_ROAD + '" fill="#FAF6EC" opacity=".22"/><path d="' + FIT_ROAD + '" fill="#FFD166" clip-path="url(#fxclip)"/></g></svg>';
}

/* ---- views ---- */
function vFit() {
  var f = S.data.fit, x = S.fx;
  if (x.step === 'intro' && f.done && !x.retake) x.step = 'results';
  if (x.step === 'results' && !f.done) x.step = 'intro';
  if (x.step === 'prefs' && !('prefs' in f)) x.step = f.done ? 'results' : 'intro';
  var body = x.step === 'q' ? fitQ() : x.step === 'reveal' ? fitReveal() : x.step === 'results' ? fitResults() + fitPrefsCard() : x.step === 'prefs' ? fitPrefs() : fitIntro();
  var sub = 'An interest guide. Optional, and it never limits which jobs you see.';
  return shell('', esc(FIT_NAME), sub) + '<div class="pband" aria-hidden="true"></div><main class="pmain fx-main">' + body + '</main>' + (x.share ? fitShareDlg() : '') + tabbar('');
}
function fitChips() { return '<ul class="fx-chips" aria-label="The six interest areas">' + FIT_CYCLE.map(function (k) { var A = FIT_AREA[k]; return '<li style="--ac:' + A.c + ';--at:' + A.t + '"><span class="fx-ic">' + FIT_IC[k] + '</span>' + A.name + '</li>'; }).join('') + '</ul>'; }
function fitIntro() {
  var x = S.fx;
  return '<section class="fx fx-intro" aria-labelledby="fxH">' +
    '<div class="fx-hero"><span class="fx-logo">' + SP.mark('fxi') + '</span><div class="fx-herot"><h2 class="fx-big" id="fxH" tabindex="-1">' + esc(FIT_NAME) + '</h2>' +
    '<p class="fx-lead">30 quick questions, ' + FIT_ABOUT + '10 minutes, no wrong answers.</p>' +
    '<p class="fx-sub">Each screen shows one activity. Tap how much you would like doing it. Don\'t worry about training or pay; just go with your gut.</p>' +
    '<button type="button" class="fx-start" data-fxstart>' + (x.ans.length ? 'Pick up where you left off' : 'Start') + '</button></div></div>' +
    fitChips() + (fitDeepOn() ? '<p class="fx-plain fx-alt">Prefer the full version? <button type="button" class="linkbtn" data-fxdeep aria-label="Take the 60-question O*NET&reg; Interest Profiler Short Form instead (about 15 to 20 minutes)">Take the 60-question O*NET&reg; Interest Profiler Short Form instead (' + FIT_ABOUT + '15 to 20 minutes)</button></p>' : '') +
    '<div class="fx-why card"><h3>What you get</h3><ul><li>Your top three interest areas, in plain words.</li><li>Five job titles that line up with them, to say Yes or No to.</li><li>A short "why it fits you" line on job matches where we can tell.</li></ul>' +
    '<p class="fx-plain">This is an interest guide, not a test, and it is optional. It never limits which jobs you see. We keep your six area scores, not your answers.</p></div>' +
    (S.demo ? '<p class="fx-demo"><button type="button" class="linkbtn" data-fxdemo>Demo: fill in sample answers</button></p>' : '') +
    '<p class="fx-credit">Uses the O*NET&reg; Interest Profiler (30-question version). ' + FIT_CREDIT_IP + '</p></section>';
}
function fitQ() {
  var x = S.fx, P = fitPart(), i = x.i, it = P.items[i], k = fitAreaAt(i), A = FIT_AREA[k], done = P.off + P.ans.filter(function (v) { return v; }).length;
  var half = x.deep ? 30 : 15, near = x.deep ? 50 : 25, moment = i === half ? 'Halfway there.' : i === near ? 'Almost done.' : '';
  var pills = FIT_SCALE.map(function (lab, n) { var v = n + 1; return '<button type="button" class="fx-pill p' + v + (x.pop === v ? ' pop' : '') + '" data-fxa="' + v + '" aria-pressed="' + (P.ans[i] === v) + '"><kbd aria-hidden="true">' + v + '</kbd><span>' + lab + '</span></button>'; }).join('');
  return '<section class="fx fx-q" style="--ac:' + A.c + ';--at:' + A.t + '" aria-labelledby="fxItem">' +
    '<div class="fx-qtop"><button type="button" class="fx-back" data-fxback>' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button>' +
    '<span class="fx-count" aria-live="polite" aria-atomic="true">' + (x.deep ? 'O*NET&reg; Interest Profiler Short Form, question ' : 'Question ') + (i + 1) + ' of ' + P.total + (moment ? '. ' + moment : '') + '</span></div>' +
    '<div class="fx-qwrap"><div class="fx-side">' + fitRoad(done, P.total, false) +
    '<div class="fx-bar" role="progressbar" aria-label="Answered" aria-valuemin="0" aria-valuemax="' + P.total + '" aria-valuenow="' + done + '"><i style="width:' + Math.round(done / P.total * 100) + '%"></i></div></div>' +
    '<div class="fx-card">' + (moment ? '<p class="fx-moment' + (i === half ? ' half' : ' near') + '" aria-hidden="true">' + moment + '</p>' : '') +
    '<span class="fx-qic">' + FIT_IC[k] + '</span><p class="fx-ask">How much would you like this?</p>' +
    '<h2 class="fx-item" id="fxItem" tabindex="-1">' + esc(it.text) + '</h2>' +
    '<div class="fx-pills" role="group" aria-label="Your answer">' + pills + '</div>' +
    (x.err ? '<p class="warn" role="alert">' + esc(x.err) + '</p>' : '') +
    '<p class="fx-keys">Keys 1 to 5 answer too. You can go back any time.</p></div></div>' +
    '<p class="fx-credit">' + (x.deep ? 'The O*NET&reg; Interest Profiler Short Form (60 questions). ' : 'The O*NET&reg; Interest Profiler (30-question version). ') + FIT_CREDIT_IP + '</p></section>';
}
function fitReveal() {
  return '<section class="fx fx-reveal" aria-live="polite"><div class="fx-hero">' + fitRoad(30, 30, true) + '<div class="fx-herot"><h2 class="fx-big" id="fxH" tabindex="-1">Reading your answers...</h2><p class="fx-lead">Lining up your top interests.</p></div></div>' + fitChips() + '</section>';
}
function fitRadar(s) {
  var cx = 150, cy = 140, R = 92, pt = function (k, v) { var a = (-90 + FIT_CYCLE.indexOf(k) * 60) * Math.PI / 180; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  var ring = function (v) { return FIT_CYCLE.map(function (k) { return pt(k, v).map(function (n) { return n.toFixed(1); }).join(','); }).join(' '); };
  var mx = fitMax(), poly = FIT_CYCLE.map(function (k) { return pt(k, Math.max(0.04, s[k] / mx)).map(function (n) { return n.toFixed(1); }).join(','); }).join(' ');
  var axes = '', dots = '', labs = '';
  FIT_CYCLE.forEach(function (k) {
    var e = pt(k, 1), d = pt(k, Math.max(0.04, s[k] / mx)), l = pt(k, 1.2), A = FIT_AREA[k];
    axes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
    dots += '<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="6" fill="' + A.c + '"/>';
    labs += '<text x="' + l[0].toFixed(1) + '" y="' + (l[1] + 5).toFixed(1) + '" text-anchor="middle" fill="' + A.c + '" style="--ac:' + A.c + '">' + A.name + '</text>';
  });
  var label = 'Your six interest areas: ' + FIT_CYCLE.map(function (k) { return FIT_AREA[k].name + ' (' + FIT_AREA[k].onet + ') ' + s[k] + ' of ' + mx; }).join(', ') + '.';
  return '<svg class="fx-radar" viewBox="0 0 300 290" role="img" aria-label="' + esc(label) + '"><g class="fx-grid"><polygon points="' + ring(1) + '"/><polygon points="' + ring(2 / 3) + '"/><polygon points="' + ring(1 / 3) + '"/>' + axes + '</g>' +
    '<g class="fx-shape"><polygon class="fx-poly" points="' + poly + '"/>' + dots + '</g><g class="fx-labs">' + labs + '</g></svg>';
}
/* r35: the offer of the full Short Form (no claim about accuracy; it replaces the 30-question results) */
function fitDeepCard() {
  var n = S.fx.dans.filter(function (v) { return v; }).length;
  return '<div class="card fx-deep"><span class="fx-deepic" aria-hidden="true">' + fitRoad(n, 60, false) + '</span><div><h3>Want the full version?</h3><p class="fx-plain">The complete O*NET&reg; Interest Profiler Short Form has 60 questions. It takes ' + FIT_ABOUT + '15 to 20 minutes and replaces your 30-question results.</p>' +
    '<button type="button" class="btn gold" data-fxdeep>' + (n ? 'Pick up where you left off' : 'Take the full version') + '</button></div></div>';
}
/* r36: what an Interest match number means, wherever one is shown: once above the title list on the results screen, and one small
   line under the first job card that shows a score. Which card that is gets decided in JS when the list is built: the portal calls
   fitNoteFirst(list) with the cards in the order it is about to draw them, and fitWhy adds the line to that one card only. */
/* the visible "~" before a time, read as "about" by screen readers (.sr is in portal/index.html) */
var FIT_ABOUT = '<span aria-hidden="true">~</span><span class="sr">about </span>';
var FIT_SCORE_NOTE = 'This score shows how well the work matches your interests. It doesn\'t measure your qualifications or your chances of being hired.';
function fitShowsScore(j) { return !!j && j.interestFit != null && j.interestFit !== '' && !j.closed && ansOf(j) !== 'no'; } /* the cards fitFace draws a fit line on */
function fitNoteFirst(list) {
  S.fxNote = null; if (!fitDone()) return null;
  for (var i = 0; i < (list || []).length; i++) if (fitShowsScore(list[i])) { S.fxNote = String(list[i].id); break; }
  return S.fxNote;
}
function fitResults() {
  if (S.fxDemoShare) { S.fxDemoShare = false; setTimeout(fitShareMake, 0); }
  var f = S.data.fit, x = S.fx, s = f.scores, top = f.top3 || [], mx = fitMax(), all60 = f.form === 60;
  var cards = top.map(function (k, n) { var A = FIT_AREA[k]; return '<li class="fx-area" style="--ac:' + A.c + ';--at:' + A.t + ';--d:' + (n * 120) + 'ms"><span class="fx-rank">' + (n + 1) + '</span><span class="fx-ic">' + FIT_IC[k] + '</span><div><b>' + A.name + '</b><small>' + A.onet + ' &middot; ' + s[k] + ' of ' + mx + '</small><p>' + A.line + '</p></div></li>'; }).join('');
  var titles = (f.titles || []).map(function (t, n) {
    var busy = !!x.tBusy[t.code], ar = String(t.areas || '').split('').filter(function (k) { return FIT_AREA[k]; });
    return '<li class="fx-title" style="--d:' + (300 + n * 90) + 'ms"><div class="fx-tt"><b>' + esc(t.title) + '</b>' +
      '<small>' + (t.fit !== '' && t.fit != null ? 'Interest match ' + esc(t.fit) + ' of 100' : '') + (ar.length ? ' &middot; leans ' + esc(fitNames(ar)) : '') + '</small></div>' +
      '<div class="fx-yn" role="group" aria-label="Interested in ' + esc(t.title) + '?"><button type="button" class="yes" data-fxt="yes" data-code="' + esc(t.code) + '" aria-pressed="' + (t.answer === 'yes') + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + IC.check + 'Yes</button>' +
      '<button type="button" class="no" data-fxt="no" data-code="' + esc(t.code) + '" aria-pressed="' + (t.answer === 'no') + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + IC.x + 'No</button></div></li>';
  }).join('');
  return '<section class="fx fx-res' + (x.fresh && !REDUCED ? ' grow' : '') + '" aria-labelledby="fxH">' +
    '<div class="fx-reshead"><h2 class="fx-big" id="fxH" tabindex="-1">Your top three</h2><p class="fx-lead" aria-live="polite">' + esc(fitNames(top)) + '</p>' + (f.date ? '<p class="fx-date">From ' + esc(fmtDate(f.date)) + (all60 ? '. Based on the 60-question O*NET&reg; Interest Profiler Short Form.' : '') + '</p>' : all60 ? '<p class="fx-date">Based on the 60-question O*NET&reg; Interest Profiler Short Form.</p>' : '') + '</div>' +
    '<div class="fx-resgrid"><div class="fx-radarw card">' + fitRadar(s) + '</div><ol class="fx-areas">' + cards + '</ol></div>' +
    (fitDeepOn() && !all60 ? fitDeepCard() : '') +
    '<div class="card fx-titles"><h3>Job titles to look at</h3>' +
    (titles ? '<p class="fx-plain">Picked by how closely each kind of work lines up with your interests and your experience level. Tap Yes on any you would like us to consider for your search. We check with you before changing it, and your job matches keep coming either way.</p>' + ((f.titles || []).some(function (t) { return t.fit !== '' && t.fit != null; }) ? '<p class="fx-smean">' + esc(FIT_SCORE_NOTE) + '</p>' : '') + '<ol class="fx-tlist">' + titles + '</ol>'
      : '<p class="fx-plain">No titles stood out this time' + (top.length && s[top[0]] === s[top[2]] ? ', because your answers were spread evenly' : '') + '. That is fine: your job matches stay exactly the same.</p>') +
    (x.tErr ? '<p class="warn" role="alert">' + esc(x.tErr) + '</p>' : '') + '</div>' +
    '<div class="fx-actions"><button type="button" class="btn gold" data-fxshare>Make a share card</button><button type="button" class="btn ghost" data-go="jobs">Back to your jobs</button><button type="button" class="linkbtn" data-fxretake>Retake it' + (all60 ? ' (30 questions)' : '') + '</button>' + (all60 && fitDeepOn() ? '<button type="button" class="linkbtn" data-fxdeep>Retake the full version (60 questions)</button>' : '') + '</div>' +
    '<p class="fx-plain fx-note">This is an interest guide. It shows which kinds of work match your interests, not your qualifications or your chances of being hired, and it never limits which jobs you see.</p>' +
    '<p class="fx-credit">Your top three come from the O*NET&reg; Interest Profiler (' + (all60 ? '60-question Short Form' : '30-question version') + '). ' + FIT_CREDIT_IP + '</p><p class="fx-credit">' + fitCreditDb(f.release) + '</p></section>';
}

/* ---- share card: opt in, top three areas only, nothing posted; saved as a PNG on the device ---- */
var FIT_SHARE_CREDIT = 'This page includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY-ND 4.0 license. O*NET® is a trademark of USDOL/ETA.';
var FIT_SHARE_LICENSE = 'https://creativecommons.org/licenses/by-nd/4.0/';
function fitWrap(t, n) { var out = [], line = ''; t.split(' ').forEach(function (w) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); if (line) out.push(line); return out; }
function fitShareSvg(top) {
  var names = top.map(function (k) { return FIT_AREA[k].name; }).join(' + '), onet = top.map(function (k) { return FIT_AREA[k].onet; }).join(' + ');
  var logo = SP.mark('fxsh').replace('<svg aria-hidden="true" viewBox="0 0 100 100">', '<svg x="80" y="70" width="110" height="110" viewBox="0 0 100 100">');
  var F = 'font-family="Arial, Helvetica, sans-serif"';
  var icons = top.map(function (k, n) { var A = FIT_AREA[k], xx = 90 + n * 310;
    return '<g transform="translate(' + xx + ' 560)"><rect width="280" height="270" rx="36" fill="' + A.t + '"/><circle cx="140" cy="86" r="56" fill="' + A.c + '"/><g transform="translate(104 50) scale(3)" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + FIT_IC[k].replace(/<svg[^>]*>|<\/svg>/g, '') + '</g>' +
      '<text x="140" y="196" text-anchor="middle" ' + F + ' font-size="40" font-weight="800" fill="' + A.c + '">' + A.name + '</text>' +
      '<text x="140" y="238" text-anchor="middle" ' + F + ' font-size="28" font-weight="700" fill="' + A.c + '">(' + A.onet + ')</text></g>'; }).join('');
  var credit = fitWrap(FIT_SHARE_CREDIT, 92).concat([FIT_SHARE_LICENSE]).map(function (l, i) { return '<text x="90" y="' + (906 + i * 30) + '" ' + F + ' font-size="21" fill="#10213A">' + SP.esc(l) + '</text>'; }).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F3A5F"/><stop offset=".5" stop-color="#5A5F8E"/><stop offset=".72" stop-color="#B9786A"/><stop offset=".8" stop-color="#F2C27B"/><stop offset="1" stop-color="#FBF6EE"/></linearGradient></defs>' +
    '<rect width="1080" height="1080" fill="url(#bg)"/>' + logo +
    '<text x="215" y="140" ' + F + ' font-size="40" font-weight="800" fill="#FFFFFF">Steady Path Careers</text>' +
    '<text x="90" y="300" ' + F + ' font-size="60" font-weight="700" fill="#FFD166">My fit:</text>' +
    '<text x="90" y="392" ' + F + ' font-size="' + Math.min(80, Math.floor(900 / (names.length * 0.56))) + '" font-weight="800" fill="#FFFFFF">' + SP.esc(names) + '</text>' +
    '<text x="90" y="460" ' + F + ' font-size="32" fill="#F6EDD9">O*NET® interest areas: ' + SP.esc(onet) + '</text>' + icons +
    '<rect x="70" y="872" width="940" height="' + (30 * (fitWrap(FIT_SHARE_CREDIT, 92).length + 1) + 24) + '" rx="18" fill="#FBF6EE" opacity=".92"/>' + credit + '</svg>';
}
function fitShareMake() {
  var top = (S.data.fit.top3 || []).slice(0, 3), svg = fitShareSvg(top);
  S.fx.share = { svg: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), png: '', names: top.map(function (k) { return FIT_AREA[k].name + ' (' + FIT_AREA[k].onet + ')'; }).join(' + ') };
  S.focusTo = '#fxShareH'; render();
  var img = new Image();
  img.onload = function () {
    try { var cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080; cv.getContext('2d').drawImage(img, 0, 0, 1080, 1080); S.fx.share.png = cv.toDataURL('image/png'); } catch (e) { S.fx.share.png = ''; }
    if (S.fx.share) { var a = document.querySelector('[data-fxsave]'); if (a && S.fx.share.png) { a.setAttribute('href', S.fx.share.png); a.removeAttribute('aria-disabled'); } }
  };
  img.src = S.fx.share.svg;
}
function fitShareDlg() {
  setTimeout(function () { var m = document.querySelector('main.fx-main'), h = document.querySelector('header.sky'), tb = document.querySelector('.tabbar'); [m, h, tb].forEach(function (el) { if (el) { if (S.fx.share) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }); }, 0);
  var sh = S.fx.share;
  return '<div class="fx-dlgbg" data-fxshareclose></div><div class="fx-dlg" role="dialog" aria-modal="true" aria-labelledby="fxShareH"><h2 id="fxShareH" tabindex="-1">Your share card</h2>' +
    '<p class="fx-plain">Only your top three areas are on it. Nothing is posted; save it and share it wherever you like, or not at all.</p>' +
    '<img class="fx-shimg" src="' + sh.svg + '" alt="Share card: My fit: ' + esc(sh.names) + '. Steady Path Careers logo. ' + esc(FIT_SHARE_CREDIT) + ' ' + FIT_SHARE_LICENSE + '">' +
    '<div class="fx-actions"><a class="btn gold" data-fxsave download="my-fit.png" href="' + (sh.png || '#') + '"' + (sh.png ? '' : ' aria-disabled="true"') + '>Save image</a><button type="button" class="btn ghost" data-fxshareclose>Close</button></div></div>';
}

/* ---- confetti: light, area colors, once; none with reduced motion ---- */
function fitConfetti() {
  if (REDUCED) return;
  var box = document.createElement('div'); box.className = 'fx-conf'; box.setAttribute('aria-hidden', 'true');
  var cs = FIT_CYCLE.map(function (k) { return FIT_AREA[k].c; }).concat(['#FFD166', '#FFD166']), h = '';
  for (var n = 0; n < 48; n++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cs[n % cs.length] + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;--dx:' + ((Math.random() - 0.5) * 160).toFixed(0) + 'px;--r:' + (Math.random() * 720).toFixed(0) + 'deg"></i>';
  box.innerHTML = h; document.body.appendChild(box); setTimeout(function () { box.remove(); }, 3200);
}

/* ---- flow ---- */
function fitAnswer(v) {
  var x = S.fx; if (x.step !== 'q' || x.lock) return;
  var A = fitPart().ans; A[x.i] = v; x.pop = REDUCED ? 0 : v; x.err = ''; x.lock = true; render();
  setTimeout(function () {
    x.lock = false; x.pop = 0;
    var tot = fitPart().total;
    if (x.i < tot - 1) { x.i++; S.focusTo = '#fxItem'; render(); return; }
    var first = -1; for (var n = 0; n < tot; n++) if (!A[n]) { first = n; break; }
    if (first >= 0) { x.i = first; S.focusTo = '#fxItem'; render(); return; }
    fitSubmit();
  }, REDUCED ? 0 : 250);
}
function fitSubmit() {
  var x = S.fx, t0 = Date.now(), deep = x.deep, last = deep ? 59 : 29, answers = (deep ? x.dans : x.ans).slice(0, last + 1);
  x.step = 'reveal'; S.focusTo = '#fxH'; render(); window.scrollTo(0, 0);
  post({ action: deep ? 'fitDeep' : 'fitSubmit', t: S.token, answers: answers }).then(function (d) {
    setTimeout(function () {
      if (d && d.ok && d.fit) { S.data.fit = d.fit; if (deep) x.dans = []; else x.ans = []; x.deep = false; x.i = 0; x.retake = false; x.step = 'results'; x.fresh = true; S.focusTo = '#fxH'; render(); window.scrollTo(0, 0); fitConfetti(); setTimeout(function () { x.fresh = false; }, 1500); }
      else { x.step = 'q'; x.deep = deep; x.i = last; x.err = d && d.error === 'expired' ? 'Your sign-in has expired. Sign in again; your answers are still here until you close this page.' : d && d.error === 'limit' ? 'That is a lot of tries in one hour. Please try again a little later.' : 'That didn\'t save. Please try again in a minute.'; render(); }
    }, Math.max(0, 1500 - (Date.now() - t0)));
  }).catch(function () { x.step = 'q'; x.deep = deep; x.i = last; x.err = 'That didn\'t save. Please check your connection and try again.'; render(); });
}
function fitTitleAnswer(code, a) {
  var x = S.fx, t = (S.data.fit.titles || []).filter(function (y) { return y.code === code; })[0]; if (!t || x.tBusy[code]) return;
  var next = t.answer === a ? '' : a, prev = t.answer; t.answer = next; x.tBusy[code] = true; x.tErr = ''; render();
  post({ action: 'fitTitle', t: S.token, code: code, a: next }).then(function (d) {
    x.tBusy[code] = false; if (!d || !d.ok) { t.answer = prev; x.tErr = d && d.error === 'expired' ? 'Your sign-in has expired. Sign in again, then try that.' : 'That didn\'t save. Please try again.'; } render();
  }).catch(function () { x.tBusy[code] = false; t.answer = prev; x.tErr = 'That didn\'t save. Please check your connection and try again.'; render(); });
}
/* Job cards: interests only (the client's top three and the job's O*NET interest mix), neutral wording, and a link to the
   O*NET Database credit that vJobs adds under the list (fitJobsCredit). Never anything that discourages a job. */
function fitWhy(j) {
  if (!fitDone() || j.interestFit == null || j.interestFit === '') return '';
  var f = S.data.fit, top = f.top3 || [], ja = String(j.fitAreas || '').split('').filter(function (k) { return FIT_AREA[k]; });
  var both = ja.filter(function (k) { return top.indexOf(k) >= 0; }), n = Number(j.interestFit);
  var s = both.length ? 'This kind of work leans ' + fitNames(both) + ', ' + (both.length === 1 ? 'one of your top interests.' : both.length === 2 ? 'two of your top interests.' : 'all three of your top interests.') :
    ja.length ? 'This kind of work leans ' + fitNames(ja) + '.' : '';
  s += (s ? ' ' : '') + 'Interest match ' + n + ' of 100.';
  return '<p class="jfitw"><b>' + (both.length ? 'Why it fits you:' : 'Your interests:') + '</b> ' + esc(s) + ' <a class="fx-src" href="#fitCredit" data-fxsrc>Source</a>' + (S.fxNote != null && String(j.id) === S.fxNote ? '<span class="fx-smean">' + esc(FIT_SCORE_NOTE) + '</span>' : '') + '</p>';
}
/* the O*NET Database credit under the Jobs list, whenever any job card can show an interest line */
function fitJobsCredit(d) {
  if (!fitDone() || !(d.jobs || []).concat(d.closed || []).some(function (j) { return j.interestFit != null && j.interestFit !== ''; })) return '';
  return '<p class="fx-credit fx-jcredit" id="fitCredit" tabindex="-1">' + fitCreditDb(S.data.fit.release) + '</p>';
}
function fitHello() {
  if (!fitOn()) return '';
  return fitDone() ? '<button type="button" class="linkbtn fx-hl" data-go="fit">Your fit: ' + esc(fitNames(S.data.fit.top3 || [])) + '</button>' : '<button type="button" class="linkbtn fx-hl" data-go="fit">Find Your Fit: ' + FIT_ABOUT + '10 minutes</button>';
}
function fitJobsCard() {
  if (!fitOn() || fitDone()) return '';
  var nAns = S.fx.ans.filter(function (v) { return v; }).length;
  return '<div class="fx-jcard"><div class="fx-jcic">' + (nAns ? fitRoad(nAns, 30, false) : '<span class="fx-logo">' + SP.mark('fxj') + '</span>') + '</div><div><b>' + esc(FIT_NAME) + '</b><p>30 quick questions, ' + FIT_ABOUT + '10 minutes. See your top interests and five titles that line up with them. Optional; your matches keep coming either way.</p><button type="button" class="btn gold" data-go="fit">Take it</button></div></div>';
}

document.addEventListener('click', function (e) {
  if (S.view !== 'fit' || !fitOn()) return;
  var x = S.fx, el;
  if (e.target.closest('[data-fxstart]')) { x.step = 'q'; x.deep = false; x.retake = true; if (x.i > 29) x.i = 0; S.focusTo = '#fxItem'; render(); window.scrollTo(0, 0); return; }
  if (e.target.closest('[data-fxdeep]')) { if (!fitDeepOn()) return; x.step = 'q'; x.deep = true; x.err = ''; var nd = 0; while (nd < 59 && x.dans[nd]) nd++; x.i = nd; S.focusTo = '#fxItem'; render(); window.scrollTo(0, 0); return; }
  if ((el = e.target.closest('[data-fxa]'))) { fitAnswer(+el.getAttribute('data-fxa')); return; }
  if (e.target.closest('[data-fxback]')) { if (x.lock) return; if (x.i > 0) { x.i--; S.focusTo = '#fxItem'; } else if (x.deep) { x.deep = false; x.step = S.data.fit.done ? 'results' : 'intro'; S.focusTo = '[data-fxdeep]'; } else { x.step = 'intro'; S.focusTo = '#fxH'; } x.err = ''; render(); return; }
  if (e.target.closest('[data-fxdemo]')) { x.ans = FIT_DEMO_ANS.slice(); x.i = 29; x.step = 'q'; x.deep = false; x.retake = true; S.focusTo = '#fxItem'; render(); return; }
  if (e.target.closest('[data-fxretake]')) { x.ans = []; x.dans = []; x.deep = false; x.i = 0; x.step = 'intro'; x.retake = true; S.focusTo = '#fxH'; render(); window.scrollTo(0, 0); return; }
  if ((el = e.target.closest('[data-fxt]'))) { if (el.getAttribute('aria-disabled') === 'true') return; fitTitleAnswer(el.getAttribute('data-code'), el.getAttribute('data-fxt')); return; }
  if (e.target.closest('[data-fxshare]')) { fitShareMake(); return; }
  if (e.target.closest('[data-fxshareclose]')) { x.share = null; S.focusTo = '[data-fxshare]'; render(); return; }
  if ((el = e.target.closest('[data-fxsave]')) && el.getAttribute('aria-disabled') === 'true') { e.preventDefault(); }
});
/* the Source link on a job card's interest line goes to the credit under the list without touching the URL or history */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-fxsrc]'); if (!a) return;
  e.preventDefault(); e.stopPropagation(); var c = document.getElementById('fitCredit'); if (!c) return;
  try { c.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); } catch (x) { c.scrollIntoView(); }
  try { c.focus({ preventScroll: true }); } catch (x) { c.focus(); }
}, true);
document.addEventListener('keydown', function (e) {
  if (S.view !== 'fit' || !fitOn()) return;
  if (S.fx.share && e.key === 'Escape') { e.preventDefault(); S.fx.share = null; S.focusTo = '[data-fxshare]'; render(); return; }
  if (S.fx.share && e.key === 'Tab') { /* keep focus inside the share dialog */
    var dlg = document.querySelector('.fx-dlg'); if (!dlg) return;
    var fs = [].filter.call(dlg.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!fs.length) return;
    var first = fs[0], last = fs[fs.length - 1], a = document.activeElement;
    if (!dlg.contains(a)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && (a === first || a === dlg.querySelector('h2'))) { e.preventDefault(); last.focus(); return; }
    if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); return; }
    return;
  }
  if (S.fx.step !== 'q' || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.closest && e.target.closest('input,textarea,select,[contenteditable]'))) return;
  if (/^[1-5]$/.test(e.key)) { e.preventDefault(); fitAnswer(+e.key); }
});

/* ---- demo: sample answers (a dentist: Thinker, Helper, some Builder) and a local score that mirrors the server's ---- */
var FIT_DEMO_ITEMS = ['Build kitchen cabinets', 'Develop a new medicine', 'Write books or plays', 'Help people with personal or emotional problems', 'Manage a department within a large company', 'Install software across computers on a large network', 'Repair household appliances', 'Study ways to reduce water pollution', 'Compose or arrange music', 'Give career guidance to people', 'Start your own business', 'Operate a calculator', 'Assemble electronic parts', 'Conduct chemical experiments', 'Create special effects for movies', 'Perform rehabilitation therapy', 'Negotiate business contracts', 'Keep shipping and receiving records', 'Drive a truck to deliver packages to offices and homes', 'Examine blood samples using a microscope', 'Paint sets for plays', 'Do volunteer work at a non-profit organization', 'Market a new line of clothing', 'Inventory supplies using a hand-held computer', 'Test the quality of parts before shipment', 'Develop a way to better predict the weather', 'Write scripts for movies or television shows', 'Teach a high-school class', 'Sell merchandise at a department store', 'Stamp, sort, and distribute mail for an organization'];
var FIT_DEMO_DEEP = ['Build kitchen cabinets', 'Lay brick or tile', 'Repair household appliances', 'Raise fish in a fish hatchery', 'Assemble electronic parts', 'Drive a truck to deliver packages to offices and homes', 'Test the quality of parts before shipment', 'Repair and install locks', 'Set up and operate machines to make products', 'Put out forest fires', 'Develop a new medicine', 'Study ways to reduce water pollution', 'Conduct chemical experiments', 'Study the movement of planets', 'Examine blood samples using a microscope', 'Investigate the cause of a fire', 'Develop a way to better predict the weather', 'Work in a biology lab', 'Invent a replacement for sugar', 'Do laboratory tests to identify diseases', 'Write books or plays', 'Play a musical instrument', 'Compose or arrange music', 'Draw pictures', 'Create special effects for movies', 'Paint sets for plays', 'Write scripts for movies or television shows', 'Perform jazz or tap dance', 'Sing in a band', 'Edit movies', 'Teach an individual an exercise routine', 'Help people with personal or emotional problems', 'Give career guidance to people', 'Perform rehabilitation therapy', 'Do volunteer work at a non-profit organization', 'Teach children how to play sports', 'Teach sign language to people who are deaf or hard of hearing', 'Help conduct a group therapy session', 'Take care of children at a day-care center', 'Teach a high-school class', 'Buy and sell stocks and bonds', 'Manage a retail store', 'Operate a beauty salon or barber shop', 'Manage a department within a large company', 'Start your own business', 'Negotiate business contracts', 'Represent a client in a lawsuit', 'Market a new line of clothing', 'Sell merchandise at a department store', 'Manage a clothing store', 'Develop a spreadsheet using computer software', 'Proofread records or forms', 'Install software across computers on a large network', 'Operate a calculator', 'Keep shipping and receiving records', 'Calculate the wages of employees', 'Inventory supplies using a hand-held computer', 'Record rent payments', 'Keep inventory records', 'Stamp, sort, and distribute mail for an organization']; /* r35: the 60 Short Form items in O*NET's order, for the demo only (the real ones come from the API) */
var FIT_DEMO_ANS2 = [4, 3, 4, 2, 3, 3, 4, 3, 4, 3, 5, 5, 4, 4, 5, 5, 4, 5, 4, 5, 2, 2, 3, 1, 1, 2, 2, 2, 1, 2, 5, 5, 4, 4, 5, 4, 3, 4, 5, 5, 3, 2, 2, 3, 3, 2, 2, 3, 1, 2, 3, 3, 4, 2, 4, 3, 2, 3, 3, 3];
var FIT_DEMO_ANS = [4, 5, 2, 5, 3, 3, 4, 5, 3, 4, 2, 4, 3, 4, 1, 5, 3, 3, 3, 5, 2, 4, 2, 3, 4, 4, 2, 5, 1, 2];
function fitDemoScore(ans) { var s = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }; ans.forEach(function (v, i) { s[FIT_CYCLE[i % 6]] += v - 1; }); return s; }
function fitDemoTop(s) { return FIT_CYCLE.slice().sort(function (a, b) { return s[b] - s[a] || FIT_CYCLE.indexOf(a) - FIT_CYCLE.indexOf(b); }).slice(0, 3); }
function fitDemoData(done, ans, dans) {
  var s = fitDemoScore(ans || FIT_DEMO_ANS);
  if (dans) { s = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }; dans.forEach(function (v, i) { s[FIT_CYCLE[Math.floor(i / 10)]] += v - 1; }); } /* r35: the full version replaces the 30 */
  var out = { items: FIT_DEMO_ITEMS.map(function (t, i) { return { id: i + 1, text: t }; }), scale: FIT_SCALE.slice(), done: !!done, scores: done ? s : null, top3: done ? fitDemoTop(s) : [], date: done ? todayISO() : '', release: '31.0',
    priorities: done ? ['Guaranteed base pay (not commission or production only)'] : [],
    titles: done ? [{ code: '29-1021.00', title: 'Dentists, General', zone: 5, fit: 91, areas: 'IRS', answer: '' }, { code: '29-1292.00', title: 'Dental Hygienists', zone: 3, fit: 88, areas: 'SRC', answer: '' },
      { code: '29-1023.00', title: 'Orthodontists', zone: 5, fit: 86, areas: 'IRS', answer: '' }, { code: '29-1024.00', title: 'Prosthodontists', zone: 5, fit: 84, areas: 'IRS', answer: '' },
      { code: '29-1071.00', title: 'Physician Assistants', zone: 5, fit: 82, areas: 'ISR', answer: '' }] : [] };
  out.form = done && dans ? 60 : 30; out.max = out.form === 60 ? 40 : 20; /* r35 */
  out.deep = FIT_DEMO_DEEP.map(function (t, i) { return { id: i + 1, text: t }; });
  out.prefs = S.fxDemoPrefs ? { date: todayISO(), answers: { priorities: ['stability', 'helping'], workwith: 'people', team: 'mix', structure: 'some', pace: 'steady', paytype: 'salary', schedule: 'weekdays', travel: 'none', size: 'any', hardno: 'Weekend shifts' } } : null;
  return out;
}
/* the demo API answers fitSubmit and fitTitle locally (demoApi in the page calls this first) */
function fitDemoApi(b) {
  if (b.action === 'fitSubmit') { var ok = Array.isArray(b.answers) && b.answers.length === 30 && b.answers.every(function (v) { return v >= 1 && v <= 5 && v === Math.floor(v); }); return ok ? { ok: true, fit: fitDemoData(true, b.answers) } : { ok: false, error: 'bad answers' }; }
  if (b.action === 'fitTitle') return { ok: true };
  var okA = function (a) { return Array.isArray(a) && a.length === 60 && a.every(function (v) { return v >= 1 && v <= 5 && v === Math.floor(v); }); };
  if (b.action === 'fitDeep') return okA(b.answers) ? { ok: true, fit: fitDemoData(true, FIT_DEMO_ANS, b.answers) } : { ok: false, error: 'bad answers' }; /* r35 */
  if (b.action === 'fitPrefs') return { ok: true, prefs: { date: todayISO(), answers: b.answers } };
  if (b.action === 'matchCheck') return { ok: true, id: 'R-DEMO', date: todayISO() };
  return null;
}
/* demo links for screenshots: ?demo=1&v=fit&fxq=16 opens question 16 with sample answers before it; &fxdone=1 opens the results; &fxshare=1 the share card */
(function () {
  var q = new URLSearchParams(location.search); if (!S.demo) return;
  if (q.get('fxdone')) S.fxDemoDone = true;
  var n = +q.get('fxq'); if (n >= 1 && n <= 30) { S.fx.step = 'q'; S.fx.i = n - 1; S.fx.ans = FIT_DEMO_ANS.slice(0, n - 1); S.fx.retake = true; }
  /* r35: &fxdq=1..60 opens that question of the full version (implies 30-question results); &fxdeep=1 shows results from all 60; &fxprefs=1 opens the work
     preferences (&fxpsaved=1 with sample saved answers); &mcdate=YYYY-MM-DD sets the last match check-in */
  var dq = +q.get('fxdq'); if (dq >= 1 && dq <= 60) { S.fxDemoDone = true; S.fx.step = 'q'; S.fx.deep = true; S.fx.i = dq - 1; S.fx.dans = FIT_DEMO_ANS2.slice(0, dq - 1); }
  if (q.get('fxdeep')) { S.fxDemoDone = true; S.fxDemoDeep = true; }
  if (q.get('fxpsaved')) S.fxDemoPrefs = true;
  if (q.get('fxprefs')) { S.fxDemoDone = true; S.fx.step = 'prefs'; }
  if (/^\d{4}-\d\d-\d\d$/.test(q.get('mcdate') || '')) S.mcDemoDate = q.get('mcdate');
  if (q.get('fxshare')) S.fxDemoShare = true;
})();

/* ---- r35: "What matters to you at work" (our own questions, not O*NET and not scored; action fitPrefs) ----
   Ids and values match FIT_PREFS_ on the server, which checks every value again. */
var FP_Q = [
  { id: 'priorities', q: 'What matters most in your next job?', max: 2, o: [['pay', 'Pay'], ['stability', 'Stability'], ['flexibility', 'Flexibility (schedule or remote)'], ['growth', 'Room to grow'], ['recognition', 'Recognition'], ['helping', 'Helping people'], ['learning', 'Learning new skills']] },
  { id: 'workwith', q: 'What do you like working with most?', o: [['people', 'People'], ['data', 'Data and information'], ['things', 'Things and tools'], ['mix', 'A mix']] },
  { id: 'team', q: 'Team or solo?', o: [['team', 'Mostly with a team'], ['solo', 'Mostly on my own'], ['mix', 'A mix']] },
  { id: 'structure', q: 'How much structure do you like?', o: [['routine', 'Clear routine and steps'], ['some', 'Some structure'], ['open', 'I like figuring it out as I go']] },
  { id: 'pace', q: 'What pace suits you?', o: [['steady', 'Steady and predictable'], ['fast', 'Busy and fast-moving'], ['either', 'Either is fine']] },
  { id: 'paytype', q: 'How do you want to be paid?', o: [['salary', 'Salary or hourly only'], ['bonus', 'Salary plus bonus or commission is fine'], ['commission', 'Commission-heavy is fine']] },
  { id: 'schedule', q: 'Which schedules work for you?', o: [['weekdays', 'Weekdays only'], ['some', 'Some evenings or weekends are OK'], ['shifts', 'Shift work is OK']] },
  { id: 'travel', q: 'How much travel for work?', o: [['none', 'None'], ['some', 'Some (up to about a quarter of the time)'], ['lots', 'Lots is fine']] },
  { id: 'size', q: 'What size company?', o: [['small', 'Small (under 50 people)'], ['mid', 'Mid-size'], ['large', 'Large'], ['any', 'No preference']] }
];
var FP_HARD = { id: 'hardno', q: 'Anything you won\'t do?', ph: 'For example: cold calling, weekend shifts, a certain employer', max: 200 };
var FP_INTRO = 'Ten quick questions about how you like to work. We use your answers to pick and rank your job matches. Optional, and you can change them anytime.';
var FP_HOW = 'How we use them: they guide which jobs we send you and how we rank them. Your pay type, schedule and travel limits, and anything you list under "Anything you won\'t do", can rule a job out. Your Find Your Fit interest results never rule a job out.';
var FP_SAVED = 'Saved. We\'ll use these when we pick your next matches.';
function fpLabel(q, v) { for (var i = 0; i < q.o.length; i++) if (q.o[i][0] === v) return q.o[i][1]; return ''; }
function fpCopy(a) { a = a || {}; var o = {}; Object.keys(a).forEach(function (k) { o[k] = Array.isArray(a[k]) ? a[k].slice() : a[k]; }); return o; }
function fpStart() { var p = S.data.fit.prefs; S.fx.pf = { a: fpCopy(p && p.answers), busy: false, msg: '', err: '' }; }
/* the card under the results: what it is, what is saved, and the way in */
function fitPrefsCard() {
  var f = S.data.fit; if (!('prefs' in f)) return '';
  var a = (f.prefs && f.prefs.answers) || {}, rows = FP_Q.map(function (q) {
    var v = a[q.id]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    return '<li><span>' + esc(q.q) + '</span> <b>' + esc((Array.isArray(v) ? v : [v]).map(function (x) { return fpLabel(q, x); }).filter(String).join(', ')) + '</b></li>';
  }).filter(String);
  if (a.hardno) rows.push('<li><span>' + esc(FP_HARD.q) + '</span> <b>' + esc(a.hardno) + '</b></li>');
  return '<section class="fx fp-card card" aria-labelledby="fpcH"><h2 class="fp-h" id="fpcH">What matters to you at work</h2><p class="fx-plain">' + esc(FP_INTRO) + '</p>' +
    (rows.length ? '<p class="fp-when">Your answers' + (f.prefs.date ? ' from ' + esc(fmtDate(f.prefs.date)) : '') + ':</p><ul class="fp-sum">' + rows.join('') + '</ul>' : '') +
    '<p class="fx-plain fp-how">' + esc(FP_HOW) + '</p><div class="fx-actions"><button type="button" class="btn gold" data-fpopen>' + (rows.length ? 'Change your answers' : 'Answer ten questions') + '</button></div></section>';
}
function fitPrefs() {
  var x = S.fx; if (!x.pf) fpStart();
  var a = x.pf.a, n = 0;
  var qs = FP_Q.map(function (q) {
    n++; var cur = a[q.id], multi = !!q.max, sel = multi ? (Array.isArray(cur) ? cur : []) : cur;
    var btns = q.o.map(function (o) { var on = multi ? sel.indexOf(o[0]) >= 0 : sel === o[0]; return '<button type="button" class="fp-o" data-fpq="' + q.id + '" data-fpv="' + o[0] + '" aria-pressed="' + on + '">' + (multi ? '<span class="fp-box" aria-hidden="true"></span>' : '<span class="fp-dot" aria-hidden="true"></span>') + '<span>' + esc(o[1]) + '</span></button>'; }).join('');
    return '<div class="fp-q" role="group" aria-labelledby="fpq-' + q.id + '"' + (multi ? ' aria-describedby="fph-' + q.id + '"' : '') + '><h3 id="fpq-' + q.id + '"><span class="fp-n">' + n + '.</span> ' + esc(q.q) + '</h3>' +
      (multi ? '<p class="fp-hint" id="fph-' + q.id + '">Pick up to ' + q.max + '.</p>' : '') + '<div class="fp-opts">' + btns + '</div></div>';
  }).join('');
  var hv = String(a.hardno || '');
  return '<section class="fx fx-prefs" aria-labelledby="fpH">' +
    '<div class="fp-top card"><h2 class="fp-h" id="fpH" tabindex="-1">What matters to you at work</h2><p class="fx-plain">' + esc(FP_INTRO) + '</p><p class="fx-plain fp-how">' + esc(FP_HOW) + '</p></div>' +
    '<div class="card fp-list">' + qs +
    '<div class="fp-q"><h3><label for="fpHard"><span class="fp-n">10.</span> ' + esc(FP_HARD.q) + '</label></h3><p class="fp-hint" id="fpHardHint">Optional. Up to 200 characters.</p>' +
    '<input type="text" id="fpHard" class="fp-text" maxlength="' + FP_HARD.max + '" placeholder="' + esc(FP_HARD.ph) + '" value="' + esc(hv) + '" aria-describedby="fpHardHint fpHardN" autocomplete="off">' +
    '<p class="fp-count" id="fpHardN">' + hv.length + ' of ' + FP_HARD.max + '</p></div></div>' +
    '<div class="fp-save card"><div class="fx-actions"><button type="button" class="btn gold" data-fpsave' + (x.pf.busy ? ' aria-disabled="true"' : '') + '>' + (x.pf.busy ? 'Saving...' : 'Save my answers') + '</button>' +
    '<button type="button" class="btn ghost" data-fpback>' + (S.data.fit.done ? 'Back to your results' : 'Back') + '</button></div>' +
    '<p class="fp-status' + (x.pf.err ? ' bad' : '') + '" id="fpStatus" role="status" aria-live="polite">' + esc(x.pf.err || x.pf.msg || '') + '</p></div></section>';
}
function fpTap(qid, v) {
  var x = S.fx, a = x.pf.a, q = FP_Q.filter(function (y) { return y.id === qid; })[0]; if (!q || !fpLabel(q, v)) return;
  x.pf.msg = ''; x.pf.err = '';
  if (q.max) {
    var cur = Array.isArray(a[qid]) ? a[qid] : [], k = cur.indexOf(v);
    if (k >= 0) cur.splice(k, 1); else if (cur.length >= q.max) { x.pf.err = 'You can pick up to ' + q.max + '. Tap one you picked to change it.'; render(); fxAnnounce('fpStatus'); return; } else cur.push(v);
    a[qid] = cur;
  } else a[qid] = a[qid] === v ? '' : v;
  render();
}
function fpSave() {
  var x = S.fx, pf = x.pf; if (!pf || pf.busy) return;
  var el = document.getElementById('fpHard'); if (el) pf.a.hardno = el.value;
  var out = {}; FP_Q.forEach(function (q) { var v = pf.a[q.id]; if (q.max) { if (Array.isArray(v) && v.length) out[q.id] = v.slice(0, q.max); } else if (v) out[q.id] = v; });
  var t = String(pf.a.hardno || '').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim(); if (t) out.hardno = t.slice(0, FP_HARD.max);
  pf.busy = true; pf.msg = ''; pf.err = ''; render();
  post({ action: 'fitPrefs', t: S.token, answers: out }).then(function (d) {
    pf.busy = false;
    if (d && d.ok) { S.data.fit.prefs = d.prefs || { date: todayISO(), answers: out }; pf.a = fpCopy(S.data.fit.prefs.answers); pf.msg = FP_SAVED; }
    else pf.err = d && d.error === 'expired' ? 'Your sign-in has expired. Sign in again, then save.' : d && d.error === 'limit' ? 'That is a lot of saves in one hour. Please try again a little later.' : d && d.error === 'too long' ? 'Please keep "Anything you won\'t do" to 200 characters.' : 'That didn\'t save. Please try again in a minute.';
    render(); fxAnnounce('fpStatus');
  }).catch(function () { pf.busy = false; pf.err = 'That didn\'t save. Please check your connection and try again.'; render(); fxAnnounce('fpStatus'); });
}
document.addEventListener('click', function (e) {
  if (S.view !== 'fit' || !fitOn()) return;
  var x = S.fx, el;
  if (e.target.closest('[data-fpopen]')) { fpStart(); x.step = 'prefs'; S.focusTo = '#fpH'; render(); window.scrollTo(0, 0); return; }
  if (x.step !== 'prefs') return;
  if ((el = e.target.closest('[data-fpq]'))) { fpTap(el.getAttribute('data-fpq'), el.getAttribute('data-fpv')); return; }
  if (e.target.closest('[data-fpsave]')) { fpSave(); return; }
  if (e.target.closest('[data-fpback]')) { var hv = document.getElementById('fpHard'); if (hv && x.pf) x.pf.a.hardno = hv.value; x.step = S.data.fit.done ? 'results' : 'intro'; S.focusTo = S.data.fit.done ? '[data-fpopen]' : '#fxH'; render(); return; }
});
document.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'fpHard' || !S.fx.pf) return;
  S.fx.pf.a.hardno = e.target.value; var n = document.getElementById('fpHardN'); if (n) n.textContent = e.target.value.length + ' of ' + FP_HARD.max;
});

/* ---- r35: weekly "How are your matches?" card on the Jobs view (action matchCheck) ----
   Shows when at least one job was added in the last 7 days and the client has not sent a check-in in the last 7 days
   (lastMatchCheck from the API). An API without lastMatchCheck shows nothing. */
var MC_R = [['right', 'Right on'], ['some', 'Some are off'], ['mostly', 'Mostly off']];
var MC_MAX = 300;
S.mc = { r: '', note: '', busy: false, err: '', sent: false };
function mcDays(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5); }
function mcDue(d) {
  if (!d || typeof d.lastMatchCheck !== 'string') return false;
  var today = todayISO(), last = /^\d{4}-\d\d-\d\d$/.test(d.lastMatchCheck) ? d.lastMatchCheck : '';
  if (last && mcDays(last, today) < 7) return false;
  return (d.jobs || []).concat(d.closed || []).some(function (j) { var a = String(j.added || '').slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(a) && mcDays(a, today) >= 0 && mcDays(a, today) <= 7; });
}
function mcCard(d) {
  var m = S.mc;
  if (m.sent) return '<section class="card mc mc-done" aria-labelledby="mcH"><h2 class="mc-h" id="mcH" tabindex="-1">How are your matches this week?</h2><p class="mc-st" id="mcStatus" role="status" aria-live="polite">Thanks. We\'ll read this and follow up if anything needs to change.</p></section>';
  if (!mcDue(d)) return '';
  var btns = MC_R.map(function (r) { return '<button type="button" class="mc-b mc-' + r[0] + '" data-mcr="' + r[0] + '" aria-pressed="' + (m.r === r[0]) + '">' + esc(r[1]) + '</button>'; }).join('');
  return '<section class="card mc" aria-labelledby="mcH"><h2 class="mc-h" id="mcH" tabindex="-1">How are your matches this week?</h2>' +
    '<div class="mc-r" role="group" aria-labelledby="mcH">' + btns + '</div>' +
    '<label class="mc-l" for="mcNote">Anything you\'d like us to change? (titles, pay, places, types of companies)</label>' +
    '<textarea id="mcNote" class="mc-note" maxlength="' + MC_MAX + '" rows="2" aria-describedby="mcN">' + esc(m.note) + '</textarea><p class="mc-n" id="mcN">Optional. ' + m.note.length + ' of ' + MC_MAX + '</p>' +
    '<div class="mc-row"><button type="button" class="btn gold" data-mcsend' + (m.busy ? ' aria-disabled="true"' : '') + '>' + (m.busy ? 'Sending...' : 'Send') + '</button>' +
    '<p class="mc-st' + (m.err ? ' bad' : '') + '" id="mcStatus" role="status" aria-live="polite">' + esc(m.err) + '</p></div></section>';
}
function mcSend() {
  var m = S.mc; if (m.busy) return;
  var el = document.getElementById('mcNote'); if (el) m.note = el.value;
  if (!m.r) { m.err = 'Pick one of the three first.'; render(); fxAnnounce('mcStatus'); return; }
  var note = m.note.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MC_MAX);
  m.busy = true; m.err = ''; render();
  post({ action: 'matchCheck', t: S.token, rating: m.r, note: note }).then(function (d) {
    m.busy = false;
    if (d && d.ok) { m.sent = true; m.note = ''; S.data.lastMatchCheck = d.date || todayISO(); S.focusTo = '#mcH'; }
    else m.err = d && d.error === 'expired' ? 'Your sign-in has expired. Sign in again, then send this.' : d && d.error === 'limit' ? 'That is a lot for one day. Please try again tomorrow.' : d && d.error === 'too long' ? 'Please keep it to 300 characters.' : 'Sorry, that didn\'t send. Please try again in a minute.';
    render(); fxAnnounce('mcStatus');
  }).catch(function () { m.busy = false; m.err = 'That didn\'t send. Please check your connection and try again.'; render(); fxAnnounce('mcStatus'); });
}
document.addEventListener('click', function (e) {
  if (S.view !== 'jobs' || !e.target.closest) return;
  var el = e.target.closest('[data-mcr]');
  if (el) { var t = document.getElementById('mcNote'); if (t) S.mc.note = t.value; S.mc.r = S.mc.r === el.getAttribute('data-mcr') ? '' : el.getAttribute('data-mcr'); S.mc.err = ''; render(); return; }
  if (e.target.closest('[data-mcsend]')) mcSend();
});
document.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'mcNote') return;
  S.mc.note = e.target.value; var n = document.getElementById('mcN'); if (n) n.textContent = 'Optional. ' + e.target.value.length + ' of ' + MC_MAX;
});

/* ================================ PART: r42, Home and the five destinations (was assets/portal-r42.js) ================================ */
/* r42: portal revamp, piece 1. Home, the five destinations (Home, Jobs, Documents, Interviews, More), the weekly line and the
   Back button for the Find Your Fit steps. Comes after the Find Your Fit part; every function here reads the portal's globals
   only when it is called. The first block is pure (no DOM, no globals) and is unit tested under
   node by test_api/test_r42_portal.js. */

/* ---- pure helpers ---- */
/* whole days from ISO date a to ISO date b (b - a); null when either is not a date */
function r42Days(a, b) {
  var p = function (v) { var m = String(v == null ? '' : v).match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return null; var t = Date.UTC(+m[1], +m[2] - 1, +m[3]); var d = new Date(t); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null; };
  var x = p(a), y = p(b); return x == null || y == null ? null : Math.round((y - x) / 864e5);
}
/* a count from the API: a whole number, 0 or more; anything else is "not given" (null) */
function r42Num(v) { if (typeof v === 'string' && /^\d+$/.test(v.trim())) v = +v; return typeof v === 'number' && isFinite(v) && v >= 0 && Math.floor(v) === v ? v : null; }
/* The one next step on Home, by priority: documents waiting for approval, then new matches to review, then an interview in the
   next 7 days, then finishing Find Your Fit, then nothing. */
function r42Next(f) {
  f = f || {};
  if (r42Num(f.docs) > 0) return 'docs';
  if (r42Num(f.matches) > 0) return 'matches';
  if (f.ivSoon) return 'interview';
  if (f.fitTodo) return 'fit';
  return 'none';
}
/* Application numbers for Home. apps: the API's apps[]; today: ISO date; stageOf: the portal's own stage function (4 = ended).
   open: applications still in progress (not ended, not hired, not a recruiter outreach note).
   ivUp: interviews dated today or later, on applications that are not ended and not marked hired. ivSoon: the nearest of those within 7 days, or null. */
function r42AppStats(apps, today, stageOf) {
  var out = { open: 0, ivUp: 0, ivSoon: null, list: [] }, best = null;
  (Array.isArray(apps) ? apps : []).forEach(function (x) {
    if (!x) return; var st = stageOf(x), ended = st >= 4;
    if (!ended && !/hired|accepted/i.test(String(x.status || '')) && !/outreach/i.test(String(x.type || ''))) out.open++;
    var dd = r42Days(today, x.interview);
    if (dd != null && dd >= 0 && !ended && !/\bhired\b/i.test(String(x.status || ''))) { /* hired: the search for this job is over, like an ended one */ out.ivUp++; out.list.push({ app: x, days: dd }); if (dd <= 7 && (best == null || dd < best)) { best = dd; out.ivSoon = x; } }
  });
  out.list.sort(function (a, b) { return a.days - b.days; });
  return out;
}
/* The weekly "work you didn't see" line. w is the optional data.week = { weekOf, read, sent, noPay, area, closed, other }.
   Returns null (show nothing) unless weekOf is a real date that is not in the future and not more than 13 days old, read is a whole number above 0, and sent is
   a whole number no larger than read. Reason counts that are missing, zero or not whole numbers are left out; a reason total
   larger than read hides the reasons. Never fills in a number. */
function r42WeekLine(w, today) {
  if (!w || typeof w !== 'object') return null;
  var read = r42Num(w.read), sent = r42Num(w.sent), age = r42Days(w.weekOf, today);
  if (age == null || age < 0 || age > 13 || !read || sent == null || sent > read) return null;
  var parts = [], sum = sent, bad = false;
  [['noPay', ' had no posted pay'], ['area', [' was outside your area or commute', ' were outside your area or commute']], ['closed', [' was closed', ' were closed']], ['other', ' didn\'t fit your floor or field']].forEach(function (r) {
    if (w[r[0]] == null || w[r[0]] === '') return; var n = r42Num(w[r[0]]); if (n == null) { bad = true; return; } if (!n) return;
    sum += n; parts.push(n + (typeof r[1] === 'string' ? r[1] : r[1][n === 1 ? 0 : 1]));
  });
  if (bad || sum > read) parts = [];
  var thisWeek = age <= 6;
  var text = (thisWeek ? 'This week we read ' : 'That week we read ') + read + (read === 1 ? ' posting' : ' postings') + ' for you. ' + (sent === 0 ? 'None made it.' : sent + ' made it.') + (parts.length ? ' ' + parts.join(', ') + '.' : '');
  return { text: text, weekOf: String(w.weekOf).slice(0, 10), thisWeek: thisWeek, read: read, sent: sent };
}
/* the job whose question was answered most recently (jobs[] rows with a reply), or null */
function r42LastAnswer(jobs) {
  var best = null;
  (Array.isArray(jobs) ? jobs : []).forEach(function (j) {
    if (!j || !String(j.reply || '').trim()) return;
    var d = /^\d{4}-\d\d-\d\d/.test(String(j.replyDate || '')) ? String(j.replyDate).slice(0, 10) : '';
    if (!best || d > best.d) best = { j: j, d: d };
  });
  return best ? best.j : null;
}
/* the Find Your Fit screen an entry stands for, as one string */
function r42FxSig(x) { return x ? x.step + (x.step === 'q' ? '|' + (x.deep ? 'd' : 'm') + '|' + x.i : '') : ''; }

/* ---- views (browser only) ---- */
function r42Stats() { return r42AppStats(S.data.apps, todayISO(), stageOf); }
function r42Plural(n, one, many) { return n === 1 ? one : many; }
function r42Foot() { return '<footer class="help"><p><b>Need help?</b> ' + helpHtml() + '</p><button class="linkbtn" data-signout>Sign out on this device</button></footer>'; }

/* The weekly line. Nothing at all when the API sends no usable data.week (the live v1.45 API sends none). */
function r42WeekHtml() {
  var d = S.data, L = d ? r42WeekLine(d.week, todayISO()) : null; if (!L) return '';
  var sample = !!(S.demo || (d.week && d.week.sample));
  return '<section class="card h-week" data-week aria-labelledby="hWeekH"><h2 class="sec-h" id="hWeekH">The work you didn\'t see' + (sample ? ' <span class="pill h-sample">Sample numbers</span>' : '') + '</h2>' +
    '<p class="h-week-t">' + esc(L.text) + '</p><p class="h-week-d">Week of ' + esc(fmtY(L.weekOf)) + '</p></section>';
}

/* Home (vHome) is in the r44 part below. */

/* Interviews and Applications share one destination; this is the switch between them. */
function ivSubNav(cur) {
  return '<nav class="iv-sub" aria-label="Interviews sections"><button type="button" data-go="iv"' + (cur === 'iv' ? ' aria-current="page"' : '') + '>Interviews</button><button type="button" data-go="apps"' + (cur === 'apps' ? ' aria-current="page"' : '') + '>Applications</button>' + (typeof vPractice === 'function' ? '<button type="button" data-go="practice"' + (cur === 'practice' ? ' aria-current="page"' : '') + '>Practice</button>' : '') + '</nav>';
}
function vIv() {
  var d = S.data, A = r42Stats(), prep = (d.apps || []).filter(function (x) { return pvHas(x); });
  var row = function (x, extra) { return '<li class="card iv-row" data-ivrow="' + esc(x.id) + '"><div class="iv-tx"><b>' + esc(coOr(x)) + '</b><span>' + esc(String(x.role || '').trim()) + '</span>' + extra + '</div>' + (pvHas(x) ? '<button type="button" class="btn ghost sm" data-nxprep="' + esc(x.id) + '">Open prep<span class="sr"> for ' + esc(coOr(x)) + '</span></button>' : '') + '</li>'; };
  var title = A.ivUp ? A.ivUp + r42Plural(A.ivUp, ' interview coming up', ' interviews coming up') : 'No interviews on your calendar yet';
  return shell('iv', esc(title), 'Your interview dates and prep sheets in one place.') + '<div class="pband" aria-hidden="true"></div>' +
    '<main class="pmain iv-main">' + ivSubNav('iv') + (S.reauthMsg ? '<div class="warn">Your sign-in has expired.' + reauthBtn() + '</div>' : '') +
    '<h2 class="sec-h">Coming up</h2>' +
    (A.list.length ? '<ul class="iv-list">' + A.list.map(function (o) { return row(o.app, '<div class="apills">' + ivLabel(o.app) + '</div>' + (String(o.app.ivWhere || '').trim() ? '<span class="iv-where">' + esc(o.app.ivWhere) + '</span>' : '')); }).join('') + '</ul>' :
      '<div class="card empty"><p class="psub" style="margin:0">When an employer gives you an interview date, add it to that application under Applications. It shows up here with its prep sheet.</p><p style="margin:10px 0 0"><button type="button" class="btn ghost" data-go="apps">Open Applications</button></p></div>') +
    '<h2 class="sec-h">Interview prep sheets</h2>' +
    (prep.length ? '<ul class="iv-list">' + prep.map(function (x) { return row(x, ''); }).join('') + '</ul>' :
      '<div class="card empty"><p class="psub" style="margin:0">No prep sheets yet. We write one for each interview you tell us about.</p></div>') +
    r42Foot() + '</main>' + tabbar('iv');
}

function vMore() {
  /* r47: two groups under plain headings, so the tools are easy to find. Every row that was here is still here. */
  var tools = [], rows = [];
  if (typeof vPractice === 'function') tools.push(['<button type="button" data-go="practice">', 'Interview practice', 'Common questions, a timer and your own notes.', '</button>']);
  if (typeof r44FuDue === 'function') tools.push(['<button type="button" data-go="apps">', 'Follow-ups', 'Dates and ready notes for the applications you send.', '</button>']);
  if (typeof vOffer === 'function') tools.push(['<button type="button" data-go="offer">', 'Offer check', 'Compare an offer with posted pay.', '</button>']); /* r44 */
  if (typeof vTraining === 'function') tools.push(['<button type="button" data-go="training">', 'Training and benefits', 'Public programs, with links to their official pages.', '</button>']); /* r45 */
  if (typeof fitOn === 'function' && fitOn()) tools.push(['<button type="button" data-go="fit">', FIT_NAME, 'An interest guide. Optional.', '</button>']);
  rows.push(['<button type="button" data-help>', 'Help', 'Something broken or urgent, and how to reach us.', '</button>']);
  if (billOn()) rows.push(['<button type="button" data-go="billing">', 'Plan &amp; billing', '', '</button>']);
  rows.push(['<button type="button" data-go="prefs">', 'Search settings', 'Roles, pay floor, commute and how we contact you.', '</button>']);
  rows.push(['<button type="button" data-go="feedback">', 'Feedback', 'Tell us how it is going.', '</button>']);
  if (!standalone()) rows.push(['<a href="/app/">', 'Get the app', 'For your phone. No app store needed.', '</a>']);
  rows.push(['<button type="button" data-signout>', 'Sign out', 'On this device.', '</button>']);
  rows.push(['<button type="button" data-go="delete">', 'Delete my account', 'Ask us to delete your account and your data.', '</button>']);
  var list = function (rs) { return '<ul class="m-list">' + rs.map(function (r) { return '<li>' + r[0] + '<span class="m-tx"><b>' + r[1] + '</b>' + (r[2] ? '<span>' + r[2] + '</span>' : '') + '</span>' + IC.chev + r[3] + '</li>'; }).join('') + '</ul>'; };
  return shell('more', 'More', '') + '<div class="pband" aria-hidden="true"></div>' +
    '<main class="pmain m-main">' + (tools.length ? '<section class="m-grp" aria-labelledby="mToolsH"><h2 class="sec-h" id="mToolsH">Your tools</h2>' + list(tools) + '</section>' : '') +
    '<section class="m-grp" aria-labelledby="mAcctH"><h2 class="sec-h" id="mAcctH">Your account</h2>' + list(rows) + '</section>' +
    '<footer class="help"><p><b>Need help?</b> ' + helpHtml() + '</p></footer>' + legalLinks() + '</main>' + tabbar('more');
}

/* ---- r43: Delete my account ----
   A request, not a delete: the live API (v1.45) has no delete action. It is filed through the existing "prefs" action as a
   "Delete my data" request whose note starts with the marker below, so it lands in the Requests tab and the owner's inbox like
   every other portal request. The screen never says the account was deleted. The demo sends nothing. */
var DEL_MARK = 'ACCOUNT DELETION REQUEST';
/* r43 fix: only what is true today. The API emails the owner, not the client, when a request arrives, so nothing here says the
   client gets an email about the request. The privacy policy promises the delete within 30 days and an email confirming it. */
var DEL_NEXT = 'Your request goes to Steady Path. Your account stays as it is until we act on it. We delete your information within 30 days and confirm by email.';
function delPlanNote() { return billOn() && billHasPlan() ? '<p class="del-note del-plan"><b>You have a paid plan. Sending this request does not cancel your plan or stop charges.</b> To cancel, use Plan &amp; billing. <button type="button" class="linkbtn" data-go="billing">Plan &amp; billing</button></p>' : ''; }
function delAsked() { return ((S.data && S.data.requests) || []).filter(function (r) { return r && r.type === 'Delete my data'; })[0] || null; }
function vDelete() {
  var D = S.del || (S.del = { v: '', err: '', done: false, demo: false }), F = S.pf || {}, asked = delAsked(), body;
  var contact = '<p class="del-help">Questions? ' + helpHtml() + '</p>';
  if (D.demo) body = '<div class="card del-done" role="status" tabindex="-1" id="delDone"><h2>This is the demo, so nothing was sent.</h2><p>In a real account this sends your delete request to Steady Path.</p><p><button type="button" class="btn ghost" data-go="more">Back to More</button></p></div>';
  else if (D.done || asked) body = '<div class="card del-done" role="status" tabindex="-1" id="delDone"><h2>Your delete request was sent' + (asked && realISO(asked.date) ? ' on ' + esc(fmtY(String(asked.date).slice(0, 10))) : '') + '.</h2><p>Your account has not been deleted yet. ' + DEL_NEXT + '</p><p>Once your information is deleted, your search and this portal stop.</p>' + delPlanNote() + '<p><button type="button" class="btn ghost" data-go="home">Back to Home</button></p></div>' + contact;
  else body = '<div class="card del-card"><h2 class="pf-h">What this does</h2>' +
    '<p>This sends us a request to delete your account and your data: your resume and intake answers, your jobs, documents, applications and notes.</p>' +
    '<h2 class="pf-h">What happens next</h2><p>' + DEL_NEXT + ' Once your information is deleted, your search and this portal stop.</p>' +
    delPlanNote() +
    '<p class="del-note">Want a copy first? You can download your data in Search settings. <button type="button" class="linkbtn" data-go="prefs">Search settings</button></p>' +
    '<label for="delType">Type DELETE to confirm</label><input id="delType" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" value="' + esc(D.v) + '"' + (D.err ? ' aria-invalid="true" aria-describedby="delErr"' : '') + '>' +
    (D.err ? '<p class="err" role="alert" id="delErr">' + esc(D.err) + '</p>' : '') + (F.err ? '<p class="err" role="alert">' + esc(F.err) + (F.re ? reauthBtn() : '') + '</p>' : '') +
    '<div class="del-acts"><button type="button" class="btn danger" data-delsend' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Sending…' : 'Send delete request') + '</button><button type="button" class="btn ghost" data-go="more">Cancel</button></div></div>' + contact;
  return shell('', 'Delete my account', 'This sends a request. Nothing is deleted right away.') + '<div class="pband" aria-hidden="true"></div><main class="pmain del-main">' + body + '</main>' + tabbar('');
}
document.addEventListener('input', function (e) { if (e.target && e.target.id === 'delType' && S.del) S.del.v = e.target.value; });
document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-delsend]')) delSend(); });
/* Enter in the DELETE box does what the button does */
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'delType' && !e.isComposing) { e.preventDefault(); delSend(); } });
function delSend() {
  if (!S.data || S.view !== 'delete' || (S.pf && S.pf.busy)) return;
  var D = S.del || (S.del = { v: '', err: '', done: false, demo: false }), el = document.getElementById('delType'); if (el) D.v = el.value;
  if (D.done || delAsked()) return;
  if (String(D.v).trim().toUpperCase() !== 'DELETE') { D.err = 'Type DELETE in the box to confirm.'; S.focusTo = '#delType'; render(); return; }
  D.err = '';
  if (S.demo) { D.demo = true; S.focusTo = '#delDone'; render(); return; } /* the demo sends nothing, not even to its own stand-in API */
  sendRequest({ type: 'Delete my data', note: DEL_MARK + ': the client confirmed "Delete my account" in the portal by typing DELETE. Delete the account and all of this client\'s data.' }, function (ok) { if (ok) { D.done = true; D.v = ''; S.focusTo = '#delDone'; } });
}
/* leaving the screen clears what was typed: go() in portal/index.html sets S.del to null */

/* ---- r43 fix: a focused control is never left under the fixed bottom bar ----
   scroll-padding covers most cases; a tall field that is already partly in view is not moved by the browser, so this does it. */
document.addEventListener('focusin', function (e) {
  var el = e.target; if (!el || !el.getBoundingClientRect || (el.closest && el.closest('.tabbar, .deck'))) return;
  var fix = function () {
    var bar = document.querySelector('.tabbar'); if (!bar || !bar.offsetHeight || document.activeElement !== el) return;
    var top = bar.getBoundingClientRect().top, r = el.getBoundingClientRect(), room = top - 12;
    if (r.bottom <= room || r.height <= 0) return;
    var dy = Math.min(r.bottom - room, Math.max(0, r.top - 12)); /* never push the top of a tall field off the screen */
    if (dy > 0) window.scrollBy(0, dy);
  };
  fix(); setTimeout(fix, 80);
});

/* Home's "Open this job": Jobs, with that job selected and in view */
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-hjob]'); if (!b || !S.data) return;
  var j = jobById(b.getAttribute('data-hjob')); if (!j) return;
  jfReset(); if (ansOf(j) === 'no') S.passedOpen = true; S.jsel = j.id; go('jobs');
  var el = document.querySelector('#app [data-jc="' + cssq(j.id) + '"]'); if (el) { try { el.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (x) { el.scrollIntoView(); } }
});

/* ---- Back button (audit M2): the Find Your Fit steps ----
   go() gives every tab change its own history entry and the swipe deck adds one (portal/index.html). Here each Find Your Fit
   screen gets one too: the entry's state carries fx = { step, i, deep, hn, ep }. hn counts the question entries above the screen
   the quiz was started from; when the quiz ends they are dropped in one step, so Back from the results goes to the view before
   Find Your Fit, never back through 30 answered questions. ep changes each time that happens, so a leftover Forward entry from a
   finished quiz is ignored. */
S.fxSig = null; S.fxHn = 0; S.fxEp = 0;
function r42FxState() { var x = S.fx; return { step: x.step, i: x.i, deep: !!x.deep, hn: S.fxHn, ep: S.fxEp }; }
function r42FitHist() {
  if (S.status !== 'ready' || S.view !== 'fit' || S.flow || S.deck || !S.fx) { if (S.view !== 'fit') { S.fxSig = null; S.fxHn = 0; } return; }
  var sig = r42FxSig(S.fx), was = S.fxSig, st = null;
  if (sig === was) return;
  S.fxSig = sig;
  if (S.navPop) return; /* Back or Forward put this screen up; history already stands on its entry */
  try { st = history.state; } catch (e) {}
  var entry = function () { return { sp: 1, depth: S.hist, flow: null, view: 'fit', fx: r42FxState() }; };
  try {
    if (was == null) { if (st && st.sp) history.replaceState(entry(), '', location.href); return; } /* first screen of this visit: mark the entry go() made */
    var wasQ = /^q\|/.test(was), isQ = S.fx.step === 'q';
    if (isQ) { S.fxHn++; S.hist++; history.pushState(entry(), '', location.href); return; }
    if (wasQ && S.fxHn > 0) { /* the quiz ended or was left by its own Back: drop its question entries, then mark the entry under them */
      var n = S.fxHn; S.fxHn = 0; S.fxEp++; quietPop(); S.popThen = function () { try { history.replaceState(entry(), '', location.href); } catch (e) {} }; history.go(-n); return;
    }
    if (S.fx.step === 'prefs') { S.hist++; history.pushState(entry(), '', location.href); return; }
    history.replaceState(entry(), '', location.href);
  } catch (e) {}
}
/* popstate (and a reload) hand over the entry they landed on. Returns true when it changed which Find Your Fit screen, the
   deck, or the interview practice screen (r44PrRestore) is showing. */
function navRestore(st, view, reload) {
  if (reload) { /* a reload keeps the tab. Quiz answers are not kept on the device, so the quiz is back at its first screen: the
     question entries under this one are dropped, and Back from that screen leaves Find Your Fit in one press. */
    var rf = st && st.fx;
    if (rf) S.fxEp = rf.ep | 0;
    if (rf && view === 'fit' && rf.step === 'q' && (rf.hn | 0) > 0) {
      S.fxEp = (rf.ep | 0) + 1; S.fxHn = 0; quietPop();
      S.popThen = function () { S.fxSig = r42FxSig(S.fx); try { history.replaceState({ sp: 1, depth: S.hist, flow: null, view: 'fit', fx: r42FxState() }, '', location.href); } catch (e) {} };
      try { history.go(-(rf.hn | 0)); } catch (e) {}
    }
    return view === 'practice' ? r44PrRestore(st) : false;
  }
  if (view === 'practice') return r44PrRestore(st);
  if (st && st.deck && !S.deck && view === 'jobs' && typeof deckOpen === 'function' && counts().wait) { S.view = 'jobs'; S.flow = null; deckOpen(true); return true; }
  if (view !== 'fit' || !st || !st.fx || !S.fx || !(typeof fitOn === 'function' && fitOn())) return false;
  var f = st.fx; if (f.ep !== S.fxEp) return false;
  var before = r42FxSig(S.fx);
  S.fx.step = f.step; S.fx.deep = !!f.deep; if (f.step === 'q') S.fx.i = Math.max(0, f.i | 0); S.fx.lock = false; S.fx.pop = 0; S.fx.err = '';
  S.fxHn = f.hn | 0;
  return r42FxSig(S.fx) !== before;
}
/* the quiz's own Back button steps through the same history, so the two Backs never disagree */
document.addEventListener('click', function (e) {
  if (!e.target.closest || !e.target.closest('[data-fxback]') || !S.fx || S.fx.step !== 'q' || S.fx.lock || S.fxHn < 1) return;
  var st = null; try { st = history.state; } catch (x) {}
  if (!st || !st.sp || !st.fx || st.fx.step !== 'q' || st.fx.ep !== S.fxEp) return;
  e.stopPropagation(); e.preventDefault(); history.back();
}, true);
/* render() in portal/index.html calls r42FitHist after each screen is drawn */

/* ================================ PART: r44, Home and the client tools (was assets/portal-r44.js) ================================ */
/* r44: portal Home in the mixed design (sentence, path, tools) and three client tools that need no backend change:
   Follow-ups (inside Interviews > Applications), Offer check (inside More, and from an application marked Offer) and
   Interview practice (inside Interviews). Comes after the r42 part; every function reads the portal's globals only
   when it is called. The first block is pure (no DOM, no globals) and is unit tested under node by test_api/test_r44.js. */

/* ================= pure helpers ================= */
var R44_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
function r44Word(n) { return n >= 0 && n < 10 && Math.floor(n) === n ? R44_NUM[n] : String(n); }
function r44Cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
var R44_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function r44Utc(iso) { var m = String(iso == null ? '' : iso).match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null; }
function r44Iso(d) { return d.toISOString().slice(0, 10); }
function r44Weekday(iso) { var d = r44Utc(iso); return d ? R44_DAYS[d.getUTCDay()] : ''; }
function r44AddDays(iso, n) { var d = r44Utc(iso); if (!d) return ''; d.setUTCDate(d.getUTCDate() + n); return r44Iso(d); }
/* n business days later: Monday to Friday, no holiday calendar */
function r44AddBusinessDays(iso, n) { var d = r44Utc(iso); if (!d) return ''; while (n > 0) { d.setUTCDate(d.getUTCDate() + 1); var w = d.getUTCDay(); if (w !== 0 && w !== 6) n--; } return r44Iso(d); }
function r44Diff(a, b) { var x = r44Utc(a), y = r44Utc(b); return x && y ? Math.round((y - x) / 864e5) : null; }

/* The one sentence at the top of Home. k: the next-step key (docs, matches, interview, fit, first, none); n: its count;
   iv: { days, date } for an interview. With no first name there is no comma clause. */
function r44Sentence(k, name, n, iv) {
  var c;
  if (k === 'docs') c = r44Word(n) + (n === 1 ? ' document is' : ' documents are') + ' ready for you.';
  else if (k === 'matches') c = r44Word(n) + (n === 1 ? ' job is' : ' jobs are') + ' waiting for your yes.';
  else if (k === 'interview') c = 'your interview is ' + (iv && iv.days === 0 ? 'today' : iv && iv.days === 1 ? 'tomorrow' : iv && iv.days > 1 && iv.days < 7 ? r44Weekday(iv.date) : 'coming up') + '.';
  else if (k === 'fit') c = 'Find Your Fit is waiting for you.';
  else if (k === 'first') c = 'your first matches are on the way.';
  else c = 'you\'re caught up.';
  name = String(name || '').trim();
  return name ? name + ', ' + c : r44Cap(c);
}
/* which stop on the path holds the next step */
function r44Stop(k) { return k === 'docs' ? 'docs' : k === 'matches' || k === 'first' ? 'jobs' : k === 'interview' ? 'iv' : ''; }

/* ================= Home ================= */
function r44Href(view) { return '/portal/?' + (S.demo ? 'demo=1&' : '') + 'view=' + view; }
function r44Link(view, cls, inner, attrs) { return '<a class="' + cls + '" href="' + r44Href(view) + '" data-r44go="' + view + '"' + (attrs || '') + '>' + inner + '</a>'; }
function r44Paid() { return billOn() && billHasPlan(); }
var R44_SUN = '<svg class="h44-sun" width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 21a9 9 0 0 1 18 0"/><path d="M15 6v3M5.5 10.5l2 2M24.5 10.5l-2 2M3 21h24"/></svg>';

/* r47: one line icon per tool (24px, the same stroke as the tab icons) */
var R47_IC = (function () { var w = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + d + '</svg>'; }; return {
  practice: w('<path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>'),
  apps: w('<path d="M4 6.5h16v11H4z"/><path d="m4.5 7 7.5 6 7.5-6"/>'),
  offer: w('<path d="M12 4v16M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8Zm14 0-2.5 6a3 3 0 0 0 5 0L19 8ZM8 20h8"/>'),
  training: w('<path d="m3 9 9-4.5L21 9l-9 4.5L3 9Z"/><path d="M7 11.5V16c1.4 1.2 3.1 1.8 5 1.8s3.6-.6 5-1.8v-4.5M21 9v5"/>'),
  fit: w('<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>')
}; })();
function r44Tools() {
  var d = S.data, out = [];
  var pj = typeof r44PracticeJobs === 'function' ? r44PracticeJobs() : null;
  if (pj) { var soon = r42Stats().ivSoon; out.push(['practice', 'Interview practice', soon ? 'Practice for your interview with ' + coOr(soon) + '.' : pj.length ? pj.length + (pj.length === 1 ? ' job' : ' jobs') + ' you can practice for.' : 'Common questions, a timer and your own notes.']); }
  if (typeof r44FuDue === 'function') { var n = r44FuDue().length; out.push(['apps', 'Follow-ups', n ? n + (n === 1 ? ' note is due.' : ' notes are due.') : (d.apps || []).length ? 'No notes are due today.' : 'Dates and ready notes for the applications you send.']); }
  if (typeof vOffer === 'function') out.push(['offer', 'Offer check', 'Compare an offer with posted pay.']);
  /* r45: the training and benefits finder, listed before Find Your Fit. Nothing about the client decides its line. */
  var row = ['training', 'Training and benefits', 'Public training and benefit programs, with links to their official pages.']; out.push(row);
  if (typeof fitOn === 'function' && fitOn()) out.push(['fit', FIT_NAME, fitDone() ? 'Your top areas: ' + fitNames(d.fit.top3 || []) + '.' : 'An interest guide. Not finished yet.']);
  return out;
}
/* Home (S.view 'home'): the sentence, the path and the tools */
function vHome() {
  var d = S.data, cl = d.client || {}, c = counts(), nd = docsReady(), A = r42Stats(), today = todayISO();
  var fitTodo = typeof fitOn === 'function' && fitOn() && !fitDone();
  var k = r42Next({ docs: nd, matches: c.wait, ivSoon: A.ivSoon, fitTodo: fitTodo }), sub, btn, iv = null;
  var fresh = !d.jobs.length && !(d.closed || []).length && !d.docs.length && !d.apps.length;
  if (k === 'none' && fresh) k = 'first';
  if (k === 'docs') { sub = 'Read ' + (nd === 1 ? 'it' : 'them') + ' and approve, or ask for changes.'; btn = r44Link('docs', 'btn gold', 'Review your documents'); }
  else if (k === 'matches') { sub = 'Answer Yes, No or Question on each one. A Yes starts your tailored resume and cover letter.'; btn = r44Link('jobs', 'btn gold', 'See your matches'); }
  else if (k === 'interview') { var x = A.ivSoon; iv = { days: r42Days(today, x.interview), date: String(x.interview).slice(0, 10) };
    sub = [coOr(x), String(x.role || '').trim(), fmtY(x.interview), String(x.ivTime || '').trim()].filter(String).join(' · ');
    btn = pvHas(x) ? '<button type="button" class="btn gold" data-nxprep="' + esc(x.id) + '">Open your interview prep</button>' : r44Link('iv', 'btn gold', 'See your interviews'); }
  else if (k === 'fit') { sub = 'An interest guide. Optional, and it never limits which jobs you see.'; btn = r44Link('fit', 'btn gold', 'Open ' + esc(FIT_NAME)); }
  else if (k === 'first') { sub = 'You will get an email when your first jobs arrive.'; btn = r44Link('jobs', 'btn ghost', 'Open Jobs'); }
  else { sub = 'Nothing needs you right now. New matches show up under Jobs.'; btn = r44Link('jobs', 'btn ghost', 'Open Jobs'); }
  var hot = r44Stop(k);
  /* the path: one real detail line per stop, or a plain empty state */
  var wj = d.jobs.filter(function (j) { return !ansOf(j) && !j.closed; })[0], wd = (d.docs || []).filter(needsOk)[0], la = (d.apps || []).filter(function (a) { return stageOf(a) < 4; })[0], up = A.list[0];
  var due = typeof r44FuDue === 'function' ? r44FuDue().length : 0;
  var stops = [
    ['jobs', c.wait, c.wait === 1 ? 'new match' : 'new matches', c.wait ? (wj ? String(wj.title || '') + (wj.company ? ' at ' + wj.company : '') : '') : 'No new matches right now'],
    ['docs', nd, nd === 1 ? 'document waiting for your OK' : 'documents waiting for your OK', nd ? (wd ? String(wd.name || '') : '') : 'No documents waiting'],
    ['apps', A.open, A.open === 1 ? 'application in progress' : 'applications in progress', due ? due + (due === 1 ? ' follow-up note is due' : ' follow-up notes are due') : A.open ? (la ? [String(la.role || '').trim(), coOr(la)].filter(String).join(' at ') : '') : 'No applications in progress'],
    ['iv', A.ivUp, A.ivUp === 1 ? 'interview coming up' : 'interviews coming up', A.ivUp ? (up ? coOr(up.app) + ', ' + fmtY(up.app.interview) + (up.app.ivTime ? ', ' + up.app.ivTime : '') : '') : 'No interviews on your calendar']
  ];
  var tools = r44Tools(), last = r42LastAnswer(d.jobs), plan = billOn() ? esc(billHello(cl)) : esc(trialText(cl));
  return shell('home', esc(r44Sentence(k, cl.firstName, k === 'docs' ? nd : c.wait, iv)), esc(sub)) + '<div class="pband" aria-hidden="true"></div>' +
    '<main class="pmain wide h44-main">' + (S.flash ? '<div class="sent">' + esc(S.flash) + '</div>' : '') + (S.reauthMsg ? '<div class="warn">Your sign-in has expired.' + reauthBtn() + '</div>' : '') + ruHomeNudge() +
    '<div class="h44-grid"><section class="h44-next" data-hnext="' + k + '" aria-label="Your next step">' + btn + '</section><div class="h44-lead">' + r42WeekHtml() +
    (last ? '<section class="card h-ans" data-hans aria-labelledby="hAnsH"><h2 class="sec-h" id="hAnsH">Your last answered question</h2><p class="h-ans-j"><b>' + esc(last.title || coName(last)) + '</b>' + (last.company && last.title ? ' at ' + esc(last.company) : '') + (realISO(last.replyDate) ? '<span> · answered ' + esc(fmtY(String(last.replyDate).slice(0, 10))) + '</span>' : '') + '</p><p class="h-ans-t">' + esc(clipWords(String(last.reply).trim(), 280)) + '</p><button type="button" class="linkbtn" data-hjob="' + esc(last.id) + '">Open this job</button></section>' : '') + '</div>' +
    '<section class="h44-path' + (S.r44Drawn ? '' : ' draw') + '" aria-labelledby="h44PathH"><h2 class="sec-h" id="h44PathH">Where your search stands</h2><div class="h44-line" aria-hidden="true"></div><ul class="h-tiles h44-stops">' +
    stops.map(function (s) { var on = hot === s[0], first = on && k === 'first'; /* brand-new: the first-matches wording, not "0 new matches" */
      return '<li class="h44-stop' + (on ? ' on' : '') + '"><span class="h44-dot" aria-hidden="true"></span>' + r44Link(s[0], 'h-tile h44-card', first ? '<span class="h44-t">Your first matches are on the way</span><span class="h44-d">You will get an email when your first jobs arrive.</span>' : (on ? '<span class="h44-k">Your next step</span>' : '') + '<span class="h44-t"><b>' + s[1] + '</b> ' + s[2] + '</span><span class="h44-d">' + esc(s[3]) + '</span>', on ? ' data-hot="1"' : ''); }).join('') +
    '</ul><p class="h44-end">' + R44_SUN + '<span>Your next job, one honest step at a time.</span></p></section>' +
    /* r47: the tools sit inside the grid, right under the path on phones; each row is an icon, a name and one status line */
    (tools.length ? '<section class="h44-tools" aria-labelledby="h44ToolsH"><h2 class="sec-h" id="h44ToolsH">' + (r44Paid() ? 'Included with your plan' : 'Your tools') + '</h2><ul>' + tools.map(function (t) { return '<li>' + r44Link(t[0], 'h44-tool', '<i class="h44-ic" aria-hidden="true">' + (R47_IC[t[0]] || R47_IC.fit) + '</i><div class="h44-tx"><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span></div>' + IC.chev, ' data-tool="' + t[0] + '"') + '</li>'; }).join('') + '</ul></section>' : '') + '</div>' +
    (plan ? '<section class="card h-plan" data-hplan><p>' + plan + '</p>' + (billOn() ? '<button type="button" class="linkbtn" data-go="billing">Plan &amp; billing</button>' : '') + '</section>' : '') +
    ruHomeQuiet() + r42Foot() + '</main>' + tabbar('home');
}
if (typeof document !== 'undefined') {
  /* links on Home and in the tools are real links (they open in a new tab like any link); a plain tap stays in the app */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-r44go]'); if (!a || !r44On() || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); var v = a.getAttribute('data-r44go'); if (v === 'prefs' && S.view !== 'prefs') pfReset(); go(v);
  });
  /* the path draws once, on the first Home of this page load: render() in portal/index.html sets S.r44Drawn */
}

/* ================= shared: device store and data files ================= */
/* What the tools keep is on this device only (localStorage, one entry per client id). The live API (v1.45) has no place for
   it; r41/BACKEND_PROPOSAL_v146.md says what a store would need. Signing out removes it, like the portal's other device items. */
/* signed in, with a client on screen: every r44 listener and timer checks this first */
function r44On() { return S.status === 'ready' && !!S.data && !!S.data.client; }
/* '' when there is no signed-in client id: nothing is read or written then (never a key like sp_r44_none) */
function r44Key() { var id = r44On() ? String(S.data.client.id == null ? '' : S.data.client.id).replace(/[^\w-]/g, '') : ''; return id ? 'sp_r44_' + id : ''; }
function r44Store() { var k = r44Key(); if (S.r44Mem && S.r44Mem.k === k) return S.r44Mem.v; var v = {}; if (k) { try { v = JSON.parse(lsGet(k) || '{}') || {}; if (typeof v !== 'object' || Array.isArray(v)) v = {}; } catch (e) { v = {}; } } S.r44Mem = { k: k, v: v }; return v; }
function r44Save() { var k = r44Key(); if (!k) return false; try { localStorage.setItem(lsKey(k), JSON.stringify(r44Store())); return localStorage.getItem(lsKey(k)) != null; } catch (e) { return false; } }
/* removes every r44 entry on this device (all client ids) and forgets what is in memory. Called on every way out of a
   signed-in portal: Sign out, an expired session, a sign-in that fails, and a sign-out in another tab. */
function r44Wipe() {
  S.tf = null; /* r45: the training filter choices too (the stars go with the store) */
  S.r44Mem = null; S.fu = null; S.pr = null; S.of = null;
  if (S.ru && S.ru.timer) clearTimeout(S.ru.timer); S.ru = null; /* v1.47: a chosen resume file and its suggestions */
  try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (/^(spdemo_)?sp_r44_/.test(k || '')) localStorage.removeItem(k); } } catch (e) {}
}
var R44_DEVICE = 'Saved on this device only for now.';
var R44 = { scripts: null, bank: null, pay: null, busy: {}, err: {}, tries: {} };
/* what each data file must look like before a view may use it; anything else counts as a failed load */
var R44_SHAPE = {
  scripts: function (d) { return !!d.scripts && typeof d.scripts === 'object' && !!d.intervals; },
  bank: function (d) { return Array.isArray(d.general) && Array.isArray(d.behavioral) && !!d.families && typeof d.families === 'object'; },
  pay: function (d) { return Array.isArray(d.jobs); },
  training: function (d) { return Array.isArray(d.entries) && Array.isArray(d.areas) && Array.isArray(d.kinds) && !!d.fieldNames && typeof d.fieldNames === 'object'; }
};
var R44_TIMEOUT = 12000, R44_RETRY_MS = 1500;
/* Loads one data file. Views call this on every render, so it must be safe to call any number of times:
   it does nothing while the file is loaded, loading, or marked failed. A load makes one request; if that fails
   (network, a status that is not 2xx, no answer in R44_TIMEOUT ms, text that is not JSON, or the wrong shape) it
   makes exactly one more by itself after R44_RETRY_MS, without re-rendering in between. If that fails too it marks
   the file failed and renders once; nothing is requested again until the person presses "Try again". */
function r44Need(name, url) {
  if (R44[name] || R44.busy[name] || R44.err[name]) return;
  R44.busy[name] = true; R44.tries[name] = 0; r44Get(name, url);
}
function r44Get(name, url) {
  R44.tries[name] = (R44.tries[name] || 0) + 1;
  var done = false, ac = typeof AbortController === 'function' ? new AbortController() : null;
  var fail = function () {
    if (done) return; done = true; clearTimeout(tm);
    if (R44.tries[name] < 2) { setTimeout(function () { if (R44.busy[name] && !R44[name]) r44Get(name, url); }, R44_RETRY_MS); return; }
    R44.busy[name] = false; R44.err[name] = true; if (S.status === 'ready') render();
  };
  var tm = setTimeout(function () { if (ac) { try { ac.abort(); } catch (e) {} } fail(); }, R44_TIMEOUT);
  fetch(url, ac ? { signal: ac.signal } : undefined).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (d) {
    if (done) return;
    if (!d || typeof d !== 'object' || (R44_SHAPE[name] && !R44_SHAPE[name](d))) throw new Error('shape');
    done = true; clearTimeout(tm); R44[name] = d; R44.busy[name] = false; R44.err[name] = false; if (S.status === 'ready') render();
  }).catch(fail);
}
var R44_FAIL = 'We couldn\'t load this list.';
function r44Wait(name) { return R44.err[name] ? '<div class="card" role="alert" data-r44fail="' + name + '"><p style="margin:0 0 10px">' + R44_FAIL + '</p><button type="button" class="btn ghost" data-r44retry="' + name + '">Try again</button></div>' : '<div class="card"><p class="psub" style="margin:0" role="status">Loading…</p></div>'; }
var R44_URL = { scripts: '/assets/data/followup-scripts.json', bank: '/assets/data/interview-bank.json', pay: '/pay/data.json', training: '/assets/data/training-finder.json' };
function r44Sample() { return S.demo ? '<p class="p44-sample"><span class="pill">Sample data</span> This is the demo. Nothing you do here is sent.</p>' : ''; }

/* ================= T3: follow-ups ================= */
/* Intervals are the ones the site's follow-up guide states (/free/follow-up-scripts/): about 7 days after applying, one
   follow-up a week, a thank-you the same day as an interview, a nudge five business days after it. */
var R44_FU = { applyDays: 7, nudgeBusinessDays: 5 };
/* pure: the follow-up date for a submitted application. sub: the day it was submitted; sent: the day of the last follow-up */
function r44FuDate(sub, sent) { var base = r44Utc(sent) && (!r44Utc(sub) || String(sent).slice(0, 10) >= String(sub).slice(0, 10)) ? sent : sub; return r44AddDays(base, R44_FU.applyDays); }
function r44NudgeDate(interview) { return r44AddBusinessDays(interview, R44_FU.nudgeBusinessDays); }
/* pure: fill the guide's script with what the application holds. Anything it does not hold stays in brackets. */
function r44Fill(text, f) {
  var map = { 'Job title': f.role, 'Company': f.company, 'Your name': f.name, 'day': f.day, 'posted range': f.posted, 'offered amount': f.offered };
  return String(text || '').replace(/\[([^\]\n]+)\]/g, function (m, k) { var v = map[k]; return v != null && String(v).trim() ? String(v).trim() : m; });
}
function r44Mailto(to, subject, body) { return 'mailto:' + (to ? encodeURIComponent(to).replace(/%40/g, '@') : '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(String(body).replace(/\r?\n/g, '\r\n')); }
function r44Email(text) { var m = String(text || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/); return m ? m[0] : ''; }

function r44FuMarks(id) { var st = r44Store(); st.fu = st.fu || {}; return st.fu[id] || {}; }
/* The guide in New York time: a thank-you is for the day of the interview, so "today" for it is the date in America/New_York. */
function r44NyToday() { try { var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); if (/^\d{4}-\d\d-\d\d$/.test(p)) return p; } catch (e) {} return todayISO(); }
/* THE follow-up rule. Pure, and the only place that decides whether an application has a follow-up reminder. The card line,
   the Due group, Home's count, the Jobs due list and the Applications Due filter all read its result (through r44FuItems),
   so they cannot disagree.
   a: { stage (0-4 from the status; 4 is closed), col (1 submitted, 2 interview, 3 offer or hired, 4 closed), status, interview,
        outreach (a recruiter-outreach row), sub (submitted on), sent (the last follow-up date the API holds),
        own (the "Follow up on" date the client or coach set), flag (the coach's "Follow-up due" mark) }
   mk: this device's marks { sent: [dates], thanks, nudge, close }.
   last = the latest follow-up date (API and device). plain = col 1, status Applied or empty, no interview date, not outreach.

   "Follow up with the employer" (kind apply). First row that matches decides:
     # | application                                         | reminder                           | state
     1 | closed (stage 4)                                    | none                               |
     2 | own date set, and no follow-up on or after it       | on the own date (src own)          | due when own <= today, else upcoming.
       |                                                     |                                    | Never dropped for age; still shown after two follow-ups.
     3 | own date on or before the last follow-up            | the own date counts as cleared; go on to rows 4 to 7
     4 | coach flag set (any column that is not closed)      | no date (src flag)                 | due, until the coach clears the flag
     5 | plain, fewer than two follow-ups                    | 7 days after last, or after sub    | due when that day <= today, else upcoming;
       |                                                     | (src auto)                         | dropped when more than 30 days overdue
     6 | plain, two or more follow-ups                       | none (the closing note, below)     |
     7 | anything else                                       | none                               |
   Next to it, independent of the rows above:
     plain with two or more follow-ups, closing note not marked sent  -> kind close, state next (never counted as due)
     col 2 with an interview date, not outreach: thank-you from the interview day (New York date) for 14 days, check-in five business
       days after it for 30 days, each until marked sent                    -> kind thanks / nudge, state due
   The 30 day cut is only for the automatic 7 day rule (row 5). A date or flag a person set is never dropped for age. */
function r44FuPlan(a, today, nyToday, mk) {
  var out = []; mk = mk || {};
  var sent = (mk.sent || []).filter(function (d) { return !!r44Utc(d); }).map(function (d) { return String(d).slice(0, 10); });
  if (r44Utc(a.sent) && sent.indexOf(String(a.sent).slice(0, 10)) < 0) sent.push(String(a.sent).slice(0, 10)); sent.sort();
  var stage = a.stage != null ? a.stage : a.col, lastS = sent[sent.length - 1] || '', own = r44Utc(a.own) ? String(a.own).slice(0, 10) : '';
  var plain = a.col === 1 && !a.outreach && !String(a.interview || '').trim() && /^(applied)?$/i.test(String(a.status || '').trim());
  var flag = a.flag === true || String(a.flag == null ? '' : a.flag).toLowerCase() === 'yes';
  if (stage < 4) {
    if (own && (!lastS || own > lastS)) { var dO = r44Diff(today, own); out.push({ kind: 'apply', src: 'own', due: own, days: dO, state: dO <= 0 ? 'due' : 'upcoming', count: sent.length, draft: plain }); } /* row 2 */
    else if (flag) out.push({ kind: 'apply', src: 'flag', due: '', days: null, state: 'due', count: sent.length, draft: plain }); /* row 4 */
    else if (plain && sent.length < 2) { var due = r44FuDate(a.sub, lastS), d = due ? r44Diff(today, due) : null; if (due && d >= -30) out.push({ kind: 'apply', src: 'auto', due: due, days: d, state: d <= 0 ? 'due' : 'upcoming', count: sent.length, draft: true }); } /* row 5 */
    if (plain && sent.length >= 2 && !mk.close) out.push({ kind: 'close', due: '', days: null, state: 'next', count: sent.length });
  }
  if (a.col === 2 && !a.outreach && r44Utc(a.interview)) {
    var iv = String(a.interview).slice(0, 10), dNy = r44Diff(nyToday, iv), nd = r44NudgeDate(iv), dn = r44Diff(today, nd);
    if (!mk.thanks && dNy <= 0 && dNy >= -14) out.push({ kind: 'thanks', due: iv, days: dNy, state: 'due' });
    if (!mk.nudge && dn <= 0 && dn >= -30) out.push({ kind: 'nudge', due: nd, days: dn, state: 'due' });
  }
  return out;
}
/* pure: the guide's after-applying note says "last week". That is only true about a week after applying; otherwise the date goes in. */
function r44ApplyWhen(body, daysSince, dateText) { return daysSince != null && daysSince >= 5 && daysSince <= 9 ? body : String(body).replace('last week', 'on ' + dateText); }
function r44FuSub(x) { return realISO(x.submittedOn) ? String(x.submittedOn).slice(0, 10) : realISO(x.applied) ? String(x.applied).slice(0, 10) : ''; }
function r44FuItems() {
  var today = todayISO(), ny = r44NyToday(), out = [], st = r44Store(), dirty = false; st.fu = st.fu || {};
  ((S.data && S.data.apps) || []).forEach(function (x) {
    if (!x) return; var mk = st.fu[x.id] || {};
    /* the API holds only the last follow-up date, so the count of follow-ups is kept on this device */
    if (realISO(x.followUpSent)) { var d = String(x.followUpSent).slice(0, 10), have = mk.sent || []; if (have.indexOf(d) < 0) { mk = st.fu[x.id] = Object.assign({}, mk, { sent: have.concat([d]).sort() }); dirty = true; } }
    r44FuPlan({ stage: stageOf(x), col: boardCol(x), status: x.status, interview: x.interview, outreach: isOutreach(x), sub: r44FuSub(x), sent: x.followUpSent, own: x.followUpOn, flag: x.followUpDue }, today, ny, mk).forEach(function (o) { o.app = x; out.push(o); });
  });
  if (dirty) r44Save();
  /* by date; a reminder with no date (the coach's flag) first, the closing note last */
  var key = function (o) { return o.kind === 'close' ? '9999' : o.due; };
  return out.sort(function (a, b) { return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0; });
}
/* The five surfaces read the rule through these and nothing else:
   card line r44FuLine, Due group r44DueGroup, Home count r44FuDue().length, Jobs due list r44FuJob, Due filter r44FuIsDue. */
function r44FuIsDue(x) { return r44FuItems().some(function (o) { return o.app === x && o.state === 'due'; }); }
/* the Jobs due list names an application's follow-up when it is due, and ahead of time only when a person set the date */
/* the thank-you note and the check-in after an interview, when due */
function r44FuJobNotes(x) { return r44FuItems().filter(function (o) { return o.app === x && o.state === 'due' && o.kind !== 'apply'; }); }
function r44FuJob(x) { return r44FuItems().filter(function (o) { return o.app === x && o.kind === 'apply' && (o.state === 'due' || o.src === 'own'); })[0] || null; }
/* due now: exactly the items whose card line says so */
function r44FuDue() { return r44FuItems().filter(function (o) { return o.state === 'due'; }); }
var R44_FU_NAME = { apply: 'Follow-up', thanks: 'Thank-you note', nudge: 'Check-in', close: 'Closing note' };
function r44FuWhen(o) { return o.kind === 'thanks' ? 'after your interview' : o.kind === 'close' ? '' : !o.due ? 'due' : o.days === 0 ? 'due today' : o.days === 1 ? 'due tomorrow' : 'due ' + fmtY(o.due); }
function r44FuLabel(o) { return o.kind === 'close' ? 'Two follow-ups sent' : (R44_FU_NAME[o.kind] + ' ' + r44FuWhen(o)).trim(); }
function r44FuBtn(o, label) { return '<button type="button" class="kbtn" data-r44fu="' + o.kind + ':' + esc(o.app.id) + '">' + (label || (o.kind === 'close' ? 'Draft the closing note' : 'Draft the note')) + '<span class="sr"> for ' + esc(coOr(o.app)) + '</span></button>'; }
/* r45: the one "I followed up" control; the same board followedup request as before */
function r44FuDone(x) { return '<button type="button" class="kbtn" data-bfollow="' + esc(x.id) + '"' + (S.bdBusy && S.bdBusy[x.id] ? ' aria-disabled="true"' : '') + '>I followed up<span class="sr"> with ' + esc(coOr(x)) + '</span></button>'; }
/* on each application card. The note to adapt is offered where the guide's after-applying note fits (a submitted application
   with no reply); any other follow-up reminder gets the pill and "I followed up". */
function r44FuLine(x) {
  var its = r44FuItems().filter(function (o) { return o.app === x; });
  var offer = stageOf(x) === 3 && /offer/i.test(String(x.status || '')) ? '<p><button type="button" class="kbtn" data-r44offer="' + esc(x.id) + '">Offer check<span class="sr"> for ' + esc(coOr(x)) + '</span></button></p>' : '';
  if (!its.length) return offer ? '<div class="p44-fuline">' + offer + '</div>' : '';
  return '<div class="p44-fuline" data-r44fuline="' + esc(x.id) + '">' + offer + its.map(function (o) { return '<p data-fustate="' + o.state + '"><span class="pill ' + (o.state === 'due' ? 'gold' : 'info') + '">' + esc(r44FuLabel(o)) + '</span> ' + (o.kind !== 'apply' || o.draft ? r44FuBtn(o) : '') + (o.kind === 'apply' && o.state === 'due' ? r44FuDone(x) : '') + '</p>'; }).join('') + '</div>';
}
/* the Due group at the top of Applications */
function r44DueGroup() {
  var due = r44FuDue(); if (!due.length) return '';
  return '<section class="card p44-due" data-r44due aria-labelledby="p44DueH"><h2 class="sec-h" id="p44DueH">Due <span class="cnt">' + due.length + '</span></h2><ul>' + due.map(function (o) {
    return '<li data-due="' + o.kind + ':' + esc(o.app.id) + '"><div><b>' + esc(coOr(o.app)) + '</b><span>' + esc(String(o.app.role || '').trim()) + '</span><span class="p44-when">' + esc(r44FuLabel(o)) + '</span></div>' + (o.kind !== 'apply' || o.draft ? r44FuBtn(o) : r44FuDone(o.app)) + '</li>'; }).join('') + '</ul></section>';
}
function r44FuOpen(kind, id) {
  var x = appById(id); if (!x || !/^(apply|thanks|nudge|close)$/.test(kind)) return;
  S.fu = { app: String(x.id), kind: kind, subject: null, body: null, msg: '' }; go('fu');
}
function r44FuFields(x) { var cl = S.data.client || {}; return { role: x.role, company: x.company, name: cl.name || cl.firstName, day: r44Weekday(x.interview) }; }
function vFu() {
  var F = S.fu, x = F && appById(F.app);
  if (!x) { S.view = 'apps'; return vApps(); }
  r44Need('scripts', R44_URL.scripts);
  var sc = R44.scripts && R44.scripts.scripts[F.kind], body;
  if (!sc) body = r44Wait('scripts');
  else {
    if (F.subject == null) { var f = r44FuFields(x); F.subject = r44Fill(sc.subject, f); F.body = r44Fill(sc.body, f); if (F.kind === 'apply') { var sb = r44FuSub(x); F.body = r44ApplyWhen(F.body, sb ? r44Diff(sb, todayISO()) : null, sb ? fmtY(sb) : ''); } }
    var to = r44Email(x.contact), left = /\[[^\]\n]+\]/.test(F.subject + F.body), mk = r44FuMarks(x.id), sent = F.kind === 'apply' ? false : !!mk[F.kind];
    body = r44Sample() + '<div class="card p44-card"><h2 class="pf-h">When to send</h2><p>' + esc(sc.when) + '</p>' + (F.kind === 'apply' || F.kind === 'close' ? '<p>' + esc(R44.scripts.rule) + '</p>' : '') +
      '<p class="psub">From our <a href="/free/follow-up-scripts/" target="_blank" rel="noopener">follow-up scripts guide<span class="sr"> (opens in a new tab)</span></a>. General information, not legal or financial advice.</p></div>' +
      '<div class="card p44-card"><label for="fuSub">Subject</label><input id="fuSub" type="text" maxlength="200" value="' + esc(F.subject) + '">' +
      '<label for="fuBody">The note</label><textarea id="fuBody" rows="12" maxlength="4000">' + esc(F.body) + '</textarea>' +
      '<p class="psub" id="fuLeft"' + (left ? '' : ' hidden') + '>Anything still in brackets, like [Name], is yours to fill in before you send.</p>' +
      '<p class="psub">' + (to ? 'Open in email addresses it to ' + esc(to) + ', the email saved on this application.' : 'Open in email leaves the address empty. Add the person you are writing to.') + ' You send it yourself. The portal never sends email for you.</p>' +
      '<div class="p44-acts"><button type="button" class="btn" data-r44fucopy>Copy</button><a class="btn ghost" id="fuMail" href="' + esc(r44Mailto(to, F.subject, F.body)) + '">Open in email</a>' +
      (sent ? '' : '<button type="button" class="btn ghost" data-r44fusent' + (S.bdBusy && S.bdBusy[x.id] ? ' disabled' : '') + '>Mark as sent</button>') + '</div>' +
      (F.kind !== 'apply' ? '<p class="psub p44-dev">' + (sent ? 'Marked as sent on ' + esc(fmtY(mk[F.kind])) + '. ' : '') + R44_DEVICE + '</p>' : '<p class="psub p44-dev">Reminders stop after two follow-ups, as the guide says. The count is kept on this device.</p>') +
      '<p class="p44-msg" role="status" id="fuMsg">' + esc(F.msg || '') + '</p></div>';
  }
  return shell('fu', esc(R44_FU_NAME[F.kind] + ' for ' + coOr(x)), esc(String(x.role || '').trim())) + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 p44-fu"><div class="fl-top"><button type="button" class="fl-back" data-go="apps">' + IC.chev + 'Back to Applications</button></div>' + body + '</main>' + tabbar('fu');
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !r44On() || !S.fu || (t.id !== 'fuSub' && t.id !== 'fuBody')) return;
    if (t.id === 'fuSub') S.fu.subject = t.value; else S.fu.body = t.value;
    var x = appById(S.fu.app), a = document.getElementById('fuMail'), l = document.getElementById('fuLeft');
    if (a && x) a.setAttribute('href', r44Mailto(r44Email(x.contact), S.fu.subject, S.fu.body));
    if (l) l.hidden = !/\[[^\]\n]+\]/.test(S.fu.subject + S.fu.body);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !r44On()) return;
    var b = e.target.closest('[data-r44fu]'); if (b) { var p = b.getAttribute('data-r44fu').split(':'); r44FuOpen(p[0], p.slice(1).join(':')); return; }
    var rt = e.target.closest('[data-r44retry]'); if (rt) { var n = rt.getAttribute('data-r44retry'); if (!R44_URL[n] || R44.busy[n]) return; R44.err[n] = false; r44Need(n, R44_URL[n]); render(); return; }
    if (e.target.closest('[data-r44fucopy]') && S.fu) { copyText((S.fu.subject ? 'Subject: ' + S.fu.subject + '\n\n' : '') + S.fu.body); return; }
    if (e.target.closest('[data-r44fusent]') && S.fu) {
      var x = appById(S.fu.app); if (!x) return;
      if (S.fu.kind === 'apply') { var s0 = r44Store(), t0 = todayISO(); s0.fu = s0.fu || {}; var m0 = s0.fu[x.id] = s0.fu[x.id] || {}; m0.sent = (m0.sent || []).filter(function (d) { return d !== t0; }).concat([t0]).sort(); r44Save(); r18Move(x.id, 'followedup'); go('apps'); return; } /* the existing "I followed up" request: { action: 'board', stage: 'followedup', id } */
      var st = r44Store(); st.fu = st.fu || {}; st.fu[x.id] = st.fu[x.id] || {}; st.fu[x.id][S.fu.kind] = todayISO();
      S.fu.msg = r44Save() ? 'Marked as sent. ' + R44_DEVICE : 'This device would not save it. The note is not marked.'; S.focusTo = '#fuMsg'; render();
    }
  });
  /* signing out removes what the tools kept on this device and stops the practice timer first (signOut() in portal/index.html);
     any screen that is not a signed-in portal (sign-in, link, error after an expired session) leaves nothing behind either (render()) */
  /* signed out in another tab: this tab signs out too, so nothing typed here is saved again after the store was removed */
  window.addEventListener('storage', function (e) {
    if (S.demo || !e || e.storageArea !== localStorage) return;
    if (e.key === 'sp_token' && !e.newValue && S.token) { signOut('You signed out in another tab. Sign in again to continue.'); return; }
    if (e.key && /^sp_r44_/.test(e.key) && e.newValue == null) S.r44Mem = null; /* removed elsewhere: do not write the old copy back */
  });
  window.addEventListener('pagehide', function () { r44TimerStop(); });
}

/* ================= T4: offer check ================= */
/* Arithmetic on what the client types, the pay line stored on the job's row (shown as stored) and the pay lookup's own data
   file (/pay/data.json, cited the way /pay/ cites it). Nothing here is sent anywhere. */
var R44_WEEKS = 52;
/* whole dollars, or with cents when asked or when the amount is not a whole dollar: a shown figure never rounds across a line it is compared with */
function r44Money(n, cents) { n = Number(n); cents = !!cents || Math.round(n * 100) % 100 !== 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); }
/* pure: read a number the client typed. Digits, commas only as thousands separators, one decimal point. Anything else is
   refused with a message: nothing is guessed or reinterpreted. Returns { v, err, empty }. A real number (from code) passes. */
var R44_NUM_ERR = 'Use digits only, like 65000 or 65,000.50.';
function r44Amt(x) {
  if (typeof x === 'number') return isFinite(x) && x >= 0 ? { v: x, err: '', empty: false } : { v: null, err: R44_NUM_ERR, empty: false };
  var t = String(x == null ? '' : x).trim(); if (!t) return { v: null, err: '', empty: true };
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$|^\.\d+$/.test(t)) return { v: null, err: R44_NUM_ERR, empty: false };
  return { v: Number(t.replace(/,/g, '')), err: '', empty: false };
}
/* pure: the message for each field that cannot be used, by field name. o as r44OfferMath, with commute split into cost, or miles and rate. */
function r44OfferErrs(o) {
  var e = {}, a = r44Amt(o.amount), h = r44Amt(o.hours), d = r44Amt(o.days);
  if (a.err) e.amount = a.err; else if (!a.empty && !(a.v > 0)) e.amount = 'Type an amount above 0.';
  if (h.err) e.hours = h.err; else if (!h.empty && !(h.v > 0)) e.hours = 'Type hours above 0.'; else if (h.v > 168) e.hours = 'A week has 168 hours. Type 168 or less.';
  if (d.err) e.days = d.err; else if (d.v > 7) e.days = 'A week has 7 days. Type 0 to 7.';
  ['commute', 'cost', 'miles', 'rate'].forEach(function (k) { if (o[k] === undefined) return; var r = r44Amt(o[k]); if (r.err) e[k] = r.err; });
  return e;
}
function r44Pos(v) { var r = r44Amt(v); return r.v != null && r.v > 0 ? r.v : null; }
/* pure: o = { amount, unit: 'hour' | 'year', hours, days, commute (cost per day on site) }. Returns null until pay and hours are
   usable, and whenever any field holds something that is not a plain number in range. */
function r44OfferMath(o) {
  if (Object.keys(r44OfferErrs(o)).length) return null;
  var amt = r44Pos(o.amount), hrs = r44Pos(o.hours); if (!amt || !hrs) return null;
  var hourly = o.unit === 'hour', yearly = hourly ? amt * hrs * R44_WEEKS : amt, perHour = hourly ? amt : amt / (hrs * R44_WEEKS);
  var dr = r44Amt(o.days), days = dr.v == null ? 0 : dr.v, cost = r44Pos(o.commute), hasC = cost != null && days > 0, commute = hasC ? cost * days * R44_WEEKS : 0;
  var lines = [];
  if (hourly) lines.push('Yearly pay: ' + r44Money(amt, true) + ' an hour x ' + hrs + ' hours a week x ' + R44_WEEKS + ' weeks = ' + r44Money(yearly));
  else lines.push('Hourly pay: ' + r44Money(amt) + ' a year / (' + hrs + ' hours a week x ' + R44_WEEKS + ' weeks) = ' + r44Money(perHour, true) + ' an hour');
  if (hasC) { lines.push('Commute: ' + r44Money(cost, true) + ' a day x ' + days + (days === 1 ? ' day' : ' days') + ' a week x ' + R44_WEEKS + ' weeks = ' + r44Money(commute) + ' a year'); lines.push('Pay after commute: ' + r44Money(yearly) + ' - ' + r44Money(commute) + ' = ' + r44Money(yearly - commute) + ' a year'); }
  return { yearly: yearly, hourly: perHour, commute: commute, after: yearly - commute, hasCommute: hasC, lines: lines };
}
/* pure: a posted pay line is compared ONLY when it is, in full, one amount or one range that says per hour or per year.
   The Job matcher's own hourly form, "$55 to $65 per hour (about $114,400 to $135,200 a year if full-time, our math)", is read
   as its hourly range; that bracket (it must say "our math") is our own arithmetic and is ignored. Any other bracket, or a word
   such as OTE, commission, bonus, tips, plus or differential anywhere in the line, means no comparison. Everything else returns null and is shown as stored:
   by the month, week, day or visit, "k" shorthand, OTE, commission, bonus, "up to", "plus", three amounts, no unit. */
function r44Posted(text) {
  var p = String(text == null ? '' : text).replace(/\s+/g, ' ').trim(); if (!p) return null;
  if (/\b(OTE|on[- ]target|commissions?|bonus(es)?|tips?|plus|differential|incentives?|overtime|stipend)\b|%|\+/i.test(p)) return null; /* anywhere in the line, bracket included */
  p = p.replace(/ ?\(about \$[^()]*\bour math\)\.?$/i, '').trim(); /* only the matcher's own bracket; any other bracket stays and stops the comparison */
  var A = '(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d{1,2})?', U = '(per hour|an hour|hourly|/ ?hour|/ ?hr|per hr|per year|a year|yearly|annually|per annum|/ ?year|/ ?yr)';
  var m = new RegExp('^\\$ ?' + A + '(?: ?(?:to|-|\\u2013|\\u2014) ?\\$? ?' + A + ')? ?' + U + '\\.?$', 'i').exec(p); if (!m) return null;
  var num = function (d, f) { return Number(d.replace(/,/g, '') + (f || '')); }, lo = num(m[1], m[2]), hi = m[3] != null ? num(m[3], m[4]) : lo, unit = /hour|hr/i.test(m[5]) ? 'hour' : 'year';
  if (!(lo > 0) || hi < lo || (unit === 'hour' ? hi >= 1000 : lo < 1000)) return null;
  return { lo: lo, hi: hi, unit: unit };
}
function r44Place(v, lo, hi) { return v < lo ? 'below' : v > hi ? 'above' : 'within'; }
/* pure: the pay lookup's own matching rule (pay/index.html score) */
function r44PayScore(j, q) {
  var t = (j.title + ' ' + (j.aka || []).join(' ')).toLowerCase(), words = String(q || '').toLowerCase().split(/\s+/).filter(String), s = 0;
  var at = function (txt, w) { return new RegExp('(^|[^a-z0-9])' + w.replace(/[^a-z0-9]/g, '\\$&')).test(txt); };
  var hit = 0; words.forEach(function (w) { if (at(t, w)) { hit++; s += at(j.title.toLowerCase(), w) ? 2 : 1; } });
  return words.length && hit === words.length ? s : 0;
}
/* pure: the pay lookup's own sentence for a number against the three marks (pay/index.html mineLine) */
function r44LookupLine(v, lo, mid, hi) {
  var where;
  if (lo != null && v < lo) where = 'under the lowest-paid 25% mark (' + r44Money(lo) + ')';
  else if (Math.abs(v - mid) <= mid * 0.05) where = 'about the median';
  else if (v < mid) where = 'between the lowest-paid 25% mark and the median';
  else if (hi == null || v <= hi) where = 'between the median and the highest-paid 25% mark';
  else where = 'over the highest-paid 25% mark (' + r44Money(hi) + ')';
  return 'Your offer, ' + r44Money(v) + ' a year, is ' + where + '.';
}
function r44Bar(lo, hi, v, mid) {
  var min = Math.min(lo, v) * 0.9, max = Math.max(hi, v) * 1.1, pct = function (x) { return Math.max(0, Math.min(100, (x - min) / (max - min) * 100)).toFixed(1) + '%'; };
  return '<div class="p44-bar" aria-hidden="true"><i class="rng" style="left:' + pct(lo) + ';right:calc(100% - ' + pct(hi) + ')"></i>' + (mid != null ? '<i class="mid" style="left:' + pct(mid) + '"></i>' : '') + '<i class="you" style="left:' + pct(v) + '"><span>Offer</span></i></div>';
}

function r44OfferJobs() {
  var d = S.data, out = [], seen = {};
  (d.apps || []).forEach(function (x) { if (isOutreach(x) || stageOf(x) >= 4) return; var j = x.jobId ? jobById(x.jobId) : null; if (j) seen[j.id] = 1; out.push({ key: 'a:' + x.id, label: [String(x.role || '').trim(), coOr(x)].filter(String).join(' at '), role: x.role, company: x.company, pay: j ? String(j.pay == null ? '' : j.pay).trim() : '' }); });
  (d.jobs || []).forEach(function (j) { if (seen[j.id] || ansOf(j) !== 'yes' || j.closed) return; out.push({ key: 'j:' + j.id, label: [String(j.title || '').trim(), String(j.company || '').trim()].filter(String).join(' at '), role: j.title, company: j.company, pay: String(j.pay == null ? '' : j.pay).trim() }); });
  return out;
}
function r44Of() {
  if (!S.of) { var home = String((S.data.client || {}).home || ''); S.of = { job: '', amount: '', unit: 'year', hours: '40', days: '5', mode: 'cost', cost: '', miles: '', rate: '', health: false, retire: false, pto: false, start: '', q: '', soc: '', st: /,\s*NY\b/.test(home) ? 'NY' : 'NJ' }; }
  return S.of;
}
function r44OfferOpen(appId) { S.of = null; var o = r44Of(); if (appId) o.job = 'a:' + appId; go('offer'); }
function r44OfCommute(o) { if (o.mode === 'miles') { var mi = r44Pos(o.miles), rt = r44Pos(o.rate); return mi && rt ? mi * rt : null; } return r44Pos(o.cost); }
function r44OfErrs() { var o = r44Of(), q = { amount: o.amount, hours: o.hours, days: o.days }; if (o.mode === 'miles') { q.miles = o.miles; q.rate = o.rate; } else q.cost = o.cost; return r44OfferErrs(q); }
function r44OfferOut() {
  var o = r44Of(), jobs = r44OfferJobs(), J = jobs.filter(function (x) { return x.key === o.job; })[0] || null, h = '';
  if (Object.keys(r44OfErrs()).length) return '<div class="card p44-card" data-ofout="fix"><p class="psub" style="margin:0">Fix the field marked above to see the numbers.</p></div>';
  var cost = r44OfCommute(o), M = r44OfferMath({ amount: o.amount, unit: o.unit, hours: o.hours, days: o.days, commute: cost == null ? '' : cost });
  if (!M) return '<div class="card p44-card" data-ofout="empty"><p class="psub" style="margin:0">Type the offered pay and the hours a week to see the numbers.</p></div>';
  var lines = M.lines.slice(); if (o.mode === 'miles' && cost != null) lines.splice(1, 0, 'Commute cost a day: ' + r44Pos(o.miles) + ' miles x ' + r44Money(r44Pos(o.rate), true) + ' a mile = ' + r44Money(cost, true));
  h += '<section class="card p44-card" data-ofout="math" aria-labelledby="ofMathH"><h2 class="pf-h" id="ofMathH">The arithmetic</h2><dl class="p44-dl"><div><dt>A year</dt><dd data-of="yearly">' + r44Money(M.yearly) + '</dd></div><div><dt>An hour</dt><dd data-of="hourly">' + r44Money(M.hourly, true) + '</dd></div>' +
    (M.hasCommute ? '<div><dt>Commute a year</dt><dd data-of="commute">' + r44Money(M.commute) + '</dd></div><div><dt>Pay after commute</dt><dd data-of="after">' + r44Money(M.after) + '</dd></div>' : '') + '</dl>' +
    '<ul class="p44-lines">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul><p class="psub">Counted as ' + R44_WEEKS + ' weeks a year. Taxes, unpaid time off and overtime are not counted.</p></section>';
  /* posted pay, exactly as stored on the job's row */
  if (J && J.pay) {
    var P = r44Posted(J.pay), v = P ? (P.unit === 'hour' ? M.hourly : M.yearly) : null, pl = P ? r44Place(Math.round(v * 100) / 100, P.lo, P.hi) : '';
    h += '<section class="card p44-card" data-ofout="posted" aria-labelledby="ofPostH"><h2 class="pf-h" id="ofPostH">Against the posting</h2><p data-of="posted"><b>Posted:</b> ' + esc(J.pay) + '</p>' +
      (P ? '<p data-of="place" data-place="' + pl + '">Your offer, ' + r44Money(v, P.unit === 'hour') + (P.unit === 'hour' ? ' an hour' : ' a year') + ', is ' + (pl === 'within' ? 'within' : pl) + ' the posted ' + (P.lo === P.hi ? 'pay' : 'range') + '.</p>' + r44Bar(P.lo, P.hi, v) :
        '<p data-of="place" data-place="">We can\'t compare this pay line automatically.</p>') + '</section>';
  } else if (J) h += '<section class="card p44-card" data-ofout="posted"><h2 class="pf-h">Against the posting</h2><p class="psub" style="margin:0">No posted pay is saved for this job, so there is nothing to compare here.</p></section>';
  /* the pay lookup's data */
  var D = R44.pay, L = D && o.soc ? (D.jobs || []).filter(function (j) { return j.soc === o.soc; })[0] : null, V = L && L[o.st];
  if (L && V && V.p50 != null) {
    h += '<section class="card p44-card" data-ofout="lookup" aria-labelledby="ofLookH"><h2 class="pf-h" id="ofLookH">Against the pay lookup</h2><p><b>' + esc(L.title) + '</b>, ' + (o.st === 'NJ' ? 'New Jersey' : 'New York') + '. Typical yearly pay: ' + r44Money(V.p50) + ' (median).' + (V.p25 != null && V.p75 != null ? ' The lowest-paid 25% earn under ' + r44Money(V.p25) + '. The highest-paid 25% earn over ' + r44Money(V.p75) + '.' : '') + '</p>' +
      '<p data-of="lookline">' + esc(r44LookupLine(Math.round(M.yearly), V.p25, V.p50, V.p75)) + '</p>' + (V.p25 != null && V.p75 != null ? r44Bar(V.p25, V.p75, M.yearly, V.p50) : '') + r44PaySrc(D) + '</section>';
  } else if (L) h += '<section class="card p44-card" data-ofout="lookup"><p class="psub" style="margin:0">No pay data is published for this job in ' + (o.st === 'NJ' ? 'New Jersey' : 'New York') + '.</p></section>';
  /* what the client ticked */
  var B = [['health', 'health insurance'], ['retire', 'retirement match'], ['pto', 'paid time off']], yes = B.filter(function (b) { return o[b[0]]; }).map(function (b) { return b[1]; }), no = B.filter(function (b) { return !o[b[0]]; }).map(function (b) { return b[1]; });
  h += '<section class="card p44-card" data-ofout="rest"><h2 class="pf-h">Besides pay</h2><p>' + (yes.length ? 'You ticked: ' + esc(yes.join(', ')) + '.' : 'You ticked no benefits.') + (no.length ? ' Not ticked: ' + esc(no.join(', ')) + '.' : '') + (r44Utc(o.start) ? ' Start date: ' + esc(fmtY(o.start)) + '.' : '') + '</p><p class="psub">Benefits are not turned into dollars here.</p></section>';
  /* a note to adapt, from the site's own follow-up scripts */
  var sc = R44.scripts && R44.scripts.scripts.offer;
  if (sc && J && J.pay) {
    var txt = r44Fill(sc.body, { role: J.role, name: (S.data.client || {}).name || (S.data.client || {}).firstName, posted: J.pay, offered: r44Money(o.unit === 'hour' ? M.hourly : M.yearly, o.unit === 'hour') + (o.unit === 'hour' ? ' an hour' : ' a year') });
    h += '<section class="card p44-card" data-ofout="script" aria-labelledby="ofScH"><h2 class="pf-h" id="ofScH">A note you can adapt</h2><p class="psub">' + esc(sc.when) + ' Anything in brackets is yours to fill in.</p><pre class="p44-pre" id="ofScript">' + esc(txt) + '</pre><div class="p44-acts"><button type="button" class="btn ghost" data-copy="' + esc(txt) + '">Copy the note</button></div>' +
      '<p class="psub">From our <a href="/free/follow-up-scripts/" target="_blank" rel="noopener">follow-up scripts guide<span class="sr"> (opens in a new tab)</span></a>, which also has a counter-offer note.</p></section>';
  } else h += '<section class="card p44-card" data-ofout="script"><p style="margin:0">Notes for asking about pay, a counter-offer and a polite decline are in our <a href="/free/follow-up-scripts/" target="_blank" rel="noopener">follow-up scripts guide<span class="sr"> (opens in a new tab)</span></a>.</p></section>';
  return h;
}
/* the source line, in the pay lookup's own words (pay/index.html srcLine) */
function r44PaySrc(d) {
  var name = String(d.source || 'U.S. Bureau of Labor Statistics wage data'), url = String(d.source_url || '');
  var h = 'Source: ' + (/^https:\/\//.test(url) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '<span class="sr"> (opens in a new tab)</span></a>' : esc(name)) + '.';
  var m = String(d.retrieved || '').match(/^(\d{4})-(\d{2})-(\d{2})$/), rd = m && new Date(+m[1], +m[2] - 1, +m[3]);
  if (rd && rd.getMonth() === +m[2] - 1 && rd.getDate() === +m[3]) h += ' Data retrieved on ' + rd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + '.';
  return '<p class="psub" data-of="source">' + h + ' Figures are yearly wages for all workers in the job statewide, not offers for any specific posting. Pay varies by employer, experience and region.</p>';
}
function r44OfHits() { var o = r44Of(), D = R44.pay, q = String(o.q || '').trim(); if (!D || !q) return []; return (D.jobs || []).map(function (j) { return [r44PayScore(j, q), j]; }).filter(function (x) { return x[0]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 4).map(function (x) { return x[1]; }); }
function r44OfHitsHtml() {
  var o = r44Of(), hits = r44OfHits(), q = String(o.q || '').trim();
  if (!R44.pay) return R44.err.pay ? '<p class="err" role="alert" data-r44fail="pay">' + R44_FAIL + ' <button type="button" class="linkbtn" data-r44retry="pay">Try again</button></p>' : '';
  if (!q) return '';
  if (!hits.length) return '<p class="psub">No match yet for "' + esc(q) + '". Try a simpler word, like "nurse", "technician", "clerk" or "sales".</p>';
  return '<div class="p44-hits" role="radiogroup" aria-label="Jobs in the pay lookup">' + hits.map(function (j) { return '<button type="button" role="radio" aria-checked="' + (o.soc === j.soc) + '" data-ofsoc="' + esc(j.soc) + '">' + esc(j.title) + '</button>'; }).join('') + '</div>';
}
function vOffer() {
  var o = r44Of(), jobs = r44OfferJobs();
  r44Need('pay', R44_URL.pay); r44Need('scripts', R44_URL.scripts);
  var errs = r44OfErrs();
  var inp = function (id, label, k, attrs) { var num = !attrs || /inputmode/.test(attrs); return '<div><label for="' + id + '">' + label + '</label><input id="' + id + '" data-of="' + k + '" value="' + esc(o[k]) + '" ' + (attrs || 'type="text" inputmode="decimal" maxlength="12"') + (num ? ' aria-describedby="ofE_' + k + '"' + (errs[k] ? ' aria-invalid="true"' : '') : '') + '>' + (num ? '<p class="err p44-ferr" id="ofE_' + k + '" data-oferr="' + k + '" aria-live="polite">' + esc(errs[k] || '') + '</p>' : '') + '</div>'; };
  var chk = function (k, label) { return '<label class="p44-chk"><input type="checkbox" data-ofc="' + k + '"' + (o[k] ? ' checked' : '') + '>' + label + '</label>'; };
  return shell('offer', 'Offer check', 'Arithmetic and posted data, not advice on whether to accept.') + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 p44-of">' + r44Sample() +
    '<div class="card p44-card"><p style="margin:0">Type what you were offered. The numbers below are worked out on this device. Nothing here is sent or saved.</p></div>' +
    '<form class="card p44-card p44-form" id="ofForm" onsubmit="return false">' +
    '<label for="ofJob">Which job is the offer for?</label><select id="ofJob" data-ofs="job"><option value="">A job that is not listed</option>' + jobs.map(function (j) { return '<option value="' + esc(j.key) + '"' + (o.job === j.key ? ' selected' : '') + '>' + esc(j.label) + '</option>'; }).join('') + '</select>' +
    '<div class="p44-two">' + inp('ofAmt', 'Offered pay, in dollars', 'amount') + '<div><label for="ofUnit">Paid by the</label><select id="ofUnit" data-ofs="unit"><option value="year"' + (o.unit === 'year' ? ' selected' : '') + '>Year</option><option value="hour"' + (o.unit === 'hour' ? ' selected' : '') + '>Hour</option></select></div></div>' +
    '<div class="p44-two">' + inp('ofHrs', 'Hours a week', 'hours') + inp('ofDays', 'Days on site a week', 'days', 'type="text" inputmode="decimal" maxlength="4"') + '</div>' +
    '<fieldset class="p44-fs"><legend>Commute cost for a day on site</legend><label class="p44-chk"><input type="radio" name="ofMode" data-ofm="cost"' + (o.mode === 'cost' ? ' checked' : '') + '>I know the cost (fare, tolls, parking)</label><label class="p44-chk"><input type="radio" name="ofMode" data-ofm="miles"' + (o.mode === 'miles' ? ' checked' : '') + '>Miles times a rate</label>' +
    (o.mode === 'miles' ? '<div class="p44-two">' + inp('ofMiles', 'Round trip miles a day', 'miles') + inp('ofRate', 'Your cost a mile, in dollars', 'rate') + '</div><p class="psub">Use your own cost a mile. We do not supply a rate.</p>' : inp('ofCost', 'Cost a day, in dollars', 'cost')) + '</fieldset>' +
    '<fieldset class="p44-fs"><legend>Benefits in the offer</legend>' + chk('health', 'Health insurance') + chk('retire', 'Retirement match') + chk('pto', 'Paid time off') + '</fieldset>' +
    '<div><label for="ofStart">Start date</label><input id="ofStart" type="date" data-of="start" value="' + esc(o.start) + '"></div>' +
    '<fieldset class="p44-fs"><legend>Compare with the pay lookup (optional)</legend><div class="p44-two"><div><label for="ofQ">Job title to look up</label><input id="ofQ" type="search" data-of="q" maxlength="60" autocomplete="off" value="' + esc(o.q) + '"></div><div><label for="ofSt">State</label><select id="ofSt" data-ofs="st"><option value="NJ"' + (o.st === 'NJ' ? ' selected' : '') + '>New Jersey</option><option value="NY"' + (o.st === 'NY' ? ' selected' : '') + '>New York</option></select></div></div><div id="ofHits">' + r44OfHitsHtml() + '</div></fieldset></form>' +
    '<div id="ofOut" aria-live="polite">' + r44OfferOut() + '</div>' +
    '<p class="p44-fine">This is arithmetic and posted data, not advice on whether to accept. General information, not legal or financial advice.</p>' + r42Foot() + '</main>' + tabbar('offer');
}
if (typeof document !== 'undefined') {
  var r44OfPatch = function () { var out = document.getElementById('ofOut'), hits = document.getElementById('ofHits'), errs = r44OfErrs(); if (out) out.innerHTML = r44OfferOut(); if (hits) hits.innerHTML = r44OfHitsHtml();
    [].forEach.call(document.querySelectorAll('[data-oferr]'), function (el) { var k = el.getAttribute('data-oferr'), t = errs[k] || '', f = document.querySelector('[data-of="' + k + '"]'); if (el.textContent !== t) el.textContent = t; if (f) { if (t) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); } }); };
  document.addEventListener('input', function (e) { var t = e.target, k = t && t.getAttribute && t.getAttribute('data-of'); if (!k || !r44On() || !S.of || t.tagName !== 'INPUT') return; S.of[k] = t.value; if (k === 'q') S.of.soc = ''; r44OfPatch(); });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !r44On() || !S.of || S.view !== 'offer') return;
    var ks = t.getAttribute('data-ofs'), kc = t.getAttribute('data-ofc'), km = t.getAttribute('data-ofm');
    if (ks) { S.of[ks] = t.value; r44OfPatch(); } else if (kc) { S.of[kc] = !!t.checked; r44OfPatch(); } else if (km) { S.of.mode = km; S.focusTo = km === 'miles' ? '#ofMiles' : '#ofCost'; render(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !r44On()) return;
    var b = e.target.closest('[data-ofsoc]'); if (b && S.of) { S.of.soc = b.getAttribute('data-ofsoc'); r44OfPatch(); var again = document.querySelector('#ofHits [aria-checked="true"]'); if (again) again.focus(); return; }
    var ob = e.target.closest('[data-r44offer]'); if (ob) r44OfferOpen(ob.getAttribute('data-r44offer'));
  });
}

/* ================= T1: interview practice ================= */
/* Questions come from a fixed bank (assets/data/interview-bank.json) and, first, from the client's own prep sheet when it has
   questions. Nothing here says a question comes from an employer. Notes, practiced marks and stories stay on this device. */
var R44_TIMER = 90;
function r44Hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
/* pure: the question list for one job. prep: [{ q }] from the prep sheet; fam: a family key or ''. */
function r44Questions(bank, prep, fam) {
  var out = [], have = [];
  (prep || []).forEach(function (p) { if (p && p.q && !have.some(function (h) { return r44Near(h, p.q); })) { have.push(p.q); out.push({ id: 'p' + r44Hash(p.q), q: p.q, grp: 'prep' }); } });
  if (!bank) return out;
  /* a bank question the prep sheet already asks in nearly the same words is left out, on screen and in print */
  var add = function (x, grp) { if (!have.some(function (h) { return r44Near(h, x.q); })) out.push({ id: x.id, q: x.q, grp: grp }); };
  (bank.general || []).forEach(function (x) { add(x, 'general'); });
  (bank.behavioral || []).forEach(function (x) { add(x, 'behavioral'); });
  var F = fam && bank.families && bank.families[fam]; if (F) F.questions.forEach(function (x) { add(x, 'family'); });
  return out;
}
/* pure: the same question in nearly the same words ("Tell us about yourself" and "Tell me about yourself.") */
function r44Near(a, b) {
  var tok = function (t) { return String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(String).map(function (w) { return w === 'us' ? 'me' : w === 'our' ? 'your' : w === 'we' ? 'you' : w; }); };
  var x = tok(a), y = tok(b); if (!x.length || !y.length) return false; if (x.join(' ') === y.join(' ')) return true;
  var sx = {}, sy = {}, inter = 0, uni = 0; x.forEach(function (w) { sx[w] = 1; }); y.forEach(function (w) { sy[w] = 1; });
  Object.keys(sx).forEach(function (w) { if (sy[w]) inter++; }); uni = Object.keys(sx).length + Object.keys(sy).length - inter;
  return uni > 0 && inter / uni >= 0.8;
}
var R44_GRP = { prep: 'From your prep sheet', general: 'Common questions for this kind of role: general', behavioral: 'Common questions for this kind of role: about your past work', family: 'Common questions for this kind of role' };
function r44PracticeJobs() {
  var d = S.data, out = [], seen = {};
  var over = function (x) { return stageOf(x) >= 4 || /\bhired\b|accepted/i.test(String(x.status || '')); }; /* ended or hired: the search for that job is over */
  (d.apps || []).forEach(function (x) { if (x.jobId && over(x)) seen[x.jobId] = 1; if (over(x) || isOutreach(x) || !(r44Utc(x.interview) || pvHas(x))) return; if (x.jobId) seen[x.jobId] = 1; out.push({ key: 'a:' + x.id, label: [String(x.role || '').trim(), coOr(x)].filter(String).join(' at '), app: x, when: r44Utc(x.interview) ? 'Interview ' + fmtY(x.interview) : 'Prep sheet ready' }); });
  (d.jobs || []).forEach(function (j) { if (seen[j.id] || ansOf(j) !== 'yes' || j.closed) return; var a = jobApp(j); if (a && over(a)) return; out.push({ key: 'j:' + j.id, label: [String(j.title || '').trim(), String(j.company || '').trim()].filter(String).join(' at '), app: a || null, when: 'You said yes' }); });
  return out;
}
function r44Pr() { if (!S.pr) S.pr = { job: '', scr: 'jobs', i: 0, left: R44_TIMER, on: false, edit: null, msg: '' }; return S.pr; }
function r44PrStore() { var st = r44Store(); st.pr = st.pr || {}; ['notes', 'done', 'attach', 'fam'].forEach(function (k) { st.pr[k] = st.pr[k] || {}; }); st.stories = Array.isArray(st.stories) ? st.stories : []; return st; }
function r44PrJob() { var P = r44Pr(); if (P.job === 'g:any') return { key: 'g:any', label: 'Any job', app: null, when: '' }; return r44PracticeJobs().filter(function (j) { return j.key === P.job; })[0] || null; }
function r44PrQs(J) { var st = r44PrStore(); return r44Questions(R44.bank, J && J.app ? pvQs(J.app) : [], st.pr.fam[J.key] || ''); }
function r44PrOf(map, J) { return map[J.key] || (map[J.key] = {}); }
function r44Story(id) { return r44PrStore().stories.filter(function (s) { return s.id === id; })[0] || null; }
function r44Clock(n) { return Math.floor(n / 60) + ':' + ('0' + (n % 60)).slice(-2); }
/* The practice timer has one owner: R44_TICK. It runs only while a signed-in client has a practice question on screen. The tick
   checks that itself and clears the interval if not, and it is also stopped on sign-out, on leaving the question, on a view
   change and on pagehide. "Time." shows once, when the count reaches zero. */
var R44_TICK = null;
function r44TimerLive() { return r44On() && S.view === 'practice' && !S.flow && !S.deck && !!S.pr && S.pr.scr === 'q' && !!S.pr.on; }
function r44TimerStop() { if (R44_TICK != null) { clearInterval(R44_TICK); R44_TICK = null; } if (S.pr) S.pr.on = false; }
function r44TimerStart() {
  r44TimerStop(); var P = S.pr; if (!r44On() || !P || P.scr !== 'q') return;
  if (P.left <= 0) P.left = R44_TIMER; P.on = true;
  R44_TICK = setInterval(function () {
    if (!r44TimerLive()) { r44TimerStop(); return; }
    var Q = S.pr; Q.left = Math.max(0, Q.left - 1);
    var el = document.getElementById('prT'); if (el) el.textContent = r44Clock(Q.left);
    if (Q.left <= 0) { r44TimerStop(); toast('Time.'); S.focusTo = '[data-prtimer="go"]'; render(); }
  }, 1000);
}
function r44DevNote() { return '<p class="psub p44-dev" data-r44dev>' + R44_DEVICE + ' Signing out removes it.</p>'; }

function r44PrJobsScr() {
  var jobs = r44PracticeJobs(), st = r44PrStore();
  var row = function (j) { var qs = r44PrQs(j), dn = Object.keys(st.pr.done[j.key] || {}).filter(function (id) { return qs.some(function (q) { return q.id === id; }); }).length; return '<li><button type="button" class="p44-row" data-prjob="' + esc(j.key) + '"><span><b>' + esc(j.label) + '</b><span>' + esc([j.when, R44.bank ? dn + ' of ' + qs.length + ' practiced' : ''].filter(String).join(' · ')) + '</span></span>' + IC.chev + '</button></li>'; };
  return (R44.err.bank ? r44Wait('bank') : '') + (jobs.length ? '<h2 class="sec-h">Your jobs</h2><ul class="p44-rows">' + jobs.map(row).join('') + '</ul>' : '<div class="card empty"><p class="psub" style="margin:0">A job shows up here when you say yes to it, add an interview date, or get a prep sheet.</p></div>') +
    '<h2 class="sec-h">Any time</h2><ul class="p44-rows">' + row({ key: 'g:any', label: 'Practice the common questions', app: null, when: 'Not tied to one job' }) +
    '<li><button type="button" class="p44-row" data-prscr="stories"><span><b>Your stories</b><span>' + (st.stories.length ? st.stories.length + (st.stories.length === 1 ? ' story saved' : ' stories saved') : 'Save a story once, use it for many questions') + '</span></span>' + IC.chev + '</button></li></ul>' + r44DevNote();
}
function r44PrListScr(J) {
  var st = r44PrStore(), qs = r44PrQs(J), done = r44PrOf(st.pr.done, J), notes = r44PrOf(st.pr.notes, J), att = r44PrOf(st.pr.attach, J), fam = st.pr.fam[J.key] || '', B = R44.bank, last = '';
  var list = qs.map(function (q, i) { var hd = q.grp !== last ? (last ? '</ul>' : '') + '<h2 class="sec-h" data-prgrp="' + q.grp + '">' + esc(q.grp === 'family' ? R44_GRP.family + ': ' + B.families[fam].name : R44_GRP[q.grp]) + '</h2><ul class="p44-rows">' : ''; last = q.grp;
    return hd + '<li><button type="button" class="p44-row" data-prq="' + i + '"><span><b>' + esc(q.q) + '</b>' + (done[q.id] || notes[q.id] || att[q.id] ? '<span>' + [done[q.id] ? 'Practiced' : '', notes[q.id] ? 'Notes' : '', att[q.id] && r44Story(att[q.id]) ? 'Story: ' + r44Story(att[q.id]).name : ''].filter(String).map(esc).join(' · ') + '</span>' : '') + '</span>' + (done[q.id] ? IC.checkc : IC.chev) + '</button></li>'; }).join('') + (qs.length ? '</ul>' : '');
  var pr = '<section class="p44-print" aria-hidden="true"><h1>Questions and my notes</h1><p>' + esc(J.label) + (J.when ? ' · ' + esc(J.when) : '') + '</p>' + qs.map(function (q, i) { var s = att[q.id] && r44Story(att[q.id]); return '<div class="pq"><h3>' + (i + 1) + '. ' + esc(q.q) + '</h3><p class="pg">' + esc(q.grp === 'prep' ? R44_GRP.prep : R44_GRP.family) + '</p>' + (notes[q.id] ? '<p class="pn">' + esc(notes[q.id]) + '</p>' : '<p class="pn blank">&nbsp;</p>') + (s ? '<p class="ps"><b>Story: ' + esc(s.name) + '</b><br>Situation: ' + esc(s.s) + '<br>Task: ' + esc(s.t) + '<br>Action: ' + esc(s.a) + '<br>Result: ' + esc(s.r) + '</p>' : '') + '</div>'; }).join('') + '<p class="pf">Common questions are from the Steady Path Careers question bank. They are not from the employer.</p></section>';
  return '<div class="card p44-card"><p><b>' + esc(J.label) + '</b>' + (J.when ? '<br><span class="psub">' + esc(J.when) + '</span>' : '') + '</p>' +
    (B ? '<label for="prFam">Kind of role (adds five questions)</label><select id="prFam" data-prfam><option value="">General questions only</option>' + Object.keys(B.families).map(function (k) { return '<option value="' + k + '"' + (fam === k ? ' selected' : '') + '>' + esc(B.families[k].name) + '</option>'; }).join('') + '</select>' : '') +
    '<p class="psub">Common questions are ones many interviewers ask for this kind of role. They are not from this employer.</p>' +
    '<div class="p44-acts"><button type="button" class="btn gold" data-prq="0"' + (qs.length ? '' : ' disabled') + '>Start practice</button><button type="button" class="btn ghost" data-prprint>Print questions and my notes</button></div>' + r44DevNote() + '</div>' +
    (B ? '' : r44Wait('bank')) + list + pr;
}
function r44PrQScr(J) {
  var P = r44Pr(), st = r44PrStore(), qs = r44PrQs(J); if (!qs.length) return r44Wait('bank');
  if (P.i >= qs.length) P.i = qs.length - 1; if (P.i < 0) P.i = 0;
  var q = qs[P.i], done = r44PrOf(st.pr.done, J), notes = r44PrOf(st.pr.notes, J), att = r44PrOf(st.pr.attach, J), story = att[q.id] ? r44Story(att[q.id]) : null, off = !!st.pr.timerOff;
  return '<section class="card p44-card p44-q" data-prqid="' + esc(q.id) + '" aria-labelledby="prQH"><p class="p44-qk"><span>Question ' + (P.i + 1) + ' of ' + qs.length + '</span><span>' + esc(q.grp === 'prep' ? R44_GRP.prep : R44_GRP.family) + '</span></p>' +
    '<h2 id="prQH" tabindex="-1">' + esc(q.q) + '</h2>' + (q.grp === 'behavioral' ? '<p class="psub">One way to shape the answer: the situation, your task, what you did, and the result.</p>' : '') +
    '<div class="p44-timer">' + (off ? '<span class="psub">Timer is off.</span><button type="button" class="linkbtn" data-prtimer="toggle">Turn the timer on</button>' :
      '<span class="p44-clock" id="prT" role="timer" aria-live="off">' + r44Clock(P.left) + '</span><button type="button" class="btn ghost sm" data-prtimer="go">' + (P.on ? 'Pause' : P.left < R44_TIMER && P.left > 0 ? 'Resume' : 'Start timer') + '</button><button type="button" class="btn ghost sm" data-prtimer="reset">Reset</button><button type="button" class="linkbtn" data-prtimer="toggle">Turn the timer off</button>') + '</div>' +
    '<label for="prNote">Your answer outline</label><textarea id="prNote" rows="6" maxlength="2000" data-prnote="' + esc(q.id) + '">' + esc(notes[q.id] || '') + '</textarea>' +
    '<label for="prStory">Attach a story</label><select id="prStory" data-prstory="' + esc(q.id) + '"><option value="">No story</option>' + st.stories.map(function (s) { return '<option value="' + esc(s.id) + '"' + (att[q.id] === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' +
    (story ? '<dl class="p44-story"><div><dt>Situation</dt><dd>' + esc(story.s) + '</dd></div><div><dt>Task</dt><dd>' + esc(story.t) + '</dd></div><div><dt>Action</dt><dd>' + esc(story.a) + '</dd></div><div><dt>Result</dt><dd>' + esc(story.r) + '</dd></div></dl>' : '') +
    '<p style="margin:0"><button type="button" class="linkbtn" data-prscr="stories">' + (st.stories.length ? 'Open your stories' : 'Write your first story') + '</button></p>' +
    '<label class="p44-chk"><input type="checkbox" data-prdone="' + esc(q.id) + '"' + (done[q.id] ? ' checked' : '') + '>Mark as practiced</label>' +
    '<div class="p44-acts"><button type="button" class="btn ghost" data-prq="' + (P.i - 1) + '"' + (P.i === 0 ? ' disabled' : '') + '>Previous</button><button type="button" class="btn" data-prq="' + (P.i + 1) + '"' + (P.i >= qs.length - 1 ? ' disabled' : '') + '>Next</button><button type="button" class="btn ghost" data-prback="list">All questions</button></div>' + r44DevNote() + '</section>';
}
function r44PrStoriesScr() {
  var P = r44Pr(), st = r44PrStore(), E = P.edit, cur = E && E !== 'new' ? r44Story(E) : null, v = P.draft || cur || { name: '', s: '', t: '', a: '', r: '' };
  var ta = function (id, label, k, hint) { return '<label for="' + id + '">' + label + '</label><textarea id="' + id + '" rows="3" maxlength="1200" data-prsf="' + k + '" placeholder="' + hint + '">' + esc(v[k] || '') + '</textarea>'; };
  if (E) return '<form class="card p44-card" id="prStoryForm" onsubmit="return false"><h2 class="pf-h" id="prStH" tabindex="-1">' + (cur ? 'Edit this story' : 'A new story') + '</h2><label for="prSName">Name it so you can find it</label><input id="prSName" type="text" maxlength="80" data-prsf="name" value="' + esc(v.name || '') + '">' +
    ta('prSs', 'Situation', 's', 'Where you were and what was going on') + ta('prSt', 'Task', 't', 'What you had to get done') + ta('prSa', 'Action', 'a', 'What you did') + ta('prSr', 'Result', 'r', 'What changed because of it') +
    (P.msg ? '<p class="err" role="alert" id="prSErr">' + esc(P.msg) + '</p>' : '') + '<div class="p44-acts"><button type="button" class="btn" data-prssave>Save the story</button><button type="button" class="btn ghost" data-prsedit="">Cancel</button></div>' + r44DevNote() + '</form>';
  return '<div class="card p44-card"><p>A story is one real thing you did, told in four parts. Save it once and attach it to any question, for any job.</p><div class="p44-acts"><button type="button" class="btn" data-prsedit="new">Write a story</button></div>' + r44DevNote() + '</div>' +
    (st.stories.length ? '<ul class="p44-stories">' + st.stories.map(function (s) { return '<li class="card p44-card" data-story="' + esc(s.id) + '"><h2 class="pf-h">' + esc(s.name) + '</h2><dl class="p44-story"><div><dt>Situation</dt><dd>' + esc(s.s) + '</dd></div><div><dt>Task</dt><dd>' + esc(s.t) + '</dd></div><div><dt>Action</dt><dd>' + esc(s.a) + '</dd></div><div><dt>Result</dt><dd>' + esc(s.r) + '</dd></div></dl><div class="p44-acts"><button type="button" class="btn ghost" data-prsedit="' + esc(s.id) + '">Edit<span class="sr"> ' + esc(s.name) + '</span></button><button type="button" class="btn ghost" data-prsdel="' + esc(s.id) + '">Delete<span class="sr"> ' + esc(s.name) + '</span></button></div>' +
      (P.del === s.id ? '<div class="p44-confirm" role="group" aria-labelledby="prDelQ"><p id="prDelQ" tabindex="-1">Delete this story? It also comes off every question it is attached to.</p><div class="p44-acts"><button type="button" class="btn danger" data-prsdelyes="' + esc(s.id) + '">Delete it</button><button type="button" class="btn ghost" data-prsdelno>Keep it</button></div></div>' : '') + '</li>'; }).join('') + '</ul>' : '<div class="card empty"><p class="psub" style="margin:0">No stories yet.</p></div>');
}
/* Each practice screen (a job's questions, a question, the stories) has its own history entry, so Back from a question returns
   to the question list and Back from the list returns to the jobs. Previous and Next stay on the question's entry. */
function r44PrGo(scr, job) {
  var P = r44Pr(); r44TimerStop(); if (job != null) P.job = job; if (scr === 'stories') P.from = P.scr; P.scr = scr; P.edit = null; P.draft = null; P.msg = ''; P.del = null;
  try { history.pushState({ sp: 1, depth: S.hist + 1, flow: null, view: 'practice', pr: { scr: scr, job: P.job, from: P.from || '', i: P.i } }, '', location.href); S.hist++; } catch (e) {}
}
function r44PrBack() { var st = null; try { st = history.state; } catch (e) {} if (st && st.sp && st.pr && S.hist > 0) { history.back(); return true; } return false; }
function vPractice() {
  var P = r44Pr(), J = r44PrJob(); r44Need('bank', R44_URL.bank);
  if (P.scr !== 'stories' && P.scr !== 'jobs' && !J) { P.scr = 'jobs'; P.job = ''; }
  if (P.scr !== 'q') r44TimerStop();
  var body = P.scr === 'stories' ? r44PrStoriesScr() : P.scr === 'q' ? r44PrQScr(J) : P.scr === 'list' ? r44PrListScr(J) : r44PrJobsScr();
  var back = P.scr === 'jobs' ? '' : '<div class="fl-top"><button type="button" class="fl-back" data-prback="' + (P.scr === 'q' ? 'list' : P.scr === 'stories' && J ? (P.from === 'q' ? 'q' : 'list') : 'jobs') + '">' + IC.chev + (P.scr === 'q' ? 'All questions' : P.scr === 'stories' && J ? 'Back to practice' : 'All practice') + '</button></div>';
  var title = P.scr === 'stories' ? 'Your stories' : J && P.scr !== 'jobs' ? 'Practice: ' + esc(J.label) : 'Interview practice';
  return shell('practice', title, P.scr === 'jobs' ? 'Common questions, a timer and your own notes. No recording.' : '') + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 p44-pr">' + (P.scr === 'jobs' ? ivSubNav('practice') : back) + r44Sample() + body + (P.scr === 'jobs' ? r42Foot() : '') + '</main>' + tabbar('practice');
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !r44On() || S.view !== 'practice') return;
    var qid = t.getAttribute('data-prnote'), J = qid ? r44PrJob() : null;
    if (qid && J) { var n = r44PrOf(r44PrStore().pr.notes, J); if (t.value.trim()) n[qid] = t.value.slice(0, 2000); else delete n[qid]; r44Save(); return; } /* written on every keystroke: a reload loses nothing */
    var sf = t.getAttribute('data-prsf'); if (sf) { var P = r44Pr(); P.draft = P.draft || Object.assign({ name: '', s: '', t: '', a: '', r: '' }, (P.edit && P.edit !== 'new' && r44Story(P.edit)) || {}); P.draft[sf] = t.value; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !r44On() || S.view !== 'practice') return; var J = r44PrJob(), st = r44PrStore();
    if (t.hasAttribute('data-prfam') && J) { if (t.value) st.pr.fam[J.key] = t.value; else delete st.pr.fam[J.key]; r44Save(); S.focusTo = '#prFam'; render(); return; }
    var sid = t.getAttribute('data-prstory'); if (sid && J) { var a = r44PrOf(st.pr.attach, J); if (t.value) a[sid] = t.value; else delete a[sid]; r44Save(); S.focusTo = '#prStory'; render(); return; }
    var did = t.getAttribute('data-prdone'); if (did && J) { var d = r44PrOf(st.pr.done, J); if (t.checked) d[did] = todayISO(); else delete d[did]; r44Save(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !r44On() || S.view !== 'practice') return; var P = r44Pr(), st = r44PrStore(), b;
    if ((b = e.target.closest('[data-prjob]'))) { P.i = 0; r44PrGo('list', b.getAttribute('data-prjob')); S.focusTo = '.ptitle h1'; render(); window.scrollTo(0, 0); return; }
    if ((b = e.target.closest('[data-prback]'))) { if (!r44PrBack()) { P.scr = b.getAttribute('data-prback'); P.edit = null; P.draft = null; P.del = null; S.focusTo = P.scr === 'q' ? '#prQH' : '.ptitle h1'; render(); window.scrollTo(0, 0); } return; }
    if ((b = e.target.closest('[data-prscr]'))) { r44PrGo(b.getAttribute('data-prscr')); S.focusTo = '.ptitle h1'; render(); window.scrollTo(0, 0); return; }
    if ((b = e.target.closest('[data-prq]'))) { if (b.disabled) return; r44TimerStop(); var ni = Math.max(0, +b.getAttribute('data-prq') || 0);
      if (P.scr === 'q') { P.i = ni; P.left = R44_TIMER; try { var hs = history.state; if (hs && hs.sp && hs.pr) history.replaceState(Object.assign({}, hs, { pr: Object.assign({}, hs.pr, { i: ni }) }), '', location.href); } catch (x) {} } /* next and previous stay on the question's own entry */
      else { P.i = ni; P.left = R44_TIMER; r44PrGo('q'); }
      S.focusTo = '#prQH'; render(); window.scrollTo(0, 0); return; }
    if ((b = e.target.closest('[data-prtimer]'))) { var k = b.getAttribute('data-prtimer');
      if (k === 'toggle') { r44TimerStop(); st.pr.timerOff = !st.pr.timerOff; P.left = R44_TIMER; r44Save(); S.focusTo = '[data-prtimer="toggle"]'; render(); return; }
      if (k === 'reset') { r44TimerStop(); P.left = R44_TIMER; S.focusTo = '[data-prtimer="go"]'; render(); return; }
      if (P.on) r44TimerStop(); else r44TimerStart();
      S.focusTo = '[data-prtimer="go"]'; render(); return; }
    if (e.target.closest('[data-prprint]')) { r44Save(); try { window.print(); } catch (x) {} return; }
    if ((b = e.target.closest('[data-prsedit]'))) { P.edit = b.getAttribute('data-prsedit') || null; P.draft = null; P.msg = ''; S.focusTo = P.edit ? '#prSName' : '.ptitle h1'; render(); return; }
    if ((b = e.target.closest('[data-prsdel]'))) { P.del = b.getAttribute('data-prsdel'); S.focusTo = '#prDelQ'; render(); return; }
    if (e.target.closest('[data-prsdelno]')) { var was = P.del; P.del = null; S.focusTo = '[data-prsdel="' + cssq(was) + '"]'; render(); return; }
    if ((b = e.target.closest('[data-prsdelyes]'))) { var id = b.getAttribute('data-prsdelyes'); P.del = null; st.stories = st.stories.filter(function (s) { return s.id !== id; }); Object.keys(st.pr.attach).forEach(function (jk) { Object.keys(st.pr.attach[jk]).forEach(function (q) { if (st.pr.attach[jk][q] === id) delete st.pr.attach[jk][q]; }); }); r44Save(); toast('Story deleted.'); S.focusTo = '.ptitle h1'; render(); return; }
    if (e.target.closest('[data-prssave]')) {
      var v = P.draft || (P.edit !== 'new' && r44Story(P.edit)) || {}, name = String(v.name || '').trim();
      if (!name) { P.msg = 'Give the story a name.'; S.focusTo = '#prSName'; render(); return; }
      var rec = { id: P.edit && P.edit !== 'new' ? P.edit : 's' + Date.now().toString(36), name: name.slice(0, 80), s: String(v.s || '').trim(), t: String(v.t || '').trim(), a: String(v.a || '').trim(), r: String(v.r || '').trim() };
      var at = st.stories.map(function (s) { return s.id; }).indexOf(rec.id); if (at >= 0) st.stories[at] = rec; else st.stories.push(rec);
      var okS = r44Save(); P.edit = null; P.draft = null; P.msg = ''; toast(okS ? 'Story saved on this device.' : 'This device would not save it.'); S.focusTo = '.ptitle h1'; render();
    }
  });
  /* leaving practice stops the timer and writes anything typed: go() in portal/index.html */
}
/* Back, Forward and a reload hand over the entry they landed on (navRestore in the r42 part). Returns true when that changed
   what the practice screen shows. */
function r44PrRestore(st) {
  if (!r44On()) return false;
  var P = r44Pr(), pr = (st && st.pr) || { scr: 'jobs', job: '' }, before = [P.scr, P.job, P.i].join('|');
  r44TimerStop(); P.scr = /^(jobs|list|q|stories)$/.test(pr.scr || '') ? pr.scr : 'jobs'; P.job = pr.job || ''; P.from = pr.from || ''; if (pr.i != null) P.i = pr.i | 0; P.left = R44_TIMER; P.edit = null; P.draft = null; P.del = null; P.msg = '';
  return before !== [P.scr, P.job, P.i].join('|');
}

/* ================================ PART: r45, training and benefits finder (was assets/portal-r45.js) ================================ */
/* r45: training and benefits finder (inside More, and listed in Home's tools). Public programs run by other organizations.
   The list is a data file (assets/data/training-finder.json) that holds only entries confirmed on their official pages.
   The tool shows the program's own words in quotation marks and a link to its official page; it never restates amounts,
   limits, deadlines or who qualifies, and it infers nothing about the client: no entry is preselected or highlighted from
   client data. Nothing is sent anywhere. A star per entry is kept on this device in the r44 store (sp_r44_<client id>). */

/* ---- pure ---- */
/* f: { area, kind, field, saved (bool) }, stars: { id: 1 }. A field filter keeps entries for that field and entries for all fields. */
function r45Filter(entries, f, stars) {
  f = f || {}; stars = stars || {};
  return (entries || []).filter(function (e) {
    if (f.area && e.area !== f.area) return false;
    if (f.kind && e.kind !== f.kind) return false;
    if (f.field && e.fields.indexOf(f.field) < 0 && e.fields.indexOf('all') < 0) return false;
    if (f.saved && !stars[e.id]) return false;
    return true;
  });
}
/* whole days between two ISO dates; the list is stale when it was reviewed more than 45 days before today (New York date) */
function r45Stale(reviewed, nyToday) { var a = Date.parse(String(reviewed).slice(0, 10) + 'T12:00:00Z'), b = Date.parse(String(nyToday).slice(0, 10) + 'T12:00:00Z'); return isFinite(a) && isFinite(b) ? Math.round((b - a) / 864e5) > 45 : true; }
function r45Date(iso) { var m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); if (!m) return ''; return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1]; }

/* ---- view ---- */
var R45_NOTE = 'These are public programs run by other organizations. We do not run them and cannot say whether you qualify. Confirm details with the program.';
var R45_UI = 'Rules and system status change. Confirm with the agency before you act.';
/* the address is the department's unemployment page as listed in r41/training_finder_sources.md */
var R45_GAP = 'This list is not complete. For unemployment in New York, go to the <a href="https://dol.ny.gov/unemployment" target="_blank" rel="noopener noreferrer">New York State Department of Labor\'s website<span class="sr"> (opens in a new tab)</span></a>.';
/* the list's address is R44_URL.training (r44 part) */
/* the filters always start on All areas, All kinds, All fields: nothing in the client's data sets a default */
function r45F() { if (!S.tf) S.tf = { area: '', kind: '', field: '', saved: false }; return S.tf; }
function r45Stars() { var st = r44Store(); st.tf = st.tf || {}; st.tf.saved = st.tf.saved || {}; return st.tf.saved; }
var R48_STARNOTE = 'Your saved stars: ' + R44_DEVICE.charAt(0).toLowerCase() + R44_DEVICE.slice(1) + ' Signing out removes them.'; /* the standing note's own words */
function r45Card(e, D, stars) {
  var on = !!stars[e.id], area = (D.areas.filter(function (a) { return a[0] === e.area; })[0] || [e.area, e.area])[1], kind = (D.kinds.filter(function (k) { return k[0] === e.kind; })[0] || [e.kind, e.kind])[1], u = safeUrl(e.url);
  return '<li class="card t45-card" data-tf="' + esc(e.id) + '">' + (on && S.tfSaidId === e.id && S.tfSaidUp ? '<p class="t45-starline up" data-tfstarline>' + R48_STARNOTE + '</p>' : '') /* r49: when there is no room under the star's row (the tab bar or the screen's edge), the same line sits just above it */ + '<div class="t45-top"><h3>' + esc(e.name) + '</h3><button type="button" class="t45-star" data-tfstar="' + esc(e.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Saved. Remove ' : 'Save ') + esc(e.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg></button></div>' +
    (on && S.tfSaidId === e.id && !S.tfSaidUp ? '<p class="t45-starline" data-tfstarline>' + R48_STARNOTE + '</p>' : '') + /* r48: shown in the card whose star was the first of the session */
    '<p class="t45-by">Run by ' + esc(e.runBy) + '</p><p class="t45-tags"><span class="pill">' + esc(area) + '</span><span class="pill">' + esc(kind) + '</span></p>' +
    (e.quote ? '<blockquote class="t45-q"><p>' + esc(e.quote) + '</p><footer>from the program\'s page</footer></blockquote>' : '') +
    (u ? '<p class="t45-go"><a class="btn ghost" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + (e.unemployment ? 'Open the official page' : 'Open the program\'s page') + '<span class="sr"> for ' + esc(e.name) + ' (opens in a new tab)</span></a></p>' : '') +
    '<p class="t45-chk">Checked ' + esc(r45Date(e.checkedOn)) + '</p></li>';
}
function r45Out() {
  var D = R44.training, f = r45F(), stars = r45Stars(), list = r45Filter(D.entries, f, stars), h = '';
  if (!list.length) return '<div class="card empty" data-tfempty><p class="psub" style="margin:0">' + (f.saved && !Object.keys(stars).length ? 'You have not saved any programs yet. Tap the star on a program to keep it here.' : 'No programs on this list match these choices. Try another area or kind, or show all.') + '</p><p style="margin:10px 0 0"><button type="button" class="btn ghost" data-tfclear>Show all programs</button></p></div>';
  D.kinds.forEach(function (k) {
    var g = list.filter(function (e) { return e.kind === k[0]; }); if (!g.length) return;
    h += '<section class="t45-grp" data-tfgrp="' + k[0] + '" aria-labelledby="tfg-' + k[0] + '"><h2 class="sec-h" id="tfg-' + k[0] + '">' + esc(k[1]) + ' <span class="t45-n">' + g.length + '</span></h2>' + (k[0] === 'benefits' ? '<p class="t45-warn" data-tfui>' + R45_UI + '</p><p class="t45-gap" data-tfgap>' + R45_GAP + '</p>' : '') + '<ul class="t45-list">' + g.map(function (e) { return r45Card(e, D, stars); }).join('') + '</ul></section>';
  });
  return '<p class="t45-count" role="status" data-tfcount>' + list.length + (list.length === 1 ? ' program' : ' programs') + ' of ' + D.entries.length + '</p>' + h;
}
var R48_FIC = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M7 12h10M10 17h4"/></svg>';
function r48N(f) { return (f.area ? 1 : 0) + (f.kind ? 1 : 0) + (f.field ? 1 : 0); }
/* the count sits in a slot of fixed width, so the button is the same size with nothing or three chosen */
function r48Badge(f) { var n = r48N(f); return '<span class="t45-fn' + (n ? '' : ' none') + '" data-tfn aria-hidden="true">' + (n || '') + '</span><span class="sr" data-tfnsr>' + (n ? ', ' + n + ' chosen' : ', none chosen') + '</span>'; }
function r48Chips(D, f) {
  var name = function (list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; };
  var rows = [['area', 'Area', f.area ? name(D.areas, f.area) : ''], ['kind', 'Kind', f.kind ? name(D.kinds, f.kind) : ''], ['field', 'Career field', f.field ? (D.fieldNames[f.field] || f.field) : '']].filter(function (r) { return r[2]; });
  if (!rows.length) return '<p class="t45-nochip">No filters chosen.</p>';
  return rows.map(function (r) { return '<button type="button" class="t45-chip" data-tfdrop="' + r[0] + '" aria-label="Remove ' + esc(r[2]) + ' (' + r[1] + ' filter)"><span>' + esc(r[2]) + '</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'; }).join('');
}
function vTraining() {
  r44Need('training', R44_URL.training);
  var D = R44.training, f = D ? r45F() : null, body;
  if (!D) body = r44Wait('training');
  else {
    var opt = function (list, cur, all) { return '<option value="">' + all + '</option>' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    var fields = Object.keys(D.fieldNames).map(function (k) { return [k, D.fieldNames[k]]; }), nSaved = Object.keys(r45Stars()).length;
    /* r48: on phones the three selects sit in a panel behind one Filters button; the chosen values show as chips that remove
       themselves when tapped. From 780 wide the button and chips are not shown and the selects are always in view. Looks only:
       the same three selects with the same ids, the same checkbox, the same filter state. */
    var open = !!S.tfOpen;
    body = '<form class="card p44-card t45-filters' + (open ? ' is-open' : '') + '" onsubmit="return false" aria-label="Narrow the list">' +
      '<button type="button" class="t45-fbtn" data-tfopen aria-expanded="' + open + '" aria-controls="tfPanel">' + R48_FIC + '<span>Filters</span>' + r48Badge(f) + '</button>' +
      '<label class="p44-chk"><input type="checkbox" data-tfsaved aria-label="Saved only: only the programs I saved"' + (f.saved ? ' checked' : '') + '><span class="t45-lfull">Only the programs I saved</span><span class="t45-lshort" aria-hidden="true">Saved only</span></label>' + /* r48 review: on phones the chip reads "Saved only" on one line; the checkbox keeps the full name */
      '<p class="psub p44-dev" data-r44dev>Your saved stars: ' + R44_DEVICE.charAt(0).toLowerCase() + R44_DEVICE.slice(1) + ' Signing out removes them.</p>' + /* directly under the Filters row on phones; under the selects from 780 wide */
      '<div class="t45-chips' + (r48N(f) ? ' has' : '') + '" data-tfchips role="group" aria-label="Chosen filters">' + r48Chips(D, f) + '</div>' +
      '<div class="t45-three" id="tfPanel"><div' + (f.area ? ' data-set' : '') + '><label for="tfArea">Area</label><select id="tfArea" data-tff="area">' + opt(D.areas, f.area, 'All areas') + '</select></div>' +
      '<div' + (f.kind ? ' data-set' : '') + '><label for="tfKind">Kind</label><select id="tfKind" data-tff="kind">' + opt(D.kinds, f.kind, 'All kinds') + '</select></div>' +
      '<div' + (f.field ? ' data-set' : '') + '><label for="tfField">Career field</label><select id="tfField" data-tff="field">' + opt(fields, f.field, 'All fields') + '</select></div>' +
      '<button type="button" class="btn ghost t45-done" data-tfclose>Done</button></div></form>' +
      (r45Stale(D.reviewed, r44NyToday()) ? '<p class="warn t45-stale" role="status" data-tfstale>This list may be out of date.</p>' : '') +
      '<div id="tfOut">' + r45Out() + '</div>' +
      '<p class="t45-said" role="status" aria-live="polite" data-tfsaid></p>'; /* r48: says the saved-stars note, in view and to screen readers, when the first star of a session is set */
  }
  return shell('training', 'Training and benefits', D ? 'List last checked ' + esc(r45Date(D.reviewed)) + '.' : '') + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 t45">' + r44Sample().replace('<span class="pill">Sample data</span> ', '') +
    '<p class="t45-note" data-tfnote>' + R45_NOTE + '</p>' + body + r42Foot() + '</main>' + tabbar('training');
}
if (typeof document !== 'undefined') {
  var r45Patch = function () { var o = document.getElementById('tfOut'); if (o) o.innerHTML = r45Out(); r48Sync(); };
  /* r48: the chips and the count follow the filter state */
  var r48Sync = function () {
    var c = document.querySelector('[data-tfchips]'), f = r45F(), D = R44.training; if (!c || !D) return;
    c.innerHTML = r48Chips(D, f); c.classList.toggle('has', r48N(f) > 0);
    var n = document.querySelector('[data-tfn]'), sr = document.querySelector('[data-tfnsr]'), k = r48N(f);
    if (n) { n.textContent = k || ''; n.classList.toggle('none', !k); } if (sr) sr.textContent = k ? ', ' + k + ' chosen' : ', none chosen';
    r48Cut(c);
  };
  /* The first star of a session says the saved-stars note. It is a line inside the starred card, in normal flow: the card
     grows and nothing floats over anything. It goes directly under the star's row when it fits there above the tab bar (or
     the screen's edge); when it would land under the tab bar it goes directly above the star's row instead. Either way it is
     placed at the moment of the tap and nothing moves later (r49: the page used to scroll the line into view 0.45s after the
     tap, which could move a second tap onto something else). The star itself keeps its place on screen: see the click
     handler. It stays until the client leaves the view. The status region is always in the page, out of sight, and only its
     text changes, so screen readers announce the sentence once. */
  var r49Place = function (id) {
    S.tfSaidUp = false; r45Patch();
    var line = document.querySelector('[data-tfstarline]'); if (!line || line.closest('[data-tf]') !== document.querySelector('[data-tf="' + cssq(id) + '"]')) return;
    var tab = document.querySelector('.tabbar'), tr = tab ? tab.getBoundingClientRect() : null, floor = tr && tr.height > 0 && tr.top < window.innerHeight ? tr.top : window.innerHeight;
    if (line.getBoundingClientRect().bottom > floor - 8) { S.tfSaidUp = true; r45Patch(); }
  };
  var r48Say = function (id) {
    S.tfSaidId = id; r49Place(id);
    var said = document.querySelector('[data-tfsaid]'); if (!said) return;
    said.textContent = R48_STARNOTE;
    clearTimeout(r48Say.t); r48Say.t = setTimeout(function () { var el = document.querySelector('[data-tfsaid]'); if (el) el.textContent = ''; }, 9000);
  };
  /* r49: pressing a star does not give it focus natively (the browser then scrolled a star near the tab bar 5 to 9px into view under the finger); the click handler focuses it without moving the page */
  document.addEventListener('mousedown', function (e) { if (e.button === 0 && e.target.closest && e.target.closest('[data-tfstar]') && S.view === 'training') e.preventDefault(); });
  /* and the portal's rule that lifts a focused control clear of the tab bar (r42 part above) is not applied to that focus: the star was just tapped where it is, so it stays there */
  var r49Keep = null; document.addEventListener('focusin', function (e) { if (r49Keep && e.target === r49Keep) e.stopImmediatePropagation(); }, true);
  /* leaving the view drops the star note: go() in portal/index.html */
  var r48Cut = function (c) { if (!c) return; var max = c.scrollWidth - c.clientWidth; c.classList.toggle('cut-r', max > 1 && c.scrollLeft < max - 1); c.classList.toggle('cut-l', c.scrollLeft > 1); };
  var r48Open = function (on, focus) {
    var form = document.querySelector('.t45-filters'), b = document.querySelector('[data-tfopen]'); if (!form || !b) return;
    S.tfOpen = !!on; form.classList.toggle('is-open', !!on); b.setAttribute('aria-expanded', on ? 'true' : 'false'); if (focus) b.focus();
  };
  document.addEventListener('scroll', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-tfchips')) r48Cut(e.target); }, true);
  /* a chip that takes focus is brought whole into the strip, clear of the faded edges */
  document.addEventListener('focusin', function (e) { var chip = e.target && e.target.closest ? e.target.closest('.t45-chip') : null, c = chip && chip.parentNode; if (!chip || !c) return; var tight = chip.offsetWidth + 80 > c.clientWidth, pad = tight ? Math.max(0, Math.floor((c.clientWidth - chip.offsetWidth) / 2)) : 40, l = chip.offsetLeft - c.offsetLeft, r = l + chip.offsetWidth, max = c.scrollWidth - c.clientWidth; c.classList.toggle('tight', tight); /* a chip nearly as wide as the strip is centred and the edge fade is lifted while it has focus */ if (l - pad < c.scrollLeft) c.scrollLeft = Math.max(0, l - pad); else if (r + pad > c.scrollLeft + c.clientWidth) c.scrollLeft = Math.min(max, r + pad - c.clientWidth); r48Cut(c); });
  document.addEventListener('focusout', function (e) { var chip = e.target && e.target.closest ? e.target.closest('.t45-chip') : null; if (chip && chip.parentNode) chip.parentNode.classList.remove('tight'); });
  /* the faded edge is set whenever the view is drawn, not only when a filter changes */
  if (window.MutationObserver) { var r48Root = document.getElementById('app') || document.body; new MutationObserver(function () { var c = document.querySelector('[data-tfchips]'); if (c) r48Cut(c); }).observe(r48Root, { childList: true, subtree: true }); }
  window.addEventListener('resize', function () { r48Cut(document.querySelector('[data-tfchips]')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.tfOpen && S.view === 'training' && e.target && e.target.closest && e.target.closest('.t45-filters')) { e.preventDefault(); r48Open(false, true); } });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !r44On() || S.view !== 'training' || !R44.training) return;
    var k = t.getAttribute('data-tff'); if (k) { r45F()[k] = t.value; if (t.parentNode) { if (t.value) t.parentNode.setAttribute('data-set', ''); else t.parentNode.removeAttribute('data-set'); } /* r47: layout only; a filter with a value takes its own line so the value is never cut */ r45Patch(); return; }
    if (t.hasAttribute('data-tfsaved')) { r45F().saved = !!t.checked; r45Patch(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !r44On() || S.view !== 'training' || !R44.training) return;
    var b = e.target.closest('[data-tfstar]');
    if (b) { var id = b.getAttribute('data-tfstar'), s = r45Stars(), y0 = b.getBoundingClientRect().top; if (s[id]) delete s[id]; else s[id] = todayISO(); var saved = r44Save(); r45Patch(); if (s[id] && saved && !S.tfSaid) { S.tfSaid = true; r48Say(id); } else if (s[id] && S.tfSaidId === id) r49Place(id); var again = document.querySelector('[data-tfstar="' + cssq(id) + '"]'); if (again) { var dy = again.getBoundingClientRect().top - y0; if (Math.abs(dy) >= 1) { try { window.scrollTo({ top: window.scrollY + dy, behavior: 'instant' }); } catch (e3) { window.scrollBy(0, dy); } } /* r49: a line added or removed above the star is matched in the same moment, before anything is drawn, so the star stays under the finger */ r49Keep = again; try { again.focus({ preventScroll: true }); } catch (e2) { again.focus(); } r49Keep = null; } /* r48 review: focus goes back to the star without moving the page, so the star stays under the finger for a second tap */ if (!saved) toast('This device would not save it.'); return; }
    if (e.target.closest('[data-tfopen]')) { r48Open(!S.tfOpen, false); return; }
    if (e.target.closest('[data-tfclose]')) { r48Open(false, true); return; }
    var chip = e.target.closest('[data-tfdrop]');
    if (chip) { var key = chip.getAttribute('data-tfdrop'), sel = document.querySelector('[data-tff="' + key + '"]'); r45F()[key] = ''; if (sel) { sel.value = ''; if (sel.parentNode) sel.parentNode.removeAttribute('data-set'); } r45Patch(); var next = document.querySelector('[data-tfdrop]') || document.querySelector('[data-tfopen]'); if (next) next.focus(); return; }
    if (e.target.closest('[data-tfclear]')) { S.tf = { area: '', kind: '', field: '', saved: false }; S.focusTo = S.tfOpen || (window.matchMedia && window.matchMedia('(min-width: 780px)').matches) ? '#tfArea' : '[data-tfopen]'; /* r48: on a phone with the panel shut the selects are not on screen */ render(); }
  });
  /* More and Home list the tool (r44Tools); signing out forgets the filter choices too (r44Wipe) */
}

/* r49 review fix: the Jobs road keeps every marker word whole while the words fit across the card. After each render and on
   resize, a road wider than its card gets .jm-tight (equal columns, words may wrap inside), so the page never scrolls sideways. */
(function () {
  function fit() {
    var roads = document.querySelectorAll('.jm');
    for (var i = 0; i < roads.length; i++) {
      var r = roads[i];
      if (r.classList.contains('jm-tight')) r.classList.remove('jm-tight');
      var box = r.parentElement, cs = getComputedStyle(box), rr = r.getBoundingClientRect(), br = box.getBoundingClientRect();
      /* the card's padding may hold the road (it did before r49); only past the card's inner border edge is too wide */
      var right = br.right - (parseFloat(cs.borderRightWidth) || 0);
      if (r.scrollWidth > r.clientWidth + 1 || rr.right > right + 0.5 || document.documentElement.scrollWidth > window.innerWidth + 1 && rr.right > window.innerWidth) r.classList.add('jm-tight');
    }
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; fit(); }); }
  function start() {
    var app = document.getElementById('app') || document.body;
    if ('MutationObserver' in window) new MutationObserver(function (ms) {
      for (var k = 0; k < ms.length; k++) { var t = ms[k].target; if (t.nodeType === 1 && (t.querySelector && t.querySelector('.jm') || t.closest && t.closest('.jm'))) { soon(); return; } }
    }).observe(app, { childList: true, subtree: true });
    window.addEventListener('resize', soon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
    soon();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* r52: Sam pops up for a moment after an approval, a sent application or an offer. Decorative only (aria-hidden); the toast still says what happened. */
(function () {
  var CHEER = /^(Approved\.|[^.]*\bapproved\.(\s|$)|Nice work\. It is on your Applied tab\.|An offer!|Moved to Submitted\.|Moved to Interview\.|Moved to Offer\.|Marked as hired\.)/;
  var NOT = /\bnot approved\b|\bcouldn't\b|\bcould not\b|\bfailed\b|\berror\b/i; /* a failure message never cheers */
  function samCheer() {
    var old = document.querySelector('.r52-cheer'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'r52-cheer'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<img src="/img/sam/sam-cheer.svg?v=sp-20261115sam" alt="" width="96" height="141">';
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 2300);
  }
  /* toast() in portal/index.html calls this once it has shown a message (never while an Undo toast holds the spot) */
  window.r52Cheer = function (t) { try { var tt = String(t || ''); if (CHEER.test(tt) && !NOT.test(tt)) samCheer(); } catch (e) {} };
  window.r52SamCheer = samCheer;
})();

/* ================================ PART: v1.47, Your resume card (Search settings) ================================ */
/* A signed-in client uploads or replaces their resume (API v1.47, action resumeUpload). The file is read on this device by the
   intake's own reader (assets/resume-read.js, window.SPResume), which suggests updates (titles held, level, years, licenses) and
   job titles to target. Every suggestion starts unticked and nothing is sent until the client taps Send; only the file and the
   ticked items go. Target titles never change the search: the API turns them into one "Change settings" request, which then
   shows under "Waiting for review". The same limits as the intake: PDF, DOC, DOCX, RTF or TXT, at most 10 MB. No timers. */
var RU_MAX = 10 * 1024 * 1024, RU_TYPES = /\.(pdf|docx|doc|txt|rtf)$/i, RU_READ_MS = 20000;
var RU_LEVELS = ['Entry level', 'Some experience (2 to 5 years)', 'Experienced (5 to 10 years)', 'Senior or lead', 'Manager or director'];
S.ru = null;
/* Pure: the level a resume suggests, from the newest title, then the years. '' when there is nothing to go on. */
function ruLevel(title, years) {
  var t = String(title || ''), y = parseInt(years, 10);
  if (/\b(manager|director|head of|vice president|vp|chief|owner|founder|president|principal)\b/i.test(t)) return RU_LEVELS[4];
  if (/\b(senior|sr\.?|lead|supervisor|team lead)\b/i.test(t)) return RU_LEVELS[3];
  if (!(y >= 0)) return '';
  return y < 2 ? RU_LEVELS[0] : y < 5 ? RU_LEVELS[1] : y < 10 ? RU_LEVELS[2] : RU_LEVELS[3];
}
/* Pure: suggestions from SPResume.parseFull(text), the client's current target roles and their Find Your Fit titles. Each list
   is unique (ignoring case); targets leave out roles already in the search. */
function ruSuggest(full, roles, fitTitles) {
  full = full || {}; var p = full.profile || {}, jobs = Array.isArray(full.jobs) ? full.jobs : [];
  var key = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var uniqI = function (a, max, len) { var out = [], seen = {}; a.forEach(function (x) { x = String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, len); if (x && !seen[key(x)] && out.length < max) { seen[key(x)] = 1; out.push(x); } }); return out; };
  var held = uniqI(jobs.map(function (j) { return j && j.title; }), 5, 80);
  var have = {}; (roles || []).forEach(function (r) { have[key(r)] = 1; });
  var fitYes = (fitTitles || []).filter(function (x) { return x && x.a === 'yes'; }).map(function (x) { return x.t; });
  var targets = uniqI(held.concat(fitYes), 20, 100).filter(function (x) { return !have[key(x)]; }).slice(0, 5);
  var years = /^\d{1,2}$/.test(String(p.years || '')) ? String(p.years) : '';
  return { held: held, level: ruLevel(held[0] || p.title, years), years: years, licenses: uniqI(Array.isArray(p.certs) ? p.certs : [], 6, 160), targets: targets };
}
/* Pure: the request body from the suggestions and the ticks. Only ticked items are in it; nothing ticked sends the file alone. */
function ruBody(sug, tick, file) {
  var pick = function (list, k) { return (list || []).filter(function (x, i) { return !!tick[k + i]; }); };
  var confirm = {}, held = pick(sug.held, 'h'), lic = pick(sug.licenses, 'l');
  if (held.length) confirm.titlesHeld = held;
  if (sug.level && tick.level) confirm.seniority = sug.level;
  if (sug.years && tick.years) confirm.years = sug.years;
  if (lic.length) confirm.licenses = lic;
  var b = { action: 'resumeUpload', t: S.token, resume: file };
  if (Object.keys(confirm).length) b.confirm = confirm;
  var targets = pick(sug.targets, 't'); if (targets.length) b.targets = targets;
  return b;
}
function ruKb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function ruPick(f) {
  if (!f) return;
  if (!RU_TYPES.test(String(f.name || ''))) { S.ru = { err: 'That kind of file will not work here. Please choose a PDF, a Word file (.docx or .doc), or a .rtf or .txt file.' }; S.focusTo = '#ruErr'; render(); return; }
  if (f.size > RU_MAX) { S.ru = { err: 'That file is over 10 MB. Please choose a smaller file.' }; S.focusTo = '#ruErr'; render(); return; }
  var ru = S.ru = { file: f, reading: true, tick: {} }; render();
  var done = false, fin = function (full, read) {
    if (done || S.ru !== ru) return; done = true; clearTimeout(ru.timer); ru.timer = null;
    ru.reading = false; ru.read = !!read;
    ru.sug = read ? ruSuggest(full, prefsOf().roles, S.data && S.data.fit && Array.isArray(S.data.fit.titles) ? S.data.fit.titles : []) : { held: [], level: '', years: '', licenses: [], targets: [] };
    S.focusTo = '#ruH'; render();
  };
  /* a file that takes too long counts as unreadable, as on the intake; the one timer stops when the reading ends */
  ru.timer = setTimeout(function () { fin(null, false); }, RU_READ_MS);
  var R = window.SPResume;
  if (!R) { fin(null, false); return; }
  R.fileText(f).then(function (t) { fin(R.parseFull(t), !!String(t || '').trim()); }).catch(function () { fin(null, false); });
}
function ruToB64(f) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = no; r.readAsDataURL(f); }); }
var RU_ERR = {
  expired: 'Your sign-in has expired. Sign in again, then send your resume.',
  limit: 'You can send up to 3 resumes a day. Please try again tomorrow.',
  paused: 'Uploads are paused for today. Please try again tomorrow, or email your resume to hello@steadypathcareers.com.', /* review L2: the 60 a day cap for everyone */
  'bad type': 'That file does not look like a PDF, Word, RTF or text file. Please check it and try again.',
  'bad file': 'That file does not look like a PDF, Word, RTF or text file. Please check it and try again.',
  'too large': 'That file is over 10 MB. Please choose a smaller file.',
  'unknown action': 'Uploading here is not switched on yet. Please email your resume to hello@steadypathcareers.com.'
};
function ruSend() {
  var ru = S.ru; if (!ru || !ru.file || ru.busy || ru.reading) return;
  ru.busy = true; ru.err = ''; render();
  var f = ru.file;
  ruToB64(f).then(function (data) {
    return post(ruBody(ru.sug || {}, ru.tick, { name: f.name, type: f.type, data: data }));
  }).then(function (r) {
    if (S.ru !== ru) return;
    ru.busy = false;
    if (r && r.ok) {
      var me = r.me && r.me.ok ? r.me : null;
      if (me && S.data) { S.data.requests = me.requests || []; S.data.prefs = me.prefs || S.data.prefs; }
      else if (r.request && S.data) S.data.requests = [{ id: r.request, date: r.date || todayISO(), type: 'Change settings', status: 'New' }].concat(S.data.requests || []);
      if (S.data) S.data.resume = { onFile: true, source: 'upload', date: r.date || todayISO() }; /* v1.48: the Home nudge goes without a reload */
      S.ru = { done: true, date: r.date || todayISO(), request: r.request || '', lost: r.requestSaved === false };
      S.focusTo = '#ruMsg'; render(); return;
    }
    var e = r && r.error; ru.re = e === 'expired';
    ru.err = RU_ERR[e] || 'Sorry, that did not send. Please try again in a minute.';
    S.focusTo = '#ruErr'; render();
  }).catch(function () { if (S.ru !== ru) return; ru.busy = false; ru.err = 'That did not send. Please check your connection and try again.'; S.focusTo = '#ruErr'; render(); });
}
function ruBox(k, label, sub) {
  var on = !!(S.ru && S.ru.tick[k]);
  return '<label class="ru-opt"><input type="checkbox" data-rutick="' + esc(k) + '"' + (on ? ' checked' : '') + '><span>' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></label>';
}
function ruGroup(title, items) { return items.length ? '<fieldset class="ru-g"><legend>' + esc(title) + '</legend>' + items.join('') + '</fieldset>' : ''; }
/* The card on the Search settings screen. */
function ruCard() {
  var ru = S.ru || {}, picker = '<label class="btn ' + (ru.file ? 'ghost' : 'gold') + ' ru-pick"><input type="file" id="ruFile" class="sr" accept=".pdf,.doc,.docx,.rtf,.txt">' + (ru.file ? 'Choose a different file' : 'Upload a new resume') + '</label>';
  var head = '<section class="card ru" aria-labelledby="ruH"><h2 id="ruH" class="pf-h" tabindex="-1">Your resume</h2>';
  var errHtml = ru.err ? '<p class="err" role="alert" id="ruErr" tabindex="-1">' + esc(ru.err) + (ru.re ? reauthBtn() : '') + '</p>' : '';
  if (ru.done) return head + '<div class="pf-msg" role="status" tabindex="-1" id="ruMsg">' + IC.checkc + '<span>Got it. Your new resume is saved' + (ru.request ? ', and the changes you ticked are waiting for review.' : '.') + (ru.lost ? ' Your ticked changes did not reach us, so please send them with Request a change above.' : '') + '</span></div>' +
    '<p class="psub">Your search keeps its current titles until a change is approved. Your earlier resume stays on file.</p><div class="pf-row">' + picker + '</div></section>';
  if (!ru.file) return head + '<p class="psub">Changed jobs, earned a license, or have a better version? Upload it here. We read it on this device and suggest updates; nothing changes until you tick it and send. PDF, Word (.docx or .doc), .rtf or .txt, up to 10 MB.</p>' + errHtml + '<div class="pf-row">' + picker + '</div></section>';
  var fileLine = '<p class="ru-file"><b>' + esc(ru.file.name) + '</b> <span>' + esc(ruKb(ru.file.size)) + '</span></p>';
  if (ru.reading) return head + fileLine + '<p class="psub" role="status">Reading your resume on this device…</p></section>';
  var g = ru.sug || {}, body;
  var groups = ruGroup('Titles you have held', g.held.map(function (x, i) { return ruBox('h' + i, x); })) +
    ruGroup('Your level', g.level ? [ruBox('level', g.level)] : []) +
    ruGroup('Years of experience', g.years ? [ruBox('years', g.years + (g.years === '1' ? ' year' : ' years'))] : []) +
    ruGroup('Licenses and certifications', g.licenses.map(function (x, i) { return ruBox('l' + i, x); })) +
    ruGroup('Job titles to look for', g.targets.map(function (x, i) { return ruBox('t' + i, x, 'Sent as a request. Your search changes only after it is approved.'); }));
  if (!ru.read) body = '<p class="psub">We could not read this file on your device, so there are no suggestions. You can still send it, and we will read it ourselves.</p>';
  else if (!groups) body = '<p class="psub">We read your resume but found nothing to suggest. You can still send it.</p>';
  else body = '<p class="psub">Here is what we found. Tick only what is right; anything you leave unticked is not sent.</p>' + groups;
  var n = Object.keys(ru.tick).filter(function (k) { return ru.tick[k]; }).length;
  return head + fileLine + body + errHtml + '<div class="pf-row"><button class="btn gold" data-rusend' + (ru.busy ? ' disabled' : '') + '>' + (ru.busy ? 'Sending…' : n ? 'Send my resume and ' + n + ' change' + (n === 1 ? '' : 's') : 'Send my resume') + '</button>' +
    '<button class="btn ghost" data-rucancel' + (ru.busy ? ' disabled' : '') + '>Cancel</button></div>' + (ru.busy ? '' : '<div class="pf-row">' + picker + '</div>') + '</section>';
}
/* v1.48: Home asks for a resume only when the API says none is on file (resume.onFile === false) and the client has no job cards
   yet. A missing field (API v1.47),
   null (the API could not tell) or anything else counts as unknown, and Home shows only the quiet link. Both open Search settings
   at the Your resume card. */
function ruOnFile() { var r = S.data && S.data.resume; return r && typeof r === 'object' && (r.onFile === true || r.onFile === false) ? r.onFile : null; }
/* review M1: a client who already has job cards is past the first step, so only the quiet link shows */
function ruHasJobs() { var d = S.data || {}; return (d.jobs || []).length > 0 || (d.closed || []).length > 0; }
function ruNudgeOn() { return ruOnFile() === false && !ruHasJobs(); }
function ruHomeNudge() {
  if (!ruNudgeOn()) return '';
  return '<section class="card ru-nudge" data-runudge aria-labelledby="ruNudgeH"><div><h2 class="pf-h" id="ruNudgeH">Your search starts with your resume</h2>' +
    '<p class="psub">Upload it here and we\'ll get your first matches going. It takes about a minute.</p></div><button type="button" class="btn gold" data-ruopen>Upload my resume</button></section>';
}
function ruHomeQuiet() { var r = S.data && S.data.resume; if (r && r.source === 'build') return ''; /* build: we are writing their resume, so no "newer resume" line */
  return ruNudgeOn() ? '' : '<p class="ru-quiet" data-ruquiet>Have a newer resume? <button type="button" class="linkbtn" data-ruopen>Update it</button></p>'; }
if (typeof document !== 'undefined') document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-ruopen]'); if (!b || S.status !== 'ready') return;
  e.preventDefault(); if (S.view !== 'prefs') { pfReset(); go('prefs'); }
  S.focusTo = '#ruH'; render();
  var h = document.getElementById('ruH'); if (h) { try { h.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (x) { h.scrollIntoView(); } }
});
/* Demo mode (?demo=1): answers like the API, never sends anything. */
function ruDemoApi(b) {
  var d = window.SP_DEMO(), any = !!(b.confirm || b.targets);
  if (any) d.requests = [{ id: 'R-DEMO', date: todayISO(), type: 'Change settings', status: 'New' }].concat(d.requests || []);
  return { ok: true, date: todayISO(), request: any ? 'R-DEMO' : '', requestSaved: true, rescore: 2, me: d };
}
document.addEventListener('change', function (e) {
  var t = e.target; if (!t || S.view !== 'prefs') return;
  if (t.id === 'ruFile') { ruPick(t.files && t.files[0]); return; }
  if (t.dataset && t.dataset.rutick != null && S.ru && S.ru.sug) { S.ru.tick[t.dataset.rutick] = !!t.checked; S.focusTo = '[data-rutick="' + cssq(t.dataset.rutick) + '"]'; render(); }
});
document.addEventListener('click', function (e) {
  if (S.view !== 'prefs' || !e.target.closest) return;
  if (e.target.closest('[data-rusend]')) { ruSend(); return; }
  if (e.target.closest('[data-rucancel]')) { if (S.ru && S.ru.timer) clearTimeout(S.ru.timer); S.ru = null; S.focusTo = '#ruH'; render(); }
});
