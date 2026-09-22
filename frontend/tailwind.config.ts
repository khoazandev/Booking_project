import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#f5f4f2",
        ink: {
          DEFAULT: "#0a0a0a",
          50: "#2a2a2a",
          100: "#1a1a1a",
          200: "#151515",
          900: "#0a0a0a",
        },
        ember: {
          DEFAULT: "#ff6b00",
          hover: "#e55a00",
          subtle: "rgba(255, 107, 0, 0.08)",
          border: "rgba(255, 107, 0, 0.28)",
        },
        stone: {
          50: "#faf9f6",
          100: "#f5f4f2",
          200: "#e8e6e1",
          300: "#d9d6cd",
          400: "#b5b0a3",
          500: "#878377",
          600: "#5c5850",
          700: "#3d3a34",
          800: "#22201c",
          900: "#141311",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        taste: "0 6px 18px -6px rgba(15,15,15,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "taste-hover": "0 14px 30px -8px rgba(15,15,15,0.14), 0 1px 2px rgba(0,0,0,0.04)",
        "taste-card": "0 4px 20px -4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02)",
        "taste-dark": "0 14px 32px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
