import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { SafeZones } from '../components/Kinetic';
import { loadFonts } from '../fonts';
import { PunchScene } from '../scenes/PunchScene';
import { typingSchedule } from '../scenes/SearchScene';
import { DURATION } from '../timeline';
import { Sfx, VideoProps, VoiceOver } from '../Video';
import { CtaMinimal, M_BEATS, M_LOOP_START } from './CtaMinimal';
import { HookMinimal } from './HookMinimal';
import { Hud } from './Hud';
import { ParticleWave } from './ParticleWave';
import { RANK, RankingScene, offFrame, rowFrame } from './RankingScene';
import { M_ENTER_AT, M_TYPE_START, SearchMinimal } from './SearchMinimal';
import { TM, ink } from './timeline';

const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(frame, [0, frames], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
};

const WAVE_OPACITY = 0.55;

/** Calque de vague : même opacité sur la première et la dernière image (boucle). */
const WaveLayer: React.FC<{ from: number; quality: string; fadeIn?: [number, number]; fadeOut?: [number, number] }> = ({ from, quality, fadeIn, fadeOut }) => {
  const frame = useCurrentFrame();
  const inO = fadeIn ? interpolate(frame, fadeIn, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const outO = fadeOut ? interpolate(frame, fadeOut, [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return <ParticleWave globalFrame={from + frame} quality={quality} opacity={WAVE_OPACITY * inO * outO} />;
};

/** Sound design épuré : clics, ticks, extinctions, un impact, deux battements. */
const SoundDesignMinimal: React.FC<{ props: VideoProps }> = ({ props }) => {
  const master = props.audio.volumeSoundDesign * (props.voixOff.mode ? 0.7 : 1);
  const keys = typingSchedule(props.recherche, M_TYPE_START).map((f) => TM.search.from + f);
  const rows = Math.min(10, props.entreprises.length);
  return (
    <>
      <Audio
        src={staticFile('audio/sfx/drone.wav')}
        volume={(f) => master * 0.4 * interpolate(f, [0, 20, DURATION - 30, DURATION], [0, 1, 1, 0.3], { extrapolateRight: 'clamp' })}
      />
      <Sfx at={2} src="whoosh" master={master} volume={0.35} rate={1.4} />
      {keys.map((f, i) => (
        <Sfx key={i} at={f} src={`key-${i % 4}`} master={master} volume={0.5} rate={0.95 + (i % 3) * 0.05} />
      ))}
      <Sfx at={TM.search.from + M_ENTER_AT} src="tap" master={master} volume={0.8} />
      <Sfx at={TM.search.from + M_ENTER_AT + 8} src="whoosh-deep" master={master} volume={0.6} />
      {Array.from({ length: rows }, (_, i) => (
        <Sfx key={`r${i}`} at={TM.ranking.from + rowFrame(i)} src="pin" master={master} volume={0.35} rate={1.6 + i * 0.04} />
      ))}
      {RANK.lit.map((f, i) => (
        <Sfx key={`g${i}`} at={TM.ranking.from + f} src="shimmer" master={master} volume={0.45} rate={1 + i * 0.12} />
      ))}
      {Array.from({ length: Math.max(0, rows - 3) }, (_, k) => k + 3).map((i) => (
        <Sfx key={`o${i}`} at={TM.ranking.from + offFrame(i)} src={`key-${i % 4}`} master={master} volume={0.6} rate={0.55} />
      ))}
      <Sfx at={TM.punch.from - 60} src="riser" master={master} volume={0.45} />
      <Sfx at={TM.punch.from + 3} src="impact" master={master} volume={0.9} />
      {M_BEATS.filter((_, i) => i % 2 === 0).map((b) => (
        <Sfx key={`p${b}`} at={TM.cta.from + b} src="pulse" master={master} volume={0.9} />
      ))}
      <Sfx at={TM.cta.from + M_LOOP_START} src="whoosh-out" master={master} volume={0.35} />
    </>
  );
};

/** Version « abstraite / typographique » : noir, typographie géante, une ligne de lumière. */
export const MinimalVideo: React.FC<VideoProps> = (props) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => setReady(true));
  }, []);
  if (!ready) return <AbsoluteFill style={{ backgroundColor: ink.bg }} />;
  const q = props.qualite3D;

  return (
    <AbsoluteFill style={{ backgroundColor: ink.bg }}>
      {/* Vague de particules (motif du site) derrière l'accroche et la recherche. */}
      <Sequence from={0} durationInFrames={TM.ranking.from + 14} name="Vague de particules (ouverture)">
        <WaveLayer from={0} fadeOut={[TM.ranking.from - 4, TM.ranking.from + 12]} quality={q} />
      </Sequence>
      <Sequence from={TM.hook.from} durationInFrames={TM.hook.duration} name="1 · Hairline + accroche">
        <HookMinimal hook={props.hook} highlights={[props.metier, props.ville]} />
      </Sequence>
      <Sequence from={TM.search.from} durationInFrames={TM.search.duration} name="2 · Recherche">
        <SearchMinimal query={props.recherche} />
      </Sequence>
      <Sequence from={TM.ranking.from} durationInFrames={TM.ranking.duration} name="3 · Classement + top 3">
        <RankingScene businesses={props.entreprises} legendes={props.legendes} quality={q} />
      </Sequence>
      <Sequence from={TM.punch.from} durationInFrames={TM.punch.duration} name="4 · Punchline 3D">
        <FadeIn frames={10}>
          <PunchScene lines={props.punchline} accent={props.punchlineAccent} quality={q} variant="minimal" accentColor={ink.accent} />
        </FadeIn>
      </Sequence>
      <Sequence from={TM.cta.from} durationInFrames={TM.cta.duration} name="Vague de particules (fin)">
        <WaveLayer from={TM.cta.from} fadeIn={[0, 16]} quality={q} />
      </Sequence>
      <Sequence from={TM.cta.from} durationInFrames={TM.cta.duration} name="5 · Pouls + CTA + boucle">
        <FadeIn frames={14}>
          <CtaMinimal brand={props.marque} cta={props.cta} ctaSuite={props.ctaSuite} motCle={props.motCle} />
        </FadeIn>
      </Sequence>

      <Hud left="SitePulse · Agence web" right={`${props.metier} · ${props.ville}`} />

      {props.audio.soundDesign && <SoundDesignMinimal props={props} />}
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
