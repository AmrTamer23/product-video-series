// How the recorder reaches the app: an adapter the engine calls, nothing more.
// Two shapes, pick one (references/stack.md has the full recipes):
//
//  A. Attach — the app is already running (local dev, staging) with demo data.
//     prepare/reset/start/stop do nothing; no clock shift. Fine for a first cut.
//
//  B. Managed — the recorder owns an isolated copy: a seeded template database
//     cloned per run, and the app's servers started on a shifted clock per
//     episode. Repeatable to the pixel; what a series you'll re-record needs.
//
// Interface:
//   baseURL                       where the browser points
//   browserContext                extra Playwright context options (timezoneId,
//                                 geolocation, permissions, …)
//   isPrepared()                  is the demo data ready to clone?
//   prepare()                     build it (seed); slow, once
//   reset()                       a fresh copy for a full run
//   start({ clockOffsetMs })      (re)start the app reading "now" shifted by the offset
//   stop()
//   signIn(request, user)         sign `user` in on a Playwright APIRequestContext,
//                                 so its cookies carry into the page

const BASE_URL = "__BASE_URL__";

export default {
  baseURL: BASE_URL,
  browserContext: {},

  async isPrepared() {
    return true;
  },
  async prepare() {},
  async reset() {},
  async start() {},
  async stop() {},

  async signIn(request, user) {
    // Replace with the app's sign-in call. Send an Origin header: many auth
    // libraries reject cross-origin-looking requests without one.
    const res = await request.post("/api/auth/sign-in", {
      data: { email: user, password: process.env.DEMO_PASSWORD },
      headers: { origin: BASE_URL },
    });
    if (!res.ok()) throw new Error(`sign-in failed for ${user}: ${res.status()}`);
  },
};
