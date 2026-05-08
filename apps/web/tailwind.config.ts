import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#38bdf8",
          dark: "#0ea5e9",
        },
        surface: {
          DEFAULT: "#1e293b",
          deep: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
