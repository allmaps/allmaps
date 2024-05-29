import starlightPlugin from '@astrojs/starlight-tailwind'

import { theme } from '@allmaps/tailwind'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './node_modules/@allmaps/ui/dist/components/**/*.{svelte,ts}',
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme,
  plugins: [starlightPlugin()]
}
