import { nextui } from "@nextui-org/theme"

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#FF6B6B",
          foreground: "hsl(var(--primary-foreground))",
          50: "#FFF0F0",
          100: "#FFE1E1",
          200: "#FFC7C7",
          300: "#FFA4A4",
          400: "#FF8585",
          500: "#FF6B6B",
          600: "#FF4F4F",
          700: "#FF2E2E",
          800: "#FF0F0F",
          900: "#FF0000",
        },
        secondary: {
          DEFAULT: "#4ECDC4",
          foreground: "hsl(var(--secondary-foreground))",
          50: "#EDFCFB",
          100: "#D6F9F6",
          200: "#AFF3EE",
          300: "#87EDE5",
          400: "#60E7DD",
          500: "#4ECDC4",
          600: "#3DA39C",
          700: "#2C7974",
          800: "#1B504C",
          900: "#0A2624",
        },
        accent: {
          DEFAULT: "#FFE66D",
          foreground: "hsl(var(--accent-foreground))",
          50: "#FFFBE6",
          100: "#FFF7CC",
          200: "#FFF199",
          300: "#FFEB66",
          400: "#FFE66D",
          500: "#FFE033",
          600: "#FFDA00",
          700: "#CCA800",
          800: "#997E00",
          900: "#665400",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: 0 },
          "50%": { transform: "scale(1.05)", opacity: 0.8 },
          "70%": { transform: "scale(0.9)", opacity: 0.9 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), nextui()],
}

