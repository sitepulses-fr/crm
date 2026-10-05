import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { Caption } from '../components/Kinetic';
import { Business } from '../scenes/MapScene';
import { fonts } from '../theme';
import { HEIGHT, WIDTH, sec } from '../timeline';
import { CameraRig, Effects } from '../three/common';
import { makeTextGeometry, textAdvance, useTypeface } from '../three/Text3D';
import { TM, ink } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Phases (frames locales).
export const RANK = {
  rowsStart: 6,
  stagger: 6,
  lit: [126, 135, 144] as const,
  offStart: 176,
  offStep: 5,
  out: 236,
};

const ROWS = 10;
const SPACING = 0.36;
const COL_W = 3.3;
const FOV = 30;

/** Frame à laquelle la ligne i s'éteint (du bas vers le haut). */
export const offFrame = (i: number) => RANK.offStart + (ROWS - 1 - i) * RANK.offStep;
export const rowFrame = (i: number) => RANK.rowsStart + i * RANK.stagger;

const accent = new THREE.Color(ink.accent);
const white = new THREE.Color(ink.text);

/** Extinction façon néon : deux clignotements, puis noir. */
function flicker(f: number) {
  if (f < 0) return 1;
  const seq = [0.15, 0.8, 0.1, 0.55, 0.05];
  return f < seq.length ? seq[Math.floor(f)] : 0.04;
}

type RowState = { appear: number; lit: number; on: number };

const Row: React.FC<{ font: Font; mono: Font; b: Business; index: number; y: number; state: RowState }> = ({ font, mono, b, index, y, state }) => {
  const parts = useMemo(() => {
    const num = makeTextGeometry(mono, String(index + 1).padStart(2, '0'), { size: 0.12, depth: 0.004, bevel: 0 });
    const nameText = b.nom;
    const avail = COL_W - 0.42 - 0.5;
    const nameScale = Math.min(1, avail / textAdvance(font, nameText, 0.17));
    const name = makeTextGeometry(font, nameText, { size: 0.17 * nameScale, depth: 0.004, bevel: 0 });
    const ratingText = b.note.toFixed(1).replace('.', ',');
    const rating = makeTextGeometry(mono, ratingText, { size: 0.12, depth: 0.004, bevel: 0 });
    return { num, name, rating, ratingW: textAdvance(mono, ratingText, 0.12) };
  }, [font, mono, b, index]);

  const mats = useMemo(
    () => ({
      num: new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }),
      name: new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }),
      bar: new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }),
    }),
    [],
  );

  const { appear, lit: g, on } = state;
  const lum = appear * on;
  // Bleu « sur-exposé » (> 1) pour déclencher le bloom uniquement sur le top 3.
  mats.name.color.copy(white).lerp(accent, g).multiplyScalar(1 + g * 0.6);
  mats.name.opacity = lum * (0.88 + g * 0.12);
  mats.num.color.copy(white).lerp(accent, g).multiplyScalar(1 + g * 1.2);
  mats.num.opacity = lum * (0.45 + g * 0.55);
  mats.bar.color.copy(white).lerp(accent, g).multiplyScalar(1 + g * 1.8);
  mats.bar.opacity = lum * (0.22 + g * 0.78);

  const slide = (1 - appear) * 0.35;
  const left = -COL_W / 2;
  return (
    <group position={[slide, y, g * 0.12]}>
      <mesh geometry={parts.num} material={mats.num} position={[left, 0.02, 0]} />
      <mesh geometry={parts.name} material={mats.name} position={[left + 0.42, 0.0, 0]} />
      <mesh geometry={parts.rating} material={mats.num} position={[COL_W / 2 - parts.ratingW, 0.02, 0]} />
      {/* Ligne de lumière sous chaque résultat (se déroule de gauche à droite). */}
      <mesh material={mats.bar} position={[left + (COL_W * appear) / 2, -0.07, 0]} scale={[COL_W * Math.max(0.001, appear), 0.008 + g * 0.01, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};

export const RankingScene: React.FC<{
  businesses: Business[];
  legendes: { texte: string; debut: number; fin: number; accent?: boolean }[];
  quality: string;
}> = ({ businesses, legendes, quality }) => {
  const frame = useCurrentFrame();
  const font = useTypeface('geist-600.typeface.json');
  const mono = useTypeface('geist-mono-500.typeface.json');
  const rows = businesses.slice(0, ROWS);
  const top = ((rows.length - 1) * SPACING) / 2;

  const states: RowState[] = rows.map((_, i) => ({
    appear: interpolate(frame, [rowFrame(i), rowFrame(i) + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }),
    lit: i < 3 ? interpolate(frame, [RANK.lit[i], RANK.lit[i] + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) }) : 0,
    on: i < 3 ? 1 : flicker(frame - offFrame(i)) * interpolate(frame, [RANK.lit[0], RANK.lit[0] + 12], [1, 0.55], clamp),
  }));

  // Caméra : légère vue de biais (profondeur), puis recentrage et push sur le top 3.
  const push = interpolate(frame, [RANK.lit[0] - 6, RANK.out + 16], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const yaw = (interpolate(frame, [0, RANK.lit[0]], [22, 9], { ...clamp, easing: Easing.out(Easing.quad) }) * (1 - push)) * (Math.PI / 180);
  const pitch = interpolate(frame, [0, 250], [6, 2]) * (Math.PI / 180);
  const dist = interpolate(frame, [0, 120], [14.2, 13], { ...clamp, easing: Easing.out(Easing.cubic) }) - push * 1.4;
  const target: [number, number, number] = [0, push * (top - SPACING), 0];
  const cam: [number, number, number] = [
    target[0] + dist * Math.sin(yaw) * Math.cos(pitch),
    target[1] + dist * Math.sin(pitch),
    dist * Math.cos(yaw) * Math.cos(pitch),
  ];
  const out = interpolate(frame, [RANK.out, RANK.out + 18], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const enter = interpolate(frame, [0, 10], [0, 1], clamp);
  const litGlow = interpolate(frame, [RANK.lit[0], RANK.lit[2] + 10], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: ink.bg, opacity: enter }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <color attach="background" args={[ink.bg]} />
        <CameraRig position={cam} target={target} fov={FOV} />
        {font &&
          mono &&
          rows.map((b, i) => <Row key={b.nom} font={font} mono={mono} b={b} index={i} y={top - i * SPACING} state={states[i]} />)}
        <Effects
          quality={quality}
          bloom={0.35 + litGlow * 0.45}
          threshold={0.95}
          vignette={0.6}
          dof={quality === 'haute' ? { target: [0, top - SPACING, 0], focalLength: 0.03, bokehScale: 2.5 } : null}
        />
      </ThreeCanvas>

      {legendes.map((l, i) => (
        <Caption
          key={i}
          text={l.texte}
          start={sec(l.debut) - TM.ranking.from}
          end={sec(l.fin) - TM.ranking.from}
          top={250}
          accent={l.accent}
          highlights={['3', 'trois', 'premiers']}
          fontFamily={fonts.brand}
          accentColor={ink.accent}
        />
      ))}
      <AbsoluteFill style={{ background: ink.bg, opacity: out }} />
    </AbsoluteFill>
  );
};
