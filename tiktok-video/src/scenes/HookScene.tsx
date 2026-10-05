import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { RevealWords } from '../components/Kinetic';
import { colors, fonts } from '../theme';
import { HEIGHT, WIDTH } from '../timeline';
import { CameraRig, Dust, Effects, Glow, StudioEnvironment } from '../three/common';
import { Phone } from '../three/Phone';
import { createSearchHomeTexture } from '../three/screenTexture';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Pose du smartphone / caméra à une frame donnée (réutilisée pour la boucle finale). */
export function hookPose(frame: number) {
  const p = interpolate(frame, [0, 64], [0, 1], clamp);
  // Démarrage lent puis accélération : la caméra « fonce » vers l'écran.
  const z = 5.4 - 4.1 * Math.pow(p, 2.6);
  const camY = interpolate(p, [0.25, 0.95], [0.46, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const rotY = interpolate(frame, [0, 54], [0.62, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const rotX = interpolate(frame, [0, 54], [-0.16, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const rotZ = interpolate(frame, [0, 54], [0.07, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const bob = Math.sin(frame / 14) * 0.025 * (1 - p);
  return { z, camY, rotY, rotX, rotZ, bob };
}

export const PhoneStage: React.FC<{ frame: number; quality: string; screenBoost?: number }> = ({ frame, quality, screenBoost = 1 }) => {
  const texture = useMemo(() => createSearchHomeTexture(), []);
  const { z, camY, rotY, rotX, rotZ, bob } = hookPose(frame);
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={[colors.black]} />
      <CameraRig position={[0, camY, z]} target={[0, camY, 0]} fov={35} />
      <StudioEnvironment />
      <ambientLight intensity={0.15} />
      <spotLight position={[3, 4, 4]} angle={0.5} penumbra={1} intensity={60} color="#ffffff" />
      <pointLight position={[-2.5, 1.5, -1.5]} intensity={25} color={colors.brandLight} />
      <pointLight position={[2.5, -1.5, -1]} intensity={18} color={colors.gold} />
      <group position={[0, bob, 0]} rotation={[rotX, rotY, rotZ]}>
        <Phone screen={texture} screenBoost={screenBoost} />
      </group>
      {/* Halo bleu derrière le téléphone */}
      <Glow color={colors.brand} size={7} opacity={0.35} position={[0, 0, -2.5]} />
      <Dust count={220} seed="hook" spread={[7, 9, 6]} />
      <Effects quality={quality} bloom={0.75 + (screenBoost - 1) * 0.6} threshold={0.6} />
    </ThreeCanvas>
  );
};

export const HookScene: React.FC<{ hook: string; highlights: string[]; quality: string }> = ({ hook, highlights, quality }) => {
  const frame = useCurrentFrame();
  // La lumière de l'écran monte au moment où la caméra le traverse.
  const boost = interpolate(frame, [50, 64], [1, 2.6], { ...clamp, easing: Easing.in(Easing.quad) });
  const flash = interpolate(frame, [56, 63, 72], [0, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      <PhoneStage frame={frame} quality={quality} screenBoost={boost} />
      <RevealWords
        text={hook}
        start={4}
        end={44}
        stagger={3}
        highlights={highlights}
        style={{
          position: 'absolute',
          top: 220,
          left: 80,
          right: 80,
          textAlign: 'center',
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.08,
          letterSpacing: -2.5,
          color: '#fff',
          textShadow: '0 10px 40px rgba(0,0,0,0.8)',
        }}
      />
      {/* Traversée de l'écran : flash lumineux */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${flash}) 0%, rgba(160,200,255,${flash * 0.9}) 45%, rgba(37,99,235,${flash * 0.6}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
