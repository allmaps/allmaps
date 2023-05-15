import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      mono: ['DM Mono', 'monospace']
    }
  }
} satisfies Config
