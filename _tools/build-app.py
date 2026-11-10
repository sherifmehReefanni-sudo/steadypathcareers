#!/usr/bin/env python3
"""Builds /app/index.html ("Get the app") from the About page's shell (head, nav, footer, finale art)
and an inline QR code from _tools/make-qr.py. Run from the site root: python3 _tools/build-app.py .
Folders starting with "_" are not published."""
import os, re, sys, importlib.util
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('mq', os.path.join(HERE, 'make-qr.py')); mq = importlib.util.module_from_spec(spec); spec.loader.exec_module(mq)
PORTAL = 'https://steadypathcareers.com/portal/'
QR = mq.svg(PORTAL, 'QR code. Scan it with your phone camera to open steadypathcareers.com/portal/')

A = open(os.path.join(ROOT, 'about/index.html'), encoding='utf-8').read()
head_end = A.index('</head>'); body_start = A.index('<body')
head = A[:head_end]
DESC = 'Put Steady Path Careers on your phone: your job matches, documents, questions and application tracker, one tap from your home screen. Free with the service, no app store needed.'
OLD_DESC = re.search(r'<meta name="description" content="([^"]*)">', head).group(1)
head = head.replace(OLD_DESC, DESC).replace('<title>About · Steady Path Careers</title>', '<title>Get the app · Steady Path Careers</title>')
head = head.replace('https://steadypathcareers.com/about/', 'https://steadypathcareers.com/app/').replace('About · Steady Path Careers', 'Get the app · Steady Path Careers')
head = head.replace('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="#10213A">')
head = re.sub(r'<style>\n\.mk \.prose \.card.*?</style>\n', '', head, flags=re.S)
CSS = '''<style id="app-page">
.ap-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); margin-top: 26px; }
.ap-grid .card { background: #fff; padding: 20px 22px; min-width: 0; }
.ap-grid .card h3 { margin: 0 0 6px; font: 800 19px/1.25 var(--display); color: var(--midnight); }
.ap-grid .card p { margin: 0; line-height: 1.55; }
.ap-ic { display: block; width: 40px; height: 40px; margin-bottom: 10px; }
.ap-os { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); margin-top: 26px; }
.ap-os .card { background: #fff; padding: 22px; min-width: 0; }
.ap-os h3 { margin: 0 0 4px; font: 800 20px/1.25 var(--display); color: var(--midnight); }
.ap-os .when { margin: 0 0 12px; color: var(--ink2); font-size: 15px; }
.ap-os ol { margin: 0; padding-left: 22px; }
.ap-os li { margin: 0 0 8px; line-height: 1.55; font-size: 17px; }
.ap-install { margin-top: 18px; }
.ap-install[hidden], [data-install][hidden] { display: none !important; }
.ap-qr { display: none; margin-top: 26px; background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px 22px; grid-template-columns: 168px minmax(0, 1fr); gap: 22px; align-items: center; max-width: 640px; }
.ap-qr .qr { width: 168px; height: 168px; display: block; }
.ap-qr h3 { margin: 0 0 6px; font: 800 19px/1.25 var(--display); color: var(--midnight); }
.ap-qr p { margin: 0; line-height: 1.55; }
@media (min-width: 761px) and (hover: hover) { .ap-qr { display: grid; } }
.ap-have { display: none; background: #fff; border-left: 5px solid var(--gold); border-radius: 14px; padding: 16px 18px; margin-top: 18px; max-width: 640px; }
.ap-note { margin: 18px 0 0; color: var(--ink2); font-size: 15px; max-width: 720px; }
.ap-code { background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 20px 22px; max-width: 720px; }
.ap-code ol { margin: 10px 0 0; padding-left: 22px; }
.ap-code li { margin: 0 0 8px; line-height: 1.55; }
@media (display-mode: standalone) { .ap-howto, .ap-qr, [data-install] { display: none !important; } .ap-have { display: block; } }
html.is-standalone .ap-howto, html.is-standalone .ap-qr, html.is-standalone [data-install] { display: none !important; }
html.is-standalone .ap-have { display: block; }
</style>
'''
# r30: theme.css loads last, after this page's own styles
THEME = re.search(r'<link rel="stylesheet" href="/assets/theme\.css[^"]*">\n', head).group(0)
head = head.replace(THEME, '') + CSS + THEME

body = A[body_start:]
hdr = body[:body.index('<main')]
hdr = hdr.replace('<a href="/about/" aria-current="true">About</a>', '<a href="/about/">About</a>')
hdr = re.sub(r'<div class="phero-copy">.*?</div></div><div class="phero-art">.*?</svg></div>',
  '<div class="phero-copy"><p class="kicker">The app</p><h1>Steady Path on your phone.</h1>'
  '<p class="sub">Your portal, one tap from your home screen. It is free with the service, and there is no app store to visit: you add it straight from your phone&#39;s browser.</p>'
  '<div class="cta"><button class="btn gold" type="button" data-install hidden>Install the app</button><a class="btn gold" data-cta href="#install">How to install</a><a class="btn line" href="/portal/">Client sign in</a></div>'
  '<p class="fine ap-have" role="note">You&#39;re already using the app. Nothing else to install.</p></div>'
  '<div class="phero-art"><svg class="hero-svg" viewBox="0 0 320 240" aria-hidden="true" focusable="false">'
  '<circle cx="160" cy="120" r="104" fill="#F7E7CC"/><rect x="108" y="22" width="104" height="200" rx="18" fill="#10213A"/>'
  '<rect x="116" y="38" width="88" height="168" rx="10" fill="#FBF6EE"/><rect x="146" y="28" width="28" height="5" rx="2.5" fill="#2E4C78"/>'
  '<rect x="126" y="52" width="68" height="40" rx="8" fill="#fff" stroke="#1F3A5F" stroke-opacity=".15"/><rect x="133" y="60" width="38" height="6" rx="3" fill="#1F3A5F"/>'
  '<rect x="133" y="72" width="26" height="5" rx="2.5" fill="#C9A227"/><circle cx="183" cy="64" r="6" fill="#1f7a46"/>'
  '<rect x="126" y="100" width="68" height="40" rx="8" fill="#fff" stroke="#1F3A5F" stroke-opacity=".15"/><rect x="133" y="108" width="44" height="6" rx="3" fill="#1F3A5F"/>'
  '<rect x="133" y="120" width="30" height="5" rx="2.5" fill="#C9A227"/><rect x="126" y="148" width="32" height="14" rx="7" fill="#F2D98A"/><rect x="162" y="148" width="32" height="14" rx="7" fill="#1f7a46"/>'
  '<g transform="translate(240 70)"><g class="pop d2"><svg x="-22" y="-22" width="44" height="44" viewBox="0 0 100 100"><defs><linearGradient id="aps" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F3A5F"/><stop offset="0.7" stop-color="#5A5F8E"/><stop offset="1" stop-color="#B9786A"/></linearGradient><clipPath id="apr"><rect width="100" height="100" rx="22"/></clipPath></defs><g clip-path="url(#apr)"><rect width="100" height="100" fill="#1F3A5F"/><rect width="100" height="40" fill="url(#aps)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-72 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-48 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(-24 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(24 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(48 50 40)"/><path d="M48.4 21 L51.6 21 L50.5 9 L49.5 9 Z" fill="#FFD166" transform="rotate(72 50 40)"/><path d="M49.0 41.1 L49.1 42.3 L49.2 43.6 L49.6 44.8 L50.0 45.9 L50.6 46.9 L51.2 47.9 L51.9 48.8 L52.7 49.6 L53.5 50.4 L54.3 51.2 L55.2 52.0 L56.0 52.7 L56.8 53.4 L57.6 54.1 L58.4 54.8 L59.1 55.5 L59.7 56.2 L60.2 56.8 L60.7 57.5 L61.0 58.2 L61.3 58.9 L61.4 59.5 L61.5 60.2 L61.4 60.9 L61.3 61.6 L61.0 62.0 L60.6 62.4 L60.0 62.9 L59.2 63.4 L58.2 63.9 L57.0 64.4 L55.6 64.8 L54.1 65.3 L52.5 65.7 L50.8 66.1 L49.0 66.5 L47.2 66.9 L45.4 67.4 L43.6 67.8 L41.8 68.3 L40.1 68.9 L38.4 69.6 L36.8 70.5 L35.2 71.5 L33.7 72.9 L32.4 74.6 L31.5 76.7 L31.2 78.7 L31.1 80.0 L31.1 81.0 L31.1 82.0 L31.2 83.1 L31.4 84.1 L31.6 85.0 L31.8 86.0 L32.2 86.9 L32.5 87.9 L33.0 88.8 L33.4 89.7 L33.9 90.5 L34.4 91.3 L35.0 92.1 L35.6 92.9 L36.2 93.7 L36.8 94.4 L37.5 95.2 L38.2 95.9 L38.9 96.6 L39.6 97.3 L40.3 97.9 L41.1 98.6 L41.8 99.2 C49.83 104.73 58.24 92.31 50.20 86.79 L49.4 86.4 L48.8 86.1 L48.1 85.7 L47.5 85.4 L46.9 85.1 L46.3 84.8 L45.8 84.5 L45.3 84.2 L44.8 83.9 L44.4 83.6 L44.0 83.3 L43.6 83.0 L43.2 82.7 L42.9 82.4 L42.6 82.1 L42.3 81.9 L42.1 81.6 L41.9 81.3 L41.6 81.0 L41.4 80.6 L41.3 80.3 L41.1 79.9 L41.0 79.5 L40.8 79.3 L40.7 78.9 L40.7 78.6 L41.0 78.2 L41.5 77.7 L42.3 77.1 L43.4 76.5 L44.7 75.9 L46.1 75.3 L47.7 74.7 L49.3 74.1 L51.0 73.5 L52.7 72.9 L54.5 72.3 L56.2 71.6 L57.9 70.9 L59.5 70.2 L61.1 69.4 L62.5 68.4 L63.8 67.3 L65.0 66.0 L65.9 64.5 L66.4 62.8 L66.6 61.1 L66.4 59.6 L66.0 58.3 L65.5 57.1 L64.9 56.0 L64.2 55.0 L63.4 54.1 L62.5 53.3 L61.7 52.6 L60.7 51.9 L59.8 51.3 L58.9 50.7 L58.0 50.1 L57.1 49.5 L56.2 48.9 L55.4 48.3 L54.6 47.6 L53.8 47.0 L53.2 46.3 L52.6 45.6 L52.1 44.8 L51.6 44.0 L51.3 43.1 L51.1 42.1 L51.0 40.9 Z" fill="#FAF6EC"/><rect x="60.36" y="54.61" width="1.81" height="0.56" rx="0.28" transform="rotate(45.8 61.27 54.89)" fill="#E3B23C"/><rect x="61.36" y="64.02" width="2.55" height="0.79" rx="0.40" transform="rotate(131.7 62.64 64.42)" fill="#E3B23C"/><rect x="46.22" y="70.08" width="3.38" height="1.05" rx="0.53" transform="rotate(163.6 47.91 70.60)" fill="#E3B23C"/><rect x="33.95" y="77.37" width="4.28" height="1.33" rx="0.67" transform="rotate(100.9 36.09 78.04)" fill="#E3B23C"/><rect x="35.15" y="84.55" width="5.28" height="1.64" rx="0.82" transform="rotate(58.6 37.79 85.37)" fill="#E3B23C"/><rect x="39.30" y="89.41" width="6.21" height="1.93" rx="0.97" transform="rotate(39.1 42.40 90.38)" fill="#E3B23C"/><path d="M36 40 A14 14 0 0 1 64 40 Z" fill="#FFD166"/><rect x="0" y="38.4" width="100" height="3.2" fill="#E3B23C"/></g></svg></g></g>'
  '<g transform="translate(70 170) scale(0.9)"><g class="pop"><path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill="#C9A227"/></g></g>'
  '</svg></div>', hdr, count=1, flags=re.S)
assert 'Steady Path on your phone.' in hdr

def ic(path): return f'<svg class="ap-ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="19" fill="#FBE3CF"/>{path}</svg>'
I_MATCH = ic('<rect x="11" y="10" width="18" height="20" rx="3" fill="#fff" stroke="#1F3A5F" stroke-width="2.5"/><path d="M15 21 l3 3 l6 -7" fill="none" stroke="#1f7a46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>')
I_DOC = ic('<path d="M13 9 h10 l5 5 v17 H13Z" fill="#fff" stroke="#1F3A5F" stroke-width="2.5" stroke-linejoin="round"/><path d="M17 20 h8 M17 25 h6" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>')
I_Q = ic('<path d="M10 12 h20 v13 h-11 l-5 4 v-4 h-4Z" fill="#fff" stroke="#1F3A5F" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="18.5" r="1.8" fill="#C9A227"/>')
I_TRK = ic('<rect x="10" y="11" width="6" height="18" rx="2" fill="#1F3A5F"/><rect x="17.5" y="15" width="6" height="14" rx="2" fill="#C9A227"/><rect x="25" y="19" width="6" height="10" rx="2" fill="#1f7a46"/>')

MAIN = f'''<main id="main" class="trail-main" data-trail>
<section class="sec" id="what" data-mile style="--a:#FBE3CF;--b:#F9E9D3"><div class="wrap"><h2 data-reveal>What the app does</h2><p class="lead" data-reveal>It is the same client portal you use in a browser, saved to your home screen so it opens full screen, like an app.</p><div class="ap-grid stagger">
<div class="card">{I_MATCH}<h3>Job matches</h3><p>See each new match with its pay, where it is and why it fits. Answer Yes, No or Question with one tap.</p></div>
<div class="card">{I_DOC}<h3>Your documents</h3><p>Open your tailored resume, cover letter and interview prep. Approve them or ask for changes.</p></div>
<div class="card">{I_Q}<h3>Questions</h3><p>Ask about any job. The answer shows up on that job&#39;s card in the app.</p></div>
<div class="card">{I_TRK}<h3>Application tracker</h3><p>Every application you send, and where it stands, from applied to offer.</p></div>
</div><p class="ap-note" data-reveal>The app needs a connection to load your latest matches and documents. It is part of the service, so there is nothing extra to pay.</p></div></section>
<section class="sec" id="install" data-mile style="--a:#F9E9D3;--b:#F5D9B3"><div class="wrap"><h2 data-reveal>Add it to your phone</h2><p class="lead" data-reveal>It takes about a minute. No app store and no download to search for.</p>
<p class="ap-have" role="note">You&#39;re already using the app. Nothing else to install.</p>
<div class="ap-install" data-install hidden><button class="btn gold" type="button" data-install-go>Install the app</button></div>
<div class="ap-os ap-howto">
<div class="card" data-reveal><h3>iPhone</h3><p class="when">Use Safari.</p><ol><li>Open <b>steadypathcareers.com/portal</b> in Safari.</li><li>Tap the Share button (the square with an arrow).</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. Steady Path now has its own icon on your home screen.</li></ol></div>
<div class="card" data-reveal><h3>Android</h3><p class="when">Use Chrome.</p><ol><li>Open <b>steadypathcareers.com/portal</b> in Chrome.</li><li>Tap the menu (three dots, top right).</li><li>Tap <b>Install app</b>, or <b>Add to Home screen</b> on some phones.</li><li>Tap <b>Install</b>. Steady Path now has its own icon with your other apps.</li></ol></div>
</div>
<div class="ap-qr" aria-labelledby="qrH">{QR}<div><h3 id="qrH">On a computer?</h3><p>Point your phone&#39;s camera at this code to open the client portal on your phone, then follow the steps for your phone above.</p></div></div>
</div></section>
<section class="sec" id="signin" data-mile style="--a:#F5D9B3;--b:#F0BC7E"><div class="wrap"><h2 data-reveal>Signing in from the app</h2><div class="ap-code" data-reveal><p style="margin:0">There is no password. The first time you open the app:</p><ol><li>Enter your email and tap <b>Email me a sign-in link</b>.</li><li>The email has a link and a <b>6-digit code</b>. Type the code into the app.</li><li>That&#39;s it. The app stays signed in on that phone for 90 days.</li></ol><p style="margin:10px 0 0">Why the code? On an iPhone, the home screen app keeps its own sign-in, separate from Safari, so tapping the link in the email would sign you in to Safari instead. The code signs you in right inside the app. Each link and code works once.</p></div></div></section>
'''
fin = body[body.index('<section class="finale"'):]
fin = re.sub(r'<div class="wrap"><h2>Ready when you are\.</h2><p>[^<]*</p>', '<div class="wrap"><h2>Not a client yet?</h2><p>The app comes with the service. Free for 14 days while Steady Path Careers is in its pilot. No card needed.</p>', fin, count=1)
assert 'Not a client yet?' in fin
SCRIPT = '''<script>
/* Get the app: standalone mode hides the install steps; the native install button shows only when the browser offers it. */
(function () {
  var sa = false; try { sa = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
  if (sa) document.documentElement.classList.add('is-standalone');
  var evt = null, btns = document.querySelectorAll('[data-install]');
  function show(on) { for (var i = 0; i < btns.length; i++) btns[i].hidden = !on; }
  window.addEventListener('beforeinstallprompt', function (e) { if (sa) return; e.preventDefault(); evt = e; show(true); });
  window.addEventListener('appinstalled', function () { evt = null; show(false); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-install], [data-install-go]');
    if (!b || !evt || b.hidden) return;
    evt.prompt(); evt.userChoice.then(function () { evt = null; show(false); }, function () {});
  });
})();
</script>
'''
fin = fin.replace('<script src="/assets/site.js', SCRIPT + '<script src="/assets/site.js', 1)
out = head + '</head>\n' + hdr + MAIN + fin
os.makedirs(os.path.join(ROOT, 'app'), exist_ok=True)
sys.path.insert(0, HERE); import theme_tokens
out = theme_tokens.apply_html(out)  # r30: light/dark theme tokens, as in the committed page
open(os.path.join(ROOT, 'app/index.html'), 'w', encoding='utf-8').write(out)
print('wrote app/index.html', len(out))
