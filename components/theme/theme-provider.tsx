"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applySettings,
  DEFAULT_SETTINGS,
  readSettings,
  sanitizeSettings,
  writeSettings,
  type Settings,
} from "@/lib/settings";

type ThemeContextValue = {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const persistNext = useRef<Settings | null>(null);

  useLayoutEffect(() => {
    const stored = readSettings();
    applySettings(stored);
    setSettings(stored);
  }, []);

  useLayoutEffect(() => {
    const pending = persistNext.current;
    if (!pending) return;
    persistNext.current = null;
    applySettings(pending);
    writeSettings(pending);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = sanitizeSettings({ ...prev, ...patch });
      persistNext.current = next;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme должен вызываться внутри ThemeProvider");
  }
  return context;
}
