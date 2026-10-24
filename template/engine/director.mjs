// Drives one episode in a real browser like a person would — a visible cursor
// that glides to its target, typing at human speed — and writes a timeline of
// what happened when, which the Remotion composition turns into captions,
// narration and focus rings. Episodes only talk to the app through this.
import { writeFileSync } from "node:fs";
import { browserClockScript } from "./clock.mjs";

// A drawn cursor and click ripple: headless video has no pointer of its own.
// The last position survives navigations via sessionStorage.
const cursorScript = (color) => `(() => {
  if (window.__pvsCursor) return;
  window.__pvsCursor = true;
  const KEY = "__pvsCursorPos";
  const start = JSON.parse(sessionStorage.getItem(KEY) || '{"x":800,"y":450}');
  const install = () => {
    const el = document.createElement("div");
    el.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 17 L13 25 L16.5 23.5 L13 15.8 L20.5 15.8 Z" fill="#0b1b3a" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    Object.assign(el.style, { position: "fixed", left: "0", top: "0", width: "28px", height: "28px", zIndex: "2147483647",
      pointerEvents: "none", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.35))" });
    document.documentElement.appendChild(el);
    const move = (x, y) => { el.style.transform = "translate(" + (x - 4) + "px," + (y - 2) + "px)"; sessionStorage.setItem(KEY, JSON.stringify({ x, y })); };
    move(start.x, start.y);
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY), true);
    window.addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: e.clientX - 22 + "px", top: e.clientY - 22 + "px", width: "44px", height: "44px",
        borderRadius: "50%", background: "${color}47", border: "2px solid ${color}b3", zIndex: "2147483646",
        pointerEvents: "none", transform: "scale(.3)", transition: "transform .45s ease-out, opacity .45s ease-out" });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.25)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.documentElement) install(); else document.addEventListener("DOMContentLoaded", install);
})();`;

/** A script line is a string, or `{ text, say }` when the voice needs its own spelling. */
export const shown = (line) => (typeof line === "string" ? line : line.text);
export const spoken = (line) => (typeof line === "string" ? line : line.say);

// Without narration, hold a caption long enough to read it twice.
const readingMs = (text) => 1400 + text.trim().split(/\s+/).length * 420;

export class Director {
  constructor(page, { meta, viewport, narrator = null }) {
    this.page = page;
    this.meta = meta;
    this.viewport = viewport;
    this.narrator = narrator;
    this.events = [];
    this.t0 = Date.now();
    this.mouse = { x: viewport.width / 2, y: viewport.height / 2 };
  }

  /**
   * Installs the cursor and, when the demo runs on a shifted clock, moves the
   * page's Date by the same offset as the servers. Only Date moves: Playwright's
   * own clock also fakes timers and requestAnimationFrame, which freezes most
   * apps' entrance animations at opacity 0.
   */
  static async prepare(context, { clockOffsetMs = 0, cursorColor = "#2563eb" } = {}) {
    if (clockOffsetMs) await context.addInitScript(browserClockScript, clockOffsetMs);
    await context.addInitScript(cursorScript(cursorColor));
  }

  /** Hands out an episode's script one line at a time, in order. */
  lines(script) {
    let i = 0;
    this.unread = () => script.length - i;
    return () => {
      if (i >= script.length) throw new Error(`${this.meta.id}: the episode asked for more lines than its script has`);
      return script[i++];
    };
  }

  now() {
    return (Date.now() - this.t0) / 1000;
  }

  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Marks the moment the page is presentable; the video is trimmed to start here.
   * A full-screen magenta flash lets sync.mjs find this exact moment in the
   * recording, since Playwright's video does not start on a known timestamp.
   */
  async ready() {
    await this.page.evaluate(() => {
      const m = document.createElement("div");
      m.id = "__pvs-sync";
      Object.assign(m.style, { position: "fixed", inset: "0", background: "#ff00ff", zIndex: "2147483647" });
      document.documentElement.appendChild(m);
    });
    await this.wait(400);
    await this.page.evaluate(() => document.getElementById("__pvs-sync")?.remove());
    this.events.push({ type: "start", t: this.now() });
    await this.wait(200);
  }

  /**
   * How long a line holds the scene: its narration plus a breath when voiced,
   * otherwise its reading time. `hold` is a minimum.
   */
  async timing(line, hold) {
    if (!this.narrator) return { ms: hold ?? readingMs(shown(line)), audio: null };
    const audio = await this.narrator.line(spoken(line));
    return { ms: Math.max(hold ?? 0, audio.duration * 1000 + 450), audio };
  }

  /** Shows (and speaks) a caption, holding the scene until it is done. */
  async say(line, { hold } = {}) {
    const { ms, audio } = await this.timing(line, hold);
    this.events.push({ type: "caption", t: this.now(), text: shown(line), duration: ms / 1000, audio: audio?.file ?? null });
    await this.wait(ms);
  }

  /** Bounding box of a locator, or the union of several. */
  async box(target) {
    const boxes = [];
    for (const locator of [target].flat()) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      const b = await locator.boundingBox();
      if (!b) throw new Error(`no box for ${locator}`);
      boxes.push(b);
    }
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    const right = Math.max(...boxes.map((b) => b.x + b.width));
    const bottom = Math.max(...boxes.map((b) => b.y + b.height));
    return { x, y, width: right - x, height: bottom - y };
  }

  /**
   * The innermost element containing every one of `texts` — a card, a row of
   * stat tiles — for when the DOM has no handle on the block you want to show.
   */
  async around(...texts) {
    const id = await this.page.evaluate((texts) => {
      let best = null;
      for (const el of document.querySelectorAll("body *")) {
        if (texts.every((t) => el.textContent.includes(t))) best = el; // document order: later = deeper
      }
      const mark = String(Math.random()).slice(2);
      best?.setAttribute("data-pvs-around", mark);
      return mark;
    }, texts);
    return this.page.locator(`[data-pvs-around="${id}"]`);
  }

  /** Draws a focus ring around an element (rendered later by Remotion) while a line plays. */
  async point(target, line, { hold, pad = 8, cursor = true } = {}) {
    const b = await this.box(target);
    // Park the pointer just under the element so it doesn't cover what we're showing.
    if (cursor) await this.glide(b.x + b.width / 2, Math.min(b.y + b.height + 16, this.viewport.height - 30));
    const { ms, audio } = line ? await this.timing(line, hold) : { ms: hold ?? 1500, audio: null };
    const t = this.now();
    this.events.push({ type: "focus", t, duration: ms / 1000, rect: { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 } });
    if (line) this.events.push({ type: "caption", t, text: shown(line), duration: ms / 1000, audio: audio?.file ?? null });
    await this.wait(ms);
  }

  async glide(x, y, steps = 28) {
    const from = { ...this.mouse };
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease-in-out
      await this.page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await this.wait(12);
    }
    this.mouse = { x, y };
  }

  async click(locator, { settle = 900 } = {}) {
    const b = await this.box(locator);
    await this.glide(b.x + b.width / 2, b.y + b.height / 2);
    await this.wait(180);
    await this.page.mouse.down();
    await this.wait(70);
    await this.page.mouse.up();
    await this.wait(settle);
  }

  async type(locator, text, { delay = 70 } = {}) {
    await this.click(locator, { settle: 250 });
    await locator.pressSequentially(text, { delay });
    await this.wait(400);
  }

  /** `videoOffset` converts timeline seconds to video seconds (videoTime = t + videoOffset). */
  write(file, videoFile, videoOffset) {
    if (this.unread?.()) throw new Error(`${this.meta.id}: ${this.unread()} script line(s) never used`);
    const timeline = { ...this.meta, video: videoFile, videoOffset, viewport: this.viewport, end: this.now(), events: this.events };
    writeFileSync(file, JSON.stringify(timeline, null, 2));
  }
}
