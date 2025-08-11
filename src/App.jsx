import TextProvider from "./contexts/TextDataContext";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import TypingBox from "./components/TypingBox";
import Controls from "./components/Controls";
import Status from "./components/Status";
import SettingsModal from "./components/Settings";
import { SettingsProvider } from "./contexts/SettingsContext";
import { useState } from "react";

function App() {
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  return (
    <SettingsProvider>
      <TextProvider>
        <Navbar />
        <div className="container">
          <Header />
          <TypingBox />
          <Controls setIsSettingOpen={setIsSettingOpen} />
          <Status />
          <SettingsModal isOpen={isSettingOpen} setIsOpen={setIsSettingOpen} />
        </div>
      </TextProvider>
    </SettingsProvider>
  );
}

export default App;
