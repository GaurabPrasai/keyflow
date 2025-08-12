import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContext";
import "../styles/settings.css";

const SettingsModal = ({ isOpen, setIsOpen }) => {
  const {
    tempSettings,
    updateTempSetting,
    saveSettings,
    resetToDefaults,
    cancelChanges,
  } = useContext(SettingsContext);

  const handleReset = () => {
    resetToDefaults();
  };

  const handleSave = () => {
    saveSettings();
    setIsOpen(false);
  };

  const handleCancel = () => {
    cancelChanges();
    setIsOpen(false);
  };

  const colorOptions = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  const datasetOptions = [
    { value: "english-200", label: "English 200 (Most Common)" },
    { value: "english-1k", label: "English 1K (Top 1000 Words)" },
    { value: "english-5k", label: "English 5K (Top 5000 Words)" },
    { value: "commonly-misspelled", label: "Commonly Misspelled Words" },
  ];

  const fontSizeOptions = [
    { value: "1.6rem", label: "Small" },
    { value: "2rem", label: "Medium" },
    { value: "2.4rem", label: "Large" },
  ];

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      id="settingsModal"
      onClick={handleOverlayClick}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Customization</h2>
          <button
            className="modal-close"
            aria-label="Close settings"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          {/* Font Size */}
          <div className="setting-group">
            <label className="setting-label" htmlFor="fontSize">
              Font Size
            </label>
            <div className="setting-description">
              Adjust the text size for better readability
            </div>
            <select
              className="setting-select"
              id="fontSize"
              value={tempSettings.fontSize}
              onChange={(e) => updateTempSetting("fontSize", e.target.value)}
            >
              {fontSizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset */}
          <div className="setting-group">
            <label className="setting-label" htmlFor="textDataset">
              Text Dataset
            </label>
            <div className="setting-description">
              Choose the type of words you want to practice with
            </div>
            <select
              className="setting-select"
              id="textDataset"
              value={tempSettings.textDataset}
              onChange={(e) => updateTempSetting("textDataset", e.target.value)}
            >
              {datasetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cursor Color */}
          <div className="setting-group">
            <label className="setting-label">Cursor Color</label>
            <div className="setting-description">
              Choose your preferred cursor color
            </div>
            <div className="color-options">
              {colorOptions.map((color) => (
                <div
                  key={color}
                  className={`color-option ${
                    tempSettings.cursorColor === color ? "selected" : ""
                  }`}
                  style={{ background: color }}
                  onClick={() => updateTempSetting("cursorColor", color)}
                ></div>
              ))}
            </div>
          </div>

          {/* Sound Effects */}
          <div className="setting-group">
            <label className="setting-label">Sound Effects</label>
            <div className="setting-description">
              Enable typing sound feedback
            </div>
            <div className="checkbox-group">
              <div
                className={`checkbox ${
                  tempSettings.soundEnabled ? "checked" : ""
                }`}
                onClick={() =>
                  updateTempSetting("soundEnabled", !tempSettings.soundEnabled)
                }
              ></div>
              <label className="checkbox-label">Enable typing sounds</label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            id="resetSettings"
            onClick={handleReset}
          >
            Reset to Default
          </button>
          <button
            className="btn btn-primary"
            id="saveSettings"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
