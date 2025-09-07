import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { TextDataContext } from '../contexts/TextDataContext';

const Stats = () => {
  const [wpm, setWpm] = useState(0);
  
  const startTimeRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastInputLengthRef = useRef(0);
  
  // Get typing data from context
  const typingData = useContext(TextDataContext);
  
  // If context is not available
  if (!typingData) {
    console.warn('Stats component: TextDataContext not found');
    return null;
  }

  const { isTyping, inputValue, targetText } = typingData;

  // WPM calculation
  const calculateWPM = useCallback(() => {
    if (!startTimeRef.current || !inputValue || inputValue.length === 0) {
      return 0;
    }

    const now = Date.now();
    const elapsedMinutes = (now - startTimeRef.current) / 60000;
    
    // Avoid division by very small numbers
    if (elapsedMinutes < 0.016) return 0; // Less than 1 second
    
    // Count only correct characters
    let correctChars = 0;
    const inputLength = inputValue.length;
    const targetLength = targetText?.length || 0;
    
    for (let i = 0; i < Math.min(inputLength, targetLength); i++) {
      if (inputValue[i] === targetText[i]) {
        correctChars++;
      }
    }

    // Standard WPM calculation: (correct chars / 5) / elapsed minutes
    const wordsTyped = correctChars / 5;
    return Math.max(0, Math.round(wordsTyped / elapsedMinutes));
  }, [inputValue, targetText]);

  // Handle typing lifecycle
  useEffect(() => {
    if (isTyping && inputValue && inputValue.length > 0) {
      // Initialize timing on first keystroke
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // Set up periodic updates every 1 second
      if (!updateIntervalRef.current) {
        updateIntervalRef.current = setInterval(() => {
          const newWpm = calculateWPM();
          setWpm(newWpm);
        }, 1000);
      }

      // Immediate update for significant changes (every 5 characters)
      const currentLength = inputValue.length;
      if (Math.abs(currentLength - lastInputLengthRef.current) >= 5) {
        const newWpm = calculateWPM();
        setWpm(newWpm);
        lastInputLengthRef.current = currentLength;
      }

    } else {
      // Reset when not typing
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      startTimeRef.current = null;
      lastInputLengthRef.current = 0;
      setWpm(0);
    }

    // Cleanup
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isTyping, inputValue, calculateWPM]);

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-value">{wpm}</div>
        <div className="stat-label">WPM</div>
      </div>
    </div>
  );
};

export default Stats;