"""Portal document downloads (Nov 23-24, 2026). Demo mode only (?demo=1, sample client "Jordan"); nothing is sent anywhere.

The rule (docFiles in portal/index.html), the same in all four places a document can be saved (review screen, Documents tab,
apply kit, apply steps):
  - nothing for a closed posting or a document not ready (waiting for an OK, changes asked, a draft or blank status);
  - an approved resume, cover letter or other document: the approved PDF, and a Word file ONLY when the backend sent a frozen
    Word copy (approvedDocx, a Drive download link). Never a live Word export of the Doc (Reef, Nov 24). Nothing while held;
  - interview prep (never approved, never sent to an employer): Google's live PDF and Word exports once it is ready to read.

Demo documents for job J-103: D-2 approved resume (live PDF, no frozen Word), D-3 approved cover letter with frozen PDF and frozen
Word, D-2p interview prep ready to read. Job J-104 (applied): D-4 approved resume, D-5 cover letter with its PDF held, D-6 a
thank-you note waiting for an OK. D-8 is on a closed posting."""
import pytest

GD = 'https://docs.google.com/document/d/'
DRIVE = 'https://drive.google.com/uc?export=download&id='
OLD_NOTE = 'The Word file is the current Google Doc'
PLACES = ['review', 'docs', 'kit', 'apply']


def pdf(doc_id):
    return GD + doc_id + '/export?format=pdf'


def docx(doc_id):
    return GD + doc_id + '/export?format=docx'


def is_download(href):
    return 'export?format=' in href or href.startswith(DRIVE) or href.endswith('.pdf')


def links(page, sel):
    """[[text, href, aria-label, rel]] for the links under sel, in page order"""
    return page.evaluate("s => [...document.querySelectorAll(s)].map(a => [a.textContent.trim(), a.getAttribute('href') || '', a.getAttribute('aria-label') || '', a.getAttribute('rel') || ''])", sel)


def open_demo(open_page, view='docs', patch=None, width=390):
    """the demo portal at phone width (one column of job cards), with D-2 (the J-103 resume) changed by patch first"""
    page = open_page('/portal/?demo=1&v=' + view, width=width, wait=1000)
    if patch is not None:
        page.evaluate("p => { S.data.docs.forEach(function (x) { if (x.id === 'D-2') { Object.keys(p).forEach(function (k) { if (p[k] === null) delete x[k]; else x[k] = p[k]; }); } }); render(); }", patch)
        page.wait_for_timeout(200)
    return page


def flow(page, kind, job):
    page.evaluate('([k, j]) => openFlow(k, j)', [kind, job])
    page.wait_for_timeout(300)


def resume_links(open_page, place, patch=None):
    """the links one place offers for the J-103 resume (D-2)"""
    if place == 'review':
        page = open_demo(open_page, 'docs', patch)
        flow(page, 'review', 'J-103')
        return page, links(page, '#rvp-D-2 .rv-pacts a')
    if place == 'docs':
        page = open_demo(open_page, 'docs', patch)
        return page, links(page, '[data-doc="D-2"] .acts a')
    if place == 'kit':
        page = open_demo(open_page, 'jobs', patch)
        page.evaluate("S.open['J-103'] = true; render();")  # the kit sits in the job card's details
        page.wait_for_timeout(200)
        return page, [l for l in links(page, '[data-jc="J-103"] .kit .pdfs a') if l[0].startswith('Resume') or l[0] == 'Open your resume']
    page = open_demo(open_page, 'jobs', patch)
    flow(page, 'apply', 'J-103')
    return page, links(page, '.ap-steps > li:nth-child(1) a')


# ---- helpers ----

def test_helpers(open_page):
    page = open_demo(open_page)
    assert page.evaluate("docxLink('https://docs.google.com/document/d/abc_DEF-1/edit')") == docx('abc_DEF-1')
    assert page.evaluate("docxLink('https://docs.google.com/document/u/1/d/abc/edit?usp=sharing')") == docx('abc')
    for other in ('https://example.com/resume.pdf', 'https://drive.google.com/file/d/abc/view', 'javascript:alert(1)', ''):
        assert page.evaluate('u => docxLink(u)', other) == '', 'a Word link was made for a link that is not a Google Doc: %s' % other
    assert page.evaluate("apprDocx({ approvedDocx: '%sabcdefgh_D-1' })" % DRIVE) == DRIVE + 'abcdefgh_D-1'
    for bad in ('https://DRIVE.GOOGLE.COM/uc?export=download&id=abcdefghijk', 'HTTPS://drive.google.com/uc?export=download&id=abcdefghijk',
                DRIVE + 'short', 'https://evil.example/uc?export=download&id=abc', 'https://drive.google.com.evil.example/uc?export=download&id=abc',
                'http://drive.google.com/uc?export=download&id=abc', DRIVE + 'abc&confirm=1', DRIVE + 'abc"><b>', DRIVE,
                docx('abc'), 'https://drive.google.com/file/d/abc/view'):
        assert page.evaluate('u => apprDocx({ approvedDocx: u })', bad) == '', 'apprDocx accepted %s' % bad
    # held: each helper refuses on its own, frozen copies included, prep included
    held = {'pdfState': 'held', 'approvedPdf': DRIVE + 'frozen-pdf-1234', 'approvedDocx': DRIVE + 'frozen-docx-1234', 'link': GD + 'abcdefghijk/edit'}
    for prep in (False, True):
        assert page.evaluate('([x, p]) => filePdf(x, p)', [held, prep]) == '', 'filePdf gave a file while held (prep=%s)' % prep
        assert page.evaluate('([x, p]) => fileWord(x, p)', [held, prep]) == '', 'fileWord gave a file while held (prep=%s)' % prep
    assert page.evaluate("isApprovedSt('Approved') && isApprovedSt(' approved by client') && !isApprovedSt('Not approved') && !isApprovedSt('Unapproved')")


# ---- not ready: nothing anywhere ----

@pytest.mark.parametrize('status', ['Ready for your review', 'Changes requested', 'In progress', '', 'Not approved', 'Unapproved'])
@pytest.mark.parametrize('place', PLACES)
def test_open_job_document_not_ready_has_no_download(open_page, place, status):
    """D-2 is on an open posting (J-103); while it waits for an OK, has changes asked, or is a draft, nothing can be saved"""
    page, got = resume_links(open_page, place, {'status': status, 'approvedDocx': DRIVE + 'fake-resume-docx'})
    dl = [h for _, h, _, _ in got if is_download(h)]
    assert not dl, '%s offers a download for a resume with status %r: %s' % (place, status, dl)


def test_waiting_document_on_open_job_has_only_open_on_documents_tab(open_page):
    page = open_demo(open_page)
    assert [t for t, _, _, _ in links(page, '[data-doc="D-6"] .acts a')] == ['Open'], 'the thank-you note waiting for an OK offers a download'


def test_closed_posting_has_no_downloads(open_page):
    page = open_demo(open_page)
    assert [t for t, _, _, _ in links(page, '[data-doc="D-8"] .acts a')] == ['Open']
    page.evaluate("S.data.docs.forEach(function (x) { if (x.jobId === 'J-103') x.closedJob = true; }); render();")
    page.wait_for_timeout(200)
    for d in ('D-2', 'D-2p', 'D-3'):
        hs = [h for _, h, _, _ in links(page, '[data-doc="%s"] a' % d)]
        assert not [h for h in hs if is_download(h)], '%s offers a download on a closed posting: %s' % (d, hs)


# ---- approved: PDF, and Word only from a frozen copy ----

@pytest.mark.parametrize('place', PLACES)
def test_approved_resume_without_frozen_word_has_pdf_only(open_page, place):
    page, got = resume_links(open_page, place)
    hrefs = [h for _, h, _, _ in got if is_download(h)]
    assert hrefs == [pdf('demo-resume-103')], '%s: expected the PDF only, got %s' % (place, got)
    assert not [t for t, _, _, _ in got if 'Word' in t], '%s offers Word for a resume with no frozen Word copy' % place
    assert [h for t, h, _, _ in got if t not in ('Open', 'Google Docs')] == [pdf('demo-resume-103')], got


@pytest.mark.parametrize('place', PLACES)
def test_approved_resume_with_frozen_word(open_page, place):
    page, got = resume_links(open_page, place, {'approvedDocx': DRIVE + 'fake-resume-docx'})
    hrefs = [h for _, h, _, _ in got if is_download(h)]
    assert hrefs == [pdf('demo-resume-103'), DRIVE + 'fake-resume-docx'], '%s: %s' % (place, got)
    assert all('noopener' in r and 'noreferrer' in r for _, h, _, r in got if is_download(h)), got
    assert OLD_NOTE not in page.inner_text('body')


@pytest.mark.parametrize('bad', ['https://evil.example/uc?export=download&id=fake-resume-docx', DRIVE + 'fake-resume-docx&x=1', 'http://drive.google.com/uc?export=download&id=fake-resume-docx',
                                 'https://DRIVE.GOOGLE.COM/uc?export=download&id=fake-resume-docx', DRIVE + 'short', docx('demo-resume-103')])
@pytest.mark.parametrize('place', PLACES)
def test_approved_resume_ignores_a_bad_frozen_word_link(open_page, place, bad):
    page, got = resume_links(open_page, place, {'approvedDocx': bad})
    # every link here but Open / Google Docs, whatever its host: only the PDF, and no Word button
    assert [h for t, h, _, _ in got if t not in ('Open', 'Google Docs')] == [pdf('demo-resume-103')], '%s used approvedDocx %s: %s' % (place, bad, got)
    assert bad not in [h for _, h, _, _ in got] and not [t for t, _, _, _ in got if 'Word' in t], '%s used approvedDocx %s: %s' % (place, bad, got)


@pytest.mark.parametrize('place', PLACES)
def test_held_means_no_download_even_with_frozen_copies(open_page, place):
    page, got = resume_links(open_page, place, {'pdfState': 'held', 'approvedPdf': DRIVE + 'fake-resume-pdf', 'approvedDocx': DRIVE + 'fake-resume-docx'})
    assert not [h for _, h, _, _ in got if is_download(h)], '%s offers a download while the approved copy is held: %s' % (place, got)
    scope = {'review': '#rvp-D-2 .rv-pacts', 'docs': '[data-doc="D-2"]', 'kit': '[data-jc="J-103"] .kit', 'apply': '.ap-steps > li:nth-child(1)'}[place]
    assert 'is being updated. We will let you know when it is ready.' in page.inner_text(scope), '%s shows no held message' % place


@pytest.mark.parametrize('place', PLACES)
def test_link_that_is_not_a_google_doc_or_pdf_gets_no_pdf(open_page, place):
    page, got = resume_links(open_page, place, {'link': 'https://example.com/files/resume'})
    assert not [h for _, h, _, _ in got if is_download(h)], '%s offers a PDF for a link that is not a PDF: %s' % (place, got)
    page, got = resume_links(open_page, place, {'link': 'https://example.com/files/resume.pdf'})
    # (the Documents card's own Open link points at the same .pdf, so it is left out here)
    assert [h for t, h, _, _ in got if is_download(h) and t != 'Open'] == ['https://example.com/files/resume.pdf'], '%s: %s' % (place, got)


@pytest.mark.parametrize('place', ['kit', 'apply'])
def test_approved_drive_file_link_gets_one_open_link(open_page, place):
    """an approved resume whose link is a Drive file (no export): one Open link and a line saying to save it from there"""
    view = 'https://drive.google.com/file/d/abcdefghijk/view'
    page, got = resume_links(open_page, place, {'link': view})
    assert [(t, h, a, r) for t, h, a, r in got] == [('Open your resume', view, 'Open Resume for Example Dental Arts', 'noopener noreferrer')], got
    scope = '[data-jc="J-103"] .kit' if place == 'kit' else '.ap-steps > li:nth-child(1)'
    txt = page.inner_text(scope)
    assert 'Open your resume and save it from there.' in txt and 'Not ready yet' not in txt, txt


def test_review_frozen_cover_letter(open_page):
    page = open_demo(open_page, width=1280)
    flow(page, 'review', 'J-103')
    got = [(t, h) for t, h, _, _ in links(page, '#rvp-D-3 .rv-pacts a')]
    assert got == [('Download approved PDF', DRIVE + 'demo-cover-103-pdf'), ('Download Word (.docx)', DRIVE + 'demo-cover-103-docx')], got
    assert OLD_NOTE not in page.inner_text('body')
    icons = page.evaluate("[...document.querySelectorAll('#rvp-D-3 .rv-pacts a svg')].map(s => s.innerHTML)")
    assert len(icons) == 2 and icons[0] != icons[1], 'the Word button should have its own icon'
    assert links(page, '#rvp-D-3 .rv-pre a')[0][0] == 'Open in Google Docs', 'Open in Google Docs is gone from the review screen'


# ---- interview prep: live PDF and Word ----

def test_review_interview_prep_has_pdf_word_and_open(open_page):
    page = open_demo(open_page, width=1280)
    flow(page, 'review', 'J-103')
    got = [(t, h) for t, h, _, _ in links(page, '#rvp-D-2p .rv-pacts a')]
    assert got == [('Download PDF', pdf('demo-prep-103')), ('Download Word (.docx)', docx('demo-prep-103'))], got
    assert [t for t, _, _, _ in links(page, '#rvp-D-2p .rv-pre a')] == ['Open in Google Docs']


# ---- Documents tab: short words, full aria-labels ----

def test_documents_tab_short_labels(open_page):
    page = open_demo(open_page)
    got = links(page, '[data-doc="D-3"] .acts a')
    assert [(t, h, a) for t, h, a, _ in got] == [('PDF', DRIVE + 'demo-cover-103-pdf', 'Download cover letter as PDF'),
                                                ('Word', DRIVE + 'demo-cover-103-docx', 'Download cover letter as Word'),
                                                ('Google Docs', GD + 'demo-cover-103/edit', 'Open cover letter in Google Docs')], got
    got = links(page, '[data-doc="D-2p"] .acts a')
    assert [(t, h, a) for t, h, a, _ in got] == [('PDF', pdf('demo-prep-103'), 'Download interview prep as PDF'),
                                                ('Word', docx('demo-prep-103'), 'Download interview prep as Word'),
                                                ('Google Docs', GD + 'demo-prep-103/edit', 'Open interview prep in Google Docs')], got
    assert [t for t, _, _, _ in links(page, '[data-doc="D-2"] .acts a')] == ['PDF', 'Google Docs']
    assert [t for t, _, _, _ in links(page, '[data-doc="D-5"] .acts a')] == ['Open'], 'the held cover letter offers a download'


# ---- apply kit and apply steps: copy follows what is offered ----

def test_apply_kit_and_steps_copy(open_page):
    page = open_demo(open_page, 'jobs')
    page.evaluate("S.open['J-103'] = true; render();")
    page.wait_for_timeout(200)
    got = [(t, h) for t, h, _, _ in links(page, '[data-jc="J-103"] .kit .pdfs a')]
    assert got == [('Resume (PDF)', pdf('demo-resume-103')), ('Cover letter (PDF)', DRIVE + 'demo-cover-103-pdf'), ('Cover letter (Word)', DRIVE + 'demo-cover-103-docx')], got
    steps = page.inner_text('[data-jc="J-103"] .kcheck')
    assert 'Upload your resume PDF' in steps and 'Upload your cover letter file' in steps, steps
    page.evaluate("localStorage.removeItem('sp_kit_J-103')")
    flow(page, 'apply', 'J-103')
    one, two, three = (page.inner_text('.ap-steps > li:nth-child(%d)' % n) for n in (1, 2, 3))
    assert 'Save the PDF. You upload it in step 3.' in one and 'Word' not in one, one
    assert 'Word copy' in two and 'Upload both files.' in three, (two, three)
    # with no frozen Word copy at all, the words stay as they were
    page.evaluate("S.data.docs.forEach(function (x) { if (x.id === 'D-3') delete x.approvedDocx; }); render();")
    page.wait_for_timeout(200)
    assert 'Upload both PDFs.' in page.inner_text('.ap-steps > li:nth-child(3)')
    assert 'Word' not in page.inner_text('.ap-steps')


def test_apply_step_word_download_ticks_the_step(open_page):
    page = open_demo(open_page, 'jobs')
    page.evaluate("localStorage.removeItem('sp_kit_J-103')")
    flow(page, 'apply', 'J-103')
    w = links(page, '.ap-steps > li:nth-child(2) a')[1]
    assert w[:2] == ['Download Word (.docx)', DRIVE + 'demo-cover-103-docx'], w
    # its href is taken off first, so the click opens nothing
    page.evaluate("(() => { var a = document.querySelectorAll('.ap-steps > li:nth-child(2) a')[1]; a.removeAttribute('href'); a.click(); })()")
    page.wait_for_timeout(200)
    assert page.locator('.ap-steps > li:nth-child(2).done').count() == 1, 'the Word download did not tick the cover letter step'


def test_documents_tab_buttons_stay_on_one_line_at_360(open_page):
    page = open_demo(open_page, width=360)
    wrapped = page.evaluate("""[...document.querySelectorAll('.dc .acts.files a')].map(a => { var t = [...a.childNodes].filter(n => n.nodeType === 3).pop(), r = document.createRange(); r.selectNodeContents(t);
      return [a.textContent.trim(), new Set([...r.getClientRects()].map(x => Math.round(x.top))).size]; }).filter(x => x[1] > 1)""")
    assert not wrapped, 'button words wrap at 360px: %s' % wrapped


@pytest.mark.parametrize('screen', ['docs', 'review', 'apply'])
def test_download_screens_fit_a_phone(open_page, screen):
    page = open_demo(open_page, 'docs')
    if screen != 'docs':
        flow(page, screen, 'J-103')
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, '%s screen scrolls sideways on a phone by %dpx' % (screen, over)
