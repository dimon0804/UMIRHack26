/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#fafaf9",
        night: "#030303",
        ink: "#1c1917",
        cream: "#f5f5f4",
        mist: "#a1a1aa",
        bone: "#e4e4e7",
        void: "#09090b",
        pulse: "#71717a",
        acid: "#a1a1aa",
        brick: "#3f3f46",
        lake: "#52525b",
        warn: "#eab308",
        danger: "#ef4444",
        moss: "#22c55e",
        fern: "#4ade80",
        neon: "#39ff14",
      },
      fontFamily: {
        display: ["Sora", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        sans: ["Sora", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      transitionDuration: {
        DEFAULT: "280ms",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "soft-md": "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "soft-lg": "0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
        "glow-sm": "0 0 32px -4px rgb(34 197 94 / 0.35)",
        "glow-emerald":
          "0 0 48px -6px rgb(74 222 128 / 0.45), 0 0 80px -20px rgb(34 197 94 / 0.25)",
        neon: "0 0 24px rgb(34 197 94 / 0.4), 0 0 48px rgb(34 197 94 / 0.15)",
        "bento-inset": "inset 0 1px 0 0 rgb(255 255 255 / 0.06)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(at 0% 0%, rgb(209 250 229 / 0.55) 0px, transparent 52%), radial-gradient(at 100% 0%, rgb(204 251 241 / 0.35) 0px, transparent 46%), radial-gradient(at 100% 100%, rgb(167 243 208 / 0.2) 0px, transparent 50%), radial-gradient(at 0% 100%, rgb(231 229 228 / 0.45) 0px, transparent 45%)",
        "mesh-cyber":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgb(34 197 94 / 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgb(16 185 129 / 0.12), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 80%, rgb(74 222 128 / 0.08), transparent 45%), radial-gradient(ellipse 45% 40% at 80% 100%, rgb(6 182 212 / 0.06), transparent 40%)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "orb-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(3%, -4%) scale(1.04)" },
          "66%": { transform: "translate(-2%, 3%) scale(0.96)" },
        },
        "orb-drift-reverse": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-4%, 2%) scale(1.05)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.85" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94) translateY(14px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "icon-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "blur-in": {
          "0%": { opacity: "0", filter: "blur(6px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "shine-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        organic: {
          "0%, 100%": { transform: "translate(0, 0) scale(1) rotate(0deg)", borderRadius: "42% 58% 55% 45%" },
          "33%": { transform: "translate(4%, -3%) scale(1.05) rotate(3deg)", borderRadius: "58% 42% 48% 52%" },
          "66%": { transform: "translate(-3%, 2%) scale(0.97) rotate(-2deg)", borderRadius: "48% 52% 58% 42%" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.55s cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in": "fade-in 0.45s cubic-bezier(0.4, 0, 0.2, 1) both",
        "orb-drift": "orb-drift 22s ease-in-out infinite",
        "orb-drift-slow": "orb-drift 28s ease-in-out infinite reverse",
        "orb-drift-reverse": "orb-drift-reverse 18s ease-in-out infinite",
        "pulse-soft": "pulse-soft 4s ease-in-out infinite",
        "pop-in": "pop-in 0.6s cubic-bezier(0.34, 1.15, 0.64, 1) both",
        "pop-in-fast": "pop-in 0.45s cubic-bezier(0.34, 1.2, 0.64, 1) both",
        "icon-float": "icon-float 3.2s ease-in-out infinite",
        "blur-in": "blur-in 0.65s cubic-bezier(0.4, 0, 0.2, 1) both",
        "slide-in-right": "slide-in-right 0.5s cubic-bezier(0.4, 0, 0.2, 1) both",
        "shine-sweep": "shine-sweep 2.5s ease-in-out infinite",
        organic: "organic 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
