/* Steady Path Careers home page, r37. Every job, posting, person and number in this file is a made-up sample. */
(function () {
  'use strict';

  /* Welcome video. While WELCOME_VIDEO is empty, the hero "Watch how it works" button, the "Watch" links
     and the whole theater section stay hidden. Set it to the mp4 path (for example '/img/welcome.mp4') and,
     if you have one, WELCOME_POSTER to a still image, and they all appear. */
  var WELCOME_VIDEO = '/media/welcome.mp4';
  var WELCOME_POSTER = '/media/welcome-poster.jpg';
  /* The video's length as words (for example '53 seconds') and its chapters as [time, what it covers] pairs
     (for example [['0:00', 'Real jobs, with the pay right there'], ['0:10', '...']]). Fill these from the final cut.
     While they are empty, no length and no chapter list are shown anywhere. */
  var WELCOME_LENGTH = '59 seconds';
  var WELCOME_CAPTIONS = '/media/welcome.vtt';
  var WELCOME_CHAPTERS = [['0:00', 'An application sent into the dark'], ['0:10', 'Why we built Steady Path Careers'], ['0:16', 'Find Your Fit'], ['0:25', 'Openings checked on the employer\'s own site'], ['0:30', 'What happens when you say yes'], ['0:44', 'You stay in control']];

  var root = document.documentElement;
  function $(id) { return document.getElementById(id); }
  function all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mm(q) { try { return window.matchMedia(q); } catch (e) { return null; } }
  var rm = mm('(prefers-reduced-motion: reduce)'), still = !!(rm && rm.matches);
  var hasIO = 'IntersectionObserver' in window;

  /* r43: the service worker and its updates. An installed app left open checks for a new release when it comes back into view
     (at most once in 30 minutes). When a new worker takes over a page that an older one was already running, nothing reloads
     under the person: a strip at the top of the page offers Refresh or Not now. Never on first install. With unsent text in a field, the bar says so.
     This block is the same in assets/site.js and assets/home-r37.js. */
  (function () {
    if (!('serviceWorker' in navigator)) return;
    try {
      var sw = navigator.serviceWorker, had = !!sw.controller, last = Date.now(), GAP = 30 * 60000, off = false;
      var typing = function () {
        var f = document.querySelectorAll('textarea, input'), i, el, ty;
        for (i = 0; i < f.length; i++) { el = f[i]; ty = (el.getAttribute('type') || 'text').toLowerCase(); if (/^(hidden|checkbox|radio|submit|button|reset|file|range|color|image)$/.test(ty) || el.readOnly || el.disabled) continue; if (String(el.value || '').trim()) return true; }
        return false;
      };
      var bar = function () {
        if (off || document.getElementById('spUpd')) return;
        /* A strip in the normal flow, first in <body>: it pushes the page down and never sits over a header, a nav, the
           portal's bottom bar, the intake buttons or a dialog. The home page header is pinned to the page top (absolute),
           so while the strip is there it takes its place in the flow under it. "Not now" hides it until the next page load. */
        var st = document.createElement('style');
        st.textContent = '#spUpd{position:static;box-sizing:border-box;width:100%;margin:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 12px;padding:8px max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));padding-top:max(8px,env(safe-area-inset-top,0px));background:#10213A;color:#FBF6EE;border-bottom:1px solid rgba(251,246,238,.45);font:700 15px/1.35 Manrope,system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}#spUpd p{margin:0;min-width:0;flex:0 1 auto}#spUpd div{display:flex;gap:8px;flex:none}#spUpd button{min-height:44px;min-width:44px;padding:0 16px;border-radius:10px;font:inherit;font-weight:800;cursor:pointer}#spUpd .go{border:0;background:#C9A227;color:#10213A}#spUpd .go:hover{background:#D9B43A}#spUpd .no{border:1.5px solid rgba(251,246,238,.6);background:transparent;color:#FBF6EE}#spUpd .no:hover{background:rgba(251,246,238,.12)}#spUpd button:focus-visible{outline:3px solid #FBF6EE;outline-offset:2px}#spUpd~header.top{top:auto}@media (min-width:761px){#spUpd~#app .login .say .theme-btn{margin-top:var(--sp-upd-h,60px)}}@media print{#spUpd{display:none}}';
        document.head.appendChild(st);
        var el = document.createElement('div'); el.id = 'spUpd'; el.setAttribute('role', 'status');
        var p = document.createElement('p'), acts = document.createElement('div'), b = document.createElement('button'), n = document.createElement('button');
        b.type = 'button'; b.className = 'go'; b.textContent = 'Refresh'; n.type = 'button'; n.className = 'no'; n.textContent = 'Not now';
        var say = function () { p.textContent = typing() ? 'A new version is ready. Send or save what you typed, then refresh.' : 'A new version is ready.'; size(); };
        var size = function () { try { document.documentElement.style.setProperty('--sp-upd-h', el.offsetHeight + 'px'); } catch (e) {} }; /* re-measured whenever the text changes or the window resizes */
        var shift = function (dy) { try { if (dy && window.scrollY > 0 && !(window.CSS && CSS.supports && CSS.supports('overflow-anchor', 'auto'))) window.scrollBy(0, dy); } catch (e) {} }; /* keeps the reader's place where the browser does not */
        b.addEventListener('click', function () { location.reload(); });
        n.addEventListener('click', function () { off = true; var h = el.offsetHeight; document.removeEventListener('input', say, true); el.remove(); st.remove(); shift(-h); });
        acts.appendChild(b); acts.appendChild(n); el.appendChild(p); el.appendChild(acts);
        document.body.insertBefore(el, document.body.firstChild); shift(el.offsetHeight);
        try { document.documentElement.style.setProperty('--sp-upd-h', el.offsetHeight + 'px'); } catch (e) {} /* the portal sign-in screen pins its theme button to the screen top: it moves down by the strip's height */
        setTimeout(say, 60); /* filled a moment after it is in the page, so screen readers announce it */
        document.addEventListener('input', say, true); window.addEventListener('resize', size);
      };
      sw.addEventListener('controllerchange', function () { if (!had) { had = true; return; } bar(); }); /* the first worker taking control is the install, not an update */
      sw.register('/sw.js').then(function (reg) {
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState !== 'visible' || Date.now() - last < GAP) return;
          last = Date.now(); try { var u = reg.update(); if (u && u['catch']) u['catch'](function () {}); } catch (e) {}
        });
      }, function () {});
    } catch (e) {}
  })();

  /* theme: follows the system until the visitor picks one; the pick is kept in localStorage "sp-theme" */
  (function () {
    var b = $('themeb'), mq = mm('(prefers-color-scheme: dark)');
    if (!b) return;
    function now() { var t = root.getAttribute('data-theme'); if (t === 'light' || t === 'dark') return t; return mq && mq.matches ? 'dark' : 'light'; }
    function sync() {
      var l = now() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; b.setAttribute('aria-label', l); b.title = l;
      try { document.dispatchEvent(new Event('sp-theme')); } catch (e) {}
    }
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
    m.addEventListener('focusout', function (e) { if (m.open && e.relatedTarget && !m.contains(e.relatedTarget)) m.open = false; });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
    /* r41: an in-page link always closes the menu, however it was followed */
    window.addEventListener('hashchange', function () { m.open = false; });
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
        d.innerHTML = '<p class="jt">' + esc(j[0]) + '</p><p class="pay">' + esc(j[1]) + '</p><p class="src">Posted by the employer</p><p class="co">' + esc(j[2]) +
          '</p><div class="pills"><span class="pill ok" title="Your floor is the lowest pay you told us you\'d accept.">Meets your floor</span><span class="pill">' + esc(j[3]) +
          '</span><span class="pill fresh">Rechecked daily</span></div><p class="why">' + esc(j[4]) + '</p>';
        cards.appendChild(d);
      });
      bYes.disabled = bNo.disabled = false;
      bindDrag(); note.textContent = HELP;
    }
    function answer(yes) {
      var c = top(); if (!c) return;
      var name = c.querySelector('.jt').textContent;
      c.classList.add(yes ? 'out-yes' : 'out-no'); c.style.transform = '';
      note.textContent = yes ? 'Yes to ' + name + '. In your portal, a tailored resume and cover letter would be ready usually within about an hour, and within 1 business day at most.'
        : 'Passed on ' + name + '. In your portal you can tell us why.';
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
    var CH = ['The employer\'s own posting', 'Pay stated by the employer', 'Still open', 'In your area, or remote for your state', 'Pay that can reach your floor'];
    var POSTS = [
      { t: 'Customer Success Manager', m: 'Example Co., Morristown, NJ', r: [[1, 'Found on the company careers page.'], [1, '$85,000 to $98,000 per year.'], [1, 'Open and taking applications.'], [1, 'Hybrid, about 35 minutes from home.'], [1, '$85,000 to $98,000. Your floor is $80,000.']], v: 'Sent to your portal, with the pay and a note on why it fits.' },
      { t: 'Sales Associate', m: 'Sample Retail Group, Paramus, NJ', r: [[1, 'Found on the company careers page.'], [0, 'The posting says "competitive pay" and gives no number.']], v: 'Not sent. No pay posted, so it never reaches you.' },
      { t: 'Operations Analyst', m: 'Demo Partners, Jersey City, NJ', r: [[1, 'Found on the company careers page.'], [1, '$72,000 to $84,000 per year.'], [0, 'The employer\'s page says the job is no longer accepting applications. The job board copy was still up.']], v: 'Not sent. The job board still listed it, but the employer had closed it.' }];
    var timers = [];
    function run(i, now) {
      timers.forEach(clearTimeout); timers = [];
      var p = POSTS[i];
      $('tTitle').textContent = p.t; $('tMeta').textContent = p.m; v.className = 'verdict'; v.textContent = '';
      ol.innerHTML = CH.map(function (c, k) { return '<li><i>' + (k + 1) + '</i><div><b>' + esc(c) + '</b><small>Not checked yet</small></div></li>'; }).join('');
      var li = ol.children, slow = (now || still) ? 0 : 520;
      function step(k) {
        var r = p.r[k];
        li[k].className = 'on ' + (r[0] ? 'pass' : 'fail');
        li[k].querySelector('i').textContent = r[0] ? '✓' : '✕';
        li[k].querySelector('small').textContent = r[1];
        if (k === p.r.length - 1) { var ok = p.r.every(function (x) { return x[0]; }); for (var n = k + 1; n < li.length; n++) li[n].querySelector('small').textContent = 'Not checked. The posting was already out.'; v.className = 'verdict ' + (ok ? 'pass' : 'fail'); v.textContent = p.v; }
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

  /* sky: stars drawn on a canvas (night sky in dark mode; a few faint ones high up in the light-mode dawn).
     r41: drawn at about 30 frames a second, at a pixel ratio capped at 1.5. It stops drawing while the page is being
     scrolled (and starts again 150ms after the last scroll), when the hero is off screen and when the tab is hidden.
     It draws one still frame when the visitor asks for reduced motion. */
  (function () {
    var c = $('sky'); if (!c || !c.getContext) return;
    var x = c.getContext('2d'), st = [], W = 0, H = 0, on = true, shoot = null, raf = 0, last = 0, scrolling = false, st0 = 0;
    var FRAME = 33, hero = c.parentNode, mq = mm('(prefers-color-scheme: dark)');
    function light() { var t = root.getAttribute('data-theme'); if (t === 'light') return true; if (t === 'dark') return false; return !(mq && mq.matches); }
    function size() {
      var r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.5), lt = light();
      W = r.width; H = r.height; c.width = Math.round(W * d); c.height = Math.round(H * d); x.setTransform(d, 0, 0, d, 0, 0); st = [];
      var n = Math.round(W * H / 5200); if (lt) n = Math.round(n * .1);
      for (var i = 0; i < n; i++) { var y = Math.pow(Math.random(), 1.7) * H * (lt ? .28 : .7); st.push([Math.random() * W, y, Math.random() * 1.3 + .3, Math.random() * 6.28, Math.random() * .9 + .3]); }
      if (lt) shoot = null;
    }
    function paint(t) {
      var lt = light(), k = lt ? .45 : 1, fade = H * (lt ? .3 : .75);
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#fff';
      for (var i = 0; i < st.length; i++) {
        var s = st[i], a = still ? .7 : .45 + .55 * Math.sin(t / 900 * s[4] + s[3]);
        x.globalAlpha = Math.max(0, a * k * (1 - s[1] / fade)); x.beginPath(); x.arc(s[0], s[1], s[2], 0, 6.28); x.fill();
      }
      if (shoot) {
        shoot.p += .04;
        var px = shoot.x + shoot.p * 260, py = shoot.y + shoot.p * 90, g = x.createLinearGradient(px - 90, py - 31, px, py);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,240,200,' + Math.max(0, 1 - shoot.p) + ')');
        x.globalAlpha = 1; x.strokeStyle = g; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px - 90, py - 31); x.lineTo(px, py); x.stroke();
        if (shoot.p >= 1) shoot = null;
      }
      x.globalAlpha = 1;
    }
    function tick(t) {
      raf = 0;
      if (t - last >= FRAME - 4) { last = t; paint(t); }
      loop();
    }
    function live() { return on && !still && !document.hidden && !scrolling; }
    function loop() { if (live() && !raf) raf = requestAnimationFrame(tick); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    var rt = 0;
    size(); paint(0);
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var w = W; size(); if (still || !on || w !== W) { stop(); paint(0); loop(); } }, 150); });
    document.addEventListener('sp-theme', function () { stop(); size(); paint(0); loop(); });
    if (still) return;
    setInterval(function () { if (live() && !shoot && !light()) shoot = { x: Math.random() * W * .6, y: Math.random() * H * .25 + 20, p: 0 }; }, 7000);
    if (hasIO) new IntersectionObserver(function (e) { on = e[0].isIntersecting; hero.classList.toggle('off', !on); if (on) loop(); else stop(); }).observe(hero);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else loop(); });
    /* scroll: one passive listener. It stops the stars, and moves the sun at most once a frame, with a transform only. */
    var sun = document.querySelector('.hero .sunp'), sraf = 0;
    function park() { sraf = 0; if (sun && on) sun.style.transform = 'translate3d(0,' + (-Math.min(window.scrollY, 700) / 14).toFixed(1) + 'px,0)'; }
    window.addEventListener('scroll', function () {
      if (!scrolling) { scrolling = true; stop(); }
      clearTimeout(st0); st0 = setTimeout(function () { scrolling = false; loop(); }, 150);
      if (sun && on && !sraf) sraf = requestAnimationFrame(park);
    }, { passive: true });
    loop();
    window.__spSky = { state: function () { return { running: !!raf, scrolling: scrolling, on: on, dpr: W ? c.width / W : 0, stars: st.length, frame: FRAME }; } };
  })();

  /* welcome video: nothing shows until WELCOME_VIDEO is set */
  (function () {
    var d = $('vid');
    if (!WELCOME_VIDEO || !d || !d.showModal) return;
    var opener = null, box = $('vidBox');
    all('[data-video-ui]').forEach(function (el) { el.hidden = false; });
    if (WELCOME_LENGTH) {
      [['wLen', WELCOME_LENGTH], ['sLen', 'Welcome video, ' + WELCOME_LENGTH]].forEach(function (x) { var el = $(x[0]); if (el) { el.textContent = x[1]; el.hidden = false; } });
      var scr = document.querySelector('.screen'); if (scr) scr.setAttribute('aria-label', 'Play the welcome video, ' + WELCOME_LENGTH);
    }
    var scrn = document.querySelector('.screen');
    if (scrn && WELCOME_POSTER) { var im = new Image(); im.alt = ''; im.className = 'poster'; im.loading = 'lazy'; im.width = 720; im.height = 1280; im.src = WELCOME_POSTER; scrn.insertBefore(im, scrn.firstChild); scrn.classList.add('has-poster'); }
    var ch = $('chapters');
    if (ch && WELCOME_CHAPTERS.length) {
      ch.innerHTML = WELCOME_CHAPTERS.map(function (c) { return '<li><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></li>'; }).join('');
      ch.hidden = false;
    }
    all('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b;
        var v = box.querySelector('video');
        if (!v) {
          v = document.createElement('video');
          v.controls = true; v.setAttribute('playsinline', ''); v.preload = 'none';
          if (WELCOME_POSTER) v.poster = WELCOME_POSTER;
          v.src = WELCOME_VIDEO;
          if (WELCOME_CAPTIONS) { var tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.src = WELCOME_CAPTIONS; v.appendChild(tr); }
          box.classList.add('has-video'); box.appendChild(v);
        }
        d.showModal();
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
    });
    d.addEventListener('close', function () { var v = d.querySelector('video'); if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} } if (opener) opener.focus(); });
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
    /* r41: the tickers only move while they are on screen */
    if (hasIO && !still) all('.ticker').forEach(function (t) {
      t.classList.add('off');
      new IntersectionObserver(function (e) { t.classList.toggle('off', !e[0].isIntersecting); }).observe(t);
    });
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
  /* r46: the Start free bar on phones. On when the hero has scrolled out of view; off again near the footer, while a form
     field has focus (the keyboard is up), and while the menu or the video dialog is open. */
  (function () {
    var bar = document.getElementById('startBar'), hero = document.querySelector('.hero'), foot = document.querySelector('footer');
    if (!bar || !hero || !foot || !window.matchMedia) return;
    var mq = window.matchMedia('(max-width:700px)'), typing = false;
    function open() { var d = document.getElementById('vid'), m = document.querySelector('.menu[open], details.menu[open]'); return !!((d && d.open) || m || document.querySelector('dialog[open]')); }
    function upd() {
      var show = false;
      if (mq.matches) {
        var h = hero.getBoundingClientRect(), f = foot.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        show = h.bottom <= 0 && f.top > vh && !typing && !open();
      }
      bar.hidden = !mq.matches; bar.classList.toggle('on', show);
      if (show) bar.removeAttribute('aria-hidden'); else bar.setAttribute('aria-hidden', 'true');
      var a = bar.querySelector('a'); if (a) { if (show) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); }
      document.body.classList.toggle('has-stick', mq.matches);
    }
    var tick = false; function later() { if (tick) return; tick = true; (window.requestAnimationFrame || setTimeout)(function () { tick = false; upd(); }); }
    window.addEventListener('scroll', later, { passive: true }); window.addEventListener('resize', later);
    if (mq.addEventListener) mq.addEventListener('change', upd);
    document.addEventListener('focusin', function (e) { var t = e.target; typing = !!(t && t.matches && t.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]')); upd(); });
    document.addEventListener('focusout', function () { typing = false; later(); });
    document.addEventListener('click', function () { setTimeout(upd, 0); }); document.addEventListener('toggle', later, true);
    var d = document.getElementById('vid'); if (d) d.addEventListener('close', upd);
    upd();
  })();
})();
