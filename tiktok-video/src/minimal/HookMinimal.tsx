import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { isHighlighted } from '../components/Kinetic';
import { fonts } from '../theme';
import { LightLine } from './Line';
import { LINE, ink } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Répartit les mots en lignes courtes (affiche typographique). */
function toLines(text: string, maxChars: number) {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Image 0 : une simple hairline. Elle s'étire, puis l'accroche monte au-dessus d'elle. */
export const HookMinimal: React.FC<{ hook: string; highlights: string[] }> = ({ hook, highlights }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [2, 22], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const lineW = LINE.restW + (LINE.w - LINE.restW) * grow;
  const lineX = interpolate(grow, [0, 1], [540 - LINE.restW / 2, LINE.x]);
  const lines = toLines(hook, 11);
  const out = interpolate(frame, [56, 72], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const push = interpolate(frame, [0, 80], [1, 1.04]);

  return (
    <AbsoluteFill style={{ background: ink.bg }}>
      <div
        style={{
          position: 'absolute',
          left: LINE.x,
          right: 60,
          bottom: 1920 - LINE.y + 44,
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 128,
          lineHeight: 1.0,
          letterSpacing: -6,
          color: ink.text,
          transformOrigin: '0% 100%',
          transform: `scale(${push})`,
        }}
      >
        {lines.map((l, li) => {
          const start = 10 + li * 6;
          const p = interpolate(frame, [start, start + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const o = interpolate(out, [li * 0.15, li * 0.15 + 0.6], [0, 1], clamp);
          return (
            // Chaque ligne sort d'un masque (révélation « par en dessous »).
            <div key={li} style={{ overflow: 'hidden', paddingBottom: 14, marginBottom: -14 }}>
              <div style={{ transform: `translateY(${(1 - p) * 110 + o * -110}%)` }}>
                {l.split(' ').map((w, wi) => (
                  <span key={wi} style={{ color: isHighlighted(w, highlights) ? ink.gold : undefined }}>
                    {w}
                    {wi < l.split(' ').length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <LightLine width={lineW} x={lineX} glow={0.35 + grow * 0.2} />
    </AbsoluteFill>
  );
};
