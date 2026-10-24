// Node preload (`node --import ./fake-clock.mjs`) that shifts the wall clock by
// FX_CLOCK_OFFSET_MS so the API, the web server and the seed all agree on the
// demo's "now" — the chosen demo day — instead of whenever we record.
const offset = Number(process.env.FX_CLOCK_OFFSET_MS ?? 0);

if (offset) {
  const RealDate = Date;
  const realNow = RealDate.now.bind(RealDate);
  // A Proxy keeps every static (parse, UTC, …) and `instanceof` intact; only the
  // no-argument constructor, Date() and Date.now() read the shifted clock.
  RealDate.now = () => realNow() + offset;
  globalThis.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return Reflect.construct(target, args.length ? args : [realNow() + offset], newTarget);
    },
    apply() {
      return new RealDate(realNow() + offset).toString();
    },
  });
}
