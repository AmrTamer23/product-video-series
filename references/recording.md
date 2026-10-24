# Directing and recording episodes

## Contents
1. Anatomy of an episode
2. Director API
3. Selectors that survive
4. Timing
5. Things that go wrong

## 1. Anatomy of an episode

```js
{
  id: "04-stages", title: "…", subtitle: "…", at: "08:20", login: "demo.user@…",
  script: [
    "This timer counts the time on the current task.",
    { text: "…", say: "…" },
  ],
  async run(d, page) {
    const line = d.lines(this.script);   // hands out script lines in order
    await page.goto("/");
    await page.getByText("My open stages").waitFor();
    await d.wait(600);
    await d.ready();                       // the video starts here
    await d.point(timer(page), line());
    await d.click(row.getByRole("button", { name: /start timer/i }), { settle: 1400 });
    await d.say(line());
  },
}
```

Put page helpers (top bar, nav link by label, card by title, sign-in form) at
the top of `episodes.mjs` and reuse them across episodes.

## 2. Director API

| Call | Does |
|---|---|
| `d.lines(script)` → `line()` | Next script line; throws if you ask for more than exist; unused lines fail the write. |
| `await d.ready()` | Marks video start (magenta sync flash). Call once, when the first screen is presentable. |
| `await d.say(line, { hold })` | Caption + narration; holds for the audio (+0.45 s) or reading time; `hold` = minimum ms. |
| `await d.point(target, line?, { hold, pad, cursor })` | Focus ring (spotlight + camera) on a locator or an array of locators (union box) while the line plays; parks the cursor just below. |
| `await d.click(locator, { settle })` | Glides the cursor, presses, waits `settle` ms. |
| `await d.type(locator, text, { delay })` | Clicks then types at human speed. |
| `await d.around(...texts)` | Locator for the innermost element containing all the texts — for cards/rows with no handle. |
| `await d.wait(ms)` / `d.glide(x, y)` | Pauses; moves the cursor. |

Conditional UI must still consume its line so later lines stay aligned:

```js
if (await tour.isVisible().catch(() => false)) { await d.point(tour, line()); … }
else line(); // tour didn't show: skip its line
```

## 3. Selectors that survive

Prefer, in order: roles with accessible names (`getByRole("tab", { name })`),
labels (`getByLabel`), design-system attributes (`[data-slot=card]`,
`[data-testid]`), stable ids (`#password`), visible text for content. Avoid
utility classes and `nth()` on generic elements. Scope to a region first
(`card(page, "My stages").getByRole(...)`) when labels repeat.

Highlights should frame a meaningful block: the whole card, the row of stat
tiles (`[first, last]` union), the stage row (`d.around(title, buttonLabel)`).
Tiny rings around one word read as noise; the camera zooms up to 1.3× on small
targets anyway.

Explore before writing: `scripts/explore.mjs` dumps the outline with boxes; a
quick Playwright script that clicks through and prints `innerText` of a dialog
or row answers "what is this called" faster than reading components.

## 4. Timing

- Let the page settle before `ready()` and after navigation (`waitFor` a
  landmark, then `d.wait(600–1200)`).
- `settle` after clicks: 300 ms when the next step waits for something
  explicit, 1200–2400 ms when the viewer should see the result appear (toasts,
  status changes).
- Typing: 35–70 ms/char; long messages at ~32.
- Without a voice, captions hold for reading time; with a voice, for the clip.
  Re-record after voicing — the timing changes.

## 5. Things that go wrong

- **Timeout on `boundingBox`**: element not visible (wrong tab, not scrolled,
  inside a closed popover) or the selector matches a hidden duplicate — open
  `public/recordings/<id>.failed.png`.
- **Strict-mode violation**: the label matches two elements (a field and its
  "show password" button) → use the id or role.
- **Clicks land but nothing happens**: the element animates in; wait for it
  to be stable or add `settle`.
- **State from a previous run** (already checked out, invite exists): the
  chain assumed a fresh start → full run or `--fresh`.
- **Different locale renders different labels**: record with the locale the
  audience uses (`language.locale`) and quote those labels.
- Recording surfaces product bugs (untranslated widgets, timers that don't
  stop): list them for the user rather than scripting around them silently.
