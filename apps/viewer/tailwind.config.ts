import type { Config } from 'tailwindcss'

import flowbitePlugin from 'flowbite/plugin'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      transitionDuration: {
        '0': '0ms'
      }
    },
    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      mono: ['DM Mono', 'monospace']
    }
  },
  plugins: [flowbitePlugin]
} satisfies Config
