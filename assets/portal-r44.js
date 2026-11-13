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
