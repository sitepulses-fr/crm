import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { colors, fonts, googleLetters } from '../theme';
import { SEARCH_LAYOUT } from '../three/screenTexture';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const TYPE_START = 22;
export const TAP_AT = 72;

/** Frame (locale) d'apparition de chaque caractère : rythme humain légèrement irrégulier. */
export function typingSchedule(text: string, start = TYPE_START) {
  const out: number[] = [];
  let f = start;
  for (let i = 0; i < text.length; i++) {
    out.push(f);
    f += text[i] === ' ' ? 4 : 2 + ((i * 7) % 3 === 0 ? 2 : 1);
  }
  return out;
}

const Magnifier: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="10" cy="10" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
    <line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const Mic: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="9" y="3" width="6" height="11" rx="3" fill="#4285F4" />
    <path d="M6 11a6 6 0 0 0 12 0" fill="none" stroke="#34A853" strokeWidth="2" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="#FBBC05" strokeWidth="2" />
    <line x1="9" y1="21" x2="15" y2="21" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SearchScene: React.FC<{ query: string }> = ({ query }) => {
  const frame = useCurrentFrame();
  const L = SEARCH_LAYOUT;
  const schedule = typingSchedule(query);
  const typed = schedule.filter((f) => frame >= f).length;
  const text = query.slice(0, typed);
  const typingDone = typed === query.length;

  // Entrée : on sort de la lumière de l'écran traversé.
  const enter = interpolate(frame, [2, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  // Mouvement de caméra continu (léger push + tilt 3D).
  const push = interpolate(frame, [0, 84], [1.0, 1.07], clamp);
  const tilt = interpolate(frame, [0, 84], [10, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  // Sortie 3D : l'interface bascule vers l'arrière et révèle la carte.
  const exit = interpolate(frame, [82, 104], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });

  const focus = interpolate(frame, [12, 22], [0, 1], clamp);
  const glowSpin = frame * 4;
  const glowPulse = 0.75 + 0.25 * Math.sin(frame / 5);
  const tap = interpolate(frame, [TAP_AT, TAP_AT + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tapActive = frame >= TAP_AT;
  const caretOn = Math.floor(frame / 8) % 2 === 0 || !typingDone;

  const suggestions = [query, `${query} avis`, `${query} pas cher`, `${query} urgence`, `${query} devis gratuit`];
  const sugVisible = interpolate(frame, [schedule[2] ?? 30, (schedule[2] ?? 30) + 8], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: '50% 40%', overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, #202124 0%, #17181b 100%)',
          transformOrigin: '50% 30%',
          transform: [
            `translateY(${exit * -380}px)`,
            `translateZ(${exit * -900}px)`,
            `rotateX(${tilt + exit * 62}deg)`,
            `scale(${(1.25 - enter * 0.25) * push})`,
          ].join(' '),
          filter: `blur(${(1 - enter) * 16 + exit * 6}px) brightness(${1 + (1 - enter) * 1.5 - exit * 0.4})`,
          opacity: enter * (1 - exit * 0.95),
          borderRadius: exit * 60,
          fontFamily: fonts.ui,
        }}
      >
        {/* Barre d'état */}
        <div style={{ position: 'absolute', top: -65, left: 90, color: colors.gText, fontSize: 44, fontWeight: 500 }}>9:41</div>

        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            top: L.logoY - L.logoSize * 0.95,
            width: '100%',
            textAlign: 'center',
            fontSize: L.logoSize,
            fontWeight: 500,
            letterSpacing: -4,
            opacity: 1 - focus * 0.15,
          }}
        >
          {googleLetters.map((g, i) => (
            <span key={i} style={{ color: g.c }}>
              {g.l}
            </span>
          ))}
        </div>

        {/* Halo diffus sous la barre */}
        <div
          style={{
            position: 'absolute',
            left: L.barX - 10,
            top: L.barY - 10,
            width: L.barW + 20,
            height: L.barH + 20,
            borderRadius: L.barH,
            background: `conic-gradient(from ${glowSpin}deg, #4285F4, ${colors.gold}, #EA4335, #34A853, #4285F4)`,
            filter: 'blur(38px)',
            opacity: focus * glowPulse * (0.75 + tap * 0.5),
          }}
        />

        {/* Barre de recherche avec bord lumineux animé */}
        <div
          style={{
            position: 'absolute',
            left: L.barX,
            top: L.barY,
            width: L.barW,
            height: L.barH,
            borderRadius: L.barH / 2,
            padding: 4,
            boxSizing: 'border-box',
            background:
              focus > 0
                ? `conic-gradient(from ${glowSpin}deg, #4285F4, ${colors.gold}, #EA4335, #34A853, #4285F4)`
                : 'rgba(138,180,248,0.55)',
            transform: `scale(${1 + focus * 0.02 + Math.sin(tap * Math.PI) * 0.025})`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: L.barH / 2,
              background: colors.gSurface2,
              display: 'flex',
              alignItems: 'center',
              padding: '0 40px 0 50px',
              boxSizing: 'border-box',
              gap: 26,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Magnifier size={54} color={colors.gTextDim} />
            <div style={{ flex: 1, fontSize: 50, color: text ? colors.gText : colors.gTextDim, whiteSpace: 'nowrap' }}>
              {text || (focus < 0.5 ? 'Rechercher' : '')}
              <span
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 58,
                  marginLeft: 4,
                  verticalAlign: 'middle',
                  background: colors.gBlue,
                  opacity: focus > 0.5 && caretOn && !tapActive ? 1 : 0,
                }}
              />
            </div>
            <Mic size={54} />
            {/* Onde du tap */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 900,
                height: 900,
                marginLeft: -450,
                marginTop: -450,
                borderRadius: '50%',
                background: 'rgba(138,180,248,0.35)',
                transform: `scale(${tap})`,
                opacity: tapActive ? 1 - tap : 0,
              }}
            />
          </div>
        </div>

        {/* Suggestions */}
        <div
          style={{
            position: 'absolute',
            left: L.barX,
            top: L.barY + L.barH + 26,
            width: L.barW,
            borderRadius: 40,
            background: colors.gSurface,
            overflow: 'hidden',
            opacity: sugVisible,
            transform: `translateY(${(1 - sugVisible) * -20}px)`,
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          }}
        >
          {suggestions.map((s, i) => {
            const rowIn = interpolate(frame, [(schedule[2] ?? 30) + i * 3, (schedule[2] ?? 30) + i * 3 + 8], [0, 1], clamp);
            const matched = s.slice(0, text.length);
            const rest = s.slice(text.length);
            const selected = i === 0 && tapActive;
            return (
              <div
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 34,
                  height: 118,
                  padding: '0 44px',
                  fontSize: 44,
                  color: colors.gText,
                  opacity: rowIn,
                  background: selected ? `rgba(138,180,248,${0.18 * (1 - tap * 0.3)})` : 'transparent',
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.gBorder}`,
                }}
              >
                <Magnifier size={42} color={colors.gTextDim} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ fontWeight: 400 }}>{matched}</span>
                  <span style={{ fontWeight: 700 }}>{rest}</span>
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
