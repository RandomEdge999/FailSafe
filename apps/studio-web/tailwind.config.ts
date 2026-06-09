import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1117",
        panel: "#101820",
        rail: "#e7edf3",
        app: "#f6f8fb",
        brand: {
          50: "#eaf6ff",
          100: "#d5ecff",
          600: "#0f6cbd",
          700: "#0b5cab",
          800: "#164a7a"
        },
        signal: "#0f6cbd",
        warning: "#f0a202",
        danger: "#e84855",
        safe: "#4caf50"
      },
      boxShadow: {
        lab: "0 18px 40px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
