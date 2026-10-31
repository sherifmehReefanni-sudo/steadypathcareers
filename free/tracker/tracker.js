/* Steady Path Careers: Job Search Tracker.
   Everything stays in this browser's localStorage. Nothing here sends data anywhere: no fetch, no forms posted, no analytics events. */
(function () {
  'use strict';
  var KEY = 'spc-job-tracker-v1', ST = ['Applied', 'Heard back', 'Interview', 'Offer', 'Closed'];
  var COLS = ['Company', 'Role', 'Link', 'Date applied', 'Follow-up date', 'Status', 'Next step', 'Notes', 'Furthest stage'];
  var d = document, rows = [], canStore = true, editId = null, undo = null, pendingImport = null;
  function $(id) { return d.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- dates (local calendar days, stored as YYYY-MM-DD) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(x) { return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function parseIso(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null;
    var x = new Date(+m[1], +m[2] - 1, +m[3]);
    return x.getFullYear() === +m[1] && x.getMonth() === +m[2] - 1 && x.getDate() === +m[3] ? x : null;
  }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function addDays(s, n) { var x = parseIso(s); if (!x) return ''; x.setDate(x.getDate() + n); return iso(x); }
  function ago(s) { var x = parseIso(s); return x ? Math.round((today() - x) / 864e5) : null; }
  function nice(s) {
    var x = parseIso(s); if (!x) return '';
    var o = { month: 'short', day: 'numeric' }; if (x.getFullYear() !== today().getFullYear()) o.year = 'numeric';
    return x.toLocaleDateString('en-US', o);
  }
  function stage(s) { return { 'Heard back': 1, 'Interview': 2, 'Offer': 3 }[s] || 0; }
  function isFlag(r) { var a = ago(r.applied); return r.status === 'Applied' && a !== null && a >= 14; }
  function isDue(r) { var a = ago(r.applied); return r.status === 'Applied' && a !== null && a >= 7 && a < 14; }
  function followUp(r) { return addDays(r.applied, 7); }

  /* ---------- storage ---------- */
  function str(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n); }
  function uid() { return 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clean(r) {
    r = r || {};
    var s = ST.indexOf(r.status) >= 0 ? r.status : 'Applied';
    var reached = Math.max(stage(s), Math.min(3, Math.max(0, parseInt(r.reached, 10) || 0)));
    return { id: /^[a-z0-9]{4,40}$/i.test(r.id || '') ? r.id : uid(), company: str(r.company, 120), role: str(r.role, 120), link: str(r.link, 600),
      applied: parseIso(r.applied) ? r.applied : '', status: s, next: str(r.next, 160), notes: str(r.notes, 1000), reached: reached, added: +r.added || Date.now() };
  }
  function load() {
    try {
      var t = '__spc_t'; localStorage.setItem(t, '1'); localStorage.removeItem(t);
      var raw = localStorage.getItem(KEY), list = raw ? JSON.parse(raw) : [];
      rows = Array.isArray(list) ? list.map(clean).filter(function (r) { return r.company; }) : [];
    } catch (e) { canStore = false; rows = rows || []; }
    $('trkWarn').hidden = canStore;
  }
  function save() {
    if (!canStore) return;
    try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) { canStore = false; $('trkWarn').hidden = false; }
  }
  function find(id) { for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return i; return -1; }
  function name(r) { return r.company + (r.role ? ', ' + r.role : ''); }

  /* ---------- links: only http(s) becomes a link ---------- */
  function normLink(s) {
    s = str(s, 600); if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(s)) return 'https://' + s;
    return s;
  }
  function linkHtml(r) {
    if (!r.link) return '';
    var u = normLink(r.link);
    if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Open posting<span class="vh"> for ' + esc(name(r)) + ' (opens in a new tab)</span></a>';
    return esc(r.link);
  }

  /* ---------- render ---------- */
  function say(t) { var el = $('trkSay'); el.textContent = ''; setTimeout(function () { el.textContent = t; }, 30); }
  function cell(cls, label, html, tag) {
    tag = tag || 'td';
    var role = tag === 'th' ? 'rowheader' : 'cell';
    return '<' + tag + ' role="' + role + '"' + (tag === 'th' ? ' scope="row"' : '') + ' class="' + cls + (html ? '' : ' empty') + '"><span class="lbl" aria-hidden="true">' + label + '</span><span class="v">' + (html || '<span class="vh">None</span>') + '</span></' + tag + '>';
  }
  function rowHtml(r) {
    var a = ago(r.applied), fu = followUp(r), flag = isFlag(r), due = isDue(r), sid = 'st-' + r.id, nm = esc(name(r));
    var ap = r.applied ? esc(nice(r.applied)) + (a !== null && a >= 0 ? '<span class="muted">' + (a === 0 ? 'today' : a === 1 ? '1 day ago' : a + ' days ago') + '</span>' : '') : '';
    var fuh = fu ? esc(nice(fu)) : '';
    if (flag) fuh += '<span class="tag flag"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path d="M3 15V2h9l-2 3.5L12 9H4.5" fill="currentColor"/></svg>No reply in 14+ days</span>';
    else if (due) fuh += '<span class="tag due"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="2" fill="none"/></svg>Follow up now</span>';
    var sel = '<label class="vh" for="' + sid + '">Status for ' + nm + '</label><select id="' + sid + '" data-act="status" data-id="' + r.id + '">' +
      ST.map(function (s) { return '<option' + (s === r.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';
    var act = '<span class="trk-act"><button type="button" data-act="edit" data-id="' + r.id + '">Edit<span class="vh"> ' + nm + '</span></button><button type="button" class="del" data-act="del" data-id="' + r.id + '">Delete<span class="vh"> ' + nm + '</span></button></span>';
    return '<tr role="row" data-id="' + r.id + '" class="' + (flag ? 'is-flag' : due ? 'is-due' : '') + '">' +
      cell('c-co', 'Company', esc(r.company), 'th') + cell('c-role', 'Role', esc(r.role)) + cell('c-link', 'Link', linkHtml(r)) +
      cell('c-ap', 'Applied', ap) + cell('c-fu', 'Follow up', fuh) + cell('c-st', 'Status', sel) +
      cell('c-nx', 'Next step', esc(r.next)) + cell('c-no', 'Notes', esc(r.notes).replace(/\n/g, '<br>')) + cell('c-ac', 'Actions', act) + '</tr>';
  }
  function sorted() {
    return rows.slice().sort(function (x, y) { return (y.applied || '').localeCompare(x.applied || '') || y.added - x.added; });
  }
  function render() {
    var n = rows.length, rep = 0, ints = 0, flags = 0;
    rows.forEach(function (r) { if (r.reached >= 1) rep++; if (r.reached >= 2) ints++; if (isFlag(r)) flags++; });
    $('nApps').textContent = n; $('nReplies').textContent = rep; $('nInts').textContent = ints;
    $('nRate').textContent = n ? Math.round(rep / n * 100) + '%' : '0%';
    $('statNote').textContent = (flags ? flags + (flags === 1 ? ' job has' : ' jobs have') + ' had no reply for 14 days or more. ' : '') +
      'A reply is any job you mark Heard back, Interview or Offer. It still counts if you close the job later.';
    $('listHead').textContent = 'Your jobs' + (n ? ' (' + n + ')' : '');
    $('tbody').innerHTML = sorted().map(rowHtml).join('');
    $('tbl').hidden = !n; $('empty').hidden = !!n;
    $('bExport').hidden = !n; $('bClear').hidden = !n;
  }

  /* ---------- the add / edit form ---------- */
  function fuHint() {
    var v = $('fDate').value;
    $('fuHint').textContent = parseIso(v) ? 'Follow-up date: ' + nice(addDays(v, 7)) + ' (7 days after you apply).' : 'Pick a date and I work out the follow-up date, 7 days later.';
  }
  function resetForm() {
    editId = null;
    ['fCo', 'fRole', 'fLink', 'fNext', 'fNotes'].forEach(function (k) { $(k).value = ''; });
    $('fDate').value = iso(today()); $('fSt').value = 'Applied';
    $('formHead').textContent = 'Add a job'; $('fSave').textContent = 'Add to my tracker'; $('fCancel').hidden = true;
    clearErr(); fuHint();
  }
  function clearErr() { $('fCo').removeAttribute('aria-invalid'); $('fCoErr').hidden = true; $('fCoErr').textContent = ''; }
  function startEdit(id) {
    var i = find(id); if (i < 0) return; var r = rows[i];
    editId = id;
    $('fCo').value = r.company; $('fRole').value = r.role; $('fLink').value = r.link; $('fDate').value = r.applied;
    $('fSt').value = r.status; $('fNext').value = r.next; $('fNotes').value = r.notes;
    $('formHead').textContent = 'Edit: ' + name(r); $('fSave').textContent = 'Save changes'; $('fCancel').hidden = false;
    clearErr(); fuHint();
    $('fCo').focus();
  }
  function focusRowBtn(id, act) {
    var b = $('tbody').querySelector('[data-act="' + act + '"][data-id="' + id + '"]');
    if (b) b.focus(); else $('listHead').focus();
  }
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var co = str($('fCo').value, 120);
    if (!co) { $('fCo').setAttribute('aria-invalid', 'true'); $('fCoErr').hidden = false; $('fCoErr').textContent = 'Add the company name.'; $('fCo').focus(); return; }
    clearErr();
    var r = { company: co, role: $('fRole').value, link: normLink($('fLink').value), applied: $('fDate').value, status: $('fSt').value, next: $('fNext').value, notes: $('fNotes').value };
    hideUndo();
    if (editId) {
      var i = find(editId); if (i < 0) { resetForm(); return; }
      r.id = editId; r.added = rows[i].added; r.reached = Math.max(rows[i].reached, stage(r.status));
      rows[i] = clean(r); save(); render();
      var id = editId; resetForm(); say('Saved changes to ' + name(rows[i]) + '.'); focusRowBtn(id, 'edit');
    } else {
      r.reached = stage(r.status); r = clean(r); rows.push(r); save(); render(); resetForm();
      say('Added ' + name(r) + '.' + (r.applied ? ' Follow up on ' + nice(followUp(r)) + '.' : ''));
      $('fCo').focus();
    }
  });
  $('fCancel').addEventListener('click', function () { var id = editId; resetForm(); say('Edit cancelled.'); if (id) focusRowBtn(id, 'edit'); });
  $('fDate').addEventListener('input', fuHint); $('fDate').addEventListener('change', fuHint);
  $('fCo').addEventListener('input', function () { if (this.value.trim()) clearErr(); });

  /* ---------- row actions ---------- */
  function hideUndo() { undo = null; $('bUndo').hidden = true; }
  $('tbody').addEventListener('change', function (e) {
    var t = e.target; if (t.getAttribute('data-act') !== 'status') return;
    var id = t.getAttribute('data-id'), i = find(id); if (i < 0) return;
    rows[i].status = ST.indexOf(t.value) >= 0 ? t.value : 'Applied';
    rows[i].reached = Math.max(rows[i].reached, stage(rows[i].status));
    hideUndo(); save(); render();
    var s = $('st-' + id); if (s) s.focus();
    say(name(rows[i]) + ' is now ' + rows[i].status + '.');
  });
  $('tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var id = b.getAttribute('data-id'), i = find(id); if (i < 0) return;
    if (b.getAttribute('data-act') === 'edit') { closePanel(); startEdit(id); return; }
    if (b.getAttribute('data-act') === 'del') {
      var r = rows.splice(i, 1)[0]; if (editId === id) resetForm();
      save(); render();
      undo = { rows: [r] };
      $('bUndo').hidden = false; $('bUndo').textContent = 'Undo'; $('bUndo').setAttribute('aria-label', 'Undo: bring back ' + name(r));
      say('Deleted ' + name(r) + '.');
      $('bUndo').focus();
    }
  });
  $('bUndo').addEventListener('click', function () {
    var u = undo; if (!u) return;
    rows = u.replaced ? u.replaced : rows.concat(u.rows);
    hideUndo(); save(); render();
    if (!u.replaced && u.rows.length === 1) { say('Brought back ' + name(u.rows[0]) + '.'); focusRowBtn(u.rows[0].id, 'del'); }
    else { say('Undone. Your list is back the way it was.'); $('listHead').focus(); }
  });

  /* ---------- a small confirm panel (import choices, delete all) ---------- */
  function openPanel(head, text, btns) {
    $('panelHead').textContent = head; $('panelText').textContent = text;
    $('panelBtns').innerHTML = btns.map(function (b, k) { return '<button type="button" class="btn ' + (b.cls || 'line') + '" data-k="' + k + '">' + esc(b.label) + '</button>'; }).join('');
    $('panelBtns').onclick = function (e) { var x = e.target.closest('button[data-k]'); if (x) btns[+x.getAttribute('data-k')].run(); };
    $('panel').hidden = false; $('panelHead').focus();
  }
  function closePanel(focusId) { $('panel').hidden = true; $('panelBtns').innerHTML = ''; pendingImport = null; if (focusId) $(focusId).focus(); }
  $('panel').addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePanel('listHead'); say('Cancelled.'); } });

  $('bClear').addEventListener('click', function () {
    var n = rows.length; if (!n) return;
    openPanel('Delete all ' + n + (n === 1 ? ' job' : ' jobs') + ' from this device?', 'Export a CSV first if you want a copy. You can undo this until you make another change.', [
      { label: 'Delete all', cls: 'gold', run: function () { var old = rows; rows = []; save(); render(); closePanel(); undo = { rows: old, replaced: old }; $('bUndo').hidden = false; $('bUndo').removeAttribute('aria-label'); $('bUndo').textContent = 'Undo'; say('Deleted all ' + old.length + ' jobs.'); $('bUndo').focus(); } },
      { label: 'Cancel', run: function () { closePanel('bClear'); say('Nothing deleted.'); } }
    ]);
  });

  /* ---------- CSV export ---------- */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; /* stops a spreadsheet from running it as a formula */
    return /[",\r\n]/.test(v) || v !== v.trim() ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv() {
    var names = ['Applied', 'Heard back', 'Interview', 'Offer'];
    var lines = [COLS.join(',')].concat(sorted().map(function (r) {
      return [r.company, r.role, r.link, r.applied, followUp(r), r.status, r.next, r.notes, names[r.reached]].map(csvCell).join(',');
    }));
    return lines.join('\r\n') + '\r\n';
  }
  $('bExport').addEventListener('click', function () {
    var fn = 'steady-path-tracker-' + iso(today()) + '.csv';
    var url = URL.createObjectURL(new Blob(['﻿' + toCsv()], { type: 'text/csv;charset=utf-8' }));
    var a = d.createElement('a'); a.href = url; a.download = fn; a.hidden = true; d.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    say('Downloaded ' + fn + ' with ' + rows.length + (rows.length === 1 ? ' job.' : ' jobs.'));
  });

  /* ---------- CSV import ---------- */
  function parseCsv(text) {
    var out = [], row = [], f = '', q = false, i = 0, c;
    text = String(text).replace(/^﻿/, '');
    for (; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"' && f === '') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); out.push(row); }
    return out.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }
  function unguard(v) { v = String(v == null ? '' : v); return /^'[=+\-@\t\r]/.test(v) ? v.slice(1) : v; }
  function toIsoDate(v) {
    v = String(v || '').trim(); if (!v) return '';
    if (parseIso(v)) return v;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (m) { var x0 = new Date(+m[1], +m[2] - 1, +m[3]); return x0.getMonth() === +m[2] - 1 && x0.getDate() === +m[3] ? iso(x0) : ''; }
    m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/.exec(v);
    if (m) { var y = +m[3] < 100 ? 2000 + +m[3] : +m[3], x = new Date(y, +m[1] - 1, +m[2]); return x.getMonth() === +m[1] - 1 && x.getDate() === +m[2] ? iso(x) : ''; }
    if (/[a-z]/i.test(v)) { var t = new Date(v); if (!isNaN(t)) return iso(t); }
    return '';
  }
  function headerIndex(h) {
    var map = {}, norm = h.map(function (x) { return String(x).toLowerCase().replace(/[^a-z]/g, ''); });
    var want = { company: ['company', 'employer', 'companyname'], role: ['role', 'jobtitle', 'title', 'position', 'job'], link: ['link', 'url', 'posting', 'joblink', 'postinglink'],
      applied: ['dateapplied', 'applied', 'date', 'applieddate', 'appliedon'], status: ['status', 'stage'], next: ['nextstep', 'next', 'nextsteps'], notes: ['notes', 'note', 'comments'], reached: ['furtheststage'] };
    Object.keys(want).forEach(function (k) { for (var i = 0; i < norm.length; i++) if (want[k].indexOf(norm[i]) >= 0) { map[k] = i; break; } });
    return map;
  }
  function statusOf(v) {
    v = String(v || '').trim().toLowerCase();
    for (var i = 0; i < ST.length; i++) if (ST[i].toLowerCase() === v) return ST[i];
    return 'Applied';
  }
  function readImport(text) {
    var all = parseCsv(text), h = -1, map;
    for (var i = 0; i < Math.min(all.length, 10); i++) { map = headerIndex(all[i]); if (map.company !== undefined) { h = i; break; } }
    if (h < 0) return { error: 'I could not find a Company column. The first row needs column names like Company, Role and Date applied.' };
    var got = [], skipped = 0;
    all.slice(h + 1, h + 2001).forEach(function (c) {
      var g = function (k) { return map[k] === undefined ? '' : unguard(c[map[k]]); };
      var co = str(g('company'), 120); if (!co) { skipped++; return; }
      var s = statusOf(g('status')), reached = stage(statusOf(g('reached')));
      got.push(clean({ company: co, role: g('role'), link: normLink(g('link')), applied: toIsoDate(g('applied')), status: s, next: g('next'), notes: g('notes'), reached: Math.max(reached, stage(s)) }));
    });
    return { rows: got, skipped: skipped };
  }
  function keyOf(r) { return [r.company, r.role, r.applied].join('|').toLowerCase(); }
  $('bImport').addEventListener('click', function () { $('csvFile').value = ''; $('csvFile').click(); });
  $('csvFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (f.size > 2e6) { say('That file is over 2 MB. Pick a smaller CSV file.'); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var res = readImport(fr.result);
      if (res.error) { openPanel('That file did not work', res.error, [{ label: 'OK', run: function () { closePanel('bImport'); } }]); return; }
      if (!res.rows.length) { openPanel('No jobs found', 'The file has column names but no rows with a company.', [{ label: 'OK', run: function () { closePanel('bImport'); } }]); return; }
      pendingImport = res.rows;
      var n = res.rows.length, txt = 'Found ' + n + (n === 1 ? ' job' : ' jobs') + ' in ' + f.name + '.' + (res.skipped ? ' ' + res.skipped + ' rows without a company were left out.' : '');
      var btns = [{ label: rows.length ? 'Add to my tracker' : 'Import ' + n + (n === 1 ? ' job' : ' jobs'), cls: 'gold', run: function () { doImport(false); } }];
      if (rows.length) btns.push({ label: 'Replace my tracker', run: function () { doImport(true); } });
      btns.push({ label: 'Cancel', run: function () { closePanel('bImport'); say('Nothing imported.'); } });
      openPanel('Import this file?', txt + (rows.length ? ' Add them to the ' + rows.length + ' already here, or replace your list with the file.' : ''), btns);
    };
    fr.onerror = function () { say('I could not read that file.'); };
    fr.readAsText(f);
  });
  function doImport(replace) {
    var inc = pendingImport || [], old = rows.slice(), added = 0, dup = 0;
    if (replace) { rows = inc.slice(); added = inc.length; }
    else {
      var seen = {}; rows.forEach(function (r) { seen[keyOf(r)] = 1; });
      inc.forEach(function (r) { if (seen[keyOf(r)]) { dup++; return; } seen[keyOf(r)] = 1; rows.push(r); added++; });
    }
    save(); render(); closePanel();
    undo = { rows: [], replaced: old }; $('bUndo').hidden = false; $('bUndo').removeAttribute('aria-label'); $('bUndo').textContent = 'Undo import';
    say((replace ? 'Replaced your list with ' : 'Added ') + added + (added === 1 ? ' job' : ' jobs') + '.' + (dup ? ' Skipped ' + dup + ' already in your tracker.' : ''));
    $('listHead').focus();
  }

  /* Another tab changed the list: show the new list. */
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); render(); } });

  load(); resetForm(); render();
})();
