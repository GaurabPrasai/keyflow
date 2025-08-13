import { useTheme } from "../contexts/ThemeContext";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <button
        className="theme-toggle"
        id="themeToggle"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "light" ? "🌙" : "☀️"}
      </button>
    </>
  );
};

export default Navbar;
