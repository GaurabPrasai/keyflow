import assert from "node:assert/strict";
import { analyze, compareWord, consistencyOf } from "../src/utils/metrics.js";

const counters = (correct, total) => ({ correctKeystrokes: correct, totalKeystrokes: total, backspaces: 0 });

// 50 correct characters in 10 seconds = 60 WPM.
{
  const summary = analyze(["a".repeat(50)], ["a".repeat(50)], 1, 10_000, counters(50, 50));
  assert.equal(Math.round(summary.wpm), 60);
  assert.equal(Math.round(summary.raw), 60);
  assert.equal(summary.accuracy, 100);
  assert.deepEqual(summary.chars, { correct: 50, incorrect: 0, extra: 0, missed: 0 });
}

// One wrong character and one missed character.
{
  const word = compareWord("helo", "hello");
  assert.deepEqual(word, { correct: 3, incorrect: 1, extra: 0, missed: 1 });
  assert.equal(analyze(["helo"], ["hello"], 1, 60_000, counters(3, 4)).wpm, 0);
}

// Accuracy counts keystrokes, not the final text: 5/6 = 83.33%.
{
  const summary = analyze(["hello"], ["hello"], 1, 10_000, counters(5, 6));
  assert.equal(Math.round(summary.accuracy * 100) / 100, 83.33);
}

// Skipped word counts as missed, and only correct words feed net WPM.
{
  const summary = analyze(["", "the"], ["the", "the"], 2, 10_000, counters(3, 4));
  assert.equal(summary.chars.missed, 3);
  assert.equal(summary.wpm, (3 + 1) / 5 / (10_000 / 60_000));
  assert.equal(summary.totalKeystrokes, 4);
}

// Extra characters are tracked separately.
{
  const summary = analyze(["hello!!"], ["hello"], 1, 60_000, counters(5, 7));
  assert.equal(summary.chars.extra, 2);
  assert.equal(summary.chars.missed, 0);
}

// Consistency: flat samples are perfect, uneven samples are penalised.
assert.equal(consistencyOf([60, 60, 60]), 100);
assert.equal(consistencyOf([10, 30, 50]), 46);
assert.equal(consistencyOf([]), 0);
assert.equal(consistencyOf([42]), 100);

// Guards against zero/negative elapsed time.
assert.equal(analyze(["hello"], ["hello"], 1, 0, counters(5, 5)).wpm, 0);

console.log("metrics: all checks passed");
