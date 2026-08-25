import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "@callout/shared";
import { apiFetch } from "./api";

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  adminMode: boolean;
  setAdminMode: (v: boolean) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const ADMIN_MODE_KEY = "callout_admin_mode";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminModeState] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setAdminMode = useCallback((v: boolean) => {
    setAdminModeState(v);
    try {
      localStorage.setItem(ADMIN_MODE_KEY, v ? "1" : "0");
    } catch {
      // storage indisponível (aba privada etc.) — o toggle ainda funciona nessa sessão
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<SessionUser>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout, adminMode: adminMode && Boolean(user?.isAdmin), setAdminMode }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de um SessionProvider");
  return ctx;
}
