"""The client portal: the sign-in screen works, and every screen opens in demo mode (?demo=1, sample client "Jordan").
Demo mode never calls the backend or opens Stripe, and the conftest blocks both anyway. No sign-in email is ever requested."""
import re

import pytest

VIEWS = ['home', 'jobs', 'apps', 'docs', 'practice', 'training', 'fit', 'feedback', 'billing']


def test_sign_in_screen(open_page):
    page = open_page('/portal/', wait=1200)
    assert page.locator('#email').is_visible(), 'email box missing on the sign-in screen'
    assert page.locator('#linkBtn').is_visible(), '"Email me a sign-in link" button missing'
    assert not [b for b in page.blocked if b.startswith('POST')], 'the sign-in screen sent something on its own'


def test_demo_views_open(open_page):
    """Each screen opens with its own heading (a screen that fails falls back to Home or an error and repeats a heading)."""
    page = open_page(None)
    heads = {}
    for view in VIEWS:
        page.goto(page.base + '/portal/?demo=1&v=' + view, wait_until='load')
        page.wait_for_timeout(900)
        h = page.evaluate("[...document.querySelectorAll('h1')].filter(e => e.offsetParent).map(e => e.textContent.trim())")
        assert h and h[0], '%s screen has no heading' % view
        heads[view] = h[0]
    dup = {v: t for v, t in heads.items() if list(heads.values()).count(t) > 1}
    assert not dup, 'screens share a heading (one did not open): %s' % dup


@pytest.mark.parametrize('view', ['home', 'jobs', 'billing'])
def test_demo_view_fits_a_phone(open_page, view):
    page = open_page('/portal/?demo=1&v=' + view, width=390, height=844, wait=1000)
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, 'portal %s screen scrolls sideways on a phone by %dpx' % (view, over)


def test_jobs_show_posted_pay(open_page):
    """Rule from Nov 9: no job reaches a client without posted pay."""
    page = open_page('/portal/?demo=1&v=jobs', wait=1000)
    cards = page.evaluate("[...document.querySelectorAll('article.jc')].map(e => e.textContent.replace(/\\s+/g, ' '))")
    assert cards, 'no job cards on the Jobs screen'
    no_pay = [c[:80] for c in cards if not re.search(r'\$\d', c)]
    assert not no_pay, 'job cards without posted pay: %s' % no_pay


def test_billing_links(open_page):
    page = open_page('/portal/?demo=1&v=billing', wait=1000)
    links = page.evaluate('BILLING_LINKS')
    urls = {k: v for k, v in links.items() if isinstance(v, str)}
    assert set(urls) >= {'plan', 'linkedin', 'salary', 'call', 'portal'}, 'a billing link is missing: %s' % sorted(urls)
    for k, u in urls.items():
        assert u.startswith(('https://buy.stripe.com/', 'https://billing.stripe.com/')), '%s link is not a Stripe link: %s' % (k, u)
    modes = {('test' if '/test_' in u else 'live') for u in urls.values()}
    assert len(modes) == 1, 'billing links mix Stripe test and live mode: %s' % urls
    assert page.locator('a[href^="https://billing.stripe.com/"]').count(), 'Manage billing link missing'
    assert page.locator('[data-billhired]').count(), '"I got hired" button missing'
