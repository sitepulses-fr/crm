// Toutes les durées en frames (30 fps). Les scènes se chevauchent légèrement
// pour permettre des transitions fondues / 3D.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 630; // 21 s

export const sec = (s: number) => Math.round(s * FPS);

export const T = {
  hook: { from: 0, duration: 72 }, // 0 → 2,4 s : smartphone 3D + dolly
  search: { from: 56, duration: 104 }, // 1,9 → 5,3 s : interface de recherche
  map: { from: 146, duration: 252 }, // 4,9 → 13,3 s : carte + liste + top 3
  punch: { from: 386, duration: 134 }, // 12,9 → 17,3 s : texte géant 3D
  cta: { from: 506, duration: 124 }, // 16,9 → 21 s : logo + appel à l'action
};

// Zones sûres TikTok.
export const SAFE_TOP = 150;
export const SAFE_BOTTOM = 350;
