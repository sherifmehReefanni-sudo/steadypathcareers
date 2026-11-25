"""The backend switch (assets/backend.js) and the cutover flip from Apps Script to the Supabase api (the private cutover doc).

Two kinds of check:
  1. The files: the one backend address lives only in assets/backend.js, every caller loads it first, the live value is the
     expected one (EXPECTED_LIVE below), the /answer/ connect-src matches it, the flip lines apply cleanly, and the dev
     project's ref is in no file.
  2. The pages, run both ways whatever the files say: for each target backend the test serves assets/backend.js and /answer/
     with the flip lines set to that target (applying the flip, or the rollback, in the browser only; the files on disk are
     never changed). So the same checks pass before the flip, after it, and after a rollback.

Safety: the backend is mocked in the page (page.route answers with fixed JSON). A mocked request never leaves the test
machine, and anything a mock does not match still falls through to the conftest block (every POST, every outside host).
The fake client below is invented: no real names, addresses or keys."""
import hashlib
import json
import os
import re
from urllib.parse import parse_qs, urlparse

import pytest

from conftest import CALLER_CHECK, ROOT, ANSWER_CSP_TODAY, APPS_HOSTS, DEV_REF_SHA256, answer_csp_flipped, answer_csps, backend_file, real_ref

# Which backend the site is meant to call live. THE FLIP COMMIT CHANGES THIS LINE to 'supabase' (and a rollback changes it
# back), so a flip made by accident, or a half flip, fails the checks.
EXPECTED_LIVE = 'apps-script'

# The Apps Script deployment the site calls today (the forwarder after cutover). Pinned: a changed deployment ID fails here.
APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywIXNDqOMhCuyNx9px8cKGQy4zsuDwxihOF_jMr_jTxv8QOy2OxBrlXC9WffPWZcU/exec'

LIVE_LINE = {'apps-script': '  var LIVE = APPS_SCRIPT;', 'supabase': '  var LIVE = SUPABASE;'}
CSP_LINE_TODAY = 'connect-src ' + APPS_HOSTS + ';'


def csp_line_flipped(ref):
    return 'connect-src https://%s.supabase.co %s;' % (ref, APPS_HOSTS)


def read(rel):
    return open(os.path.join(ROOT, rel), encoding='utf-8').read()


# ---------------- 1. the files ----------------

def site_files():
    out = []
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith(('.', '_')) and x != 'node_modules']
        out += [os.path.join(d, f) for f in files if f.endswith(('.html', '.js', '.json', '.webmanifest')) or f in ('_headers', '_redirects')]
    return out


def test_the_backend_address_lives_only_in_backend_js():
    """the one exception: the /answer/ connect-src may name the production host, exactly as the flip writes it"""
    b = backend_file()
    hits = {}
    for f in site_files():
        s = open(f, encoding='utf-8', errors='replace').read()
        rel = os.path.relpath(f, ROOT)
        if rel == os.path.join('assets', 'backend.js'):
            continue
        if rel == os.path.join('answer', 'index.html') and real_ref(b['ref']) and s.count(csp_line_flipped(b['ref'])) == 1:
            s = s.replace(csp_line_flipped(b['ref']), CSP_LINE_TODAY)
        for needle in ('script.google.com/macros', 'AKfycb', '.supabase.co', 'supabase.co/functions'):
            if needle in s:
                hits.setdefault(rel, []).append(needle)
    assert not hits, 'a backend address outside assets/backend.js: %s' % hits


def test_every_caller_reads_sp_backend_once_through_the_one_check_and_loads_it_first():
    """each caller holds the identical check, uses it once, and never touches the global again (no re-read of kind or url)"""
    callers = {'assets/answer.js': '  var API = (%s)(window).url;' % CALLER_CHECK,
               'assets/intake2.js': '  var BACKEND = (%s)(window), API = BACKEND.url;' % CALLER_CHECK,
               'free/ghost-check/ghost-check.js': '  GC.API = (%s)(root).url;' % CALLER_CHECK,
               'portal/index.html': 'var BACKEND = (%s)(window);\nvar API = BACKEND.url;' % CALLER_CHECK}
    for f, line in callers.items():
        text = read(f)
        assert text.count(line) == 1, '%s does not read its address once through the callers\' check' % f
        rest = text.replace(CALLER_CHECK, '')
        assert 'SP_BACKEND' not in rest and 'SPBackendUrl' not in rest, '%s reads the global outside the one check' % f
    pages = {'portal/index.html': '<script>\n/* The backend address', 'answer/index.html': '/assets/answer.js',
             'start/index.html': '/assets/intake2.js', 'start/v2/index.html': '/assets/intake2.js',
             'free/ghost-check/index.html': '/free/ghost-check/ghost-check.js'}
    for f, caller in pages.items():
        html = read(f)
        m = re.search(r'<script[^>]*src="(\.\.)?/assets/backend\.js"', html)
        assert m, '%s does not load assets/backend.js' % f
        assert m.start() < html.index(caller), '%s loads assets/backend.js after the script that uses it' % f
        assert 'backend.js?' not in html, '%s loads backend.js with a ?v=: a flip would then need every page edited' % f


def test_live_backend_is_the_expected_one_and_answer_csp_matches_it():
    b = backend_file()
    assert b['kind'] == EXPECTED_LIVE, 'assets/backend.js calls %s live; the checks expect %s (see the private cutover doc)' % (b['kind'], EXPECTED_LIVE)
    assert b['apps'] == APPS_SCRIPT_URL, 'the Apps Script deployment changed: ' + b['apps']
    if b['kind'] == 'supabase':
        assert real_ref(b['ref']), 'flipped with no production project ref (or with the dev project): ' + b['ref']
    csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', read('answer/index.html')).group(1)
    assert csp in answer_csps(), 'the /answer/ connect-src does not match the live backend: ' + csp
    if not real_ref(b['ref']):
        assert csp == ANSWER_CSP_TODAY, csp


def test_flip_lines_apply_exactly_once():
    b = backend_file()
    js = read('assets/backend.js')
    assert js.count(LIVE_LINE['apps-script']) + js.count(LIVE_LINE['supabase']) == 1, 'assets/backend.js: not exactly one LIVE line'
    assert js.count(LIVE_LINE[b['kind']]) == 1
    html = read('answer/index.html')
    assert html.count(CSP_LINE_TODAY) + html.count(csp_line_flipped(b['ref'])) == 1, 'answer/index.html: the connect-src is neither of the two flip lines'


def test_the_dev_project_ref_is_in_no_file():
    """every 20-letter lowercase word in every file of the repo (site, checks, tools) against the dev ref's hash"""
    found = []
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in ('.git', 'node_modules', '__pycache__')]
        for f in files:
            path = os.path.join(d, f)
            try:
                s = open(path, encoding='utf-8').read()
            except (UnicodeDecodeError, OSError):
                continue
            for w in set(re.findall(r'(?<![a-z])[a-z]{20}(?![a-z])', s)):
                if hashlib.sha256(w.encode()).hexdigest() == DEV_REF_SHA256:
                    found.append(os.path.relpath(path, ROOT))
    assert not found, 'the dev project ref is written in: %s' % found
    assert real_ref('abcdefghijklmnopqrst') and not real_ref('production-ref-not-set') and not real_ref('ABCDEFGHIJKLMNOPQRST')


SW_HARNESS = """async (src) => {
  const handlers = {}, store = new Map([['/assets/backend.js', 'OLD']]);
  let net = 'NEW';
  const key = (k) => typeof k === 'string' ? k : new URL(k.url).pathname + new URL(k.url).search;
  const cache = { put: async (k, r) => { store.set(key(k), await r.text()); }, addAll: async () => {} };
  const caches = { open: async () => cache, keys: async () => [], delete: async () => true,
                   match: async (k) => store.has(key(k)) ? new Response(store.get(key(k))) : undefined };
  const fetchStub = async () => { if (net === null) throw new TypeError('offline'); return new Response(net, { status: 200 }); };
  const self = { addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: () => {}, clients: { claim: () => {} } };
  new Function('self', 'caches', 'fetch', 'location', src)(self, caches, fetchStub, { origin: 'https://steadypathcareers.com' });
  const ask = async () => { let p = null; handlers.fetch({ request: new Request('https://steadypathcareers.com/assets/backend.js'), respondWith: (x) => { p = x; } });
    if (!p) return 'NOT HANDLED'; const r = await p; await new Promise((ok) => setTimeout(ok, 20)); return r ? await r.text() : 'NO RESPONSE'; };
  const out = [];
  out.push(await ask(), store.get('/assets/backend.js'));   // online, an old copy stored: the network copy, and it is stored
  net = null; out.push(await ask());                         // offline: the stored (newest) copy
  store.set('/assets/backend.js', 'OLD'); net = 'NEWER'; out.push(await ask(), store.get('/assets/backend.js'));
  return out; }"""


def test_service_worker_takes_backend_js_from_the_network_first_and_keeps_the_newest(open_page):
    """behavioural: sw.js's own fetch handler, run with a stub cache and network. Whatever branch answers /assets/backend.js
    (an earlier cache-first branch included), the network copy must win online and be stored, and the stored copy is used offline."""
    sw = read('sw.js')
    assert "'/assets/backend.js'" in sw.split("self.addEventListener('install'")[0], 'backend.js is not in the offline copy of the portal'
    page = open_page('/404.html', wait=100)
    got = page.evaluate(SW_HARNESS, sw)
    assert got == ['NEW', 'NEW', 'NEW', 'NEWER', 'NEWER'], 'the service worker does not serve backend.js network first and keep the newest: %s' % got


# ---------------- 2. the pages, both ways ----------------

TOKEN = 'tok_' + 'abcdefghij' * 4
KEY = '0123456789abcdef' * 2 + '01234567'  # 40 hex, the C2-B email key shape
JOB = {'title': 'Office Coordinator', 'company': 'Example Health', 'pay': '$55,000 a year'}


def me_reply():
    """a me answer in the Supabase api's shape (app.me, migration p148b): every key it sends, with invented values"""
    def job(i, company, answer):
        return {'id': i, 'added': '2026-11-20', 'company': company, 'title': 'Office Coordinator', 'location': 'Newark, NJ',
                'setting': 'On-site', 'pay': '$55,000 a year', 'payLow': 55000, 'paySource': 'posted', 'floor': '', 'why': 'Fits your scheduling work.',
                'link': 'https://example.com/jobs/' + i, 'notes': '', 'suggested': '', 'answer': answer, 'noReason': '', 'note': '',
                'answeredOn': '2026-11-21' if answer else '', 'kit': {'pay': '', 'start': '', 'why': '', 'other': ''}, 'closed': False,
                'closedOn': '', 'postStatus': 'Open', 'postChecked': '2026-11-23', 'fit': '', 'concern': '', 'docsDue': '',
                'reply': '', 'replyDate': '', 'earlierReplies': ''}

    def doc(i, name, pdf, state):
        return {'id': i, 'jobId': 'J-2', 'name': name, 'link': 'https://docs.google.com/document/d/exampledoc%s/edit' % i[-1],
                'status': 'Approved', 'request': '', 'updated': '2026-11-22', 'version': '', 'changed': '', 'changeLog': '',
                'approvedPdf': pdf, 'pdfState': state}
    return {'ok': True, 'serverTime': '2026-11-24T15:00:00.000Z',
            'client': {'id': 'C900', 'name': 'Pat Example', 'firstName': 'Pat', 'stage': 'Active', 'startDate': '2026-11-01',
                       'firstJobsSent': '2026-11-03', 'trialEnds': '', 'payFloor': 50000, 'weeklyNote': '', 'lastTouch': '',
                       'lastFeedback': '', 'home': 'Newark, NJ', 'std': ''},
            'jobs': [job('J-1', 'Example Health', ''), job('J-2', 'Example Clinic', 'Yes')],
            'docs': [doc('D-1', 'Resume for Example Clinic', 'https://drive.google.com/uc?export=download&id=examplepdf0001', 'frozen'),
                     doc('D-2', 'Cover letter for Example Clinic', '', 'held')],
            'apps': [], 'notify': False,
            'prefs': {'roles': ['Office Coordinator'], 'searchTerms': [], 'payFloor': '50000', 'commute': '', 'setting': '', 'contact': '', 'status': 'active'},
            'requests': [], 'milestones': {'on': False, 'reached': [], 'unseen': []}, 'lastMatchCheck': '',
            'resume': {'onFile': True, 'source': 'base', 'date': ''}}


def replies(**over):
    r = {'me': me_reply(), 'answer': {'ok': True, 'job': 'J-1', 'answer': 'Yes'}, 'redeem': {'ok': True, 't': TOKEN},
         'requestLink': {'ok': True}, 'ievent': {'ok': True}, 'track': {'ok': True},
         'answerLook': {'ok': True, 'kind': 'email', 'answer': 'yes', 'job': JOB}, 'answerSave': {'ok': True, 'answer': 'Yes', 'job': JOB},
         'ghostCheck': {'ok': True, 'status': 'open', 'ats': 'ashby', 'title': 'Office Coordinator', 'company': 'Example Health', 'postedOn': '2026-11-10'}}
    r.update(over)
    return r


# The ref the checks use when the files have no production ref yet: 20 letters, invented, not the dev project. Every request
# to it is answered by the mock below; nothing ever reaches it.
TEST_REF = 'sitecheckfakerefabcd'
VALUE_LITERAL = "Object.freeze({ url: LIVE, kind: LIVE === SUPABASE ? 'supabase' : 'apps-script' })"
RESULT_LITERAL = "Object.freeze({ url: url, kind: url ? VALUE.kind : '' })"


# Every fetch a page makes to a backend host, with the options it passed (window.__fx), recorded before the page's own scripts run.
FETCH_RECORDER = """(() => { const f = window.fetch; window.__fx = [];
  window.fetch = function (u, o) { try { const url = typeof u === 'string' ? u : u.url;
    if (/script\\.google\\.com|\\.supabase\\.co/.test(url)) { o = o || {}; window.__fx.push({ url: url, method: o.method === undefined ? null : o.method,
      keepalive: o.keepalive === undefined ? null : o.keepalive, credentials: o.credentials === undefined ? null : o.credentials,
      cache: o.cache === undefined ? null : o.cache, redirect: o.redirect === undefined ? null : o.redirect,
      referrerPolicy: o.referrerPolicy === undefined ? null : o.referrerPolicy, headers: JSON.stringify(o.headers === undefined ? null : o.headers),
      signal: !!o.signal, body: typeof o.body, keys: Object.keys(o).sort().join(',') }); } } catch (e) {}
    return f.apply(this, arguments); }; })();"""


def with_backend(open_page, kind, reply=None, csp=None, saved_token=None, no_backend=False, bogus=None, bogus_at='result', before=None):
    """a page (not yet opened) whose backend is mocked, with assets/backend.js and /answer/ served with the flip lines set to
    the target, whatever the files on disk say: kind is the backend LIVE points at; csp is the /answer/ connect-src
    ('today' or 'flipped'; None: flipped for supabase, as on disk for apps-script). With no production ref in the files yet,
    the served backend.js gets TEST_REF (the prep line), so the flip can be run before the production project exists.
    no_backend: assets/backend.js fails to load. bogus: a JS expression put in the served file in place of the checked result
    (bogus_at 'result': what the callers' check sees) or of the file's own value (bogus_at 'value': what backend.js checks).
    before: a script run before every page script (a script that ran before backend.js).
    page.calls holds every backend request as (method, url, body)."""
    page = open_page(None)
    b = backend_file()
    ref = b['ref'] if real_ref(b['ref']) else TEST_REF
    page.calls, answers = [], reply or replies()
    url = b['apps'] if kind == 'apps-script' else 'https://%s.supabase.co/functions/v1/api' % ref
    page.backend = url
    if saved_token:
        page.add_init_script("try { localStorage.setItem('sp_token', %s); } catch (e) {}" % json.dumps(saved_token))
    if before:
        page.add_init_script(before)
    page.add_init_script(FETCH_RECORDER)
    csp = csp or ('flipped' if kind == 'supabase' else None)
    lines = {'assets/backend.js': (LIVE_LINE['apps-script'], LIVE_LINE['supabase'], LIVE_LINE[kind]),
             'answer/index.html': (CSP_LINE_TODAY, csp_line_flipped(b['ref']),
                                   None if csp is None else CSP_LINE_TODAY if csp == 'today' else csp_line_flipped(ref))}

    def serve(route, rel):
        resp = route.fetch(max_redirects=0)
        body = resp.text()
        one, two, target = lines[rel]
        assert body.count(one) + body.count(two) == 1, 'the served %s has neither flip line' % rel
        if target is not None:
            body = body.replace(one, target).replace(two, target)
        if rel == 'assets/backend.js':
            prep = "  var PRODUCTION_REF = '%s';" % b['ref']
            assert body.count(prep) == 1, 'the served backend.js has no PRODUCTION_REF line'
            body = body.replace(prep, "  var PRODUCTION_REF = '%s';" % ref)
            if bogus is not None:
                lit = RESULT_LITERAL if bogus_at == 'result' else VALUE_LITERAL
                assert body.count(lit) == 1, 'the served backend.js has no %s line' % bogus_at
                body = body.replace(lit, bogus)
        route.fulfill(response=resp, body=body)
    if no_backend:
        page.route(re.compile(r'.*/assets/backend\.js(\?.*)?$'), lambda r: r.abort())
    else:
        page.route(re.compile(r'.*/assets/backend\.js(\?.*)?$'), lambda r: serve(r, 'assets/backend.js'))
    page.route(re.compile(r'^[^#?]*/answer/(\?[^#]*)?$'), lambda r: serve(r, 'answer/index.html'))

    def mock(route):
        req = route.request
        origin = req.headers.get('origin') or '*'
        cors = {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'}
        if req.method == 'OPTIONS':
            return route.fulfill(status=204, headers=dict(cors, **{'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type'}))
        body = {}
        if req.method == 'POST':
            try:
                body = json.loads(req.post_data or '{}')
            except ValueError:
                body = {}
            action = body.get('action')
        else:
            action = (parse_qs(urlparse(req.url).query).get('action') or [''])[0]
        page.calls.append((req.method, req.url, body))
        base, _, query = req.url.partition('?')
        if base != url or (req.method == 'POST' and query) or (req.method == 'GET' and set(parse_qs(query)) - {'action', 't'}):
            return route.abort()  # recorded above, so assert_only_backend names it
        if kind == 'supabase' and req.method == 'GET':  # the site must never read anything by GET from the Supabase api (M2)
            return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps({'ok': False, 'error': 'test: GET refused'}))
        out = answers.get(action, {'ok': False, 'error': 'unknown action'})
        return route.fulfill(status=200, headers=cors, content_type='application/json', body=json.dumps(out))
    page.route('https://script.google.com/**', mock)
    page.route('https://script.googleusercontent.com/**', mock)
    page.route(re.compile(r'^https://[a-z0-9-]+\.supabase\.co/.*'), mock)
    return page


def go(page, path, wait=900):
    page.goto(page.base + path, wait_until='load')
    page.wait_for_timeout(wait)
    return page


def actions(page):
    return [(m, c.get('action') if m == 'POST' else (parse_qs(urlparse(u).query).get('action') or [''])[0]) for m, u, c in page.calls]


def exact_call(page, call):
    """a POST to exactly the backend URL, with no query; or (Apps Script me only) a GET of exactly the backend URL plus action and t"""
    m, u, c = call
    if m == 'POST':
        return u == page.backend
    base, _, query = u.partition('?')
    return m == 'GET' and base == page.backend and set(parse_qs(query)) == {'action', 't'} and len(parse_qs(query)['action']) == 1


def assert_only_backend(page):
    assert page.calls and all(exact_call(page, c) for c in page.calls), 'a call went somewhere other than exactly the backend: %s' % page.calls
    leaked = [b for b in page.blocked if not b.startswith('GET ') or 'script.google' in b or 'supabase' in b]
    assert not leaked, 'a backend call got past the mock (stopped by the conftest): %s' % leaked


KINDS = ['apps-script', 'supabase']


@pytest.mark.parametrize('kind', KINDS)
def test_backend_js_gives_each_page_the_switched_address(open_page, kind):
    page = go(with_backend(open_page, kind), '/portal/', 400)
    got = page.evaluate('window.SP_BACKEND')
    assert got == {'url': page.backend, 'kind': kind}, got
    assert page.evaluate('API') == page.backend and page.evaluate('BACKEND') == got and page.evaluate('Object.isFrozen(BACKEND)')
    d = page.evaluate("(() => { const d = Object.getOwnPropertyDescriptor(window, 'SP_BACKEND'); return { value: 'value' in d, writable: d.writable, configurable: d.configurable, frozen: Object.isFrozen(d.value), "
                      "url: 'value' in Object.getOwnPropertyDescriptor(d.value, 'url'), kind: 'value' in Object.getOwnPropertyDescriptor(d.value, 'kind') }; })()")
    assert d == {'value': True, 'writable': False, 'configurable': False, 'frozen': True, 'url': True, 'kind': True}, d
    assert page.evaluate("typeof window.SPBackendUrl === 'undefined' && !('SP_BACKEND_REFUSED' in window)")
    page.evaluate("try { window.SP_BACKEND = { url: 'https://collect.example.com/', kind: 'apps-script' }; } catch (e) {}")
    assert page.evaluate('window.SP_BACKEND') == got, 'SP_BACKEND could be overwritten'


@pytest.mark.parametrize('kind', KINDS)
def test_portal_token_link_reads_me_and_clears_the_address_bar(open_page, kind):
    page = go(with_backend(open_page, kind), '/portal/?t=' + TOKEN)
    assert TOKEN not in page.url and '?' not in page.url, 'the token stayed in the address bar: ' + page.url
    first = page.calls[0]
    if kind == 'apps-script':  # today, unchanged: GET with the token in the query
        assert first[0] == 'GET' and parse_qs(urlparse(first[1]).query) == {'action': ['me'], 't': [TOKEN]}, first
    else:  # M2 and C1-B: a POST with the token in the body, and the token in no URL at all
        assert first[0] == 'POST' and first[1] == page.backend and first[2] == {'action': 'me', 't': TOKEN}, first
        assert not [c for c in page.calls if c[0] == 'GET'], 'a GET reached the Supabase api: %s' % page.calls
        assert not [c for c in page.calls if TOKEN in c[1]], 'the token went in a URL'
    assert page.evaluate('S.status') == 'ready' and page.evaluate('S.data.client.firstName') == 'Pat'
    page.evaluate("sendAnswer('J-1', 'yes')")
    page.wait_for_timeout(400)
    last = page.calls[-1]
    assert last[0] == 'POST' and last[1] == page.backend and last[2] == {'action': 'answer', 't': TOKEN, 'job': 'J-1', 'a': 'yes'}, last
    assert_only_backend(page)


@pytest.mark.parametrize('kind', KINDS)
def test_documents_from_the_backend_shape(open_page, kind):
    """the new download buttons with a me answer in the Supabase shape: a frozen approved PDF is offered, a held one gives no
    file at all, and an approved document never gets a live Word export. This me has no approvedDocx, as Supabase's me has none
    today (the freezer is to add the frozen Word copy; test_portal_downloads.py covers the buttons when it is sent)"""
    page = go(with_backend(open_page, kind), '/portal/?t=%s&v=docs' % TOKEN, 1100)
    hrefs = lambda d: page.evaluate("d => [...document.querySelectorAll('[data-doc=\"' + d + '\"] a')].map(a => a.getAttribute('href') || '')", d)
    d1, d2 = hrefs('D-1'), hrefs('D-2')
    assert 'https://drive.google.com/uc?export=download&id=examplepdf0001' in d1, d1
    assert not [h for h in d1 if 'format=docx' in h], 'a live Word export for an approved document: %s' % d1
    assert not [h for h in d2 if 'export' in h or h.startswith('https://drive.google.com/uc')], 'a held document offered a file: %s' % d2


@pytest.mark.parametrize('kind', KINDS)
def test_email_key_link_is_redeemed_on_continue(open_page, kind):
    page = go(with_backend(open_page, kind), '/portal/?k=' + KEY)
    assert KEY not in page.url, 'the key stayed in the address bar'
    assert page.calls == [], 'the key was used before Continue (a link scanner would spend it): %s' % page.calls
    page.click('#linkGo')
    page.wait_for_timeout(900)
    assert page.calls[0][0] == 'POST' and page.calls[0][2] == {'action': 'redeem', 'k': KEY}, page.calls
    assert actions(page)[1] == (('GET', 'me') if kind == 'apps-script' else ('POST', 'me')), page.calls
    assert page.evaluate("localStorage.getItem('sp_token')") == TOKEN and page.evaluate('S.status') == 'ready'
    assert_only_backend(page)


@pytest.mark.parametrize('kind', KINDS)
def test_email_key_with_a_saved_session_keeps_the_session_and_the_key(open_page, kind):
    """C2-B: a second click on the same email, on a device that is signed in, opens the portal and spends nothing"""
    page = go(with_backend(open_page, kind, saved_token=TOKEN), '/portal/?k=' + KEY)
    assert [a for m, a in actions(page)] == ['me'], page.calls
    assert page.evaluate('S.status') == 'ready' and KEY not in page.url


@pytest.mark.parametrize('kind', KINDS)
@pytest.mark.parametrize('err', ['used', 'expired'])
def test_email_key_used_or_expired_without_a_session_shows_sign_in_with_a_note(open_page, kind, err):
    page = go(with_backend(open_page, kind, reply=replies(redeem={'ok': False, 'error': err})), '/portal/?k=' + KEY)
    page.click('#linkGo')
    page.wait_for_timeout(700)
    assert page.evaluate('S.status') == 'signin' and page.locator('#email').count(), 'not the sign-in screen'
    note = page.inner_text('#app .warn')
    if err == 'used':  # on Supabase the key may be a job or welcome email button, not a sign-in link
        want = 'That sign-in link was already used.' if kind == 'apps-script' else 'That link was already used. Each link works once.'
        assert note.startswith(want), note
    else:  # an email key lives 7 days on Supabase, so the note names no length there; today's wording is unchanged
        assert note.startswith('That link has expired.') and ('30 minutes' in note) == (kind == 'apps-script'), note
    assert not page.locator('#errH').count(), 'an error screen instead of the sign-in screen'


@pytest.mark.parametrize('kind', KINDS)
def test_sign_in_by_email_and_code(open_page, kind):
    page = go(with_backend(open_page, kind), '/portal/', 600)
    page.fill('#email', 'pat@example.com')
    page.click('#linkBtn')
    page.wait_for_timeout(500)
    assert page.calls[0][2] == {'action': 'requestLink', 'email': 'pat@example.com'}, page.calls
    page.fill('#code', '123456')
    page.click('#codeBtn')
    page.wait_for_timeout(800)
    assert page.calls[1][2] == {'action': 'redeem', 'email': 'pat@example.com', 'code': '123456'}, page.calls
    assert [a for m, a in actions(page)][2] == 'me' and page.evaluate('S.status') == 'ready'
    assert_only_backend(page)


def test_question_button_redirect_with_an_ended_session_opens_sign_in(open_page):
    """the Supabase api's GET answer?a=q answers an ended session with /portal/?t=...&expired=1: sign-in, no request"""
    page = go(with_backend(open_page, 'supabase'), '/portal/?t=%s&expired=1' % TOKEN)
    assert page.calls == [] and page.evaluate('S.status') == 'signin' and TOKEN not in page.url
    assert 'That link has expired.' in page.inner_text('#app .warn')


@pytest.mark.parametrize('kind', KINDS)
def test_answer_page_looks_then_saves_through_the_backend(open_page, kind):
    page = go(with_backend(open_page, kind), '/answer/#k=' + KEY, 900)
    assert page.calls == [('POST', page.backend, {'action': 'answerLook', 'k': KEY})], page.calls
    assert 'Say yes to this job?' in page.inner_text('main') and page.evaluate('location.hash') == ''
    page.click('#ansGo')
    page.wait_for_timeout(600)
    assert page.calls[1] == ('POST', page.backend, {'action': 'answerSave', 'k': KEY}), page.calls
    assert 'Saved. You said yes to Office Coordinator at Example Health ($55,000 a year).' in page.inner_text('main')
    assert_only_backend(page)


def test_answer_page_half_flip_cannot_reach_supabase(open_page):
    """backend.js flipped but the /answer/ connect-src not: the page's own CSP stops the request. This is why the CSP line is
    part of the same flip commit."""
    page = go(with_backend(open_page, 'supabase', csp='today'), '/answer/#k=' + KEY, 1200)
    assert page.calls == [], page.calls
    assert 'We could not reach Steady Path' in page.inner_text('main')


@pytest.mark.parametrize('kind', KINDS)
def test_intake_funnel_ping_goes_to_the_backend(open_page, kind):
    for path in ('/start/', '/start/v2/'):
        page = go(with_backend(open_page, kind), path, 600)
        page.click('#i2 [data-nav=next]')
        page.wait_for_timeout(600)
        evs = [c for m, u, c in page.calls if c.get('action') == 'ievent']
        assert evs and all(set(c) == {'action', 'sid', 'screen', 'stop', 'field'} for c in evs), page.calls
        assert_only_backend(page)


@pytest.mark.parametrize('kind', KINDS)
def test_ghost_check_server_check_goes_to_the_backend(open_page, kind):
    page = go(with_backend(open_page, kind), '/free/ghost-check/', 600)
    link = 'https://jobs.ashbyhq.com/example/0f0f0f0f-1111-2222-3333-444444444444'
    page.fill('#gc-url', link)
    page.click('#gc-go')
    page.wait_for_timeout(900)
    assert len(page.calls) == 1 and page.calls[0][0] == 'POST' and page.calls[0][2]['action'] == 'ghostCheck' and page.calls[0][2]['url'] == link, page.calls
    assert "Open on the employer's site" in page.inner_text('#gc-out')
    assert_only_backend(page)


@pytest.mark.parametrize('kind', KINDS)
def test_intake_sends_to_the_backend_and_the_portal_button_keeps_the_token_out_of_the_url(open_page, kind):
    """the intake POST goes to the switched address; on Supabase the thank-you screen's "Open my portal" link has no ?t=,
    because the session the intake answer carries is already saved on this device (C1-B). Apps Script: unchanged."""
    page = go(with_backend(open_page, kind, reply=replies(intake={'ok': True, 'clientId': 'C900', 'token': TOKEN})), '/start/', 600)
    page.evaluate("id => window.__i2go(id)", 'confirmSend')
    page.wait_for_timeout(300)
    for k in ('agreeAdult', 'agreeTrue', 'agreeTrial'):
        page.check('#i2 [data-b="%s"]' % k)
    page.fill('#i2 [data-k="signature"]', 'Pat Example')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    page.click('#i2nores [data-act="sendnoresume"]')
    page.wait_for_timeout(1200)
    sent = [c for m, u, c in page.calls if c.get('action') == 'intake']
    assert len(sent) == 1 and sent[0].get('signature') == 'Pat Example', page.calls
    assert page.evaluate("localStorage.getItem('sp_token')") == TOKEN
    href = page.get_attribute('#i2 a.btn.gold', 'href')
    assert href == ('/portal/?t=' + TOKEN if kind == 'apps-script' else '/portal/'), href
    assert_only_backend(page)


# ---------------- no backend, or a bad one: nothing is sent anywhere ----------------

FOREIGN = 'https://foreignrefabcdefghij.supabase.co/functions/v1/api'  # a well-formed api URL that is not this site's
GOOD_SUP = 'https://%s.supabase.co/functions/v1/api' % TEST_REF
BAD = {  # JS expressions served in place of the checked result (what the callers' check sees); None: no backend.js at all
    'no file': None,
    'not a url': "Object.freeze({ url: 'not a url', kind: 'apps-script' })",
    'a number': "Object.freeze({ url: 123, kind: 'apps-script' })",
    'a relative path': "Object.freeze({ url: '/collect', kind: 'apps-script' })",
    'another https host': "Object.freeze({ url: 'https://collect.example.com/functions/v1/api', kind: 'supabase' })",
    'http, not https': "Object.freeze({ url: %s, kind: 'apps-script' })" % json.dumps(APPS_SCRIPT_URL.replace('https://', 'http://')),
    'an uppercase host': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(GOOD_SUP.replace(TEST_REF, TEST_REF.upper())),
    'something after /api': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(GOOD_SUP + '/x'),
    'a query after /api': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(GOOD_SUP + '?x=1'),
    'a newline after /api': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(GOOD_SUP + '\n'),
    'kind apps-script with an api url': "Object.freeze({ url: %s, kind: 'apps-script' })" % json.dumps(GOOD_SUP),
    'kind supabase with the Apps Script url': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(APPS_SCRIPT_URL),
    'the Apps Script url plus x': "Object.freeze({ url: %s, kind: 'apps-script' })" % json.dumps(APPS_SCRIPT_URL + 'x'),
    'an unknown kind': "Object.freeze({ url: %s, kind: 'other' })" % json.dumps(APPS_SCRIPT_URL),
    'the placeholder ref (a flip with no prep line)': "Object.freeze({ url: 'https://production-ref-not-set.supabase.co/functions/v1/api', kind: 'supabase' })",
    'not frozen': "({ url: %s, kind: 'supabase' })" % json.dumps(GOOD_SUP),
    'a kind getter that changes between reads': "Object.freeze(Object.defineProperty({ url: %s }, 'kind', { enumerable: true, get: (function () { var n = 0; return function () { return n++ ? 'apps-script' : 'supabase'; }; })() }))" % json.dumps(GOOD_SUP),
}
# what backend.js itself checks: its own value with a foreign address (served in place of VALUE)
BAD_VALUE = {
    'a foreign api ref in the value': "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(FOREIGN),
    'a foreign Apps Script deployment in the value': "Object.freeze({ url: %s, kind: 'apps-script' })" % json.dumps(APPS_SCRIPT_URL.replace('/exec', 'x/exec')),
}
# a script that ran before backend.js and set the names first (non-configurable), with a foreign, well-formed address
_FOREIGN_VALUE = "Object.freeze({ url: %s, kind: 'supabase' })" % json.dumps(FOREIGN)
TAMPER = {
    'SP_BACKEND and SPBackendUrl set first': "Object.defineProperty(window, 'SP_BACKEND', { value: %s, enumerable: true }); Object.defineProperty(window, 'SPBackendUrl', { value: function () { return %s; } });" % (_FOREIGN_VALUE, json.dumps(FOREIGN)),
    'SP_BACKEND set first': "Object.defineProperty(window, 'SP_BACKEND', { value: %s, enumerable: true });" % _FOREIGN_VALUE,
    'SPBackendUrl set first': "Object.defineProperty(window, 'SPBackendUrl', { value: function () { return %s; } });" % json.dumps(FOREIGN),
    'SP_BACKEND a getter whose kind changes': "(function () { var n = 0; Object.defineProperty(window, 'SP_BACKEND', { get: function () { return Object.freeze({ url: %s, kind: n++ ? 'apps-script' : 'supabase' }); } }); })();" % json.dumps(FOREIGN),
}
CASES = [('result', c) for c in BAD] + [('value', c) for c in BAD_VALUE] + [('tamper', c) for c in TAMPER]


def bad_page(open_page, case, **kw):
    """the page with a bad backend: case is (where, name) from CASES. page.sent holds every request the page starts, to ANY
    host, as (method, url, has body)"""
    where, name = case
    if where == 'tamper':
        page = with_backend(open_page, 'apps-script', before=TAMPER[name], **kw)
    elif where == 'value':
        page = with_backend(open_page, 'apps-script', bogus=BAD_VALUE[name], bogus_at='value', **kw)
    else:
        page = with_backend(open_page, 'apps-script', no_backend=BAD[name] is None, bogus=BAD[name], **kw)
    page.sent = []
    page.on('request', lambda r: page.sent.append((r.method, r.url, bool(r.post_data))))
    return page


def assert_nothing_sent(page, *secrets):
    secrets = (TOKEN,) + secrets
    bad = [x for x in page.sent if x[0] != 'GET' or x[2] or 'action=' in x[1] or re.search(r'[?&]t=', x[1]) or any(z in x[1] for z in secrets)]
    assert not bad, 'with no good backend address the page sent: %s' % bad
    assert page.calls == [], 'a backend call with no good address: %s' % page.calls


@pytest.mark.parametrize('case', CASES, ids=['%s: %s' % c for c in CASES])
def test_bad_backend_portal_sends_nothing_and_shows_its_error(open_page, case):
    page = go(bad_page(open_page, case, saved_token=TOKEN), '/portal/', 1000)
    assert page.evaluate('API') == '' and page.evaluate('BACKEND.kind') == ''
    if case[0] == 'tamper':
        assert page.evaluate("Object.prototype.hasOwnProperty.call(window, 'SP_BACKEND_REFUSED')"), 'backend.js did not refuse a value set before it'
    assert page.evaluate('S.status') == 'error' and page.locator('#errH').count(), 'the portal did not show its connection error'
    page.evaluate("""() => { var no = function () {};
      [{ action: 'answer', t: S.token, job: 'J-1', a: 'yes' }, { action: 'track', t: S.token, what: 'x' }, { action: 'requestLink', email: 'pat@example.com' },
       { action: 'redeem', k: '%s' }, { action: 'resumeUpload', t: S.token, resume: { name: 'r.pdf', data: 'JVBERi0=' } }].forEach(function (b) { post(b).catch(no); });
      post({ action: 'signout', t: S.token }, true).catch(no); get({ action: 'me', t: S.token }).catch(no); }""" % KEY)
    page.wait_for_timeout(400)
    assert_nothing_sent(page, KEY)


@pytest.mark.parametrize('case', CASES, ids=['%s: %s' % c for c in CASES])
def test_bad_backend_answer_page_sends_nothing_and_shows_its_error(open_page, case):
    """the page's own CSP would also stop a fetch; the check is that answer.js never tries (no CSP violation at all)"""
    page = bad_page(open_page, case)
    page.add_init_script("window.__cspv = []; document.addEventListener('securitypolicyviolation', function (e) { window.__cspv.push(e.violatedDirective + ' ' + e.blockedURI); });")
    go(page, '/answer/#k=' + KEY, 900)
    assert 'We could not reach Steady Path' in page.inner_text('main')
    assert_nothing_sent(page, KEY)
    assert page.evaluate('window.__cspv') == [], 'answer.js tried to fetch with no good backend address: %s' % page.evaluate('window.__cspv')


@pytest.mark.parametrize('case', CASES, ids=['%s: %s' % c for c in CASES])
@pytest.mark.parametrize('path', ['/start/', '/start/v2/'])
def test_bad_backend_intake_sends_nothing_and_says_it_did_not_send(open_page, path, case):
    page = go(bad_page(open_page, case), path, 600)
    page.click('#i2 [data-nav=next]')  # the funnel ping
    page.wait_for_timeout(300)
    page.evaluate("id => window.__i2go(id)", 'confirmSend')
    page.wait_for_timeout(300)
    for k in ('agreeAdult', 'agreeTrue', 'agreeTrial'):
        page.check('#i2 [data-b="%s"]' % k)
    page.fill('#i2 [data-k="signature"]', 'Pat Example')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    page.click('#i2nores [data-act="sendnoresume"]')
    page.wait_for_timeout(900)
    assert 'Your intake did not send.' in page.inner_text('#i2'), page.inner_text('#i2')[:300]
    assert_nothing_sent(page, 'Pat%20Example', 'Pat Example')


@pytest.mark.parametrize('case', CASES, ids=['%s: %s' % c for c in CASES])
def test_bad_backend_ghost_check_sends_nothing_and_says_it_could_not_reach(open_page, case):
    link = 'https://jobs.ashbyhq.com/example/0f0f0f0f-1111-2222-3333-444444444444'
    page = go(bad_page(open_page, case), '/free/ghost-check/', 600)
    page.fill('#gc-url', link)
    page.click('#gc-go')
    page.wait_for_timeout(900)
    assert "We couldn't reach our checker just now." in page.inner_text('#gc-out')
    assert_nothing_sent(page, '0f0f0f0f-1111')


# ---------------- rollback ----------------

def test_rollback_is_one_line_and_works_with_the_flipped_csp(open_page):
    """the rollback sets LIVE back to APPS_SCRIPT and may keep the flipped /answer/ connect-src: the portal then reads me by GET
    from Apps Script again, and /answer/ reaches Apps Script under the CSP that still names the Supabase host"""
    page = go(with_backend(open_page, 'apps-script', csp='flipped'), '/portal/?t=' + TOKEN)
    assert page.calls[0] == ('GET', APPS_SCRIPT_URL + '?' + 'action=me&t=' + TOKEN, {}), page.calls
    assert page.evaluate('S.status') == 'ready'
    page = go(with_backend(open_page, 'apps-script', csp='flipped'), '/answer/#k=' + KEY, 900)
    csp = page.get_attribute('meta[http-equiv="Content-Security-Policy"]', 'content')
    ref = backend_file()['ref'] if real_ref(backend_file()['ref']) else TEST_REF
    assert csp == answer_csp_flipped(ref), csp
    assert page.calls == [('POST', APPS_SCRIPT_URL, {'action': 'answerLook', 'k': KEY})], page.calls
    assert 'Say yes to this job?' in page.inner_text('main')


# ---------------- the exact fetch options of every call path ----------------

CT = '{"Content-Type":"text/plain;charset=utf-8"}'


def opts(method, keepalive=None, credentials=None, cache=None, referrer=None, headers=CT, signal=False, body='string'):
    o = {'method': method, 'keepalive': keepalive, 'credentials': credentials, 'cache': cache, 'redirect': 'follow',
         'referrerPolicy': referrer, 'headers': headers, 'signal': signal, 'body': body}
    keys = {'method': method, 'body': None if body == 'undefined' else 1, 'headers': None if headers == 'null' else 1, 'keepalive': keepalive,
            'credentials': credentials, 'cache': cache, 'redirect': 1, 'referrerPolicy': referrer, 'signal': signal or None}
    o['keys'] = ','.join(sorted(k for k, v in keys.items() if v is not None))
    return o


PORTAL_GET = opts(None, cache='no-store', headers='null', body='undefined')
PORTAL_POST = opts('POST', keepalive=False, cache='no-store')
PORTAL_POST_KEEPALIVE = opts('POST', keepalive=True, cache='no-store')
ANSWER_POST = opts('POST', credentials='omit', cache='no-store', referrer='no-referrer')
INTAKE_POST = opts('POST', signal=True)
GHOST_POST = opts('POST', credentials='omit', cache='no-store', referrer='no-referrer', signal=True)


def fx(page):
    out = page.evaluate('window.__fx')
    for o in out:
        assert o['url'] == page.backend or (o['method'] is None and o['url'].split('?')[0] == page.backend), 'not exactly the backend: %s' % o['url']
    return [dict((k, v) for k, v in o.items() if k != 'url') for o in out]


@pytest.mark.parametrize('kind', KINDS)
def test_fetch_options_are_exact_on_every_call_path(open_page, kind):
    """method, keepalive, credentials, cache, redirect, referrerPolicy, headers, signal and the option keys themselves, for each
    path: portal me, an answer, sign out (keepalive); /answer/ look and save; the intake ping and send; the Ghost Job Checker"""
    page = go(with_backend(open_page, kind), '/portal/?t=' + TOKEN)
    page.evaluate("sendAnswer('J-1', 'yes')")
    page.wait_for_timeout(400)
    page.evaluate('signOut()')
    page.wait_for_timeout(400)
    me = PORTAL_GET if kind == 'apps-script' else PORTAL_POST
    assert fx(page) == [me, PORTAL_POST, PORTAL_POST_KEEPALIVE], fx(page)

    page = go(with_backend(open_page, kind), '/answer/#k=' + KEY, 900)
    page.click('#ansGo')
    page.wait_for_timeout(500)
    assert fx(page) == [ANSWER_POST, ANSWER_POST], fx(page)

    page = go(with_backend(open_page, kind, reply=replies(intake={'ok': True, 'clientId': 'C900', 'token': TOKEN})), '/start/', 600)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    page.evaluate("id => window.__i2go(id)", 'confirmSend')
    page.wait_for_timeout(300)
    for k in ('agreeAdult', 'agreeTrue', 'agreeTrial'):
        page.check('#i2 [data-b="%s"]' % k)
    page.fill('#i2 [data-k="signature"]', 'Pat Example')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    page.click('#i2nores [data-act="sendnoresume"]')
    page.wait_for_timeout(1000)
    got = fx(page)
    assert got and all(o == INTAKE_POST for o in got), got
    assert any(c.get('action') == 'intake' for m, u, c in page.calls) and any(c.get('action') == 'ievent' for m, u, c in page.calls), page.calls

    page = go(with_backend(open_page, kind), '/free/ghost-check/', 600)
    page.fill('#gc-url', 'https://jobs.ashbyhq.com/example/0f0f0f0f-1111-2222-3333-444444444444')
    page.click('#gc-go')
    page.wait_for_timeout(900)
    assert fx(page) == [GHOST_POST], fx(page)
