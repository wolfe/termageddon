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
            DEFAULT: '#2563eb',  // blue-600
            hover: '#1d4ed8'    // blue-700
          },
          success: {
            DEFAULT: '#16a34a',  // green-600
            hover: '#15803d'    // green-700
          },
          warning: {
            DEFAULT: '#ca8a04',  // yellow-600
            hover: '#a16207'    // yellow-700
          },
          danger: {
            DEFAULT: '#dc2626',  // red-600
            hover: '#b91c1c'    // red-700
          },
          secondary: {
            DEFAULT: '#6b7280',  // gray-500
            hover: '#4b5563'    // gray-600
          }
        },
        
        // Role colors - semantic mapping for user roles
        role: {
          approver: '#10b981',  // green-500
          reviewer: '#8b5cf6',  // purple-500
          admin: '#eab308'      // yellow-500
        },
        
        // UI element colors - semantic mapping for interface elements
        ui: {
          border: {
            light: '#d1d5db',  // gray-300
            DEFAULT: '#d1d5db', // gray-300
            dark: '#9ca3af'    // gray-400
          },
          text: {
            muted: '#6b7280',   // gray-500
            DEFAULT: '#374151', // gray-700
            emphasis: '#1f2937' // gray-800
          },
          background: {
            subtle: '#f9fafb',  // gray-50
            DEFAULT: '#ffffff', // white
            elevated: '#f9fafb' // gray-50
          },
          focus: '#9A706F'      // termageddon-accent
        },
        
        // Notification colors - semantic mapping for alerts and messages
        notification: {
          success: '#10b981',  // green-500
          error: '#ef4444',   // red-500
          warning: '#eab308', // yellow-500
          info: '#3b82f6'     // blue-500
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
