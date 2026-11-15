#!/usr/bin/env python3
"""Download the sources of film v2: the v1 stills/clips it re-uses (ledger generations.json) and the new v2 stills, clips and audio
(ledger journey2-ledger.json). Nothing is regenerated and no credits are spent.
Usage: python3 fetch_sources2.py <src-dir>
Layout: <src-dir>/stills/<key>.png, clips/<key>.mp4, audio/{narration2,music2}.mp3
"""
import json
import os
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
fs = os.path.join(here, "..", "..", "docs", "showroom3d", "film-src")
v1 = json.load(open(os.path.join(fs, "generations.json"), encoding="utf-8"))
v2 = json.load(open(os.path.join(fs, "journey2-ledger.json"), encoding="utf-8"))
REUSED_STILLS = {"1d", "1e", "2a", "2c", "3a", "3b", "3c", "3d", "5a", "5b", "5c", "5d", "5e", "6b", "7a", "7b", "7d", "7e", "8a"}
REUSED_CLIPS = {"v1_workshop", "v2_cnc", "v3_drone"}
out = sys.argv[1]
for extra in ("journey3-ledger.json", "journey4-ledger.json"):     # v3: two empty-office stills; v4: the leaders' animated clips (build_film4.py)
    ep = os.path.join(fs, extra)
    if os.path.exists(ep):
        v2["items"] += json.load(open(ep, encoding="utf-8"))["items"]
jobs = [("stills/%s.png" % s["key"], s["result_url"]) for s in v1["stills"] if s["key"] in REUSED_STILLS]
jobs += [("clips/%s.mp4" % v["key"], v["result_url"]) for v in v1["videos"] if v["key"] in REUSED_CLIPS]
for s in v2["items"]:
    if s.get("used_in_film") and s["type"] == "image":
        jobs.append(("stills/%s.png" % s["key"], s["result_url"]))
    elif s.get("used_in_film") and s["type"] == "video":
        jobs.append(("clips/%s.mp4" % s["key"], s["result_url"]))
    elif s.get("used_in_film") and s["type"] == "audio":
        jobs.append(("audio/%s.mp3" % s["key"], s["result_url"]))
for rel, url in jobs:
    if not url:
        print("no stored URL for", rel, "(re-download from the Higgsfield history by job id, see the ledger)")
        continue
    path = os.path.join(out, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        continue
    print("fetch", rel)
    subprocess.run(["curl", "-sS", "--fail", "-o", path, url], check=True)
print(len(jobs), "sources in", out)
