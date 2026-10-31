/* Builds the 1200x630 link-preview images in img/og/ by rendering HTML with Playwright.
   Run from the site root: node _tools/make-og.js
   (Folders starting with "_" are left out of the GitHub Pages build, so this file is never published.)
   Fonts: real Manrope and Newsreader from npm, used only here at build time and embedded in the render.
     npm install --prefix <some build folder> @fontsource/manrope @fontsource/newsreader
     FONTSOURCE_DIR=<some build folder> node _tools/make-og.js
   The script stops if the fonts are missing, so it never falls back to a system font. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOGO = fs.readFileSync(path.join(__dirname, '..', 'assets', 'favicon.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const PAGES = [
  { file: 'home', kicker: 'Job search help in New Jersey and New York', title: 'Your next job, one honest step at a time.', foot: 'Checked openings. Clear pay. Free for 60 days.' },
  { file: 'guides', kicker: 'Guides', title: 'Job search guides', foot: 'Plain-English help for job seekers in NJ and NY.' },
  { file: 'pay', kicker: 'Free pay lookup', title: 'What does this job pay in NJ and NY?', foot: 'Typical yearly pay from government wage data.' },
  { file: 'sample', kicker: 'Sample report', title: 'Sample weekly report', foot: 'What a client sees each week. Sample data.' },
];
function fontFace(family, pkg, file, weight, style) {
  const base = process.env.FONTSOURCE_DIR ? [process.env.FONTSOURCE_DIR] : [];
  const p = require.resolve('@fontsource/' + pkg + '/files/' + file, { paths: base.concat([process.cwd(), __dirname]) });
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${fs.readFileSync(p).toString('base64')}) format("woff2")}`;
}
const FONTS = [
  fontFace('Manrope', 'manrope', 'manrope-latin-600-normal.woff2', 600, 'normal'),
  fontFace('Manrope', 'manrope', 'manrope-latin-700-normal.woff2', 700, 'normal'),
  fontFace('Manrope', 'manrope', 'manrope-latin-800-normal.woff2', 800, 'normal'),
  fontFace('Newsreader', 'newsreader', 'newsreader-latin-500-italic.woff2', 500, 'italic'),
].join('');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = p => `<!doctype html><html><head><meta charset="utf-8">
<style>${FONTS}
*{box-sizing:border-box}html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Manrope,system-ui,sans-serif;color:#FBF6EE;
 background:radial-gradient(520px 360px at 930px 400px,rgba(242,217,138,.42),rgba(242,217,138,0) 70%),linear-gradient(160deg,#10213A 0%,#1F3A5F 100%);position:relative}
.brand{position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:34px;letter-spacing:-.01em}
.brand svg{width:72px;height:72px}
.k{position:absolute;left:72px;top:196px;font:italic 500 32px/1.2 Newsreader,Georgia,serif;color:#F2D98A;max-width:640px}
h1{position:absolute;left:72px;top:244px;margin:0;width:640px;font-weight:800;font-size:${p.title.length > 30 ? 66 : 80}px;line-height:1.04;letter-spacing:-.035em;color:#fff;text-wrap:balance}
.f{position:absolute;left:72px;bottom:58px;font-weight:700;font-size:25px;color:#DCE6F0}
.u{position:absolute;right:72px;bottom:58px;font-weight:800;font-size:25px;color:#F2D98A}
.bar{position:absolute;left:0;right:0;bottom:0;height:12px;background:#C9A227}
svg.scene{position:absolute;right:40px;top:120px;width:420px;height:400px}
</style></head><body>
<div class="brand">${LOGO}<span>Steady Path Careers</span></div>
<div class="k">${esc(p.kicker)}</div>
<h1>${esc(p.title)}</h1>
<div class="f">${esc(p.foot)}</div><div class="u">steadypathcareers.com</div>
<svg class="scene" viewBox="0 0 420 400" aria-hidden="true">
 <defs><clipPath id="sc"><rect x="0" y="0" width="420" height="400" rx="40"/></clipPath><linearGradient id="rd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF6EE"/><stop offset="1" stop-color="#F7E7CC"/></linearGradient></defs>
 <g clip-path="url(#sc)">
  <rect width="420" height="400" fill="#F2D98A" opacity=".08"/>
  <circle cx="210" cy="190" r="74" fill="#C9A227"/>
  <path d="M0 214 C 90 190 150 200 210 206 C 280 212 340 196 420 204 V400 H0Z" fill="#2E4C78"/>
  <path d="M0 250 C 100 236 170 244 240 242 C 320 240 370 234 420 240 V400 H0Z" fill="#1F3A5F"/>
  <path d="M 203 206 C 200 280 120 330 80 400 L 340 400 C 300 330 220 280 217 206 Z" fill="url(#rd)"/>
  <circle cx="210" cy="384" r="10" fill="#C9A227"/><circle cx="210" cy="340" r="8" fill="#C9A227"/><circle cx="210" cy="302" r="6.5" fill="#C9A227"/><circle cx="210" cy="270" r="5" fill="#C9A227"/><circle cx="210" cy="244" r="4" fill="#C9A227"/><circle cx="210" cy="224" r="3" fill="#C9A227"/>
  <path d="M40 206 L 200 206 M 220 206 L 380 206" stroke="#C9A227" stroke-width="7" stroke-linecap="round"/>
 </g>
</svg>
<div class="bar"></div>
</body></html>`;

(async () => {
  const out = path.join(__dirname, '..', 'img', 'og');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const p of PAGES) {
    await pg.setContent(html(p), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    const ok = await pg.evaluate(async () => { await document.fonts.load('800 40px Manrope'); await document.fonts.load('italic 500 30px Newsreader');
      return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style); });
    if (!ok.some(f => /Manrope 800/.test(f)) || !ok.some(f => /Newsreader 500 italic/.test(f))) throw new Error('Fonts did not load for ' + p.file + ': ' + ok.join(', '));
    console.log('  fonts:', ok.join(', '));
    await pg.screenshot({ path: path.join(out, p.file + '.png'), type: 'png' });
    console.log('wrote img/og/' + p.file + '.png');
  }
  await b.close();
  /* Shrink to a 256-color palette (about 100 KB each) so WhatsApp and iMessage take them without trouble. */
  const py = "from PIL import Image\nimport sys\nfor p in sys.argv[1:]:\n  Image.open(p).convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(p, optimize=True)";
  require('child_process').execFileSync('python3', ['-c', py].concat(PAGES.map(p => path.join(out, p.file + '.png'))), { stdio: 'inherit' });
  console.log('shrunk');
})();
