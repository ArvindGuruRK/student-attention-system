import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#f7f7f7",
        surface: "#ffffff",
        // Neutral scale
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          150: "#efefef",
          200: "#e8e8e8",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Attention status — legacy monochrome tokens (kept for backward compat)
        attentive: "#ffffff",
        distracted: "#f0f0f0",
        at_risk: "#404040",
        alert: "#0a0a0a",
        // Semantic status color system
        status: {
          green: {
            DEFAULT: "#16a34a",
            bg: "#f0fdf4",
            border: "#bbf7d0",
            muted: "#86efac",
            text: "#15803d",
            pulse: "#22c55e",
          },
          yellow: {
            DEFAULT: "#d97706",
            bg: "#fffbeb",
            border: "#fde68a",
            muted: "#fcd34d",
            text: "#b45309",
            pulse: "#f59e0b",
          },
          orange: {
            DEFAULT: "#ea580c",
            bg: "#fff7ed",
            border: "#fed7aa",
            muted: "#fdba74",
            text: "#c2410c",
            pulse: "#f97316",
          },
          red: {
            DEFAULT: "#dc2626",
            bg: "#fef2f2",
            border: "#fecaca",
            muted: "#fca5a5",
            text: "#b91c1c",
            pulse: "#ef4444",
          },
        },
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        ping: {
          "0%": { transform: "scale(1)", opacity: "0.75" },
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease both",
        slideUp: "slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1) both",
        slideInRight: "slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1) both",
        ping: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        shimmer: "shimmer 1.8s infinite",
      },
      boxShadow: {
        "subtle": "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card": "0 4px 16px -4px rgba(0,0,0,0.08), 0 1px 4px -1px rgba(0,0,0,0.04)",
        "modal": "0 24px 64px -12px rgba(0,0,0,0.18), 0 8px 24px -8px rgba(0,0,0,0.08)",
        "lift": "0 8px 32px -8px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
