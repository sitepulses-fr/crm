import * as THREE from 'three';
import { colors, googleLetters } from '../theme';

// Dimensions communes avec la scène HTML de recherche : l'écran du téléphone
// affiche exactement la même interface, ce qui rend la traversée de l'écran invisible.
export const SCREEN_TEX_W = 1080;
export const SCREEN_TEX_H = 2240;
export const SCREEN_OFFSET_Y = (SCREEN_TEX_H - 1920) / 2;

export const SEARCH_LAYOUT = {
  logoY: 600,
  logoSize: 170,
  barX: 70,
  barY: 720,
  barW: 940,
  barH: 140,
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMagnifier(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x - s * 0.1, y - s * 0.1, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.14, y + s * 0.14);
  ctx.lineTo(x + s * 0.42, y + s * 0.42);
  ctx.stroke();
}

/** Accueil « Google » en thème sombre, dessiné sur un canvas pour l'écran du smartphone 3D. */
export function createSearchHomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_TEX_W;
  canvas.height = SCREEN_TEX_H;
  const ctx = canvas.getContext('2d')!;
  const oy = SCREEN_OFFSET_Y;
  const L = SEARCH_LAYOUT;

  const bg = ctx.createLinearGradient(0, 0, 0, SCREEN_TEX_H);
  bg.addColorStop(0, '#202124');
  bg.addColorStop(1, '#17181b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SCREEN_TEX_W, SCREEN_TEX_H);

  // Barre d'état.
  ctx.fillStyle = colors.gText;
  ctx.font = '600 44px Roboto';
  ctx.textBaseline = 'middle';
  ctx.fillText('9:41', 90, 95);
  roundRect(ctx, 880, 78, 80, 36, 10);
  ctx.strokeStyle = colors.gText;
  ctx.lineWidth = 4;
  ctx.stroke();
  roundRect(ctx, 886, 84, 56, 24, 6);
  ctx.fill();

  // Logo.
  ctx.font = `500 ${L.logoSize}px Roboto`;
  ctx.textBaseline = 'alphabetic';
  const widths = googleLetters.map((g) => ctx.measureText(g.l).width);
  const total = widths.reduce((a, b) => a + b, 0) - 6 * 4;
  let x = (SCREEN_TEX_W - total) / 2;
  googleLetters.forEach((g, i) => {
    ctx.fillStyle = g.c;
    ctx.fillText(g.l, x, L.logoY + oy);
    x += widths[i] - 4;
  });

  // Barre de recherche.
  roundRect(ctx, L.barX, L.barY + oy, L.barW, L.barH, L.barH / 2);
  ctx.fillStyle = colors.gSurface2;
  ctx.fill();
  ctx.strokeStyle = 'rgba(138,180,248,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawMagnifier(ctx, L.barX + 75, L.barY + oy + L.barH / 2, 56, colors.gTextDim);
  ctx.fillStyle = colors.gTextDim;
  ctx.font = '400 46px Roboto';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rechercher', L.barX + 135, L.barY + oy + L.barH / 2 + 2);

  // Raccourcis (pastilles) sous la barre.
  const chips = ['Restaurants', 'Météo', 'Actualités'];
  ctx.font = '500 36px Roboto';
  let cx = 110;
  chips.forEach((c) => {
    const w = ctx.measureText(c).width + 70;
    roundRect(ctx, cx, L.barY + oy + 200, w, 84, 42);
    ctx.fillStyle = colors.gSurface;
    ctx.fill();
    ctx.fillStyle = colors.gText;
    ctx.fillText(c, cx + 35, L.barY + oy + 244);
    cx += w + 24;
  });

  // Barre de navigation (geste).
  roundRect(ctx, SCREEN_TEX_W / 2 - 150, SCREEN_TEX_H - 50, 300, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
