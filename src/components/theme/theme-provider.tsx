"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
};

type ThemeSnapshot = {
  theme: ThemeMode;
  resolvedTheme: ThemeMode;
};

const THEME_STORAGE_KEY = "orcapro-theme";
const THEME_EVENT = "theme-updated";

const defaultSnapshot: ThemeSnapshot = {
  theme: "light",
  resolvedTheme: "light",
};

let cachedKey = "light-light";
let cachedSnapshot = defaultSnapshot;

const ThemeContext = createContext<ThemeContextValue | null>(null);

const computeSnapshot = (): ThemeSnapshot => {
  if (typeof window === "undefined") {
    return defaultSnapshot;
  }

  const rawTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const theme: ThemeMode =
    rawTheme === "light" || rawTheme === "dark"
      ? rawTheme
      : "light";

  const resolvedTheme = theme;

  const nextKey = `${theme}-${resolvedTheme}`;
  if (nextKey === cachedKey) {
    return cachedSnapshot;
  }

  const nextSnapshot = { theme, resolvedTheme };
  cachedKey = nextKey;
  cachedSnapshot = nextSnapshot;
  return nextSnapshot;
};

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const notify = () => callback();

  window.addEventListener(THEME_EVENT, notify);
  window.addEventListener("storage", notify);

  return () => {
    window.removeEventListener(THEME_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const snapshot = useSyncExternalStore(subscribe, computeSnapshot, () => defaultSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", snapshot.resolvedTheme === "dark");
  }, [snapshot.resolvedTheme]);

  const setTheme = useCallback((theme: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: snapshot.theme,
      resolvedTheme: snapshot.resolvedTheme,
      setTheme,
    }),
    [setTheme, snapshot.resolvedTheme, snapshot.theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme deve ser utilizado dentro de ThemeProvider.");
  }

  return context;
};
