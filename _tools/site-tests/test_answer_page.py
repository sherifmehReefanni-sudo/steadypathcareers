"""/answer/: the site page that confirms an answer from an email before anything is saved (API v1.48).
The checks replace the API with window.__spAnswerPost (set before the page runs), so nothing reaches the backend; the conftest
blocks every POST and every outside host anyway."""
import re

from conftest import ROOT

K = 'a' * 40
JOB = {'title': 'Paralegal', 'company': 'Smith Law', 'pay': '$60,000'}
STUB = """window.__calls = []; window.__spAnswerPost = function (b) { window.__calls.push(b);
  var r = window.__reply && window.__reply[b.action]; return r || (b.action === 'answerLook' ? { ok: true, kind: 'email', answer: (b.a || 'yes'), job: %s } : { ok: true, answer: (b.a === 'no' ? 'No' : 'Yes'), job: %s }); };""" % (
    '{"title":"Paralegal","company":"Smith Law","pay":"$60,000"}', '{"title":"Paralegal","company":"Smith Law","pay":"$60,000"}')


def answer(open_page, frag, reply=None, width=1280):
    page = open_page(None, width=width)
    page.add_init_script(STUB + ('window.__reply = %s;' % reply if reply else ''))
    page.goto(page.base + '/answer/' + frag, wait_until='load')
    page.wait_for_timeout(500)
    return page


def calls(page):
    return page.evaluate('window.__calls')


def test_opening_the_link_records_nothing_and_the_button_saves(open_page):
    page = answer(open_page, '#k=' + K)
    assert calls(page) == [{'action': 'answerLook', 'k': K}], calls(page)
    t = page.inner_text('main')
    assert 'Say yes to this job?' in t and 'Paralegal at Smith Law ($60,000)' in t and 'Nothing is saved until you tap the button.' in t, t
    assert page.evaluate('location.hash') == '' and K not in page.url, 'the token stayed in the address bar'
    page.click('#ansGo')
    page.wait_for_timeout(400)
    assert calls(page)[1] == {'action': 'answerSave', 'k': K}, calls(page)
    t = page.inner_text('main')
    assert 'Saved. You said yes to Paralegal at Smith Law ($60,000).' in t and 'They show up in your portal for your OK.' in t, t
    assert not page.blocked, 'the page asked another host for something: %s' % page.blocked


def test_job_card_link_sends_its_session_link_details(open_page):
    t = 'tok1' * 10
    page = answer(open_page, '#t=%s&job=J1&a=no' % t)
    assert calls(page) == [{'action': 'answerLook', 't': t, 'job': 'J1', 'a': 'no'}], calls(page)
    assert 'Pass on this job?' in page.inner_text('main')
    page.click('#ansGo')
    page.wait_for_timeout(400)
    assert calls(page)[1] == {'action': 'answerSave', 't': t, 'job': 'J1', 'a': 'no'}
    assert 'Saved. You said no to Paralegal at Smith Law' in page.inner_text('main')


def test_refused_links_say_nothing_was_saved(open_page):
    for err, want in (('used or expired', 'This link was already used or has expired. Check your portal for your answer.'),
                      ('expired', 'Your sign-in link has expired. Nothing was saved.'),
                      ('closed', 'This job posting has closed, so nothing was saved.'),
                      ('answered', 'You already answered this one. You can change it in your portal.'),
                      ('limit', 'Too many tries just now. Please try again in a few minutes.'),
                      ('off', 'This link is not active. Nothing was saved.')):
        page = answer(open_page, '#k=' + K, reply="{ answerLook: { ok: false, error: '%s' } }" % err)
        t = page.inner_text('main')
        assert want in t and 'Please sign in to your portal to answer' in t, err + ': ' + t
        assert not page.locator('#ansGo').count() and len(calls(page)) == 1, err + ': a refused link offered the button'
    page = answer(open_page, '#k=nothex')
    assert 'This link is missing its details. Nothing was saved.' in page.inner_text('main') and calls(page) == []


def test_without_the_stub_it_calls_only_the_api_and_says_when_it_cannot(open_page):
    page = open_page(None)
    page.goto(page.base + '/answer/#k=' + K, wait_until='load')
    page.wait_for_timeout(1500)
    posts = [b for b in page.blocked if b.startswith('POST')]
    assert posts and all(b.startswith('POST https://script.google.com/macros/s/') for b in posts), page.blocked
    assert not [b for b in page.blocked if not b.startswith('POST')], 'the page loaded something from another host: %s' % page.blocked
    assert 'We could not reach Steady Path' in page.inner_text('main')


def test_page_locks_down_scripts_styles_and_referrer():
    html = open(ROOT + '/answer/index.html', encoding='utf-8').read()
    csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html).group(1)
    assert csp == ("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src https://script.google.com "
                   "https://script.googleusercontent.com; base-uri 'none'; form-action 'none'; object-src 'none'"), csp
    assert '<meta name="referrer" content="no-referrer">' in html
    assert not re.search(r'<script>|<script(?![^>]*\bsrc=)[^>]*>|<style|\sstyle=|\son[a-z]+=', html), 'inline script or style on /answer/'
    assert not re.search(r'(src|href)="(https?:)?//', html), 'the page loads something from another host'
    js = open(ROOT + '/assets/answer.js', encoding='utf-8').read()
    api = re.search(r"var API = '([^']+)'", js).group(1)
    portal = open(ROOT + '/portal/index.html', encoding='utf-8').read()
    assert "var API = '%s'" % api in portal, '/answer/ calls a different API than the portal'
    assert "referrerPolicy: 'no-referrer'" in js and "credentials: 'omit'" in js


def test_answer_page_fits_a_phone(open_page):
    page = answer(open_page, '#k=' + K, width=390)
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, '/answer/ scrolls sideways on a phone by %dpx' % over


def test_already_saved_shows_saved_not_nothing_saved(open_page):
    """Review L1: the link was opened again, or the reply to a save was lost; the server says the same answer is already saved."""
    page = answer(open_page, '#k=' + K, reply="{ answerLook: { ok: false, error: 'already', answer: 'yes', job: { title: 'Paralegal', company: 'Smith Law', pay: '$60,000' } } }")
    t = page.inner_text('main')
    assert 'Saved. You said yes to Paralegal at Smith Law ($60,000).' in t and 'Nothing was saved' not in t, t
    assert not page.locator('#ansGo').count()


def test_lost_reply_then_try_again_shows_saved(open_page):
    page = answer(open_page, '#k=' + K)
    page.evaluate("""() => { const orig = window.__spAnswerPost; let n = 0;
      window.__spAnswerPost = b => { if (b.action === 'answerSave') { window.__calls.push(b); return Promise.reject(new Error('lost')); }
        if (n++ > -1 && window.__calls.some(c => c.action === 'answerSave')) { window.__calls.push(b); return { ok: false, error: 'already', answer: 'yes', job: { title: 'Paralegal', company: 'Smith Law', pay: '' } }; }
        return orig(b); }; }""")
    page.click('#ansGo')
    page.wait_for_timeout(300)
    assert 'We could not reach Steady Path' in page.inner_text('main')
    page.click('#ansRetry')
    page.wait_for_timeout(300)
    t = page.inner_text('main')
    assert 'Saved. You said yes to Paralegal at Smith Law.' in t and 'Nothing was saved' not in t, t
