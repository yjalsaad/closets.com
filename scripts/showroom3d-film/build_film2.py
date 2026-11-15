#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render film v2 "THE CLOSETS - THE JOURNEY OF AMBITION" from the owner's NEW Arabic script.

Re-uses the v1 pipeline (build_film.py: grading, camera moves, dissolves, light leaks, dust, type helpers) and replaces the
edit, the overlays and the end card. Differences from v1:
  * every shot time is derived from the narration word timings (journey2_script.align_lines), so the edit follows the voice;
  * TWO REAL PHOTOGRAPHS of company leaders are used as real photographs (slow Ken Burns inside a frame over a blurred,
    graded backdrop of the same photo): no model ever sees them, no AI face generation, no AI upscaling;
  * the end card carries the honest label (real photographs + AI-generated illustration) and the standard disclaimer.

Usage:
  python3 fetch_sources2.py  <src-dir>                    # downloads v1 + v2 sources from the ledgers, spends nothing
  python3 prepare_fonts.py   <node_modules> <fonts-dir>
  python3 build_film2.py --src <src-dir> --fonts <fonts-dir> --logo <official-logo.jpg> --leaders <dir with p1.png p2.png> --out <work-dir>
  python3 mix_audio2.py      <src-dir> <work-dir>
  python3 encode_film2.py    <work-dir> <public/yas-bloom/film>
The leaders' photographs are NOT in the repository (only the finished film frames are); <dir> holds the two processed images
(prepare_leaders.py makes them from the originals).
"""
import json
import math
import os
import subprocess
import sys
from multiprocessing import Process

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

# the argument --leaders is ours; strip it before build_film's parser sees it
LEADERS_DIR = None
if "--leaders" in sys.argv:
    k = sys.argv.index("--leaders")
    LEADERS_DIR = sys.argv[k + 1]
    del sys.argv[k:k + 2]

import build_film as B                                  # noqa: E402  (v1 helpers; module globals are patched below)
import journey2_script as J                              # noqa: E402
from build_film import (W, H, FPS, AH, BAR, INK, ORANGE, GREY, CARD, WHITE, clamp, smooth, ease_out, envelope, font,   # noqa: E402
                        text_layer, put, apply_grade, vignette, GRADES)

# ---------------------------------------------------------------- facts typeset on screen: ONE constant each, easy to change
# (the owner's script says "more than fifty thousand projects" and "more than twenty-seven patents"; the repo's decks still say 10,000+)
PROJECTS_COUNT = 50000
PATENTS_COUNT = 27
LOWER_THIRD = None        # clean slot for the leaders' names/titles (owner has not supplied them): {"en": "...", "ar": "..."} fills it

# ---------------------------------------------------------------- narration timing
OFF = 2.0                                     # the voice starts 2 s into the film
DUR = 219.0
END_T = 208.2                                 # end card starts
B.DUR = DUR
B.NF = int(round(DUR * FPS))
B.NARR_SEGMENTS[:] = [(0.0, OFF)]
B.NARR_END = 205.4

_WORDS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "showroom3d", "film-src",
                                    "journey2-narration.words.json"), encoding="utf-8"))["words"]
LINE_T, _m, _n = J.align_lines(_WORDS)
TOK = J.LAST_TOKENS


def tl(n):
    """film time at which script line n (1-based) starts"""
    return round(LINE_T[n - 1]["s"] + OFF, 2)


def tw(n, k, end=False):
    """film time of the k-th (0-based) word of script line n"""
    toks = [t for t in TOK if t[0] == n - 1]
    return round(toks[k][2 if end else 1] + OFF, 2)


# ---------------------------------------------------------------- edit decision list
# win = ((cx, cy, wfrac) start, (cx, cy, wfrac) end): centre and width of the 2:1 window as fractions of the source
SHOTS = [
    # --- 01 an idea on paper, the workshop in Bahrain (lines 1-5)
    dict(id="A01", t0=0.0, src="n_sketch", grade="hist", win=((0.50, 0.48, 1.00), (0.40, 0.40, 0.72)), xin=0, dust=True),
    dict(id="A02", t0=tl(3), kind="video", src="v6_dawn", grade="mod", vstart=0, vy=70, xin=0.8),
    dict(id="A03", t0=tl(4), kind="video", src="v1_workshop", grade="hist", vstart=0, vy=20, xin=0.8, dust=True, leak=True),
    dict(id="A04", t0=round(tl(4) + 5.0, 2), src="1e", grade="hist", win=((0.56, 0.50, 0.98), (0.52, 0.50, 0.86)), xin=0.3, dust=True, leak=True),
    dict(id="A05", t0=tl(5), src="2a", grade="hist", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.88)), xin=0.5, dust=True, leak=True),
    # --- 02 two factories, 50,000 projects (lines 6-8)
    dict(id="B01", t0=tl(6), src="3a", grade="mod", win=((0.50, 0.52, 1.00), (0.50, 0.50, 0.90)), xin=0.5),
    dict(id="B02", t0=round(tl(6) + 4.0, 2), kind="video", src="v2_cnc", grade="mod", vstart=10, vy=60, xin=0.4),
    dict(id="B03", t0=tl(7), src="2c", grade="hist", win=((0.52, 0.42, 0.50), (0.50, 0.42, 0.44)), xin=0.4),
    dict(id="B04", t0=round(tl(7) + 2.3, 2), src="5a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.93)), xin=0.3),
    dict(id="B05", t0=round(tl(7) + 4.5, 2), src="5c", grade="mod", win=((0.47, 0.50, 0.94), (0.53, 0.50, 0.94)), xin=0),
    dict(id="B06", t0=round(tl(7) + 6.6, 2), src="5b", grade="mod", win=((0.50, 0.50, 0.93), (0.50, 0.50, 1.00)), xin=0),
    dict(id="B07", t0=round(tl(7) + 8.7, 2), src="5d", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.49, 0.92)), xin=0),
    # --- 03 signature projects (line 8), generic AI imagery only
    dict(id="C01", t0=tl(8), src="lm_bluehour", grade="mod", win=((0.62, 0.52, 1.00), (0.66, 0.50, 0.86)), xin=0.5),
    dict(id="C02", t0=tw(8, 6), src="n_marassi", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.4),
    dict(id="C03", t0=tw(8, 8), src="lm_durrat", grade="mod", win=((0.50, 0.55, 1.00), (0.50, 0.50, 0.88)), xin=0.4),
    dict(id="C04", t0=tw(8, 10), src="n_waterbay", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.4),
    dict(id="C05", t0=tw(8, 12), src="n_housing", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.4),
    # --- 04 experience, then the pandemic (lines 9-12)
    dict(id="D01", t0=tl(9), src="5e", grade="mod", win=((0.50, 0.50, 0.98), (0.48, 0.48, 0.90)), xin=0.5),
    dict(id="D02", t0=tl(10), src="7a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.5),
    dict(id="D03", t0=tl(11), src="n_ships", grade="cold", win=((0.50, 0.55, 1.00), (0.50, 0.52, 0.90)), xin=0.8),
    dict(id="D04", t0=tl(12), kind="video", src="v7_port", grade="cold", vstart=0, vy=60, xin=0.6),
    dict(id="D05", t0=tw(12, 5), src="n_shelves", grade="cold", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.5),
    # --- 05 the question and the birth of Yas Factory (lines 13-17)
    dict(id="E01", t0=tl(13), src="lm_fort", grade="mod", win=((0.55, 0.50, 1.00), (0.60, 0.50, 0.88)), xin=0.8),
    dict(id="E02", t0=tl(14), src="lm_tree", grade="mod", win=((0.50, 0.55, 1.00), (0.50, 0.50, 0.84)), xin=0.6),
    dict(id="E03", t0=tl(15), src="n_site", grade="mod", win=((0.50, 0.50, 1.00), (0.55, 0.50, 0.88)), xin=0.8),
    dict(id="E04", t0=tl(16), kind="video", src="v4_press", grade="mod", vstart=0, vy=60, xin=0.5),
    dict(id="E05", t0=tl(17), src="n_clad", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.88)), xin=0.5),
    dict(id="E06", t0=tw(17, 9), src="6b", grade="mod", win=((0.50, 0.47, 0.96), (0.52, 0.47, 0.90)), xin=0.4),
    dict(id="E07", t0=tw(17, 11), src="n_products", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.86)), xin=0.4),
    dict(id="E08", t0=tw(17, 13), src="n_export", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.4),
    # --- 06 to the region, exclusive designs, patents (lines 18-22)
    dict(id="F01", t0=tl(18), kind="video", src="v5_causeway", grade="mod", vstart=0, vy=60, xin=0.6),
    dict(id="F02", t0=round(tl(18) + 5.05, 2), src="map", kind="map", grade="none", xin=0.5),
    dict(id="F03", t0=tl(20), src="n_swatch", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.84)), xin=0.6),
    dict(id="F04", t0=round(tl(20) + 6.0, 2), src="7e", grade="mod", win=((0.50, 0.50, 0.95), (0.52, 0.50, 0.85)), xin=0.5),
    dict(id="F05", t0=tl(21), src="n_profiles", grade="mod", win=((0.62, 0.55, 1.00), (0.55, 0.55, 0.80)), xin=0.5),
    dict(id="F06", t0=tl(22), src="n_profile_macro", grade="mod", win=((0.50, 0.50, 1.00), (0.52, 0.52, 0.84)), xin=0.5),
    dict(id="F07", t0=round(tl(22) + 5.8, 2), src="3d", grade="mod", win=((0.50, 0.47, 0.97), (0.50, 0.46, 0.90)), xin=0.4),
    dict(id="F08", t0=round(tl(22) + 10.0, 2), src="3c", grade="mod", win=((0.48, 0.50, 1.00), (0.52, 0.50, 0.88)), xin=0.4),
    # --- 07 the new chapter: leaders, deals, the digital system (lines 23-25)
    dict(id="G01", t0=tl(23), kind="leaders", src="pair", grade="mod", dirn=1, xin=0.9),
    dict(id="G02", t0=round(tl(23) + 5.8, 2), src="n_signing", grade="mod", win=((0.62, 0.66, 0.72), (0.60, 0.68, 0.62)), xin=0.8),
    dict(id="G03", t0=round(tl(24) + 6.3, 2), src="lm_bwtc", grade="mod", win=((0.62, 0.52, 1.00), (0.60, 0.52, 0.80)), xin=0.6),
    dict(id="G04", t0=tl(25), src="3b", grade="mod", win=((0.74, 0.45, 0.60), (0.76, 0.44, 0.54)), xin=0.6),
    dict(id="G05", t0=round(tl(25) + 3.4, 2), src="7b", grade="mod", win=((0.50, 0.50, 0.98), (0.48, 0.50, 0.88)), xin=0.4),
    dict(id="G06", t0=round(tl(25) + 6.8, 2), src="7d", grade="mod", win=((0.50, 0.48, 1.00), (0.60, 0.42, 0.80)), xin=0.5),
    # --- 08 the stage direction: wide factory and capacity, finished product detail (lines 26-28)
    dict(id="H01", t0=tl(26), src="n_wide", grade="mod", win=((0.50, 0.55, 1.00), (0.50, 0.52, 0.86)), xin=0.5),
    dict(id="H02", t0=tl(27), src="n_detail", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.88)), xin=0.3),
    dict(id="H03", t0=tl(28), kind="video", src="v3_drone", grade="mod", vstart=0, vy=30, xin=0.4),
    # --- 09 the investment call (lines 29-31)
    dict(id="I01", t0=tl(29), kind="leaders", src="p1", grade="mod", dirn=1, xin=0.8),
    dict(id="I02", t0=tl(30), src="8a", grade="mod", win=((0.50, 0.50, 1.00), (0.50, 0.50, 0.90)), xin=0.8),
    dict(id="I03", t0=tw(30, 4), src="n_profiles", grade="mod", win=((0.30, 0.50, 0.60), (0.36, 0.50, 0.52)), xin=0.4),
    dict(id="I04", t0=tw(30, 7), src="lm_bwtc", grade="mod", win=((0.50, 0.52, 1.00), (0.55, 0.50, 0.84)), xin=0.5),
    dict(id="I05", t0=tl(31), kind="leaders", src="p2", grade="mod", dirn=-1, xin=0.9),
    dict(id="I06", t0=tw(31, 10), src="lm_dawn", grade="mod", win=((0.70, 0.52, 0.80), (0.64, 0.50, 0.70)), xin=0.8),
    dict(id="I07", t0=tw(31, 17), src="7d", grade="mod", win=((0.62, 0.42, 0.70), (0.55, 0.44, 0.62)), xin=0.5),
    # --- 10 close (lines 32-34) and the end card
    dict(id="J01", t0=tl(32), src="1d", grade="hist", win=((0.43, 0.47, 0.55), (0.44, 0.48, 0.50)), xin=0.5, dust=True),
    dict(id="J02", t0=tl(33), src="lm_causeway", grade="mod", win=((0.50, 0.52, 1.00), (0.50, 0.50, 0.86)), xin=0.5),
    dict(id="J03", t0=tl(34), kind="leaders", src="pair", grade="mod", dirn=-1, xin=0.9),
    dict(id="K01", t0=END_T, kind="card", src="card", grade="none", xin=0.8),
]
for _i, _s in enumerate(SHOTS):
    _s.setdefault("kind", "still")
    _s["t1"] = SHOTS[_i + 1]["t0"] if _i + 1 < len(SHOTS) else DUR
    _s["tail"] = SHOTS[_i + 1]["xin"] if _i + 1 < len(SHOTS) else 0.0
    assert _s["t1"] > _s["t0"], _s["id"]
B.SHOTS[:] = SHOTS
B.FLASHES[:] = [(tl(23), 0.30, (255, 236, 214), 0.25), (END_T, 0.55, (255, 240, 222), 0.30)]

# cold grade for the pandemic beat: desaturated, slightly blue
GRADES["cold"] = dict(lut=B.make_lut(lift=0.02, contrast=0.05, gamma=1.02, tint=(0.96, 0.99, 1.04)), sat=0.80, vig=0.26)

# ---------------------------------------------------------------- video: streamed, no raw cache (disk is tight)


class VideoStream:
    def __init__(self, name):
        self.name = name
        self.proc = None
        self.pos = -1
        self.last = None

    def _open(self):
        if self.proc:
            self.proc.kill()
        self.proc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", os.path.join(B.ARGS.src, "clips", self.name + ".mp4"),
                                      "-vf", "scale=1920:1080:flags=lanczos", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"],
                                     stdout=subprocess.PIPE)
        self.pos = -1

    def get(self, idx):
        idx = max(idx, 0)
        if self.proc is None or idx < self.pos:
            self._open()
        while self.pos < idx:
            raw = self.proc.stdout.read(1920 * 1080 * 3)
            if len(raw) < 1920 * 1080 * 3:          # clip ended: hold the last frame
                return self.last
            self.last = np.frombuffer(raw, dtype=np.uint8).reshape(1080, 1920, 3)
            self.pos += 1
        return self.last


_streams = {}


def video_frame(name, idx):
    key = (os.getpid(), name)
    if key not in _streams:
        _streams[key] = VideoStream(name)
    return _streams[key].get(idx)


B.video_frame = video_frame

# ---------------------------------------------------------------- the leaders (REAL photographs)
_lead = {}


def lead_img(k):
    if k not in _lead:
        im = Image.open(os.path.join(LEADERS_DIR or B.ARGS.leaders, k + ".png")).convert("RGB")
        _lead[k] = apply_grade(im, "mod")
    return _lead[k]


def backdrop(layout):
    """a heavily blurred, darkened, warm-graded version of the same photograph(s), full frame"""
    key = "bd_" + layout
    if key in _lead:
        return _lead[key]

    def cover(im, w, h, cy=0.45):
        sc = max(w / im.width, h / im.height)
        r = im.resize((int(im.width * sc) + 1, int(im.height * sc) + 1), Image.BILINEAR)
        x0 = (r.width - w) // 2
        y0 = int((r.height - h) * cy)
        return r.crop((x0, y0, x0 + w, y0 + h))

    if layout == "pair":
        a = cover(lead_img("p1"), W // 2 + 200, AH, 0.35)
        b = cover(lead_img("p2"), W // 2 + 200, AH, 0.25)
        canvas = Image.new("RGB", (W, AH))
        canvas.paste(a, (0, 0))
        mask = Image.fromarray((np.clip((np.arange(W) - (W // 2 - 200)) / 400.0, 0, 1) * 255).astype(np.uint8)[None, :].repeat(AH, 0))
        canvas.paste(b, (W // 2 - 200, 0), mask.crop((W // 2 - 200, 0, W, AH)))
    else:
        canvas = cover(lead_img(layout), W, AH, 0.35)
    small = canvas.resize((W // 4, AH // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(10)).resize((W, AH), Image.BICUBIC)
    arr = np.asarray(small).astype(np.float32) * np.array([0.44, 0.40, 0.36], dtype=np.float32)       # dark, warm
    _lead[key] = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return _lead[key]


def card_layers(w, h):
    key = ("card", w, h)
    if key not in _lead:
        sh = Image.new("RGBA", (w + 160, h + 160), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rectangle([80, 92, 80 + w, 92 + h], fill=(0, 0, 0, 200))
        _lead[key] = sh.filter(ImageFilter.GaussianBlur(26))
    return _lead[key]


def draw_card(frame, name, cx, top, h, t, p, zoom, drift):
    """a framed photograph: crop window slides/zooms slowly (never beyond native resolution); the photo is never distorted"""
    im = lead_img(name)
    w = int(round(h * im.width / im.height))
    frame.alpha_composite(card_layers(w, h), dest=(int(cx - w / 2 - 80), int(top - 80)))
    z = 1.0 + zoom * p
    ww, wh = im.width / z, im.height / z
    fx = 0.5 + drift[0] * (p - 0.5)
    fy = 0.5 + drift[1] * (p - 0.5)
    x0 = clamp(fx * im.width - ww / 2, 0, im.width - ww)
    y0 = clamp(fy * im.height - wh / 2, 0, im.height - wh)
    crop = im.transform((w, h), Image.EXTENT, (x0, y0, x0 + ww, y0 + wh), Image.BICUBIC).convert("RGBA")
    d = ImageDraw.Draw(frame)
    d.rectangle([cx - w / 2 - 4, top - 4, cx - w / 2 + w + 3, top + h + 3], fill=(244, 236, 224, 255))
    frame.alpha_composite(crop, dest=(int(cx - w / 2), int(top)))


def leaders_frame(shot, t):
    p = clamp((t - shot["t0"]) / (shot["t1"] + shot["tail"] - shot["t0"]))
    if shot["dirn"] < 0:
        p = 1 - p
    f = backdrop(shot["src"]).convert("RGBA")
    if shot["src"] == "pair":
        draw_card(f, "p1", 741, 105, 700, t, p, 0.10, (-0.10, 0.0))
        draw_card(f, "p2", 1313, 105, 700, t, p, 0.14, (0.0, -0.06))
    elif shot["src"] == "p1":
        draw_card(f, "p1", 1190, 70, 720, t, p, 0.12, (0.06, 0.0))
    else:
        draw_card(f, "p2", 1190, 60, 740, t, p, 0.16, (0.0, -0.10))
    return ImageChops.multiply(f.convert("RGB"), vignette(0.30))


_shot_frame_v1 = B.shot_frame


def shot_frame(shot, t):
    if shot["kind"] == "leaders":
        return leaders_frame(shot, t)
    if shot["kind"] == "map":
        return map_frame(t)
    return _shot_frame_v1(shot, t)


B.shot_frame = shot_frame

# ---------------------------------------------------------------- the schematic reach map (typeset locally, no model)
MAP_NODES = [   # key, EN, AR, lon, lat, label offset (dx, dy) from the dot, anchor (l: label starts right of the offset, r: ends left of it, c: centred)
    ("BH", "BAHRAIN", "البحرين", 50.6, 26.2, (-34, -26), "r"),
    ("SA", "SAUDI ARABIA", "السعودية", 46.7, 24.7, (0, 52), "c"),
    ("QA", "QATAR", "قطر", 51.5, 25.3, (38, 44), "l"),
    ("AE", "UNITED ARAB EMIRATES", "الإمارات", 55.3, 25.2, (40, 30), "l"),
    ("KW", "KUWAIT", "الكويت", 48.0, 29.4, (-34, -6), "r"),
    ("OM", "OMAN", "عُمان", 58.4, 23.6, (40, -4), "l"),
    ("IQ", "IRAQ", "العراق", 44.4, 33.3, (-34, -6), "r"),
    ("JO", "JORDAN", "الأردن", 35.9, 31.95, (0, -64), "c"),
]
MAP_T = {"BH": 0.2, "SA": 2.7, "QA": 3.1, "AE": 3.5, "KW": 3.9, "OM": 4.3, "IQ": 5.6, "JO": 6.2}    # seconds after the map shot starts


def map_xy(lon, lat):
    s = 54.0
    x = W / 2 + (lon - 47.0) * 0.89 * s
    y = 535 - (lat - 28.5) * s
    return x, y


def map_frame(t):
    s = next(x for x in SHOTS if x["id"] == "F02")
    tt = t - s["t0"]
    if "map" not in B._ov:
        yy, xx = np.mgrid[0:AH, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - AH * 0.5) / AH) ** 2)
        base = np.clip(1 - r * 1.2, 0, 1)[..., None]
        plate = (np.array([10, 20, 30], dtype=np.float32) * (0.45 + 0.9 * base)).clip(0, 255).astype(np.uint8)
        im = Image.fromarray(plate).convert("RGBA")
        d = ImageDraw.Draw(im)
        for lon in range(10, 90, 2):                                      # graticule
            x0, y0 = map_xy(lon, 60)
            x1, y1 = map_xy(lon, 0)
            d.line([(x0, y0), (x1, y1)], fill=(90, 130, 160, 26), width=1)
        for lat in range(0, 62, 2):
            x0, y0 = map_xy(0, lat)
            x1, y1 = map_xy(100, lat)
            d.line([(x0, y0), (x1, y1)], fill=(90, 130, 160, 26), width=1)
        B._ov["map"] = dict(
            base=im,
            ar=text_layer("امتداد حضورنا", font("NaskhAr-600.ttf", 52), WHITE, rtl=True, shadow=0.5),
            en=text_layer("DISTRIBUTION ACROSS THE GULF, IRAQ AND JORDAN", font("Inter-600.ttf", 21), (255, 222, 190), tracking=0.30, shadow=0.5),
            foot=text_layer("SCHEMATIC MAP, NOT TO SCALE", font("Inter-400.ttf", 15), (150, 170, 188), tracking=0.20),
            labels={k: (text_layer(en, font("Inter-600.ttf", 22 if k != "BH" else 27), WHITE, tracking=0.20, shadow=0.7),
                        text_layer(ar, font("PlexAr-500.ttf", 27 if k != "BH" else 33), (255, 226, 196), rtl=True, shadow=0.7))
                    for k, en, ar, *_ in MAP_NODES})
    o = B._ov["map"]
    f = o["base"].copy()
    ss = 2
    g = Image.new("RGBA", (W * ss, AH * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    bh = map_xy(50.6, 26.2)
    for k, en, ar, lon, lat, off, anch in MAP_NODES:
        tn = MAP_T[k]
        a = ease_out((tt - tn) / 0.8)
        if a <= 0:
            continue
        x, y = map_xy(lon, lat)
        if k != "BH":                                                    # curved route from Bahrain, drawn on
            mx, my = (bh[0] + x) / 2, (bh[1] + y) / 2 - 0.22 * math.hypot(x - bh[0], y - bh[1])
            n = 40
            pts = [((1 - u) ** 2 * bh[0] + 2 * (1 - u) * u * mx + u * u * x, (1 - u) ** 2 * bh[1] + 2 * (1 - u) * u * my + u * u * y)
                   for u in [i / n for i in range(int(n * a) + 1)]]
            if len(pts) > 1:
                d.line([(px * ss, py * ss) for px, py in pts], fill=ORANGE + (200,), width=2 * ss)
        r = 9 if k != "BH" else 13
        d.ellipse([(x - r - 8) * ss, (y - r - 8) * ss, (x + r + 8) * ss, (y + r + 8) * ss], outline=ORANGE + (int(150 * a),), width=2 * ss)
        d.ellipse([(x - r) * ss, (y - r) * ss, (x + r) * ss, (y + r) * ss], fill=WHITE + (int(255 * a),))
    f.alpha_composite(g.resize((W, AH), Image.LANCZOS))
    put(f, o["ar"], W // 2, 84 - 24, smooth(tt / 0.6))
    put(f, o["en"], W // 2, 156 - 24, smooth((tt - 0.15) / 0.6))
    put(f, o["foot"], W // 2, AH - 46, 0.9)
    for k, en, ar, lon, lat, off, anch in MAP_NODES:
        a = smooth((tt - MAP_T[k] - 0.25) / 0.45)
        if a <= 0:
            continue
        x, y = map_xy(lon, lat)
        le, la = o["labels"][k]
        lx, ly = x + off[0], y + off[1]
        if anch == "c":
            ImageDraw.Draw(f).line([(x, y + (14 if off[1] > 0 else -14)), (lx, ly + (-22 if off[1] > 0 else 30))], fill=(255, 255, 255, int(110 * a)), width=1)
        for layer, dy in ((le, -20), (la, 14)):
            if anch == "l":
                put(f, layer, lx - 24, ly + dy - 12, a, anchor="l")
            elif anch == "r":
                put(f, layer, lx + 24, ly + dy - 12, a, anchor="r")
            else:
                put(f, layer, lx, ly + dy - 12, a)
    return f.convert("RGB")


# ---------------------------------------------------------------- overlays
def count_overlay(f, t, key, t_in, t_out, value, top_en, bottom_en, bottom_ar):
    op = envelope(t, t_in, 0.5, t_out, 0.7)
    if op <= 0:
        return
    if key not in B._ov:
        fn = font("Fraunces-600.ttf", 236)
        B._ov[key] = dict(
            fn=fn, cell=max(fn.getlength(ch) for ch in "0123456789"), comma=fn.getlength(","), plus=fn.getlength("+"),
            top=text_layer(top_en, font("Inter-600.ttf", 30), (255, 236, 214), tracking=0.44, shadow=0.7) if top_en else None,
            bottom=text_layer(bottom_en, font("Inter-600.ttf", 38), WHITE, tracking=0.30, shadow=0.7),
            ar=text_layer(bottom_ar, font("NaskhAr-600.ttf", 44), (255, 236, 214), rtl=True, shadow=0.7),
            scrim=Image.new("RGBA", (W, H), (8, 5, 4, 255)))
    o = B._ov[key]
    put(f, o["scrim"], W // 2, 0, 0.46 * op)
    if o["top"] is not None:
        put(f, o["top"], W // 2, 300 - 24, op)
    v = int(round(value * ease_out((t - t_in - 0.1) / 1.9)))
    final = f"{value:,}"
    slots = [o["comma"] if ch == "," else o["cell"] for ch in final]
    dw = sum(slots)
    full = dw + o["plus"]
    layer = Image.new("RGBA", (int(full) + 120, 330), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    s = f"{v:,}".rjust(len(final))                                       # right-aligned in the slots of the final number
    cur = 60.0
    for ch, wch in zip(s, slots):
        if ch not in " ,":
            off = (o["cell"] - o["fn"].getlength(ch)) / 2
            d.text((cur + off + 3, 14), ch, font=o["fn"], fill=(0, 0, 0, 120))
            d.text((cur + off, 10), ch, font=o["fn"], fill=WHITE + (255,))
        elif ch == "," and v >= 1000:
            d.text((cur + 3, 14), ch, font=o["fn"], fill=(0, 0, 0, 120))
            d.text((cur, 10), ch, font=o["fn"], fill=WHITE + (255,))
        cur += wch
    pa = smooth((t - t_in - 1.7) / 0.5)                                  # the plus lands when the count completes
    if pa > 0:
        d.text((60 + dw + 3, 14), "+", font=o["fn"], fill=(0, 0, 0, int(120 * pa)))
        d.text((60 + dw, 10), "+", font=o["fn"], fill=(255, 214, 170, int(255 * pa)))
    put(f, layer, W // 2, 334, op)
    a = smooth((t - t_in - 1.0) / 0.6) * op
    if a > 0:
        half = int(70 * smooth((t - t_in - 1.0) / 0.8))
        ImageDraw.Draw(f).line([(W // 2 - half, 650), (W // 2 + half, 650)], fill=ORANGE + (int(255 * a),), width=3)
    put(f, o["bottom"], W // 2, 672 - 24, smooth((t - t_in - 0.9) / 0.7) * op)
    put(f, o["ar"], W // 2, 744 - 24, smooth((t - t_in - 1.3) / 0.7) * op)


def overlay_factory_name(f, t):
    t_in, t_out = tw(15, 4), tw(16, 2)
    op = envelope(t, t_in, 0.5, t_out, 0.6)
    if op <= 0:
        return
    if "yas" not in B._ov:
        B._ov["yas"] = (text_layer("YAS FACTORY", font("Fraunces-600.ttf", 84), WHITE, tracking=0.06, shadow=0.8),
                        text_layer("مصنع ياس", font("NaskhAr-600.ttf", 70), WHITE, rtl=True, shadow=0.8))
    le, la = B._ov["yas"]
    x, y = 118, H - BAR - 290
    ImageDraw.Draw(f).rectangle([x - 22, y + 8, x - 17, y + 168], fill=ORANGE + (int(255 * op),))
    put(f, le, x - 24, y - 24 + 4 + int(10 * (1 - ease_out((t - t_in) / 0.9))), op, anchor="l")
    put(f, la, x - 24, y + 90 - 24 + int(10 * (1 - ease_out((t - t_in - 0.2) / 0.9))), op * smooth((t - t_in - 0.2) / 0.5), anchor="l")


FLOW = [  # EN, AR, position, word index in line 25 (start of the word), colour accent
    ("PRODUCTION", "الإنتاج", (-470, -150), 15),
    ("INVENTORY", "المخزون", (470, -150), 16),
    ("SALES", "المبيعات", (470, 190), 17),
    ("SUPPLY CHAINS", "سلاسل التوريد", (-470, 190), 18),
]


def overlay_flow(f, t):
    t_in, t_out = tw(25, 10) - 0.1, tl(26) + 0.05
    op = envelope(t, t_in, 0.6, t_out, 0.5)
    if op <= 0:
        return
    if "flow" not in B._ov:
        B._ov["flow"] = dict(
            scrim=Image.new("RGBA", (W, H), (6, 10, 16, 255)),
            ar=text_layer("منظومة رقمية", font("NaskhAr-600.ttf", 56), WHITE, rtl=True, shadow=0.6),
            en=text_layer("ONE DIGITAL SYSTEM", font("Inter-600.ttf", 22), (255, 222, 190), tracking=0.38, shadow=0.6),
            nodes=[(text_layer(en, font("Inter-600.ttf", 24), WHITE, tracking=0.20, shadow=0.7),
                    text_layer(ar, font("NaskhAr-600.ttf", 38), (255, 226, 196), rtl=True, shadow=0.7)) for en, ar, *_ in FLOW])
    o = B._ov["flow"]
    put(f, o["scrim"], W // 2, 0, 0.60 * op)
    put(f, o["ar"], W // 2, 150 - 24, smooth((t - t_in - 0.1) / 0.6) * op)
    put(f, o["en"], W // 2, 232 - 24, smooth((t - t_in - 0.3) / 0.6) * op)
    cx, cy = W // 2, H // 2 + 60
    ss = 2
    g = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    hub = smooth((t - t_in - 0.2) / 0.5)
    for rr, al in ((58, 70), (38, 120)):
        d.ellipse([(cx - rr) * ss, (cy - rr) * ss, (cx + rr) * ss, (cy + rr) * ss], outline=ORANGE + (int(al * hub),), width=2 * ss)
    d.ellipse([(cx - 14) * ss, (cy - 14) * ss, (cx + 14) * ss, (cy + 14) * ss], fill=ORANGE + (int(255 * hub),))
    pts = []
    for en, ar, (dx, dy), wi in FLOW:
        pts.append((cx + dx, cy + dy, tw(25, wi) - 0.15))
    for i, (x, y, ts) in enumerate(pts):
        grow = ease_out((t - ts) / 0.55)
        if grow <= 0:
            continue
        dist = math.hypot(x - cx, y - cy)
        sx, sy = cx + 62 * (x - cx) / dist, cy + 62 * (y - cy) / dist
        ex, ey = sx + (x - sx) * grow, sy + (y - sy) * grow
        d.line([(sx * ss, sy * ss), (ex * ss, ey * ss)], fill=(255, 255, 255, 130), width=ss + 1)
        if grow > 0.98:
            j = (i + 1) % len(pts)
            ring = smooth((t - ts - 0.55) / 0.8) if j > i else 0
            if ring > 0 and j > i:
                nx, ny = pts[j][0], pts[j][1]
                d.line([(x * ss, y * ss), ((x + (nx - x) * ring) * ss, (y + (ny - y) * ring) * ss)], fill=ORANGE + (170,), width=ss + 1)
            d.ellipse([(x - 10) * ss, (y - 10) * ss, (x + 10) * ss, (y + 10) * ss], fill=WHITE + (255,))
            d.ellipse([(x - 17) * ss, (y - 17) * ss, (x + 17) * ss, (y + 17) * ss], outline=ORANGE + (220,), width=2 * ss)
    last = pts[-1]
    if t > last[2] + 0.9:                                                # the loop closes: supply chains back to production
        ring = smooth((t - last[2] - 0.9) / 0.7)
        d.line([(last[0] * ss, last[1] * ss), ((last[0] + (pts[0][0] - last[0]) * ring) * ss, (last[1] + (pts[0][1] - last[1]) * ring) * ss)],
               fill=ORANGE + (170,), width=ss + 1)
    put(f, g.resize((W, H), Image.LANCZOS), W // 2, 0, op)
    for i, (x, y, ts) in enumerate(pts):
        a = smooth((t - ts - 0.4) / 0.45) * op
        if a <= 0:
            continue
        le, la = o["nodes"][i]
        if y < cy:                                                       # labels above the node: Arabic on top of the English line
            ytop_en = y - 30 - le.height + 22
            put(f, le, x, ytop_en, a)
            put(f, la, x, ytop_en - la.height + 34, a)
        else:
            put(f, le, x, y + 14, a)
            put(f, la, x, y + 14 + le.height - 14, a)


def overlay_real_tag(f, t):
    """small honest badge on the leaders' scenes (right-bottom; the left-bottom corner is the clean lower-third slot)"""
    for s in SHOTS:
        if s["kind"] == "leaders":
            op = envelope(t, s["t0"] + 0.5, 0.5, s["t1"] + 0.1, 0.4)
            if op > 0:
                break
    else:
        return
    if "real" not in B._ov:
        B._ov["real"] = (text_layer("REAL PHOTOGRAPH", font("Inter-600.ttf", 22), WHITE, tracking=0.22, shadow=0.6),
                         text_layer("صورة حقيقية", font("PlexAr-500.ttf", 27), (255, 226, 196), rtl=True, shadow=0.6))
    le, la = B._ov["real"]
    xr, y = W - 118, H - BAR - 124
    ImageDraw.Draw(f).rectangle([xr - le.width + 48 - 22 - 4 - la.width + 48 - 26, y + 2, xr - le.width + 48 - 22 - la.width + 48 - 26, y + 42],
                                fill=ORANGE + (int(255 * op),))
    put(f, la, xr + 24, y - 24 - 9, op, anchor="r")
    put(f, le, xr - la.width + 48 - 26 + 24, y - 24 + 3, op, anchor="r")


def overlay_lower_third(f, t):
    if not LOWER_THIRD:
        return
    for s in SHOTS:
        if s["kind"] == "leaders":
            op = envelope(t, s["t0"] + 0.8, 0.5, s["t1"] - 0.2, 0.4)
            if op > 0:
                key = ("lt", LOWER_THIRD["en"], LOWER_THIRD["ar"])
                if key not in B._ov:
                    B._ov[key] = (text_layer(LOWER_THIRD["en"], font("Fraunces-500.ttf", 40), WHITE, shadow=0.8),
                                  text_layer(LOWER_THIRD["ar"], font("NaskhAr-600.ttf", 36), (255, 226, 196), rtl=True, shadow=0.8))
                le, la = B._ov[key]
                put(f, le, 118 - 24, H - BAR - 190, op, anchor="l")
                put(f, la, 118 - 24, H - BAR - 134, op, anchor="l")
                return


# ---------------------------------------------------------------- end card (honest label + disclaimer)
FINAL_LINE = "FROM AN IDEA ON PAPER… TO AN INDUSTRY BEYOND BORDERS."
CLOSE_EN = ["WE MAKE TODAY.", "WE INVEST IN TOMORROW."]
CLOSE_AR = "نصنع اليوم، ونستثمر في الغد."
LABEL_EN = "Real photographs of company leaders; all other imagery is AI-generated illustration."
LABEL_AR = "صور حقيقية لقيادات الشركة، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي."
# the same wording the VIP decks use: src/showroom3d/vip/deckSchema.js -> DISCLAIMER
DISCLAIMER_EN = "Information only, not an offer or financial advice; details provided directly by management."
DISCLAIMER_AR = "للاطلاع فقط، وليس عرضًا ولا نصيحة مالية؛ تُقدَّم التفاصيل مباشرة من الإدارة."
CREDITS_EN = "Narration: synthetic voice. Music: generated."
CREDITS_AR = "التعليق الصوتي بصوت اصطناعي، والموسيقى مولّدة."
_card = {}


def ar_text(text, fname, size, fill):
    """Arabic line; the Arabic font subsets lack the Latin full stop, so a trailing '.' is drawn with Inter and placed at the line's end (left)"""
    stop = text.endswith(".")
    main = text_layer(text.rstrip("."), font(fname, size), fill, rtl=True)
    if not stop:
        return main
    dot = text_layer(".", font("Inter-600.ttf", size), fill)
    gap = dot.width - 56
    out = Image.new("RGBA", (main.width + gap, max(main.height, dot.height)), (0, 0, 0, 0))
    out.alpha_composite(main, dest=(gap, 0))
    out.alpha_composite(dot.crop((14, 0, dot.width, dot.height)), dest=(0, (main.height - dot.height) // 2 + 4))
    return out


def card_frame(t):
    if not _card:
        yy, xx = np.mgrid[0:AH, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - AH * 0.42) / AH) ** 2)
        shade = 1 - 0.07 * np.clip(r / 0.75, 0, 1) ** 2
        _card["base"] = Image.fromarray((shade[..., None] * np.array(CARD, dtype=np.float32)).astype(np.uint8))
        logo = Image.open(B.ARGS.logo).convert("RGB")
        logo = logo.point(lambda v: min(255, int(v * 255 / 251 + 0.5)))
        lw = 600
        _card["logo"] = logo.resize((lw, int(round(logo.height * lw / logo.width))), Image.LANCZOS)
        _card["l1"] = text_layer(FINAL_LINE, font("Fraunces-500.ttf", 38), INK)
        _card["en"] = [text_layer(s, font("Inter-600.ttf", 24), INK, tracking=0.30) for s in CLOSE_EN]
        _card["ar"] = ar_text(CLOSE_AR, "NaskhAr-600.ttf", 40, INK)
        small = lambda s: text_layer(s, font("Inter-500.ttf", 21), GREY, tracking=0.02)
        smallar = lambda s: ar_text(s, "PlexAr-500.ttf", 25, GREY)
        _card["fine"] = [small(LABEL_EN), smallar(LABEL_AR), small(DISCLAIMER_EN), smallar(DISCLAIMER_AR), small(CREDITS_EN), smallar(CREDITS_AR)]
    img = _card["base"].copy()
    tt = t - END_T
    a = smooth((tt - 0.3) / 1.3)
    if a > 0:
        logo = _card["logo"]
        sc = 0.965 + 0.035 * ease_out((tt - 0.3) / 2.4)
        lw, lh = int(round(logo.width * sc)), int(round(logo.height * sc))
        lg = logo.resize((lw, lh), Image.BICUBIC) if sc < 0.999 else logo
        x, y = (W - lw) // 2, 190 - lh // 2
        region = img.crop((x, y, x + lw, y + lh))
        img.paste(Image.blend(region, ImageChops.multiply(region, lg), a), (x, y))
    f = img.convert("RGBA")
    d = ImageDraw.Draw(f)
    rule = smooth((tt - 1.6) / 0.8)
    if rule > 0:
        half = int(60 * rule)
        d.line([(W // 2 - half, 376), (W // 2 + half, 376)], fill=ORANGE + (int(255 * rule),), width=2)
    def rise(ts, d_=0.9):
        return int(10 * (1 - ease_out((tt - ts) / d_)))
    put(f, _card["l1"], W // 2, 408 - 24 + rise(1.8), smooth((tt - 1.8) / 0.8))
    for i, layer in enumerate(_card["en"]):
        ts = 3.2 + 0.9 * i
        put(f, layer, W // 2, 470 + 40 * i - 24 + rise(ts), smooth((tt - ts) / 0.7))
    put(f, _card["ar"], W // 2, 580 - 24 + rise(5.0), smooth((tt - 5.0) / 0.8))
    for i, layer in enumerate(_card["fine"]):
        ts = 5.6 + 0.35 * i
        y = 650 + 40 * i - 24 + 14 * (i // 2)
        put(f, layer, W // 2, y, smooth((tt - ts) / 0.8) * 0.95)
    return f.convert("RGB")


B.card_frame = card_frame


# ---------------------------------------------------------------- frame assembly
def render_frame(n):
    t = n / FPS
    img, cur = B.picture(t)
    frame = Image.new("RGB", (W, H), (0, 0, 0))
    frame.paste(img, (0, BAR))
    need = ((0.5 < t < 6.2) or (tw(7, 4) - 0.2 < t < tw(7, 4) + 6) or (tw(15, 3) - 0.1 < t < tw(16, 2) + 0.8)
            or (tw(22, 0) - 0.4 < t < tw(22, 0) + 6.4) or (tw(25, 10) - 0.3 < t < tl(26) + 0.7)
            or any(s["kind"] == "leaders" and s["t0"] < t < s["t1"] + 0.6 for s in SHOTS))
    if need:
        f = frame.convert("RGBA")
        B.overlay_title(f, t)
        count_overlay(f, t, "k50", tw(7, 4), tw(7, 4) + 5.3, PROJECTS_COUNT, "", "PROJECTS", "مشروع")
        overlay_factory_name(f, t)
        count_overlay(f, t, "k27", tw(22, 0) + 0.2, tw(22, 0) + 5.6, PATENTS_COUNT, "", "PATENTS ON ALUMINIUM PROFILES", "براءة اختراع لبروفايلات الألمنيوم")
        overlay_flow(f, t)
        overlay_real_tag(f, t)
        overlay_lower_third(f, t)
        frame = f.convert("RGB")
    fade = min(smooth(t / 1.1), smooth((DUR - 0.15 - t) / 1.6))
    if fade < 0.999:
        frame = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), frame, fade)
    return frame


B.render_frame = render_frame


def render_chunk(args, a, b, path):
    B.ARGS = args
    enc = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", os.environ.get("FILM_CRF", "13"),
                            "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
                            "-vf", "scale=out_color_matrix=bt709:out_range=tv", path], stdin=subprocess.PIPE)
    for k in range(a, b):
        enc.stdin.write(render_frame(k).tobytes())
    enc.stdin.close()
    enc.wait()


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--fonts", required=True)
    ap.add_argument("--logo", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--frames", help="comma list of times (s): save JPEG stills instead of rendering the film")
    ap.add_argument("--edl", action="store_true", help="print the edit decision list as JSON and exit")
    args = ap.parse_args()
    args.leaders = LEADERS_DIR
    B.ARGS = args
    os.makedirs(args.out, exist_ok=True)
    if args.edl:
        print(json.dumps(dict(duration=DUR, fps=FPS, offset=OFF, lines=[{k: round(v, 2) if isinstance(v, float) else v for k, v in l.items()} for l in LINE_T],
                              shots=SHOTS), indent=1, ensure_ascii=False))
        return
    if args.frames:
        os.makedirs(os.path.join(args.out, "frames"), exist_ok=True)
        for ts in args.frames.split(","):
            render_frame(int(round(float(ts) * FPS))).save(os.path.join(args.out, "frames", f"f_{float(ts):07.2f}.jpg"), quality=88)
        return
    n_frames = B.NF
    step = math.ceil(n_frames / args.jobs)
    procs, parts = [], []
    for k in range(args.jobs):
        a, b = k * step, min(n_frames, (k + 1) * step)
        path = os.path.join(args.out, f"part{k}.mkv")
        parts.append(path)
        p = Process(target=render_chunk, args=(args, a, b, path))
        p.start()
        procs.append(p)
    for p in procs:
        p.join()
        if p.exitcode:
            sys.exit("render failed")
    lst = os.path.join(args.out, "parts.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                    os.path.join(args.out, "picture.mkv")], check=True)
    for p in parts:
        os.remove(p)
    print("picture master:", os.path.join(args.out, "picture.mkv"))


if __name__ == "__main__":
    main()
