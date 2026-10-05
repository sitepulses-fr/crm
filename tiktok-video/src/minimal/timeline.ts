import config from '../../config.json';

// Version « minimal / typographique » : mêmes 21 s, mêmes timings de voix off.
export const TM = {
  hook: { from: 0, duration: 80 }, // 0 → 2,7 s : hairline → accroche géante
  search: { from: 70, duration: 90 }, // 2,3 → 5,3 s : la ligne devient la recherche
  ranking: { from: 146, duration: 254 }, // 4,9 → 13,3 s : 10 lignes de lumière, top 3 en or
  punch: { from: 386, duration: 134 }, // 12,9 → 17,3 s : typographie 3D
  cta: { from: 506, duration: 124 }, // 16,9 → 21 s : pouls SitePulse + CTA, retour à la hairline
};

// Le motif commun : une ligne de lumière horizontale.
export const LINE = {
  y: 1080, // position de la ligne pendant l'accroche et la recherche
  x: 80,
  w: 920,
  restW: 140, // longueur au repos (première et dernière image)
};

// Direction artistique SitePulse (sitepulses.fr) : quasi-noir, blanc cassé, un seul bleu.
export const ink = {
  bg: '#0a0a0c',
  text: '#ecede9',
  dim: '#8b8d92',
  faint: '#2a2b30',
  accent: config.marque.bleu, // #5d7bff
};
