import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#070b14",
          900: "#e8eef8",
          700: "#8ab4ff",
          600: "#4f8cff",
          400: "#91b9ff",
          200: "#334766",
          100: "#24324a",
          50: "#151d2d",
          gold: "#f59e0b",
          silver: "#94a3b8",
          bronze: "#b45309",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.2), 0 12px 28px -12px rgba(0, 0, 0, 0.55)",
        podium: "0 12px 32px -8px rgba(79, 140, 255, 0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
