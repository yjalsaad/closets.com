#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Film v3: v2's picture and audio, with the leaders' scenes set in an (AI-generated, empty) executive office / boardroom and moving gently.

The two real photographs are still shown as REAL PIXELS: the photograph is framed (never distorted) and moves slowly in front of an AI-generated office
that drifts the other way (a layered parallax), so the leaders are part of a room, not a flat portrait on a blur. NO AI is applied to the photographs and none
is sent anywhere. (An AI image-to-video animation of the photographs was requested by the owner; it was not run, see JOURNEY-V3.md.)

Everything else is v2's build_film2.py (same shots, same timings, same audio). Usage: as build_film2.py (same arguments), e.g.
  python3 build_film3.py --src <src> --fonts <fonts> --logo <logo.jpg> --leaders <dir with p1.png p2.png> --out <work>
<src>/stills must also contain n_office.png and n_boardroom.png (see journey3-ledger in docs/showroom3d/film-src).
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

import build_film2 as F
import build_film as B
from build_film import W, H, AH, BAR, ORANGE, WHITE, clamp, smooth, envelope, font, text_layer, put, apply_grade, vignette

# ---- the honest wording of this version (the leaders are real photographs with camera motion only, in an AI-generated room)
F.LABEL_EN = "Leaders appear from real photographs (camera motion only) in an AI-generated office; all other imagery is AI-generated illustration."
F.LABEL_AR = "يظهر القياديون من صور حقيقية بحركة كاميرا فقط داخل مكتب مولّد بالذكاء الاصطناعي، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي."
BADGE_EN = "REAL PHOTOGRAPH  ·  AI-GENERATED OFFICE"
BADGE_AR = "صورة حقيقية، ومكتب مولّد بالذكاء الاصطناعي"

_room = {}


def room(name):
    if name not in _room:
        im = Image.open(os.path.join(B.ARGS.src, "stills", name + ".png")).convert("RGB")
        sc = max(W * 1.10 / im.width, AH * 1.10 / im.height)                     # 10% larger than the frame: room to drift
        im = im.resize((int(im.width * sc) + 1, int(im.height * sc) + 1), Image.LANCZOS)
        im = apply_grade(im, "mod")
        small = im.resize((im.width // 2, im.height // 2), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.6)).resize(im.size, Image.BICUBIC)   # soft focus: the room is the background
        arr = (np.asarray(small).astype(np.float32) * np.array([0.62, 0.58, 0.54], dtype=np.float32)).clip(0, 255).astype(np.uint8)
        _room[name] = Image.fromarray(arr)
    return _room[name]


ROOM_OF = {"G01": "n_office", "I01": "n_boardroom", "I05": "n_office", "J03": "n_boardroom"}


def leaders_frame(shot, t):
    p = clamp((t - shot["t0"]) / (shot["t1"] + shot["tail"] - shot["t0"]))
    d = shot["dirn"]
    q = p if d > 0 else 1 - p
    bg = room(ROOM_OF[shot["id"]])
    ox = int((bg.width - W) / 2 - d * (q - 0.5) * (bg.width - W) * 0.9)          # the room drifts one way ...
    oy = int((bg.height - AH) / 2 + (q - 0.5) * 18)
    f = bg.crop((ox, oy, ox + W, oy + AH)).convert("RGBA")
    k = {"pair": ((741, 105, 700), (1313, 105, 700)), "p1": ((1190, 70, 720),), "p2": ((1190, 60, 740),)}[shot["src"]]
    sh = {"pair": [("p1", 0.10, (-0.10, 0.0)), ("p2", 0.14, (0.0, -0.06))], "p1": [("p1", 0.12, (0.06, 0.0))], "p2": [("p2", 0.16, (0.0, -0.10))]}[shot["src"]]
    for (cx, top, hh), (name, zoom, drift) in zip(k, sh):
        cxm = cx + d * (q - 0.5) * 26                                             # ... the framed photograph drifts the other way (parallax)
        F.draw_card(f, name, cxm, top, hh, t, p, zoom, drift)
    return ImageChops.multiply(f.convert("RGB"), vignette(0.30))


F.leaders_frame = leaders_frame
F._shot_frame_v1 = F._shot_frame_v1


def overlay_real_tag(f, t):
    for s in F.SHOTS:
        if s["kind"] == "leaders":
            op = envelope(t, s["t0"] + 0.5, 0.5, s["t1"] + 0.1, 0.4)
            if op > 0:
                break
    else:
        return
    if "real3" not in B._ov:
        B._ov["real3"] = (text_layer(BADGE_EN, font("Inter-600.ttf", 20), WHITE, tracking=0.16, shadow=0.6),
                          text_layer(BADGE_AR, font("PlexAr-500.ttf", 25), (255, 226, 196), rtl=True, shadow=0.6))
    le, la = B._ov["real3"]
    xr, y = W - 118, H - BAR - 128
    put(f, la, xr + 24, y - 24 - 6, op, anchor="r")                             # Arabic above, English below, right-aligned (both lines clear of the photographs)
    put(f, le, xr + 24, y - 24 + 34, op, anchor="r")
    ImageDraw.Draw(f).rectangle([xr + 8, y + 2, xr + 12, y + 62], fill=ORANGE + (int(255 * op),))


F.overlay_real_tag = overlay_real_tag

if __name__ == "__main__":
    F.main()
