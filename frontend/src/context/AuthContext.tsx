import { createContext, useContext, useState, useEffect } from "react";
import type { AuthUser } from "../types";
import { login as apiLogin, register as apiRegister } from "../api";

const STORAGE_KEY = "wc_auth";

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("wc_auth_expired", handler);
    return () => window.removeEventListener("wc_auth_expired", handler);
  }, []);

  async function login(username: string, password: string) {
    const authUser = await apiLogin(username, password);
    setUser(authUser);
  }

  async function register(username: string, email: string, password: string) {
    await apiRegister(username, email, password);
    await login(username, password);
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}