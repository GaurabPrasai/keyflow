import { useContext } from 'react';
import { TextDataContext } from '../contexts/TextDataContext';

const Status = () => {
  const { isTyping, totalTypedChars } = useContext(TextDataContext);

  const getStatusMessage = () => {
    if (!isTyping && totalTypedChars === 0) {
      return "Click anywhere to start typing";
    } else if (isTyping) {
      return "Typing...";
    } else {
      return "Good job! Click to continue or refresh for new text";
    }
  };

  return (
    <div className="game-status" id="gameStatus">
      {getStatusMessage()}
    </div>
  );
};

export default Status;