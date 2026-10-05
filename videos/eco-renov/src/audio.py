import numpy as np
from scipy.signal import butter, lfilter, fftconvolve, sosfilt
import wave

SR = 48000
TOTAL = 51.2
N = int(SR * TOTAL)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

TRANS = [6.3, 11.4, 16.5, 21.2, 25.9, 30.8, 35.9, 41.2]  # transition starts (0.9s long)
TR = 0.9
BPM = 112
BEAT = 60 / BPM
GRID0 = TRANS[0] + TR / 2  # first downbeat = first impact
DRUM_END = TRANS[-1] + TR / 2
LOGO = TRANS[-1] + 3.3

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)

def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.ones(n) * s
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else e[:a]
    e[a:a + d] = np.linspace(1, s, len(e[a:a + d]))
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e

def lp(x, fc, order=2):
    b, a = butter(order, min(fc, SR / 2 - 100) / (SR / 2), 'low'); return lfilter(b, a, x)
def hp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), 'high'); return lfilter(b, a, x)
def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'); return sosfilt(sos, x)

def saw(f, tt, ph=0.0):
    return 2 * ((f * tt + ph) % 1.0) - 1

def add(buf, x, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(x)] += x * gain * l * 1.414
    buf[1, i:i + len(x)] += x * gain * r * 1.414

def reverb_ir(sec=2.8, decay=3.2, seed=1):
    n = int(sec * SR); r = np.random.default_rng(seed)
    e = np.exp(-decay * np.arange(n) / SR * (3 / sec))
    ir = np.stack([r.standard_normal(n) * e, r.standard_normal(n) * e])
    ir[:, :int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    ir = np.stack([lp(ir[0], 6000), lp(ir[1], 6000)])
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

def apply_rev(buf, ir, wet):
    out = np.zeros_like(buf)
    for c in range(2):
        out[c] = fftconvolve(buf[c], ir[c])[:N]
    return buf * (1 - wet * 0.3) + out * wet

dry = np.zeros((2, N)); verb_send = np.zeros((2, N))

# ------------------------------------------------------------------ chords
CHORDS = [  # (bass, pad voicing)
    (38, [50, 53, 57, 60, 64]),  # Dm9
    (34, [46, 53, 57, 60, 62]),  # Bbmaj9
    (41, [48, 53, 57, 60, 64]),  # Fmaj7
    (36, [48, 52, 55, 57, 62]),  # C6/9
]
CH_LEN = 8 * BEAT
def chord_at(time):
    k = int(np.floor((time - GRID0) / CH_LEN))
    return CHORDS[k % 4]

# pad: detuned saws, slow filter, crossfaded per chord
pad = np.zeros(N)
starts = [0.0] + [GRID0 + k * CH_LEN for k in range(0, 20) if GRID0 + k * CH_LEN < TOTAL]
for si, s in enumerate(starts):
    e_ = starts[si + 1] if si + 1 < len(starts) else TOTAL
    ch = CHORDS[0] if si == 0 else chord_at(s + 0.01)
    i0, i1 = int(max(0, s - 0.4) * SR), min(N, int((e_ + 0.6) * SR))
    tt = t[i0:i1]
    x = np.zeros(len(tt))
    for m in ch[1]:
        for det in (-0.09, 0.0, 0.08):
            x += saw(midi(m) * (1 + det / 100 * 1.5), tt, rng.random())
    seg = np.ones(len(tt))
    fade = int(0.5 * SR)
    seg[:fade] = np.linspace(0, 1, fade) ** 1.5
    seg[-fade:] *= np.linspace(1, 0, fade) ** 1.5
    pad[i0:i1] += x * seg
cut = 500 + 1600 * np.clip((t - 2) / 40, 0, 1) + 400 * np.sin(t * 0.4) ** 2
# time-varying lowpass approximated by blockwise filtering
padf = np.zeros(N); blk = SR // 10
zi_state = None
from scipy.signal import lfilter_zi
for b0 in range(0, N, blk):
    fc = cut[b0]
    b, a = butter(2, fc / (SR / 2), 'low')
    if zi_state is None: zi_state = lfilter_zi(b, a) * 0
    padf[b0:b0 + blk], zi_state = lfilter(b, a, pad[b0:b0 + blk], zi=zi_state)
pad_env = np.clip(t / 2.5, 0, 1) * (1 - 0.35 * ((t > DRUM_END) & (t < LOGO - 0.3)))
pad_env *= np.where(t > TOTAL - 3.5, np.clip((TOTAL - t) / 3.5, 0, 1), 1)
padf *= pad_env * 0.032
add(dry, padf, 0, 1.0, -0.25); add(dry, np.roll(padf, 900), 0, 1.0, 0.25)
add(verb_send, padf, 0, 0.8)

# ------------------------------------------------------------------ drums
def kick():
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 42 + 110 * np.exp(-tt * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt * 7.5)
    x += 0.4 * np.exp(-tt * 300) * rng.standard_normal(n) * 0.3
    return np.tanh(x * 1.6)
def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); tt = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7000) * np.exp(-tt * (18 if open_ else 70))
    return x
def clap():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 900, 4000) * (np.exp(-tt * 22) + 0.6 * np.exp(-np.maximum(tt - 0.012, 0) * 30) * (tt > 0.012))
    return x
K, HC, HO, CL = kick(), hat(), hat(True), clap()
duck = np.ones(N)
beats = []
b = GRID0
while b < DRUM_END - 0.01:
    beats.append(b); b += BEAT
for k, bt in enumerate(beats):
    add(dry, K, bt, 0.5)
    i = int(bt * SR); L = int(0.28 * SR)
    duck[i:i + L] = np.minimum(duck[i:i + L], 1 - 0.55 * np.exp(-np.arange(min(L, N - i)) / SR * 14))
    if k % 4 in (1, 3) and k > 7: add(dry, CL, bt, 0.12, 0.1); add(verb_send, CL, bt, 0.1)
    for s16 in range(4):
        tt_ = bt + s16 * BEAT / 4
        g = [0.0, 0.035, 0.07, 0.035][s16] if k > 3 else [0, 0, 0.06, 0][s16]
        if g: add(dry, HC, tt_ + rng.normal(0, 0.003), g, 0.35 if s16 % 2 else -0.3)
    if k % 8 == 7: add(dry, HO, bt + BEAT / 2, 0.05, 0.2)
dry *= duck[None, :] ** 0  # (ducking applied to music bus below)

# ------------------------------------------------------------------ bass (sidechained)
bass = np.zeros(N)
for k, bt in enumerate(beats):
    bm = chord_at(bt + 0.01)[0]
    for e8 in (0, 1):
        st = bt + e8 * BEAT / 2; n = int(BEAT / 2 * SR * 0.95); tt = np.arange(n) / SR
        f = midi(bm + 12 * (e8 == 1 and k % 2 == 1))
        x = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.2 * saw(f, tt)
        x *= env_adsr(n, 0.005, 0.12, 0.6, 0.04)
        i = int(st * SR); bass[i:i + n] += x[:N - i]
bass = lp(bass, 900) * 0.11 * duck
add(dry, bass, 0, 1.0)

# ------------------------------------------------------------------ arp
arp = np.zeros((2, N))
step = BEAT / 4
pat = [0, 2, 4, 1, 3, 4, 2, 1]
k = 0; at = GRID0 - 16 * step
while at < DRUM_END - 0.01:
    ch = chord_at(at + 0.01)[1]
    m = ch[pat[k % 8] % len(ch)] + 12 + (12 if (k // 16) % 4 == 3 and k % 2 == 0 else 0)
    n = int(0.32 * SR); tt = np.arange(n) / SR; f = midi(m)
    x = (np.sin(2 * np.pi * f * tt + 0.8 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 18))) * np.exp(-tt * 13)
    vel = 0.55 + 0.45 * ((k % 4) == 0)
    g = 0.03 * vel * np.clip((at - (GRID0 - 16 * step)) / 3.0, 0, 1)
    add(arp, x, at, g, 0.45 * np.sin(k * 0.9))
    k += 1; at += step
# ping-pong delay (3/16)
d = int(3 * step * SR)
dl = np.zeros_like(arp)
for rep in range(1, 5):
    g = 0.42 ** rep
    src = arp[(rep % 2)] if True else None
    dl[(rep + 1) % 2, d * rep:] += arp[0, :N - d * rep] * g * 0.5 + arp[1, :N - d * rep] * g * 0.5
arp = arp + lp(dl[0], 5000)[None, :] * np.array([[1], [0]]) + lp(dl[1], 5000)[None, :] * np.array([[0], [1]])
arp *= duck[None, :] ** 0.6
dry += arp; verb_send += arp * 0.6

# ------------------------------------------------------------------ fx
def whoosh(dur=1.1, up=True, seed=0):
    n = int(dur * SR); tt = np.arange(n) / SR; r = np.random.default_rng(seed)
    x = r.standard_normal(n); out = np.zeros(n); blk = 480
    for b0 in range(0, n, blk):
        u = b0 / n
        fc = 300 + (6500 if up else 4000) * (u ** 2 if up else (1 - u) ** 1.5)
        out[b0:b0 + blk] = bp(x[max(0, b0 - 2000):b0 + blk], fc * 0.6, min(fc * 1.6, 20000))[-len(out[b0:b0 + blk]):]
    e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 2 if not up else (tt / dur) ** 2.2
    return out * e
def impact(big=1.0, seed=0):
    n = int(2.6 * SR); tt = np.arange(n) / SR; r = np.random.default_rng(seed)
    f = 30 + 60 * np.exp(-tt * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
    nz = lp(r.standard_normal(n), 2500) * np.exp(-tt * 9)
    hi = hp(r.standard_normal(n), 3000) * np.exp(-tt * 25)
    return np.tanh((sub * 1.1 + nz * 0.5 + hi * 0.25) * big)
def riser(dur, seed=3):
    n = int(dur * SR); tt = np.arange(n) / SR; r = np.random.default_rng(seed)
    nz = r.standard_normal(n); out = np.zeros(n); blk = 480
    for b0 in range(0, n, blk):
        u = b0 / n; fc = 200 + 7000 * u ** 2.5
        out[b0:b0 + blk] = bp(nz[max(0, b0 - 2000):b0 + blk], fc * 0.7, min(fc * 1.4, 20000))[-len(out[b0:b0 + blk]):]
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (tt / dur * 2)) / SR) * 0.3
    return (out + tone) * (tt / dur) ** 2.5
def tick(seed):
    n = int(0.09 * SR); tt = np.arange(n) / SR; r = np.random.default_rng(seed)
    f = 1800 + r.random() * 2500
    return (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.7 * tt)) * np.exp(-tt * 70)

fx = np.zeros((2, N))
for i, ts in enumerate(TRANS):
    mid = ts + TR / 2
    w = whoosh(1.0, True, i)
    add(fx, w, mid - 1.0, 0.16, -0.5 + (i % 2)); add(verb_send, w, mid - 1.0, 0.08)
    big = 0.6 if i == len(TRANS) - 1 else 1.0
    im = impact(big, i)
    add(fx, im, mid, 0.42 * big); add(verb_send, im, mid, 0.25 * big)
    w2 = whoosh(0.9, False, 50 + i); add(fx, w2, mid, 0.07, 0.5 - (i % 2))
# intro
r_ = riser(3.2); add(fx, r_, 0.05, 0.12); add(verb_send, r_, 0.05, 0.1)
im = impact(1.2, 99); add(fx, im, 3.25, 0.5); add(verb_send, im, 3.25, 0.4)
rr = np.random.default_rng(5)
for j in range(70):
    tt_ = 1.6 + rr.random() ** 0.9 * 3.2
    add(fx, tick(j), tt_, 0.03 * rr.random(), rr.uniform(-0.8, 0.8))
add(verb_send, np.zeros(1), 0, 0)
# outro logo
r2 = riser(2.6, 9); add(fx, r2, LOGO - 2.6, 0.1); add(verb_send, r2, LOGO - 2.6, 0.08)
im = impact(1.3, 77); add(fx, im, LOGO, 0.55); add(verb_send, im, LOGO, 0.5)
# phone chime
for j, m in enumerate([74, 81, 86]):
    n = int(2.2 * SR); tt = np.arange(n) / SR
    x = (np.sin(2 * np.pi * midi(m) * tt) + 0.3 * np.sin(2 * np.pi * midi(m) * 3 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 2.2)
    add(fx, x, LOGO + 2.0 + j * 0.11, 0.05, -0.4 + 0.4 * j); add(verb_send, x, LOGO + 2.0 + j * 0.11, 0.06)

dry += fx

# ------------------------------------------------------------------ mix
ir = reverb_ir(3.2, 3.0)
wet = np.zeros_like(verb_send)
for c in range(2): wet[c] = fftconvolve(verb_send[c], ir[c])[:N]
mix = dry + wet * 0.35
mix = hp(mix, 28) if mix.ndim == 1 else np.stack([hp(mix[0], 28), hp(mix[1], 28)])
# fade in/out
mix *= np.clip(t / 0.05, 0, 1)[None, :]
mix *= np.where(t > TOTAL - 1.2, np.clip((TOTAL - t) / 1.2, 0, 1), 1)[None, :]
# loudness: normalise RMS then soft clip
rms = np.sqrt((mix ** 2).mean())
mix *= 0.16 / rms
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.93 / np.abs(mix).max()
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', TOTAL, 'rms', np.sqrt((mix ** 2).mean()))
