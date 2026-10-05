import { RoundedBox } from '@react-three/drei';
import { ThreeElements } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { SCREEN_TEX_H, SCREEN_TEX_W } from './screenTexture';

export const PHONE = {
  width: 0.76,
  height: 1.56,
  depth: 0.085,
  screenW: 0.7,
  get screenH() {
    return (this.screenW * SCREEN_TEX_H) / SCREEN_TEX_W;
  },
};

/** Rectangle arrondi avec UV 0..1 (pour plaquer la texture d'écran). */
function roundedRectGeometry(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 24);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - x) / w;
    uv[i * 2 + 1] = (pos.getY(i) - y) / h;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Smartphone 3D procédural : châssis titane, écran OLED, îlot, boutons, bloc photo. */
export const Phone: React.FC<{ screen: THREE.Texture; screenBoost?: number } & ThreeElements['group']> = ({
  screen,
  screenBoost = 1,
  ...props
}) => {
  const screenGeo = useMemo(() => roundedRectGeometry(PHONE.screenW, PHONE.screenH, 0.075), []);
  const glassGeo = useMemo(() => roundedRectGeometry(PHONE.width - 0.03, PHONE.height - 0.03, 0.1), []);
  const islandGeo = useMemo(() => roundedRectGeometry(0.2, 0.056, 0.027), []);
  const front = PHONE.depth / 2;

  return (
    <group {...props}>
      {/* Châssis */}
      <RoundedBox args={[PHONE.width, PHONE.height, PHONE.depth]} radius={0.04} smoothness={8}>
        <meshPhysicalMaterial color="#2a2d34" metalness={1} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} envMapIntensity={1.4} />
      </RoundedBox>
      {/* Vitre noire (bordures) */}
      <mesh geometry={glassGeo} position={[0, 0, front + 0.0008]}>
        <meshPhysicalMaterial color="#000000" roughness={0.12} metalness={0} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={0.25} />
      </mesh>
      {/* Écran */}
      <mesh geometry={screenGeo} position={[0, 0, front + 0.0016]}>
        <meshBasicMaterial map={screen} toneMapped={false} color={new THREE.Color(screenBoost, screenBoost, screenBoost)} />
      </mesh>
      {/* Reflet de vitre */}
      <mesh geometry={glassGeo} position={[0, 0, front + 0.0024]}>
        <meshPhysicalMaterial transparent opacity={0.08} roughness={0} metalness={0} clearcoat={1} envMapIntensity={2} color="#ffffff" />
      </mesh>
      {/* Îlot dynamique */}
      <mesh geometry={islandGeo} position={[0, PHONE.screenH / 2 - 0.06, front + 0.003]}>
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Boutons latéraux */}
      {[
        [PHONE.width / 2 + 0.006, 0.28, 0.16],
        [-PHONE.width / 2 - 0.006, 0.36, 0.08],
        [-PHONE.width / 2 - 0.006, 0.2, 0.13],
        [-PHONE.width / 2 - 0.006, 0.04, 0.13],
      ].map(([x, y, h], i) => (
        <RoundedBox key={i} args={[0.014, h, 0.03]} radius={0.006} smoothness={3} position={[x, y, 0]}>
          <meshPhysicalMaterial color="#3a3e46" metalness={1} roughness={0.25} />
        </RoundedBox>
      ))}
      {/* Bloc photo (dos) */}
      <group position={[-0.17, 0.55, -front]}>
        <RoundedBox args={[0.32, 0.32, 0.03]} radius={0.06} smoothness={6} position={[0, 0, -0.012]}>
          <meshPhysicalMaterial color="#30343c" metalness={0.9} roughness={0.2} clearcoat={1} />
        </RoundedBox>
        {[
          [-0.07, 0.07],
          [-0.07, -0.07],
          [0.075, 0],
        ].map(([x, y], i) => (
          <group key={i} position={[x, y, -0.03]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.055, 0.055, 0.025, 40]} />
              <meshPhysicalMaterial color="#14161a" metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, -0.0135]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.035, 0.035, 0.002, 40]} />
              <meshPhysicalMaterial color="#0b1530" metalness={0.5} roughness={0} clearcoat={1} envMapIntensity={3} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};
