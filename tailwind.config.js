/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        kanji: [
          '"Hiragino Mincho ProN"',
          '"Yu Mincho"',
          '"Noto Serif JP"',
          'serif',
        ],
        sans: [
          'system-ui',
          '-apple-system',
          '"Hiragino Sans"',
          '"Noto Sans JP"',
          'sans-serif',
        ],
      },
      colors: {
        // Gojūon color hues can also be accessed via CSS vars
        gojuon: {
          a: 'var(--gojuon-a)',
          ka: 'var(--gojuon-ka)',
          sa: 'var(--gojuon-sa)',
          ta: 'var(--gojuon-ta)',
          na: 'var(--gojuon-na)',
          ha: 'var(--gojuon-ha)',
          ma: 'var(--gojuon-ma)',
          ya: 'var(--gojuon-ya)',
          ra: 'var(--gojuon-ra)',
          wa: 'var(--gojuon-wa)',
        },
      },
    },
  },
  plugins: [],
};
