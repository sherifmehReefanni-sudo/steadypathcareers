/* Steady Path Careers home page, r37. Every job, posting, person and number in this file is a made-up sample. */
(function () {
  'use strict';

  /* Welcome video. While WELCOME_VIDEO is empty, the hero "Watch how it works" button, the "Watch" links
     and the whole theater section stay hidden. Set it to the mp4 path (for example '/img/welcome.mp4') and,
     if you have one, WELCOME_POSTER to a still image, and they all appear. */
  var WELCOME_VIDEO = '';
  var WELCOME_POSTER = '';

  var root = document.documentElement;
  function $(id) { return document.getElementById(id); }
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mm(q) { try { return window.matchMedia(q); } catch (e) { return null; } }
  var rm = mm('(prefers-reduced-motion: reduce)'), still = !!(rm && rm.matches);
  var hasIO = 'IntersectionObserver' in window;

  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('/sw.js'); } catch (e) {} }

  /* theme: follows the system until the visitor picks one; the pick is kept in localStorage "sp-theme" */
  (function () {
    var b = $('themeb'), mq = mm('(prefers-color-scheme: dark)');
    if (!b) return;
    function now() { var t = root.getAttribute('data-theme'); if (t === 'light' || t === 'dark') return t; return mq && mq.matches ? 'dark' : 'light'; }
    function sync() { var l = now() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; b.setAttribute('aria-label', l); b.title = l; }
    b.hidden = false;
    b.addEventListener('click', function () { var n = now() === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('sp-theme', n); } catch (e) {} sync(); });
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
    sync();
  })();

  /* small-screen menu: a details element, so it also opens without this script */
  (function () {
    var m = $('menu');
    if (!m) return;
    m.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) m.open = false; });
    document.addEventListener('click', function (e) { if (m.open && !m.contains(e.target)) m.open = false; });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
  })();

  /* hero: role level and the sample job deck */
  (function () {
    var cards = $('cards'), note = $('deckNote'), lede = $('heroLede'), bYes = $('bYes'), bNo = $('bNo');
    if (!cards) return;
    var DECKS = {
      hourly: [['Warehouse Associate', '$21 to $24 per hour', 'Example Logistics, Edison, NJ', 'On site', 'Day shift, weekdays. About 20 minutes from home.'],
        ['Front Desk Coordinator', '$20 to $23 per hour', 'Sample Dental Group, Freehold, NJ', 'On site', 'You already run a busy front desk. Benefits start day one.'],
        ['Pharmacy Technician', '$22 to $26 per hour', 'Demo Health, Staten Island, NY', 'On site', 'Your certification is listed as required. Full-time, set schedule.']],
      pro: [['Office Manager', '$62,000 to $72,000', 'Example Co., Red Bank, NJ', 'Hybrid', 'You ran the front office for a busy practice. About 15 minutes from home.'],
        ['Account Manager', '$78,000 to $92,000', 'Sample Insurance Partners, Roseland, NJ', 'Hybrid, 3 days', 'Your book-of-business experience matches the first three requirements.'],
        ['Staff Accountant', '$70,000 to $82,000', 'Demo Manufacturing, remote in NJ', 'Remote', 'Month-end close and reconciliations are the core of the role, and of your resume.']],
      exec: [['Director of Operations', '$165,000 to $190,000', 'Example Health Network, Newark, NJ', 'Hybrid', 'Multi-site operations and a P&L of similar size to the one you ran.'],
        ['VP, Client Services', '$210,000 to $240,000', 'Sample Financial Group, New York, NY', 'Hybrid, 3 days', 'You built and led a 40-person client team. Base pay is posted.'],
        ['Head of Finance', '$180,000 to $205,000', 'Demo Software, remote in NY', 'Remote', 'Reports to the CEO. Your audit and fundraising work lines up.']]
    };
    var LEDE = {
      hourly: "We find real openings near you, check each one on the employer's own site, and show the hourly pay as posted. Say yes to one and your resume is tailored for it. You send every application yourself.",
      pro: "We find real openings that fit you, check each one on the employer's own site, and show the pay as posted. Say yes to one and your resume and cover letter are tailored for it. You send every application yourself.",
      exec: "A quiet, careful search. We check each opening on the employer's own site and show the pay as posted. Nothing goes out under your name: you send every application yourself."
    };
    var HELP = 'Drag a card, tap a button, or use your arrow keys.', lvl = 'pro';
    cards.tabIndex = 0;
    cards.setAttribute('role', 'group');
    cards.setAttribute('aria-roledescription', 'card stack');
    cards.setAttribute('aria-label', 'Sample jobs. These companies and jobs are made up. Left arrow passes, right arrow says yes.');

    function top() { var c = cards.querySelectorAll('.jcard:not(.out-yes):not(.out-no)'); return c[c.length - 1]; }
    function build() {
      cards.innerHTML = '';
      DECKS[lvl].slice().reverse().forEach(function (j) {
        var d = document.createElement('article'); d.className = 'jcard';
        d.innerHTML = '<h3>' + esc(j[0]) + '</h3><p class="pay">' + esc(j[1]) + '</p><p class="src">Posted by the employer</p><p class="co">' + esc(j[2]) +
          '</p><div class="pills"><span class="pill ok" title="Your floor is the lowest pay you told us you\'d accept.">Meets your floor</span><span class="pill">' + esc(j[3]) +
          '</span><span class="pill fresh">Checked today</span></div><p class="why">' + esc(j[4]) + '</p>';
        cards.appendChild(d);
      });
      bYes.disabled = bNo.disabled = false;
      bindDrag(); note.textContent = HELP;
    }
    function answer(yes) {
      var c = top(); if (!c) return;
      var name = c.querySelector('h3').textContent;
      c.classList.add(yes ? 'out-yes' : 'out-no'); c.style.transform = '';
      note.textContent = yes ? 'Yes to ' + name + '. In your portal, a tailored resume and cover letter would be ready usually within about an hour, and within 1 business day at most.'
        : 'Passed on ' + name + '. Your next matches lean away from jobs like it.';
      var last = !top(), had = cards.parentNode.contains(document.activeElement);
      if (last) bYes.disabled = bNo.disabled = true;
      setTimeout(function () {
        c.remove();
        if (!last) { bindDrag(); return; }
        var d = document.createElement('div'); d.className = 'deck-done';
        d.innerHTML = '<p><b>That\'s the idea.</b><br>Yours would be real openings, 5 to 10 a week.</p><button type="button">Show the samples again</button>';
        var again = d.querySelector('button');
        again.onclick = function () { build(); cards.focus(); };
        cards.appendChild(d);
        if (had) again.focus();
      }, still ? 0 : 360);
    }
    function bindDrag() {
      var c = top(); if (!c || c._b) return; c._b = 1;
      var x0 = null, dx = 0;
      c.addEventListener('pointerdown', function (e) { x0 = e.clientX; dx = 0; try { c.setPointerCapture(e.pointerId); } catch (er) {} c.style.transition = 'none'; });
      c.addEventListener('pointermove', function (e) { if (x0 == null) return; dx = e.clientX - x0; c.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 18 + 'deg)'; });
      function up() { if (x0 == null) return; x0 = null; c.style.transition = ''; if (Math.abs(dx) > 90) answer(dx > 0); else c.style.transform = ''; }
      c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    }
    bYes.onclick = function () { answer(true); };
    bNo.onclick = function () { answer(false); };
    /* arrow keys only act while focus is inside the deck, so they never take over the page */
    cards.parentNode.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (!top()) return;
      e.preventDefault(); answer(e.key === 'ArrowRight');
    });
    function setLevel(v) {
      lvl = v;
      all('.seg-row button').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-lvl') === v ? 'true' : 'false'); });
      lede.textContent = LEDE[v];
    }
    all('.seg-row button').forEach(function (b) {
      b.onclick = function () { setLevel(b.getAttribute('data-lvl')); build(); try { localStorage.setItem('sp-level', lvl); } catch (e) {} };
    });
    try { var sv = localStorage.getItem('sp-level'); if (sv && DECKS[sv]) setLevel(sv); } catch (e) {}
    build();
  })();

  /* checker demo: three made-up postings */
  (function () {
    var ol = $('tSteps'), v = $('tVerdict');
    if (!ol) return;
    var CH = ['The employer\'s own posting', 'Pay, as the employer posted it', 'Still open today', 'In your area, or remote for your state', 'At or above your pay floor'];
    var POSTS = [
      { t: 'Customer Success Manager', m: 'Example Co., Morristown, NJ', r: [[1, 'Found on the company careers page.'], [1, '$85,000 to $98,000 per year.'], [1, 'Open and taking applications.'], [1, 'Hybrid, about 35 minutes from home.'], [1, 'Your floor is $80,000.']], v: 'Sent to your portal, with the pay and a note on why it fits.' },
      { t: 'Sales Associate', m: 'Sample Retail Group, Stamford, CT', r: [[1, 'Found on the company careers page.'], [1, '$19 to $22 per hour.'], [1, 'Open and taking applications.'], [0, 'On site in Stamford, Connecticut. That is outside the area you picked.']], v: 'Not sent. It is outside your area, so it never reaches you.' },
      { t: 'Operations Analyst', m: 'Demo Partners, Jersey City, NJ', r: [[1, 'Found on the company careers page.'], [1, '$72,000 to $84,000 per year.'], [0, 'The employer\'s page says the job is no longer accepting applications. The job board copy was still up.']], v: 'Not sent. The job board still listed it, but the employer had closed it.' }];
    var timers = [];
    function run(i, now) {
      timers.forEach(clearTimeout); timers = [];
      var p = POSTS[i];
      $('tTitle').textContent = p.t; $('tMeta').textContent = p.m; v.className = 'verdict'; v.textContent = '';
      ol.innerHTML = CH.map(function (c, k) { return '<li><i>' + (k + 1) + '</i><div><b>' + esc(c) + '</b><small></small></div></li>'; }).join('');
      var li = ol.children, slow = (now || still) ? 0 : 520;
      function step(k) {
        var r = p.r[k];
        li[k].className = 'on ' + (r[0] ? 'pass' : 'fail');
        li[k].querySelector('i').textContent = r[0] ? '✓' : '✕';
        li[k].querySelector('small').textContent = r[1];
        if (k === p.r.length - 1) { var ok = p.r.every(function (x) { return x[0]; }); v.className = 'verdict ' + (ok ? 'pass' : 'fail'); v.textContent = p.v; }
      }
      p.r.forEach(function (r, k) { if (slow) timers.push(setTimeout(function () { step(k); }, slow * (k + 1))); else step(k); });
    }
    all('.post').forEach(function (b) {
      b.onclick = function () { all('.post').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); run(+b.getAttribute('data-p')); };
    });
    run(0, true);
    if (hasIO && !still) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); if (all('.post')[0].getAttribute('aria-pressed') !== 'true') return; var tk = ol.parentNode; tk.style.minHeight = tk.offsetHeight + 'px'; /* hold the height so the replay moves nothing below it */ run(0); setTimeout(function () { tk.style.minHeight = ''; }, 3200); } }, { threshold: .4 });
      io.observe(ol.parentNode);
    }
  })();

  /* night sky: stars drawn on a canvas. It stops drawing when the hero is off screen or the tab is hidden,
     and draws one still frame when the visitor asks for reduced motion. */
  (function () {
    var c = $('sky'); if (!c || !c.getContext) return;
    var x = c.getContext('2d'), st = [], W = 0, H = 0, on = true, shoot = null, raf = 0;
    function size() {
      var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0); st = [];
      var n = Math.round(W * H / 5200);
      for (var i = 0; i < n; i++) { var y = Math.pow(Math.random(), 1.7) * H * .7; st.push([Math.random() * W, y, Math.random() * 1.3 + .3, Math.random() * 6.28, Math.random() * .9 + .3]); }
    }
    function draw(t) {
      raf = 0;
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < st.length; i++) {
        var s = st[i], a = still ? .7 : .45 + .55 * Math.sin(t / 900 * s[4] + s[3]);
        x.globalAlpha = a * (1 - s[1] / (H * .75)); x.fillStyle = '#fff'; x.beginPath(); x.arc(s[0], s[1], s[2], 0, 6.28); x.fill();
      }
      if (shoot) {
        shoot.p += .02;
        var px = shoot.x + shoot.p * 260, py = shoot.y + shoot.p * 90, g = x.createLinearGradient(px - 90, py - 31, px, py);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,240,200,' + Math.max(0, 1 - shoot.p) + ')');
        x.globalAlpha = 1; x.strokeStyle = g; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px - 90, py - 31); x.lineTo(px, py); x.stroke();
        if (shoot.p >= 1) shoot = null;
      }
      x.globalAlpha = 1;
      loop();
    }
    function loop() { if (on && !still && !document.hidden && !raf) raf = requestAnimationFrame(draw); }
    var rt = 0;
    size(); draw(0);
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var w = W; size(); if (still || !on || w !== W) { if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(0); } }, 150); });
    if (still) return;
    setInterval(function () { if (on && !document.hidden && !shoot) shoot = { x: Math.random() * W * .6, y: Math.random() * H * .25 + 20, p: 0 }; }, 7000);
    if (hasIO) new IntersectionObserver(function (e) { on = e[0].isIntersecting; loop(); }).observe(c);
    document.addEventListener('visibilitychange', loop);
    var sun = document.querySelector('.hero .sun');
    if (sun) window.addEventListener('scroll', function () { if (on) sun.style.translate = '0 ' + (-Math.min(window.scrollY, 700) / 14) + 'px'; }, { passive: true });
  })();

  /* welcome video: nothing shows until WELCOME_VIDEO is set */
  (function () {
    var d = $('vid');
    if (!WELCOME_VIDEO || !d || !d.showModal) return;
    var opener = null, box = $('vidBox');
    all('[data-video-ui]').forEach(function (el) { el.hidden = false; });
    all('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b;
        var v = box.querySelector('video');
        if (!v) {
          v = document.createElement('video');
          v.controls = true; v.setAttribute('playsinline', ''); v.preload = 'none';
          if (WELCOME_POSTER) v.poster = WELCOME_POSTER;
          v.src = WELCOME_VIDEO; box.appendChild(v);
        }
        d.showModal();
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
    });
    d.addEventListener('close', function () { var v = d.querySelector('video'); if (v) v.pause(); if (opener) opener.focus(); });
    $('vidX').onclick = function () { d.close(); };
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  })();

  /* one resume line, three made-up examples */
  (function () {
    var ba = $('ba'); if (!ba) return;
    var T = [['Registered Nurse, Med-Surg', 'Epic charting, 5 to 6 patients per shift, precepting new nurses', 'Responsible for patient care and documentation.', 'Cared for 5 to 6 patients per shift on a 32-bed med-surg unit, charted in Epic, and precepted 4 new-grad nurses.'],
      ['IT Support Technician', 'ServiceNow tickets, Microsoft 365, new-hire laptop setup', 'Helped employees with computer issues.', 'Resolved about 40 ServiceNow tickets a week and set up Microsoft 365 accounts and laptops for 60 new hires.'],
      ['Account Executive, B2B', 'New business, Salesforce, hitting quota', 'Sold services to business customers.', 'Opened 22 new small-business accounts in one year, tracked every deal in Salesforce, and finished at 112% of quota.']];
    function set(i, quiet) {
      var t = T[i];
      $('tlJob').textContent = t[0]; $('tlAsk').textContent = t[1]; $('tlB').textContent = t[2]; $('tlA').textContent = t[3];
      if (quiet) return;
      ba.classList.remove('swap'); void ba.offsetWidth; ba.classList.add('swap');
    }
    all('.tabs button').forEach(function (b) {
      b.onclick = function () { all('.tabs button').forEach(function (q) { q.setAttribute('aria-pressed', q === b ? 'true' : 'false'); }); set(+b.getAttribute('data-t')); };
    });
    set(0, true);
  })();

  /* fields tickers. The same list is in the page as plain text for screen readers and for no-script visitors. */
  (function () {
    var A = [['Office and customer service', 1], 'Administrative assistant', 'Receptionist', 'Customer service rep', ['Payroll, HR and finance', 1], 'Payroll specialist', 'HR coordinator', 'Bookkeeper', 'Analyst', ['Sales and insurance', 1], 'Account executive', 'Insurance agent', 'Claims adjuster', ['Nursing and healthcare', 1], 'RN', 'LPN', 'CNA', 'Medical assistant', 'Surgical tech', ['Senior leadership', 1], 'Director of operations', 'VP, client services', 'Head of finance'],
      B = [['IT and tech', 1], 'Help desk', 'Systems admin', 'Developer', 'QA', 'Security', ['Construction and skilled trades', 1], 'Electrician', 'HVAC tech', 'Carpenter', 'Estimator', 'Site supervisor', ['Warehouse, logistics and driving', 1], 'Warehouse associate', 'Inventory clerk', 'CDL driver', ['Schools and public service', 1], 'Paraprofessional', 'Teacher', 'Case worker', ['Healthcare admin and dental', 1], 'Medical billing and coding', 'Dental assistant', ['Facilities, retail and hospitality', 1], 'Maintenance tech', 'Store supervisor'];
    function fill(id, L) {
      var el = $(id); if (!el) return;
      var h = L.map(function (v) { return Array.isArray(v) ? '<span class="f">' + esc(v[0]) + '</span>' : '<span>' + esc(v) + '</span>'; }).join('');
      el.innerHTML = still ? h : h + h;
    }
    fill('tk1', A); fill('tk2', B);
  })();

  /* draw-in moments (skipped for reduced motion, so nothing is ever left waiting) */
  (function () {
    if (!hasIO || still) return;
    [document.querySelector('.radar'), document.querySelector('.week')].forEach(function (el) {
      if (!el) return;
      el.classList.add('wait');
      new IntersectionObserver(function (e, o) { if (e[0].isIntersecting) { el.classList.remove('wait'); o.disconnect(); } }, { threshold: .35 }).observe(el);
    });
  })();
})();
