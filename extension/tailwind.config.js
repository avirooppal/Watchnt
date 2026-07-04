/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: [
    "./index.html",
    "./dashboard.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        signal: {
          ink: '#0B0F14',
          surface: '#131A21',
          'surface-raised': '#1C242D',
        },
        accent: {
          amber: '#F2A93B',
          'amber-dim': '#B8791F',
          'cyan-pulse': '#4FD8C4',
        },
        state: {
          danger: '#F0554A',
          success: '#10B981',
        },
        text: {
          primary: '#ECEEF0',
          muted: '#7C8896',
        },
        border: {
          hairline: 'rgba(236, 238, 240, 0.07)',
        }
      },
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
      },
      boxShadow: {
        'glow': '0 0 24px rgba(242, 169, 59, 0.25)',
        'surface': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(236, 238, 240, 0.05)',
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'signal-ripple': 'signalRipple 1s ease-in-out infinite',
        'spool-sweep': 'spoolSweep 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        signalRipple: {
          '0%, 100%': { height: '2px', opacity: '0.5' },
          '50%': { height: '16px', opacity: '1' },
        },
        spoolSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
