/* Steady Path intake (/start/): an illustrated header for each part, a path that fills as you go, a short cheer between
   parts and a small celebration at the end. Reads the form's step number only; it never touches the fields, the checks
   or what gets sent. If this file fails, the form works as before. */
(function () {
  'use strict';
  var form = document.getElementById('form'), head = document.getElementById('ihead');
  if (!form || !head || typeof window.step !== 'number') return;
  var RM = false; try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var SPK = function (x, y, s, f) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill="' + (f || '#C9A227') + '"/>'; };
  var SUN = '<circle cx="96" cy="22" r="20" fill="#F2D98A" opacity=".55"/><circle cx="96" cy="22" r="10" fill="#C9A227"/>';
  var ART = [
    /* 0 about you: a name badge */
    SUN + '<g transform="translate(14 30)"><rect width="76" height="54" rx="10" fill="#fff" stroke="#1F3A5F" stroke-width="2.5"/><rect x="28" y="-6" width="20" height="10" rx="3" fill="#1F3A5F"/>' +
      '<circle cx="22" cy="24" r="9" fill="#1F3A5F"/><path d="M8 46 C 8 34 36 34 36 46Z" fill="#1F3A5F"/><rect x="44" y="18" width="24" height="5" rx="2.5" fill="#C9A227"/><rect x="44" y="28" width="20" height="4" rx="2" fill="#DCE4F3"/><rect x="44" y="36" width="16" height="4" rx="2" fill="#DCE4F3"/></g>' + SPK(110, 70, .6),
    /* 1 what you want: a target with an arrow */
    SUN + '<g transform="translate(50 58)"><circle r="32" fill="#fff" stroke="#1F3A5F" stroke-width="3"/><circle r="21" fill="#F6ECC9"/><circle r="11" fill="#C9A227"/><circle r="4" fill="#10213A"/></g>' +
      '<g transform="translate(50 58) rotate(-35)"><path d="M0 0 H52" stroke="#10213A" stroke-width="4" stroke-linecap="round"/><path d="M52 0 l8 -7 M52 0 l8 7" stroke="#1f7a46" stroke-width="4" stroke-linecap="round"/></g>' + SPK(14, 22, .6),
    /* 2 your work: a resume and a pen */
    SUN + '<g transform="translate(22 18)"><rect width="56" height="72" rx="8" fill="#fff" stroke="#1F3A5F" stroke-width="2.5"/><rect x="9" y="10" width="28" height="6" rx="3" fill="#1F3A5F"/><rect x="9" y="24" width="38" height="4" rx="2" fill="#DCE4F3"/>' +
      '<rect x="6" y="34" width="44" height="14" rx="4" fill="#DFF3E6"/><rect x="10" y="38" width="34" height="3.5" rx="1.7" fill="#1f7a46"/><rect x="10" y="43" width="24" height="3" rx="1.5" fill="#1f7a46"/><rect x="9" y="56" width="32" height="4" rx="2" fill="#DCE4F3"/></g>' +
      '<g transform="translate(92 80) rotate(35)"><rect x="-4" y="-44" width="8" height="40" rx="2" fill="#10213A"/><rect x="-4" y="-44" width="8" height="8" rx="2" fill="#C9A227"/><path d="M-4 -4 L4 -4 L0 6Z" fill="#F2D98A"/></g>',
    /* 3 rules: a shield with a check */
    SUN + '<g transform="translate(50 54)"><path d="M0 -40 L32 -28 V0 C32 22 16 34 0 42 C-16 34 -32 22 -32 0 V-28Z" fill="#1F3A5F"/><path d="M-13 0 l9 9 l18 -20" stroke="#F2D98A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' + SPK(100, 72, .7) + SPK(14, 30, .5),
    /* 4 confirm: a paper plane ready to go */
    SUN + '<path d="M8 86 C 26 82 40 72 52 60" fill="none" stroke="#C9A227" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 7"/>' +
      '<g transform="translate(76 48) rotate(-18)"><path d="M-34 0 L26 -20 L5 23 L-7 7Z" fill="#1F3A5F"/><path d="M-7 7 L26 -20 L-2 12Z" fill="#2E4C78"/><path d="M-7 7 L-4 20 L5 12" fill="#C9A227"/></g>' + SPK(112, 76, .6),
    /* 5 done: sunrise with a check */
    '<g transform="translate(60 70)">' + [0, 30, 60, 90, 120, 150, 180].map(function (a) { return '<path d="M0 -38 V-50" transform="rotate(' + (a - 90) + ')" stroke="#C9A227" stroke-width="5" stroke-linecap="round"/>'; }).join('') +
      '<circle r="30" fill="#C9A227"/><path d="M-12 0 l8 8 l17 -18" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><path d="M0 84 C 30 74 90 74 120 84 V96 H0Z" fill="#1F3A5F"/>' + SPK(16, 20, .7) + SPK(106, 16, .6, '#1f7a46')
  ];
  var CHEER = ['Let’s start with the basics.', 'Nice start. Now, what are you after?', 'Halfway there. Take your time on this one.', 'Almost done. A few ground rules.', 'Last step. Read it over, then send.', 'You’re in. Taking you to your portal.'];
  var PTS = [[20, 26], [135, 22], [250, 22], [365, 20], [480, 18]];
  head.innerHTML = '<div class="ih-row"><div class="ih-art" aria-hidden="true"><svg viewBox="0 0 120 96" focusable="false"></svg></div><div class="ih-text"><p class="ih-cheer"></p><p class="ih-next"></p></div></div>' +
    '<svg class="ih-path" viewBox="0 0 500 44" aria-hidden="true" focusable="false"><path class="ih-track" d="M20 26 C 60 6 95 6 135 22 S 210 40 250 22 S 325 4 365 20 S 440 38 480 18"/>' +
    '<path class="ih-fill" pathLength="1" d="M20 26 C 60 6 95 6 135 22 S 210 40 250 22 S 325 4 365 20 S 440 38 480 18"/>' +
    PTS.map(function (p, i) { return '<g transform="translate(' + p[0] + ' ' + p[1] + ')"><circle class="ih-dot" data-i="' + i + '" r="9"/></g>'; }).join('') + '</svg>';
  document.documentElement.classList.add('has-ihead');
  var art = head.querySelector('.ih-art'), svg = art.querySelector('svg'), cheer = head.querySelector('.ih-cheer'), next = head.querySelector('.ih-next'), fill = head.querySelector('.ih-fill');
  var dots = [].slice.call(head.querySelectorAll('.ih-dot'));
  var last = -1;
  function paint() {
    var s = window.step; if (typeof s !== 'number' || s === last) return;
    var prev = last; last = s;
    svg.innerHTML = ART[Math.min(s, 5)];
    cheer.textContent = CHEER[Math.min(s, 5)];
    var steps = window.STEPS || [];
    next.textContent = s < 4 && steps[s + 1] ? 'Up next: ' + steps[s + 1].t : s === 4 ? 'Then you are done.' : '';
    fill.style.strokeDashoffset = String(1 - Math.min(1, s / 4));
    dots.forEach(function (d, i) { d.classList.toggle('on', i <= s || s >= 5); d.classList.toggle('now', i === s); });
    head.classList.toggle('done', s >= 5);
    if (!RM && prev >= 0) { art.classList.remove('in'); void art.offsetWidth; art.classList.add('in'); }
    if (s >= 5) {
      var top = head.getBoundingClientRect().top;
      if (top < 0 || top > (window.innerHeight || 800) * 0.6) window.scrollTo(0, Math.max(0, top + (window.pageYOffset || 0) - 20));
      if (window.SPFX) window.SPFX.burstAt(art, { n: 26, r: 130 });
    }
  }
  if ('MutationObserver' in window) new MutationObserver(paint).observe(form, { childList: true });
  paint();
})();
