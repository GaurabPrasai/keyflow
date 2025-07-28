import { Icon } from "@iconify/react";
import { TextDataContext } from "../contexts/TextDataContext";
import { useContext } from "react";

const Controls = ({ setIsSettingOpen }) => {
  const typingData = useContext(TextDataContext);

  const { resetTyping, shuffleText } = typingData;

  const handleRefresh = () => {
    shuffleText();
    typingData.resetTyping();
  };

  const handleReset = () => {
    resetTyping();
  };

  const openSetting = () => {
    setIsSettingOpen(true);
  };

  return (
    <div className="controls">
      <button
        className="control-btn"
        id="resetBtn"
        aria-label="Reset test"
        onClick={handleRefresh}
      >
        <Icon icon="solar:restart-bold" width="22" height="22" />
      </button>
      <button
        className="control-btn"
        id="newTextBtn"
        aria-label="New text"
        onClick={handleReset}
      >
        <Icon icon="tdesign:refresh" width="20" height="20" />
      </button>
      <button className="control-btn" id="settingsBtn" aria-label="Settings" onClick={openSetting}>
        <Icon icon="uil:setting" width="20" height="20" />
      </button>
    </div>
  );
};

export default Controls;
