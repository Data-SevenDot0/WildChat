/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep:  "var(--color-bg-deep)",
          card:  "var(--color-bg-card)",
          panel: "var(--color-bg-panel)",
          row:   "var(--color-bg-row)",
          hover: "var(--color-bg-hover)",
        },
        accent: {
          green:  "var(--color-accent)",
          teal:   "var(--color-accent-dark)",
          gold:   "var(--color-accent-bright)",
        },
        text: {
          primary:   "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted:     "var(--color-text-muted)",
        },
        border: {
          base:   "var(--color-border-base)",
          subtle: "var(--color-border-subtle)",
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
