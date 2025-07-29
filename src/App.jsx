import TextProvider from "./contexts/TextDataContext";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import TypingBox from "./components/TypingBox";
import Controls from "./components/Controls";
import Status from "./components/Status";
import SettingsModal from "./components/Settings";
import { useState, useEffect } from "react";

function App() {
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  
  const [settings, setSettings] = useState({
    cursorColor: "#3b82f6",
    textDataset: "english-200",

  });

  useEffect(() => {
      document.documentElement.style.setProperty('--cursor-color', settings.cursorColor);
    }, [settings.cursorColor]);

  return (
    <>
      <TextProvider textDataset={settings.textDataset}>
        <Navbar />
        <div className="container">
          <Header />
          <TypingBox />
          <Controls setIsSettingOpen={setIsSettingOpen} />
          <Status />
          <SettingsModal settings={settings} setSettings={setSettings} isOpen={isSettingOpen} setIsOpen={setIsSettingOpen} />
        </div>
      </TextProvider>
    </>
  );
}

export default App;
