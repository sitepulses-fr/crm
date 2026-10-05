import { MontageProject } from '../engine/Montage';
import { MontageData } from '../engine/timeline';
import data from './montage.json';
import { Overlays } from './Overlays';

/** Réel n°2 : « Ton pire ennemi… » (4 clips dans l'ordre d'envoi, blancs coupés). */
export const reel2Project: MontageProject = {
  data: data as MontageData,
  punches: [
    [0.87, 1.0],
    [3.71, 1.15],
    [6.29, 1.0],
    [8.57, 1.06],
    [10.29, 1.0],
    [17.62, 1.0],
    [20.96, 1.15],
    [26.54, 1.0],
    [30.3, 1.15],
  ],
  impacts: [1.01],
  captionTop: () => 1290,
  Overlays,
  sfx: [
    ...[6.57, 10.29, 12.97, 3.87, 17.76, 20.96, 26.68, 30.25].map((at, i) => ({ at, src: 'tap', volume: 0.7, rate: 1.25 + (i % 3) * 0.1 })),
    ...[8.81, 9.01, 9.27].map((at, i) => ({ at, src: 'pin', volume: 0.5, rate: 1.5 + i * 0.1 })),
    ...Array.from({ length: 8 }, (_, i) => ({ at: 10.47, offset: i * 8, src: `key-${i % 4}`, volume: 0.55, rate: 0.7 })),
    ...Array.from({ length: 8 }, (_, i) => ({ at: 6.67, offset: i * 2, src: `key-${i % 4}`, volume: 0.45 })),
    { at: 14.65, src: 'shimmer', volume: 0.4, rate: 1.3 },
    { at: 4.59, src: 'tap', volume: 0.7, rate: 0.9 },
    { at: 20.34, src: 'shimmer', volume: 0.4, rate: 1.2 },
    { at: 24.12, src: 'pulse', volume: 0.8 },
    { at: 24.12, src: 'shimmer', volume: 0.35, rate: 1.5 },
    { at: 29.38, src: 'impact', volume: 0.45, rate: 1.6 },
    ...Array.from({ length: 5 }, (_, i) => ({ at: 30.62, offset: i * 2, src: `key-${i % 4}`, volume: 0.6 })),
    { at: 30.62, offset: 14, src: 'tap', volume: 0.8 },
    { at: 32.1, src: 'shimmer', volume: 0.4, rate: 1.4 },
  ],
};
