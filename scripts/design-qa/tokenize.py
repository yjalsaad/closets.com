#!/usr/bin/env python3
"""One-off codemod used for the design pass: inline style literals -> design tokens (radius scale, neutral greys, white surfaces,
semantic colours, container wrapper). Only touches JS style-object syntax (property: 'literal'); HTML template strings (print/PDF
windows, which cannot resolve CSS variables) are untouched because their colours are not standalone quoted tokens."""
import re, sys, glob
files = ['src/App.js'] + [f for f in glob.glob('src/pages/*.jsx') if not f.endswith('unused.jsx')] + glob.glob('src/privacy/*.jsx') + ['src/seo/NotFound.jsx', 'src/seo/FooterSitemap.jsx']
RAD = lambda n: ('xs' if n <= 2 else 'sm' if n <= 9 else 'md' if n <= 12 else 'lg' if n <= 16 else 'xl' if n <= 28 else 'pill')
HEX = {
  '#86868b': 'var(--shop-muted)', '#1d1d1f': 'var(--shop-ink)', '#e6e6e6': 'var(--shop-line)', '#ececec': 'var(--shop-line)', '#f5f5f7': 'var(--shop-fill)',
  '#6e6e73': 'var(--shop-ink-2)', '#aaa': 'var(--c-text-3)', '#aaaaaa': 'var(--c-text-3)', '#555': 'var(--c-text-2)', '#999': 'var(--c-text-3)', '#888': 'var(--c-text-3)', '#666': 'var(--c-text-2)',
  '#b91c1c': 'var(--c-err)', '#16a34a': 'var(--c-ok)', '#d93025': 'var(--c-err)', '#1a7a40': 'var(--c-ok)', '#1d7a4d': 'var(--c-ok)', '#c65d2e': 'var(--c-accent)', '#a84b29': 'var(--c-accent)', '#c2410c': 'var(--c-accent-hover)', '#89391e': 'var(--c-accent-hover)',
}
tot = 0
for f in files:
    s = open(f, encoding='utf8').read(); o = s
    s = re.sub(r"var\((--[a-z0-9-]+), *#[0-9a-fA-F]{3,6}\)", r"var(\1)", s)            # drop hex fallbacks inside var()
    def rad(m):
        n = int(m.group(2)); return m.group(1) + "'var(--radius-%s)'" % RAD(n)
    s = re.sub(r"(borderRadius:\s*)(\d{1,3})(?![\d.%'px])", rad, s)
    for h, v in HEX.items():
        s = re.sub(r"(:\s*)['\"]" + re.escape(h) + r"['\"]", lambda m: m.group(1) + "'" + v + "'", s, flags=re.I)
    s = re.sub(r"(background:\s*)['\"]#fff(fff)?['\"]", r"\1'var(--c-surface)'", s, flags=re.I)
    s = s.replace("maxWidth:1180, margin:'0 auto', padding: mobile?'0 16px':'0 28px'", "maxWidth:'calc(var(--container) + var(--gutter) * 2)', margin:'0 auto', padding:'0 var(--gutter)'")
    if s != o:
        open(f, 'w', encoding='utf8').write(s); tot += 1; print('updated', f)
print(tot, 'files')
