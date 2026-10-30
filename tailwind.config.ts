import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        md: "2.5rem",
        lg: "4rem",
      },
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        background: "#07090c",
        surface: "#0e1217",
        line: "rgba(255, 255, 255, 0.08)",
        ink: "#e8ecf1",
        muted: "#8a94a3",
        accent: "#22d3ee",
        warm: "#f59e0b",
      },
      borderColor: {
        DEFAULT: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
      },
      fontSize: {
        display: [
          "clamp(3.5rem, 12vw, 10rem)",
          { lineHeight: "0.86", letterSpacing: "-0.02em" },
        ],
      },
      letterSpacing: {
        eyebrow: "0.3em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      maxWidth: {
        site: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
