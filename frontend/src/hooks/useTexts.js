import { useEffect, useState, useCallback } from "react";

const useText = (dataset) => {
  const [text, setText] = useState("");
  const [originalWords, setOriginalWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [loadedChunks, setLoadedChunks] = useState([]);
  const [shuffledWords, setShuffledWords] = useState([]);

  const CHUNK_SIZE = 100;
  const LOAD_THRESHOLD = 0.8; // Load next chunk when 80% through current text

  // Shuffle function
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Load next chunk of words
  const loadNextChunk = useCallback(() => {
    if (shuffledWords.length === 0) return;

    const startIndex = currentChunkIndex * CHUNK_SIZE;
    const endIndex = Math.min(startIndex + CHUNK_SIZE, shuffledWords.length);

    // If we've reached the end, reshuffle and start over
    if (startIndex >= shuffledWords.length) {
      const newShuffled = shuffleArray(originalWords);
      setShuffledWords(newShuffled);
      setCurrentChunkIndex(0);
      setLoadedChunks([newShuffled.slice(0, CHUNK_SIZE)]);
      setText(newShuffled.slice(0, CHUNK_SIZE).join(" "));
      return;
    }

    const newChunk = shuffledWords.slice(startIndex, endIndex);
    const updatedChunks = [...loadedChunks, newChunk];

    setLoadedChunks(updatedChunks);

    // Combine all loaded chunks into one text string
    const combinedText = updatedChunks.flat().join(" ");
    setText(combinedText);

    setCurrentChunkIndex(prev => prev + 1);
  }, [shuffledWords, currentChunkIndex, loadedChunks, originalWords, shuffleArray]);

  // Check if we need to load the next chunk based on typing progress
  const checkAndLoadNext = useCallback((typingProgress) => {
    if (typingProgress >= LOAD_THRESHOLD && loadedChunks.length > 0) {
      const currentTextLength = loadedChunks.flat().join(" ").length;
      const progressPosition = typingProgress * currentTextLength;

      // Calculate how much of the current chunks we've typed
      const chunksCompleted = Math.floor(progressPosition / (CHUNK_SIZE * 6)); // Assuming average word length of 6 chars

      // If we're near the end of loaded chunks, load more
      if (chunksCompleted >= loadedChunks.length - 1) {
        loadNextChunk();
      }
    }
  }, [loadedChunks, loadNextChunk]);

  const shuffleText = useCallback(() => {
    if (originalWords.length > 0) {
      const newShuffled = shuffleArray(originalWords);
      setShuffledWords(newShuffled);
      setCurrentChunkIndex(0);
      setLoadedChunks([]);

      // Load initial chunk
      const initialChunk = newShuffled.slice(0, CHUNK_SIZE);
      setLoadedChunks([initialChunk]);
      setText(initialChunk.join(" "));
      setCurrentChunkIndex(1);
    }
  }, [originalWords, shuffleArray]);

  // Initialize text loading
  useEffect(() => {
    let isMounted = true;

    async function loadText() {
      setIsLoading(true);
      try {
        const module = await import(`../assets/texts/${dataset}.json`);
        const allTexts = module.default;

        if (!isMounted) return;

        setOriginalWords(allTexts);

        // Initial shuffle and setup
        const shuffled = shuffleArray(allTexts);
        setShuffledWords(shuffled);

        // Load first chunk
        const initialChunk = shuffled.slice(0, CHUNK_SIZE);
        setLoadedChunks([initialChunk]);
        setText(initialChunk.join(" "));
        setCurrentChunkIndex(1);
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

    return () => {
      isMounted = false;
    };
  }, [dataset, shuffleArray]);

  return {
    text,
    shuffleText,
    isLoading,
    loadNextChunk,
    checkAndLoadNext,
    currentChunkIndex,
    totalLoadedWords: loadedChunks.flat().length
  };
};

export default useText;