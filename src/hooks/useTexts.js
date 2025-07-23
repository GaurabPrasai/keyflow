import { useEffect, useState } from "react";

const useText = (dataset) => {
  const [text, setText] = useState("");

  useEffect(() => {
    async function loadText() {
      try {
        const module = await import(`../assets/texts/${dataset}.json`);
        const allTexts = module.default;

        // const randomIndex = Math.floor(Math.random() * allTexts.length);
        
        setText(allTexts.join(" "));
      } 
      catch (error) {
        console.error(`Failed to load dataset: ${dataset}`, error);
        setText("Failed to load text.");
      }
    }

    loadText();
  }, [dataset]);

  return text;
};

export default useText;
