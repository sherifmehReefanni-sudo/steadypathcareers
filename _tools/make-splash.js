/* Builds the iPhone launch screens in img/splash/ (linked from portal/index.html) with the logo from assets/favicon.svg.
   Run from the site root: node _tools/make-splash.js   (needs Playwright and Python with Pillow)
   Layout is the r18 launch screen: navy #1F3A5F, the mark in a thin dim-gold ring (the r18 ring, now a rounded square so it
   follows the mark; it also keeps the mark's navy top edge visible on the navy screen), centered above "Steady Path" in cream bold sans.
   The boxes below (device pixels) were measured from the r18 images so the new ones sit exactly where the old ones did.
   Columns: width, height, mark left, mark top, mark size, text ink left, text ink top, text ink width, text ink height. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const LOGO = fs.readFileSync(path.join(root, 'assets', 'favicon.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
const SIZES = [
  [750, 1334, 256, 451, 238, 237, 724, 275, 45],
  [828, 1792, 284, 646, 260, 259, 943, 308, 51],
  [1125, 2436, 384, 875, 357, 355, 1284, 412, 68],
  [1170, 2532, 402, 913, 369, 369, 1335, 429, 71],
  [1179, 2556, 405, 921, 372, 365, 1350, 446, 74],
  [1206, 2622, 414, 945, 381, 379, 1383, 445, 74],
  [1242, 2688, 426, 969, 390, 388, 1414, 463, 76],
  [1284, 2778, 441, 1005, 402, 400, 1463, 480, 79],
  [1290, 2796, 441, 1010, 405, 403, 1471, 480, 79],
  [1320, 2868, 453, 1037, 414, 410, 1505, 497, 81],
];
const FONT = '"Liberation Sans", Arimo, Arial, Helvetica, sans-serif';
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ deviceScaleFactor: 1 });
  const files = [];
  for (const [w, h, mx, my, ms, tx, ty, tw] of SIZES) {
    await pg.setViewportSize({ width: w, height: h });
    await pg.setContent(`<!doctype html><style>html,body{margin:0;width:${w}px;height:${h}px;background:#1F3A5F;overflow:hidden}
.r{position:absolute;left:${mx}px;top:${my}px;width:${ms}px;height:${ms}px;box-sizing:border-box;border:${Math.round(ms * 0.024)}px solid #7C7340;border-radius:22%}
.m{position:absolute;left:${mx + Math.round(ms * 0.024)}px;top:${my + Math.round(ms * 0.024)}px;width:${ms - 2 * Math.round(ms * 0.024)}px;height:${ms - 2 * Math.round(ms * 0.024)}px}.m svg{width:100%;height:100%;display:block}
.t{position:absolute;margin:0;white-space:nowrap;color:#FBF6EE;font-weight:700;font-family:${FONT};line-height:1}</style>
<div class="r"></div><div class="m">${LOGO}</div><p class="t">Steady Path</p>`);
    /* size the text so its ink is as wide as before, then place the ink box where it was */
    await pg.evaluate(({ tx, ty, tw, FONT }) => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = '700 100px ' + FONT;
      let m = c.measureText('Steady Path');
      const size = 100 * tw / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
      c.font = '700 ' + size + 'px ' + FONT; m = c.measureText('Steady Path');
      const t = document.querySelector('.t');
      t.style.fontSize = size + 'px';
      /* with line-height 1 the baseline sits at (ascent of the em box); use the font's own metrics */
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, lead = (size - (asc + desc)) / 2;
      t.style.left = (tx + m.actualBoundingBoxLeft) + 'px';
      t.style.top = (ty - (lead + asc - m.actualBoundingBoxAscent)) + 'px';
    }, { tx, ty, tw, FONT });
    const file = path.join(root, 'img', 'splash', `launch-${w}x${h}.png`);
    await pg.screenshot({ path: file });
    files.push(file);
    console.log('wrote img/splash/launch-' + w + 'x' + h + '.png');
  }
  await b.close();
  /* 256-color palette, like the r18 files, to keep them small */
  const py = "from PIL import Image\nimport sys\nfor p in sys.argv[1:]:\n  Image.open(p).convert('RGB').quantize(colors=256, method=Image.Quantize.MEDIANCUT).save(p, optimize=True)";
  require('child_process').execFileSync('python3', ['-c', py].concat(files), { stdio: 'inherit' });
  console.log('shrunk');
})();
