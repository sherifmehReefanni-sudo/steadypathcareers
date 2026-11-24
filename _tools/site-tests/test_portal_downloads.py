"""Portal document downloads (Nov 23, 2026): beside Open in Google Docs, a client can save a document as a PDF or as a Word file
(.docx), both Google's own exports of the shared Doc. Demo mode only (?demo=1, sample client "Jordan"); nothing is sent anywhere.

Demo documents used: D-2 approved resume (live export), D-3 approved cover letter with a frozen approved PDF, D-2p interview prep
ready to read (all for job J-103), D-4 approved resume and D-5 approved cover letter whose PDF is held (job J-104, applied)."""
import pytest

GD = 'https://docs.google.com/document/d/'
WORD_NOTE = 'The PDF is the approved copy. The Word file is the current Google Doc.'


def pdf(doc_id):
    return GD + doc_id + '/export?format=pdf'


def docx(doc_id):
    return GD + doc_id + '/export?format=docx'


def links(page, sel):
    """[(text, href, rel)] for the links under sel, in page order"""
    return page.evaluate("s => [...document.querySelectorAll(s)].map(a => [a.textContent.trim(), a.getAttribute('href'), a.getAttribute('rel') || ''])", sel)


def demo(open_page, view='home', width=1280):
    return open_page('/portal/?demo=1&v=' + view, width=width, wait=1000)


def flow(page, kind, job):
    page.evaluate('([k, j]) => openFlow(k, j)', [kind, job])
    page.wait_for_timeout(400)


def panel(doc):
    return '#rvp-' + doc


def test_helpers_only_give_word_for_a_google_doc(open_page):
    page = demo(open_page)
    assert page.evaluate("docxLink('https://docs.google.com/document/d/abc_DEF-1/edit')") == docx('abc_DEF-1')
    assert page.evaluate("docxLink('https://docs.google.com/document/u/1/d/abc/edit?usp=sharing')") == docx('abc')
    for other in ('https://example.com/resume.pdf', 'https://drive.google.com/file/d/abc/view', 'javascript:alert(1)', ''):
        assert page.evaluate('u => docxLink(u)', other) == '', 'a Word link was made for a link that is not a Google Doc: %s' % other


def test_review_approved_resume_has_pdf_then_word(open_page):
    page = demo(open_page)
    flow(page, 'review', 'J-103')
    got = links(page, panel('D-2') + ' .rv-pacts a')
    assert [(t, h) for t, h, _ in got] == [('Download approved PDF', pdf('demo-resume-103')), ('Download Word (.docx)', docx('demo-resume-103'))], got
    assert all('noopener' in r and 'noreferrer' in r for _, _, r in got), got
    assert WORD_NOTE not in page.inner_text(panel('D-2')), 'the approved-copy note shows for a document with no frozen PDF'
    assert links(page, panel('D-2') + ' .rv-pre a')[0][0] == 'Open in Google Docs', 'Open in Google Docs is gone from the review screen'


def test_review_frozen_cover_letter_has_word_and_note(open_page):
    page = demo(open_page)
    flow(page, 'review', 'J-103')
    got = [(t, h) for t, h, _ in links(page, panel('D-3') + ' .rv-pacts a')]
    assert got == [('Download approved PDF', 'https://drive.google.com/uc?export=download&id=demo-cover-103-pdf'), ('Download Word (.docx)', docx('demo-cover-103'))], got
    assert page.evaluate("s => document.querySelector(s).textContent", panel('D-3') + ' .rv-pacts').count(WORD_NOTE) == 1, 'approved-copy note missing'


def test_review_interview_prep_has_pdf_word_and_open(open_page):
    page = demo(open_page)
    flow(page, 'review', 'J-103')
    got = [(t, h) for t, h, _ in links(page, panel('D-2p') + ' .rv-pacts a')]
    assert got == [('Download PDF', pdf('demo-prep-103')), ('Download Word (.docx)', docx('demo-prep-103'))], got
    assert [t for t, _, _ in links(page, panel('D-2p') + ' .rv-pre a')] == ['Open in Google Docs']
    assert WORD_NOTE not in page.inner_text(panel('D-2p'))


def test_review_held_pdf_has_no_word(open_page):
    page = demo(open_page)
    flow(page, 'review', 'J-104')
    assert page.locator(panel('D-5')).count(), 'the held cover letter is not on the review screen'
    txt = page.evaluate("s => document.querySelector(s).textContent", panel('D-5') + ' .rv-pacts')
    assert 'being updated' in txt, 'the held-PDF message is missing'
    assert not [h for _, h, _ in links(page, panel('D-5') + ' a') if 'export?format=' in h], 'a download shows while the approved PDF is held'
    assert docx('demo-resume-104') in [h for _, h, _ in links(page, panel('D-4') + ' .rv-pacts a')], 'Word missing on the approved resume beside it'


def test_review_non_google_link_has_pdf_but_no_word(open_page):
    page = demo(open_page)
    page.evaluate("S.data.docs.forEach(function (x) { if (x.id === 'D-2') x.link = 'https://example.com/files/resume.pdf'; })")
    flow(page, 'review', 'J-103')
    got = [(t, h) for t, h, _ in links(page, panel('D-2') + ' .rv-pacts a')]
    assert got == [('Download approved PDF', 'https://example.com/files/resume.pdf')], got


def test_closed_posting_has_no_downloads(open_page):
    page = demo(open_page, 'docs')
    page.evaluate("S.data.docs.forEach(function (x) { if (x.jobId === 'J-103') x.closedJob = true; }); render();")
    page.wait_for_timeout(300)
    for d in ('D-2', 'D-2p', 'D-3'):
        hs = [h for _, h, _ in links(page, '[data-doc="%s"] a' % d)]
        assert not [h for h in hs if 'export' in h], '%s offers a download on a closed posting: %s' % (d, hs)


def test_apply_kit_has_word_beside_each_pdf(open_page):
    page = demo(open_page, 'jobs', width=390)  # one column of job cards (desktop shows a list and one card)
    page.evaluate("S.open['J-103'] = true; S.open['J-104'] = true; render();")  # the kit sits in the job card's details
    page.wait_for_timeout(300)
    got = [(t, h) for t, h, _ in links(page, '[data-jc="J-103"] .kit .pdfs a')]
    assert got == [('Resume (PDF)', pdf('demo-resume-103')), ('Resume (Word)', docx('demo-resume-103')),
                   ('Cover letter (PDF)', 'https://drive.google.com/uc?export=download&id=demo-cover-103-pdf'), ('Cover letter (Word)', docx('demo-cover-103'))], got
    assert WORD_NOTE in page.inner_text('[data-jc="J-103"] .kit'), 'approved-copy note missing in the apply kit'
    held = [h for _, h, _ in links(page, '[data-jc="J-104"] .kit .pdfs a')]
    assert docx('demo-cover-104') not in held and docx('demo-resume-104') in held, held


def test_apply_steps_have_word_and_it_ticks_the_step(open_page):
    page = demo(open_page, 'jobs')
    page.evaluate("localStorage.removeItem('sp_kit_J-103')")
    flow(page, 'apply', 'J-103')
    got = [(t, h) for t, h, _ in links(page, '.ap-steps li:nth-child(1) a')]
    assert got == [('Download resume PDF', pdf('demo-resume-103')), ('Download Word (.docx)', docx('demo-resume-103'))], got
    got = [(t, h) for t, h, _ in links(page, '.ap-steps li:nth-child(2) a')]
    assert got[1] == ('Download Word (.docx)', docx('demo-cover-103')), got
    assert WORD_NOTE in page.inner_text('.ap-steps li:nth-child(2)')
    # clicking the Word copy ticks step 1 (its href is taken off first, so the click opens nothing)
    page.evaluate("(() => { var a = document.querySelector('.ap-steps li:nth-child(1) a[href*=\"format=docx\"]'); a.removeAttribute('href'); a.click(); })()")
    page.wait_for_timeout(300)
    assert page.locator('.ap-steps li:nth-child(1).done').count() == 1, 'the Word download did not tick the resume step'


def test_documents_tab_downloads(open_page):
    page = demo(open_page, 'docs')
    got = [t for t, _, _ in links(page, '[data-doc="D-2"] .acts a')]
    assert got == ['Download PDF', 'Download Word (.docx)', 'Open in Google Docs'], got
    got = [(t, h) for t, h, _ in links(page, '[data-doc="D-2p"] .acts a')]
    assert got[:2] == [('Download PDF', pdf('demo-prep-103')), ('Download Word (.docx)', docx('demo-prep-103'))] and got[2][0] == 'Open in Google Docs', got
    assert WORD_NOTE in page.inner_text('[data-doc="D-3"]')
    assert [t for t, _, _ in links(page, '[data-doc="D-5"] .acts a')] == ['Open'], 'the held cover letter offers a download'
    # a document still waiting for an OK has no download yet
    assert [t for t, _, _ in links(page, '[data-doc="D-8"] .acts a')] == ['Open']


@pytest.mark.parametrize('view', ['docs'])
def test_documents_tab_fits_a_phone(open_page, view):
    page = demo(open_page, view, width=390)
    over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
    assert over <= 1, 'Documents screen scrolls sideways on a phone by %dpx' % over
