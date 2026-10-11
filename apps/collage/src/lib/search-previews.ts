import type { WarpedMapLayer } from '@allmaps/maplibre'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { CollageMap } from './model.ts'
import { previewMap } from './search-camera.ts'

type MapOptions = Parameters<WarpedMapLayer['setMapOptions']>[1]
type PreviewLayer = Pick<
  WarpedMapLayer,
  'addGeoreferencedMap' | 'removeGeoreferencedMapById' | 'setMapOptions'
> & { getMapOptions: (id: string) => MapOptions | undefined }

export type AdoptSearchPreviews = (
  items: CollageMap[],
  update: (item: CollageMap) => void
) => void

/** Own only this search's temporary maps, within the existing collage layer. */
export class SearchPreviews {
  private ids = new Map<string, string>()
  private layer: PreviewLayer

  constructor(layer: PreviewLayer) {
    this.layer = layer
  }

  get(sourceId: string) {
    return this.ids.get(sourceId)
  }

  values() {
    return this.ids.values()
  }

  hasInstance(id: string) {
    return [...this.ids.values()].includes(id)
  }

  ensure(sourceId: string, source: GeoreferencedMap) {
    const existing = this.ids.get(sourceId)
    if (existing) return existing
    const id = 'urn:uuid:' + crypto.randomUUID()
    this.layer.addGeoreferencedMap(
      { ...previewMap(source), id },
      { visible: false, applyMask: false }
    )
    this.ids.set(sourceId, id)
    return id
  }

  /** Keep selected maps as well as nearby results, including across refinement. */
  retain(sourceIds: Iterable<string | undefined>) {
    const keep = new Set(sourceIds)
    for (const [sourceId, id] of this.ids) {
      if (keep.has(sourceId)) continue
      this.layer.removeGeoreferencedMapById(id)
      this.ids.delete(sourceId)
    }
  }

  /** Update the same warped-map objects and IDs, preserving renderer/cache state.
   * Ownership transfers only after every update succeeds. */
  adopt(
    sourceIds: string[],
    items: CollageMap[],
    update: (item: CollageMap) => void
  ) {
    if (sourceIds.length !== items.length)
      throw new Error('The selected maps no longer match their previews.')
    const before = sourceIds.map((sourceId, i) => {
      const id = this.ids.get(sourceId)
      const options = id && this.layer.getMapOptions(id)
      if (!id || !options) throw new Error('A selected map preview is missing.')
      return { id, options: { ...options }, itemId: items[i].instanceId }
    })
    try {
      items.forEach((item, i) => {
        item.instanceId = before[i].id
        update(item)
      })
    } catch (error) {
      before.forEach(({ id, options, itemId }, i) => {
        items[i].instanceId = itemId
        this.layer.setMapOptions(id, options, { animate: false })
      })
      throw error
    }
    for (const sourceId of sourceIds) this.ids.delete(sourceId)
  }

  clear() {
    this.retain([])
  }
}
