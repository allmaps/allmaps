import Source from 'ol/source/Source.js'

import { RTree, World } from '@allmaps/render'

import type { Position, BBox } from '@allmaps/render'

export class WarpedMapSource extends Source {
  rtree: RTree
  world: World

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

  async addMap(map: unknown): Promise<string | Error> {
    const result = this.world.addMap(map)
    this.changed()

    return result
  }

  async removeMap(map: unknown): Promise<string | Error> {
    const result = this.world.removeMap(map)
    this.changed()

    return result
  }

  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.world.addGeoreferenceAnnotation(annotation)
    this.changed()

    return results
  }

  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.world.removeGeoreferenceAnnotation(annotation)
    this.changed()

    return results
  }

  clear() {
    this.world.clear()
    this.changed()
  }

  getWorld() {
    return this.world
  }

  getMap(mapId: string) {
    return this.world.getMap(mapId)
  }

  showMap(mapId: string) {
    this.world.showMaps([mapId])
    this.changed()
  }

  showMaps(mapIds: Iterable<string>) {
    this.world.showMaps(mapIds)
    this.changed()
  }

  hideMap(mapId: string) {
    this.world.hideMaps([mapId])
    this.changed()
  }

  hideMaps(mapIds: Iterable<string>) {
    this.world.hideMaps(mapIds)
    this.changed()
  }

  isVisible(mapId: string) {
    const warpedMap = this.world.getMap(mapId)
    return warpedMap?.visible
  }

  setPixelMask(mapId: string, pixelMask: Position[]) {
    const result = this.world.setPixelMask(mapId, pixelMask)
    this.changed()

    return result
  }

  getExtent(): BBox | undefined {
    return this.world.getBBox()
  }

  bringToFront(mapIds: Iterable<string>) {
    this.world.bringToFront(mapIds)
    this.changed()
  }

  sendToBack(mapIds: string[]) {
    this.world.sendToBack(mapIds)
    this.changed()
  }

  bringForward(mapIds: Iterable<string>) {
    this.world.bringForward(mapIds)
    this.changed()
  }

  sendBackward(mapIds: Iterable<string>) {
    this.world.sendBackward(mapIds)
    this.changed()
  }

  getZIndex(mapId: string) {
    return this.world.getZIndex(mapId)
  }

  setImageInfoCache(cache: Cache) {
    this.world.setImageInfoCache(cache)
  }
}
