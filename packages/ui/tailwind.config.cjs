/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      textColor: '#222222'
    },
    colors: {
      blue: '#63D8E6',
      'blue-dark': '#3B44AD',
      purple: '#C552B5',
      pink: '#FF56BA',
      orange: '#FF7415',
      red: '#FE5E60',
      green: '#64C18F',
      yellow: '#FFC742',
      'gray-dark': '#888888',
      'gray-light': '#DDDDDD',
      black: '#222222',
      white: '#FFFFFF'
    },

    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      mono: ['DM Mono', 'monospace']
    }
  }
  // plugins: [require('flowbite/plugin')]
}
