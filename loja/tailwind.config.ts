import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        laranja: '#FB7F20',
        grafite: '#2B2827',
        creme: '#FBF8F3',
        areia: '#F0E9DD',
        bronze: '#B08D57',
        carvao: '#2A2622',
        noturno: '#332B24',
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-jost)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
