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
        bunker: {
          50: "#f0f4ff",
          100: "#e0eaff",
          200: "#c7d7fe",
          300: "#a4bcfd",
          400: "#7c97fb",
          500: "#586ff6",
          600: "#3d4de8",
          700: "#313bc9",
          800: "#2a32a2",
          900: "#272f80",
          950: "#0f122e",
        },
        navy: {
          800: "#0f172a",
          850: "#0c1322",
          900: "#090d16",
          950: "#05070c",
        }
      },
    },
  },
  plugins: [],
};
export default config;
