# Voice-over

## Contents
1. Setup
2. Choosing a voice
3. Model and settings
4. Cache and cost
5. Alternatives

## 1. Setup

The key lives in `.env` next to `package.json` (`ELEVENLABS_API_KEY=…`,
gitignored); npm scripts load it with `--env-file-if-exists`. Never read or
print the key yourself; check presence with `[ -n "$ELEVENLABS_API_KEY" ]` at
most. If the user created `.env` and the scripts don't see it, the usual cause
is a different checkout or worktree — give them the absolute path.

Without `voice.voiceId` the series records silent with captions only — a fine
first pass while the scripts settle.

## 2. Choosing a voice

```bash
npm run voice -- preview egyptian male     # or: saudi female, british …
npm run voice -- voices egyptian           # just list, with preview URLs
```

`preview` looks up the library's own accent code for your filter, takes the
most-used matching voices, and voices `voice.preview.lines` with each into
`out/previews/`. Choose those lines deliberately: the ones with names, numbers
and ambiguous words — that's where voices differ. Send the files to the user
and let them pick by ear; you can't hear them. Library voices work by ID in
text-to-speech without adding them to the account.

Prefer "narrative"/"conversational" voices with a description in the target
dialect; "dramatic"/"cheerful" styles tire over eight episodes.

## 3. Model and settings

The model is the user's choice; ask them (SKILL.md step 0) and don't default
silently. Always offer the list from the account rather than from memory, since
ElevenLabs ships new models often:

```bash
npm run voice -- models     # TTS models that support language.code; * = current
```

- `eleven_v4` is the default and the recommended option: 90+ languages and the
  most natural delivery. In one Egyptian-Arabic series, v4's pacing was within
  ±0.7 s per line of v2's, so switching doesn't disturb the timing.
- `eleven_multilingual_v2` is the fallback: proven on Arabic and it honours
  vowel marks. Offer it when a word keeps being misread on v4.
- To compare, set `modelId`, run `npm run record -- <one-id> && npm run render
  -- <one-id>`, and keep both MP4s. The recorder voices only the episodes being
  recorded, so that costs about 10 clips. Then restore the model; the old clips
  are still cached. Send both to the user and let them choose by ear.
- Changing the model re-voices everything, so confirm with the user before
  switching an already-recorded series.
- `speed: 0.95` — a touch slower than default; viewers are also watching.
- `stability` 0.5–0.6 keeps a consistent narrator across 50+ separate clips.
- `style` low (≤0.2): high style varies delivery line to line.

## 4. Cache and cost

Every line is cached in `public/voice/<hash>.mp3` keyed by (voice, model,
settings, spoken text); `public/voice/index.json` holds durations. Editing one
line re-voices only that line; changing voice/model/settings re-voices all.
`npm run voice` prints the series' character count — a typical 8-episode
series is ~3–4k characters including spoken titles; previews ~100–250
characters per voice. `record` voices the episodes it records before opening the browser,
so API latency never shows on screen.

## 5. Alternatives

The engine's provider is ElevenLabs; swapping is one function (`tts()` in
`engine/voice.mjs`): return MP3 bytes for (voiceId, text). Options by
strength: Azure Neural (strong regional Arabic voices, e.g. `ar-SA-*`,
`ar-EG-*`), Google Chirp/WaveNet, OpenAI TTS (less native-sounding in Arabic),
OS voices (robotic — placeholders only), or a human read: record one file per
line named by the cache key and drop them in `public/voice/` (`index.json`
gets the durations on the next run).
