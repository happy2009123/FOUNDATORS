/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#020202',
        card: '#111111',
        card2: '#0e0e0e',
        line: 'rgba(212,175,55,0.22)',
        linesoft: 'rgba(212,175,55,0.12)',
        text2: '#a2a09a',
        text3: '#6f6d68',
        gold: {
          hi: '#f7dd8f',
          DEFAULT: '#d9ac3d',
          deep: '#a8791f',
        },
        brandred: '#e0344c',
        brandgreen: '#2ecc71',
        brandblue: '#5b8dff',
      },
      fontFamily: {
        display: ['var(--font-montserrat)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg,#f7dd8f 0%,#e0b74a 45%,#b8860b 100%)',
      },
      borderRadius: {
        xl2: '26px',
      },
    },
  },
  plugins: [],
};
