import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { analyze } from "../utils/metrics";
import {
  buildSession,
  createRecorder,
  isIdle,
  liveWpm,
  recordBackspace,
  recordChar,
  recordKeyStat,
} from "../utils/session";
import { setRolling } from "../utils/roll";
import { saveSession, whenIdle } from "../utils/storage";
import { pushSessionInBackground } from "../utils/sync";
import { breakLines, createMeasurer, fontStringOf } from "../utils/textLayout";

const DATASETS = {
  "english-200": () => import("../assets/texts/english-200.json"),
  "english-1k": () => import("../assets/texts/english-1k.json"),
  "english-5k": () => import("../assets/texts/english-5k.json"),
  "commonly-misspelled": () => import("../assets/texts/commonly-misspelled.json"),
};

const START_WORDS = 90;
const APPEND_WORDS = 40;
const APPEND_AHEAD_LINES = 4;
const MAX_EXTRAS = 8;
const REBASE_WORDS = 300;
const REBASE_DROP = 150;
const CARET_BLINK_MS = 450;
const IDLE_NOTCH_MS = 2_500;
const STATS_MS = 250;
const GLOW_MS = 500;
const GLOW_WINDOW_MS = 4_000;
const GLOW_KEYS = 20;
const IDLE_DIM_MS = 900;
const ENTRANCE_MS = 1_800;
const LEAVE_MS = 160;
const LETTER_SPACING = 0.08;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function addExtraSpan(record, char) {
  const span = document.createElement("span");
  span.className = "ch extra";
  span.textContent = char;
  span.style.left = `${record.width + record.extras.length * record.charW}px`;
  record.el.appendChild(span);
  record.extras.push(span);
}

function emptyPrior() {
  return {
    chars: { correct: 0, incorrect: 0, extra: 0, missed: 0 },
    netChars: 0,
    rawChars: 0,
  };
}

/**
 * The typing engine. Characters are rendered once per line; every keystroke
 * mutates one or two spans plus the caret. React never re-renders for a key
 * press, and no custom property on the root is written while typing — the
 * only per-frame writes are the caret transform and `--top` on the column
 * (line changes only).
 */
export default function useTypingTest({
  dataset,
  caretStyle,
  playSound,
  authenticated,
  flowEnabled,
  panelRef,
  stageRef,
  columnRef,
  caretYRef,
  caretRef,
  inputRef,
  wpmRef,
  accRef,
  glowRef,
  restartRef,
}) {
  const [words, setWords] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [isTouch, setIsTouch] = useState(false);

  const poolRef = useRef([]);
  const bagRef = useRef([]);
  const lastWordRef = useRef("");
  const appendLockRef = useRef(false);
  const authRef = useRef(authenticated);
  const playRef = useRef(playSound);
  const datasetRef = useRef(dataset);
  const caretStyleRef = useRef(caretStyle);
  const flowRef = useRef(flowEnabled);
  const composingRef = useRef(false);
  const handledAtRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const notchTimerRef = useRef(0);
  const errorTimerRef = useRef(0);
  const enterTimerRef = useRef(0);
  const spinTimerRef = useRef(0);
  const leaveTimerRef = useRef(0);
  const leaveLockRef = useRef(false);
  const frameRef = useRef(0);

  authRef.current = authenticated;
  playRef.current = playSound;
  datasetRef.current = dataset;
  caretStyleRef.current = caretStyle;
  flowRef.current = flowEnabled;

  const wordsRef = useRef([]);
  const linesRef = useRef([]);
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = {
      wordIndex: 0,
      typed: [""],
      records: new Map(),
      lineEls: [],
      lineH: 0,
      charW: 0,
      caretH: 0,
      activeLine: -1,
      top: 0,
      currentWordEl: null,
      recorder: null,
      prior: emptyPrior(),
      keys: [],
      lastKeyAt: 0,
      lastErrorAt: 0,
      wpmEma: null,
      glowAt: 0,
      snapOff: false,
    };
  }
  const engine = engineRef.current;
  wordsRef.current = words;
  linesRef.current = lines;

  /* ---------------------------------------------------------------- words */

  const drawWords = useCallback((count) => {
    const pool = poolRef.current;
    if (!pool.length) return [];
    const out = [];
    for (let i = 0; i < count; i += 1) {
      if (!bagRef.current.length) {
        const bag = shuffle(pool);
        if (bag.length > 1 && bag[bag.length - 1] === lastWordRef.current) {
          const swap = bag[0];
          bag[0] = bag[bag.length - 1];
          bag[bag.length - 1] = swap;
        }
        bagRef.current = bag;
      }
      const word = bagRef.current.pop();
      lastWordRef.current = word;
      out.push(word);
    }
    return out;
  }, []);

  /* ----------------------------------------------------------- DOM syncing */

  const setCurrentWord = useCallback(() => {
    const record = engine.records.get(engine.wordIndex);
    const next = record ? record.el : null;
    if (engine.currentWordEl === next) return;
    engine.currentWordEl?.classList.remove("is-current");
    next?.classList.add("is-current");
    engine.currentWordEl = next;
  }, [engine]);

  const syncDom = useCallback(() => {
    const column = columnRef.current;
    if (!column) return;
    for (const extra of column.querySelectorAll(".ch.extra")) extra.remove();

    const lineEls = Array.from(column.querySelectorAll(".type-line"));
    engine.lineEls = lineEls;
    if (!lineEls.length) {
      engine.records = new Map();
      engine.currentWordEl = null;
      return;
    }

    const lineH = lineEls[0].offsetHeight;
    if (lineH > 0) engine.lineH = lineH;

    const style = getComputedStyle(lineEls[0]);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    engine.caretH = caretStyleRef.current === "underline" ? 3 : fontSize * 1.15;
    if (caretRef.current) caretRef.current.style.height = `${engine.caretH}px`;

    const records = new Map();
    for (const lineEl of lineEls) {
      for (const el of lineEl.querySelectorAll(".word")) {
        const wordIndex = Number(el.dataset.w);
        const target = wordsRef.current[wordIndex] ?? "";
        const chars = Array.from(el.children);
        const width = el.offsetWidth;
        const charW =
          chars.length > 1
            ? chars[1].offsetLeft - chars[0].offsetLeft
            : target.length
              ? width / target.length
              : 0;
        records.set(wordIndex, {
          el,
          chars,
          width,
          charW,
          x: el.offsetLeft,
          top: el.offsetTop,
          target,
          extras: [],
        });
      }
    }
    engine.records = records;
    engine.charW = records.get(engine.wordIndex)?.charW || engine.charW;

    records.forEach((record, wordIndex) => {
      const typed = engine.typed[wordIndex] || "";
      const target = record.target;
      record.chars.forEach((span, index) => {
        span.classList.remove("correct", "incorrect");
        if (index < typed.length) {
          span.classList.add(typed[index] === target[index] ? "correct" : "incorrect");
        }
      });
      const extras = Math.min(Math.max(0, typed.length - target.length), MAX_EXTRAS);
      for (let i = 0; i < extras; i += 1) addExtraSpan(record, typed[target.length + i]);
    });
    setCurrentWord();
  }, [engine, caretRef, columnRef, setCurrentWord]);

  const applyCaret = useCallback(
    (wrap) => {
      const caret = caretRef.current;
      const caretY = caretYRef.current;
      const record = engine.records.get(engine.wordIndex);
      if (!caret || !caretY || !record || !engine.lineH) return;
      const typed = engine.typed[engine.wordIndex] || "";
      const underline = caretStyleRef.current === "underline";
      const x = record.x + typed.length * record.charW;
      const y = underline
        ? record.top + engine.lineH - engine.caretH - 2
        : record.top + (engine.lineH - engine.caretH) / 2;
      if (wrap) {
        caret.classList.add("no-snap");
        requestAnimationFrame(() => caret.classList.remove("no-snap"));
      }
      caretY.style.transform = `translate3d(0, ${Math.round(y)}px, 0)`;
      caret.style.transform = `translate3d(${Math.round(x)}px, 0, 0)`;
    },
    [caretRef, caretYRef, engine]
  );

  const activeLineIndex = useCallback(() => {
    const total = linesRef.current.length;
    if (!total) return 0;
    for (let i = 0; i < total; i += 1) {
      const line = linesRef.current[i];
      if (engine.wordIndex >= line.start && engine.wordIndex <= line.end) return i;
    }
    return total - 1;
  }, [engine]);

  const applyActiveLine = useCallback(() => {
    const column = columnRef.current;
    if (!column || !engine.lineH) return;
    const active = activeLineIndex();
    const wrap = active !== engine.activeLine;
    engine.activeLine = active;
    // `--top` lives on the column only and changes only when the line does.
    const top = active * engine.lineH;
    if (top !== engine.top) {
      engine.top = top;
      column.style.setProperty("--top", String(top));
    }
    if (wrap) applyCaret(true);
  }, [activeLineIndex, applyCaret, columnRef, engine]);

  /* -------------------------------------------------------------- sessions */

  const closeSession = useCallback(() => {
    const recorder = engine.recorder;
    if (!recorder) return;
    engine.recorder = null;
    const session = buildSession(recorder, {
      words: wordsRef.current,
      typedWords: engine.typed.slice(0, engine.wordIndex + 1),
      committed: Math.min(engine.wordIndex, wordsRef.current.length),
      dataset: datasetRef.current,
      prior: engine.prior,
    });
    engine.prior = emptyPrior();
    if (!session) return;
    whenIdle(() => {
      saveSession(session);
    });
    pushSessionInBackground(session, authRef.current);
  }, [engine]);

  /**
   * A frozen caret reads as broken, so it blinks whenever no run is under way —
   * including the "press any key" state before the very first keystroke.
   */
  const syncCaretIdle = useCallback(() => {
    const caret = caretRef.current;
    if (caret) caret.classList.toggle("is-idle", !document.body.classList.contains("has-run"));
  }, [caretRef]);

  const clearRun = useCallback(() => {
    closeSession();
    engine.wordIndex = 0;
    engine.typed = [""];
    engine.activeLine = -1;
    engine.top = 0;
    engine.currentWordEl = null;
    engine.recorder = null;
    engine.prior = emptyPrior();
    engine.keys.length = 0;
    engine.lastKeyAt = 0;
    engine.lastErrorAt = 0;
    engine.wpmEma = null;
    engine.snapOff = false;
    document.body.classList.remove("has-run", "typing");
    window.clearTimeout(blinkTimerRef.current);
    window.clearTimeout(notchTimerRef.current);
    window.clearTimeout(errorTimerRef.current);
    if (caretRef.current) {
      caretRef.current.classList.remove("is-error");
      caretRef.current.style.transform = "translate3d(0, 0, 0)";
    }
    syncCaretIdle();
    if (caretYRef.current) caretYRef.current.style.transform = "translate3d(0, 0, 0)";
    if (columnRef.current) columnRef.current.style.setProperty("--top", "0");
    if (glowRef.current) glowRef.current.style.opacity = "0";
    setRolling(wpmRef.current, "—");
    setRolling(accRef.current, "—");
    wpmRef.current?.classList.remove("is-dim");
    accRef.current?.classList.remove("is-dim");
  }, [caretRef, caretYRef, closeSession, columnRef, engine, glowRef, syncCaretIdle, wpmRef, accRef]);

  const resetRun = useCallback(() => {
    clearRun();
    syncDom();
    applyCaret(false);
    applyActiveLine();
  }, [applyActiveLine, applyCaret, clearRun, syncDom]);

  /* ---------------------------------------------------------------- layout */

  const recomputeLines = useCallback(() => {
    const stage = stageRef.current;
    const column = columnRef.current;
    if (!stage || !column) return;
    const currentWords = wordsRef.current;
    if (!currentWords.length) return;
    const sample = column.querySelector(".type-line") || column;
    const base = createMeasurer(fontStringOf(sample));
    const width = stage.clientWidth;
    if (!base || !width) return;
    const fontSize = Number.parseFloat(getComputedStyle(sample).fontSize) || 16;
    const spacing = LETTER_SPACING * fontSize;
    // CSS letter-spacing adds after every glyph, canvas does not count it.
    const measure = (text) => base(text) + text.length * spacing;
    const { lines: raw, spaceWidth } = breakLines(currentWords, measure, Math.max(120, width - 2));
    column.style.setProperty("--space-w", `${spaceWidth}px`);
    const previous = linesRef.current;
    const next = raw.map((line, index) => {
      const old = previous[index];
      if (old && old.start === line.start && old.end === line.end) return old;
      return { ...line, index, words: currentWords.slice(line.start, line.end + 1) };
    });
    linesRef.current = next;
    setLines(next);
  }, [columnRef, stageRef]);

  const loadDataset = useCallback(
    (name) => DATASETS[name] || DATASETS["english-200"],
    []
  );

  const startEntrance = useCallback(() => {
    const column = columnRef.current;
    if (!column) return;
    column.classList.remove("is-enter", "is-leaving");
    // reflow-free restart of the animation
    void column.offsetWidth;
    column.classList.add("is-enter");
    window.clearTimeout(enterTimerRef.current);
    enterTimerRef.current = window.setTimeout(() => {
      columnRef.current?.classList.remove("is-enter");
    }, ENTRANCE_MS);
  }, [columnRef]);

  const leaveThen = useCallback(
    (build) => {
      const column = columnRef.current;
      if (!column || leaveLockRef.current) {
        build();
        return;
      }
      leaveLockRef.current = true;
      column.classList.add("is-leaving");
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = window.setTimeout(() => {
        leaveLockRef.current = false;
        build();
        // startEntrance() drops `is-leaving`, so the outgoing text never
        // flashes back for a frame while React swaps the words.
        startEntrance();
      }, LEAVE_MS);
    },
    [columnRef, startEntrance]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadDataset(dataset)()
      .then((module) => {
        if (cancelled) return;
        poolRef.current = Array.isArray(module.default) ? module.default : [];
        bagRef.current = [];
        lastWordRef.current = "";
        resetRun();
        setWords(drawWords(START_WORDS));
        setLoading(false);
        startEntrance();
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError?.message || "Could not load the word list");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset, attempt, drawWords, loadDataset, resetRun, startEntrance]);

  // Warm the other datasets while idle so switching is instant.
  useEffect(() => {
    const run = () => {
      Object.entries(DATASETS).forEach(([key, load]) => {
        if (key !== dataset) load().catch(() => {});
      });
    };
    const id =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(run, { timeout: 5_000 })
        : window.setTimeout(run, 2_000);
    return () => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [dataset]);

  useLayoutEffect(() => {
    recomputeLines();
  }, [recomputeLines, words]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recomputeLines();
      });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    window.addEventListener("resize", schedule);
    document.fonts?.ready?.then(schedule).catch(() => {});
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [recomputeLines, stageRef]);

  useLayoutEffect(() => {
    syncDom();
    applyActiveLine();
    applyCaret(false);
    // The caret only enters the DOM once the word list has landed, so this is
    // where a brand-new session picks up its blinking state.
    syncCaretIdle();
    if (engine.snapOff) {
      // The rebase frame painted without a transition; hand it back only
      // after that paint, so nothing animates into place.
      engine.snapOff = false;
      const column = columnRef.current;
      requestAnimationFrame(() => column?.classList.remove("no-snap"));
    }
  }, [applyActiveLine, applyCaret, columnRef, engine, lines, syncCaretIdle, syncDom]);

  useEffect(() => {
    appendLockRef.current = false;
  }, [words]);

  // Caret style changes only need a height refresh, not a full re-render.
  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (!caret) return;
    const fontSize = Number.parseFloat(getComputedStyle(caret).fontSize) || 16;
    engine.caretH = caretStyle === "underline" ? 3 : fontSize * 1.15;
    caret.style.height = `${engine.caretH}px`;
    caret.classList.toggle("caret-block", caretStyle === "block");
    caret.classList.toggle("caret-underline", caretStyle === "underline");
    syncCaretIdle();
    applyCaret(false);
  }, [applyCaret, caretRef, caretStyle, engine, syncCaretIdle]);

  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches)
    );
  }, []);

  /* --------------------------------------------------------------- actions */

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, [inputRef]);

  const noteKey = useCallback(
    (now, correct) => {
      engine.keys.push(now, correct ? 1 : 0);
      engine.lastKeyAt = now;
      if (!correct) engine.lastErrorAt = now;
      if (engine.keys.length > 400) engine.keys.splice(0, 200);
    },
    [engine]
  );

  const flashError = useCallback(() => {
    const caret = caretRef.current;
    if (!caret) return;
    caret.classList.add("is-error");
    window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      caretRef.current?.classList.remove("is-error");
    }, 220);
  }, [caretRef]);

  const markActivity = useCallback(() => {
    if (!document.body.classList.contains("typing")) document.body.classList.add("typing");
    if (!document.body.classList.contains("has-run")) {
      document.body.classList.add("has-run");
      setRolling(wpmRef.current, "—");
    }
    const caret = caretRef.current;
    if (caret) {
      caret.classList.remove("is-idle");
      window.clearTimeout(blinkTimerRef.current);
      blinkTimerRef.current = window.setTimeout(
        () => caretRef.current?.classList.add("is-idle"),
        CARET_BLINK_MS
      );
    }
    window.clearTimeout(notchTimerRef.current);
    notchTimerRef.current = window.setTimeout(() => {
      document.body.classList.remove("typing");
    }, IDLE_NOTCH_MS);
  }, [caretRef, wpmRef]);

  const maybeAppend = useCallback(
    (activeLine) => {
      const total = linesRef.current.length;
      if (!total || appendLockRef.current) return;
      if (activeLine < total - APPEND_AHEAD_LINES) return;
      appendLockRef.current = true;
      const more = drawWords(APPEND_WORDS);
      if (more.length) setWords((previous) => previous.concat(more));
    },
    [drawWords]
  );

  /**
   * Endless rebase: drop the first 150 words once the cursor passes 300,
   * keeping the session's numbers by folding the dropped words into `prior`.
   * The column loses its transition for this frame so nothing visually moves.
   */
  const maybeRebase = useCallback(() => {
    if (engine.wordIndex <= REBASE_WORDS) return;
    const drop = Math.min(REBASE_DROP, engine.wordIndex - 1);
    if (drop <= 0) return;

    const dropped = analyze(
      engine.typed.slice(0, drop),
      wordsRef.current.slice(0, drop),
      drop,
      0,
      {}
    );
    engine.prior.chars.correct += dropped.chars.correct;
    engine.prior.chars.incorrect += dropped.chars.incorrect;
    engine.prior.chars.extra += dropped.chars.extra;
    engine.prior.chars.missed += dropped.chars.missed;
    engine.prior.netChars += dropped.netChars;
    engine.prior.rawChars += dropped.rawChars;

    engine.typed = engine.typed.slice(drop);
    engine.wordIndex -= drop;
    engine.currentWordEl = null;

    const column = columnRef.current;
    engine.snapOff = true;
    column?.classList.add("no-snap");
    setWords((previous) => previous.slice(drop));
  }, [columnRef, engine]);

  const scheduleFrame = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      applyActiveLine();
      applyCaret(false);
      // Appends and rebases are never on the keydown path: they re-render
      // and re-measure, so they wait for the frame after the keystroke.
      maybeAppend(engine.activeLine);
      maybeRebase();
    });
  }, [applyActiveLine, applyCaret, engine, maybeAppend, maybeRebase]);

  const step = useCallback(() => {
    scheduleFrame();
  }, [scheduleFrame]);

  const typeChar = useCallback(
    (char) => {
      const wordIndex = engine.wordIndex;
      const target = wordsRef.current[wordIndex] || "";
      const typed = engine.typed[wordIndex] || "";
      if (typed.length >= target.length + MAX_EXTRAS) return;
      const expected = typed.length < target.length ? target[typed.length] : "";
      const correct = char === expected;
      const now = performance.now();
      if (!engine.recorder) engine.recorder = createRecorder(Date.now());
      recordChar(engine.recorder, { correct, now });
      recordKeyStat(engine.recorder, expected || char, { correct, now });
      noteKey(now, correct);

      engine.typed[wordIndex] = typed + char;
      const record = engine.records.get(wordIndex);
      if (record) {
        if (typed.length < target.length) {
          record.chars[typed.length]?.classList.add(correct ? "correct" : "incorrect");
        } else {
          addExtraSpan(record, char);
        }
      }
      if (!correct) flashError();
      playRef.current(correct);
      markActivity();
      step();
    },
    [engine, flashError, markActivity, noteKey, step]
  );

  const typeSpace = useCallback(() => {
    const wordIndex = engine.wordIndex;
    const target = wordsRef.current[wordIndex] || "";
    const typed = engine.typed[wordIndex] || "";
    const correct = typed === target;
    const now = performance.now();
    if (!engine.recorder) engine.recorder = createRecorder(Date.now());
    recordChar(engine.recorder, { correct, now });
    recordKeyStat(engine.recorder, " ", { correct, now });
    noteKey(now, correct);

    engine.records.get(wordIndex)?.el.classList.toggle("is-complete", correct);
    engine.wordIndex = wordIndex + 1;
    if (engine.typed[engine.wordIndex] === undefined) engine.typed[engine.wordIndex] = "";
    if (!correct) flashError();
    playRef.current(correct);
    markActivity();
    setCurrentWord();
    step();
  }, [engine, flashError, markActivity, noteKey, setCurrentWord, step]);

  const clearWord = useCallback(
    (wordIndex) => {
      const record = engine.records.get(wordIndex);
      if (record) {
        record.chars.forEach((span) => span.classList.remove("correct", "incorrect"));
        record.extras.forEach((span) => span.remove());
        record.extras.length = 0;
        record.el.classList.remove("is-complete");
      }
      engine.typed[wordIndex] = "";
    },
    [engine]
  );

  const typeBackspace = useCallback(() => {
    const wordIndex = engine.wordIndex;
    const typed = engine.typed[wordIndex] || "";
    if (engine.recorder) recordBackspace(engine.recorder);

    if (typed.length > 0) {
      const target = wordsRef.current[wordIndex] || "";
      const record = engine.records.get(wordIndex);
      if (record) {
        if (typed.length > target.length) {
          record.extras.pop()?.remove();
        } else {
          record.chars[typed.length - 1]?.classList.remove("correct", "incorrect");
        }
      }
      engine.typed[wordIndex] = typed.slice(0, -1);
      markActivity();
      step();
      return;
    }

    if (wordIndex > 0) {
      const previous = wordIndex - 1;
      const previousTyped = engine.typed[previous] || "";
      engine.wordIndex = previous;
      engine.records.get(previous)?.el.classList.remove("is-complete");
      if (previousTyped.length) {
        const target = wordsRef.current[previous] || "";
        const record = engine.records.get(previous);
        if (record) {
          if (previousTyped.length > target.length) record.extras.pop()?.remove();
          else record.chars[previousTyped.length - 1]?.classList.remove("correct", "incorrect");
        }
        engine.typed[previous] = previousTyped.slice(0, -1);
      }
      markActivity();
      setCurrentWord();
      step();
    }
  }, [engine, markActivity, setCurrentWord, step]);

  const deleteWord = useCallback(() => {
    const wordIndex = engine.wordIndex;
    if (engine.recorder) recordBackspace(engine.recorder);
    if ((engine.typed[wordIndex] || "").length) {
      clearWord(wordIndex);
    } else if (wordIndex > 0) {
      engine.wordIndex = wordIndex - 1;
      clearWord(engine.wordIndex);
    }
    markActivity();
    setCurrentWord();
    step();
  }, [clearWord, engine, markActivity, setCurrentWord, step]);

  const spinRestart = useCallback(() => {
    const button = restartRef.current;
    if (!button) return;
    button.classList.remove("is-spin");
    void button.offsetWidth;
    button.classList.add("is-spin");
    window.clearTimeout(spinTimerRef.current);
    spinTimerRef.current = window.setTimeout(() => {
      restartRef.current?.classList.remove("is-spin");
    }, 600);
  }, [restartRef]);

  const restart = useCallback(() => {
    spinRestart();
    resetRun();
  }, [resetRun, spinRestart]);

  const newText = useCallback(() => {
    spinRestart();
    leaveThen(() => {
      resetRun();
      bagRef.current = [];
      setWords(drawWords(START_WORDS));
    });
  }, [drawWords, leaveThen, resetRun, spinRestart]);

  /* --------------------------------------------------------------- input */

  const processKey = useCallback(
    (event) => {
      if (event.isComposing || composingRef.current) return false;
      if (event.repeat) {
        // Held keys never type, but their default action must not fire either.
        const repeated = event.key;
        if (repeated === "Tab" || repeated === "Backspace" || repeated === " ") {
          event.preventDefault();
        }
        return true;
      }
      if (panelRef?.current) return true;

      const target = event.target;
      const isTypingInput = target === inputRef.current;
      const tag = target?.tagName;
      const inField =
        !isTypingInput &&
        (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable);
      if (inField) return true;

      const key = event.key;
      if (key === "Escape") {
        document.body.classList.remove("typing");
        return true;
      }
      if (key === "Tab" || (key === "Enter" && event.shiftKey)) {
        event.preventDefault();
        handledAtRef.current = performance.now();
        newText();
        return true;
      }
      if (key === "Enter") {
        event.preventDefault();
        handledAtRef.current = performance.now();
        restart();
        return true;
      }
      if (key === "Backspace") {
        event.preventDefault();
        handledAtRef.current = performance.now();
        if (event.ctrlKey || event.altKey || event.metaKey) deleteWord();
        else typeBackspace();
        return true;
      }
      if (key === " ") {
        event.preventDefault();
        handledAtRef.current = performance.now();
        typeSpace();
        return true;
      }
      if (key.length === 1) {
        if (event.ctrlKey || event.metaKey || event.altKey) return false;
        event.preventDefault();
        handledAtRef.current = performance.now();
        typeChar(key);
        return true;
      }
      if (
        key.startsWith("Arrow") ||
        key === "Home" ||
        key === "End" ||
        key === "PageUp" ||
        key === "PageDown"
      ) {
        event.preventDefault();
        return true;
      }
      return false;
    },
    [deleteWord, inputRef, newText, panelRef, restart, typeBackspace, typeChar, typeSpace]
  );

  const processRef = useRef(processKey);
  processRef.current = processKey;

  // One global listener: no input element on desktop (Plan 4.0 §4.1).
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      processRef.current(event);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // The notch comes back when the pointer moves.
  useEffect(() => {
    const onMove = () => {
      if (document.body.classList.contains("typing")) {
        document.body.classList.remove("typing");
        window.clearTimeout(notchTimerRef.current);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const onInput = useCallback((event) => {
    const value = event.target.value;
    event.target.value = "";
    if (!value || composingRef.current) return;
    if (performance.now() - handledAtRef.current < 60) return;
    for (const char of value) {
      if (char === " ") typeSpace();
      else typeChar(char);
    }
  }, [typeChar, typeSpace]);

  const onPaste = useCallback((event) => event.preventDefault(), []);
  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);
  const onCompositionEnd = useCallback((event) => {
    composingRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
    const data = event.data;
    if (!data) return;
    for (const char of data) {
      if (char === " ") typeSpace();
      else typeChar(char);
    }
  }, [inputRef, typeChar, typeSpace]);

  const inputProps = {
    onKeyDown: (event) => {
      if (processRef.current(event)) event.preventDefault();
    },
    onInput,
    onPaste,
    onCut: onPaste,
    onDrop: onPaste,
    onCompositionStart,
    onCompositionEnd,
  };

  // Keep the on-screen keyboard from pushing the text off the screen.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const onResize = () => {
      if (document.activeElement === inputRef.current) window.scrollTo(0, 0);
    };
    viewport.addEventListener("resize", onResize);
    return () => viewport.removeEventListener("resize", onResize);
  }, [inputRef]);

  /* --------------------------------------------------- stats + flow glow */

  const flowValue = useCallback(
    (now) => {
      const keys = engine.keys;
      let correct = 0;
      for (let i = 0; i < keys.length; i += 2) {
        if (keys[i + 1]) correct += 1;
      }
      let flow = Math.min(1, correct / GLOW_KEYS);
      if (now - engine.lastErrorAt < 1_500) flow *= 0.3;
      if (now - engine.lastKeyAt > 1_500) flow = 0;
      return flow;
    },
    [engine]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const recorder = engine.recorder;
      if (recorder && isIdle(recorder, now)) closeSession();

      // Prune the flow window off the typing path (never per keystroke).
      const keys = engine.keys;
      let drop = 0;
      while (drop < keys.length && now - keys[drop] > GLOW_WINDOW_MS) drop += 2;
      if (drop) keys.splice(0, drop);

      if (!document.body.classList.contains("has-run")) return;

      const accEl = accRef.current;
      const wpmEl = wpmRef.current;
      if (recorder && recorder.keystrokes) {
        const accuracy = (recorder.correctKeystrokes / recorder.keystrokes) * 100;
        setRolling(accEl, accuracy >= 100 ? "100" : accuracy.toFixed(1));
      }

      const idleFor = recorder ? now - recorder.lastKeyAt : Number.POSITIVE_INFINITY;
      if (idleFor <= IDLE_DIM_MS) {
        const target = liveWpm(recorder, now);
        if (target !== null) {
          engine.wpmEma =
            engine.wpmEma === null ? target : engine.wpmEma + 0.4 * (target - engine.wpmEma);
          setRolling(wpmEl, String(Math.round(engine.wpmEma)));
        }
        wpmEl?.classList.remove("is-dim");
        accEl?.classList.remove("is-dim");
      } else {
        wpmEl?.classList.add("is-dim");
        accEl?.classList.add("is-dim");
      }

      if (flowRef.current && glowRef.current && now - engine.glowAt >= GLOW_MS) {
        engine.glowAt = now;
        glowRef.current.style.opacity = String(flowValue(now));
      }
    }, STATS_MS);
    return () => window.clearInterval(id);
  }, [accRef, closeSession, engine, flowValue, glowRef, wpmRef]);

  // Close the open session when the tab goes away, then save on unmount.
  useEffect(() => {
    const flush = () => closeSession();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [closeSession]);

  useEffect(
    () => () => {
      window.clearTimeout(blinkTimerRef.current);
      window.clearTimeout(notchTimerRef.current);
      window.clearTimeout(errorTimerRef.current);
      window.clearTimeout(enterTimerRef.current);
      window.clearTimeout(leaveTimerRef.current);
      window.clearTimeout(spinTimerRef.current);
      cancelAnimationFrame(frameRef.current);
      document.body.classList.remove("typing", "has-run");
    },
    []
  );

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return {
    words,
    lines,
    loading,
    error,
    retry,
    restart,
    newText,
    focusInput,
    inputProps,
    isTouch,
    caretStyle,
  };
}
