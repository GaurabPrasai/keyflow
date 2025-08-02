import { useEffect, useState, useCallback } from "react";

const useText = (dataset) => {
  const [text, setText] = useState("");
  const [originalWords, setOriginalWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Optimized shuffle function with better performance for large arrays
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    // Fisher-Yates shuffle algorithm - more efficient for large arrays
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const shuffleText = useCallback(() => {
    if (originalWords.length > 0) {
      const shuffled = shuffleArray(originalWords);
      setText(shuffled.join(" "));
    }
  }, [originalWords, shuffleArray]);

  useEffect(() => {
    let isMounted = true; // Prevent state update if component unmounts

    async function loadText() {
      setIsLoading(true);
      try {
        const module = await import(`../assets/texts/${dataset}.json`);
        const allTexts = module.default;

        if (!isMounted) return; // Component unmounted, don't update state

        setOriginalWords(allTexts);

        // Initial shuffle
        const shuffled = shuffleArray(allTexts);
        setText(shuffled.join(" "));
      } catch (error) {
        console.error(`Failed to load dataset: ${dataset}`, error);
        if (isMounted) {
          setText("Failed to load text.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadText();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [dataset, shuffleArray]);

  return { text, shuffleText, isLoading };
};

export default useText;