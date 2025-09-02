// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'whatsapp-dark-green': '#075E54',
        'whatsapp-green': '#128C7E',
        'whatsapp-light-green': '#25D366',
        'whatsapp-chat-green': '#DCF8C6',
        'whatsapp-blue': '#34B7F1',
      }
    }
  },
  plugins: [],
};
