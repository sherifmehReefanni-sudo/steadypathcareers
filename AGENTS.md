# Steady Path Careers website

Static site served by Cloudflare from this repo. The portal is in portal/ with its scripts in assets/.

## Steady Path build rules (set by Reef, Nov 14, 2026)

These apply to every change in this repo, whoever makes it.

1. **No timed polling without a clear reason.** Do not fetch from the backend on a timer. Refresh when a screen opens or the app comes back to the front, and use push for alerts. Any timer (a countdown, an animation) stops when its screen is not showing or the app or tab is in the background.
2. **Replace, do not layer.** When changing a feature, edit or replace the existing code. Do not add a new version that wraps or overrides the old one and leave the old one in place. Delete code, files and pages that nothing uses any more.
3. **Never break live data or live links.** Client data in the backend (Supabase since the Nov 25, 2026 cutover; Google Sheets before it) is migrated, never dropped. Pages that emails or saved links point to keep working (for example /start/v2, the "finish later" link). If a path must go, redirect it.
4. Before removing anything, search the repo for every reference to it, including test and check tools, and fix or repoint those.

## Prices, trial length and billing wording (added Nov 24, 2026)

They live in one place: `_tools/pricing.json`, which holds the values (trial days, plan, founding and add-on prices) and every sentence on the site, in the portal and in the intake form that states a price, the trial length, or how paying, renewing, refunds, cancelling, charges, paid plans, the free pilot, cards or the founding offer work. To change one, edit that file and run `python3 _tools/pricing.py` from the site root: it rewrites every page, script and page builder that says it, gives a changed script a new `?v=` (and `sw.js` a new `V`), and lists what must be done by hand (the terms and privacy pages, the attorney-reviewed cancellation notice, the recorded welcome video and its captions, the social images; outside this repo, Stripe and the backend renewal email). Never type a price, trial length or billing sentence straight into a page: `_tools/site-tests/test_pricing.py` fails on a number or billing wording that is not from pricing.json, on a recorded sentence that was edited in place, and on a served page (closed FAQ answers and meta descriptions included) that shows another number. It does not catch a new billing sentence that uses none of its key words and no number; add such a sentence to pricing.json yourself.

## Site checks (added Nov 15, 2026)

`_tools/site-tests/` holds Playwright checks that GitHub runs on every push and once a day against the live site (`.github/workflows/site-checks.yml`). Before pushing, run them: `cd _tools/site-tests && python -m pytest` (about a minute). If a change is meant to alter something a check looks at (the welcome card price, a portal screen, a page path), update the check in the same commit and say so. Never delete or loosen a check just to make it pass. The checks block every POST and every outside host, so they can never send an intake, an email, a funnel ping or a Stripe session; keep it that way.
