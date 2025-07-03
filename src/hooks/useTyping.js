import { useState, useEffect } from "react";

const useTyping = () => {
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [targetText, setTargetText] = useState("the quick brown fox jumps over the lazy dog");
    const [charStatus, setCharStatus] = useState([]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        setCurrentIndex(e.target.value.length);

        if (!isTyping) {
            setIsTyping(true);
        }

        let updateStatus = [''];
        for (let i = 0; i < currentIndex; i++) {
            if (targetText[i] === inputValue.length) {
                updateStatus.push("correct");

            }
            else {
                updateStatus.push("incorrect");
            }
        }

        setCharStatus(updateStatus);
    }

    return {
        isTyping,
        inputValue,
        currentIndex,
        targetText,
        handleInputChange,
        charStatus,
    };
};

export default useTyping;