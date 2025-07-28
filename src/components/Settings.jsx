import "../styles/settings.css";

const SettingsModal = ({ isOpen, setIsOpen, settings, setSettings }) => {
  if (!isOpen) {
    return null;
  }
  const resetSetting = () => {
    setSettings({
      cursorColor: "#3b82f6",
    });
  };

  function onClose() {
    return setIsOpen(false);
  }

  const colorOptions = [
    "#3b82f6", // Blue (default)
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#ec4899", // Pink
  ];

  const updateSetting = (key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  const handleColorSelect = (color) => {
    updateSetting("cursorColor", color);
  };

  // Handle overlay click to close modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
            id="closeModal"
            aria-label="Close settings"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="modal-content">
          <div className="setting-group">
            <label className="setting-label" htmlFor="timerDuration">
              Test Duration
            </label>
            <div className="setting-description">
              Choose how long the typing test should last
            </div>
            <select className="setting-select" id="timerDuration">
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60" selected>
                60 seconds
              </option>
              <option value="120">2 minutes</option>
              <option value="300">5 minutes</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="fontSize">
              Font Size
            </label>
            <div className="setting-description">
              Adjust the text size for better readability
            </div>
            <select className="setting-select" id="fontSize">
              <option value="1.4">Small (1.4rem)</option>
              <option value="1.6">Medium (1.6rem)</option>
              <option value="2" selected>
                Large (2rem)
              </option>
              <option value="2.4">Extra Large (2.4rem)</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label" htmlFor="textDataset">
              Text Dataset
            </label>
            <div className="setting-description">
              Choose the type of words you want to practice with
            </div>
            <select className="setting-select" id="textDataset">
              <option value="english-200" selected>
                English 200 (Most Common)
              </option>
              <option value="english-1k">English 1K (Top 1000 Words)</option>
              <option value="english-5k">English 5K (Top 5000 Words)</option>
              <option value="commonly-misspelled">
                Commonly Misspelled Words
              </option>
              <option value="programming">Programming Keywords</option>
              <option value="numbers">Numbers & Symbols</option>
            </select>
          </div>

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
                    settings?.cursorColor === color ? "selected" : ""
                  }`}
                  data-color="#3b82f6"
                  style={{ background: color }}
                  onClick={() => handleColorSelect(color)}
                ></div>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Sound Effects</label>
            <div className="setting-description">
              Enable typing sound feedback
            </div>
            <div className="checkbox-group">
              <div className="checkbox" data-setting="sounds"></div>
              <label className="checkbox-label">Enable typing sounds</label>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" id="resetSettings" onClick={resetSetting}>
            Reset to Default
          </button>
          <button className="btn btn-primary" id="saveSettings" onClick={onClose}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
