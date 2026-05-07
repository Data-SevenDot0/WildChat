/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#141414",
          card: "#1e1e1e",
          panel: "#181818",
          row: "#1a1a1a",
          hover: "#272727",
        },
        accent: {
          green: "#f59e0b",
          teal: "#d97706",
          gold: "#fbbf24",
        },
        text: {
          primary: "#e0e0e0",
          secondary: "#888888",
          muted: "#555555",
        },
        border: {
          base: "#303030",
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
