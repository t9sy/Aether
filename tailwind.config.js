/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        // Aura Light
        'aura-bg': 'var(--bg)',
        'aura-surface': 'var(--surface)',
        'aura-surface-hover': 'var(--surface-hover)',
        'aura-text': 'var(--text)',
        'aura-text-secondary': 'var(--text-secondary)',
        'aura-accent': 'var(--accent)',
        'aura-accent-hover': 'var(--accent-hover)',
        'aura-border': 'var(--border)',
        'aura-sidebar': 'var(--sidebar)',
        'aura-topbar': 'var(--topbar)',
      },
      backdropBlur: {
        glass: '20px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
