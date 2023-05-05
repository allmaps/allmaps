import Source from 'ol/source/Source.js'

import { RTree, World } from '@allmaps/render'

import type { Position, BBox } from '@allmaps/render'

export class WarpedMapSource extends Source {
  rtree: RTree
  world: World

  constructor() {
    super({
      interpolate: true,
      projection: undefined,
      state: 'ready',
      wrapX: true
    })

    this.rtree = new RTree()
    this.world = new World(this.rtree)
  }

  async addMap(map: unknown): Promise<string | Error> {
    return this.world.addMap(map)
  }

  async removeMap(map: unknown): Promise<string | Error> {
    return this.world.removeMap(map)
  }

  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    return this.world.addGeoreferenceAnnotation(annotation)
  }

  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    return this.world.removeGeoreferenceAnnotation(annotation)
  }

  clear() {
    this.world.clear()
  }

  getWorld() {
    return this.world
  }

  getMap(mapId: string) {
    return this.world.getMap(mapId)
  }

  showMap(mapId: string) {
    this.world.showMaps([mapId])
  }

  showMaps(mapIds: Iterable<string>) {
    this.world.showMaps(mapIds)
  }

  hideMap(mapId: string) {
    this.world.hideMaps([mapId])
  }

  hideMaps(mapIds: Iterable<string>) {
    this.world.hideMaps(mapIds)
  }

  isVisible(mapId: string) {
    const warpedMap = this.world.getMap(mapId)
    return warpedMap?.visible
  }

  setPixelMask(mapId: string, pixelMask: Position[]) {
    return this.world.setPixelMask(mapId, pixelMask)
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
}
