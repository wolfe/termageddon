/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        termageddon: {
          // Primary brand colors from logo/favicon analysis
          primary: '#1F2F38',      // Dark blue-gray from favicon
          secondary: '#4E4B52',    // Medium gray-purple
          accent: '#9A706F',       // Muted terracotta (replaces jarring red)
          purple: '#93728F',       // Soft purple from branding
          blue: '#B7D1DB',         // Light blue-gray
          // Neutral grays
          gray: {
            light: '#F6F3EE',      // Warm light gray from favicon
            DEFAULT: '#B2B3B0',    // Medium gray
            dark: '#1F2F38',       // Dark blue-gray (same as primary)
          }
        }
      },
      fontSize: {
        'base': '14px',
      },
      lineHeight: {
        'tight': '1.4',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
      }
    },
  },
  plugins: [],
}
