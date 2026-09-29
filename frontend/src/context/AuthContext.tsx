import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, clearToken, getToken, setToken, setUnauthorizedHandler, type User } from "../services/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const existing = getToken();
    if (!existing) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { access_token } = await authApi.login(email, password);
      setToken(access_token);
      const me = await authApi.me();
      setUser(me);
    } catch (e: any) {
      const message = e?.response?.data?.detail || "Login failed. Check your credentials.";
      setError(message);
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
