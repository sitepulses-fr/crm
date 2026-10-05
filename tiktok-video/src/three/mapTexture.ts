import * as THREE from 'three';
import { seededRandom } from '../resolveConfig';

export const MAP_SIZE = 14; // unités 3D couvertes par la texture
export const MAP_PX = 2048;

// Palette inspirée du mode nuit de Google Maps, assombrie pour un rendu premium.
const P = {
  land: '#1b2331',
  block: '#222c3c',
  park: '#1d332f',
  water: '#0d1a2c',
  waterEdge: '#14263d',
  street: '#2c3749',
  road: '#3a4659',
  highway: '#6a5638',
  highwayCenter: '#8a7046',
  label: '#9aa5b8',
  city: '#d6dde8',
};

const toPx = (u: number) => ((u + MAP_SIZE / 2) / MAP_SIZE) * MAP_PX;

/** Carte procédurale (rues, fleuve, parcs, libellés) générée à partir du nom de la ville. */
export function createMapTexture(ville: string, streets: string[]): THREE.CanvasTexture {
  const rand = seededRandom(`map|${ville}`);
  const canvas = document.createElement('canvas');
  canvas.width = MAP_PX;
  canvas.height = MAP_PX;
  const ctx = canvas.getContext('2d')!;
  const W = MAP_PX;

  ctx.fillStyle = P.land;
  ctx.fillRect(0, 0, W, W);

  // Parcs.
  ctx.fillStyle = P.park;
  for (let i = 0; i < 7; i++) {
    const cx = rand() * W;
    const cy = rand() * W;
    const r = 60 + rand() * 120;
    ctx.beginPath();
    for (let a = 0; a <= 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const rr = r * (0.7 + rand() * 0.5);
      const x = cx + Math.cos(ang) * rr;
      const y = cy + Math.sin(ang) * rr * 0.8;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Bâti (petits rectangles), recouvert ensuite par les rues => îlots.
  ctx.fillStyle = P.block;
  for (let i = 0; i < 5200; i++) {
    const x = rand() * W;
    const y = rand() * W;
    const dx = x - W / 2;
    const dy = y - W * 0.42;
    const density = Math.exp(-(dx * dx + dy * dy) / (2 * 620 * 620));
    if (rand() > density * 1.25) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rand() - 0.5) * 0.3);
    ctx.fillRect(-12, -9, 14 + rand() * 26, 10 + rand() * 22);
    ctx.restore();
  }

  // Rues secondaires : trames légèrement tournées par quartier.
  ctx.strokeStyle = P.street;
  ctx.lineCap = 'round';
  const quarters = [
    [0, 0, 0.08],
    [W / 2, 0, -0.18],
    [0, W / 2, 0.22],
    [W / 2, W / 2, -0.05],
  ];
  for (const [qx, qy, rot] of quarters) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(qx, qy, W / 2, W / 2);
    ctx.clip();
    ctx.translate(qx + W / 4, qy + W / 4);
    ctx.rotate(rot + (rand() - 0.5) * 0.1);
    const step = 78 + rand() * 20;
    for (let k = -14; k <= 14; k++) {
      ctx.lineWidth = rand() > 0.85 ? 13 : 8;
      const off = k * step + (rand() - 0.5) * 20;
      ctx.beginPath();
      ctx.moveTo(-W, off);
      ctx.lineTo(W, off + (rand() - 0.5) * 40);
      ctx.stroke();
      ctx.lineWidth = rand() > 0.85 ? 13 : 8;
      ctx.beginPath();
      ctx.moveTo(off, -W);
      ctx.lineTo(off + (rand() - 0.5) * 40, W);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fleuve sinueux.
  const riverY = W * (0.6 + rand() * 0.1);
  const riverPath = () => {
    ctx.beginPath();
    ctx.moveTo(-50, riverY);
    ctx.bezierCurveTo(W * 0.3, riverY - 260, W * 0.55, riverY + 240, W + 50, riverY - 160);
  };
  ctx.strokeStyle = P.waterEdge;
  ctx.lineWidth = 96;
  riverPath();
  ctx.stroke();
  ctx.strokeStyle = P.water;
  ctx.lineWidth = 80;
  riverPath();
  ctx.stroke();

  // Grands axes.
  const majors: [number, number, number, number, number, number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const vertical = i % 2 === 0;
    const a = (0.15 + rand() * 0.7) * W;
    const b = (0.15 + rand() * 0.7) * W;
    majors.push(
      vertical
        ? [a, -40, a + (rand() - 0.5) * 500, W * 0.35, b + (rand() - 0.5) * 500, W * 0.7, b, W + 40]
        : [-40, a, W * 0.35, a + (rand() - 0.5) * 500, W * 0.7, b + (rand() - 0.5) * 500, W + 40, b],
    );
  }
  const strokeCurve = (c: number[], width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(c[0], c[1]);
    ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
    ctx.stroke();
  };
  majors.forEach((c) => strokeCurve(c, 22, P.road));

  // Rocade.
  const hw = [-60, W * 0.18, W * 0.4, W * 0.02, W * 0.85, W * 0.3, W + 60, W * 0.12];
  strokeCurve(hw, 34, P.highway);
  strokeCurve(hw, 8, P.highwayCenter);

  // Libellés de rues.
  ctx.font = '500 26px Roboto';
  ctx.fillStyle = P.label;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  majors.slice(0, 4).forEach((c, i) => {
    const t = 0.38 + rand() * 0.2;
    const mt = 1 - t;
    const x = mt ** 3 * c[0] + 3 * mt * mt * t * c[2] + 3 * mt * t * t * c[4] + t ** 3 * c[6];
    const y = mt ** 3 * c[1] + 3 * mt * mt * t * c[3] + 3 * mt * t * t * c[5] + t ** 3 * c[7];
    const dx = 3 * mt * mt * (c[2] - c[0]) + 6 * mt * t * (c[4] - c[2]) + 3 * t * t * (c[6] - c[4]);
    const dy = 3 * mt * mt * (c[3] - c[1]) + 6 * mt * t * (c[5] - c[3]) + 3 * t * t * (c[7] - c[5]);
    let ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillText(streets[i % streets.length], 0, 0);
    ctx.restore();
  });

  // Nom de la ville.
  ctx.font = '700 64px Roboto';
  ctx.fillStyle = P.city;
  ctx.strokeStyle = 'rgba(10,14,22,0.9)';
  ctx.lineWidth = 10;
  const cityLabel = ville.toUpperCase();
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '18px';
  ctx.strokeText(cityLabel, toPx(0), toPx(-3.2));
  ctx.fillText(cityLabel, toPx(0), toPx(-3.2));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}
