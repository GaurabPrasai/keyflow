const TypingBox = ({ typingData }) => {

  const {
    isTyping,
    inputValue,
    currentIndex,
    handleInputChange,
    charStatus,
    processedWords,
    currentLine,
    progress,
    
  } = typingData;

  return (
    <div className="typing-wrapper">
      <div className="typing-container">
        <div
          className="text-display"
          id="textDisplay"
          style={{
            transform: `translateY(-${currentLine * 1.5}em)`, // same as line-height
          }}
        >
          {(() => {
            let index = 0;
            return processedWords.map((wordObj, wordIndex) => {
              return (
                <span key={wordIndex} className="word">
                  {wordObj.characters.map((char, charIndex) => {
                    const status = charStatus[index];
                    index++; // Increment for next character

                    if (index > currentIndex + 150) {
                      return null; // skip far-away characters(ONLY OF THE BOTTOM)
                    }

                    return (
                      <span
                        key={charIndex}
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
          onChange={handleInputChange}
          value={inputValue}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          aria-label="Type the text above"
        />
      </div>

      {/* Progress bar moved outside the typing-container */}
      <div className="progress-indicator">
        <div
          className="progress-bar"
          id="progressBar"
          style={{ width: `${progress || 10}%` }}
        ></div>
      </div>
    </div>
  );
};

export default TypingBox;
