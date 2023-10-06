import typegraphy from '@tailwindcss/typography'

import { theme } from '@allmaps/tailwind'

import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme,
  plugins: [typegraphy]
} satisfies Config
