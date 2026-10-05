import { ThreeCanvas } from '@remotion/three';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../resolveConfig';
import { DURATION, HEIGHT, WIDTH } from '../timeline';
import { CameraRig, Effects } from '../three/common';
import { ink } from './timeline';

const COLS = 230;
const ROWS = 90;

// Vague périodique sur toute la durée de la vidéo : l'image 630 ≡ l'image 0 (boucle parfaite).
const TWO_PI = Math.PI * 2;
function waveY(x: number, z: number, phase: number) {
  return (
    0.55 * Math.sin(x * 0.42 + z * 0.18 + phase) +
    0.35 * Math.sin(x * 0.9 - z * 0.35 - phase * 2) +
    0.9 * Math.exp(-((x - 0.6) ** 2) / 6) * Math.sin(z * 0.5 + phase)
  );
}

/** Nuage de points ondulant, motif du site sitepulses.fr. */
const Points: React.FC<{ globalFrame: number }> = ({ globalFrame }) => {
  const { geometry, base } = useMemo(() => {
    const rand = seededRandom('wave');
    const n = COLS * ROWS;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const b = new Float32Array(n * 2);
    const white = new THREE.Color(ink.text);
    const blue = new THREE.Color(ink.accent);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        const x = (c / (COLS - 1) - 0.5) * 22 + (rand() - 0.5) * 0.06;
        const z = -(r / (ROWS - 1)) * 18 + 2 + (rand() - 0.5) * 0.06;
        b[i * 2] = x;
        b[i * 2 + 1] = z;
        const k = rand();
        const c3 = white.clone().lerp(blue, k > 0.7 ? 0.9 : k * 0.4);
        const bright = 0.35 + rand() * 0.65;
        col[i * 3] = c3.r * bright;
        col[i * 3 + 1] = c3.g * bright;
        col[i * 3 + 2] = c3.b * bright;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { geometry: g, base: b };
  }, []);

  const phase = (globalFrame / DURATION) * TWO_PI * 2;
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < COLS * ROWS; i++) {
    const x = base[i * 2];
    const z = base[i * 2 + 1];
    pos.setXYZ(i, x, waveY(x, z, phase), z);
  }
  pos.needsUpdate = true;

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.045} sizeAttenuation vertexColors transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

export const ParticleWave: React.FC<{ globalFrame: number; quality: string; opacity?: number }> = ({ globalFrame, quality, opacity = 1 }) => (
  <div style={{ position: 'absolute', inset: 0, opacity }}>
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={[ink.bg]} />
      <fog attach="fog" args={[ink.bg, 6, 19]} />
      <CameraRig position={[0, 2.4, 6.5]} target={[0, -0.6, -4]} fov={50} />
      <Points globalFrame={globalFrame} />
      <Effects quality={quality} bloom={0.6} threshold={0.35} vignette={0.7} />
    </ThreeCanvas>
  </div>
);
