# Keeping the videos in sync with the app

## Contents
1. Why videos go stale
2. The checks
3. Setting it up
4. In CI
5. When a check fails

## 1. Why videos go stale

A video goes stale without anything warning you: a button gets renamed, a tab
moves, or a flow gains a step, and the video keeps explaining the old UI. The
episodes can catch this, because each one is already a script against the real
app. Its `run()` clicks real elements, and its narration quotes real labels
(«Save», "Request leave"). If either stops existing, the video no longer matches
the product.

## 2. The checks

| Command | Needs | Catches | Speed |
|---|---|---|---|
| `npm run check -- labels` | the app's text catalogs | a quoted label is no longer in the UI text: renamed buttons, tabs, pages | seconds, no browser |
| `npm run check` | the app running (`stack.mjs`) | a step can't find its element, the flow changed, the script has unused lines, a quoted label never appeared on screen | ~10–30 s per episode |
| `npm run check -- --since <ref>` | `covers` on episodes, git | episodes whose code changed but still pass, which may now look different | adds nothing |

- **Fast mode.** `npm run check` uses the recorder's own Director in fast mode.
  Waits, glides and typing are cut short, nothing is voiced or filmed, and a
  missing element fails after 10 s (`check.timeoutMs`). During each episode it
  keeps the visible text at every line. Each label the narration quotes must
  appear in that text at some point in the episode.
- **Labels mode.** `labels` searches the app's catalog files (`check.catalogs`:
  JSON, TS/JS message files, `.po`, `.strings`, `.arb`, Android XML …) for each
  quoted label. Placeholders count: `"Remind {name}"` or `"Remind %s"` matches
  «Remind Rania». A label containing a digit («3 tasks») comes from data, so the
  static check skips it and leaves it to the on-screen check.
- **Matching rules.** Case, vowel marks, tatweel and spacing are ignored, so
  «تذكير» matches «تَذكير». A quoted word that is data rather than UI text, such
  as a demo client's name the catalog will never hold, goes in
  `check.ignoreLabels`.
- **Output.** Both modes write `out/check/report.md` (a table ready for a PR
  comment), `report.json`, and `out/check/<id>.png` for every episode that
  failed. The exit code is 1 on failure; `--warn` reports and exits 0.

## 3. Setting it up

```js
// series.config.mjs
check: {
  catalogs: ["../../apps/web/src/i18n"],  // files or folders, relative to this folder
  ignoreLabels: ["Acme Corp"],            // data, not UI text
},

// episodes.mjs: per episode, the code it shows (repo-relative globs)
covers: ["apps/web/src/app/requests/**", "apps/web/src/components/requests/**"],
```

- **Catalogs.** Point `catalogs` at the locale the narration quotes. An Arabic
  series with an Egyptian overlay needs both the base catalog and the overlay.
- **Covers.** Write `covers` when you write the episode: you know which pages it
  visits then.
- **When to run it.** Run `npm run check` once the series is recorded, and add
  it to the delivery notes: the user should know the videos can be checked.

## 4. In CI

The cheapest useful setup is two jobs on pull requests that touch the UI.

1. **Labels**, blocking: no app needed, seconds.
2. **Fast run**, warning only at first: needs the app running the way
   `stack.mjs` expects (a managed stack with its database, or `attach` to a
   preview deployment).

```yaml
# .github/workflows/videos.yml
on:
  pull_request:
    paths: ["apps/web/**"]          # the UI code
jobs:
  labels:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: docs/videos } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run check -- labels
  steps:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: docs/videos } }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }    # for --since
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      # … whatever stack.mjs needs: install the app, start Postgres, build …
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npm run check -- --warn --since origin/${{ github.base_ref }}
      - run: cat out/check/report.md >> "$GITHUB_STEP_SUMMARY"
        if: always()
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: video-check, path: docs/videos/out/check }
```

Once the fast run has been reliable for a while, drop `--warn` so a PR that
breaks a video says so before it merges. The videos keep matching the product
only if someone owns re-recording them.

## 5. When a check fails

1. **Look at the failure.** Open `out/check/<id>.png` and the report line.
2. **Decide what changed.**
   - A selector or step changed: fix `run()`.
   - A label changed: update the line in `script`. Only that line is re-voiced;
     the rest stay cached.
   - The feature works differently now: rewrite the episode.
3. **Check again:** `npm run check -- <id>`. Episodes chain state, so for a
   middle episode either run from the first one or use `--fresh`, as with
   `record`.
4. **Re-record and render** only what changed: `npm run record -- <ids> && npm
   run render -- <ids>`.
5. **Replace the published file** without changing its link: Google Drive's
   "Manage versions", or YouTube/Vimeo "replace video" where available. Wherever
   the app embeds the videos (an in-app academy, docs), the ids stay the same.
6. **For `--since` warnings**, the episode still runs but its pages changed.
   Look at a still or two (`references/composition.md`) and re-record if the
   screen looks different from the video.
