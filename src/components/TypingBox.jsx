const TypingBox = () => {
  return (
    <div className="typing-container">
      <div className="text-display" id="textDisplay">
        Minimalism is not about having less. It is about making room for what
        matters most. Focus on the essentials, eliminate the unnecessary.
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
