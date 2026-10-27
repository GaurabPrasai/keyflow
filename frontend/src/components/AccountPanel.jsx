import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUI } from "../contexts/UIContext";
import { navigate } from "../utils/router";
import { EyeIcon, EyeOffIcon } from "./Icons";

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function AccountPanel() {
  const { user, login, register, logout, isLoading } = useAuth();
  const { closePanel } = useUI();
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });
  const [formError, setFormError] = useState("");
  const [welcome, setWelcome] = useState("");
  const usernameRef = useRef(null);
  const timersRef = useRef([]);

  useEffect(() => {
    const timer = window.setTimeout(() => usernameRef.current?.focus(), 60);
    const pending = timersRef.current;
    return () => {
      window.clearTimeout(timer);
      pending.forEach((id) => window.clearTimeout(id));
      pending.length = 0;
    };
  }, [mode]);

  const switchMode = (next) => {
    setMode(next);
    setFormError("");
    setFieldErrors({ username: "", password: "" });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    const name = username.trim();
    const errors = { username: "", password: "" };
    if (!USERNAME_RE.test(name)) {
      errors.username = "3–20 letters, numbers or underscores";
    }
    if (password.length < 6) {
      errors.password = "At least 6 characters";
    }
    setFieldErrors(errors);
    if (errors.username || errors.password) {
      if (errors.username) usernameRef.current?.focus();
      return;
    }

    setFormError("");
    try {
      const data =
        mode === "signin"
          ? await login({ username: name, password })
          : await register({ username: name, password });
      setWelcome(`Welcome, ${data?.user?.username || name}`);
      const timer = window.setTimeout(() => {
        setWelcome("");
        closePanel();
      }, 1_200);
      timersRef.current.push(timer);
    } catch (requestError) {
      const message = requestError?.message || "Something went wrong";
      setFormError(message === "Failed to fetch" ? "Cannot reach the server. Try again." : message);
    }
  };

  // The welcome flash must come first: signing in also sets `user`, and the
  // signed-in view below would otherwise shadow the flash entirely.
  if (welcome) {
    return (
      <div className="panel">
        <p className="welcome-flash">{welcome}</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="panel hello">
        <p className="hello-name">Hi, {user.username}</p>
        <div className="panel-row">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              closePanel();
              navigate("/reports");
            }}
          >
            Reports
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={async () => {
              await logout();
              closePanel();
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="panel auth-form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field-label">Username</span>
        <input
          ref={usernameRef}
          className="input"
          type="text"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          aria-invalid={Boolean(fieldErrors.username)}
        />
        <span className="field-error">{fieldErrors.username}</span>
      </label>

      <label className="field">
        <span className="field-label">Password</span>
        <span className="input-wrap">
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          <button
            type="button"
            className="input-action"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </span>
        <span className="field-error">{fieldErrors.password}</span>
      </label>

      <p className="field-error" role="alert">
        {formError}
      </p>

      <button type="submit" className="button button--primary" disabled={isLoading}>
        {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
        {mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <div className="auth-switch-row">
        <button
          type="button"
          className="auth-switch"
          key={mode}
          onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
        >
          {mode === "signin" ? "New here? Create account" : "Already have an account? Sign in"}
        </button>
      </div>
    </form>
  );
}

export default AccountPanel;
