#!/usr/bin/env python3
"""Render the VIP-room film "THE CLOSETS - THE JOURNEY OF AMBITION" from its generated sources.

The picture is assembled locally: AI-generated stills get slow camera moves, three AI-generated
video clips are cut in, and every word on screen (titles, labels, the 10,000 reveal, the end
cards) is typeset here with Pillow so the spelling is exact. The real logo file is composited
for the end card; no model draws text or logos.

Usage:
  python3 fetch_sources.py   <src-dir>                      # downloads stills / clips / audio from the ledger
  python3 prepare_fonts.py   <node_modules> <fonts-dir>
  python3 build_film.py --src <src-dir> --fonts <fonts-dir> --logo <official-logo.jpg> --out <work-dir>
  python3 encode_film.py     <work-dir> <public/yas-bloom/film>

Needs: python3 with Pillow (raqm) + numpy, ffmpeg with libx264.
"""
import argparse
import json
import math
import os
import subprocess
import sys
from multiprocessing import Process

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 24
AH = 960                      # active picture height: 2:1 inside the 16:9 frame
BAR = (H - AH) // 2
DUR = 124.0
NF = int(round(DUR * FPS))

INK = (62, 31, 32)            # sampled from the official logo
ORANGE = (231, 141, 62)
GREY = (96, 88, 84)
CARD = (247, 242, 236)        # website cream (DESIGN.md --cream)
WHITE = (255, 255, 255)

# ---------------------------------------------------------------- narration timing
# The narration file is used untouched (never time-stretched). It is only cut in its natural
# pauses so a little air can be added between chapters. Each row: narration time where the
# segment starts, and the offset that maps narration time to film time from there on.
NARR_SEGMENTS = [
    (0.00, 1.8),
    (24.04, 2.2),     # "kabar al-hulm..."            (+0.4 s)
    (27.91, 2.7),     # "min warsha saghira..."       (+0.5 s)
    (36.32, 3.7),     # "wa min fareeq sagheer..."    (+1.0 s)
    (56.15, 4.2),     # "lakin bil-nisba lana..."     (+0.5 s)
    (76.44, 4.7),     # "wal-yawm..."                 (+0.5 s)
    (97.93, 5.0),     # "rihlatuna bada'at..."        (+0.3 s)
    (104.24, 5.2),    # "al-khaza'in al-alamiya"      (+0.2 s)
]
NARR_END = 112.12


def narr_to_film(t):
    off = NARR_SEGMENTS[0][1]
    for start, o in NARR_SEGMENTS:
        if t >= start:
            off = o
    return t + off


# ---------------------------------------------------------------- edit decision list
# kind: still | video | card.   win = (cx, cy, wfrac): centre and width of the 2:1 window as
# fractions of the source (start -> end).  xin = cross-dissolve from the previous shot (0 = cut).
S = "still"
SHOTS = [
    # --- 01 the beginning
    dict(id="A01", t0=0.0, src="1a", grade="hist", win=((0.50, 0.50, 1.00), (0.52, 0.50, 0.88)), xin=0, leak=True),
    dict(id="A02", t0=6.1, src="1b", grade="hist", win=((0.46, 0.50, 0.92), (0.54, 0.51, 0.84)), xin=0.6, leak=True),
    dict(id="A03", t0=9.2, kind="video", src="v1_workshop", grade="hist", vstart=0, vy=20, xin=0, dust=True, leak=True),
    dict(id="A04", t0=14.2, src="1d", grade="hist", win=((0.50, 0.50, 0.95), (0.47, 0.48, 0.80)), xin=0, dust=True),
    dict(id="A05", t0=17.9, src="1e", grade="hist", win=((0.56, 0.50, 0.98), (0.52, 0.50, 0.86)), xin=0, dust=True, leak=True),
    dict(id="A06", t0=22.3, src="1c", grade="hist", win=((0.56, 0.46, 0.62), (0.55, 0.47, 0.54)), xin=0.5, dust=True, leak=True),
    # --- 02 the dream grows
    dict(id="B01", t0=26.3, src="2a", grade="hist", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.6, dust=True, leak=True),
    dict(id="B02", t0=28.7, src="2b", grade="hist", win=((0.52, 0.47, 0.92), (0.55, 0.46, 0.84)), xin=0, leak=True),
    dict(id="B03", t0=30.7, src="2c", grade="hist", win=((0.5025, 0.4325, 0.80), (0.5025, 0.4325, 0.60)), xin=0),
    dict(id="B04", t0=32.1, src="2d", grade="mod", win=((0.5065, 0.4685, 0.585), (0.5065, 0.4685, 0.50)), xin=0.5),
    # --- 03 the industrial revolution
    dict(id="C01", t0=33.2, src="3a", grade="mod", win=((0.50, 0.52, 1.00), (0.50, 0.50, 0.90)), xin=0.3),
    dict(id="C02", t0=35.8, kind="video", src="v2_cnc", grade="mod", vstart=10, vy=60, xin=0),
    # --- 04 beyond borders
    dict(id="D01", t0=40.2, src="2a", grade="hist", win=((0.60, 0.48, 0.62), (0.62, 0.47, 0.56)), xin=0.4, dust=True),
    dict(id="D02", t0=42.0, src="4a", grade="mod", win=((0.50, 0.50, 0.98), (0.52, 0.49, 0.88)), xin=0.4),
    dict(id="D03", t0=44.3, src="4b", grade="mod", win=((0.50, 0.47, 0.96), (0.50, 0.46, 0.88)), xin=0),
    dict(id="D04", t0=46.5, src="4c", grade="mod", win=((0.45, 0.47, 0.96), (0.43, 0.47, 0.90)), xin=0),
    dict(id="D05", t0=48.1, src="4d", grade="mod", win=((0.50, 0.47, 0.96), (0.50, 0.46, 0.88)), xin=0),
    # --- 05 more than 10,000 projects
    dict(id="E01", t0=50.0, src="2c", grade="hist", win=((0.52, 0.42, 0.50), (0.50, 0.42, 0.44)), xin=0.3),
    dict(id="E02", t0=51.5, src="5a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.93)), xin=0.3),
    dict(id="E03", t0=53.0, src="5b", grade="mod", win=((0.50, 0.50, 0.93), (0.50, 0.50, 1.00)), xin=0),
    dict(id="E04", t0=54.4, src="5c", grade="mod", win=((0.47, 0.50, 0.94), (0.53, 0.50, 0.94)), xin=0),
    dict(id="E05", t0=55.8, src="5d", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.49, 0.92)), xin=0),
    dict(id="E06", t0=57.2, src="5e", grade="mod", win=((0.50, 0.50, 0.98), (0.48, 0.48, 0.90)), xin=0),
    dict(id="E07", t0=58.9, src="5f", grade="mod", win=((0.50, 0.47, 0.95), (0.50, 0.47, 0.87)), xin=0),
    # --- 06 governance, quality and safety
    dict(id="F01", t0=60.6, src="6a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.48, 0.92)), xin=0.6),
    dict(id="F02", t0=63.6, src="6a", grade="mod", win=((0.50, 0.56, 0.52), (0.50, 0.56, 0.46)), xin=0),
    dict(id="F03", t0=66.3, src="3c", grade="mod", win=((0.48, 0.50, 1.00), (0.52, 0.50, 0.88)), xin=0),
    dict(id="F04", t0=70.5, src="3d", grade="mod", win=((0.50, 0.47, 0.97), (0.50, 0.46, 0.90)), xin=0),
    dict(id="F05", t0=72.5, src="6b", grade="mod", win=((0.50, 0.47, 0.96), (0.52, 0.47, 0.90)), xin=0),
    dict(id="F06", t0=73.9, src="6c", grade="mod", win=((0.50, 0.48, 1.00), (0.50, 0.47, 0.94)), xin=0),
    dict(id="F07", t0=75.2, src="6a", grade="mod", win=((0.27, 0.56, 0.55), (0.30, 0.56, 0.50)), xin=0),
    dict(id="F08", t0=77.2, src="6b", grade="mod", win=((0.28, 0.72, 0.52), (0.25, 0.74, 0.46)), xin=0),
    dict(id="F09", t0=79.1, src="3b", grade="mod", win=((0.74, 0.45, 0.60), (0.76, 0.44, 0.54)), xin=0),
    # --- 07 the digital transformation
    dict(id="G01", t0=81.0, src="7a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.8),
    dict(id="G02", t0=84.6, src="7a", grade="mod", win=((0.36, 0.52, 0.56), (0.34, 0.53, 0.48)), xin=0),
    dict(id="G03", t0=87.0, src="7b", grade="mod", win=((0.50, 0.50, 0.98), (0.48, 0.50, 0.88)), xin=0),
    dict(id="G04", t0=89.0, src="7c", grade="mod", win=((0.50, 0.48, 1.00), (0.47, 0.47, 0.90)), xin=0),
    dict(id="G05", t0=91.4, src="7d", grade="mod", win=((0.50, 0.48, 1.00), (0.60, 0.42, 0.76)), xin=0),
    dict(id="H01", t0=98.3, src="1d", grade="hist", win=((0.43, 0.47, 0.55), (0.44, 0.48, 0.50)), xin=0.5, dust=True),
    dict(id="H02", t0=100.3, src="7e", grade="mod", win=((0.50, 0.50, 0.95), (0.52, 0.50, 0.85)), xin=0.6),
    # --- 08 the future starts here
    dict(id="I01", t0=102.9, kind="video", src="v3_drone", grade="mod", vstart=0, vy=30, xin=0.5),
    dict(id="I02", t0=107.9, src="8b", grade="mod", win=((0.50, 0.47, 1.00), (0.50, 0.45, 0.92)), xin=0.5),
    dict(id="J01", t0=110.0, kind="card", src="card", grade="none", xin=0.7),
]
for i, s in enumerate(SHOTS):
    s.setdefault("kind", S)
    s["t1"] = SHOTS[i + 1]["t0"] if i + 1 < len(SHOTS) else DUR
    s["tail"] = SHOTS[i + 1]["xin"] if i + 1 < len(SHOTS) else 0.0

# warm "light leak" flashes that bridge eras / land on musical accents: (time, half-width s, colour, strength)
FLASHES = [
    (33.2, 0.40, (255, 216, 170), 0.55),   # paper sketch -> the two factories
    (51.5, 0.28, (255, 236, 214), 0.30),   # idea on paper -> finished projects
    (87.0, 0.22, (255, 255, 255), 0.16),   # design -> manufacturing (music downbeat)
    (110.0, 0.55, (255, 240, 222), 0.30),  # logo reveal
]

LOCATIONS = [  # shot id, English, Arabic
    ("D02", "BAHRAIN", "البحرين"),
    ("D03", "SAUDI ARABIA", "السعودية"),
    ("D04", "QATAR", "قطر"),
    ("D05", "UNITED ARAB EMIRATES", "الإمارات"),
]

NODES = ["SALES", "CUSTOMERS", "DESIGN", "ENGINEERING", "CNC MANUFACTURING", "PROCUREMENT", "SUPPLIERS",
         "INVENTORY", "WAREHOUSING", "FINANCE", "PROJECTS", "INSTALLATION", "QUALITY", "SUPPLY CHAIN"]

FINAL_LINES = ["FROM A SMALL WORKSHOP TO A REGIONAL INDUSTRIAL LEGACY.", "BUILT IN BAHRAIN.", "GROWING ACROSS THE GCC.",
               "DESIGNED FOR THE FUTURE."]
CLOSE_LINES = ["A journey built on ambition.", "A legacy built through determination.", "A future powered by innovation."]
DISCLOSURE_EN = "Illustrative imagery generated with AI"
DISCLOSURE_AR = "صور توضيحية مولّدة بالذكاء الاصطناعي"

ARGS = None


# ---------------------------------------------------------------- helpers
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def envelope(t, t_in, d_in, t_out, d_out):
    """0..1 opacity: fades in from t_in over d_in, fades out so it reaches 0 at t_out."""
    return smooth((t - t_in) / d_in) * smooth((t_out - t) / d_out)


_fonts = {}


def font(name, size):
    key = (name, size)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(os.path.join(ARGS.fonts, name), size, layout_engine=ImageFont.Layout.RAQM)
    return _fonts[key]


def text_layer(text, fnt, fill, tracking=0.0, rtl=False, shadow=0, pad=24):
    """Tightly sized RGBA layer with the text; tracking is in em. Returns the layer (text baseline box padded)."""
    kw = dict(direction="rtl", language="ar") if rtl else {}
    if tracking and not rtl:
        adv = [fnt.getlength(ch) + tracking * fnt.size for ch in text]
        width = int(math.ceil(sum(adv) - tracking * fnt.size))
    else:
        width = int(math.ceil(fnt.getlength(text, **kw)))
    asc, desc = fnt.getmetrics()
    height = asc + desc
    img = Image.new("RGBA", (width + 2 * pad, height + 2 * pad), (0, 0, 0, 0))

    def draw(d, colour, dx=0, dy=0):
        if tracking and not rtl:
            x = pad + dx
            for ch, a in zip(text, adv):
                d.text((x, pad + dy), ch, font=fnt, fill=colour)
                x += a
        else:
            d.text((pad + dx, pad + dy), text, font=fnt, fill=colour, **kw)

    if shadow:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw(ImageDraw.Draw(sh), (0, 0, 0, int(255 * shadow)), 0, 2)
        img = sh.filter(ImageFilter.GaussianBlur(7))
    draw(ImageDraw.Draw(img), fill + (255,))
    return img


def put(frame, layer, cx, y, op, anchor="c"):
    """Alpha-composite layer on an RGBA frame; cx is centre / left / right x depending on anchor; y is the top."""
    if op <= 0.003:
        return
    if op < 0.997:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * op)))
    x = cx - layer.width // 2 if anchor == "c" else cx if anchor == "l" else cx - layer.width
    frame.alpha_composite(layer, dest=(int(x), int(y)))


def make_lut(lift=0.0, contrast=0.0, gamma=1.0, tint=(1, 1, 1)):
    x = np.linspace(0, 1, 256)
    y = x ** gamma
    y = 0.5 + (y - 0.5) * (1 + contrast)
    y = lift + y * (1 - lift)
    out = []
    for k in tint:
        out += list(np.clip(y * k * 255 + 0.5, 0, 255).astype(np.uint8))
    return out


GRADES = {
    # historical scenes: warmer, softer, lifted blacks, heavier vignette
    "hist": dict(lut=make_lut(lift=0.035, contrast=-0.03, gamma=0.98, tint=(1.03, 1.0, 0.92)), sat=0.84, vig=0.34),
    # present-day scenes: clean, a touch more contrast
    "mod": dict(lut=make_lut(lift=0.0, contrast=0.06, tint=(1.0, 1.0, 1.0)), sat=0.97, vig=0.16),
    "none": dict(lut=None, sat=1.0, vig=0.06),
}


def apply_grade(img, grade):
    g = GRADES[grade]
    if g["lut"] is not None:
        img = img.point(g["lut"])
    if g["sat"] != 1.0:
        img = ImageEnhance.Color(img).enhance(g["sat"])
    return img


_vig = {}


def vignette(strength):
    if strength not in _vig:
        yy, xx = np.mgrid[0:AH, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - AH / 2) / (AH / 2)) ** 2) / math.sqrt(2)
        m = 1 - strength * np.clip((r - 0.35) / 0.65, 0, 1) ** 1.7
        a = (np.clip(m, 0, 1) * 255).astype(np.uint8)
        _vig[strength] = Image.merge("RGB", [Image.fromarray(a)] * 3)
    return _vig[strength]


_leaks = None


def leak_layers():
    """Two soft orange 'light leak' gradients (historical scenes only), screen-blended with slow pulsing."""
    global _leaks
    if _leaks is None:
        out = []
        for (cx, cy, rx, ry, col) in [(-0.05, 0.25, 0.55, 0.9, (255, 150, 60)), (1.05, 0.85, 0.5, 0.7, (255, 120, 50))]:
            yy, xx = np.mgrid[0:AH // 4, 0:W // 4].astype(np.float32)
            d = np.sqrt(((xx / (W / 4) - cx) / rx) ** 2 + ((yy / (AH / 4) - cy) / ry) ** 2)
            a = np.clip(1 - d, 0, 1) ** 2.2
            arr = (a[..., None] * np.array(col, dtype=np.float32)).astype(np.uint8)
            out.append(Image.fromarray(arr).resize((W, AH), Image.BILINEAR))
        _leaks = out
    return _leaks


def add_leak(img, t):
    l1, l2 = leak_layers()
    k1 = 0.10 + 0.08 * math.sin(2 * math.pi * t / 7.3)
    k2 = 0.07 + 0.06 * math.sin(2 * math.pi * t / 5.1 + 1.3)
    img = ImageChops.screen(img, l1.point(lambda v: int(v * k1)))
    return ImageChops.screen(img, l2.point(lambda v: int(v * k2)))


_sprites = None


def add_dust(img, t, seed):
    """Floating sawdust motes for the workshop scenes: cheap additive sprites drifting in the light."""
    global _sprites
    if _sprites is None:
        _sprites = []
        for r in (2.0, 3.0, 4.5):
            n = int(r * 4) | 1
            yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
            g = np.exp(-(((xx - n // 2) ** 2 + (yy - n // 2) ** 2) / (2 * (r / 2) ** 2)))
            _sprites.append(g)
    rng = np.random.default_rng(seed)
    n = 70
    x0, y0 = rng.uniform(0, W, n), rng.uniform(0, AH, n)
    vx, vy = rng.uniform(-9, 9, n), rng.uniform(-14, -3, n)
    ph, fr = rng.uniform(0, 6.28, n), rng.uniform(0.15, 0.5, n)
    size = rng.integers(0, 3, n)
    bright = rng.uniform(0.25, 0.9, n)
    arr = np.asarray(img).astype(np.int16)
    for i in range(n):
        x = (x0[i] + vx[i] * t + 14 * math.sin(ph[i] + fr[i] * t * 2)) % W
        y = (y0[i] + vy[i] * t + 9 * math.sin(ph[i] * 1.7 + fr[i] * t * 1.3)) % AH
        tw = 0.6 + 0.4 * math.sin(ph[i] * 3 + t * fr[i] * 9)
        sp = _sprites[size[i]]
        h = sp.shape[0]
        xi, yi = int(x) - h // 2, int(y) - h // 2
        if xi < 0 or yi < 0 or xi + h > W or yi + h > AH:
            continue
        add = (sp * (150 * bright[i] * tw))[..., None] * np.array([1.0, 0.86, 0.62], dtype=np.float32)
        arr[yi:yi + h, xi:xi + h] += add.astype(np.int16)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- sources
_src = {}


def still_source(shot):
    """Graded source, pre-scaled so the tightest window of the move is ~1920 px wide (never upscaled here)."""
    key = (shot["src"], shot["grade"], min(shot["win"][0][2], shot["win"][1][2]))
    if key not in _src:
        im = Image.open(os.path.join(ARGS.src, "stills", shot["src"] + ".png")).convert("RGB")
        scale = min(1.0, W / (key[2] * im.width))
        if scale < 0.999:
            im = im.resize((int(round(im.width * scale)), int(round(im.height * scale))), Image.LANCZOS)
        _src[key] = apply_grade(im, shot["grade"])
        if len(_src) > 6:
            _src.pop(next(iter(_src)))
    return _src[key]


_vid = {}


def video_frame(name, idx):
    if name not in _vid:
        raw = os.path.join(ARGS.out, "cache", name + ".rgb")
        if not os.path.exists(raw):
            os.makedirs(os.path.dirname(raw), exist_ok=True)
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", os.path.join(ARGS.src, "clips", name + ".mp4"),
                            "-vf", "scale=1920:1080:flags=lanczos", "-pix_fmt", "rgb24", "-f", "rawvideo", raw], check=True)
        _vid[name] = np.memmap(raw, dtype=np.uint8, mode="r").reshape(-1, 1080, 1920, 3)
    v = _vid[name]
    return v[min(max(idx, 0), len(v) - 1)]


# ---------------------------------------------------------------- end card
_card = {}


def card_frame(t):
    """Cream card, the real logo file (multiplied on the card so its own background disappears), exact end text."""
    if not _card:
        yy, xx = np.mgrid[0:AH, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - AH * 0.42) / AH) ** 2)
        shade = 1 - 0.07 * np.clip(r / 0.75, 0, 1) ** 2
        base = (shade[..., None] * np.array(CARD, dtype=np.float32)).astype(np.uint8)
        _card["base"] = Image.fromarray(base)
        logo = Image.open(ARGS.logo).convert("RGB")
        logo = logo.point(lambda v: min(255, int(v * 255 / 251 + 0.5)))      # the file's background is 251 -> pure white
        lw = 640
        logo = logo.resize((lw, int(round(logo.height * lw / logo.width))), Image.LANCZOS)
        _card["logo"] = logo
        _card["l1"] = text_layer(FINAL_LINES[0], font("Fraunces-500.ttf", 40), INK)
        _card["l234"] = [text_layer(s, font("Inter-600.ttf", 23), INK, tracking=0.30) for s in FINAL_LINES[1:]]
        _card["close"] = [text_layer(s, font("Fraunces-500.ttf", 44), INK) for s in CLOSE_LINES]
        _card["d_en"] = text_layer(DISCLOSURE_EN, font("Inter-400.ttf", 17), GREY, tracking=0.06)
        _card["d_ar"] = text_layer(DISCLOSURE_AR, font("PlexAr-500.ttf", 19), GREY, rtl=True)
    img = _card["base"].copy()
    t_logo = 110.25
    a = smooth((t - t_logo) / 1.3)
    if a > 0:
        logo = _card["logo"]
        sc = 0.965 + 0.035 * ease_out((t - t_logo) / 2.4)
        lw, lh = int(round(logo.width * sc)), int(round(logo.height * sc))
        lg = logo.resize((lw, lh), Image.BICUBIC) if sc < 0.999 else logo
        x, y = (W - lw) // 2, 300 - lh // 2
        region = img.crop((x, y, x + lw, y + lh))
        mult = ImageChops.multiply(region, lg)
        img.paste(Image.blend(region, mult, a), (x, y))
    f = img.convert("RGBA")
    # final screen text, one line per narration beat, then the emotional close in the same place
    t_swap = 117.75
    out = smooth((t_swap - t) / 0.6)
    d = ImageDraw.Draw(f)
    rule = smooth((t - 111.9) / 0.8)
    if rule > 0:
        half = int(60 * rule)
        d.line([(W // 2 - half, 532), (W // 2 + half, 532)], fill=ORANGE + (int(255 * rule),), width=2)
    for layer, y, ts in [(_card["l1"], 560, 112.2)] + [(l, 646 + 50 * i, 113.5 + 1.15 * i) for i, l in enumerate(_card["l234"])]:
        op = smooth((t - ts) / 0.7) * out
        put(f, layer, W // 2, y - 24 + int(10 * (1 - ease_out((t - ts) / 0.9))), op)
    for i, layer in enumerate(_card["close"]):
        ts = 118.1 + 0.75 * i
        op = smooth((t - ts) / 0.8)
        put(f, layer, W // 2, 562 + 66 * i - 24 + int(10 * (1 - ease_out((t - ts) / 1.0))), op)
    op = smooth((t - 119.6) / 1.0) * 0.9
    if op > 0:
        gap = 34
        total = _card["d_en"].width + _card["d_ar"].width - 96 + gap
        x0 = (W - total) // 2
        put(f, _card["d_en"], x0 - 24, 858, op, anchor="l")
        put(f, _card["d_ar"], x0 + total + 24, 852, op, anchor="r")
        d.ellipse([x0 + _card["d_en"].width - 48 + gap // 2 - 2, 890, x0 + _card["d_en"].width - 48 + gap // 2 + 2, 894],
                  fill=GREY + (int(255 * op),))
    return f.convert("RGB")


# ---------------------------------------------------------------- shot rendering
def shot_frame(shot, t):
    """The 1920x960 picture of one shot at film time t (motion keeps running through the next shot's dissolve)."""
    if shot["kind"] == "card":
        return card_frame(t)
    if shot["kind"] == "video":
        idx = shot["vstart"] + int(round((t - shot["t0"]) * FPS))
        fr = Image.fromarray(video_frame(shot["src"], idx)).crop((0, shot["vy"], W, shot["vy"] + AH))
        img = apply_grade(fr, shot["grade"])
    else:
        src = still_source(shot)
        p = clamp((t - shot["t0"]) / (shot["t1"] + shot["tail"] - shot["t0"]))
        (ax, ay, aw), (bx, by, bw) = shot["win"]
        cx, cy, wf = ax + (bx - ax) * p, ay + (by - ay) * p, aw * (bw / aw) ** p      # exponential zoom = constant visual speed
        ww = wf * src.width
        wh = ww * AH / W
        x0, y0 = cx * src.width - ww / 2, cy * src.height - wh / 2
        x0 = clamp(x0, 0, src.width - ww)
        y0 = clamp(y0, 0, src.height - wh)
        img = src.transform((W, AH), Image.EXTENT, (x0, y0, x0 + ww, y0 + wh), Image.BICUBIC)
    if shot.get("dust"):
        img = add_dust(img, t, sum(ord(c) * (i + 3) for i, c in enumerate(shot["id"])))
    if shot.get("leak"):
        img = add_leak(img, t)
    return ImageChops.multiply(img, vignette(GRADES[shot["grade"]]["vig"]))


def picture(t):
    i = max(k for k, s in enumerate(SHOTS) if s["t0"] <= t)
    cur = SHOTS[i]
    img = shot_frame(cur, t)
    if i > 0 and cur["xin"] > 0 and t < cur["t0"] + cur["xin"]:
        a = smooth((t - cur["t0"]) / cur["xin"])
        img = Image.blend(shot_frame(SHOTS[i - 1], t), img, a)
    for (tf, hw, col, k) in FLASHES:
        a = 1 - abs(t - tf) / hw
        if a > 0:
            img = Image.blend(img, Image.new("RGB", img.size, col), k * smooth(a))
    return img, cur


# ---------------------------------------------------------------- overlays (all text is typeset here)
_ov = {}


def overlay_title(f, t):
    if not (0.5 < t < 6.2):
        return
    if "title" not in _ov:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / 900) ** 2 + ((yy - H / 2) / 420) ** 2)
        a = (np.clip(1 - r, 0, 1) ** 1.2 * 190).astype(np.uint8)
        scrim = Image.new("RGBA", (W, H), (10, 6, 4, 0))
        scrim.putalpha(Image.fromarray(a))
        _ov["title"] = dict(
            scrim=scrim,
            eyebrow=text_layer("THE CLOSETS", font("Inter-600.ttf", 30), (255, 236, 214), tracking=0.46, shadow=0.6),
            main=text_layer("THE JOURNEY OF AMBITION", font("Fraunces-500.ttf", 88), WHITE, tracking=0.012, shadow=0.7),
            ar1=text_layer("الخزائن", font("NaskhAr-600.ttf", 62), WHITE, rtl=True, shadow=0.7),
            ar2=text_layer("حكاية طموح", font("NaskhAr-600.ttf", 62), WHITE, rtl=True, shadow=0.7),
        )
    o = _ov["title"]
    out = smooth((5.9 - t) / 0.9)
    put(f, o["scrim"], W // 2, 0, envelope(t, 0.5, 1.0, 6.1, 1.0))
    e = lambda ts: smooth((t - ts) / 0.9) * out
    rise = lambda ts: int(14 * (1 - ease_out((t - ts) / 1.2)))
    put(f, o["eyebrow"], W // 2, 392 - 24 + rise(0.8), e(0.8))
    a = e(1.1)
    if a > 0:
        half = int(46 * smooth((t - 1.1) / 0.9))
        ImageDraw.Draw(f).line([(W // 2 - half, 452), (W // 2 + half, 452)], fill=ORANGE + (int(255 * a),), width=3)
    put(f, o["main"], W // 2, 474 - 24 + rise(1.2), e(1.2))
    # Arabic line "الخزائن — حكاية طموح": right-to-left, the dash is drawn (the Arabic face has no em dash)
    y = 600 - 24 + rise(1.7)
    w1, w2, dash, gap = o["ar1"].width - 48, o["ar2"].width - 48, 46, 22
    total = w1 + w2 + dash + 2 * gap
    xr = (W + total) // 2
    put(f, o["ar1"], xr + 24, y, e(1.7), anchor="r")
    xd = xr - w1 - gap
    a = e(1.7)
    if a > 0:
        asc = font("NaskhAr-600.ttf", 62).getmetrics()[0]
        yd = y + 24 + asc - 17
        ImageDraw.Draw(f).line([(xd - dash, yd), (xd, yd)], fill=WHITE + (int(235 * a),), width=3)
    put(f, o["ar2"], xd - dash - gap + 24, y, e(1.7), anchor="r")


def overlay_locations(f, t):
    for sid, en, ar in LOCATIONS:
        s = next(x for x in SHOTS if x["id"] == sid)
        op = envelope(t, s["t0"] + 0.12, 0.35, s["t1"] + 0.02, 0.3)
        if op <= 0:
            continue
        if sid not in _ov:
            _ov[sid] = (text_layer(en, font("Inter-600.ttf", 30), WHITE, tracking=0.30, shadow=0.8),
                        text_layer(ar, font("PlexAr-500.ttf", 37), WHITE, rtl=True, shadow=0.8))
        le, la = _ov[sid]
        x, y = 118, H - BAR - 124
        d = ImageDraw.Draw(f)
        d.rectangle([x - 22, y + 2, x - 18, y + 42], fill=ORANGE + (int(255 * op),))
        put(f, le, x - 24, y - 24 + 3, op, anchor="l")
        xa = x + le.width - 48 + 26
        d.line([(xa, y + 6), (xa, y + 38)], fill=(255, 255, 255, int(150 * op)), width=1)
        put(f, la, xa + 22 - 24, y - 24 - 11, op, anchor="l")


def overlay_10k(f, t):
    t_in, t_out = 51.55, 56.6
    op = envelope(t, t_in, 0.5, t_out, 0.7)
    if op <= 0:
        return
    if "10k" not in _ov:
        fn = font("Fraunces-600.ttf", 236)
        cell = max(fn.getlength(ch) for ch in "0123456789")
        _ov["10k"] = dict(
            fn=fn, cell=cell, comma=fn.getlength(","),
            top=text_layer("MORE THAN", font("Inter-600.ttf", 30), (255, 236, 214), tracking=0.44, shadow=0.7),
            bottom=text_layer("PROJECTS COMPLETED", font("Inter-600.ttf", 40), WHITE, tracking=0.34, shadow=0.7),
            scrim=Image.new("RGBA", (W, H), (8, 5, 4, 255)),
        )
    o = _ov["10k"]
    put(f, o["scrim"], W // 2, 0, 0.46 * op)
    put(f, o["top"], W // 2, 318 - 24, op)
    value = int(round(10000 * ease_out((t - t_in - 0.1) / 1.9)))
    s = f"{value:,}"
    widths = [o["comma"] if ch == "," else o["cell"] for ch in s]
    full = o["cell"] * 5 + o["comma"]                      # keep the block where "10,000" will sit
    layer = Image.new("RGBA", (int(full) + 80, 330), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 40 + (full - sum(widths)) / 2
    for ch, wch in zip(s, widths):
        off = 0 if ch == "," else (o["cell"] - o["fn"].getlength(ch)) / 2
        d.text((x + off + 3, 14), ch, font=o["fn"], fill=(0, 0, 0, 120))
        d.text((x + off, 10), ch, font=o["fn"], fill=WHITE + (255,))
        x += wch
    put(f, layer, W // 2, 352, op)
    a = smooth((t - t_in - 1.0) / 0.6) * op
    if a > 0:
        half = int(70 * smooth((t - t_in - 1.0) / 0.8))
        ImageDraw.Draw(f).line([(W // 2 - half, 668), (W // 2 + half, 668)], fill=ORANGE + (int(255 * a),), width=3)
    put(f, o["bottom"], W // 2, 690 - 24, smooth((t - t_in - 0.9) / 0.7) * op)


def overlay_network(f, t):
    """'One integrated digital system': the functions the narration lists, drawn as a connected graph over the dashboards."""
    t_in, t_out = 93.3, 98.55
    op = envelope(t, t_in, 0.6, t_out, 0.5)
    if op <= 0:
        return
    if "net" not in _ov:
        _ov["net"] = dict(
            scrim=Image.new("RGBA", (W, H), (6, 10, 16, 255)),
            ar=text_layer("منظومة رقمية متكاملة", font("NaskhAr-600.ttf", 50), WHITE, rtl=True, shadow=0.6),
            en=text_layer("ONE INTEGRATED DIGITAL SYSTEM", font("Inter-600.ttf", 21), (255, 222, 190), tracking=0.36, shadow=0.6),
            labels=[text_layer(n, font("Inter-600.ttf", 19), WHITE, tracking=0.16, shadow=0.7) for n in NODES],
        )
    o = _ov["net"]
    put(f, o["scrim"], W // 2, 0, 0.62 * op)
    put(f, o["ar"], W // 2, 118 - 24, smooth((t - t_in - 0.1) / 0.6) * op)
    put(f, o["en"], W // 2, 204 - 24, smooth((t - t_in - 0.3) / 0.6) * op)
    cx, cy, rx, ry = W // 2, 606, 590, 232
    ss = 2                                               # supersample the line work
    g = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    pts = []
    for i in range(len(NODES)):
        ang = -math.pi / 2 + 2 * math.pi * i / len(NODES)
        pts.append((cx + rx * math.cos(ang), cy + ry * math.sin(ang), ang))
    hub = smooth((t - t_in - 0.2) / 0.5)
    for rr, al in ((54, 70), (36, 120)):
        d.ellipse([(cx - rr) * ss, (cy - rr) * ss, (cx + rr) * ss, (cy + rr) * ss], outline=ORANGE + (int(al * hub),), width=2 * ss)
    d.ellipse([(cx - 13) * ss, (cy - 13) * ss, (cx + 13) * ss, (cy + 13) * ss], fill=ORANGE + (int(255 * hub),))
    for i, (x, y, ang) in enumerate(pts):
        ts = t_in + 0.45 + i * 0.13
        grow = ease_out((t - ts) / 0.45)
        if grow <= 0:
            continue
        dist = math.hypot(x - cx, y - cy)
        sx, sy = cx + 56 * (x - cx) / dist, cy + 56 * (y - cy) / dist
        ex, ey = sx + (x - sx) * grow, sy + (y - sy) * grow
        d.line([(sx * ss, sy * ss), (ex * ss, ey * ss)], fill=(255, 255, 255, 120), width=ss + 1)
        if grow > 0.98:
            j = (i + 1) % len(pts)
            ring = smooth((t - ts - 0.45) / 0.5)
            if ring > 0:
                nx, ny = pts[j][0], pts[j][1]
                d.line([(x * ss, y * ss), ((x + (nx - x) * ring) * ss, (y + (ny - y) * ring) * ss)], fill=ORANGE + (150,), width=ss + 1)
            d.ellipse([(x - 9) * ss, (y - 9) * ss, (x + 9) * ss, (y + 9) * ss], fill=WHITE + (255,))
            d.ellipse([(x - 15) * ss, (y - 15) * ss, (x + 15) * ss, (y + 15) * ss], outline=ORANGE + (220,), width=2 * ss)
    put(f, g.resize((W, H), Image.LANCZOS), W // 2, 0, op)
    for i, (x, y, ang) in enumerate(pts):
        ts = t_in + 0.45 + i * 0.13 + 0.35
        a = smooth((t - ts) / 0.4) * op
        if a <= 0:
            continue
        lab = o["labels"][i]
        c, s = math.cos(ang), math.sin(ang)
        lx, ly = x + 30 * c, y + 30 * s
        if c > 0.3:
            put(f, lab, lx - 24, ly - lab.height / 2, a, anchor="l")
        elif c < -0.3:
            put(f, lab, lx + 24, ly - lab.height / 2, a, anchor="r")
        else:
            put(f, lab, lx, ly - lab.height / 2 + (16 if s > 0 else -16), a)


def render_frame(n):
    t = n / FPS
    img, cur = picture(t)
    frame = Image.new("RGB", (W, H), (0, 0, 0))
    frame.paste(img, (0, BAR))
    if (0.5 < t < 6.2) or (41.9 < t < 50.2) or (51.4 < t < 56.7) or (93.2 < t < 98.6):
        f = frame.convert("RGBA")
        overlay_title(f, t)
        overlay_locations(f, t)
        overlay_10k(f, t)
        overlay_network(f, t)
        frame = f.convert("RGB")
    fade = min(smooth(t / 1.1), smooth((DUR - 0.15 - t) / 1.4))
    if fade < 0.999:
        frame = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), frame, fade)
    return frame


def render_chunk(args, a, b, path):
    global ARGS
    ARGS = args
    enc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "8",
                            "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv", path], stdin=subprocess.PIPE)
    for n in range(a, b):
        enc.stdin.write(render_frame(n).tobytes())
    enc.stdin.close()
    enc.wait()


def main():
    global ARGS
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--logo", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--frames", help="comma list of times (s) to save as JPEG stills instead of rendering the film")
    ap.add_argument("--edl", action="store_true", help="print the edit decision list as JSON and exit")
    ARGS = ap.parse_args()
    os.makedirs(ARGS.out, exist_ok=True)
    if ARGS.edl:
        print(json.dumps(dict(duration=DUR, fps=FPS, narration_segments=NARR_SEGMENTS,
                              shots=[{k: v for k, v in s.items()} for s in SHOTS]), indent=1))
        return
    if ARGS.frames:
        os.makedirs(os.path.join(ARGS.out, "frames"), exist_ok=True)
        for ts in ARGS.frames.split(","):
            render_frame(int(round(float(ts) * FPS))).save(os.path.join(ARGS.out, "frames", f"f_{float(ts):07.2f}.jpg"), quality=88)
        return
    for s in SHOTS:                                   # decode the clips once, before forking
        if s["kind"] == "video":
            video_frame(s["src"], 0)
    _vid.clear()
    step = math.ceil(NF / ARGS.jobs)
    procs, parts = [], []
    for k in range(ARGS.jobs):
        a, b = k * step, min(NF, (k + 1) * step)
        path = os.path.join(ARGS.out, f"part{k}.mkv")
        parts.append(path)
        p = Process(target=render_chunk, args=(ARGS, a, b, path))
        p.start()
        procs.append(p)
    for p in procs:
        p.join()
        if p.exitcode:
            sys.exit("render failed")
    lst = os.path.join(ARGS.out, "parts.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                    os.path.join(ARGS.out, "picture.mkv")], check=True)
    print("picture master:", os.path.join(ARGS.out, "picture.mkv"))


if __name__ == "__main__":
    main()
