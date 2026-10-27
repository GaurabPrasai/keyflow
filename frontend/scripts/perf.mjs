/**
 * Runs the in-page `?perf` harness (src/utils/perf.js) in headless Chrome over
 * the DevTools protocol — no dependencies, Node 22+ only.
 *
 *   node scripts/perf.mjs [url]
 *
 * Default URL is the production preview build with ?perf appended.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const DEBUG_PORT = 9333;
const url = process.argv[2] || "http://localhost:4173/?perf";
const useGpu = process.env.PERF_GPU === "1";

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) {
  console.error("No Chrome found. Set CHROME_PATH.");
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), "keyflow-perf-"));
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--remote-debugging-port=" + DEBUG_PORT,
    "--user-data-dir=" + profile,
    "--window-size=1440,900",
    ...(useGpu ? ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] : []),
    "about:blank",
  ],
  { stdio: "ignore" }
);

const logs = [];
let socket;

async function waitForDebugger() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint never came up");
}

async function openPage() {
  const response = await fetch(
    `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`,
    { method: "PUT" }
  );
  if (!response.ok) throw new Error(`could not open page: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket error")), { once: true });
  });
}

let nextId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = (nextId += 1);
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`timeout: ${method}`));
    }, 30_000);
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function ensureServer(targetUrl) {
  const { origin, pathname, search } = new URL(targetUrl);
  try {
    const response = await fetch(origin);
    if (response.ok) return null;
  } catch {
    /* not serving yet */
  }
  const preview = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  for (let i = 0; i < 40; i += 1) {
    await sleep(250);
    try {
      const response = await fetch(origin);
      if (response.ok) {
        console.log(`preview server up at ${origin}`);
        return preview;
      }
    } catch {
      /* keep waiting */
    }
  }
  throw new Error(`preview server never started at ${origin} (${pathname}${search})`);
}

async function main() {
  const preview = await ensureServer(url);
  await waitForDebugger();
  const page = await openPage();
  socket = await connect(page.webSocketDebuggerUrl);

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled") {
      const text = (message.params.args || [])
        .map((arg) => arg.value ?? arg.description ?? "")
        .join(" ");
      logs.push(`${message.params.type}: ${text}`);
    }
    if (message.method === "Runtime.exceptionThrown") {
      logs.push(`EXCEPTION: ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description || ""}`);
    }
    if (message.method === "Log.entryAdded") {
      logs.push(`${message.params.entry.level}: ${message.params.entry.text}`);
    }
  });

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");

  // PERF_GLOW=1 switches the Flow glow on before the harness page loads, so
  // the harness can run its alternating on/off passes.
  const origin = new URL(url).origin;
  await send("Page.navigate", { url: `${origin}/` });
  await sleep(1_200);
  if (process.env.PERF_GLOW === "1") {
    await evaluate(`(() => {
      const raw = localStorage.getItem('keyflow-settings');
      const settings = raw ? JSON.parse(raw) : {};
      settings.flowGlow = true;
      localStorage.setItem('keyflow-settings', JSON.stringify(settings));
      return true;
    })()`);
  }
  await send("Page.navigate", { url });

  // Wait for the app + harness to finish.
  let results = null;
  for (let i = 0; i < 120; i += 1) {
    await sleep(500);
    results = await evaluate("window.__keyflowPerf ? JSON.stringify(window.__keyflowPerf) : null");
    if (results) break;
  }

  if (process.env.PERF_ENDLESS === "1") {
    const before = await evaluate(
      `JSON.stringify({words: document.querySelectorAll('.word').length, lines: document.querySelectorAll('.type-line').length, chars: document.querySelectorAll('.ch').length})`
    );
    const startedAt = Date.now();
    await evaluate(`(async () => {
      const seq = "aa bb cc dd ee ff gg hh ";
      for (let i = 0; i < 1400; i += 1) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: seq[i % seq.length], bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 3));
      }
      return true;
    })()`);
    const after = await evaluate(
      `JSON.stringify({words: document.querySelectorAll('.word').length, lines: document.querySelectorAll('.type-line').length, chars: document.querySelectorAll('.ch').length, body: document.body.className})`
    );
    console.log("--- endless run (1400 keys) ---");
    console.log("before", before, `${Date.now() - startedAt}ms`);
    console.log("after ", after);
  }

  const dom = await evaluate(`JSON.stringify({
    theme: document.documentElement.dataset.theme,
    hasNotch: Boolean(document.querySelector('.notch')),
    hasStage: Boolean(document.querySelector('.type-stage')),
    hasCaret: Boolean(document.querySelector('.caret')),
    words: document.querySelectorAll('.word').length,
    lines: document.querySelectorAll('.type-line').length,
    glow: Boolean(document.querySelector('.glow')),
    tips: document.querySelector('.tip') ? document.querySelector('.tip').textContent : null,
    stats: document.querySelector('.stats') ? document.querySelector('.stats').textContent.slice(0, 40) : null,
    bodyClass: document.body.className,
    layout: (() => {
      const stage = document.querySelector('.type-stage');
      const lines = [...document.querySelectorAll('.type-line')];
      const widest = lines.reduce((best, line) => (line.offsetWidth > best.offsetWidth ? line : best), lines[0] || null);
      const info = widest ? [...widest.querySelectorAll('.word')].map((w) => ({
        t: w.textContent,
        w: Math.round(w.offsetWidth * 10) / 10,
        sw: w.scrollWidth,
        left: Math.round(w.offsetLeft),
      })) : [];
      const ctx = document.createElement('canvas').getContext('2d');
      const cs = stage ? getComputedStyle(stage) : null;
      if (cs) ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const probe = info[0] ? ctx.measureText(info[0].t).width : 0;
      const gl = document.createElement('canvas').getContext('webgl');
      const renderer = gl ? (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL) : 'n/a') : 'no webgl';
      return {
        renderer,
        clientW: stage ? stage.clientWidth : 0,
        scrollW: stage ? stage.scrollWidth : 0,
        font: cs ? cs.fontSize + ' / ' + cs.letterSpacing : '',
        lineH: lines[0] ? lines[0].offsetHeight : 0,
        lineW: widest ? widest.offsetWidth : 0,
        lineScrollW: widest ? widest.scrollWidth : 0,
        words: info.slice(0, 4),
        probeCanvas: Math.round(probe * 10) / 10,
        caret: (() => { const c = document.querySelector('.caret'); const r = c && c.getBoundingClientRect(); return r ? { x: Math.round(r.x), y: Math.round(r.y), w: r.width, h: r.height } : null })()
      };
    })()
  })`);

  // Exercise the UI: every panel, a theme switch, the panel typing gate.
  const interactions = [];
  const click = async (expression) => evaluate(expression);
  for (let i = 0; i < 5; i += 1) {
    await click(`(() => { const b = document.querySelectorAll('.notch-btn')[${i}]; if (b) b.click(); return true })()`);
    await sleep(750);
    interactions.push(
      await evaluate(`(() => {
        const notch = document.querySelector('.notch');
        const content = document.querySelector('.notch-panel-content');
        return JSON.stringify({
          button: ${i},
          open: notch.classList.contains('is-open'),
          veil: document.querySelector('.veil').classList.contains('is-open'),
          body: document.body.className,
          text: content ? content.textContent.slice(0, 60) : ''
        });
      })()`)
    );
    if (i === 1) {
      const before = await evaluate(`document.documentElement.dataset.theme`);
      await click(`(() => { const b = document.querySelectorAll('.theme-dot-btn')[3]; if (b) b.click(); return true })()`);
      await sleep(400);
      const after = await evaluate(`document.documentElement.dataset.theme`);
      interactions.push(JSON.stringify({ themeSwitch: [before, after] }));
      await click(`(() => { const b = document.querySelectorAll('.theme-dot-btn')[0]; if (b) b.click(); return true })()`);
      await sleep(300);
    }
    if (i === 0) {
      const typedBefore = await evaluate(`document.querySelectorAll('.ch.correct, .ch.incorrect').length`);
      for (const key of ["a", "s", "d", "f"]) {
        await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: '${key}', bubbles: true, cancelable: true}))`);
      }
      const typedAfter = await evaluate(`document.querySelectorAll('.ch.correct, .ch.incorrect').length`);
      interactions.push(JSON.stringify({ panelGate: { typedBefore, typedAfter } }));
    }
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true}))`);
    await sleep(350);
  }

  // Reports page: chunk load, cards, no heatmap, back again.
  await evaluate(`history.pushState({}, '', '/reports'); window.dispatchEvent(new Event('keyflow:route'))`);
  await sleep(1500);
  interactions.push(
    await evaluate(`JSON.stringify({
      route: location.pathname,
      reports: Boolean(document.querySelector('.reports')),
      statCards: document.querySelectorAll('.stat-card').length,
      heatKeys: document.querySelectorAll('.heat-key').length,
      problemItems: document.querySelectorAll('.problem-list li').length,
      chart: Boolean(document.querySelector('.chart-line')),
      title: (document.querySelector('.reports-title') || {}).textContent || ''
    })`)
  );
  await evaluate(`history.pushState({}, '', '/'); window.dispatchEvent(new Event('keyflow:route'))`);
  await sleep(600);
  interactions.push(await evaluate(`JSON.stringify({ backTo: location.pathname, stage: Boolean(document.querySelector('.type-stage')) })`));

  if (process.env.PERF_REDUCED === "1") {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await sleep(600);
    console.log("--- reduced motion ---");
    console.log(
      await evaluate(
        `JSON.stringify({
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          glow: Boolean(document.querySelector('.glow')),
          entering: Boolean(document.querySelector('.type-column.is-enter')),
          caretTransition: getComputedStyle(document.querySelector('.caret')).transitionDuration,
          columnTransition: getComputedStyle(document.querySelector('.type-column')).transitionDuration
        })`
      )
    );
    await send("Emulation.setEmulatedMedia", { features: [] });
  }

  if (process.env.PERF_RESPONSIVE === "1") {
    for (const device of [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 414, height: 896 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1920, height: 1080 },
      { width: 667, height: 375 },
    ]) {
      await send("Emulation.setDeviceMetricsOverride", {
        ...device,
        deviceScaleFactor: 1,
        mobile: device.width < 500,
      });
      await sleep(500);
      interactions.push(
        await evaluate(`JSON.stringify({
          size: ${device.width} + 'x' + ${device.height},
          stage: (() => { const s = document.querySelector('.type-stage'); if (!s) return null; const r = s.getBoundingClientRect(); return { w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom) }; })(),
          notch: (() => { const n = document.querySelector('.notch'); return n ? Math.round(n.getBoundingClientRect().width) : null; })(),
          wordmark: getComputedStyle(document.querySelector('.wordmark')).display,
          tip: getComputedStyle(document.querySelector('.tip')).display,
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          restart: (() => { const b = document.querySelector('.restart'); const r = b.getBoundingClientRect(); return Math.round(r.bottom); })(),
          tipTop: Math.round(document.querySelector('.tip').getBoundingClientRect().top)
        })`)
      );
    }
    await send("Emulation.clearDeviceMetricsOverride");
    await sleep(400);
  }

  console.log("--- console ---");
  for (const line of logs) console.log(line);
  console.log("--- dom ---");
  console.log(JSON.stringify(JSON.parse(dom || "{}"), null, 2));
  console.log("--- interactions ---");
  interactions.forEach((entry) => console.log(entry));
  console.log("--- perf ---");
  if (results) {
    const parsed = JSON.parse(results);
    console.log("context", parsed.context);
    for (const run of parsed.runs) {
      console.log(
        `${run.mode}: handler p50=${run.handler.p50} p95=${run.handler.p95} max=${run.handler.max} · ` +
          `frame p50=${run.frame.p50} p95=${run.frame.p95} max=${run.frame.max} · ` +
          `frames>20ms=${run.slow} · longTasks=${run.long.length}`
      );
    }
  } else {
    console.log("harness did not report (window.__keyflowPerf missing)");
  }

  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${page.id}`).catch(() => {});
  socket.close();
  chrome.kill();
  if (preview) preview.kill();
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    /* Chrome may still hold a file - the OS cleans its temp dir later */
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  try {
    chrome.kill();
  } catch {
    /* ignore */
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
