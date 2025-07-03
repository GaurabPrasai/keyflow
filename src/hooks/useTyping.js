import { useState } from "react";

const useTyping = () => {
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [targetText, setTargetText] = useState("i had all and then most of you, some and now none of you take me back to the night we met, i don't know what i'm supposed to do, haunted by the ghost of you take me back to the night we met.");
    const [charStatus, setCharStatus] = useState([]);

    const handleInputChange = (e) => {

        const newValue = e.target.value;

        if (!isTyping) {
            setIsTyping(true);
        }

        setInputValue(newValue);
        setCurrentIndex(newValue.length);

        let updateStatus = [];

        // loop over the text to determine its status
        for (let index = 0; index < targetText.length; index++) {

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