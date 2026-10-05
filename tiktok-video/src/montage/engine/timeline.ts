import { createContext, useContext } from 'react';

export const FPS = 30;

export type Transition = 'whip' | 'zoom' | 'spin' | 'jump';
export type Word = { w: string; s: number; e: number };

/** Format des fichiers montage.json (temps en secondes du rush). */
export type MontageData = {
  source: string;
  segments: { de: number; a: number; transition?: Transition; origine?: string }[];
  motsCles: string[];
  mots: Word[];
};

export type Segment = {
  src: [number, number];
  outStart: number;
  frames: number;
  transition: Transition | null; // transition d'entrée
  origin: string; // ancrage des zooms (visage)
  zoom: number; // recadrage automatique des jump cuts
};

export type Timeline = ReturnType<typeof createTimeline>;

export function createTimeline(data: MontageData) {
  let acc = 0;
  let prevZoom = 1;
  const segments: Segment[] = data.segments.map((s, i) => {
    const frames = Math.round((s.a - s.de) * FPS);
    const transition = i === 0 ? null : (s.transition ?? 'jump');
    // Jump cut : on alterne plan serré / plan large pour masquer la coupe.
    const zoom = transition === 'jump' ? (prevZoom === 1 ? 1.13 : 1) : 1;
    prevZoom = zoom;
    const seg = { src: [s.de, s.a] as [number, number], outStart: acc, frames, transition, origin: s.origine ?? '50% 37%', zoom };
    acc += frames;
    return seg;
  });
  const total = acc;

  /** Temps du rush (s) → frame de la vidéo montée. */
  const outFrame = (srcTime: number): number => {
    for (const seg of segments) {
      if (srcTime <= seg.src[1] + 0.05) {
        const t = Math.max(srcTime, seg.src[0]);
        return seg.outStart + Math.round((t - seg.src[0]) * FPS);
      }
    }
    return total;
  };

  const segmentAt = (frame: number) => {
    const i = segments.findIndex((s) => frame >= s.outStart && frame < s.outStart + s.frames);
    return Math.max(0, i === -1 ? segments.length - 1 : i);
  };

  return {
    segments,
    total,
    outFrame,
    segmentAt,
    cuts: segments.slice(1).map((s) => ({ frame: s.outStart, type: s.transition as Transition })),
    words: data.mots,
    keywords: new Set(data.motsCles.map((k) => k.toLowerCase())),
    source: data.source,
  };
}

export const TimelineContext = createContext<Timeline | null>(null);
export const useTimeline = () => useContext(TimelineContext)!;
