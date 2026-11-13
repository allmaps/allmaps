import {
  createRenderer,
  defineEcConfig
} from '@astrojs/starlight/expressive-code'
import { updateCodeTheme } from './src/plugins/live-code-theme.mjs'

export default defineEcConfig({
  defaultProps: { wrap: true },
  customCreateRenderer: async (options) => {
    const renderer = await createRenderer(options)
    updateCodeTheme(renderer.ec)
    return renderer
  }
})
