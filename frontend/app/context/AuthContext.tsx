"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "VOLUNTEER" | "ADMIN";
  avatar?: string;
  patient?: { id: string };
  volunteer?: { id: string; isVerified: boolean; isOnline: boolean; skillLevel: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "PATIENT" | "VOLUNTEER";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("seva_token");
    if (stored) {
      setToken(stored);
      axios.defaults.headers.common["Authorization"] = `Bearer ${stored}`;
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (tkn: string) => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      setUser(data.data);
    } catch {
      localStorage.removeItem("seva_token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    const { token: tkn, user: u } = data.data;
    localStorage.setItem("seva_token", tkn);
    axios.defaults.headers.common["Authorization"] = `Bearer ${tkn}`;
    setToken(tkn);
    setUser(u);
    return u;
  };

  const register = async (payload: RegisterData): Promise<User> => {
    const { data } = await axios.post(`${API}/auth/register`, payload);
    const { token: tkn, user: u } = data.data;
    localStorage.setItem("seva_token", tkn);
    axios.defaults.headers.common["Authorization"] = `Bearer ${tkn}`;
    setToken(tkn);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("seva_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  const refreshUser = async () => token ? fetchUser(token) : undefined;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
