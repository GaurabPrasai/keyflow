/**
 * Perf harness (Plan 4.0 §5.1), loaded only when the page is opened with
 * `?perf`.
 *
 * Waits until the text and entrance animation are done, then fires synthetic
 * keydowns at 12ms intervals and reports per-key handler time, frame gaps and
 * long tasks. When the flow glow is present it runs alternating passes with it
 * on and off, so its cost is directly comparable.
 *
 * Targets: handler p95 < 1ms, no frame gap > 20ms, no long tasks.
 */

const PASS_KEYS = 300;
const INTERVAL_MS = 12;
const SEQ = "the quick brown fox jumps over the lazy dog and types calmly all day long";

function pct(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio))] * 100) / 100;
}

function stats(values) {
  return { p50: pct(values, 0.5), p95: pct(values, 0.95), max: pct(values, 1) };
}

function sequence(length) {
  let text = "";
  while (text.length < length) text += `${SEQ} `;
  return text.slice(0, length).split("");
}

function ready() {
  return new Promise((resolve) => {
    const done = () => {
      const hasWords = document.querySelectorAll(".type-column .word").length > 0;
      const entering = document.querySelector(".type-column.is-enter");
      if (hasWords && !entering) {
        resolve(true);
        return true;
      }
      return false;
    };
    if (done()) return;
    const id = window.setInterval(() => {
      if (done()) window.clearInterval(id);
    }, 100);
    window.setTimeout(() => {
      window.clearInterval(id);
      resolve(false);
    }, 15_000);
  });
}

function longTaskObserver() {
  const durations = [];
  let observer = null;
  try {
    const types = PerformanceObserver.supportedEntryTypes || [];
    const watched = ["longtask", "long-animation-frame"].filter((type) => types.includes(type));
    if (watched.length) {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => durations.push(entry.duration));
      });
      observer.observe({ entryTypes: watched });
    }
  } catch {
    observer = null;
  }
  return { durations, stop: () => observer && observer.disconnect() };
}

function pass(keys) {
  return new Promise((resolve) => {
    const handlers = [];
    const gaps = [];
    const tasks = longTaskObserver();
    let last = performance.now();
    let index = 0;
    let stopped = false;

    const frame = (now) => {
      gaps.push(now - last);
      last = now;
      if (!stopped) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    const step = () => {
      if (index >= keys.length) {
        stopped = true;
        window.setTimeout(() => {
          const result = {
            handler: stats(handlers),
            frame: stats(gaps),
            slow: gaps.filter((gap) => gap > 20).length,
            long: tasks.durations.map((ms) => Math.round(ms)),
          };
          tasks.stop();
          resolve(result);
        }, 250);
        return;
      }
      const started = performance.now();
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: keys[index], bubbles: true, cancelable: true })
      );
      handlers.push(performance.now() - started);
      index += 1;
      window.setTimeout(step, INTERVAL_MS);
    };
    window.setTimeout(step, INTERVAL_MS);
  });
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function glowPass(mode) {
  const glow = document.querySelector(".glow");
  if (!glow) return;
  glow.style.transition = "none";
  glow.style.opacity = "0.14";
  glow.style.background = "";
  glow.style.width = "";
  glow.style.height = "";
  if (mode === "off") {
    glow.style.display = "none";
    return;
  }
  glow.style.display = "";
  if (mode === "nobg") glow.style.background = "none";
  if (mode === "mid") {
    glow.style.width = "900px";
    glow.style.height = "360px";
  }
  if (mode === "small") {
    glow.style.width = "400px";
    glow.style.height = "220px";
  }
}

export async function startPerf() {
  const keys = sequence(PASS_KEYS);
  const hasGlow = Boolean(document.querySelector(".glow"));
  await ready();
  await pass(keys.slice(0, 60)); // warm-up
  await sleep(400);

  const order = hasGlow
    ? ["on", "off", "on", "off", "mid", "small"]
    : ["on", "on"];
  const runs = [];
  for (const mode of order) {
    glowPass(mode);
    await sleep(250);
    runs.push({ mode, ...(await pass(keys)) });
    await sleep(400);
  }
  glowPass("on");

  const report = {
    context: {
      glow: hasGlow,
      panel: document.body.classList.contains("panel-open"),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      url: location.search,
    },
    runs,
  };
  window.__keyflowPerf = report;

  console.log("[perf] context", report.context);
  runs.forEach((run) =>
    console.log(
      `[perf] ${run.mode}: handler p50=${run.handler.p50} p95=${run.handler.p95} max=${run.handler.max} · ` +
        `frame p50=${run.frame.p50} p95=${run.frame.p95} max=${run.frame.max} · >20ms=${run.slow} · long=${run.long.length}`
    )
  );

  const average = (mode) => {
    const set = runs.filter((run) => run.mode === mode);
    if (!set.length) return null;
    const mean = (pick) => Math.round((set.reduce((sum, run) => sum + pick(run), 0) / set.length) * 100) / 100;
    return { handlerP95: mean((run) => run.handler.p95), frameMax: mean((run) => run.frame.max), slow: mean((run) => run.slow) };
  };
  if (hasGlow) {
    console.log(`[perf] A/B glow on   ${JSON.stringify(average("on"))}`);
    console.log(`[perf] A/B glow off  ${JSON.stringify(average("off"))}`);
    console.log(`[perf] A/B glow mid  ${JSON.stringify(average("mid"))}`);
    console.log(`[perf] A/B glow small ${JSON.stringify(average("small"))}`);
  }
  const worst = Math.max(...runs.filter((run) => run.mode === "on" || run.mode === "off").map((run) => run.handler.p95));
  console.log(worst < 1 ? "[perf] handler p95 PASS" : `[perf] handler p95 MISS (${worst}ms)`);
  return report;
}
