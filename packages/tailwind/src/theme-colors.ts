import {
  blue,
  darkblue,
  purple,
  pink,
  orange,
  red,
  green,
  yellow,
  gray,
  black,
  white,
  inherit,
  current,
  transparent,
  shades
} from './colors.js'

import type { Shades } from './types.js'

function flattenShades(color: string, shades: Shades) {
  return shades.reduce(
    (flattened, hex, index) => {
      const shade = (index + 1) * 100
      const key = `${color}-${shade}`
      flattened[key] = hex
      return flattened
    },
    {} as Record<string, string>
  )
}

export const themeColors = {
  blue,
  darkblue,
  purple,
  pink,
  orange,
  red,
  green,
  yellow,
  gray,
  black,
  white,
  inherit,
  current,
  transparent,

  // Add shades
  ...flattenShades('blue', shades.blue),
  ...flattenShades('darkblue', shades.darkblue),
  ...flattenShades('purple', shades.purple),
  ...flattenShades('pink', shades.pink),
  ...flattenShades('orange', shades.orange),
  ...flattenShades('red', shades.red),
  ...flattenShades('green', shades.green),
  ...flattenShades('yellow', shades.yellow),
  ...flattenShades('gray', shades.gray)
}
