import { useState } from 'react';
import { useTheme } from "../contexts/ThemeContext";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  const handleAuth = () => {
    // Simulate authentication
    setUser({ name: 'Jon Doe' });
    setIsLoggedIn(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            {/* Empty left side to maintain layout */}
          </div>
          
          <div className="navbar-right">
            <div className="auth-section">
              {isLoggedIn ? (
                <div className="user-profile" onClick={handleLogout}>
                  <div className="user-avatar">
                    <span className="user-initial">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="user-name">{user?.name || 'User'}</span>
                </div>
              ) : (
                <button 
                  className="my-account-btn" 
                  onClick={() => setShowAuthModal(true)}
                >
                  <div className="account-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="account-text">My Account</span>
                </button>
              )}
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
        </div>
      </nav>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowAuthModal(false);
        }}>
          <div className="auth-modal">
            <button 
              className="auth-modal-close"
              onClick={() => setShowAuthModal(false)}
            >
              ×
            </button>
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button 
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            <div className="auth-content">
              {authMode === 'login' ? (
                <div className="auth-form">
                  <h2 className="auth-title">Welcome Back</h2>
                  <p className="auth-subtitle">Sign in to your account to continue</p>
                  
                  <div className="auth-form-container">
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input 
                        type="email" 
                        id="email" 
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <input 
                        type="password" 
                        id="password" 
                        placeholder="Enter your password"
                      />
                    </div>
                    
                    <button onClick={handleAuth} className="auth-submit-btn">
                      Sign In
                    </button>
                  </div>
                  
                  <div className="auth-footer">
                    <p>Don't have an account? 
                      <button 
                        className="auth-link"
                        onClick={() => setAuthMode('register')}
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="auth-form">
                  <h2 className="auth-title">Create Account</h2>
                  <p className="auth-subtitle">Join us to track your typing progress</p>
                  
                  <div className="auth-form-container">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="reg-email">Email</label>
                      <input 
                        type="email" 
                        id="reg-email" 
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="reg-password">Password</label>
                      <input 
                        type="password" 
                        id="reg-password" 
                        placeholder="Create a password"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="confirm-password">Confirm Password</label>
                      <input 
                        type="password" 
                        id="confirm-password" 
                        placeholder="Confirm your password"
                      />
                    </div>
                    
                    <button onClick={handleAuth} className="auth-submit-btn">
                      Create Account
                    </button>
                  </div>
                  
                  <div className="auth-footer">
                    <p>Already have an account? 
                      <button 
                        className="auth-link"
                        onClick={() => setAuthMode('login')}
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