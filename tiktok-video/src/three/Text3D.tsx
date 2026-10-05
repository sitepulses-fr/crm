import { ThreeElements } from '@react-three/fiber';
import React, { useEffect, useMemo, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

const cache = new Map<string, Promise<Font>>();

/** Charge une typeface JSON (générée par scripts/prepare-fonts.mjs) en bloquant le rendu. */
export function useTypeface(file: string): Font | null {
  const [font, setFont] = useState<Font | null>(null);
  const [handle] = useState(() => delayRender(`Typeface ${file}`));
  useEffect(() => {
    if (!cache.has(file)) {
      cache.set(
        file,
        fetch(staticFile(`fonts/${file}`))
          .then((r) => r.json())
          .then((json) => new Font(json)),
      );
    }
    cache
      .get(file)!
      .then((f) => {
        setFont(f);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [file, handle]);
  return font;
}

export type TextOptions = { size?: number; depth?: number; bevel?: number };

/** Avance horizontale d'une chaîne (pour enchaîner plusieurs segments sur une ligne). */
export function textAdvance(font: Font, text: string, size: number) {
  const data = (font as unknown as { data: { glyphs: Record<string, { ha: number }>; resolution: number } }).data;
  const scale = size / data.resolution;
  return [...text].reduce((w, c) => w + ((data.glyphs[c] ?? data.glyphs['?'])?.ha ?? 0) * scale, 0);
}

export function makeTextGeometry(font: Font, text: string, { size = 1, depth = 0.28, bevel = 0.025 }: TextOptions = {}) {
  const geo = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 10,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 1.4,
    bevelSize: bevel,
    bevelSegments: 5,
  });
  geo.computeVertexNormals();
  return geo;
}

/** Texte 3D extrudé, avec matériaux distincts pour la face et les flancs. */
export const ExtrudedText: React.FC<
  {
    font: Font;
    text: string;
    options?: TextOptions;
    face: THREE.Material;
    side: THREE.Material;
    align?: 'left' | 'center';
  } & ThreeElements['group']
> = ({ font, text, options, face, side, align = 'left', ...props }) => {
  const geo = useMemo(() => {
    const g = makeTextGeometry(font, text, options);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const dx = align === 'center' ? -(bb.max.x + bb.min.x) / 2 : 0;
    g.translate(dx, 0, -(options?.depth ?? 0.28) / 2);
    return g;
  }, [font, text, options, align]);
  return (
    <group {...props}>
      <mesh geometry={geo} material={[face, side]} />
    </group>
  );
};
