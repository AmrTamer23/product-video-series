import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { colors, SCREEN } from "./theme";
import { FPS, frameOf, startOf, type Rect, type Timeline } from "./timeline";

type Focus = { from: number; to: number; rect: Rect };

const RAMP_IN = 16;
const RAMP_OUT = 14;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.inOut(Easing.cubic);

/** How present a focus is at `frame`: 0 → 1 as it starts, 1 → 0 as it ends. */
const weight = (f: Focus, frame: number) =>
  interpolate(frame, [f.from, f.from + RAMP_IN, Math.max(f.from + RAMP_IN, f.to - 4), f.to + RAMP_OUT], [0, 1, 1, 0], { ...clamp, easing: ease });

/**
 * A gentle camera: small targets get up to 1.3× closer, large ones stay at 1×.
 * Back-to-back focuses overlap their ramps, so the camera pans between them
 * instead of pulling out and back in.
 */
function camera(focuses: Focus[], frame: number, vw: number, vh: number) {
  let total = 0;
  let z = 0;
  let cx = 0;
  let cy = 0;
  for (const f of focuses) {
    const w = weight(f, frame);
    if (w <= 0) continue;
    const zoom = Math.min(1.3, Math.max(1, Math.min((vw * 0.6) / f.rect.width, (vh * 0.6) / f.rect.height)));
    total += w;
    z += w * zoom;
    cx += w * (f.rect.x + f.rect.width / 2);
    cy += w * (f.rect.y + f.rect.height / 2);
  }
  if (total === 0) return { z: 1, cx: vw / 2, cy: vh / 2 };
  const k = Math.min(1, total);
  return {
    z: 1 + k * (z / total - 1),
    cx: vw / 2 + k * (cx / total - vw / 2),
    cy: vh / 2 + k * (cy / total - vh / 2),
  };
}

const Spotlight = ({ focus, vw, vh }: { focus: Focus; vw: number; vh: number }) => {
  const frame = useCurrentFrame();
  const w = weight(focus, frame);
  if (w <= 0) return null;
  const { x, y, width, height } = focus.rect;
  const grow = interpolate(frame, [focus.from, focus.from + 12], [10, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const id = `hole-${focus.from}`;
  return (
    <svg width={vw} height={vh} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <mask id={id}>
          <rect width={vw} height={vh} fill="white" />
          <rect x={x} y={y} width={width} height={height} rx={14} fill="black" />
        </mask>
      </defs>
      <rect width={vw} height={vh} fill="#06102a" opacity={0.42 * w} mask={`url(#${id})`} />
      <rect
        x={x - grow}
        y={y - grow}
        width={width + grow * 2}
        height={height + grow * 2}
        rx={14}
        fill="none"
        stroke={colors.brand}
        strokeWidth={4}
        opacity={w}
        style={{ filter: "drop-shadow(0 0 10px rgba(47,107,234,0.75))" }}
      />
    </svg>
  );
};

const Caption = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const captions = timeline.events
    .filter((e): e is Extract<typeof e, { type: "caption" }> => e.type === "caption")
    .map((c) => ({ text: c.text, from: frameOf(timeline, c.t) }));
  const active = captions.filter((c) => c.from <= frame + 3).at(-1); // lead the action by a hair
  if (!active) return null;
  const since = frame + 3 - active.from;
  const p = interpolate(since, [0, 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        position: "absolute",
        top: SCREEN.top + SCREEN.height + 22,
        left: SCREEN.left,
        width: SCREEN.width,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * 14}px)`,
          display: "flex",
          alignItems: "stretch",
          gap: 20,
          maxWidth: SCREEN.width,
          padding: "16px 30px",
          borderRadius: 20,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${colors.line}`,
        }}
      >
        <div style={{ width: 5, borderRadius: 4, background: colors.brand, flexShrink: 0 }} />
        <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.55, textAlign: "start" }}>{active.text}</div>
      </div>
    </div>
  );
};

export const Screen = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { width: vw, height: vh } = timeline.viewport;
  const focuses: Focus[] = timeline.events
    .filter((e): e is Extract<typeof e, { type: "focus" }> => e.type === "focus")
    .map((e) => ({ from: frameOf(timeline, e.t), to: frameOf(timeline, e.t + e.duration), rect: e.rect }));

  const cam = camera(focuses, frame, vw, vh);
  const s = SCREEN.scale * cam.z;
  // Keep the focus centred but never show past the recording's edges.
  const tx = Math.min(0, Math.max(SCREEN.width - vw * s, SCREEN.width / 2 - cam.cx * s));
  const ty = Math.min(0, Math.max(SCREEN.height - vh * s, SCREEN.height / 2 - cam.cy * s));
  const trimBefore = Math.round((startOf(timeline) + timeline.videoOffset) * FPS);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: SCREEN.left,
          top: SCREEN.top,
          width: SCREEN.width,
          height: SCREEN.height,
          borderRadius: SCREEN.radius,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
          background: "#e9edf3",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: vw, height: vh, direction: "ltr", transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${s})` }}>
          <Video src={staticFile(timeline.video)} trimBefore={trimBefore} muted style={{ width: vw, height: vh }} />
          {focuses.map((f) => (
            <Spotlight key={f.from} focus={f} vw={vw} vh={vh} />
          ))}
        </div>
      </div>
      <Caption timeline={timeline} />
      {timeline.events.map((e) =>
        e.type === "caption" && e.audio ? (
          <Sequence key={e.t} from={frameOf(timeline, e.t)} name="Narration">
            <Audio src={staticFile(e.audio)} />
          </Sequence>
        ) : null,
      )}
    </AbsoluteFill>
  );
};
