import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, registerSchema } from "../utils/validationSchemas";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    isAuthenticated,
    login,
    register: registerUser,
    logout,
    isLoading,
  } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [apiError, setApiError] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Login form
  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  // Register form
  const registerForm = useForm({
    defaultValues: { username: "", password: "", confirmation: "" },
  });

  const handleLogin = async (data) => {
    try {
      setApiError("");
      await login(data);
      setShowAuthModal(false);
      loginForm.reset();
    } catch (error) {
      setApiError(error.message);
    }
  };

  const handleRegister = async (data) => {
    try {
      setApiError("");
      await registerUser(data);
      setShowAuthModal(false);
      registerForm.reset();
    } catch (error) {
      setApiError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false); // Close menu after logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const closeModal = () => {
    setShowAuthModal(false);
    setApiError("");
    loginForm.reset();
    registerForm.reset();
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setApiError("");
    loginForm.reset();
    registerForm.reset();
  };

  // Close user menu when clicking outside
  const handleUserMenuClick = (e) => {
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
  };

  // Close menu when clicking outside
  const handleOutsideClick = () => {
    setShowUserMenu(false);
  };

  return (
    <>
      <nav className="navbar" onClick={handleOutsideClick}>
        <div className="navbar-content">
          <div className="navbar-left"></div>

          <div className="navbar-right">
            <div className="auth-section">
              {isAuthenticated ? (
                <div className="user-menu-container">
                  <div className="user-profile" onClick={handleUserMenuClick}>
                    <div className="user-avatar">
                      <span className="user-initial">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="user-name">{user?.username}</span>
                    <svg
                      className={`dropdown-arrow ${showUserMenu ? "open" : ""}`}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {showUserMenu && (
                    <div className="user-menu-dropdown">
                      <div className="user-menu-header">
                        <div className="user-info">
                          <div className="user-avatar-small">
                            <span className="user-initial">
                              {user?.username?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="user-details">
                            <span className="user-name-small">
                              {user?.username}
                            </span>
                            <span className="user-email">
                              User ID: {user?.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="user-menu-divider"></div>

                      <div className="user-menu-items">
                        <button className="user-menu-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <circle
                              cx="12"
                              cy="7"
                              r="4"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                          Profile
                        </button>

                        <button className="user-menu-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 12l2 2 4-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                          Statistics
                        </button>

                        <button
                          className="user-menu-item logout-item"
                          onClick={handleLogout}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <polyline
                              points="16,17 21,12 16,7"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <line
                              x1="21"
                              y1="12"
                              x2="9"
                              y2="12"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="my-account-btn"
                  onClick={() => setShowAuthModal(true)}
                  disabled={isLoading}
                >
                  <div className="account-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="account-text">My Account</span>
                </button>
              )}
            </div>

            <button className="theme-toggle" onClick={toggleTheme}>
              <div className="toggle-track">
                <div className={`toggle-thumb ${theme}`}>
                  <span className="toggle-icon">
                    {theme === "light" ? "🌙" : "☀️"}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {showAuthModal && (
        <div
          className="auth-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="auth-modal">
            <button className="auth-modal-close" onClick={closeModal}>
              ×
            </button>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Login
              </button>
              <button
                className={`auth-tab ${
                  authMode === "register" ? "active" : ""
                }`}
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </div>

            <div className="auth-content">
              {authMode === "login" ? (
                <div className="auth-form">
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-subtitle">
                    Sign in to your account to continue
                  </p>

                  <form
                    className="auth-form-container"
                    onSubmit={loginForm.handleSubmit(handleLogin)}
                  >
                    <div className="form-group">
                      <label htmlFor="login-username">Username</label>
                      <input
                        type="text"
                        id="login-username"
                        placeholder="Enter your username"
                        {...loginForm.register("username")}
                        className={
                          loginForm.formState.errors.username ? "error" : ""
                        }
                      />
                      {loginForm.formState.errors.username && (
                        <span className="error-message">
                          {loginForm.formState.errors.username.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="login-password">Password</label>
                      <input
                        type="password"
                        id="login-password"
                        placeholder="Enter your password"
                        {...loginForm.register("password")}
                        className={
                          loginForm.formState.errors.password ? "error" : ""
                        }
                      />
                      {loginForm.formState.errors.password && (
                        <span className="error-message">
                          {loginForm.formState.errors.password.message}
                        </span>
                      )}
                    </div>

                    {apiError && (
                      <div className="error-message general-error">
                        {apiError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting
                        ? "Signing In..."
                        : "Sign In"}
                    </button>
                  </form>

                  <div className="auth-footer">
                    <p>
                      Don't have an account?
                      <button
                        type="button"
                        className="auth-link"
                        onClick={() => switchMode("register")}
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="auth-form">
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-subtitle">
                    Join us to track your typing progress
                  </p>

                  <form
                    className="auth-form-container"
                    onSubmit={registerForm.handleSubmit(handleRegister)}
                  >
                    <div className="form-group">
                      <label htmlFor="register-username">Username</label>
                      <input
                        type="text"
                        id="register-username"
                        placeholder="Choose a username"
                        {...registerForm.register("username")}
                        className={
                          registerForm.formState.errors.username ? "error" : ""
                        }
                      />
                      {registerForm.formState.errors.username && (
                        <span className="error-message">
                          {registerForm.formState.errors.username.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-password">Password</label>
                      <input
                        type="password"
                        id="register-password"
                        placeholder="Create a password"
                        {...registerForm.register("password")}
                        className={
                          registerForm.formState.errors.password ? "error" : ""
                        }
                      />
                      {registerForm.formState.errors.password && (
                        <span className="error-message">
                          {registerForm.formState.errors.password.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="register-confirmation">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="register-confirmation"
                        placeholder="Confirm your password"
                        {...registerForm.register("confirmation")}
                        className={
                          registerForm.formState.errors.confirmation
                            ? "error"
                            : ""
                        }
                      />
                      {registerForm.formState.errors.confirmation && (
                        <span className="error-message">
                          {registerForm.formState.errors.confirmation.message}
                        </span>
                      )}
                    </div>

                    {apiError && (
                      <div className="error-message general-error">
                        {apiError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting
                        ? "Creating Account..."
                        : "Create Account"}
                    </button>
                  </form>

                  <div className="auth-footer">
                    <p>
                      Already have an account?
                      <button
                        type="button"
                        className="auth-link"
                        onClick={() => switchMode("login")}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
