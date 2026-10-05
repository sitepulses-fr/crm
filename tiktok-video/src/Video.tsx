import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SafeZones } from './components/Kinetic';
import { loadFonts } from './fonts';
import { voiceLinesDir } from './resolveConfig';
import { CtaScene } from './scenes/CtaScene';
import { HookScene } from './scenes/HookScene';
import { Business, MAP_PHASE, MapScene } from './scenes/MapScene';
import { PunchScene } from './scenes/PunchScene';
import { SearchScene, TAP_AT, typingSchedule } from './scenes/SearchScene';
import { colors } from './theme';
import { DURATION, T, sec } from './timeline';
import { pinDelay } from './three/MapWorld';

export type VideoProps = {
  metier: string;
  ville: string;
  slug: string;
  hook: string;
  recherche: string;
  legendes: { texte: string; debut: number; fin: number; accent?: boolean }[];
  punchline: string[];
  punchlineAccent: string;
  cta: string;
  ctaSuite: string;
  motCle: string;
  entreprises: Business[];
  marque: { nom: string; accroche: string; bleu: string; or: string };
  audio: { soundDesign: boolean; volumeSoundDesign: number; musique: string | null; volumeMusique: number };
  voixOff: { mode: 'fichier' | 'lignes' | null; fichier: string; volume: number; lignes: { texte: string; debut: number }[] };
  qualite3D: string;
  afficherZonesSures: boolean;
};

export const Sfx: React.FC<{ at: number; src: string; volume?: number; rate?: number; master: number }> = ({ at, src, volume = 1, rate = 1, master }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none" name={`sfx ${src}`}>
    <Audio src={staticFile(`audio/sfx/${src}.wav`)} volume={volume * master} playbackRate={rate} />
  </Sequence>
);

const SoundDesign: React.FC<{ props: VideoProps }> = ({ props }) => {
  const m = props.audio.volumeSoundDesign;
  // La voix off passe devant : on baisse le sound design quand elle est présente.
  const duck = props.voixOff.mode ? 0.7 : 1;
  const master = m * duck;
  const keys = typingSchedule(props.recherche).map((f) => T.search.from + f);
  return (
    <>
      <Audio
        src={staticFile('audio/sfx/drone.wav')}
        volume={(f) => master * 0.55 * interpolate(f, [0, 20, DURATION - 30, DURATION], [0, 1, 1, 0.4], { extrapolateRight: 'clamp' })}
      />
      <Sfx at={40} src="whoosh" master={master} volume={0.8} />
      <Sfx at={T.search.from + 2} src="impact" master={master} volume={0.25} rate={1.6} />
      {keys.map((f, i) => (
        <Sfx key={i} at={f} src={`key-${i % 4}`} master={master} volume={0.45} rate={0.95 + (i % 3) * 0.05} />
      ))}
      <Sfx at={T.search.from + TAP_AT} src="tap" master={master} volume={0.7} />
      <Sfx at={T.search.from + 80} src="whoosh-deep" master={master} volume={0.9} />
      {props.entreprises.slice(0, 10).map((_, i) => (
        <Sfx key={`pin${i}`} at={T.map.from + pinDelay(i) + 8} src="pin" master={master} volume={0.55} rate={0.9 + (i % 4) * 0.07} />
      ))}
      <Sfx at={T.map.from + MAP_PHASE.sheetUp} src="whoosh" master={master} volume={0.45} rate={1.3} />
      {MAP_PHASE.gold.map((f, i) => (
        <Sfx key={`gold${i}`} at={T.map.from + f} src="shimmer" master={master} volume={0.55} rate={1 + i * 0.12} />
      ))}
      <Sfx at={T.map.from + MAP_PHASE.darkness} src="whoosh-out" master={master} volume={0.8} rate={0.7} />
      <Sfx at={T.punch.from - 60} src="riser" master={master} volume={0.6} />
      <Sfx at={T.punch.from + 3} src="impact" master={master} volume={1} />
      <Sfx at={T.punch.from + 112} src="whoosh" master={master} volume={0.7} rate={0.8} />
      <Sfx at={T.cta.from + 28} src="pulse" master={master} volume={0.9} />
      <Sfx at={T.cta.from + 60} src="pulse" master={master} volume={0.7} />
      <Sfx at={T.cta.from + 44 + props.motCle.length * 3 + 8} src="tap" master={master} volume={0.6} />
      <Sfx at={T.cta.from + 96} src="whoosh-out" master={master} volume={0.5} />
    </>
  );
};

export const VoiceOver: React.FC<{ props: VideoProps }> = ({ props }) => {
  const { mode, fichier, volume, lignes } = props.voixOff;
  if (mode === 'fichier') return <Audio src={staticFile(fichier)} volume={volume} />;
  if (mode === 'lignes') {
    return (
      <>
        {lignes.map((l, i) => (
          <Sequence key={i} from={sec(l.debut)} layout="none" name={`VO ${i + 1}`}>
            <Audio src={staticFile(`${voiceLinesDir(props.slug)}/line-${i + 1}.mp3`)} volume={volume} />
          </Sequence>
        ))}
      </>
    );
  }
  return null;
};

export const SitePulseVideo: React.FC<VideoProps> = (props) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => setReady(true));
  }, []);
  if (!ready) return <AbsoluteFill style={{ backgroundColor: colors.black }} />;

  const highlights = [props.metier, props.ville];
  const q = props.qualite3D;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      {/* Ordre des calques : chaque scène recouvre la précédente pendant les transitions. */}
      <Sequence from={T.map.from} durationInFrames={T.map.duration} name="3 · Carte + top 3">
        <MapScene query={props.recherche} ville={props.ville} businesses={props.entreprises} legendes={props.legendes} quality={q} />
      </Sequence>
      <Sequence from={T.search.from} durationInFrames={T.search.duration} name="2 · Recherche">
        <SearchScene query={props.recherche} />
      </Sequence>
      <Sequence from={T.hook.from} durationInFrames={T.hook.duration} name="1 · Hook smartphone 3D">
        <HookScene hook={props.hook} highlights={highlights} quality={q} />
      </Sequence>
      <Sequence from={T.punch.from} durationInFrames={T.punch.duration} name="4 · Punchline 3D">
        <FadeIn frames={10}>
          <PunchScene lines={props.punchline} accent={props.punchlineAccent} quality={q} />
        </FadeIn>
      </Sequence>
      <Sequence from={T.cta.from} durationInFrames={T.cta.duration} name="5 · CTA + boucle">
        <FadeIn frames={14}>
          <CtaScene brand={props.marque} cta={props.cta} ctaSuite={props.ctaSuite} motCle={props.motCle} quality={q} />
        </FadeIn>
      </Sequence>

      {props.audio.soundDesign && <SoundDesign props={props} />}
      {props.audio.musique && (
        <Audio
          src={staticFile(props.audio.musique)}
          volume={(f) => props.audio.volumeMusique * interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0])}
        />
      )}
      <VoiceOver props={props} />
      {props.afficherZonesSures && <SafeZones />}
    </AbsoluteFill>
  );
};

/** Fondu d'entrée d'une scène (frames relatives à la séquence). */
const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
};
