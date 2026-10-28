// Does the series still match the app? Runs every episode's steps against the
// real app, fast (no video, no voice, short waits), and checks that each label
// the narration quotes was on screen. A renamed button, a moved tab or a changed
// flow fails here, long before someone notices a video explaining the old UI.
//
//   npm run check                         # every episode, from a fresh demo state
//   npm run check -- 08-requests          # only some (state carries over; --fresh resets it)
//   npm run check -- labels               # no browser: quoted labels vs the app's text catalogs
//   npm run check -- --since origin/main  # also flag episodes whose `covers` files changed
//   npm run check -- --warn               # report, but exit 0 (CI warning only)
//
// Writes out/check/report.md (paste into a PR comment), report.json, and
// out/check/<id>.png for every episode that failed.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../series.config.mjs";
import { EPISODES } from "../episodes.mjs";
import { catalog, episodeLabels, isDynamic, missingFrom, normalize } from "./labels.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out/check");
const check = config.check ?? {};

const args = process.argv.slice(2);
const sinceAt = args.indexOf("--since");
const since = sinceAt >= 0 ? args[sinceAt + 1] : null;
const positional = args.filter((a, i) => !a.startsWith("--") && !(sinceAt >= 0 && i === sinceAt + 1));
const labelsOnly = positional[0] === "labels";
const only = labelsOnly ? positional.slice(1) : positional;
const episodes = only.length ? EPISODES.filter((e) => only.includes(e.id)) : EPISODES;
if (only.length && episodes.length !== only.length) throw new Error(`unknown episode id in: ${only.join(" ")}`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const results = episodes.map((e) => ({ id: e.id, title: e.title, error: null, missing: [], changed: [], screenshot: null }));
const resultFor = (episode) => results.find((r) => r.id === episode.id);
const labelOpts = { quotes: check.quotes, ignore: check.ignoreLabels };

if (labelsOnly) {
  if (!check.catalogs?.length) {
    console.log("[check] set series.config.mjs → check.catalogs to the app's text catalogs (files or folders) to check labels without a browser");
    process.exit(0);
  }
  const known = catalog(check.catalogs, ROOT);
  for (const episode of episodes) {
    resultFor(episode).missing = missingFrom(episodeLabels(episode, labelOpts).filter((l) => !isDynamic(l.label)), known);
  }
} else {
  await runEpisodes();
}

if (since) markChanged(since);
report();

async function runEpisodes() {
  const { chromium } = await import("playwright");
  const stack = (await import("../stack.mjs")).default;
  const { offsetFor } = await import("./clock.mjs");
  const { Director } = await import("./director.mjs");

  if (args.includes("--rebuild") || !(await stack.isPrepared())) await stack.prepare();
  if (!only.length || only.includes(EPISODES[0].id) || args.includes("--fresh")) await stack.reset();

  const browser = await chromium.launch();
  const contextOptions = { baseURL: stack.baseURL, locale: config.language.locale, ...stack.browserContext, viewport: config.viewport };
  const extras = [];
  const signedInRequest = async (user) => {
    const context = await browser.newContext(contextOptions);
    extras.push(context);
    await stack.signIn(context.request, user);
    return context.request;
  };

  try {
    for (const episode of episodes) {
      const result = resultFor(episode);
      const clockOffsetMs = config.clock && episode.at ? offsetFor(config.clock, episode.at) : 0;
      await stack.start({ clockOffsetMs });
      const context = await browser.newContext(contextOptions);
      let page = null;
      try {
        const input = episode.setup ? await episode.setup({ request: signedInRequest, stack }) : {};
        await Promise.all(extras.splice(0).map((c) => c.close()));
        await Director.prepare(context, { clockOffsetMs });
        if (episode.login) await stack.signIn(context.request, episode.login);
        page = await context.newPage();
        // A missing element should fail in seconds, not after Playwright's 30 s default.
        page.setDefaultTimeout(check.timeoutMs ?? 10_000);
        const director = new Director(page, { meta: { id: episode.id }, viewport: config.viewport, fast: true });
        await episode.run(director, page, input);
        if (director.unread?.()) throw new Error(`${director.unread()} script line(s) never used`);
        result.missing = missingFrom(episodeLabels(episode, labelOpts), { text: normalize(director.screens.join("\n")) });
      } catch (err) {
        // Playwright's first line says what timed out; its call log names the element it was waiting for.
        const lines = err.message.split("\n").map((l) => l.trim()).filter(Boolean);
        result.error = [lines[0], lines.find((l) => /^- waiting for /.test(l))?.slice(2)].filter(Boolean).join(" — ");
        result.screenshot = page && path.join(OUT, `${episode.id}.png`);
        if (page) await page.screenshot({ path: result.screenshot }).catch(() => (result.screenshot = null));
      } finally {
        await context.close();
      }
      console.log(`[check] ${result.error || result.missing.length ? "FAIL" : "ok  "} ${episode.id}`);
    }
  } finally {
    await browser.close();
    await stack.stop();
  }
}

/** Files changed since `ref` (plus uncommitted work) that an episode's `covers` globs match. */
function markChanged(ref) {
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
  const top = git("rev-parse", "--show-toplevel");
  const files = [...new Set([...git("diff", "--name-only", `${ref}...HEAD`).split("\n"), ...git("diff", "--name-only", "HEAD").split("\n")])].filter(Boolean);
  for (const episode of episodes) {
    const globs = (episode.covers ?? []).map(globToRegExp);
    resultFor(episode).changed = files.filter((f) => globs.some((g) => g.test(f)));
  }
  if (!episodes.some((e) => e.covers?.length)) console.log(`[check] --since: no episode lists \`covers\` (repo-relative globs under ${top})`);
}

/** "apps/web/src/app/requests/**" → a RegExp over repo-relative paths. */
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function report() {
  const failed = results.filter((r) => r.error || r.missing.length);
  const stale = results.filter((r) => !failed.includes(r) && r.changed.length);
  const rows = results.map((r) => {
    const status = r.error ? "❌ steps fail" : r.missing.length ? "❌ labels gone" : r.changed.length ? "⚠️ covered files changed" : "✅";
    const detail = [r.error, r.missing.length && `not found: ${r.missing.map((m) => `${m.label} (line ${m.line})`).join(", ")}`, r.changed.length && `${r.changed.length} changed: ${r.changed.slice(0, 3).join(", ")}${r.changed.length > 3 ? " …" : ""}`]
      .filter(Boolean)
      .join("<br>");
    return `| \`${r.id}\` | ${status} | ${detail.replaceAll("|", "\\|")} |`;
  });
  const rerecord = [...failed, ...stale].map((r) => r.id);
  const md = [
    `### Video series check${labelsOnly ? " (labels vs catalogs)" : ""}`,
    "",
    failed.length ? `${failed.length} of ${results.length} episode(s) no longer match the app.` : `All ${results.length} episode(s) still match the app.`,
    stale.length ? `${stale.length} passed but cover files this change touched; watch them before trusting them.` : "",
    "",
    "| Episode | Status | Detail |",
    "|---|---|---|",
    ...rows,
    "",
    failed.length ? `Fix the steps or script, check again, then re-record: \`npm run record -- ${rerecord.join(" ")} && npm run render -- ${rerecord.join(" ")}\`` : "",
    !failed.length && stale.length ? `If they look different now, re-record: \`npm run record -- ${rerecord.join(" ")} && npm run render -- ${rerecord.join(" ")}\`` : "",
  ].filter((l, i, all) => l !== "" || all[i - 1] !== "");
  writeFileSync(path.join(OUT, "report.md"), md.join("\n") + "\n");
  writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ since, labelsOnly, results }, null, 2));
  console.log("\n" + md.join("\n"));
  if (failed.length && !args.includes("--warn")) process.exit(1);
}
