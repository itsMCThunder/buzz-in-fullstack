/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "bg-animated",
    "neon-title",
    "buzz-btn",
    "buzz-active",
    "buzz-locked",
    "btn",
    "btn-primary",
    "btn-secondary",
    "btn-positive",
    "btn-negative",
    "btn-neutral",
    "player-card",
    "host-controls",
    "app-container",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
