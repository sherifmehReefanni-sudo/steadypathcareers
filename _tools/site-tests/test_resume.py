"""The resume reader shared by the intake and the portal (assets/resume-read.js), and the portal's "Your resume" card (API v1.47).

1. The intake reads a resume exactly as it did before the reader moved out of intake2.js: fixtures/parse_expected.json was
   captured from the old intake2.js (before Nov 19, 2026) on the fake resumes in fixtures/resumes.json, with the clock fixed,
   and the portal's copy of the reader gives the same answers.
2. The card (demo mode, so nothing is sent; the conftest blocks every POST anyway): every suggestion starts unticked, and only
   the file and the ticked items go in the resumeUpload body. Wrong types and files over 10 MB are refused on the device."""
import base64
import json
import os

FX = os.path.join(os.path.dirname(__file__), 'fixtures')
TEXTS = json.load(open(os.path.join(FX, 'resumes.json'), encoding='utf-8'))
EXPECTED = json.load(open(os.path.join(FX, 'parse_expected.json'), encoding='utf-8'))
NOW = '2026-11-19T12:00:00-05:00'  # "Present" counts to the current year, so the clock is fixed


def parse_all(open_page, path, fn):
    page = open_page(None)
    page.clock.set_fixed_time(NOW)
    page.goto(page.base + path, wait_until='load')
    page.wait_for_timeout(600)
    return page.evaluate('([t, fn]) => { const f = eval(fn); const o = {}; for (const k of Object.keys(t)) o[k] = f(t[k]); return o; }', [TEXTS, fn])


def test_intake_reads_resumes_as_before(open_page):
    got = parse_all(open_page, '/start/', 'window.__i2parse')
    assert set(got) == set(EXPECTED), 'fixture names differ'
    for k in EXPECTED:
        assert got[k] == EXPECTED[k], 'intake parse changed for %s:\n got %s\nwant %s' % (k, got[k], EXPECTED[k])


def test_portal_uses_the_same_reader(open_page):
    got = parse_all(open_page, '/portal/?demo=1&v=prefs', 'window.SPResume.parse')
    assert got == EXPECTED, 'the portal reads resumes differently from the intake'


def open_card(open_page, width=1280):
    page = open_page(None, width=width)
    page.clock.set_fixed_time(NOW)  # the suggestions count years to "Present"
    page.goto(page.base + '/portal/?demo=1&v=prefs', wait_until='load')
    page.wait_for_timeout(1000)
    assert page.locator('#ruH').is_visible(), '"Your resume" card missing from Search settings'
    return page


def choose(page, name, body, mime='text/plain'):
    page.set_input_files('#ruFile', files=[{'name': name, 'mimeType': mime, 'buffer': body}])
    page.wait_for_timeout(700)


def uploads(page):
    return [b for b in page.evaluate('S.demoLog') if b.get('action') == 'resumeUpload']


def test_card_sends_only_ticked_items(open_page):
    page = open_card(open_page)
    text = TEXTS['dashes_present']
    choose(page, 'resume.txt', text.encode('utf-8'))
    boxes = page.locator('[data-rutick]')
    labels = [l.strip() for l in page.locator('.ru-opt').all_inner_texts()]
    assert boxes.count() >= 6, 'suggestions missing: %s' % labels
    assert all(not boxes.nth(i).is_checked() for i in range(boxes.count())), 'a suggestion started ticked'
    joined = ' | '.join(labels)
    for want in ('Senior Paralegal', 'Legal Assistant', 'Senior or lead', '12 years', 'NJ Notary Public'):
        assert want in joined, '%r not suggested: %s' % (want, joined)
    page.check('[data-rutick="h1"]')       # one title held: Paralegal
    page.check('[data-rutick="t0"]')       # one target title: Senior Paralegal
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    sent = uploads(page)
    assert len(sent) == 1, 'expected one resumeUpload, got %d' % len(sent)
    b = sent[0]
    assert base64.b64decode(b['resume']['data']).decode('utf-8') == text and b['resume']['name'] == 'resume.txt'
    assert b.get('confirm') == {'titlesHeld': ['Paralegal']}, 'unticked items were sent: %s' % b.get('confirm')
    assert b.get('targets') == ['Senior Paralegal'], 'targets sent: %s' % b.get('targets')
    assert set(b) == {'action', 't', 'resume', 'confirm', 'targets'}, 'unexpected keys: %s' % sorted(b)
    assert page.locator('#ruMsg').is_visible() and 'waiting for review' in page.inner_text('#ruMsg')
    assert 'Change settings' in page.inner_text('.pf-req'), 'the request is not listed under Waiting for review'
    assert not [x for x in page.blocked if x.startswith('POST')], 'demo mode sent something'


def test_card_nothing_ticked_sends_the_file_alone(open_page):
    page = open_card(open_page)
    choose(page, 'resume.txt', TEXTS['title_comma'].encode('utf-8'))
    page.check('[data-rutick="t0"]')
    page.uncheck('[data-rutick="t0"]')
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    b = uploads(page)[0]
    assert 'confirm' not in b and 'targets' not in b, 'items went without a tick: %s' % sorted(b)
    assert 'Got it' in page.inner_text('#ruMsg') and 'waiting for review' not in page.inner_text('#ruMsg')


def test_card_unreadable_file_still_sends(open_page):
    page = open_card(open_page)
    choose(page, 'resume.rtf', b'{\\rtf1\\ansi Hello}', 'application/rtf')
    assert page.locator('[data-rutick]').count() == 0, 'an .rtf got suggestions it cannot have'
    assert 'could not read this file' in page.inner_text('.ru')
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    assert len(uploads(page)) == 1


def test_card_refuses_wrong_type_and_big_files(open_page):
    page = open_card(open_page)
    choose(page, 'resume.exe', b'MZ')
    assert 'will not work here' in page.inner_text('#ruErr')
    choose(page, 'resume.pdf', b'%PDF' + b' ' * (10 * 1024 * 1024 - 3), 'application/pdf')
    assert 'over 10 MB' in page.inner_text('#ruErr')
    assert not uploads(page) and not page.locator('[data-rusend]').count(), 'a refused file could still be sent'


def test_card_fits_a_phone(open_page):
    page = open_card(open_page, width=390)
    choose(page, 'resume.txt', TEXTS['dashes_present'].encode('utf-8'))
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, 'the resume card scrolls sideways on a phone by %dpx' % over
