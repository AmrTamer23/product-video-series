// The series, one entry per video. Episodes run in order against the same app
// state, so together they read as one session (a working day, a first week…):
// what episode 2 creates, episode 5 can show.
//
// Each episode's `script` is its narration, in order: it is shown as captions,
// voiced by engine/voice.mjs, and `run` consumes it line by line as it acts.
// A line is a string, or `{ text, say }` when the voice needs a different
// spelling than the caption (vowel marks, a brand name spelled out): captions
// show `text`, the voice reads `say`.
//
// Episode fields:
//   id        "01-sign-in" — sortable; names the output files
//   title     shown and spoken on the intro card
//   subtitle  shown under the title
//   at        "08:05" — time of day on the demo clock (series.config.clock)
//   login     a user the stack signs in through the API before the episode
//             (skip it when the episode itself shows signing in)
//   setup     async ({ request, stack }) => input — work the viewer shouldn't see,
//             e.g. creating an invitation; `request(user)` is a signed-in API client
//   script    the narration
//   run       async (d, page, input) — the episode itself; see references/recording.md

export const EPISODES = [
  {
    id: "01-first-look",
    title: "__EPISODE_TITLE__",
    subtitle: "__EPISODE_SUBTITLE__",
    at: "09:00",
    login: "__DEMO_USER__",
    script: [
      "__LINE_1__",
      "__LINE_2__",
    ],
    async run(d, page) {
      const line = d.lines(this.script);
      await page.goto("/");
      await page.locator("main").waitFor();
      await d.wait(600);
      await d.ready(); // the video starts here
      await d.say(line());
      await d.point(page.locator("nav").first(), line());
    },
  },
];
