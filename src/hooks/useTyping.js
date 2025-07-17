import { useState } from "react";

const useTyping = () => {
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [targetText, setTargetText] = useState("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.");
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