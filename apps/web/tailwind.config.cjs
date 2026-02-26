/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          500: "var(--primary)",
          600: "var(--primary-2)",
          700: "var(--primary-3)",
          foreground: "var(--primary-foreground)",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
        "3xl": "1.4rem",
      },
      backgroundImage: {
        "hero-surface": "radial-gradient(1000px 520px at 16% 8%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 58%), radial-gradient(900px 480px at 92% 16%, rgba(56, 189, 248, 0.12), transparent 62%)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"],
      },
    },
  },
  plugins: [],
};
