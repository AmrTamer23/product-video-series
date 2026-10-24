// Finds the magenta sync flash (see Director.ready) in a recording and returns
// the offset to add to timeline times to get video times.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FPS = 25; // Playwright records at a constant 25 fps

export function findVideoOffset(videoFile, startEventT) {
  // Average an 8×8 patch per frame down to one RGB pixel over the first 30s.
  const raw = execFileSync(
    "npx",
    ["remotion", "ffmpeg", "-loglevel", "error", "-t", "30", "-i", videoFile, "-vf", "crop=8:8:40:40,scale=1:1", "-pix_fmt", "rgb24", "-c:v", "rawvideo", "-f", "image2pipe", "-"],
    { maxBuffer: 64 * 1024 * 1024, cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..") },
  );
  let last = -1;
  for (let f = 0; f * 3 + 2 < raw.length; f++) {
    const [r, g, b] = [raw[f * 3], raw[f * 3 + 1], raw[f * 3 + 2]];
    const magenta = r > 200 && b > 200 && g < 80;
    if (magenta) last = f;
    else if (last >= 0) break;
  }
  if (last < 0) throw new Error(`no sync flash found in ${videoFile}`);
  return (last + 1) / FPS - startEventT;
}
