import { useVideoConfig, spring, interpolate, Easing } from 'remotion';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../resolveConfig';
import { colors } from '../theme';
import { MAP_SIZE, createMapTexture } from './mapTexture';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Positions (x, z) des pins : index 0-2 = top 3, le reste autour. */
export function pinLayout(ville: string, count: number): [number, number][] {
  const rand = seededRandom(`pins|${ville}`);
  const base: [number, number][] = [
    [-0.55, -1.25],
    [0.7, -0.7],
    [0.15, -2.05],
    [-1.65, -0.35],
    [1.75, -1.85],
    [-1.25, -2.7],
    [1.45, 0.15],
    [-0.35, 0.05],
    [2.2, -0.9],
    [-2.2, -1.5],
  ];
  return base.slice(0, count).map(([x, z]) => [x + (rand() - 0.5) * 0.25, z + (rand() - 0.5) * 0.25]);
}

export const PIN_DROP_START = 14;
export const pinDelay = (i: number) => PIN_DROP_START + [6, 10, 14, 0, 3, 8, 12, 16, 5, 11][i % 10] * 1.6;

const pinHead = new THREE.SphereGeometry(0.15, 40, 24);
const pinTip = new THREE.ConeGeometry(0.128, 0.3, 40, 1, true);
const pinDot = new THREE.SphereGeometry(0.055, 24, 16);
const ring = new THREE.RingGeometry(0.22, 0.27, 64);
const shadowGeo = new THREE.CircleGeometry(0.16, 32);

const red = new THREE.Color('#ea4335');
const gold = new THREE.Color(colors.gold);
const ash = new THREE.Color('#1a1d24');

const Pin: React.FC<{
  x: number;
  z: number;
  delay: number;
  frame: number;
  goldness: number;
  dim: number;
}> = ({ x, z, delay, frame, goldness, dim }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 120, mass: 0.6 } });
  const fall = 3.8 * (1 - s);
  const y = Math.max(0, fall);
  const squash = Math.min(0, fall) * 1.6; // rebond : légère compression au contact
  const appeared = frame >= delay;

  const color = red.clone().lerp(gold, goldness).lerp(ash, dim);
  const emissive = gold.clone().multiplyScalar(goldness * 0.75);
  const scale = 1 + goldness * 0.45 - dim * 0.25;
  const lift = goldness * 0.12 - dim * 0.15;
  const pulse = 1 + goldness * (0.5 + 0.5 * Math.sin(frame / 6)) * 0.35;

  if (!appeared) return null;
  return (
    <group position={[x, 0, z]}>
      {/* Ombre portée */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} scale={(1 + y * 0.25) * scale}>
        <primitive object={shadowGeo} attach="geometry" />
        <meshBasicMaterial color="#000" transparent opacity={0.55 / (1 + y * 1.5)} depthWrite={false} />
      </mesh>
      {/* Halo au sol pour le top 3 */}
      {goldness > 0.01 && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} scale={pulse * 1.4}>
          <primitive object={ring} attach="geometry" />
          <meshBasicMaterial color={colors.gold} transparent opacity={goldness * 0.9} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      <group position={[0, y + lift, 0]} scale={[scale * (1 - squash * 0.3), scale * (1 + squash), scale * (1 - squash * 0.3)]}>
        <mesh position={[0, 0.15, 0]} rotation-x={Math.PI}>
          <primitive object={pinTip} attach="geometry" />
          <meshPhysicalMaterial color={color} emissive={emissive} roughness={0.3} clearcoat={1} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <primitive object={pinHead} attach="geometry" />
          <meshPhysicalMaterial color={color} emissive={emissive} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position={[0, 0.37, 0.115]}>
          <primitive object={pinDot} attach="geometry" />
          <meshStandardMaterial color={goldness > 0.5 ? '#fff6dc' : '#7a1410'} emissive={goldness > 0.5 ? '#ffffff' : '#000'} emissiveIntensity={goldness} />
        </mesh>
      </group>
    </group>
  );
};

/** Bâtiments extrudés (instanciés) : relief et parallaxe. */
const Buildings: React.FC<{ ville: string; dark: number; avoid: [number, number][] }> = ({ ville, dark, avoid }) => {
  const mesh = useMemo(() => {
    const rand = seededRandom(`buildings|${ville}`);
    const count = 340;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: '#2b3548', roughness: 0.85, metalness: 0.1 });
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    let placed = 0;
    while (placed < count) {
      const x = (rand() - 0.5) * 9;
      const z = (rand() - 0.5) * 9 - 1;
      if (avoid.some(([ax, az]) => Math.hypot(ax - x, az - z) < 0.45)) continue;
      // Laisse lisible le nom de la ville (z = -3,2 sur la carte).
      if (Math.abs(x) < 1.6 && Math.abs(z + 3.2) < 0.45) continue;
      const d = Math.hypot(x, z + 1);
      const h = (0.04 + rand() * 0.22) * Math.max(0.3, 1.4 - d * 0.25);
      const w = 0.08 + rand() * 0.16;
      const l = 0.08 + rand() * 0.2;
      m.compose(
        new THREE.Vector3(x, 0, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.4),
        new THREE.Vector3(w, h, l),
      );
      inst.setMatrixAt(placed++, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }, [ville, avoid]);
  (mesh.material as THREE.MeshStandardMaterial).color.set('#2b3548').multiplyScalar(1 - dark * 0.85);
  return <primitive object={mesh} />;
};

export const MapWorld: React.FC<{
  ville: string;
  streets: string[];
  frame: number;
  pinCount: number;
  goldFor: (i: number) => number;
  dim: number;
  dark: number;
}> = ({ ville, streets, frame, pinCount, goldFor, dim, dark }) => {
  const texture = useMemo(() => createMapTexture(ville, streets), [ville, streets]);
  const pins = useMemo(() => pinLayout(ville, pinCount), [ville, pinCount]);
  const mapShade = 1 - dark * 0.86;
  const reveal = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshBasicMaterial map={texture} toneMapped={false} color={new THREE.Color(mapShade * reveal, mapShade * reveal, mapShade * reveal)} />
      </mesh>
      <Buildings ville={ville} dark={Math.max(dark, 1 - reveal)} avoid={pins} />
      {pins.map(([x, z], i) => (
        <Pin key={i} x={x} z={z} delay={pinDelay(i)} frame={frame} goldness={i < 3 ? goldFor(i) : 0} dim={i < 3 ? 0 : dim} />
      ))}
    </group>
  );
};
