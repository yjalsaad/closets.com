#!/usr/bin/env python3
"""Convert the site's self-hosted webfonts (node_modules/@fontsource*) to static TTFs for the film's title cards.

Usage: python3 prepare_fonts.py <path-to-node_modules> <out-dir>
Needs: pip install fonttools brotli
The film uses the same faces as the website (DESIGN.md): Fraunces + Inter (Latin), Noto Naskh Arabic + IBM Plex Sans Arabic.
"""
import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

nm, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

VARIABLE = [
    ("@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2", "Fraunces", (500, 600)),
    ("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "Inter", (400, 500, 600)),
    ("@fontsource-variable/noto-naskh-arabic/files/noto-naskh-arabic-arabic-wght-normal.woff2", "NaskhAr", (600,)),
]
for rel, name, weights in VARIABLE:
    for w in weights:
        f = TTFont(os.path.join(nm, rel))
        inst = instancer.instantiateVariableFont(f, {"wght": w})
        inst.flavor = None
        inst.save(os.path.join(out, f"{name}-{w}.ttf"))
        print("wrote", f"{name}-{w}.ttf")

for w in (500,):
    f = TTFont(os.path.join(nm, f"@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-{w}-normal.woff2"))
    f.flavor = None
    f.save(os.path.join(out, f"PlexAr-{w}.ttf"))
    print("wrote", f"PlexAr-{w}.ttf")
