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
  /* and the portal's rule that lifts a focused control clear of the tab bar (assets/portal-r42.js) is not applied to that focus: the star was just tapped where it is, so it stays there */
  var r49Keep = null; document.addEventListener('focusin', function (e) { if (r49Keep && e.target === r49Keep) e.stopImmediatePropagation(); }, true);
  (function () { var base = go; go = function (v) { if (v !== 'training') { S.tfSaidId = null; S.tfSaidUp = false; } return base.apply(this, arguments); }; })();
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
  /* More and Home list the tool. r44Tools is wrapped so nothing about the client decides its line. */
  (function () { var base = r44Tools; r44Tools = function () { var out = base.apply(this, arguments), row = ['training', 'Training and benefits', 'Public training and benefit programs, with links to their official pages.'], at = out.map(function (t) { return t[0]; }).indexOf('fit'); if (at < 0) out.push(row); else out.splice(at, 0, row); return out; }; })();
  /* signing out forgets the filter choices too (the stars go with the r44 store) */
  (function () { var base = r44Wipe; r44Wipe = function () { S.tf = null; return base.apply(this, arguments); }; })();
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
  var CHEER = /^Approved\.|approved\. Thank you\.|^Nice work\. It is on your Applied tab\.|^An offer!/;
  function samCheer() {
    var old = document.querySelector('.r52-cheer'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'r52-cheer'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<img src="/img/sam/sam-cheer.svg" alt="" width="96" height="141">';
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); }, 2300);
  }
  function wrap() {
    if (typeof window.toast !== 'function' || window.toast.r52) return;
    var orig = window.toast;
    var w = function (t) { var r = orig.apply(this, arguments); try { if (CHEER.test(String(t || ''))) samCheer(); } catch (e) {} return r; };
    w.r52 = true; window.toast = w;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrap); else wrap();
  window.r52SamCheer = samCheer;
})();
