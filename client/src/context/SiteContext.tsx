import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Settings } from "../api/types";
import { storage } from "../lib/storage";

type Theme = "dark" | "light";

interface SiteContextValue {
  settings: Settings;
  artistName: string;
  theme: Theme;
  toggleTheme: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (storage.get("olikrys-theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    const ctrl = new AbortController();
    api.settings(ctrl.signal).then(setSettings).catch(() => undefined);
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.set("olikrys-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo(
    () => ({
      settings,
      artistName: settings.artist_name || "OliKrys",
      theme,
      toggleTheme,
      searchOpen,
      setSearchOpen,
    }),
    [settings, theme, toggleTheme, searchOpen],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite doit être utilisé dans <SiteProvider>");
  return ctx;
}
