import { useState } from "react";
import "../styles/settings.css";

const SettingsModal = () => {

  const [isOpen, setIsOpen] = useState(false);

  if(!isOpen)
  {
    return null;
  }

  function onClose(){
    return null;
  }

  return (
    <div className="modal-overlay" id="settingsModal">
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
            <label className="setting-label">Cursor Color</label>
            <div className="setting-description">
              Choose your preferred cursor color
            </div>
            <div className="color-options">
              <div
                className="color-option selected"
                data-color="#3b82f6"
                style={{ background: "#3b82f6" }}
              ></div>
              <div
                className="color-option"
                data-color="#10b981"
                style={{ background: "#10b981" }}
              ></div>
              <div
                className="color-option"
                data-color="#f59e0b"
                style={{ background: "#f59e0b" }}
              ></div>
              <div
                className="color-option"
                data-color="#ef4444"
                style={{ background: "#ef4444" }}
              ></div>
              <div
                className="color-option"
                data-color="#8b5cf6"
                style={{ background: "#8b5cf6" }}
              ></div>
              <div
                className="color-option"
                data-color="#ec4899"
                style={{ background: "#ec4899" }}
              ></div>
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
          <button className="btn btn-secondary" id="resetSettings">
            Reset to Default
          </button>
          <button className="btn btn-primary" id="saveSettings">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
