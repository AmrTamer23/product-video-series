// Records every episode in episodes.mjs from the real app into public/recordings/:
// <id>.webm (the screen) and <id>.json (captions, narration and focus rings on a
// timeline). With a voice configured, every line is voiced first and each step
// holds for its narration.
//
//   npm run record                  # all episodes, from a fresh demo state
//   npm run record -- 04-stages     # only some (state carries over from the last run;
//                                   # --fresh resets it first)
//   npm run record -- --rebuild     # re-prepare the demo data (stack.prepare) first
import { chromium } from "playwright";
import { mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../series.config.mjs";
import stack from "../stack.mjs";
import { EPISODES } from "../episodes.mjs";
import { offsetFor } from "./clock.mjs";
import { Director } from "./director.mjs";
import { findVideoOffset } from "./sync.mjs";
import { allSpoken, Narrator } from "./voice.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/recordings");
const TMP = path.join(ROOT, ".video-tmp");

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const episodes = only.length ? EPISODES.filter((e) => only.includes(e.id)) : EPISODES;
if (only.length && episodes.length !== only.length) throw new Error(`unknown episode id in: ${only.join(" ")}`);

if (args.includes("--rebuild") || !(await stack.isPrepared())) await stack.prepare();
// Episodes chain like one working session, so a run that starts at the top starts clean.
if (!only.length || only.includes(EPISODES[0].id) || args.includes("--fresh")) await stack.reset();
mkdirSync(OUT, { recursive: true });

const narrator = Narrator.fromConfig();
if (narrator) {
  // Voice the episodes being recorded before the browser starts, so API latency never shows on screen.
  for (const text of allSpoken(episodes, EPISODES)) await narrator.line(text);
  console.log(`[record] narration ready (${narrator.generated} new line(s))`);
} else {
  console.log("[record] no voice configured — recording silent");
}

const browser = await chromium.launch();
const contextOptions = { baseURL: stack.baseURL, locale: config.language.locale, ...stack.browserContext };

/** A request context already signed in as `user` — for setup work the viewer shouldn't see. */
const extras = [];
async function signedInRequest(user) {
  const context = await browser.newContext(contextOptions);
  extras.push(context);
  await stack.signIn(context.request, user);
  return context.request;
}

try {
  for (const episode of episodes) {
    const index = EPISODES.indexOf(episode);
    const clockOffsetMs = config.clock && episode.at ? offsetFor(config.clock, episode.at) : 0;
    console.log(`[record] ${episode.id}${episode.at ? ` at ${episode.at}` : ""}`);
    await stack.start({ clockOffsetMs });

    const input = episode.setup ? await episode.setup({ request: signedInRequest, stack }) : {};
    await Promise.all(extras.splice(0).map((c) => c.close()));

    rmSync(TMP, { recursive: true, force: true });
    const context = await browser.newContext({ ...contextOptions, viewport: config.viewport, recordVideo: { dir: TMP, size: config.viewport } });
    await Director.prepare(context, { clockOffsetMs, cursorColor: config.brand.colors.accent });
    if (episode.login) await stack.signIn(context.request, episode.login);

    const titleAudio = narrator ? await narrator.line(config.strings.spokenTitle(index + 1, episode.title)) : null;
    const page = await context.newPage();
    const meta = { id: episode.id, title: episode.title, subtitle: episode.subtitle, titleAudio };
    const director = new Director(page, { meta, viewport: config.viewport, narrator });
    try {
      await episode.run(director, page, input);
      await director.wait(800);
    } catch (err) {
      await page.screenshot({ path: path.join(OUT, `${episode.id}.failed.png`) });
      throw err;
    } finally {
      await context.close();
    }
    const video = path.join(OUT, `${episode.id}.webm`);
    renameSync(await page.video().path(), video);
    const start = director.events.find((e) => e.type === "start");
    if (!start) throw new Error(`${episode.id}: call \`await d.ready()\` once the first screen is presentable`);
    director.write(path.join(OUT, `${episode.id}.json`), `recordings/${episode.id}.webm`, findVideoOffset(video, start.t));
  }
} finally {
  await browser.close();
  await stack.stop();
  rmSync(TMP, { recursive: true, force: true });
}
