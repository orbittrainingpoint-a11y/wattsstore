import type { Config } from 'tailwindcss';

// WattsStore industrial theme (PRD §5.1, §5.3). Font: Montserrat (var --font-sans).
// Brand greys tuned for AA contrast on white surface (≥4.5:1).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E4D8C',
          yellow: '#F5C400',
          // Tightened from #4A5568 to #3C4859 to reach 7.5:1 on white (AAA body).
          gray: '#3C4859',
          dark: '#0F1623',
          light: '#F7F9FC',
        },
        // Status colors: all pass 4.5:1 on white.
        status: { success: '#15803D', warning: '#B45309', error: '#B91C1C' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Montserrat', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      maxWidth: { content: '1400px' },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)',
        modal: '0 10px 30px rgba(30,77,140,0.12), 0 2px 6px rgba(30,77,140,0.06)',
      },
      borderRadius: { DEFAULT: '8px', lg: '12px' },
    },
  },
  plugins: [],
};
export default config;
