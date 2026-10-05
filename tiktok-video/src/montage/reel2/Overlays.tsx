import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring } from 'remotion';
import { ink } from '../../minimal/timeline';
import { fonts } from '../../theme';
import { useTimeline } from '../engine/timeline';
import { Card, CommentCta, Label, PhoneIcon, Slam, useLife } from '../engine/ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Stars: React.FC<{ n: number; size: number; on?: boolean }> = ({ n, size, on = true }) => (
  <span style={{ display: 'inline-flex', gap: 3 }}>
    {Array.from({ length: n }, (_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={on ? '#fbbc04' : 'rgba(255,255,255,0.25)'} />
      </svg>
    ))}
  </span>
);

// 1. « Il regarde deux, trois fiches Google, pas plus. »
const SearchFiches: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(0.9, 4.55);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const q = 'couvreur';
  const typed = Math.min(q.length, Math.max(0, Math.floor((frame - outFrame(1.0)) / 2)));
  const lit = [3.14, 3.34, 3.6].map((t) => interpolate(frame, [outFrame(t), outFrame(t) + 5], [0, 1], clamp));
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 26px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 40 }}>
        <svg width="36" height="36" viewBox="0 0 24 24">
          <circle cx="10" cy="10" r="6.5" fill="none" stroke={ink.dim} strokeWidth="2.4" />
          <line x1="15" y1="15" x2="21" y2="21" stroke={ink.dim} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        <span>{q.slice(0, typed)}</span>
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const on = lit[i];
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '10px 20px',
                borderRadius: 18,
                background: on ? `rgba(93,123,255,${0.18 * on})` : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${on > 0.5 ? ink.accent : 'rgba(255,255,255,0.06)'}`,
                opacity: 0.45 + on * 0.55,
                transform: `scale(${1 + on * 0.02})`,
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 24, color: on ? ink.accent : ink.dim }}>0{i + 1}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.3)', maxWidth: 300 - i * 30 }} />
              <Stars n={5} size={26} />
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// 2. « En huit secondes, il choisit… »
const EightSeconds: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(4.62, 6.98);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const a = outFrame(4.8);
  const b = outFrame(6.88);
  const p = interpolate(frame, [a, b], [0, 1], clamp);
  const sec = Math.max(0, Math.ceil(8 * (1 - p)));
  const R = 70;
  const C = 2 * Math.PI * R;
  return (
    <Card top={top} inP={inP} outP={outP} width={760}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
          <circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke={ink.accent}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * p}
            transform="rotate(-90 90 90)"
            style={{ filter: `drop-shadow(0 0 10px ${ink.accent})` }}
          />
          <text x="90" y="108" textAnchor="middle" fontFamily="Geist" fontWeight="700" fontSize="64" fill="#fff">
            {sec}s
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2.5, lineHeight: 1 }}>8 secondes</div>
          <div style={{ marginTop: 14 }}>
            <Label>Pour avoir l'air sérieux</Label>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 3. « Pas forcément le meilleur artisan, mais celui qu'on trouve le mieux. »
const BestVsFound: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(7.3, 9.82);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const r1 = interpolate(frame, [outFrame(7.84), outFrame(7.84) + 6], [0, 1], clamp);
  const strike = interpolate(frame, [outFrame(8.68), outFrame(8.68) + 6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const r2 = spring({ frame: frame - outFrame(8.98), fps: 30, config: { damping: 12, stiffness: 200 } });
  const row = (text: string, sub: string, hl: boolean, o: number, s = 1) => (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 28px',
        borderRadius: 26,
        background: hl ? `${ink.accent}2a` : 'rgba(255,255,255,0.05)',
        border: `2px solid ${hl ? ink.accent : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hl ? `0 0 50px ${ink.accent}55` : 'none',
        opacity: o,
        transform: `scale(${s})`,
      }}
    >
      <div>
        <div style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 4, color: ink.dim, textTransform: 'uppercase' }}>{sub}</div>
        <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: -2, marginTop: 4 }}>{text}</div>
      </div>
      {hl && (
        <svg width="56" height="56" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill={ink.accent} />
          <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ position: 'relative' }}>
          {row('Le meilleur artisan', 'Pas forcément', false, 0.4 + r1 * 0.4)}
          <div style={{ position: 'absolute', left: 24, top: '58%', height: 6, width: `${strike * 70}%`, borderRadius: 3, background: '#ff4d5a' }} />
        </div>
        {row('Celui qu’on trouve', 'Celui qui gagne', true, Math.min(1, r2 * 1.5), 0.85 + r2 * 0.15)}
      </div>
    </Card>
  );
};

// 4b. « … c'est juste celui qui a un site internet. »
const HisSite: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(15.0, 16.54);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const ok = spring({ frame: frame - outFrame(15.72), fps: 30, config: { damping: 10, stiffness: 220 } });
  return (
    <Card top={top} inP={inP} outP={outP} width={780}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <div style={{ flex: 1, marginLeft: 16, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.08)', fontFamily: fonts.mono, fontSize: 20, color: ink.dim, padding: '3px 18px' }}>
          www.ton-concurrent.fr
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Label>Ton concurrent</Label>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3.5, marginTop: 6 }}>Il a un site.</div>
        </div>
        <div style={{ width: 92, height: 92, borderRadius: 46, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${ok})`, boxShadow: '0 0 40px #22c55e88' }}>
          <svg width="50" height="50" viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Card>
  );
};

// 5. « J'ai un couvreur à qui on a installé un site il y a deux mois. »
const ClientCase: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(17.76, 20.85);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const blk = (t: number) => interpolate(frame, [outFrame(t), outFrame(t) + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const months = spring({ frame: frame - outFrame(20.34), fps: 30, config: { damping: 11, stiffness: 200 } });
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Label>Client SitePulse</Label>
          <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -3.5, marginTop: 6, lineHeight: 1 }}>Couvreur</div>
        </div>
        <div
          style={{
            padding: '16px 24px',
            borderRadius: 24,
            background: ink.accent,
            textAlign: 'center',
            transform: `scale(${months})`,
            boxShadow: `0 0 40px ${ink.accent}88`,
          }}
        >
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1 }}>2 mois</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 20, letterSpacing: 3, marginTop: 6 }}>EN LIGNE</div>
        </div>
      </div>
      <div style={{ marginTop: 22, borderRadius: 20, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.12)', opacity: blk(18.7) }}>
        <div style={{ height: 96, background: `linear-gradient(135deg, ${ink.accent}, #1e2a6e)`, padding: 20, boxSizing: 'border-box' }}>
          <div style={{ width: '55%', height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.9)', transform: `scaleX(${blk(18.9)})`, transformOrigin: 'left' }} />
          <div style={{ marginTop: 12, width: '34%', height: 14, borderRadius: 5, background: 'rgba(255,255,255,0.55)', transform: `scaleX(${blk(19.1)})`, transformOrigin: 'left' }} />
        </div>
      </div>
    </Card>
  );
};

// 6. « Au bout de la deuxième semaine, il a eu quatre rappels en plus. »
const Calls: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(20.96, 24.94);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const week = interpolate(frame, [outFrame(22.84), outFrame(22.84) + 8], [0, 1], clamp);
  const t4 = outFrame(24.12);
  const n = Math.min(4, Math.max(0, Math.floor((frame - t4) / 3) + 1));
  return (
    <Card top={top} inP={inP} outP={outP}>
      <Label>Résultats concrets</Label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>
          +{n}
          <span style={{ fontSize: 56, letterSpacing: -2, marginLeft: 14, color: ink.dim }}>rappels</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => {
            const s = spring({ frame: frame - t4 - i * 3, fps: 30, config: { damping: 9, stiffness: 240 } });
            return (
              <div key={i} style={{ width: 70, height: 70, borderRadius: 35, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})`, boxShadow: '0 0 24px #22c55e88' }}>
                <PhoneIcon color="#fff" size={38} ring={frame * 0.9 + i} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 12, opacity: week, display: 'inline-flex', padding: '8px 20px', borderRadius: 999, border: `1.5px solid ${ink.accent}`, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 4 }}>
        DÈS LA 2ᵉ SEMAINE
      </div>
    </Card>
  );
};

// 7. « Combien ça coûte de ne pas avoir de site internet en 2026 ? »
const Cost: React.FC = () => {
  const { visible, frame, inP, outP, top } = useLife(26.68, 30.2);
  const { outFrame } = useTimeline();
  if (!visible) return null;
  const year = spring({ frame: frame - outFrame(29.38), fps: 30, config: { damping: 9, stiffness: 220 } });
  // Montant volontairement inconnu (« ??? € ») : aucun chiffre inventé.
  const blink = (i: number) => 0.55 + 0.45 * Math.abs(Math.sin(frame / 5 + i));
  return (
    <Card top={top} inP={inP} outP={outP}>
      <Label>Ne pas avoir de site, ça coûte</Label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: fonts.mono, fontSize: 120, fontWeight: 500, letterSpacing: -4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ opacity: blink(i) }}>
              ?
            </span>
          ))}
          <span style={{ color: ink.accent, marginLeft: 16, fontFamily: fonts.brand, fontWeight: 700 }}>€</span>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'inline-flex',
          padding: '10px 26px',
          borderRadius: 999,
          background: ink.text,
          color: ink.bg,
          fontSize: 54,
          fontWeight: 700,
          letterSpacing: -2,
          transform: `scale(${year})`,
          transformOrigin: 'left center',
        }}
      >
        en 2026
      </div>
    </Card>
  );
};

export const Overlays: React.FC = () => (
  <AbsoluteFill>
    <SearchFiches />
    <EightSeconds />
    <BestVsFound />
    <Slam from={12.12} to={14.84} text={<>Ton pire<br />ennemi<span style={{ color: ink.accent }}>.</span></>} sub="N'est pas celui qui bosse mieux" size={190} top={215} />
    <HisSite />
    <ClientCase />
    <Calls />
    <Cost />
    <CommentCta word="SCORE" from={30.25} to={33.93} typeAt={30.62} badgeAt={32.1} badge="Diagnostic gratuit · 2 min" />
  </AbsoluteFill>
);
