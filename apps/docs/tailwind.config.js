import starlightPlugin from '@astrojs/starlight-tailwind'

import { theme } from '@allmaps/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // './node_modules/@allmaps/ui/dist/components/MapMonster.svelte',
    // './node_modules/@allmaps/ui/dist/components/**/*.{svelte,ts}'
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  // theme: {
  //   extend: {
  //     colors: {

  //       // Your preferred accent color. Indigo is closest to Starlight’s defaults.
  // :root[data-theme="light"] {
  //           --sl-color-accent: #4f46e5;
  //       accent: '#ff0000',
  //       // Your preferred gray scale. Zinc is closest to Starlight’s defaults.
  //       gray: 'blue'
  //     }
  //   }
  // },

  // extend: {
  //   colors: {
  //     // Your preferred accent color. Indigo is closest to Starlight’s defaults.
  //     accent: colors.indigo,
  //     // Your preferred gray scale. Zinc is closest to Starlight’s defaults.
  //     gray: colors.zinc,
  //   },
  theme,
  plugins: [starlightPlugin()]
}
