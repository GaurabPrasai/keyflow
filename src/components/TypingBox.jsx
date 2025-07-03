import useTyping from "../hooks/useTyping";

const TypingBox = () => {
  const {
    isTyping,
    inputValue,
    currentIndex,
    targetText,
    handleInputChange,
    charStatus,
  } = useTyping();

  return (
    <div className="typing-container">
      <div className="text-display" id="textDisplay">
        {targetText.split("").map((char, index) => {
          const status = charStatus[index];
          return (
            <span
              key={index}
              className={
                status === "correct"
                  ? "correct"
                  : status === "incorrect"
                  ? "incorrect"
                  : ""
              }
            >
              {char}
            </span>
          );
        })}
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

      <div className="progress-indicator">
        <div className="progress-bar" id="progressBar"></div>
      </div>
    </div>
  );
};

export default TypingBox;
