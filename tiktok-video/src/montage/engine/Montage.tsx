import React, { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { loadFonts } from '../../fonts';
import { ink } from '../../minimal/timeline';
import { Sfx } from '../../Video';
import { Captions } from './Captions';
import { MontageData, Timeline, TimelineContext, createTimeline } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const T = 7; // durée d'une demi-transition (frames)

/** Un son ponctuel, positionné en secondes du rush. */
export type SfxCue = { at: number; src: string; volume?: number; rate?: number; offset?: number };

export type MontageProject = {
  data: MontageData;
  /** Zoom cuts : [temps du rush, échelle]. */
  punches: [number, number][];
  /** Impacts (temps du rush) : tremblement + flash. */
  impacts: number[];
  /** Position verticale des sous-titres selon la frame. */
  captionTop: (frame: number, tl: Timeline) => number;
  skipFirstCaption?: string;
  Overlays: React.FC;
  sfx: SfxCue[];
  /** Volume général du sound design (la voix reste à 100 %). */
  sfxVolume?: number;
};

function punchScale(frame: number, tl: Timeline, punches: [number, number][]) {
  let prev = 1;
  let cur = 1;
  let at = 0;
  for (const [t, s] of [...punches].sort((a, b) => a[0] - b[0])) {
    const f = tl.outFrame(t);
    if (frame >= f) {
      prev = cur;
      cur = s;
      at = f;
    }
  }
  // Snap très rapide (3 frames) : effet « deuxième caméra ».
  return interpolate(frame, [at, at + 3], [prev, cur], { ...clamp, easing: Easing.out(Easing.cubic) });
}

/** Transform + filtre de la couche vidéo à la frame courante. */
function camera(frame: number, tl: Timeline, project: MontageProject) {
  const i = tl.segmentAt(frame);
  const seg = tl.segments[i];
  const local = frame - seg.outStart;
  let scale = punchScale(frame, tl, project.punches) * seg.zoom * (1 + 0.03 * (local / seg.frames));
  let tx = 0;
  let rot = 0;
  let blur = 0;
  let bright = 1;

  // Ouverture : on « tombe » dans le plan.
  if (i === 0) {
    const p = interpolate(local, [0, 12], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
    scale *= 1 + 0.45 * p;
    blur += 14 * p;
  }
  const apply = (type: string, p: number, dir: 1 | -1) => {
    if (type === 'whip') {
      tx += dir * p * 1150;
      blur += p * 40;
    } else if (type === 'zoom') {
      scale *= 1 + p * (dir === -1 ? 1.6 : 0.9);
      blur += p * 28;
      bright += p * 0.7;
    } else if (type === 'spin') {
      rot += dir * p * 32;
      scale *= 1 + p * 0.5;
      blur += p * 34;
    }
  };
  const next = tl.segments[i + 1];
  if (next?.transition && next.transition !== 'jump' && local >= seg.frames - T) {
    apply(next.transition, Math.pow((local - (seg.frames - T) + 1) / T, 2), -1);
  }
  if (seg.transition && seg.transition !== 'jump' && local < T) {
    apply(seg.transition, Math.pow(1 - local / T, 2), 1);
  }
  // Tremblement sur les impacts.
  for (const t of project.impacts) {
    const f0 = tl.outFrame(t);
    const k = interpolate(frame, [f0, f0 + 10], [1, 0], clamp);
    if (k > 0 && frame >= f0) {
      tx += Math.sin(frame * 12.9) * 22 * k;
      rot += Math.sin(frame * 7.1) * 1.6 * k;
    }
  }
  return {
    transformOrigin: seg.origin,
    transform: `translateX(${tx}px) rotate(${rot}deg) scale(${scale})`,
    filter: `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)}) contrast(1.07) saturate(1.14)`,
  };
}

/** Éclairs, light leaks et flashs d'impact. */
const Flashes: React.FC<{ tl: Timeline; impacts: number[] }> = ({ tl, impacts }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {tl.cuts.map(({ frame: c, type }) => {
        if (type === 'jump') return null;
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
      {impacts.map((t) => {
        const f0 = tl.outFrame(t);
        return <AbsoluteFill key={t} style={{ background: '#fff', opacity: interpolate(frame, [f0, f0 + 1, f0 + 5], [0, 0.55, 0], clamp) }} />;
      })}
    </>
  );
};

/** Sons : impacts + sons du projet. Aucun bruit sur les transitions (elles restent purement visuelles). */
const SoundDesign: React.FC<{ tl: Timeline; project: MontageProject }> = ({ tl, project }) => {
  // Discret par défaut : les effets ne doivent jamais couvrir la voix.
  const master = project.sfxVolume ?? 0.2;
  return (
    <>
      {project.impacts.map((t) => (
        <Sfx key={`i${t}`} at={tl.outFrame(t)} src="impact" master={master} volume={0.9} rate={1.1} />
      ))}
      {project.sfx.map((s, i) => (
        <Sfx key={`s${i}`} at={tl.outFrame(s.at) + (s.offset ?? 0)} src={s.src} master={master} volume={s.volume ?? 0.7} rate={s.rate ?? 1} />
      ))}
    </>
  );
};

export const MontageView: React.FC<{ project: MontageProject }> = ({ project }) => {
  const frame = useCurrentFrame();
  const tl = useMemo(() => createTimeline(project.data), [project.data]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => setReady(true));
  }, []);
  if (!ready) return <AbsoluteFill style={{ background: ink.bg }} />;
  const { Overlays } = project;

  return (
    <TimelineContext.Provider value={tl}>
      <AbsoluteFill style={{ background: ink.bg, overflow: 'hidden' }}>
        <AbsoluteFill style={camera(frame, tl, project)}>
          {tl.segments.map((s, i) => (
            <Sequence key={i} from={s.outStart} durationInFrames={s.frames} name={`Plan ${i + 1}`}>
              <OffthreadVideo
                src={staticFile(tl.source)}
                trimBefore={Math.round(s.src[0] * 30)}
                trimAfter={Math.round(s.src[0] * 30) + s.frames}
                // Micro-fondus audio aux raccords (évite les clics).
                volume={(f) => interpolate(f, [0, 2, s.frames - 2, s.frames], [0, 1, 1, 0], clamp)}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Sequence>
          ))}
        </AbsoluteFill>
        {/* Étalonnage : vignette douce + ombres légèrement froides */}
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(5,6,12,0.55) 100%)' }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(10,12,30,0.35) 0%, transparent 30%, transparent 62%, rgba(5,6,12,0.55) 100%)' }} />
        <Flashes tl={tl} impacts={project.impacts} />
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <Overlays />
        </AbsoluteFill>
        <Captions topAt={(f) => project.captionTop(f, tl)} skipFirst={project.skipFirstCaption} />
        <SoundDesign tl={tl} project={project} />
      </AbsoluteFill>
    </TimelineContext.Provider>
  );
};

/** Durée (frames) d'un projet, pour la composition. */
export const montageDuration = (data: MontageData) => createTimeline(data).total;
