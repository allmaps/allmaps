import type { RenderOptions } from '$lib/shared/types.js'

export function getDefaultRenderOptions(
  enableRemoveBackground: boolean,
  enableColorize: boolean
): RenderOptions {
  return {
    removeBackground: {
      enabled: enableRemoveBackground,
      color: null,
      threshold: 0,
      hardness: 0.2
    },
    colorize: {
      enabled: enableColorize,
      color: '#000000'
    }
  }
}
