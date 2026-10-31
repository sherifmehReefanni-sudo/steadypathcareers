/* Builds the favicon and app icon set from assets/favicon.svg (the logo), so every icon matches it.
   Run from the site root: node _tools/make-icons.js   (needs Playwright and Python with Pillow) */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const LOGO = fs.readFileSync(path.join(root, 'assets', 'favicon.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
/* scale: how much of the square the round logo fills. Maskable icons keep the art inside the 80% safe zone. */
const OUT = [
  ['apple-touch-icon.png', 180, 1], ['img/icon-192.png', 192, 1], ['img/icon-512.png', 512, 1],
  ['img/icon-maskable-512.png', 512, 0.8], ['favicon-32.png', 32, 1], ['img/favicon-48.png', 48, 1],
];
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  for (const [file, px, scale] of OUT) {
    await pg.setViewportSize({ width: px, height: px });
    const s = Math.round(px * scale), o = Math.round((px - s) / 2);
    await pg.setContent(`<!doctype html><style>html,body{margin:0;background:#1F3A5F}div{position:absolute;left:${o}px;top:${o}px;width:${s}px;height:${s}px}svg{width:100%;height:100%;display:block}</style><div>${LOGO}</div>`);
    await pg.screenshot({ path: path.join(root, file), omitBackground: false });
    console.log('wrote', file);
  }
  await b.close();
  /* favicon.ico with 16, 32 and 48 px images, for browsers and tools that only ask for /favicon.ico */
  require('child_process').execFileSync('python3', ['-c',
    "from PIL import Image\nim=Image.open('img/favicon-48.png').convert('RGBA')\nim.save('favicon.ico', sizes=[(16,16),(32,32),(48,48)])"], { cwd: root, stdio: 'inherit' });
  console.log('wrote favicon.ico');
})();
