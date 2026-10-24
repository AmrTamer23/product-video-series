// Narration through ElevenLabs text-to-speech. Every line is cached in
// public/voice/ under a hash of (voice, model, settings, text), so re-recording
// only pays for lines that changed.
//
//   npm run voice                                  # voice every line of every episode
//   npm run voice -- preview [accent] [gender]     # one sample per matching library voice → out/previews/
//   npm run voice -- voices [accent]               # list library voices in the series language
//
// The key comes from ELEVENLABS_API_KEY (npm scripts load a gitignored .env);
// the voice and the preview filters live in series.config.mjs → voice.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../series.config.mjs";
import { spoken } from "./director.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const DIR = "voice";
const API = "https://api.elevenlabs.io";
const voice = config.voice ?? {};

function durationOf(file) {
  const out = execFileSync("npx", ["remotion", "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return Number(out.trim());
}

async function tts(voiceId, text) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set — add it to .env next to package.json");
  const res = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: voice.modelId, voice_settings: voice.voiceSettings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

export class Narrator {
  constructor() {
    this.indexFile = path.join(PUBLIC, DIR, "index.json");
    mkdirSync(path.dirname(this.indexFile), { recursive: true });
    this.index = existsSync(this.indexFile) ? JSON.parse(readFileSync(this.indexFile, "utf8")) : {};
    this.generated = 0;
  }

  /** A narrator when a voice is configured, otherwise null (the series records silent). */
  static fromConfig() {
    return voice.voiceId ? new Narrator() : null;
  }

  /** `{ file, duration }` for a line, generating it on a cache miss. */
  async line(text) {
    const key = createHash("sha256")
      .update(JSON.stringify([voice.voiceId, voice.modelId, voice.voiceSettings, text]))
      .digest("hex")
      .slice(0, 20);
    const file = `${DIR}/${key}.mp3`;
    const abs = path.join(PUBLIC, file);
    if (!existsSync(abs)) {
      writeFileSync(abs, await tts(voice.voiceId, text));
      this.generated += 1;
    }
    if (!this.index[key]) {
      this.index[key] = { text, duration: durationOf(abs) };
      writeFileSync(this.indexFile, JSON.stringify(this.index, null, 2));
    }
    return { file, duration: this.index[key].duration };
  }
}

/** Everything the series says aloud, in order: each intro's spoken title, then the episode's lines. */
export function allSpoken(episodes) {
  return episodes.flatMap((ep, i) => [config.strings.spokenTitle(i + 1, ep.title), ...ep.script.map(spoken)]);
}

async function voiceAll() {
  const { EPISODES } = await import("../episodes.mjs");
  const narrator = Narrator.fromConfig();
  if (!narrator) throw new Error("No voice.voiceId in series.config.mjs — pick one with `npm run voice -- preview`");
  const lines = allSpoken(EPISODES);
  for (const text of lines) await narrator.line(text);
  const chars = lines.reduce((n, t) => n + t.length, 0);
  console.log(`[voice] ${narrator.generated} new line(s); ${chars} characters across the series`);
}

async function libraryVoices(accent, gender, pageSize = 40) {
  const params = new URLSearchParams({ language: config.language.code, page_size: String(pageSize), sort: "usage_character_count_1y" });
  if (accent) {
    // Use the library's own accent code when one matches ("egyptian", "saudi", …).
    const res = await fetch(`${API}/v1/voices/accents?language=${config.language.code}`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } });
    const known = res.ok ? [await res.json()].flat(2).map((a) => a?.accent ?? a).filter((a) => typeof a === "string") : [];
    params.set("accent", known.find((a) => a.toLowerCase().includes(accent.toLowerCase())) ?? accent);
  }
  if (gender) params.set("gender", gender);
  const res = await fetch(`${API}/v1/shared-voices?${params}`, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return (await res.json()).voices;
}

/** One sample per voice, reading lines worth hearing (config.voice.preview.lines, else the first two). */
async function preview(accent = voice.preview?.accent, gender = voice.preview?.gender) {
  const { EPISODES } = await import("../episodes.mjs");
  const picks = voice.preview?.lines ?? [[0, 0], [0, 1]];
  const sample = picks.map(([e, l]) => spoken(EPISODES[e].script[l])).join(" ");
  const dir = path.join(ROOT, "out/previews");
  mkdirSync(dir, { recursive: true });
  const voices = (await libraryVoices(accent, gender, 8)).slice(0, voice.preview?.count ?? 5);
  console.log(`[voice] ${voices.length} voice(s); sample: ${sample}`);
  for (const v of voices) {
    const file = path.join(dir, `${v.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${v.voice_id}.mp3`);
    writeFileSync(file, await tts(v.voice_id, sample));
    console.log([path.basename(file), v.gender, v.age, v.accent, v.use_case, v.description?.slice(0, 80)].join(" | "));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "preview") await preview(rest[0], rest[1]);
  else if (cmd === "voices") {
    for (const v of await libraryVoices(rest[0], rest[1])) console.log([v.name, v.gender, v.age, v.accent, v.use_case, v.voice_id, v.preview_url].join(" | "));
  } else await voiceAll();
}
