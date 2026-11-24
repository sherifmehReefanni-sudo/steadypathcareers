"""Home page promises and the free tools. Tools that need outside sites (the ghost job checker reads job boards) are only
checked for opening, because the tests block every outside call."""
from conftest import PRICES as V, visible_text


def test_home_page(open_page):
    page = open_page('/')
    text = visible_text(page)
    assert '$%s a month' % V['plan_monthly'] in text, 'price from _tools/pricing.json missing from the home page'
    assert page.locator('a[href^="/start"]').count() >= 1, 'no button to start on the home page'
    assert page.locator('a[href^="/portal"]').count() >= 1, 'no way to sign in from the home page'


def test_free_hub_links_every_tool(open_page):
    page = open_page('/free/')
    for t in ['/free/laid-off-72-hours/', '/free/follow-up-scripts/', '/free/tracker/', '/free/ghost-check/']:
        assert page.locator('a[href^="%s"]' % t.rstrip('/')).count(), '/free/ does not link to %s' % t


def test_pay_lookup(open_page):
    page = open_page('/pay/')
    page.fill('#q', 'nurse')
    page.wait_for_timeout(800)
    assert 'Nurse' in visible_text(page), 'pay lookup shows nothing for "nurse"'


def test_tracker_download(open_page, base_url):
    page = open_page(None)
    r = page.context.request.get(base_url + '/free/tracker/steady-path-job-tracker.xlsx', max_redirects=0)
    assert r.status == 200, 'job tracker spreadsheet answered %s' % r.status
    body = r.body()
    assert body[:2] == b'PK' and len(body) > 5000, 'job tracker download is not a real .xlsx file'


def test_theme_toggle_remembers(open_page):
    page = open_page('/')
    before = page.evaluate("document.documentElement.getAttribute('data-theme')")
    btn = page.locator('#themeb:visible, .theme-btn:visible').first
    assert btn.count(), 'dark/light toggle missing from the home page'
    btn.click()
    page.wait_for_timeout(300)
    after = page.evaluate("document.documentElement.getAttribute('data-theme')")
    assert after and after != before, 'dark/light toggle did nothing'
    page.reload()
    page.wait_for_timeout(400)
    assert page.evaluate("document.documentElement.getAttribute('data-theme')") == after, 'theme choice not remembered'
