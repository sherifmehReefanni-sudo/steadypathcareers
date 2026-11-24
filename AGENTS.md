# Steady Path Careers website

Static site served by Cloudflare from this repo. The portal is in portal/ with its scripts in assets/.

## Steady Path build rules (set by Reef, Nov 14, 2026)

These apply to every change in this repo, whoever makes it.

1. **No timed polling without a clear reason.** Do not fetch from the backend on a timer. Refresh when a screen opens or the app comes back to the front, and use push for alerts. Any timer (a countdown, an animation) stops when its screen is not showing or the app or tab is in the background.
2. **Replace, do not layer.** When changing a feature, edit or replace the existing code. Do not add a new version that wraps or overrides the old one and leave the old one in place. Delete code, files and pages that nothing uses any more.
3. **Never break live data or live links.** Client data in the Google Sheets backend is migrated, never dropped. Pages that emails or saved links point to keep working (for example /start/v2, the "finish later" link). If a path must go, redirect it.
4. Before removing anything, search the repo for every reference to it, including test and check tools, and fix or repoint those.

## Prices, trial length and billing wording (added Nov 24, 2026)

They live in one place: `_tools/pricing.json`. To change one, edit that file and run `python3 _tools/pricing.py` from the site root; it rewrites every page, script and page builder that says it, and lists what must be done by hand (the legal terms, the recorded welcome video and its captions, the social images, Stripe and the backend email). Never type a price or trial length straight into a page: `_tools/site-tests/test_pricing.py` fails on any that is not from pricing.json.

## Site checks (added Nov 15, 2026)

`_tools/site-tests/` holds Playwright checks that GitHub runs on every push and once a day against the live site (`.github/workflows/site-checks.yml`). Before pushing, run them: `cd _tools/site-tests && python -m pytest` (about a minute). If a change is meant to alter something a check looks at (the welcome card price, a portal screen, a page path), update the check in the same commit and say so. Never delete or loosen a check just to make it pass. The checks block every POST and every outside host, so they can never send an intake, an email, a funnel ping or a Stripe session; keep it that way.
