import React from 'react';
import { LINE, ink } from './timeline';

/** La ligne de lumière, fil conducteur de toute la vidéo. */
export const LightLine: React.FC<{
  width: number;
  y?: number;
  x?: number; // bord gauche ; centrée si absent
  thickness?: number;
  color?: string;
  glow?: number;
  opacity?: number;
}> = ({ width, y = LINE.y, x, thickness = 3, color = ink.text, glow = 0.4, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      top: y - thickness / 2,
      left: x ?? 540 - width / 2,
      width,
      height: thickness,
      borderRadius: thickness,
      background: color,
      opacity,
      boxShadow: `0 0 ${12 + glow * 30}px ${glow * 4}px ${color}${Math.round(Math.min(1, glow) * 120)
        .toString(16)
        .padStart(2, '0')}`,
    }}
  />
);
