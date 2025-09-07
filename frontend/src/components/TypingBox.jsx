import { useState, useRef, useContext, useEffect, useCallback } from "react";
import { TextDataContext } from "../contexts/TextDataContext";

const TypingBox = () => {
  const [currentLine, setCurrentLine] = useState(null);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const typingData = useContext(TextDataContext);
  const currentCharRef = useRef(null);
  const textDisplayRef = useRef(null);
  const typingContainerRef = useRef(null);
  const typingTimerRef = useRef(null);

  const {
    isTyping,
    inputValue,
    currentIndex,
    handleInputChange,
    charStatus,
    processedWords,
    progress,
  } = typingData;

  const scrollToCurrentChar = useCallback(() => {
    if (
      !currentCharRef.current ||
      !textDisplayRef.current ||
      !typingContainerRef.current
    ) {
      return;
    }

    const container = typingContainerRef.current;
    const textDisplay = textDisplayRef.current;
    const currentChar = currentCharRef.current;

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;

    // Get current character position relative to the page
    const charRect = currentChar.getBoundingClientRect();
    const charTop = charRect.top;
    const charBottom = charRect.bottom;

    // Check if character is outside the visible area or too close to edges
    const buffer = 40; // Buffer zone from top/bottom edges
    const shouldScroll =
      charTop < containerTop + buffer || charBottom > containerBottom - buffer;

    if (shouldScroll) {
      // Calculate how much to scroll
      const textDisplayRect = textDisplay.getBoundingClientRect();
      const charOffsetFromTextTop = charTop - textDisplayRect.top;

      // Calculate the desired scroll position to center the character
      const desiredScrollTop = charOffsetFromTextTop - containerHeight / 2;

      // Get current transform value
      const currentTransform = textDisplay.style.transform;
      const currentTranslateY = currentTransform.match(
        /translateY\((-?\d*\.?\d+)rem\)/
      )
        ? parseFloat(
            currentTransform.match(/translateY\((-?\d*\.?\d+)rem\)/)[1]
          )
        : 0;

      // Convert pixels to rem
      const remSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      );
      const newTranslateY = currentTranslateY - desiredScrollTop / remSize;

      // Apply smooth transform
      textDisplay.style.transform = `translateY(${newTranslateY}rem)`;

      const lineHeight = 1.8; // rem
      const newLine = Math.max(
        0,
        Math.round(Math.abs(newTranslateY) / lineHeight)
      );
      setCurrentLine(newLine);
    }
  }, [setCurrentLine]);

  // Focus mode handler
  const handleTypingStart = useCallback(() => {
    if (!isInFocusMode) {
      document.body.className = "typing-focus"; // or 'typing-focus-shimmer'
      setIsInFocusMode(true);
    }
    
    // Clear existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Set new timer
    typingTimerRef.current = setTimeout(() => {
      document.body.className = "typing-unfocus";
      setTimeout(() => {
        document.body.className = "";
        setIsInFocusMode(false);
      }, 800); // Match transition duration
    }, 5000);
  }, [isInFocusMode]);

  // Enhanced input change handler
  const handleEnhancedInputChange = useCallback((e) => {
    handleInputChange(e); // Call original handler
    handleTypingStart(); // Trigger focus mode
  }, [handleInputChange, handleTypingStart]);

  // Debounced scroll function
  const debouncedScroll = useCallback(() => {
    let timeoutId;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(scrollToCurrentChar, 16); // ~60fps
    };
  }, [scrollToCurrentChar]);

  const debouncedScrollFn = debouncedScroll();

  useEffect(() => {
    debouncedScrollFn();
  }, [currentIndex, debouncedScrollFn]);

  // Reset scroll position when typing restarts
  useEffect(() => {
    if (currentIndex === 0 && textDisplayRef.current) {
      textDisplayRef.current.style.transform = "translateY(0rem)";
      setCurrentLine(0);
      // Reset focus mode when test resets
      if (isInFocusMode) {
        document.body.className = "";
        setIsInFocusMode(false);
        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
        }
      }
    }
  }, [currentIndex, setCurrentLine, isInFocusMode]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      // Clean up body class on unmount
      document.body.className = "";
    };
  }, []);

  return (
    <div className="typing-wrapper">
      <div className="typing-container" ref={typingContainerRef}>
        <div
          className="text-display"
          id="textDisplay"
          ref={textDisplayRef}
          style={{
            transform: `translateY(-${(currentLine || 0) * 1.8}rem)`,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth easing
          }}
        >
          {(() => {
            let index = 0;
            return processedWords.map((wordObj, wordIndex) => {
              return (
                <span key={wordIndex} className="word">
                  {wordObj.characters.map((char, charIndex) => {
                    const status = charStatus[index];
                    const isCurrentChar = status === "current";
                    const currentIdx = index;
                    index++;

                    // Stop rendering far-ahead bottom characters
                    if (currentIdx > currentIndex + 250) {
                      return null;
                    }

                    return (
                      <span
                        key={`${wordIndex}-${charIndex}`}
                        ref={isCurrentChar ? currentCharRef : null}
                        className={`char ${
                          status === "correct"
                            ? "correct"
                            : status === "incorrect"
                            ? "incorrect"
                            : status === "current"
                            ? "current"
                            : ""
                        }`}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    );
                  })}
                </span>
              );
            });
          })()}
        </div>
        <input
          type="text"
          className="input-field"
          id="inputField"
          onChange={handleEnhancedInputChange}
          value={inputValue}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Type the text above"
          autoFocus
        />
      </div>

      <div className="progress-indicator">
        <div
          className="progress-bar"
          id="progressBar"
        ></div>
      </div>
    </div>
  );
};

export default TypingBox;