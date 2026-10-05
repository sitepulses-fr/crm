import { MontageProject } from '../engine/Montage';
import { MontageData } from '../engine/timeline';
import data from './montage.json';
import { Overlays } from './Overlays';

/** Rush n°1 : « Stop, si t'es artisan… » (plans larges puis rapprochés). */
export const facecamProject: MontageProject = {
  data: data as MontageData,
  punches: [
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
  ],
  impacts: [0.55],
  // Plus bas sur les plans rapprochés, sous les apparitions placées au niveau du torse.
  captionTop: (frame, tl) => (frame >= tl.outFrame(18.7) ? 1380 : 1255),
  skipFirstCaption: 'Stop',
  Overlays,
  sfx: [
    ...[2.6, 8.0, 9.1, 11.0, 13.8, 19.6, 22.5, 27.9, 29.85].map((at, i) => ({ at, src: 'tap', volume: 0.7, rate: 1.25 + (i % 3) * 0.1 })),
    { at: 11.2, src: 'shimmer', volume: 0.45, rate: 1.2 },
    { at: 16.8, src: 'pulse', volume: 0.8 },
    { at: 24.8, src: 'riser', volume: 0.3, rate: 2 },
    ...Array.from({ length: 6 }, (_, i) => ({ at: 30.25, offset: i * 2, src: `key-${i % 4}`, volume: 0.6 })),
    { at: 30.25, offset: 16, src: 'tap', volume: 0.8 },
    { at: 32.8, src: 'shimmer', volume: 0.4, rate: 1.4 },
  ],
};
