import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { loadFonts } from '../fonts';
import { ink } from '../minimal/timeline';
import { Sfx } from '../Video';
import { Captions } from './Captions';
import { OVERLAY_HITS, Overlays, STOP_HIT } from './Overlays';
import { CUTS, SEGMENTS, SOURCE, WORDS, outFrame } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Point d'ancrage des zooms = le visage, par plan (plans larges puis plans rapprochés).
const ORIGINS = ['50% 37%', '50% 37%', '50% 29%', '50% 29%'];
const T = 7; // durée d'une demi-transition (frames)

type Transition = 'whip' | 'zoom' | 'spin';
const TRANSITIONS: Transition[] = ['whip', 'zoom', 'spin'];

// « Zoom cuts » : changements de cadrage secs sur les relances du discours (temps du rush).
const PUNCHES: [number, number][] = [
  [0.4, 1.0],
  [2.6, 1.14],
  [4.9, 1.24],
  [7.85, 1.0],
  [11.1, 1.16],
  [13.82, 1.28],
  [18.7, 1.0],
  [21.46, 1.1],
  [26.5, 1.0],
  [29.86, 1.12],
];

function punchScale(frame: number) {
  const marks = PUNCHES.map(([t, s]) => [outFrame(t), s] as const);
  let prev = 1;
  let cur = 1;
  let at = 0;
  for (const [f, s] of marks) {
    if (frame >= f) {
      prev = cur;
      cur = s;
      at = f;
    }
  }
  // Snap très rapide (3 frames) : effet « deuxième caméra ».
  return interpolate(frame, [at, at + 3], [prev, cur], { ...clamp, easing: Easing.out(Easing.cubic) });
}

/** Tremblement déterministe (impact du « STOP »). */
function shake(frame: number) {
  const k = interpolate(frame, [STOP_HIT, STOP_HIT + 10], [1, 0], clamp);
  if (k <= 0) return [0, 0, 0];
  return [Math.sin(frame * 12.9) * 22 * k, Math.cos(frame * 17.3) * 18 * k, Math.sin(frame * 7.1) * 1.6 * k];
}

/** Transform + filtre de la couche vidéo pour la frame courante. */
function camera(frame: number) {
  const segIndex = SEGMENTS.findIndex((s) => frame >= s.outStart && frame < s.outStart + s.frames);
  const seg = SEGMENTS[Math.max(0, segIndex)];
  const local = frame - seg.outStart;
  let scale = punchScale(frame) * (1 + 0.03 * (local / seg.frames));
  let tx = 0;
  let rot = 0;
  let blur = 0;
  let bright = 1;

  // Ouverture : on « tombe » dans le plan.
  if (segIndex === 0) {
    const p = interpolate(local, [0, 12], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
    scale *= 1 + 0.45 * p;
    blur += 14 * p;
  }

  // Sortie du segment (vers la transition suivante).
  const outType = TRANSITIONS[segIndex];
  if (outType && local >= seg.frames - T) {
    const p = Math.pow((local - (seg.frames - T) + 1) / T, 2);
    if (outType === 'whip') {
      tx -= p * 1150;
      blur += p * 40;
    } else if (outType === 'zoom') {
      scale *= 1 + p * 1.6;
      blur += p * 30;
      bright += p * 0.8;
    } else {
      rot -= p * 32;
      scale *= 1 + p * 0.5;
      blur += p * 34;
    }
  }
  // Entrée du segment (depuis la transition précédente).
  const inType = TRANSITIONS[segIndex - 1];
  if (inType && local < T) {
    const q = Math.pow(1 - local / T, 2);
    if (inType === 'whip') {
      tx += q * 1150;
      blur += q * 40;
    } else if (inType === 'zoom') {
      scale *= 1 + q * 0.9;
      blur += q * 26;
      bright += q * 0.6;
    } else {
      rot += q * 32;
      scale *= 1 + q * 0.5;
      blur += q * 34;
    }
  }
  const [sx, sy, sr] = shake(frame);
  return {
    transformOrigin: ORIGINS[Math.max(0, segIndex)],
    transform: `translate(${tx + sx}px, ${sy}px) rotate(${rot + sr}deg) scale(${scale})`,
    filter: `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)}) contrast(1.07) saturate(1.14)`,
  };
}

/** Éclairs et « light leaks » posés sur les raccords. */
const CutFlashes: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {CUTS.map((c, i) => {
        const type = TRANSITIONS[i];
        const k = interpolate(frame, [c - 4, c, c + 6], [0, 1, 0], clamp);
        if (k <= 0) return null;
        const bg =
          type === 'zoom'
            ? `rgba(255,255,255,${k * 0.85})`
            : type === 'spin'
              ? `radial-gradient(circle at 80% 20%, rgba(255,170,90,${k * 0.9}), rgba(93,123,255,${k * 0.6}) 45%, transparent 75%)`
              : `linear-gradient(90deg, transparent, rgba(93,123,255,${k * 0.55}) 50%, transparent)`;
        return <AbsoluteFill key={c} style={{ background: bg, mixBlendMode: type === 'zoom' ? 'normal' : 'screen' }} />;
      })}
      {/* Flash d'impact sur le « STOP » */}
      <AbsoluteFill style={{ background: '#fff', opacity: interpolate(frame, [STOP_HIT, STOP_HIT + 1, STOP_HIT + 5], [0, 0.55, 0], clamp) }} />
    </>
  );
};

const SoundDesign: React.FC = () => {
  const master = 0.55;
  const t0 = outFrame(30.25);
  return (
    <>
      <Sfx at={STOP_HIT} src="impact" master={master} volume={0.9} rate={1.1} />
      {CUTS.map((c, i) => (
        <Sfx key={c} at={c - 9} src={i === 1 ? 'whoosh-deep' : 'whoosh'} master={master} volume={0.9} rate={i === 2 ? 0.85 : 1.1} />
      ))}
      {OVERLAY_HITS.map((f, i) => (
        <Sfx key={`o${i}`} at={f} src="tap" master={master} volume={0.7} rate={1.25 + (i % 3) * 0.1} />
      ))}
      <Sfx at={outFrame(11.2)} src="shimmer" master={master} volume={0.45} rate={1.2} />
      <Sfx at={outFrame(16.8)} src="pulse" master={master} volume={0.8} />
      <Sfx at={outFrame(24.8)} src="riser" master={master} volume={0.3} rate={2} />
      {Array.from({ length: 6 }, (_, i) => (
        <Sfx key={`k${i}`} at={t0 + i * 2} src={`key-${i % 4}`} master={master} volume={0.6} />
      ))}
      <Sfx at={t0 + 16} src="tap" master={master} volume={0.8} />
      <Sfx at={outFrame(32.8)} src="shimmer" master={master} volume={0.4} rate={1.4} />
    </>
  );
};

export const Montage: React.FC = () => {
  const frame = useCurrentFrame();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => setReady(true));
  }, []);
  if (!ready) return <AbsoluteFill style={{ background: ink.bg }} />;
  const cam = camera(frame);

  return (
    <AbsoluteFill style={{ background: ink.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={cam}>
        {SEGMENTS.map((s, i) => (
          <Sequence key={i} from={s.outStart} durationInFrames={s.frames} name={`Plan ${i + 1}`}>
            <OffthreadVideo
              src={staticFile(SOURCE)}
              trimBefore={Math.round(s.src[0] * 30)}
              trimAfter={Math.round(s.src[0] * 30) + s.frames}
              // Micro-fondus audio aux raccords (évite les clics).
              volume={(f) => interpolate(f, [0, 2, s.frames - 2, s.frames], [0, 1, 1, 0], clamp)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
      {/* Étalonnage : vignette douce + légère teinte froide dans les ombres */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(5,6,12,0.55) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(10,12,30,0.35) 0%, transparent 30%, transparent 62%, rgba(5,6,12,0.55) 100%)' }} />
      <CutFlashes />
      <Overlays />
      <Captions />
      <SoundDesign />
    </AbsoluteFill>
  );
};

export const MONTAGE_WORD_COUNT = WORDS.length;
