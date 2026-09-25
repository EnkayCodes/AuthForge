"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch, setToken, clearToken, getToken } from "../lib/api";

interface Developer {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  developer: Developer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<{ developer: Developer }>("/developers/me")
      .then(({ ok, data }) => {
        if (ok) setDeveloper(data.developer);
        else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const { ok, data } = await apiFetch<{ developer: Developer; token: string; message?: string }>(
        "/developers/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      if (!ok) {
        const msg = (data as { error?: { message?: string }; message?: string }).error?.message
          ?? (data as { message?: string }).message;
        return msg ?? "Invalid email or password.";
      }
      setToken(data.token);
      setDeveloper(data.developer);
      return null;
    } catch {
      return "Unable to reach the server. Please try again.";
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    try {
      const { ok, status, data } = await apiFetch<{ developer: Developer; token: string; message?: string }>(
        "/developers/signup",
        { method: "POST", body: JSON.stringify({ email, password, name }) },
      );
      if (!ok) {
        if (status === 409) return "An account with this email already exists.";
        const msg = (data as { error?: { message?: string }; message?: string }).error?.message
          ?? (data as { message?: string }).message;
        return msg ?? "Something went wrong. Please try again.";
      }
      setToken(data.token);
      setDeveloper(data.developer);
      return null;
    } catch {
      return "Unable to reach the server. Please try again.";
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setDeveloper(null);
  }, []);

  return (
    <AuthContext.Provider value={{ developer, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
