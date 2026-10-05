"""SITE PULSE — bande originale (44,2 s, 48 kHz stéréo).
Électro cinématique en la mineur, 100 BPM, calée sur les battements de la vidéo.
Intro (pouls) → signal plat → impulsion → montée → vitrine (groove) → drop (visibilité) → outro (pouls)."""
import json
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 44.2
N = int((DUR + 0.5) * SR)
rng = np.random.default_rng(7)
L = np.zeros(N); Rr = np.zeros(N)
send = np.zeros((2, N))          # bus réverbe
dly = np.zeros((2, N))           # bus delay

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def idx(t): return int(t * SR)
def add(buf, t0, sig, gain=1.0, pan=0.0, rev=0.0, delay=0.0):
    i = idx(t0); n = min(len(sig), N - i)
    if n <= 0: return
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = sig[:n] * gain
    L[i:i + n] += s * gl; Rr[i:i + n] += s * gr
    if rev: send[0, i:i + n] += s * gl * rev; send[1, i:i + n] += s * gr * rev
    if delay: dly[0, i:i + n] += s * gl * delay; dly[1, i:i + n] += s * gr * delay

def env_adsr(n, a, d, s, r, total):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = np.clip((total - t) / max(r, 1e-4), 0, 1)
    return e * rel

def tone(freq, dur, harm=8, bright=3.0, detune=0.0, phase=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for h in range(1, harm + 1):
        f = freq * h * (1 + detune)
        if f > SR / 2.2: break
        out += np.sin(2 * np.pi * f * t + phase * h) / h * np.exp(-(h - 1) / bright)
    return out

def noise(dur): return rng.standard_normal(int(round(dur * SR)))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(4, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)

# ---------------- temps ----------------
base_beats = json.load(open('beats.json'))
def g_of_b(t): return t if t < 19 else (19 + (t - 19) / 0.15 if t < 20.8 else t + 10.2)
G0, BEAT = 13.45, 0.6
GRID = [G0 + k * BEAT for k in range(40)]             # 13.45 → 36.85
DROP_K = 29                                            # 30.85 s : fin de la vitrine
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
ROOTS = [33, 29, 36, 31]

# ---------------- acte I : nappe + pouls ----------------
def pad_chord(t0, dur, notes, gain, bright, pan_spread=0.6, rev=0.5):
    for j, m in enumerate(notes):
        for d, pn in ((-0.004, -pan_spread), (0.0, 0.0), (0.0045, pan_spread)):
            s = tone(mtof(m), dur, harm=10, bright=bright, detune=d, phase=j + d * 900)
            s *= env_adsr(len(s), 0.8, 2.0, 0.85, 1.2, dur)
            add(L, t0, s, gain / len(notes), pan=pn, rev=rev)

pad_chord(0.3, 11.2, [45, 52, 57, 59, 64], 0.10, 1.6)         # Am add9 sombre
sub = np.sin(2 * np.pi * 55 * np.arange(int(10.9 * SR)) / SR) * env_adsr(int(10.9 * SR), 2.5, 3, 0.8, 0.5, 10.9)
add(L, 0.3, sub, 0.10)

def heartbeat(t, gain=0.9):
    for off, f0, f1, a in ((0.0, 62, 38, 1.0), (0.15, 74, 44, 0.55)):
        n = int(0.28 * SR); tt = np.arange(n) / SR
        f = f1 + (f0 - f1) * np.exp(-tt / 0.05)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.08) * np.minimum(1, tt / 0.003)
        add(L, t + off, s, gain * a)

for b in base_beats:
    g = g_of_b(b)
    if b < 11.2 or b >= 27: heartbeat(g, 0.85 if b < 11.2 else 0.7)

# ---------------- signal plat : bip + silence ----------------
n = idx(12.76) - idx(11.45); tt = np.arange(n) / SR
add(L, 11.45, np.sin(2 * np.pi * 1000 * tt) * np.minimum(1, tt * 40) * np.minimum(1, (tt[-1] - tt) * 60 + 0.001), 0.07, rev=0.1)

# ---------------- l'impulsion ----------------
n = int(3.0 * SR); tt = np.arange(n) / SR
f = 26 + 30 * np.exp(-tt / 0.5)
add(L, 12.8, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9), 0.9, rev=0.3)
add(L, 12.8, lp(noise(1.6), 1800) * np.exp(-np.arange(int(1.6 * SR)) / SR / 0.25), 0.6, rev=0.8)
add(L, 12.8, hp(noise(0.5), 4000) * np.exp(-np.arange(int(0.5 * SR)) / SR / 0.07), 0.25, rev=0.6)
# souffle inversé avant le choc
n = int(1.2 * SR); tt = np.arange(n) / SR
add(L, 11.6, bp(noise(1.2), 300, 3000) * (tt / 1.2) ** 3, 0.12, rev=0.4)

# ---------------- groove ----------------
def kick(t, gain=1.0):
    n = int(0.45 * SR); tt = np.arange(n) / SR
    f = 46 + 95 * np.exp(-tt / 0.035)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.26)
    s[:int(0.003 * SR)] += rng.standard_normal(int(0.003 * SR)) * 0.4
    add(L, t, np.tanh(s * 1.6), gain * 0.9)

def hat(t, gain=0.12, open_=False):
    d = 0.22 if open_ else 0.045
    n = int(d * SR); tt = np.arange(n) / SR
    add(L, t, hp(noise(d), 7500) * np.exp(-tt / (d / 3)), gain, pan=0.25)

def clap(t, gain=0.35):
    out = np.zeros(int(0.3 * SR))
    for o in (0, 0.011, 0.022):
        i = int(o * SR); n = len(out) - i; tt = np.arange(n) / SR
        out[i:] += bp(rng.standard_normal(n), 900, 2600) * np.exp(-tt / (0.12 if o == 0.022 else 0.012))
    add(L, t, out, gain, rev=0.35)

def pluck(t, m, dur=0.22, gain=0.13, bright=2.5, pan=0.0):
    s = tone(mtof(m), dur + 0.3, harm=9, bright=bright) * np.exp(-np.arange(int((dur + 0.3) * SR)) / SR / dur) * np.minimum(1, np.arange(int((dur + 0.3) * SR)) / SR / 0.002)
    add(L, t, s, gain, pan=pan, rev=0.3, delay=0.35)

def bassnote(t, m, dur, gain=0.32):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * mtof(m) * tt) + 0.35 * np.sin(2 * np.pi * mtof(m + 12) * tt) * np.exp(-tt / 0.15)
    s *= np.minimum(1, tt / 0.005) * np.minimum(1, (dur - tt) / 0.03)
    add(L, t, np.tanh(s * 1.3), gain)

kicks = []
for k, t in enumerate(GRID):
    bar = (k // 4) % 4
    beat_in_bar = k % 4
    chord, root = CHORDS[bar], ROOTS[bar]
    build = k < 9
    showcase = 9 <= k < DROP_K
    drop = k >= DROP_K
    pre = 25 <= k < DROP_K
    # kick
    if (build and k >= 4) or (showcase and not pre) or drop:
        kick(t, 0.85 if not drop else 1.0); kicks.append(t)
    # basse (croches sur le temps)
    if k >= 2:
        bassnote(t, root, 0.27, 0.26 if build else 0.32)
        if not build: bassnote(t + 0.3, root + (12 if drop and beat_in_bar % 2 else 0), 0.25, 0.22)
    # nappe à chaque mesure
    if beat_in_bar == 0:
        pad_chord(t, 2.5, [m - 12 for m in chord] + [chord[0]], 0.06 if build else (0.07 if showcase else 0.085), 2.0 if build else 3.0, rev=0.45)
    # arpège en doubles croches
    pattern = [0, 1, 2, 3, 2, 1, 3, 2]
    for s16 in range(4):
        step = (beat_in_bar * 4 + s16) % 8
        oct_ = 12 if pattern[step] == 3 else 0
        m = chord[pattern[step] % 3] + oct_
        bright = 1.4 + 2.6 * min(1, k / 12) if build else (3.5 if showcase else 4.5)
        g_ = 0.06 + 0.05 * min(1, k / 9) if build else (0.1 if showcase else 0.11)
        pluck(t + s16 * 0.15, m, 0.16, g_, bright, pan=-0.35 if s16 % 2 else 0.35)
    # hats & clap
    if showcase or drop:
        hat(t + 0.3, 0.1 if showcase else 0.13, open_=(beat_in_bar == 3 and drop))
        if drop: hat(t + 0.15, 0.05); hat(t + 0.45, 0.05)
        if beat_in_bar in (1, 3) and not pre: clap(t, 0.3 if showcase else 0.38)
    # roulement avant le drop
    if pre:
        steps = 4 if k < 27 else 8
        for q in range(steps):
            clap(t + q * BEAT / steps, 0.08 + 0.25 * (k - 25 + q / steps) / 4)

# mélodie de la vitrine (cloches douces) et lead du drop
MOTIF = [(0, 76), (1.5, 74), (2, 72), (4, 69), (6, 72), (8, 67), (9.5, 76), (10, 74), (12, 74), (14, 71)]
for rep in range(2):
    for (bt, m) in MOTIF:
        t = GRID[12] + rep * 16 * BEAT * 0.5 * 2 + bt * BEAT
        if t < GRID[DROP_K] - 0.6: pluck(t, m, 0.6, 0.08, 1.4, pan=0.1)
for rep in range(2):
    for (bt, m) in MOTIF:
        t = GRID[DROP_K] + rep * 8 * BEAT + bt * BEAT * 0.5
        if t > GRID[-1] + 0.3: break
        n = int(0.5 * SR); tt = np.arange(n) / SR
        vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt) * np.minimum(1, tt / 0.15)
        s = sum(np.sign(np.sin(2 * np.pi * mtof(m) * vib * tt + d)) * 0.5 + np.sin(2 * np.pi * mtof(m) * tt) for d in (0, 0.03))
        s = lp(s, 3200) * env_adsr(n, 0.01, 0.2, 0.6, 0.15, 0.5)
        add(L, t, s, 0.05, rev=0.4, delay=0.4)

# riser vers le drop
n = int(1.9 * SR); tt = np.arange(n) / SR
sw = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (tt / 1.9 * 3.3)) / SR) * (tt / 1.9) ** 2
add(L, GRID[DROP_K] - 1.9, sw, 0.05, rev=0.5)
add(L, GRID[DROP_K] - 1.9, hp(noise(1.9), 2000) * (tt / 1.9) ** 2.5, 0.12, rev=0.5)
add(L, GRID[DROP_K], lp(noise(2.0), 6000) * np.exp(-np.arange(int(2.0 * SR)) / SR / 0.5), 0.18, rev=0.9)   # crash

# notifications (visibilité)
for i in range(4):
    t = g_of_b(24.6 + i * 0.5)
    for f, a in ((1318.5, 0.07), (1975.5, 0.04)):
        n = int(0.7 * SR); tt = np.arange(n) / SR
        add(L, t, np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.18) * np.minimum(1, tt / 0.002), a, pan=0.4, rev=0.5, delay=0.3)

# accord final (outro)
pad_chord(g_of_b(28.6), DUR - g_of_b(28.6), [45, 52, 57, 60, 64, 71], 0.12, 2.4, pan_spread=0.8, rev=0.7)
n = int((DUR - 37.2) * SR)
sub = np.sin(2 * np.pi * 55 * np.arange(n) / SR) * env_adsr(n, 1.5, 3, 0.8, 1.8, n / SR)
add(L, 37.2, sub, 0.08)

# ---------------- sidechain sur les nappes/basses (approx. globale) ----------------
duck = np.ones(N)
tt = np.arange(int(0.35 * SR)) / SR
shape = 1 - 0.45 * np.exp(-tt / 0.09)
for k in kicks:
    i = idx(k); n = min(len(shape), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], shape[:n])

# ---------------- delay ping-pong (croche pointée) ----------------
D = idx(0.45)
outd = np.zeros((2, N))
fb = 0.38
for rep in range(6):
    sh = D * (rep + 1)
    g = fb ** rep
    src = dly[rep % 2] if True else dly[0]
    outd[(rep + 1) % 2, sh:] += src[:N - sh] * g
outd = lp(outd, 5000)

# ---------------- réverbe (convolution) ----------------
irn = int(2.8 * SR); ti = np.arange(irn) / SR
ir = [rng.standard_normal(irn) * np.exp(-ti / 0.75) for _ in range(2)]
ir = [lp(x, 7000) / np.sqrt(np.sum(x ** 2)) for x in ir]
wet = np.stack([fftconvolve(send[c] + outd[c] * 0.5, ir[c])[:N] for c in range(2)])

mix = np.stack([L, Rr]) * duck + outd * 0.6 + wet * 0.9
mix = np.stack([hp(c, 25) for c in mix])
# fondu de fin
fade = np.clip((DUR - np.arange(N) / SR) / 0.8, 0, 1)
mix *= fade
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.25)
mix = mix / np.max(np.abs(mix)) * 0.89
wavfile.write('music.wav', SR, (mix.T * 32767).astype(np.int16))
print('ok', mix.shape, len(kicks))
