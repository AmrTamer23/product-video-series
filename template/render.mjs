// Renders every episode to out/<id>.mp4 (or only the ids given).
import { execFileSync } from "node:child_process";
import { EPISODES } from "./episodes.mjs";

const only = process.argv.slice(2);
for (const ep of EPISODES.filter((e) => !only.length || only.includes(e.id))) {
  execFileSync("npx", ["remotion", "render", `ep${ep.id}`, `out/${ep.id}.mp4`], { stdio: "inherit" });
}
