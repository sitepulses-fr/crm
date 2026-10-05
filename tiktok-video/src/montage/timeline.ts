import data from './montage.json';

export const FPS = 30;

export type Word = { w: string; s: number; e: number };
export type Segment = { src: [number, number]; outStart: number; frames: number };

// Segments conservés du rush, mis bout à bout (les blancs entre les plans sont supprimés).
export const SEGMENTS: Segment[] = (() => {
  let acc = 0;
  return (data.segments as [number, number][]).map((src) => {
    const frames = Math.round((src[1] - src[0]) * FPS);
    const seg = { src, outStart: acc, frames };
    acc += frames;
    return seg;
  });
})();

export const TOTAL_FRAMES = SEGMENTS.reduce((a, s) => a + s.frames, 0);

/** Temps du rush (s) → frame de la vidéo montée. */
export function outFrame(srcTime: number): number {
  for (const seg of SEGMENTS) {
    if (srcTime <= seg.src[1] + 0.05) {
      const t = Math.max(srcTime, seg.src[0]);
      return seg.outStart + Math.round((t - seg.src[0]) * FPS);
    }
  }
  return TOTAL_FRAMES;
}

/** Frames de raccord entre deux segments (là où vont les transitions). */
export const CUTS = SEGMENTS.slice(1).map((s) => s.outStart);

export const WORDS: Word[] = data.mots;
export const KEYWORDS = new Set(data.motsCles.map((k: string) => k.toLowerCase()));
export const SOURCE = data.source;
