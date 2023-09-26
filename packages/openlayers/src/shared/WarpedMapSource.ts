import { RTree, World } from '@allmaps/render'

import type { TransformationType } from '@allmaps/transform'
import type { Position, BBox } from '@allmaps/render'

import type { Class } from './types.js'

// type BaseSource = {
//   new (...args: any[]): any
//   changed: () => void
// }

// export type Class2 = { new (...args: any[]): any }
// export type Class2 = { new (...args: any[]): any; changed: () => void }

// export default function createWarpedMapSourceClass<T extends Class2>(
export default function createWarpedMapSourceClass(BaseSource: Class) {
  const WarpedMapSource = class extends BaseSource {
    rtree: RTree
    world: World

    /**
     * Create a warped map source
     * @param {Cache} [imageInfoCache] - The y value. https://developer.mozilla.org/en-US/docs/Web/API/Cache
     */
    constructor(imageInfoCache?: Cache) {
      super({
        interpolate: true,
        projection: undefined,
        state: 'ready',
        wrapX: true
      })

      this.rtree = new RTree()
      this.world = new World(this.rtree, imageInfoCache)
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    async addMap(map: unknown): Promise<string | Error> {
      const result = this.world.addMap(map)
      this.changed()

      return result
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    async removeMap(map: unknown): Promise<string | Error> {
      const result = this.world.removeMap(map)
      this.changed()

      return result
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    async addGeoreferenceAnnotation(
      annotation: unknown
    ): Promise<(string | Error)[]> {
      const results = this.world.addGeoreferenceAnnotation(annotation)
      this.changed()

      return results
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    async removeGeoreferenceAnnotation(
      annotation: unknown
    ): Promise<(string | Error)[]> {
      const results = this.world.removeGeoreferenceAnnotation(annotation)
      this.changed()

      return results
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    clear() {
      this.world.clear()
      this.changed()
    }

    /**
     * Returns WORLD
     * @returns {World} The World
     */
    getWorld() {
      return this.world
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    getMap(mapId: string) {
      return this.world.getMap(mapId)
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    showMap(mapId: string) {
      this.world.showMaps([mapId])
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    showMaps(mapIds: Iterable<string>) {
      this.world.showMaps(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    hideMap(mapId: string) {
      this.world.hideMaps([mapId])
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    hideMaps(mapIds: Iterable<string>) {
      this.world.hideMaps(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    isVisible(mapId: string) {
      const warpedMap = this.world.getMap(mapId)
      return warpedMap?.visible
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    setResourceMask(mapId: string, resourceMask: Position[]) {
      const result = this.world.setResourceMask(mapId, resourceMask)
      this.changed()

      return result
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    setTransformation(mapIds: string[], transformation: TransformationType) {
      this.world.setTransformation(mapIds, transformation)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    getExtent(): BBox | undefined {
      return this.world.getBBox()
    }

    bringToFront(mapIds: Iterable<string>) {
      this.world.bringToFront(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    sendToBack(mapIds: string[]) {
      this.world.sendToBack(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    bringForward(mapIds: Iterable<string>) {
      this.world.bringForward(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    sendBackward(mapIds: Iterable<string>) {
      this.world.sendBackward(mapIds)
      this.changed()
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    getZIndex(mapId: string) {
      return this.world.getZIndex(mapId)
    }

    /**
     * Create a warped map source
     * @param {number} x - The x value.
     * @param {number} y - The y value.
     */
    setImageInfoCache(cache: Cache) {
      this.world.setImageInfoCache(cache)
    }
  }

  return WarpedMapSource
}
