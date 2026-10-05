import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fonts } from '../theme';
import { ink } from '../minimal/timeline';
import { KEYWORDS, WORDS, outFrame } from './timeline';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type Chunk = { words: { w: string; start: number; end: number }[]; start: number; end: number };

/** Groupes de 1 à 3 mots (coupés à la ponctuation), façon sous-titres de créateurs. */
function buildChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Chunk['words'] = [];
  const flush = () => {
    if (!cur.length) return;
    chunks.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  for (const w of WORDS) {
    const item = { w: w.w, start: outFrame(w.s), end: outFrame(w.e) };
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    if (cur.length >= 3 || chars > 17) flush();
    cur.push(item);
    if (/[.,?!]$/.test(w.w)) flush();
  }
  flush();
  // Chaque groupe reste affiché jusqu'au suivant (sauf longue pause).
  return chunks.map((c, i) => {
    const next = chunks[i + 1];
    const end = next && next.start - c.end < 15 ? next.start : c.end + 8;
    return { ...c, end };
  });
}

const CHUNKS = buildChunks();
const isKey = (w: string) => KEYWORDS.has(w.toLowerCase().replace(/[.,?!]$/, '')) || KEYWORDS.has(w.toLowerCase());

export const Captions: React.FC<{ hideFrom?: number }> = ({ hideFrom = Infinity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Le premier « Stop » est déjà affiché en géant : on ne le double pas en sous-titre.
  const chunk = CHUNKS.find((c) => frame >= c.start && frame < c.end && !(c.words[0].w.startsWith('Stop') && c.words.length === 1));
  if (!chunk || frame >= hideFrom) return null;
  const pop = spring({ frame: frame - chunk.start, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          // Plus bas sur les plans rapprochés, sous les apparitions placées au niveau du torse.
          top: frame >= outFrame(18.7) ? 1380 : 1255,
          left: 50,
          right: 50,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px 18px',
          fontFamily: fonts.brand,
          fontWeight: 700,
          fontSize: 88,
          letterSpacing: -3,
          lineHeight: 1.08,
          transform: `scale(${0.82 + pop * 0.18}) translateY(${(1 - pop) * 24}px)`,
          opacity: interpolate(pop, [0, 0.4], [0, 1], clamp),
        }}
      >
        {chunk.words.map((w, i) => {
          const active = frame >= w.start && frame < (chunk.words[i + 1]?.start ?? chunk.end);
          const spoken = frame >= w.start;
          const hit = interpolate(frame - w.start, [0, 3, 7], [0, 1, 0.9], { ...clamp, easing: Easing.out(Easing.cubic) });
          const key = isKey(w.w);
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                isolation: 'isolate',
                display: 'inline-block',
                padding: '2px 16px 10px',
                color: key && !active ? '#9db0ff' : '#ffffff',
                opacity: spoken ? 1 : 0.55,
                transform: `scale(${active ? 1 + hit * 0.08 : 1})`,
                textShadow: '0 6px 26px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.6)',
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 20,
                    background: ink.accent,
                    boxShadow: `0 10px 40px ${ink.accent}88`,
                    transform: `scale(${0.6 + hit * 0.4})`,
                    opacity: hit,
                    zIndex: -1,
                  }}
                />
              )}
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
