#!/usr/bin/env python3
"""Small QR code encoder (byte mode, error correction M, versions 1 to 6) with no outside packages.
Writes an inline SVG for the /app/ page. Run from the site root: python3 _tools/make-qr.py [URL]
Prints the SVG; build-app.py embeds it. Folders starting with "_" are not published."""
import sys

# (total codewords, ec codewords per block, blocks) for ECC level M, versions 1..6
M_TABLE = {1: (26, 10, 1), 2: (44, 16, 1), 3: (70, 26, 1), 4: (100, 18, 2), 5: (134, 24, 2), 6: (172, 16, 4)}
ALIGN = {1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34]}

# GF(256) arithmetic for Reed-Solomon
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i] = x; LOG[x] = i
    x <<= 1
    if x & 0x100: x ^= 0x11D
for i in range(255, 512): EXP[i] = EXP[i - 255]
def gmul(a, b): return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]
def rs_gen(n):
    g = [1]
    for i in range(n):
        ng = [0] * (len(g) + 1)
        for j, c in enumerate(g):
            ng[j] ^= c; ng[j + 1] ^= gmul(c, EXP[i])
        g = ng
    return g
def rs_rem(data, n):
    g = rs_gen(n); r = list(data) + [0] * n
    for i in range(len(data)):
        c = r[i]
        if c:
            for j in range(1, len(g)): r[i + j] ^= gmul(g[j], c)
    return r[len(data):]

def encode(text):
    data = text.encode('utf-8')
    for ver in range(1, 7):
        total, ecn, blocks = M_TABLE[ver]
        cap = total - ecn * blocks
        if 4 + 8 + 8 * len(data) <= cap * 8: break
    else: raise SystemExit('too long')
    bits = [0, 1, 0, 0] + [int(b) for b in format(len(data), '08b')]
    for byte in data: bits += [int(b) for b in format(byte, '08b')]
    bits += [0] * min(4, cap * 8 - len(bits))
    bits += [0] * (-len(bits) % 8)
    cw = [int(''.join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    pad = [0xEC, 0x11]; k = 0
    while len(cw) < cap: cw.append(pad[k % 2]); k += 1
    # split into blocks (M, v1..6: all blocks equal length except v5/v6 handled by short/long split)
    nshort = blocks - (total % blocks); slen = total // blocks
    dblocks, eblocks, pos = [], [], 0
    for b in range(blocks):
        dl = slen - ecn + (0 if b < nshort else 1)
        d = cw[pos:pos + dl]; pos += dl
        dblocks.append(d); eblocks.append(rs_rem(d, ecn))
    out = []
    for i in range(max(len(d) for d in dblocks)):
        for d in dblocks:
            if i < len(d): out.append(d[i])
    for i in range(ecn):
        for e in eblocks: out.append(e[i])
    return ver, out

def build(text):
    ver, cws = encode(text)
    n = 17 + 4 * ver
    mod = [[0] * n for _ in range(n)]; fn = [[False] * n for _ in range(n)]
    def setf(r, c, v): mod[r][c] = v; fn[r][c] = True
    def finder(r0, c0):
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                r, c = r0 + dr, c0 + dc
                if 0 <= r < n and 0 <= c < n:
                    inside = 0 <= dr <= 6 and 0 <= dc <= 6
                    v = inside and (dr in (0, 6) or dc in (0, 6) or (2 <= dr <= 4 and 2 <= dc <= 4))
                    setf(r, c, 1 if v else 0)
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0)
    for i in range(8, n - 8): setf(6, i, 1 if i % 2 == 0 else 0); setf(i, 6, 1 if i % 2 == 0 else 0)
    al = ALIGN[ver]
    for r in al:
        for c in al:
            if (r == 6 and c == 6) or (r == 6 and c == n - 7) or (r == n - 7 and c == 6): continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    setf(r + dr, c + dc, 1 if max(abs(dr), abs(dc)) != 1 else 0)
    # reserve format areas and the dark module
    for i in range(9):
        if not fn[8][i]: setf(8, i, 0)
        if not fn[i][8]: setf(i, 8, 0)
    for i in range(8):
        setf(8, n - 1 - i, 0); setf(n - 1 - i, 8, 0)
    setf(n - 8, 8, 1)
    # place data bits in the zigzag
    bits = [(cw >> (7 - b)) & 1 for cw in cws for b in range(8)]
    i = 0; up = True; c = n - 1
    while c > 0:
        if c == 6: c -= 1
        rows = range(n - 1, -1, -1) if up else range(n)
        for r in rows:
            for cc in (c, c - 1):
                if not fn[r][cc]:
                    mod[r][cc] = bits[i] if i < len(bits) else 0; i += 1
        up = not up; c -= 2
    MASKS = [lambda r, c: (r + c) % 2 == 0, lambda r, c: r % 2 == 0, lambda r, c: c % 3 == 0, lambda r, c: (r + c) % 3 == 0,
             lambda r, c: (r // 2 + c // 3) % 2 == 0, lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
             lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0, lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0]
    def fmt_bits(mask):
        d = (0 << 3) | mask  # ECC M = 00
        rem = d
        for _ in range(10): rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        return ((d << 10) | rem) ^ 0x5412
    def apply(mask):
        m = [row[:] for row in mod]
        for r in range(n):
            for c in range(n):
                if not fn[r][c] and MASKS[mask](r, c): m[r][c] ^= 1
        f = fmt_bits(mask)
        b = [(f >> i) & 1 for i in range(15)]
        for i in range(6): m[i][8] = b[i]
        m[7][8] = b[6]; m[8][8] = b[7]; m[8][7] = b[8]
        for i in range(9, 15): m[8][14 - i] = b[i]
        for i in range(8): m[8][n - 1 - i] = b[i]
        for i in range(8, 15): m[n - 15 + i][8] = b[i]
        m[n - 8][8] = 1
        return m
    def penalty(m):
        p = 0
        for grid in (m, [list(x) for x in zip(*m)]):
            for row in grid:
                run = 1
                for i in range(1, n):
                    if row[i] == row[i - 1]: run += 1
                    else:
                        if run >= 5: p += run - 2
                        run = 1
                if run >= 5: p += run - 2
                s = ''.join(map(str, row))
                p += 40 * (s.count('10111010000') + s.count('00001011101'))
        for r in range(n - 1):
            for c in range(n - 1):
                if m[r][c] == m[r][c + 1] == m[r + 1][c] == m[r + 1][c + 1]: p += 3
        dark = sum(map(sum, m)); p += abs(dark * 20 - n * n * 10) // (n * n) * 10
        return p
    best = min(range(8), key=lambda k: penalty(apply(k)))
    return apply(best)

def svg(text, label):
    m = build(text); n = len(m); q = 4; size = n + 2 * q
    path = ''.join(f'M{c + q} {r + q}h1v1h-1z' for r in range(n) for c in range(n) if m[r][c])
    return (f'<svg class="qr" viewBox="0 0 {size} {size}" role="img" aria-label="{label}" shape-rendering="crispEdges">'
            f'<rect width="{size}" height="{size}" fill="#fff"/><path d="{path}" fill="#10213A"/></svg>')

if __name__ == '__main__':
    url = sys.argv[1] if len(sys.argv) > 1 else 'https://steadypathcareers.com/portal/'
    print(svg(url, 'QR code that opens ' + url))
