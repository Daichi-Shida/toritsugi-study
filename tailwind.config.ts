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
        // 旧primary→ローズゴールド系へ。後方互換のため primary 名は維持。
        primary: {
          50:  "#fdf6ef",
          100: "#f9e7d2",
          200: "#f1d0a9",
          300: "#e3b582",
          400: "#d4a574", // ローズゴールド メイン
          500: "#c08a5b",
          600: "#a06f44",
          700: "#7e5733",
          800: "#5a3e23",
          900: "#3a2614",
        },
        // 深いブラウン系（テキスト・アクセント）
        mocha: {
          50:  "#f8f3ee",
          100: "#ede0d3",
          200: "#dcc5b1",
          300: "#c5a48a",
          400: "#a47e5f",
          500: "#7e5733",
          600: "#6b3e2a",
          700: "#4a2c1a",
          800: "#33200f",
          900: "#1f1208",
        },
        // クリーム（背景ベース）
        cream: {
          50:  "#fbf9f4",
          100: "#f5efe2",
          200: "#ede2c9",
          300: "#dfcca3",
          400: "#cbb281",
        },
        // ローズ：差し色・キャラ系
        rose: {
          50:  "#fef3f2",
          100: "#fde2df",
          200: "#fac6c0",
          300: "#f49a90",
          400: "#e87063",
          500: "#d04a3d",
        },
        accent: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
        },
        success: "#5b8a3a",
        error:   "#c14a3d",
      },
      fontFamily: {
        sans:    ["var(--font-noto-sans-jp)",  "system-ui", "sans-serif"],
        display: ["var(--font-noto-serif-jp)", "var(--font-noto-sans-jp)", "serif"],
      },
      backgroundImage: {
        // ホーム背景：クリーム→ピーチ→ローズゴールド
        "mesh-cream": "radial-gradient(at 12% 8%, rgba(244, 222, 189, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(228, 181, 130, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(244, 154, 144, 0.35) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(212, 165, 116, 0.45) 0px, transparent 55%), linear-gradient(135deg, #fbf9f4 0%, #f5efe2 60%, #f1d8c1 100%)",
        // ローズゴールド・グラデ（ボタン・アクセント）
        "gradient-gold": "linear-gradient(135deg, #e3b582 0%, #d4a574 50%, #c08a5b 100%)",
        "gradient-rose-gold": "linear-gradient(135deg, #f4d6b8 0%, #e3a96f 50%, #c08a5b 100%)",
        "gradient-mocha":     "linear-gradient(135deg, #6b3e2a 0%, #4a2c1a 100%)",
      },
      boxShadow: {
        soft:        "0 8px 24px -8px rgba(74, 44, 26, 0.18), 0 2px 4px -2px rgba(74, 44, 26, 0.08)",
        glass:       "0 12px 32px -8px rgba(74, 44, 26, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
        glow:        "0 8px 20px -4px rgba(212, 165, 116, 0.55)",
        "glow-soft": "0 4px 16px -4px rgba(212, 165, 116, 0.4)",
      },
      animation: {
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        "fade-up": "fadeUp 0.4s ease-out",
        "sparkle": "sparkle 0.6s ease-in-out",
        "shimmer": "shimmer 3s linear infinite",
      },
      keyframes: {
        bounceIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        sparkle: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.2) rotate(-5deg)" },
          "75%": { transform: "scale(1.2) rotate(5deg)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
