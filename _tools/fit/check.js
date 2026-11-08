/* r27 Find Your Fit static checks. Run: node _tools/fit/check.js
   1. WCAG contrast: every text color on its background is at least 4.5:1 (area colors on their tint, the cream page and white,
      white on each area color, the five answer pills both ways, the small grey text on every tint, the job line, the share card).
   2. The 30 items in the demo match fit/mini_ip_items.json (when present) and the labels are O*NET's.
   3. Required credit text is present word for word; no em dash or banned word in the fit files. */
var fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..', '..'), JS = fs.readFileSync(path.join(ROOT, 'assets/fit-r27.js'), 'utf8'), CSS = fs.readFileSync(path.join(ROOT, 'assets/fit-r27.css'), 'utf8');
var P = 0, F = 0; function ok(c, n, i) { c ? P++ : F++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || i === undefined ? '' : '  [' + i + ']')); }
function lum(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { var x = parseInt(h.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }).reduce(function (s, x, i) { return s + x * [0.2126, 0.7152, 0.0722][i]; }, 0); }
function cr(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function need(fg, bg, what) { var r = cr(fg, bg); ok(r >= 4.5, what + ' ' + fg + ' on ' + bg + ' = ' + r.toFixed(2) + ':1', r.toFixed(2)); }
var area = {}, re = /(\w): \{ name: '(\w+)', onet: '(\w+)', line: '[^']*', c: '(#[0-9A-Fa-f]{6})', t: '(#[0-9A-Fa-f]{6})' \}/g, m;
while ((m = re.exec(JS))) area[m[1]] = { name: m[2], onet: m[3], c: m[4], t: m[5] };
ok(Object.keys(area).join('') === 'RIASEC', 'six areas read from FIT_AREA', Object.keys(area).join(''));
var GREY = '#4a5468', CREAM = '#FBF6EE', WHITE = '#FFFFFF', NAVY = '#10213A';
Object.keys(area).forEach(function (k) {
  var A = area[k];
  need(A.c, A.t, A.name + ' text on its tint'); need(A.c, CREAM, A.name + ' text on the page'); need(A.c, WHITE, A.name + ' text on white (radar labels)');
  need(WHITE, A.c, 'white icon/text on ' + A.name); need(GREY, A.t, 'small grey text on the ' + A.name + ' tint'); need(NAVY, A.t, 'question text on the ' + A.name + ' tint');
});
var pr = /\.fx-pill\.p(\d) \{ --pb: (#[0-9A-Fa-f]{6}); --pc: (#[0-9A-Fa-f]{6}); \}/g, n = 0;
while ((m = pr.exec(CSS))) { n++; need(m[3], m[2], 'answer pill ' + m[1]); need(WHITE, m[3], 'chosen answer pill ' + m[1]); }
ok(n === 5, 'five answer pills checked', n);
[[GREY, CREAM, 'credit and notes'], [GREY, WHITE, 'title card small text'], ['#FFD166', NAVY, 'moment badge'], [NAVY, '#FFD166', 'Start button'], ['#2a2f45', '#F3EEFA', 'job interest line'], ['#1F3A5F', '#F3EEFA', 'Source link'],
 [WHITE, '#1C5B3A', 'Yes chosen'], [WHITE, GREY, 'No chosen'], ['#F6EDD9', '#3A4677', 'hero subline on the lightest hero stop'], ['#FFD166', '#3A4677', 'hero lead on the lightest hero stop'], [WHITE, '#3A4677', 'hero title on the lightest hero stop'], ['#333E52', '#FBE3CF', 'Jobs card text'], [NAVY, CREAM, 'share card credit']].forEach(function (x) { need(x[0], x[1], x[2]); });
ok(/\.fx-hero \{[^}]*linear-gradient\(165deg, #10213A 0%, #1F3A5F 50%, #3A4677 100%\)/.test(CSS) && /\.fx-reshead \{[^}]*linear-gradient\(165deg, #10213A 0%, #1F3A5F 50%, #3A4677 100%\)/.test(CSS), 'hero and results header gradients stop at #3A4677 (the checked lightest stop)');
/* items and labels */
var demo = JSON.parse(/var FIT_DEMO_ITEMS = (\[[^\]]*\])/.exec(JS)[1].replace(/'/g, '"'));
var ref = path.join(ROOT, '..', 'fit', 'mini_ip_items.json');
if (fs.existsSync(ref)) { var items = JSON.parse(fs.readFileSync(ref, 'utf8')).items; ok(demo.length === 30 && demo.every(function (t, i) { return t === items[i].text; }), 'demo items equal mini_ip_items.json word for word'); }
ok(/var FIT_SCALE = \['Strongly Dislike', 'Dislike', 'Unsure', 'Like', 'Strongly Like'\]/.test(JS), 'answer labels are O*NET\'s');
var IP = 'This page includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the ';
ok(JS.split(IP).length - 1 >= 2, 'CC BY-ND credit text word for word on the page and on the share card');
ok(JS.indexOf("Steady Path Careers has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.") >= 0 && /Database by the U\.S\. Department of Labor, Employment and Training Administration \(USDOL\/ETA\)\. Used under the <a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/.test(JS), 'Database credit with the modified notice and the CC BY 4.0 link');
ok(JS.indexOf("FIT_SHARE_LICENSE = 'https://creativecommons.org/licenses/by-nd/4.0/'") >= 0, 'share card carries the license URL');
[JS, CSS].forEach(function (src, i) {
  ok(src.indexOf('\u2014') < 0, (i ? 'css' : 'js') + ': no em dash');
  ['delve', 'tapestry', 'testament', 'realm', 'landscape', 'navigate', 'leverage', 'robust', 'seamless', 'pivotal', 'crucial', 'elevate', 'unlock', 'foster', 'embark', 'journey', 'game-changer', 'myriad', 'underscore', 'showcase', 'vibrant', 'bustling', 'meticulous', 'accurate', 'scientific', 'proven', 'different mix'].forEach(function (w) { ok(!new RegExp('\\b' + w, 'i').test(src), (i ? 'css' : 'js') + ' avoids "' + w + '"'); });
});
console.log('RESULT ' + P + ' pass ' + F + ' fail'); process.exitCode = F ? 1 : 0;
