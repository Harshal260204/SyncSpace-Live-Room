/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // Modern color palette with glassmorphism and accessibility
      colors: {
        // Primary brand colors - inspired by Linear and Vercel
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Secondary colors - sophisticated grays
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Workspace module colors - distinctive palettes
        code: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        notes: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        canvas: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        chat: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Status colors with enhanced contrast
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Glassmorphism colors
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.2)',
          strong: 'rgba(255, 255, 255, 0.3)',
          dark: 'rgba(0, 0, 0, 0.1)',
        },
        // High contrast mode colors
        'hc-bg': '#000000',
        'hc-text': '#ffffff',
        'hc-border': '#ffffff',
        'hc-accent': '#ffff00',
      },
      // Font sizes for accessibility
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        // Accessibility font sizes
        'a-sm': ['0.875rem', { lineHeight: '1.5rem' }], // Small for accessibility
        'a-base': ['1rem', { lineHeight: '1.75rem' }],  // Base for accessibility
        'a-lg': ['1.25rem', { lineHeight: '2rem' }],    // Large for accessibility
        'a-xl': ['1.5rem', { lineHeight: '2.25rem' }],  // Extra large for accessibility
      },
      // Spacing for consistent layout
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Modern animations and micro-interactions
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'typing': 'typing 1.5s steps(40, end) infinite',
        'blink': 'blink 1s step-end infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.1)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(1)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      // Enhanced shadows and glassmorphism
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 2px 10px -2px rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'floating': '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-yellow': '0 0 20px rgba(234, 179, 8, 0.4)',
      },
      // Backdrop blur for glassmorphism
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // Enhanced spacing for modern layouts
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
      },
      // Modern border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      // Enhanced gradients
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-aurora': 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)',
        'gradient-sunset': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-ocean': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Custom plugin for modern UI components and accessibility
    function({ addUtilities, theme, addComponents }) {
      // Glassmorphism and modern UI utilities
      const glassmorphismUtilities = {
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
        '.glass-card': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        },
        '.floating-card': {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.3s ease',
        },
        '.floating-card:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        },
        '.gradient-border': {
          position: 'relative',
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          padding: '2px',
          borderRadius: '12px',
        },
        '.gradient-border::before': {
          content: '""',
          position: 'absolute',
          inset: '2px',
          background: 'white',
          borderRadius: '10px',
          zIndex: '-1',
        },
        '.shimmer': {
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
        },
      };

      // Accessibility utilities
      const accessibilityUtilities = {
        '.hc-mode': {
          backgroundColor: theme('colors.hc-bg'),
          color: theme('colors.hc-text'),
          borderColor: theme('colors.hc-border'),
        },
        '.hc-accent': {
          color: theme('colors.hc-accent'),
        },
        '.focus-visible-ring': {
          '&:focus-visible': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: '0 0 0 2px ' + theme('colors.primary.500'),
          },
        },
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        '.skip-link': {
          position: 'absolute',
          top: '-40px',
          left: '6px',
          background: theme('colors.primary.600'),
          color: theme('colors.white'),
          padding: '8px',
          textDecoration: 'none',
          borderRadius: '4px',
          zIndex: '1000',
          '&:focus': {
            top: '6px',
          },
        },
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
        },
        '.high-contrast': {
          filter: 'contrast(150%)',
        },
      };

      // Modern component styles
      const componentStyles = {
        '.btn-modern': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 24px',
          borderRadius: '12px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        },
        '.btn-modern::before': {
          content: '""',
          position: 'absolute',
          top: '0',
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transition: 'left 0.5s',
        },
        '.btn-modern:hover::before': {
          left: '100%',
        },
        '.card-modern': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          transition: 'all 0.3s ease',
        },
        '.card-modern:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.5)',
        },
        '.input-modern': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: theme('colors.gray.900'),
          transition: 'all 0.2s ease',
        },
        '.input-modern:focus': {
          outline: 'none',
          borderColor: theme('colors.primary.500'),
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
      };

      addUtilities(glassmorphismUtilities);
      addUtilities(accessibilityUtilities);
      addComponents(componentStyles);
    },
  ],
  // Dark mode configuration
  darkMode: 'class',
}
