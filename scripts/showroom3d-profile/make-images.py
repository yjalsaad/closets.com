#!/usr/bin/env python3
"""Extract + downscale the photos used by the two profile decks (docs/showroom3d/VIP-DECKS.md).
usage: python3 make-images.py <closets-profile.pdf> <yas-profile.pdf> <out-dir>
Needs poppler's pdfimages and Pillow. Embedded images are numbered by pdfimages (per page for the Closets file with -j, whole file with -all for YAS);
each output is WebP, max 1100 px wide, <= 150 KB (quality steps down until it fits). Crops remove the page-number badge."""
import subprocess, sys, os, glob, tempfile
from PIL import Image
closets, yas, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
# name -> (pdf, page-or-None, image file stem, crop fractions (l, t, r, b) or None)
JOBS = {
  'closets-factory-floor': (closets, 16, 'p16-000', None), 'closets-factory-aerial': (closets, 2, 'p2-000', None), 'closets-machine': (closets, 18, 'p18-001', None),
  'closets-wardrobes': (closets, 8, 'p8-004', None), 'closets-kitchen': (closets, 9, 'p9-002', None), 'closets-bedroom': (closets, 14, 'p14-005', None), 'closets-living': (closets, 15, 'p15-007', None),
  'closets-durrat-marina': (closets, 22, 'p22-004', None), 'closets-dar-al-salam': (closets, 27, 'p27-006', None), 'closets-grand-tower': (closets, 30, 'p30-000', None), 'closets-the-homes': (closets, 34, 'p34-000', None),
  'closets-hidd-heights': (closets, 37, 'p37-000', None), 'closets-hidd-interior': (closets, 38, 'p38-000', None), 'closets-alsidra': (closets, 47, 'p47-001', (0, 0, 0.94, 0.93)), 'closets-alsidra-interior': (closets, 49, 'p49-000', (0, 0, 0.94, 0.93)),
  'yas-cover': (yas, None, 'y-000', None), 'yas-lounge': (yas, None, 'y-001', None), 'yas-vanity': (yas, None, 'y-003', None), 'yas-sideboard': (yas, None, 'y-025', None), 'yas-wardrobe': (yas, None, 'y-029', None), 'yas-oak': (yas, None, 'y-031', None), 'yas-door': (yas, None, 'y-032', None),
}
cache = {}
def extract(pdf, page):
    key = (pdf, page)
    if key not in cache:
        d = tempfile.mkdtemp()
        if page: subprocess.run(['pdfimages', '-j', '-f', str(page), '-l', str(page), pdf, d + '/p%d' % page], check=True, capture_output=True)
        else: subprocess.run(['pdfimages', '-all', pdf, d + '/y'], check=True, capture_output=True)
        cache[key] = d
    return cache[key]
total = 0
for name, (pdf, page, stem, crop) in JOBS.items():
    d = extract(pdf, page); f = [x for x in glob.glob(d + '/' + stem + '.*')][0]
    im = Image.open(f).convert('RGB')
    if crop: w, h = im.size; im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    if im.size[0] > 1100: im = im.resize((1100, round(im.size[1] * 1100 / im.size[0])), Image.LANCZOS)
    for q in (74, 68, 62, 56, 50, 44):
        p = os.path.join(out, name + '.webp'); im.save(p, 'WEBP', quality=q, method=6)
        if os.path.getsize(p) <= 150 * 1024: break
    total += os.path.getsize(p); print(name, im.size, os.path.getsize(p) // 1024, 'KB q', q)
print('total', total // 1024, 'KB')
