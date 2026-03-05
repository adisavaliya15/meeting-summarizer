/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        "background-2": "var(--bg-2)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        foreground: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          soft: "var(--primary-soft)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        xl: "0.85rem",
        "2xl": "1.1rem",
        "3xl": "1.45rem",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(45% 45% at 12% 12%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 72%), radial-gradient(38% 42% at 88% 18%, rgba(56,189,248,0.14), transparent 74%), linear-gradient(180deg, var(--bg), var(--bg-2))",
      },
      keyframes: {
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
        "pulse-soft": {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "70%": { transform: "scale(1.08)", opacity: "0" },
          "100%": { transform: "scale(1.08)", opacity: "0" },
        },
      },
      animation: {
        "float-slow": "float-slow 6s ease-in-out infinite",
        "pulse-soft": "pulse-soft 1.8s ease-out infinite",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans"],
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};