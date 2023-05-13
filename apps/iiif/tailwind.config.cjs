/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {}
  }
  // plugins: [require('flowbite/plugin')]
}
