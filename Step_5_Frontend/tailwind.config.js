/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#111111",
          card: "#1e1e1e",
          panel: "#181818",
          row: "#1a1a1a",
          hover: "#1c1500",
        },
        accent: {
          green: "#f59e0b",   /* amber-500 — primary accent */
          teal: "#d97706",    /* amber-600 — darker accent */
          gold: "#fbbf24",    /* amber-400 — highlight */
        },
        text: {
          primary: "#e0e0e0",
          secondary: "#888888",
          muted: "#555555",
        },
        border: {
          base: "#2d2d2d",
          subtle: "#252525",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
