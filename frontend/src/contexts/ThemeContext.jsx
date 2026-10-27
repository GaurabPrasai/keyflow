import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_THEME, isTheme } from "../theme";
import { withViewTransition } from "../utils/vt";

export const ThemeContext = createContext(null);

const STORAGE_KEY = "keyflow-theme";
const LIGHT_THEMES = ["paper", "mist"];

export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = LIGHT_THEMES.includes(theme) ? "light" : "dark";
  const meta = document.getElementById("theme-color");
  if (meta) {
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    if (bg) meta.content = bg;
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage can be blocked - the theme still applies for this session */
  }
}

function initialTheme() {
  if (typeof document !== "undefined" && isTheme(document.documentElement.dataset.theme)) {
    return document.documentElement.dataset.theme;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(initialTheme);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const pendingRef = useRef(false);

  useEffect(() => {
    // Safety net for a first paint that fell back to the default. While a
    // view transition is in flight it owns the swap — applying the theme
    // here too would land in the *old* snapshot and cancel the cross-fade.
    if (document.documentElement.dataset.theme === theme) {
      pendingRef.current = false;
      return;
    }
    if (pendingRef.current) return;
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!isTheme(next) || themeRef.current === next) return;
    themeRef.current = next;
    pendingRef.current = true;
    withViewTransition(() => applyTheme(next));
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
