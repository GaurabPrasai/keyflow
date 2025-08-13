import { createContext, useState, useEffect, useContext } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference, fallback to light
    try {
      const savedTheme = localStorage.getItem("keyflow-theme");
      if (savedTheme) {
        return savedTheme;
      }

      // Check system preference
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark";
      }

      return "light";
    } catch (error) {
      console.log("Failed to load theme from localStorage:", error);
      return "light";
    }
  });

  // Apply theme to document immediately and save to localStorage
  useEffect(() => {
    // Apply theme class to document root immediately
    document.documentElement.className = theme;

    // Also apply to body for immediate effect
    document.body.setAttribute("data-theme", theme);

    // Save to localStorage
    try {
      localStorage.setItem("keyflow-theme", theme);
    } catch (error) {
      console.log("Failed to save theme to localStorage:", error);
    }
  }, [theme]);

  // Apply theme immediately on component mount (before first render)
  useEffect(() => {
    document.documentElement.className = theme;
    document.body.setAttribute("data-theme", theme);
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
