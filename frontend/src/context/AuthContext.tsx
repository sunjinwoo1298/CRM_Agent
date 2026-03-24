import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

export interface User {
  userid: string;
  username: string;
  org_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, orgName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      // Optionally, fetch user profile to verify token is still valid
      fetchUserProfile(storedToken).catch(() => {
        // Token is invalid, clear it
        localStorage.removeItem("auth_token");
        setToken(null);
      });
    }
    setIsLoading(false);
  }, []);

  async function fetchUserProfile(authToken: string): Promise<User> {
    try {
      const response = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = response.data;
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const message =
        err?.response?.data?.error ??
        err?.message ??
        "Failed to fetch user profile";
      throw new Error(message);
    }
  }

  async function login(username: string, password: string): Promise<void> {
    try {
      const response = await api.post("/api/auth/login", { username, password });
      const data = response.data;
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("auth_token", data.token);
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.message ?? "Login failed";
      throw new Error(message);
    }
  }

  async function register(
    username: string,
    email: string,
    password: string,
    orgName?: string
  ): Promise<void> {
    try {
      const response = await api.post("/api/auth/register", {
        username,
        email,
        password,
        org_name: orgName,
      });
      const data = response.data;
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("auth_token", data.token);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ?? err?.message ?? "Registration failed";
      throw new Error(message);
    }
  }

  function logout(): void {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
