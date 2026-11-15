#!/usr/bin/env python3
"""Mix the sound of film v2: the new narration (never time-stretched, starts 2 s into the film) over the music bed.

Usage: python3 mix_audio2.py <src-dir> <work-dir>      -> <work-dir>/mix.wav (48 kHz stereo, -16 LUFS integrated)
The music is ducked under the voice, opens up when the voice stops (end card), and fades out under the end card.
"""
import os
import subprocess
import sys

import numpy as np

sys.argv, _argv = sys.argv[:1], sys.argv[1:]
from build_film2 import DUR, OFF, END_T                 # noqa: E402  (importing only reads the word timings)
src, out = _argv

SR = 48000


def decode(path, channels, af=None):
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-i", path]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", str(channels), "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


n = int(DUR * SR)
voice_src = decode(os.path.join(src, "audio", "narration2.mp3"), 1,
                   "highpass=f=70,acompressor=threshold=-22dB:ratio=2.2:attack=10:release=180:makeup=1.5")[:, 0]
voice = np.zeros(n, dtype=np.float32)
a = int(OFF * SR)
seg = voice_src.copy()
fade = int(0.008 * SR)
seg[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)
seg[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
voice[a:a + len(seg)] += seg[:max(0, n - a)]

# ducking envelope at 100 Hz: "voice present" with a hold so ordinary pauses stay ducked
hop = SR // 100
frames = len(voice) // hop
rms = np.sqrt(np.mean(voice[:frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
active = rms > 10 ** (-44 / 20)
held = active.copy()
for k in range(1, 81):
    held[:-k] |= active[k:]
    held[k:] |= active[:-k] if k <= 55 else False
DUCK, OPEN = -12.0, -4.5
target = np.where(held, DUCK, OPEN).astype(np.float32)
env = np.empty_like(target)
g = OPEN
for i, tg in enumerate(target):
    g += (tg - g) * (0.085 if tg < g else 0.022)
    env[i] = g
t = np.arange(n) / SR
gain_db = np.interp(t, np.arange(frames) / 100.0, env)
gain_db += np.interp(t, [0, END_T - 1.0, END_T + 3.0, DUR], [0, 0, 3.0, 3.0])        # let the final chord breathe under the end card
gain = 10 ** (gain_db / 20)
gain *= np.clip(t / 0.5, 0, 1) * np.clip((DUR - 0.1 - t) / 3.0, 0, 1)

music = decode(os.path.join(src, "audio", "music2.mp3"), 2)
m = np.zeros((n, 2), dtype=np.float32)
k = min(n, len(music))
m[:k] = music[:k]
mix = m * gain[:, None] + voice[:, None]

def _lufs(x, ch):
    p = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", str(ch), "-i", "-", "-af", "ebur128", "-f", "null", "-"],
                       input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), capture_output=True).stderr.decode()
    return float([l for l in p.splitlines() if l.strip().startswith("I:")][-1].split()[1])


_sp = slice(a, a + len(seg))          # where the narration plays
print(f"inside the narration: voice {_lufs(voice[_sp], 1):.1f} LUFS, music under it {_lufs((m * gain[:, None])[_sp], 2):.1f} LUFS (before the final -16 LUFS gain)")
tmp = os.path.join(out, "mix_raw.f32")
mix.astype(np.float32).tofile(tmp)
meas = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp, "-af", "ebur128", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
lufs = float([l for l in meas.splitlines() if l.strip().startswith("I:")][-1].split()[1])
fix = -16.0 - lufs
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                "-af", f"volume={fix:.2f}dB,alimiter=limit=0.72:attack=5:release=80:level=false", "-c:a", "pcm_s16le",
                os.path.join(out, "mix.wav")], check=True)
os.remove(tmp)
print(f"raw loudness {lufs:.1f} LUFS, gain {fix:+.1f} dB -> {os.path.join(out, 'mix.wav')}")
