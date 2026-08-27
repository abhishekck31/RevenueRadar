import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mulish', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace']
      },
      colors: {
        rzp: {
          ink: '#0A0F1E',
          purple: '#7C3AED',
          'purple-bg': '#F3E8FF',
          gold: '#FFB800',
          blue: '#2B5CE6',
          'blue-light': '#E8EFFE',
          'blue-mid': '#5C7CFA',
          white: '#FFFFFF',
          surface: '#F9FAFB',
          card: '#FFFFFF',
          border: '#E5E7EB',
          'border-strong': '#D1D5DB',
          sidebar: '#1A2140',
          text: '#1A1A2E',
          'text-secondary': '#4B5563',
          'text-muted': '#9CA3AF',
          success: '#15803D',
          'success-bg': '#DCFCE7',
          warning: '#B45309',
          'warning-bg': '#FEF3C7',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          pending: '#1D4ED8',
          'pending-bg': '#DBEAFE'
        }
      },
      boxShadow: {
        low: '0 1px 2px rgba(0,0,0,0.05)',
        mid: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
        high: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)'
      },
      borderRadius: {
        rzp: '8px'
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-in-right': 'slide-in-right 0.3s ease forwards',
        'pipeline-step': 'pipeline-step 0.4s ease forwards'
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'pipeline-step': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
}

export default config
