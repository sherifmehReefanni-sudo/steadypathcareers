#!/usr/bin/env python3
"""Builds /free/, /free/laid-off-72-hours/ and /free/follow-up-scripts/ for branch r19a.
Run from the site root: python3 _tools/build-free.py .   (Folders starting with "_" are not published.) Reads shared art from guides/laid-off/index.html."""
import re, sys, html, os
ROOT = sys.argv[1]
G = open(os.path.join(ROOT, 'guides/laid-off/index.html'), encoding='utf-8').read()
HORIZON = re.search(r'<svg class="horizon".*?</svg>', G).group(0)
HILLTOP = re.search(r'<svg class="hilltop".*?</svg>', G).group(0)
FIN_SVG = re.search(r'<section class="finale".*?</div>(<svg class="ill".*?</svg>)</section>', G).group(1)
SPARK = lambda x, y, s, c, d='': f'<g transform="translate({x} {y}) scale({s})"><g class="pop{(" " + d) if d else ""}"><path d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z" fill="{c}"/></g></g>'
CAL = 'https://calendar.app.google/8wyFoDK5k6k1iamT9'
SITE = 'https://steadypathcareers.com'

def nav(cur):
    items = [('/#how', 'How it works'), ('/services/', 'What you get'), ('/sample/', 'Sample report'), ('/pay/', 'Pay lookup'), ('/guides/', 'Guides'), ('/free/', 'Free tools'), ('/about/', 'About')]
    links = ''.join(f'<a href="{h}"{" aria-current=\"true\"" if h == cur else ""}>{t}</a>' for h, t in items)
    return f'<nav class="topbar" aria-label="Main"><a class="brand" href="/"><span data-logo></span>Steady Path Careers</a><div class="links">{links}</div><div class="right"><a href="/portal/">Client sign in</a><a class="btn gold" href="/start/">Start free</a></div></nav>'

FOOT = ('<footer class="foot"><div class="wrap"><a class="brand" href="/"><span data-logo></span>Steady Path Careers</a><nav aria-label="Footer"><a href="/services/">What you get</a><a href="/sample/">Sample report</a><a href="/pay/">Pay lookup</a><a href="/guides/">Guides</a><a href="/free/">Free tools</a><a href="/about/">About</a><a href="' + CAL + '" target="_blank" rel="noopener">Book a call</a><a href="/portal/">Client sign in</a></nav><p class="where"><span class="wg wt">&copy; 2026 Steady Path Careers</span><span class="ws" aria-hidden="true"> &middot; </span><span class="wg wt">Monmouth County, NJ</span><span class="ws" aria-hidden="true"> &middot; </span><span class="wg"><a href="/terms/">Terms</a> &middot; <a href="/privacy/">Privacy</a></span><span class="ws" aria-hidden="true"> &middot; </span><span class="wg"><a href="mailto:hello@steadypathcareers.com">hello@steadypathcareers.com</a></span><span class="ws" aria-hidden="true"> &middot; </span><span class="wg"><a href="tel:+17327590008">(732) 759-0008</a></span></p></div></footer>\n'
        '<script src="/assets/site.js?v=20261027a"></script>\n<script src="/assets/path.js?v=20261026a"></script>\n<script defer src="/assets/r17.js?v=20261031c"></script>\n'
        """<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "6f62d1e0e28847dcab6b431376defda9"}'></script><!-- End Cloudflare Web Analytics -->\n""")

R17 = '20261031n'

def head(path, title, desc, og_img, og_alt, css, ld):
    url = SITE + path
    t, d = html.escape(title), html.escape(desc)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="darkreader-lock">
<meta name="color-scheme" content="only light">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Newsreader:ital,opsz,wght@1,6..72,400;1,6..72,500&display=swap">
<link rel="stylesheet" href="/assets/site.css?v=20261023a">
<link rel="stylesheet" href="/assets/path.css?v=20261027a">
<link rel="stylesheet" href="/assets/r17.css?v={R17}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Steady Path Careers">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:image" content="{SITE}/img/og/{og_img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(og_alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/img/og/{og_img}">
<meta name="twitter:image:alt" content="{html.escape(og_alt)}">
<script type="application/ld+json">{ld}</script>
<style>
{css.strip()}
</style>
</head>
<body class="mk">
<a class="skip" href="#main">Skip to content</a>
'''

def phero(cur, kicker, h1, sub, cta, art):
    return f'<header class="phero "><div class="wrap">{nav(cur)}</div>\n<div class="wrap phero-in"><div class="phero-copy"><p class="kicker">{kicker}</p><h1>{h1}</h1><p class="sub">{sub}</p><div class="cta">{cta}</div></div><div class="phero-art">{art}</div></div>{HORIZON}</header>\n'

def finale(h2, p):
    return f'<section class="finale" data-mile style="--a:#0B4A52"><div class="wrap"><h2>{h2}</h2><p>{p}</p><a class="btn gold" href="/start/">Start free</a></div>{FIN_SVG}</section>\n'

OFFER_H = 'Want me to run your search for you? Free for 60 days.'
OFFER_P = 'When you&#x27;re ready, I&#x27;ll find and check openings that fit, show the pay on every one, and tailor your resume for each job you pick. You send every application. Free for 60 days while Steady Path is in its pilot.'

# ---------------------------------------------------------------- shared small CSS for /free/ pages
BASE_CSS = r'''
.fx-meta { font-size: 16px; color: var(--ink2); margin: 0 0 6px; }
.fx-meta b { color: var(--midnight); }
.fx-note { display: inline-block; font-weight: 800; color: var(--midnight); background: #fff; border: 2px solid var(--gold); border-radius: 10px; padding: 6px 12px; margin: 4px 0 0; font-size: 16px; }
.phero .cta button.btn { font: inherit; font-weight: 800; }
@media print {
  @page { margin: 14mm 13mm; }
  body.mk { font-size: 11pt; }
  .phero-art, .phero .cta, .finale .ill, .fx-noprint, .foot nav, .foot .brand { display: none !important; }
  .foot { padding: 6px 0 !important; }
  .foot .where { flex-direction: row !important; align-items: center !important; font-size: 9pt; }
  .foot .where .ws { display: inline !important; }
  .foot .where .wt { min-height: 0 !important; padding: 0 !important; }
  .finale { padding: 14px 0 !important; }
  .finale h2 { font-size: 18pt !important; margin-bottom: 6px !important; }
  .finale p { font-size: 10.5pt !important; margin: 0 auto 8px !important; }
  .foot { break-inside: avoid; }
  .finale .btn::after { content: ": steadypathcareers.com/start/"; }
  .phero h1 { font-size: 24pt !important; }
  .sec { padding: 10px 0 !important; }
  a { color: #000 !important; }
}
'''

# ---------------------------------------------------------------- 1. laid-off kit
SOURCES = {
 'nj-apply': ('NJ Dept. of Labor, Apply for unemployment online, step by step', 'https://nj.gov/labor/myunemployment/before/about/howtoapply/applyonline.shtml'),
 'nj-pr94': ('NJ Dept. of Labor, Unemployment Insurance: Your Rights &amp; Responsibilities (PR-94, 7/2026)', 'https://www.nj.gov/labor/myunemployment/assets/pdfs/PR-94.pdf'),
 'nj-info': ('NJ Dept. of Labor, Get your information ready', 'https://nj.gov/labor/myunemployment/before/about/howtoapply/infoneeded.shtml'),
 'nj-cert': ('NJ Dept. of Labor, How to certify for weekly benefits', 'https://www.nj.gov/labor/myunemployment/before/about/howtoapply/howtocertify.shtml'),
 'nj-rates': ('NJ Dept. of Labor, 2026 benefit rates (press release, Dec. 29, 2025)', 'https://www.nj.gov/labor/lwdhome/press/2025/20251229_newbenefitrates2026.shtml'),
 'nj-eafaq': ('NJ Dept. of Labor, Employer handbook FAQs (pay in lieu of notice)', 'https://www.nj.gov/labor/ea/help/employer_handbook/faqs.shtml'),
 'ny-upgrade': ('NY Dept. of Labor, Upgraded unemployment insurance system announcement (Sept. 28, 2026)', 'https://dol.ny.gov/news/unemployment/announcement'),
 'ny-apply': ('New York State, Get unemployment assistance', 'https://www.ny.gov/services/get-unemployment-assistance'),
 'ny-flyer': ('NY Dept. of Labor, Unemployment insurance FAQ flyer', 'https://dol.ny.gov/unemployment-insurance-faq-flyer'),
 'ny-cert': ('NY Dept. of Labor, Certify for weekly unemployment insurance benefits', 'https://dol.ny.gov/unemployment/certify-weekly-unemployment-insurance-benefits'),
 'ny-when': ('NY Dept. of Labor, When should I certify?', 'https://dol.ny.gov/when-should-i-certify'),
 'ny-mbr': ('NY Dept. of Labor, What is the maximum benefit rate?', 'https://dol.ny.gov/mbr'),
 'ny-ws': ('NY Dept. of Labor, Work search requirements and recordkeeping', 'https://dol.ny.gov/services/ui/wsr'),
 'ny-sev': ('NY Dept. of Labor, Dismissal/severance pay and pensions FAQ', 'https://dol.ny.gov/dismissalseverance-pay-and-pensions-frequently-asked-questions'),
 'ny-p825': ('NY Dept. of Labor, Dismissal or severance pay and your UI benefit (P825)', 'https://dol.ny.gov/dismissal-or-severance-pay-and-your-ui-benefit-p825-english'),
 'nj-warn': ('NJ WARN Act as amended (statute PDF)', 'https://www.nj.gov/labor/assets/PDFs/WARN/NJ_WARN_ACT_2023law.pdf'),
 'eeoc': ('U.S. EEOC, Understanding waivers of discrimination claims in employee severance agreements', 'https://www.eeoc.gov/laws/guidance/qa-understanding-waivers-discrimination-claims-employee-severance-agreements'),
 'dol-guide': ('U.S. Dept. of Labor, An Employee&#x27;s Guide to Health Benefits Under COBRA', 'https://www.dol.gov/sites/dolgov/files/ebsa/about-ebsa/our-activities/resource-center/publications/an-employees-guide-health-benefits-under-cobra-2022.pdf'),
 'dol-faq': ('U.S. Dept. of Labor, FAQs on COBRA continuation health coverage for workers', 'https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/cobra-continuation-health-coverage-workers'),
 'hc-sep': ('HealthCare.gov, Getting health coverage outside Open Enrollment', 'https://www.healthcare.gov/coverage-outside-open-enrollment/special-enrollment-period/'),
 'hc-cobra': ('HealthCare.gov, COBRA coverage when you&#x27;re unemployed', 'https://www.healthcare.gov/unemployed/cobra-coverage/'),
 'nj-dobi': ('NJ Dept. of Banking and Insurance, Continuation of coverage (COBRA and NJ state continuation)', 'https://www.nj.gov/dobi/division_consumers/insurance/cobra.html'),
 'ny-dfs': ('NY Dept. of Financial Services, Extension of continuation coverage to 36 months', 'https://www.dfs.ny.gov/consumers/health_insurance/cobra_coverage_extension_36_Months'),
 'gcnj': ('Get Covered New Jersey', 'https://www.nj.gov/getcoverednj/'),
 'gcnj-sep': ('Get Covered New Jersey, Special Enrollment Period overview (2026)', 'https://www.nj.gov/getcoverednj/library/SEPOverview2026.pdf'),
 'nysoh': ('NY State of Health, the official health plan marketplace', 'https://nystateofhealth.ny.gov/'),
 'nysoh-sep': ('NY State of Health, Special enrollment periods', 'https://info.nystateofhealth.ny.gov/SpecialEnrollmentPeriods'),
 'nysoh-oe': ('NY State of Health, Open enrollment for 2027 coverage (press release, Oct. 28, 2026)', 'https://info.nystateofhealth.ny.gov/news/press-release-new-york-state-department-health-announces-open-enrollment-2027-coverage'),
 'nj-wh': ('NJ Dept. of Labor, Wage and hour worker FAQs', 'https://www.nj.gov/labor/wageandhour/support/faqs/wageandhourworkerfaqs.shtml'),
 'ny-pay': ('NY Dept. of Labor, Frequency of pay FAQs', 'https://dol.ny.gov/system/files/documents/2021/03/frequency-of-pay-frequently-asked-questions.pdf'),
 'ny-supp': ('NY Dept. of Labor, Unpaid or withheld wages and wage supplements', 'https://dol.ny.gov/unpaidwithheld-wages-and-wage-supplements'),
 'ny-psl': ('New York State, Paid sick leave FAQ', 'https://www.ny.gov/sites/default/files/atoms/files/PSL_FAQ_PaidSickLeaveFAQ.pdf'),
 'irs-roll': ('IRS, Rollovers of retirement plan and IRA distributions', 'https://www.irs.gov/retirement-plans/plan-participant-employee/rollovers-of-retirement-plan-and-ira-distributions'),
}

KIT_CSS = BASE_CSS + r'''
.fn, .fn-c { line-height: 0; font-size: .74em; vertical-align: super; }
.fn a { position: relative; font-weight: 800; text-decoration: none; color: var(--navy); padding: 0 1px; }
.fn a::after { content: ""; position: absolute; inset: -14px -6px; }
.prose .kit-jump { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 0; padding: 0; list-style: none; }
.kit-jump a { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px; border-radius: 999px; background: #fff; border: 1px solid rgba(31,58,95,.18); font-weight: 800; font-size: 15px; text-decoration: none; color: var(--midnight); }
.kit-jump a:hover { border-color: var(--gold); }
.prose .clocks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0 0; padding: 0; list-style: none; }
.clocks li { background: #fff; border: 1px solid rgba(31,58,95,.14); border-top: 5px solid var(--gold); border-radius: 14px; padding: 14px 16px; }
.clocks b { display: block; font-size: 17px; color: var(--midnight); line-height: 1.3; }
.clocks span { display: block; font-size: 16px; color: var(--ink2); line-height: 1.45; margin-top: 4px; }
.when { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 10px; padding: 6px 14px 6px 8px; border-radius: 999px; background: var(--midnight); color: var(--cream); font-weight: 800; font-size: 15px; letter-spacing: .01em; }
.when svg { width: 22px; height: 22px; flex: none; }
.ck { list-style: none; padding: 0 !important; margin: 14px 0; display: grid; gap: 12px; }
.ck > li { position: relative; padding-left: 38px; }
.ck > li::before { content: ""; position: absolute; left: 0; top: 4px; width: 22px; height: 22px; border: 2.5px solid var(--navy); border-radius: 6px; background: #fff; }
.states { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin: 18px 0; }
.state { background: #fff; border: 1px solid rgba(31,58,95,.14); border-radius: 18px; padding: 20px 20px 6px; }
.state h3 { display: flex; align-items: center; gap: 10px; font-size: 22px; margin: 0 0 4px; }
.state h3 span { font-size: 13px; font-weight: 800; letter-spacing: .06em; background: var(--gold-soft); color: #5a4300; border-radius: 6px; padding: 3px 8px; }
.state .ck > li { font-size: 17px; }
.alert { background: #fff; border: 2px solid var(--bad); border-left-width: 8px; border-radius: 14px; padding: 14px 18px; margin: 16px 0; }
.alert b { color: var(--bad); }
.k-wide { max-width: 980px; }
.k-wide .prose { max-width: none; }
.k-cols { margin-top: 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; align-items: start; }
@media (max-width: 600px) {
  .prose .tw.stack { overflow: visible; }
  .prose .tw.stack .cmp { min-width: 0; }
  .tw.stack thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .tw.stack tr, .tw.stack th, .tw.stack td { display: block; width: auto !important; }
  .tw.stack tbody th { background: var(--sunk); border-bottom: 0; padding-bottom: 6px; }
  .tw.stack td::before { content: attr(data-label); display: block; font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6f5300; margin-bottom: 2px; }
}
.k-box { background: #fff; border: 1px solid rgba(31,58,95,.14); border-radius: 18px; padding: 20px; }
.k-box h3 { margin-top: 0; }
.prose .tw .cmp td:first-child, .prose .tw .cmp th:first-child { width: 22%; font-weight: 800; color: var(--midnight); }
.dont { counter-reset: d; list-style: none; padding: 0 !important; display: grid; gap: 12px; }
.dont > li { counter-increment: d; position: relative; background: #fff; border: 1px solid rgba(31,58,95,.14); border-radius: 14px; padding: 14px 16px 14px 60px; }
.dont > li::before { content: ""; position: absolute; left: 16px; top: 16px; width: 28px; height: 28px; border-radius: 50%; background: var(--bad); }
.dont > li::after { content: ""; position: absolute; left: 24px; top: 29px; width: 12px; height: 3px; background: #fff; border-radius: 2px; }
.hrq { counter-reset: q; list-style: none; padding: 0 !important; display: grid; gap: 10px; }
.hrq > li { counter-increment: q; position: relative; padding: 4px 0 10px 46px; border-bottom: 1px dashed rgba(31,58,95,.25); }
.hrq > li::before { content: counter(q); position: absolute; left: 0; top: 2px; width: 32px; height: 32px; border-radius: 50%; background: var(--gold); color: var(--midnight); font-weight: 800; font-size: 16px; display: grid; place-items: center; }
.hrq .ans { display: none; }
.srcs { padding-left: 28px !important; }
.srcs li { font-size: 15px; overflow-wrap: anywhere; color: #DCE6F0; }
.srcs li:target { outline: 3px solid var(--gold); outline-offset: 4px; border-radius: 4px; }
.srcs a { color: #F2D98A; }
.srcs a.back { display: inline-flex; align-items: center; min-height: 44px; min-width: 44px; padding: 0 8px; font-weight: 800; text-decoration: none; }
.disc { font-weight: 800; }
.pw { display: none; }
@media (max-width: 900px) { .prose .clocks { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .states, .k-cols { grid-template-columns: minmax(0, 1fr); } .state { padding: 16px 16px 4px; } }
@media (max-width: 420px) { .prose .clocks { grid-template-columns: minmax(0, 1fr); } .dont > li { padding-left: 54px; } }
@media print {
  .kit-jump, .srcs a.back { display: none !important; }
  .prose .clocks { grid-template-columns: repeat(4, 1fr); }
  .clocks li, .dont > li, .alert, .hrq > li, .ck > li, tr { box-shadow: none; break-inside: avoid; }
  .state, .k-box { break-inside: auto; }
  .when { display: none !important; }
  .pw { display: inline; color: #6f5300; }
  h2, h3 { break-inside: avoid; break-after: avoid; }
  .states, .k-cols { grid-template-columns: 1fr 1fr; gap: 10px; }
  .prose p, .prose li, .state .ck > li { font-size: 10.5pt !important; line-height: 1.45 !important; }
  .when { background: #fff !important; color: #000 !important; border: 2px solid #000; }
  .when svg circle:first-child { fill: #fff; }
  .srcs li, .srcs a { color: #000 !important; font-size: 9pt !important; }
  .fn a { color: #000 !important; }
  .hrq .ans { display: block; height: 16px; }
  #sources { break-before: page; }
}
'''

CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="#C9A227"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#10213A" stroke-width="2"/><path d="M12 8v4.4l3 1.8" fill="none" stroke="#10213A" stroke-width="2" stroke-linecap="round"/></svg>'

KIT_ART = ('<svg class="hero-svg" viewBox="0 0 320 240" aria-hidden="true" focusable="false" data-live><g transform="translate(160 122)"><g class="rise">'
  '<circle r="92" fill="#1F3A5F"/><circle r="74" fill="#FBF6EE"/>'
  + ''.join(f'<path d="M0 -66 V-58" transform="rotate({a})" stroke="#1F3A5F" stroke-width="{5 if a % 90 == 0 else 3}" stroke-linecap="round"/>' for a in range(0, 360, 30)) +
  '<path class="draw d2" pathLength="1" d="M0 -60 A60 60 0 0 1 60 0" fill="none" stroke="#C9A227" stroke-width="10" stroke-linecap="round"/>'
  '<path d="M0 0 V-44" stroke="#10213A" stroke-width="8" stroke-linecap="round"/><path d="M0 0 L30 18" stroke="#10213A" stroke-width="7" stroke-linecap="round"/><circle r="8" fill="#C9A227"/></g></g>'
  + SPARK(46, 52, 1, '#C9A227') + SPARK(276, 70, .8, '#C9A227', 'd2') + SPARK(262, 206, .9, '#1F3A5F', 'd3') + '</svg>')

def when(label):
    return f'<p class="when">{CLOCK}<span>{label}</span></p>'

KIT_BODY = r'''
<section class="sec" id="start" data-mile style="--a:#FBE3CF;--b:#FAEEE0"><div class="wrap k-wide"><div class="prose">
<p class="fx-meta">By Sherif Mehanni. <b>Last checked: October 31, 2026</b>, against New Jersey, New York and federal government sources, numbered at the bottom.</p>
<p class="fx-note disc">General information, not legal or financial advice.</p>
<h2 style="margin-top:22px">Four clocks start now</h2>
<p>You don't have to fix everything today. You just need to know which deadlines are running.</p>
<ul class="clocks">
<li><b>Unemployment</b><span>File this week. In NJ your claim doesn't start until you file.{{nj-pr94}} NY says to apply the first week you lose your job.{{ny-apply}}</span></li>
<li><b>Severance review</b><span>40 or older? At least 21 days to decide (45 in a group layoff), then 7 days to change your mind.{{eeoc}}</span></li>
<li><b>COBRA</b><span>At least 60 days to choose whether to keep your job&#x27;s health plan.{{dol-guide}}</span></li>
<li><b>Marketplace</b><span>A 60-day window to buy your own plan after you lose job coverage.{{hc-sep}}</span></li>
</ul>
<ul class="kit-jump fx-noprint" aria-label="Jump to a part of the kit">
<li><a href="#hour-0">Hour 0</a></li><li><a href="#day-1">Hours 1 to 24</a></li><li><a href="#day-2">Hours 24 to 48</a></li><li><a href="#day-3">Hours 48 to 72</a></li><li><a href="#not-yet">Don&#x27;t do this yet</a></li><li><a href="#hr">Questions for HR</a></li><li><a href="#sources">Sources</a></li>
</ul>
<p>Want the longer explanation of each topic? Read my guide <a href="/guides/laid-off/">Laid off? Here&#x27;s what to do this week</a>. This page is the short, printable version.</p>
</div></div></section>

<section class="sec" id="hour-0" data-mile style="--a:#FAEEE0;--b:#F7E2C4"><div class="wrap k-wide"><div class="prose" data-reveal>
''' + when('Hour 0 to 1') + r'''
<h2><span class="pw">Hour 0 to 1: </span>Before you leave the meeting</h2>
<ul class="ck">
<li><b>Don&#x27;t sign anything today.</b> Ask for a copy of any severance agreement to take home. If you&#x27;re 40 or older and it asks you to give up age discrimination claims, the law gives you at least 21 days to consider it (45 in a group layoff).{{eeoc}}</li>
<li><b>Ask the HR questions</b> in the <a href="#hr">list below</a>. Write down the answers, who gave them, and the date.</li>
<li><b>Ask when your health coverage ends.</b> Get the date in writing if you can. Your COBRA and marketplace windows count from around then.{{dol-faq}}{{hc-sep}}</li>
<li><b>Save your own records.</b> Your recent pay stubs, your benefits summary and your contacts with coworkers you trust. Leave company files alone.</li>
<li><b>Breathe.</b> Nothing on this list has to happen in the next hour except not signing.</li>
</ul>
</div></div></section>

<section class="sec" id="day-1" data-mile style="--a:#F7E2C4;--b:#F4D0A2"><div class="wrap k-wide"><div class="prose" data-reveal>
''' + when('Hours 1 to 24') + r'''
<h2><span class="pw">Hours 1 to 24: </span>File for unemployment</h2>
<p>File in the state where you worked. Here is what each state asks for and what happens next.</p>
<!-- REMOVE OR REWORD AFTER NY SYSTEM RELAUNCH (~Nov 14, 2026) -->
<div class="alert" role="note"><b>New York system upgrade:</b> New York&#x27;s unemployment system goes offline at 5 p.m. on Monday, November 2, 2026, for an upgrade expected to take 9 to 12 days. Filing and certifying, online and by phone, pause during that time. The deadline to file or certify before it is 5 p.m. that Monday. Payments will be delayed, but New York says you&#x27;ll get everything you&#x27;re owed once you file or certify in the new system.{{ny-upgrade}}</div>
</div>
<div class="states" data-reveal>
<div class="state"><h3>New Jersey <span>NJ</span></h3><ul class="ck">
<li><b>Where:</b> online at <a href="https://myunemployment.nj.gov/">myunemployment.nj.gov</a>.{{nj-apply}}</li>
<li><b>When:</b> as soon as you&#x27;re out of work, but not before. Your claim doesn&#x27;t begin until you file, and it starts on the Sunday of the week you file.{{nj-pr94}}</li>
<li><b>Have ready:</b> your Social Security number; your NJ driver&#x27;s license or non-driver ID number; your Alien Registration Number if you&#x27;re not a U.S. citizen; for every employer in the last 18 months, its name, address and phone, your job, your start and end dates and why you left; the amount and length of any separation pay; any pension or 401(k) payments; and your bank account and routing numbers for direct deposit.{{nj-info}}</li>
<li><b>First payment request:</b> you certify for the first time on a Wednesday, 17 days after your claim date.{{nj-pr94}}</li>
<li><b>Every week after:</b> certify online each week, or every 2 weeks if you certify by phone. You can only certify after the week has ended.{{nj-pr94}}{{nj-cert}}</li>
<li><b>How much:</b> up to $905 a week in 2026. To qualify, you need at least $310 a week for 20 weeks in your base year, or $15,500 total if you don&#x27;t have 20 such weeks.{{nj-rates}}</li>
<li><b>Severance:</b> NJ says to file right away even if you&#x27;re getting severance. If your claim shows it may affect benefits, they&#x27;ll schedule an appointment to talk it through.{{nj-pr94}} Pay in lieu of notice is different: you can&#x27;t collect for a week it covers.{{nj-eafaq}}</li>
<li><b>Look for work:</b> while you collect, you need to be actively looking for work.{{nj-apply}}</li>
</ul></div>
<div class="state"><h3>New York <span>NY</span></h3><ul class="ck">
<li><b>Where:</b> online at <a href="https://unemployment.labor.ny.gov/login">unemployment.labor.ny.gov</a> with your NY.gov account,{{ny-apply}} or by phone at 1-888-209-8124 if you don&#x27;t have a computer.{{ny-flyer}}</li>
<li><b>When:</b> apply the first week you lose your job.{{ny-apply}}</li>
<li><b>Have ready:</b> your Social Security number; your driver license, ID card or Alien Registration Number; your mailing address and ZIP code; a phone number; a list of your employers from the past 18 months with the employer information from your W-2; and your bank details for direct deposit.{{ny-apply}}</li>
<li><b>Waiting week:</b> by law, you serve one unpaid waiting week before any benefits are paid.{{ny-flyer}} You still have to claim that week.{{ny-cert}}</li>
<li><b>Every week:</b> certify weekly. A week runs Monday to Sunday, and you claim it from that Sunday through the following Saturday.{{ny-when}}</li>
<li><b>How much:</b> up to $869 a week, the maximum since October 6, 2025,{{ny-mbr}} for up to 26 weeks.{{ny-flyer}}</li>
<li><b>Severance:</b> if it&#x27;s paid within 30 days of your last day and is more than the maximum weekly benefit, you aren&#x27;t eligible while it lasts. If it&#x27;s equal to or less than the maximum, you may still be eligible. If severance starts within 30 days, call the Telephone Claims Center right away. WARN Act pay doesn&#x27;t count as severance.{{ny-sev}} Either way, file anyway and let NY decide. If you&#x27;re still out of work when your severance ends, file then, or file again if you already did.{{ny-p825}}</li>
<li><b>Look for work:</b> complete and record at least three work search activities each week.{{ny-ws}}</li>
</ul></div>
</div>
<div class="prose" data-reveal><p><b>Then:</b> put your certification day on your calendar with a reminder. Missing it is the easiest way to delay a payment.</p></div>
</div></section>

<section class="sec" id="day-2" data-mile style="--a:#F4D0A2;--b:#F0BC7E"><div class="wrap k-wide"><div class="prose" data-reveal>
''' + when('Hours 24 to 48') + r'''
<h2><span class="pw">Hours 24 to 48: </span>Health coverage and your severance</h2>
<h3>COBRA or the marketplace?</h3>
<p>You can keep your job&#x27;s plan through COBRA or buy your own through <a href="https://www.nj.gov/getcoverednj/">Get Covered New Jersey</a>{{gcnj}} or <a href="https://nystateofhealth.ny.gov/">NY State of Health</a>.{{nysoh}} Price both before you choose.</p>
<div class="tw stack" role="region" aria-label="COBRA compared with the marketplace" tabindex="0"><table class="cmp"><thead><tr><th scope="col">&nbsp;</th><th scope="col">COBRA</th><th scope="col">Marketplace plan</th></tr></thead><tbody>
<tr><th scope="row">Who it covers</th><td data-label="COBRA">Generally, group plans of private employers with at least 20 employees.{{dol-guide}} Smaller employer? NJ and NY have state continuation for insured plans. In NJ it covers employers with 50 or fewer employees.{{nj-dobi}} In NY it covers small and large employers.{{ny-dfs}}</td><td data-label="Marketplace plan">Losing job-based coverage qualifies you for a Special Enrollment Period.{{gcnj}}</td></tr>
<tr><th scope="row">Deadline</th><td data-label="COBRA">At least 60 days to elect,{{dol-guide}} counted from the later of the day coverage ends or the day your election notice is given or mailed to you.{{dol-faq}}</td><td data-label="Marketplace plan">Up to 60 days before or 60 days after you lose coverage.{{hc-sep}} Get Covered NJ and NY State of Health give 60 days to report the change.{{gcnj-sep}}{{nysoh-sep}}</td></tr>
<tr><th scope="row">Cost</th><td data-label="COBRA">You usually pay the full premium, including the part your employer paid,{{dol-faq}} up to 102% of the plan&#x27;s cost.{{dol-guide}}</td><td data-label="Marketplace plan">May cost less than COBRA, especially if you qualify for savings based on your income.{{hc-cobra}}</td></tr>
<tr><th scope="row">How long</th><td data-label="COBRA">18 months under federal law after a job ends, unless it ended for gross misconduct.{{dol-guide}} NJ state continuation lasts the same 18 months.{{nj-dobi}} In NY, insured plans can continue up to 36 months in total. Self-funded plans don&#x27;t get the NY extension.{{ny-dfs}}</td><td data-label="Marketplace plan">Open enrollment for 2027 runs November 1 to January 31 in both NJ and NY.{{gcnj}}{{nysoh-oe}}</td></tr>
<tr><th scope="row">Start date</th><td data-label="COBRA">Retroactive to the day you lost your plan, once you elect.{{dol-faq}} You have at least 45 days after electing to make the first payment.{{dol-guide}}</td><td data-label="Marketplace plan">In NJ, coverage starts the first day of the month after you enroll.{{gcnj-sep}} In NY, enroll by December 15, 2026, for coverage starting January 1, 2027.{{nysoh-oe}}</td></tr>
</tbody></table></div>
<ul class="ck">
<li><b>Watch your mail for the COBRA notice.</b> Your employer must tell the plan within 30 days, and the plan must send your election notice within 14 days after that.{{dol-guide}}</li>
<li><b>Know the trap:</b> dropping COBRA on your own, or stopping payments, doesn&#x27;t open a Special Enrollment Period.{{hc-cobra}}{{gcnj-sep}} The exception is open enrollment: from November 1 to January 31 (for 2027 coverage in NJ and NY), you can switch from COBRA to a marketplace plan for any reason.{{hc-cobra}}{{gcnj}}{{nysoh-oe}} Choosing COBRA first doesn&#x27;t block the marketplace later if you qualify for a new special enrollment.{{dol-faq}}</li>
</ul>
<h3 id="severance">Before you sign a severance agreement</h3>
<ul class="ck">
<li><b>Read it at home, not in the meeting.</b> A day or two to think is normal.</li>
<li><b>40 or older?</b> If it asks you to give up age discrimination claims, the agreement must name the Age Discrimination in Employment Act, advise you in writing to talk to a lawyer, give you at least 21 days to consider it (45 days in a group layoff), and give you 7 days to revoke after you sign. In a group layoff, it must also list the job titles and ages of the people who were eligible for the program, and the ages of people in the same job groups who weren&#x27;t.{{eeoc}}</li>
<li><b>You can sign early,</b> but only if it&#x27;s truly your choice. Your employer can&#x27;t push you with a threat to change the offer or with better terms for early signers.{{eeoc}}</li>
<li><b>Your right to file a charge stays.</b> Even after you sign, no agreement can take away your right to file a charge with the EEOC or to testify.{{eeoc}}</li>
<li><b>Get it reviewed.</b> The EEOC suggests considering a lawyer&#x27;s review, and making that appointment promptly instead of waiting until the deadline.{{eeoc}}</li>
<li><b>Ask how it&#x27;s paid.</b> A lump sum, salary continuation or pay in lieu of notice can change your unemployment, so check the severance lines in the state section above.{{nj-eafaq}}{{ny-sev}}</li>
<li><b>Look for the strings.</b> What claims are you giving up? Is there a non-compete, a non-disparagement clause or a confidentiality clause? Does it say what your employer will tell reference checkers? Mark anything you don&#x27;t understand for the lawyer.</li>
</ul>
</div></div></section>

<section class="sec" id="day-3" data-mile style="--a:#F0BC7E;--b:#EDB06C"><div class="wrap k-wide"><div class="prose" data-reveal>
''' + when('Hours 48 to 72') + r'''
<h2><span class="pw">Hours 48 to 72: </span>Final pay, then a gentle start on the search</h2>
<div class="k-cols">
<div class="k-box"><h3>Final pay and time off</h3><ul class="ck">
<li><b>NJ final paycheck:</b> your employer may wait until the next regular payday for that pay period.{{nj-wh}}</li>
<li><b>NY final paycheck:</b> due no later than the payday your next pay would have been due.{{ny-pay}}</li>
<li><b>Unused vacation or PTO:</b> mostly comes down to your employer&#x27;s written policy or agreement. NJ doesn&#x27;t require vacation pay, but if an employer offers it, the benefit must follow its established policy.{{nj-wh}} In NY, if your employer promised vacation pay and didn&#x27;t pay what you earned, you can file a claim; employers must share their vacation policy in writing or by posting it.{{ny-supp}}</li>
<li><b>NY sick leave:</b> the state paid sick leave law doesn&#x27;t require paying out unused sick leave when a job ends, unless another agreement or your employer&#x27;s written policy does.{{ny-psl}}</li>
<li><b>Check the stub</b> on payday: hours, any commissions or bonus you were promised, and any PTO payout your policy allows.</li>
</ul></div>
<div class="k-box"><h3>A 72-hour job search starter</h3><ul class="ck">
<li><b>Write down your wins</b> from this job while they&#x27;re fresh: numbers, projects, who you helped. <a href="/guides/numbers-on-your-resume/">Turn them into resume lines.</a></li>
<li><b>Start a simple log</b> of every job you apply to and every contact you make. It doubles as your work search record for unemployment.{{ny-ws}}{{nj-apply}}</li>
<li><b>Tell five people you trust</b> that you&#x27;re looking. <a href="/free/follow-up-scripts/#referral">Here&#x27;s a referral note you can copy.</a></li>
<li><b>Know your number</b> before anyone asks. Look it up in the <a href="/pay/">pay lookup</a>.</li>
<li><b>Use the free help</b> your state offers. <a href="/guides/free-career-help/">Here&#x27;s what&#x27;s available in NJ and NY.</a></li>
<li><b>Watch for scams</b> aimed at people who just lost a job. <a href="/guides/fake-job-postings/">The warning signs.</a></li>
</ul></div>
</div>
</div></div></section>

<section class="sec" id="not-yet" data-mile style="--a:#EDB06C;--b:#E9A45C"><div class="wrap k-wide"><div class="prose" data-reveal>
<h2>Don&#x27;t do this yet</h2>
<ol class="dont">
<li><b>Don&#x27;t sign the severance agreement in the room.</b> Take it home. If you&#x27;re 40 or older, you have at least 21 days by law, and 45 in a group layoff.{{eeoc}}</li>
<li><b>Don&#x27;t wait to file for unemployment</b> &quot;until things settle.&quot; In NJ, your claim doesn&#x27;t begin until you file.{{nj-pr94}}</li>
<li><b>Don&#x27;t cash out your 401(k).</b> If the money is paid to you, the plan withholds 20%, and you have 60 days to roll it over. Not rolling it over can mean extra tax, including a possible 10% additional tax unless an exception applies. A direct rollover has nothing withheld.{{irs-roll}}</li>
<li><b>Don&#x27;t drop COBRA or skip a payment</b> without another plan lined up. Doing that on your own doesn&#x27;t open a Special Enrollment Period.{{hc-cobra}}{{gcnj-sep}} The exception: during open enrollment, November 1 to January 31 for 2027 coverage in NJ and NY, you can switch to a marketplace plan for any reason.{{hc-cobra}}{{gcnj}}{{nysoh-oe}}</li>
<li><b>Don&#x27;t rush the COBRA decision on day one.</b> You have at least 60 days, and if you elect, coverage reaches back to the day you lost your plan. You pay the premiums back to that date too.{{dol-guide}}{{dol-faq}}</li>
<li><b>Don&#x27;t post about the layoff while you&#x27;re angry.</b> Future employers read public posts.</li>
<li><b>Don&#x27;t pay anyone who promises you a job.</b></li>
</ol>
</div></div></section>

<section class="sec" id="hr" data-mile style="--a:#E9A45C;--b:#E9A45C"><div class="wrap k-wide"><div class="prose" data-reveal>
<h2>Questions to ask HR</h2>
<p>Print this list or keep it open on your phone. Ask for anything important in writing.</p>
<ol class="hrq">
<li>What is my official last day, and when and how will I get my final paycheck?<span class="ans" aria-hidden="true"></span></li>
<li>Will my unused vacation or PTO be paid out? Can I have a copy of the written policy?<span class="ans" aria-hidden="true"></span></li>
<li>What day does my health, dental and vision coverage end? When will the COBRA election notice be sent?<span class="ans" aria-hidden="true"></span></li>
<li>Is severance offered? How much, and is it a lump sum or paid out over time? When is it paid?<span class="ans" aria-hidden="true"></span></li>
<li>How long do I have to review the agreement? If this is a group layoff and I&#x27;m 40 or older, where is the list of job titles and ages?<span class="ans" aria-hidden="true"></span></li>
<li>Is this a mass layoff under NJ&#x27;s WARN law? Does my severance include the mandatory amount? (In a covered NJ mass layoff, that&#x27;s one week of pay per full year you worked.{{nj-warn}})<span class="ans" aria-hidden="true"></span></li>
<li>What happens to my 401(k), any unvested company match, and my HSA or FSA balance?<span class="ans" aria-hidden="true"></span></li>
<li>Can I convert or keep my life or disability insurance?<span class="ans" aria-hidden="true"></span></li>
<li>Are any bonus or commission payments still owed to me? When?<span class="ans" aria-hidden="true"></span></li>
<li>What will the company tell employers who call for a reference? Can I get a letter confirming my dates and that this was a layoff?<span class="ans" aria-hidden="true"></span></li>
<li>Who do I contact with questions after today?<span class="ans" aria-hidden="true"></span></li>
</ol>
</div></div></section>
'''

def kit_sources_and_refs(body):
    order, counts = [], {}
    def rep(m):
        k = m.group(1)
        if k not in SOURCES: raise SystemExit('unknown source ' + k)
        if k not in order: order.append(k)
        n = order.index(k) + 1
        counts[k] = counts.get(k, 0) + 1
        rid = f'r{n}' if counts[k] == 1 else f'r{n}-{counts[k]}'
        return f'<sup class="fn"><a href="#s{n}" id="{rid}" aria-label="Source {n}">{n}</a></sup>'
    body = re.sub(r'\{\{([a-z0-9-]+)\}\}', rep, body)
    body = body.replace('</a></sup><sup class="fn">', '</a></sup><sup class="fn-c" aria-hidden="true">,</sup><sup class="fn">')
    items = ''.join(f'<li id="s{i+1}">{SOURCES[k][0]}: <a href="{SOURCES[k][1]}">{SOURCES[k][1]}</a> <a class="back" href="#r{i+1}" aria-label="Back to the first mention of source {i+1}">Back</a></li>' for i, k in enumerate(order))
    unused = [k for k in SOURCES if k not in order]
    if unused: print('unused sources:', unused)
    return body, items, order

def build_kit():
    body, items, order = kit_sources_and_refs(KIT_BODY)
    src = (f'<section class="sec dark" id="sources" data-mile style="--a:#0F5F66;--b:#0B4A52">{HILLTOP}<div class="wrap k-wide"><div class="prose">'
           f'<h2>Sources</h2><p>Every rule, deadline, amount and official web address above links to one of these. Last checked: October 31, 2026. Rules and amounts change, so check the source before you act on a deadline. General information, not legal or financial advice.</p>'
           f'<ol class="srcs">{items}</ol></div></div></section>\n')
    title = 'Laid Off in NJ or NY: Your First 72 Hours · Steady Path'
    desc = 'A free, printable checklist for your first 72 hours after a layoff in New Jersey or New York: unemployment, severance, COBRA or the marketplace, final pay and a job search starter.'
    ld = ('{"@context": "https://schema.org", "@type": "Article", "headline": "Laid Off in NJ or NY: Your First 72 Hours", "description": ' + '"' + desc + '"' +
          ', "author": {"@type": "Person", "name": "Sherif Mehanni"}, "publisher": {"@type": "Organization", "name": "Steady Path Careers", "url": "https://steadypathcareers.com/"}, "dateModified": "2026-10-31", "mainEntityOfPage": "https://steadypathcareers.com/free/laid-off-72-hours/", "image": "https://steadypathcareers.com/img/og/free.png", "isAccessibleForFree": true}')
    out = head('/free/laid-off-72-hours/', title, desc, 'free.png', 'Free tools from Steady Path Careers', KIT_CSS, ld)
    out += phero('/free/', 'Free kit: Just laid off', 'Laid off in NJ or NY: your first 72 hours',
                 'A printable checklist, hour by hour. Start at the top, do what&#x27;s in front of you, and leave the rest for tomorrow.',
                 '<a class="btn gold" data-cta href="#hour-0">Start with hour 0</a><button type="button" class="btn line" data-print hidden>Print or save as PDF</button>', KIT_ART)
    out += '<main id="main" class="trail-main" data-trail>\n' + body + src + finale(OFFER_H, OFFER_P) + '</main>\n'
    out += FOOT.replace('</footer>\n', '</footer>\n<script>(function(){var b=document.querySelector("[data-print]");if(!b||!window.print)return;b.hidden=false;b.addEventListener("click",function(){window.print();});})();</script>\n', 1)
    out += '</body>\n</html>\n'
    return out, order

# ---------------------------------------------------------------- 2. follow-up scripts
SCRIPTS = [
 ('apply', 'Follow-up 7 days after applying', 'About 7 days after you apply, if you haven&#x27;t heard anything. Send it to the recruiter or the hiring manager if you can find their name.',
  'Subject: Following up on my application for [Job title]\n\nHi [Name],\n\nI applied for the [Job title] role with [Company] last week and wanted to say I am still very interested. [One line on a result that fits the job, like "In my last role I cut billing errors by a third."]\n\nI would welcome the chance to talk about how I can help. Thank you for your time.\n\n[Your name]\n[Phone] | [LinkedIn link]',
  'It&#x27;s short, it names the exact role so they can find you fast, and the one result gives them a reason to pull your application.'),
 ('nudge', 'Nudge 5 business days after an interview', 'Five business days after the interview with no word, or the day after the date they said they&#x27;d decide.',
  'Subject: Checking in on [Job title]\n\nHi [Name],\n\nI hope your week is going well. I wanted to check in on the [Job title] role. I enjoyed our conversation on [day] about [something you discussed], and I am still very interested.\n\nIs there an update on timing, or anything else I can send you?\n\nThank you,\n[Your name]',
  'A question about timing is easy to answer in one line, and the detail from your talk reminds them which candidate you are.'),
 ('ghosted', 'Closing the loop after being ghosted', 'After two follow-ups with no reply, usually two to three weeks after your last contact.',
  'Subject: Closing the loop on [Job title]\n\nHi [Name],\n\nI have followed up a couple of times about the [Job title] role and haven&#x27;t heard back, so I will assume the team has gone another way. I know how busy hiring gets.\n\nThank you for the time you spent with me. If anything changes, or another role opens that fits my background, I would be glad to hear from you.\n\nBest,\n[Your name]',
  'It gives them one easy last chance to reply, leaves the door open for the next opening, and lets you move on without guessing.'),
 ('thanks', 'Same-day thank-you after an interview', 'The same day, within a few hours. Send a separate note to each person who interviewed you.',
  'Subject: Thank you for today\n\nHi [Name],\n\nThank you for taking the time to talk with me about the [Job title] role at [Company]. I enjoyed learning more about the team and the work, and I am even more interested in the job.\n\n[One sentence linking something they said to something you have done.]\n\nI would welcome the next step. Please let me know if there is anything else I can send you.\n\nThank you again,\n[Your name]',
  'Many candidates skip it or send it days later. One specific sentence shows you listened, and it keeps you in mind while they compare notes.'),
 ('posted-pay', '&quot;The posting said X, the offer is Y&quot;', 'After you get the written offer and before you accept, if the pay is below the posted range or at its very bottom.',
  'Subject: Question about the offer for [Job title]\n\nHi [Name],\n\nThank you for the offer. I am excited about the [Job title] role and the team.\n\nI want to ask about one thing before I decide. The job posting listed a pay range of [posted range], and the offer is [offered amount]. Could you help me understand how that number was set? Given [the skill or experience from the posting that you bring], I was expecting an offer closer to [your number].\n\nI am glad to talk it through by phone if that is easier.\n\nThank you,\n[Your name]',
  'You point to the employer&#x27;s own number and ask a question instead of making an accusation, which makes it easy for them to fix.'),
 ('counter', 'Counter-offer', 'After the written offer and before you accept. It also works as a follow-up to a phone conversation about pay.',
  'Subject: [Job title] offer\n\nHi [Name],\n\nThank you again for the offer. I am excited about joining [Company], and I want to make this work.\n\nBased on [the scope of the role / my experience with X / pay for similar roles in this area], I am asking for a base salary of [your number]. If we can get there, I am ready to accept by [date].\n\nIf the base salary has no room, I would be open to talking about [a signing bonus / a pay review at 6 months / extra time off / a remote day each week].\n\nThank you for considering it,\n[Your name]',
  'One clear number, one reason and a promise to say yes give the hiring manager something concrete to take to whoever approves pay.'),
 ('decline', 'Polite decline', 'As soon as you&#x27;ve made up your mind, ideally within a day or two.',
  'Subject: [Job title] offer\n\nHi [Name],\n\nThank you for the offer and for the time you and the team spent with me. After a lot of thought, I have decided to decline. [Optional: I have accepted a role that is a closer fit for what I need right now.]\n\nI enjoyed meeting everyone and would be glad to stay in touch. I hope our paths cross again.\n\nBest,\n[Your name]',
  'A quick, warm no lets them move to their next candidate and keeps you on good terms for future openings.'),
 ('referral', 'Asking a former coworker for a referral', 'Before you apply, if you can, so your application arrives with their name on it.',
  'Subject: Quick favor? [Company] referral\n\nHi [Name],\n\nI hope you are doing well. It has been a while since we worked together on [project] at [Old company].\n\nI am looking for my next role, and I saw that [Company] is hiring for a [Job title]: [link to posting]. It looks like a strong fit because [one or two reasons].\n\nWould you be comfortable referring me, or pointing me to the hiring manager? I have attached my resume and can send a short blurb you can forward. No pressure at all if the timing is not right.\n\nThanks so much,\n[Your name]',
  'It reminds them how they know you, makes the ask specific, does the writing for them and gives them an easy way out.'),
]

SCR_CSS = BASE_CSS + r'''
.scr-intro { max-width: 720px; }
.scr-intro p { font-size: 18px; line-height: 1.6; }
.scr-toc { list-style: none; padding: 0; margin: 18px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; counter-reset: t; }
.scr-toc li { counter-increment: t; }
.scr-toc a { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 14px; background: #fff; border: 1px solid rgba(31,58,95,.16); border-radius: 12px; font-weight: 800; color: var(--midnight); text-decoration: none; font-size: 16px; }
.scr-toc a::before { content: counter(t); display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--gold); color: var(--midnight); font-size: 14px; }
.scr-toc a:hover { border-color: var(--gold); }
.scripts { list-style: none; padding: 0; margin: 0; display: grid; gap: 22px; counter-reset: s; }
.script { counter-increment: s; background: #fff; border: 1px solid rgba(31,58,95,.14); border-radius: 20px; padding: 24px; scroll-margin-top: 16px; }
.script h2 { display: flex; align-items: flex-start; gap: 12px; font-size: clamp(22px, 2.6vw, 28px); margin: 0 0 12px; }
.script h2::before { content: counter(s); display: grid; place-items: center; flex: none; width: 38px; height: 38px; border-radius: 50%; background: var(--midnight); color: var(--dawn); font-size: 18px; margin-top: -2px; }
.script .lbl { display: block; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #6f5300; margin: 0 0 4px; }
.script .wh { margin: 0 0 14px; font-size: 17px; line-height: 1.55; color: var(--ink); }
.script .txt { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 500 17px/1.6 var(--display); color: var(--ink); background: var(--cream); border: 1px solid rgba(31,58,95,.12); border-left: 5px solid var(--gold); border-radius: 12px; padding: 16px 18px; }
.script .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 14px 0 0; }
.copy { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; min-width: 120px; padding: 10px 20px; border-radius: 12px; border: 2px solid var(--midnight); background: var(--midnight); color: var(--cream); font-weight: 800; font-size: 16px; }
.copy:hover { background: var(--navy); border-color: var(--navy); }
.copy svg { width: 20px; height: 20px; flex: none; }
.copy.done { background: var(--ok); border-color: var(--ok); }
.copy[hidden] { display: none; }
.script .subj { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; margin: 0 0 14px; }
.script .stxt { flex: 1 1 260px; margin: 0; overflow-wrap: anywhere; font: 600 17px/1.5 var(--display); color: var(--ink); background: var(--cream); border: 1px solid rgba(31,58,95,.12); border-left: 5px solid var(--gold); border-radius: 12px; padding: 10px 16px; }
.copy.sm { min-height: 44px; padding: 8px 16px; font-size: 15px; background: #fff; color: var(--midnight); }
.copy.sm:hover { background: var(--sunk); border-color: var(--midnight); }
.copy.sm.done { color: #fff; }
.script .why { margin: 16px 0 0; font-size: 16px; line-height: 1.55; color: var(--ink2); }
.script .why b { color: var(--midnight); }
.script .more { font-size: 16px; margin: 10px 0 0; }
.fx-tips { max-width: 720px; }
.fx-tips li { font-size: 18px; line-height: 1.6; }
@media (max-width: 760px) { .scr-toc { grid-template-columns: minmax(0, 1fr); } .script { padding: 18px 16px; border-radius: 16px; } .script .txt { font-size: 16px; padding: 14px; } }
@media (prefers-reduced-motion: no-preference) { .copy { transition: background-color .15s, border-color .15s; } }
@media print {
  .copy, .scr-toc { display: none !important; }
  .script { break-inside: avoid; border: 1px solid #999; padding: 12px; }
  .script .txt, .script .stxt { background: #fff !important; font-size: 10.5pt; }
}
'''

COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8" y="8" width="12" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 16V5a2 2 0 0 1 2-2h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

COPY_JS = r'''<script>
/* Copy buttons: clipboard first; if that is blocked, select the text so the person can copy it by hand. Results are announced in #copy-status. */
(function () {
  var d = document, st = d.getElementById('copy-status');
  var bs = d.querySelectorAll('[data-copy-for]'); for (var i = 0; i < bs.length; i++) bs[i].hidden = false;
  function say(m) { if (!st) return; st.textContent = ''; setTimeout(function () { st.textContent = m; }, 30); }
  function select(el) {
    try { var r = d.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); return true; } catch (e) { return false; }
  }
  function done(b) {
    var l = b.querySelector('span'); b.classList.add('done'); l.textContent = 'Copied'; say('Copied');
    clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('done'); l.textContent = b.getAttribute('data-label') || 'Copy'; }, 2500);
  }
  function fallback(el) {
    if (select(el)) say('Copy did not work here. The text is selected, so press Control C, or Command C on a Mac, to copy it.');
    else say('Copy did not work here. Select the text and copy it by hand.');
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copy-for]') : null; if (!b) return;
    var el = d.getElementById(b.getAttribute('data-copy-for')); if (!el) return;
    var t = el.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(t).then(function () { done(b); }, function () { fallback(el); });
    } else {
      var ok = false;
      if (select(el)) { try { ok = d.execCommand('copy'); } catch (x) { ok = false; } }
      if (ok) done(b); else fallback(el);
    }
  });
})();
</script>
'''

SCR_ART = ('<svg class="hero-svg" viewBox="0 0 320 240" aria-hidden="true" focusable="false" data-live><g transform="translate(160 128)"><g class="rise">'
  '<rect x="-110" y="-70" width="220" height="146" rx="16" fill="#fff" stroke="#1F3A5F" stroke-opacity=".2" stroke-width="2"/>'
  '<path d="M-104 -62 L0 14 L104 -62" fill="none" stroke="#1F3A5F" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>'
  '<path class="draw d2" pathLength="1" d="M-80 48 H20" stroke="#C9A227" stroke-width="8" stroke-linecap="round"/></g></g>'
  '<g transform="translate(250 64)"><g class="pop d3"><circle r="30" fill="#1F3A5F"/><path d="M-12 0 l8 8 l16 -16" stroke="#F2D98A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>'
  + SPARK(52, 50, 1, '#C9A227') + SPARK(286, 190, .8, '#C9A227', 'd2') + SPARK(34, 200, .8, '#1F3A5F', 'd3') + '</svg>')

def build_scripts():
    toc = ''.join(f'<li><a href="#{k}">{t}</a></li>' for k, t, *_ in SCRIPTS)
    cards = ''
    for k, t, wh, txt, why in SCRIPTS:
        subj, body = txt.split('\n\n', 1)
        assert subj.startswith('Subject: '); subj = subj[len('Subject: '):]
        more = ''
        if k == 'posted-pay': more = '<p class="more">Not sure what NJ and NY say about pay ranges in postings? <a href="/guides/pay-transparency/">Read my guide.</a></p>'
        if k == 'counter': more = '<p class="more">Need a number to ask for? Start with the <a href="/pay/">pay lookup</a>.</p>'
        cards += (f'<li class="script" id="{k}"><h2 id="{k}-h">{t}</h2>'
                  f'<p class="lbl">When to send</p><p class="wh">{wh}</p>'
                  f'<p class="lbl" id="{k}-sl">Subject line</p><div class="subj"><p class="stxt" id="{k}-s">{subj}</p>'
                  f'<button type="button" class="copy sm" data-copy-for="{k}-s" data-label="Copy subject" aria-describedby="{k}-h" hidden>{COPY_ICON}<span>Copy subject</span></button></div>'
                  f'<p class="lbl" id="{k}-l">The email</p><pre class="txt" id="{k}-t" aria-labelledby="{k}-h {k}-l">{body}</pre>'
                  f'<div class="row"><button type="button" class="copy" data-copy-for="{k}-t" data-label="Copy email" aria-describedby="{k}-h" hidden>{COPY_ICON}<span>Copy email</span></button></div>'
                  f'<p class="why"><b>Why it works:</b> {why}</p>{more}</li>')
    title = 'Emails for Every Step of the Search: 8 Free Job Search Scripts · Steady Path'
    desc = 'Eight free, copy-ready emails for your job search: follow-ups, thank-you notes, offer questions, a counter-offer, a polite decline and a referral ask.'
    ld = '{"@context": "https://schema.org", "@type": "Article", "headline": "Emails for Every Step of the Search", "description": "' + desc + '", "author": {"@type": "Person", "name": "Sherif Mehanni"}, "publisher": {"@type": "Organization", "name": "Steady Path Careers", "url": "https://steadypathcareers.com/"}, "dateModified": "2026-10-31", "mainEntityOfPage": "https://steadypathcareers.com/free/follow-up-scripts/", "image": "https://steadypathcareers.com/img/og/free.png", "isAccessibleForFree": true}'
    out = head('/free/follow-up-scripts/', title, desc, 'free.png', 'Free tools from Steady Path Careers', SCR_CSS, ld)
    out += phero('/free/', 'Free scripts', 'Emails for every step of the search',
                 'Eight short, copy-ready notes for the moments that matter in a job search. Fill in the brackets, read it once out loud, and send.',
                 '<a class="btn gold" data-cta href="#scripts">See the scripts</a><a class="btn line" href="/free/">All free tools</a>', SCR_ART)
    out += '<main id="main" class="trail-main" data-trail>\n'
    out += ('<section class="sec" id="scripts" data-mile style="--a:#FBE3CF;--b:#F7E2C4"><div class="wrap"><div class="scr-intro">'
            '<p>Anything in brackets, like [Company] or [Your name], is yours to fill in. Keep the rest short. Every note here fits on a phone screen, and that&#x27;s on purpose.</p>'
            f'<ol class="scr-toc" aria-label="The eight scripts">{toc}</ol></div></div></section>\n')
    out += f'<section class="sec" data-mile style="--a:#F7E2C4;--b:#EDB06C"><div class="wrap"><p id="copy-status" class="vh" role="status" aria-live="polite"></p><ol class="scripts">{cards}</ol></div></section>\n'
    out += ('<section class="sec" data-mile style="--a:#EDB06C;--b:#E9A45C"><div class="wrap"><div class="fx-tips prose" data-reveal><h2>A few rules that help every script</h2><ul>'
            '<li><b>Use their name</b> and the exact job title from the posting.</li>'
            '<li><b>Send to a person</b> when you can find one, not only a general inbox.</li>'
            '<li><b>One follow-up a week is plenty.</b> After two with no answer, send the closing-the-loop note and put your energy elsewhere.</li>'
            '<li><b>Read it out loud once.</b> If a line sounds stiff, say it the way you would on the phone.</li>'
            '<li><b>Just laid off?</b> Start with the <a href="/free/laid-off-72-hours/">first 72 hours kit</a>.</li>'
            '</ul></div></div></section>\n')
    out += finale(OFFER_H, OFFER_P) + '</main>\n' + FOOT + COPY_JS + '</body>\n</html>\n'
    return out

# ---------------------------------------------------------------- 3. hub
HUB_CSS = BASE_CSS + r'''
.tools { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
.tools > li { display: flex; }
.tool { position: relative; flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 24px; background: #fff; border: 1px solid rgba(31,58,95,.14); border-radius: 18px; color: inherit; text-decoration: none; }
a.tool { transition: transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, border-color .25s; }
a.tool:hover { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 14px 30px rgba(16,33,58,.14); }
.tool .n { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #6f5300; }
.tool h3 { margin: 2px 0 0; font-size: 21px; }
.tool p { margin: 0; color: var(--ink2); font-size: 17px; line-height: 1.5; }
.tool em { margin-top: auto; padding-top: 8px; font-style: normal; font-weight: 800; color: var(--navy); text-decoration: underline; text-underline-offset: 3px; }
.tool.soon { background: rgba(255,255,255,.72); border-style: dashed; border-color: rgba(31,58,95,.35); }
.tool .badge { align-self: flex-start; margin-top: auto; padding: 5px 12px; border-radius: 999px; background: var(--midnight); color: var(--cream); font-size: 14px; font-weight: 800; }
.tool svg.ic { width: 48px; height: 48px; }
.fx-promise { max-width: 720px; }
.fx-promise li { font-size: 18px; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { a.tool { transition: none; } a.tool:hover { transform: none; } }
@media print { .tool { break-inside: avoid; } }
'''

ICONS = {
 'kit': '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="16" fill="#FBF6EE" stroke="#1F3A5F" stroke-width="2.5"/><path d="M20 10 v10 l7 4" fill="none" stroke="#1F3A5F" stroke-width="3" stroke-linecap="round"/><path d="M20 4 A16 16 0 0 1 36 20" fill="none" stroke="#C9A227" stroke-width="4" stroke-linecap="round"/></svg>',
 'mail': '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="4" y="9" width="32" height="23" rx="4" fill="#fff" stroke="#1F3A5F" stroke-width="2.5"/><path d="M6 11 L20 22 L34 11" fill="none" stroke="#1F3A5F" stroke-width="2.5" stroke-linejoin="round"/><circle cx="33" cy="9" r="6" fill="#C9A227"/></svg>',
 'track': '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect x="5" y="6" width="30" height="28" rx="4" fill="#fff" stroke="#1F3A5F" stroke-width="2.5"/><path d="M11 14h18M11 20h18M11 26h10" stroke="#9AACCD" stroke-width="3" stroke-linecap="round"/><path d="M26 25 l3 3 l6 -7" fill="none" stroke="#C9A227" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'offer': '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M6 10 h20 l8 10 l-8 10 h-20 a3 3 0 0 1 -3 -3 v-14 a3 3 0 0 1 3 -3Z" fill="#C9A227" stroke="#1F3A5F" stroke-width="2.5" stroke-linejoin="round"/><circle cx="27" cy="20" r="2.5" fill="#fff"/><text x="14" y="25" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="14" fill="#10213A">$</text></svg>',
 'ghost': '<svg class="ic" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M9 34 V17 a11 11 0 0 1 22 0 V34 l-4 -3 l-3.5 3 l-3.5 -3 l-3.5 3 l-3.5 -3Z" fill="#fff" stroke="#1F3A5F" stroke-width="2.5" stroke-linejoin="round"/><circle cx="16" cy="18" r="2.2" fill="#1F3A5F"/><circle cx="24" cy="18" r="2.2" fill="#1F3A5F"/></svg>',
}

TOOLS = [
 ('kit', 'Free tool 1', 'Laid off in NJ or NY: your first 72 hours', 'An hour-by-hour checklist for unemployment, severance, health coverage and final pay, with official sources. Prints cleanly.', '/free/laid-off-72-hours/', False),
 ('mail', 'Free tool 2', 'Emails for every step of the search', 'Eight copy-ready scripts: follow-ups, thank-you notes, offer questions, a counter-offer, a decline and a referral ask.', '/free/follow-up-scripts/', False),
 ('track', 'Free tool 3', 'Job Search Tracker', 'Keep every application, its status and your follow-up dates in one place.', '/free/tracker/', True),
 ('offer', 'Free tool 4', 'Offer Check', 'See how an offer compares with typical pay for the job in NJ or NY.', '/pay/#offer', True),
 ('ghost', 'Free tool 5', 'Ghost Job Checker', 'Check whether a posting is still open before you spend time on it.', '/free/ghost-check/', True),
]

HUB_ART = ('<svg class="hero-svg" viewBox="0 0 320 240" aria-hidden="true" focusable="false" data-live>'
  '<g transform="translate(160 132)"><g class="rise">'
  '<rect x="-96" y="-78" width="130" height="160" rx="14" fill="#fff" stroke="#1F3A5F" stroke-opacity=".2" stroke-width="2" transform="rotate(-8)"/>'
  '<rect x="-34" y="-82" width="130" height="160" rx="14" fill="#FBF6EE" stroke="#1F3A5F" stroke-opacity=".25" stroke-width="2" transform="rotate(7)"/>'
  '<g transform="rotate(7)"><path class="draw d2" pathLength="1" d="M-12 -46 H70" stroke="#1F3A5F" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/><path class="draw d3" pathLength="1" d="M-12 -20 H56" stroke="#1F3A5F" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/><path class="draw d4" pathLength="1" d="M-12 6 H64" stroke="#C9A227" stroke-width="8" stroke-linecap="round"/></g>'
  '</g></g><g transform="translate(250 196)"><g class="pop d3"><circle r="30" fill="#1F3A5F"/><path d="M-12 0 l8 8 l16 -16" stroke="#F2D98A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>'
  + SPARK(52, 48, 1, '#C9A227') + SPARK(276, 54, .8, '#C9A227', 'd2') + '</svg>')

def build_hub():
    cards = ''
    for ic, n, t, p, href, soon in TOOLS:
        if soon:
            cards += f'<li><div class="tool soon" data-soon="{href}"><span class="n">{n}</span>{ICONS[ic]}<h3>{t}</h3><p>{p}</p><span class="badge">Coming soon</span></div></li>'
        else:
            cards += f'<li><a class="tool" href="{href}"><span class="n">{n}</span>{ICONS[ic]}<h3>{t}</h3><p>{p}</p><em>Open it</em></a></li>'
    title = 'Free Job Search Tools for NJ and NY · Steady Path Careers'
    desc = 'Free job search tools for New Jersey and New York: a first-72-hours layoff kit, copy-ready follow-up emails and more. No sign-up, no email needed.'
    ld = '{"@context": "https://schema.org", "@type": "CollectionPage", "name": "Free job search tools", "description": "' + desc + '", "url": "https://steadypathcareers.com/free/", "publisher": {"@type": "Organization", "name": "Steady Path Careers", "url": "https://steadypathcareers.com/"}}'
    out = head('/free/', title, desc, 'free.png', 'Free tools from Steady Path Careers: free help for your job search', HUB_CSS, ld)
    out += phero('/free/', 'Free tools', 'Free help for your job search.', 'Checklists, scripts and tools for job seekers in New Jersey and New York. No sign-up and no email needed. Use them, print them, share them.',
                 '<a class="btn gold" data-cta href="#tools">See the tools</a>', HUB_ART)
    out += '<main id="main" class="trail-main" data-trail>\n'
    out += (f'<section class="sec" id="tools" data-mile style="--a:#FBE3CF;--b:#F4D0A2"><div class="wrap"><h2>Pick a tool</h2><p class="lead">Two are ready now. Three more are on the way.</p><ul class="tools">{cards}</ul></div></section>\n')
    out += ('<section class="sec" data-mile style="--a:#F4D0A2;--b:#E9A45C"><div class="wrap"><div class="fx-promise prose" data-reveal><h2>Free means free</h2><ul>'
            '<li>No account, no email address and nothing to fill in to use them.</li>'
            '<li>Each one is written by me, Sherif, for job seekers in NJ and NY.</li>'
            '<li>Where a tool states a rule or a deadline, it links to the official source.</li>'
            '<li>Want more reading? The <a href="/guides/">guides</a> cover pay laws, fake postings and your resume.</li>'
            '</ul></div></div></section>\n')
    out += finale(OFFER_H, OFFER_P) + '</main>\n' + FOOT + '</body>\n</html>\n'
    return out

if __name__ == '__main__':
    kit, order = build_kit()
    for rel, content in [('free/index.html', build_hub()), ('free/laid-off-72-hours/index.html', kit), ('free/follow-up-scripts/index.html', build_scripts())]:
        p = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w', encoding='utf-8').write(content); print('wrote', rel, len(content))
    print('sources used:', len(order))
