/* Billing copy allowlist (round 9). Renders the Plan & billing view and the Jobs hello line in demo mode for every state the
   page can show (the 128-case status matrix, NJ / NY / other regions, pilot day counts, the box ticked, busy, errors, the hired
   steps, the paid banner, FOUNDING_OPEN off), collects every visible string, and compares the set with copy_snapshot.json.
   Any new or changed string fails until the snapshot is updated on purpose:  node copy_test.js --update
   Second layer: the older regex guard against "billing stops by itself" lines. Third: known-bad mutations of the page (in a temp
   copy) must fail. Run: node copy_test.js   (needs playwright; serves the site itself, no network) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const SITE = path.resolve(process.argv.find(a => a.startsWith('--site=')) ? process.argv.find(a => a.startsWith('--site=')).slice(7) : path.join(__dirname, '..', '..'));
const SNAP = path.join(__dirname, 'copy_snapshot.json');
let P = 0, F = 0;
function ok(c, n, info) { c ? P++ : F++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c || info === undefined ? '' : '  [' + String(info).slice(0, 500) + ']')); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
function serve(root, portalHtml) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      if (portalHtml && p === '/portal/index.html') { rsp.writeHead(200, { 'Content-Type': 'text/html' }); return rsp.end(portalHtml); }
      const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

/* every visible string, with dates replaced by <DATE> */
async function collect(browser, portalHtml) {
  const srv = await serve(SITE, portalHtml), port = srv.address().port;
  const c = await browser.newContext({ viewport: { width: 400, height: 860 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const pg = await c.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:' + port + '/portal/?demo=1&v=billing&region=nj'); await pg.waitForSelector('.bl-status');
  const strings = await pg.evaluate(() => {
    const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
    const OFFS = [-10, -3, -2, -1, 0, 1, 6, 9], dates = OFFS.map(n => fmtDate(iso(n))).sort((a, b) => b.length - a.length);
    const norm = t => { t = String(t).replace(/\s+/g, ' ').trim(); dates.forEach(d => { t = t.split(d).join('<DATE>'); }); return t; };
    const out = new Set();
    const grab = root => {
      if (!root) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('[hidden]')) continue; const t = norm(n.nodeValue); if (t) out.add(t); }
      root.querySelectorAll('p, h1, h2, h3, li, label, button, a, small, .bl-status, #blHired, .bl-cheer, .bl-step b, .bl-step span').forEach(e => { const t = norm(e.textContent); if (t) out.add(t); });
      root.querySelectorAll('[aria-label]').forEach(e => { const t = norm(e.getAttribute('aria-label')); if (t) out.add('aria: ' + t); });
    };
    const view = () => { go('billing'); grab(document.querySelector('#app main.bl')); grab(document.querySelector('.ptitle')); go('jobs'); const h = document.querySelector('.hello .hl-r > span'); if (h) { const t = norm(h.textContent); out.add('hello: ' + t); } };
    const base = JSON.parse(JSON.stringify(S.data.billing)), cl0 = JSON.parse(JSON.stringify(S.data.client));
    const set = (bl, cl, bill) => { S.data.billing = Object.assign(JSON.parse(JSON.stringify(base)), bl || {}); S.data.client = Object.assign(JSON.parse(JSON.stringify(cl0)), cl || {}); S.bill = Object.assign({ agree: false, busy: '', err: '', re: false, hire: '' }, bill || {}); S.billPaid = null; };
    /* the 128-case matrix, in each region */
    const STAT = ['', 'active', 'trialing', 'past_due', 'unpaid', 'canceling', 'canceled', 'incomplete', 'paused', 'hired, cancel pending', 'hired, active', 'hired, trialing', 'hired, past_due', 'hired, canceling', 'hired, canceled', 'hired, incomplete'];
    const PT = [null, -3, 0, 6];
    for (const region of ['NJ', 'NY', 'other']) for (const st of STAT) for (const p of PT) for (const hd of [false, true]) { set({ region, status: st, paidThrough: p == null ? '' : iso(p), hiredDate: hd ? iso(-2) : '' }); view(); }
    /* pilot day counts, ended pilot, no Trial ends */
    for (const region of ['NJ', 'NY', 'other']) for (const te of [9, 1, 0, -1, null]) { set({ region }, { trialEnds: te == null ? '' : iso(te) }); view(); }
    /* interaction states (NJ) */
    const NJ = { region: 'NJ' };
    /* UI states reached by a tap (no messages injected; errors, busy text and the hired success come from collectReal) */
    [{ agree: true }, { hire: 'ask' }].forEach(b => { set(NJ, null, b); view(); });
    for (const region of ['NJ', 'NY', 'other']) { set({ region }); S.billPaid = 'plan'; go('billing'); grab(document.querySelector('#app main.bl')); S.billPaid = null; }
    BILLING_LINKS.FOUNDING_OPEN = false; set(NJ); view(); BILLING_LINKS.FOUNDING_OPEN = true;
    return [...out].sort();
  });
  await c.close();
  const real = await collectReal(browser, port);
  await srv.close();
  return { strings: [...new Set(strings.concat(real.strings))].sort(), errs: errs.concat(real.errs), stripe: real.stripe, cases: real.cases };
}
/* round 10: the page's real failure paths. A signed-in (non-demo) page with the API mocked: the billingConsent and hired POSTs
   fail by network error, HTTP 500 (HTML and JSON bodies) and every {ok:false, error} the backend returns. Whatever the page then
   renders is collected. A consent failure must never navigate to buy.stripe.com. */
const GRAB = () => {
  const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const dates = [-10, -3, -2, -1, 0, 1, 6, 9].map(n => fmtDate(iso(n))).sort((a, b) => b.length - a.length);
  const norm = t => { t = String(t).replace(/\s+/g, ' ').trim(); dates.forEach(d => { t = t.split(d).join('<DATE>'); }); return t; };
  const out = new Set(), root = document.querySelector('#app main.bl'); if (!root) return [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('[hidden]')) continue; const t = norm(n.nodeValue); if (t) out.add(t); }
  root.querySelectorAll('p, h1, h2, h3, li, label, button, a, small, .bl-status, #blHired, .bl-cheer, .bl-step b, .bl-step span').forEach(e => { const t = norm(e.textContent); if (t) out.add(t); });
  root.querySelectorAll('[aria-label]').forEach(e => { const t = norm(e.getAttribute('aria-label')); if (t) out.add('aria: ' + t); });
  return [...out];
};
const CONSENT_ERRS = ['expired', 'bad item', 'no client', 'not available', 'not set up', 'busy'], HIRED_ERRS = ['expired', 'no client', 'not available', 'not set up', 'busy'];
async function collectReal(browser, port) {
  const BASE = 'http://127.0.0.1:' + port, strings = new Set(), errs = [], stripe = [], cases = [];
  const modes = [['network', null], ['500 html', null], ['500 json', null]].concat(CONSENT_ERRS.map(e => ['error ' + e, e]));
  const run = async (action, mode, err, item) => {
    const c = await browser.newContext({ viewport: { width: 400, height: 860 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const pg = await c.newPage(); pg.on('pageerror', e => errs.push(e.message));
    let release, hold = new Promise(r => { release = r; }), posted = 0;
    await pg.route('https://script.google.com/**', async route => {
      const req = route.request();
      if (req.method() === 'GET') { const me = await pg.evaluate(() => window.SP_DEMO()); me.billing = { status: '', region: 'NJ', consented: false, paidThrough: '', hiredDate: '', email: 'pat@example.com' }; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) }); }
      const b = JSON.parse(req.postData() || '{}'); if (b.action !== action) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      posted++; await hold; /* held so the busy text can be collected */
      if (mode === 'network') return route.abort('failed');
      if (mode === '500 html') return route.fulfill({ status: 500, contentType: 'text/html', body: '<html><body>Error</body></html>' });
      if (mode === '500 json') return route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"server"}' });
      if (mode === 'ok') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: err }) });
    });
    await pg.route('https://buy.stripe.com/**', route => { stripe.push(action + ' ' + mode + ' ' + route.request().url()); return route.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }); });
    pg.on('framenavigated', f => { if (f === pg.mainFrame() && /stripe\.com/.test(f.url())) stripe.push(action + ' ' + mode + ' nav ' + f.url()); });
    await pg.goto(BASE + '/portal/?t=tok_abcdefghijklmnopqrstuvwxyz&v=billing'); await pg.waitForSelector('.bl-status');
    if (action === 'billingConsent') { await pg.check('#billAgree'); await pg.click('[data-billbuy="' + item + '"]'); }
    else { await pg.click('[data-billhired="ask"]'); await pg.click('[data-billhired="yes"]'); }
    await pg.waitForTimeout(150); (await pg.evaluate(GRAB)).forEach(t => strings.add(t)); /* busy state */
    release(); await pg.waitForTimeout(400);
    (await pg.evaluate(GRAB)).forEach(t => strings.add(t));
    const shown = action === 'billingConsent' ? await pg.$eval('#blErr', e => e.textContent).catch(() => '') : await pg.$eval('.bl-confirm .warn', e => e.textContent).catch(() => '') || await pg.$eval('#blHired', e => e.textContent).catch(() => '');
    cases.push({ action, mode, item, posted, shown, url: pg.url() });
    await c.close();
  };
  for (const [mode, err] of modes) { await run('billingConsent', mode, err, 'plan'); }
  for (const item of ['linkedin', 'salary', 'call']) await run('billingConsent', 'network', null, item);
  for (const [mode, err] of [['network', null], ['500 html', null], ['500 json', null]].concat(HIRED_ERRS.map(e => ['error ' + e, e]))) await run('hired', mode, err);
  await run('hired', 'ok', null);
  return { strings: [...strings], errs, stripe, cases };
}
/* second layer: the older guard against lines that say billing stops by itself */
const OLD_GUARD = /stops the day|stops[^.]*day you're hired|until you're hired|land the job|Billing stops\.|stops automatically|a team|tell us and we stop/i;
const PLAN_LINE = "When you\\'re hired, billing stops as soon as you confirm the cancel.";
const CONSENT_FAIL = "We couldn\\'t record your agreement, so the payment page did not open.";
const MUTATIONS = ["Billing stops when you're hired.", "We stop your billing the day you're hired.", "Billing ends the day you're hired."];

(async () => {
  const browser = await chromium.launch();
  const html = fs.readFileSync(path.join(SITE, 'portal', 'index.html'), 'utf8');
  const now = await collect(browser, null);
  ok(now.stripe.length === 0, 'no consent failure (network, 500, or any error code) ever navigates to buy.stripe.com', now.stripe.join(' | '));
  const cf = now.cases.filter(x => x.action === 'billingConsent');
  ok(cf.length === 12 && cf.every(x => x.posted === 1 && x.shown && /did not open|expired/.test(x.shown) && !/stripe/.test(x.url)), 'every consent failure posted once and shows an error on the page (' + cf.length + ' cases)', JSON.stringify(cf.filter(x => !x.shown)));
  const hf = now.cases.filter(x => x.action === 'hired');
  ok(hf.length === 9 && hf.filter(x => x.mode !== 'ok').every(x => x.posted === 1 && /didn't save|expired/.test(x.shown)) && /Billing is stopping/.test(hf.filter(x => x.mode === 'ok')[0].shown), 'every hired failure shows an error; the real success shows the cancel step (' + hf.length + ' cases)', JSON.stringify(hf.map(x => x.mode + ': ' + x.shown)));
  ok(now.errs.length === 0, 'no page errors while collecting', now.errs.join(' | '));
  if (process.argv.includes('--update')) { fs.writeFileSync(SNAP, JSON.stringify(now.strings, null, 1) + '\n'); console.log('Snapshot written: ' + now.strings.length + ' strings. Review the diff before committing.'); }
  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  const added = now.strings.filter(s => snap.indexOf(s) < 0), gone = snap.filter(s => now.strings.indexOf(s) < 0);
  ok(added.length === 0 && gone.length === 0, 'allowlist: the ' + now.strings.length + ' rendered strings exactly equal copy_snapshot.json', 'new: ' + JSON.stringify(added.slice(0, 8)) + ' missing: ' + JSON.stringify(gone.slice(0, 8)));
  ok(now.strings.some(s => /^hello: /.test(s)) && now.strings.includes("Paid plans aren't available in New York yet. Your free access continues.") && now.strings.includes("Paid plans aren't available in your area yet. Your free access continues.") && now.strings.includes('Payment received. It can take up to 30 minutes to show here.'), 'collection covers hello lines, NY and other regions and the paid banner');
  const bad = now.strings.filter(s => OLD_GUARD.test(s));
  ok(bad.length === 0, 'second layer: no rendered string matches the old automatic-stop guard', JSON.stringify(bad));
  /* known-bad mutations in a temp copy of the page: each must fail the allowlist */
  ok(html.split(PLAN_LINE).length === 2, 'the plan card line to mutate is present once');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spcopy-'));
  for (const m of MUTATIONS) {
    const mutated = html.replace(PLAN_LINE, m.replace(/'/g, "\\'"));
    fs.writeFileSync(path.join(tmp, 'index.html'), mutated);
    const r = await collect(browser, fs.readFileSync(path.join(tmp, 'index.html'), 'utf8'));
    const add = r.strings.filter(s => snap.indexOf(s) < 0);
    ok(add.includes(m) && r.strings.length > 0, 'known-bad mutation fails the allowlist: "' + m + '"', JSON.stringify(add));
    console.log('INFO old guard on "' + m + '": ' + (OLD_GUARD.test(m) ? 'caught' : 'missed (the allowlist catches it)'));
  }
  /* round 10: the real consent-failure string changed in a temp copy must fail (it is only reachable through the failure path) */
  ok(html.split(CONSENT_FAIL).length === 2, 'the consent-failure string is present once in the page');
  { const r = await collect(browser, html.replace(CONSENT_FAIL, "We couldn\\'t save that, sorry.")); const add = r.strings.filter(s => snap.indexOf(s) < 0), gone = snap.filter(s => r.strings.indexOf(s) < 0);
    ok(add.some(s => /couldn't save that, sorry/.test(s)) && gone.some(s => /couldn't record your agreement/.test(s)), 'changing the real consent-failure string fails the allowlist', JSON.stringify(add)); }
  /* a mutation in a hello line and in the hero are caught too */
  for (const [from, to] of [["hello: 'Billing stops when you confirm the cancel in Plan & billing'", "hello: 'Billing stops when you\\'re hired'"], ['One simple plan. Cancel anytime, including the day you\\\'re hired.', 'One simple plan. Billing ends the day you\\\'re hired.']]) {
    if (html.indexOf(from) < 0) { ok(false, 'mutation source present: ' + from); continue; }
    const r = await collect(browser, html.replace(from, to));
    ok(r.strings.filter(s => snap.indexOf(s) < 0).length > 0, 'mutation caught: ' + to.replace(/\\'/g, "'"));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  console.log('RESULT ' + P + ' pass ' + F + ' fail');
  process.exitCode = F ? 1 : 0;
})();
