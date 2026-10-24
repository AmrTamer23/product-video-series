#!/usr/bin/env node
// Walks pages of the app as one user and saves, per page, a screenshot plus a
// text file with the URL, the visible text and an outline of the landmarks
// worth writing selectors against (roles, data-slot/data-testid, headings,
// buttons, links) with their on-screen boxes.
//
//   node explore.mjs <video-project-dir> [--user <login>] [--start] <path> [<path> …]
//
// Uses the project's stack.mjs for baseURL, browserContext and signIn; with
// --start it also resets and starts the stack (managed stacks) and stops it after.
// Output: <video-project-dir>/out/explore/<page>.png|.txt
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const project = path.resolve(args[0] ?? ".");
const flag = (name) => args.includes(`--${name}`);
const value = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const pages = args.slice(1).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--user"));

const requireFromProject = createRequire(path.join(project, "package.json"));
const { chromium } = await import(pathToFileURL(requireFromProject.resolve("playwright")).href);
const stack = (await import(pathToFileURL(path.join(project, "stack.mjs")).href)).default;
const config = (await import(pathToFileURL(path.join(project, "series.config.mjs")).href)).default;

const OUTLINE = () => {
  const out = [];
  const tags = new Set(["h1", "h2", "h3", "header", "nav", "main", "aside", "section", "table", "form", "a", "button", "input", "textarea", "select", "label"]);
  const walk = (el, depth) => {
    const slot = el.getAttribute?.("data-slot") || el.getAttribute?.("data-testid");
    const role = el.getAttribute?.("role");
    const tag = el.tagName.toLowerCase();
    let d = depth;
    if ((slot || role || tags.has(tag)) && el.getBoundingClientRect().width > 0) {
      const r = el.getBoundingClientRect();
      const name = el.getAttribute("aria-label") || el.getAttribute("placeholder") || (el.innerText || "").replace(/\s+/g, " ").slice(0, 60);
      out.push(`${"  ".repeat(depth)}${tag}${slot ? `[${slot}]` : ""}${role ? `[role=${role}]` : ""} (${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}) ${name}`);
      d++;
    }
    for (const c of el.children) walk(c, d);
  };
  walk(document.body, 0);
  return out.join("\n");
};

const outDir = path.join(project, "out/explore");
mkdirSync(outDir, { recursive: true });
if (flag("start")) {
  await stack.reset();
  await stack.start({ clockOffsetMs: 0 });
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ baseURL: stack.baseURL, locale: config.language.locale, viewport: config.viewport, ...stack.browserContext });
  if (value("user")) await stack.signIn(context.request, value("user"));
  const page = await context.newPage();
  for (const p of pages.length ? pages : ["/"]) {
    await page.goto(p);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    const name = p.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_") || "home";
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    const text = (await page.locator("body").innerText()).replace(/\n{2,}/g, "\n");
    writeFileSync(path.join(outDir, `${name}.txt`), `URL ${page.url()}\n\n== OUTLINE ==\n${await page.evaluate(OUTLINE)}\n\n== TEXT ==\n${text}`);
    console.log(`[explore] ${p} → out/explore/${name}.png|.txt`);
  }
} finally {
  await browser.close();
  if (flag("start")) await stack.stop();
}
