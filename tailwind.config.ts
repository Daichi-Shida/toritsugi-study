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
        // ブランドカラー（女性向け・柔らかいトーン）
        primary: {
          50:  "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
        },
        accent: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
        },
        success: "#22c55e",
        error: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", "sans-serif"],
      },
      animation: {
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "fade-up": "fadeUp 0.3s ease-out",
        "sparkle": "sparkle 0.6s ease-in-out",
      },
      keyframes: {
        bounceIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        sparkle: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.2) rotate(-5deg)" },
          "75%": { transform: "scale(1.2) rotate(5deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
