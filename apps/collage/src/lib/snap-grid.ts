import { projectedToScreen } from './export-view.ts'
import type { ExportView } from './export-view.ts'

/** Draw only visible lines, avoiding huge repeating textures at close zooms.
 * Ground metres use the same scale as move snapping, before CANVAS_SCALE.
 * The editing canvas is north-up, so its grid stays horizontal and vertical.
 */
export function snapGrid(spacing: number, view: ExportView) {
  const pixels = spacing / view.metersPerPixel
  if (
    !Number.isFinite(pixels) ||
    !Number.isFinite(view.width + view.height) ||
    pixels <= 0 ||
    view.width <= 0 ||
    view.height <= 0
  )
    return
  // Subsample by whole grid divisions, never inventing new snap positions.
  const stride = 5 ** Math.max(0, Math.ceil(Math.log(8 / pixels) / Math.log(5)))
  const interval = pixels * stride
  const origin = projectedToScreen([0, 0], view)
  if (!origin.every(Number.isFinite)) return
  const lines = (step: number) => {
    const commands: string[] = []
    for (const axis of [0, 1]) {
      const offset = ((origin[axis] % step) + step) % step
      const extent = axis === 0 ? view.width : view.height
      for (let position = offset; position <= extent; position += step) {
        const coordinate = position.toFixed(3)
        commands.push(
          axis === 0
            ? `M${coordinate} 0V${view.height}`
            : `M0 ${coordinate}H${view.width}`
        )
      }
    }
    return commands.join('')
  }
  return { minor: lines(interval), major: lines(interval * 5) }
}
