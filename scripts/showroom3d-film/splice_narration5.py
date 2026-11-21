#!/usr/bin/env python3
"""v5: put the re-voiced 50,000 sentence into the v1 narration, on the same time axis.

Usage: python3 splice_narration5.py <src-dir> <chunk.mp3> <chunk-words.json (docs/showroom3d/film-src/journey5-chunk-words.json)> <out.wav>
The chunk is the two sentences "ومن فكرة على ورقة... إلى أكثر من خمسين ألف مشروع نفذناه، وتركنا فيه بصمتنا في بيوت ومشاريع عملائنا."
read by the same voice (Text to Speech V2, preset Alistair). It replaces the original read of words 67..84 (45.5 s to 55.98 s of
the narration). Both cuts sit inside the natural pauses before and after the sentence pair, so nothing is stretched and every other word
keeps its time; only the words of the replaced range get new times (written to journey5-narration.words.json).
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
src, chunk_mp3, chunk_words, out = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
FS = os.path.join(here, "..", "..", "docs", "showroom3d", "film-src")


def dec(path):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


orig = dec(os.path.join(src, "audio", "narration.mp3"))
new = dec(chunk_mp3)
CUT_A, CUT_B = 45.30, 56.15           # inside the pauses (silence 44.99-45.64 and 55.87-56.44)
PLACE = 45.56                         # the new voice starts here (the old sentence pair started at 45.64)
cw = json.load(open(chunk_words, encoding="utf-8"))["words"]
assert len(cw) == 18


def rms(x):
    return float(np.sqrt(np.mean(x ** 2) + 1e-12))


# level-match the new read to the speech around it (the 8 s before the cut), measured on speech frames only
def speech_rms(x):
    h = SR // 20
    n = len(x) // h
    r = np.sqrt(np.mean(x[:n * h].reshape(n, h) ** 2, axis=1))
    return float(np.sqrt(np.mean(r[r > 0.02] ** 2)))


ref = speech_rms(orig[int(36 * SR):int(44.9 * SR)])
gain = ref / speech_rms(new)
new = new * gain
print(f"level-match gain {20 * np.log10(gain):+.2f} dB")
vend = cw[-1]["e"] + 0.15
new = new[:int(vend * SR)]
f = int(0.015 * SR)
ramp = np.linspace(0, 1, f, dtype=np.float32)
new[:f] *= ramp
new[-f:] *= ramp[::-1]
res = orig.copy()
a, b = int(CUT_A * SR), int(CUT_B * SR)
res[a:b] = 0
p = int(PLACE * SR)
assert p + len(new) < b
res[p:p + len(new)] += new
import wave
pcm = (np.clip(res, -1, 1) * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", out, "voice of the new pair ends at", round(PLACE + vend, 2), "s (old: 55.98 s)")

words = json.load(open(os.path.join(FS, "narration.words.json"), encoding="utf-8"))
ws = words["words"]
NEW_AR = "ومن فكرة على ورقة إلى أكثر من خمسين ألف مشروع نفذناه وتركنا فيه بصمتنا في بيوت ومشاريع عملائنا".split()
for k, i in enumerate(range(67, 85)):
    ws[i] = {"w": NEW_AR[k], "s": round(PLACE + cw[k]["s"], 2), "e": round(PLACE + cw[k]["e"], 2)}
words["source"] = ("v1 narration with words 67-84 (the 'projects' sentence pair) replaced by a new read of the same voice, "
                   "saying 'more than fifty thousand'. Times for those words: faster-whisper medium on the new read + %.2f s; all other words are v1's." % PLACE)
json.dump(words, open(os.path.join(FS, "journey5-narration.words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
