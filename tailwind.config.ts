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
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        gold: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
          border: "rgba(245, 158, 11, 0.35)",
          hover: "#D97706",
          dark: "#B45309",
        },
        obsidian: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          card: "#FFFFFF",
        },
        orvion: {
          bg: "#ECEEF2",
          surface: "#FFFFFF",
          dark: "#121417",
          darkHover: "#1E2229",
          lime: "#D4F933",
          limeHover: "#C4EA22",
          limeLight: "rgba(212, 249, 51, 0.2)",
          pill: "#F3F4F7",
          border: "#E2E5EB",
          muted: "#8C929D",
        },
        bunker: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      animation: {
        "gold-shimmer": "goldShimmer 3s ease-in-out infinite",
        "gold-pulse": "goldPulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-x": "gradientX 6s ease infinite",
      },
      keyframes: {
        goldShimmer: {
          "0%, 100%": { filter: "brightness(1)" },
          "50%": { filter: "brightness(1.18)" },
        },
        goldPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(245, 158, 11, 0)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      borderRadius: {
        "orvion-card": "28px",
        "orvion-pill": "9999px",
      },
      boxShadow: {
        "orvion-card": "0 10px 30px -4px rgba(18, 20, 23, 0.04), 0 2px 8px -2px rgba(18, 20, 23, 0.02)",
        "orvion-glow": "0 0 25px -2px rgba(212, 249, 51, 0.4)",
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
