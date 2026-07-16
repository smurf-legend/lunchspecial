import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand color, replacing Tailwind's default orange. 600 is the
        // exact requested red (#CD1C18) — every existing orange-* class
        // in the app picks this up automatically, no per-component edits.
        orange: {
          50: "#fbefee",
          100: "#f7dad9",
          200: "#eeb5b4",
          300: "#ef7976",
          400: "#e9433f",
          500: "#e41f1b",
          600: "#cd1c18",
          700: "#a41613",
          800: "#7f110f",
          900: "#5b0c0b",
          950: "#440908",
        },
      },
    },
  },
  plugins: [],
};
export default config;
