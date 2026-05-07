/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#0c1520",
          card: "#111e2e",
          panel: "#0e1a28",
          row: "#0f1e2f",
          hover: "#172436",
        },
        accent: {
          green: "#2ecc9e",
          teal: "#1ea882",
          purple: "#7c5cbf",
        },
        text: {
          primary: "#cdd9e5",
          secondary: "#6b8fa8",
          muted: "#3e5a72",
        },
        border: {
          base: "#1a2f45",
          subtle: "#162438",
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
