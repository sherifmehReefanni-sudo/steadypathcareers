"""The intake form (/start/) opens, shows the honest price, and a person can move forward and back.
Nothing is ever submitted: the conftest blocks every POST, so no intake, funnel ping or "finish later" email can go out."""
import re

from conftest import visible_text


def screen_title(page):
    return (page.text_content('#i2q') or '').strip()


def test_welcome_screen(open_page):
    page = open_page('/start/')
    text = visible_text(page)
    assert 'Hi, welcome.' in text
    assert re.search(r'Free for 14 days', text), 'trial length missing from the welcome card'
    assert '$99 a month' in text, 'price missing from the welcome card'
    assert page.locator('#i2 [data-nav=next]').is_visible(), "Let's go button missing"


def test_forward_back_and_required_answer(open_page):
    page = open_page('/start/')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(400)
    first = screen_title(page)
    choices = page.locator('#i2 [data-card]')
    assert first and choices.count() >= 3, 'first question did not appear after "Let\'s go"'

    page.click('#i2 [data-nav=next]')  # Continue with nothing picked
    page.wait_for_timeout(300)
    assert screen_title(page) == first, 'form moved on without an answer'
    assert page.locator('#i2 [role=alert]').count() or 'Please' in visible_text(page), 'no message asking for an answer'

    choices.first.click()
    page.wait_for_timeout(200)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(400)
    assert screen_title(page) != first, 'form did not move on after an answer'

    page.click('#i2 [data-nav=back]')
    page.wait_for_timeout(400)
    assert screen_title(page) == first, 'Back did not return to the first question'
    assert page.locator('#i2 [data-card][aria-checked=true]').count() == 1, 'the answer was lost after Back'


def test_nothing_was_sent(open_page):
    """The form talks to the backend from its first screen. Prove the safety block caught it and nothing else got out."""
    page = open_page('/start/')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(500)
    posts = [b for b in page.blocked if b.startswith('POST')]
    assert posts, 'expected the funnel ping to be blocked (has the form stopped calling the backend?)'
    assert all('script.google.com' in b for b in posts), 'unexpected POST target: %s' % posts


def test_works_on_a_phone(open_page):
    page = open_page('/start/', width=390, height=844)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(400)
    btn = page.locator('#i2 [data-card]').first.bounding_box()
    assert btn and btn['x'] >= 0 and btn['x'] + btn['width'] <= 390, 'answer cards run off a phone screen'
