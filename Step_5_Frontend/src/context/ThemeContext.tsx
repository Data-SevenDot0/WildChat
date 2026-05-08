import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "wildcolor" | "blueprint" | "high-contrast" | "colorblind" | "low-light";

export interface ThemeColors {
  /** Primary accent (buttons, highlights) */
  accent: string;
  accentDark: string;
  accentBright: string;
  /** Chart palette — 5 distinct series colors */
  chart: [string, string, string, string, string];
  chartMuted: string;
  /** Map choropleth scale: index 0 = lowest, 5 = highest */
  mapScale: [string, string, string, string, string, string];
  /** Map ocean fill */
  mapOcean: string;
  /** Map fill for countries with no data */
  mapNoData: string;
  /** Map country border */
  mapBorder: string;
  /** Map hover highlight */
  mapHover: string;
  /** Map tooltip */
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  /** Logo accent (eye / "chat" wordmark) */
  logoAccent: string;
  /** Text colors */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  bgCard: string;
  bgHover: string;
  borderBase: string;
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string;
  swatchBg: string;
  accessibility?: boolean;
  colors: ThemeColors;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "wildcolor",
    name: "Wildcolor",
    description: "Default — charcoal & amber",
    swatch: "#f59e0b",
    swatchBg: "#1e1e1e",
    colors: {
      accent: "#f59e0b", accentDark: "#d97706", accentBright: "#fbbf24",
      chart:   ["#f59e0b", "#d97706", "#fbbf24", "#b45309", "#e07020"],
      chartMuted: "#888888",
      mapScale: ["#3d1f00", "#572d00", "#7a3f00", "#9a5000", "#b86200", "#d97706"],
      mapOcean: "#1a3a5c", mapNoData: "#2e2e2e", mapBorder: "#4a4030", mapHover: "#f59e0b",
      tooltipBg: "#1e1e1e", tooltipBorder: "#303030", tooltipText: "#e0e0e0",
      logoAccent: "#f59e0b",
      textPrimary: "#e0e0e0", textSecondary: "#888888", textMuted: "#555555",
      bgCard: "#1e1e1e", bgHover: "#1c1500", borderBase: "#2d2d2d",
    },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Navy & electric blue",
    swatch: "#4da6ff",
    swatchBg: "#0e1e33",
    colors: {
      accent: "#4da6ff", accentDark: "#2d8aee", accentBright: "#82c4ff",
      chart:   ["#4da6ff", "#2d8aee", "#82c4ff", "#1a6ec0", "#60b8ff"],
      chartMuted: "#4a7aa0",
      mapScale: ["#0a2040", "#0f3060", "#1a4a80", "#2060a0", "#2d8aee", "#4da6ff"],
      mapOcean: "#060e1c", mapNoData: "#1a2535", mapBorder: "#1a4060", mapHover: "#4da6ff",
      tooltipBg: "#0e1e33", tooltipBorder: "#1a3a5e", tooltipText: "#d4e8ff",
      logoAccent: "#4da6ff",
      textPrimary: "#d4e8ff", textSecondary: "#6a9ec8", textMuted: "#3a6080",
      bgCard: "#0e1e33", bgHover: "#0d2545", borderBase: "#1a3a5e",
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Black & yellow — maximum legibility",
    swatch: "#ffff00",
    swatchBg: "#0d0d0d",
    accessibility: true,
    colors: {
      accent: "#ffff00", accentDark: "#cccc00", accentBright: "#ffff66",
      chart:   ["#ffff00", "#cccc00", "#ffff66", "#e0e000", "#ffffff"],
      chartMuted: "#aaaaaa",
      mapScale: ["#1a1a00", "#333300", "#4d4d00", "#6b6b00", "#999900", "#cccc00"],
      mapOcean: "#000033", mapNoData: "#2a2a2a", mapBorder: "#555555", mapHover: "#ffff00",
      tooltipBg: "#0d0d0d", tooltipBorder: "#555555", tooltipText: "#ffffff",
      logoAccent: "#ffff00",
      textPrimary: "#ffffff", textSecondary: "#cccccc", textMuted: "#999999",
      bgCard: "#0d0d0d", bgHover: "#1a1a00", borderBase: "#555555",
    },
  },
  {
    id: "colorblind",
    name: "Colorblind-safe",
    description: "Blue & gold — avoids red/green confusion",
    swatch: "#e8b800",
    swatchBg: "#1d1f2e",
    accessibility: true,
    colors: {
      accent: "#e8b800", accentDark: "#c49600", accentBright: "#ffd320",
      chart:   ["#e8b800", "#4da6ff", "#ffd320", "#82c4ff", "#c49600"],
      chartMuted: "#6666aa",
      mapScale: ["#1a1a2a", "#252545", "#333368", "#464690", "#5a5ab0", "#e8b800"],
      mapOcean: "#0e0f1c", mapNoData: "#1e2132", mapBorder: "#32344e", mapHover: "#e8b800",
      tooltipBg: "#1d1f2e", tooltipBorder: "#32344e", tooltipText: "#e8e8ff",
      logoAccent: "#e8b800",
      textPrimary: "#e8e8ff", textSecondary: "#8888bb", textMuted: "#505075",
      bgCard: "#1d1f2e", bgHover: "#20224a", borderBase: "#32344e",
    },
  },
  {
    id: "low-light",
    name: "Low Light",
    description: "Very dim — for photosensitivity & night use",
    swatch: "#a06820",
    swatchBg: "#111111",
    accessibility: true,
    colors: {
      accent: "#a06820", accentDark: "#7d5218", accentBright: "#c48030",
      chart:   ["#a06820", "#7d5218", "#c48030", "#8a5a1a", "#b87030"],
      chartMuted: "#555555",
      mapScale: ["#130e00", "#1c1200", "#261800", "#341f00", "#4a2a00", "#7d5218"],
      mapOcean: "#080f1a", mapNoData: "#1a1a1a", mapBorder: "#1e1e1e", mapHover: "#a06820",
      tooltipBg: "#111111", tooltipBorder: "#1e1e1e", tooltipText: "#aaaaaa",
      logoAccent: "#a06820",
      textPrimary: "#aaaaaa", textSecondary: "#666666", textMuted: "#444444",
      bgCard: "#111111", bgHover: "#130e00", borderBase: "#1e1e1e",
    },
  },
];

const STORAGE_KEY = "wildchat-theme";
const DEFAULT_THEME: ThemeId = "wildcolor";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  meta: ThemeMeta;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  meta: THEMES[0],
  colors: THEMES[0].colors,
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
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, meta, colors: meta.colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

