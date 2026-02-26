/** @type {import(''tailwindcss'').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
        },
      },
      boxShadow: {
        soft: "0 20px 45px -24px rgba(15, 23, 42, 0.45)",
      },
    },
  },
  plugins: [],
};