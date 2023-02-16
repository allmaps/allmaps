/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/package/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    // extend: {}
    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      mono: ['DM Mono', 'monospace']
    }
  },
  plugins: [require('flowbite/plugin')]
}
