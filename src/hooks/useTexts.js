import { useEffect, useState } from "react";

const useText = (dataset) => {
  const [text, setText] = useState("");

  useEffect(() => {
    async function loadText(dataset) {
        try {
            const module = await import(`../assets/texts/${dataset}.json`);
            const alltext = module.default;

            

            
        } catch (error) {
            
        }
    }
  }, [dataset]);

  return text;
};

export default useText;
