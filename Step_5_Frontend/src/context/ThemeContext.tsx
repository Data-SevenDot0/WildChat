import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "wildcolor" | "blueprint" | "high-contrast" | "colorblind" | "low-light";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  /** Accent swatch colour for the picker UI */
  swatch: string;
  /** Background swatch */
  swatchBg: string;
  accessibility?: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "wildcolor",
    name: "Wildcolor",
    description: "Default — charcoal & amber",
    swatch: "#f59e0b",
    swatchBg: "#1e1e1e",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Navy & electric blue",
    swatch: "#4da6ff",
    swatchBg: "#0e1e33",
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Black & yellow — maximum legibility",
    swatch: "#ffff00",
    swatchBg: "#0d0d0d",
    accessibility: true,
  },
  {
    id: "colorblind",
    name: "Colorblind-safe",
    description: "Blue & gold — avoids red/green confusion",
    swatch: "#e8b800",
    swatchBg: "#1d1f2e",
    accessibility: true,
  },
  {
    id: "low-light",
    name: "Low Light",
    description: "Very dim — for photosensitivity & night use",
    swatch: "#a06820",
    swatchBg: "#111111",
    accessibility: true,
  },
];

const STORAGE_KEY = "wildchat-theme";
const DEFAULT_THEME: ThemeId = "wildcolor";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  meta: ThemeMeta;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  meta: THEMES[0],
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return saved && THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Apply on mount in case localStorage already had a theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const meta = THEMES.find(t => t.id === theme) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, meta }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
