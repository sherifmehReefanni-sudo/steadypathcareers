/* Builds the installed-app screenshots in img/app/ (1080x1920) from the demo portal, so they always show the current screens:
     screen-home.png (Home with the path), screen-jobs.png (Jobs), screen-docs.png (Documents; used on the home page).
   Run from the site root: node _tools/make-app-screens.js
   (Folders starting with "_" are not published.) The demo portal holds made-up data and is labelled Demo on screen.
   Fonts: real Manrope and Newsreader from npm, used only here at build time, in place of the Google Fonts request:
     npm install --prefix <some build folder> @fontsource/manrope @fontsource/newsreader
     FONTSOURCE_DIR=<some build folder> node _tools/make-app-screens.js
   The script stops if the fonts are missing, so it never falls back to a system font. Nothing outside this folder is requested. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..');
function face(family, pkg, file, weight, style) {
  const base = process.env.FONTSOURCE_DIR ? [process.env.FONTSOURCE_DIR] : [];
  const p = require.resolve('@fontsource/' + pkg + '/files/' + file, { paths: base.concat([process.cwd(), __dirname]) });
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:${style};font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(p).toString('base64')}) format("woff2")}`;
}
const FONTS = [500, 600, 700, 800].map((w) => face('Manrope', 'manrope', 'manrope-latin-' + w + '-normal.woff2', w, 'normal')).join('') + [400, 500].map((w) => face('Newsreader', 'newsreader', 'newsreader-latin-' + w + '-italic.woff2', w, 'italic')).join('');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webmanifest: 'application/manifest+json' };
const SHOTS = [['home', 'screen-home.png'], ['jobs', 'screen-jobs.png'], ['docs', 'screen-docs.png']];
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); } try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); } catch (e) {} fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); r.end(b); }); });
srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await c.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(base) ? r.continue() : r.fulfill({ status: 200, contentType: /fonts\.googleapis/.test(u) ? 'text/css' : 'text/plain', body: /fonts\.googleapis/.test(u) ? FONTS : '' }); });
  const p = await c.newPage();
  for (const [view, file] of SHOTS) {
    await p.goto(base + '/portal/?demo=1&view=' + view, { waitUntil: 'load' }); await p.waitForSelector('.ptitle h1'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
    if (view === 'jobs') { /* Jobs: the first match, with its pay and the Yes, No, Question buttons. The header (and its Demo badge) has scrolled away by then, so this script pins a copy of that badge to the top corner of the picture: every screen must say it is demo data. */
      await p.evaluate(() => { const j = document.querySelector('.jc, [data-job]'); if (j) window.scrollTo(0, j.getBoundingClientRect().top + window.scrollY - 46); const b = document.querySelector('.demo-badge'); if (!b) throw new Error('no Demo badge to copy'); const c = b.cloneNode(true); c.textContent = 'Demo data'; c.style.cssText = 'position:fixed;top:8px;right:16px;left:auto;z-index:99;font-size:13px;line-height:1.6;padding:2px 12px;box-shadow:0 2px 8px rgba(16,33,58,.25)'; document.body.appendChild(c); }); await p.waitForTimeout(300); }
    await p.screenshot({ path: path.join(ROOT, 'img', 'app', file) }); console.log('wrote img/app/' + file);
  }
  await b.close(); srv.close();
});
