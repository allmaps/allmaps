import { WarpedMapLayer } from '@allmaps/maplibre'
import type { Viewport } from '@allmaps/render'

/** Keep the same WebGL renderer and tile cache while rendering a print view. */
export class ExportableMapLayer extends WarpedMapLayer {
  exportViewport?: Viewport

  override render() {
    if (this.exportViewport) this.renderer?.render(this.exportViewport)
    else super.render()
  }
}
