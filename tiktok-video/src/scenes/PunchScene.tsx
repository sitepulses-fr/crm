import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { colors } from '../theme';
import { HEIGHT, WIDTH } from '../timeline';
import { CameraRig, Dust, Effects, StudioEnvironment } from '../three/common';
import { ExtrudedText, textAdvance, useTypeface } from '../three/Text3D';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const SIZE = 1;
const LINE_H = 1.28;

type Segment = { text: string; accent: boolean; x: number };

/** Découpe chaque ligne en segments (le mot-accent est rendu en or). */
function layoutLine(font: Font, line: string, accent: string): { segments: Segment[]; width: number } {
  const parts = accent ? line.split(accent) : [line];
  const segments: Segment[] = [];
  let x = 0;
  parts.forEach((p, i) => {
    if (p) {
      segments.push({ text: p, accent: false, x });
      x += textAdvance(font, p, SIZE);
    }
    if (i < parts.length - 1) {
      segments.push({ text: accent, accent: true, x });
      x += textAdvance(font, accent, SIZE);
    }
  });
  return { segments, width: x };
}

const PunchText: React.FC<{ font: Font; lines: string[]; accent: string; frame: number; minimal: boolean }> = ({ font, lines, accent, frame, minimal }) => {
  const { fps } = useVideoConfig();
  const mats = useMemo(
    () => ({
      // Variante minimale : faces blanc mat, flancs noirs. Seule la lumière dessine le volume.
      face: minimal
        ? new THREE.MeshStandardMaterial({ color: '#f2f2f0', metalness: 0, roughness: 0.55, envMapIntensity: 0.6 })
        : new THREE.MeshPhysicalMaterial({ color: '#f7f7fa', metalness: 0.35, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.3 }),
      side: minimal
        ? new THREE.MeshStandardMaterial({ color: '#050505', metalness: 0.6, roughness: 0.35, envMapIntensity: 0.9 })
        : new THREE.MeshPhysicalMaterial({ color: '#30343d', metalness: 1, roughness: 0.3, envMapIntensity: 1.6 }),
      goldFace: new THREE.MeshPhysicalMaterial({
        color: colors.gold,
        emissive: new THREE.Color(colors.goldDeep),
        emissiveIntensity: 0.9,
        metalness: 1,
        roughness: 0.18,
        clearcoat: 1,
        envMapIntensity: 2,
      }),
      goldSide: new THREE.MeshPhysicalMaterial({ color: '#b07a12', emissive: new THREE.Color('#4a2c00'), metalness: 1, roughness: 0.25, envMapIntensity: 2 }),
    }),
    [minimal],
  );
  const layouts = useMemo(() => lines.map((l) => layoutLine(font, l, accent)), [font, lines, accent]);
  const totalH = (lines.length - 1) * LINE_H;
  const goldPulse = 0.9 + 0.5 * Math.max(0, Math.sin((frame - 30) / 7));
  mats.goldFace.emissiveIntensity = goldPulse;

  return (
    <group>
      {layouts.map((lay, li) => {
        const s = spring({ frame: frame - 4 - li * 9, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
        const y = totalH / 2 - li * LINE_H - 0.36;
        return (
          <group key={li} position={[0, y + (1 - s) * -1.2, (1 - s) * 3]} rotation={[(1 - s) * -1.4, 0, 0]} scale={0.6 + s * 0.4}>
            {lay.segments.map((seg, si) => (
              <ExtrudedText
                key={si}
                font={font}
                text={seg.text}
                options={{ size: SIZE, depth: seg.accent ? 0.5 : 0.32, bevel: 0.03 }}
                face={seg.accent ? mats.goldFace : mats.face}
                side={seg.accent ? mats.goldSide : mats.side}
                position={[seg.x - lay.width / 2, 0, seg.accent ? 0.1 : 0]}
                scale={seg.accent ? 1 + 0.06 * goldPulse : 1}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
};

export const PunchScene: React.FC<{ lines: string[]; accent: string; quality: string; variant?: 'gold' | 'minimal' }> = ({
  lines: rawLines,
  accent,
  quality,
  variant = 'gold',
}) => {
  const minimal = variant === 'minimal';
  const lines = useMemo(() => (minimal ? rawLines.map((l) => l.toUpperCase()) : rawLines), [rawLines, minimal]);
  const frame = useCurrentFrame();
  const font = useTypeface('inter-900.typeface.json');

  const maxWidth = useMemo(
    () => (font ? Math.max(...lines.map((l) => textAdvance(font, l, SIZE))) : 8),
    [font, lines],
  );
  // Distance pour que la plus longue ligne occupe ~84 % de la largeur (fov 35°, ratio 9:16).
  const baseDist = maxWidth / (0.84 * 2 * Math.tan((35 / 2) * (Math.PI / 180)) * (WIDTH / HEIGHT));

  // Orbite de la caméra autour du texte.
  const orbit = interpolate(frame, [0, 134], minimal ? [-16, 10] : [-34, 22], { easing: Easing.inOut(Easing.sin) }) * (Math.PI / 180);
  const elev = interpolate(frame, [0, 134], minimal ? [-3, 4] : [-8, 10]) * (Math.PI / 180);
  const dolly = interpolate(frame, [0, 30, 134], [1.35, 1.08, 1.0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const exit = interpolate(frame, [112, 134], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const dist = baseDist * (dolly - exit * 0.55);
  const cam: [number, number, number] = [
    dist * Math.sin(orbit) * Math.cos(elev),
    dist * Math.sin(elev),
    dist * Math.cos(orbit) * Math.cos(elev),
  ];
  const shake = interpolate(frame, [4, 16], [0.06, 0], clamp) * Math.sin(frame * 2.3);
  const flash = interpolate(frame, [3, 6, 18], [0, minimal ? 0.25 : 0.55, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={[colors.black]} />
        <fog attach="fog" args={[colors.black, baseDist * 0.9, baseDist * 2.6]} />
        <CameraRig position={[cam[0] + shake, cam[1] + shake, cam[2]]} target={[0, -0.1, 0]} fov={35} roll={orbit * -0.08} />
        <StudioEnvironment warm={1} />
        <ambientLight intensity={0.2} />
        <spotLight position={[6, 8, 10]} angle={0.5} penumbra={1} intensity={500} color="#ffffff" />
        <pointLight position={[-8, -2, 4]} intensity={minimal ? 60 : 120} color={minimal ? '#ffffff' : colors.brandLight} />
        <pointLight position={[3, 1, 3]} intensity={60 + 40 * Math.sin(frame / 8)} color={colors.gold} />
        {font && <PunchText font={font} lines={lines} accent={accent} frame={frame} minimal={minimal} />}
        {/* Anneau lumineux en arrière-plan */}
        <mesh visible={!minimal} position={[0, 0, -4]} scale={1 + exit * 2}>
          <torusGeometry args={[baseDist * 0.24, 0.025, 16, 160]} />
          <meshBasicMaterial color={colors.gold} toneMapped={false} transparent opacity={0.55 * interpolate(frame, [8, 30], [0, 1], clamp)} />
        </mesh>
        {!minimal && <Dust count={300} seed="punch" spread={[baseDist, baseDist * 1.6, baseDist]} color={colors.goldLight} size={0.05} opacity={0.5} />}
        <Effects quality={quality} bloom={minimal ? 0.45 : 1.1} threshold={minimal ? 0.92 : 0.5} vignette={0.85} />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: `radial-gradient(circle, rgba(255,231,163,${flash}) 0%, rgba(245,196,81,${flash * 0.4}) 50%, transparent 80%)` }} />
    </AbsoluteFill>
  );
};
