/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "Wayfinder" palette — a warm signal amber (the same gold already
        // used for favorites) replaces the generic default-blue accent,
        // with a cool slate-navy base and a muted teal for secondary cues.
        accent: {
          DEFAULT: "#D98A2B",
          hover: "#B9711A",
        },
        compass: {
          DEFAULT: "#3A7D79",
          hover: "#2E6460",
        },
        surface: {
          light: "#FCFBF8",
          dark: "#141A22",
        },
        panel: {
          light: "#F0EEE7",
          dark: "#1B222B",
        },
      },
      fontFamily: {
        sans: ["Figtree", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "10px",
      },
      keyframes: {
        "paste-flash": {
          "0%, 40%": { backgroundColor: "rgba(217, 138, 43, 0.35)" },
          "100%": { backgroundColor: "rgba(217, 138, 43, 0)" },
        },
      },
      animation: {
        "paste-flash": "paste-flash 2s ease-out",
      },
    },
  },
  plugins: [],
};
