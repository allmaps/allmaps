import { theme } from '@allmaps/tailwind'

import type { Config } from 'tailwindcss'

export default {
  content: [
    './node_modules/@allmaps/ui/dist/**/*.{html,js,svelte,ts}',
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  theme
} satisfies Config
