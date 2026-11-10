/* r27: Find Your Fit (S.view 'fit'). The O*NET Mini Interest Profiler: 30 items and five answer labels exactly as O*NET publishes
   them (CC BY-ND 4.0, no rewording), scored on the server (action fitSubmit). Raw answers live only in this page's memory and are
   cleared once the scores come back. Everything playful is design: the road from the logo fills as they answer, a sun ray lights
   about every four or five questions, each area has its own color and icon. prefers-reduced-motion (REDUCED, read live) turns off
   every animation, the auto-advance delay and the confetti, and still shows everything.
   r35: (1) a deeper read: items 31 to 60 of the O*NET Interest Profiler Short Form (fit.deep from the API, O*NET's wording), same
   quiz screens, numbered 31 to 60, sent with action fitDeep; results scale to fit.max (20 or 40). (2) "What matters to you at work":
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
/* r35: the part being answered: the first 30 (items) or the deeper 30 (deep, numbered 31 to 60) */
function fitPart() { var f = S.data.fit, x = S.fx; return x.deep ? { items: f.deep || [], ans: x.dans, off: 30, total: 60 } : { items: f.items, ans: x.ans, off: 0, total: 30 }; }
function fitDeepOn() { var f = S.data.fit; return fitDone() && f.form !== 60 && Array.isArray(f.deep) && f.deep.length === 30; }
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
    '<p class="fx-lead">30 quick taps. About 10 minutes. No wrong answers.</p>' +
    '<p class="fx-sub">Each screen shows one activity. Tap how much you would like doing it. Don\'t worry about training or pay; just go with your gut.</p>' +
    '<button type="button" class="fx-start" data-fxstart>' + (x.ans.length ? 'Pick up where you left off' : 'Start') + '</button></div></div>' +
    fitChips() +
    '<div class="fx-why card"><h3>What you get</h3><ul><li>Your top three interest areas, in plain words.</li><li>Five job titles that line up with them, to say Yes or No to.</li><li>A short "why it fits you" line on job matches where we can tell.</li></ul>' +
    '<p class="fx-plain">This is an interest guide, not a test, and it is optional. It never limits which jobs you see. We keep your six area scores, not your answers.</p></div>' +
    (S.demo ? '<p class="fx-demo"><button type="button" class="linkbtn" data-fxdemo>Demo: fill in sample answers</button></p>' : '') +
    '<p class="fx-credit">Uses the O*NET&reg; Interest Profiler (30-question version). ' + FIT_CREDIT_IP + '</p></section>';
}
function fitQ() {
  var x = S.fx, P = fitPart(), i = x.i, it = P.items[i], k = FIT_CYCLE[i % 6], A = FIT_AREA[k], done = P.off + P.ans.filter(function (v) { return v; }).length;
  var moment = i === 15 ? (x.deep ? 'Three quarters done.' : 'Halfway there.') : i === 25 ? 'Almost done.' : '';
  var pills = FIT_SCALE.map(function (lab, n) { var v = n + 1; return '<button type="button" class="fx-pill p' + v + (x.pop === v ? ' pop' : '') + '" data-fxa="' + v + '" aria-pressed="' + (P.ans[i] === v) + '"><kbd aria-hidden="true">' + v + '</kbd><span>' + lab + '</span></button>'; }).join('');
  return '<section class="fx fx-q" style="--ac:' + A.c + ';--at:' + A.t + '" aria-labelledby="fxItem">' +
    '<div class="fx-qtop"><button type="button" class="fx-back" data-fxback>' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button>' +
    '<span class="fx-count" aria-live="polite" aria-atomic="true">Question ' + (P.off + i + 1) + ' of ' + P.total + (moment ? '. ' + moment : '') + '</span></div>' +
    '<div class="fx-qwrap"><div class="fx-side">' + fitRoad(done, P.total, false) +
    '<div class="fx-bar" role="progressbar" aria-label="Answered" aria-valuemin="0" aria-valuemax="' + P.total + '" aria-valuenow="' + done + '"><i style="width:' + Math.round(done / P.total * 100) + '%"></i></div></div>' +
    '<div class="fx-card">' + (moment ? '<p class="fx-moment' + (i === 15 ? ' half' : ' near') + '" aria-hidden="true">' + moment + '</p>' : '') +
    '<span class="fx-qic">' + FIT_IC[k] + '</span><p class="fx-ask">How much would you like this?</p>' +
    '<h2 class="fx-item" id="fxItem" tabindex="-1">' + esc(it.text) + '</h2>' +
    '<div class="fx-pills" role="group" aria-label="Your answer">' + pills + '</div>' +
    (x.err ? '<p class="warn" role="alert">' + esc(x.err) + '</p>' : '') +
    '<p class="fx-keys">Keys 1 to 5 answer too. You can go back any time.</p></div></div>' +
    '<p class="fx-credit">' + (x.deep ? 'Questions 31 to 60 of the O*NET&reg; Interest Profiler (60-question Short Form). ' : 'The O*NET&reg; Interest Profiler (30-question version). ') + FIT_CREDIT_IP + '</p></section>';
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
    '<div class="fx-reshead"><h2 class="fx-big" id="fxH" tabindex="-1">Your top three</h2><p class="fx-lead" aria-live="polite">' + esc(fitNames(top)) + '</p>' + (f.date ? '<p class="fx-date">From ' + esc(fmtDate(f.date)) + (all60 ? '. Based on all 60 questions.' : '') + '</p>' : all60 ? '<p class="fx-date">Based on all 60 questions.</p>' : '') + '</div>' +
    '<div class="fx-resgrid"><div class="fx-radarw card">' + fitRadar(s) + '</div><ol class="fx-areas">' + cards + '</ol></div>' +
    (fitDeepOn() ? '<div class="card fx-deep"><span class="fx-deepic" aria-hidden="true">' + fitRoad(30 + x.dans.filter(function (v) { return v; }).length, 60, false) + '</span><div><h3>Want a deeper read?</h3><p class="fx-plain">30 more quick taps, about 10 more minutes. Your results get more precise.</p>' +
      '<button type="button" class="btn gold" data-fxdeep>' + (x.dans.length ? 'Pick up where you left off' : 'Keep going') + '</button></div></div>' : '') +
    '<div class="card fx-titles"><h3>Job titles to look at</h3>' +
    (titles ? '<p class="fx-plain">Picked by how closely each kind of work lines up with your interests and your experience level. Tap Yes on any you would like us to consider for your search. We check with you before changing it, and your job matches keep coming either way.</p><ol class="fx-tlist">' + titles + '</ol>'
      : '<p class="fx-plain">No titles stood out this time' + (top.length && s[top[0]] === s[top[2]] ? ', because your answers were spread evenly' : '') + '. That is fine: your job matches stay exactly the same.</p>') +
    (x.tErr ? '<p class="warn" role="alert">' + esc(x.tErr) + '</p>' : '') + '</div>' +
    '<div class="fx-actions"><button type="button" class="btn gold" data-fxshare>Make a share card</button><button type="button" class="btn ghost" data-go="jobs">Back to your jobs</button><button type="button" class="linkbtn" data-fxretake>Retake it</button></div>' +
    '<p class="fx-plain fx-note">This is an interest guide. Your interests are one of many things that matter in a career, and these results never limit which jobs you see.</p>' +
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
    if (x.i < 29) { x.i++; S.focusTo = '#fxItem'; render(); return; }
    var first = -1; for (var n = 0; n < 30; n++) if (!A[n]) { first = n; break; }
    if (first >= 0) { x.i = first; S.focusTo = '#fxItem'; render(); return; }
    fitSubmit();
  }, REDUCED ? 0 : 250);
}
function fitSubmit() {
  var x = S.fx, t0 = Date.now(), deep = x.deep, answers = (deep ? x.dans : x.ans).slice(0, 30);
  x.step = 'reveal'; S.focusTo = '#fxH'; render(); window.scrollTo(0, 0);
  post({ action: deep ? 'fitDeep' : 'fitSubmit', t: S.token, answers: answers }).then(function (d) {
    setTimeout(function () {
      if (d && d.ok && d.fit) { S.data.fit = d.fit; if (deep) x.dans = []; else x.ans = []; x.deep = false; x.i = 0; x.retake = false; x.step = 'results'; x.fresh = true; S.focusTo = '#fxH'; render(); window.scrollTo(0, 0); fitConfetti(); setTimeout(function () { x.fresh = false; }, 1500); }
      else { x.step = 'q'; x.i = 29; x.err = d && d.error === 'expired' ? 'Your sign-in has expired. Sign in again; your answers are still here until you close this page.' : d && d.error === 'limit' ? 'That is a lot of tries in one hour. Please try again a little later.' : d && d.error === 'already done' ? 'Your deeper read is already saved. Refresh this page to see it.' : d && d.error === 'not ready' ? 'Please take the first 30 questions first.' : 'That didn\'t save. Please try again in a minute.'; render(); }
    }, Math.max(0, 1500 - (Date.now() - t0)));
  }).catch(function () { x.step = 'q'; x.i = 29; x.err = 'That didn\'t save. Please check your connection and try again.'; render(); });
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
  return '<p class="jfitw"><b>' + (both.length ? 'Why it fits you:' : 'Your interests:') + '</b> ' + esc(s) + ' <a class="fx-src" href="#fitCredit" data-fxsrc>Source</a></p>';
}
/* the O*NET Database credit under the Jobs list, whenever any job card can show an interest line */
function fitJobsCredit(d) {
  if (!fitDone() || !(d.jobs || []).concat(d.closed || []).some(function (j) { return j.interestFit != null && j.interestFit !== ''; })) return '';
  return '<p class="fx-credit fx-jcredit" id="fitCredit" tabindex="-1">' + fitCreditDb(S.data.fit.release) + '</p>';
}
function fitHello() {
  if (!fitOn()) return '';
  return fitDone() ? '<button type="button" class="linkbtn fx-hl" data-go="fit">Your fit: ' + esc(fitNames(S.data.fit.top3 || [])) + '</button>' : '<button type="button" class="linkbtn fx-hl" data-go="fit">Find your fit: 10 minutes</button>';
}
function fitJobsCard() {
  if (!fitOn() || fitDone()) return '';
  var nAns = S.fx.ans.filter(function (v) { return v; }).length;
  return '<div class="fx-jcard"><div class="fx-jcic">' + (nAns ? fitRoad(nAns, 30, false) : '<span class="fx-logo">' + SP.mark('fxj') + '</span>') + '</div><div><b>' + esc(FIT_NAME) + '</b><p>30 quick taps, about 10 minutes. See your top interests and five titles that line up with them. Optional; your matches keep coming either way.</p><button type="button" class="btn gold" data-go="fit">Take it</button></div></div>';
}

document.addEventListener('click', function (e) {
  if (S.view !== 'fit' || !fitOn()) return;
  var x = S.fx, el;
  if (e.target.closest('[data-fxstart]')) { x.step = 'q'; x.deep = false; x.retake = true; if (x.i > 29) x.i = 0; S.focusTo = '#fxItem'; render(); window.scrollTo(0, 0); return; }
  if (e.target.closest('[data-fxdeep]')) { if (!fitDeepOn()) return; x.step = 'q'; x.deep = true; x.err = ''; var nd = 0; while (nd < 29 && x.dans[nd]) nd++; x.i = nd; S.focusTo = '#fxItem'; render(); window.scrollTo(0, 0); return; }
  if ((el = e.target.closest('[data-fxa]'))) { fitAnswer(+el.getAttribute('data-fxa')); return; }
  if (e.target.closest('[data-fxback]')) { if (x.lock) return; if (x.i > 0) { x.i--; S.focusTo = '#fxItem'; } else if (x.deep) { x.deep = false; x.step = 'results'; S.focusTo = '[data-fxdeep]'; } else { x.step = 'intro'; S.focusTo = '#fxH'; } x.err = ''; render(); return; }
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
var FIT_DEMO_DEEP = ['Lay brick or tile', 'Investigate the cause of a fire', 'Play a musical instrument', 'Teach an individual an exercise routine', 'Buy and sell stocks and bonds', 'Develop a spreadsheet using computer software', 'Repair and install locks', 'Work in a biology lab', 'Perform jazz or tap dance', 'Teach children how to play sports', 'Manage a retail store', 'Calculate the wages of employees', 'Raise fish in a fish hatchery', 'Study the movement of planets', 'Draw pictures', 'Teach sign language to people who are deaf or hard of hearing', 'Represent a client in a lawsuit', 'Proofread records or forms', 'Set up and operate machines to make products', 'Invent a replacement for sugar', 'Sing in a band', 'Help conduct a group therapy session', 'Operate a beauty salon or barber shop', 'Record rent payments', 'Put out forest fires', 'Do laboratory tests to identify diseases', 'Edit movies', 'Take care of children at a day-care center', 'Manage a clothing store', 'Keep inventory records']; /* r35: items 31 to 60, for the demo only (the real ones come from the API) */
var FIT_DEMO_ANS2 = [4, 4, 2, 5, 2, 3, 3, 5, 1, 4, 2, 4, 2, 4, 3, 4, 2, 3, 4, 5, 1, 5, 2, 3, 2, 5, 2, 5, 2, 4];
var FIT_DEMO_ANS = [4, 5, 2, 5, 3, 3, 4, 5, 3, 4, 2, 4, 3, 4, 1, 5, 3, 3, 3, 5, 2, 4, 2, 3, 4, 4, 2, 5, 1, 2];
function fitDemoScore(ans) { var s = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }; ans.forEach(function (v, i) { s[FIT_CYCLE[i % 6]] += v - 1; }); return s; }
function fitDemoTop(s) { return FIT_CYCLE.slice().sort(function (a, b) { return s[b] - s[a] || FIT_CYCLE.indexOf(a) - FIT_CYCLE.indexOf(b); }).slice(0, 3); }
function fitDemoData(done, ans, dans) {
  var s = fitDemoScore(ans || FIT_DEMO_ANS);
  if (dans) { var s2 = fitDemoScore(dans); FIT_CYCLE.forEach(function (k) { s[k] += s2[k]; }); }
  var out = { items: FIT_DEMO_ITEMS.map(function (t, i) { return { id: i + 1, text: t }; }), scale: FIT_SCALE.slice(), done: !!done, scores: done ? s : null, top3: done ? fitDemoTop(s) : [], date: done ? todayISO() : '', release: '31.0',
    priorities: done ? ['Guaranteed base pay (not commission or production only)'] : [],
    titles: done ? [{ code: '29-1021.00', title: 'Dentists, General', zone: 5, fit: 91, areas: 'IRS', answer: '' }, { code: '29-1292.00', title: 'Dental Hygienists', zone: 3, fit: 88, areas: 'SRC', answer: '' },
      { code: '29-1023.00', title: 'Orthodontists', zone: 5, fit: 86, areas: 'IRS', answer: '' }, { code: '29-1024.00', title: 'Prosthodontists', zone: 5, fit: 84, areas: 'IRS', answer: '' },
      { code: '29-1071.00', title: 'Physician Assistants', zone: 5, fit: 82, areas: 'ISR', answer: '' }] : [] };
  out.form = done && dans ? 60 : 30; out.max = out.form === 60 ? 40 : 20; /* r35 */
  if (done && !dans) out.deep = FIT_DEMO_DEEP.map(function (t, i) { return { id: i + 31, text: t }; });
  out.prefs = S.fxDemoPrefs ? { date: todayISO(), answers: { priorities: ['stability', 'helping'], workwith: 'people', team: 'mix', structure: 'some', pace: 'steady', paytype: 'salary', schedule: 'weekdays', travel: 'none', size: 'any', hardno: 'Weekend shifts' } } : null;
  return out;
}
/* the demo API answers fitSubmit and fitTitle locally (demoApi in the page calls this first) */
function fitDemoApi(b) {
  if (b.action === 'fitSubmit') { var ok = Array.isArray(b.answers) && b.answers.length === 30 && b.answers.every(function (v) { return v >= 1 && v <= 5 && v === Math.floor(v); }); return ok ? { ok: true, fit: fitDemoData(true, b.answers) } : { ok: false, error: 'bad answers' }; }
  if (b.action === 'fitTitle') return { ok: true };
  var okA = function (a) { return Array.isArray(a) && a.length === 30 && a.every(function (v) { return v >= 1 && v <= 5 && v === Math.floor(v); }); };
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
  /* r35: &fxdq=31..60 opens a deeper question (implies results); &fxdeep=1 shows results from all 60; &fxprefs=1 opens the work
     preferences (&fxpsaved=1 with sample saved answers); &mcdate=YYYY-MM-DD sets the last match check-in */
  var dq = +q.get('fxdq'); if (dq >= 31 && dq <= 60) { S.fxDemoDone = true; S.fx.step = 'q'; S.fx.deep = true; S.fx.i = dq - 31; S.fx.dans = FIT_DEMO_ANS2.slice(0, dq - 31); }
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
var FP_HOW = 'How we use them: they guide which jobs we send you and how we rank them. Your pay, schedule and travel answers, and anything you list under "Anything you won\'t do", can rule a job out. Your Find Your Fit interest results never rule a job out.';
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
  if (m.sent) return '<section class="card mc mc-done" aria-labelledby="mcH"><h2 class="mc-h" id="mcH" tabindex="-1">How are your matches this week?</h2><p class="mc-st" id="mcStatus" role="status" aria-live="polite">Thanks. We\'ll use this when we pick your next matches.</p></section>';
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
