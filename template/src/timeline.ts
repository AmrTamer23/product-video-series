// Shape of public/recordings/<id>.json, written by record/director.mjs, and the
// mapping from its timeline seconds to composition frames.

export type Rect = { x: number; y: number; width: number; height: number };

export type TimelineEvent =
  | { type: "start"; t: number }
  | { type: "caption"; t: number; text: string; duration: number; audio?: string | null }
  | { type: "focus"; t: number; duration: number; rect: Rect };

export type Timeline = {
  id: string;
  title: string;
  subtitle: string;
  /** The intro card's spoken title, when the series is voiced. */
  titleAudio?: { file: string; duration: number } | null;
  video: string;
  videoOffset: number;
  viewport: { width: number; height: number };
  end: number;
  events: TimelineEvent[];
};

export const FPS = 30;
const MIN_INTRO_SECONDS = 3;
/** Where the spoken title starts on the intro card. */
export const TITLE_VOICE_DELAY = 12;
export const OUTRO_SECONDS = 3;

export const startOf = (tl: Timeline) => tl.events.find((e) => e.type === "start")?.t ?? 0;

/** Seconds of screen recording the episode shows. */
export const screenSeconds = (tl: Timeline) => tl.end - startOf(tl);

/** Composition frame (relative to the screen segment) at which a timeline moment appears. */
export const frameOf = (tl: Timeline, t: number) => Math.round((t - startOf(tl)) * FPS);

/** The intro card lasts at least 3s, longer if its spoken title needs it. */
export const introFrames = (tl: Timeline) =>
  Math.ceil(Math.max(MIN_INTRO_SECONDS * FPS, TITLE_VOICE_DELAY + (tl.titleAudio?.duration ?? 0) * FPS + 24));

export const totalFrames = (tl: Timeline) => introFrames(tl) + Math.ceil((screenSeconds(tl) + OUTRO_SECONDS) * FPS);
