import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring } from 'remotion';
import { ink } from '../../minimal/timeline';
import { fonts } from '../../theme';
import { useTimeline } from '../engine/timeline';
import { BAND_TOP, Card, CommentCta as CommentCtaBase, Label, PhoneIcon, useLife as useLifeBase } from '../engine/ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Les apparitions évitent toujours le visage : bande du haut (ciel / arbres) sur les
// plans larges, bande du torse sur les plans rapprochés (à partir de 18,7 s du rush).
const CLOSE_TOP = 860;
const bandFor = (srcTime: number) => (srcTime >= 18.7 ? CLOSE_TOP : BAND_TOP);
const useLife = (a: number, b: number) => useLifeBase(a, b, bandFor);

// 1. « STOP » qui claque à l'écran.
const Stop: React.FC = () => {
  const { visible, local, outP, top } = useLife(0.55, 2.2);
  if (!visible) return null;
  const slam = interpolate(local, [0, 5], [2.6, 1], { ...clamp, easing: Easing.out(Easing.exp) });
  const sub = interpolate(local, [12, 22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 230,
          width: '100%',
          textAlign: 'center',
          fontFamily: fonts.brand,
          fontWeight: 700,
          fontSize: 300,
          letterSpacing: -16,
          color: '#fff',
          transform: `scale(${slam}) translateY(${outP * -60}px)`,
          opacity: interpolate(local, [0, 2], [0, 1], clamp) * (1 - outP),
          textShadow: `0 0 60px ${ink.accent}, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        STOP<span style={{ color: ink.accent }}>.</span>
      </div>
      <div style={{ position: 'absolute', top: 560, width: '100%', display: 'flex', justifyContent: 'center', opacity: sub * (1 - outP), transform: `translateY(${(1 - sub) * 20}px)` }}>
        <Label color={ink.text}>Si t'es artisan</Label>
      </div>
    </AbsoluteFill>
  );
};

// 2. Signature de marque (présentation).
const Brand: React.FC = () => {
  const { visible, inP, outP, top } = useLife(2.6, 6.95);
  if (!visible) return null;
  return (
    <Card top={top} inP={inP} outP={outP} width={720}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <span style={{ width: 34, height: 34, borderRadius: 17, background: ink.accent, boxShadow: `0 0 30px ${ink.accent}` }} />
        <span style={{ fontSize: 76, fontWeight: 600, letterSpacing: -3 }}>SitePulse</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <Label>Agence web · Jura</Label>
      </div>
    </Card>
  );
};

const Person: React.FC<{ on: boolean; size: number }> = ({ on, size }) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 20 26">
    <circle cx="10" cy="6" r="5" fill={on ? ink.accent : 'rgba(255,255,255,0.18)'} />
    <path d="M1 26 C1 16 19 16 19 26 Z" fill={on ? ink.accent : 'rgba(255,255,255,0.18)'} />
  </svg>
);

// 3. « Un artisan sur deux ».
const OneInTwo: React.FC = () => {
  const { visible, local, inP, outP, top } = useLife(8.0, 9.1);
  if (!visible) return null;
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>
          1<span style={{ color: ink.accent }}>/</span>2
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ opacity: interpolate(local, [i * 1.2, i * 1.2 + 5], [0, 1], clamp) }}>
              <Person on={i % 2 === 1 && local > 14} size={44} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <Label>Artisans sans site internet</Label>
      </div>
    </Card>
  );
};

// 4. Fenêtre de navigateur vide : pas de site.
const NoSite: React.FC = () => {
  const { visible, local, inP, outP, top } = useLife(9.1, 10.6);
  if (!visible) return null;
  const strike = interpolate(local, [10, 18], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <Card top={top} inP={inP} outP={outP} width={760}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <div style={{ flex: 1, marginLeft: 16, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.08)', fontFamily: fonts.mono, fontSize: 20, color: ink.dim, padding: '3px 18px' }}>
          www.ton-entreprise.fr
        </div>
      </div>
      <div style={{ position: 'relative', textAlign: 'center', padding: '10px 0 6px' }}>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>
          Site introuvable
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '52%',
            height: 10,
            width: `${strike * 100}%`,
            borderRadius: 5,
            background: '#ff4d5a',
            boxShadow: '0 0 20px #ff4d5a',
          }}
        />
      </div>
    </Card>
  );
};

// 5. Avis Google : 40-50 avis, note excellente.
const Reviews: React.FC = () => {
  const { visible, local, inP, outP, top } = useLife(11.0, 13.75);
  if (!visible) return null;
  const count = Math.round(interpolate(local, [4, 26], [0, 47], { ...clamp, easing: Easing.out(Easing.cubic) }));
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>4,9</div>
        <div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const s = spring({ frame: local - 6 - i * 3, fps: 30, config: { damping: 9, stiffness: 220 } });
              return (
                <svg key={i} width="66" height="66" viewBox="0 0 24 24" style={{ transform: `scale(${s})` }}>
                  <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#fbbc04" />
                </svg>
              );
            })}
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, marginTop: 8 }}>
            {count} avis Google
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Label>Travail excellent… mais invisible</Label>
      </div>
    </Card>
  );
};

// 6. Le concurrent décroche l'appel.
const Competitor: React.FC = () => {
  const { outFrame } = useTimeline();
  const { visible, local, inP, outP, frame, top } = useLife(13.8, 17.95);
  if (!visible) return null;
  const answered = frame >= outFrame(16.8);
  const ringing = !answered && local > 20;
  const swap = interpolate(frame, [outFrame(16.8), outFrame(16.8) + 6], [0, 1], clamp);
  const box = (title: string, sub: string, hl: boolean, children?: React.ReactNode) => (
    <div
      style={{
        flex: 1,
        borderRadius: 30,
        padding: '26px 26px',
        background: hl ? `${ink.accent}26` : 'rgba(255,255,255,0.05)',
        border: `2px solid ${hl ? ink.accent : 'rgba(255,255,255,0.1)'}`,
        boxShadow: hl ? `0 0 50px ${ink.accent}55` : 'none',
        opacity: hl ? 1 : 0.55,
      }}
    >
      <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 4, color: ink.dim, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: 46, fontWeight: 600, marginTop: 8, letterSpacing: -1.5 }}>{sub}</div>
      {children}
    </div>
  );
  return (
    <Card top={top} inP={inP} outP={outP} width={940}>
      <div style={{ display: 'flex', gap: 22 }}>
        {box('Toi', 'Pas de site', false)}
        {box(
          'Ton concurrent',
          'A un site',
          true,
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: answered ? '#22c55e' : ink.accent,
                boxShadow: `0 0 ${ringing ? 20 + 20 * Math.abs(Math.sin(local / 3)) : 30}px ${answered ? '#22c55e' : ink.accent}`,
              }}
            >
              <PhoneIcon color="#fff" size={40} ring={ringing ? local * 1.6 : 0} />
            </div>
            <div style={{ fontSize: 34, fontWeight: 600 }}>{answered ? 'Appel décroché' : 'Appel entrant…'}</div>
          </div>,
        )}
      </div>
      <div style={{ marginTop: 18, opacity: swap }}>
        <Label color={ink.text}>Le client part chez lui</Label>
      </div>
    </Card>
  );
};

// 7. Le Jura.
const Jura: React.FC = () => {
  const { visible, local, inP, outP, top } = useLife(19.6, 21.45);
  if (!visible) return null;
  return (
    <Card top={top} inP={inP} outP={outP} width={720}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          {[0, 1].map((k) => {
            const p = ((local + k * 12) % 24) / 24;
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `3px solid ${ink.accent}`,
                  transform: `scale(${0.3 + p})`,
                  opacity: 1 - p,
                }}
              />
            );
          })}
          <div style={{ position: 'absolute', left: 42, top: 42, width: 36, height: 36, borderRadius: 18, background: ink.accent, boxShadow: `0 0 30px ${ink.accent}` }} />
        </div>
        <div>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: -5, lineHeight: 1 }}>Jura</div>
          <div style={{ marginTop: 8 }}>
            <Label>Artisans accompagnés</Label>
          </div>
        </div>
      </div>
    </Card>
  );
};

// 8. Courbe des demandes de devis (sans chiffre inventé : seulement la tendance).
const Growth: React.FC = () => {
  const { outFrame } = useTimeline();
  const { visible, frame, inP, outP, top } = useLife(22.5, 26.05);
  if (!visible) return null;
  const launch = outFrame(24.8);
  const bars = [0.22, 0.26, 0.2, 0.28, 0.55, 0.78, 0.92, 1];
  return (
    <Card top={top} inP={inP} outP={outP}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -2 }}>Demandes de devis</div>
        <svg width="70" height="70" viewBox="0 0 24 24" style={{ opacity: interpolate(frame, [launch + 6, launch + 12], [0, 1], clamp) }}>
          <path d="M4 17l6-6 4 4 6-7M14 8h6v6" fill="none" stroke={ink.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 200, marginTop: 24, position: 'relative' }}>
        {bars.map((h, i) => {
          const after = i >= 4;
          const start = after ? launch + (i - 4) * 4 : outFrame(22.5) + 4 + i * 3;
          const g = interpolate(frame, [start, start + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100 * g}%`,
                borderRadius: 14,
                background: after ? `linear-gradient(180deg, #8fa5ff, ${ink.accent})` : 'rgba(255,255,255,0.18)',
                boxShadow: after ? `0 0 30px ${ink.accent}88` : 'none',
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '48.5%',
            top: -10,
            bottom: 0,
            width: 3,
            background: ink.text,
            opacity: interpolate(frame, [launch - 4, launch], [0, 0.8], clamp),
          }}
        />
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', opacity: interpolate(frame, [launch - 4, launch + 4], [0, 1], clamp) }}>
        <Label color={ink.text}>Mise en ligne du site</Label>
      </div>
    </Card>
  );
};

// 9. « Ton entreprise » : un site qui se construit.
const Preview: React.FC = () => {
  const { visible, local, inP, outP, top } = useLife(27.9, 29.85);
  if (!visible) return null;
  const blk = (i: number) => interpolate(local, [4 + i * 4, 12 + i * 4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <Card top={top} inP={inP} outP={outP} width={760}>
      <Label>Ton entreprise · en ligne</Label>
      <div style={{ marginTop: 20, borderRadius: 24, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.12)' }}>
        <div style={{ height: 150, background: `linear-gradient(135deg, ${ink.accent}, #1e2a6e)`, opacity: blk(0), padding: 26, boxSizing: 'border-box' }}>
          <div style={{ width: '62%', height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.9)', transform: `scaleX(${blk(1)})`, transformOrigin: 'left' }} />
          <div style={{ marginTop: 14, width: '40%', height: 18, borderRadius: 6, background: 'rgba(255,255,255,0.55)', transform: `scaleX(${blk(2)})`, transformOrigin: 'left' }} />
          <div style={{ marginTop: 18, width: 170, height: 40, borderRadius: 20, background: '#fff', opacity: blk(3) }} />
        </div>
        <div style={{ display: 'flex', gap: 14, padding: 18, background: 'rgba(255,255,255,0.04)' }}>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{ flex: 1, height: 80, borderRadius: 14, background: 'rgba(255,255,255,0.1)', opacity: blk(3 + k) }} />
          ))}
        </div>
      </div>
    </Card>
  );
};

// 10. CTA : commentaire « VISUEL » + délai 48 h.
const CommentCta: React.FC = () => (
  <CommentCtaBase word="VISUEL" from={29.85} to={33.65} typeAt={30.25} badgeAt={32.8} badge="Réponse sous 48 h" />
);

export const Overlays: React.FC = () => (
  <AbsoluteFill>
    <Stop />
    <Brand />
    <OneInTwo />
    <NoSite />
    <Reviews />
    <Competitor />
    <Jura />
    <Growth />
    <Preview />
    <CommentCta />
  </AbsoluteFill>
);

