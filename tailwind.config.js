/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
        surface: {
          light: "#ffffff",
          dark: "#1e1e1e",
        },
        panel: {
          light: "#f5f5f7",
          dark: "#252526",
        },
      },
      borderRadius: {
        lg: "10px",
      },
    },
  },
  plugins: [],
};
