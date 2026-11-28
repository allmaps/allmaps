import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    '../../packages/ui/src/lib/**/*.{html,js,svelte,ts}'
  ]
} satisfies Config
