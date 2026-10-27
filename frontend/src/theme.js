/**
 * The frozen theme table (Plan 4.0 §2). The same values live in
 * styles/index.css as `html[data-theme=...]` blocks; this copy exists so the
 * theme picker can paint its dots without reading the stylesheet.
 *
 * Values are OKLCH `L C H`, exactly as approved.
 */
export const THEMES = [
  { id: "ember", name: "Ember", mode: "dark", bg: "oklch(24% .04 75)", primary: "oklch(92% .07 85)", secondary: "oklch(62% .12 70)", tertiary: "oklch(42% .06 70)" },
  { id: "midnight", name: "Midnight", mode: "dark", bg: "oklch(19% .04 265)", primary: "oklch(94% .03 250)", secondary: "oklch(65% .09 255)", tertiary: "oklch(42% .06 260)" },
  { id: "moss", name: "Moss", mode: "dark", bg: "oklch(25% .04 150)", primary: "oklch(93% .06 130)", secondary: "oklch(68% .1 150)", tertiary: "oklch(45% .06 150)" },
  { id: "plum", name: "Plum", mode: "dark", bg: "oklch(22% .05 320)", primary: "oklch(94% .04 340)", secondary: "oklch(66% .11 330)", tertiary: "oklch(44% .07 325)" },
  { id: "paper", name: "Paper", mode: "light", bg: "oklch(95% .02 85)", primary: "oklch(25% .04 60)", secondary: "oklch(52% .09 70)", tertiary: "oklch(78% .04 80)" },
  { id: "mist", name: "Mist", mode: "light", bg: "oklch(95% .015 240)", primary: "oklch(27% .05 255)", secondary: "oklch(52% .1 250)", tertiary: "oklch(78% .03 245)" },
];

export const DEFAULT_THEME = "ember";

export function isTheme(value) {
  return THEMES.some((theme) => theme.id === value);
}
