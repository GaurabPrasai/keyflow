import Navbar from './components/Navbar'
import Header from './components/Header'
import TypingBox from './components/TypingBox'
import Controls from './components/Controls'
import Status from './components/Status'

function App() {

  return (
    <>
    <Navbar />
    <div className="container">
      <Header />
      <TypingBox />
      <Controls />
      <Status />
    </div>
    
    </>
  )
}

export default App
