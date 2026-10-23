module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: { 950: "#0a0a0c", 900: "#111115", 800: "#18181d", 700: "#24242b" },
        line: "#2b2b33",
        gold: { DEFAULT: "#f5c451", 600: "#d9a62e" },
        chalk: "#f5f5f4",
        mute: "#a1a1aa",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        sheet: { from: { transform: "translateY(24px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: { sheet: "sheet .28s ease-out", fade: "fade .2s ease-out" },
    },
  },
  plugins: [],
};
