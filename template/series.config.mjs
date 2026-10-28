// Everything about this series that isn't an episode: language, look, voice,
// clock. Read by the recorder (Node) and the Remotion composition alike, so keep
// it plain JavaScript with no Node-only imports.
import { STRINGS } from "./engine/strings.mjs";

export default {
  /** Folder name in Remotion Studio. */
  name: "__SERIES_NAME__",

  /** The browser window the app is recorded in. 16:9 keeps the frame full. */
  viewport: { width: 1600, height: 900 },

  language: {
    code: "__LANG__", // BCP 47 language, also the ElevenLabs voice-library filter
    locale: "__LOCALE__", // the browser's locale while recording
    dir: "__DIR__", // "rtl" | "ltr"
    // How the narration talks — decide once, write every line this way:
    // register/dialect, who speaks ("we" keeps it gender-neutral), and whether
    // the app's UI labels are quoted verbatim (they should be).
    voice: "__VOICE_NOTES__",
  },

  /** Frame text for the language; override single keys as needed. */
  strings: { ...STRINGS["__STRINGS_PRESET__"] },

  brand: {
    name: "__BRAND__",
    wordmark: ["__BRAND__"], // one or two parts; the second is drawn in accentLight
    logo: null, // e.g. "brand/logo.svg" in public/
    colors: {
      bg: "#0a1530",
      bgSoft: "#13224a",
      accent: "#2f6bea",
      accentSoft: "rgba(47,107,234,0.18)",
      accentLight: "#6f9bff",
      text: "#ffffff",
      muted: "#a9b7d6",
      line: "rgba(255,255,255,0.10)",
    },
  },

  /**
   * Shift the app's clock so every episode happens on one chosen day (episode.at
   * gives the time of day). null records at the real time. See references/stack.md.
   */
  clock: null, // { day: "2026-10-25", utcOffset: "+03:00" }

  /** ElevenLabs narration. Leave voiceId empty to record silent with captions only. */
  voice: {
    voiceId: "",
    modelId: "__MODEL__", // the user's pick from `npm run voice -- models`; changing it re-voices everything
    voiceSettings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.95 },
    // `npm run voice -- preview`: which library voices to try, and which lines they read
    // ([episode, line] — pick lines with the words most likely to be mispronounced).
    preview: { accent: "", gender: "", count: 5, lines: [[0, 0], [0, 1]] },
  },
};
