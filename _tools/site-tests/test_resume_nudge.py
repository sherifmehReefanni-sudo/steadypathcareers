"""A resume is needed to start the search (Nov 20, 2026; API v1.48 adds resume {onFile, source, date} to me).

1. Intake (/start/ and /start/v2/, assets/intake2.js): the resume screen says it is needed; Send with no resume file asks first
   ("Submit without it" sends, "Add my resume" goes back), after the required answers are checked; the thank-you screen says the
   search starts once the resume is uploaded from the portal, and how. "No resume? No problem" is unchanged.
2. Portal Home (demo mode): a nudge only when resume.onFile is false; a quiet "Update it" link when it is true, null or missing
   (API v1.47); both open Search settings at the Your resume card; the nudge goes after an upload without a reload.
Nothing is sent: the conftest blocks every POST. The thank-you screen is checked in the form's preview mode (served here with
data-preview removed), where the form makes no backend call at all."""
from conftest import visible_text

ASK = "We can't start your search until we have your resume. You can submit now and upload it from your portal any time."


def intake(open_page, path='/start/', preview=False):
    page = open_page(None)
    if preview:
        def serve(r):
            resp = r.fetch(max_redirects=0)
            r.fulfill(response=resp, body=resp.text().replace(' data-preview="off"', ''))
        page.route(page.base + path, serve)
    page.goto(page.base + path, wait_until='load')
    page.wait_for_timeout(600)
    return page


def at(page, screen):
    page.evaluate('id => window.__i2go(id)', screen)
    page.wait_for_timeout(300)


def sign(page):
    for k in ('agreeAdult', 'agreeTrue', 'agreeTrial'):
        page.check('#i2 [data-b="%s"]' % k)
    page.fill('#i2 [data-k="signature"]', 'Pat Example')


def posts(page):
    return [b for b in page.blocked if b.startswith('POST')]


def test_resume_screen_says_it_is_needed(open_page):
    for path in ('/start/', '/start/v2/'):
        page = intake(open_page, path)
        at(page, 'resume')
        assert 'Your resume (we need it to start your search)' in page.inner_text('#i2'), path + ': resume screen heading'
        assert page.locator('#i2 [data-act="noresume"]').count() == 1, path + ': the "No resume? No problem" path is gone'


def test_required_answers_come_before_the_resume_question(open_page):
    page = intake(open_page)
    at(page, 'confirmSend')
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    assert 'Please add' in visible_text(page), 'missing agreements were not asked for'
    assert not page.locator('#i2nores').count(), 'the resume question came before the required answers'


def test_send_without_a_resume_asks_first_and_add_goes_back(open_page):
    page = intake(open_page)
    at(page, 'confirmSend')
    sign(page)
    before = len(posts(page))
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(400)
    box = page.locator('#i2nores')
    assert box.is_visible(), 'no confirm when sending without a resume'
    assert ASK in box.inner_text(), box.inner_text()
    assert box.locator('[data-act="sendnoresume"]').inner_text().strip() == 'Submit without it'
    assert box.locator('button', has_text='Add my resume').count() == 1
    assert len(posts(page)) == before, 'the form tried to send before the client chose'
    assert page.evaluate("document.activeElement && document.activeElement.id") == 'i2nores', 'the confirm did not take focus'
    box.locator('button', has_text='Add my resume').click()
    page.wait_for_timeout(300)
    assert 'Your resume (we need it to start your search)' in page.inner_text('#i2'), '"Add my resume" did not go to the resume screen'


def test_submit_without_it_really_sends(open_page):
    """Live mode: the intake POST is attempted (and blocked by the conftest), so a phone without the file never loses the intake."""
    page = intake(open_page)
    at(page, 'confirmSend')
    sign(page)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    before = len(posts(page))
    page.click('#i2nores [data-act="sendnoresume"]')
    page.wait_for_timeout(1500)
    sent = posts(page)[before:]
    assert sent and all('script.google.com' in b for b in sent), 'Submit without it did not send: %s' % sent


def test_thank_you_without_a_resume_says_how(open_page):
    page = intake(open_page, preview=True)
    at(page, 'confirmSend')
    sign(page)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(300)
    page.click('#i2nores [data-act="sendnoresume"]')
    page.wait_for_timeout(600)
    note = page.inner_text('#i2upl')
    assert 'Your search starts once you upload your resume.' in note, note
    assert 'tap Upload my resume on the Home screen' in note and 'Your search settings, under Your resume' in note, note
    assert 'use the email you gave on this form' in note, 'no sign-in hint without a token: ' + note
    assert 'We go through your answers within 1 business day' in visible_text(page)
    assert not posts(page), 'preview mode sent something'


def test_thank_you_unchanged_with_a_file_or_no_resume_path(open_page):
    page = intake(open_page, preview=True)
    at(page, 'resume')
    page.set_input_files('#i2file', files=[{'name': 'resume.txt', 'mimeType': 'text/plain', 'buffer': b'Paralegal, Smith Law\nJan 2019 to Present\n'}])
    page.wait_for_timeout(800)
    at(page, 'confirmSend')
    sign(page)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(600)
    assert not page.locator('#i2nores').count(), 'asked about a resume that is attached'
    assert not page.locator('#i2upl').count() and 'We go through your answers and resume' in visible_text(page)

    page = intake(open_page, preview=True)
    at(page, 'resume')
    page.click('#i2 [data-act="noresume"]')
    page.wait_for_timeout(300)
    assert 'We will build your resume from these.' in page.inner_text('#i2'), 'the No resume path changed'
    at(page, 'confirmSend')
    sign(page)
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(600)
    assert not page.locator('#i2nores').count(), 'the No resume path got the upload confirm'
    assert not page.locator('#i2upl').count() and 'We go through your answers and resume' in visible_text(page)


# ---------------- portal Home ----------------
def home(open_page, resume='unset', width=1280, jobs=True):
    page = open_page('/portal/?demo=1&v=home', width=width, wait=1000)
    if not jobs:  # a new client: no job cards yet (the demo client has some)
        page.evaluate('() => { S.data.jobs = []; S.data.closed = []; render(); }')
    if resume != 'unset':
        page.evaluate('r => { S.data.resume = r; render(); }', resume)
        page.wait_for_timeout(200)
    return page


def opens_resume_card(page, sel):
    page.click(sel)
    page.wait_for_timeout(500)
    assert page.evaluate('S.view') == 'prefs', 'did not open Search settings'
    assert page.evaluate("document.activeElement && document.activeElement.id") == 'ruH', 'the Your resume card did not take focus'
    top = page.evaluate("document.getElementById('ruH').getBoundingClientRect().top")
    assert 0 <= top < 900, 'the Your resume card is not on screen (top %s)' % top


def test_home_nudge_when_no_resume_on_file(open_page):
    page = home(open_page, {'onFile': False, 'source': '', 'date': ''}, jobs=False)
    card = page.locator('[data-runudge]')
    assert card.is_visible(), 'no nudge with onFile false'
    t = card.inner_text()
    assert 'Your search starts with your resume' in t and "Upload it here and we'll get your first matches going. It takes about a minute." in t, t
    assert not page.locator('[data-ruquiet]').count(), 'the quiet link shows next to the nudge'
    grid = page.evaluate("[...document.querySelectorAll('.h44-main > *')].map(e => e.matches('[data-runudge]') ? 'nudge' : e.className).slice(0, 3)")
    assert 'nudge' in grid, 'the nudge is not near the top of Home: %s' % grid
    opens_resume_card(page, '[data-runudge] [data-ruopen]')


def test_home_quiet_link_when_on_file(open_page):
    page = home(open_page, {'onFile': True, 'source': 'base', 'date': ''})
    assert not page.locator('[data-runudge]').count(), 'nudge shown with a resume on file'
    q = page.locator('[data-ruquiet]')
    assert q.is_visible() and q.inner_text().strip() == 'Have a newer resume? Update it'
    opens_resume_card(page, '[data-ruquiet] [data-ruopen]')


def test_home_unknown_shows_only_the_quiet_link(open_page):
    """API v1.47 sends no resume field; v1.48 sends onFile null when it could not tell. Neither shows the nudge."""
    for r in ('unset', None, {'onFile': None, 'source': '', 'date': ''}, {'onFile': 'no'}):
        page = home(open_page, r)
        assert not page.locator('[data-runudge]').count(), 'nudge shown for unknown state %r' % (r,)
        assert page.locator('[data-ruquiet]').is_visible(), 'quiet link missing for %r' % (r,)


def test_nudge_goes_after_an_upload_without_a_reload(open_page):
    page = home(open_page, {'onFile': False, 'source': '', 'date': ''}, jobs=False)
    page.click('[data-runudge] [data-ruopen]')
    page.wait_for_timeout(500)
    page.set_input_files('#ruFile', files=[{'name': 'resume.txt', 'mimeType': 'text/plain', 'buffer': b'Paralegal, Smith Law\nJan 2019 to Present\n'}])
    page.wait_for_timeout(800)
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    assert page.locator('#ruMsg').is_visible(), 'the upload did not finish'
    page.evaluate("go('home')")
    page.wait_for_timeout(500)
    assert not page.locator('[data-runudge]').count(), 'the nudge is still on Home after the upload'
    assert page.locator('[data-ruquiet]').is_visible()
    assert page.evaluate('S.data.resume.onFile') is True
    assert not posts(page), 'demo mode sent something'


def test_home_nudge_fits_a_phone(open_page):
    page = home(open_page, {'onFile': False, 'source': '', 'date': ''}, width=390, jobs=False)
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, 'Home with the nudge scrolls sideways on a phone by %dpx' % over
    assert page.locator('[data-runudge] [data-ruopen]').is_visible()


def test_reminder_link_opens_the_resume_card(open_page):
    """The v1.48 reminder email links to /portal/?t=...&v=prefs&resume=1 (here in demo mode, which reads the same parameter)."""
    page = open_page('/portal/?demo=1&v=prefs&resume=1', wait=1200)
    assert page.evaluate('S.view') == 'prefs'
    assert page.evaluate("document.activeElement && document.activeElement.id") == 'ruH', 'the Your resume card did not take focus'
    top = page.evaluate("document.getElementById('ruH').getBoundingClientRect().top")
    assert 0 <= top < 900, 'the Your resume card is not on screen (top %s)' % top


def test_intake_sends_which_no_resume_path(open_page):
    """v1.48: "No resume? No problem" sends resumePlan build (we build it); Skip for now sends later; a file sends attached."""
    page = intake(open_page)
    plan = lambda: page.evaluate('[window.__i2payload().v2.resumePlan, window.__i2payload().v2.needsResumeBuild]')
    assert plan() == ['later', False], 'no file, no choice: %s' % plan()
    at(page, 'resume')
    page.click('#i2 [data-act="noresume"]')
    page.wait_for_timeout(300)
    assert plan() == ['build', True], 'No resume? No problem: %s' % plan()
    at(page, 'resume')
    page.set_input_files('#i2file', files=[{'name': 'resume.txt', 'mimeType': 'text/plain', 'buffer': b'Paralegal, Smith Law\n'}])
    page.wait_for_timeout(800)
    assert plan() == ['attached', False], 'with a file: %s' % plan()


def test_home_build_path_shows_no_nudge_and_no_link(open_page):
    page = home(open_page, {'onFile': True, 'source': 'build', 'date': '2026-10-14'})
    assert not page.locator('[data-runudge]').count() and not page.locator('[data-ruquiet]').count(), 'a client whose resume we build was asked for one'


def test_home_no_nudge_once_there_are_job_cards(open_page):
    """Review M1: a client with matches already is past the first step; even with onFile false, Home shows only the quiet link."""
    page = home(open_page, {'onFile': False, 'source': '', 'date': ''})
    assert page.evaluate('S.data.jobs.length') > 0
    assert not page.locator('[data-runudge]').count(), 'nudge shown to a client with job cards'
    assert page.locator('[data-ruquiet]').is_visible()
