import Navbar from "./components/Navbar";
import Header from "./components/Header";
import TypingBox from "./components/TypingBox";
import Controls from "./components/Controls";
import Status from "./components/Status";
import useText from "./hooks/useTexts";
import useTyping from "./hooks/useTyping";

function App() {
  const { text: targetText, shuffleText } = useText("english-200");

  const typingData = useTyping(targetText);
  
  const handleNewText = () => {
    shuffleText();
    typingData.resetTyping();
  };

  

  const {
    isTyping,
    inputValue,
    currentIndex,
    handleInputChange,
    charStatus,
    processedWords,
    currentLine,
    resetTyping,
  } = typingData;

  return (
    <>
      <Navbar />
      <div className="container">
        <Header />
        <TypingBox typingData={typingData} />
        <Controls typingData={typingData} targetText={targetText} handleRefresh={handleNewText} />
        <Status />
      </div>
    </>
  );
}

export default App;
