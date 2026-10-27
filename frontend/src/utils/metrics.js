/**
 * Pure typing metrics. No React, no DOM - safe to unit test in plain Node.
 *
 * Word WPM convention: 5 characters = 1 word.
 * net WPM  = (correctly typed characters in correct words + spaces) / 5 / minutes
 * raw WPM  = (all typed characters + spaces) / 5 / minutes
 * accuracy = correct keystrokes / all character keystrokes (backspaces excluded)
 */

export const CHARS_PER_WORD = 5;

/** Compare one typed word against its target. */
export function compareWord(typed = "", target = "") {
  const shared = Math.min(typed.length, target.length);
  let correct = 0;
  for (let i = 0; i < shared; i += 1) {
    if (typed[i] === target[i]) correct += 1;
  }
  return {
    correct,
    incorrect: shared - correct,
    extra: Math.max(0, typed.length - target.length),
    missed: Math.max(0, target.length - typed.length),
  };
}

/**
 * Summarise a test.
 * @param {string[]} typedWords words the user has typed
 * @param {string[]} targetWords target words
 * @param {number} committed number of words finished with space/skip
 * @param {number} elapsedMs elapsed test time
 * @param {{totalKeystrokes:number, correctKeystrokes:number, backspaces:number}} counters
 */
export function analyze(typedWords = [], targetWords = [], committed = 0, elapsedMs = 0, counters = {}) {
  const chars = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
  let correctWordChars = 0;
  let typedChars = 0;

  for (let i = 0; i < typedWords.length; i += 1) {
    const typed = typedWords[i] || "";
    const target = targetWords[i] || "";
    const word = compareWord(typed, target);
    chars.correct += word.correct;
    chars.incorrect += word.incorrect;
    chars.extra += word.extra;
    typedChars += typed.length;

    if (i < committed) {
      chars.missed += word.missed;
      if (typed === target) correctWordChars += target.length;
    }
  }

  const done = Math.max(0, committed);
  // Spaces between completed words: N words have N-1 separating spaces.
  const spaces = Math.max(0, done - 1);
  const netChars = correctWordChars + spaces;
  const rawChars = typedChars + spaces;
  const safeElapsed = Math.max(0, Number(elapsedMs) || 0);
  const minutes = safeElapsed / 60000;
  const netWpm = minutes > 0 ? netChars / CHARS_PER_WORD / minutes : 0;
  const rawWpm = minutes > 0 ? rawChars / CHARS_PER_WORD / minutes : 0;
  const totalKeystrokes = Number(counters.totalKeystrokes) || 0;
  const correctKeystrokes = Number(counters.correctKeystrokes) || 0;
  const accuracy = totalKeystrokes > 0 ? (correctKeystrokes / totalKeystrokes) * 100 : 100;

  return {
    wpm: netWpm,
    raw: rawWpm,
    accuracy,
    chars,
    netChars,
    rawChars,
    spaces,
    totalKeystrokes,
    correctKeystrokes,
    backspaces: Number(counters.backspaces) || 0,
    elapsedMs: safeElapsed,
  };
}

/**
 * Consistency = 100 - coefficient of variation of per-second raw WPM.
 * Returns 0 when there is not enough data.
 */
export function consistencyOf(rawSamples = []) {
  const values = rawSamples.map((sample) => (typeof sample === "number" ? sample : sample && sample.raw));
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (valid.length < 2) return valid.length === 1 ? 100 : 0;
  const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  if (mean <= 0) return 0;
  const variance = valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / valid.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}

