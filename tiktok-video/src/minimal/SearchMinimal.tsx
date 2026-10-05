import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { fonts } from '../theme';
import { typingSchedule } from '../scenes/SearchScene';
import { LightLine } from './Line';
import { LINE, ink } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const M_TYPE_START = 14;
export const M_ENTER_AT = 62;

/** La ligne devient un champ de recherche : la requête se tape en très grand au-dessus. */
export const SearchMinimal: React.FC<{ query: string }> = ({ query }) => {
  const frame = useCurrentFrame();
  const schedule = typingSchedule(query, M_TYPE_START);
  const typed = schedule.filter((f) => frame >= f).length;
  const done = typed === query.length;
  const caretOn = !done || Math.floor(frame / 7) % 2 === 0;

  const label = interpolate(frame, [4, 14], [0, 1], clamp);
  const enter = interpolate(frame, [M_ENTER_AT, M_ENTER_AT + 6, M_ENTER_AT + 16], [0, 1, 0.6], clamp);
  const exit = interpolate(frame, [M_ENTER_AT + 8, 90], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const fontSize = query.length > 16 ? 96 : 118;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: LINE.x,
          top: LINE.y - 330,
          fontFamily: fonts.mono,
          fontWeight: 400,
          fontSize: 28,
          letterSpacing: 5,
          color: ink.dim,
          opacity: label * (1 - exit),
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 6, background: ink.accent }} />
        RECHERCHE GOOGLE
      </div>
      <div
        style={{
          position: 'absolute',
          left: LINE.x,
          right: 40,
          bottom: 1920 - LINE.y + 40,
          fontFamily: fonts.brand,
          fontWeight: 600,
          fontSize,
          letterSpacing: -5,
          lineHeight: 1,
          color: ink.text,
          whiteSpace: 'nowrap',
          opacity: 1 - exit,
          transform: `translateY(${exit * -160}px)`,
          filter: `blur(${exit * 12}px)`,
        }}
      >
        {query.slice(0, typed)}
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: fontSize * 0.85,
            marginLeft: 10,
            verticalAlign: '-8%',
            background: ink.accent,
            opacity: caretOn && frame < M_ENTER_AT ? 1 : 0,
          }}
        />
      </div>
      {/* Validation : la ligne s'illumine puis se dissout vers le classement. */}
      <LightLine
        width={LINE.w * (1 - exit * 0.3)}
        x={LINE.x + exit * LINE.w * 0.15}
        thickness={3 + enter * 3}
        color={enter > 0.2 ? ink.accent : ink.text}
        glow={0.55 + enter * 1.2}
        opacity={1 - exit}
      />
    </AbsoluteFill>
  );
};
