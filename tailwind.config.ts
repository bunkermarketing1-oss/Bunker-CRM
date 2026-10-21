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
          bg: "#F8F9FA",
          sidebar: "#FFFFFF",
          card: "#FFFFFF",
          border: "#EAECF0",
          hover: "#F2F4F7",
        },
        brand: {
          50: "#EEF4FF",
          100: "#E0EAFF",
          200: "#C7D7FE",
          300: "#A4BCFD",
          400: "#8098F9",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
        gold: {
          DEFAULT: "#6366F1",
          light: "#F4F3FF",
          border: "rgba(99, 102, 241, 0.3)",
          hover: "#4F46E5",
          dark: "#3730A3",
        },
        obsidian: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          card: "#FFFFFF",
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
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
