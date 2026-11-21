#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Film v4: v3 with the leaders' four shots ANIMATED (Kling 3.0 image-to-video from the real photographs, approved by the owner), framed in the same
AI-generated empty office / boardroom with the same layered parallax. Same shots, same timings, same audio and captions as v3/v2.

The animated clips are AI output derived from the real photographs; the film says so (badge, end card, film4.json). Clips live in <src>/clips/:
leaderA_1.mp4 (920x1000), leaderA_2.mp4 (square), leaderB_1.mp4 (712x1292), leaderB_2.mp4 (9:16). Slow motion is made by blending neighbouring frames (no visible
steps); when a shot needs longer than a clip the last frame is held while the push-in continues, or two clips of the same person are dissolved (they start from the
same photograph), never looped.
Usage: as build_film3.py (same arguments); the --leaders photographs are not needed any more (kept only so the arguments match).
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw

import build_film3 as F3
import build_film2 as F
import build_film as B
from build_film import W, H, AH, BAR, ORANGE, WHITE, clamp, smooth, envelope, font, text_layer, put, apply_grade, vignette

F.LABEL_EN = "Leaders appear from real photographs, animated with AI, in an AI-generated office; all other imagery is AI-generated illustration."
F.LABEL_AR = "يظهر القياديون من صور حقيقية محرّكة بالذكاء الاصطناعي داخل مكتب مولّد بالذكاء الاصطناعي، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي."
BADGE_EN = "AI-ANIMATED FROM A REAL PHOTO"
BADGE_AR = "مشهد متحرك بالذكاء الاصطناعي من صورة حقيقية"

# clip file -> native size (w, h)
CLIPS = {"A1": ("leaderA_1.mp4", 920, 1000), "A2": ("leaderA_2.mp4", None, None), "B1": ("leaderB_1.mp4", 712, 1292), "B2": ("leaderB_2.mp4", None, None)}
# per shot and leader: a list of segments (clip, source start s, source end s, speed); a segment starts where the previous one ends minus XF seconds
XF = 0.6
PLAN = {      # clip A1 (head turned away, mid-turn) was judged the weakest likeness and is not used; dissolves between clips ghosted two head poses, so each shot uses one clip, slowed, with the last frame held
    "G01": {"A": [("A2", 0.0, 5.04, 0.75)], "B": [("B1", 0.35, 5.04, 0.72)]},
    "I01": {"A": [("A2", 0.3, 5.04, 0.82)]},
    "I05": {"B": [("B2", 0.0, 5.04, 0.62)]},
    "J03": {"A": [("A2", 1.6, 5.04, 0.72)], "B": [("B2", 1.5, 5.04, 0.78)]},
}
CARD = {"pair": {"A": (741, 105, 700), "B": (1313, 105, 700)}, "p1": {"A": (1190, 70, 720)}, "p2": {"B": (1190, 60, 740)}}
_dec = {}          # (clip, w, h) -> uint8 array (frames, h, w, 3), small LRU


def decode(clip, w, h):
    key = (clip, w, h)
    if key not in _dec:
        while len(_dec) >= 4:
            _dec.pop(next(iter(_dec)))
        raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", os.path.join(B.ARGS.src, "clips", CLIPS[clip][0]), "-vf", f"scale={w}:{h}:flags=lanczos",
                              "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
        _dec[key] = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w, 3)
    return _dec[key]


def clip_aspect(clip):
    key = ("aspect", clip)
    if key not in _dec:
        pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0",
                             os.path.join(B.ARGS.src, "clips", CLIPS[clip][0])], capture_output=True, text=True, check=True).stdout.strip().split(",")
        _dec[key] = (int(pr[0]), int(pr[1]))
    return _dec[key]


def sample(clip, w, h, ts):
    """frame of the clip at source time ts, as a float array, blending the two neighbouring frames (smooth slow motion)"""
    v = decode(clip, w, h)
    x = clamp(ts * 24.0, 0, len(v) - 1)
    i = int(x)
    j = min(i + 1, len(v) - 1)
    f = x - i
    return v[i] if f < 1e-3 else (v[i].astype(np.float32) * (1 - f) + v[j].astype(np.float32) * f)


def leader_frame(segs, tau, w, h, zoom_p):
    """card image (w x h) of one leader at shot time tau: the segment plan, dissolving between clips of the same person"""
    cw, ch = int(w * 1.08), int(h * 1.08)                                   # decode 8% larger: room for the slow push without upscaling
    times, pos = [], 0.0
    for (clip, a, b, sp) in segs:
        dur = (b - a) / sp
        times.append((pos, pos + dur, clip, a, b, sp))
        pos += dur - XF
    out = None
    for (s0, s1, clip, a, b, sp) in times:
        if tau < s0 - 1e-6 and out is not None:
            continue
        ts = min(a + max(tau - s0, 0.0) * sp, b - 1 / 48)                  # past the end of a clip: hold its last frame
        fr = np.asarray(sample(clip, cw, ch, ts), dtype=np.float32)
        a_ = 1.0 if len(times) == 1 else clamp((tau - s0) / XF) if s0 > 0 else 1.0
        out = fr if out is None else out * (1 - a_) + fr * a_
    z = 1.0 + 0.06 * zoom_p
    ww, hh = cw / z, ch / z
    im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    x0, y0 = (cw - ww) / 2, (ch - hh) / 2
    im = im.transform((w, h), Image.EXTENT, (x0, y0, x0 + ww, y0 + hh), Image.BICUBIC)
    return apply_grade(im, "mod")


def clip_size(clip, h):
    cw, ch = clip_aspect(clip)
    return int(round(h * cw / ch)), h


def leaders_frame(shot, t):
    p = clamp((t - shot["t0"]) / (shot["t1"] + shot["tail"] - shot["t0"]))
    d = shot["dirn"]
    q = p if d > 0 else 1 - p
    bg = F3.room(F3.ROOM_OF[shot["id"]])
    ox = int((bg.width - W) / 2 - d * (q - 0.5) * (bg.width - W) * 0.9)
    oy = int((bg.height - AH) / 2 + (q - 0.5) * 18)
    f = bg.crop((ox, oy, ox + W, oy + AH)).convert("RGBA")
    tau = t - shot["t0"]
    for who, (cx, top, hh) in CARD[shot["src"]].items():
        segs = PLAN[shot["id"]][who]
        w, h = clip_size(segs[0][0], hh)
        im = leader_frame(segs, tau, w, h, p)
        cxm = cx + d * (q - 0.5) * 26
        f.alpha_composite(F.card_layers(w, h), dest=(int(cxm - w / 2 - 80), int(top - 80)))
        ImageDraw.Draw(f).rectangle([cxm - w / 2 - 4, top - 4, cxm - w / 2 + w + 3, top + h + 3], fill=(244, 236, 224, 255))
        f.alpha_composite(im.convert("RGBA"), dest=(int(cxm - w / 2), int(top)))
    return ImageChops.multiply(f.convert("RGB"), vignette(0.30))


F.leaders_frame = leaders_frame


def overlay_real_tag(f, t):
    for s in F.SHOTS:
        if s["kind"] == "leaders":
            op = envelope(t, s["t0"] + 0.5, 0.5, s["t1"] + 0.1, 0.4)
            if op > 0:
                break
    else:
        return
    if "real4" not in B._ov:
        B._ov["real4"] = (text_layer(BADGE_EN, font("Inter-600.ttf", 20), WHITE, tracking=0.16, shadow=0.6),
                          text_layer(BADGE_AR, font("PlexAr-500.ttf", 25), (255, 226, 196), rtl=True, shadow=0.6))
    le, la = B._ov["real4"]
    xr, y = W - 118, H - BAR - 128
    put(f, la, xr + 24, y - 24 - 6, op, anchor="r")
    put(f, le, xr + 24, y - 24 + 34, op, anchor="r")
    ImageDraw.Draw(f).rectangle([xr + 8, y + 2, xr + 12, y + 62], fill=ORANGE + (int(255 * op),))


F.overlay_real_tag = overlay_real_tag

if __name__ == "__main__":
    # the photographs are no longer read; keep the argument for compatibility
    F.main()
