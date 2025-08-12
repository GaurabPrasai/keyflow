import { createContext, useState, useEffect } from "react";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    cursorColor: "#3b82f6",
    textDataset: "english-200",
    soundEnabled: true,
    fontSize: "2rem",
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cursor-color",
      settings.cursorColor
    );
  }, [settings.cursorColor]);
  
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--typing-font-size",
      settings.fontSize
    );
  }, [settings.fontSize]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
