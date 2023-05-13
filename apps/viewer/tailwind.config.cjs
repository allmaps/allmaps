/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      transitionDuration: {
        '0': '0ms'
      }
    },
    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      mono: ['DM Mono', 'monospace']
    }
  },
  plugins: [require('flowbite/plugin')]
}
