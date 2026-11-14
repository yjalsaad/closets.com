#!/usr/bin/env python3
"""Download the film's generated sources listed in docs/showroom3d/film-src/generations.json.

Usage: python3 fetch_sources.py <src-dir>
Nothing is regenerated and no credits are spent: the files are fetched from the result URLs recorded in the ledger.
Layout written: <src-dir>/stills/<key>.png, <src-dir>/clips/<key>.mp4, <src-dir>/audio/{narration,music}.mp3
"""
import json
import os
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
ledger = json.load(open(os.path.join(here, "..", "..", "docs", "showroom3d", "film-src", "generations.json"), encoding="utf-8"))
out = sys.argv[1]
jobs = [(os.path.join("stills", s["key"] + ".png"), s["result_url"]) for s in ledger["stills"] if s.get("used_in_film", True)]
jobs += [(os.path.join("clips", v["key"] + ".mp4"), v["result_url"]) for v in ledger["videos"]]
jobs += [(os.path.join("audio", a["key"] + ".mp3"), a["result_url"]) for a in ledger["audio"] if a.get("used_in_film")]
for rel, url in jobs:
    path = os.path.join(out, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        continue
    print("fetch", rel)
    subprocess.run(["curl", "-sS", "--fail", "-o", path, url], check=True)
print(len(jobs), "sources in", out)
