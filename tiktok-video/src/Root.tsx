import React from 'react';
import { Composition, getStaticFiles } from 'remotion';
import config from '../config.json';
import { resolveConfig, voiceLinesDir } from './resolveConfig';
import { DURATION, FPS, HEIGHT, WIDTH } from './timeline';
import { SitePulseVideo, VideoProps } from './Video';

/** Détecte la voix off disponible dans public/ (fichier unique ou une piste par phrase). */
function detectVoiceOver(slug: string): VideoProps['voixOff']['mode'] {
  const files = getStaticFiles().map((f) => f.name);
  if (files.includes(config.voixOff.fichier)) return 'fichier';
  if (files.includes(`${voiceLinesDir(slug)}/line-1.mp3`)) return 'lignes';
  return null;
}

const base = resolveConfig(config);
const defaultProps: VideoProps = { ...base, voixOff: { ...base.voixOff, mode: detectVoiceOver(base.slug) } };

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SitePulseMaps"
    component={SitePulseVideo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={DURATION}
    defaultProps={defaultProps}
  />
);
