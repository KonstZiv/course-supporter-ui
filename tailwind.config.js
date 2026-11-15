/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Academic Studio palette. Source of the values: the public site,
        // repository course-supporter-site, file src/styles/global.css, block
        // @theme — every page of the platform shares the site's look.
        // The one deliberate departure is ink.muted: the site has #8a8a9a and
        // uses it for decoration only, while here it carries text and must keep
        // a contrast of at least 4.5:1 (src/inkContrast.test.ts).
        // The site's rule for the accents sun, apricot and sky: decoration only;
        // text on them is ink, never white.
        canvas:    { DEFAULT: '#FAFAF7', dark: '#F0EDE6' },
        ink:       { DEFAULT: '#1A1A2E', light: '#4A4A5A', muted: '#62627A' },
        navy:      { DEFAULT: '#1B4D5C', light: '#2A6B7C', dark: '#0F3540', pale: '#E8F4F8' },
        amber:     { DEFAULT: '#C8952E', light: '#E8B84D', dark: '#A07824', pale: '#FFF8E8' },
        forest:    { DEFAULT: '#2D6A4F', light: '#40916C', pale: '#E8F5EE' },
        coral:     { DEFAULT: '#C44536', light: '#E05A4B', pale: '#FFF0EE' },
        plum:      { DEFAULT: '#6B4C8A', light: '#8B6CAA', pale: '#F5F0FA' },
        sun:       { DEFAULT: '#F5C542', pale: '#FFF4CC' },
        apricot:   { DEFAULT: '#F4A261', pale: '#FDEBDD' },
        sky:       { DEFAULT: '#8CCBE0', pale: '#E3F3F9' },
      },
      fontFamily: {
        // The site's fonts, bundled from npm (src/fonts.ts).
        display: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
        body:    ['"Manrope Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'body':  ['1rem',   { lineHeight: '1.7' }],
        'lg':    ['1.125rem', { lineHeight: '1.6' }],
        'xl':    ['1.25rem',  { lineHeight: '1.5' }],
        '2xl':   ['1.625rem', { lineHeight: '1.4' }],
        '3xl':   ['2rem',     { lineHeight: '1.3' }],
        '4xl':   ['2.5rem',   { lineHeight: '1.2' }],
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)',
        'card-lg': '0 2px 8px rgba(26,26,46,0.08), 0 12px 32px rgba(26,26,46,0.06)',
        'glow':    '0 0 20px rgba(27,77,92,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease-out',
        'slide-up':   'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:  { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
}
