"""r30 theme tokens for the page generators (build-free.py, build-app.py).
apply_html(text) rewrites the light-mode colors inside <style> blocks and style="" attributes into the theme tokens
defined in assets/theme.css, exactly as the r30 conversion did, so a regenerated page matches the committed one.
Light values of every token equal the original colors. Running it twice changes nothing. Folders starting with "_"
are not published."""
import re, colorsys

def hx(h):
    h = h.lower().lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return h

def rgb(h):
    h = hx(h); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def lum(h):
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(h); return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)

def tohex(r, g, b): return '#%02X%02X%02X' % (round(r), round(g), round(b))

def hls(h):
    r, g, b = rgb(h); return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)

def from_hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s); return tohex(r * 255, g * 255, b * 255)

def contrast(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)

def chroma(h):
    r, g, b = rgb(h); return max(r, g, b) - min(r, g, b)

def dark_bg(h):
    H, L, S = hls(h)
    c = chroma(h); deg = H * 360
    warm = 25 <= deg <= 65
    if c >= 40 or (not warm and c >= 14):
        return from_hls(H, 0.17, min(S, 0.40))
    # creams, sands, near-white neutrals -> navy surface ladder (darker original -> slightly lighter surface)
    l = 0.155 + (1 - L) * 0.30
    return from_hls(0.60, min(max(l, 0.15), 0.22), 0.42)

TEXT_MAP = {'10213a': '#F3EDE0', '17233a': '#F3EDE0', '000000': '#F3EDE0', '2b2a28': '#F3EDE0',
            '1f3a5f': '#A9C6F2', '23406b': '#A9C6F2', '1d3f78': '#A9C6F2', '1e4a8f': '#A9C6F2',
            '34425a': '#D3DAE6', '3d4657': '#D3DAE6', '4a5872': '#B4C0D4'}
def dark_text(h):
    if hx(h) in TEXT_MAP: return TEXT_MAP[hx(h)]
    H, L, S = hls(h)
    if S < 0.2: return '#D5DCE8'
    return from_hls(H, 0.80, min(S, 0.65))

def dark_border(h):
    H, L, S = hls(h)
    c = chroma(h); deg = H * 360
    if c >= 40 or (not (25 <= deg <= 65) and c >= 14): return from_hls(H, 0.32, min(S, 0.4))
    return '#2C3E5C'

tokens = {}  # name -> (light, dark)
def tok(kind, h):
    h6 = hx(h)
    if kind == 'bg':
        if h6 == 'ffffff': return 'var(--surface)'
        name = '--bgx-' + h6; tokens[name] = ('#' + h6.upper(), dark_bg(h6))
    elif kind == 'tx':
        name = '--txx-' + h6; tokens[name] = ('#' + h6.upper(), dark_text(h6))
    else:
        name = '--bdx-' + h6; tokens[name] = ('#' + h6.upper(), dark_border(h6))
    return 'var(%s)' % name

HEX = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
LIGHT_VARS = r'cream|white|sunk|sky|mist|peach|sand|gold-soft|ok-soft|bad-soft|info-soft|line|surface|page|cream-fill|bgx-[0-9a-f]{6}|yes-bg|q-bg|no-bg|act-soft|attn-soft|pv-sky|pv-peach|pv-sand'
FLIP_TEXT_VARS = ['navy', 'midnight', 'ink', 'ink2', 'muted', 'ok', 'bad', 'info']
LIT = {'navy': '#1F3A5F', 'midnight': '#10213A', 'ink': '#17233A', 'ink2': '#333E52', 'muted': '#5c6b84', 'ok': '#1f7a46', 'bad': '#b23a2f', 'info': '#2b5aa8'}

def split_decls(body):
    out, depth, q, cur = [], 0, None, ''
    for c in body:
        if q:
            cur += c
            if c == q: q = None
            continue
        if c in '"\'': q = c; cur += c; continue
        if c == '(': depth += 1
        elif c == ')': depth -= 1
        if c == ';' and depth == 0: out.append(cur); cur = ''
        else: cur += c
    out.append(cur)
    return out

def bg_kind(decls):
    kind = 'none'
    for d in decls:
        m = re.match(r'\s*(background(?:-color)?)\s*:(.*)', d, re.S)
        if not m: continue
        v = m.group(2)
        if re.search(r'\b(transparent|none|inherit)\b', v) and not HEX.search(v) and 'var(' not in v and 'rgba' not in v:
            continue
        hexes = HEX.findall(v)
        light = [h for h in hexes if lum(h) > 0.5]
        darkish = [h for h in hexes if lum(h) <= 0.5]
        if re.search(r'\bwhite\b', v) or light or re.search(r'var\(--(%s)\)' % LIGHT_VARS, v) or re.search(r'rgba?\(\s*255\s*,\s*255\s*,\s*255', v) or 'var(--wash-rgb)' in v or 'var(--cream-rgb)' in v:
            kind = 'convert' if not darkish else 'keep'
        else:
            kind = 'keep'
    return kind

def rewrite_value(prop, val, kind):
    if 'url(' in val:
        parts = re.split(r'(url\([^)]*\))', val)
        return ''.join(x if x.startswith('url(') else rewrite_value(prop, x, kind) for x in parts)
    p = prop.strip().lower()
    if p in ('background', 'background-color', 'background-image'):
        val = re.sub(r'(?<![\w-])white(?![\w-])', 'var(--surface)', val)
        val = HEX.sub(lambda m: tok('bg', m.group(0)) if lum(m.group(0)) > 0.5 else m.group(0), val)
        val = re.sub(r'var\(--(cream|navy|midnight|ok|bad|info)\)', lambda m: 'var(--%s-fill)' % m.group(1), val)
        val = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,', 'rgba(var(--wash-rgb),', val)
        val = re.sub(r'rgba\(\s*31\s*,\s*58\s*,\s*95\s*,', 'rgba(var(--tint-rgb),', val)
        return val
    if p == 'color':
        if kind in ('none', 'convert'):
            val = HEX.sub(lambda m: tok('tx', m.group(0)) if lum(m.group(0)) < 0.18 else m.group(0), val)
        else:
            val = re.sub(r'var\(--(%s)\)' % '|'.join(FLIP_TEXT_VARS), lambda m: LIT[m.group(1)], val)
        return val
    if p.startswith('border') or p in ('box-shadow', 'outline', 'outline-color'):
        if p == 'box-shadow' and re.search(r'rgba\(\s*16\s*,\s*33\s*,\s*58', val) and not HEX.search(val):
            return val
        val = HEX.sub(lambda m: tok('bd' if p != 'box-shadow' else 'bg', m.group(0)) if lum(m.group(0)) > 0.5 else m.group(0), val)
        val = re.sub(r'rgba\(\s*31\s*,\s*58\s*,\s*95\s*,', 'rgba(var(--tint-rgb),', val)
        if p.startswith('border'):
            val = re.sub(r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,', 'rgba(var(--wash-rgb),', val) if kind == 'convert' else val
        return val
    return val

def rewrite_decls(body):
    decls = split_decls(body)
    kind = bg_kind(decls)
    out = []
    for d in decls:
        m = re.match(r'(\s*)([a-zA-Z-]+)(\s*:)(.*)', d, re.S)
        if not m or m.group(2).startswith('--'):
            out.append(d); continue
        out.append(m.group(1) + m.group(2) + m.group(3) + rewrite_value(m.group(2), m.group(4), kind))
    return ';'.join(out)

def rewrite_css(css):
    # innermost rule bodies: { ... } with no nested braces
    def rep(m):
        sel = m.group(1)
        if re.search(r'@keyframes|^\s*(from|to|\d+%)', sel.split('\n')[-1]): return m.group(0)
        if ':root' in sel: return m.group(0)
        return sel + '{' + rewrite_decls(m.group(2)) + '}'
    return re.sub(r'([^{}]*)\{([^{}]*)\}', rep, css)


def apply_html(s):
    s = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + rewrite_css(m.group(2)) + m.group(3), s, flags=re.S)
    s = re.sub(r'(\sstyle=")([^"]*)(")', lambda m: m.group(1) + rewrite_decls(m.group(2)) + m.group(3), s)
    return s
