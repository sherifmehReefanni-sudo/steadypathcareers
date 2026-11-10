"""Build /level-up/index.html for site r34 from the free-career-help guide's shell.
Run: python3 build_levelup.py /home/claude/spc/site-r34
Content facts and sources: /home/claude/spc/levelup/levelup_facts.md
"""
import re, sys, html

root = sys.argv[1]
tpl = open(root + '/guides/free-career-help/index.html', encoding='utf8').read()

TITLE = 'Level Up: Licenses, Certifications and Training Help in NJ and NY'
DESC = 'Which credentials NJ and NY job postings ask for, what they cost, and how to get training paid for before you spend your own money.'
URL = 'https://steadypathcareers.com/level-up/'

head_end = tpl.index('</head>')
head = tpl[:head_end]
head = head.replace('<title>Free Job Help in NJ and NY: Career Centers and Training</title>', '<title>%s</title>' % TITLE)
head = head.replace('Free Job Help in NJ and NY: Career Centers and Training', TITLE)
head = head.replace('Free career counselors, workshops, job training money and online courses from New Jersey and New York, and how to get them.', DESC)
head = head.replace('https://steadypathcareers.com/guides/free-career-help/', URL)
assert head.count(TITLE) == 3 and head.count(DESC) == 3 and head.count(URL) == 2, (head.count(TITLE), head.count(DESC), head.count(URL))

body_start = tpl.index('<body')
main_start = tpl.index('<main id="main"')
header = tpl[body_start:main_start]
header = header.replace('<a href="/guides/" aria-current="true">Guides</a>', '<a href="/guides/">Guides</a>')
old_copy = re.search(r'<div class="phero-copy">.*?</div></div>', header, re.S).group(0)
new_copy = ('<div class="phero-copy"><p class="kicker">Level Up</p><h1>Qualify for the next job up.</h1>'
            '<p class="sub">Which licenses and certifications the job postings we screen actually ask for, what they cost, '
            'and how to get the training paid for before you spend your own money.</p>'
            '<div class="cta"><a class="btn gold" data-cta href="#short">Start here</a><a class="btn line" href="/guides/free-career-help/">Free help from NJ and NY</a></div></div></div>')
header = header.replace(old_copy, new_copy)

# reuse the template's section illustrations, in order
svgs = re.findall(r'(<svg class="ill[^"]*"[^>]*data-live>.*?</svg>)</div></div></section>', tpl[main_start:], re.S)
assert len(svgs) >= 6, len(svgs)
finale_start = tpl.index('<section class="finale"')
tail = tpl[finale_start:]

bands = [('#FBE3CF', '#FBEFE2'), ('#FBEFE2', '#F9EAD7'), ('#F9EAD7', '#F7E2C4'), ('#F7E2C4', '#F5D7AE'),
         ('#F5D7AE', '#F2C995'), ('#F2C995', '#F0BC7E'), ('#F0BC7E', '#EEB06A')]

def sec(i, inner, sid='', svg=None):
    a, b = bands[i]
    art = svg if svg is not None else svgs[i % len(svgs)]
    return ('<section class="sec"%s data-mile style="--a:%s;--b:%s"><div class="wrap"><div class="gsplit"><div class="prose" data-reveal>%s</div>%s</div></div></section>\n'
            % (' id="%s"' % sid if sid else '', a, b, inner, art))

def table(head_cells, rows, label):
    t = '<div class="tw" tabindex="0" role="region" aria-label="%s"><table class="cmp"><thead><tr>' % label
    t += ''.join('<th>%s</th>' % h for h in head_cells) + '</tr></thead><tbody>\n'
    for r in rows:
        t += '<tr>' + ''.join('<td>%s</td>' % c for c in r) + '</tr>\n'
    return t + '</tbody></table></div>'

S = []
S.append(sec(0, '''<p class="meta">By Steady Path Careers. Last checked November 10, 2026, against official state, licensing and certification pages listed under Sources. Prices and rules change, so confirm with the program before you pay.</p>
<div class="callout"><b>The one rule to remember:</b> talk to your state career center <b>before</b> you sign up or pay for training. New Jersey says that if you enroll in training on your own, you can't have any of the training costs covered. New York ties its training money to a meeting with a career planner and approval first.</div>
<p>A license or certification can open doors, but only if employers near you ask for it. So this page starts with what real postings say, then shows what each credential takes and how to get help paying for it.</p>''', 'short'))

S.append(sec(1, '''<h2>What the postings we screen ask for</h2>
<p>Every day our system reads employer job postings for the roles our clients want. On November 10, 2026, we counted which credentials those postings mention. Here is what we found for insurance account manager and account executive roles in New Jersey, New York and remote:</p>
''' + table(['Credential', 'Postings that mention it', 'Said it was required'], [
    ['Property &amp; Casualty (P&amp;C) license', '80 of 976 (8%)', '43'],
    ["Bachelor's degree", '70 of 976 (7%)', '32'],
    ['Life &amp; Health license', '11 of 976 (1%)', '5'],
    ['CIC (Certified Insurance Counselor)', '6 of 976', '0 (5 said preferred)'],
    ['CPCU', '2 of 976', '0 (2 said preferred)'],
    ['CISR', '2 of 976', '0 (1 said preferred)'],
], 'Table: credentials mentioned in insurance postings. Scroll sideways to see every column.') + '''
<p><b>How to read this:</b> these are postings found in the last 60 days. We only store the first 2,000 characters of each posting, and requirements often come later, so the real numbers are higher. Treat them as a floor. The takeaway is still clear: for insurance sales and service jobs, the P&amp;C license matters most, and designations like CIC are a plus, rarely a must.</p>
<p>We run this count for each client's own job titles. When a job we send you requires a license or certification your resume doesn't show, the job card says so and points back here.</p>'''))

S.append(sec(2, '''<h2>How to get training paid for</h2>
<ol>
<li><b>Book a meeting with your career center first.</b> In New Jersey, that's your local One-Stop Career Center. In New York, it's your local Career Center (in New York City, a Workforce1 Career Center). Do this before you enroll anywhere.</li>
<li><b>Ask about an Individual Training Account (ITA).</b> This is federal WIOA money for eligible adults and laid-off workers. New Jersey's guidance recommends up to $7,500 per account, and local areas can set other limits. The training has to be on the state's approved provider list and lead to an in-demand job.</li>
<li><b>If you're collecting unemployment, ask about training while on benefits.</b> In New Jersey, approved training can come with up to 26 extra weeks of benefits (Additional Benefits During Training). In New York, Section 599 lets you keep benefits while in approved full-time training; it does not pay tuition, and New York says applying within the first 13 weeks of your claim gets you the most from it.</li>
<li><b>Ask your employer.</b> Many employers pay for licenses and courses. Under IRS rules, an employer can give you up to $5,250 a year in education help tax-free.</li>
<li><b>Check free options.</b> SkillUp NJ has free online courses. Our <a href="/guides/free-career-help/">free help guide</a> lists career centers, workshops and online tools in both states.</li>
</ol>'''))

S.append(sec(3, '''<h2>Insurance licenses</h2>
''' + table(['', 'New Jersey (resident)', 'New York (resident)'], [
    ['<b>P&amp;C pre-licensing class</b>', '40 hours (20 property, 20 casualty)', 'At least 90 hours for a P&amp;C broker license (waived with a CPCU or one year of qualifying work)'],
    ['<b>Life &amp; Health class</b>', '40 hours (20 life, 20 health)', 'At least 40 hours'],
    ['<b>Exam</b>', 'PSI', 'PSI'],
    ['<b>License fee</b>', '$170 ($150 license plus $20 application)', '$80'],
    ['<b>Fingerprints</b>', 'Required, $66.05 through IdentoGo', 'Ask NY DFS'],
], 'Table: NJ and NY insurance license requirements. Scroll sideways to see every column.') + '''
<p>Pre-licensing courses online typically run from about $130 to $350, depending on the school and package. Check that the school is approved in your state before you pay. New Jersey publishes its list of approved education providers on the Department of Banking and Insurance site.</p>'''))

S.append(sec(4, '''<h2>Designations and certifications</h2>
''' + table(['Credential', 'What it takes', 'Cost'], [
    ['<b>CIC</b> (insurance)', 'Pass 5 of 7 courses within 5 years. No prerequisites; aimed at people with 2+ years in insurance or a license.', 'PIA NJ lists $445 per course'],
    ['<b>CISR</b> (insurance service)', 'Pass 5 of 9 courses within 3 years. Open to anyone working in insurance.', 'PIA NJ lists $180 per course'],
    ['<b>CPCU</b> (insurance)', '8 courses plus ethics. Most people finish in 18 to 24 months.', 'About $5,600 to $6,000 in total'],
    ['<b>PMP</b> (project management)', '36 months leading projects with a 4-year degree, or 60 months without, plus 35 hours of training.', 'Exam $405 for PMI members, $555 for others'],
    ['<b>Google Career Certificates</b> (IT support, data, project management and more)', 'Self-paced online. Most finish in 3 to 6 months at under 10 hours a week.', '$49 a month on Coursera; free routes through some nonprofits'],
    ['<b>CompTIA A+, Network+, Security+</b> (IT)', 'No required prerequisites. Security+ suggests Network+ and about 2 years of experience first.', 'Check comptia.org; county colleges near you may offer funded prep courses'],
], 'Table: designations and certifications. Scroll sideways to see every column.') + '''
<p>Several county colleges run courses that may qualify for career-center funding. For example, Brookdale Community College in Monmouth County lists a CompTIA Network+ course on New Jersey's training site, marked as possibly eligible for One-Stop funding.</p>'''))

S.append(sec(5, '''<h2>Before you spend money on a credential</h2>
<ul>
<li><b>Check the postings first.</b> If almost no jobs near you ask for it, it may not be worth the time yet.</li>
<li><b>Look for "required" versus "preferred."</b> A required license gets you in the door. A preferred one helps you stand out.</li>
<li><b>Watch for jobs that pay for it.</b> Some employers hire you first and pay for your license within your first months. Our job cards point these out.</li>
<li><b>No credential guarantees a job.</b> It widens the jobs you qualify for. We'll tell you honestly what the postings show.</li>
</ul>
<p>We don't earn money from any school or course on this page.</p>'''))

srcs = [
    ('NJ Department of Labor, training for unemployed job seekers', 'https://www.nj.gov/labor/myunemployment/jobseekers/training/index.shtml'),
    ('NJ Department of Labor, ITA guidance WD-PY25-6, Change 1', 'https://nj.gov/labor/assets/PDFs/WIOA/documents/resources/WD-PY25-6.1%20ITA%20Guidance.pdf'),
    ('NY Department of Labor, ETPL and ITA technical advisory 18-02.4', 'https://dol.ny.gov/ta-18-024'),
    ('NY Department of Labor, Section 599 program', 'https://dol.ny.gov/599-program'),
    ('NYC Workforce1 Career Centers', 'https://www.nyc.gov/es/employment/programs/workforce1'),
    ('NJ DOBI, producer licensing FAQ', 'https://www.nj.gov/dobi/insliced/prodfaqs.htm'),
    ('NJ DOBI, fingerprinting', 'https://www.nj.gov/dobi/insliced/livescan.htm'),
    ('NY DFS, P&amp;C broker license', 'https://www.dfs.ny.gov/apps_and_licensing/agents_and_brokers/lic_app_pc_br'),
    ('NY DFS, Life, Accident and Health license', 'https://www.dfs.ny.gov/apps_and_licensing/agents_and_brokers/lic_app_la_lb'),
    ('CIC program', 'https://www.riskeducation.org/programs/cic/'),
    ('CISR program', 'https://riskeducation.org/cisr'),
    ('PIA NJ course schedule and prices', 'https://pia.org/EDU/schedule.php?state=nj'),
    ('The Institutes, CPCU program overview', 'https://theinstitutes.freshdesk.com/support/solutions/articles/158000434462-cpcu-program-overview-requirements'),
    ('PMI, PMP certification', 'https://www.pmi.org/certifications/project-management-pmp'),
    ('Google Career Certificates', 'https://grow.google/certificates/'),
    ('CompTIA Security+', 'https://www.comptia.org/en-us/certifications/security/v7/'),
    ('IRS, Section 127 educational assistance FAQs', 'https://www.irs.gov/newsroom/irs-updates-frequently-asked-questions-about-section-127-educational-assistance-programs'),
    ('My Career NJ, Brookdale CompTIA Network+ listing', 'https://mycareer.nj.gov/training/49478'),
    ('Course price examples: Kaplan NJ P&amp;C', 'https://www.kaplanfinancial.com/insurance/new-jersey/property-casualty'),
    ('Course price examples: ExamFX P&amp;C', 'https://www.examfx.com/insurance/property-casualty'),
    ('Course price examples: 360training NJ P&amp;C', 'https://www.360training.com/course/premium-new-jersey-property-casualty-pre-licensing-package'),
]
src_html = '<h2>Sources</h2>\n<ul class="sources">\n' + ''.join('<li>%s: %s</li>\n' % (n, u) for n, u in srcs) + '</ul>'
last_svg = re.search(r'<svg class="ill hide-sm".*?</svg>', tpl[main_start:], re.S).group(0)
S.append('<section class="sec dark" data-mile style="--a:#0F5F66;--b:#0B4A52"><svg class="hilltop" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 34 C 200 6 380 10 560 30 C 760 52 980 8 1200 16 C 1310 20 1390 30 1440 36 V60 H0Z" fill="#0F5F66"/></svg><div class="wrap"><div class="gsplit"><div class="prose" data-reveal>' + src_html + '</div>' + last_svg + '</div></div></section>\n')

page = head + '</head>\n' + header + '<main id="main" class="trail-main" data-trail>\n' + ''.join(S) + tail
for bad in ['—', 'delve', 'tapestry', 'testament', 'realm', 'landscape', 'navigate', 'leverage', 'robust', 'seamless', 'pivotal',
            'crucial', 'elevate', 'unlock', 'foster', 'embark', 'journey', 'game-changer', 'myriad', 'underscore', 'showcase', 'vibrant', 'bustling', 'meticulous']:
    vis = re.sub(r'<[^>]+>', ' ', page[page.index('<main'):])
    assert bad not in vis.lower(), bad
import os
os.makedirs(root + '/level-up', exist_ok=True)
open(root + '/level-up/index.html', 'w', encoding='utf8').write(page)
print('wrote', len(page))
