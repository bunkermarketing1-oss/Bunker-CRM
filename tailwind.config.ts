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
        claude: {
          bg: "#FAF9F5",
          sidebar: "#F3F1EB",
          card: "#FFFFFF",
          cardHover: "#FAF8F2",
          border: "#E8E6DF",
          borderFocus: "#D97757",
          text: "#1F1E1D",
          textSecondary: "#716F6A",
          muted: "#9C9890",
          terracotta: "#D97757",
          terracottaHover: "#C15F3C",
          terracottaLight: "#FBF1ED",
          terracottaBorder: "#F3D6CB",
          sand: "#EFECE4",
          surface: "#FBF9F5",
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
