import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ink } from '../../minimal/timeline';
import { fonts } from '../../theme';
import { useTimeline } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Briques des apparitions : carte « verre fumé » dans la DA SitePulse, entrée élastique 3D.
export const BAND_TOP = 215;

/** Entrée/sortie communes : pop élastique + flou, sortie rapide vers le haut. */
export function useLife(fromSrc: number, toSrc: number, bandFor: (srcTime: number) => number = () => BAND_TOP) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { outFrame } = useTimeline();
  const a = outFrame(fromSrc);
  const b = outFrame(toSrc);
  const local = frame - a;
  const inP = spring({ frame: local, fps, config: { damping: 13, stiffness: 180, mass: 0.7 } });
  const outP = interpolate(frame, [b - 6, b], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const visible = frame >= a && frame < b;
  return { visible, local, inP, outP, frame, top: bandFor(fromSrc) };
}

export const Card: React.FC<{ inP: number; outP: number; width?: number; children: React.ReactNode; top?: number }> = ({
  inP,
  outP,
  width = 880,
  top = BAND_TOP,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left: (1080 - width) / 2,
      width,
      padding: '34px 40px',
      boxSizing: 'border-box',
      borderRadius: 40,
      background: 'rgba(10,10,12,0.72)',
      border: '1.5px solid rgba(255,255,255,0.14)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
      backdropFilter: 'blur(22px) saturate(1.3)',
      color: ink.text,
      fontFamily: fonts.brand,
      transformOrigin: '50% 0%',
      transform: `perspective(1400px) rotateX(${(1 - inP) * -35}deg) scale(${0.7 + inP * 0.3}) translateY(${outP * -80}px)`,
      opacity: Math.min(1, inP * 1.6) * (1 - outP),
      filter: `blur(${(1 - Math.min(1, inP)) * 10 + outP * 12}px)`,
    }}
  >
    {children}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = ink.dim }) => (
  <div style={{ fontFamily: fonts.mono, fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color, display: 'flex', alignItems: 'center', gap: 14 }}>
    <span style={{ width: 12, height: 12, borderRadius: 6, background: ink.accent, boxShadow: `0 0 12px ${ink.accent}` }} />
    {children}
  </div>
);


export const PhoneIcon: React.FC<{ color: string; size: number; ring: number }> = ({ color, size, ring }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${Math.sin(ring) * 14}deg)` }}>
    <path
      d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
      fill={color}
    />
  </svg>
);

/** Commentaire tapé (CTA) + badge. */
export const CommentCta: React.FC<{ word: string; from: number; to: number; typeAt: number; badgeAt: number; badge: string; label?: string }> = ({
  word,
  from,
  to,
  typeAt,
  badgeAt,
  badge,
  label = 'Écris en commentaire',
}) => {
  const { visible, frame, inP, outP, top } = useLife(from, to);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const t0 = outFrame(typeAt);
  const typed = Math.max(0, Math.min(word.length, Math.floor((frame - t0) / 2)));
  const sent = interpolate(frame, [t0 + word.length * 2 + 4, t0 + word.length * 2 + 10], [0, 1], clamp);
  const b = spring({ frame: frame - outFrame(badgeAt), fps: 30, config: { damping: 11, stiffness: 200 } });
  return (
    <Card top={top} inP={inP} outP={outP}>
      <Label>{label}</Label>
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '18px 18px 18px 34px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          border: '1.5px solid rgba(255,255,255,0.16)',
        }}
      >
        <div style={{ flex: 1, fontSize: 84, fontWeight: 700, letterSpacing: -2, color: typed ? '#fff' : 'rgba(255,255,255,0.4)' }}>
          {typed ? word.slice(0, typed) : 'Ajouter…'}
          {typed > 0 && typed < word.length && <span style={{ color: ink.accent }}>|</span>}
        </div>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            background: sent > 0.5 ? '#22c55e' : ink.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${1 + Math.sin(sent * Math.PI) * 0.2})`,
          }}
        >
          <svg width="50" height="50" viewBox="0 0 24 24">
            {sent > 0.5 ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke={ink.bg} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </div>
      </div>
      <div
        style={{
          marginTop: 22,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 26px',
          borderRadius: 999,
          background: ink.accent,
          fontSize: 40,
          fontWeight: 600,
          transform: `scale(${b})`,
          transformOrigin: 'left center',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="2.4" />
          <path d="M12 7v5l3 2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {badge}
      </div>
    </Card>
  );
};

/** Texte géant qui claque (impact). */
export const Slam: React.FC<{ from: number; to: number; text: React.ReactNode; sub?: string; size?: number; top?: number }> = ({
  from,
  to,
  text,
  sub,
  size = 300,
  top = 230,
}) => {
  const { visible, local, outP } = useLife(from, to);
  if (!visible) return null;
  const slam = interpolate(local, [0, 5], [2.6, 1], { ...clamp, easing: Easing.out(Easing.exp) });
  const subP = interpolate(local, [10, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div
        style={{
          position: 'absolute',
          top,
          width: '100%',
          textAlign: 'center',
          fontFamily: fonts.brand,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: -size * 0.055,
          color: '#fff',
          transform: `scale(${slam}) translateY(${outP * -60}px)`,
          opacity: interpolate(local, [0, 2], [0, 1], clamp) * (1 - outP),
          textShadow: `0 0 60px ${ink.accent}, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            position: 'absolute',
            top: top + size * (typeof text === 'string' ? 1.1 : 2.05),
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            opacity: subP * (1 - outP),
            transform: `translateY(${(1 - subP) * 20}px)`,
          }}
        >
          <Label color={ink.text}>{sub}</Label>
        </div>
      )}
    </div>
  );
};
