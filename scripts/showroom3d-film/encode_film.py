#!/usr/bin/env python3
"""Encode the deliverables from the rendered picture master and the sound mix.

Usage: python3 encode_film.py <work-dir> <out-dir> [--src <src-dir> --fonts <fonts-dir> --logo <logo.jpg>]
Writes journey-1080.mp4, journey-720.mp4, journey-poster.jpg, journey.ar.vtt, journey.en.vtt and film.json into <out-dir>
(the site serves that folder as /yas-bloom/film/).
"""
import json
import os
import subprocess
import sys

from PIL import Image

import build_film
from build_film import DUR, narr_to_film

work, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))
WORDS = json.load(open(os.path.join(here, "..", "..", "docs", "showroom3d", "film-src", "narration.words.json"), encoding="utf-8"))["words"]
PUBLIC = "/yas-bloom/film/"

# word index range in the narration, the owner's Arabic text (verbatim), a faithful English translation
CUES = [
    (0, 6, "كل حكاية عظيمة... كان لها يوم بداية.", "Every great story... had a day it began."),
    (7, 14, "وفي البحرين... بدأت حكايتنا من ورشة خشب صغيرة.", "And in Bahrain... our story began in a small woodworking workshop."),
    (15, 17, "أوراق، وأقلام، وأفكار...", "Papers, pencils and ideas..."),
    (18, 24, "وأيدٍ تؤمن أن الطموح أكبر من الإمكانيات.", "and hands that believed ambition is greater than means."),
    (25, 30, "ما كان عندنا إلا الشغف، والإصرار،", "All we had was passion, determination,"),
    (31, 36, "والرغبة في أن نصنع شيئاً مختلفاً.", "and the desire to make something different."),
    (37, 41, "كبر الحلم... وكبرت معاه المسؤولية.", "The dream grew... and the responsibility grew with it."),
    (42, 47, "من ورشة صغيرة... إلى مصنعين متكاملين،", "From a small workshop... to two integrated factories,"),
    (48, 52, "مجهزين بأحدث المكائن والتقنيات الأوروبية.", "equipped with the latest European machinery and technologies."),
    (53, 60, "ومن فريق صغير... إلى أكثر من خمسة فروع،", "And from a small team... to more than five branches,"),
    (61, 66, "وحضور يمتد إلى السعودية وقطر والإمارات.", "and a presence that reaches Saudi Arabia, Qatar and the UAE."),
    (67, 70, "ومن فكرة على ورقة...", "And from an idea on paper..."),
    (71, 77, "إلى أكثر من عشرة آلاف مشروع نفذناه،", "to more than ten thousand projects we have delivered,"),
    (78, 84, "وتركنا فيه بصمتنا في بيوت ومشاريع عملائنا.", "leaving our mark on our clients' homes and projects."),
    (85, 94, "لكن بالنسبة لنا... النجاح ما كان مجرد توسع في الأعمال.", "But for us... success was never just business expansion."),
    (95, 99, "كان مسؤولية أكبر، وتطلعات أكبر.", "It was a greater responsibility, and greater aspirations."),
    (100, 106, "استثمرنا في الإنسان، وفي الجودة، وفي السلامة.", "We invested in people, in quality, and in safety."),
    (107, 112, "وتبنّينا الحوكمة، والمعايير العالمية، وتطوير العمليات.", "And we embraced governance, international standards, and process development."),
    (113, 116, "واليوم... نخطو مرحلة جديدة.", "And today... we step into a new phase."),
    (117, 121, "مرحلة نربط فيها التصميم بالتصنيع،", "A phase in which we connect design with manufacturing,"),
    (122, 126, "والمصانع بسلاسل التوريد، والمشاريع بالإدارة،", "factories with supply chains, projects with management,"),
    (127, 132, "وكل تفاصيل العمل بمنظومة رقمية متكاملة.", "and every detail of the work, in one integrated digital system."),
    (133, 140, "من أول فكرة... إلى آخر تفصيلة في المشروع.", "From the first idea... to the last detail of the project."),
    (141, 144, "رحلتنا بدأت في البحرين...", "Our journey began in Bahrain..."),
    (145, 149, "ومن البحرين نواصل صناعة المستقبل.", "and from Bahrain we continue to build the future."),
    (150, 151, "الخزائن العالمية.", "The Closets International."),
    (152, 154, "طموح بدأ صغيراً...", "An ambition that started small..."),
    (155, 160, "وصناعة تتطلع إلى ما هو أكبر.", "and an industry that looks toward something greater."),
]
SCRIPT_AR = ("كل حكاية عظيمة... كان لها يوم بداية. وفي البحرين... بدأت حكايتنا من ورشة خشب صغيرة. أوراق، وأقلام، وأفكار... وأيدٍ تؤمن أن الطموح أكبر من الإمكانيات. "
             "ما كان عندنا إلا الشغف، والإصرار، والرغبة في أن نصنع شيئاً مختلفاً. كبر الحلم... وكبرت معاه المسؤولية. من ورشة صغيرة... إلى مصنعين متكاملين، "
             "مجهزين بأحدث المكائن والتقنيات الأوروبية. ومن فريق صغير... إلى أكثر من خمسة فروع، وحضور يمتد إلى السعودية وقطر والإمارات. ومن فكرة على ورقة... "
             "إلى أكثر من عشرة آلاف مشروع نفذناه، وتركنا فيه بصمتنا في بيوت ومشاريع عملائنا. لكن بالنسبة لنا... النجاح ما كان مجرد توسع في الأعمال. "
             "كان مسؤولية أكبر، وتطلعات أكبر. استثمرنا في الإنسان، وفي الجودة، وفي السلامة. وتبنّينا الحوكمة، والمعايير العالمية، وتطوير العمليات. "
             "واليوم... نخطو مرحلة جديدة. مرحلة نربط فيها التصميم بالتصنيع، والمصانع بسلاسل التوريد، والمشاريع بالإدارة، وكل تفاصيل العمل بمنظومة رقمية متكاملة. "
             "من أول فكرة... إلى آخر تفصيلة في المشروع. رحلتنا بدأت في البحرين... ومن البحرين نواصل صناعة المستقبل. الخزائن العالمية. "
             "طموح بدأ صغيراً... وصناعة تتطلع إلى ما هو أكبر.")
assert " ".join(c[2] for c in CUES) == SCRIPT_AR, "Arabic captions must be the owner's script verbatim"
assert CUES[-1][1] == len(WORDS) - 1 and all(CUES[i][1] + 1 == CUES[i + 1][0] for i in range(len(CUES) - 1))


def stamp(t):
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def write_vtt(path, col, lang):
    times = []
    for a, b, *_ in CUES:
        times.append([narr_to_film(WORDS[a]["s"]) - 0.06, narr_to_film(WORDS[b]["s"]) + (WORDS[b]["e"] - WORDS[b]["s"]) + 0.30])
    for i in range(len(times) - 1):
        times[i][1] = min(times[i][1], times[i + 1][0] - 0.04)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f"WEBVTT\nKind: captions\nLanguage: {lang}\n\n")
        for i, ((s, e), cue) in enumerate(zip(times, CUES), 1):
            fh.write(f"{i}\n{stamp(s)} --> {stamp(e)}\n{cue[col]}\n\n")


write_vtt(os.path.join(out, "journey.ar.vtt"), 2, "ar")
write_vtt(os.path.join(out, "journey.en.vtt"), 3, "en")

pic, mix = os.path.join(work, "picture.mkv"), os.path.join(work, "mix.wav")
common = ["-profile:v", "high", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
          "-g", "72", "-keyint_min", "24", "-x264-params", "aq-mode=3:aq-strength=0.9:deblock=-1,-1:rc-lookahead=60"]
TARGETS = [("journey-1080.mp4", 1920, 1080, "1000k", "128k", "4.0"), ("journey-720.mp4", 1280, 720, "392k", "96k", "3.1")]
for name, w, h, vb, ab, level in TARGETS:
    vf = [] if w == 1920 else ["-vf", f"scale={w}:{h}:flags=lanczos"]
    log = os.path.join(work, "x264_" + name)
    base = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", pic]
    subprocess.run(base + vf + ["-c:v", "libx264", "-preset", "veryslow", "-b:v", vb, "-level", level] + common +
                   ["-pass", "1", "-passlogfile", log, "-an", "-f", "null", os.devnull], check=True)
    subprocess.run(base + ["-i", mix] + vf + ["-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "veryslow", "-b:v", vb,
                                              "-level", level] + common +
                   ["-pass", "2", "-passlogfile", log, "-c:a", "aac", "-b:a", ab, "-ar", "48000", "-ac", "2",
                    "-movflags", "+faststart", "-metadata", "title=THE CLOSETS - THE JOURNEY OF AMBITION",
                    "-metadata", "comment=Illustrative imagery generated with AI. Narration: synthetic voice.",
                    "-t", f"{DUR:.3f}", os.path.join(out, name)], check=True)
    print(name, os.path.getsize(os.path.join(out, name)))

# poster: the title frame, straight from the picture master
tmp = os.path.join(work, "poster.png")
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", "3.6", "-i", pic, "-frames:v", "1", "-vf", "scale=1280:720:flags=lanczos", tmp], check=True)
poster = os.path.join(out, "journey-poster.jpg")
im = Image.open(tmp).convert("RGB")
for q in range(86, 40, -3):
    im.save(poster, quality=q, optimize=True, progressive=True)
    if os.path.getsize(poster) <= 148_000:
        break
print("poster", os.path.getsize(poster), "q", q)

manifest = {
    "id": "journey-of-ambition",
    "title": {"en": "THE CLOSETS — THE JOURNEY OF AMBITION", "ar": "الخزائن — حكاية طموح"},
    "durationSec": DUR,
    "aspectRatio": "16:9",
    "sources": [{"src": PUBLIC + name, "type": "video/mp4", "codecs": "avc1.6400%s, mp4a.40.2" % ("28" if w == 1920 else "1f"),
                 "width": w, "height": h, "bytes": os.path.getsize(os.path.join(out, name))} for name, w, h, *_ in TARGETS],
    "poster": PUBLIC + "journey-poster.jpg",
    "captions": [
        {"lang": "ar", "label": "العربية", "src": PUBLIC + "journey.ar.vtt", "kind": "captions", "default": True},
        {"lang": "en", "label": "English", "src": PUBLIC + "journey.en.vtt", "kind": "subtitles"},
    ],
    "audio": {"narrationLanguage": "ar", "loudnessLUFS": -16, "music": True},
    "credits": {
        "production": "Assembled locally (Pillow + ffmpeg) from sources generated with Higgsfield.",
        "stills": "Seedream 5.0 Flash (33 frames, animated with camera moves)",
        "videoShots": "Kling 2.6 image-to-video (3 shots, 5 s each)",
        "narration": "Synthetic voice (Higgsfield Text to Speech V2, ElevenLabs engine, preset voice 'Alistair'); the owner's Arabic script, verbatim",
        "music": "Generated instrumental (ElevenLabs Music v2 via Higgsfield); no third-party recordings",
        "logo": "The official company logo file, composited as is",
    },
    "notes": [
        "All imagery is AI-generated illustration. It is not real footage of the company, its people, factories, showrooms or projects.",
        "The film says so on its end card: 'Illustrative imagery generated with AI'.",
        "Facts stated (two factories in Bahrain, more than five branches, presence in Saudi Arabia, Qatar and the UAE, more than 10,000 projects, European machinery, quality and safety standards, digital transformation) were supplied by the owner for this film.",
        "Full shot list, prompts, credits and the upgrade path: docs/showroom3d/FILM.md",
    ],
}
json.dump(manifest, open(os.path.join(out, "film.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("film.json written")
