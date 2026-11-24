import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts,svx}',
    './node_modules/@allmaps/ui/dist/**/*.{html,js,svelte,ts}'
  ]
} satisfies Config
