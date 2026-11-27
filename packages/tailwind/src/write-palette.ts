import { writeFile } from 'node:fs/promises'

import { themeColors } from './theme-colors.js'

const properties = Object.entries(themeColors)
  .filter(([, value]) => value.startsWith('#'))
  .map(([name, value]) => `  --allmaps-color-${name}: ${value};`)

await writeFile(
  new URL('./palette.css', import.meta.url),
  `:root {\n${properties.join('\n')}\n}\n`
)
