/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f7f7",
          100: "#ececec",
          200: "#d4d4d4",
          300: "#a5a5a5",
          400: "#737373",
          500: "#525252",
          600: "#3e3e3e",
          700: "#2b2b2b",
          800: "#1a1a1a",
          900: "#0d0d0d",
        },
        accent: {
          50: "#eef9f4",
          100: "#d3f1e3",
          400: "#3eb38b",
          500: "#2a9772",
          600: "#1f7a5a",
          700: "#16604a",
        },
      },
      boxShadow: {
        card: "0 1px 0 rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
}
