import type { Config } from 'tailwindcss'

import themeColors from './theme-colors.js'

export default {
  extend: {
    textColor: {
      DEFAULT: themeColors.black
    },
    transitionDuration: {
      0: '0ms'
    }
  },
  colors: themeColors,
  fontFamily: {
    sans: ['Geograph', 'sans-serif'],
    // Consider using https://tosche.net/fonts/codelia
    mono: ['DM Mono', 'monospace']
  }
} satisfies Config['theme']
