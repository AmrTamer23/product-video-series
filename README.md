# product-video-series

A [Claude Code](https://claude.com/claude-code) skill for producing a narrated
video series that introduces a web app to new users — onboarding, "getting
started" and training videos — recorded from the **real running app** and
composed with [Remotion](https://www.remotion.dev).

- **Real screens**: Playwright drives the app with a drawn, gliding cursor and
  human-speed typing; no mockups.
- **Narration in any language or dialect**: captions plus
  [ElevenLabs](https://elevenlabs.io) voice-over, with each step holding exactly
  as long as its line, so voice and screen stay in sync by construction.
  Presets for English and three Arabic registers: Modern Standard, Egyptian
  and Gulf.
- **Repeatable demos**: seeded data cloned per run, and a shifted clock (app
  servers, Postgres and browser) so every re-recording shows the same plausible
  weekday morning.
- **Polished frame**: branded intro with a spoken title, spotlight and gentle
  camera on what's being explained, captions, an outro announcing the next
  episode; 1920×1080 H.264 output.
- **Videos that don't go stale**: `npm run check` replays every episode fast
  against the app and fails when a step's element is gone or a label the
  narration quotes is no longer on screen. `check -- labels` does the label
  check against your i18n files in seconds, so it can run on every PR.
- **The method, not just code**: how to plan a series for newcomers, write
  scripts for the ear (including Arabic vowel-mark pitfalls in TTS), pick a
  voice, and QA before rendering.

## Install

Clone into your user skills folder; Claude Code then offers it in every project:

```bash
git clone https://github.com/AmrTamer23/product-video-series ~/.claude/skills/product-video-series
```

Update later with `git -C ~/.claude/skills/product-video-series pull`.

## Use

In any project, ask Claude Code for it in plain words, such as "make a series
of short videos showing new staff how to use the system, narrated in Egyptian
Arabic". Before it builds anything, Claude asks you four things: who the videos
are for, the language and dialect (for Arabic: MSA, Egyptian or Gulf), the
ElevenLabs model, and the voice. Nothing gets voiced until you've answered.

Or scaffold directly:

```bash
node ~/.claude/skills/product-video-series/scripts/init.mjs docs/videos \
  --brand "Acme" --base-url http://localhost:3000 --lang ar --strings ar-egyptian \
  --model eleven_v4
cd docs/videos && npm install && npx playwright install chromium ffmpeg
```

| Flag | Values |
|---|---|
| `--lang` | `en` (default) or `ar` |
| `--strings` | frame-text preset: `en`, `ar-msa`, `ar-egyptian`, `ar-gulf` (add your own in `engine/strings.mjs`) |
| `--model` | ElevenLabs model id; default `eleven_v4`, with `eleven_multilingual_v2` as the proven fallback |
| `--locale`, `--name` | date/number locale (`ar-SA`, `en-US` …) and the series name |

Then fill in three files and run:

| File | What goes in it |
|---|---|
| `stack.mjs` | how to reach the app, sign in, and (optionally) reset its data and start it on a shifted clock |
| `episodes.mjs` | the series: per episode a narration script and the actions that perform it |
| `series.config.mjs` | language, frame text, brand colours and logo, demo day, voice |

```bash
npm run voice -- models                  # the account's TTS models for your language (* = current)
npm run voice -- preview egyptian male   # audition library voices on your hardest lines
npm run record                           # voice and record every episode (or: record -- <id>)
npm run studio                           # check in Remotion Studio
npm run render                           # out/<episode>.mp4
npm run check                            # later: do the videos still match the app?
npm run check -- labels                  # no browser: quoted labels vs your i18n files (CI-friendly)
```

The ElevenLabs key goes in `.env` next to `package.json`
(`ELEVENLABS_API_KEY=…`, gitignored). Without a voice configured, the series
records silent with captions.

Every voiced line is cached, keyed by voice, model, settings and text, so
editing one line re-voices only that line. Changing the model or voice
re-voices the whole series. To compare models cheaply, record a single episode
on each: `record` voices only the episodes it records. A typical 8–12 episode
series is a few thousand characters of TTS.

## Requirements

Node 20+, a web app you can run or reach, and for narration an ElevenLabs
account. A managed demo stack additionally needs whatever the app needs
(e.g. Docker for Postgres).

## Licensing

This skill is [MIT](LICENSE). The tools it drives have their own terms:

- **Remotion** is not MIT. It is free for individuals, for-profit companies
  with up to 3 employees, non-profits, and for evaluation. Larger for-profit
  organizations need a [Remotion Company License](https://www.remotion.pro/license).
  Read the [Remotion license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
  before you render for a company.
- **ElevenLabs** voice-over is subject to your ElevenLabs plan. Check that
  your plan covers commercial use of the voices you pick, including library
  voices.
- **Playwright** is Apache-2.0.

## Layout

```
SKILL.md          the workflow Claude follows
references/       planning, demo stack, language, voice, recording, composition, keeping in sync
scripts/          init.mjs (scaffold), explore.mjs (page screenshots + element outline)
template/         what init copies into a project: engine/, src/, and the three project files
LICENSE           MIT
```
