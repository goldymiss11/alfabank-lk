/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Alfa-Bank Brand & UI Colors (nested)
        alfa: {
          red: '#EF3124',
          'red-hover': '#D9261A',
          'red-soft': '#FEECEB',
          'red-light': '#FEF2F2',
          dark: '#0F1115',
          'dark-surface': '#1A1D24',
          'dark-card': '#22252C',
          canvas: '#F4F5F7',
          surface: '#FFFFFF',
          border: '#E8EAED',
          muted: '#8C93A0',
          text: '#0B0C0E',
          bg: '#F5F6F8',
          success: '#2FA84F',
          warning: '#F5A623',
        },
        // Flat aliases for direct token access
        'alfa-red': '#EF3124',
        'alfa-red-hover': '#D9261A',
        'alfa-red-soft': '#FEECEB',
        'alfa-dark': '#0F1115',
        'alfa-dark-surface': '#1A1D24',
        'alfa-dark-card': '#22252C',
        'alfa-canvas': '#F4F5F7',
        'alfa-surface': '#FFFFFF',
        'alfa-border': '#E8EAED',
        'alfa-muted': '#8C93A0',
        'alfa-text': '#0B0C0E',

        // Pastel shades for Bento cards
        bento: {
          peach: '#FFF1EE',
          mint: '#EBF9E8',
          aqua: '#E5F8FA',
          purple: '#F3E8FF',
          amber: '#FFF6E5',
        },
        'bento-peach': '#FFF1EE',
        'bento-mint': '#EBF9E8',
        'bento-aqua': '#E5F8FA',
        'bento-purple': '#F3E8FF',
        'bento-amber': '#FFF6E5',
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'alfa-card': '0 4px 24px -2px rgba(0, 0, 0, 0.06)',
        'alfa-card-hover': '0 8px 32px -4px rgba(0, 0, 0, 0.12)',
        'alfa-modal': '0 16px 48px -8px rgba(0, 0, 0, 0.16)',
        'alfa-dropdown': '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

