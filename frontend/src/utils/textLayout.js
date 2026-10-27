/**
 * Line breaking without touching the DOM. Canvas measureText uses the same
 * font as the rendered text, so lines can be computed once per word change or
 * resize instead of measuring (and reflowing) the page on every keystroke.
 */
let context = null;

function getContext() {
  if (context) return context;
  if (typeof document === "undefined") return null;
  context = document.createElement("canvas").getContext("2d");
  return context;
}

export function fontStringOf(element) {
  if (!element) return "";
  const style = getComputedStyle(element);
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

export function createMeasurer(font) {
  const ctx = getContext();
  if (!ctx) return null;
  ctx.font = font;
  return (text) => ctx.measureText(text).width;
}

/**
 * Split words into lines that fit maxWidth.
 * @param {string[]} words
 * @param {(text: string) => number} measure
 * @param {number} maxWidth
 * @returns {{lines: {start: number, end: number, width: number}[], spaceWidth: number}}
 */
export function breakLines(words, measure, maxWidth) {
  const spaceWidth = measure(" ");
  const lines = [];
  let start = -1;
  let width = 0;

  for (let i = 0; i < words.length; i += 1) {
    const wordWidth = measure(words[i]);
    if (start === -1) {
      start = i;
      width = wordWidth;
      continue;
    }
    if (width + spaceWidth + wordWidth > maxWidth) {
      lines.push({ start, end: i - 1, width });
      start = i;
      width = wordWidth;
    } else {
      width += spaceWidth + wordWidth;
    }
  }
  if (start !== -1) lines.push({ start, end: words.length - 1, width });

  return { lines, spaceWidth };
}
