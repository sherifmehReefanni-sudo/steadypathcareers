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
R44_URL.training = '/assets/data/training-finder.json';
/* the filters always start on All areas, All kinds, All fields: nothing in the client's data sets a default */
function r45F() { if (!S.tf) S.tf = { area: '', kind: '', field: '', saved: false }; return S.tf; }
function r45Stars() { var st = r44Store(); st.tf = st.tf || {}; st.tf.saved = st.tf.saved || {}; return st.tf.saved; }
function r45Card(e, D, stars) {
  var on = !!stars[e.id], area = (D.areas.filter(function (a) { return a[0] === e.area; })[0] || [e.area, e.area])[1], kind = (D.kinds.filter(function (k) { return k[0] === e.kind; })[0] || [e.kind, e.kind])[1], u = safeUrl(e.url);
  return '<li class="card t45-card" data-tf="' + esc(e.id) + '"><div class="t45-top"><h3>' + esc(e.name) + '</h3><button type="button" class="t45-star" data-tfstar="' + esc(e.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Saved. Remove ' : 'Save ') + esc(e.name) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg></button></div>' +
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
function vTraining() {
  r44Need('training', R44_URL.training);
  var D = R44.training, f = D ? r45F() : null, body;
  if (!D) body = r44Wait('training');
  else {
    var opt = function (list, cur, all) { return '<option value="">' + all + '</option>' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (cur === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); };
    var fields = Object.keys(D.fieldNames).map(function (k) { return [k, D.fieldNames[k]]; }), nSaved = Object.keys(r45Stars()).length;
    body = '<form class="card p44-card t45-filters" onsubmit="return false" aria-label="Narrow the list"><div class="t45-three"><div><label for="tfArea">Area</label><select id="tfArea" data-tff="area">' + opt(D.areas, f.area, 'All areas') + '</select></div>' +
      '<div><label for="tfKind">Kind</label><select id="tfKind" data-tff="kind">' + opt(D.kinds, f.kind, 'All kinds') + '</select></div>' +
      '<div><label for="tfField">Career field</label><select id="tfField" data-tff="field">' + opt(fields, f.field, 'All fields') + '</select></div></div>' +
      '<label class="p44-chk"><input type="checkbox" data-tfsaved' + (f.saved ? ' checked' : '') + '>Only the programs I saved</label>' +
      '<p class="psub p44-dev" data-r44dev>Your saved stars: ' + R44_DEVICE.charAt(0).toLowerCase() + R44_DEVICE.slice(1) + ' Signing out removes them.</p></form>' +
      (r45Stale(D.reviewed, r44NyToday()) ? '<p class="warn t45-stale" role="status" data-tfstale>This list may be out of date.</p>' : '') +
      '<div id="tfOut">' + r45Out() + '</div>';
  }
  return shell('training', 'Training and benefits', D ? 'List last checked ' + esc(r45Date(D.reviewed)) + '.' : '') + '<div class="pband" aria-hidden="true"></div><main class="pmain p44 t45">' + r44Sample().replace('<span class="pill">Sample data</span> ', '') +
    '<p class="t45-note" data-tfnote>' + R45_NOTE + '</p>' + body + r42Foot() + '</main>' + tabbar('training');
}
if (typeof document !== 'undefined') {
  var r45Patch = function () { var o = document.getElementById('tfOut'); if (o) o.innerHTML = r45Out(); };
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.getAttribute || !r44On() || S.view !== 'training' || !R44.training) return;
    var k = t.getAttribute('data-tff'); if (k) { r45F()[k] = t.value; r45Patch(); return; }
    if (t.hasAttribute('data-tfsaved')) { r45F().saved = !!t.checked; r45Patch(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !r44On() || S.view !== 'training' || !R44.training) return;
    var b = e.target.closest('[data-tfstar]');
    if (b) { var id = b.getAttribute('data-tfstar'), s = r45Stars(); if (s[id]) delete s[id]; else s[id] = todayISO(); var saved = r44Save(); r45Patch(); var again = document.querySelector('[data-tfstar="' + cssq(id) + '"]'); if (again) again.focus(); if (!saved) toast('This device would not save it.'); return; }
    if (e.target.closest('[data-tfclear]')) { S.tf = { area: '', kind: '', field: '', saved: false }; S.focusTo = '#tfArea'; render(); }
  });
  /* More and Home list the tool. r44Tools is wrapped so nothing about the client decides its line. */
  (function () { var base = r44Tools; r44Tools = function () { var out = base.apply(this, arguments), row = ['training', 'Training and benefits', 'Public training and benefit programs, with links to their official pages.'], at = out.map(function (t) { return t[0]; }).indexOf('fit'); if (at < 0) out.push(row); else out.splice(at, 0, row); return out; }; })();
  /* signing out forgets the filter choices too (the stars go with the r44 store) */
  (function () { var base = r44Wipe; r44Wipe = function () { S.tf = null; return base.apply(this, arguments); }; })();
}
