"""Shared setup for the Steady Path site checks.

Safety first: these tests must never touch real data. Every request the page makes goes through route() below:
  - only GET/HEAD to the site itself is allowed;
  - every POST/PUT/DELETE is blocked, wherever it goes (so no intake, sign-in email, funnel ping, consent or feedback can be sent);
  - every other host is blocked (Apps Script backend, Stripe, Brevo, Clarity, Cloudflare analytics, Google Fonts, YouTube...);
  - redirects are followed hop by hop here, not by the browser: a same-site page that redirects to another host is blocked
    (the browser would otherwise follow it without asking, so a future redirect to Stripe or the backend could leak);
  - WebSockets are refused (Playwright's routing does not see them);
  - Cloudflare's analytics beacon (/cdn-cgi/rum) is blocked, so test visits never count as real traffic.
Direct test-process requests (page.context.request) are GET-only, same-site, and always use max_redirects=0.
A test fails if the page throws a JavaScript error.

Where it runs:
  - default: a local copy of this repo (server.py), so a push is checked before anyone sees it;
  - SP_BASE_URL=https://steadypathcareers.com: the live site, same blocks apply.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse

import pytest
from playwright.sync_api import sync_playwright

import server

ROOT = server.ROOT
# the one place for prices, trial length and billing wording (_tools/pricing.json), read by the checks that look at them
sys.dont_write_bytecode = True  # no __pycache__ beside _tools/pricing.py
sys.path.insert(0, os.path.join(ROOT, '_tools'))
import pricing  # noqa: E402
PRICES = pricing.load_config(ROOT)['values']
LIVE_URL = os.environ.get('SP_BASE_URL', '').rstrip('/')


@pytest.fixture(scope='session')
def base_url():
    if LIVE_URL:
        yield LIVE_URL
        return
    srv = server.start(0)
    yield 'http://127.0.0.1:%d' % srv.server_address[1]
    srv.shutdown()


@pytest.fixture(scope='session')
def is_live():
    return bool(LIVE_URL)


@pytest.fixture(scope='session')
def browser():
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        yield b
        b.close()


def _same_site(url, base):
    u, b = urlparse(url), urlparse(base)
    hosts = {b.netloc, 'www.' + b.netloc, b.netloc.replace('www.', '', 1)}
    return u.scheme == b.scheme and u.netloc in hosts


@pytest.fixture
def open_page(browser, base_url):
    """open_page(path, width=1280) -> page. The page keeps .blocked (requests stopped) and .errors (JS errors)."""
    contexts = []

    def _open(path='/', width=1280, height=900, wait=600):
        ctx = browser.new_context(viewport={'width': width, 'height': height}, service_workers='block',
                                  reduced_motion='reduce', locale='en-US', timezone_id='America/New_York')
        contexts.append(ctx)
        page = ctx.new_page()
        page.blocked, page.errors, page.base = [], [], base_url

        def allowed(method, url):
            return method in ('GET', 'HEAD') and _same_site(url, base_url) and '/cdn-cgi/rum' not in url

        def route(r):
            req = r.request
            if not allowed(req.method, req.url):
                page.blocked.append('%s %s' % (req.method, req.url[:120]))
                return r.abort()
            resp = r.fetch(max_redirects=0)
            url, hop = req.url, resp
            for _ in range(6):  # walk the redirect chain before the browser sees it
                if not 300 <= hop.status < 400:
                    break
                nxt = urljoin(url, hop.headers.get('location', ''))
                if not allowed('GET', nxt):
                    page.blocked.append('REDIRECT %s -> %s' % (req.url[:80], nxt[:120]))
                    return r.abort()
                url, hop = nxt, ctx.request.get(nxt, max_redirects=0, fail_on_status_code=False)
            else:
                page.blocked.append('REDIRECT LOOP %s' % req.url[:120])
                return r.abort()
            r.fulfill(response=resp)

        ctx.route('**/*', route)
        ctx.add_init_script("window.WebSocket = function (u) { throw new Error('WebSocket blocked by site tests: ' + u); };")
        page.on('pageerror', lambda e: page.errors.append(str(e)[:300]))
        if path is not None:
            page.goto(base_url + path, wait_until='load')
            page.wait_for_timeout(wait)
        return page

    yield _open
    errors = []
    for ctx in contexts:
        for p in ctx.pages:
            errors += ['%s: %s' % (p.url, e) for e in p.errors]
        ctx.close()
    assert not errors, 'JavaScript errors on the page:\n' + '\n'.join(errors)


def sitemap_paths():
    tree = ET.parse(os.path.join(ROOT, 'sitemap.xml'))
    locs = [e.text.strip() for e in tree.iter() if e.tag.endswith('loc') and e.text]
    return [urlparse(u).path or '/' for u in locs]


def html_files():
    out = []
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = [x for x in dirs if not x.startswith(('.', '_')) and x != 'node_modules']
        out += [os.path.join(d, f) for f in files if f.endswith('.html')]
    return sorted(out)


def visible_text(page):
    return re.sub(r'\s+', ' ', page.inner_text('body'))
