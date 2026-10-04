import math, json, random, wave, struct
SR=44100; DUR=34.0; N=int(SR*DUR)
buf=[0.0]*N
beats=json.load(open('beats.json'))
def seg(t,a,b): return min(1,max(0,(t-a)/(b-a)))
def add_tone(t0, dur, f0, f1, amp, atk=0.003, dec=None, pan=0):
    n=int(dur*SR); i0=int(t0*SR); ph=0.0
    for k in range(n):
        i=i0+k
        if i>=N: break
        tt=k/SR; f=f0+(f1-f0)*(tt/dur)
        ph+=2*math.pi*f/SR
        e=min(1,tt/atk)*math.exp(-tt/(dec or dur/4))
        buf[i]+=amp*e*math.sin(ph)
# drone
ph=[0.0]*5; freqs=[55,82.5,110,165,220]
for i in range(N):
    t=i/SR
    lvl=seg(t,0,3)*(1-seg(t,11.0,11.4)) + seg(t,12.8,13.5)*(1-seg(t,32,34))*1.25
    if lvl<=0: continue
    lfo=0.75+0.25*math.sin(2*math.pi*0.11*t)
    s=0.0
    for j,f in enumerate(freqs):
        if j>=3 and t<12.8: continue
        ph[j]+=2*math.pi*f/SR
        s+=math.sin(ph[j])*(0.5 if j<3 else 0.22)
    buf[i]+=0.11*lvl*lfo*s
# heartbeats
for b in beats:
    if abs(b-12.8)<0.01: continue
    a=0.75 if b<27 else 0.6
    add_tone(b, 0.25, 62, 38, a, dec=0.07)
    add_tone(b+0.15, 0.2, 74, 44, a*0.55, dec=0.06)
# flatline beep
for i in range(int(11.45*SR), int(12.76*SR)):
    t=i/SR; buf[i]+=0.11*math.sin(2*math.pi*1000*t)*min(1,(t-11.45)*40)
# BOOM
add_tone(12.8, 2.2, 48, 26, 1.3, dec=0.6)
random.seed(3); lp=0.0
for k in range(int(0.9*SR)):
    i=int(12.8*SR)+k; tt=k/SR
    lp+= (random.uniform(-1,1)-lp)*0.08
    buf[i]+=0.9*lp*math.exp(-tt/0.22)
# notifications pings
for n in range(4):
    t0=24.6+n*0.5
    add_tone(t0, 0.6, 1318.5, 1318.5, 0.07, dec=0.18)
    add_tone(t0+0.06, 0.6, 1975.5, 1975.5, 0.04, dec=0.15)
# shimmer as tower rises
for k in range(12):
    add_tone(14.8+k*0.28, 0.9, 440*2**(k%5/12*3), 440*2**(k%5/12*3), 0.035, atk=0.05, dec=0.3)
# final chord
for f,a in [(110,.16),(220,.12),(277.18,.08),(329.63,.08),(440,.05),(659.25,.03)]:
    n=int((34-29.2)*SR); i0=int(29.2*SR); p=0.0
    for k in range(n):
        tt=k/SR; p+=2*math.pi*f/SR
        e=min(1,tt/1.2)*(1-seg(29.2+tt,32.6,34))
        buf[i0+k]+=a*e*math.sin(p)
peak=max(abs(x) for x in buf)
with wave.open('audio.wav','w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b''.join(struct.pack('<h', int(32000*math.tanh(1.1*x/peak))) for x in buf))
print('peak',peak)
