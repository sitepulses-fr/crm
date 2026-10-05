import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts } from '../theme';
import { ink } from './timeline';

/** Repères en mono, comme l'en-tête de sitepulses.fr (« ● AGENCE WEB · JURA »). */
export const Hud: React.FC<{ left: string; right: string; opacity?: number }> = ({ left, right, opacity = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
    <div
      style={{
        position: 'absolute',
        top: 182,
        left: 64,
        right: 64,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: fonts.mono,
        fontWeight: 400,
        fontSize: 25,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color: ink.dim,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: ink.accent, boxShadow: `0 0 12px ${ink.accent}` }} />
        {left}
      </span>
      <span>{right}</span>
    </div>
  </AbsoluteFill>
);
