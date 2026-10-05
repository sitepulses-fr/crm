import { Environment, Lightformer } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { continueRender, delayRender, useCurrentFrame } from 'remotion';
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../resolveConfig';

type Vec3 = [number, number, number];

/** Pilote la caméra de façon déterministe à chaque frame (pas d'horloge interne). */
export const CameraRig: React.FC<{ position: Vec3; target: Vec3; fov?: number; roll?: number }> = ({
  position,
  target,
  fov = 35,
  roll = 0,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...target);
    if (camera.fov !== fov) {
      camera.fov = fov;
    }
    camera.near = 0.05;
    camera.far = 200;
    camera.updateProjectionMatrix();
  });
  return null;
};

/** Éclairage studio procédural (aucun HDR téléchargé) pour des reflets métalliques premium. */
export const StudioEnvironment: React.FC<{ warm?: number }> = ({ warm = 0.4 }) => (
  <Environment resolution={256} frames={1}>
    <color attach="background" args={['#000000']} />
    <Lightformer form="rect" intensity={3} position={[0, 4, -6]} scale={[10, 3, 1]} color="#ffffff" />
    <Lightformer form="rect" intensity={2.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} color="#9ec5ff" />
    <Lightformer form="rect" intensity={2.2 * warm + 0.6} position={[5, 0.5, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.5, 1]} color={warm > 0 ? '#ffd48a' : '#ffffff'} />
    <Lightformer form="ring" intensity={1.5} position={[0, -3, 4]} scale={4} color="#ffffff" />
  </Environment>
);

/** Particules de poussière en suspension : profondeur + parallaxe. */
export const Dust: React.FC<{ count?: number; spread?: Vec3; color?: string; size?: number; seed?: string; opacity?: number }> = ({
  count = 260,
  spread = [8, 12, 10],
  color = '#9db8ff',
  size = 0.02,
  seed = 'dust',
  opacity = 0.6,
}) => {
  const geometry = useMemo(() => {
    const rand = seededRandom(seed);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * spread[0];
      pos[i * 3 + 1] = (rand() - 0.5) * spread[1];
      pos[i * 3 + 2] = (rand() - 0.5) * spread[2] - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, spread, seed]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/**
 * Le composer de post-traitement n'est prêt qu'après le premier rendu R3F :
 * sur les premières frames suivant le montage, on force un second rendu
 * avant de laisser Remotion capturer l'image (sinon image noire).
 */
const WarmUp: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const frame = useCurrentFrame();
  const renders = useRef(0);
  useEffect(() => {
    if (renders.current >= 3) return;
    renders.current++;
    const handle = delayRender('Préchauffage du post-traitement');
    let raf2 = 0;
    const raf = requestAnimationFrame(() => {
      advance(performance.now());
      raf2 = requestAnimationFrame(() => {
        advance(performance.now());
        continueRender(handle);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      continueRender(handle);
    };
  }, [frame, advance]);
  return null;
};

/** Post-traitement : bloom, vignette, grain et profondeur de champ optionnelle. */
export const Effects: React.FC<{
  quality: string;
  bloom?: number;
  threshold?: number;
  dof?: React.ComponentProps<typeof DepthOfField> | null;
  vignette?: number;
}> = ({ quality, bloom = 0.9, threshold = 0.55, dof = null, vignette = 0.75 }) => {
  if (quality === 'basse') return null;
  // EffectComposer n'accepte que des effets comme enfants (pas de fragment vide).
  const effects = [
    dof ? <DepthOfField key="dof" {...dof} /> : null,
    <Bloom key="bloom" intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.2} mipmapBlur radius={0.75} />,
    <Noise key="noise" opacity={0.035} premultiply />,
    <Vignette key="vignette" eskil={false} offset={0.22} darkness={vignette} />,
  ].filter(Boolean) as React.ReactElement[];
  return (
    <>
      <WarmUp />
      <EffectComposer multisampling={4}>{effects}</EffectComposer>
    </>
  );
};

let glowTexture: THREE.Texture | null = null;
function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

/** Halo lumineux doux (dégradé radial), sans bord dur. */
export const Glow: React.FC<{ color: string; size: number; opacity?: number; position?: Vec3 }> = ({ color, size, opacity = 0.3, position = [0, 0, 0] }) => (
  <mesh position={position}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial map={getGlowTexture()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>
);
