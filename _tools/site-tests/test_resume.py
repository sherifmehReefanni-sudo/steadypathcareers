"""The resume reader shared by the intake and the portal (assets/resume-read.js), and the portal's "Your resume" card (API v1.47).

1. The intake reads a resume exactly as it did before the reader moved out of intake2.js: fixtures/parse_expected.json was
   captured from the old intake2.js (before Nov 19, 2026) on the fake resumes in fixtures/resumes.json, with the clock fixed,
   and the portal's copy of the reader gives the same answers.
2. The card (demo mode, so nothing is sent; the conftest blocks every POST anyway): every suggestion starts unticked, and only
   the file and the ticked items go in the resumeUpload body. Wrong types and files over 10 MB are refused on the device.
3. Review fixes: pdf.js and mammoth come only from assets/vendor/ (sha256 as in its README), the same 10 resumes as real PDF and
   DOCX files (fixtures/files/, made by fixtures/make_resume_files.py) read to the same answers through them, pdf.js runs with
   eval off, the 60 a day cap shows its own message, and the intake still works if resume-read.js does not load."""
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


# ---- review fixes (Nov 19, 2026): self-hosted pdf.js and mammoth (M1), no eval in pdf.js (L1), the global cap message (L2),
# ---- and the intake without the shared reader (L7)
import hashlib
import re
import subprocess

from conftest import ROOT

VENDOR = os.path.join(ROOT, 'assets', 'vendor')
FILES = os.path.join(FX, 'files')
MIME = {'pdf': 'application/pdf', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
OUTSIDE_LIB = re.compile(r'https?://[^\s"\'<>)]*(?:pdf\.js|pdfjs|pdf\.worker|pdf\.min|mammoth)', re.I)


def test_vendored_libraries_match_their_readme():
    """Every file under assets/vendor/ is listed in its README with its sha256, and the bytes still match."""
    readme = open(os.path.join(VENDOR, 'README.md'), encoding='utf-8').read()
    listed = dict((p, h) for h, p in re.findall(r'^([0-9a-f]{64})  (\S+)$', readme, re.M))
    on_disk = []
    for d, _, files in os.walk(VENDOR):
        on_disk += [os.path.relpath(os.path.join(d, f), VENDOR).replace(os.sep, '/') for f in files if f != 'README.md']
    assert sorted(on_disk) == sorted(listed), 'vendor files and README list differ: %s vs %s' % (sorted(on_disk), sorted(listed))
    for rel, want in listed.items():
        got = hashlib.sha256(open(os.path.join(VENDOR, rel), 'rb').read()).hexdigest()
        assert got == want, '%s changed: sha256 %s, README says %s' % (rel, got, want)
    for lic in ('pdfjs-3.11.174/LICENSE', 'mammoth-1.6.0/LICENSE'):
        assert lic in listed, 'license file missing: ' + lic


def test_no_page_loads_pdfjs_or_mammoth_from_another_host():
    """No tracked HTML or JS file (outside the vendored copies) points at pdf.js or mammoth on another host, cdnjs included."""
    tracked = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
    hits = []
    for rel in tracked:
        if not rel.endswith(('.html', '.js')) or rel.startswith(('assets/vendor/', '_tools/')):
            continue
        text = open(os.path.join(ROOT, rel), encoding='utf-8', errors='replace').read()
        hits += ['%s: %s' % (rel, m.group(0)) for m in OUTSIDE_LIB.finditer(text)]
        hits += ['%s: script from cdnjs' % rel for _ in re.finditer(r'src\s*[=:]\s*["\']https?://cdnjs\.', text)]
    assert not hits, 'pdf.js or mammoth loaded from another host:\n' + '\n'.join(hits)
    src = open(os.path.join(ROOT, 'assets', 'resume-read.js'), encoding='utf-8').read()
    for path in ('/assets/vendor/pdfjs-3.11.174/pdf.min.js', '/assets/vendor/pdfjs-3.11.174/pdf.worker.min.js', '/assets/vendor/mammoth-1.6.0/mammoth.browser.min.js'):
        assert "'%s'" % path in src, 'resume-read.js does not load ' + path
    assert 'lib.GlobalWorkerOptions.workerSrc = LIBS.pdfw' in src, 'the pdf.js worker is not set from the local path'


# Records every getDocument call (review L1): pdf.js sets window.pdfjsLib, and the reader gets a wrapper that keeps the options.
SPY = """(() => { let lib; window.__gdOpts = [];
  Object.defineProperty(window, 'pdfjsLib', { configurable: true, get: () => lib, set: (v) => {
    const g = v.getDocument; lib = new Proxy(v, { get: (t, k) => k === 'getDocument' ? function (o) { window.__gdOpts.push(Object.assign({}, o, { data: undefined })); return g.apply(t, arguments); } : t[k] });
  } }); })();"""


def test_pdf_and_docx_resumes_read_the_same_through_the_self_hosted_libraries(open_page):
    """The 10 fake resumes as real PDF and DOCX files go through SPResume.fileText (pdf.js and its worker, mammoth, all from
    /assets/vendor/) and then parse; every one must give exactly fixtures/parse_expected.json. pdf.js runs with eval off."""
    page = open_page(None)
    page.clock.set_fixed_time(NOW)
    page.add_init_script(SPY)
    seen = []
    page.on('request', lambda r: seen.append(r.url))
    page.goto(page.base + '/portal/?demo=1&v=prefs', wait_until='load')
    page.wait_for_timeout(600)
    files = {}
    for name in EXPECTED:
        for ext in ('pdf', 'docx'):
            files['%s.%s' % (name, ext)] = base64.b64encode(open(os.path.join(FILES, '%s.%s' % (name, ext)), 'rb').read()).decode()
    got = page.evaluate("""async ([files, mime]) => {
      const out = {};
      for (const fname of Object.keys(files)) {
        const bin = atob(files[fname]), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const f = new File([bytes], fname, { type: mime[fname.split('.').pop()] });
        try { out[fname] = window.SPResume.parse(await window.SPResume.fileText(f)); } catch (e) { out[fname] = 'ERROR ' + e; }
      }
      return out;
    }""", [files, MIME])
    for fname, prof in got.items():
        want = EXPECTED[fname.rsplit('.', 1)[0]]
        assert prof == want, '%s reads differently:\n got %s\nwant %s' % (fname, prof, want)
    assert len(got) == 2 * len(EXPECTED)
    for path in ('/assets/vendor/pdfjs-3.11.174/pdf.min.js', '/assets/vendor/pdfjs-3.11.174/pdf.worker.min.js', '/assets/vendor/mammoth-1.6.0/mammoth.browser.min.js'):
        assert any(u.startswith(page.base + path) for u in seen), path + ' was not loaded from this site'
    away = [u for u in seen if not u.startswith(page.base) and ('cdnjs' in u or OUTSIDE_LIB.search(u))]
    assert not away, 'pdf.js or mammoth was asked for from another host: %s' % away
    opts = page.evaluate('window.__gdOpts')
    assert len(opts) == len(EXPECTED) and all(o.get('isEvalSupported') is False for o in opts), 'pdf.js getDocument without isEvalSupported: false: %s' % opts


def test_card_says_uploads_are_paused_when_the_day_is_full(open_page):
    """Review L2: when the 60 a day cap for everyone blocks an upload, the client is told uploads are paused, not "3 a day"."""
    page = open_card(open_page)
    page.evaluate("window.ruDemoApi = () => ({ ok: false, error: 'paused' })")
    choose(page, 'resume.txt', TEXTS['title_comma'].encode('utf-8'))
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    msg = page.inner_text('#ruErr')
    assert 'paused for today' in msg and 'tomorrow' in msg and 'hello@steadypathcareers.com' in msg, msg
    assert '3 resumes a day' not in msg
    page.evaluate("window.ruDemoApi = () => ({ ok: false, error: 'limit' })")
    page.click('[data-rusend]')
    page.wait_for_timeout(700)
    assert 'up to 3 resumes a day' in page.inner_text('#ruErr'), 'the per-client message changed'


def test_intake_works_when_the_shared_reader_does_not_load(open_page):
    """Review L7: if resume-read.js fails to load, the intake still opens, moves on, and takes a resume file without reading it
    (no JavaScript error; the conftest fails the test on any)."""
    page = open_page(None)
    page.route('**/assets/resume-read.js*', lambda r: r.abort())
    page.goto(page.base + '/start/', wait_until='load')
    page.wait_for_timeout(600)
    assert page.evaluate('typeof window.SPResume') == 'undefined', 'the reader loaded anyway'
    assert page.evaluate("JSON.stringify(window.__i2parse('Paralegal, Smith Law\\nJan 2019 to Present'))") == '{}'
    page.click('#i2 [data-nav=next]')
    page.wait_for_timeout(400)
    assert page.locator('#i2 [data-card]').count() >= 3, 'the first question did not appear without the reader'
    # a resume chosen now goes through the guarded reader: it is kept, not read, and nothing throws
    page.evaluate("""() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'i2file'; document.getElementById('i2').appendChild(i);
      const dt = new DataTransfer(); dt.items.add(new File(['Paralegal, Smith Law'], 'resume.txt', { type: 'text/plain' })); i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true })); }""")
    page.wait_for_timeout(500)
    saved = page.evaluate("JSON.parse(localStorage.getItem('sp_intake2') || '{}')")
    assert saved.get('resumeName') == 'resume.txt', 'the chosen resume was not kept: %s' % saved.get('resumeName')
    assert not saved.get('jobNowTitle'), 'something was read without the reader'
