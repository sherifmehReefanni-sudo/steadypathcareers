/* Steady Path Careers: Ghost Job Checker (r19c).
   Greenhouse and Lever links are checked here in the browser, straight against their public job APIs (both answer any origin).
   Workable and Ashby links go to my Apps Script checker (action ghostCheck, v1.31). Until it is live, the old API answers
   "unknown action" and the page says the check is coming soon.
   Privacy: the pasted link is never put in the address bar, localStorage, sessionStorage, cookies or analytics. The input has no
   name, so the form can never send it anywhere by itself. The rules below copy the live posting check (postingSource_ and
   postingVerdict_ in Code_v1.29.gs) so both give the same answer for the same job-system reply. */
(function (root) {
  'use strict';
  var GC = {};
  GC.API = 'https://script.google.com/macros/s/AKfycbywIXNDqOMhCuyNx9px8cKGQy4zsuDwxihOF_jMr_jTxv8QOy2OxBrlXC9WffPWZcU/exec';
  GC.HOSTS = ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'jobs.lever.co', 'jobs.ashbyhq.com', 'jobs.workable.com', 'apply.workable.com'];
  GC.NAMES = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workable: 'Workable', workableAts: 'Workable' };
  GC.BROWSER = { greenhouse: true, lever: true };
  GC.SERVER = { ashby: true, workable: true, workableAts: true };

  /* ---------- reading the link (pure) ---------- */
  GC.clean = function (raw) {
    var u = String(raw == null ? '' : raw).trim();
    var m = /https?:\/\/\S+/i.exec(u);
    var bare = /(^|\s)([a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*)/i.exec(u);
    if (m && m.index > 0) u = m[0];
    else if (!m && bare && /\s/.test(u)) u = bare[2];
    else if (/\s/.test(u)) u = u.split(/\s+/)[0];
    if (u && !/^[a-z][a-z0-9+.-]*:/i.test(u) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(u)) u = 'https://' + u;
    return u.replace(/[).,;'"\]>]+$/, '');
  };
  /* Same patterns as postingSource_ in Code_v1.29.gs, behind the same strict host check as ghostParse_ in Code_v1.31.gs. */
  GC.parse = function (raw) {
    var u = GC.clean(raw);
    if (!u) return { kind: 'empty' };
    if (u.length > 600 || /[\s\\\u0000-\u001f\u007f]/.test(u)) return { kind: 'bad' };
    var m = /^(https?):\/\/([^\/?#]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i.exec(u);
    if (!m) return { kind: 'bad' };
    var host = m[2].toLowerCase(), p = m[3] || '/', q = m[4] || '', site = GC.site(host);
    if (/[@:\[\]%]/.test(host) || GC.HOSTS.indexOf(host) < 0) return { kind: 'other', site: /[@:\[\]%]/.test(host) ? '' : site };
    if (p.indexOf('%') >= 0 || /(^|\/)\.\.?(\/|$)/.test(p)) return { kind: 'other', site: site };
    var s = 'https://' + host + p + q, r;
    if ((r = s.match(/^https?:\/\/(?:job-boards|boards)\.greenhouse\.io\/([A-Za-z0-9_-]+)\/jobs\/(\d+)/i))) return { kind: 'greenhouse', board: r[1].toLowerCase(), id: r[2], url: s };
    if ((r = s.match(/^https?:\/\/(?:job-boards|boards)\.greenhouse\.io\/embed\/job_app\?(?=(?:.*&)?for=([A-Za-z0-9_-]+)(?:&|#|$))(?=(?:.*&)?token=(\d+)(?:&|#|$))/i))) return { kind: 'greenhouse', board: r[1].toLowerCase(), id: r[2], url: s };
    if ((r = s.match(/^https?:\/\/jobs\.lever\.co\/([A-Za-z0-9_.-]+)\/([0-9a-f-]{36})/i)) && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(r[1]) && r[1].indexOf('..') < 0) return { kind: 'lever', co: r[1], id: r[2].toLowerCase(), url: s };
    if ((r = s.match(/^https?:\/\/jobs\.ashbyhq\.com\/([A-Za-z0-9_.%-]+)\/([0-9a-f-]{36})/i)) && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(r[1]) && r[1].indexOf('..') < 0) return { kind: 'ashby', url: s };
    if ((r = s.match(/^https?:\/\/jobs\.workable\.com\/(?:jobs|view)\/([A-Za-z0-9-]{16,40})(?:[\/?#.]|$)/i))) return { kind: 'workable', url: s };
    if ((r = s.match(/^https?:\/\/apply\.workable\.com\/([A-Za-z0-9_-]+)\/j\/([A-Za-z0-9]{6,16})(?:[\/?#]|$)/i)) && r[1].toLowerCase() !== 'api') return { kind: 'workableAts', url: s };
    if ((r = s.match(/^https?:\/\/apply\.workable\.com\/j\/([A-Za-z0-9]{6,16})(?:[\/?#]|$)/i))) return { kind: 'workableAts', url: s };
    return { kind: 'other', site: site, notPosting: true };
  };
  /* Job systems I check, but only on the exact hosts in GC.HOSTS (an EU or company host of the same system is not one of them). */
  GC.SUPPORTED_SITES = ['Greenhouse', 'Lever', 'Workable', 'Ashby'];
  GC.site = function (host) {
    host = String(host || '').toLowerCase();
    var known = [[/(^|\.)linkedin\.com$/, 'LinkedIn'], [/(^|\.)indeed\.com$/, 'Indeed'], [/(^|\.)(myworkdayjobs|myworkdaysite|workday)\.com$/, 'Workday'],
      [/(^|\.)ziprecruiter\.com$/, 'ZipRecruiter'], [/(^|\.)glassdoor\.com$/, 'Glassdoor'], [/(^|\.)monster\.com$/, 'Monster'], [/(^|\.)greenhouse\.io$/, 'Greenhouse'],
      [/(^|\.)lever\.co$/, 'Lever'], [/(^|\.)workable\.com$/, 'Workable'], [/(^|\.)ashbyhq\.com$/, 'Ashby']];
    for (var i = 0; i < known.length; i++) if (known[i][0].test(host)) return known[i][1];
    return '';
  };

  /* ---------- the check rules (pure; ports of postingVerdict_ with no job title) ---------- */
  function json(b) { try { return JSON.parse(b); } catch (e) { return null; } }
  GC.verdict = function (src, r, list) {
    var code = r ? r.code : 0, body = r ? String(r.body || '') : '';
    if (src.kind === 'greenhouse') {
      if (code === 200) { var g = json(body); return g && String(g.id) === src.id ? 'open' : 'unknown'; }
      if (code !== 404) return 'unknown';
      var L = list && list.code === 200 ? json(list.body) : null;
      if (L && Array.isArray(L.jobs)) L.jobs = L.jobs.filter(function (x) { return x && typeof x === 'object'; });
      if (!L || !Array.isArray(L.jobs)) return 'unknown';
      if (L.jobs.some(function (x) { return String(x.id) === src.id; })) return 'open';
      if (!L.jobs.length) return 'unknown';      /* an empty board: paused or moved, so not proof the job closed */
      return 'closed';
    }
    if (src.kind === 'lever') {
      if (code === 200) return 'open';
      if (code !== 404) return 'unknown';
      var LL = list && list.code === 200 ? json(list.body) : null;
      if (!Array.isArray(LL) || !LL.length) return 'unknown';
      return 'closed';
    }
    return 'unknown';
  };
  function text(s) { return typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : ''; }
  GC.day = function (v, now) {
    var t = typeof v === 'number' ? v : (typeof v === 'string' && /^\d{4}-\d\d-\d\d/.test(v) ? Date.parse(v) : NaN);
    if (!isFinite(t) || t < Date.UTC(2000, 0, 1) || t > (now || Date.now()) + 86400000) return '';
    return typeof v === 'string' ? v.slice(0, 10) : new Date(t).toISOString().slice(0, 10);
  };
  GC.details = function (src, r) {
    var j = r && r.code === 200 ? json(r.body) : null;
    if (!j || typeof j !== 'object') return {};
    if (src.kind === 'greenhouse') return { title: text(j.title), company: text(j.company_name), postedOn: GC.day(j.first_published), place: text(j.location && j.location.name) };
    if (src.kind === 'lever') return { title: text(j.text), postedOn: GC.day(j.createdAt), place: text(j.categories && j.categories.location) };
    return {};
  };
  /* Same loose title key as looseTitle_ in the posting check. */
  var ABBR = { sr: 'senior', jr: 'junior', mgr: 'manager', assoc: 'associate', asst: 'assistant', rep: 'representative', exec: 'executive', acct: 'account', dir: 'director', ii: '2', iii: '3', i: '1' };
  GC.looseTitle = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(String).map(function (w) { return ABBR[w] || w; }).sort().join(' '); };
  /* Same place rule as the posting check (cityOf_ and stateOf_ in Code_v1.29.gs): the city AND the state must both be named and match. */
  var STATES = { alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca', colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga', hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc', 'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy', 'district of columbia': 'dc' };
  GC.city = function (loc) { return String(loc || '').split(/[,(]/)[0].trim().toLowerCase(); };
  GC.state = function (loc) { var s = String(loc || '').split(',')[1]; s = String(s || '').replace(/\(.*$/, '').replace(/\d{5}(-\d{4})?/, '').trim().toLowerCase(); return STATES[s] || (/^[a-z]{2}$/.test(s) ? s : ''); };
  /* Other live listings with the same title in the same city and state on the same board. Pure. Returns a count, -1 when the
     list could not be read, or -2 when this posting does not name a city and state (so there is nothing fair to compare). */
  GC.repeats = function (src, d, list) {
    var L = list && list.code === 200 ? json(list.body) : null, jobs = src.kind === 'greenhouse' ? (L && L.jobs) : L;
    if (!Array.isArray(jobs) || !d.title) return -1;
    var t = GC.looseTitle(d.title), c = GC.city(d.place), st = GC.state(d.place);
    if (!c || !st) return -2;
    return jobs.filter(function (x) {
      if (!x || typeof x !== 'object' || String(x.id).toLowerCase() === src.id) return false;
      var xt = src.kind === 'greenhouse' ? x.title : x.text, xl = src.kind === 'greenhouse' ? (x.location && x.location.name) : (x.categories && x.categories.location);
      return GC.looseTitle(xt) === t && GC.city(xl) === c && GC.state(xl) === st;
    }).length;
  };
  GC.boardUrl = function (src) { return src.kind === 'greenhouse' ? 'https://job-boards.greenhouse.io/' + src.board : src.kind === 'lever' ? 'https://jobs.lever.co/' + src.co : ''; };

  /* ---------- talking to the job systems and to my checker ---------- */
  function get(fetchFn, url, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 12000) : 0;
    return fetchFn(url, { method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: ctl ? ctl.signal : undefined })
      .then(function (res) { return res.text().then(function (b) { clearTimeout(timer); return { code: res.status, body: b }; }); })
      .catch(function () { clearTimeout(timer); return { code: 0, body: '' }; });
  }
  GC.apiUrl = function (src) {
    if (src.kind === 'greenhouse') return 'https://boards-api.greenhouse.io/v1/boards/' + src.board + '/jobs/' + src.id;
    if (src.kind === 'lever') return 'https://api.lever.co/v0/postings/' + src.co + '/' + src.id;
    return '';
  };
  GC.listUrl = function (src, place) {
    if (src.kind === 'greenhouse') return 'https://boards-api.greenhouse.io/v1/boards/' + src.board + '/jobs';
    if (src.kind === 'lever') return 'https://api.lever.co/v0/postings/' + src.co + '?mode=json&limit=100' + (place ? '&location=' + encodeURIComponent(place) : '');
    return '';
  };
  /* Browser check. Resolves { status, ats, postedOn?, title?, company?, board?, src, d } and never rejects. */
  GC.checkHere = function (src, fetchFn) {
    var out = { ats: src.kind, status: 'unknown', reason: 'unclear', board: GC.boardUrl(src) };
    return get(fetchFn, GC.apiUrl(src)).then(function (r) {
      if (r.code === 0) { out.reason = 'unreachable'; return out; }
      var next = r.code === 404 ? get(fetchFn, GC.listUrl(src)) : Promise.resolve(null);
      return next.then(function (list) {
        out.status = GC.verdict(src, r, list);
        if (out.status !== 'unknown') out.reason = '';
        if (out.status === 'open') { var d = GC.details(src, r); out.title = d.title; out.company = d.company; out.postedOn = d.postedOn; out.place = d.place; }
        return out;
      });
    });
  };
  /* The repeat-listing look, run after the result is on screen. Resolves a count or -1. */
  GC.repeatLook = function (src, res, fetchFn) {
    if (res.status !== 'open' || !res.title) return Promise.resolve(-1);
    if (!GC.city(res.place) || !GC.state(res.place)) return Promise.resolve(-2);   /* no city and state: nothing fair to compare, so no request */
    return get(fetchFn, GC.listUrl(src, src.kind === 'lever' ? res.place : '')).then(function (list) { return GC.repeats(src, { title: res.title, place: res.place }, list); });
  };
  /* Server check through my Apps Script. The body is sent as text/plain, like every other call to that API (no preflight). */
  GC.checkThere = function (src, fetchFn, sid) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 25000) : 0;
    return fetchFn(GC.API, { method: 'POST', body: JSON.stringify({ action: 'ghostCheck', url: src.url, sid: sid }), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (o) {
        clearTimeout(timer);
        var ats = src.kind === 'workableAts' ? 'workable' : src.kind;
        if (!o || typeof o !== 'object') return { ats: ats, status: 'unknown', reason: 'down' };
        if (o.ok === false && o.error === 'unknown action') return { ats: ats, status: 'unknown', reason: 'soon' };
        if (o.ok === false && o.error === 'rate') return { ats: ats, status: 'unknown', reason: 'rate' };
        if (o.ok === false && o.error === 'busy') return { ats: ats, status: 'unknown', reason: 'busy' };
        if (o.ok === false && o.error === 'off') return { ats: ats, status: 'unknown', reason: 'paused' };
        if (o.ok !== true || ['open', 'closed', 'unknown'].indexOf(o.status) < 0) return { ats: ats, status: 'unknown', reason: 'down' };
        /* v1.32 adds reason:"limit" when my own time or request limit stopped the check; older replies have no reason */
        return { ats: ats, status: o.status, reason: o.status === 'unknown' ? (o.reason === 'limit' ? 'limit' : 'unclear') : '', title: text(o.title), company: text(o.company), postedOn: GC.day(o.postedOn) };
      })
      .catch(function () { clearTimeout(timer); return { ats: src.kind === 'workableAts' ? 'workable' : src.kind, status: 'unknown', reason: 'down' }; });
  };
  GC.check = function (raw, fetchFn, sid) {
    var src = GC.parse(raw);
    if (src.kind === 'empty' || src.kind === 'bad') return Promise.resolve({ status: 'unknown', reason: src.kind, src: src });
    if (src.kind === 'other') return Promise.resolve({ status: 'unknown', reason: 'unsupported', site: src.site, src: src });
    var p = GC.BROWSER[src.kind] ? GC.checkHere(src, fetchFn) : GC.checkThere(src, fetchFn, sid);
    return p.then(function (res) { res.src = src; return res; });
  };
  GC.daysAgo = function (ymd, now) { var t = Date.parse(ymd + 'T12:00:00Z'); return isFinite(t) ? Math.max(0, Math.floor(((now || Date.now()) - t) / 86400000)) : -1; };
  GC.fmtDay = function (ymd) {
    var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], p = String(ymd).split('-');
    return M[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = GC; return; }
  root.SPGhost = GC;

  /* ---------- the page ---------- */
  var d = document, form = d.getElementById('gc-form');
  if (!form) return;
  var input = d.getElementById('gc-url'), btn = d.getElementById('gc-go'), out = d.getElementById('gc-out'), say = d.getElementById('gc-say'), busy = false, run = 0;
  var sid = ''; try { var a = new Uint8Array(12); crypto.getRandomValues(a); sid = Array.prototype.map.call(a, function (x) { return (x % 36).toString(36); }).join(''); } catch (e) { sid = ''; }   /* lives only in this page's memory */
  var LABEL = { open: 'Open on the employer\'s site', closed: 'Closed or removed', unknown: 'Can\'t check this link' };
  var POSTED = { greenhouse: 'First published', lever: 'Added to their hiring system', ashby: 'Published', workable: 'Posted' };

  function el(tag, cls, txt) { var e = d.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function link(href, txt) { var a = el('a', '', txt); a.href = href; a.rel = 'noopener noreferrer'; a.target = '_blank'; return a; }
  function fact(dl, k, v) { var w = el('div'); w.appendChild(el('dt', '', k)); var dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); w.appendChild(dd); dl.appendChild(w); return dd; }
  function manual(card, site, lead, guide) {
    var box = el('div', 'gc-manual');
    box.appendChild(el('h3', '', lead || 'I can\'t check this kind of link yet. Here is how to check it yourself'));
    var ol = el('ol');
    ol.appendChild(el('li', '', 'Find the same job on the company\'s own careers page. Search the company name plus "careers". If the job is not there, be careful.'));
    var li2 = el('li', '', 'Check the posting date. ');
    if (site === 'LinkedIn') li2.appendChild(d.createTextNode('LinkedIn shows how long ago the job was posted near the top of the posting, and says "Reposted" when the employer posted it again.'));
    else if (site === 'Indeed') li2.appendChild(d.createTextNode('Indeed shows how long ago a job was posted in its search results. A job that says 30+ days is worth a closer look.'));
    else if (site === 'Workday') li2.appendChild(d.createTextNode('Workday job pages show when the job was posted near the job title.'));
    else li2.appendChild(d.createTextNode('A job that has been up for months, or keeps coming back with a new date, is worth a closer look.'));
    ol.appendChild(li2);
    ol.appendChild(el('li', '', 'Search the job title plus the company name. If the same job shows up posted again and again over months, ask the recruiter if it is still being filled before you spend an evening on it.'));
    box.appendChild(ol);
    if (guide) { var p = el('p', 'gc-more'); p.appendChild(d.createTextNode('More signs to watch for: ')); var g = el('a', '', 'how to spot a fake job posting'); g.href = '/guides/fake-job-postings/'; p.appendChild(g); p.appendChild(d.createTextNode('.')); box.appendChild(p); }
    card.appendChild(box);
  }
  function render(res) {
    var st = res.status, card = el('div', 'gc-card'), src = res.src || {}, name = GC.NAMES[src.kind] || '', summary = LABEL[st];
    card.setAttribute('data-state', st);
    var head = el('p', 'gc-label'); head.appendChild(el('span', 'gc-dot')); head.appendChild(d.createTextNode(LABEL[st])); card.appendChild(head);
    if (res.title) card.appendChild(el('p', 'gc-title', res.title));
    var who = [res.company, name ? 'checked on ' + name : ''].filter(Boolean).join(', ');
    if (st !== 'unknown' && who) card.appendChild(el('p', 'gc-who', who.charAt(0).toUpperCase() + who.slice(1)));
    if (st === 'open') {
      var dl = el('dl', 'gc-facts');
      fact(dl, 'Still open?', 'Yes. ' + name + ' lists this job as live right now.');
      if (res.postedOn) {
        var n = GC.daysAgo(res.postedOn);
        fact(dl, 'How long it has been up', (POSTED[res.ats] || 'Posted') + ' on ' + GC.fmtDay(res.postedOn) + (n >= 0 ? ', ' + (n === 0 ? 'today' : n === 1 ? '1 day ago' : n + ' days ago') : '') + '.' + (n > 60 ? ' That is a long time for one opening. It can still be real, so ask the recruiter if it is still being filled.' : ''));
        if (n >= 0) summary += '. Up for ' + n + (n === 1 ? ' day' : ' days');
      } else fact(dl, 'How long it has been up', name + ' does not share the posting date for this link.');
      var rep = GC.BROWSER[src.kind] ? fact(dl, 'Looks reposted?', 'Looking at their other listings...') : fact(dl, 'Looks reposted?', 'I can\'t tell for ' + name + ' links yet.');
      card.appendChild(dl);
      if (GC.BROWSER[src.kind]) GC.repeatLook(src, res, root.fetch.bind(root)).then(function (c) {
        rep.textContent = c === -2 ? 'I can\'t tell. This posting doesn\'t name a city and state, so I have nothing fair to compare it with.' : c < 0 ? 'I couldn\'t compare it with their other listings this time.' : c === 0 ? 'No. I found no second listing with the same title in the same place on their board.' : 'Maybe. They list the same title in the same place ' + (c === 1 ? 'once more' : c + ' more times') + '. That can mean more than one opening, or the same job posted again.';
      });
      card.appendChild(el('p', 'gc-note', 'Open on their system is a good sign, not a promise. A job can stay listed after the employer has stopped looking.'));
    } else if (st === 'closed') {
      var dl2 = el('dl', 'gc-facts');
      fact(dl2, 'Still open?', 'No. ' + name + ' no longer lists this job.');
      fact(dl2, 'Looks reposted?', 'I can\'t tell once a posting is gone. Search the title on their careers page to see if it came back under a new link.');
      card.appendChild(dl2);
      if (res.board) { var pb = el('p', 'gc-note'); pb.appendChild(d.createTextNode('See what they have open now: ')); pb.appendChild(link(res.board, res.board.replace(/^https:\/\//, ''))); card.appendChild(pb); }
    } else {
      var why = {
        empty: 'Paste a job posting link first.',
        bad: 'That doesn\'t look like a web link. Copy the full address of the job posting and paste it here.',
        soon: 'This check is coming soon for ' + name + ' links.',
        rate: 'A lot of links are being checked right now. Please try again in a few minutes.',
        busy: 'A lot of people are checking links right now. Please try again in a minute.',
        down: 'I couldn\'t reach my checker just now. Try again in a minute.',
        paused: 'Checks for ' + name + ' links are paused right now. Please try again later.',
        unreachable: 'I couldn\'t reach ' + (name || 'the job system') + ' just now. Try again in a minute.',
        limit: 'I ran out of time on my side before I got a clear answer. Try again later, or open the posting and look for an Apply button.',
        unclear: 'I couldn\'t get a clear answer this time. Try again later, or open the posting and look for an Apply button.'
      }[res.reason];
      if (res.reason === 'unsupported') {
        if (res.site && !res.src.notPosting && GC.SUPPORTED_SITES.indexOf(res.site) >= 0) card.appendChild(el('p', 'gc-why', 'This kind of ' + res.site + ' link isn\'t one I can check yet.'));
        else if (res.site && !res.src.notPosting) card.appendChild(el('p', 'gc-why', res.site + ' links are not on my list yet.'));
        else if (res.src && res.src.notPosting) card.appendChild(el('p', 'gc-why', 'This looks like a ' + (res.site || 'job system') + ' page, but not a single job posting. Open the job itself and copy that link.'));
        manual(card, res.site, '', true);
      } else {
        if (why) card.appendChild(el('p', 'gc-why', why));
        var wait = res.reason === 'rate' || res.reason === 'busy', blip = wait || { down: 1, unreachable: 1, paused: 1, soon: 1, limit: 1 }[res.reason];   /* a blip on my side, or not live yet: the scam guide is not the point */
        if (res.reason !== 'empty' && res.reason !== 'bad') manual(card, '', wait ? 'While you wait, here is how to check it yourself' : 'Here is how to check it yourself', !blip);
      }
      if (why) summary += '. ' + why;
    }
    out.innerHTML = ''; out.appendChild(card); out.hidden = false;
    say.textContent = summary;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var raw = input.value, src = GC.parse(raw);
    if (src.kind === 'empty' || src.kind === 'bad') { render({ status: 'unknown', reason: src.kind, src: src }); input.focus(); return; }
    busy = true; var me = ++run; btn.setAttribute('aria-disabled', 'true'); btn.setAttribute('aria-busy', 'true'); form.classList.add('is-busy');
    say.textContent = 'Checking ' + (GC.NAMES[src.kind] ? 'with ' + GC.NAMES[src.kind] : 'the link') + '...';
    GC.check(raw, root.fetch.bind(root), sid).then(function (res) {
      if (me !== run) return;
      render(res);
    }).then(function () { busy = false; btn.removeAttribute('aria-disabled'); btn.removeAttribute('aria-busy'); form.classList.remove('is-busy'); });
  });
})(typeof window !== 'undefined' ? window : this);
