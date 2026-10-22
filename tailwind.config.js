/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: "#070A0F",
          900: "#0D1117",
          850: "#131922",
          800: "#1A2230",
          750: "#222D3E",
          700: "#2D3B50",
          600: "#445570",
          500: "#64748B",
        },
        playerX: {
          DEFAULT: "#06B6D4", // cyan-500
          light: "#67E8F9",
          glow: "rgba(6, 182, 212, 0.35)",
        },
        playerO: {
          DEFAULT: "#F97316", // orange-500
          light: "#FDBA74",
          glow: "rgba(249, 115, 22, 0.35)",
        },
        accentIndigo: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          glow: "rgba(99, 102, 241, 0.25)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
