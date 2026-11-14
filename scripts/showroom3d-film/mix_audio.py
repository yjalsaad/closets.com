#!/usr/bin/env python3
"""Mix the film's sound: the narration (cut only in its natural pauses, never time-stretched) over the music bed.

Usage: python3 mix_audio.py <src-dir> <work-dir>      -> <work-dir>/mix.wav (48 kHz stereo)
The music is ducked under the voice, opens up in the gaps between chapters, and its final chord is held under the end card.
"""
import os
import subprocess
import sys
import wave

import numpy as np

from build_film import DUR, NARR_END, NARR_SEGMENTS

SR = 48000
src, out = sys.argv[1], sys.argv[2]


def decode(path, channels, af=None):
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-i", path]
    if af:
        cmd += ["-af", af]
    cmd += ["-ac", str(channels), "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


n = int(DUR * SR)
# voice: remove rumble, even it out a little
voice_src = decode(os.path.join(src, "audio", "narration.mp3"), 1,
                   "highpass=f=70,acompressor=threshold=-22dB:ratio=2.2:attack=10:release=180:makeup=1.5")[:, 0]
voice = np.zeros(n, dtype=np.float32)
fade = int(0.008 * SR)
ramp = np.linspace(0, 1, fade, dtype=np.float32)
for i, (start, off) in enumerate(NARR_SEGMENTS):
    end = NARR_SEGMENTS[i + 1][0] if i + 1 < len(NARR_SEGMENTS) else NARR_END
    seg = voice_src[int(start * SR):int(end * SR)].copy()
    seg[:fade] *= ramp
    seg[-fade:] *= ramp[::-1]
    a = int((start + off) * SR)
    voice[a:a + len(seg)] += seg[:max(0, n - a)]

# ducking envelope at 100 Hz: "voice present" with a 0.8 s hold so ordinary pauses stay ducked
hop = SR // 100
frames = len(voice) // hop
rms = np.sqrt(np.mean(voice[:frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
active = rms > 10 ** (-44 / 20)
hold = 80
held = active.copy()
for k in range(1, hold + 1):
    held[:-k] |= active[k:]          # look ahead (duck just before the voice returns)
    held[k:] |= active[:-k] if k <= 55 else False
DUCK, OPEN = -13.0, -4.5
target = np.where(held, DUCK, OPEN).astype(np.float32)
env = np.empty_like(target)
g = OPEN
for i, tg in enumerate(target):
    coef = 0.085 if tg < g else 0.022      # ~0.12 s down, ~0.45 s up
    g += (tg - g) * coef
    env[i] = g
t = np.arange(n) / SR
gain_db = np.interp(t, np.arange(frames) / 100.0, env)
# the last chord: lift its natural decay so it rings under the end card, then fade to silence
gain_db += np.interp(t, [0, 114.8, 121.2, DUR], [0, 0, 18.0, 18.0])
gain = 10 ** (gain_db / 20)
gain *= np.clip(t / 0.5, 0, 1) * np.clip((DUR - 0.1 - t) / 2.4, 0, 1)

music = decode(os.path.join(src, "audio", "music.mp3"), 2)
m = np.zeros((n, 2), dtype=np.float32)
k = min(n, len(music))
m[:k] = music[:k]
mix = m * gain[:, None] + (voice * 1.0)[:, None]

peak = np.abs(mix).max()
tmp = os.path.join(out, "mix_raw.f32")
mix.astype(np.float32).tofile(tmp)
# measure programme loudness, then bring it to -16 LUFS with a true-peak-safe limiter
meas = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                       "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
lufs = float([l for l in meas.splitlines() if l.strip().startswith("I:")][-1].split()[1])
gain_fix = -16.0 - lufs
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                "-af", f"volume={gain_fix:.2f}dB,alimiter=limit=0.82:attack=5:release=80:level=false",
                "-c:a", "pcm_s16le", os.path.join(out, "mix.wav")], check=True)
os.remove(tmp)
print(f"raw peak {20 * np.log10(peak):.1f} dBFS, raw loudness {lufs:.1f} LUFS, gain {gain_fix:+.1f} dB -> {os.path.join(out, 'mix.wav')}")
