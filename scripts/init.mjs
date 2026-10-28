#!/usr/bin/env node
// Scaffolds a video-series project from ../template.
//
//   node init.mjs <target-dir> --brand "Acme" --base-url http://localhost:3000 \
//     [--lang en|ar] [--strings en|ar-msa|ar-egyptian|ar-gulf] [--locale en-US] [--model <elevenlabs model id>] [--name onboarding]
//
// Refuses to write into a non-empty directory. Prints the next steps.
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../template");

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--"));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
if (!target) {
  console.error("usage: init.mjs <target-dir> --brand <name> --base-url <url> [--lang en|ar] [--strings <preset>] [--locale <locale>] [--model <id>]");
  process.exit(1);
}

const lang = opt("lang", "en");
const preset = opt("strings", lang === "ar" ? "ar-msa" : "en");
const values = {
  __SERIES_NAME__: opt("name", "onboarding"),
  __PACKAGE_NAME__: `${opt("name", "onboarding")}-videos`,
  __LANG__: lang,
  __LOCALE__: opt("locale", lang === "ar" ? "ar-SA" : "en-US"),
  __DIR__: lang === "ar" ? "rtl" : "ltr",
  __STRINGS_PRESET__: preset,
  __MODEL__: opt("model", "eleven_v4"),
  __BRAND__: opt("brand", "Product"),
  __BASE_URL__: opt("base-url", "http://localhost:3000"),
  __VOICE_NOTES__:
    preset === "ar-egyptian"
      ? "Egyptian colloquial, first person plural (بندوس…); UI labels quoted verbatim in «»"
      : preset === "ar-msa"
        ? "Modern Standard Arabic, first person plural (نضغط…); UI labels quoted verbatim in «»"
        : "Plain, direct English, first person plural (we click…); UI labels quoted verbatim",
};

const dest = path.resolve(target);
if (existsSync(dest) && readdirSync(dest).length) {
  console.error(`${dest} is not empty — pick a new directory.`);
  process.exit(1);
}
cpSync(TEMPLATE, dest, { recursive: true });

// Fill placeholders in text files; episode placeholders stay for the author.
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
for (const file of walk(dest)) {
  if (!/\.(mjs|ts|tsx|json|md)$/.test(file)) continue;
  let s = readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(values)) s = s.replaceAll(k, v);
  writeFileSync(file, s);
}
if (lang !== "ar") {
  // The template's font covers Arabic; Latin-only series can use the same face's Latin subset.
  const theme = path.join(dest, "src/theme.ts");
  writeFileSync(theme, readFileSync(theme, "utf8").replace('subsets: ["arabic", "latin"]', 'subsets: ["latin"]'));
}

console.log(`Created ${dest}

Next:
  cd ${path.relative(process.cwd(), dest).startsWith("..") ? dest : path.relative(process.cwd(), dest) || "."}
  npm install && npx playwright install chromium ffmpeg
  1. stack.mjs        — how to reach the app and sign in (references/stack.md)
  2. episodes.mjs     — the series plan and scripts (references/planning.md, language.md)
  3. series.config.mjs — brand colours, logo, clock, voice
  4. npm run record → npm run studio (check) → npm run render
  5. npm run check (-- labels) — keep the videos matching the app (references/keeping-in-sync.md)`);
