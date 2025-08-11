import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { SettingsContext } from "../contexts/SettingsContext";

const useTyping = (targetText, checkAndLoadNext) => {
    const { settings } = useContext(SettingsContext);
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [charStatus, setCharStatus] = useState([]);
    const [processedWords, setProcessedWords] = useState([]);
    const [progress, setProgress] = useState(0);

    // Create audio objects only once using useMemo
    const audioSounds = useMemo(() => ({
        correct: new Audio('src/assets/sounds/click_sound.wav'),
        incorrect: new Audio('src/assets/sounds/error_sound.wav')
    }), []);

    // Process words whenever target text changes
    useEffect(() => {
        if (!targetText) return;

        let words = targetText.split(" ");
        let result = [];

        for (let i = 0; i < words.length; i++) {
            let characters = words[i].split("");
            let wordObj = {
                word: words[i],
                characters: characters
            };
            result.push(wordObj);

            if (i !== words.length - 1) {
                let spaceObj = {
                    word: " ",
                    characters: [" "]
                }
                result.push(spaceObj);
            }
        }
        setProcessedWords(result);

        if (!isTyping) {
            setCharStatus(["current"]);
        }
    }, [targetText, isTyping]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const previousLength = inputValue.length;

        if (!isTyping) {
            setIsTyping(true);
        }

        setInputValue(newValue);
        setCurrentIndex(newValue.length);

        // Calculate progress
        const currentProgress = targetText.length > 0 ? newValue.length / targetText.length : 0;
        setProgress(currentProgress);

        // Check if we need to load next chunk
        if (checkAndLoadNext && currentProgress > 0.7) {
            checkAndLoadNext(currentProgress);
        }

        // Handle audio for new character only
        if (newValue.length > previousLength && settings?.soundEnabled) {
            const newCharIndex = previousLength;
            const isCorrect = newValue[newCharIndex] === targetText[newCharIndex];

            try {
                if (isCorrect) {
                    audioSounds.correct.currentTime = 0; // Reset to start for rapid typing
                    audioSounds.correct.play().catch(e => console.log('Audio play failed:', e));
                } else {
                    audioSounds.incorrect.currentTime = 0; // Reset to start for rapid typing
                    audioSounds.incorrect.play().catch(e => console.log('Audio play failed:', e));
                }
            } catch (error) {
                console.log('Audio error:', error);
            }
        }

        // Loop over the visible text to determine its status
        const visibleLength = newValue.length + 1;
        let updateStatus = [];

        for (let index = 0; index < visibleLength; index++) {
            // Check if user has typed the character or not
            if (index < newValue.length) {
                // Determine whether the typed character is correct or not
                if (newValue[index] === targetText[index]) {
                    updateStatus.push("correct");
                } else {
                    updateStatus.push("incorrect");
                }
            } else if (index === newValue.length) {
                updateStatus.push("current");
            } else {
                updateStatus.push("not yet typed");
            }
        }
        setCharStatus(updateStatus);
    };

    // Reset typing state
    const resetTyping = () => {
        setInputValue("");
        setCharStatus(["current"]);
        setIsTyping(false);
        setCurrentIndex(0);
        setProgress(0);
    };

    return {
        isTyping,
        inputValue,
        currentIndex,
        targetText,
        handleInputChange,
        charStatus,
        processedWords,
        resetTyping,
        progress,
    };
};

export default useTyping;