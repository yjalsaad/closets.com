#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Encode the deliverables of film v2 from the rendered picture master and the sound mix.

Usage: python3 encode_film2.py <work-dir> <out-dir>
Writes journey2-1080.mp4, journey2-720.mp4, journey2-poster.jpg, journey2.ar.vtt, journey2.en.vtt and film2.json into <out-dir>
(the site serves that folder as /yas-bloom/film/). The v1 files are never touched.
The Arabic captions are the owner's script verbatim (asserted); each line is timed from the narration's word timings
(journey2_script.align_lines) and the long lines are split into two or three cues at their natural pauses.
"""
import json
import os
import subprocess
import sys

from PIL import Image

sys.argv, _argv = sys.argv[:1], sys.argv[1:]
import build_film2 as F                                    # noqa: E402
import journey2_script as J                                # noqa: E402

work, out = _argv
os.makedirs(out, exist_ok=True)
PUBLIC = "/yas-bloom/film/"
DUR = F.DUR

# long lines are split into cues: line number -> [(token count, English part), ...]; short lines are one cue (English from journey2_script)
SPLITS = {
    6: [(5, "From a small workshop to two integrated factories,"), (6, "equipped with the latest European machinery and technologies.")],
    7: [(9, "From our first project… to more than fifty thousand projects,"), (9, "through which our work reached the Gulf countries, Iraq and Jordan.")],
    8: [(5, "We left our mark on prominent projects;"), (12, "among them Marassi Al Bahrain, Durrat Al Bahrain, Water Bay, and many government housing projects.")],
    17: [(6, "We turned the supply challenge into an industrial capability;"), (11, "through it we control quality, develop our products, and open new doors for export.")],
    20: [(6, "And exclusive designs and colours worldwide,"), (6, "giving designers and manufacturers options that carry our signature.")],
    22: [(8, "More than twenty-seven patents for aluminium profiles,"), (3, "designed and developed by our team;"), (10, "solutions that began from a practical need and became products of our own.")],
    24: [(6, "New deals and agreements, partnerships that widen our presence,"), (6, "and opportunities that open larger markets for our products.")],
    25: [(7, "And behind this growth, a team whose capabilities we invest in,"), (3, "processes whose efficiency we develop,"),
         (10, "and a digital system we are working to connect with production, inventory, sales and supply chains.")],
    30: [(4, "To make use of our high production capacity,"), (8, "develop new products, and take our exports to the world's markets.")],
    31: [(7, "And from here we look forward to a strategic partnership that shares our vision,"), (8, "to contribute with us to turning these opportunities into tangible results,"),
         (7, "with a clear plan and measurable goals.")],
}
cues = []   # (start, end, ar, en)
for li, (ar, en) in enumerate(J.LINES, 1):
    toks = ar.split()
    toks_t = [t for t in F.TOK if t[0] == li - 1]
    assert len(toks) == len(toks_t), (li, len(toks), len(toks_t))
    if li in SPLITS:
        assert sum(n for n, _ in SPLITS[li]) == len(toks), li
        k = 0
        for n, e in SPLITS[li]:
            cues.append((toks_t[k][1] + F.OFF, toks_t[k + n - 1][2] + F.OFF, " ".join(toks[k:k + n]), e))
            k += n
    else:
        cues.append((toks_t[0][1] + F.OFF, toks_t[-1][2] + F.OFF, ar, en))
assert " ".join(c[2] for c in cues) == " ".join(l[0] for l in J.LINES), "Arabic captions must be the owner's script verbatim"
cues = [[s - 0.06, e + 0.30, a, e_] for s, e, a, e_ in cues]
for i in range(len(cues) - 1):
    cues[i][1] = min(cues[i][1], cues[i + 1][0] - 0.04)


def stamp(t):
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def write_vtt(path, col, lang, note=None):
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f"WEBVTT\nKind: captions\nLanguage: {lang}\n")
        if note:
            fh.write(f"\nNOTE\n{note}\n")
        fh.write("\n")
        for i, c in enumerate(cues, 1):
            fh.write(f"{i}\n{stamp(c[0])} --> {stamp(c[1])}\n{c[col]}\n\n")


write_vtt(os.path.join(out, "journey2.ar.vtt"), 2, "ar")
write_vtt(os.path.join(out, "journey2.en.vtt"), 3, "en", J.TRANSLATION_NOTE)
print(len(cues), "caption cues")

pic, mix = os.path.join(work, "picture.mkv"), os.path.join(work, "mix.wav")
common = ["-profile:v", "high", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
          "-g", "72", "-keyint_min", "24", "-x264-params", "aq-mode=3:aq-strength=0.9:deblock=-1,-1:rc-lookahead=60"]
VB1080, VB720 = os.environ.get("VB1080", "850k"), os.environ.get("VB720", "380k")
TARGETS = [("journey2-1080.mp4", 1920, 1080, VB1080, "96k", "4.0"), ("journey2-720.mp4", 1280, 720, VB720, "80k", "3.1")]
META = "THE CLOSETS - THE JOURNEY OF AMBITION (v2)"
COMMENT = ("Real photographs of company leaders; all other imagery is AI-generated illustration. Narration: synthetic voice. "
           "Information only, not an offer or financial advice.")
for name, w, h, vb, ab, level in TARGETS:
    vf = [] if w == 1920 else ["-vf", f"scale={w}:{h}:flags=lanczos"]
    log = os.path.join(work, "x264_" + name)
    base = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", pic]
    subprocess.run(base + vf + ["-c:v", "libx264", "-preset", "veryslow", "-b:v", vb, "-level", level] + common +
                   ["-pass", "1", "-passlogfile", log, "-an", "-f", "null", os.devnull], check=True)
    subprocess.run(base + ["-i", mix] + vf + ["-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryslow", "-b:v", vb, "-level", level] + common +
                   ["-pass", "2", "-passlogfile", log, "-c:a", "aac", "-b:a", ab, "-ar", "48000", "-ac", "2", "-movflags", "+faststart",
                    "-metadata", "title=" + META, "-metadata", "comment=" + COMMENT, "-t", f"{DUR:.3f}", os.path.join(out, name)], check=True)
    print(name, os.path.getsize(os.path.join(out, name)))

tmp = os.path.join(work, "poster.png")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", "3.6", "-i", pic, "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", tmp], check=True)
poster = os.path.join(out, "journey2-poster.jpg")
im = Image.open(tmp).convert("RGB")
for q in range(86, 40, -3):
    im.save(poster, quality=q, optimize=True, progressive=True)
    if os.path.getsize(poster) <= 148_000:
        break
print("poster", os.path.getsize(poster), "q", q)

LABEL_EN = "Real photographs of company leaders; all other imagery is AI-generated illustration."
LABEL_AR = "صور حقيقية لقيادات الشركة، وبقية المشاهد صور مولّدة بالذكاء الاصطناعي"
manifest = {
    "id": "journey-of-ambition-v2",
    "title": {"en": "THE CLOSETS — THE JOURNEY OF AMBITION", "ar": "الخزائن — حكاية طموح"},
    "durationSec": DUR,
    "aspectRatio": "16:9",
    "real": False,
    "mixed": True,
    "label": {"en": LABEL_EN, "ar": LABEL_AR},
    "sources": [{"src": PUBLIC + name, "type": "video/mp4", "codecs": "avc1.6400%s, mp4a.40.2" % ("28" if w == 1920 else "1f"), "width": w, "height": h,
                 "bytes": os.path.getsize(os.path.join(out, name))} for name, w, h, *_ in TARGETS],
    "poster": PUBLIC + "journey2-poster.jpg",
    "captions": [
        {"lang": "ar", "label": "العربية", "src": PUBLIC + "journey2.ar.vtt", "kind": "captions", "default": True},
        {"lang": "en", "label": "English (translation)", "src": PUBLIC + "journey2.en.vtt", "kind": "subtitles"},
    ],
    "audio": {"narrationLanguage": "ar", "loudnessLUFS": -16, "music": True},
    "credits": {
        "production": "Assembled locally (Pillow + ffmpeg) from sources generated with Higgsfield.",
        "realPhotographs": "Two real photographs of company leaders (used with the owner's stated consent), shown as photographs with slow camera motion; no AI was applied to them",
        "stills": "Seedream 5.0 Flash and GPT Image 2.6 (AI-generated illustration, animated with camera moves)",
        "videoShots": "Kling 2.6 image-to-video (7 shots, 5 s each, 3 from the first film and 4 new)",
        "narration": "Synthetic voice (Higgsfield Text to Speech V2, ElevenLabs engine, preset voice 'Alistair'); the owner's Arabic script, verbatim",
        "music": "Generated instrumental (ElevenLabs Music v2 via Higgsfield); no third-party recordings",
        "logo": "The official company logo file, composited as is",
    },
    "notes": [
        "Real photographs of company leaders; all other imagery is AI-generated illustration. It is not real footage of the company's factories, showrooms, projects or people.",
        "Landmarks (Manama skyline, causeway, fort, Tree of Life) are AI-generated illustrations, not photographs. Projects named in the narration are shown only as generic AI-generated imagery.",
        "Information only, not an offer or financial advice; details provided directly by management.",
        "Figures stated (more than 50,000 projects, more than 27 patents, two factories, distribution agreements across the Gulf, Iraq and Jordan) are the owner's script; see docs/showroom3d/JOURNEY-V2-FACTS.md for the figures to confirm.",
        "Full storyboard, ledger and wiring change: docs/showroom3d/JOURNEY-V2.md",
    ],
}
json.dump(manifest, open(os.path.join(out, "film2.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("film2.json written")
