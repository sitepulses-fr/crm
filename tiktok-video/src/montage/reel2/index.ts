import { MontageProject } from '../engine/Montage';
import { MontageData } from '../engine/timeline';
import data from './montage.json';
import { Overlays } from './Overlays';

/** Réel n°2 : « Un client qui recherche un couvreur… » (4 clips, blancs coupés). */
export const reel2Project: MontageProject = {
  data: data as MontageData,
  punches: [
    [0.62, 1.0],
    [2.9, 1.06],
    [4.62, 1.0],
    [12.0, 1.0],
    [14.84, 1.15],
    [17.62, 1.0],
    [20.96, 1.15],
    [26.54, 1.0],
    [30.3, 1.15],
  ],
  impacts: [12.14],
  captionTop: () => 1290,
  Overlays,
  sfx: [
    ...[0.9, 4.62, 7.3, 15.0, 17.76, 20.96, 26.68, 30.25].map((at, i) => ({ at, src: 'tap', volume: 0.7, rate: 1.25 + (i % 3) * 0.1 })),
    ...[3.14, 3.34, 3.6].map((at, i) => ({ at, src: 'pin', volume: 0.5, rate: 1.5 + i * 0.1 })),
    ...Array.from({ length: 8 }, (_, i) => ({ at: 4.8, offset: i * 8, src: `key-${i % 4}`, volume: 0.55, rate: 0.7 })),
    ...Array.from({ length: 8 }, (_, i) => ({ at: 1.0, offset: i * 2, src: `key-${i % 4}`, volume: 0.45 })),
    { at: 8.68, src: 'whoosh-out', volume: 0.4, rate: 1.4 },
    { at: 8.98, src: 'shimmer', volume: 0.4, rate: 1.3 },
    { at: 15.72, src: 'tap', volume: 0.7, rate: 0.9 },
    { at: 20.34, src: 'shimmer', volume: 0.4, rate: 1.2 },
    { at: 24.12, src: 'pulse', volume: 0.8 },
    { at: 24.12, src: 'shimmer', volume: 0.35, rate: 1.5 },
    { at: 29.38, src: 'impact', volume: 0.45, rate: 1.6 },
    ...Array.from({ length: 5 }, (_, i) => ({ at: 30.62, offset: i * 2, src: `key-${i % 4}`, volume: 0.6 })),
    { at: 30.62, offset: 14, src: 'tap', volume: 0.8 },
    { at: 32.1, src: 'shimmer', volume: 0.4, rate: 1.4 },
  ],
};
