import type { RenderOptions } from '$lib/shared/types.js'

export function getDefaultRenderOptions(): RenderOptions {
  return {
    opacity: 1,
    removeBackground: {
      enabled: true,
      color: '#faeed4',
      threshold: 0,
      hardness: 0.2
    },
    colorize: {
      enabled: false,
      color: '#ff0000'
    }
  }
}
