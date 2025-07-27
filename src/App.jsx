import Navbar from "./components/Navbar";
import Header from "./components/Header";
import TypingBox from "./components/TypingBox";
import Controls from "./components/Controls";
import Status from "./components/Status";
import useText from "./hooks/useTexts";
import useTyping from "./hooks/useTyping";
import SettingsModal from "./components/Settings";

function App() {
  const { text: targetText, shuffleText } = useText("english-200");

  const typingData = useTyping(targetText);

  return (
    <>
      <Navbar />
      <div className="container">
        <Header />
        <TypingBox typingData={typingData} />
        <Controls typingData={typingData} targetText={targetText} shuffleText={shuffleText} />
        <Status />
        <SettingsModal />
      </div>
    </>
  );
}

export default App;
