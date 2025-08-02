import { useEffect, useRef, useState } from "react";

const useTyping = (targetText) => {
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [charStatus, setCharStatus] = useState([]);
    const [processedWords, setProcessedWords] = useState([]);

    useEffect(() => {
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

        if (isTyping === false) {
            setCharStatus(["current"]);
        }

    }, [targetText])

    const handleInputChange = (e) => {

        const newValue = e.target.value;

        if (!isTyping) {
            setIsTyping(true);
        }

        setInputValue(newValue);
        setCurrentIndex(newValue.length);

        let updateStatus = [];

        // loop over the visible text(text that have been typed + 1) to determine its status
        const visibleLength = newValue.length + 1;

        for (let index = 0; index < visibleLength; index++) {

            // check if user has typed the character or not
            if (index < newValue.length) {

                // determine wheather the typed character is correct or not
                if (newValue[index] === targetText[index]) {
                    updateStatus.push("correct");
                }
                else {
                    updateStatus.push("incorrect");
                }
            }
            else if (index === newValue.length) {
                updateStatus.push("current");
            }
            else {
                updateStatus.push("not yet typed");
            }
        }
        setCharStatus(updateStatus);
    }

    // reset button functionality
    const resetTyping = () => {
        setInputValue("");
        setCharStatus([]);
        setIsTyping(false);
        setCurrentIndex(0);
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
    };
};

export default useTyping;