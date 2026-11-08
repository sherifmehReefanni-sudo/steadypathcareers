"""r27 Find Your Fit browser checks (Playwright, demo mode). Serve the site root, then:
   python3 _tools/fit/ui_check.py http://localhost:8727
Checks: the Jobs view credit under interest lines and its Source link; interest lines carry no pay or priority text and no
discouraging words; the share dialog traps focus, closes on Escape, makes the page behind inert and carries O*NET area names and
the credit; Fit screens line up with the header at 1280 like other views; the intro logo is at full opacity; no sideways scroll at
400; reduced motion runs no animations; computed text contrast on the area chips and cards."""
import sys
from playwright.sync_api import sync_playwright
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8727') + '/portal/?demo=1'
P = F = 0
def ok(c, n, info=''):
    global P, F
    if c: P += 1
    else: F += 1
    print(('PASS ' if c else 'FAIL ') + n + ('' if c or not info else '  [' + str(info)[:300] + ']'))
CR = """(function(el){function rgb(s){var m=s.match(/[\\d.]+/g).map(Number);return m}function L(c){return [0,1,2].map(function(i){var x=c[i]/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)}).reduce(function(s,x,i){return s+x*[0.2126,0.7152,0.0722][i]},0)}
function bg(e){while(e){var b=getComputedStyle(e).backgroundColor;var m=rgb(b);if(m.length<4||m[3]>0.99)return m;e=e.parentElement}return [255,255,255]}
var f=rgb(getComputedStyle(el).color),b=bg(el),a=L(f),c=L(b);return (Math.max(a,c)+0.05)/(Math.min(a,c)+0.05)})"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    def page(w, reduced=True):
        ctx = b.new_context(viewport={'width': w, 'height': 900}, reduced_motion='reduce' if reduced else 'no-preference', service_workers='block')
        p = ctx.new_page(); p.errs = []
        p.on('pageerror', lambda e: p.errs.append(str(e)))
        return ctx, p
    def go(p, q, sel):
        p.goto(BASE + q); p.wait_for_selector(sel, timeout=8000); p.wait_for_timeout(400)
    # 1. Jobs view credit and the interest line
    ctx, p = page(400)
    go(p, '&fxdone=1', '.jfitw')
    lines = p.eval_on_selector_all('.jfitw', 'function(a){return a.map(function(x){return x.textContent})}')
    ok(len(lines) >= 1, 'job cards show interest lines', len(lines))
    ok(all('ranked' not in t and 'pay' not in t.lower() and 'different mix' not in t for t in lines), 'interest lines: interests only, no pay or priority text, no "different mix"', lines)
    cred = p.text_content('#fitCredit') or ''
    ok('O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license.' in cred and 'Steady Path Careers has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.' in cred, 'Jobs view carries the O*NET Database credit and the modified notice', cred)
    ok(p.get_attribute('#fitCredit a', 'href') == 'https://creativecommons.org/licenses/by/4.0/', 'credit links the CC BY 4.0 license')
    url0 = p.url; n0 = p.evaluate('history.length')
    p.click('.jfitw [data-fxsrc]'); p.wait_for_timeout(300)
    ok(p.evaluate('document.activeElement.id') == 'fitCredit' and p.url == url0 and p.evaluate('history.length') == n0, 'Source link moves focus to the credit; URL and history unchanged')
    go(p, '', '.fx-jcard')
    ok(p.query_selector('.jfitw') is None and p.query_selector('#fitCredit') is None, 'before the profiler is done: no interest lines and no credit')
    ok(p.query_selector('.fx-jcard .fx-logo svg') is not None, 'Jobs card shows the full logo before any answers')
    ctx.close()
    # 2. share dialog
    for w in (400, 1280):
        ctx, p = page(w)
        go(p, '&v=fit&fxdone=1', '.fx-res')
        p.click('[data-fxshare]'); p.wait_for_selector('.fx-dlg'); p.wait_for_function("!!(S.fx.share && S.fx.share.png)")
        alt = p.get_attribute('.fx-shimg', 'alt')
        ok('Thinker (Investigative)' in alt and 'Helper (Social)' in alt and 'Builder (Realistic)' in alt, f'{w}: share card names each area with its O*NET name', alt)
        svg = p.evaluate('decodeURIComponent(S.fx.share.svg)')
        ok('(Investigative)' in svg and 'O*NET&#174; interest areas: Investigative + Social + Realistic' not in svg and 'O*NET® interest areas: Investigative + Social + Realistic' in svg, f'{w}: card image shows O*NET area names', svg[:0])
        import re
        txt = ' '.join(re.findall(r'<text[^>]*>([^<]*)</text>', svg)).replace('&amp;', '&')
        ok('This page includes information from the O*NET Career Exploration Tools by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY-ND 4.0 license. O*NET\u00ae is a trademark of USDOL/ETA. https://creativecommons.org/licenses/by-nd/4.0/' in txt, f'{w}: card image carries the exact credit and the license URL', txt[-400:])
        ok(all(x not in svg for x in ['Jordan', 'of 20', ' 18', ' 13']), f'{w}: card has no name and no scores')
        inside = []
        for i in range(8):
            p.keyboard.press('Tab'); inside.append(p.evaluate("!!document.activeElement.closest('.fx-dlg')"))
        for i in range(4):
            p.keyboard.press('Shift+Tab'); inside.append(p.evaluate("!!document.activeElement.closest('.fx-dlg')"))
        ok(all(inside), f'{w}: Tab and Shift+Tab stay inside the share dialog', inside)
        ok(p.evaluate("document.querySelector('main.fx-main').hasAttribute('inert') && document.querySelector('header.sky').hasAttribute('inert')"), f'{w}: page behind the dialog is inert')
        p.keyboard.press('Escape'); p.wait_for_timeout(200)
        ok(p.query_selector('.fx-dlg') is None and p.evaluate("document.activeElement.hasAttribute('data-fxshare')") and not p.evaluate("document.querySelector('main.fx-main').hasAttribute('inert')"), f'{w}: Escape closes it, focus returns to the button, page no longer inert')
        ctx.close()
    # 3. alignment at 1280 and no sideways scroll at 400
    ctx, p = page(1280)
    go(p, '&v=docs', 'main.pmain'); ref = p.evaluate("[document.querySelector('.sky .wrap').getBoundingClientRect().left, document.querySelector('main.pmain').getBoundingClientRect().left, document.querySelector('main.pmain').getBoundingClientRect().width]")
    for q, sel in [('&v=fit', '.fx-intro'), ('&v=fit&fxq=16', '.fx-q'), ('&v=fit&fxdone=1', '.fx-res')]:
        go(p, q, sel); m = p.evaluate("[document.querySelector('.sky .wrap').getBoundingClientRect().left, document.querySelector('main.pmain').getBoundingClientRect().left, document.querySelector('main.pmain').getBoundingClientRect().width]")
        ok(abs(m[0] - ref[0]) < 1 and abs(m[1] - ref[1]) < 1 and abs(m[2] - ref[2]) < 1, f'1280 {q}: header and content line up exactly like the Documents view', (m, ref))
    ctx.close()
    ctx, p = page(400)
    for q, sel in [('&v=fit', '.fx-intro'), ('&v=fit&fxq=7', '.fx-q'), ('&v=fit&fxq=16', '.fx-moment'), ('&v=fit&fxdone=1', '.fx-res'), ('&fxdone=1', '.jfitw')]:
        go(p, q, sel); ok(not p.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), f'400 {q}: no sideways scroll')
    go(p, '&v=fit', '.fx-intro')
    op = p.evaluate("(function(){var e=document.querySelector('.fx-hero .fx-logo svg'),o=1;while(e&&e!==document.body){o*=+getComputedStyle(e).opacity;e=e.parentElement}return o})()")
    ok(op == 1 and p.query_selector('.fx-hero .fx-ray') is None, 'intro logo is the full logo at full opacity', op)
    for sel in ['.fx-chips li']:
        rs = p.eval_on_selector_all(sel, 'function(a){return a.map(' + CR + ')}')
        ok(min(rs) >= 4.5, f'computed contrast of {sel} at least 4.5 (min {min(rs):.2f})', rs)
    for sel in ['.fx-lead', '.fx-sub', '.fx-credit']:
        r = p.eval_on_selector(sel, CR) if sel != '.fx-lead' and sel != '.fx-sub' else None
        if r: ok(r >= 4.5, f'computed contrast {sel} {r:.2f}')
    go(p, '&v=fit&fxdone=1', '.fx-res')
    for sel in ['.fx-area b', '.fx-area small', '.fx-area p', '.fx-rank', '.fx-tt small']:
        rs = p.eval_on_selector_all(sel, 'function(a){return a.map(' + CR + ')}')
        ok(min(rs) >= 4.5, f'computed contrast of {sel} at least 4.5 (min {min(rs):.2f})', rs)
    ok(p.evaluate('document.getAnimations().length') == 0, 'reduced motion: nothing animates on the results')
    ok(not p.errs, 'no page errors', p.errs)
    ctx.close()
    b.close()
print('RESULT %d pass %d fail' % (P, F))
sys.exit(1 if F else 0)
