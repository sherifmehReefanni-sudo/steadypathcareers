#!/usr/bin/env python3
"""Keeps every price, trial length and billing sentence on the site in step with _tools/pricing.json (the one place for them).

    python3 _tools/pricing.py            apply: rewrite every page, script and page builder that says a changed phrase
    python3 _tools/pricing.py --check    report problems and exit 1 if there are any (the site check runs the same thing)

How it works: _tools/pricing.applied.json records each phrase exactly as the pages say it now. When pricing.json changes, apply
finds each old sentence (also in its &#39;, &#x27; and \\' forms) and writes the new one in the same form, longest phrase first,
in one pass. 'by_hand' phrases and 'by_hand_files' are left alone, and the check fails until a person updates them.

The check fails when:
  - pricing.json was edited but apply was not run;
  - a page states a trial length or one of our prices that is not inside a phrase from pricing.json (a hand edit, a new page,
    or a by-hand item that still says the old price);
  - a phrase or value in pricing.json is no longer used anywhere (delete it, or put the sentence back)."""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG, APPLIED = '_tools/pricing.json', '_tools/pricing.applied.json'
# Files the tool never reads or writes: itself, the checks (they read pricing.json), third-party code, and the billing copy
# snapshot (written by node _tools/billing/copy_test.js --update).
SKIP = re.compile(r'^(_tools/pricing\.|_tools/site-tests/|_tools/billing/copy_snapshot\.json$|assets/vendor/|\.github/)')
TEXT = re.compile(r'\.(html|js|json|py|vtt|xml|webmanifest|txt|md|css|toml)$|^_redirects$')

# What counts as stating a trial length or one of our prices. Pay figures on job cards and guides ("$62,000 a year",
# "$905 a week", "$20 per hour") do not match these.
TRIAL = [r'(?i:\bfree for (\d+) days?\b)', r'(?i:\b(\d+) days?, no card\b)', r'(?i:\b(\d+)[- ]day (?:free )?(?:trial|pilot)\b)',
         r'(?i:\bfree (\d+)[- ]day\b)']
MONEY = [r'\$(\d+(?:\.\d\d)?)(?![\d,.])(?:</b>)?\s*(?:a|per|/)\s*(?:month|mo)\b', r'\$(\d+(?:\.\d\d)?)(?![\d,.]) (?:today|one time|with code)\b',
         r"\['\w+', '[^'<]+', '\$(\d+)'\]", r'<span class="n[vw]">(\d+)</span>']
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
        return json.load(f)['phrases']


def apply(cfg, applied, files):
    """Returns ({path: new text} for changed files, {key: new text} to record)."""
    new = render(cfg)
    if applied is None:
        applied = new
    by_hand = set(cfg['by_hand'])
    rx, table = tokenizer({k: t for k, t in applied.items() if k in new})

    def swap(m):
        k, form = table[m.group(0)]
        if k in by_hand or applied[k] == new[k]:
            return m.group(0)
        return encode(new[k], form)
    changed = {}
    for path, text in files.items():
        if path in cfg['by_hand_files']:
            continue
        t = rx.sub(swap, text)
        if t != text:
            changed[path] = t
    return changed, new


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
    if applied != phrases:
        out.append('pricing.json was changed but the pages were not updated: run  python3 _tools/pricing.py')
    used_vals = set(re.findall(r'\{(\w+)\}', json.dumps([cfg['phrases'], cfg['by_hand']])))
    for v in cfg['values']:
        if v not in used_vals:
            out.append('pricing.json: value %s is not used by any phrase; delete it' % v)
    rx, table = tokenizer(phrases)
    ours = re.compile('|'.join(re.escape(s) for s in cfg['not_ours'])) if cfg['not_ours'] else None
    found = set()
    for path, text in sorted(files.items()):
        spans = []
        for m in rx.finditer(text):
            found.add(table[m.group(0)][0])
            spans.append((m.start(), m.end()))
        if ours:
            spans += [(m.start(), m.end()) for m in ours.finditer(text)]
        for m in MENTION.finditer(text):
            if not any(a <= m.start() and m.end() <= b for a, b in spans):
                line = text.count('\n', 0, m.start()) + 1
                hint = cfg['by_hand_files'].get(path, 'use a phrase from _tools/pricing.json, or add one and run python3 _tools/pricing.py')
                out.append('%s:%d says "%s", which is not a price or trial length from pricing.json. %s' % (path, line, m.group(0), hint))
    for k in phrases:
        if k not in found:
            if k in cfg['by_hand']:
                out.append('by hand: "%s" (%s) is not on any page yet. %s' % (phrases[k], k, cfg['by_hand'][k]['why']))
            else:
                out.append('pricing.json: phrase %s ("%s") is not on any page; delete it or put the sentence back' % (k, phrases[k]))
    return out


def main(argv):
    cfg, files = load_config(), load_files()
    applied = load_applied()
    if '--check' in argv:
        p = problems(cfg, applied, files)
        print('\n'.join(p) if p else 'Prices, trial length and billing wording all match _tools/pricing.json.')
        return 1 if p else 0
    changed, new = apply(cfg, applied, files)
    for path, text in changed.items():
        with open(os.path.join(ROOT, path), 'w', encoding='utf-8', newline='') as f:
            f.write(text)
    with open(os.path.join(ROOT, APPLIED), 'w', encoding='utf-8') as f:
        json.dump({'_read_me': 'Written by _tools/pricing.py: each phrase as the pages say it now. Do not edit by hand.',
                   'phrases': new}, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('Updated %d file(s): %s' % (len(changed), ', '.join(sorted(changed)) or 'none'))
    assets = sorted(p for p in changed if p.startswith('assets/'))
    if assets:
        print('Changed scripts: ' + ', '.join(assets) + '. Bump their ?v= where pages load them, and V in sw.js if sw.js lists them.')
    left = problems(cfg, new, load_files())
    if left:
        print('\nStill to do by hand (the site check fails until these are done):\n  ' + '\n  '.join(left))
    print('\nAlso outside this repo: Stripe prices and the FOUNDING coupon, the renewal-terms email in the backend, and the app '
          'store listings. If the portal billing text changed, run  node _tools/billing/copy_test.js --update  and review the diff.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
