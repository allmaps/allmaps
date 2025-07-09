import { theme } from '@allmaps/tailwind'

import type { Config } from 'tailwindcss'

export default {
  content: [
    './node_modules/@allmaps/ui/dist/components/**/*.{svelte,ts}',
    './node_modules/@allmaps/latest/dist/components/**/*.{svelte,ts}',
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme
} satisfies Config
