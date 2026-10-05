"""SitePulse — motion design : bande son originale (40 s, 48 kHz stéréo).
Électro « trailer » à 120 BPM en ré mineur, calée sur les coupes et les animations de l'image."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
DUR = 40.0
N = int((DUR + 0.6) * SR)
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)
send = np.zeros((2, N)); dly = np.zeros((2, N))
duck_src = []

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def idx(t): return int(round(t * SR))
def add(t0, sig, gain=1.0, pan=0.0, rev=0.0, delay=0.0):
    i = idx(t0); n = min(len(sig), N - i)
    if n <= 0 or i < 0: return
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = sig[:n] * gain
    L[i:i + n] += s * gl; R[i:i + n] += s * gr
    if rev: send[0, i:i + n] += s * gl * rev; send[1, i:i + n] += s * gr * rev
    if delay: dly[0, i:i + n] += s * gl * delay; dly[1, i:i + n] += s * gr * delay
def tt(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return rng.standard_normal(int(round(d * SR)))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(4, f, 'highpass', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
def saw(f, d, harm=12, bright=4.0, det=0.0):
    t = tt(d); o = np.zeros(len(t))
    for h in range(1, harm + 1):
        if f * h > SR / 2.3: break
        o += np.sin(2 * np.pi * f * h * (1 + det) * t) / h * np.exp(-(h - 1) / bright)
    return o
def env(n, a, d, s, r, total):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    return e * np.clip((total - t) / max(r, 1e-4), 0, 1)

BEAT = 0.5
CH = [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]]     # Dm Bb F C
ROOT = [38, 34, 41, 36]

# ---------- intro : nappe + frappe au clavier ----------
def pad(t0, d, notes, g, bright=2.5, rev=0.6, spread=0.7):
    for j, m in enumerate(notes):
        for det, pn in ((-0.0045, -spread), (0, 0), (0.005, spread)):
            s = saw(mtof(m), d, 10, bright, det) * env(int(round(d * SR)), 0.6, 1.5, 0.85, 0.9, d)
            add(t0, s, g / len(notes), pn, rev)
pad(0.2, 4.0, [50, 57, 62, 64, 69], 0.11, 1.6)
for k in range(51):                                   # 51 caractères tapés
    t = 0.55 + k * (2.05 / 51) + rng.uniform(-0.008, 0.008)
    c = hp(noise(0.03), 3000) * np.exp(-tt(0.03) / 0.006)
    add(t, c, 0.10 + rng.uniform(0, 0.04), pan=rng.uniform(-0.3, 0.3), rev=0.1)
add(2.62, np.sin(2 * np.pi * 880 * tt(0.4)) * np.exp(-tt(0.4) / 0.08), 0.08, rev=0.4)       # envoi
for k, m in enumerate([74, 77, 81, 86]):                                                     # réponse
    add(2.9 + k * 0.07, saw(mtof(m), 0.9, 6, 2) * np.exp(-tt(0.9) / 0.25), 0.05, pan=0.2 * (k - 1.5), rev=0.6, delay=0.4)
# riser → drop
d = 1.1; t_ = tt(d)
add(2.95, hp(noise(d), 1500) * (t_ / d) ** 2.4, 0.14, rev=0.5)
add(2.95, np.sin(2 * np.pi * np.cumsum(150 * 2 ** (t_ / d * 3.5)) / SR) * (t_ / d) ** 2, 0.05, rev=0.4)

# ---------- instruments ----------
def kick(t, g=1.0):
    t_ = tt(0.45); f = 48 + 110 * np.exp(-t_ / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / 0.24)
    s[:int(0.002 * SR)] += rng.standard_normal(int(0.002 * SR)) * 0.5
    add(t, np.tanh(s * 1.8), 0.95 * g); duck_src.append(t)
def clap(t, g=0.32):
    out = np.zeros(int(0.3 * SR))
    for o in (0, 0.009, 0.018):
        i = int(o * SR); n = len(out) - i
        out[i:] += bp(rng.standard_normal(n), 1000, 3200) * np.exp(-np.arange(n) / SR / (0.11 if o else 0.01))
    add(t, out, g, rev=0.35)
def hat(t, g=0.07, d=0.04, pan=0.3):
    add(t, hp(noise(d), 8000) * np.exp(-tt(d) / (d / 3.5)), g, pan=pan)
def bass(t, m, d, g=0.3):
    t_ = tt(d)
    s = np.sin(2 * np.pi * mtof(m) * t_) + 0.5 * np.sin(2 * np.pi * mtof(m + 12) * t_) * np.exp(-t_ / 0.08)
    add(t, np.tanh(1.4 * s * np.minimum(1, t_ / 0.004) * np.minimum(1, (d - t_) / 0.02)), g)
def pluck(t, m, d=0.18, g=0.08, bright=3.0, pan=0.0):
    s = saw(mtof(m), d + 0.25, 9, bright) * np.exp(-tt(d + 0.25) / d) * np.minimum(1, tt(d + 0.25) / 0.002)
    add(t, s, g, pan, rev=0.25, delay=0.3)
def whoosh(tc, d=0.7, g=0.22):
    t_ = tt(d); n = noise(d)
    shape = np.sin(np.pi * t_ / d) ** 2
    lo = bp(n, 300, 1400) * shape; hi = hp(n, 2500) * shape ** 3
    add(tc - d / 2, lo * 0.8 + hi * 0.6, g, pan=-0.4, rev=0.3)
    add(tc - d / 2 + 0.02, lo * 0.8 + hi * 0.6, g * 0.8, pan=0.4, rev=0.3)
def impact(t, g=0.6, big=False):
    d = 2.2 if big else 0.9; t_ = tt(d)
    f = 30 + (60 if big else 45) * np.exp(-t_ / (0.35 if big else 0.15))
    add(t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t_ / (0.7 if big else 0.25)), g, rev=0.3)
    add(t, lp(noise(d), 5000 if big else 2500) * np.exp(-t_ / (0.4 if big else 0.08)), g * (0.5 if big else 0.25), rev=0.9 if big else 0.4)
def bell(t, m, g=0.06, pan=0.0):
    t_ = tt(1.2)
    s = (np.sin(2 * np.pi * mtof(m) * t_) + 0.4 * np.sin(2 * np.pi * mtof(m) * 2.76 * t_) * np.exp(-t_ / 0.15)) * np.exp(-t_ / 0.35)
    add(t, s, g, pan, rev=0.5, delay=0.35)

# ---------- groove 4 s → 34 s ----------
impact(4.0, 0.75)
G0 = 4.0
beats = [G0 + k * BEAT for k in range(int((34.0 - G0) / BEAT))]
for k, t in enumerate(beats):
    bar = (k // 4) % 4; bib = k % 4
    chord, root = CH[bar], ROOT[bar]
    build = 28.0 <= t < 30.0 or 33.0 <= t < 34.0
    swirl = t >= 30.0
    kg = 1.0 if not build else (0.8 if t < 29.0 else 0.0)
    if kg > 0: kick(t, kg)
    if not build:
        bass(t + 0.25, root, 0.22, 0.30); bass(t + 0.375, root + (12 if bib % 2 else 0), 0.1, 0.18)
        if bib in (1, 3): clap(t)
    for q in range(4):                                              # hats 16es
        hat(t + q * 0.125, 0.06 if q % 2 else 0.035, pan=0.35 if q % 2 else -0.2)
    if bib == 0 and not build:
        pad(t, 2.1, [m - 12 for m in chord] + [chord[0] + 12], 0.07 if not swirl else 0.09, 3.0, rev=0.45)
    patt = [0, 2, 1, 2, 3, 2, 1, 2]
    for q in range(4):
        step = (bib * 4 + q) % 8
        m = chord[patt[step] % 3] + (12 if patt[step] == 3 else 0) + 12
        pluck(t + q * 0.125, m, 0.12, 0.05 + (0.025 if swirl else 0), 2.5 + 2 * min(1, (t - 4) / 10), pan=0.4 if q % 2 else -0.4)
# roulements de montée
for a, b in ((28.0, 30.0), (33.0, 34.0)):
    n = int((b - a) / 0.125)
    for q in range(n):
        tq = a + q * (b - a) / n
        clap(tq, 0.06 + 0.25 * q / n)
    d = b - a; t_ = tt(d)
    add(a, hp(noise(d), 1200) * (t_ / d) ** 2.5, 0.16, rev=0.5)
    add(a, np.sin(2 * np.pi * np.cumsum(180 * 2 ** (t_ / d * 3)) / SR) * (t_ / d) ** 2, 0.045, rev=0.4)
impact(30.0, 0.7)

# ---------- effets synchronisés à l'image ----------
for tb in (8, 12, 16, 20, 24, 30):          # traversées caméra
    whoosh(tb + 0.05, 0.75, 0.24)
    impact(tb + 0.33, 0.28)
for k in range(9):                          # calques du site qui se posent
    hat(4.3 + k * 0.17 + 0.5, 0.12, 0.06, pan=-0.5 + k * 0.12); pluck(4.3 + k * 0.17 + 0.45, 86 - (k % 3) * 3, 0.1, 0.035)
whoosh(8.7, 0.6, 0.15)                      # le téléphone arrive
for k in range(3):                          # pastilles / avis
    bell(9.5 + k * 0.3, 81 + k * 3, 0.05, pan=0.3)
    bell(13.0 + k * 0.38 + 0.25, 86 + k * 2, 0.06, pan=-0.3 + 0.3 * k)
bell(12.6, 74, 0.07)                        # épingle sur la carte
bell(18.05, 93, 0.08); bell(18.12, 98, 0.05) # #1
bell(20.3, 88, 0.08); bell(20.42, 93, 0.06)  # nouveau mail
for i in range(6):                          # champs extraits vers le CRM
    pluck(21.5 + i * 0.14 + 0.5, 81 + i * 2, 0.08, 0.06, 5)
whoosh(24.6, 0.6, 0.15); whoosh(25.0, 0.6, 0.15)  # cartes qui pivotent
for k, m in enumerate([86, 89, 93, 98]):    # « Recommandée »
    bell(27.7 + k * 0.06, m, 0.04, pan=0.4)

# ---------- final ----------
impact(34.0, 1.0, big=True)
add(34.0, lp(noise(3.0), 9000) * np.exp(-tt(3.0) / 0.8), 0.2, rev=1.0)              # crash
pad(34.0, DUR - 34.0, [50, 57, 62, 64, 69, 74], 0.14, 2.6, rev=0.8, spread=0.9)
for t in (34.9, 36.1, 37.3):                # la signature « pu-PULSE »
    kick(t, 0.45); kick(t + 0.16, 0.7)
bell(35.3, 86, 0.07); bell(35.38, 93, 0.05)

# ---------- sidechain, delay, réverbe, mastering ----------
duck = np.ones(N); sh = 1 - 0.5 * np.exp(-tt(0.3) / 0.08)
for k in duck_src:
    i = idx(k); n = min(len(sh), N - i); duck[i:i + n] = np.minimum(duck[i:i + n], sh[:n])
D = idx(0.375); outd = np.zeros((2, N))
for rep in range(5):
    s_ = D * (rep + 1); outd[(rep + 1) % 2, s_:] += dly[rep % 2, :N - s_] * 0.4 ** rep
outd = lp(outd, 6000)
irn = int(2.6 * SR); ti = np.arange(irn) / SR
ir = [lp(rng.standard_normal(irn) * np.exp(-ti / 0.7), 8000) for _ in range(2)]
ir = [x / np.sqrt(np.sum(x ** 2)) for x in ir]
wet = np.stack([fftconvolve(send[c] + outd[c] * 0.4, ir[c])[:N] for c in range(2)])
mix = np.stack([L, R]) * duck + outd * 0.55 + wet * 0.85
mix = np.stack([hp(c, 28) for c in mix])
fade = np.clip((DUR - np.arange(N) / SR) / 0.7, 0, 1); mix *= fade
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.3); mix = mix / np.max(np.abs(mix)) * 0.89
wavfile.write('music2.wav', SR, (mix.T * 32767).astype(np.int16))
print('ok')
