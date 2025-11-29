import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        corporate: {
          "primary": "#cc4422",
          "primary-content": "#ffffff",
          "secondary": "#8b4513",
          "secondary-content": "#ffffff",
          "accent": "#ff6b35",
          "accent-content": "#ffffff",
          "neutral": "#2a2a3e",
          "neutral-content": "#ffffff",
          "base-100": "#fffaf5",
          "base-200": "#f5f0eb",
          "base-300": "#ebe6e1",
          "base-content": "#1a1a2e",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
        dark: {
          "primary": "#cc4422",
          "primary-content": "#ffffff",
          "secondary": "#8b4513",
          "secondary-content": "#ffffff",
          "accent": "#ff6b35",
          "accent-content": "#ffffff",
          "neutral": "#1a1a2e",
          "neutral-content": "#ffffff",
          "base-100": "#0a0a0f",
          "base-200": "#16213e",
          "base-300": "#1a1a2e",
          "base-content": "#f0f0f0",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  },
}

