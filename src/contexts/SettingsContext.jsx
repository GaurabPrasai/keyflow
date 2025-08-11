import { createContext, useState, useEffect } from "react";

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    cursorColor: "#3b82f6",
    textDataset: "english-200",
    soundEnabled: true,
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cursor-color",
      settings.cursorColor
    );
  }, [settings.cursorColor]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
