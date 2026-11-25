"""Prices, trial length and billing wording come from one place: _tools/pricing.json (see _tools/pricing.py).
1. Every page, script and page builder in this repo states only the prices and trial length in pricing.json, every billing
   sentence (refunds, renewal, charges, cancelling, billing stopping, paid plans, the free pilot, cards, the founding offer)
   is one of its sentences, and each sentence is still in the places it was recorded.
2. The guard itself works: a hand edit of a number or of a billing sentence, an unapplied pricing.json change and a by-hand
   item left behind all fail it; applying a change gives a changed script a new ?v= and sw.js a new V.
3. What each page holds once served and its scripts have run (all text, closed FAQ answers and meta descriptions included;
   locally or on the live site) states the same numbers."""
import copy
import re

import pytest

from conftest import ROOT, pricing, sitemap_paths

CFG = pricing.load_config(ROOT)
V = CFG['values']
STAMPS = re.compile(r'\?v=[\w.-]+|^var V = \'[^\']+\';', re.M)  # cache stamps, which the tool may change in any file


def test_repo_matches_pricing_json():
    found = pricing.problems(CFG, pricing.load_applied(ROOT), pricing.load_files(ROOT))
    assert not found, 'Fix these, or run python3 _tools/pricing.py after editing _tools/pricing.json:\n' + '\n'.join(found)


def test_guard_catches_drift():
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    # a page edited by hand to another trial length or price fails
    bad = dict(files)
    bad['questions/index.html'] = bad['questions/index.html'].replace('Free for %s days while' % V['trial_days'], 'Free for 21 days while', 1)
    bad['about/index.html'] = bad['about/index.html'].replace('No card needed.', 'No card needed. Then $5 a month.', 1)
    bad['delete-account/index.html'] = bad['delete-account/index.html'].replace('does not cancel a paid plan or stop charges', 'does not stop charges', 1)
    bad['portal/index.html'] = bad['portal/index.html'].replace('Cancelling stops all future charges.', 'Cancelling stops future charges.', 1)
    bad['index.html'] = bad['index.html'].replace('Tell us you&#39;re hired and billing stops.', 'Tell us when you&#39;re hired.', 1)
    found = '\n'.join(pricing.problems(CFG, applied, bad))
    assert 'questions/index.html' in found and 'Free for 21 days' in found, found
    assert 'about/index.html' in found and '$5 a month' in found, found
    assert 'delete-account/index.html:' in found and 'portal/index.html:' in found and '(hired_stops) is there 2 time(s), 3 expected' in found, found
    # pricing.json changed but not applied: fails
    cfg = copy.deepcopy(CFG)
    cfg['values']['plan_monthly'] = str(int(V['plan_monthly']) - 10)
    assert any('run  python3 _tools/pricing.py' in p for p in pricing.problems(cfg, applied, files))
    # applied: every page that is not by hand now says the new price, and only the by-hand items are left
    changed, new = pricing.apply(cfg, applied, files, stamp='sp-test')
    assert {'index.html', 'questions/index.html', 'assets/intake2.js', 'portal/index.html'} <= set(changed), sorted(changed)
    # the changed intake script is loaded with a new ?v= everywhere, and the service worker that precaches it gets a new V
    for f in ('start/index.html', 'start/v2/index.html', 'sw.js'):
        assert '/assets/intake2.js?v=sp-test' in changed[f], f
    assert "var V = 'sp-test';" in changed['sw.js']
    after = dict(files, **changed)
    left = pricing.problems(cfg, new, after)
    home = files['index.html']
    tline = home.count('\n', 0, home.index(pricing.render(CFG)['video_transcript_price'])) + 1  # the video transcript
    assert left and all(p.startswith(('by hand:', 'index.html:%d ' % tline, 'media/')) for p in left), left
    assert not any(STAMPS.sub('', changed[t]) != STAMPS.sub('', files[t]) for t in changed if t in CFG['by_hand_files']), 'a by-hand file was rewritten'
    # a trial change leaves the legal terms to a person, and says so
    cfg = copy.deepcopy(CFG)
    cfg['values']['trial_days'] = '7'
    changed, new = pricing.apply(cfg, applied, files, stamp='sp-test')
    left = '\n'.join(pricing.problems(cfg, new, dict(files, **changed)))
    assert 'terms/index.html' not in changed and 'terms_trial' in left and '_tools/make-og.js' in left, left
    # a billing sentence reworded in pricing.json reaches every page that says it, and nothing else is left over
    cfg = copy.deepcopy(CFG)
    cfg['phrases']['hired_stops'] = "Tell us when you're hired and we stop billing"
    changed, new = pricing.apply(cfg, applied, files, stamp='sp-test')
    assert set(changed) == {'index.html', 'questions/index.html'} and not pricing.problems(cfg, new, dict(files, **changed)), sorted(changed)


def test_not_ours_covers_only_its_own_file():
    # wording allowed on one guide page is still caught on any other page
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    bad = dict(files)
    bad['about/index.html'] = bad['about/index.html'].replace('</main>', '<p>Some charge a monthly fee.</p></main>', 1)
    assert bad['about/index.html'] != files['about/index.html']
    found = '\n'.join(pricing.problems(CFG, applied, bad))
    assert 'about/index.html:' in found and 'charge' in found, found
    # and the served-page check strips a page's allowed text only on that page
    assert '$49 a month on Coursera' in page_not_ours('/level-up/') and '$49 a month on Coursera' not in page_not_ours('/about/')


def test_each_bump_gets_a_stamp_never_used_before():
    files = {'assets/a.js': 'x', 'index.html': '<script src="/assets/a.js?v=old"></script>',
             'sw.js': "var V = 'old';\nvar ASSETS = ['/assets/a.js?v=old'];\n"}
    refs, vs = ['old'], ['old']
    for run in range(5):
        files = dict(files, **pricing.bump_versions({'assets/a.js': 'y%d' % run}, files, 'sp-20261124price'))
        refs.append(re.search(r'a\.js\?v=([\w.-]+)', files['index.html']).group(1))
        vs.append(re.search(r"var V = '([^']+)'", files['sw.js']).group(1))
        assert re.search(r'a\.js\?v=([\w.-]+)', files['sw.js']).group(1) == refs[-1]
    assert len(set(refs)) == len(refs) and len(set(vs)) == len(vs), (refs, vs)


def test_bump_reaches_by_hand_files_but_not_their_sentences():
    # a changed script that the terms and privacy pages load gets its new ?v= there too (a stamp is not legal text), and
    # nothing else on those pages changes
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    files = dict(files, **{'assets/site.js': files['assets/site.js'] + '\n// ' + pricing.render(CFG)['free_for'] + '\n'})
    cfg = copy.deepcopy(CFG)
    cfg['values']['trial_days'] = '7'
    changed, _ = pricing.apply(cfg, applied, files, stamp='sp-test')
    assert 'assets/site.js' in changed and '/assets/site.js?v=sp-test' in changed['about/index.html']
    for f in ('privacy/index.html', 'terms/index.html'):
        assert f in changed and '/assets/site.js?v=sp-test' in changed[f], f
        assert STAMPS.sub('', changed[f]) == STAMPS.sub('', files[f]), f + ' changed beyond its ?v= stamps'


def test_check_catches_mixed_version_stamps():
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    bad = dict(files)
    bad['about/index.html'] = re.sub(r'(/assets/site\.js\?v=)[\w.-]+', r'\g<1>sp-stale', bad['about/index.html'], count=1)
    assert bad['about/index.html'] != files['about/index.html']
    found = '\n'.join(pricing.problems(CFG, applied, bad))
    assert 'assets/site.js' in found and 'sp-stale' in found and 'about/index.html' in found, found


def test_check_catches_dead_not_ours_entries():
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    cfg = copy.deepcopy(CFG)
    cfg['not_ours']['no-such-page/index.html'] = ['file a charge']
    cfg['not_ours']['about/index.html'] = ['a phrase that is not on the about page']
    found = '\n'.join(pricing.problems(cfg, applied, files))
    assert 'no-such-page/index.html' in found and 'a phrase that is not on the about page' in found, found


# Visible text, after scripts run. Our prices only: "$N a month" (the plan or the founding price), "$N today" (the plan),
# "$N with code" (founding), "$N one time" (an add-on), and every "free for N days" / "N days, no card".
ADDONS = {V['addon_linkedin'], V['addon_salary'], V['addon_call']}
SEEN = [
    (r'(?i)\bfree for (\d+) days?\b', {V['trial_days']}),
    (r'(?i)\b(\d+) days?, no card\b', {V['trial_days']}),
    (r'\$(\d+)(?![\d,.]) a month\b', {V['plan_monthly'], V['founding_monthly']}),
    (r'\$(\d+)(?![\d,.]) today\b', {V['plan_monthly']}),
    (r'\$(\d+)(?![\d,.]) with code\b', {V['founding_monthly']}),
    (r'\$(\d+)(?![\d,.]) one time\b', ADDONS),
]
PAGES = sorted(set(sitemap_paths() + ['/start/', '/start/v2/', '/portal/?demo=1&v=billing&region=nj']))


def page_not_ours(path):
    """The 'not_ours' text a served page may show: from its own file, files in its folder (its data) and assets/ (shared scripts
    and data any page may load)."""
    p = path.split('?')[0].strip('/')
    own = lambda f: f == (p + '/index.html' if p else 'index.html') or (p and f.startswith(p + '/')) or f.startswith('assets/')
    return [s for f, texts in CFG['not_ours'].items() if own(f) for s in texts]


@pytest.mark.parametrize('path', PAGES)
def test_page_shows_prices_from_pricing_json(open_page, path):
    page = open_page(path)
    if 'v=billing' in path:
        page.wait_for_selector('.bl-status')
    # every text node (closed <details> answers and hidden bars too), plus the description tags; not scripts or styles
    text = page.evaluate("""() => { const b = document.body.cloneNode(true);
        b.querySelectorAll('script, style, template, noscript').forEach((e) => e.remove());
        const meta = [...document.querySelectorAll('meta[name=description], meta[property="og:description"], meta[name="twitter:description"]')].map((m) => m.content);
        return [b.textContent].concat(meta).join(' ').replace(/\\s+/g, ' '); }""")
    for s in page_not_ours(path):
        text = text.replace(s, '')
    wrong = ['"%s"' % m.group(0) for rx, ok in SEEN for m in re.finditer(rx, text) if m.group(1) not in ok]
    assert not wrong, '%s shows %s; _tools/pricing.json says %s days free, $%s a month' % (path, ', '.join(wrong), V['trial_days'], V['plan_monthly'])
    if path == '/portal/?demo=1&v=billing&region=nj':
        for t in ['$%s a month' % V['plan_monthly'], '$%s a month with code %s' % (V['founding_monthly'], V['founding_code']), '$%s one time' % V['addon_linkedin']]:
            assert t in text, 'the Plan & billing view does not show "%s"' % t
