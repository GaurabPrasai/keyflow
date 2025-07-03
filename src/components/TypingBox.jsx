import useTyping from "../hooks/useTyping";

const TypingBox = () => {

  const{ inputValue, isTyping, targetText, handleInputChange, charStatus } = useTyping();

  return (
    <div className="typing-container">
      <div className="text-display" id="textDisplay">
        {targetText}
      </div>
      <input
        type="text"
        className="input-field"
        id="inputField"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        aria-label="Type the text above"
      />

      <div className="progress-indicator">
        <div className="progress-bar" id="progressBar"></div>
      </div>
    </div>
  );
};

export default TypingBox;
