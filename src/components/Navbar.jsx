import { useTheme } from "../contexts/ThemeContext";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="auth-section">
          <button className="sign-up-btn">Sign Up</button>
        </div>
        
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          <div className="toggle-track">
            <div className={`toggle-thumb ${theme}`}>
              <span className="toggle-icon">
                {theme === "light" ? "🌙" : "☀️"}
              </span>
            </div>
          </div>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;