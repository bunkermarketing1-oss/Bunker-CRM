import { Inter } from "next/font/google";

/**
 * Inter solo entra como respaldo: en macOS y Windows se ve la fuente nativa del sistema
 * (San Francisco / Segoe UI) y en Linux o Android, donde no existen, Inter mantiene el mismo aire.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
