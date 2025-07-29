import { createContext, useState } from "react";
import useText from "../hooks/useTexts";
import useTyping from "../hooks/useTyping";

export const TextDataContext = createContext();

const TextProvider = ({ children, textDataset = "english-200" }) => {

  const { text: targetText, shuffleText } = useText(textDataset);
  const typingData = useTyping(targetText);

  const contextValue = {
    targetText,
    shuffleText,
    ...typingData,
  };

  return (
    <TextDataContext.Provider value={contextValue}>
      {children}
    </TextDataContext.Provider>
  );
};

export default TextProvider;