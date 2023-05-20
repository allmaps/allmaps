import type { Config } from 'tailwindcss'

import colors from './src/lib/shared/colors.js'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './dist/components/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      textColor: {
        DEFAULT: colors.black
      },
      transitionDuration: {
        0: '0ms'
      }
    },
    colors,
    fontFamily: {
      sans: ['Geograph', 'sans-serif'],
      // Consider using https://tosche.net/fonts/codelia
      mono: ['DM Mono', 'monospace']
    }
  }
} satisfies Config
