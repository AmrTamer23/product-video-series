// A shifted clock, so every episode happens on the same chosen day and time
// whenever it is recorded (a 2 AM recording otherwise shows "check-in 02:27").
// Three places must agree on "now": the app's Node processes (FAKE_CLOCK_PRELOAD),
// the database (postgresClock), and the browser (browserClockScript).
import path from "node:path";
import { fileURLToPath } from "node:url";

/** `node --import <this>` with FX_CLOCK_OFFSET_MS set shifts Date in that process. */
export const FAKE_CLOCK_PRELOAD = path.join(path.dirname(fileURLToPath(import.meta.url)), "fake-clock.mjs");

/** Milliseconds to add to the real clock so that "now" reads as `time` ("08:05") on `clock.day`. */
export function offsetFor(clock, time) {
  return Date.parse(`${clock.day}T${time}:00${clock.utcOffset}`) - Date.now();
}

/** Env for a Node process (API server, seed, SSR server) that should live on the shifted clock. */
export const clockEnv = (offsetMs) => ({ FX_CLOCK_OFFSET_MS: String(Math.round(offsetMs)), NODE_OPTIONS: `--import ${FAKE_CLOCK_PRELOAD}` });

/** Browser init script: shifts only Date (see Director.prepare for why not timers). */
export function browserClockScript(offset) {
  const RealDate = Date;
  const realNow = RealDate.now.bind(RealDate);
  RealDate.now = () => realNow() + offset;
  window.Date = new Proxy(RealDate, {
    construct: (t, args, nt) => Reflect.construct(t, args.length ? args : [realNow() + offset], nt),
    apply: () => new RealDate(realNow() + offset).toString(),
  });
}

/**
 * Postgres: a `fake.now()` that reads the offset from a per-database setting.
 * Column defaults bind to a function when the table is created, so run `setup`
 * on an empty database BEFORE migrating; with `search_path = public, fake,
 * pg_catalog` every unqualified now() — defaults and queries — reads the shifted
 * clock. Settings are per database and not copied by CREATE DATABASE … TEMPLATE,
 * so call `settings()` on each clone (new connections pick it up).
 */
export const postgresClock = {
  setup: `
    CREATE SCHEMA IF NOT EXISTS fake;
    CREATE OR REPLACE FUNCTION fake.now() RETURNS timestamptz STABLE LANGUAGE sql AS $$
      SELECT pg_catalog.now() + coalesce(nullif(current_setting('pvs.clock_offset', true), ''), '0 ms')::interval
    $$;`,
  settings: (db, offsetMs) => [
    `ALTER DATABASE ${db} SET search_path = public, fake, pg_catalog`,
    `ALTER DATABASE ${db} SET pvs.clock_offset = '${Math.round(offsetMs)} milliseconds'`,
  ],
};
