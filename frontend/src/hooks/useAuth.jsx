import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { syncSessions } from "../utils/sync";

const AuthContext = createContext(null);

const USER_KEY = "keyflow-user";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.username ? parsed : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readCachedUser);
  const [isLoading, setIsLoading] = useState(false);

  // Trust the server, show the cached user immediately (Plan 4.0 §6).
  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (cancelled || !data?.user) return;
        setUser(data.user);
        cacheUser(data.user);
        syncSessions();
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 401) {
          setUser(null);
          cacheUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const succeed = useCallback((data) => {
    setUser(data.user);
    cacheUser(data.user);
    syncSessions();
  }, []);

  const login = useCallback(
    async (credentials) => {
      setIsLoading(true);
      try {
        const data = await api.login(credentials);
        succeed(data);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [succeed]
  );

  const register = useCallback(
    async (account) => {
      setIsLoading(true);
      try {
        const data = await api.register(account);
        succeed(data);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [succeed]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      cacheUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
