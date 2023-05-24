import type { RenderOptions } from '$lib/shared/types.js'

export function getDefaultRenderOptions(
  renderOptions?: Partial<RenderOptions>
): RenderOptions {
  return {
    removeBackground: {
      color: null,
      threshold: 0,
      hardness: 0.2,
      ...renderOptions?.removeBackground
    },
    colorize: {
      enabled: false,
      color: null,
      ...renderOptions?.colorize
    }
  }
}
