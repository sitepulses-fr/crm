import { ThreeElements } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { colors } from '../theme';

/** Tracé « pulse » (électrocardiogramme) du logo SitePulse, dans un carré de 1×1. */
const PULSE_POINTS: [number, number][] = [
  [-0.42, 0],
  [-0.18, 0],
  [-0.1, 0.16],
  [0.0, -0.3],
  [0.1, 0.34],
  [0.18, -0.06],
  [0.24, 0],
  [0.42, 0],
];

function roundedSquare(size: number, r: number) {
  const s = new THREE.Shape();
  const h = size / 2;
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}

/** Badge 3D SitePulse : carré arrondi bleu extrudé + ligne de pouls lumineuse. */
export const Logo3D: React.FC<{ pulse: number; draw: number; brand: string } & ThreeElements['group']> = ({
  pulse,
  draw,
  brand,
  ...props
}) => {
  const badge = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedSquare(1, 0.26), {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 8,
      curveSegments: 24,
    });
    g.translate(0, 0, -0.11);
    return g;
  }, []);

  const tube = useMemo(() => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < PULSE_POINTS.length - 1; i++) {
      const [x1, y1] = PULSE_POINTS[i];
      const [x2, y2] = PULSE_POINTS[i + 1];
      curve.add(new THREE.LineCurve3(new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0)));
    }
    return new THREE.TubeGeometry(curve, 400, 0.034, 16, false);
  }, []);

  // Dessin progressif du tracé (drawRange sur les segments du tube).
  const indexCount = tube.index ? tube.index.count : 0;
  tube.setDrawRange(0, Math.floor((indexCount / 6) * Math.min(1, draw)) * 6);

  const materials = useMemo(
    () => [
      new THREE.MeshPhysicalMaterial({ color: brand, metalness: 0.55, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 }),
      new THREE.MeshPhysicalMaterial({ color: '#0f2c7a', metalness: 1, roughness: 0.25, envMapIntensity: 1.8 }),
    ],
    [brand],
  );
  return (
    <group {...props}>
      <mesh geometry={badge} material={materials} />
      <mesh geometry={tube} position={[0, 0, 0.2]}>
        <meshStandardMaterial color="#ffffff" emissive={new THREE.Color('#dbe8ff')} emissiveIntensity={1.4 + pulse * 2.5} toneMapped={false} />
      </mesh>
      {/* Point lumineux au bout du tracé */}
      <mesh position={[0.42, 0, 0.2]} scale={0.06 * (1 + pulse * 0.8)} visible={draw >= 1}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={colors.goldLight} toneMapped={false} />
      </mesh>
    </group>
  );
};
