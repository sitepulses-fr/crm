import { ThreeCanvas } from '@remotion/three';
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption } from '../components/Kinetic';
import { colors, fonts } from '../theme';
import { HEIGHT, WIDTH, sec, T } from '../timeline';
import { CameraRig, Dust, Effects } from '../three/common';
import { MapWorld } from '../three/MapWorld';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export type Business = {
  nom: string;
  note: number;
  avis: number;
  categorie: string;
  adresse: string;
  statut: string;
  horaire: string;
  distance: string;
};

// Phases (frames locales à la scène).
export const MAP_PHASE = {
  sheetUp: 50,
  expand: 116,
  gold: [128, 137, 146] as const,
  darkness: 176,
  out: 234,
};

const Stars: React.FC<{ note: number; size: number }> = ({ note, size }) => (
  <span style={{ display: 'inline-flex', gap: 2, verticalAlign: 'middle' }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const fill = Math.max(0, Math.min(1, note - i));
      return (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <defs>
            <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
              <stop offset={`${fill * 100}%`} stopColor={colors.star} />
              <stop offset={`${fill * 100}%`} stopColor="#5f6368" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
            fill={`url(#s${i}-${Math.round(fill * 100)})`}
          />
        </svg>
      );
    })}
  </span>
);

const Thumb: React.FC<{ seed: number }> = ({ seed }) => {
  const hue = [205, 25, 160, 260, 340, 45, 190, 120][seed % 8];
  return (
    <div
      style={{
        width: 132,
        height: 132,
        borderRadius: 22,
        flexShrink: 0,
        background: `linear-gradient(145deg, hsl(${hue} 35% 38%), hsl(${hue + 30} 40% 18%))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <svg width="86" height="86" viewBox="0 0 48 48">
        <path d="M6 24 L24 9 L42 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M11 22 V39 H37 V22" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.7)" strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="20" y="28" width="8" height="11" rx="1" fill="rgba(255,255,255,0.55)" />
      </svg>
    </div>
  );
};

const CARD_H = 176;
const CARD_GAP = 12;

const ResultCard: React.FC<{
  b: Business;
  index: number;
  gold: number;
  dim: number;
  appear: number;
}> = ({ b, index, gold, dim, appear }) => {
  const isTop = index < 3;
  return (
    <div
      style={{
        position: 'relative',
        height: CARD_H,
        marginBottom: CARD_GAP,
        borderRadius: 30,
        padding: '20px 28px 20px 44px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        background: gold > 0 ? `linear-gradient(120deg, rgba(245,196,81,${0.16 * gold}) 0%, rgba(42,43,46,1) 55%)` : '#2a2b2e',
        boxShadow: gold > 0
          ? `0 0 0 ${3 * gold}px ${colors.gold}, 0 0 ${70 * gold}px rgba(245,196,81,${0.55 * gold}), 0 20px 50px rgba(0,0,0,0.6)`
          : '0 10px 30px rgba(0,0,0,0.35)',
        transform: `translateY(${(1 - appear) * 120}px) scale(${1 + gold * 0.035 - dim * 0.04})`,
        opacity: appear,
        filter: dim > 0 ? `brightness(${1 - dim * 0.82}) blur(${dim * 7}px) saturate(${1 - dim * 0.8})` : undefined,
        zIndex: isTop ? 2 : 1,
      }}
    >
      {isTop && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: -26,
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${colors.goldLight}, ${colors.gold} 45%, ${colors.goldDeep})`,
            color: '#2b1d00',
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 30px rgba(245,196,81,0.9), 0 6px 14px rgba(0,0,0,0.5)`,
            transform: `scale(${gold}) rotate(${(1 - gold) * -90}deg)`,
            opacity: gold,
          }}
        >
          {index + 1}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, fontFamily: fonts.ui, color: colors.gText }}>
        <div style={{ fontSize: 40, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: gold > 0.5 ? '#fff' : colors.gText }}>
          {b.nom}
        </div>
        <div style={{ fontSize: 31, color: colors.gTextDim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: colors.gText }}>{b.note.toFixed(1).replace('.', ',')}</span>
          <Stars note={b.note} size={30} />
          <span>({b.avis})</span>
        </div>
        <div style={{ fontSize: 30, color: colors.gTextDim, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {b.categorie} · {b.distance} · {b.adresse}
        </div>
        <div style={{ fontSize: 30, marginTop: 4 }}>
          <span style={{ color: b.statut === 'Ouvert' ? colors.gGreen : colors.gRed, fontWeight: 500 }}>{b.statut}</span>
          <span style={{ color: colors.gTextDim }}> · {b.horaire}</span>
        </div>
      </div>
      <Thumb seed={index} />
    </div>
  );
};

/** Calcul des intensités communes (3D + HTML). */
function phases(frame: number) {
  const goldFor = (i: number) =>
    interpolate(frame, [MAP_PHASE.gold[i], MAP_PHASE.gold[i] + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  const dim = interpolate(frame, [MAP_PHASE.darkness, MAP_PHASE.darkness + 26], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const preDim = interpolate(frame, [MAP_PHASE.gold[0], MAP_PHASE.gold[0] + 20], [0, 0.35], clamp);
  return { goldFor, dim: Math.max(dim, preDim), fullDim: dim };
}

export const MapScene: React.FC<{
  query: string;
  ville: string;
  businesses: Business[];
  legendes: { texte: string; debut: number; fin: number; accent?: boolean }[];
  quality: string;
}> = ({ query, ville, businesses, legendes, quality }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { goldFor, dim, fullDim } = phases(frame);

  // Caméra : vue zénithale -> perspective inclinée, dérive lente (parallaxe), push final.
  const tiltIn = interpolate(frame, [0, 46], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const elev = interpolate(tiltIn, [0, 1], [88, 44]) * (Math.PI / 180);
  const azim = (interpolate(tiltIn, [0, 1], [-20, 10]) + interpolate(frame, [46, 250], [0, -16], clamp)) * (Math.PI / 180);
  const push = interpolate(frame, [MAP_PHASE.expand, MAP_PHASE.out + 18], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const dist = interpolate(tiltIn, [0, 1], [13, 6.4]) - push * 1.4;
  const target: [number, number, number] = [
    interpolate(push, [0, 1], [0, 0.1]),
    0,
    interpolate(frame, [MAP_PHASE.sheetUp - 6, MAP_PHASE.sheetUp + 26], [-1, 0.35], { ...clamp, easing: Easing.inOut(Easing.cubic) }) - push * 1.1,
  ];
  const cam: [number, number, number] = [
    target[0] + dist * Math.cos(elev) * Math.sin(azim),
    dist * Math.sin(elev),
    target[2] + dist * Math.cos(elev) * Math.cos(azim),
  ];

  // Feuille de résultats (bottom sheet).
  const up = spring({ frame: frame - MAP_PHASE.sheetUp, fps, config: { damping: 18, stiffness: 90 } });
  const expand = spring({ frame: frame - MAP_PHASE.expand, fps, config: { damping: 20, stiffness: 80 } });
  const sheetTop = HEIGHT + 40 - up * (HEIGHT + 40 - 860) - expand * (860 - 420);
  const sheetTilt = interpolate(frame, [MAP_PHASE.expand, MAP_PHASE.out], [0, 7], clamp);
  const listZoom = interpolate(frame, [MAP_PHASE.gold[0], MAP_PHASE.out + 18], [1, 1.05], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // Ombre qui avale le reste de la liste.
  const shadowRise = interpolate(frame, [MAP_PHASE.darkness, MAP_PHASE.darkness + 34], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const out = interpolate(frame, [MAP_PHASE.out, MAP_PHASE.out + 18], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const pillOut = interpolate(frame, [MAP_PHASE.expand - 10, MAP_PHASE.expand + 6], [0, 1], clamp);

  const sceneStart = T.map.from;
  const highlights = ['3', 'trois', 'premiers'];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black, overflow: 'hidden' }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={['#05070b']} />
        <fog attach="fog" args={['#05070b', 7, 17]} />
        <CameraRig position={cam} target={target} fov={38} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} color="#cfe0ff" />
        <pointLight position={[0, 1.2, -1]} intensity={6 * goldFor(0)} color={colors.gold} distance={4} />
        <MapWorld
          ville={ville}
          streets={businesses.map((b) => b.adresse.replace(/^\d+\s/, ''))}
          frame={frame}
          pinCount={Math.min(10, businesses.length + 2)}
          goldFor={goldFor}
          dim={dim}
          dark={Math.max(fullDim * 0.9, dim * 0.6)}
        />
        <Dust count={160} seed="map" spread={[8, 4, 8]} color="#ffd88a" size={0.025} opacity={0.25 + goldFor(0) * 0.4} />
        <Effects
          quality={quality}
          bloom={0.6 + goldFor(0) * 0.7}
          threshold={0.62}
          dof={quality === 'haute' ? { target: [0.05, 0.2, -1.2], focalLength: 0.04, bokehScale: 3 } : null}
          vignette={0.7 + dim * 0.25}
        />
      </ThreeCanvas>

      {/* Barre de recherche Maps */}
      <div
        style={{
          position: 'absolute',
          top: 172,
          left: 44,
          right: 44,
          height: 118,
          borderRadius: 59,
          background: colors.gSurface2,
          boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 36px',
          gap: 26,
          fontFamily: fonts.ui,
          fontSize: 44,
          color: colors.gText,
          opacity: interpolate(frame, [4, 18], [0, 1], clamp) * (1 - pillOut),
          transform: `translateY(${interpolate(frame, [4, 18], [-30, 0], clamp) - pillOut * 60}px)`,
        }}
      >
        <svg width="46" height="46" viewBox="0 0 24 24">
          <path d="M15 5l-7 7 7 7" fill="none" stroke={colors.gText} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ flex: 1 }}>{query}</span>
        <svg width="40" height="40" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6L6 18" stroke={colors.gTextDim} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>

      {/* Liste des résultats */}
      <AbsoluteFill style={{ perspective: 1800, perspectiveOrigin: '50% 30%' }}>
        <div
          style={{
            position: 'absolute',
            top: sheetTop,
            left: 0,
            right: 0,
            height: HEIGHT,
            borderRadius: '48px 48px 0 0',
            background: `rgba(24,25,28,${0.96 - expand * 0.4 - fullDim * 0.3})`,
            boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
            padding: '22px 40px 0',
            boxSizing: 'border-box',
            transformOrigin: '50% 0%',
            transform: `rotateX(${sheetTilt}deg) scale(${listZoom}) translateY(${out * 140}px)`,
            opacity: 1 - out,
          }}
        >
          <div style={{ width: 90, height: 10, borderRadius: 5, background: '#5f6368', margin: '0 auto 22px', opacity: 1 - fullDim }} />
          <div style={{ display: 'flex', gap: 16, marginBottom: 26, fontFamily: fonts.ui, fontSize: 30, color: colors.gText, opacity: 1 - fullDim }}>
            {['Ouvert maintenant', 'Les mieux notés', 'Avis'].map((c) => (
              <div key={c} style={{ padding: '14px 28px', borderRadius: 40, border: `2px solid ${colors.gBorder}`, whiteSpace: 'nowrap' }}>
                {c}
              </div>
            ))}
          </div>
          {businesses.map((b, i) => {
            const appear = spring({ frame: frame - MAP_PHASE.sheetUp - 6 - i * 3, fps, config: { damping: 16, stiffness: 110 } });
            return <ResultCard key={b.nom} b={b} index={i} gold={i < 3 ? goldFor(i) : 0} dim={i < 3 ? 0 : dim} appear={appear} />;
          })}
        </div>
        {/* Encre / ombre montante sous le top 3 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: interpolate(shadowRise, [0, 1], [HEIGHT, 420 + 120 + 3 * (CARD_H + CARD_GAP) + 10]),
            height: HEIGHT,
            background: 'linear-gradient(180deg, rgba(3,4,7,0) 0%, rgba(3,4,7,0.85) 14%, rgba(3,4,7,0.97) 40%)',
            opacity: 1 - out * 0.2,
          }}
        />
      </AbsoluteFill>

      {/* Voile sombre pour la lisibilité des légendes au-dessus de la carte */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 520,
          background: 'linear-gradient(180deg, rgba(3,4,7,0.92) 0%, rgba(3,4,7,0.75) 60%, rgba(3,4,7,0) 100%)',
          opacity: interpolate(frame, [MAP_PHASE.expand - 4, MAP_PHASE.expand + 10], [0, 1], clamp),
        }}
      />
      {legendes.map((l, i) => (
        <Caption
          key={i}
          text={l.texte}
          start={sec(l.debut) - sceneStart}
          end={sec(l.fin) - sceneStart}
          top={sec(l.debut) - sceneStart < MAP_PHASE.expand ? 330 : 205}
          accent={l.accent}
          highlights={highlights}
        />
      ))}

      {/* Fondu vers le noir */}
      <AbsoluteFill style={{ background: colors.black, opacity: out * 0.9 }} />
    </AbsoluteFill>
  );
};
