# Composition, QA and rendering

## Contents
1. What the frame does
2. Branding
3. Captions and audio
4. QA with stills
5. Rendering and delivery

## 1. What the frame does

Per episode (`src/Episode.tsx`, 1920×1080, 30 fps):

- **Intro card** — kicker ("Episode 3 of 8"), title, subtitle, logo; the
  spoken title plays here and the card lasts at least 3 s or as long as it.
- **Screen** — the recording at up to 1440×810 in a rounded frame, top bar
  with the title and a progress-dot row, captions underneath.
- **Focus** — each `point` dims everything else (SVG mask) and rings the
  target in the accent colour; a camera eases toward small targets (≤1.3×)
  and pans between back-to-back focuses without pulling out. The screen layer
  is pinned `left: 0; direction: ltr` so zoom math holds in RTL compositions.
- **Outro** — "Next episode: …" or the series-end line.

Timeline JSON → frames: `frameOf(t) = (t − start) × fps`; video trimmed at
`(start + videoOffset) × fps` where `videoOffset` comes from the sync flash.

## 2. Branding

`series.config.mjs → brand`: name, two-part wordmark, logo path in `public/`
(use the app's favicon/icon SVG), colours (take them from the app's design
tokens — bg from its darkest surface, accent from its primary). Font in
`src/theme.ts` — use the app's own typeface so the frame and the product match.

## 3. Captions and audio

- One caption at a time; it appears with its line (3 frames early) and stays
  until the next, so there's always text on screen during an action.
- Caption box max width = screen width; 36 px, line-height 1.55; the accent
  bar sits on the reading-start side automatically (flex follows `dir`).
- Narration: one `<Audio>` per caption at its frame; the title audio on the
  intro. No music by default — if added, duck it well under the voice.

## 4. QA with stills

Before rendering everything, render stills and look at them:

```bash
npx remotion still ep03-my-work /tmp/s.png --frame=330
```

Pick frames from the timeline (`90 + (t − start) × 30` ≈ inside a focus).
Check: intro text fits; focus ring frames the right block; camera doesn't show
past the recording's edge; caption is the one for that moment; nothing of the
app is blurred/blank (clock or animation issues); RTL text and punctuation
render correctly. Render one full episode and watch/listen for drift between
voice and action before rendering the series.

## 5. Rendering and delivery

`npm run render` (or `npm run render -- 03-my-work`) → `out/<id>.mp4`, h264
CRF 18, typically 1–6 MB per minute of UI. Verify each file's duration with
`npx remotion ffprobe`. Deliver the MP4s; keep `public/recordings/` and
`public/voice/` out of git (regenerable) but keep the scripts, config and
stack adapter in git so the series can be re-recorded when the UI changes.
