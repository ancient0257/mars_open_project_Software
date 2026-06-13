/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0a0a0f",
          soft: "#12121a",
          muted: "#1c1c28",
        },
        fog: {
          DEFAULT: "#e8e6f0",
          dim: "#9d9ab0",
          faint: "#3a3850",
        },
        spark: {
          DEFAULT: "#7c6af5",
          bright: "#a594ff",
          dim: "#3d3480",
        },
        jade: "#2dd4a0",
        amber: "#f5a623",
        rose: "#f56b8a",
      },
    },
  },
  plugins: [],
};

