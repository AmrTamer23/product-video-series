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
  Presets for English, Modern Standard Arabic and Egyptian Arabic.
- **Repeatable demos**: seeded data cloned per run, and a shifted clock (app
  servers, Postgres and browser) so every re-recording shows the same plausible
  weekday morning.
- **Polished frame**: branded intro with a spoken title, spotlight and gentle
  camera on what's being explained, captions, an outro announcing the next
  episode; 1920×1080 H.264 output.
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

In any project, ask Claude Code for it in plain words — "make a series of short
videos showing new staff how to use the system, narrated in Egyptian Arabic" —
or scaffold directly:

```bash
node ~/.claude/skills/product-video-series/scripts/init.mjs docs/videos \
  --brand "Acme" --base-url http://localhost:3000 --lang ar --strings ar-egyptian
cd docs/videos && npm install && npx playwright install chromium ffmpeg
```

Then fill in three files and run:

| File | What goes in it |
|---|---|
| `stack.mjs` | how to reach the app, sign in, and (optionally) reset its data and start it on a shifted clock |
| `episodes.mjs` | the series: per episode a narration script and the actions that perform it |
| `series.config.mjs` | language, frame text, brand colours and logo, demo day, voice |

```bash
npm run voice -- preview egyptian male   # audition library voices on your hardest lines
npm run record                           # voice every line, record every episode
npm run studio                           # check in Remotion Studio
npm run render                           # out/<episode>.mp4
```

The ElevenLabs key goes in `.env` next to `package.json`
(`ELEVENLABS_API_KEY=…`, gitignored). Without a voice configured, the series
records silent with captions.

## Requirements

Node 20+, a web app you can run or reach, and for narration an ElevenLabs
account. A managed demo stack additionally needs whatever the app needs
(e.g. Docker for Postgres).

## Layout

```
SKILL.md          the workflow Claude follows
references/       planning, demo stack, language, voice, recording, composition
scripts/          init.mjs (scaffold), explore.mjs (page screenshots + element outline)
template/         what init copies into a project: engine/, src/, and the three project files
```
