import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { fonts } from '../theme';
import { LightLine } from './Line';
import { LINE, ink } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const M_LOOP_START = 92;
export const M_BEATS = [26, 33, 58, 65];
const PULSE_Y = 640;

/** Tracé du pouls : plat, puis un battement au centre (amplitude réglable). */
function pulsePath(amp: number, width: number, yc = PULSE_Y) {
  const x0 = 540 - width / 2;
  const x = (t: number) => x0 + t * width;
  const y = (v: number) => yc - v * amp;
  return [
    `M ${x(0)} ${y(0)}`,
    `L ${x(0.4)} ${y(0)}`,
    `L ${x(0.44)} ${y(0.35)}`,
    `L ${x(0.49)} ${y(-0.9)}`,
    `L ${x(0.54)} ${y(1)}`,
    `L ${x(0.58)} ${y(-0.25)}`,
    `L ${x(0.61)} ${y(0)}`,
    `L ${x(1)} ${y(0)}`,
  ].join(' ');
}

/** Le pouls SitePulse, le CTA, puis le retour à la hairline de la première image. */
export const CtaMinimal: React.FC<{ brand: { nom: string; accroche: string }; cta: string; ctaSuite: string; motCle: string }> = ({
  brand,
  cta,
  ctaSuite,
  motCle,
}) => {
  const frame = useCurrentFrame();
  const beat = (f: number) => (f >= 0 ? Math.exp(-f / 4) : 0);
  const pulse = Math.max(...M_BEATS.map((b, i) => beat(frame - b) * (i % 2 ? 0.7 : 1)));

  const draw = interpolate(frame, [2, 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const loop = interpolate(frame, [M_LOOP_START, 122], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const amp = 150 * (1 - loop) * (0.85 + pulse * 0.25);
  const lineW = 920;
  const pathLen = 2400;
  const fade = (d: number) => interpolate(frame, [d, d + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const leave = interpolate(frame, [M_LOOP_START - 4, M_LOOP_START + 10], [1, 0], clamp);
  const [before, after] = cta.split(motCle);

  // Pendant la boucle : le pouls s'aplatit, descend et se rétracte jusqu'à la hairline initiale.
  const loopY = interpolate(loop, [0, 1], [PULSE_Y, LINE.y]);
  const loopW = interpolate(loop, [0, 1], [lineW, LINE.restW]);
  const handoff = interpolate(loop, [0.8, 1], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: ink.bg }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: 1 - handoff }}>
          <defs>
            <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={6 + pulse * 10} result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={pulsePath(amp, loopW, loopY)}
            fill="none"
            stroke={pulse > 0.3 ? ink.gold : ink.text}
            strokeWidth={(4 + pulse * 2) * (1 - loop) + 3 * loop}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen * (1 - draw)}
            filter="url(#glow)"
          />
      </svg>
      {/* Dernières images : relais par la même hairline que l'image 0 (boucle parfaite). */}
      {handoff > 0 && <LightLine width={loopW} y={loopY} glow={0.35} opacity={handoff} />}

      <div style={{ position: 'absolute', top: 800, width: '100%', textAlign: 'center', fontFamily: fonts.display, opacity: leave }}>
        <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: -6, color: ink.text, opacity: fade(18), transform: `translateY(${(1 - fade(18)) * 30}px)` }}>
          {brand.nom}
        </div>
        <div style={{ marginTop: 6, fontSize: 28, fontWeight: 500, letterSpacing: 10, color: ink.dim, opacity: fade(24) }}>
          {brand.accroche.toUpperCase()}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 1180, left: 60, right: 60, textAlign: 'center', fontFamily: fonts.display, opacity: leave }}>
        <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -3, color: ink.text, opacity: fade(34), transform: `translateY(${(1 - fade(34)) * 30}px)` }}>
          {before}
          <span style={{ color: ink.gold, textShadow: `0 0 ${20 + pulse * 30}px rgba(245,196,81,${0.35 + pulse * 0.4})` }}>{motCle}</span>
          {after}
        </div>
        <div style={{ marginTop: 14, fontSize: 56, fontWeight: 700, letterSpacing: -1.5, color: ink.dim, opacity: fade(42), transform: `translateY(${(1 - fade(42)) * 30}px)` }}>
          {ctaSuite}
        </div>
      </div>
    </AbsoluteFill>
  );
};
