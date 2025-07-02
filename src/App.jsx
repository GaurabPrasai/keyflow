import { useState } from 'react'
import Navbar from './components/Navbar'
import Header from './components/Header'
import TypingBox from './components/TypingBox'

function App() {

  return (
    <>
    <Navbar />
    <div className="container">
      <Header />
      <TypingBox />
    </div>
    
    </>
  )
}

export default App
