import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useUI } from "../contexts/UIContext";
import { useAuth } from "../hooks/useAuth";
import useTypingSound from "../hooks/useTypingSound";
import useTypingTest from "../hooks/useTypingTest";
import { RestartIcon } from "./Icons";

const TIPS = [
  { key: "tab", text: "fresh words" },
  { key: "ctrl + ⌫", text: "erase a whole word" },
  { key: "esc", text: "bring the toolbar back" },
];

const Line = memo(function Line({ line }) {
  return (
    <div className="type-line" data-line={line.index}>
      {line.words.map((word, offset) => {
        const wordIndex = line.start + offset;
        return (
          <span
            className="word"
            key={wordIndex}
            data-w={wordIndex}
            style={{ "--i": Math.min(wordIndex, 70) }}
          >
            {Array.from(word).map((char, charIndex) => (
              <span className="ch" key={charIndex}>
                {char}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
});

const TypingTest = () => {
  const { settings } = useSettings();
  const { panelRef } = useUI();
  const { isAuthenticated } = useAuth();
  const playSound = useTypingSound({ pack: settings.soundPack, volume: settings.volume });

  const shellRef = useRef(null);
  const stageRef = useRef(null);
  const columnRef = useRef(null);
  const caretYRef = useRef(null);
  const caretRef = useRef(null);
  const inputRef = useRef(null);
  const wpmRef = useRef(null);
  const accRef = useRef(null);
  const glowRef = useRef(null);
  const restartRef = useRef(null);

  const flowEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).has("noglow")) return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const glowOn = flowEnabled && settings.flowGlow;

  const engine = useTypingTest({
    dataset: settings.textDataset,
    caretStyle: settings.caretStyle,
    playSound,
    authenticated: isAuthenticated,
    flowEnabled: glowOn,
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
  });

  const { words, lines, loading, error, retry, restart, focusInput, inputProps, isTouch, caretStyle } =
    engine;

  /* rotating tip — only cycles while nobody is typing */
  const [tipIndex, setTipIndex] = useState(0);
  const [tipSwapping, setTipSwapping] = useState(false);

  useEffect(() => {
    let swapTimer = 0;
    const id = window.setInterval(() => {
      if (document.body.classList.contains("typing")) return;
      setTipSwapping(true);
      swapTimer = window.setTimeout(() => {
        setTipIndex((current) => (current + 1) % TIPS.length);
        setTipSwapping(false);
      }, 350);
    }, 5_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, []);

  const tip = TIPS[tipIndex];

  return (
    <main className="type-shell" ref={shellRef}>
      {glowOn ? (
        <div className="glow" ref={glowRef} aria-hidden="true" />
      ) : null}

      {error ? (
        <div className="type-error" role="alert">
          <p>{error}</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : loading || !words.length ? (
        <div className="type-skeleton" aria-busy="true" aria-label="Loading words">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <>
          <div className="type-stage" ref={stageRef} onClick={focusInput}>
            <div className="type-column" ref={columnRef}>
              {lines.map((line) => (
                <Line key={line.start} line={line} />
              ))}
              <div className="caret-y" ref={caretYRef}>
                <div className={`caret caret-${caretStyle}`} ref={caretRef} aria-hidden="true" />
              </div>
            </div>
          </div>
          <p className="start-hint">start typing</p>
        </>
      )}

      <button
        type="button"
        className="restart"
        ref={restartRef}
        aria-label="Restart this text (Enter)"
        onClick={restart}
      >
        <RestartIcon size={18} />
      </button>

      <div className={`tip ${tipSwapping ? "is-swap" : ""}`}>
        <kbd>{tip.key}</kbd>
        <span>{tip.text}</span>
      </div>

      <div className="stats" role="presentation">
        <span className="stats-value roll" ref={wpmRef} />
        <span className="stats-unit">wpm</span>
        <span className="stats-sep" />
        <span className="stats-value roll" ref={accRef} />
        <span className="stats-unit">%</span>
      </div>

      {isTouch ? (
        <input
          className="typing-input"
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          aria-label="Typing input"
          {...inputProps}
        />
      ) : null}
    </main>
  );
};

export default TypingTest;
