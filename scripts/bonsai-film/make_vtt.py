#!/usr/bin/env python3
"""python3 make_vtt.py <outdir>  -> bonsai-hub.en.vtt / bonsai-hub.ar.vtt from cues.json (same text as the on-screen lines)"""
import json, os, sys
cues = json.load(open(os.path.join(os.path.dirname(__file__), 'cues.json'), encoding='utf8'))
def ts(s): h = int(s // 3600); m = int(s % 3600 // 60); return f"{h:02d}:{m:02d}:{s % 60:06.3f}"
for lang, i in (('en', 2), ('ar', 3)):
    with open(os.path.join(sys.argv[1], f'bonsai-hub.{lang}.vtt'), 'w', encoding='utf8') as f:
        f.write('WEBVTT\n\n')
        for n, c in enumerate(cues, 1): f.write(f"{n}\n{ts(c[0])} --> {ts(c[1])}\n{c[i]}\n\n")
