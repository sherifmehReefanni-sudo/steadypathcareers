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
    stops.map(function (s) { var on = hot === s[0]; return '<li class="h44-stop' + (on ? ' on' : '') + '"><span class="h44-dot" aria-hidden="true"></span>' + r44Link(s[0], 'h-tile h44-card', (on ? '<span class="h44-k">Your next step</span>' : '') + '<span class="h44-t"><b>' + s[1] + '</b> ' + s[2] + '</span><span class="h44-d">' + esc(s[3]) + '</span>', on ? ' data-hot="1"' : ''); }).join('') +
    '</ul><p class="h44-end">' + R44_SUN + '<span>Your next job, one honest step at a time.</span></p></section></div>' +
    (tools.length ? '<section class="h44-tools" aria-labelledby="h44ToolsH"><h2 class="sec-h" id="h44ToolsH">' + (r44Paid() ? 'Included with your plan' : 'Your tools') + '</h2><ul>' + tools.map(function (t) { return '<li>' + r44Link(t[0], 'h44-tool', '<b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span>', ' data-tool="' + t[0] + '"') + '</li>'; }).join('') + '</ul></section>' : '') +
    (plan ? '<section class="card h-plan" data-hplan><p>' + plan + '</p>' + (billOn() ? '<button type="button" class="linkbtn" data-go="billing">Plan &amp; billing</button>' : '') + '</section>' : '') +
    r42Foot() + '</main>' + tabbar('home');
}
if (typeof document !== 'undefined' && typeof vHome === 'function') {
  vHome = r44Home;
  /* links on Home and in the tools are real links (they open in a new tab like any link); a plain tap stays in the app */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-r44go]'); if (!a || !S.data || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); var v = a.getAttribute('data-r44go'); if (v === 'prefs' && S.view !== 'prefs') pfReset(); go(v);
  });
  /* the path draws once, on the first Home of this page load */
  (function () { var base = render; render = function () { var r = base.apply(this, arguments); if (S.status === 'ready' && S.view === 'home' && !S.flow && !S.deck && !S.r44Drawn) setTimeout(function () { S.r44Drawn = true; }, 1200); return r; }; })();
}

/* ================= shared: device store and data files ================= */
/* What the tools keep is on this device only (localStorage, one entry per client id). The live API (v1.45) has no place for
   it; r41/BACKEND_PROPOSAL_v146.md says what a store would need. Signing out removes it, like the portal's other device items. */
function r44Key() { return 'sp_r44_' + String((S.data && S.data.client && S.data.client.id) || 'none').replace(/[^\w-]/g, ''); }
function r44Store() { var k = r44Key(); if (S.r44Mem && S.r44Mem.k === k) return S.r44Mem.v; var v = {}; try { v = JSON.parse(lsGet(k) || '{}') || {}; if (typeof v !== 'object' || Array.isArray(v)) v = {}; } catch (e) { v = {}; } S.r44Mem = { k: k, v: v }; return v; }
function r44Save() { try { lsSet(r44Key(), JSON.stringify(r44Store())); return true; } catch (e) { return false; } }
var R44_DEVICE = 'Saved on this phone only for now.';
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
function r44FuItems() {
  var today = todayISO(), out = [];
  ((S.data && S.data.apps) || []).forEach(function (x) {
    if (!x || isOutreach(x)) return; var col = boardCol(x), mk = r44FuMarks(x.id);
    if (col === 1 && !String(x.interview || '').trim() && /^(applied)?$/i.test(String(x.status || '').trim())) {
      var sub = realISO(x.submittedOn) ? x.submittedOn : x.applied, due = r44FuDate(sub, realISO(x.followUpSent) ? x.followUpSent : '');
      if (due) out.push({ app: x, kind: 'apply', due: due, days: r44Diff(today, due) });
    }
    if (col === 2 && r44Utc(x.interview)) {
      var iv = String(x.interview).slice(0, 10), dIv = r44Diff(today, iv), nd = r44NudgeDate(iv);
      if (!mk.thanks && dIv <= 0 && dIv >= -14) out.push({ app: x, kind: 'thanks', due: iv, days: dIv });
      if (!mk.nudge && dIv < 0) out.push({ app: x, kind: 'nudge', due: nd, days: r44Diff(today, nd) });
    }
  });
  return out.sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; });
}
/* due now: the date has come and it is not long past */
function r44FuDue() { return r44FuItems().filter(function (o) { return o.days != null && o.days <= 0 && o.days >= (o.kind === 'thanks' ? -14 : -30); }); }
var R44_FU_NAME = { apply: 'Follow-up', thanks: 'Thank-you note', nudge: 'Check-in' };
function r44FuWhen(o) { return o.days === 0 ? 'due today' : o.days === 1 ? 'due tomorrow' : 'due ' + fmtY(o.due); }
function r44FuBtn(o, label) { return '<button type="button" class="kbtn" data-r44fu="' + o.kind + ':' + esc(o.app.id) + '">' + (label || 'Draft the note') + '<span class="sr"> for ' + esc(coOr(o.app)) + '</span></button>'; }
/* on each application card */
function r44FuLine(x) {
  var its = r44FuItems().filter(function (o) { return o.app === x && (o.kind === 'apply' || o.days <= 0); });
  var offer = stageOf(x) === 3 && /offer/i.test(String(x.status || '')) ? '<p><button type="button" class="kbtn" data-r44offer="' + esc(x.id) + '">Offer check<span class="sr"> for ' + esc(coOr(x)) + '</span></button></p>' : '';
  if (!its.length) return offer ? '<div class="p44-fuline">' + offer + '</div>' : '';
  return '<div class="p44-fuline" data-r44fuline="' + esc(x.id) + '">' + offer + its.map(function (o) { return '<p><span class="pill ' + (o.days <= 0 ? 'gold' : 'info') + '">' + R44_FU_NAME[o.kind] + ' ' + r44FuWhen(o) + '</span> ' + r44FuBtn(o) + '</p>'; }).join('') + '</div>';
}
/* the Due group at the top of Applications */
function r44DueGroup() {
  var due = r44FuDue(); if (!due.length) return '';
  return '<section class="card p44-due" data-r44due aria-labelledby="p44DueH"><h2 class="sec-h" id="p44DueH">Due <span class="cnt">' + due.length + '</span></h2><ul>' + due.map(function (o) {
    return '<li><div><b>' + esc(coOr(o.app)) + '</b><span>' + esc(String(o.app.role || '').trim()) + '</span><span class="p44-when">' + R44_FU_NAME[o.kind] + ' ' + r44FuWhen(o) + '</span></div>' + r44FuBtn(o) + '</li>'; }).join('') + '</ul></section>';
}
function r44FuOpen(kind, id) {
  var x = appById(id); if (!x || !/^(apply|thanks|nudge)$/.test(kind)) return;
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
    if (F.subject == null) { var f = r44FuFields(x); F.subject = r44Fill(sc.subject, f); F.body = r44Fill(sc.body, f); }
    var to = r44Email(x.contact), left = /\[[^\]\n]+\]/.test(F.subject + F.body), mk = r44FuMarks(x.id), sent = F.kind === 'apply' ? false : !!mk[F.kind];
    body = r44Sample() + '<div class="card p44-card"><h2 class="pf-h">When to send</h2><p>' + esc(sc.when) + '</p>' + (F.kind === 'apply' ? '<p>' + esc(R44.scripts.rule) + '</p>' : '') +
      '<p class="psub">From our <a href="/free/follow-up-scripts/" target="_blank" rel="noopener">follow-up scripts guide<span class="sr"> (opens in a new tab)</span></a>. General information, not legal or financial advice.</p></div>' +
      '<div class="card p44-card"><label for="fuSub">Subject</label><input id="fuSub" type="text" maxlength="200" value="' + esc(F.subject) + '">' +
      '<label for="fuBody">The note</label><textarea id="fuBody" rows="12" maxlength="4000">' + esc(F.body) + '</textarea>' +
      '<p class="psub" id="fuLeft"' + (left ? '' : ' hidden') + '>Anything still in brackets, like [Name], is yours to fill in before you send.</p>' +
      '<p class="psub">' + (to ? 'Open in email addresses it to ' + esc(to) + ', the email saved on this application.' : 'Open in email leaves the address empty. Add the person you are writing to.') + ' You send it yourself. The portal never sends email for you.</p>' +
      '<div class="p44-acts"><button type="button" class="btn" data-r44fucopy>Copy</button><a class="btn ghost" id="fuMail" href="' + esc(r44Mailto(to, F.subject, F.body)) + '">Open in email</a>' +
      (sent ? '' : '<button type="button" class="btn ghost" data-r44fusent' + (S.bdBusy && S.bdBusy[x.id] ? ' disabled' : '') + '>Mark as sent</button>') + '</div>' +
      (F.kind !== 'apply' ? '<p class="psub p44-dev">' + (sent ? 'Marked as sent on ' + esc(fmtY(mk[F.kind])) + '. ' : '') + R44_DEVICE + '</p>' : '') +
      '<p class="p44-msg" role="status" id="fuMsg">' + esc(F.msg || '') + '</p></div>';
  }
  return shell('fu', esc(R44_FU_NAME[F.kind] + ' for ' + coOr(x)), esc(String(x.role || '').trim())) + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 p44-fu"><div class="fl-top"><button type="button" class="fl-back" data-go="apps">' + IC.chev + 'Back to Applications</button></div>' + body + '</main>' + tabbar('fu');
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !S.fu || (t.id !== 'fuSub' && t.id !== 'fuBody')) return;
    if (t.id === 'fuSub') S.fu.subject = t.value; else S.fu.body = t.value;
    var x = appById(S.fu.app), a = document.getElementById('fuMail'), l = document.getElementById('fuLeft');
    if (a && x) a.setAttribute('href', r44Mailto(r44Email(x.contact), S.fu.subject, S.fu.body));
    if (l) l.hidden = !/\[[^\]\n]+\]/.test(S.fu.subject + S.fu.body);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !S.data) return;
    var b = e.target.closest('[data-r44fu]'); if (b) { var p = b.getAttribute('data-r44fu').split(':'); r44FuOpen(p[0], p.slice(1).join(':')); return; }
    var rt = e.target.closest('[data-r44retry]'); if (rt) { var n = rt.getAttribute('data-r44retry'); R44.err[n] = false; r44Need(n, R44_URL[n]); render(); return; }
    if (e.target.closest('[data-r44fucopy]') && S.fu) { copyText((S.fu.subject ? 'Subject: ' + S.fu.subject + '\n\n' : '') + S.fu.body); return; }
    if (e.target.closest('[data-r44fusent]') && S.fu) {
      var x = appById(S.fu.app); if (!x) return;
      if (S.fu.kind === 'apply') { r18Move(x.id, 'followedup'); go('apps'); return; } /* the existing "I followed up" request: { action: 'board', stage: 'followedup', id } */
      var st = r44Store(); st.fu = st.fu || {}; st.fu[x.id] = st.fu[x.id] || {}; st.fu[x.id][S.fu.kind] = todayISO();
      S.fu.msg = r44Save() ? 'Marked as sent. ' + R44_DEVICE : 'This phone would not save it. The note is not marked.'; S.focusTo = '#fuMsg'; render();
    }
  });
  /* signing out removes what the tools kept on this device */
  (function () { var base = signOut; signOut = function () { var k = S.data ? r44Key() : null; var r = base.apply(this, arguments); if (k) { try { lsDel(k); } catch (e) {} } S.r44Mem = null; S.fu = null; S.pr = null; S.of = null; return r; }; })();
}

/* ================= T4: offer check ================= */
/* Arithmetic on what the client types, the pay line stored on the job's row (shown as stored) and the pay lookup's own data
   file (/pay/data.json, cited the way /pay/ cites it). Nothing here is sent anywhere. */
var R44_WEEKS = 52;
function r44Money(n, cents) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); }
function r44Pos(v) { v = typeof v === 'string' ? Number(v.replace(/[$,\s]/g, '')) : Number(v); return isFinite(v) && v > 0 ? v : null; }
/* pure: o = { amount, unit: 'hour' | 'year', hours, days, commute (cost per day on site) }. Returns null until pay and hours are usable. */
function r44OfferMath(o) {
  var amt = r44Pos(o.amount), hrs = r44Pos(o.hours); if (!amt || !hrs || hrs > 168) return null;
  var hourly = o.unit === 'hour', yearly = hourly ? amt * hrs * R44_WEEKS : amt, perHour = hourly ? amt : amt / (hrs * R44_WEEKS);
  var days = Number(o.days), cost = r44Pos(o.commute), hasC = cost != null && days > 0 && days <= 7, commute = hasC ? cost * days * R44_WEEKS : 0;
  var lines = [];
  if (hourly) lines.push('Yearly pay: ' + r44Money(amt, true) + ' an hour x ' + hrs + ' hours a week x ' + R44_WEEKS + ' weeks = ' + r44Money(yearly));
  else lines.push('Hourly pay: ' + r44Money(amt) + ' a year / (' + hrs + ' hours a week x ' + R44_WEEKS + ' weeks) = ' + r44Money(perHour, true) + ' an hour');
  if (hasC) { lines.push('Commute: ' + r44Money(cost, true) + ' a day x ' + days + (days === 1 ? ' day' : ' days') + ' a week x ' + R44_WEEKS + ' weeks = ' + r44Money(commute) + ' a year'); lines.push('Pay after commute: ' + r44Money(yearly) + ' - ' + r44Money(commute) + ' = ' + r44Money(yearly - commute) + ' a year'); }
  return { yearly: yearly, hourly: perHour, commute: commute, after: yearly - commute, hasCommute: hasC, lines: lines };
}
/* pure: read a posted pay line only when it is one plain amount or one plain range with a clear unit; otherwise null */
function r44Posted(text) {
  var p = String(text == null ? '' : text); if (!p.trim() || /OTE|on[- ]target|commission|%|not posted|estimate|bonus/i.test(p)) return null;
  var re = /\$\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(k\b)?/gi, m, a = [];
  while ((m = re.exec(p))) a.push(Number(m[1].replace(/,/g, '') + (m[2] || '')) * (m[3] ? 1000 : 1));
  if (!a.length || a.length > 2) return null;
  var lo = a[0], hi = a.length === 2 ? a[1] : a[0]; if (a.length === 2 && /\d\s*k\b/i.test(p) && lo < 1000 && hi >= 1000) lo *= 1000;
  var unit = /hour|hourly|\/\s*hr\b|\bhr\b/i.test(p) ? 'hour' : /year|yearly|annual|salary|\/\s*yr\b/i.test(p) ? 'year' : lo >= 1000 ? 'year' : lo < 500 ? 'hour' : '';
  if (!unit || !(lo > 0) || hi < lo || (unit === 'hour' ? hi >= 1000 : lo < 1000)) return null;
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
function r44OfferOut() {
  var o = r44Of(), jobs = r44OfferJobs(), J = jobs.filter(function (x) { return x.key === o.job; })[0] || null, h = '';
  var cost = r44OfCommute(o), M = r44OfferMath({ amount: o.amount, unit: o.unit, hours: o.hours, days: o.days, commute: cost });
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
        '<p data-of="place" data-place="">This pay line is not one plain amount or range, so there is no comparison. Read it against your offer yourself.</p>') + '</section>';
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
  var inp = function (id, label, k, attrs) { return '<div><label for="' + id + '">' + label + '</label><input id="' + id + '" data-of="' + k + '" value="' + esc(o[k]) + '" ' + (attrs || 'type="text" inputmode="decimal" maxlength="12"') + '></div>'; };
  var chk = function (k, label) { return '<label class="p44-chk"><input type="checkbox" data-ofc="' + k + '"' + (o[k] ? ' checked' : '') + '>' + label + '</label>'; };
  return shell('offer', 'Offer check', 'Arithmetic and posted data, not advice on whether to accept.') + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 p44-of">' + r44Sample() +
    '<div class="card p44-card"><p style="margin:0">Type what you were offered. The numbers below are worked out on this phone. Nothing here is sent or saved.</p></div>' +
    '<form class="card p44-card p44-form" id="ofForm" onsubmit="return false">' +
    '<label for="ofJob">Which job is the offer for?</label><select id="ofJob" data-ofs="job"><option value="">A job that is not listed</option>' + jobs.map(function (j) { return '<option value="' + esc(j.key) + '"' + (o.job === j.key ? ' selected' : '') + '>' + esc(j.label) + '</option>'; }).join('') + '</select>' +
    '<div class="p44-two">' + inp('ofAmt', 'Offered pay, in dollars', 'amount') + '<div><label for="ofUnit">Paid by the</label><select id="ofUnit" data-ofs="unit"><option value="year"' + (o.unit === 'year' ? ' selected' : '') + '>Year</option><option value="hour"' + (o.unit === 'hour' ? ' selected' : '') + '>Hour</option></select></div></div>' +
    '<div class="p44-two">' + inp('ofHrs', 'Hours a week', 'hours') + inp('ofDays', 'Days on site a week', 'days', 'type="text" inputmode="numeric" maxlength="1"') + '</div>' +
    '<fieldset class="p44-fs"><legend>Commute cost for a day on site</legend><label class="p44-chk"><input type="radio" name="ofMode" data-ofm="cost"' + (o.mode === 'cost' ? ' checked' : '') + '>I know the cost (fare, tolls, parking)</label><label class="p44-chk"><input type="radio" name="ofMode" data-ofm="miles"' + (o.mode === 'miles' ? ' checked' : '') + '>Miles times a rate</label>' +
    (o.mode === 'miles' ? '<div class="p44-two">' + inp('ofMiles', 'Round trip miles a day', 'miles') + inp('ofRate', 'Your cost a mile, in dollars', 'rate') + '</div><p class="psub">Use your own cost a mile. We do not supply a rate.</p>' : inp('ofCost', 'Cost a day, in dollars', 'cost')) + '</fieldset>' +
    '<fieldset class="p44-fs"><legend>Benefits in the offer</legend>' + chk('health', 'Health insurance') + chk('retire', 'Retirement match') + chk('pto', 'Paid time off') + '</fieldset>' +
    '<div><label for="ofStart">Start date</label><input id="ofStart" type="date" data-of="start" value="' + esc(o.start) + '"></div>' +
    '<fieldset class="p44-fs"><legend>Compare with the pay lookup (optional)</legend><div class="p44-two"><div><label for="ofQ">Job title to look up</label><input id="ofQ" type="search" data-of="q" maxlength="60" autocomplete="off" value="' + esc(o.q) + '"></div><div><label for="ofSt">State</label><select id="ofSt" data-ofs="st"><option value="NJ"' + (o.st === 'NJ' ? ' selected' : '') + '>New Jersey</option><option value="NY"' + (o.st === 'NY' ? ' selected' : '') + '>New York</option></select></div></div><div id="ofHits">' + r44OfHitsHtml() + '</div></fieldset></form>' +
    '<div id="ofOut" aria-live="polite">' + r44OfferOut() + '</div>' +
    '<p class="p44-fine">This is arithmetic and posted data, not advice on whether to accept. General information, not legal or financial advice.</p>' + r42Foot() + '</main>' + tabbar('offer');
}
if (typeof document !== 'undefined') {
  var r44OfPatch = function () { var out = document.getElementById('ofOut'), hits = document.getElementById('ofHits'); if (out) out.innerHTML = r44OfferOut(); if (hits) hits.innerHTML = r44OfHitsHtml(); };
  document.addEventListener('input', function (e) { var t = e.target, k = t && t.getAttribute && t.getAttribute('data-of'); if (!k || !S.of || t.tagName !== 'INPUT') return; S.of[k] = t.value; if (k === 'q') S.of.soc = ''; r44OfPatch(); });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !S.of || S.view !== 'offer') return;
    var ks = t.getAttribute('data-ofs'), kc = t.getAttribute('data-ofc'), km = t.getAttribute('data-ofm');
    if (ks) { S.of[ks] = t.value; r44OfPatch(); } else if (kc) { S.of[kc] = !!t.checked; r44OfPatch(); } else if (km) { S.of.mode = km; S.focusTo = km === 'miles' ? '#ofMiles' : '#ofCost'; render(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !S.data) return;
    var b = e.target.closest('[data-ofsoc]'); if (b && S.of) { S.of.soc = b.getAttribute('data-ofsoc'); r44OfPatch(); var again = document.querySelector('#ofHits [aria-checked="true"]'); if (again) again.focus(); return; }
    var ob = e.target.closest('[data-r44offer]'); if (ob) r44OfferOpen(ob.getAttribute('data-r44offer'));
  });
}
