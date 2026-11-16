"""Every public page opens, has a title and a heading, throws no JavaScript errors, and fits a phone screen.
Also: the links clients were emailed keep working, and internal files stay hidden."""
import os

import pytest

from conftest import ROOT, sitemap_paths

PAGES = sitemap_paths() + ['/portal/', '/start/v2/', '/offline.html']


@pytest.mark.parametrize('path', PAGES)
def test_page_opens(open_page, base_url, path):
    page = open_page(None)
    resp = page.goto(base_url + path, wait_until='load')
    page.wait_for_timeout(500)
    assert resp and resp.status == 200, '%s answered %s' % (path, resp and resp.status)
    assert page.title().strip(), '%s has no <title>' % path
    assert page.locator('h1').count() >= 1, '%s has no <h1>' % path


@pytest.mark.parametrize('path', PAGES)
def test_fits_a_phone(open_page, path):
    page = open_page(path, width=390, height=844)
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, '%s scrolls sideways on a phone by %dpx' % (path, over)


def _status(open_page, base_url, path):
    page = open_page(None)
    r = page.context.request.get(base_url + path, max_redirects=0, fail_on_status_code=False)
    return r.status, r.headers.get('location', ''), r.text() if r.status == 200 else ''


def test_old_links_still_work(open_page, base_url):
    """AGENTS.md rule 3: links in clients' emails keep working."""
    page = open_page('/start/v2/')
    assert page.locator('#i2').count() == 1, '/start/v2/ no longer shows the intake form'
    page = open_page('/intake/')
    page.wait_for_url('**/start/', timeout=5000)
    code, loc, _ = _status(open_page, base_url, '/start/classic')
    assert code in (301, 302, 308) and loc.rstrip('/').endswith('/start'), '/start/classic should redirect to /start/'


def test_missing_page_shows_404(open_page, base_url):
    page = open_page(None)
    resp = page.goto(base_url + '/this-page-does-not-exist-xyz/', wait_until='load')
    assert resp.status == 404


@pytest.mark.parametrize('path', ['/AGENTS.md', '/_tools/site-tests/conftest.py', '/_tools/billing/copy_test.js',
                                  '/.github/workflows/site-checks.yml'])
def test_internal_files_hidden(open_page, base_url, path):
    with open(os.path.join(ROOT, path.lstrip('/')), encoding='utf-8') as f:
        start = f.read(200).strip()[:80]
    code, _, body = _status(open_page, base_url, path)
    assert not (code == 200 and start in body), '%s is publicly readable' % path
