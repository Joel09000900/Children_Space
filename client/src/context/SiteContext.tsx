import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { Settings } from "../api/types";
import { storage } from "../lib/storage";
import { heroText } from "../lib/siteText";

type Theme = "dark" | "light";

interface SiteContextValue {
  settings: Settings;
  artistName: string;
  /** Écriture réservée à l'administrateur : enregistre puis diffuse les textes à tout le site */
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
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

  /**
   * L'API répond avec l'ensemble des réglages publics : on remplace l'état d'un bloc
   * plutôt que de fusionner le patch, ce qui évite d'afficher une valeur que le
   * serveur aurait normalisée autrement (espaces en trop, par exemple).
   */
  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings(await api.updateSettings(patch));
  }, []);

  const value = useMemo(
    () => ({
      settings,
      artistName: heroText(settings, "artist_name"),
      saveSettings,
      theme,
      toggleTheme,
      searchOpen,
      setSearchOpen,
    }),
    [settings, saveSettings, theme, toggleTheme, searchOpen],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite doit être utilisé dans <SiteProvider>");
  return ctx;
}
