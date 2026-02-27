/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables `.dark` class toggling
  theme: {
    extend: {
      colors: {
        // App Background
        bg: {
          light: '#f9fafb',   // Soft Gray
          dark: '#111827',    // Deep Gray
        },

        // Section / Card Surfaces
        surface: {
          light: '#ffffff',   // White
          dark: '#1f2937',    // Gray-800
        },

        // Text Styles
        text: {
          mainLight: '#1f2937',   // Gray-800
          mainDark: '#f9fafb',    // Gray-50
          mutedLight: '#6b7280',  // Gray-500
          mutedDark: '#d1d5db',   // Gray-300
        },

        // Borders
        border: {
          light: '#e5e7eb',  // Gray-200
          dark: '#374151',   // Gray-700
        },

        // Primary Brand Color - Orange (matching landing page)
        primary: {
          DEFAULT: '#f97316', // Orange-500 (main brand color)
          light: '#fb923c',   // Orange-400 (lighter variant)
          dark: '#ea580c',    // Orange-600 (darker variant)
          50: '#fff7ed',      // Orange-50
          100: '#ffedd5',     // Orange-100
          200: '#fed7aa',     // Orange-200
          300: '#fdba74',     // Orange-300
          400: '#fb923c',     // Orange-400
          500: '#f97316',     // Orange-500
          600: '#ea580c',     // Orange-600
          700: '#c2410c',     // Orange-700
          800: '#9a3412',     // Orange-800
          900: '#7c2d12',     // Orange-900
        },

        // Status Colors (Badges)
        state: {
          info: '#3b82f6',     // Blue
          success: '#10b981',  // Green
          warning: '#f59e0b',  // Orange
          error: '#ef4444',    // Red
        },
      },

      // UI Motion / Animations
      animation: {
        'fade-in': 'fadeIn .4s ease-in',
        'slide-up': 'slideUp .25s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
plugins: [],
}
