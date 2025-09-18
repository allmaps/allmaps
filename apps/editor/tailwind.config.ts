import { theme } from '@allmaps/tailwind'
import typography from '@tailwindcss/typography'

import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/components/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme,
  plugins: [typography]
} satisfies Config
