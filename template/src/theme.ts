import { loadFont } from "@remotion/google-fonts/IBMPlexSansArabic";
import config from "../series.config.mjs";

// The series uses the product's own face, so the frame reads as part of the
// product. Swap the import above for the app's font (any @remotion/google-fonts
// module, or @remotion/fonts for a local file) and keep the subsets it needs.
export const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["arabic", "latin"] });

const c = config.brand.colors;
export const colors = {
  bg: c.bg,
  bgSoft: c.bgSoft,
  brand: c.accent,
  brandSoft: c.accentSoft,
  brandLight: c.accentLight,
  text: c.text,
  muted: c.muted,
  line: c.line,
};

// The recording sits in a 16:9 frame 1440 wide, centred under the top bar,
// leaving room for captions below.
const vw = config.viewport.width;
const vh = config.viewport.height;
const scale = Math.min(1440 / vw, 810 / vh);
export const SCREEN = { scale, width: vw * scale, height: vh * scale, left: (1920 - vw * scale) / 2, top: 96, radius: 22 };

export const lang = config.language as { code: string; locale: string; dir: "rtl" | "ltr" };
export const strings = config.strings;
export const brand = config.brand;
