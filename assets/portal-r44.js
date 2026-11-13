/* r44: portal Home in the mixed design (sentence, path, tools) and three client tools that need no backend change:
   Follow-ups (inside Interviews > Applications), Offer check (inside More, and from an application marked Offer) and
   Interview practice (inside Interviews). Loaded after assets/portal-r42.js; every function reads the portal's globals only
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

function r44Tools() {
  var d = S.data, out = [];
  var pj = typeof r44PracticeJobs === 'function' ? r44PracticeJobs() : null;
  if (pj) { var soon = r42Stats().ivSoon; out.push(['practice', 'Interview practice', soon ? 'Practice for your interview with ' + coOr(soon) + '.' : pj.length ? pj.length + (pj.length === 1 ? ' job' : ' jobs') + ' you can practice for.' : 'Common questions, a timer and your own notes.']); }
  if (typeof r44FuDue === 'function') { var n = r44FuDue().length; out.push(['apps', 'Follow-ups', n ? n + (n === 1 ? ' note is due.' : ' notes are due.') : (d.apps || []).length ? 'No notes are due today.' : 'Dates and ready notes for the applications you send.']); }
  if (typeof vOffer === 'function') out.push(['offer', 'Offer check', 'Compare an offer with posted pay.']);
  if (typeof fitOn === 'function' && fitOn()) out.push(['fit', FIT_NAME, fitDone() ? 'Your top areas: ' + fitNames(d.fit.top3 || []) + '.' : 'An interest guide. Not finished yet.']);
  return out;
}
function r44Home() {
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
    '<main class="pmain wide h44-main">' + (S.flash ? '<div class="sent">' + esc(S.flash) + '</div>' : '') + (S.reauthMsg ? '<div class="warn">Your sign-in has expired.' + reauthBtn() + '</div>' : '') +
    '<div class="h44-grid"><section class="h44-next" data-hnext="' + k + '" aria-label="Your next step">' + btn + '</section><div class="h44-lead">' + r42WeekHtml() +
    (last ? '<section class="card h-ans" data-hans aria-labelledby="hAnsH"><h2 class="sec-h" id="hAnsH">Your last answered question</h2><p class="h-ans-j"><b>' + esc(last.title || coName(last)) + '</b>' + (last.company && last.title ? ' at ' + esc(last.company) : '') + (realISO(last.replyDate) ? '<span> · answered ' + esc(fmtY(String(last.replyDate).slice(0, 10))) + '</span>' : '') + '</p><p class="h-ans-t">' + esc(clipWords(String(last.reply).trim(), 280)) + '</p><button type="button" class="linkbtn" data-hjob="' + esc(last.id) + '">Open this job</button></section>' : '') + '</div>' +
    '<section class="h44-path' + (S.r44Drawn ? '' : ' draw') + '" aria-labelledby="h44PathH"><h2 class="sec-h" id="h44PathH">Where your search stands</h2><div class="h44-line" aria-hidden="true"></div><ul class="h-tiles h44-stops">' +
    stops.map(function (s) { var on = hot === s[0], first = on && k === 'first'; /* brand-new: the first-matches wording, not "0 new matches" */
      return '<li class="h44-stop' + (on ? ' on' : '') + '"><span class="h44-dot" aria-hidden="true"></span>' + r44Link(s[0], 'h-tile h44-card', first ? '<span class="h44-t">Your first matches are on the way</span><span class="h44-d">You will get an email when your first jobs arrive.</span>' : (on ? '<span class="h44-k">Your next step</span>' : '') + '<span class="h44-t"><b>' + s[1] + '</b> ' + s[2] + '</span><span class="h44-d">' + esc(s[3]) + '</span>', on ? ' data-hot="1"' : ''); }).join('') +
    '</ul><p class="h44-end">' + R44_SUN + '<span>Your next job, one honest step at a time.</span></p></section></div>' +
    (tools.length ? '<section class="h44-tools" aria-labelledby="h44ToolsH"><h2 class="sec-h" id="h44ToolsH">' + (r44Paid() ? 'Included with your plan' : 'Your tools') + '</h2><ul>' + tools.map(function (t) { return '<li>' + r44Link(t[0], 'h44-tool', '<b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span>', ' data-tool="' + t[0] + '"') + '</li>'; }).join('') + '</ul></section>' : '') +
    (plan ? '<section class="card h-plan" data-hplan><p>' + plan + '</p>' + (billOn() ? '<button type="button" class="linkbtn" data-go="billing">Plan &amp; billing</button>' : '') + '</section>' : '') +
    r42Foot() + '</main>' + tabbar('home');
}
if (typeof document !== 'undefined' && typeof vHome === 'function') {
  vHome = r44Home;
  /* links on Home and in the tools are real links (they open in a new tab like any link); a plain tap stays in the app */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-r44go]'); if (!a || !r44On() || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); var v = a.getAttribute('data-r44go'); if (v === 'prefs' && S.view !== 'prefs') pfReset(); go(v);
  });
  /* the path draws once, on the first Home of this page load */
  (function () { var base = render; render = function () { var r = base.apply(this, arguments); if (S.status === 'ready' && S.view === 'home' && !S.flow && !S.deck && !S.r44Drawn && !S.r44DrawT) S.r44DrawT = setTimeout(function () { S.r44Drawn = true; }, 1200); /* one timer, sets one flag, touches no screen */ return r; }; })();
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
  S.r44Mem = null; S.fu = null; S.pr = null; S.of = null;
  try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (/^(spdemo_)?sp_r44_/.test(k || '')) localStorage.removeItem(k); } } catch (e) {}
}
var R44_DEVICE = 'Saved on this device only for now.';
var R44 = { scripts: null, bank: null, pay: null, busy: {}, err: {} };
function r44Need(name, url) {
  if (R44[name] || R44.busy[name]) return; R44.busy[name] = true; R44.err[name] = false;
  fetch(url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function (d) { R44[name] = d; R44.busy[name] = false; if (S.status === 'ready') render(); })
    .catch(function () { R44.busy[name] = false; R44.err[name] = true; if (S.status === 'ready') render(); });
}
function r44Wait(name) { return R44.err[name] ? '<div class="card" role="alert"><p style="margin:0">This could not be loaded. Check your connection, then <button type="button" class="linkbtn" data-r44retry="' + name + '">try again</button>.</p></div>' : '<div class="card"><p class="psub" style="margin:0" role="status">Loading…</p></div>'; }
var R44_URL = { scripts: '/assets/data/followup-scripts.json', bank: '/assets/data/interview-bank.json', pay: '/pay/data.json' };
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
/* pure: what is due or coming for one application.
   a: { col (1 submitted, 2 interview), status, interview, sub (submitted on), sent (the last follow-up date the API holds) }
   mk: this device's marks { sent: [dates], thanks, nudge, close }.
   Rules, all from the follow-up guide: about 7 days after applying; one follow-up a week; after two with no answer, the
   closing note and no more reminders; thank-you from the interview date itself; check-in five business days after it.
   A follow-up more than 30 days overdue is dropped everywhere, so a card and the Due group never disagree. */
function r44FuPlan(a, today, nyToday, mk) {
  var out = []; mk = mk || {};
  var sent = (mk.sent || []).filter(function (d) { return !!r44Utc(d); }).map(function (d) { return String(d).slice(0, 10); });
  if (r44Utc(a.sent) && sent.indexOf(String(a.sent).slice(0, 10)) < 0) sent.push(String(a.sent).slice(0, 10)); sent.sort();
  if (a.col === 1 && !String(a.interview || '').trim() && /^(applied)?$/i.test(String(a.status || '').trim())) {
    if (sent.length >= 2) { if (!mk.close) out.push({ kind: 'close', due: '', days: null, state: 'next', count: sent.length }); }
    else { var due = r44FuDate(a.sub, sent[sent.length - 1] || ''), d = due ? r44Diff(today, due) : null; if (due && d >= -30) out.push({ kind: 'apply', due: due, days: d, state: d <= 0 ? 'due' : 'upcoming', count: sent.length }); }
  }
  if (a.col === 2 && r44Utc(a.interview)) {
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
    if (!x || isOutreach(x)) return; var mk = st.fu[x.id] || {};
    /* the API holds only the last follow-up date, so the count of follow-ups is kept on this device */
    if (realISO(x.followUpSent)) { var d = String(x.followUpSent).slice(0, 10), have = mk.sent || []; if (have.indexOf(d) < 0) { mk = st.fu[x.id] = Object.assign({}, mk, { sent: have.concat([d]).sort() }); dirty = true; } }
    r44FuPlan({ col: boardCol(x), status: x.status, interview: x.interview, sub: r44FuSub(x), sent: x.followUpSent }, today, ny, mk).forEach(function (o) { o.app = x; out.push(o); });
  });
  if (dirty) r44Save();
  return out.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
}
/* due now: exactly the items whose card line says so */
function r44FuDue() { return r44FuItems().filter(function (o) { return o.state === 'due'; }); }
var R44_FU_NAME = { apply: 'Follow-up', thanks: 'Thank-you note', nudge: 'Check-in', close: 'Closing note' };
function r44FuWhen(o) { return o.kind === 'thanks' ? 'after your interview' : o.kind === 'close' ? '' : o.days === 0 ? 'due today' : o.days === 1 ? 'due tomorrow' : 'due ' + fmtY(o.due); }
function r44FuLabel(o) { return o.kind === 'close' ? 'Two follow-ups sent' : (R44_FU_NAME[o.kind] + ' ' + r44FuWhen(o)).trim(); }
function r44FuBtn(o, label) { return '<button type="button" class="kbtn" data-r44fu="' + o.kind + ':' + esc(o.app.id) + '">' + (label || (o.kind === 'close' ? 'Draft the closing note' : 'Draft the note')) + '<span class="sr"> for ' + esc(coOr(o.app)) + '</span></button>'; }
/* on each application card */
function r44FuLine(x) {
  var its = r44FuItems().filter(function (o) { return o.app === x; });
  var offer = stageOf(x) === 3 && /offer/i.test(String(x.status || '')) ? '<p><button type="button" class="kbtn" data-r44offer="' + esc(x.id) + '">Offer check<span class="sr"> for ' + esc(coOr(x)) + '</span></button></p>' : '';
  if (!its.length) return offer ? '<div class="p44-fuline">' + offer + '</div>' : '';
  return '<div class="p44-fuline" data-r44fuline="' + esc(x.id) + '">' + offer + its.map(function (o) { return '<p data-fustate="' + o.state + '"><span class="pill ' + (o.state === 'due' ? 'gold' : 'info') + '">' + esc(r44FuLabel(o)) + '</span> ' + r44FuBtn(o) + '</p>'; }).join('') + '</div>';
}
/* the Due group at the top of Applications */
function r44DueGroup() {
  var due = r44FuDue(); if (!due.length) return '';
  return '<section class="card p44-due" data-r44due aria-labelledby="p44DueH"><h2 class="sec-h" id="p44DueH">Due <span class="cnt">' + due.length + '</span></h2><ul>' + due.map(function (o) {
    return '<li data-due="' + o.kind + ':' + esc(o.app.id) + '"><div><b>' + esc(coOr(o.app)) + '</b><span>' + esc(String(o.app.role || '').trim()) + '</span><span class="p44-when">' + esc(r44FuLabel(o)) + '</span></div>' + r44FuBtn(o) + '</li>'; }).join('') + '</ul></section>';
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
    var rt = e.target.closest('[data-r44retry]'); if (rt) { var n = rt.getAttribute('data-r44retry'); R44.err[n] = false; r44Need(n, R44_URL[n]); render(); return; }
    if (e.target.closest('[data-r44fucopy]') && S.fu) { copyText((S.fu.subject ? 'Subject: ' + S.fu.subject + '\n\n' : '') + S.fu.body); return; }
    if (e.target.closest('[data-r44fusent]') && S.fu) {
      var x = appById(S.fu.app); if (!x) return;
      if (S.fu.kind === 'apply') { var s0 = r44Store(), t0 = todayISO(); s0.fu = s0.fu || {}; var m0 = s0.fu[x.id] = s0.fu[x.id] || {}; m0.sent = (m0.sent || []).filter(function (d) { return d !== t0; }).concat([t0]).sort(); r44Save(); r18Move(x.id, 'followedup'); go('apps'); return; } /* the existing "I followed up" request: { action: 'board', stage: 'followedup', id } */
      var st = r44Store(); st.fu = st.fu || {}; st.fu[x.id] = st.fu[x.id] || {}; st.fu[x.id][S.fu.kind] = todayISO();
      S.fu.msg = r44Save() ? 'Marked as sent. ' + R44_DEVICE : 'This device would not save it. The note is not marked.'; S.focusTo = '#fuMsg'; render();
    }
  });
  /* signing out removes what the tools kept on this device, and stops the practice timer first */
  (function () { var base = signOut; signOut = function () { r44TimerStop(); r44Wipe(); var r = base.apply(this, arguments); r44Wipe(); return r; }; })();
  /* any screen that is not a signed-in portal (sign-in, link, error after an expired session) leaves nothing behind either */
  (function () { var base = render; render = function () { if (S.status !== 'ready' && S.status !== 'boot' && !S.token) { r44TimerStop(); r44Wipe(); } else if (S.status === 'ready' && S.view !== 'practice') r44TimerStop(); return base.apply(this, arguments); }; })();
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
  if (!R44.pay) return R44.err.pay ? '<p class="err" role="alert">The pay lookup data could not be loaded. <button type="button" class="linkbtn" data-r44retry="pay">Try again</button></p>' : '';
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
  return (jobs.length ? '<h2 class="sec-h">Your jobs</h2><ul class="p44-rows">' + jobs.map(row).join('') + '</ul>' : '<div class="card empty"><p class="psub" style="margin:0">A job shows up here when you say yes to it, add an interview date, or get a prep sheet.</p></div>') +
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
  /* leaving practice stops the timer and writes anything typed */
  (function () { var base = go; go = function (view) { if (S.view === 'practice' && view !== 'practice') { r44TimerStop(); r44Save(); } if (view === 'practice' && S.view !== 'practice' && r44On()) { var P = r44Pr(); P.scr = 'jobs'; P.job = ''; P.edit = null; P.draft = null; P.del = null; } return base.apply(this, arguments); }; })();
  /* Back, Forward and a reload hand over the entry they landed on (portal-r42.js navRestore) */
  (function () { var base = navRestore; navRestore = function (st, view) {
    var r = base.apply(this, arguments); if (view !== 'practice' || !r44On()) return r;
    var P = r44Pr(), pr = (st && st.pr) || { scr: 'jobs', job: '' }, before = [P.scr, P.job, P.i].join('|');
    r44TimerStop(); P.scr = /^(jobs|list|q|stories)$/.test(pr.scr || '') ? pr.scr : 'jobs'; P.job = pr.job || ''; P.from = pr.from || ''; if (pr.i != null) P.i = pr.i | 0; P.left = R44_TIMER; P.edit = null; P.draft = null; P.del = null; P.msg = '';
    return r || before !== [P.scr, P.job, P.i].join('|');
  }; })();
}
