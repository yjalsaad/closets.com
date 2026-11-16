#!/usr/bin/env python3
"""Prepare the two REAL photographs of company leaders for film v2. Real people's photographs: they are used only as finished
film frames; the processed images live in a scratch directory, never in the repository or in public/.

Usage: python3 prepare_leaders.py <photo-1.jpg> <photo-2.jpg> <out-dir>   -> <out-dir>/p1.png, <out-dir>/p2.png
 * photo 1 (854x928, a portrait) is used as is.
 * photo 2 (945x2048) is a PHONE SCREENSHOT: the status bar (top 144 px) and the app bar (bottom 156 px, including the home indicator) are cropped away, leaving the
   photograph (945x1742), found by measuring where the dark bars end; nothing is stretched or retouched.
No AI is applied to either image (no upscaling, no generation, no model receives them). They are shown at a size where no upscaling is needed.
"""
import os
import sys

import numpy as np
from PIL import Image

p1, p2, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
Image.open(p1).convert("RGB").save(os.path.join(out, "p1.png"))
im = Image.open(p2).convert("RGB")
rows = np.asarray(im).astype(int).mean(axis=(1, 2))
top = next(y for y in range(len(rows)) if y > 100 and rows[y] > 100) + 2                 # first light row after the status bar, plus a 2 px safety margin
bottom = next(y for y in range(len(rows) // 2, len(rows)) if rows[y] < 60) - 3             # first dark row of the app bar, minus a 3 px safety margin
im.crop((0, top, im.width, bottom + 1)).save(os.path.join(out, "p2.png"))
print("p2 crop rows", top, bottom, "->", im.width, bottom + 1 - top)
