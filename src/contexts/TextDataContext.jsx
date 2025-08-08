import { createContext } from "react";
import useText from "../hooks/useTexts";
import useTyping from "../hooks/useTyping";

export const TextDataContext = createContext();

const TextProvider = ({ children, textDataset }) => {
  const { 
    text: targetText, 
    shuffleText, 
    isLoading, 
    loadNextChunk, 
    checkAndLoadNext,
    currentChunkIndex,
    totalLoadedWords
  } = useText(textDataset);
  
  const typingData = useTyping(targetText, checkAndLoadNext);

  const contextValue = {
    targetText,
    shuffleText,
    isLoading,
    loadNextChunk,
    currentChunkIndex,
    totalLoadedWords,
    ...typingData,
  };

  return (
    <TextDataContext.Provider value={contextValue}>
      {children}
    </TextDataContext.Provider>
  );
};

export default TextProvider;