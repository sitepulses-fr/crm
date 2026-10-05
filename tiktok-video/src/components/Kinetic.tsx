import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { normalize } from '../resolveConfig';
import { colors, fonts } from '../theme';
import { HEIGHT, SAFE_BOTTOM, SAFE_TOP } from '../timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Vrai si le mot (sans ponctuation) fait partie d'une des expressions à mettre en avant. */
export function isHighlighted(word: string, highlights: string[]) {
  const w = normalize(word.replace(/[.,!?;:«»"]/g, ''));
  if (!w) return false;
  return highlights.some((h) => normalize(h).split(/\s+/).includes(w));
}

/** Texte révélé mot par mot (montée + flou → net), avec mots-clés dorés. */
export const RevealWords: React.FC<{
  text: string;
  start: number;
  end?: number;
  stagger?: number;
  highlights?: string[];
  style?: React.CSSProperties;
  accentColor?: string;
}> = ({ text, start, end, stagger = 3, highlights = [], style, accentColor = colors.gold }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  const out = end === undefined ? 1 : interpolate(frame, [end - 8, end], [1, 0], clamp);
  const outY = end === undefined ? 0 : interpolate(frame, [end - 8, end], [0, -30], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <div style={{ ...style, opacity: out, transform: `translateY(${outY}px)` }}>
      {words.map((w, i) => {
        const f = frame - start - i * stagger;
        const p = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const hl = isHighlighted(w, highlights);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.26em',
              opacity: p,
              transform: `translateY(${(1 - p) * 40}px) scale(${0.92 + p * 0.08})`,
              filter: `blur(${(1 - p) * 10}px)`,
              color: hl ? accentColor : undefined,
              textShadow: hl ? `0 0 28px ${accentColor}88, 0 0 2px ${accentColor}` : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Légende façon sous-titre premium, dans la zone sûre. */
export const Caption: React.FC<{ text: string; start: number; end: number; top?: number; accent?: boolean; highlights?: string[] }> = ({
  text,
  start,
  end,
  top = 210,
  accent = false,
  highlights = [],
}) => {
  const frame = useCurrentFrame();
  if (frame < start - 2 || frame > end + 2) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <RevealWords
        text={text}
        start={start}
        end={end}
        stagger={2}
        highlights={highlights}
        style={{
          position: 'absolute',
          top,
          left: 70,
          right: 70,
          textAlign: 'center',
          fontFamily: fonts.display,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: -1.5,
          color: '#ffffff',
          fontSize: accent ? 92 : 76,
          textShadow: '0 6px 30px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Calque de contrôle des zones sûres TikTok (activable dans config.json). */
export const SafeZones: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SAFE_TOP, background: 'rgba(255,0,0,0.25)', borderBottom: '3px dashed red' }} />
    <div style={{ position: 'absolute', top: HEIGHT - SAFE_BOTTOM, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.25)', borderTop: '3px dashed red' }} />
  </AbsoluteFill>
);
