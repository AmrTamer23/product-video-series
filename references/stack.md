# The demo stack

## Contents
1. Attach or manage
2. The adapter
3. Seeded data, cloned per run
4. The shifted clock (three layers)
5. Builds, ports and side effects
6. A worked managed stack

## 1. Attach or manage

- **Attach** (template default): the app already runs (dev server, staging)
  with demo data. `start/reset` do nothing. Good for a first episode and for
  apps you can't run locally. Downsides: data drifts between takes, the clock
  shows the real time, a dev server adds overlays and slowness.
- **Managed**: the recorder owns an isolated copy — a template database cloned
  per run and the app's processes started per episode on a shifted clock.
  Every re-recording shows the same morning. Use this for anything you'll
  re-record when the UI changes (i.e. any real series).

Never point the recorder at production or at a database other work depends on
(e2e test DBs, a teammate's dev DB). Create its own databases and ports.

## 2. The adapter

`stack.mjs` exports `{ baseURL, browserContext, isPrepared, prepare, reset,
start({ clockOffsetMs }), stop, signIn(request, user) }` — see the template's
header. `browserContext` is where locale-adjacent realism goes: `timezoneId`,
`geolocation` + `permissions: ["geolocation"]` (apps that check location at
sign-in), color scheme.

`signIn` should use the app's API, not the form, so episodes start already
signed in; episodes that *teach* signing in do it through the form. Most auth
libraries want an `origin` header on API sign-ins.

## 3. Seeded data, cloned per run

- Seed once into a **template** database (`prepare`, slow), then `reset`
  clones it (`CREATE DATABASE live TEMPLATE base` in Postgres — instant). Drop
  with `WITH (FORCE)` so lingering connections don't block it.
- Seed **on the shifted clock** (`clockEnv(offset)` for the seed process) so
  "today" in the data is the demo day.
- Mind time-of-day logic in the seed: seeding before the workday starts may
  mean nobody has checked in yet "today" — good if an episode shows checking in.
- Stop background schedulers during recording (alert/cron jobs firing
  mid-take change what's on screen).

## 4. The shifted clock (three layers)

"Now" must agree everywhere or the app contradicts itself (a check-in at 02:27
but "good morning"; a message from the future). `engine/clock.mjs`:

1. **Node processes** (API, SSR web server, seed): run with
   `clockEnv(offset)` → `NODE_OPTIONS=--import engine/fake-clock.mjs` +
   `FX_CLOCK_OFFSET_MS`. Only `Date` shifts; timers stay real.
2. **Database**: rows defaulting to `now()` must shift too. Postgres recipe
   `postgresClock`: create `fake.now()` **before migrating** (column defaults
   bind to a function at CREATE TABLE time) and set
   `search_path = public, fake, pg_catalog` so unqualified `now()` resolves
   to it; the offset lives in a per-database setting. Settings are not copied
   to template clones — apply `settings(db, offset)` on every clone and before
   every episode (new connections read it, so restart the app after).
   MySQL/SQLite have no equivalent hook: prefer app-side timestamps, or accept
   real DB time for incidental rows.
3. **Browser**: the engine injects a Date-only shift. Do not use Playwright's
   `clock.install` — it also fakes timers and `requestAnimationFrame`, which
   freezes CSS/JS entrance animations at opacity 0 (the page records blank).

The offset is computed per episode from `series.config.clock.day` +
`episode.at`, so each episode restarts the processes on its own time.

## 5. Builds, ports and side effects

- Record a **production build** (`next build && next start`, `vite build &&
  preview`…): no dev overlays, no hydration warnings, faster. Bake the API URL
  the build needs at build time.
- Use ports nothing else uses (another project's dev server on :3000 is
  common); Remotion's own ports are set in `remotion.config.ts`.
- Builds may touch tracked files (Next rewrites `next-env.d.ts`) — revert them
  before committing.
- Keep the video project out of the app's package workspace so `npm install`
  there doesn't rewrite the app's lockfile.

## 6. A worked managed stack

A Next.js + NestJS + Postgres app (from the first project this framework ran
on): Postgres in its own container on a spare port with trust auth;
`prepare` = create template DB → `postgresClock.setup` → settings at the seed
time → run migrations → run the demo seed with `clockEnv`; `reset` = clone;
`start` = settings for the episode offset → spawn `node dist/main.js` (API,
own port, schedulers off, CORS origin = the web port) and `next start` (web,
API URL baked in), both with `clockEnv`, then wait for HTTP on both; `stop` =
SIGTERM both and await exit; `signIn` = POST the auth endpoint with an
`origin` header.
