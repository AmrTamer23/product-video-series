import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Brand, Cards } from "./Cards";
import { Screen } from "./Screen";
import { colors, fontFamily, lang, SCREEN, strings } from "./theme";
import { FPS, introFrames, OUTRO_SECONDS, screenSeconds, TITLE_VOICE_DELAY, type Timeline } from "./timeline";

export type EpisodeProps = {
  id: string;
  number: number;
  total: number;
  next: string | null;
  timeline: Timeline | null;
};

const Backdrop = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 80% -10%, ${colors.bgSoft} 0%, ${colors.bg} 60%)`,
    }}
  />
);

/** Episode counter as a row of dots, so viewers see where they are in the series. */
const SeriesDots = ({ number, total }: { number: number; total: number }) => (
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        style={{
          width: i + 1 === number ? 28 : 8,
          height: 8,
          borderRadius: 8,
          background: i + 1 === number ? colors.brand : i + 1 < number ? colors.muted : colors.line,
        }}
      />
    ))}
  </div>
);

const TopBar = ({ number, total, title }: { number: number; total: number; title: string }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        top: 26,
        left: SCREEN.left,
        right: SCREEN.left,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Brand size={30} />
        <div style={{ width: 1, height: 24, background: colors.line }} />
        <div style={{ color: colors.text, fontSize: 26, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, color: colors.muted, fontSize: 22 }}>
        <span>{strings.episodeOf(number, total)}</span>
        <SeriesDots number={number} total={total} />
      </div>
    </div>
  );
};

export const Episode = ({ number, total, next, timeline }: EpisodeProps) => {
  const frame = useCurrentFrame();
  if (!timeline) return null;
  const intro = introFrames(timeline);
  const screen = Math.round(screenSeconds(timeline) * FPS);
  const outro = OUTRO_SECONDS * FPS;
  const screenOpacity = interpolate(frame, [intro - 10, intro + 8, intro + screen - 6, intro + screen + 10], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const screenLift = interpolate(frame, [intro - 10, intro + 14], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill lang={lang.code} style={{ direction: lang.dir, fontFamily, color: colors.text }}>
      <Backdrop />
      <Sequence durationInFrames={intro + 10} name="Intro">
        <Cards.Intro number={number} total={total} title={timeline.title} subtitle={timeline.subtitle} exitAt={intro} />
      </Sequence>
      {timeline.titleAudio ? (
        <Sequence from={TITLE_VOICE_DELAY} name="Title voice">
          <Audio src={staticFile(timeline.titleAudio.file)} />
        </Sequence>
      ) : null}
      <Sequence from={intro - 10} durationInFrames={screen + 20} name="Screen">
        <AbsoluteFill style={{ opacity: screenOpacity, transform: `translateY(${screenLift}px)` }}>
          <TopBar number={number} total={total} title={timeline.title} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={intro} durationInFrames={screen} name="Recording">
        <AbsoluteFill style={{ opacity: screenOpacity, transform: `translateY(${screenLift}px)` }}>
          <Screen timeline={timeline} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={intro + screen} durationInFrames={outro} name="Outro">
        <Cards.Outro next={next} />
      </Sequence>
    </AbsoluteFill>
  );
};
