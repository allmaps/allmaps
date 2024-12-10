import typography from '@tailwindcss/typography'
import containerQueries from '@tailwindcss/container-queries'

import { theme } from '@allmaps/tailwind'

import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme,
  plugins: [typography, containerQueries]
} satisfies Config
