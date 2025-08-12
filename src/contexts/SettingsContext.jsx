import { createContext, useState, useEffect } from "react";

export const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  cursorColor: "#3b82f6",
  textDataset: "english-200",
  soundEnabled: true,
  fontSize: "2rem",
};

export const SettingsProvider = ({ children }) => {
  // Load from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("keyflow-settings");
      return saved
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      return DEFAULT_SETTINGS;
    }
  });

  // Temp settings for modal edits
  const [tempSettings, setTempSettings] = useState(settings);

  // Apply CSS vars when settings change
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cursor-color",
      settings.cursorColor
    );
    document.documentElement.style.setProperty(
      "--typing-font-size",
      settings.fontSize
    );
  }, [settings.cursorColor, settings.fontSize]);

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem("keyflow-settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, [settings]);

  const updateTempSetting = (key, value) => {
    setTempSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = () => {
    setSettings(tempSettings);
  };

  const resetToDefaults = () => {
    setTempSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  };

  const cancelChanges = () => {
    setTempSettings(settings);
  };

  const initializeTempSettings = () => {
    setTempSettings(settings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        tempSettings,
        updateTempSetting,
        saveSettings,
        resetToDefaults,
        cancelChanges,
        initializeTempSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
