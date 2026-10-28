// The UI labels a script quotes («Save», “Request leave”), and where to look for
// them: on the screen during `npm run check`, or in the app's text catalogs for
// `npm run check -- labels`. A label the app no longer shows is a video that
// no longer matches the product.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { shown } from "./director.mjs";

const DEFAULT_QUOTES = [["«", "»"], ["“", "”"], ['"', '"']];
const CATALOG_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".arb", ".po", ".strings", ".xml", ".yml", ".yaml", ".properties", ".resx"]);

/** Case, vowel marks, tatweel and spacing don't make a label different. */
export const normalize = (s) =>
  s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** The labels quoted in one script line (its caption text, not its `say`). */
export function quotedLabels(line, quotes = DEFAULT_QUOTES) {
  const text = shown(line);
  const labels = [];
  for (const [open, close] of quotes) {
    let at = 0;
    for (;;) {
      const start = text.indexOf(open, at);
      if (start < 0) break;
      const end = text.indexOf(close, start + open.length);
      if (end < 0) break;
      const label = text.slice(start + open.length, end).trim();
      if (label) labels.push(label);
      at = end + close.length;
    }
  }
  return [...new Set(labels)];
}

/** Every quoted label in an episode, with the line it came from. */
export function episodeLabels(episode, { quotes, ignore = [] } = {}) {
  const skip = new Set(ignore.map(normalize));
  return episode.script.flatMap((line, i) => quotedLabels(line, quotes).filter((l) => !skip.has(normalize(l))).map((label) => ({ label, line: i + 1 })));
}

/** A label with a number in it ("3 tasks") comes from data, not from a catalog string. */
export const isDynamic = (label) => /[0-9٠-٩]/.test(label);

/**
 * All text in the given catalog files and folders (relative to `root`): `text`,
 * normalized as one string, and `templates`, its strings with placeholders
 * ("Remind {name}", "Remind %s") as patterns that a filled-in label matches.
 */
export function catalog(entries, root) {
  const parts = [];
  const walk = (p) => {
    const st = statSync(p);
    if (st.isDirectory()) {
      for (const name of readdirSync(p)) if (name !== "node_modules" && !name.startsWith(".")) walk(path.join(p, name));
    } else if (CATALOG_EXT.has(path.extname(p))) {
      parts.push(readFileSync(p, "utf8"));
    }
  };
  for (const entry of entries) walk(path.resolve(root, entry));
  // Unescape \uXXXX so JSON catalogs that store Arabic escaped still match.
  const raw = parts.join("\n").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const templates = [];
  for (const m of raw.matchAll(/(["'`])((?:(?!\1)[^\n\\]|\\.)*?(?:\{[^}\n]+\}|%[sd@]|%\d\$[sd@])(?:(?!\1)[^\n\\]|\\.)*?)\1/g)) {
    const pieces = normalize(m[2]).split(/\$?\{[^}]+\}|%[sd@]|%\d\$[sd@]/);
    if (pieces.join("").trim()) templates.push(new RegExp(`^${pieces.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+")}$`));
  }
  return { text: normalize(raw), templates };
}

/** The labels from `labels` found neither in `text` (normalized) nor as a filled-in template. */
export const missingFrom = (labels, { text, templates = [] }) =>
  labels.filter(({ label }) => {
    const l = normalize(label);
    return !text.includes(l) && !templates.some((t) => t.test(l));
  });
