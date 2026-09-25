import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** `identifier` accepte le pseudo ou l'adresse e-mail */
  login: (identifier: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // La session vit dans un cookie httpOnly : on demande au serveur qui est connecté
  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const next = await api.login({ identifier, password });
    setUser(next);
    return next;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const next = await api.register({ name, email, password });
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
