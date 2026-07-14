/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bmw: {
          blue: '#0066B1',       // Active Blue (Primary)
          navy: '#003D78',       // Deep Navy (Secondary)
          red: '#E22718',        // Motorsport Red (Danger/Alerts)
          offwhite: '#F8FAFC',   // Off-White (Backgrounds)
          dark: '#0F172A',       // Rich charcoal slate for dark panels
          gray: '#E2E8F0',       // Border slate gray
          text: '#1E293B'        // Slate-800 for primary text
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
