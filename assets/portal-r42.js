/* r42: portal revamp, piece 1. Home, the five destinations (Home, Jobs, Documents, Interviews, More), the weekly line and the
   Back button for the Find Your Fit steps. Loaded after portal/index.html's own scripts and assets/fit-r35.js; every function
   here reads the portal's globals only when it is called. The first block is pure (no DOM, no globals) and is unit tested under
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
function r42When(dd, x) { return dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : 'on ' + fmtY(x.interview); }

/* The weekly line. Nothing at all when the API sends no usable data.week (the live v1.45 API sends none). */
function r42WeekHtml() {
  var d = S.data, L = d ? r42WeekLine(d.week, todayISO()) : null; if (!L) return '';
  var sample = !!(S.demo || (d.week && d.week.sample));
  return '<section class="card h-week" data-week aria-labelledby="hWeekH"><h2 class="sec-h" id="hWeekH">The work you didn\'t see' + (sample ? ' <span class="pill h-sample">Sample numbers</span>' : '') + '</h2>' +
    '<p class="h-week-t">' + esc(L.text) + '</p><p class="h-week-d">Week of ' + esc(fmtY(L.weekOf)) + '</p></section>';
}

function vHome() {
  var d = S.data, cl = d.client || {}, c = counts(), nd = docsReady(), A = r42Stats();
  var fitTodo = typeof fitOn === 'function' && fitOn() && !fitDone();
  var k = r42Next({ docs: nd, matches: c.wait, ivSoon: A.ivSoon, fitTodo: fitTodo }), nx;
  if (k === 'docs') nx = ['Your next step', nd + r42Plural(nd, ' document is', ' documents are') + ' waiting for your OK', 'Read ' + r42Plural(nd, 'it', 'them') + ' and approve, or ask for changes.', '<button class="btn gold" data-go="docs">Review your documents</button>'];
  else if (k === 'matches') nx = ['Your next step', c.wait + r42Plural(c.wait, ' new match', ' new matches') + ' to review', 'Answer Yes, No or Question on each one. A Yes starts your tailored resume and cover letter.', '<button class="btn gold" data-go="jobs">See your matches</button>'];
  else if (k === 'interview') { var x = A.ivSoon, dd = r42Days(todayISO(), x.interview);
    nx = ['Coming up', 'Interview with ' + esc(coOr(x)) + ' ' + esc(r42When(dd, x)), esc([x.role, x.ivTime].filter(function (v) { return String(v || '').trim(); }).join(' · ')), (pvHas(x) ? '<button class="btn gold" data-nxprep="' + esc(x.id) + '">Open your interview prep</button>' : '') + '<button class="btn ' + (pvHas(x) ? 'ghost' : 'gold') + '" data-go="iv">See your interviews</button>']; }
  else if (k === 'fit') nx = ['Your next step', 'Finish ' + esc(FIT_NAME), 'An interest guide. Optional, and it never limits which jobs you see.', '<button class="btn gold" data-go="fit">Open ' + esc(FIT_NAME) + '</button>'];
  else if (!d.jobs.length && !(d.closed || []).length && !d.docs.length && !d.apps.length) { k = 'first'; nx = ['Getting started', 'Your first matches are on the way.', 'You will get an email when your first jobs arrive.', '<button class="btn ghost" data-go="jobs">Open Jobs</button>']; } /* a brand-new client: the words Jobs uses for this state */
  else nx = ['Nothing waiting', 'You\'re caught up.', 'Nothing needs you right now. New matches show up under Jobs.', '<button class="btn ghost" data-go="jobs">Open Jobs</button>'];
  var tile = function (n, label, view, attn) { return '<li><button type="button" class="h-tile' + (attn && n ? ' attn' : '') + '" data-go="' + view + '"><b>' + n + '</b><span>' + label + '</span></button></li>'; };
  var la = r42LastAnswer(d.jobs), plan = billOn() ? esc(billHello(cl)) : esc(trialText(cl));
  return shell('home', esc(SP.greeting(cl.firstName)), 'Here\'s your week.') + '<div class="pband" aria-hidden="true"></div>' +
    '<main class="pmain h-main">' + (S.flash ? '<div class="sent">' + esc(S.flash) + '</div>' : '') + (S.reauthMsg ? '<div class="warn">Your sign-in has expired.' + reauthBtn() + '</div>' : '') +
    '<section class="nx h-next" data-hnext="' + k + '" aria-labelledby="hNextH"><div class="nx-tx"><p class="nx-k">' + nx[0] + '</p><h2 id="hNextH">' + nx[1] + '</h2>' + (nx[2] ? '<p class="nx-s">' + nx[2] + '</p>' : '') + '</div><div class="nx-acts">' + nx[3] + '</div></section>' +
    '<ul class="h-tiles" aria-label="Where things stand">' + tile(c.wait, r42Plural(c.wait, 'New match', 'New matches'), 'jobs', true) + tile(nd, r42Plural(nd, 'Document waiting', 'Documents waiting'), 'docs', true) + tile(A.open, r42Plural(A.open, 'Application in progress', 'Applications in progress'), 'apps') + tile(A.ivUp, r42Plural(A.ivUp, 'Interview coming up', 'Interviews coming up'), 'iv') + '</ul>' +
    r42WeekHtml() +
    (la ? '<section class="card h-ans" data-hans aria-labelledby="hAnsH"><h2 class="sec-h" id="hAnsH">Your last answered question</h2><p class="h-ans-j"><b>' + esc(la.title || coName(la)) + '</b>' + (la.company && la.title ? ' at ' + esc(la.company) : '') + (realISO(la.replyDate) ? '<span> · answered ' + esc(fmtY(String(la.replyDate).slice(0, 10))) + '</span>' : '') + '</p><p class="h-ans-t">' + esc(clipWords(String(la.reply).trim(), 280)) + '</p><button type="button" class="linkbtn" data-hjob="' + esc(la.id) + '">Open this job</button></section>' : '') +
    (plan ? '<section class="card h-plan" data-hplan><p>' + plan + '</p>' + (billOn() ? '<button type="button" class="linkbtn" data-go="billing">Plan &amp; billing</button>' : '') + '</section>' : '') +
    r42Foot() + '</main>' + tabbar('home');
}

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
/* leaving the screen clears what was typed */
(function () { var base = go; go = function (view) { if (view !== 'delete' || S.view !== 'delete') S.del = null; return base.apply(this, arguments); }; })();

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
/* popstate (and a reload) hand over the entry they landed on. Returns true when it changed which Find Your Fit screen, or the
   deck, is showing. */
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
    return false;
  }
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
(function () { var base = render; render = function () { var r = base.apply(this, arguments); try { r42FitHist(); } catch (e) {} return r; }; })();
