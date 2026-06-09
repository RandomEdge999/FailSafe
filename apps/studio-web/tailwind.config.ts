import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1117",
        panel: "#101820",
        rail: "#1f2a35",
        signal: "#00a6a6",
        warning: "#f0a202",
        danger: "#e84855",
        safe: "#4caf50"
      },
      boxShadow: {
        lab: "0 24px 60px rgba(0, 0, 0, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
