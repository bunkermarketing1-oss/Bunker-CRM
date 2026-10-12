import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        marfil: {
          bg: "#F6F5F2",
          sidebar: "#F0EFEA",
          card: "#FFFFFF",
          border: "#ECEAE3",
          hover: "#F8F7F3",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#FBF7ED",
          border: "rgba(212, 175, 55, 0.45)",
          hover: "#E5C158",
          dark: "#9A7320",
        },
        obsidian: {
          DEFAULT: "#141414",
          hover: "#222222",
          card: "#1C1C1E",
        },
        bunker: {
          50: "#faf9f5",
          100: "#fbf1ed",
          200: "#f5dcd2",
          300: "#e9bead",
          400: "#e19a82",
          500: "#d97757",
          600: "#c15f3c",
          700: "#a54d2e",
          800: "#864028",
          900: "#6e3825",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
