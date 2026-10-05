import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { colors, fonts } from '../theme';
import { HEIGHT, WIDTH } from '../timeline';
import { CameraRig, Dust, Effects, Glow, StudioEnvironment } from '../three/common';
import { Logo3D } from '../three/Logo3D';
import { ExtrudedText, useTypeface } from '../three/Text3D';
import { PhoneStage } from './HookScene';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Caméra fixe (z = 10, fov 35°) : 1 unité ≈ 304,6 px. Conversion pixel -> monde.
const UNIT = HEIGHT / (2 * 10 * Math.tan((35 / 2) * (Math.PI / 180)));
const yWorld = (px: number) => (HEIGHT / 2 - px) / UNIT;

export const LOOP_START = 94; // frames locales : retour au plan d'ouverture

export const CtaScene: React.FC<{
  brand: { nom: string; bleu: string; accroche: string };
  cta: string;
  ctaSuite: string;
  motCle: string;
  quality: string;
}> = ({ brand, cta, ctaSuite, motCle, quality }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const font = useTypeface('inter-900.typeface.json');

  const logoIn = spring({ frame: frame - 2, fps, config: { damping: 12, stiffness: 70, mass: 1 } });
  const wordIn = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 90 } });
  const draw = interpolate(frame, [10, 30], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // Battements « pulse » : double pulsation à intervalles réguliers.
  const beat = (f: number) => Math.exp(-Math.max(0, f) / 4) * (f >= 0 ? 1 : 0);
  const pulse = Math.max(beat(frame - 30), beat(frame - 37) * 0.7, beat(frame - 62), beat(frame - 69) * 0.7);

  const loop = interpolate(frame, [LOOP_START, 124], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ctaIn = (delay: number) => interpolate(frame, [delay, delay + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  const word = useMemo(
    () => ({
      face: new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.3, roughness: 0.2, clearcoat: 1, envMapIntensity: 1.2 }),
      side: new THREE.MeshPhysicalMaterial({ color: brand.bleu, metalness: 0.8, roughness: 0.3, envMapIntensity: 1.5 }),
    }),
    [brand.bleu],
  );

  // Champ de commentaire : on « tape » le mot-clé.
  const typed = Math.max(0, Math.min(motCle.length, Math.floor((frame - 44) / 3)));
  const sent = interpolate(frame, [44 + motCle.length * 3 + 8, 44 + motCle.length * 3 + 16], [0, 1], clamp);
  const [ctaBefore, ctaAfter] = cta.split(motCle);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      <AbsoluteFill style={{ opacity: 1 - loop }}>
        <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
          <color attach="background" args={['#04060c']} />
          <CameraRig position={[Math.sin(frame / 40) * 0.5, 0, 10]} target={[Math.sin(frame / 40) * 0.15, 0, 0]} fov={35} />
          <StudioEnvironment warm={0.6} />
          <ambientLight intensity={0.25} />
          <spotLight position={[4, 6, 8]} angle={0.6} penumbra={1} intensity={260} />
          <pointLight position={[-4, 2, 2]} intensity={60} color={colors.brandLight} />
          <Logo3D
            brand={brand.bleu}
            pulse={pulse}
            draw={draw}
            position={[0, yWorld(470) + (1 - logoIn) * -3, (1 - logoIn) * -6]}
            rotation={[0.12 * Math.sin(frame / 22), (1 - logoIn) * Math.PI * 2.2 + Math.sin(frame / 18) * 0.18, 0]}
            scale={1.3 * (1 + pulse * 0.05)}
          />
          {font && (
            <ExtrudedText
              font={font}
              text={brand.nom}
              align="center"
              options={{ size: 0.4, depth: 0.14, bevel: 0.012 }}
              face={word.face}
              side={word.side}
              position={[0, yWorld(805) + (1 - wordIn) * -0.6, (1 - wordIn) * -2]}
              rotation={[(1 - wordIn) * -1.2, Math.sin(frame / 30) * 0.08, 0]}
            />
          )}
          {/* Halo bleu derrière le logo */}
          <Glow color={brand.bleu} size={9} opacity={0.4 + pulse * 0.3} position={[0, yWorld(480), -3]} />
          <Dust count={220} seed="cta" spread={[10, 14, 6]} color="#a8c4ff" size={0.035} opacity={0.45} />
          <Effects quality={quality} bloom={0.9 + pulse * 0.8} threshold={0.6} vignette={0.8} />
        </ThreeCanvas>

        {/* Accroche marque */}
        <div
          style={{
            position: 'absolute',
            top: 860,
            width: '100%',
            textAlign: 'center',
            fontFamily: fonts.display,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: '#9fb4d9',
            opacity: ctaIn(22),
          }}
        >
          {brand.accroche}
        </div>

        {/* Appel à l'action */}
        <div style={{ position: 'absolute', top: 960, left: 60, right: 60, textAlign: 'center', fontFamily: fonts.display, color: '#fff' }}>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              letterSpacing: -2,
              opacity: ctaIn(30),
              transform: `translateY(${(1 - ctaIn(30)) * 40}px)`,
            }}
          >
            {ctaBefore}
            <span
              style={{
                display: 'inline-block',
                padding: '2px 26px 8px',
                margin: '0 6px',
                borderRadius: 22,
                color: '#241800',
                background: `linear-gradient(135deg, ${colors.goldLight}, ${colors.gold} 50%, ${colors.goldDeep})`,
                boxShadow: `0 0 ${40 + pulse * 40}px rgba(245,196,81,0.7)`,
                transform: `scale(${1 + pulse * 0.06})`,
              }}
            >
              {motCle}
            </span>
            {ctaAfter}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 60,
              fontWeight: 700,
              letterSpacing: -1,
              color: '#e6ecf7',
              opacity: ctaIn(38),
              transform: `translateY(${(1 - ctaIn(38)) * 40}px)`,
            }}
          >
            {ctaSuite}
          </div>
        </div>

        {/* Champ de commentaire façon TikTok */}
        <div
          style={{
            position: 'absolute',
            top: 1290,
            left: 90,
            right: 90,
            height: 112,
            borderRadius: 56,
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px 0 44px',
            gap: 20,
            fontFamily: fonts.display,
            opacity: ctaIn(40),
            transform: `translateY(${(1 - ctaIn(40)) * 40}px) scale(${1 - sent * 0.03})`,
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24">
            <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div style={{ flex: 1, fontSize: 46, fontWeight: 700, color: typed ? '#fff' : 'rgba(255,255,255,0.5)' }}>
            {typed ? motCle.slice(0, typed) : 'Ajouter un commentaire…'}
            {typed > 0 && typed < motCle.length && <span style={{ color: colors.gold }}>|</span>}
          </div>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: sent > 0 ? colors.gold : '#fe2c55',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${1 + Math.sin(sent * Math.PI) * 0.25})`,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24">
              {sent > 0.5 ? (
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#241800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
        </div>
      </AbsoluteFill>

      {/* Boucle : on revient exactement sur le plan d'ouverture. */}
      {frame >= LOOP_START - 2 && (
        <AbsoluteFill style={{ opacity: loop }}>
          <PhoneStage frame={0} quality={quality} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
