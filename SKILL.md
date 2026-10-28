---
name: product-video-series
description: Produce a narrated video series that introduces a web app to new users — onboarding, "getting started", training or feature walkthrough videos — recorded from the real running app (Playwright screen capture with a drawn cursor), composed in Remotion with branded intro/outro cards, focus rings, gentle zoom, captions and ElevenLabs voice-over in any language or dialect (Arabic MSA/Egyptian/Gulf, English, …). Includes a scaffold, a reusable recording engine, demo-data and fake-clock recipes, and the script-writing rules that keep TTS from mispronouncing. Use this whenever someone wants tutorial/onboarding/demo/explainer videos, screen recordings with narration, "a series of short videos showing how to use the system", training material for new staff, or localized product walkthroughs — even if they don't say Remotion, Playwright or ElevenLabs.
---

# Product video series

Turn a running web app into a series of short narrated videos for people who
have never used it: real screens, real data, a cursor doing the real thing, and
a voice explaining it in the audience's language.

What you get per project: a `videos/`-style folder (engine + three project
files), `npm run record` → `public/recordings/*.webm|json`, `npm run render` →
`out/<id>.mp4` (1920×1080, h264).

```
<project>/docs/videos/
  series.config.mjs   language, strings, brand, demo clock, voice     ← project
  episodes.mjs        the series: per episode a script + the actions   ← project
  stack.mjs           how to reach the app, sign in, reset its data    ← project
  engine/             recorder, director, voice, clock, sync           ← framework
  src/                Remotion composition (intro, screen, captions)   ← framework
```

## How the pieces fit

1. `episodes.mjs` holds each episode's **script** (its narration, in order) and
   a `run(d, page)` that performs the episode with the **Director** `d`:
   `d.say(line())`, `d.point(locator, line())`, `d.click(...)`, `d.type(...)`.
2. `npm run record` voices every line first (ElevenLabs, cached), then for each
   episode restarts the app on the episode's demo-clock time, records the
   browser, and writes a timeline. Every step holds exactly as long as its
   narration, so voice and screen are in sync by construction.
3. Remotion turns each timeline into a video: intro card with the spoken title,
   the recording in a branded frame, spotlight + camera on each `point`, a
   caption per line, outro announcing the next episode.

## Workflow

Work through these in order; each has a reference with the details. Show the
user something concrete early (a recorded episode, a still, a voice sample) and
let their reaction steer — tone, language and pacing are judgement calls they
should make with real output in front of them.

### 0. Ask the user for the settings (required, before anything else)

Never pick these yourself, even when one looks obvious. Ask them in one round of
questions (AskUserQuestion when available) before scaffolding, because they
decide the init flags, the scripts and the voice cache:

1. **Audience**: who the videos are for (new staff, managers, clients …).
2. **Language and dialect**: for Arabic, offer the three registers the
   `arabic-content` skill uses: **MSA** (`ar-msa`), **Egyptian**
   (`ar-egyptian`) and **Gulf** (`ar-gulf`), with the product's UI language as the
   recommended option. For other languages, ask for the language and regional
   variant.
3. **ElevenLabs model**: run `npm run voice -- models` (after scaffolding and
   once the key is in `.env`; until then, ask for the model as a follow-up).
   It lists the models this account can use for the language, with `*` on the
   current one. Offer `eleven_v4` as the recommended default (first option) and
   `eleven_multilingual_v2` as the fallback, plus anything else the user names. Mention that a
   one-episode A/B is cheap: record one episode on each model and send both.
   Switching models later re-voices the whole series.
4. **Voice**: whether they have one in mind or want previews (step 6).

Record the answers: `--strings` and `--model` in init, then
`series.config.mjs → language.voice` and `voice.modelId`. Restate them back in
one line. If the user later changes the dialect or the model, ask before
re-voicing; it costs a full series of clips.

### 1. Scaffold

```bash
node ~/.claude/skills/product-video-series/scripts/init.mjs docs/videos \
  --brand "Acme" --base-url http://localhost:3000 --lang ar --strings ar-msa \
  --model eleven_v4
cd docs/videos && npm install && npx playwright install chromium ffmpeg
```

Keep it outside the app's package workspace (or exclude it) so its
dependencies don't touch the app's lockfile. Presets: `en`, `ar-msa`,
`ar-egyptian`, `ar-gulf`; add others in `engine/strings.mjs`.

### 2. Understand the system as a newcomer would

Read the project's docs, demo/seed data and roles before planning anything. Then
run the app and walk it as the target audience with
`scripts/explore.mjs` (screenshots, visible text and a DOM outline of
`data-slot`/`role` landmarks per page) — that outline is what you'll write
selectors against. → `references/planning.md`

### 3. Plan the series

One job per episode, 30–90 s, ordered as the newcomer meets them (get access →
daily start → the main screen → the core task → communication → requests →
end of day). Chain the episodes as one session so state carries forward. Pick a
demo persona whose data makes every screen meaningful. Confirm the episode
list with the user before recording. → `references/planning.md`

### 4. Make the demo deterministic

Videos must show the same plausible moment every time you re-record: seeded
data cloned fresh per run, and a shifted clock so "now" is a weekday morning
no matter when you record. Decide between attaching to a running app (fast
first cut) and a managed stack (repeatable), and write `stack.mjs`.
→ `references/stack.md`

### 5. Write the scripts

Write in the dialect the user picked in step 0: register and dialect, who speaks ("we" keeps it
gender-neutral), UI labels quoted exactly as on screen. Then write short,
direct, one-idea lines — they will be heard, not read. Give a line a `say`
variant when the voice needs a different spelling (vowel marks on an
ambiguous word, a brand name spelled out). If an Arabic-content or similar
localization skill exists, use it for the writing. → `references/language.md`

### 6. Choose the voice

`npm run voice -- preview <accent> <gender>` voices the lines you list in
`series.config.mjs → voice.preview.lines` with five library voices; let the
user pick by ear. Put lines with the hardest words in the preview — that is
where voices differ. → `references/voice.md`

### 7. Direct and record

Write each `run()` against the DOM outline, then `npm run record -- <id>` per
episode while developing, a full `npm run record` at the end. On a failure the
recorder saves `public/recordings/<id>.failed.png`. → `references/recording.md`

### 8. Check, render, deliver

Render stills at a few frames per episode (intro, each focus, outro) and look
at them before rendering everything; then `npm run render` and spot-check one
MP4. Send the videos; mention any product bugs the recording surfaced (they
always do). → `references/composition.md`

## Lessons that cost time to learn

| Symptom | Cause → fix |
|---|---|
| Page content invisible in the recording | Playwright's `clock.install` fakes timers/rAF and freezes entrance animations → shift only `Date` (the engine does). |
| Recording shows "02:27 AM", wrong weekday | Real clock at record time → `series.config.clock` + a managed stack. |
| Captions drift from the action | Playwright video doesn't start at a known time → `d.ready()` flashes magenta; `sync.mjs` finds it. Always call `d.ready()`. |
| Zoomed recording shows an empty strip | RTL composition anchors absolutely-positioned boxes to the right → the screen layer is pinned `left:0; direction:ltr` (done in `Screen.tsx`). |
| Voice reads a word with the wrong meaning | Unvowelled/ambiguous spelling → rewrite more directly, then `say` with targeted marks. |
| Lines shift after one is skipped | A conditional step (a tour that may not appear) must still consume its line: `else line()`. |
| Re-recording one episode breaks | Episodes chain state → re-run from that episode with prior state, or `--fresh` / full run. |
| Remotion renders someone else's page | Port 3000 taken → `remotion.config.ts` sets studio/renderer ports. |
| App's dev overlay / hydration noise | Record a production build (`next build && next start`), not the dev server. |

## Reference files

- `references/planning.md` — discovering the system, the episode template, persona, chaining, the plan to show the user
- `references/stack.md` — attach vs managed stacks, seeding, template DB cloning, the three-layer clock (Node / Postgres / browser), ports and builds
- `references/language.md` — language settings, writing for the ear, `{ text, say }`, Arabic (MSA vs dialect, tashkeel, passive traps), linting
- `references/voice.md` — ElevenLabs setup, previews, models/settings, caching and cost, alternatives
- `references/recording.md` — Director API, selector strategy, timing, conditional UI, debugging failures
- `references/composition.md` — the frame, camera/spotlight, captions and audio, branding, stills QA, rendering
