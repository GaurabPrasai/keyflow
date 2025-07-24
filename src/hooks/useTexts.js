import { useEffect, useState } from "react";

const useText = (dataset) => {
  const [text, setText] = useState("");
  const [originalWords, setOriginalWords] = useState([]);

  const shuffleText = () => {
    if (originalWords.length > 0) {
      const shuffled = [...originalWords].sort(() => Math.random() - 0.5);
      setText(shuffled.join(" "));
    }
  };

  useEffect(() => {
    async function loadText() {
      try {
        const module = await import(`../assets/texts/${dataset}.json`);
        const allTexts = module.default;

        setOriginalWords(allTexts);

        // Initial shuffle
        const shuffled = allTexts.sort(() => Math.random() - 0.5);
        setText(shuffled.join(" "));
      }
      catch (error) {
        console.error(`Failed to load dataset: ${dataset}`, error);
        setText("Failed to load text.");
      }
    }

    loadText();
  }, [dataset]);

  return { text, shuffleText };
};

export default useText;
