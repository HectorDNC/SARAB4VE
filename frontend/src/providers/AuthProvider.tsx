"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { LoginUser } from "@/api/login";

interface AuthContextValue {
  /** Token JWT (null si no hay sesión). */
  token: string | null;
  /** Datos del usuario autenticado (null si no hay sesión). */
  user: LoginUser | null;
  /** true mientras se hidrata desde localStorage. */
  isLoading: boolean;
  /** Guarda token + usuario en estado y localStorage. */
  login: (token: string, user: LoginUser) => void;
  /** Limpia la sesión (estado + localStorage). */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hidratación desde localStorage al montar el cliente
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // Datos corruptos → limpiar
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: LoginUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación.
 * Lanza error si se usa fuera de <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}
