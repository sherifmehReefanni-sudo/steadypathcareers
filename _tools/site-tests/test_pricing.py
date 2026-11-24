"""Prices, trial length and billing wording come from one place: _tools/pricing.json (see _tools/pricing.py).
1. Every page, script and page builder in this repo says only the prices, trial length and billing sentences in pricing.json.
2. The guard itself works: a hand edit, an unapplied pricing.json change and a by-hand item left behind all fail it.
3. What each page shows (served, after its scripts run; locally or on the live site) states the same numbers."""
import copy
import re

import pytest

from conftest import ROOT, pricing, sitemap_paths, visible_text

CFG = pricing.load_config(ROOT)
V = CFG['values']


def test_repo_matches_pricing_json():
    found = pricing.problems(CFG, pricing.load_applied(ROOT), pricing.load_files(ROOT))
    assert not found, 'Fix these, or run python3 _tools/pricing.py after editing _tools/pricing.json:\n' + '\n'.join(found)


def test_guard_catches_drift():
    files, applied = pricing.load_files(ROOT), pricing.load_applied(ROOT)
    # a page edited by hand to another trial length or price fails
    bad = dict(files)
    bad['questions/index.html'] = bad['questions/index.html'].replace('Free for %s days while' % V['trial_days'], 'Free for 21 days while', 1)
    bad['about/index.html'] = bad['about/index.html'].replace('No card needed.', 'No card needed. Then $5 a month.', 1)
    found = '\n'.join(pricing.problems(CFG, applied, bad))
    assert 'questions/index.html' in found and 'Free for 21 days' in found, found
    assert 'about/index.html' in found and '$5 a month' in found, found
    # pricing.json changed but not applied: fails
    cfg = copy.deepcopy(CFG)
    cfg['values']['plan_monthly'] = str(int(V['plan_monthly']) - 10)
    assert any('run  python3 _tools/pricing.py' in p for p in pricing.problems(cfg, applied, files))
    # applied: every page that is not by hand now says the new price, and only the by-hand items are left
    changed, new = pricing.apply(cfg, applied, files)
    assert {'index.html', 'questions/index.html', 'assets/intake2.js', 'portal/index.html'} <= set(changed), sorted(changed)
    after = dict(files, **changed)
    left = pricing.problems(cfg, new, after)
    home = files['index.html']
    tline = home.count('\n', 0, home.index(pricing.render(CFG)['video_transcript_price'])) + 1  # the video transcript
    assert left and all(p.startswith(('by hand:', 'index.html:%d ' % tline, 'media/')) for p in left), left
    assert not any(t in CFG['by_hand_files'] for t in changed), 'a by-hand file was rewritten'
    # a trial change leaves the legal terms to a person, and says so
    cfg = copy.deepcopy(CFG)
    cfg['values']['trial_days'] = '7'
    changed, new = pricing.apply(cfg, applied, files)
    left = '\n'.join(pricing.problems(cfg, new, dict(files, **changed)))
    assert 'terms/index.html' not in changed and 'terms_trial' in left and '_tools/make-og.js' in left, left


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


@pytest.mark.parametrize('path', PAGES)
def test_page_shows_prices_from_pricing_json(open_page, path):
    page = open_page(path)
    if 'v=billing' in path:
        page.wait_for_selector('.bl-status')
    text = visible_text(page)
    for s in CFG['not_ours']:
        text = text.replace(s, '')
    wrong = ['"%s"' % m.group(0) for rx, ok in SEEN for m in re.finditer(rx, text) if m.group(1) not in ok]
    assert not wrong, '%s shows %s; _tools/pricing.json says %s days free, $%s a month' % (path, ', '.join(wrong), V['trial_days'], V['plan_monthly'])
    if path == '/portal/?demo=1&v=billing&region=nj':
        for t in ['$%s a month' % V['plan_monthly'], '$%s a month with code %s' % (V['founding_monthly'], V['founding_code']), '$%s one time' % V['addon_linkedin']]:
            assert t in text, 'the Plan & billing view does not show "%s"' % t
