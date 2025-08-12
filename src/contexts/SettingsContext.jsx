import { createContext, useState, useEffect } from "react";

export const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  cursorColor: "#3b82f6",
  textDataset: "english-200",
  soundEnabled: true,
  fontSize: "2rem",
};

export const SettingsProvider = ({ children }) => {
  // Current applied settings - initialize from localStorage if available
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("keyflow-settings");
      return saved
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.log("Failed to load settings from localStorage:", error);
      return DEFAULT_SETTINGS;
    }
  });

  // Temporary settings while modal is open (not applied until save)
  const [tempSettings, setTempSettings] = useState(settings);

  // Apply CSS custom properties whenever settings change
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

  // Save settings to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem("keyflow-settings", JSON.stringify(settings));
    } catch (error) {
      console.log("Failed to save settings to localStorage:", error);
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
  };

  const cancelChanges = () => {
    setTempSettings(settings); // Revert to current saved settings
  };

  const initializeTempSettings = () => {
    setTempSettings(settings); // Initialize temp settings when modal opens
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        tempSettings,
        setSettings,
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
