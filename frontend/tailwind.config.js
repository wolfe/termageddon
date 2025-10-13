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
        },
        
        // Status colors - semantic mapping for draft states
        status: {
          published: {
            light: 'green-100',
            DEFAULT: 'green-700',
            dark: 'green-800'
          },
          approved: {
            light: 'blue-100',
            DEFAULT: 'blue-700',
            dark: 'blue-800'
          },
          ready: {
            light: 'yellow-100',
            DEFAULT: 'yellow-700',
            dark: 'yellow-800'
          },
          pending: {
            light: 'orange-100',
            DEFAULT: 'orange-700',
            dark: 'orange-800'
          }
        },
        
        // Action colors - semantic mapping for buttons and interactions
        action: {
          primary: {
            DEFAULT: 'blue-600',
            hover: 'blue-700'
          },
          success: {
            DEFAULT: 'green-600',
            hover: 'green-700'
          },
          warning: {
            DEFAULT: 'yellow-600',
            hover: 'yellow-700'
          },
          danger: {
            DEFAULT: 'red-600',
            hover: 'red-700'
          },
          secondary: {
            DEFAULT: 'gray-500',
            hover: 'gray-600'
          }
        },
        
        // Role colors - semantic mapping for user roles
        role: {
          approver: 'green-500',
          reviewer: 'purple-500',
          admin: 'yellow-500'
        },
        
        // UI element colors - semantic mapping for interface elements
        ui: {
          border: {
            light: 'gray-300',
            DEFAULT: 'gray-300',
            dark: 'gray-400'
          },
          text: {
            muted: 'gray-500',
            DEFAULT: 'gray-700',
            emphasis: 'gray-800'
          },
          background: {
            subtle: 'gray-50',
            DEFAULT: 'white',
            elevated: 'gray-50'
          },
          focus: 'termageddon-accent'
        },
        
        // Notification colors - semantic mapping for alerts and messages
        notification: {
          success: 'green-500',
          error: 'red-500',
          warning: 'yellow-500',
          info: 'blue-500'
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
