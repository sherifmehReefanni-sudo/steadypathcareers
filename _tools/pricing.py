#!/usr/bin/env python3
"""Keeps every price, trial length and billing sentence on the site in step with _tools/pricing.json (the one place for them).

    python3 _tools/pricing.py            apply: rewrite every page, script and page builder that says a changed phrase
    python3 _tools/pricing.py --check    report problems and exit 1 if there are any (the site check runs the same thing)

How it works: _tools/pricing.applied.json records each phrase exactly as the pages say it now, and how many times each file
says it. When pricing.json changes, apply finds each old sentence (also in its &#39;, &#x27; and \\' forms) and writes the new
one in the same form, longest phrase first, in one pass; a changed script gets a new ?v= wherever it is loaded, and sw.js a
new V when it lists it. 'by_hand' phrases and 'by_hand_files' are left alone, and the check fails until a person updates them.

The check fails when:
  - pricing.json was edited but apply was not run;
  - a file states a trial length or one of our prices that is not inside a phrase from pricing.json (a hand edit, a new
    page, or a by-hand item that still says the old price);
  - a file has billing wording (see WORDS) outside the phrases and 'not_ours' (comments are not read);
  - a phrase is not in the files, or not as many times, as recorded (a sentence edited by hand);
  - a phrase or value in pricing.json is no longer used anywhere (delete it, or put the sentence back)."""
import datetime
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG, APPLIED = '_tools/pricing.json', '_tools/pricing.applied.json'
# Files the tool never reads or writes: itself, the checks (they read pricing.json, and copy_test.js holds deliberately wrong
# lines to prove its own guard), third-party code, and the billing copy snapshot (written by copy_test.js --update).
SKIP = re.compile(r'^(_tools/pricing\.|_tools/site-tests/|_tools/billing/|assets/vendor/|\.github/)')
TEXT = re.compile(r'\.(html|js|json|py|vtt|xml|webmanifest|txt|md|css|toml)$|^_redirects$')

# What counts as stating a trial length or one of our prices. Pay figures on job cards and guides ("$62,000 a year",
# "$905 a week", "$20 per hour") do not match these.
TRIAL = [r'(?i:\bfree for (\d+) days?\b)', r'(?i:\b(\d+) days?, no card\b)', r'(?i:\b(\d+)[- ]day (?:free )?(?:trial|pilot)\b)',
         r'(?i:\bfree (\d+)[- ]day\b)']
MONEY = [r'\$(\d+(?:\.\d\d)?)(?![\d,.])(?:</b>)?\s*(?:a|per|/)\s*(?:month|mo)\b', r'\$(\d+(?:\.\d\d)?)(?![\d,.]) (?:today|one time|with code)\b',
         r"\['\w+', '[^'<]+', '\$(\d+)'\]", r'<span class="n[vw]">(\d+)</span>']
# Billing wording: any of these in page text (comments aside) must be inside a sentence from pricing.json or in 'not_ours'.
WORDS = re.compile(r"(?i)\brefund|\brenew(?:s|al|ed|ing)?\b|\bcharg(?:e|es|ed|ing)\b|\bcancel(?:l?ing|s)? (?:anytime|within|your|a paid|it|the plan|stops)"
                   r"|\bto cancel\b|confirm the cancel|\bbilling (?:stops|ends|is|has|stopped)|stop (?:your )?billing|\bpaid plans?\b"
                   r"|\bpayments? (?:received|page|did)|\bfree (?:pilot|days?|access)\b|\bno card\b|\bcard (?:is )?(?:on file|needed)|\bfounding\b"
                   r"|\bsubscri(?:be|ption)|\bfirst charge|\bfees?\b.{0,40}\bprice\b")
MENTION = re.compile('|'.join('(?:%s)' % p for p in TRIAL + MONEY))


def load_config(root=ROOT):
    with open(os.path.join(root, CONFIG), encoding='utf-8') as f:
        return json.load(f)


def render(cfg):
    """{key: text} for every phrase, by-hand ones included."""
    v = cfg['values']
    out = {k: t.format(**v) for k, t in cfg['phrases'].items()}
    out.update({k: x['text'].format(**v) for k, x in cfg['by_hand'].items()})
    return out


APOS = ["'", '&#39;', '&#x27;', "\\'"]  # the ways an apostrophe is written in the source: as is, in HTML, in JS strings


def encode(text, form):
    return text.replace("'", APOS[form])


def tokenizer(phrases):
    """One regex over every form of every phrase, longest first, so a sentence inside a longer one is matched once, as part of
    the longer one. Returns (regex, {matched text: (key, form)})."""
    table = {}
    for k, t in phrases.items():
        for i in range(len(APOS)):
            table.setdefault(encode(t, i), (k, i))
    rx = re.compile('|'.join(re.escape(s) for s in sorted(table, key=len, reverse=True)))
    return rx, table


def load_files(root=ROOT):
    names = subprocess.run(['git', '-C', root, 'ls-files'], capture_output=True, text=True, check=True).stdout.split('\n')
    out = {}
    for n in names:
        if not n or SKIP.search(n) or not TEXT.search(n):
            continue
        p = os.path.join(root, n)
        if not os.path.isfile(p):
            continue
        try:
            with open(p, encoding='utf-8') as f:
                out[n] = f.read()
        except UnicodeDecodeError:
            pass
    return out


def load_applied(root=ROOT):
    p = os.path.join(root, APPLIED)
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def strip_comments(path, text):
    """Comments blanked out (same length, so positions and line numbers stay), so notes for developers are not read as page text."""
    blank = lambda m: re.sub(r'[^\n]', ' ', m.group(0))
    text = re.sub(r'/\*.*?\*/|<!--.*?-->', blank, text, flags=re.S)
    if path.endswith('.py'):
        return re.sub(r'(?m)^\s*#.*$', blank, text)
    return re.sub(r'(?m)(?<![:\'"\\])//.*$', blank, text) if path.endswith('.js') else text


def where(phrases, files):
    """{key: {path: how many times}} for every phrase, matched longest first."""
    rx, table = tokenizer(phrases)
    out = {k: {} for k in phrases}
    for path, text in files.items():
        for m in rx.finditer(text):
            k = table[m.group(0)][0]
            out[k][path] = out[k].get(path, 0) + 1
    return {k: dict(sorted(v.items())) for k, v in out.items()}


def bump_versions(changed, files, stamp):
    """A changed script or stylesheet gets a new ?v= wherever it is loaded, and sw.js a new V when it lists the file, so no
    browser or service worker keeps the old copy."""
    out = dict(changed)
    for path in [p for p in changed if p.startswith('assets/')]:
        ref = re.compile(r'(/' + re.escape(path) + r'\?v=)([\w.-]+)')
        for f, text in list(dict(files, **out).items()):
            t = ref.sub(lambda m: m.group(1) + (stamp if m.group(2) != stamp else stamp + 'b'), text)
            if f == 'sw.js' and t != text:
                t = re.sub(r"^var V = '([^']+)';", lambda m: "var V = '%s';" % (stamp if m.group(1) != stamp else stamp + 'b'), t, count=1, flags=re.M)
            if t != text:
                out[f] = t
    return out


def apply(cfg, applied, files, stamp=None):
    """Returns ({path: new text} for changed files, record to save as pricing.applied.json)."""
    new = render(cfg)
    old = new if applied is None else {k: t for k, t in applied['phrases'].items() if k in new}
    by_hand = set(cfg['by_hand'])
    rx, table = tokenizer(old)

    def swap(m):
        k, form = table[m.group(0)]
        if k in by_hand or old[k] == new[k]:
            return m.group(0)
        return encode(new[k], form)
    changed = {}
    for path, text in files.items():
        if path in cfg['by_hand_files']:
            continue
        t = rx.sub(swap, text)
        if t != text:
            changed[path] = t
    changed = bump_versions(changed, files, stamp or 'sp-' + datetime.date.today().strftime('%Y%m%d') + 'price')
    before, after = where(old, files), where(new, dict(files, **changed))
    # a by-hand sentence that changed is expected where the old one is, once a person has rewritten it
    seen = {k: (before.get(k, {}) if k in by_hand and k in old and old[k] != new[k] else after[k]) for k in new}
    return changed, {'phrases': new, 'where': seen}


def problems(cfg, applied, files):
    out = []
    phrases = render(cfg)
    dash = [k for k, t in phrases.items() if '\u2014' in t or '\u2013' in t]
    if dash:
        out.append('pricing.json: no em or en dashes in phrases: ' + ', '.join(dash))
    seen = {}
    for k, t in phrases.items():
        if t in seen:
            out.append('pricing.json: phrases %s and %s say the same thing; keep one' % (seen[t], k))
        seen[t] = k
    if applied is None or applied['phrases'] != phrases:
        out.append('pricing.json was changed but the pages were not updated: run  python3 _tools/pricing.py')
    used_vals = set(re.findall(r'\{(\w+)\}', json.dumps([cfg['phrases'], cfg['by_hand']])))
    for v in cfg['values']:
        if v not in used_vals:
            out.append('pricing.json: value %s is not used by any phrase; delete it' % v)
    rx, table = tokenizer(phrases)
    ours = re.compile('|'.join(re.escape(s) for s in cfg['not_ours'])) if cfg['not_ours'] else None
    for path, text in sorted(files.items()):
        spans = [(m.start(), m.end()) for m in rx.finditer(text)]
        if ours:
            spans += [(m.start(), m.end()) for m in ours.finditer(text)]
        inside = lambda m: any(a <= m.start() and m.end() <= b for a, b in spans)
        hint = cfg['by_hand_files'].get(path, 'Use a phrase from _tools/pricing.json (add one if needed) and run python3 _tools/pricing.py.')
        for m in MENTION.finditer(text):
            if not inside(m):
                out.append('%s:%d says "%s", which is not a price or trial length from pricing.json. %s' % (path, text.count('\n', 0, m.start()) + 1, m.group(0), hint))
        if not path.endswith(('.css', '.md')):
            for m in WORDS.finditer(strip_comments(path, text)):
                if not inside(m):
                    out.append('%s:%d has billing wording ("%s") that is not a sentence in pricing.json. %s' % (path, text.count('\n', 0, m.start()) + 1, m.group(0), hint))
    now = where(phrases, files)
    for k in phrases:
        if not now[k]:
            if k in cfg['by_hand']:
                out.append('by hand: "%s" (%s) is not on any page yet. %s' % (phrases[k], k, cfg['by_hand'][k]['why']))
            else:
                out.append('pricing.json: phrase %s ("%s") is not on any page; delete it or put the sentence back' % (k, phrases[k]))
        elif applied is not None and now[k] != applied.get('where', {}).get(k):
            want = applied.get('where', {}).get(k, {})
            for f in sorted(set(now[k]) | set(want)):
                if now[k].get(f, 0) != want.get(f, 0):
                    out.append('%s: "%s" (%s) is there %d time(s), %d expected. If a page was edited by hand, make the change in pricing.json '
                               'instead; if a page was added or removed on purpose, run python3 _tools/pricing.py to record it.' % (f, phrases[k], k, now[k].get(f, 0), want.get(f, 0)))
    return out


def main(argv):
    cfg, files = load_config(), load_files()
    applied = load_applied()
    if '--check' in argv:
        p = problems(cfg, applied, files)
        print('\n'.join(p) if p else 'Prices, trial length and billing wording all match _tools/pricing.json.')
        return 1 if p else 0
    changed, record = apply(cfg, applied, files)
    for path, text in changed.items():
        with open(os.path.join(ROOT, path), 'w', encoding='utf-8', newline='') as f:
            f.write(text)
    with open(os.path.join(ROOT, APPLIED), 'w', encoding='utf-8') as f:
        json.dump(dict({'_read_me': 'Written by _tools/pricing.py: each phrase as the pages say it now, and where. Do not edit by hand.'}, **record),
                  f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('Updated %d file(s): %s' % (len(changed), ', '.join(sorted(changed)) or 'none'))
    left = problems(cfg, record, load_files())
    if left:
        print('\nStill to do by hand (the site check fails until these are done):\n  ' + '\n  '.join(left))
    print('\nAlso outside this repo: Stripe prices and the FOUNDING coupon, the renewal-terms email in the backend, and the app '
          'store listings. If the portal billing text changed, run  node _tools/billing/copy_test.js --update  and review the diff.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
