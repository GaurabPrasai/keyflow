import { Icon } from "@iconify/react";

const Controls = () => {
  return (
    <div className="controls">
      <button className="control-btn" id="resetBtn" aria-label="Reset test">
        <Icon icon="solar:restart-bold" width="20" height="20" />
      </button>
      <button className="control-btn" id="newTextBtn" aria-label="New text">
        <Icon icon="tdesign:refresh" width="20" height="20" />
      </button>
      <button className="control-btn" id="settingsBtn" aria-label="Settings">
        <Icon icon="uil:setting" width="20" height="20" />
      </button>
    </div>
  );
};

export default Controls;
