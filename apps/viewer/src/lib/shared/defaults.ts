import type { RenderOptions } from '$lib/shared/types.js'

export const defaultRenderOptions: RenderOptions = {
  opacity: 1,
  removeBackground: {
    enabled: false,
    color: '#faeed4',
    threshold: 0.2,
    hardness: 0.7
  },
  colorize: {
    enabled: false,
    color: '#ff0000'
  }
}
