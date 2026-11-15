#!/usr/bin/env python3
"""Original ambient/cinematic bed for the Bonsai Hub film, synthesised locally with numpy (no samples, no licensed music, no AI service).
Usage: python3 synth_music.py <out.wav> [duration=60.5]
Layers: additive pad (D minor progression, picardy D major at the end card), sub drone, soft heartbeat pulse, FM bell arpeggios, a rising swell into the
title hit at 3.5 s, quiet noise whooshes at scene changes, two UI 'ticks' (card drop, publish click). Everything goes through a synthetic hall reverb."""
import sys, wave
import numpy as np
SR = 48000
dur = float(sys.argv[2]) if len(sys.argv) > 2 else 60.5
N = int(SR * dur)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(t0, a, hold, r, amp=1.0):
    e = np.zeros(N, dtype=np.float32); i0 = int(t0 * SR); n = int((a + hold + r) * SR); n = min(n, N - i0)
    if n <= 0: return e
    x = np.arange(n) / SR
    v = np.minimum(1, x / a) * np.where(x < a + hold, 1.0, np.clip(1 - (x - a - hold) / r, 0, 1))
    e[i0:i0 + n] = (v * v * (3 - 2 * v)) * amp
    return e
def tone(f, t0, dur_, pan=0.0, partials=10, det=0.0, vib=0.0):
    """band-limited additive saw-ish tone -> stereo (2,N) before envelope"""
    i0 = int(t0 * SR); n = min(int(dur_ * SR), N - i0)
    if n <= 0: return np.zeros((2, N), np.float32)
    x = np.arange(n) / SR; ph = 2 * np.pi * f * (1 + det) * x + vib * np.sin(2 * np.pi * 0.23 * x + f)
    y = np.zeros(n)
    for k in range(1, partials + 1):
        if f * k > 5200: break
        y += np.sin(k * ph + k) / (k ** 1.35)
    out = np.zeros((2, N), np.float32); gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[0, i0:i0 + n] = y * gl; out[1, i0:i0 + n] = y * gr
    return out
def stereo_env(sig, e): return sig * e[None, :]
# ---- chords (midi), 5 s each: Dm9, Bbmaj7, Gm9, A(sus) | Dm9, Bb, Gm9, A | Dm, Bb, Gm, Dmaj(final)
CH = [([38, 50, 57, 62, 65, 69, 72], 'Dm'), ([34, 46, 53, 57, 62, 65, 69], 'Bb'), ([31, 43, 50, 58, 62, 65, 69], 'Gm'), ([33, 45, 52, 57, 62, 64, 69], 'A')]
final = ([38, 50, 57, 62, 66, 69, 74], 'D')
pad = np.zeros((2, N), np.float32); sub = np.zeros(N, np.float32)
nchords = int(np.ceil(dur / 5))
for c in range(nchords):
    notes = final[0] if c >= 11 else CH[c % 4][0]
    t0 = c * 5.0 - 0.9 if c else 0.0; L = 5.0 + (1.8 if c else 0.9) + (4.0 if c >= 11 else 0)
    amp = 0.9 if c < 2 else 1.0
    for j, m in enumerate(notes):
        for d, pan in ((-0.0035, -0.7), (0.0, 0.0), (0.0035, 0.7)):
            s = tone(hz(m), max(t0, 0), L, pan, partials=9 if m > 45 else 6, det=d, vib=0.4)
            e = env(max(t0, 0), 2.0, L - 4.0, 2.2, amp * (0.55 if m < 45 else 0.34 / (1 + 0.04 * j)))
            pad += stereo_env(s, e)
    sub += (np.sin(2 * np.pi * hz(notes[0] - 12) * t) * env(max(t0, 0), 1.5, L - 3.0, 2.0, 0.55)).astype(np.float32)
# pad swell: brightness/level automation across the film
auto = np.interp(t, [0, 3.4, 6, 15, 30, 47, 55, 58, dur], [0.35, 0.5, 0.8, 0.95, 1.0, 1.05, 1.15, 1.0, 0.7]).astype(np.float32)
pad *= auto[None, :]; sub *= auto
# ---- heartbeat pulse (soft), from 6.0 to 54.5, every beat (0.625 s); ramps in
beat = 60 / 96.0; pulse = np.zeros(N, np.float32)
for k in range(int((54.5 - 6.0) / beat)):
    tt = 6.0 + k * beat; i0 = int(tt * SR); n = int(0.42 * SR)
    if i0 + n > N: break
    x = np.arange(n) / SR; f = 46 + 70 * np.exp(-x * 26); ph = 2 * np.pi * np.cumsum(f) / SR
    a = np.interp(tt, [6, 12, 36, 47, 54.5], [0.0, 0.5, 0.75, 0.9, 0.5]) * (1.0 if k % 4 == 0 else 0.62)
    pulse[i0:i0 + n] += (np.sin(ph) * np.exp(-x * 7.5) * a * 0.55).astype(np.float32)
# ---- title hit at 3.5 + riser 0.4..3.5
hit = np.zeros(N, np.float32); i0 = int(3.5 * SR); n = int(5.0 * SR); x = np.arange(n) / SR
fh = 34 + 60 * np.exp(-x * 9); hit[i0:i0 + n] += (np.sin(2 * np.pi * np.cumsum(fh) / SR) * np.exp(-x * 1.1) * 0.9).astype(np.float32)
noise = rng.standard_normal(N).astype(np.float32)
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    # vectorised one-pole via lfilter-free recursion in blocks is slow in python; use FFT filter instead
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); H = 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X * H, len(x)).astype(np.float32)
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); H = (1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / np.sqrt(1 + (f / hi) ** 4)); return np.fft.irfft(X * H, len(x)).astype(np.float32)
bn = bp(noise, 300, 3500)
riser = bn * env(0.2, 3.1, 0.0, 0.25, 0.22) * np.interp(t, [0.2, 3.5], [0.05, 1.0]).astype(np.float32)
sweep = np.sin(2 * np.pi * np.cumsum(np.interp(t, [0.2, 3.5], [110, 880])) / SR).astype(np.float32) * env(0.2, 3.1, 0.0, 0.2, 0.08)
# ---- whooshes at scene changes
wh = np.zeros(N, np.float32)
for T in (6.0, 15.0, 27.0, 36.0, 47.0, 55.0):
    seg = bp(noise, 400 + 200 * (T % 3), 2500 + 800 * (T % 5)); wh += seg * env(T - 0.5, 0.55, 0.0, 0.8, 0.10)
# ---- bells: FM, sparse -> denser; D minor pentatonic + chord tones
def bell(f, t0, vel=1.0, pan=0.0):
    i0 = int(t0 * SR); n = min(int(2.6 * SR), N - i0)
    if n <= 0: return np.zeros((2, N), np.float32)
    x = np.arange(n) / SR; idx = 2.2 * np.exp(-x * 3.2)
    y = np.sin(2 * np.pi * f * x + idx * np.sin(2 * np.pi * f * 3.5 * x)) * np.exp(-x * 2.1) * vel
    o = np.zeros((2, N), np.float32); o[0, i0:i0 + n] = y * np.cos((pan + 1) * np.pi / 4); o[1, i0:i0 + n] = y * np.sin((pan + 1) * np.pi / 4); return o
bells = np.zeros((2, N), np.float32)
penta = [74, 77, 79, 81, 84, 86, 89]  # D5 F5 G5 A5 C6 D6 F6
arp = {0: [74, 81, 77, 84], 1: [70, 77, 74, 81], 2: [67, 74, 70, 77], 3: [69, 76, 73, 81]}
k = 0
for tt in np.arange(7.0, 54.6, beat):
    dens = 2 if tt < 15 else 1 if tt < 47 else 2   # every 2 beats early, every beat mid, every 2 late
    idx = int(round((tt - 7.0) / beat))
    if tt < 15 and idx % 2: continue
    if tt > 47 and idx % 2: continue
    c = int(tt // 5) % 4; note = arp[c][k % 4]; k += 1
    v = np.interp(tt, [7, 15, 36, 54.5], [0.10, 0.17, 0.2, 0.14])
    bells += bell(hz(note), tt, v, pan=(-0.5 if k % 2 else 0.5))
# end card: a bright high chord of bells at 55.2
for j, m in enumerate([74, 78, 81, 86]): bells += bell(hz(m), 55.2 + j * 0.12, 0.2, pan=(-0.6 + 0.4 * j))
# ---- UI ticks
def tick(t0, f=1320, v=0.22):
    i0 = int(t0 * SR); n = int(0.25 * SR); x = np.arange(n) / SR; y = (np.sin(2 * np.pi * f * x) * np.exp(-x * 38) + 0.5 * np.sin(2 * np.pi * f * 2.01 * x) * np.exp(-x * 60)) * v
    o = np.zeros(N, np.float32); o[i0:i0 + n] = y; return o
ticks = tick(19.0 + (104 - 10) / 24.0, 1175, 0.28) + tick(43.2, 1568, 0.2) + tick(40.05, 1319, 0.15)
# ---- reverb (synthetic hall)
def ir(sec, seed):
    r = np.random.default_rng(seed); n = int(sec * SR); x = np.arange(n) / SR
    y = r.standard_normal(n) * np.exp(-x * 2.3); y = lp(y.astype(np.float32), 3800) * (1 - np.exp(-x * 60)); return y.astype(np.float32)
def conv(x, h):
    n = len(x) + len(h); L = 1 << (n - 1).bit_length(); y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(h, L), L)[:len(x)]; return y.astype(np.float32)
hl, hr = ir(3.4, 11), ir(3.4, 12)
dry_pad = pad
send = np.stack([pad[0] * 0.35 + bells[0] * 0.8 + hit * 0.5 + ticks * 0.6, pad[1] * 0.35 + bells[1] * 0.8 + hit * 0.5 + ticks * 0.6])
wet = np.stack([conv(send[0], hl), conv(send[1], hr)]) * 0.55
mono_low = sub * 0.6 + pulse * 0.8 + hit * 0.8
L = dry_pad[0] * 0.55 + bells[0] * 0.8 + mono_low * 0.9 + riser * 0.6 + sweep + wh * 0.8 + ticks + wet[0]
R = dry_pad[1] * 0.55 + bells[1] * 0.8 + mono_low * 0.9 + riser * 0.6 + sweep + wh * 0.8 + ticks + wet[1]
out = np.stack([L, R])
fade = np.minimum(1, t / 0.6) * np.clip((dur - t) / 1.6, 0, 1); out *= fade[None, :]
out = np.tanh(out / (np.max(np.abs(out)) * 0.9) * 1.2) * 0.8   # gentle soft clip / normalise; final level is set with loudnorm in ffmpeg
pcm = (out.T * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1], dur, 's')
