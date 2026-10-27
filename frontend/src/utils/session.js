/**
 * Session recording. O(1) per keystroke, all timestamps in
 * performance.now() milliseconds so the numbers never depend on the clock.
 *
 * A "session" is one continuous stretch of typing. The typing engine opens one
 * on the first keystroke and closes it after 10 s of idle, on restart, on a
 * dataset change, or when the tab is hidden.
 */
import { CHARS_PER_WORD, analyze, consistencyOf } from "./metrics";

export const IDLE_CLOSE_MS = 10_000;
export const MIN_SESSION_MS = 5_000;
export const MIN_SESSION_CHARS = 15;
const MAX_ACTIVE_GAP_MS = 2_000;
const WINDOW_SECONDS = 10;
const MAX_POINTS = 120;

const newId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function downsample(values, maxPoints = MAX_POINTS) {
  if (values.length <= maxPoints) return values.map((value) => Math.round(value));
  const bucket = values.length / maxPoints;
  const out = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += values[j];
    out.push(Math.round(sum / (end - start)));
  }
  return out;
}

/**
 * @param {number} startWallMs wall-clock time of the first keystroke
 */
export function createRecorder(startWallMs = Date.now()) {
  return {
    startWallMs,
    firstKeyAt: 0,
    lastKeyAt: 0,
    lastCharAt: 0,
    activeMs: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    backspaces: 0,
    keyStats: new Map(),
    /** @type {number[]} raw typed characters per elapsed second */
    secondChars: [],
    /** @type {number[]} correct characters per elapsed second */
    secondCorrect: [],
  };
}

function ensureSecond(rec, second) {
  while (rec.secondChars.length <= second) {
    rec.secondChars.push(0);
    rec.secondCorrect.push(0);
  }
}

/** Register one character keystroke. Returns the sorted-out elapsed seconds. */
export function recordChar(rec, { correct, now }) {
  const gap = rec.lastKeyAt ? now - rec.lastKeyAt : 0;
  if (!rec.firstKeyAt) rec.firstKeyAt = now;
  if (gap > 0 && gap <= MAX_ACTIVE_GAP_MS) rec.activeMs += gap;
  rec.lastKeyAt = now;

  rec.keystrokes += 1;
  if (correct) rec.correctKeystrokes += 1;

  const second = Math.max(0, Math.floor((now - rec.firstKeyAt) / 1000));
  ensureSecond(rec, second);
  rec.secondChars[second] += 1;
  if (correct) rec.secondCorrect[second] += 1;

  return second;
}

export function recordBackspace(rec) {
  rec.backspaces += 1;
}

/** Per-key timing/error stats: [count, errors, totalMs]. */
export function recordKeyStat(rec, key, { correct, now }) {
  const delta = rec.lastCharAt ? Math.min(1_000, now - rec.lastCharAt) : 0;
  rec.lastCharAt = now;
  const current = rec.keyStats.get(key);
  if (current) {
    current[0] += 1;
    if (!correct) current[1] += 1;
    current[2] += delta;
  } else {
    rec.keyStats.set(key, [1, correct ? 0 : 1, delta]);
  }
}

/** Rolling WPM over the last ~10 s of correct characters. Null before 3 s. */
export function liveWpm(rec, now) {
  if (!rec.firstKeyAt) return null;
  const elapsed = now - rec.firstKeyAt;
  if (elapsed < 3_000) return null;
  const windowSeconds = Math.min(WINDOW_SECONDS, Math.max(1, elapsed / 1000));
  const currentSecond = Math.floor(elapsed / 1000);
  const firstSecond = Math.max(0, currentSecond - WINDOW_SECONDS + 1);
  let correct = 0;
  for (let i = firstSecond; i <= currentSecond; i += 1) correct += rec.secondCorrect[i] || 0;
  return Math.round(correct / CHARS_PER_WORD / (windowSeconds / 60));
}

export function isIdle(rec, now) {
  return Boolean(rec.lastKeyAt) && now - rec.lastKeyAt > IDLE_CLOSE_MS;
}

export function isEligible(rec) {
  return rec.activeMs >= MIN_SESSION_MS && rec.keystrokes >= MIN_SESSION_CHARS;
}

/**
 * Turn the raw recorder into the compact object stored locally and synced.
 * `prior` carries the characters of words dropped by an endless rebase, so
 * speed and accuracy survive a 10 000-character run.
 * @param {object} rec
 * @param {{words: string[], typedWords: string[], committed: number, dataset: string, prior?: object}} run
 */
export function buildSession(rec, { words, typedWords, committed, dataset, prior }) {
  if (!isEligible(rec)) return null;
  const summary = analyze(typedWords, words, committed, rec.activeMs, {
    totalKeystrokes: rec.keystrokes,
    correctKeystrokes: rec.correctKeystrokes,
    backspaces: rec.backspaces,
  });

  if (prior && prior.netChars) {
    summary.chars.correct += prior.chars.correct;
    summary.chars.incorrect += prior.chars.incorrect;
    summary.chars.extra += prior.chars.extra;
    summary.chars.missed += prior.chars.missed;
    summary.netChars += prior.netChars;
    summary.rawChars += prior.rawChars;
    const minutes = Math.max(1e-9, summary.elapsedMs / 60000);
    summary.wpm = summary.netChars / CHARS_PER_WORD / minutes;
    summary.raw = summary.rawChars / CHARS_PER_WORD / minutes;
  }

  const rawPerSecond = rec.secondChars.map((chars) => chars * (60 / CHARS_PER_WORD));
  const wpmSamples = downsample(
    rec.secondCorrect.map((chars) => chars * (60 / CHARS_PER_WORD))
  );

  const keyStats = {};
  rec.keyStats.forEach(([count, errors, totalMs], key) => {
    keyStats[key] = [count, errors, Math.round(totalMs)];
  });

  return {
    id: newId(),
    startedAt: new Date(rec.startWallMs).toISOString(),
    activeSeconds: Math.round((rec.activeMs / 1000) * 10) / 10,
    wpm: Math.round(summary.wpm * 10) / 10,
    raw: Math.round(summary.raw * 10) / 10,
    accuracy: Math.round(summary.accuracy * 10) / 10,
    consistency: consistencyOf(rawPerSecond),
    correct: summary.chars.correct,
    incorrect: summary.chars.incorrect,
    extra: summary.chars.extra,
    missed: summary.chars.missed,
    dataset,
    wpmSamples,
    keyStats,
  };
}
