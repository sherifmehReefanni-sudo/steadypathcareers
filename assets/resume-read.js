/* Steady Path Careers: the resume reader, shared by the intake (assets/intake2.js) and the portal's "Your resume" card
   (assets/portal-app.js). Nov 19, 2026: moved here from intake2.js unchanged, so both read a resume the same way. The file is
   read on this device only; pdf.js and mammoth load from cdnjs when a PDF or DOCX is chosen. .doc and .rtf have no reader here
   (fileText rejects them), so callers upload them without suggestions.
   window.SPResume = { fileText(file) -> Promise<text>, parse(text) -> profile, parseFull(text) -> { profile, jobs } }
   parse(text) is the intake's parseResume (same output); parseFull also returns every job it found ({ title, employer, from, to,
   current }, newest first as written), which the portal uses for "titles held". Nothing here sends anything anywhere. */
(function () {
  'use strict';
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  var LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfw: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    docx: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
  };
  var loaded = {};
  function load(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { delete loaded[src]; no(new Error('load')); }; document.head.appendChild(s); });
    return loaded[src];
  }
  function fileText(f) {
    var name = String(f.name || '').toLowerCase();
    var buf = function () { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsArrayBuffer(f); }); };
    if (/\.pdf$/.test(name) || f.type === 'application/pdf') {
      return load(LIBS.pdf).then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = LIBS.pdfw;
        return buf().then(function (b) { return lib.getDocument({ data: new Uint8Array(b) }).promise; }).then(function (doc) {
          var pages = []; for (var i = 1; i <= Math.min(doc.numPages, 6); i++) pages.push(i);
          return Promise.all(pages.map(function (p) { return doc.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            var lines = [], y = null, line = '';
            tc.items.forEach(function (it) { var yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { lines.push(line); line = ''; } line += (line && !/\s$/.test(line) && !/^\s/.test(it.str) ? ' ' : '') + it.str; y = yy; if (it.hasEOL) { lines.push(line); line = ''; y = null; } });
            if (line) lines.push(line); return lines.join('\n');
          }); })).then(function (t) { return t.join('\n'); });
        });
      });
    }
    if (/\.docx$/.test(name)) return load(LIBS.docx).then(function () { return buf().then(function (b) { return window.mammoth.extractRawText({ arrayBuffer: b }); }).then(function (r) { return r.value; }); });
    if (/\.txt$/.test(name)) return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = no; r.readAsText(f); });
    return Promise.reject(new Error('type'));
  }
  var MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
  var DATE = '(?:' + MONTH + '\\s+)?(?:19|20)\\d\\d|\\d{1,2}\\/(?:19|20)?\\d\\d';
  var RANGE = new RegExp('(' + DATE + ')\\s*(?:-|\u2013|\u2014|to|until|through)\\s*(' + DATE + '|present|current|now|today)', 'i');
  function yearOf(s) { var m = String(s).match(/(19|20)\d\d/); if (m) return +m[0]; var m2 = String(s).match(/\/(\d\d)$/); return m2 ? 2000 + +m2[1] : NaN; }
  /* Pure: resume text in, best guesses out. Every guess is shown to the client to confirm or change; nothing is kept silently. */
  function parseFull(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(String);
    var out = { title: '', employer: '', current: '', years: '', employers: [], education: '', school: '', certs: [], linkedin: '' };
    var li = String(text).match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+/i); if (li) out.linkedin = (/^https?:/i.test(li[0]) ? '' : 'https://') + li[0].replace(/^(?:https?:\/\/)?(?:www\.)?/i, 'www.');
    var jobs = [], firstYear = NaN, lastYear = NaN, nowY = new Date().getFullYear(), prevJ = -1;
    /* Sections (finding 6): a heading is a short line that is only a section name. Jobs are read from Experience sections and from
       lines before any heading; Education, Skills, Certifications and the like are skipped wherever they sit, so an Education or
       Skills block above Experience no longer ends the job scan. */
    var SEC = /^(?:((?:professional |work |relevant |career |employment )?(?:experience|history)|employment(?: history)?)|(education|academic background|training)|((?:technical |core |key )?skills|core competencies|competencies|areas of expertise|expertise)|(certifications?|licen[sc]es?|credentials)|(summary|professional summary|profile|professional profile|objective|career objective|about me)|(volunteer(?:ing| work| experience)?|awards|honors|projects|languages|interests|references|additional information|activities|publications))(?:\s+(?:and|&)\s+[a-z ]{3,30})?\s*:?$/i;
    var secOf = [], kind = '';
    for (var i = 0; i < lines.length; i++) {
      var hm = lines[i].length <= 48 ? lines[i].match(SEC) : null;
      if (hm) { kind = hm[1] ? 'exp' : hm[2] ? 'edu' : hm[3] ? 'skills' : hm[4] ? 'cert' : hm[5] ? 'summary' : 'other'; secOf.push('head'); }
      else secOf.push(kind || 'none');
    }
    function inJobs(n) { return secOf[n] === 'exp' || secOf[n] === 'none'; }
    var stopAt = lines.length;
    var ROLE = /\b(dentist|physician|doctor|nurse|assistant|associate|specialist|technician|tech|executive|manager|analyst|representative|rep|lead|director|engineer|coordinator|teacher|driver|officer|consultant|administrator|admin|clerk|agent|supervisor|developer|accountant|bookkeeper|paralegal|attorney|producer|underwriter|adjuster|therapist|hygienist|operator|associate|intern|owner|founder|president|cashier|server|electrician|plumber|carpenter|welder|mechanic|designer|writer|recruiter|generalist|advisor|counselor)\b/i;
    var ORG = /\b(inc|llc|corp|corporation|company|co\.|group|dental|hospital|bank|university|college|network|health|associates|services|school|agency|center|clinic|partners|systems|solutions|usa|international)\b/i;
    var PLACE = /^[A-Z][A-Za-z.]+(?: [A-Z][A-Za-z.]+)*,\s*[A-Z]{2}\b/;
    var HEAD = /^[A-Z][A-Z &/]{3,}$/;
    for (var j = 0; j < stopAt; j++) {
      if (!inJobs(j)) continue;
      var m = lines[j].match(RANGE); if (!m) continue;
      var a = yearOf(m[1]), cur = /present|current|now|today/i.test(m[2]), b = cur ? nowY : yearOf(m[2]);
      if (!(a > 1960) || !(b >= a)) continue;
      /* pieces: the text on the date line, then up to two lines above it (never reaching back into the previous job) */
      var cand = [lines[j].replace(RANGE, '')];
      for (var up = 1; up <= 2; up++) { var L = lines[j - up]; if (L == null || j - up <= prevJ || secOf[j - up] === 'head' || !inJobs(j - up) || RANGE.test(L) || /^[-•·*]/.test(L) || HEAD.test(L) || L.length > 90) break; cand.unshift(L); }
      prevJ = j;
      var pieces = [];
      cand.forEach(function (c) { c = c.replace(/^[\s|,•·:\u2013\u2014-]+|[\s|,•·:\u2013\u2014-]+$/g, ''); if (!c) return;
        var at = c.split(/\s+at\s+/); if (at.length === 2) { pieces.push(at[0]); pieces.push(at[1].split(/\s*[|•·]\s*/)[0]); return; }
        var seg = c.split(/\s*[|•·]\s*/); seg.forEach(function (x, n) { if (n === 0 || !PLACE.test(x)) pieces.push(x); });
      });
      pieces = pieces.map(function (x) { return x.trim(); }).filter(function (x) { return x && !PLACE.test(x) && !/@|\d{3}.\d{3}.\d{4}/.test(x); });
      /* "Title, Employer" on one line */
      if (pieces.length === 1 && pieces[0].indexOf(',') > 0) { var cm = pieces[0].split(/,\s*/); if (ROLE.test(cm[0])) pieces = [cm[0], cm.slice(1).join(', ')]; }
      var ttl = pieces.filter(function (x) { return ROLE.test(x) && !ORG.test(x.replace(/\bassociates\b/i, '')); })[0] || pieces.filter(function (x) { return ROLE.test(x); })[0] || '';
      var emp = pieces.filter(function (x) { return x !== ttl; })[0] || '';
      if (!ttl && pieces.length) { ttl = pieces[0]; emp = pieces[1] || ''; }
      jobs.push({ title: ttl.slice(0, 80), employer: emp.replace(/,\s*[A-Z][A-Za-z. ]+,\s*[A-Z]{2}$/, '').replace(/,\s*[A-Z]{2}$/, '').slice(0, 80), from: a, to: b, current: cur });
      if (!(firstYear <= a)) firstYear = a; if (!(lastYear >= b)) lastYear = b;
    }
    if (jobs.length) {
      out.title = jobs[0].title; out.employer = jobs[0].employer; out.current = jobs[0].current ? 'Yes' : 'No';
      out.employers = uniq(jobs.map(function (x) { return x.employer; }).filter(Boolean)).slice(0, 5);
      var yrs = Math.max(0, (lastYear || nowY) - firstYear); out.years = yrs ? String(yrs) : '';
    }
    /* Degrees (finding 6): words match in any case; short forms (MD, MA, MS, BA...) match only in capitals, standing alone, and only
       after "City, ST" and "ST 12345" are taken out of the line, so a state in an address never reads as a degree. */
    var AB = function (s) { return new RegExp('(?:^|[^A-Za-z])(?:' + s + ')(?![A-Za-z])'); };
    var deg = [
      [[/\b(doctor(ate)? of|doctoral|dental surgery)\b/i, AB('Ph\\.?\\s?D\\.?|D\\.D\\.S\\.?|DDS|D\\.M\\.D\\.?|DMD|M\\.D\\.|MD|J\\.D\\.|JD|Pharm\\.?\\s?D\\.?|Psy\\.?\\s?D\\.?|DPT|DNP|Ed\\.?D\\.?|DVM|O\\.D\\.|OD')], 'Doctorate'],
      [[/\bmaster'?s?\b/i, AB('M\\.?B\\.?A\\.?|M\\.S\\.?|MS|M\\.A\\.?|MA|M\\.Ed\\.?|MEd|MSN|MPH|MSW|M\\.Sc\\.?|MSc|MPA|LL\\.?M\\.?')], "Master's or higher"],
      [[/\bbachelor'?s?\b/i, AB('B\\.S\\.?|BS|B\\.A\\.?|BA|B\\.Sc\\.?|BSc|BSN|BBA|B\\.B\\.A\\.?|BFA|B\\.Ed\\.?')], "Bachelor's degree"],
      [[/\bassociate'?s?\s+(degree|of|in)\b/i, AB('A\\.A\\.S?\\.?|AAS|AA|A\\.S\\.|ASN|A\\.A\\.S\\.')], "Associate's degree"],
      [[/\b(ged|high school diploma)\b/i], 'High school or GED']
    ];
    var noPlace = function (s) { return s.replace(/,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?(?=\s*$|\s*[|•·,;()]|\s+(?:19|20)\d\d|\s+[\u2013\u2014-])/g, '').replace(/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, ''); };
    var edLines = lines.filter(function (s, n) { return secOf[n] === 'edu'; }).slice(0, 12);
    if (!edLines.length) edLines = lines;
    for (var d = 0; d < deg.length && !out.education; d++) { for (var e = 0; e < edLines.length; e++) { var tl = noPlace(edLines[e]); if (deg[d][0].some(function (re) { return re.test(tl); })) { out.education = deg[d][1]; out.school = edLines[e].slice(0, 160); break; } } }
    /* Licenses (finding 6): every line of a Certifications or Licenses section, plus, outside it, only real license lines: a license
       number, or a short line that starts with License, Licensed in, Certified or Certification (never a job line or a sentence). */
    var certLines = lines.filter(function (s, n) { return secOf[n] === 'cert' && !/^[A-Z][A-Z &]{4,}$/.test(s); }).slice(0, 8);
    lines.forEach(function (s, n) {
      if (secOf[n] === 'cert' || secOf[n] === 'head' || s.length >= 90 || RANGE.test(s) || certLines.indexOf(s) >= 0) return;
      var t = s.replace(/^[-•·*]\s*/, ''), words = t.split(/\s+/).length;
      var number = /\blicen[sc]e\s*(?:#|no\.?|number|num\.?)\s*:?\s*[A-Z0-9][A-Z0-9-]{2,}/i.test(t);
      var starts = /^(licen[sc]e[ds]?\b|licensed in\b|certified\b|certification\b|board certified\b)/i.test(t) || /^[A-Z]{2}\s+[A-Za-z ]{2,40}\blicen[sc]e\b/.test(t);
      if (number || (starts && secOf[n] !== 'exp' && words <= 10 && !/\.\s*$/.test(t))) certLines.push(t);
    });
    out.certs = uniq(certLines.map(function (s) { return s.replace(/^[-•·\\]+\s*/, '').trim(); }).filter(function (s) { return s.length > 2; })).slice(0, 6);
    return { profile: out, jobs: jobs };
  }

  function parseResume(text) { return parseFull(text).profile; }
  window.SPResume = { fileText: fileText, parse: parseResume, parseFull: parseFull };
})();
